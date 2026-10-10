// -----------------------------------------------------------------------------
// The `vehicle` dashboard widget.
//
// One card per car (setting `vehicle`, a `source: "devices"` select; empty =
// the first car of the account):
//   - the configurator picture of the car (model and colour);
//   - two tiles: battery and range for a car with a battery, fuel and range
//     otherwise;
//   - a status list: lock, openings, charge, engine, position, service,
//     warnings, connection of the car, age of the data;
//   - up to four buttons: lock/unlock, climate, flash the lights (to find it
//     in a car park), the position on a map. Unlock and flash ask first.
// The budget of the core is 8 components: 1 picture + 2 tiles + 1 status + 4
// buttons fits exactly.
// -----------------------------------------------------------------------------

import { t, warningLabel, openingsLabel, ago } from './i18n.js';
import { supports } from './commands.js';
import { mapUrl } from './geo.js';

const WIDGETS = { VEHICLE: 'vehicle' };
const WIDGET_ACTIONS = {
  LOCK: 'lock',
  UNLOCK: 'unlock',
  CLIMATE_START: 'climate_start',
  CLIMATE_STOP: 'climate_stop',
  FLASH: 'flash',
};
// Widget action -> command (commands.js).
const ACTION_COMMANDS = {
  [WIDGET_ACTIONS.LOCK]: 'lock',
  [WIDGET_ACTIONS.UNLOCK]: 'unlock',
  [WIDGET_ACTIONS.CLIMATE_START]: 'climatization_start',
  [WIDGET_ACTIONS.CLIMATE_STOP]: 'climatization_stop',
  [WIDGET_ACTIONS.FLASH]: 'flash',
};
const TTL_SECONDS = { vehicle: 60, message: 120 };
const MAX_STATUS_LENGTH = 40;

/**
 * @description Truncate a text to a bound, with an ellipsis.
 * @param {string} value - The text.
 * @param {number} max - The bound.
 * @returns {string} The text.
 */
function clip(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * @description A widget content made of one message.
 * @param {string} message - The message.
 * @param {number} [ttl] - Its freshness.
 * @returns {object} The content.
 */
function messageContent(message, ttl = TTL_SECONDS.message) {
  return { ttl_seconds: ttl, components: [{ type: 'text', variant: 'body', text: message }] };
}

/**
 * @description Format a number for a tile (≤ 12 characters).
 * @param {number} value - The number.
 * @param {string} language - The language.
 * @returns {string} The text.
 */
function formatNumber(value, language) {
  return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * @description The two tiles of a car.
 * @param {object} info - The car description.
 * @param {object} snapshot - Its snapshot.
 * @param {string} language - The language.
 * @returns {Array<object>} The tiles (0 to 2).
 */
function tiles(info, snapshot, language) {
  const result = [];
  const { battery, fuel } = snapshot;
  const low = (level) => (level <= 20 ? 'danger' : level <= 40 ? 'warning' : 'success');
  if (info.hasBattery && battery.level !== null) {
    result.push({
      type: 'value',
      value: formatNumber(battery.level, language),
      unit: '%',
      label: t('battery', language),
      icon: snapshot.charge.status === 'charging' ? 'battery-charging' : 'battery',
      color: low(battery.level),
    });
  } else if (info.hasCombustion && fuel.liters !== null) {
    result.push({
      type: 'value',
      value: formatNumber(fuel.liters, language),
      unit: 'L',
      label: t('fuel', language),
      icon: 'droplet',
      color: 'primary',
    });
  }
  const range = info.hasBattery && battery.rangeKm !== null ? battery.rangeKm : fuel.rangeKm;
  if (range !== null) {
    result.push({
      type: 'value',
      value: formatNumber(range, language),
      unit: 'km',
      label: t('range', language),
      icon: 'navigation',
    });
  }
  return result;
}

/**
 * @description The status list of a car.
 * @param {object} info - The car description.
 * @param {object} reading - Its reading.
 * @param {string} language - The language.
 * @param {number} now - Now, in ms.
 * @returns {Array<object>} The items.
 */
function statusItems(info, reading, language, now) {
  const { snapshot } = reading;
  const items = [];
  if (snapshot.lock) {
    items.push({
      label: t('lockState', language),
      value: t(snapshot.lock, language),
      color: snapshot.lock === 'locked' ? 'success' : 'warning',
    });
  }
  const knownOpenings = Object.values(snapshot.openings).some((state) => state !== null);
  if (knownOpenings) {
    items.push({
      label: t('openings', language),
      value:
        snapshot.openList.length === 0
          ? t('allClosed', language)
          : clip(
              t('open', language, { list: openingsLabel(snapshot.openList, language) }),
              MAX_STATUS_LENGTH,
            ),
      color: snapshot.openList.length === 0 ? 'success' : 'warning',
    });
  }
  if (snapshot.charge.status) {
    const status = snapshot.charge.status;
    items.push({
      label: t('charging', language),
      value: t(`charge_${status}`, language),
      color: status === 'charging' ? 'info' : status === 'error' ? 'danger' : 'neutral',
    });
  }
  if (snapshot.engineRunning !== null) {
    items.push({
      label: t('engine', language),
      value: t(snapshot.engineRunning ? 'running' : 'stopped', language),
      color: snapshot.engineRunning ? 'info' : 'neutral',
    });
  }
  if (reading.atHome !== null) {
    items.push({
      label: t('position', language),
      value: reading.atHome
        ? t('atHome', language)
        : t('awayFrom', language, { km: formatNumber(reading.distanceHomeKm, language) }),
      color: reading.atHome ? 'success' : 'neutral',
    });
  }
  if (snapshot.service.level) {
    const parts = [t(`service_${snapshot.service.level}`, language)];
    if (snapshot.service.distanceKm !== null && snapshot.service.days !== null) {
      parts.push(
        t('serviceIn', language, {
          km: formatNumber(snapshot.service.distanceKm, language),
          days: snapshot.service.days,
        }),
      );
    }
    items.push({
      label: t('service', language),
      value: clip(parts.join(' · '), MAX_STATUS_LENGTH),
      color:
        snapshot.service.level === 'ok'
          ? 'success'
          : snapshot.service.level === 'overdue'
            ? 'danger'
            : 'warning',
    });
  }
  const warnings = snapshot.warnings.filter((warning) => warning !== 'service');
  items.push({
    label: t('warnings', language),
    value:
      warnings.length === 0
        ? t('noWarning', language)
        : clip(
            warnings.map((warning) => warningLabel(warning, language)).join(', '),
            MAX_STATUS_LENGTH,
          ),
    color: warnings.length === 0 ? 'success' : 'danger',
  });
  if (snapshot.availability && snapshot.availability.status !== 'available') {
    const reason = snapshot.availability.reason ?? snapshot.availability.status;
    items.push({
      label: t('connection', language),
      value: t(`availability_${reason}`, language),
      color: 'warning',
    });
  }
  const updatedAt = snapshot.updatedAt ?? reading.readAt;
  if (Number.isFinite(updatedAt)) {
    items.push({ label: t('updated', language), value: ago(updatedAt, now, language) });
  }
  return items.slice(0, 10);
}

/**
 * @description The buttons of a car.
 * @param {object} info - The car description.
 * @param {object} reading - Its reading.
 * @param {string} language - The language.
 * @returns {Array<object>} The buttons (0 to 4).
 */
function buttons(info, reading, language) {
  const { snapshot } = reading;
  const params = { vin: info.vin };
  const result = [];
  if (snapshot.lock === 'locked' && supports(info, 'unlock')) {
    result.push({
      type: 'button',
      label: t('buttonUnlock', language),
      icon: 'unlock',
      style: 'secondary',
      action: { key: WIDGET_ACTIONS.UNLOCK, params, confirm: true },
    });
  } else if (snapshot.lock !== 'locked' && supports(info, 'lock')) {
    result.push({
      type: 'button',
      label: t('buttonLock', language),
      icon: 'lock',
      style: 'primary',
      action: { key: WIDGET_ACTIONS.LOCK, params },
    });
  }
  if (reading.climateOn && supports(info, 'climatization_stop')) {
    result.push({
      type: 'button',
      label: t('buttonClimateStop', language),
      icon: 'wind',
      style: 'secondary',
      action: { key: WIDGET_ACTIONS.CLIMATE_STOP, params },
    });
  } else if (!reading.climateOn && supports(info, 'climatization_start')) {
    result.push({
      type: 'button',
      label: t('buttonClimateStart', language),
      icon: 'wind',
      style: 'primary',
      action: { key: WIDGET_ACTIONS.CLIMATE_START, params },
    });
  }
  if (supports(info, 'flash')) {
    result.push({
      type: 'button',
      label: t('buttonFlash', language),
      icon: 'sun',
      style: 'secondary',
      action: { key: WIDGET_ACTIONS.FLASH, params, confirm: true },
    });
  }
  if (snapshot.location) {
    result.push({
      type: 'button',
      label: t('buttonMap', language),
      icon: 'map-pin',
      style: 'secondary',
      link: { url: mapUrl(snapshot.location) },
    });
  }
  return result;
}

/**
 * @description The `vehicle` widget.
 * @param {object} options - Options.
 * @param {object} options.info - The car description.
 * @param {object|null} options.reading - Its last reading.
 * @param {string|null} options.imageKey - The key of its picture.
 * @param {object} [options.settings] - `{ show_buttons }`.
 * @param {string} options.language - The language.
 * @param {number} options.now - Now, in ms.
 * @returns {object} The content.
 * @example
 * buildVehicleWidget({ info, reading, imageKey, settings, language: 'fr', now: Date.now() });
 */
function buildVehicleWidget({ info, reading, imageKey, settings = {}, language, now }) {
  if (!reading) {
    return messageContent(t('loading', language), 30);
  }
  const components = [];
  if (imageKey) {
    components.push({
      type: 'image',
      key: imageKey,
      alt: clip(`Volvo ${info.model}${info.colour ? ` · ${info.colour}` : ''}`, 100),
      fit: 'contain',
    });
  }
  components.push(...tiles(info, reading.snapshot, language));
  components.push({ type: 'status', items: statusItems(info, reading, language, now) });
  if (settings.show_buttons !== false) {
    components.push(...buttons(info, reading, language));
  }
  return { ttl_seconds: TTL_SECONDS.vehicle, components };
}

export { WIDGETS, WIDGET_ACTIONS, ACTION_COMMANDS, messageContent, buildVehicleWidget };
