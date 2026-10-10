import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  SCENE_TRIGGERS,
  CHARGING_STATUSES,
  detectEvents,
  buildSceneEvent,
  buildAuthorizationExpiredEvent,
} from '../src/events.js';
import { SCENE_ACTIONS, buildStatusOutputs } from '../src/scene-actions.js';
import { WIDGETS } from '../src/widgets.js';
import { COMMANDS, ENGINE_RUNTIME } from '../src/commands.js';
import {
  POLL_INTERVAL,
  HOME_RADIUS,
  ACCOUNT_FIELD,
  normalizeConfig,
  isReady,
  hasClient,
  readLanguage,
} from '../src/config.js';
import { summarize } from '../src/vehicle.js';
import { infoOf, rawOf } from './helpers/fixtures.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = read('../gladys-assistant-integration.json');
const pkg = read('../package.json');

const byKey = (list) => new Map(list.map((entry) => [entry.key, entry]));
const values = (field) => field.options.map((option) => option.value);

test('is a device integration, in lockstep with package.json', () => {
  assert.equal(manifest.type, 'device');
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${pkg.version}`));
  assert.equal(manifest.location, true, 'getHouses needs it');
});

test('declares exactly the triggers, actions and widgets the code handles', () => {
  assert.deepEqual(
    manifest.scene_triggers.map((trigger) => trigger.key).sort(),
    Object.values(SCENE_TRIGGERS).sort(),
  );
  assert.deepEqual(
    manifest.scene_actions.map((action) => action.key).sort(),
    Object.values(SCENE_ACTIONS).sort(),
  );
  assert.deepEqual(
    manifest.widgets.map((widget) => widget.key).sort(),
    Object.values(WIDGETS).sort(),
  );
  assert.deepEqual(manifest.actions.map((action) => action.key).sort(), [
    'disconnect',
    'refresh',
    'test_connection',
  ]);
});

test('every event carries its filters and exactly its declared variables', () => {
  const info = infoOf('xc40_electric_2024');
  const reading = (edit, extra = {}) => {
    const raw = rawOf('xc40_electric_2024');
    edit(raw);
    return { snapshot: summarize(info, raw), atHome: null, distanceHomeKm: null, ...extra };
  };
  const before = reading(() => {}, { atHome: false, distanceHomeKm: 3 });
  const after = reading(
    (raw) => {
      raw.doors.centralLock.value = 'UNLOCKED';
      raw['engine-status'].engineStatus.value = 'RUNNING';
      raw.energy.chargingStatus.value = 'DONE';
      raw.energy.chargerConnectionStatus.value = 'DISCONNECTED';
      raw.tyres.rearLeft.value = 'LOW_PRESSURE';
    },
    { atHome: true, distanceHomeKm: 0.1 },
  );
  const lockedOpen = reading((raw) => {
    raw.windows.frontLeftWindow.value = 'OPEN';
  });
  const events = [
    ...detectEvents(before, after),
    ...detectEvents(
      reading(() => {}),
      lockedOpen,
    ),
  ];
  const built = events.map((event) =>
    buildSceneEvent(event, {
      vehicle: 'ext:volvo:vehicle:X',
      carName: 'Volvo',
      reading: after,
      language: 'en',
    }),
  );
  built.push(buildAuthorizationExpiredEvent('en'));
  const triggers = byKey(manifest.scene_triggers);
  assert.deepEqual(
    [...new Set(built.map((event) => event.key))].sort(),
    [...triggers.keys()].sort(),
  );
  built.forEach(({ key, data }) => {
    const trigger = triggers.get(key);
    trigger.fields.forEach((field) => assert.ok(field.key in data, `${key}.${field.key}`));
    const declared = new Set([...trigger.fields, ...trigger.variables].map((entry) => entry.key));
    Object.entries(data).forEach(([name, value]) => {
      assert.ok(declared.has(name), `${key}: ${name} undeclared`);
      assert.ok(
        value === null || ['string', 'number', 'boolean'].includes(typeof value),
        `${key}.${name}`,
      );
    });
    trigger.variables.forEach((variable) =>
      assert.ok(variable.key in data, `${key} variable ${variable.key}`),
    );
    trigger.fields
      .filter((field) => field.options)
      .forEach((field) =>
        assert.ok(values(field).includes(data[field.key]), `${key}.${field.key} value`),
      );
  });
  assert.deepEqual(
    values(byKey(triggers.get('charging_changed').fields).get('status')).sort(),
    [...CHARGING_STATUSES].sort(),
  );
});

test('get_status returns exactly its declared outputs', () => {
  const info = infoOf('xc90_phev_2024');
  const reading = {
    snapshot: summarize(info, rawOf('xc90_phev_2024')),
    atHome: null,
    distanceHomeKm: null,
  };
  const outputs = buildStatusOutputs({ info, reading, carName: 'Volvo', language: 'en' });
  const declared = byKey(manifest.scene_actions)
    .get(SCENE_ACTIONS.GET_STATUS)
    .outputs.map((o) => o.key);
  assert.deepEqual(Object.keys(outputs).sort(), [...declared].sort());
});

test('mirrors the commands and bounds of the code', () => {
  const send = byKey(byKey(manifest.scene_actions).get(SCENE_ACTIONS.SEND_COMMAND).fields);
  assert.deepEqual(values(send.get('command')).sort(), Object.keys(COMMANDS).sort());
  ['min', 'max', 'default'].forEach((bound) => {
    assert.equal(send.get('runtime_minutes')[bound], ENGINE_RUNTIME[bound]);
  });
  const config = byKey(manifest.config_schema);
  ['min', 'max', 'default'].forEach((bound) => {
    assert.equal(config.get('poll_interval')[bound], POLL_INTERVAL[bound]);
    assert.equal(config.get('home_radius')[bound], HOME_RADIUS[bound]);
  });
  assert.equal(config.get(ACCOUNT_FIELD).type, 'oauth2');
  ['api_key', 'client_secret'].forEach((key) => assert.equal(config.get(key).type, 'secret'));
});

test('normalizes the configuration', () => {
  const config = normalizeConfig({
    api_key: ' key ',
    client_id: 'id',
    client_secret: 'secret',
    poll_interval: '1',
    home_radius: 'x',
    refresh_token: 'r',
    token_expires_at: '1234',
  });
  assert.equal(config.apiKey, 'key');
  assert.equal(config.pollInterval, POLL_INTERVAL.min);
  assert.equal(config.homeRadius, HOME_RADIUS.default);
  assert.equal(config.tokens.expiresAt, 1234);
  assert.ok(hasClient(config) && isReady(config));
  assert.ok(!isReady(normalizeConfig({ api_key: 'k', client_id: 'i', client_secret: 's' })));
  assert.equal(normalizeConfig(null).pollInterval, POLL_INTERVAL.default);
  assert.equal(readLanguage({ last_language: 'fr' }, 'en'), 'fr');
  assert.equal(readLanguage({ last_language: 'french' }, 'en'), 'en');
});
