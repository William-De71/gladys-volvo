import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';

import {
  FEATURE_KEYS,
  buildDevice,
  buildStates,
  parseExternalId,
  vehicleName,
} from '../src/device.js';
import { summarize } from '../src/vehicle.js';
import { infoOf, rawOf, fakeGladys, VIN, CARS } from './helpers/fixtures.js';

const context = { language: 'fr', climateOn: false, distanceHomeKm: 1.234 };
const keysOf = (device) => device.features.map((f) => f.external_id.split(':').pop());

const CATEGORIES = new Set(Object.values(DEVICE_FEATURE_CATEGORIES));
const TYPES = new Set(Object.values(DEVICE_FEATURE_TYPES).flatMap((types) => Object.values(types)));
const UNITS = new Set(Object.values(DEVICE_FEATURE_UNITS));

/**
 * @description The device of a recorded car.
 * @param {string} car - The car.
 * @param {object} [options] - Options of infoOf.
 * @returns {object} The device.
 */
function deviceOf(car, options) {
  const info = infoOf(car, options);
  return buildDevice(fakeGladys, info, summarize(info, rawOf(car)), context);
}

test('every feature of every recorded car is valid for the core', () => {
  CARS.forEach((car) => {
    const device = deviceOf(car);
    assert.match(device.external_id, /^ext:volvo:vehicle:YV1ABCDEFG1234567$/);
    device.features.forEach((feature) => {
      const path = `${car} ${feature.external_id}`;
      assert.ok(CATEGORIES.has(feature.category), `${path} category ${feature.category}`);
      assert.ok(TYPES.has(feature.type), `${path} type ${feature.type}`);
      if (feature.unit !== undefined) {
        assert.ok(UNITS.has(feature.unit), `${path} unit ${feature.unit}`);
      }
      assert.ok(feature.external_id.startsWith(`${device.external_id}:`), path);
      assert.ok(Number.isFinite(feature.min) && Number.isFinite(feature.max), path);
      assert.equal(typeof feature.name, 'string');
    });
    const ids = device.features.map((f) => f.external_id);
    assert.equal(new Set(ids).size, ids.length, `${car}: unique feature ids`);
  });
});

test('an electric car: battery and charge, no fuel', () => {
  const keys = keysOf(deviceOf('xc40_electric_2024'));
  [
    FEATURE_KEYS.BATTERY_LEVEL,
    FEATURE_KEYS.BATTERY_RANGE,
    FEATURE_KEYS.BATTERY_ENERGY,
    FEATURE_KEYS.PLUGGED,
    FEATURE_KEYS.CHARGING_STATUS,
    FEATURE_KEYS.CHARGE_POWER,
    FEATURE_KEYS.CHARGE_TARGET,
    FEATURE_KEYS.LOCK,
    FEATURE_KEYS.DOORS,
    FEATURE_KEYS.TAILGATE,
    FEATURE_KEYS.WINDOWS,
    FEATURE_KEYS.CLIMATE,
    FEATURE_KEYS.ODOMETER,
    FEATURE_KEYS.WARNINGS,
    FEATURE_KEYS.DISTANCE_HOME,
  ].forEach((key) => assert.ok(keys.includes(key), key));
  assert.ok(!keys.includes(FEATURE_KEYS.FUEL_AMOUNT));
  assert.ok(!keys.includes(FEATURE_KEYS.SUNROOF), 'UNSPECIFIED sunroof: no feature');
});

test('a diesel: fuel, no battery nor charge', () => {
  const keys = keysOf(deviceOf('s90_diesel_2018'));
  assert.ok(keys.includes(FEATURE_KEYS.FUEL_AMOUNT));
  assert.ok(keys.includes(FEATURE_KEYS.FUEL_RANGE));
  [FEATURE_KEYS.BATTERY_LEVEL, FEATURE_KEYS.PLUGGED, FEATURE_KEYS.CHARGING_STATUS].forEach((key) =>
    assert.ok(!keys.includes(key), key),
  );
});

test('the lock is a command only when the car offers lock and unlock', () => {
  const lockOf = (commands) =>
    deviceOf('xc40_electric_2024', { commands }).features.find((f) =>
      f.external_id.endsWith(':lock'),
    );
  assert.equal(lockOf(['LOCK', 'UNLOCK']).read_only, false);
  assert.equal(lockOf(['LOCK']).read_only, true);
  const noClimate = keysOf(deviceOf('xc40_electric_2024', { commands: [] }));
  assert.ok(!noClimate.includes(FEATURE_KEYS.CLIMATE));
});

test('states: numbers, texts, unknown left out', () => {
  const info = infoOf('xc40_electric_2024');
  const snapshot = summarize(info, rawOf('xc40_electric_2024'));
  const states = buildStates(fakeGladys, info, snapshot, context);
  const byKey = Object.fromEntries(
    states.map((s) => [s.device_feature_external_id.split(':').pop(), s.text ?? s.state]),
  );
  assert.equal(byKey.battery_level, 53);
  assert.equal(byKey.lock, 1, '1 = locked');
  assert.equal(byKey.doors, 0);
  assert.equal(byKey.plugged, 1);
  assert.equal(byKey.charging_status, 'En charge');
  assert.equal(byKey.warnings, 'Aucune');
  assert.equal(byKey.climate, 0);
  assert.equal(byKey.distance_home, 1.2);
  assert.ok(!('sunroof' in byKey));
  assert.ok(!('fuel_amount' in byKey));

  const empty = buildStates(fakeGladys, info, summarize(info, {}), {
    ...context,
    distanceHomeKm: null,
  });
  assert.deepEqual(
    empty.map((s) => s.device_feature_external_id.split(':').pop()).sort(),
    ['climate', 'warnings'],
    'nothing invented for an unread car',
  );
});

test('states only for the created features when asked', () => {
  const info = infoOf('xc40_electric_2024');
  const snapshot = summarize(info, rawOf('xc40_electric_2024'));
  const only = new Set([`ext:volvo:vehicle:${VIN}:lock`]);
  assert.deepEqual(
    buildStates(fakeGladys, info, snapshot, context, only).map((s) => s.device_feature_external_id),
    [...only],
  );
});

test('parses the external ids and names the car', () => {
  assert.deepEqual(parseExternalId(`ext:volvo:vehicle:${VIN}:lock`), { vin: VIN, feature: 'lock' });
  assert.deepEqual(parseExternalId(`ext:volvo:vehicle:${VIN}`), { vin: VIN, feature: null });
  assert.equal(parseExternalId('ext:volvo:vehicle:nope'), null);
  assert.equal(parseExternalId(undefined), null);
  assert.equal(vehicleName(infoOf('xc40_electric_2024'), 'fr'), 'Volvo XC40 (2024)');
});
