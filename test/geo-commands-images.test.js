import { test } from 'node:test';
import assert from 'node:assert/strict';

import { distanceKm, nearestHouse, isHome, mapUrl } from '../src/geo.js';
import { supports, bodyOf, runCommand } from '../src/commands.js';
import { sizedUrl, keyOf, createPictureRegistry } from '../src/images.js';
import { infoOf, VIN } from './helpers/fixtures.js';

const EIFFEL = { latitude: 48.8584, longitude: 2.2945 };
const LOUVRE = { latitude: 48.8606, longitude: 2.3376 };

test('measures distances and finds the nearest located house', () => {
  assert.ok(Math.abs(distanceKm(EIFFEL, LOUVRE) - 3.16) < 0.05);
  assert.equal(distanceKm(EIFFEL, EIFFEL), 0);
  const houses = [
    { name: 'Unlocated', latitude: null, longitude: null },
    { name: 'Louvre', ...LOUVRE },
    { name: 'Far', latitude: 45.76, longitude: 4.84 },
  ];
  const nearest = nearestHouse(EIFFEL, houses);
  assert.equal(nearest.house.name, 'Louvre');
  assert.equal(nearestHouse(null, houses), null);
  assert.equal(nearestHouse(EIFFEL, []), null);
});

test('home has a hysteresis', () => {
  assert.equal(isHome(0.15, 200, null), true);
  assert.equal(isHome(0.22, 200, null), false);
  assert.equal(isHome(0.22, 200, true), true, 'still home up to 250 m');
  assert.equal(isHome(0.26, 200, true), false);
  assert.equal(isHome(null, 200, true), null);
  assert.equal(
    mapUrl({ latitude: 57.725, longitude: 11.85 }),
    'https://www.openstreetmap.org/?mlat=57.72500&mlon=11.85000#map=17/57.72500/11.85000',
  );
});

test('commands: only the listed ones, engine runtime clamped', async () => {
  const info = infoOf('xc40_electric_2024');
  assert.ok(supports(info, 'lock'));
  assert.ok(supports(info, 'honk_flash'));
  assert.ok(!supports(info, 'engine_start'), 'not listed by the electric car');
  assert.ok(supports(infoOf('xc90_petrol_2019'), 'engine_start'));
  assert.ok(!supports(info, 'nonsense'));
  assert.deepEqual(bodyOf('engine_start', { runtimeMinutes: 99 }), { runtimeMinutes: 15 });
  assert.deepEqual(bodyOf('engine_start', { runtimeMinutes: '3' }), { runtimeMinutes: 3 });
  assert.deepEqual(bodyOf('engine_start'), { runtimeMinutes: 15 });
  assert.equal(bodyOf('lock'), undefined);

  const sent = [];
  const volvo = {
    async sendCommand(vin, path, body) {
      sent.push({ vin, path, body });
      return { status: path === 'lock' ? 'COMPLETED' : 'REJECTED', message: '' };
    },
  };
  assert.equal((await runCommand(volvo, info, 'lock')).ok, true);
  assert.equal((await runCommand(volvo, info, 'climatization_start')).ok, false);
  await assert.rejects(runCommand(volvo, info, 'engine_start'), (err) => err.unsupported);
  assert.deepEqual(
    sent.map((s) => s.path),
    ['lock', 'climatization-start'],
  );
  assert.equal(sent[0].vin, VIN);
});

test('pictures: smaller renderings, keys bound to Volvo URLs', () => {
  const cas =
    'https://cas.volvocars.com/image/dynamic/MY24_0000/123/exterior-v4/_/default.png?market=se&angle=1&w=1920';
  assert.match(sizedUrl(cas), /[?&]w=640(&|$)/);
  const wizz = 'https://wizz.volvocars.com/images/2024/123/v2/exterior.png?client=x&w=1920';
  assert.match(sizedUrl(wizz), /w=640/);
  assert.equal(sizedUrl('https://example.com/a.png?w=1920'), 'https://example.com/a.png?w=1920');

  const registry = createPictureRegistry();
  const key = registry.register(cas);
  assert.equal(key, keyOf(cas));
  assert.match(key, /^[a-z0-9][a-z0-9-]{0,63}$/);
  assert.equal(registry.urlOf(key), sizedUrl(cas));
  assert.equal(registry.urlOf('car-000000000000'), null);
  assert.equal(registry.register(''), null);
  assert.equal(registry.register('http://insecure'), null);
  registry.markBroken(key);
  assert.equal(registry.urlOf(key), null);
  assert.equal(registry.register(cas), null, 'a broken picture is not offered again');
});
