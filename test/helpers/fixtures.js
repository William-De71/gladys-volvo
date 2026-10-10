// Shapes of the Volvo answers, recorded by Home Assistant's tests
// (test/fixtures/home-assistant.json), regrouped per car as the poller stores
// them: `raw[resource]` = the `data` of a Connected Vehicle answer,
// `raw.energy` = the Energy state, `raw.location` = the GeoJSON Feature.

import { readFileSync } from 'node:fs';
import { readVehicleInfo } from '../../src/vehicle.js';

const recorded = JSON.parse(
  readFileSync(new URL('../fixtures/home-assistant.json', import.meta.url), 'utf8'),
);

export const VIN = 'YV1ABCDEFG1234567';
export const NOW = Date.parse('2026-10-11T10:00:00Z');

/**
 * @description A deep copy (tests mutate freely).
 * @param {unknown} value - The value.
 * @returns {unknown} The copy.
 */
export const copy = (value) => JSON.parse(JSON.stringify(value));

export const CARS = Object.keys(recorded.cars);

/**
 * @description The raw resources of a recorded car.
 * @param {string} car - xc40_electric_2024, xc90_phev_2024, s90_diesel_2018…
 * @returns {object} The raw resources.
 */
export function rawOf(car) {
  const own = recorded.cars[car];
  const raw = copy(recorded.common);
  raw.statistics = copy(own.statistics);
  if (own.diagnostics) {
    raw.diagnostics = copy(own.diagnostics);
  }
  if (own.energy_state) {
    raw.energy = copy(own.energy_state);
  }
  return raw;
}

/**
 * @description The description of a recorded car.
 * @param {string} car - The car.
 * @param {object} [options] - `{ commands, locationSupported }`.
 * @returns {object} The description (readVehicleInfo).
 */
export function infoOf(car, { commands, locationSupported = true } = {}) {
  const own = recorded.cars[car];
  return readVehicleInfo(VIN, copy(own.vehicle), {
    commands: commands ?? copy(own.commands?.data?.map((c) => c.command) ?? recorded.commands),
    energyCapabilities: copy(own.energy_capabilities ?? {}),
    locationSupported,
  });
}

/**
 * @description The raw details of a recorded car.
 * @param {string} car - The car.
 * @returns {object} The details.
 */
export const vehicleOf = (car) => copy(recorded.cars[car].vehicle);

/**
 * @description The energy capabilities of a recorded car.
 * @param {string} car - The car.
 * @returns {object} The capabilities.
 */
export const capabilitiesOf = (car) => copy(recorded.cars[car].energy_capabilities ?? {});

export const COMMANDS = recorded.commands;
export const COMMON = recorded.common;

export const fakeGladys = {
  externalIds(type, platformId) {
    const device = `ext:volvo:${type}:${platformId}`;
    return { device, feature: (key) => `${device}:${key}` };
  },
};

export const silent = { debug() {}, info() {}, warn() {}, error() {} };

/**
 * @description A minimal fetch Response.
 * @param {number} status - The status.
 * @param {unknown} body - The JSON body (or a Buffer).
 * @param {object} [headers] - The headers.
 * @returns {object} The response.
 */
export function response(status, body, headers = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
    json: async () => {
      if (body === undefined || Buffer.isBuffer(body)) {
        throw new Error('not json');
      }
      return copy(body);
    },
    arrayBuffer: async () => {
      const buffer = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length);
    },
  };
}

/**
 * @description A fake fetch answering from a list of handlers.
 * @param {Function} handler - `(url, init) => response`.
 * @returns {Function & { calls: Array }} The fetch, with its calls.
 */
export function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init, calls.length);
  };
  fn.calls = calls;
  return fn;
}
