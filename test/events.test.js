import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SCENE_TRIGGERS,
  detectEvents,
  buildSceneEvent,
  buildAuthorizationExpiredEvent,
} from '../src/events.js';
import { summarize } from '../src/vehicle.js';
import { infoOf, rawOf } from './helpers/fixtures.js';

const info = infoOf('xc40_electric_2024');

/**
 * @description A reading of the recorded electric car, changed by `edit`.
 * @param {Function} [edit] - `(raw) => void`.
 * @param {object} [extra] - `{ atHome, distanceHomeKm }`.
 * @returns {object} The reading.
 */
function reading(edit = () => {}, extra = {}) {
  const raw = rawOf('xc40_electric_2024');
  edit(raw);
  return { snapshot: summarize(info, raw), atHome: null, distanceHomeKm: null, ...extra };
}

const keys = (events) => events.map((event) => event.key);

test('the first reading is a baseline', () => {
  assert.deepEqual(detectEvents(null, reading()), []);
  assert.deepEqual(detectEvents(reading(), reading()), []);
});

test('lock, engine, charge and cable changes', () => {
  const before = reading();
  const after = reading((raw) => {
    raw.doors.centralLock.value = 'UNLOCKED';
    raw['engine-status'].engineStatus.value = 'RUNNING';
    raw.energy.chargingStatus.value = 'DONE';
    raw.energy.chargerConnectionStatus.value = 'DISCONNECTED';
  });
  const events = detectEvents(before, after);
  assert.deepEqual(keys(events), [
    SCENE_TRIGGERS.LOCK_CHANGED,
    SCENE_TRIGGERS.ENGINE_CHANGED,
    SCENE_TRIGGERS.CHARGING_CHANGED,
    SCENE_TRIGGERS.CHARGER_CONNECTION_CHANGED,
  ]);
  assert.deepEqual(
    events.map((event) => event.values),
    [{ state: 'unlocked' }, { state: 'started' }, { status: 'done' }, { state: 'disconnected' }],
  );
});

test('a value becoming unknown fires nothing', () => {
  const after = reading((raw) => {
    delete raw.doors.centralLock;
    raw['engine-status'] = {};
  });
  assert.deepEqual(detectEvents(reading(), after), []);
});

test('locked but left open: once, again when one more opens', () => {
  const closed = reading();
  const windowOpen = reading((raw) => {
    raw.windows.frontLeftWindow.value = 'OPEN';
  });
  const twoOpen = reading((raw) => {
    raw.windows.frontLeftWindow.value = 'OPEN';
    raw.doors.tailgate.value = 'AJAR';
  });
  assert.deepEqual(keys(detectEvents(closed, windowOpen)), [SCENE_TRIGGERS.LEFT_OPEN]);
  assert.deepEqual(detectEvents(windowOpen, windowOpen), []);
  const more = detectEvents(windowOpen, twoOpen);
  assert.deepEqual(keys(more), [SCENE_TRIGGERS.LEFT_OPEN]);
  assert.deepEqual(more[0].values.openings, ['tailgate', 'frontLeftWindow']);
  const unlockedOpen = reading((raw) => {
    raw.doors.centralLock.value = 'UNLOCKED';
    raw.windows.frontLeftWindow.value = 'OPEN';
  });
  assert.ok(!keys(detectEvents(closed, unlockedOpen)).includes(SCENE_TRIGGERS.LEFT_OPEN));
});

test('arrived and left home', () => {
  const away = reading(undefined, { atHome: false, distanceHomeKm: 12 });
  const home = reading(undefined, { atHome: true, distanceHomeKm: 0.05 });
  assert.deepEqual(
    detectEvents(away, home).map((e) => e.values),
    [{ state: 'arrived' }],
  );
  assert.deepEqual(
    detectEvents(home, away).map((e) => e.values),
    [{ state: 'left' }],
  );
  assert.deepEqual(detectEvents(reading(), home), [], 'unknown before: no event');
});

test('one event per new warning', () => {
  const before = reading((raw) => {
    raw.tyres.frontLeft.value = 'LOW_PRESSURE';
  });
  const after = reading((raw) => {
    raw.tyres.frontLeft.value = 'LOW_PRESSURE';
    raw.tyres.rearRight.value = 'VERY_LOW_PRESSURE';
    raw.diagnostics.washerFluidLevelWarning.value = 'TOO_LOW';
  });
  const events = detectEvents(before, after);
  assert.deepEqual(
    events.map((e) => e.values.warning),
    ['washerFluidLevelWarning', 'tyre:rearRight'],
  );
});

test('builds the scene data with a sentence', () => {
  const after = reading((raw) => {
    raw.windows.frontLeftWindow.value = 'OPEN';
  });
  const [event] = detectEvents(reading(), after);
  const { key, data } = buildSceneEvent(event, {
    vehicle: 'ext:volvo:vehicle:YV1ABCDEFG1234567',
    carName: 'Volvo XC40 (2024)',
    reading: after,
    language: 'fr',
  });
  assert.equal(key, 'left_open');
  assert.equal(data.vehicle, 'ext:volvo:vehicle:YV1ABCDEFG1234567');
  assert.equal(data.openings, 'fenêtre avant gauche');
  assert.equal(
    data.summary,
    'Volvo XC40 (2024) est verrouillée mais ouverte : fenêtre avant gauche.',
  );
  assert.match(buildAuthorizationExpiredEvent('fr').data.summary, /Connecter/);
});
