// -----------------------------------------------------------------------------
// Reading the cars on a loop.
//
// Volvo pushes nothing, and the API application has a daily quota shared by
// all the cars of the account. Two paces, like Home Assistant's coordinators:
//   - LIVE, every `poll_interval` minutes (5 by default): lock, doors,
//     windows, engine, trip computer, battery and charge (Energy API), fuel,
//     position — what scenes react to;
//   - SLOW, every 30 minutes: odometer, service, warnings, tyres, brakes,
//     fluids, availability of the car — what changes in days.
// A command asks for a live reading a little later (`refresh`), so the
// dashboard shows its effect without waiting for the next round.
//
// One failing resource does not fail the round (its last good answer is
// kept); a refused sign-in pauses everything until the user connects again;
// a quota exceeded (429) pauses until Volvo says, 15 minutes at least.
// -----------------------------------------------------------------------------

import { RESOURCES } from './volvo-api.js';
import { readVehicleInfo, summarize, readLocation } from './vehicle.js';
import { detectEvents } from './events.js';
import { nearestHouse, isHome } from './geo.js';

const SLOW_INTERVAL_MS = 30 * 60 * 1000;
const TICK_MS = 30 * 1000;
// A reading due within this margin is read now (timers drift).
const DUE_MARGIN_MS = 15 * 1000;
const RATE_LIMIT_PAUSE_MS = 15 * 60 * 1000;
// Volvo does not report the climate: the last start is trusted this long.
const CLIMATE_SESSION_MS = 30 * 60 * 1000;

const LIVE = 'live';
const SLOW = 'slow';
const SLOW_RESOURCES = [
  RESOURCES.ODOMETER,
  RESOURCES.DIAGNOSTICS,
  RESOURCES.WARNINGS,
  RESOURCES.TYRES,
  RESOURCES.BRAKES,
  RESOURCES.ENGINE,
  RESOURCES.ACCESSIBILITY,
];

/**
 * @description The calls of a pace for a car.
 * @param {object} info - The car description.
 * @param {string} pace - LIVE or SLOW.
 * @returns {string[]} Resource names; `energy` and `location` are the
 * Energy and Location APIs.
 * @example
 * resourcesOf(info, LIVE); // -> ['doors', 'windows', 'engine-status', 'statistics', 'energy']
 */
function resourcesOf(info, pace) {
  if (pace === SLOW) {
    return SLOW_RESOURCES;
  }
  const live = [RESOURCES.DOORS, RESOURCES.WINDOWS, RESOURCES.ENGINE_STATUS, RESOURCES.STATISTICS];
  if (info.energySupported.length > 0) {
    live.push('energy');
  }
  // The fuel resource also carries the battery level of the cars the
  // Energy API does not cover (older plug-in hybrids).
  if (info.hasCombustion || (info.hasBattery && info.energySupported.length === 0)) {
    live.push(RESOURCES.FUEL);
  }
  if (info.locationSupported) {
    live.push('location');
  }
  return live;
}

/**
 * @description Create the poller.
 * @param {object} options - Options.
 * @param {object} options.volvo - The API client.
 * @param {Function} options.getIntervalMs - `() => number`, the live pace.
 * @param {Function} options.getHomeRadius - `() => number`, meters.
 * @param {Function} options.getHouses - `() => Array`, the houses of Gladys.
 * @param {Function} options.onReading - `async (info, reading, { events, previous })`.
 * @param {Function} [options.onRoundEnd] - `async ({ errors, succeeded, rateLimited,
 * paused })`, after every round that read something.
 * @param {Function} [options.onAuthLost] - `async (error)`: sign in again.
 * @param {object} options.logger - The logger.
 * @param {Function} [options.now] - Clock, for the tests.
 * @returns {object} The poller.
 * @example
 * const poller = createPoller({ volvo, getIntervalMs, getHomeRadius, getHouses, onReading, logger });
 */
function createPoller({
  volvo,
  getIntervalMs,
  getHomeRadius,
  getHouses,
  onReading,
  onRoundEnd = async () => {},
  onAuthLost = async () => {},
  logger,
  now = Date.now,
}) {
  const cars = new Map();
  let timer = null;
  let running = null;
  let started = false;
  let paused = false;
  let rateLimitedUntil = 0;

  // Only a refused Volvo ID token: an API answering 401 after the token was
  // refreshed refuses the API key (Volvo's gateway), which a sign-in cannot fix.
  const isAuthError = (err) => err?.reauth === true;

  /**
   * @description Pause after a refused sign-in.
   * @param {Error} err - The error.
   * @returns {Promise<void>}
   */
  async function authLost(err) {
    if (paused) {
      return;
    }
    paused = true;
    logger.warn(`Volvo sign-in refused, reading paused: ${err.message}`);
    await onAuthLost(err);
  }

  /**
   * @description Read the calls of some paces for a car.
   * @param {object} car - The car state.
   * @param {string[]} paces - The paces due.
   * @returns {Promise<{ errors: Error[], succeeded: number }>} The outcome.
   */
  async function readCar(car, paces) {
    const { info } = car;
    const calls = paces.flatMap((pace) => resourcesOf(info, pace));
    const results = await Promise.allSettled(
      calls.map((resource) => {
        if (resource === 'energy') {
          return volvo.getEnergyState(info.vin);
        }
        if (resource === 'location') {
          return volvo.getLocation(info.vin);
        }
        return volvo.getResource(info.vin, resource);
      }),
    );
    const errors = [];
    let succeeded = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        car.raw[calls[index]] = result.value;
        succeeded += 1;
      } else {
        errors.push(result.reason);
      }
    });
    // A pace counts as read even when calls failed: retrying every tick (30 s)
    // would burn the quota while Volvo or the network is down.
    paces.forEach((pace) => {
      car.readAt[pace] = now();
    });
    return { errors, succeeded };
  }

  /**
   * @description The reading of a car from its raw answers.
   * @param {object} car - The car state.
   * @returns {object} `{ snapshot, distanceHomeKm, atHome, climateOn }`.
   */
  function readingOf(car) {
    const snapshot = summarize(car.info, car.raw);
    const nearest = nearestHouse(snapshot.location, getHouses());
    const distanceHomeKm = nearest ? nearest.distanceKm : null;
    return {
      snapshot,
      distanceHomeKm,
      atHome: isHome(distanceHomeKm, getHomeRadius(), car.reading?.atHome ?? null),
      climateOn: car.climateUntil > now(),
      readAt: now(),
    };
  }

  /**
   * @description Read every car whose pace is due (or all, forced).
   * @param {object} [options] - `{ force, vin }`.
   * @returns {Promise<void>}
   */
  async function doRound({ force = false, vin = null } = {}) {
    if (paused || cars.size === 0) {
      return;
    }
    if (rateLimitedUntil > now() && !force) {
      return;
    }
    const errors = [];
    let succeeded = 0;
    let readAny = false;
    for (const car of cars.values()) {
      if (vin && car.info.vin !== vin) {
        continue;
      }
      const paces = [];
      if (
        force ||
        car.liveDueAt <= now() ||
        now() - car.readAt[LIVE] >= getIntervalMs() - DUE_MARGIN_MS
      ) {
        paces.push(LIVE);
      }
      if (force || now() - car.readAt[SLOW] >= SLOW_INTERVAL_MS - DUE_MARGIN_MS) {
        paces.push(SLOW);
      }
      if (paces.length === 0) {
        continue;
      }
      car.liveDueAt = Infinity;
      readAny = true;
      const outcome = await readCar(car, paces);
      const carErrors = outcome.errors;
      errors.push(...carErrors);
      succeeded += outcome.succeeded;
      const authError = carErrors.find(isAuthError);
      if (authError) {
        await authLost(authError);
        break;
      }
      const limited = carErrors.find((err) => err?.rateLimited);
      if (limited) {
        rateLimitedUntil = now() + Math.max(RATE_LIMIT_PAUSE_MS, limited.retryAfterMs ?? 0);
        logger.warn(
          `Volvo quota exceeded, reading paused until ${new Date(rateLimitedUntil).toISOString()}`,
        );
      }
      carErrors
        .filter((err) => !err?.rateLimited)
        .forEach((err) => logger.warn(`${car.info.model}: ${err.message}`));
      if (Object.keys(car.raw).length === 0) {
        continue;
      }
      const previous = car.reading;
      const reading = readingOf(car);
      car.reading = reading;
      try {
        await onReading(car.info, reading, { events: detectEvents(previous, reading), previous });
      } catch (err) {
        logger.error(`Unable to handle the reading of ${car.info.model}`, err);
      }
      if (limited) {
        break;
      }
    }
    if (!readAny) {
      return;
    }
    try {
      await onRoundEnd({ errors, succeeded, rateLimited: rateLimitedUntil > now(), paused });
    } catch (err) {
      logger.error('Round end failed', err);
    }
  }

  /**
   * @description Run a round, one at a time (a call during a round waits for
   * it, then runs).
   * @param {object} [options] - `{ force, vin }`.
   * @returns {Promise<void>}
   */
  async function round(options = {}) {
    while (running) {
      await running.catch(() => {});
    }
    running = doRound(options).finally(() => {
      running = null;
    });
    return running;
  }

  /** @description Schedule the next tick. */
  function schedule() {
    if (!started) {
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await round().catch((err) => logger.error('Volvo round failed', err));
      schedule();
    }, TICK_MS);
    timer.unref?.();
  }

  return {
    /**
     * @description List the cars of the account and what each one supports.
     * Keeps the answers of the cars already known.
     * @returns {Promise<object[]>} The car descriptions.
     */
    async discover() {
      const vins = await volvo.listVehicles();
      const infos = [];
      for (const vin of vins) {
        const details = await volvo.getVehicle(vin);
        const commands = await volvo.getCommands(vin).catch((err) => {
          logger.warn(`Commands of …${vin.slice(-4)} unavailable: ${err.message}`);
          return [];
        });
        const base = readVehicleInfo(vin, details);
        const energyCapabilities = base.hasBattery
          ? await volvo.getEnergyCapabilities(vin).catch(() => ({}))
          : {};
        // Volvo answers 403 for the position of a car in a region it does
        // not cover: no position, nothing broken.
        let location = null;
        try {
          location = await volvo.getLocation(vin);
        } catch (err) {
          if (isAuthError(err)) {
            throw err;
          }
        }
        const info = readVehicleInfo(vin, details, {
          commands,
          energyCapabilities,
          locationSupported: readLocation(location) !== null,
        });
        const known = cars.get(vin);
        const car = known ?? {
          raw: {},
          readAt: { [LIVE]: 0, [SLOW]: 0 },
          liveDueAt: 0,
          reading: null,
          climateUntil: 0,
        };
        car.info = info;
        if (location) {
          car.raw.location = location;
        }
        cars.set(vin, car);
        infos.push(info);
      }
      [...cars.keys()].filter((vin) => !vins.includes(vin)).forEach((vin) => cars.delete(vin));
      return infos;
    },

    round,

    /** @description Start the loop (a first round right away). */
    start() {
      started = true;
      round().catch((err) => logger.error('Volvo round failed', err));
      schedule();
    },

    /** @description Stop the loop. */
    stop() {
      started = false;
      clearTimeout(timer);
      timer = null;
    },

    /** @description Read again after a new sign-in. */
    resume() {
      paused = false;
      rateLimitedUntil = 0;
    },

    /** @returns {boolean} True while waiting for a new sign-in. */
    isPaused() {
      return paused;
    },

    /** @returns {boolean} True while the quota is exceeded. */
    isRateLimited() {
      return rateLimitedUntil > now();
    },

    /** @description Forget the cars (disconnected account). */
    clear() {
      cars.clear();
    },

    /**
     * @description Ask for a live reading of a car soon (after a command).
     * @param {string} vin - The VIN.
     * @param {number} [delayMs] - The delay.
     */
    refreshSoon(vin, delayMs = 20000) {
      const car = cars.get(vin);
      if (!car) {
        return;
      }
      car.liveDueAt = now() + delayMs;
      const refresh = setTimeout(() => {
        round({ vin }).catch((err) => logger.error('Volvo refresh failed', err));
      }, delayMs);
      refresh.unref?.();
    },

    /**
     * @description Remember a climate start (true) or stop (false).
     * @param {string} vin - The VIN.
     * @param {boolean} on - Started or stopped.
     */
    setClimate(vin, on) {
      const car = cars.get(vin);
      if (car) {
        car.climateUntil = on ? now() + CLIMATE_SESSION_MS : 0;
        if (car.reading) {
          car.reading = { ...car.reading, climateOn: on };
        }
      }
    },

    /**
     * @description Whether the climate of a car is (believed) on.
     * @param {string} vin - The VIN.
     * @returns {boolean} The state.
     */
    climateOn(vin) {
      return (cars.get(vin)?.climateUntil ?? 0) > now();
    },

    /**
     * @description The description and last reading of a car.
     * @param {string} vin - The VIN.
     * @returns {{ info: object, reading: object|null }|null} The car.
     */
    get(vin) {
      const car = cars.get(vin);
      return car ? { info: car.info, reading: car.reading } : null;
    },

    /** @returns {Array<{ info: object, reading: object|null }>} Every car. */
    list() {
      return [...cars.values()].map((car) => ({ info: car.info, reading: car.reading }));
    },
  };
}

export {
  SLOW_INTERVAL_MS,
  CLIMATE_SESSION_MS,
  RATE_LIMIT_PAUSE_MS,
  LIVE,
  SLOW,
  resourcesOf,
  createPoller,
};
