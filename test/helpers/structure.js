// The structure Gladys users depend on, recorded once in
// test/fixtures/discovery.baseline.json and compared by test/structure.test.js.
//
// Device and feature external ids, and per feature `category`, `type`,
// `unit`, `min`, `max` and `step`, are what the "Update" button of the
// Discovery screen compares: changing one may force users to delete and
// re-create their car. The keys of the manifest (settings, actions, widget,
// scene triggers and actions, their fields, variables and outputs) are stored
// in dashboards and scenes. None of them may change without a documented
// migration.

import { readFileSync } from 'node:fs';
import { buildDevice } from '../../src/device.js';
import { summarize } from '../../src/vehicle.js';
import { WIDGET_ACTIONS } from '../../src/widgets.js';
import { CARS, infoOf, rawOf, fakeGladys } from './fixtures.js';

const ETERNAL_FEATURE_FIELDS = ['external_id', 'category', 'type', 'unit', 'min', 'max', 'step'];

const pick = (object, keys) =>
  Object.fromEntries(
    keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]),
  );

/**
 * @description The discovery structure of every recorded car, with every
 * optional feature present (climate, distance from home).
 * @returns {object} The structure, per car.
 */
export function discoveryStructure() {
  const context = { language: 'en', climateOn: false, distanceHomeKm: 1.5 };
  return Object.fromEntries(
    CARS.map((car) => {
      const info = infoOf(car);
      const device = buildDevice(fakeGladys, info, summarize(info, rawOf(car)), context);
      return [
        car,
        {
          ...pick(device, ['external_id', 'should_poll', 'poll_frequency']),
          features: device.features.map((feature) => pick(feature, ETERNAL_FEATURE_FIELDS)),
        },
      ];
    }),
  );
}

const keysOf = (list) => (list ?? []).map((item) => item.key);

/**
 * @description The keys of the manifest that users store.
 * @returns {object} The keys.
 */
export function manifestKeys() {
  const manifest = JSON.parse(
    readFileSync(new URL('../../gladys-assistant-integration.json', import.meta.url), 'utf8'),
  );
  return {
    config_schema: keysOf(manifest.config_schema),
    actions: keysOf(manifest.actions),
    widgets: (manifest.widgets ?? []).map((widget) => ({
      key: widget.key,
      settings: keysOf(widget.settings),
      button_actions: Object.values(WIDGET_ACTIONS).sort(),
    })),
    scene_triggers: (manifest.scene_triggers ?? []).map((trigger) => ({
      key: trigger.key,
      fields: keysOf(trigger.fields),
      variables: keysOf(trigger.variables),
    })),
    scene_actions: (manifest.scene_actions ?? []).map((action) => ({
      key: action.key,
      fields: keysOf(action.fields),
      outputs: keysOf(action.outputs),
    })),
  };
}
