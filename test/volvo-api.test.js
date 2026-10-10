import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createVolvoClient,
  VolvoApiError,
  redactVin,
  imageType,
  RESOURCES,
} from '../src/volvo-api.js';
import { fakeFetch, response, VIN, COMMON } from './helpers/fixtures.js';

/**
 * @description A token manager stand-in.
 * @returns {object} The manager, with its calls.
 */
function fakeTokens() {
  const calls = [];
  let current = 'token-1';
  return {
    calls,
    async getAccessToken(options = {}) {
      calls.push(options);
      if (options.rejected === current) {
        current = 'token-2';
      }
      return current;
    },
  };
}

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

test('sends the bearer token and the VCC API key, and unwraps data', async () => {
  const fetchImpl = fakeFetch(() => response(200, { data: COMMON.doors }));
  const volvo = createVolvoClient({
    tokens: fakeTokens(),
    getApiKey: () => 'the-key',
    userAgent: 'test',
    fetchImpl,
  });
  const doors = await volvo.getResource(VIN, RESOURCES.DOORS);
  assert.equal(doors.centralLock.value, 'LOCKED');
  const [call] = fetchImpl.calls;
  assert.equal(call.url, `https://api.volvocars.com/connected-vehicle/v2/vehicles/${VIN}/doors`);
  assert.equal(call.init.headers.Authorization, 'Bearer token-1');
  assert.equal(call.init.headers['vcc-api-key'], 'the-key');
});

test('lists the VINs and reads the Energy and Location APIs', async () => {
  const fetchImpl = fakeFetch((url) => {
    if (url.endsWith('/connected-vehicle/v2/vehicles')) {
      return response(200, { data: [{ vin: VIN }, { vin: 'not-a-vin' }] });
    }
    if (url.endsWith('/capabilities')) {
      return response(200, { getEnergyState: { isSupported: true } });
    }
    if (url.endsWith('/state')) {
      return response(200, { batteryChargeLevel: { status: 'OK', value: 53 } });
    }
    if (url.endsWith('/location')) {
      return response(200, { data: COMMON.location });
    }
    return response(200, { data: [{ command: 'LOCK' }, { command: 'HONK' }] });
  });
  const volvo = createVolvoClient({
    tokens: fakeTokens(),
    getApiKey: () => 'k',
    userAgent: 't',
    fetchImpl,
  });
  assert.deepEqual(await volvo.listVehicles(), [VIN]);
  assert.deepEqual(await volvo.getEnergyCapabilities(VIN), { isSupported: true });
  assert.equal((await volvo.getEnergyState(VIN)).batteryChargeLevel.value, 53);
  assert.equal((await volvo.getLocation(VIN)).type, 'Feature');
  assert.deepEqual(await volvo.getCommands(VIN), ['LOCK', 'HONK']);
  assert.ok(fetchImpl.calls.some((c) => c.url.includes('/energy/v2/vehicles/')));
  assert.ok(fetchImpl.calls.some((c) => c.url.includes('/location/v1/vehicles/')));
});

test('refuses a malformed VIN before any call', async () => {
  const fetchImpl = fakeFetch(() => response(200, {}));
  const volvo = createVolvoClient({
    tokens: fakeTokens(),
    getApiKey: () => 'k',
    userAgent: 't',
    fetchImpl,
  });
  await assert.rejects(volvo.getResource('../../x', 'doors'), VolvoApiError);
  assert.equal(fetchImpl.calls.length, 0);
});

test('reads a 404 as nothing, retries a 401 once with a fresh token', async () => {
  const fetchImpl = fakeFetch((url, init) => {
    if (url.endsWith('/tyres')) {
      return response(404, { error: { message: 'Not found' } });
    }
    return init.headers.Authorization === 'Bearer token-1'
      ? response(401, { error: { message: 'expired' } })
      : response(200, { data: { odometer: { value: 1 } } });
  });
  const tokens = fakeTokens();
  const volvo = createVolvoClient({ tokens, getApiKey: () => 'k', userAgent: 't', fetchImpl });
  assert.deepEqual(await volvo.getResource(VIN, RESOURCES.TYRES), {});
  assert.equal((await volvo.getResource(VIN, RESOURCES.ODOMETER)).odometer.value, 1);
  assert.deepEqual(tokens.calls.at(-1), { rejected: 'token-1' });
});

test('a second 401 or a 403 is an auth error, a 429 a rate limit', async () => {
  const fetchImpl = fakeFetch((url) => {
    if (url.endsWith('/doors')) {
      return response(401, { error: { message: 'Access denied', description: 'invalid key' } });
    }
    if (url.endsWith('/windows')) {
      return response(403, {});
    }
    return response(429, {}, { 'Retry-After': '120' });
  });
  const volvo = createVolvoClient({
    tokens: fakeTokens(),
    getApiKey: () => 'k',
    userAgent: 't',
    fetchImpl,
  });
  await assert.rejects(volvo.getResource(VIN, RESOURCES.DOORS), (err) => {
    assert.equal(err.status, 401);
    assert.ok(err.auth);
    assert.match(err.message, /Access denied invalid key/);
    assert.ok(!err.message.includes(VIN), 'the VIN is redacted');
    return true;
  });
  await assert.rejects(volvo.getResource(VIN, RESOURCES.WINDOWS), (err) => err.auth);
  await assert.rejects(volvo.getResource(VIN, RESOURCES.STATISTICS), (err) => {
    assert.ok(err.rateLimited);
    assert.equal(err.retryAfterMs, 120000);
    return true;
  });
});

test('sends a command and reads its status; a 422 is UNKNOWN', async () => {
  const fetchImpl = fakeFetch((url) =>
    url.endsWith('/lock')
      ? response(200, { data: { vin: VIN, invokeStatus: 'COMPLETED', message: '' } })
      : response(422, { error: { message: 'car asleep' } }),
  );
  const volvo = createVolvoClient({
    tokens: fakeTokens(),
    getApiKey: () => 'k',
    userAgent: 't',
    fetchImpl,
  });
  assert.deepEqual(await volvo.sendCommand(VIN, 'lock'), { status: 'COMPLETED', message: '' });
  assert.deepEqual(await volvo.sendCommand(VIN, 'engine-start', { runtimeMinutes: 5 }), {
    status: 'UNKNOWN',
    message: 'car asleep',
  });
  assert.equal(fetchImpl.calls[0].init.method, 'POST');
  assert.equal(fetchImpl.calls[1].init.body, '{"runtimeMinutes":5}');
});

test('downloads a picture: image only, 300 KB at most', async () => {
  const fetchImpl = fakeFetch((url) => {
    if (url.includes('big')) {
      return response(200, Buffer.concat([PNG, Buffer.alloc(400 * 1024)]));
    }
    if (url.includes('html')) {
      return response(200, Buffer.from('<html></html>'));
    }
    return response(200, PNG);
  });
  const volvo = createVolvoClient({
    tokens: fakeTokens(),
    getApiKey: () => 'k',
    userAgent: 't',
    fetchImpl,
  });
  assert.equal(await volvo.fetchImage('https://cas.volvocars.com/ok'), PNG.toString('base64'));
  await assert.rejects(volvo.fetchImage('https://cas.volvocars.com/big'), /too large/);
  await assert.rejects(volvo.fetchImage('https://cas.volvocars.com/html'), /not a PNG/);
});

test('redacts VINs and recognizes image types', () => {
  assert.equal(redactVin(`/vehicles/${VIN}/doors`), '/vehicles/…4567/doors');
  assert.equal(imageType(PNG), 'png');
  assert.equal(imageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
  assert.equal(imageType(Buffer.from('nope')), null);
});
