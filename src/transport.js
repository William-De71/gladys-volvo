// -----------------------------------------------------------------------------
// The transport badge of each car (Devices screen of Gladys).
//
// Everything goes through the Volvo cloud, so the badge says `cloud` while
// Volvo answers for the car and `unreachable` when no call for it succeeded.
// When Volvo says the car cannot run remote commands (no connection, in use,
// power saving mode, software update), the badge stays `cloud` but is flagged
// `degraded` with the reason: the values may be old and the commands wait.
// -----------------------------------------------------------------------------

import { DEVICE_TRANSPORTS } from '@gladysassistant/integration-sdk';
import { all } from './i18n.js';

const KNOWN_REASONS = new Set([
  'car_in_use',
  'no_internet',
  'ota_installation_in_progress',
  'power_saving_mode',
]);

/**
 * @description The transport entry of a car.
 * @param {string} externalId - The device external id.
 * @param {object|null} reading - Its last reading (poller.js).
 * @param {{ errors: Error[], succeeded: number }} [outcome] - The last read.
 * @returns {object} The `publishTransports` entry.
 * @example
 * transportOf('ext:volvo:vehicle:YV1…', reading, { errors: [], succeeded: 9 });
 */
function transportOf(externalId, reading, outcome) {
  if (outcome && outcome.succeeded === 0 && outcome.errors.length > 0) {
    return { external_id: externalId, transport: DEVICE_TRANSPORTS.UNREACHABLE };
  }
  const availability = reading?.snapshot?.availability;
  if (availability && availability.status !== 'available') {
    const reason = KNOWN_REASONS.has(availability.reason) ? availability.reason : 'unavailable';
    return {
      external_id: externalId,
      transport: DEVICE_TRANSPORTS.CLOUD,
      degraded: true,
      message: all(`transport_${reason}`),
    };
  }
  return { external_id: externalId, transport: DEVICE_TRANSPORTS.CLOUD };
}

export { transportOf };
