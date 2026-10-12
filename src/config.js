// -----------------------------------------------------------------------------
// Configuration of the Volvo integration.
//
// Fields of the config_schema:
//   - `api_key`        the "VCC API key" of an API application of the Volvo
//                      developer portal — sent with every data call;
//   - `client_id`      the OAuth2 client of that application, once published
//   - `client_secret`  (it gives the Volvo ID sign-in, see oauth.js);
//   - `volvo_account`  the Connect button (oauth2 field, no stored value);
//   - `poll_interval`  how often the live data is read, in minutes;
//   - `home_radius`    the distance from home (m) under which a car is home;
//   - `language`       language of the texts the integration writes outside
//                      a widget request (device names, text states, scene
//                      summaries): `auto` = the language of the last widget
//                      request, else en / fr / de / es. Gladys does not send
//                      the language with a poll or a scene action.
//
// Internal keys, outside the config_schema (never shown in the UI):
//   - `access_token` / `refresh_token` / `token_expires_at`  the Volvo ID
//                      tokens; Volvo rotates the refresh token on every use,
//                      so the new one is stored before anything else;
//   - `oauth_state` / `oauth_code_verifier`  the pending sign-in (PKCE), kept
//                      across a restart of the container between "Connect"
//                      and the redirection back;
//   - `last_language`  language of the last widget request, for the device
//                      names and the scene texts after a restart.
// -----------------------------------------------------------------------------

// Minutes. The API application of the developer portal has a daily request
// quota (shared by all the cars of the account): a live round costs about 6
// calls per car, so 5 minutes ≈ 1,700 calls a day for one car.
const POLL_INTERVAL = { min: 2, max: 60, default: 5 };
// Meters.
const HOME_RADIUS = { min: 50, max: 5000, default: 200 };
const ACCOUNT_FIELD = 'volvo_account';
const LANGUAGES = ['en', 'fr', 'de', 'es'];
const AUTO_LANGUAGE = 'auto';

const INTERNAL_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  expiresAt: 'token_expires_at',
  oauthState: 'oauth_state',
  oauthVerifier: 'oauth_code_verifier',
  language: 'last_language',
};

/**
 * @description Read a bounded number field, falling back to its default.
 * @param {unknown} raw - The raw value (the form can send numbers as strings).
 * @param {{ min: number, max: number, default: number }} bounds - The bounds.
 * @returns {number} The value.
 * @example
 * readNumber('10', POLL_INTERVAL); // -> 10
 */
function readNumber(raw, bounds) {
  const value = Number(raw ?? bounds.default);
  if (raw === '' || !Number.isFinite(value)) {
    return bounds.default;
  }
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
}

/**
 * @description Read a trimmed string.
 * @param {unknown} raw - The raw value.
 * @returns {string} The string, '' when absent.
 * @example
 * readString(' abc '); // -> 'abc'
 */
function readString(raw) {
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * @description Read the language setting.
 * @param {unknown} raw - The raw value.
 * @returns {string} `auto`, or a supported language.
 * @example
 * readLanguageSetting('de'); // -> 'de'
 */
function readLanguageSetting(raw) {
  return LANGUAGES.includes(raw) ? raw : AUTO_LANGUAGE;
}

/**
 * @description Normalize the raw config object from the host API.
 * @param {object} [rawConfig] - The raw config values.
 * @returns {{ apiKey: string, clientId: string, clientSecret: string,
 * pollInterval: number, homeRadius: number, language: string, tokens: { accessToken: string,
 * refreshToken: string, expiresAt: number } }} The config (poll interval in
 * minutes, radius in meters).
 * @example
 * normalizeConfig({ api_key: 'abc', client_id: 'id', client_secret: 'secret' });
 */
function normalizeConfig(rawConfig = {}) {
  const config = rawConfig ?? {};
  const expiresAt = Number(config[INTERNAL_KEYS.expiresAt]);
  return {
    apiKey: readString(config.api_key),
    clientId: readString(config.client_id),
    clientSecret: readString(config.client_secret),
    pollInterval: readNumber(config.poll_interval, POLL_INTERVAL),
    homeRadius: readNumber(config.home_radius, HOME_RADIUS),
    language: readLanguageSetting(config.language),
    tokens: {
      accessToken: readString(config[INTERNAL_KEYS.accessToken]),
      refreshToken: readString(config[INTERNAL_KEYS.refreshToken]),
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
    },
  };
}

/**
 * @description Whether the OAuth2 client is filled in (Connect can run).
 * @param {object} config - The normalized config.
 * @returns {boolean} True when the client id and secret are set.
 * @example
 * hasClient(config);
 */
function hasClient(config) {
  return Boolean(config.clientId && config.clientSecret);
}

/**
 * @description Whether everything needed to read the cars is there.
 * @param {object} config - The normalized config.
 * @returns {boolean} True with an API key, a client and a refresh token.
 * @example
 * isReady(config);
 */
function isReady(config) {
  return Boolean(config.apiKey && hasClient(config) && config.tokens.refreshToken);
}

/**
 * @description Read the stored language of the last request.
 * @param {object} [rawConfig] - The raw config values.
 * @param {string} fallback - The language to keep when nothing valid is stored.
 * @returns {string} The language.
 * @example
 * readLanguage({ last_language: 'fr' }, 'en'); // -> 'fr'
 */
function readLanguage(rawConfig, fallback) {
  const language = (rawConfig ?? {})[INTERNAL_KEYS.language];
  return typeof language === 'string' && /^[a-z]{2}$/.test(language) ? language : fallback;
}

export {
  POLL_INTERVAL,
  HOME_RADIUS,
  ACCOUNT_FIELD,
  INTERNAL_KEYS,
  LANGUAGES,
  AUTO_LANGUAGE,
  readLanguageSetting,
  normalizeConfig,
  hasClient,
  isReady,
  readLanguage,
};
