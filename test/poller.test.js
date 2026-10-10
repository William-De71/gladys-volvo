import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createPoller,
  resourcesOf,
  LIVE,
  SLOW,
  SLOW_INTERVAL_MS,
  CLIMATE_SESSION_MS,
} from '../src/poller.js';
import { OAuthError } from '../src/oauth.js';
import { VolvoApiError } from '../src/volvo-api.js';
import {
  infoOf,
  vehicleOf,
  capabilitiesOf,
  COMMANDS,
  COMMON,
  rawOf,
  silent,
  VIN,
  NOW,
  copy,
} from './helpers/fixtures.js';

/**
 * @description A Volvo client stand-in answering the recorded electric car.
 * @param {object} [overrides] - Methods to replace.
 * @returns {object} The client, with its calls.
 */
function fakeVolvo(overrides = {}) {
  const raw = rawOf('xc40_electric_2024');
  const calls = [];
  const record =
    (name, value) =>
    async (...args) => {
      calls.push([name, ...args.slice(1)]);
      return typeof value === 'function' ? value(...args) : copy(value);
    };
  return {
    calls,
    raw,
    listVehicles: record('listVehicles', [VIN]),
    getVehicle: record('getVehicle', vehicleOf('xc40_electric_2024')),
    getCommands: record('getCommands', COMMANDS),
    getEnergyCapabilities: record('getEnergyCapabilities', capabilitiesOf('xc40_electric_2024')),
    getEnergyState: record('getEnergyState', () => copy(raw.energy)),
    getLocation: record('getLocation', () => copy(raw.location)),
    getResource: record('getResource', (vin, resource) => copy(raw[resource] ?? {})),
    ...overrides,
  };
}

/**
 * @description A poller on a manual clock.
 * @param {object} volvo - The client.
 * @param {object} [options] - Extra options.
 * @returns {object} `{ poller, readings, ends, clock }`.
 */
function setup(volvo, options = {}) {
  const clock = { now: NOW };
  const readings = [];
  const ends = [];
  const lost = [];
  const poller = createPoller({
    volvo,
    getIntervalMs: () => 5 * 60 * 1000,
    getHomeRadius: () => 200,
    getHouses: () => [{ name: 'Home', latitude: 57.7254, longitude: 11.8498 }],
    onReading: async (info, reading, details) => readings.push({ info, reading, ...details }),
    onRoundEnd: async (end) => ends.push(end),
    onAuthLost: async (err) => lost.push(err),
    logger: silent,
    now: () => clock.now,
    ...options,
  });
  return { poller, readings, ends, lost, clock };
}

test('reads the live resources at their pace, the slow ones every 30 minutes', () => {
  const ev = infoOf('xc40_electric_2024');
  assert.deepEqual(resourcesOf(ev, LIVE), [
    'doors',
    'windows',
    'engine-status',
    'statistics',
    'energy',
    'location',
  ]);
  const diesel = infoOf('s90_diesel_2018', { locationSupported: false });
  assert.deepEqual(resourcesOf(diesel, LIVE), [
    'doors',
    'windows',
    'engine-status',
    'statistics',
    'fuel',
  ]);
  assert.ok(resourcesOf(ev, SLOW).includes('diagnostics'));
});

test('discovers the cars, reads them, detects home, then keeps to the paces', async () => {
  const volvo = fakeVolvo();
  const { poller, readings, ends, clock } = setup(volvo);
  const [info] = await poller.discover();
  assert.equal(info.model, 'XC40');
  assert.ok(info.locationSupported);

  await poller.round();
  assert.equal(readings.length, 1);
  const first = readings[0];
  assert.equal(first.reading.snapshot.battery.level, 53);
  assert.equal(first.reading.atHome, true);
  assert.deepEqual(first.events, [], 'baseline');
  assert.equal(ends[0].succeeded, 13);

  const before = volvo.calls.length;
  await poller.round();
  assert.equal(volvo.calls.length, before, 'nothing due');

  clock.now += 5 * 60 * 1000;
  volvo.raw.doors.centralLock.value = 'UNLOCKED';
  await poller.round();
  const live = volvo.calls.slice(before).map((call) => call[1] ?? call[0]);
  assert.ok(!live.includes('diagnostics'), 'the slow pace waits');
  assert.equal(readings.at(-1).events[0].key, 'lock_changed');

  clock.now += SLOW_INTERVAL_MS;
  const beforeSlow = volvo.calls.length;
  await poller.round();
  assert.ok(volvo.calls.slice(beforeSlow).some((call) => call[1] === 'diagnostics'));
});

test('a failing resource keeps its last answer', async () => {
  let fail = false;
  const volvo = fakeVolvo();
  const original = volvo.getResource;
  volvo.getResource = async (vin, resource) => {
    if (fail && resource === 'doors') {
      throw new VolvoApiError('boom', { status: 500 });
    }
    return original(vin, resource);
  };
  const { poller, readings, ends } = setup(volvo);
  await poller.discover();
  await poller.round();
  fail = true;
  await poller.round({ force: true });
  assert.equal(readings.at(-1).reading.snapshot.lock, 'locked');
  assert.equal(ends.at(-1).errors.length, 1);
  assert.ok(ends.at(-1).succeeded > 0);
});

test('a refused sign-in pauses everything until resume', async () => {
  const volvo = fakeVolvo({
    getResource: async () => {
      throw new OAuthError('invalid_grant', { status: 400, reauth: true });
    },
  });
  const { poller, lost, clock } = setup(volvo);
  await poller.discover();
  await poller.round();
  assert.equal(lost.length, 1);
  assert.ok(poller.isPaused());
  const calls = volvo.calls.length;
  clock.now += 10 * 60 * 1000;
  await poller.round({ force: true });
  assert.equal(volvo.calls.length, calls, 'nothing read while paused');
  poller.resume();
  assert.ok(!poller.isPaused());
});

test('an API 401 is not a sign-in problem', async () => {
  const volvo = fakeVolvo({
    getResource: async () => {
      throw new VolvoApiError('invalid key', { status: 401 });
    },
  });
  const { poller, lost } = setup(volvo);
  await poller.discover();
  await poller.round();
  assert.equal(lost.length, 0);
  assert.ok(!poller.isPaused());
});

test('a quota exceeded pauses the rounds', async () => {
  const volvo = fakeVolvo({
    getResource: async () => {
      throw new VolvoApiError('quota', { status: 429, retryAfterMs: 3600000 });
    },
  });
  const { poller, ends, clock } = setup(volvo);
  await poller.discover();
  await poller.round();
  assert.ok(poller.isRateLimited());
  assert.equal(ends.at(-1).rateLimited, true);
  const calls = volvo.calls.length;
  clock.now += 30 * 60 * 1000;
  await poller.round();
  assert.equal(volvo.calls.length, calls);
  clock.now += 31 * 60 * 1000;
  assert.ok(!poller.isRateLimited());
});

test('a position Volvo refuses (region) is no position', async () => {
  const volvo = fakeVolvo({
    getLocation: async () => {
      throw new VolvoApiError('forbidden', { status: 403 });
    },
  });
  const { poller } = setup(volvo);
  const [info] = await poller.discover();
  assert.equal(info.locationSupported, false);
});

test('climate state lasts a session; cars that vanish are forgotten', async () => {
  const volvo = fakeVolvo();
  const { poller, clock } = setup(volvo);
  await poller.discover();
  poller.setClimate(VIN, true);
  assert.ok(poller.climateOn(VIN));
  clock.now += CLIMATE_SESSION_MS + 1;
  assert.ok(!poller.climateOn(VIN));
  volvo.listVehicles = async () => [];
  await poller.discover();
  assert.equal(poller.get(VIN), null);
  assert.deepEqual(COMMON.doors.centralLock.value, 'LOCKED', 'fixtures untouched');
});
