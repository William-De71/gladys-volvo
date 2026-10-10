// -----------------------------------------------------------------------------
// Scene actions.
//
//   - `send_command`  lock, unlock, climate, honk/flash, remote engine start…
//                     waits for the car's answer (up to two minutes: a car
//                     deep asleep is slow to wake up) and tells whether it
//                     was carried out;
//   - `get_status`    everything a scene may want to say or test: lock,
//                     openings, battery or fuel, range, charge, position,
//                     warnings, with a sentence ready for a message. From the
//                     last reading, or a fresh one on demand (costs quota).
// -----------------------------------------------------------------------------

import { t, warningLabel, openingsLabel } from './i18n.js';
import { mapUrl } from './geo.js';

const SCENE_ACTIONS = { SEND_COMMAND: 'send_command', GET_STATUS: 'get_status' };

/**
 * @description The outputs of `get_status`.
 * @param {object} options - Options.
 * @param {object} options.info - The car description.
 * @param {object} options.reading - Its reading.
 * @param {string} options.carName - Its name.
 * @param {string} options.language - The language.
 * @returns {object} The outputs.
 * @example
 * buildStatusOutputs({ info, reading, carName: 'Volvo XC40 (2024)', language: 'fr' });
 */
function buildStatusOutputs({ info, reading, carName, language }) {
  const { snapshot } = reading;
  const openings = openingsLabel(snapshot.openList, language);
  const known = Object.values(snapshot.openings).some((state) => state !== null);
  let energy = '';
  if (info.hasBattery && snapshot.battery.level !== null) {
    energy = t('summaryBattery', language, {
      level: Math.round(snapshot.battery.level),
      range: snapshot.battery.rangeKm ?? '?',
    });
  } else if (info.hasCombustion && snapshot.fuel.liters !== null) {
    energy = t('summaryFuel', language, {
      liters: snapshot.fuel.liters,
      range: snapshot.fuel.rangeKm ?? '?',
    });
  }
  return {
    vehicle_name: carName,
    locked: snapshot.lock === null ? null : snapshot.lock === 'locked',
    all_closed: known ? snapshot.openList.length === 0 : null,
    openings,
    battery_level: snapshot.battery.level,
    battery_range_km: snapshot.battery.rangeKm,
    fuel_liters: snapshot.fuel.liters,
    fuel_range_km: snapshot.fuel.rangeKm,
    charging_status: snapshot.charge.status,
    plugged:
      snapshot.charge.connection === null ? null : snapshot.charge.connection === 'connected',
    engine_running: snapshot.engineRunning,
    odometer_km: snapshot.odometerKm,
    at_home: reading.atHome,
    distance_home_km:
      reading.distanceHomeKm === null ? null : Math.round(reading.distanceHomeKm * 10) / 10,
    latitude: snapshot.location?.latitude ?? null,
    longitude: snapshot.location?.longitude ?? null,
    map_url: snapshot.location ? mapUrl(snapshot.location) : null,
    warnings: snapshot.warnings.map((warning) => warningLabel(warning, language)).join(', '),
    summary: t('summaryStatus', language, {
      car: carName,
      lock: snapshot.lock ? t(snapshot.lock, language).toLowerCase() : '?',
      openings: known
        ? snapshot.openList.length === 0
          ? t('allClosed', language).toLowerCase()
          : t('open', language, { list: openings }).toLowerCase()
        : '?',
      energy,
    }).trim(),
  };
}

export { SCENE_ACTIONS, buildStatusOutputs };
