import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';

import { buildVehicleWidget, messageContent, WIDGET_ACTIONS } from '../src/widgets.js';
import { buildStatusOutputs } from '../src/scene-actions.js';
import { summarize } from '../src/vehicle.js';
import { infoOf, rawOf, NOW, CARS } from './helpers/fixtures.js';

/**
 * @description A reading of a recorded car.
 * @param {string} car - The car.
 * @param {Function} [edit] - `(raw) => void`.
 * @param {object} [extra] - Extra reading fields.
 * @returns {{ info: object, reading: object }} The car.
 */
function carOf(car, edit = () => {}, extra = {}) {
  const info = infoOf(car);
  const raw = rawOf(car);
  edit(raw);
  return {
    info,
    reading: {
      snapshot: summarize(info, raw),
      atHome: false,
      distanceHomeKm: 12.4,
      climateOn: false,
      readAt: NOW,
      ...extra,
    },
  };
}

const actionsOf = (content) =>
  content.components.filter((c) => c.type === 'button' && c.action).map((c) => c.action.key);

test('every recorded car gives a valid card, within the budget', () => {
  CARS.forEach((car) => {
    ['fr', 'en'].forEach((language) => {
      const { info, reading } = carOf(car, (raw) => {
        raw.windows.rearLeftWindow.value = 'OPEN';
        raw.doors.frontRightDoor.value = 'OPEN';
        raw.tyres.frontLeft.value = 'LOW_PRESSURE';
        raw.warnings.brakeLightLeftWarning.value = 'FAILURE';
      });
      const content = buildVehicleWidget({
        info,
        reading,
        imageKey: 'car-0123456789ab',
        language,
        now: NOW,
      });
      assert.deepEqual(validateWidgetContent(content), [], `${car} ${language}`);
      assert.ok(content.components.length <= 8);
    });
  });
});

test('an electric car: battery tiles, unlock asks first', () => {
  const { info, reading } = carOf('xc40_electric_2024');
  const content = buildVehicleWidget({ info, reading, imageKey: null, language: 'fr', now: NOW });
  const [battery, range] = content.components.filter((c) => c.type === 'value');
  assert.equal(battery.value, '53');
  assert.equal(battery.icon, 'battery-charging');
  assert.equal(range.value, '250');
  const unlock = content.components.find((c) => c.action?.key === WIDGET_ACTIONS.UNLOCK);
  assert.equal(unlock.action.confirm, true);
  assert.deepEqual(unlock.action.params, { vin: info.vin });
  assert.ok(
    content.components.some((c) => c.link?.url.startsWith('https://www.openstreetmap.org/')),
  );
  const status = content.components.find((c) => c.type === 'status');
  assert.ok(status.items.some((item) => item.value === 'À 12 km'));
});

test('a diesel: fuel tiles; lock and climate buttons follow the state', () => {
  const { info, reading } = carOf(
    's90_diesel_2018',
    (raw) => {
      raw.doors.centralLock.value = 'UNLOCKED';
    },
    { climateOn: true },
  );
  const content = buildVehicleWidget({ info, reading, imageKey: null, language: 'en', now: NOW });
  const fuel = content.components.find((c) => c.type === 'value');
  assert.equal(fuel.unit, 'L');
  assert.deepEqual(actionsOf(content), [
    WIDGET_ACTIONS.LOCK,
    WIDGET_ACTIONS.CLIMATE_STOP,
    WIDGET_ACTIONS.FLASH,
  ]);
  const hidden = buildVehicleWidget({
    info,
    reading,
    imageKey: null,
    settings: { show_buttons: false },
    language: 'en',
    now: NOW,
  });
  assert.equal(hidden.components.filter((c) => c.type === 'button').length, 0);
});

test('no reading yet, messages', () => {
  const content = buildVehicleWidget({
    info: infoOf('xc40_electric_2024'),
    reading: null,
    language: 'fr',
    now: NOW,
  });
  assert.deepEqual(validateWidgetContent(content), []);
  assert.deepEqual(validateWidgetContent(messageContent('x')), []);
});

test('the status of a scene action', () => {
  const { info, reading } = carOf(
    'xc90_phev_2024',
    (raw) => {
      raw.doors.tailgate.value = 'OPEN';
    },
    { atHome: true, distanceHomeKm: 0.04 },
  );
  const outputs = buildStatusOutputs({
    info,
    reading,
    carName: 'Volvo XC90 (2024)',
    language: 'fr',
  });
  assert.equal(outputs.locked, true);
  assert.equal(outputs.all_closed, false);
  assert.equal(outputs.openings, 'hayon');
  assert.equal(outputs.battery_level, 87.3);
  assert.equal(outputs.fuel_liters, 47.3);
  assert.equal(outputs.plugged, false);
  assert.equal(outputs.at_home, true);
  assert.equal(outputs.distance_home_km, 0);
  assert.match(outputs.map_url, /openstreetmap/);
  assert.equal(
    outputs.summary,
    'Volvo XC90 (2024) : verrouillée, ouvert : hayon. Batterie 87 %, 43 km.',
  );
});
