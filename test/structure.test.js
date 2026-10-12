// Non-regression of the structure users depend on (see test/helpers/structure.js).
//
// test/fixtures/discovery.baseline.json was generated from v1.0.0, before any
// change. Additions are allowed (a new feature, a new setting); a removal or a
// change of an eternal field fails here, unless it is listed in
// ALLOWED_CHANGES with its migration, documented in the changelog, the README
// and the forum message.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { discoveryStructure, manifestKeys } from './helpers/structure.js';

const baseline = JSON.parse(
  readFileSync(new URL('./fixtures/discovery.baseline.json', import.meta.url), 'utf8'),
);

// feature key -> the eternal fields that changed on purpose, { from, to }.
const ALLOWED_CHANGES = {
  // 1.1.0: `distance-sensor` + `integer` has no icon nor label in the Gladys
  // UI ("undefined" on the Discovery screen); `decimal` is the one pair the
  // core knows. Same external id: "Update" on the Discovery screen keeps the
  // history, and a car not updated keeps working (the values are the same).
  fuel_range: { type: { from: 'integer', to: 'decimal' } },
  service_distance: { type: { from: 'integer', to: 'decimal' } },
};

const featureKey = (externalId) => externalId.split(':').pop();

/**
 * @description Apply the allowed changes to a baseline feature.
 * @param {object} feature - The baseline feature.
 * @returns {object} The feature expected now.
 */
function expected(feature) {
  const changes = ALLOWED_CHANGES[featureKey(feature.external_id)] ?? {};
  const result = { ...feature };
  for (const [field, { from, to }] of Object.entries(changes)) {
    assert.equal(feature[field], from, `${feature.external_id}: baseline ${field}`);
    result[field] = to;
  }
  return result;
}

test('every car keeps its device and feature structure', () => {
  const current = discoveryStructure();
  for (const [car, before] of Object.entries(baseline.discovery)) {
    const now = current[car];
    assert.ok(now, `${car}: still offered`);
    assert.equal(now.external_id, before.external_id, `${car}: device external id`);
    assert.equal(now.should_poll, before.should_poll, `${car}: should_poll`);
    assert.equal(now.poll_frequency, before.poll_frequency, `${car}: poll_frequency`);
    const byId = new Map(now.features.map((feature) => [feature.external_id, feature]));
    for (const feature of before.features) {
      assert.ok(byId.has(feature.external_id), `${car}: ${feature.external_id} still published`);
      assert.deepEqual(byId.get(feature.external_id), expected(feature), feature.external_id);
    }
  }
});

test('every allowed change still matches a baseline feature', () => {
  const keys = new Set(
    Object.values(baseline.discovery).flatMap((car) =>
      car.features.map((feature) => featureKey(feature.external_id)),
    ),
  );
  for (const key of Object.keys(ALLOWED_CHANGES)) {
    assert.ok(keys.has(key), `${key} is in the baseline`);
  }
});

test('the manifest keeps every stored key', () => {
  const now = manifestKeys();
  const before = baseline.manifest;
  for (const list of ['config_schema', 'actions']) {
    for (const key of before[list]) {
      assert.ok(now[list].includes(key), `${list}.${key} kept`);
    }
  }
  for (const list of ['widgets', 'scene_triggers', 'scene_actions']) {
    for (const item of before[list]) {
      const current = now[list].find((candidate) => candidate.key === item.key);
      assert.ok(current, `${list}.${item.key} kept`);
      for (const [field, keys] of Object.entries(item)) {
        if (field === 'key') {
          continue;
        }
        for (const key of keys) {
          assert.ok(current[field].includes(key), `${list}.${item.key}.${field}.${key} kept`);
        }
      }
    }
  }
});
