// -----------------------------------------------------------------------------
// Entry point of the Volvo external integration.
//
// Brings the Volvo cars of a Volvo ID into Gladys through the official Volvo
// Cars APIs (developer.volvocars.com), like Home Assistant's `volvo`
// integration:
//   - a device per car (Discovery screen): battery or fuel, range, charge,
//     odometer, lock (a command when the car offers it), doors, tailgate,
//     windows, climate, service, warnings, distance from home (device.js);
//   - scene triggers: locked/unlocked, locked but left open, engine, charge,
//     cable, arrived/left home, new warning, sign-in to renew (events.js);
//   - scene actions: send a command, read the status (scene-actions.js);
//   - a dashboard widget with the picture of the car (widgets.js).
//
// Sign-in: OAuth2 + PKCE with the Volvo ID, through the `volvo_account`
// oauth2 field (oauth.js). Volvo pushes nothing: the cars are read on a loop
// (poller.js), every 5 minutes by default.
//
// Environment variables provided by the Gladys supervisor:
//   GLADYS_HOST_API_URL / GLADYS_INTEGRATION_TOKEN / GLADYS_INTEGRATION_SELECTOR
// The SDK reads them automatically: `new GladysIntegration()` is enough.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import {
  ACCOUNT_FIELD,
  INTERNAL_KEYS,
  normalizeConfig,
  hasClient,
  readLanguage,
} from './src/config.js';
import {
  OAuthError,
  createTokenManager,
  createState,
  createVerifier,
  buildAuthorizeUrl,
} from './src/oauth.js';
import { createVolvoClient, VolvoApiError, redactVin } from './src/volvo-api.js';
import { createPoller } from './src/poller.js';
import { summarize } from './src/vehicle.js';
import {
  FEATURE_KEYS,
  idsOf,
  parseExternalId,
  vehicleName,
  buildDevice,
  buildStates,
} from './src/device.js';
import { buildSceneEvent, buildAuthorizationExpiredEvent } from './src/events.js';
import { runCommand, supports } from './src/commands.js';
import { createPictureRegistry } from './src/images.js';
import { WIDGETS, ACTION_COMMANDS, messageContent, buildVehicleWidget } from './src/widgets.js';
import { SCENE_ACTIONS, buildStatusOutputs } from './src/scene-actions.js';
import { t, all } from './src/i18n.js';

const { version, homepage } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

const ACTIONS = {
  TEST_CONNECTION: 'test_connection',
  REFRESH: 'refresh',
  DISCONNECT: 'disconnect',
};
// The states are published when they change, and again every hour so the
// dashboard never shows them as outdated while the car sleeps in the garage.
const REPUBLISH_MS = 60 * 60 * 1000;
const HOUSES_MAX_AGE_MS = 60 * 60 * 1000;
const START_RETRY_MS = 5 * 60 * 1000;

const gladys = new GladysIntegration();

let config = normalizeConfig();
// Language of the last widget request: names of the devices, scene texts.
let language = 'en';
// Feature external ids of the devices the user created.
let createdFeatures = new Set();
let houses = [];
let housesReadAt = 0;
let lastStatus = null;
let startRetry = null;
let starting = Promise.resolve();
// Signature and time of the last published states, per VIN.
const published = new Map();
// The pending sign-in (also stored, see config.js).
let pendingSignIn = null;

const pictures = createPictureRegistry();

const tokens = createTokenManager({
  getClient: () => ({ clientId: config.clientId, clientSecret: config.clientSecret }),
  saveTokens: async (next) => {
    await gladys.setConfig({
      [INTERNAL_KEYS.accessToken]: next.accessToken,
      [INTERNAL_KEYS.refreshToken]: next.refreshToken,
      [INTERNAL_KEYS.expiresAt]: String(next.expiresAt),
    });
    config = { ...config, tokens: { ...next } };
  },
});

const volvo = createVolvoClient({
  tokens,
  getApiKey: () => config.apiKey,
  userAgent: `gladys-volvo/${version} (+${homepage})`,
});

/**
 * @description Remember the language of a request, and store it when it changed.
 * @param {string} next - The language.
 */
function rememberLanguage(next) {
  if (typeof next !== 'string' || !/^[a-z]{2}$/.test(next) || next === language) {
    return;
  }
  language = next;
  gladys
    .setConfig({ [INTERNAL_KEYS.language]: next })
    .catch((err) => logger.warn(`Unable to store the language: ${err.message}`));
}

/**
 * @description Report the connection status, only when it changed.
 * @param {boolean} connected - Connected or not.
 * @param {object} message - The multi-language message.
 * @returns {Promise<void>}
 */
async function reportStatus(connected, message) {
  const signature = JSON.stringify([connected, message]);
  if (signature === lastStatus) {
    return;
  }
  lastStatus = signature;
  try {
    await gladys.setConnectionStatus(connected, message);
  } catch (err) {
    lastStatus = null;
    logger.error('Unable to report the connection status', err);
  }
}

/**
 * @description The status message of the error that stopped the reading.
 * @param {Error} err - The error.
 * @returns {object} The multi-language message.
 */
function errorStatus(err) {
  if (err instanceof OAuthError && err.reauth) {
    return all('statusReauth');
  }
  if (err instanceof VolvoApiError && err.rateLimited) {
    return all('statusRateLimited');
  }
  if (err instanceof VolvoApiError && err.auth) {
    return all('statusInvalidApiKey');
  }
  return all('statusUnreachable');
}

/**
 * @description Refresh the houses of Gladys (the home of the cars).
 * @param {boolean} [force] - Even if read recently.
 * @returns {Promise<void>}
 */
async function refreshHouses(force = false) {
  if (!force && Date.now() - housesReadAt < HOUSES_MAX_AGE_MS) {
    return;
  }
  try {
    houses = await gladys.getHouses();
    housesReadAt = Date.now();
  } catch (err) {
    logger.warn(`Unable to read the houses: ${err.message}`);
  }
}

/**
 * @description Refresh the feature external ids of the devices the user created.
 * @returns {Promise<void>}
 */
async function refreshCreatedDevices() {
  try {
    const devices = await gladys.getDevices();
    createdFeatures = new Set(
      devices.flatMap((device) => (device.features ?? []).map((feature) => feature.external_id)),
    );
  } catch (err) {
    logger.warn(`Unable to read the devices: ${err.message}`);
  }
}

/**
 * @description The context of the states of a car.
 * @param {string} vin - The VIN.
 * @param {object|null} reading - Its reading.
 * @returns {object} The context (device.js).
 */
function stateContext(vin, reading) {
  return {
    language,
    climateOn: poller.climateOn(vin),
    distanceHomeKm: reading?.distanceHomeKm ?? null,
  };
}

/**
 * @description Publish the states of a car when they changed (or are old).
 * @param {object} info - The car description.
 * @param {object} reading - Its reading.
 * @param {boolean} [force] - Even if unchanged.
 * @returns {Promise<boolean>} True when something new was published.
 */
async function publishStates(info, reading, force = false) {
  const states = buildStates(
    gladys,
    info,
    reading.snapshot,
    stateContext(info.vin, reading),
    createdFeatures,
  );
  if (states.length === 0) {
    return false;
  }
  const signature = JSON.stringify(states);
  const last = published.get(info.vin);
  const changed = !last || last.signature !== signature;
  if (!force && !changed && Date.now() - last.at < REPUBLISH_MS) {
    return false;
  }
  for (let start = 0; start < states.length; start += 100) {
    await gladys.publishStates(states.slice(start, start + 100));
  }
  published.set(info.vin, { signature, at: Date.now() });
  return changed;
}

/**
 * @description Offer a device per car on the Discovery screen.
 * @returns {Promise<number>} How many devices were offered.
 */
async function publishDiscoveredDevices() {
  const devices = poller
    .list()
    .map(({ info, reading }) =>
      buildDevice(
        gladys,
        info,
        reading?.snapshot ?? summarize(info, {}),
        stateContext(info.vin, reading),
      ),
    );
  await gladys.publishDiscoveredDevices(devices);
  return devices.length;
}

/**
 * @description The car a device external id (scene, widget) points at;
 * empty = the first car.
 * @param {unknown} deviceExternalId - The `source: "devices"` value.
 * @returns {{ info: object, reading: object|null }|null} The car.
 */
function resolveCar(deviceExternalId) {
  const parsed = parseExternalId(deviceExternalId);
  if (parsed) {
    return poller.get(parsed.vin);
  }
  return poller.list()[0] ?? null;
}

// --- The poller --------------------------------------------------------------------
const poller = createPoller({
  volvo,
  getIntervalMs: () => config.pollInterval * 60 * 1000,
  getHomeRadius: () => config.homeRadius,
  getHouses: () => houses,
  logger,
  onReading: async (info, reading, { events }) => {
    const carName = vehicleName(info, language);
    const vehicle = idsOf(gladys, info.vin).device;
    for (const event of events) {
      const { key, data } = buildSceneEvent(event, { vehicle, carName, reading, language });
      logger.info(`${carName}: ${key} (${data.summary})`);
      try {
        await gladys.publishSceneEvent(key, data);
      } catch (err) {
        logger.warn(`Unable to publish the scene event ${key}: ${err.message}`);
      }
    }
    let changed = false;
    try {
      changed = await publishStates(info, reading);
    } catch (err) {
      logger.warn(`Unable to publish the states of ${carName}: ${err.message}`);
    }
    if (changed || events.length > 0) {
      gladys.requestWidgetRefresh(WIDGETS.VEHICLE);
    }
  },
  onRoundEnd: async ({ errors, succeeded, rateLimited }) => {
    refreshHouses().catch(() => {});
    if (rateLimited) {
      await reportStatus(false, all('statusRateLimited'));
      return;
    }
    if (succeeded === 0 && errors.length > 0) {
      await reportStatus(false, errorStatus(errors[0]));
      return;
    }
    await reportStatus(true, all('statusConnected', { count: poller.list().length }));
  },
  onAuthLost: async () => {
    await reportStatus(false, all('statusReauth'));
    const { key, data } = buildAuthorizationExpiredEvent(language);
    await gladys
      .publishSceneEvent(key, data)
      .catch((err) => logger.warn(`Unable to publish the scene event ${key}: ${err.message}`));
  },
});

// --- Start ----------------------------------------------------------------------------

/**
 * @description Check the setup, list the cars, offer them and start reading.
 * Retried every 5 minutes while Volvo cannot be reached.
 * @returns {Promise<void>}
 */
async function start() {
  clearTimeout(startRetry);
  poller.stop();
  if (!config.apiKey) {
    await reportStatus(false, all('statusNoApiKey'));
    return;
  }
  if (!hasClient(config)) {
    await reportStatus(false, all('statusNoClient'));
    return;
  }
  if (!tokens.hasGrant()) {
    await reportStatus(false, all('statusNotSignedIn'));
    return;
  }
  if (poller.isPaused()) {
    await reportStatus(false, all('statusReauth'));
    return;
  }
  try {
    const infos = await poller.discover();
    logger.info(
      `${infos.length} car(s): ${infos.map((info) => `${info.model} (…${info.vin.slice(-4)}, ${info.fuelType})`).join(', ') || 'none'}`,
    );
    await poller.round({ force: true });
    await publishDiscoveredDevices();
    poller.start();
  } catch (err) {
    logger.error(`Unable to read the Volvo account: ${redactVin(err.message)}`);
    await reportStatus(false, errorStatus(err));
    if (err instanceof OAuthError && err.reauth) {
      return;
    }
    startRetry = setTimeout(() => {
      startIfReady().catch((e) => logger.error('Start failed', e));
    }, START_RETRY_MS);
    startRetry.unref?.();
  }
}

/**
 * @description Start, one at a time: a configuration saved during a sign-in
 * must not list the cars twice at once.
 * @returns {Promise<void>}
 */
function startIfReady() {
  starting = starting.catch(() => {}).then(start);
  return starting;
}

// --- Sign-in ----------------------------------------------------------------------

gladys.onOAuthAuthorizeUrl(async (key, redirectUri) => {
  if (key !== ACCOUNT_FIELD) {
    throw new Error(`Unknown account field: ${key}`);
  }
  if (!hasClient(config)) {
    throw new Error('Enter the client ID and the client secret, and save, before connecting');
  }
  if (!redirectUri) {
    throw new Error('No redirect URI given by Gladys');
  }
  const state = createState();
  const verifier = createVerifier();
  pendingSignIn = { state, verifier };
  await gladys.setConfig({
    [INTERNAL_KEYS.oauthState]: state,
    [INTERNAL_KEYS.oauthVerifier]: verifier,
  });
  return buildAuthorizeUrl({ clientId: config.clientId, redirectUri, state, verifier });
});

gladys.onOAuthCallback(async (key, { code, state, redirectUri }) => {
  if (key !== ACCOUNT_FIELD) {
    throw new Error(`Unknown account field: ${key}`);
  }
  try {
    let pending = pendingSignIn;
    if (!pending || pending.state !== state) {
      // The container restarted between Connect and the callback.
      const raw = await gladys.getConfig();
      pending = {
        state: raw[INTERNAL_KEYS.oauthState],
        verifier: raw[INTERNAL_KEYS.oauthVerifier],
      };
    }
    if (!state || pending.state !== state || !pending.verifier) {
      throw new Error('Unknown sign-in state: click Connect again');
    }
    await tokens.exchangeCode({ code, redirectUri, verifier: pending.verifier });
    pendingSignIn = null;
    await gladys.setConfig({ [INTERNAL_KEYS.oauthState]: '', [INTERNAL_KEYS.oauthVerifier]: '' });
    logger.info('Signed in with the Volvo ID');
    poller.resume();
    lastStatus = null;
    await startIfReady();
  } catch (err) {
    // The SDK only acks the failure: say why in the logs.
    logger.error(`Volvo ID sign-in failed: ${err.message}`);
    throw err;
  }
});

// --- Commands ---------------------------------------------------------------------

/**
 * @description What the integration remembers after a command the car ran.
 * @param {object} info - The car description.
 * @param {string} command - The command key.
 */
function afterCommand(info, command) {
  if (command === 'climatization_start' || command === 'climatization_stop') {
    poller.setClimate(info.vin, command === 'climatization_start');
    const car = poller.get(info.vin);
    if (car?.reading) {
      publishStates(info, car.reading, true).catch(() => {});
    }
  }
  gladys.requestWidgetRefresh(WIDGETS.VEHICLE);
  poller.refreshSoon(info.vin);
}

/**
 * @description Run a command in the background: Volvo answers once the car
 * has carried it out, far beyond the 5 s a device command may take.
 * @param {object} info - The car description.
 * @param {string} command - The command key.
 */
function runInBackground(info, command) {
  runCommand(volvo, info, command)
    .then((result) => {
      if (result.ok) {
        logger.info(`${info.model}: ${command} done`);
        afterCommand(info, command);
      } else {
        logger.warn(
          `${info.model}: ${command} not carried out (${result.status} ${result.message})`,
        );
        poller.refreshSoon(info.vin, 1000);
      }
    })
    .catch((err) => {
      logger.error(`${info.model}: ${command} failed: ${redactVin(err.message)}`);
      poller.refreshSoon(info.vin, 1000);
    });
}

gladys.onSetValue(async (device, feature, value) => {
  const parsed = parseExternalId(feature.external_id);
  const car = parsed ? poller.get(parsed.vin) : null;
  if (!car) {
    throw new Error('Unknown car: scan again');
  }
  let command;
  if (parsed.feature === FEATURE_KEYS.LOCK) {
    command = Number(value) === 1 ? 'lock' : 'unlock';
  } else if (parsed.feature === FEATURE_KEYS.CLIMATE) {
    command = Number(value) === 1 ? 'climatization_start' : 'climatization_stop';
  } else {
    throw new Error(`${parsed.feature} is read-only`);
  }
  if (!supports(car.info, command)) {
    throw new Error(t('commandUnsupported', 'en', { command: t(`command_${command}`, 'en') }));
  }
  runInBackground(car.info, command);
});

// --- Dashboard widget -------------------------------------------------------------
gladys.onWidgetGet(WIDGETS.VEHICLE, async ({ settings = {}, language: lang }) => {
  rememberLanguage(lang);
  if (!tokens.hasGrant() || !config.apiKey) {
    return messageContent(t('notReady', lang));
  }
  const car = resolveCar(settings.vehicle);
  if (!car) {
    return messageContent(t('noVehicle', lang));
  }
  return buildVehicleWidget({
    info: car.info,
    reading: car.reading,
    imageKey: pictures.register(car.info.imageUrl),
    settings,
    language: lang,
    now: Date.now(),
  });
});

gladys.onWidgetAction(WIDGETS.VEHICLE, async (actionKey, params) => {
  const command = ACTION_COMMANDS[actionKey];
  const car = typeof params?.vin === 'string' ? poller.get(params.vin) : null;
  if (!command || !car) {
    throw new Error(`Unknown action ${actionKey}`);
  }
  const label = { en: t(`command_${command}`, 'en'), fr: t(`command_${command}`, 'fr') };
  if (!supports(car.info, command)) {
    return {
      en: t('commandUnsupported', 'en', { command: label.en }),
      fr: t('commandUnsupported', 'fr', { command: label.fr }),
    };
  }
  runInBackground(car.info, command);
  return {
    en: t('commandSent', 'en', { command: label.en }),
    fr: t('commandSent', 'fr', { command: label.fr }),
  };
});

gladys.onWidgetGetImage(async (imageKey) => {
  const url = pictures.urlOf(imageKey);
  if (url === null) {
    throw new Error(`Unknown image key: ${imageKey}`);
  }
  try {
    return await volvo.fetchImage(url);
  } catch (err) {
    // Not offered again: the card shows without its picture.
    logger.warn(`Car picture unavailable: ${err.message}`);
    pictures.markBroken(imageKey);
    gladys.requestWidgetRefresh(WIDGETS.VEHICLE);
    throw err;
  }
});

// --- Scene actions ----------------------------------------------------------------

/**
 * @description The car of a scene action.
 * @param {unknown} deviceExternalId - The "Car" field.
 * @returns {{ info: object, reading: object|null }} The car.
 * @throws {Error} When there is none.
 */
function sceneCar(deviceExternalId) {
  const car = resolveCar(deviceExternalId);
  if (!car) {
    throw new Error('No Volvo car: check the integration settings');
  }
  return car;
}

gladys.onSceneAction(SCENE_ACTIONS.SEND_COMMAND, async (fields) => {
  const { info } = sceneCar(fields.vehicle);
  const command = String(fields.command ?? '');
  const label = t(`command_${command}`, language);
  const result = await runCommand(volvo, info, command, {
    runtimeMinutes: fields.runtime_minutes,
  });
  if (result.ok) {
    afterCommand(info, command);
  } else {
    poller.refreshSoon(info.vin, 1000);
  }
  return {
    success: result.ok,
    status: result.status,
    summary: result.ok
      ? t('commandDone', language, { command: label })
      : t('commandFailed', language, { command: label, status: result.status }),
  };
});

gladys.onSceneAction(SCENE_ACTIONS.GET_STATUS, async (fields) => {
  let car = sceneCar(fields.vehicle);
  if (fields.refresh === true || !car.reading) {
    await poller.round({ force: true, vin: car.info.vin });
    car = poller.get(car.info.vin);
  }
  if (!car?.reading) {
    throw new Error('The car could not be read');
  }
  return buildStatusOutputs({
    info: car.info,
    reading: car.reading,
    carName: vehicleName(car.info, language),
    language,
  });
});

// --- Configuration screen actions ---------------------------------------------------
gladys.onAction(ACTIONS.TEST_CONNECTION, async () => {
  if (!config.apiKey) {
    return all('statusNoApiKey');
  }
  if (!hasClient(config)) {
    return all('statusNoClient');
  }
  if (!tokens.hasGrant()) {
    return all('statusNotSignedIn');
  }
  try {
    const infos = await poller.discover();
    if (infos.length === 0) {
      return all('noVehicle');
    }
    const list = infos
      .map(
        (info) =>
          `${vehicleName(info, 'en')} …${info.vin.slice(-4)} (${info.commands.length} commands)`,
      )
      .join(', ');
    return { en: `Connected. ${list}`, fr: `Connecté. ${list}` };
  } catch (err) {
    logger.warn(`Connection test failed: ${redactVin(err.message)}`);
    const status = errorStatus(err);
    return {
      en: `${status.en} (${redactVin(err.message)})`,
      fr: `${status.fr} (${redactVin(err.message)})`,
    };
  }
});

gladys.onAction(ACTIONS.REFRESH, async () => {
  if (poller.list().length === 0) {
    await startIfReady();
  } else {
    await poller.round({ force: true });
  }
  return all('statusConnected', { count: poller.list().length });
});

gladys.onAction(ACTIONS.DISCONNECT, async () => {
  poller.stop();
  poller.clear();
  await tokens.clear();
  poller.resume();
  await reportStatus(false, all('statusNotSignedIn'));
  gladys.requestWidgetRefresh(WIDGETS.VEHICLE);
  return {
    en: 'Disconnected. You can also revoke the access of the application on the Volvo developer portal.',
    fr: 'Déconnecté. Vous pouvez aussi révoquer l’accès de l’application sur le portail développeur Volvo.',
  };
});

// --- Devices ------------------------------------------------------------------------
gladys.onScanRequest(async () => {
  if (!tokens.hasGrant() || !config.apiKey) {
    await gladys.publishDiscoveredDevices([]);
    return;
  }
  await poller.discover();
  await poller.round({ force: true });
  const count = await publishDiscoveredDevices();
  logger.info(`Scan: ${count} car(s) offered`);
});

gladys.onDeviceCreated(async (device) => {
  await refreshCreatedDevices();
  const parsed = parseExternalId(device.external_id);
  const car = parsed ? poller.get(parsed.vin) : null;
  if (car?.reading) {
    await publishStates(car.info, car.reading, true).catch((err) =>
      logger.warn(`Unable to publish the states: ${err.message}`),
    );
  }
});

gladys.onDeviceDeleted(refreshCreatedDevices);

// --- Configuration ------------------------------------------------------------------

/**
 * @description Reload the whole config (internal keys included).
 * @param {object} [fallback] - Raw values to use when the read fails.
 * @returns {Promise<void>}
 */
async function loadConfig(fallback) {
  try {
    const raw = await gladys.getConfig();
    config = normalizeConfig(raw);
    language = readLanguage(raw, language);
  } catch (err) {
    if (fallback) {
      config = { ...normalizeConfig(fallback), tokens: config.tokens };
    }
    logger.error('Unable to read the configuration', err);
  }
  tokens.setTokens(config.tokens);
}

gladys.onConfigUpdated(async (rawConfig) => {
  const before = JSON.stringify([config.apiKey, config.clientId, config.clientSecret]);
  await loadConfig(rawConfig);
  logger.info(`Configuration updated: read every ${config.pollInterval} min`);
  const credentialsChanged =
    before !== JSON.stringify([config.apiKey, config.clientId, config.clientSecret]);
  if (credentialsChanged || poller.list().length === 0) {
    poller.resume();
    await startIfReady();
  }
});

// --- Connection lifecycle -----------------------------------------------------------
gladys.on('connected', async () => {
  await loadConfig();
  await refreshHouses(true);
  await refreshCreatedDevices();
  lastStatus = null;
  await startIfReady();
});

// --- Graceful shutdown --------------------------------------------------------------
gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  clearTimeout(startRetry);
  poller.stop();
});

// --- Startup ------------------------------------------------------------------------
logger.info(`Starting the Volvo integration ${version}...`);
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
