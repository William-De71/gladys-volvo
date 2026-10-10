// -----------------------------------------------------------------------------
// Remote commands.
//
// Every car lists the commands it accepts (`GET …/commands`): a command is
// only offered (feature, widget button) when the car lists it, and refused
// before any call otherwise. Volvo answers once the car has carried it out,
// or not: COMPLETED (DELIVERED for the lock), anything else is a failure —
// a car asleep in a basement answers after a long while, or never.
//
// Honk and flash drained the 12 V battery of some cars in the past (Home
// Assistant warns about it): they are never fired by the integration itself.
// -----------------------------------------------------------------------------

const COMMANDS = {
  lock: { path: 'lock', required: 'LOCK' },
  unlock: { path: 'unlock', required: 'UNLOCK' },
  lock_reduced_guard: { path: 'lock-reduced-guard', required: 'LOCK_REDUCED_GUARD' },
  honk: { path: 'honk', required: 'HONK' },
  flash: { path: 'flash', required: 'FLASH' },
  honk_flash: { path: 'honk-flash', required: 'HONK_AND_FLASH' },
  climatization_start: { path: 'climatization-start', required: 'CLIMATIZATION_START' },
  climatization_stop: { path: 'climatization-stop', required: 'CLIMATIZATION_STOP' },
  engine_start: { path: 'engine-start', required: 'ENGINE_START' },
  engine_stop: { path: 'engine-stop', required: 'ENGINE_STOP' },
};

const SUCCESS_STATUSES = ['COMPLETED', 'DELIVERED', 'SUCCESS'];
// Remote engine start: the car accepts 1 to 15 minutes.
const ENGINE_RUNTIME = { min: 1, max: 15, default: 15 };

/**
 * @description Whether a car accepts a command.
 * @param {object} info - The car description (vehicle.js).
 * @param {string} key - A COMMANDS key.
 * @returns {boolean} True when listed by the car.
 * @example
 * supports(info, 'lock');
 */
function supports(info, key) {
  const command = COMMANDS[key];
  return Boolean(command && info?.commands?.includes(command.required));
}

/**
 * @description The body of a command.
 * @param {string} key - A COMMANDS key.
 * @param {object} [options] - `{ runtimeMinutes }` for engine_start.
 * @returns {object|undefined} The body.
 */
function bodyOf(key, { runtimeMinutes } = {}) {
  if (key !== 'engine_start') {
    return undefined;
  }
  const minutes = Number(runtimeMinutes);
  const value = Number.isFinite(minutes)
    ? Math.min(ENGINE_RUNTIME.max, Math.max(ENGINE_RUNTIME.min, Math.round(minutes)))
    : ENGINE_RUNTIME.default;
  return { runtimeMinutes: value };
}

/**
 * @description Run a command and wait for the car.
 * @param {object} volvo - The API client.
 * @param {object} info - The car description.
 * @param {string} key - A COMMANDS key.
 * @param {object} [options] - `{ runtimeMinutes }`.
 * @returns {Promise<{ ok: boolean, status: string, message: string }>} The outcome.
 * @throws {Error} When the car does not offer the command.
 * @example
 * await runCommand(volvo, info, 'lock');
 */
async function runCommand(volvo, info, key, options = {}) {
  if (!supports(info, key)) {
    const error = new Error(`Command ${key} not offered by this car`);
    error.unsupported = true;
    throw error;
  }
  const result = await volvo.sendCommand(info.vin, COMMANDS[key].path, bodyOf(key, options));
  return { ...result, ok: SUCCESS_STATUSES.includes(result.status) };
}

export { COMMANDS, SUCCESS_STATUSES, ENGINE_RUNTIME, supports, bodyOf, runCommand };
