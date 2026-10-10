// -----------------------------------------------------------------------------
// Client of the Volvo Cars APIs (developer.volvocars.com).
//
// Three APIs behind one host, all needing the Volvo ID bearer token AND the
// `vcc-api-key` header of the API application:
//   - Connected Vehicle v2  /connected-vehicle/v2/vehicles[/<vin>/<resource>]
//                           answers wrapped in `{ data }`;
//   - Energy v2             /energy/v2/vehicles/<vin>/state|capabilities
//                           answers NOT wrapped (`capabilities` under
//                           `getEnergyState`);
//   - Location v1           /location/v1/vehicles/<vin>/location, a GeoJSON
//                           Feature in `{ data }`.
//
// A 404 means "not available for this car" and reads as an empty answer. A
// 401 gets one retry with a refreshed token. A command the car could not run
// is a 422: read as the UNKNOWN status, like Home Assistant does.
// -----------------------------------------------------------------------------

const API_URL = 'https://api.volvocars.com';
const CONNECTED = '/connected-vehicle/v2/vehicles';
const ENERGY = '/energy/v2/vehicles';
const LOCATION = '/location/v1/vehicles';
const REQUEST_TIMEOUT_MS = 30000;
const IMAGE_TIMEOUT_MS = 15000;
const MAX_IMAGE_BYTES = 300 * 1024;
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

// Connected Vehicle resources read by the integration.
const RESOURCES = {
  DOORS: 'doors',
  WINDOWS: 'windows',
  ENGINE_STATUS: 'engine-status',
  STATISTICS: 'statistics',
  ODOMETER: 'odometer',
  FUEL: 'fuel',
  DIAGNOSTICS: 'diagnostics',
  WARNINGS: 'warnings',
  TYRES: 'tyres',
  BRAKES: 'brakes',
  ENGINE: 'engine',
  ACCESSIBILITY: 'command-accessibility',
};

/** An API error. */
class VolvoApiError extends Error {
  /**
   * @param {string} message - The message.
   * @param {object} [details] - `{ status, retryAfterMs }`.
   */
  constructor(message, { status = 0, retryAfterMs = 0 } = {}) {
    super(message);
    this.name = 'VolvoApiError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }

  /** @returns {boolean} True for a refused token or API key. */
  get auth() {
    return this.status === 401 || this.status === 403;
  }

  /** @returns {boolean} True when the daily quota or the rate is exceeded. */
  get rateLimited() {
    return this.status === 429;
  }
}

/**
 * @description Remove the VIN from a text (logs, errors).
 * @param {string} text - The text.
 * @returns {string} The text, VINs masked but their last 4 characters.
 * @example
 * redactVin('/vehicles/YV1ABCDEFG1234567/doors'); // -> '/vehicles/…4567/doors'
 */
function redactVin(text) {
  return String(text).replace(/[A-HJ-NPR-Z0-9]{13}([A-HJ-NPR-Z0-9]{4})/g, '…$1');
}

/**
 * @description The message of an error body `{ error: { message, description } }`.
 * @param {object|null} body - The JSON body.
 * @returns {string} The message, '' when none.
 */
function errorMessage(body) {
  const error = body?.error;
  if (!error || typeof error !== 'object') {
    return '';
  }
  return [error.message, error.description].filter((part) => typeof part === 'string').join(' ');
}

/**
 * @description Read a `Retry-After` header.
 * @param {string|null} header - The header.
 * @returns {number} The delay in ms, 0 when absent.
 */
function retryAfterMs(header) {
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

/**
 * @description Check a VIN before it goes into a URL.
 * @param {string} vin - The VIN.
 * @returns {string} The VIN.
 * @throws {VolvoApiError} When it is not a VIN.
 */
function checkVin(vin) {
  if (!VIN_REGEX.test(String(vin))) {
    throw new VolvoApiError('Invalid VIN');
  }
  return vin;
}

/**
 * @description The image type of some bytes.
 * @param {Buffer} buffer - The bytes.
 * @returns {string|null} 'png', 'jpeg', 'webp' or null.
 */
function imageType(buffer) {
  if (buffer.length > 8 && buffer.readUInt32BE(0) === 0x89504e47) {
    return 'png';
  }
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buffer.length > 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/**
 * @description Create the client.
 * @param {object} options - Options.
 * @param {object} options.tokens - The token manager (oauth.js).
 * @param {Function} options.getApiKey - `() => string`, the VCC API key.
 * @param {string} options.userAgent - The User-Agent.
 * @param {Function} [options.fetchImpl] - fetch, for the tests.
 * @returns {object} The client.
 * @example
 * const volvo = createVolvoClient({ tokens, getApiKey: () => config.apiKey, userAgent });
 */
function createVolvoClient({ tokens, getApiKey, userAgent, fetchImpl = fetch }) {
  /**
   * @description One call.
   * @param {string} method - GET or POST.
   * @param {string} path - The path.
   * @param {object} [options] - `{ body, command }`.
   * @returns {Promise<object>} The JSON body, {} for a 404.
   */
  async function request(method, path, { body, command = false } = {}) {
    let accessToken = await tokens.getAccessToken();
    for (let attempt = 0; ; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(`${API_URL}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'vcc-api-key': getApiKey(),
            Accept: 'application/json',
            'User-Agent': userAgent,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (err) {
        throw new VolvoApiError(`Volvo API unreachable (${redactVin(path)}): ${err.message}`);
      }
      let json;
      try {
        json = await response.json();
      } catch {
        json = null;
      }
      if (response.ok) {
        return json ?? {};
      }
      if (response.status === 401 && attempt === 0) {
        // Expired early, or revoked: one retry with a fresh token.
        accessToken = await tokens.getAccessToken({ rejected: accessToken });
        continue;
      }
      if (response.status === 404) {
        return {};
      }
      if (response.status === 422 && command) {
        return { data: { invokeStatus: 'UNKNOWN', message: errorMessage(json) } };
      }
      const detail = errorMessage(json);
      throw new VolvoApiError(
        `Volvo API: HTTP ${response.status} on ${redactVin(path)}${detail ? ` (${detail})` : ''}`,
        {
          status: response.status,
          retryAfterMs: retryAfterMs(response.headers.get('retry-after')),
        },
      );
    }
  }

  const get = (path) => request('GET', path);
  const dataOf = (json) => (json && typeof json.data === 'object' && json.data ? json.data : {});

  return {
    /**
     * @description The VINs of the account.
     * @returns {Promise<string[]>} The VINs.
     */
    async listVehicles() {
      const data = (await get(CONNECTED))?.data;
      return Array.isArray(data)
        ? data.map((item) => item?.vin).filter((vin) => VIN_REGEX.test(String(vin)))
        : [];
    },

    /**
     * @description The details of a car (model, year, fuel type, images…).
     * @param {string} vin - The VIN.
     * @returns {Promise<object>} The raw details.
     */
    async getVehicle(vin) {
      return dataOf(await get(`${CONNECTED}/${checkVin(vin)}`));
    },

    /**
     * @description The commands a car accepts (LOCK, HONK…).
     * @param {string} vin - The VIN.
     * @returns {Promise<string[]>} The command names.
     */
    async getCommands(vin) {
      const data = (await get(`${CONNECTED}/${checkVin(vin)}/commands`))?.data;
      return Array.isArray(data)
        ? data.map((item) => item?.command).filter((name) => typeof name === 'string')
        : [];
    },

    /**
     * @description One Connected Vehicle resource (RESOURCES).
     * @param {string} vin - The VIN.
     * @param {string} resource - The resource.
     * @returns {Promise<object>} The fields, `{ name: { value, unit, timestamp } }`.
     */
    async getResource(vin, resource) {
      return dataOf(await get(`${CONNECTED}/${checkVin(vin)}/${resource}`));
    },

    /**
     * @description What the Energy API supports for this car.
     * @param {string} vin - The VIN.
     * @returns {Promise<object>} `{ isSupported, <field>: { isSupported } }`.
     */
    async getEnergyCapabilities(vin) {
      const json = await get(`${ENERGY}/${checkVin(vin)}/capabilities`);
      return json?.getEnergyState && typeof json.getEnergyState === 'object'
        ? json.getEnergyState
        : {};
    },

    /**
     * @description The energy state (battery, charge).
     * @param {string} vin - The VIN.
     * @returns {Promise<object>} `{ <field>: { status, value, unit, updatedAt } }`.
     */
    async getEnergyState(vin) {
      return (await get(`${ENERGY}/${checkVin(vin)}/state`)) ?? {};
    },

    /**
     * @description The last known position.
     * @param {string} vin - The VIN.
     * @returns {Promise<object>} The GeoJSON Feature, {} when unknown.
     */
    async getLocation(vin) {
      return dataOf(await get(`${LOCATION}/${checkVin(vin)}/location`));
    },

    /**
     * @description Run a command (`lock`, `climatization-start`…). Volvo
     * answers once the car has (or has not) carried it out.
     * @param {string} vin - The VIN.
     * @param {string} command - The command path.
     * @param {object} [body] - Its body (`engine-start`: `{ runtimeMinutes }`).
     * @returns {Promise<{ status: string, message: string }>} The invoke status.
     */
    async sendCommand(vin, command, body) {
      const json = await request('POST', `${CONNECTED}/${checkVin(vin)}/commands/${command}`, {
        body: body ?? {},
        command: true,
      });
      const data = dataOf(json);
      return {
        status: typeof data.invokeStatus === 'string' ? data.invokeStatus.toUpperCase() : 'UNKNOWN',
        message: typeof data.message === 'string' ? data.message : '',
      };
    },

    /**
     * @description Download a picture of a car (the URLs of `getVehicle`).
     * @param {string} url - The image URL.
     * @returns {Promise<string>} The raw base64.
     */
    async fetchImage(url) {
      let response;
      try {
        response = await fetchImpl(url, {
          headers: { 'User-Agent': userAgent },
          signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
        });
      } catch (err) {
        throw new VolvoApiError(`Car picture unreachable: ${err.message}`);
      }
      if (!response.ok) {
        throw new VolvoApiError(`Car picture: HTTP ${response.status}`, {
          status: response.status,
        });
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_IMAGE_BYTES) {
        throw new VolvoApiError(`Car picture too large (${buffer.length} bytes)`);
      }
      if (imageType(buffer) === null) {
        throw new VolvoApiError('Car picture is not a PNG, JPEG or WebP');
      }
      return buffer.toString('base64');
    },
  };
}

export { API_URL, RESOURCES, VIN_REGEX, VolvoApiError, redactVin, imageType, createVolvoClient };
