// -----------------------------------------------------------------------------
// Scene triggers: what changed between two readings of a car.
//
// Volvo pushes nothing: the integration compares each reading with the
// previous one. The first reading after a start is a baseline (a car unlocked
// since this morning does not fire "unlocked" at every restart). A value that
// becomes unknown fires nothing: only a change between two known values does.
//
// Every event carries the device of the car in `vehicle`, the field of the
// `source: "devices"` filter of the manifest.
// -----------------------------------------------------------------------------

import { t, warningLabel, openingsLabel } from './i18n.js';

const SCENE_TRIGGERS = {
  LOCK_CHANGED: 'lock_changed',
  LEFT_OPEN: 'left_open',
  ENGINE_CHANGED: 'engine_changed',
  CHARGING_CHANGED: 'charging_changed',
  CHARGER_CONNECTION_CHANGED: 'charger_connection_changed',
  HOME_CHANGED: 'home_changed',
  WARNING_RAISED: 'warning_raised',
  AUTHORIZATION_EXPIRED: 'authorization_expired',
};

const CHARGING_STATUSES = ['charging', 'done', 'idle', 'scheduled', 'discharging', 'error'];

/**
 * @description The readings of a car the events compare.
 * @typedef {{ snapshot: object, atHome: boolean|null, distanceHomeKm: number|null }} Reading
 */

/**
 * @description The events between two readings.
 * @param {Reading|null} previous - The previous reading (null: baseline).
 * @param {Reading} next - The new reading.
 * @returns {Array<{ key: string, values: object }>} The events, with the raw
 * values `buildSceneEvent` turns into scene data.
 * @example
 * detectEvents(previous, next); // -> [{ key: 'lock_changed', values: { state: 'unlocked' } }]
 */
function detectEvents(previous, next) {
  if (!previous) {
    return [];
  }
  const before = previous.snapshot;
  const after = next.snapshot;
  const events = [];
  const changed = (a, b) => a !== null && b !== null && a !== b;

  if (changed(before.lock, after.lock)) {
    events.push({ key: SCENE_TRIGGERS.LOCK_CHANGED, values: { state: after.lock } });
  }

  // Locked with something open: when it starts, or when one more opens.
  if (after.lock === 'locked' && after.openList.length > 0) {
    const wasLeftOpen = before.lock === 'locked' && before.openList.length > 0;
    const newlyOpen = after.openList.filter((name) => !before.openList.includes(name));
    if (!wasLeftOpen || newlyOpen.length > 0) {
      events.push({ key: SCENE_TRIGGERS.LEFT_OPEN, values: { openings: after.openList } });
    }
  }

  if (changed(before.engineRunning, after.engineRunning)) {
    events.push({
      key: SCENE_TRIGGERS.ENGINE_CHANGED,
      values: { state: after.engineRunning ? 'started' : 'stopped' },
    });
  }

  if (changed(before.charge.status, after.charge.status)) {
    events.push({ key: SCENE_TRIGGERS.CHARGING_CHANGED, values: { status: after.charge.status } });
  }

  if (changed(before.charge.connection, after.charge.connection)) {
    events.push({
      key: SCENE_TRIGGERS.CHARGER_CONNECTION_CHANGED,
      values: { state: after.charge.connection === 'connected' ? 'connected' : 'disconnected' },
    });
  }

  if (changed(previous.atHome, next.atHome)) {
    events.push({
      key: SCENE_TRIGGERS.HOME_CHANGED,
      values: { state: next.atHome ? 'arrived' : 'left' },
    });
  }

  after.warnings
    .filter((warning) => !before.warnings.includes(warning))
    .forEach((warning) => {
      events.push({ key: SCENE_TRIGGERS.WARNING_RAISED, values: { warning } });
    });

  return events;
}

/**
 * @description The scene data of an event.
 * @param {object} event - `{ key, values }` (detectEvents).
 * @param {object} context - `{ vehicle, carName, reading, language }`:
 * `vehicle` the device external id, `reading` the new reading.
 * @returns {{ key: string, data: object }} The scene event.
 * @example
 * buildSceneEvent(event, { vehicle: ids.device, carName: 'Volvo XC40', reading, language: 'fr' });
 */
function buildSceneEvent(event, { vehicle, carName, reading, language }) {
  const { snapshot } = reading;
  const car = carName;
  const base = { vehicle, vehicle_name: carName };
  const level = snapshot.battery.level;
  switch (event.key) {
    case SCENE_TRIGGERS.LOCK_CHANGED:
      return {
        key: event.key,
        data: {
          ...base,
          state: event.values.state,
          summary: t(
            event.values.state === 'locked' ? 'summaryLocked' : 'summaryUnlocked',
            language,
            {
              car,
            },
          ),
        },
      };
    case SCENE_TRIGGERS.LEFT_OPEN: {
      const list = openingsLabel(event.values.openings, language);
      return {
        key: event.key,
        data: { ...base, openings: list, summary: t('summaryLeftOpen', language, { car, list }) },
      };
    }
    case SCENE_TRIGGERS.ENGINE_CHANGED:
      return {
        key: event.key,
        data: {
          ...base,
          state: event.values.state,
          summary: t(
            event.values.state === 'started' ? 'summaryEngineStarted' : 'summaryEngineStopped',
            language,
            { car },
          ),
        },
      };
    case SCENE_TRIGGERS.CHARGING_CHANGED: {
      const status = t(`charge_${event.values.status}`, language);
      return {
        key: event.key,
        data: {
          ...base,
          status: event.values.status,
          status_label: status,
          battery_level: level,
          range_km: snapshot.battery.rangeKm,
          summary: t('summaryCharging', language, { car, status, level: level ?? '?' }),
        },
      };
    }
    case SCENE_TRIGGERS.CHARGER_CONNECTION_CHANGED: {
      const status = t(`connection_${event.values.state}`, language);
      return {
        key: event.key,
        data: {
          ...base,
          state: event.values.state,
          battery_level: level,
          summary: t('summaryPlugged', language, { car, status }),
        },
      };
    }
    case SCENE_TRIGGERS.HOME_CHANGED:
      return {
        key: event.key,
        data: {
          ...base,
          state: event.values.state,
          distance_km:
            reading.distanceHomeKm === null ? null : Math.round(reading.distanceHomeKm * 10) / 10,
          summary: t(
            event.values.state === 'arrived' ? 'summaryArrived' : 'summaryLeft',
            language,
            {
              car,
            },
          ),
        },
      };
    case SCENE_TRIGGERS.WARNING_RAISED: {
      const label = warningLabel(event.values.warning, language);
      return {
        key: event.key,
        data: {
          ...base,
          warning: event.values.warning,
          warning_label: label,
          summary: t('summaryWarning', language, { car, warning: label }),
        },
      };
    }
    default:
      throw new Error(`Unknown event ${event.key}`);
  }
}

/**
 * @description The scene data of the "authorization expired" event.
 * @param {string} language - The language.
 * @returns {{ key: string, data: object }} The scene event.
 */
function buildAuthorizationExpiredEvent(language) {
  return {
    key: SCENE_TRIGGERS.AUTHORIZATION_EXPIRED,
    data: { summary: t('summaryReauth', language) },
  };
}

export {
  SCENE_TRIGGERS,
  CHARGING_STATUSES,
  detectEvents,
  buildSceneEvent,
  buildAuthorizationExpiredEvent,
};
