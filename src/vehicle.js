// -----------------------------------------------------------------------------
// Reading the Volvo answers into one snapshot per car.
//
// The poller keeps the last good answer of every resource (`raw`), and
// `summarize` derives the snapshot the rest of the code reads: lock, openings,
// battery and charge, fuel, statistics, service, warnings, position. Pure
// functions only: the tests feed them the shapes recorded by Home Assistant.
//
// Rules of the API, all learned the hard way by others:
//   - every field is `{ value, unit, timestamp }` (Energy: `updatedAt` and a
//     `status`; ERROR means "not for this car") and numbers may be strings;
//   - UNSPECIFIED means the car does not report it (a sunroof it has not);
//   - the electric range of the Energy API can be in miles while the trip
//     computer gives the km the official app shows: the trip computer wins;
//   - a value that cannot be read is null, never 0 (a 0 would fire the
//     "lower than" scenes and draw a cliff in the history).
// -----------------------------------------------------------------------------

import { RESOURCES } from './volvo-api.js';

const MILE_IN_KM = 1.609344;
const NONE = 'UNSPECIFIED';

// Openings reported by the `doors` and `windows` resources.
const DOORS = ['frontLeftDoor', 'frontRightDoor', 'rearLeftDoor', 'rearRightDoor'];
const WINDOWS = ['frontLeftWindow', 'frontRightWindow', 'rearLeftWindow', 'rearRightWindow'];
const OTHER_OPENINGS = ['tailgate', 'hood', 'tankLid', 'sunroof'];
const TYRES = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'];

// Warnings: resource -> field -> values that mean "a problem". The `warnings`
// resource (bulbs) is read generically: any `…Warning` at FAILURE.
const WARNING_FIELDS = {
  [RESOURCES.BRAKES]: { brakeFluidLevelWarning: ['TOO_LOW'] },
  [RESOURCES.ENGINE]: {
    oilLevelWarning: ['SERVICE_REQUIRED', 'TOO_LOW', 'TOO_HIGH'],
    engineCoolantLevelWarning: ['TOO_LOW'],
  },
  [RESOURCES.DIAGNOSTICS]: { washerFluidLevelWarning: ['TOO_LOW'] },
};
const TYRE_PROBLEMS = ['VERY_LOW_PRESSURE', 'LOW_PRESSURE', 'HIGH_PRESSURE'];

// Energy fields, with the old name the API still sends for one of them.
const ENERGY_ALIASES = { chargingSystemStatus: 'chargingStatus' };

/**
 * @description Read one API field.
 * @param {unknown} field - `{ value, unit, timestamp|updatedAt, status }`.
 * @returns {{ value: unknown, unit: string, at: number|null }|null} The field,
 * null when absent, in error or UNSPECIFIED.
 * @example
 * readField({ value: 'LOCKED', timestamp: '2024-12-30T14:20:20.570Z' });
 */
function readField(field) {
  if (!field || typeof field !== 'object' || field.status === 'ERROR') {
    return null;
  }
  const { value } = field;
  if (value === undefined || value === null || value === '' || value === NONE) {
    return null;
  }
  const time = Date.parse(field.timestamp ?? field.updatedAt ?? '');
  return {
    value,
    unit: typeof field.unit === 'string' ? field.unit.toLowerCase() : '',
    at: Number.isFinite(time) ? time : null,
  };
}

/**
 * @description The numeric value of a field.
 * @param {unknown} field - The raw field.
 * @returns {number|null} The number, null when not a finite number.
 * @example
 * numberOf({ value: '47.3', unit: 'l' }); // -> 47.3
 */
function numberOf(field) {
  const read = readField(field);
  if (!read) {
    return null;
  }
  const value = typeof read.value === 'string' ? Number(read.value.trim()) : read.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * @description A distance field in km, converted from miles when needed.
 * @param {unknown} field - The raw field.
 * @returns {number|null} The km.
 * @example
 * kmOf({ value: 150, unit: 'mi' }); // -> 241.4
 */
function kmOf(field) {
  const value = numberOf(field);
  if (value === null) {
    return null;
  }
  const unit = readField(field).unit;
  return unit === 'mi' || unit === 'miles' || unit === 'mile' ? value * MILE_IN_KM : value;
}

/**
 * @description The string value of a field, upper-cased.
 * @param {unknown} field - The raw field.
 * @returns {string|null} The value.
 * @example
 * textOf({ value: 'locked' }); // -> 'LOCKED'
 */
function textOf(field) {
  const read = readField(field);
  return read && typeof read.value === 'string' ? read.value.toUpperCase() : null;
}

/**
 * @description Whether an opening is open.
 * @param {unknown} field - The raw field.
 * @returns {boolean|null} true for OPEN/AJAR, false for CLOSED, null otherwise.
 * @example
 * isOpen({ value: 'AJAR' }); // -> true
 */
function isOpen(field) {
  const value = textOf(field);
  if (value === 'OPEN' || value === 'AJAR') {
    return true;
  }
  return value === 'CLOSED' ? false : null;
}

/**
 * @description "Any of these is open", null when none of them is known.
 * @param {Array<boolean|null>} states - The states.
 * @returns {boolean|null} The aggregate.
 */
function anyOpen(states) {
  const known = states.filter((state) => state !== null);
  return known.length === 0 ? null : known.some(Boolean);
}

/**
 * @description Round a number, keeping null.
 * @param {number|null} value - The value.
 * @param {number} [digits] - Decimals.
 * @returns {number|null} The rounded value.
 */
function round(value, digits = 0) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * @description Read the details of a car (`getVehicle`) and what it supports.
 * @param {string} vin - The VIN.
 * @param {object} details - The raw details.
 * @param {object} [options] - `{ commands, energyCapabilities, locationSupported }`.
 * @returns {object} The car description.
 * @example
 * readVehicleInfo('YV1…', details, { commands: ['LOCK'], energyCapabilities });
 */
function readVehicleInfo(
  vin,
  details = {},
  { commands = [], energyCapabilities = {}, locationSupported = false } = {},
) {
  const fuelType = typeof details.fuelType === 'string' ? details.fuelType.toUpperCase() : '';
  const description = details.descriptions ?? details.description ?? {};
  const capacity = Number(details.batteryCapacityKWH);
  const energySupported =
    energyCapabilities.isSupported === true
      ? Object.entries(energyCapabilities)
          .filter(([, value]) => value && typeof value === 'object' && value.isSupported === true)
          .map(([key]) => ENERGY_ALIASES[key] ?? key)
      : [];
  const image = details.images?.exteriorImageUrl;
  return {
    vin,
    model: typeof description.model === 'string' ? description.model : 'Volvo',
    modelYear: Number.isInteger(details.modelYear) ? details.modelYear : null,
    fuelType,
    colour: typeof details.externalColour === 'string' ? details.externalColour : '',
    // ELECTRIC, PETROL/ELECTRIC, NONE (an EX30 reports NONE): a battery.
    hasBattery: ['ELECTRIC', 'PETROL/ELECTRIC', 'NONE'].includes(fuelType),
    hasCombustion: ['DIESEL', 'PETROL', 'PETROL/ELECTRIC'].includes(fuelType),
    batteryCapacityKwh: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
    imageUrl: typeof image === 'string' && image.startsWith('https://') ? image : null,
    commands: commands.map((name) => String(name).toUpperCase()),
    energySupported,
    locationSupported,
  };
}

/**
 * @description The warnings raised by the resources.
 * @param {object} raw - The raw resources.
 * @returns {string[]} Warning keys: the API field names, `tyre:<position>` for
 * the tyres, `service` for a service due.
 * @example
 * readWarnings({ tyres: { frontLeft: { value: 'LOW_PRESSURE' } } }); // -> ['tyre:frontLeft']
 */
function readWarnings(raw) {
  const warnings = [];
  Object.entries(WARNING_FIELDS).forEach(([resource, fields]) => {
    Object.entries(fields).forEach(([name, problems]) => {
      if (problems.includes(textOf(raw[resource]?.[name]))) {
        warnings.push(name);
      }
    });
  });
  Object.entries(raw[RESOURCES.WARNINGS] ?? {}).forEach(([name, field]) => {
    if (name.endsWith('Warning') && textOf(field) === 'FAILURE') {
      warnings.push(name);
    }
  });
  TYRES.forEach((position) => {
    if (TYRE_PROBLEMS.includes(textOf(raw[RESOURCES.TYRES]?.[position]))) {
      warnings.push(`tyre:${position}`);
    }
  });
  const service = textOf(raw[RESOURCES.DIAGNOSTICS]?.serviceWarning);
  if (service && service !== 'NO_WARNING' && service !== 'UNKNOWN_WARNING') {
    warnings.push('service');
  }
  return warnings;
}

/**
 * @description The service level of the `serviceWarning` value.
 * @param {string|null} value - The value.
 * @returns {'ok'|'soon'|'due'|'overdue'|null} The level.
 * @example
 * serviceLevel('DISTANCE_DRIVEN_OVERDUE_FOR_SERVICE'); // -> 'overdue'
 */
function serviceLevel(value) {
  if (!value || value === 'UNKNOWN_WARNING') {
    return null;
  }
  if (value === 'NO_WARNING') {
    return 'ok';
  }
  if (value.includes('OVERDUE')) {
    return 'overdue';
  }
  return value.includes('ALMOST') ? 'soon' : 'due';
}

/**
 * @description Days until the service (`timeToService` comes in days or months).
 * @param {unknown} field - The raw field.
 * @returns {number|null} The days.
 */
function daysToService(field) {
  const value = numberOf(field);
  if (value === null) {
    return null;
  }
  const unit = readField(field).unit;
  if (unit.startsWith('month')) {
    return Math.round(value * 30);
  }
  return unit.startsWith('week') ? Math.round(value * 7) : Math.round(value);
}

/**
 * @description The energy state, only the fields the car supports.
 * @param {object} energy - The raw energy state.
 * @param {string[]} supported - The supported fields (readVehicleInfo).
 * @returns {object} `{ field: rawField }`.
 */
function supportedEnergy(energy, supported) {
  const fields = {};
  Object.entries(energy ?? {}).forEach(([key, value]) => {
    const name = ENERGY_ALIASES[key] ?? key;
    if (supported.includes(name)) {
      fields[name] = value;
    }
  });
  return fields;
}

/**
 * @description Read the position (GeoJSON Feature).
 * @param {object} location - The raw location.
 * @returns {{ latitude: number, longitude: number, heading: number|null,
 * at: number|null }|null} The position.
 */
function readLocation(location) {
  const coordinates = location?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }
  const [longitude, latitude] = coordinates.map(Number);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }
  const heading = Number(location.properties?.heading);
  const at = Date.parse(location.properties?.timestamp ?? '');
  return {
    latitude,
    longitude,
    heading: Number.isFinite(heading) ? heading : null,
    at: Number.isFinite(at) ? at : null,
  };
}

/**
 * @description Derive the snapshot of a car from its raw resources.
 * @param {object} info - The car description (readVehicleInfo).
 * @param {object} raw - The last good answer of each resource, plus `energy`
 * and `location`.
 * @returns {object} The snapshot.
 * @example
 * summarize(info, { doors, windows, statistics, energy });
 */
function summarize(info, raw) {
  const doors = raw[RESOURCES.DOORS] ?? {};
  const windows = raw[RESOURCES.WINDOWS] ?? {};
  const statistics = raw[RESOURCES.STATISTICS] ?? {};
  const fuel = raw[RESOURCES.FUEL] ?? {};
  const diagnostics = raw[RESOURCES.DIAGNOSTICS] ?? {};
  const energy = supportedEnergy(raw.energy, info.energySupported);

  const openings = {};
  [...DOORS, 'tailgate', 'hood', 'tankLid'].forEach((name) => {
    openings[name] = isOpen(doors[name]);
  });
  [...WINDOWS, 'sunroof'].forEach((name) => {
    openings[name] = isOpen(windows[name]);
  });

  const lockValue = textOf(doors.centralLock);
  const engineValue = textOf(raw[RESOURCES.ENGINE_STATUS]?.engineStatus);

  // Battery level: the Energy API, else the fuel resource of older cars.
  const batteryLevel = info.hasBattery
    ? (numberOf(energy.batteryChargeLevel) ?? numberOf(fuel.batteryChargeLevel))
    : null;
  const batteryRange = info.hasBattery
    ? (kmOf(statistics.distanceToEmptyBattery) ?? kmOf(energy.electricRange))
    : null;
  const chargingPower = numberOf(energy.chargingPower);
  const availability = readField(raw[RESOURCES.ACCESSIBILITY]?.availabilityStatus);

  const timestamps = Object.values(raw)
    .flatMap((resource) =>
      resource && typeof resource === 'object' ? Object.values(resource) : [],
    )
    .map((field) => readField(field)?.at)
    .filter(Number.isFinite);

  return {
    lock: lockValue === 'LOCKED' ? 'locked' : lockValue === 'UNLOCKED' ? 'unlocked' : null,
    openings,
    doorsOpen: anyOpen(DOORS.map((name) => openings[name])),
    windowsOpen: anyOpen(WINDOWS.map((name) => openings[name])),
    openList: Object.keys(openings).filter((name) => openings[name] === true),
    engineRunning: engineValue === null ? null : engineValue === 'RUNNING',
    battery: {
      level: round(batteryLevel, 1),
      rangeKm: round(batteryRange),
      energyKwh:
        batteryLevel !== null && info.batteryCapacityKwh
          ? round((info.batteryCapacityKwh * batteryLevel) / 100, 1)
          : null,
    },
    charge: {
      connection: textOf(energy.chargerConnectionStatus)?.toLowerCase() ?? null,
      status: textOf(energy.chargingStatus)?.toLowerCase() ?? null,
      type: textOf(energy.chargingType)?.toLowerCase() ?? null,
      powerKw: chargingPower === null ? null : round(chargingPower / 1000, 2),
      currentLimitA: round(numberOf(energy.chargingCurrentLimit)),
      targetLevel: round(numberOf(energy.targetBatteryChargeLevel)),
      minutesToTarget: round(numberOf(energy.estimatedChargingTimeToTargetBatteryChargeLevel)),
    },
    fuel: {
      liters: info.hasCombustion ? round(numberOf(fuel.fuelAmount), 1) : null,
      rangeKm: info.hasCombustion ? round(kmOf(statistics.distanceToEmptyTank)) : null,
    },
    statistics: {
      averageEnergy: round(numberOf(statistics.averageEnergyConsumption), 1),
      averageFuel: round(numberOf(statistics.averageFuelConsumption), 1),
      averageSpeed: round(numberOf(statistics.averageSpeed)),
      tripManualKm: round(kmOf(statistics.tripMeterManual), 1),
      tripAutomaticKm: round(kmOf(statistics.tripMeterAutomatic), 1),
    },
    odometerKm: round(kmOf(raw[RESOURCES.ODOMETER]?.odometer)),
    service: {
      level: serviceLevel(textOf(diagnostics.serviceWarning)),
      distanceKm: round(kmOf(diagnostics.distanceToService)),
      days: daysToService(diagnostics.timeToService),
      engineHours: round(numberOf(diagnostics.engineHoursToService)),
    },
    warnings: readWarnings(raw),
    availability: availability
      ? {
          status: String(availability.value).toLowerCase(),
          reason:
            typeof raw[RESOURCES.ACCESSIBILITY]?.availabilityStatus?.unavailableReason === 'string'
              ? raw[RESOURCES.ACCESSIBILITY].availabilityStatus.unavailableReason.toLowerCase()
              : null,
        }
      : null,
    location: readLocation(raw.location),
    updatedAt: timestamps.length > 0 ? Math.max(...timestamps) : null,
  };
}

export {
  DOORS,
  WINDOWS,
  OTHER_OPENINGS,
  TYRES,
  MILE_IN_KM,
  readField,
  numberOf,
  kmOf,
  textOf,
  isOpen,
  readVehicleInfo,
  readWarnings,
  serviceLevel,
  readLocation,
  summarize,
};
