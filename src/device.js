// -----------------------------------------------------------------------------
// The "Volvo <model>" devices.
//
// One device per car of the account, offered on the Discovery screen. The
// features follow what the car really reports (Home Assistant does the same):
// a diesel gets fuel and no battery, a car without a sunroof no sunroof, a
// car that does not list the LOCK and UNLOCK commands a read-only lock. A
// feature appears when a scan finds its value: scan again after a first drive
// if one is missing.
//
// The categories are the "electrical vehicle" ones of Gladys (the only car
// categories), used for every engine: the odometer or the doors of a diesel
// are no different. Fuel and service distances use the generic sensors.
//
// External ids: ext:<selector>:vehicle:<VIN>[:<feature>].
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as CATEGORIES,
  DEVICE_FEATURE_TYPES as TYPES,
  DEVICE_FEATURE_UNITS as UNITS,
} from '@gladysassistant/integration-sdk';
import { t, warningLabel } from './i18n.js';
import { supports } from './commands.js';

const DEVICE_TYPE = 'vehicle';
const BINARY = { min: 0, max: 1 };

const FEATURE_KEYS = {
  BATTERY_LEVEL: 'battery_level',
  BATTERY_RANGE: 'battery_range',
  BATTERY_ENERGY: 'battery_energy',
  PLUGGED: 'plugged',
  CHARGING_STATUS: 'charging_status',
  CHARGE_POWER: 'charge_power',
  CHARGE_CURRENT_LIMIT: 'charge_current_limit',
  CHARGE_TARGET: 'charge_target',
  CHARGE_TIME: 'charge_time',
  FUEL_AMOUNT: 'fuel_amount',
  FUEL_RANGE: 'fuel_range',
  AVERAGE_ENERGY: 'average_energy',
  ODOMETER: 'odometer',
  LOCK: 'lock',
  DOORS: 'doors',
  TAILGATE: 'tailgate',
  HOOD: 'hood',
  TANK_LID: 'tank_lid',
  WINDOWS: 'windows',
  SUNROOF: 'sunroof',
  CLIMATE: 'climate',
  SERVICE_DISTANCE: 'service_distance',
  SERVICE_DAYS: 'service_days',
  WARNINGS: 'warnings',
  DISTANCE_HOME: 'distance_home',
};

const known = (value) => value !== null && value !== undefined;
const binary = (value) => (value ? 1 : 0);

/**
 * @description The texts a text feature shows.
 * @param {object} snapshot - The snapshot.
 * @param {string} language - The language.
 * @returns {string} The warnings, or "None".
 */
function warningsText(snapshot, language) {
  if (snapshot.warnings.length === 0) {
    return t('noWarning', language);
  }
  return snapshot.warnings.map((warning) => warningLabel(warning, language)).join(', ');
}

// Every feature: its Gladys shape, whether this car has it, and its state.
// `state` returns a number, `{ text }`, or null when unknown (not published).
const FEATURES = [
  {
    key: FEATURE_KEYS.BATTERY_LEVEL,
    name: 'featureBatteryLevel',
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_BATTERY,
      type: TYPES.ELECTRICAL_VEHICLE_BATTERY.BATTERY_LEVEL,
      unit: UNITS.PERCENT,
      min: 0,
      max: 100,
    }),
    has: (info, s) => info.hasBattery && known(s.battery.level),
    state: (s) => s.battery.level,
  },
  {
    key: FEATURE_KEYS.BATTERY_RANGE,
    name: 'featureBatteryRange',
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_BATTERY,
      type: TYPES.ELECTRICAL_VEHICLE_BATTERY.BATTERY_RANGE_ESTIMATE,
      unit: UNITS.KM,
      min: 0,
      max: 1500,
    }),
    has: (info, s) => info.hasBattery && known(s.battery.rangeKm),
    state: (s) => s.battery.rangeKm,
  },
  {
    key: FEATURE_KEYS.BATTERY_ENERGY,
    name: 'featureBatteryEnergy',
    shape: (info) => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_BATTERY,
      type: TYPES.ELECTRICAL_VEHICLE_BATTERY.BATTERY_ENERGY_REMAINING,
      unit: UNITS.KILOWATT_HOUR,
      min: 0,
      max: Math.ceil(info.batteryCapacityKwh ?? 200),
    }),
    has: (info, s) => info.hasBattery && known(s.battery.energyKwh),
    state: (s) => s.battery.energyKwh,
  },
  {
    key: FEATURE_KEYS.PLUGGED,
    name: 'featurePlugged',
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_CHARGE,
      type: TYPES.ELECTRICAL_VEHICLE_CHARGE.PLUGGED,
      ...BINARY,
    }),
    has: (info, s) => known(s.charge.connection),
    state: (s) => (known(s.charge.connection) ? binary(s.charge.connection === 'connected') : null),
  },
  {
    key: FEATURE_KEYS.CHARGING_STATUS,
    name: 'featureChargingStatus',
    shape: () => ({
      category: CATEGORIES.TEXT,
      type: TYPES.TEXT.TEXT,
      keep_history: false,
      min: 0,
      max: 0,
    }),
    has: (info, s) => known(s.charge.status),
    state: (s, { language }) =>
      known(s.charge.status) ? { text: t(`charge_${s.charge.status}`, language) } : null,
  },
  {
    key: FEATURE_KEYS.CHARGE_POWER,
    name: 'featureChargePower',
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_CHARGE,
      type: TYPES.ELECTRICAL_VEHICLE_CHARGE.CHARGE_POWER,
      unit: UNITS.KILOWATT,
      min: 0,
      max: 400,
    }),
    has: (info, s) => known(s.charge.powerKw),
    state: (s) => s.charge.powerKw,
  },
  {
    key: FEATURE_KEYS.CHARGE_CURRENT_LIMIT,
    name: 'featureChargeCurrentLimit',
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_CHARGE,
      type: TYPES.ELECTRICAL_VEHICLE_CHARGE.TARGET_CURRENT,
      unit: UNITS.AMPERE,
      min: 0,
      max: 64,
    }),
    has: (info, s) => known(s.charge.currentLimitA),
    state: (s) => s.charge.currentLimitA,
  },
  {
    key: FEATURE_KEYS.CHARGE_TARGET,
    name: 'featureTargetLevel',
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_CHARGE,
      type: TYPES.ELECTRICAL_VEHICLE_CHARGE.TARGET_CHARGE_LIMIT,
      unit: UNITS.PERCENT,
      min: 0,
      max: 100,
    }),
    has: (info, s) => known(s.charge.targetLevel),
    state: (s) => s.charge.targetLevel,
  },
  {
    key: FEATURE_KEYS.CHARGE_TIME,
    name: 'featureChargeTime',
    shape: () => ({
      category: CATEGORIES.DURATION,
      type: TYPES.DURATION.INTEGER,
      unit: UNITS.MINUTES,
      min: 0,
      max: 5000,
    }),
    has: (info, s) => known(s.charge.minutesToTarget),
    state: (s) => s.charge.minutesToTarget,
  },
  {
    key: FEATURE_KEYS.FUEL_AMOUNT,
    name: 'featureFuelAmount',
    shape: () => ({
      category: CATEGORIES.VOLUME_SENSOR,
      type: TYPES.VOLUME_SENSOR.DECIMAL,
      unit: UNITS.LITER,
      min: 0,
      max: 200,
    }),
    has: (info, s) => info.hasCombustion && known(s.fuel.liters),
    state: (s) => s.fuel.liters,
  },
  {
    key: FEATURE_KEYS.FUEL_RANGE,
    name: 'featureFuelRange',
    shape: () => ({
      category: CATEGORIES.DISTANCE_SENSOR,
      type: TYPES.SENSOR.INTEGER,
      unit: UNITS.KM,
      min: 0,
      max: 3000,
    }),
    has: (info, s) => info.hasCombustion && known(s.fuel.rangeKm),
    state: (s) => s.fuel.rangeKm,
  },
  {
    key: FEATURE_KEYS.AVERAGE_ENERGY,
    name: 'featureAverageEnergy',
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_CONSUMPTION,
      type: TYPES.ELECTRICAL_VEHICLE_CONSUMPTION.ENERGY_CONSUMPTION,
      unit: UNITS.KILOWATT_HOUR_PER_100_KM,
      min: 0,
      max: 100,
    }),
    has: (info, s) => info.hasBattery && known(s.statistics.averageEnergy),
    state: (s) => s.statistics.averageEnergy,
  },
  {
    key: FEATURE_KEYS.ODOMETER,
    name: 'featureOdometer',
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_STATE,
      type: TYPES.ELECTRICAL_VEHICLE_STATE.ODOMETER,
      unit: UNITS.KM,
      min: 0,
      max: 2000000,
    }),
    has: (info, s) => known(s.odometerKm),
    state: (s) => s.odometerKm,
  },
  {
    key: FEATURE_KEYS.LOCK,
    name: 'featureLock',
    // 1 = locked, as the dashboard labels it ("Verrouillée").
    shape: (info) => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_COMMAND,
      type: TYPES.ELECTRICAL_VEHICLE_COMMAND.LOCK,
      read_only: !(supports(info, 'lock') && supports(info, 'unlock')),
      has_feedback: true,
      ...BINARY,
    }),
    has: (info, s) => known(s.lock),
    state: (s) => (known(s.lock) ? binary(s.lock === 'locked') : null),
  },
  ...[
    [FEATURE_KEYS.DOORS, 'featureDoors', (s) => s.doorsOpen],
    [FEATURE_KEYS.TAILGATE, 'featureTailgate', (s) => s.openings.tailgate],
    [FEATURE_KEYS.HOOD, 'featureHood', (s) => s.openings.hood],
    [FEATURE_KEYS.TANK_LID, 'featureTankLid', (s) => s.openings.tankLid],
  ].map(([key, name, read]) => ({
    key,
    name,
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_STATE,
      type: TYPES.ELECTRICAL_VEHICLE_STATE.DOOR_OPENED,
      ...BINARY,
    }),
    has: (info, s) => known(read(s)),
    state: (s) => (known(read(s)) ? binary(read(s)) : null),
  })),
  ...[
    [FEATURE_KEYS.WINDOWS, 'featureWindows', (s) => s.windowsOpen],
    [FEATURE_KEYS.SUNROOF, 'featureSunroof', (s) => s.openings.sunroof],
  ].map(([key, name, read]) => ({
    key,
    name,
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_STATE,
      type: TYPES.ELECTRICAL_VEHICLE_STATE.WINDOW_OPENED,
      ...BINARY,
    }),
    has: (info, s) => known(read(s)),
    state: (s) => (known(read(s)) ? binary(read(s)) : null),
  })),
  {
    key: FEATURE_KEYS.CLIMATE,
    name: 'featureClimate',
    // Volvo does not report whether the climate runs: the state is the last
    // command, back to 0 once the climate session is over (see poller.js).
    shape: () => ({
      category: CATEGORIES.ELECTRICAL_VEHICLE_CLIMATE,
      type: TYPES.ELECTRICAL_VEHICLE_CLIMATE.CLIMATE_ON,
      read_only: false,
      has_feedback: false,
      keep_history: false,
      ...BINARY,
    }),
    has: (info) => supports(info, 'climatization_start') && supports(info, 'climatization_stop'),
    state: (s, { climateOn }) => binary(climateOn),
  },
  {
    key: FEATURE_KEYS.SERVICE_DISTANCE,
    name: 'featureServiceDistance',
    shape: () => ({
      category: CATEGORIES.DISTANCE_SENSOR,
      type: TYPES.SENSOR.INTEGER,
      unit: UNITS.KM,
      min: -100000,
      max: 100000,
    }),
    has: (info, s) => known(s.service.distanceKm),
    state: (s) => s.service.distanceKm,
  },
  {
    key: FEATURE_KEYS.SERVICE_DAYS,
    name: 'featureServiceDays',
    shape: () => ({
      category: CATEGORIES.DURATION,
      type: TYPES.DURATION.INTEGER,
      unit: UNITS.DAYS,
      min: -3650,
      max: 3650,
    }),
    has: (info, s) => known(s.service.days),
    state: (s) => s.service.days,
  },
  {
    key: FEATURE_KEYS.WARNINGS,
    name: 'featureWarnings',
    shape: () => ({
      category: CATEGORIES.TEXT,
      type: TYPES.TEXT.TEXT,
      keep_history: false,
      min: 0,
      max: 0,
    }),
    has: () => true,
    state: (s, { language }) => ({ text: warningsText(s, language) }),
  },
  {
    key: FEATURE_KEYS.DISTANCE_HOME,
    name: 'featureDistanceHome',
    shape: () => ({
      category: CATEGORIES.DISTANCE_SENSOR,
      type: TYPES.SENSOR.DECIMAL,
      unit: UNITS.KM,
      min: 0,
      max: 20000,
    }),
    has: (info, s, { distanceHomeKm }) => known(distanceHomeKm),
    state: (s, { distanceHomeKm }) =>
      known(distanceHomeKm) ? Math.round(distanceHomeKm * 10) / 10 : null,
  },
];

/**
 * @description The external ids of a car.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {string} vin - The VIN.
 * @returns {{ device: string, feature: Function }} The ids.
 * @example
 * idsOf(gladys, 'YV1ABCDEFG1234567').device; // -> 'ext:volvo:vehicle:YV1ABCDEFG1234567'
 */
function idsOf(gladys, vin) {
  return gladys.externalIds(DEVICE_TYPE, vin);
}

/**
 * @description The VIN and feature key an external id stands for.
 * @param {string} externalId - A device or feature external id.
 * @returns {{ vin: string, feature: string|null }|null} Its parts.
 * @example
 * parseExternalId('ext:volvo:vehicle:YV1ABCDEFG1234567:lock'); // -> { vin: 'YV1…', feature: 'lock' }
 */
function parseExternalId(externalId) {
  const match = /:vehicle:([A-HJ-NPR-Z0-9]{17})(?::([a-z_]+))?$/.exec(String(externalId ?? ''));
  return match ? { vin: match[1], feature: match[2] ?? null } : null;
}

/**
 * @description The name of a car: "Volvo XC40 (2024)".
 * @param {object} info - The car description.
 * @param {string} language - The language.
 * @returns {string} The name.
 */
function vehicleName(info, language = 'en') {
  const name = t('deviceName', language, { model: info.model });
  return info.modelYear ? `${name} (${info.modelYear})` : name;
}

/**
 * @description The context of the states: language, climate, distance home.
 * @typedef {{ language: string, climateOn: boolean, distanceHomeKm: number|null }} StateContext
 */

/**
 * @description Build the device of a car.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} info - The car description (vehicle.js).
 * @param {object} snapshot - Its snapshot.
 * @param {StateContext} context - The context.
 * @returns {object} The discovered device.
 * @example
 * buildDevice(gladys, info, snapshot, { language: 'fr', climateOn: false, distanceHomeKm: null });
 */
function buildDevice(gladys, info, snapshot, context) {
  const ids = idsOf(gladys, info.vin);
  const language = context.language ?? 'en';
  return {
    name: vehicleName(info, language),
    external_id: ids.device,
    should_poll: false,
    params: [
      { name: 'VOLVO_VIN', value: info.vin },
      { name: 'VOLVO_MODEL', value: info.model },
      { name: 'VOLVO_FUEL_TYPE', value: info.fuelType || 'UNKNOWN' },
    ],
    features: FEATURES.filter((feature) => feature.has(info, snapshot, context)).map((feature) => ({
      name: t(feature.name, language),
      external_id: ids.feature(feature.key),
      read_only: true,
      has_feedback: false,
      keep_history: true,
      ...feature.shape(info),
    })),
  };
}

/**
 * @description The states of a car. Unknown values are omitted, never sent
 * as 0.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} info - The car description.
 * @param {object} snapshot - Its snapshot.
 * @param {StateContext} context - The context.
 * @param {Set<string>} [only] - Feature external ids to keep (the created ones).
 * @returns {Array<object>} The states.
 * @example
 * await gladys.publishStates(buildStates(gladys, info, snapshot, context));
 */
function buildStates(gladys, info, snapshot, context, only = null) {
  const ids = idsOf(gladys, info.vin);
  const states = [];
  FEATURES.forEach((feature) => {
    const externalId = ids.feature(feature.key);
    if (only && !only.has(externalId)) {
      return;
    }
    const value = feature.state(snapshot, context);
    if (value === null || value === undefined) {
      return;
    }
    if (typeof value === 'object') {
      states.push({ device_feature_external_id: externalId, text: value.text });
    } else if (Number.isFinite(value)) {
      states.push({ device_feature_external_id: externalId, state: value });
    }
  });
  return states;
}

export {
  DEVICE_TYPE,
  FEATURE_KEYS,
  FEATURES,
  idsOf,
  parseExternalId,
  vehicleName,
  buildDevice,
  buildStates,
};
