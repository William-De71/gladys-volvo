// The whole integration against the fake Gladys of the SDK
// (`@gladysassistant/integration-sdk/testing`), which checks the discovered
// devices, the states and the transports like the host API does, and a fake
// Volvo API answering with the recorded XC40.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { validateWidgetContent, validateWidgetImage } from '@gladysassistant/integration-sdk';

import { createApp } from '../src/app.js';
import { API_URL } from '../src/volvo-api.js';
import { WIDGETS, WIDGET_ACTIONS } from '../src/widgets.js';
import {
  VIN,
  COMMON,
  COMMANDS,
  copy,
  fakeFetch,
  response,
  rawOf,
  vehicleOf,
  capabilitiesOf,
} from './helpers/fixtures.js';

const CAR = 'xc40_electric_2024';
// A 1 x 1 transparent PNG: the picture of the car served by the Volvo image service.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const CONFIG = {
  api_key: 'vcc-key',
  client_id: 'client',
  client_secret: 'secret',
  access_token: 'access',
  refresh_token: 'refresh',
  token_expires_at: String(Date.now() + 3600 * 1000),
};

/**
 * @description A fake Volvo API serving the recorded XC40.
 * @param {object} [overrides] - `{ resource: data }` replacing a recorded answer.
 * @returns {Function} The fetch.
 */
function volvoApi(overrides = {}) {
  const raw = rawOf(CAR);
  return fakeFetch((url, init) => {
    const path = url.startsWith(API_URL) ? url.slice(API_URL.length) : url;
    const vehicles = '/connected-vehicle/v2/vehicles';
    if (path === vehicles) {
      return response(200, { data: [{ vin: VIN }] });
    }
    if (path === `${vehicles}/${VIN}`) {
      return response(200, { data: vehicleOf(CAR) });
    }
    if (path === `${vehicles}/${VIN}/commands`) {
      return response(200, { data: COMMANDS.map((command) => ({ command })) });
    }
    if (init.method === 'POST' && path.startsWith(`${vehicles}/${VIN}/commands/`)) {
      return response(200, { data: { invokeStatus: 'COMPLETED', message: '' } });
    }
    if (path.startsWith(`${vehicles}/${VIN}/`)) {
      const resource = path.slice(`${vehicles}/${VIN}/`.length);
      const data = overrides[resource] ?? raw[resource] ?? COMMON[resource];
      return data ? response(200, { data: copy(data) }) : response(404, {});
    }
    if (path === `/energy/v2/vehicles/${VIN}/capabilities`) {
      return response(200, { getEnergyState: capabilitiesOf(CAR) });
    }
    if (path === `/energy/v2/vehicles/${VIN}/state`) {
      return response(200, copy(raw.energy));
    }
    if (path === `/location/v1/vehicles/${VIN}/location`) {
      return response(200, { data: copy(COMMON.location) });
    }
    if (url.startsWith('https://cas.volvocars.com/image/')) {
      return response(200, PNG, { 'content-type': 'image/png' });
    }
    return response(404, {});
  });
}

/**
 * @description The integration, connected to a fake Gladys.
 * @param {object} [options] - `{ config, overrides }`.
 * @returns {Promise<{ gladys: object, app: object }>} The fake and the app.
 */
async function startApp({ config = {}, overrides } = {}) {
  const gladys = createFakeGladys({ config: { ...CONFIG, ...config } });
  const app = createApp(gladys, { fetchImpl: volvoApi(overrides) });
  await gladys.connect();
  return { gladys, app };
}

/**
 * @description Create the discovered car, as the user does on the Discovery screen.
 * @param {object} gladys - The fake Gladys.
 * @returns {Promise<object>} The device.
 */
async function createCar(gladys) {
  const [device] = gladys.fake.discoveredDevices;
  await gladys.fake.deviceCreated(device);
  return device;
}

test('a car is offered on the Discovery screen, accepted by the host API checks', async (t) => {
  const { gladys } = await startApp();
  t.after(() => gladys.fake.shutdown());

  assert.equal(gladys.fake.discoveredDevices.length, 1);
  const [device] = gladys.fake.discoveredDevices;
  assert.equal(device.external_id, `ext:test-integration:vehicle:${VIN}`);
  assert.equal(device.should_poll, false);
  for (const feature of device.features) {
    for (const field of ['min', 'max', 'read_only', 'has_feedback']) {
      assert.notEqual(feature[field], undefined, `${feature.external_id} ${field}`);
    }
  }
  assert.equal(gladys.fake.connectionStatus.connected, true);
  for (const language of ['en', 'fr', 'de', 'es']) {
    assert.ok(gladys.fake.connectionStatus.message[language], language);
  }
});

test('creating the car publishes all its states, its transport and refreshes the widget', async (t) => {
  const { gladys } = await startApp();
  t.after(() => gladys.fake.shutdown());
  assert.equal(gladys.fake.states.length, 0, 'nothing before the car exists');

  const device = await createCar(gladys);

  assert.ok(gladys.fake.states.length > 0);
  assert.equal(typeof gladys.fake.lastState(`${device.external_id}:battery_level`), 'number');
  assert.deepEqual(gladys.fake.transports.at(-1), {
    device_external_id: device.external_id,
    transport: 'cloud',
  });
  assert.ok(gladys.fake.widgetRefreshes.includes(WIDGETS.VEHICLE));
});

test('an unchanged reading publishes nothing again', async (t) => {
  const { gladys, app } = await startApp();
  t.after(() => gladys.fake.shutdown());
  await createCar(gladys);
  const published = gladys.fake.states.length;
  const transports = gladys.fake.transports.length;

  await app.poller.round({ force: true });

  assert.equal(gladys.fake.states.length, published);
  assert.equal(gladys.fake.transports.length, transports);
});

test('a car Volvo cannot reach shows a degraded transport, with the reason', async (t) => {
  const { gladys } = await startApp({
    overrides: {
      'command-accessibility': {
        availabilityStatus: {
          value: 'UNAVAILABLE',
          unavailableReason: 'POWER_SAVING_MODE',
          timestamp: '2026-10-11T09:00:00Z',
        },
      },
    },
  });
  t.after(() => gladys.fake.shutdown());

  await createCar(gladys);

  const entry = gladys.fake.transports.at(-1);
  assert.equal(entry.transport, 'cloud');
  assert.equal(entry.degraded, true);
  assert.match(entry.message.en, /power saving/);
  assert.match(entry.message.de, /Energiesparmodus/);
});

test('the texts follow the language setting', async (t) => {
  const { gladys } = await startApp({ config: { language: 'de' } });
  t.after(() => gladys.fake.shutdown());
  const device = await createCar(gladys);

  const warnings = gladys.fake.lastState(`${device.external_id}:warnings`);
  assert.equal(typeof warnings, 'string');
  const [discovered] = gladys.fake.discoveredDevices;
  assert.equal(
    discovered.features.find((f) => f.external_id.endsWith(':odometer')).name,
    'Kilometerstand',
  );
});

test('the widget is valid in every language, and its buttons answer in every language', async (t) => {
  const { gladys } = await startApp();
  t.after(() => gladys.fake.shutdown());
  await createCar(gladys);

  for (const language of ['en', 'fr', 'de', 'es']) {
    const ack = await gladys.fake.widgetGet(WIDGETS.VEHICLE, {
      settings: { show_buttons: true },
      language,
    });
    assert.equal(ack.success, true, language);
    const problems = validateWidgetContent(ack.data.content);
    assert.deepEqual(problems, [], language);
  }

  const ack = await gladys.fake.widgetAction(WIDGETS.VEHICLE, WIDGET_ACTIONS.LOCK, { vin: VIN });
  assert.equal(ack.success, true);
  for (const language of ['en', 'fr', 'de', 'es']) {
    assert.ok(ack.data.message[language], language);
  }
});

test('the configuration screen actions answer in every language', async (t) => {
  const { gladys } = await startApp();
  t.after(() => gladys.fake.shutdown());

  const ack = await gladys.fake.action('test_connection');
  assert.equal(ack.success, true);
  for (const language of ['en', 'fr', 'de', 'es']) {
    assert.ok(ack.data.message[language].includes('…4567'), language);
  }
});

test('the picture of the car is an image the core serves', async (t) => {
  const { gladys } = await startApp();
  t.after(() => gladys.fake.shutdown());

  const ack = await gladys.fake.widgetGet(WIDGETS.VEHICLE, { settings: {} });
  const picture = ack.data.content.components.find((component) => component.type === 'image');
  assert.ok(picture, 'the widget shows the picture');
  const image = await gladys.fake.widgetGetImage(picture.key);
  assert.equal(image.success, true);
  assert.deepEqual(validateWidgetImage(image.data.image), []);
});
