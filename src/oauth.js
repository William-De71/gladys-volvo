// -----------------------------------------------------------------------------
// Volvo ID sign-in (OAuth2 authorization code + PKCE) and the tokens.
//
// The flow, driven by the `volvo_account` oauth2 field of the manifest:
//   1. "Connect": `buildAuthorizeUrl` returns the Volvo ID page, with a random
//      state and a PKCE challenge. The state and the verifier are stored
//      (setConfig) so a restart of the container in between loses nothing.
//   2. The user signs in (Volvo ID asks for an e-mailed code), approves, and
//      Volvo redirects to the redirect URI declared on the developer portal —
//      the HTTPS page of Gladys, which sends the browser back to the instance.
//   3. `exchangeCode` trades the code for the tokens (client authenticated
//      with HTTP Basic, as the portal expects).
//
// Volvo ROTATES the refresh token: each one is single-use. Two refreshes
// running at once would burn the grant (the second one replays a dead token),
// hence the single-flight `getAccessToken`, and the new tokens are stored
// before they are used. The grant of an application published on the
// developer portal for one's own use is limited in time: once the refresh is
// refused, the user must click Connect again (`OAuthError.reauth`).
// -----------------------------------------------------------------------------

import { createHash, randomBytes } from 'node:crypto';

const AUTHORIZE_URL = 'https://volvoid.eu.volvocars.com/as/authorization.oauth2';
const TOKEN_URL = 'https://volvoid.eu.volvocars.com/as/token.oauth2';

// The scopes of HA's integration (volvocarsapi): the portal shows them in
// sections, and they must ALL be ticked when the application is published —
// Volvo refuses the sign-in when one asked here is missing there.
const SCOPES = [
  'openid',
  'conve:battery_charge_level',
  'conve:brake_status',
  'conve:climatization_start_stop',
  'conve:command_accessibility',
  'conve:commands',
  'conve:diagnostics_engine_status',
  'conve:diagnostics_workshop',
  'conve:doors_status',
  'conve:engine_status',
  'conve:fuel_status',
  'conve:lock_status',
  'conve:odometer_status',
  'conve:trip_statistics',
  'conve:tyre_status',
  'conve:vehicle_relation',
  'conve:warnings',
  'conve:windows_status',
  'energy:capability:read',
  'energy:state:read',
  'conve:lock',
  'conve:unlock',
  'conve:engine_start_stop',
  'conve:honk_flash',
  'location:read',
];

const REQUEST_TIMEOUT_MS = 20000;
// Refresh this long before the expiry: never send a token that dies mid-call.
const EXPIRY_MARGIN_MS = 60000;

/** An OAuth error; `reauth` when only a new sign-in can fix it. */
class OAuthError extends Error {
  /**
   * @param {string} message - The message.
   * @param {object} [details] - `{ status, code, reauth }`.
   */
  constructor(message, { status = 0, code = '', reauth = false } = {}) {
    super(message);
    this.name = 'OAuthError';
    this.status = status;
    this.code = code;
    this.reauth = reauth;
  }
}

/**
 * @description A base64url string without padding.
 * @param {Buffer} buffer - The bytes.
 * @returns {string} The string.
 */
function base64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @description A fresh PKCE verifier (RFC 7636: 43 to 128 characters).
 * @returns {string} The verifier.
 * @example
 * createVerifier().length; // -> 86
 */
function createVerifier() {
  return base64Url(randomBytes(64));
}

/**
 * @description The S256 challenge of a verifier.
 * @param {string} verifier - The verifier.
 * @returns {string} The challenge.
 * @example
 * challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
 * // -> 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
 */
function challengeOf(verifier) {
  return base64Url(createHash('sha256').update(verifier, 'ascii').digest());
}

/**
 * @description A random anti-CSRF state.
 * @returns {string} The state (32 hex characters).
 */
function createState() {
  return randomBytes(16).toString('hex');
}

/**
 * @description The Volvo ID authorization URL.
 * @param {object} options - Options.
 * @param {string} options.clientId - The OAuth2 client id.
 * @param {string} options.redirectUri - The redirect URI given by Gladys.
 * @param {string} options.state - The anti-CSRF state.
 * @param {string} options.verifier - The PKCE verifier.
 * @returns {string} The URL.
 * @example
 * buildAuthorizeUrl({ clientId: 'abc', redirectUri, state, verifier });
 */
function buildAuthorizeUrl({ clientId, redirectUri, state, verifier }) {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challengeOf(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

/**
 * @description Read a token response into the stored shape.
 * @param {object} body - The JSON body.
 * @param {number} now - Now, in ms.
 * @param {string} [previousRefresh] - The refresh token to keep when none is sent.
 * @returns {{ accessToken: string, refreshToken: string, expiresAt: number }} The tokens.
 * @throws {OAuthError} When there is no access token.
 */
function readTokens(body, now, previousRefresh = '') {
  const accessToken = typeof body?.access_token === 'string' ? body.access_token : '';
  if (!accessToken) {
    throw new OAuthError('Volvo ID sent no access token');
  }
  const expiresIn = Number(body.expires_in);
  return {
    accessToken,
    refreshToken:
      typeof body.refresh_token === 'string' && body.refresh_token
        ? body.refresh_token
        : previousRefresh,
    expiresAt: now + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 1800) * 1000,
  };
}

/**
 * @description Create the token manager.
 * @param {object} options - Options.
 * @param {Function} options.getClient - `() => ({ clientId, clientSecret })`.
 * @param {Function} options.saveTokens - `async (tokens) => void`, stores them.
 * @param {Function} [options.fetchImpl] - fetch, for the tests.
 * @param {Function} [options.now] - Clock, for the tests.
 * @returns {object} The manager.
 * @example
 * const tokens = createTokenManager({ getClient, saveTokens });
 */
function createTokenManager({ getClient, saveTokens, fetchImpl = fetch, now = Date.now }) {
  let current = { accessToken: '', refreshToken: '', expiresAt: 0 };
  let refreshing = null;

  /**
   * @description POST a form to the token endpoint.
   * @param {object} form - The form fields.
   * @returns {Promise<object>} The JSON body.
   */
  async function postToken(form) {
    const { clientId, clientSecret } = getClient();
    if (!clientId || !clientSecret) {
      throw new OAuthError('The OAuth2 client id and secret are not set', { reauth: true });
    }
    let response;
    try {
      response = await fetchImpl(TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams(form).toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      throw new OAuthError(`Volvo ID unreachable: ${err.message}`);
    }
    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (!response.ok) {
      const code = typeof body?.error === 'string' ? body.error : '';
      const description = typeof body?.error_description === 'string' ? body.error_description : '';
      throw new OAuthError(
        `Volvo ID refused (HTTP ${response.status}${code ? `, ${code}` : ''}${description ? `: ${description}` : ''})`,
        // A stale or revoked refresh token is a 400 invalid_grant; a wrong
        // client a 401. Only a 5xx is worth retrying.
        { status: response.status, code, reauth: response.status >= 400 && response.status < 500 },
      );
    }
    return body ?? {};
  }

  /**
   * @description Store and adopt new tokens (stored first: the old refresh
   * token is already dead).
   * @param {object} tokens - The tokens.
   * @returns {Promise<object>} The tokens.
   */
  async function adopt(tokens) {
    current = tokens;
    await saveTokens(tokens);
    return tokens;
  }

  return {
    /**
     * @description Load the stored tokens (startup, config reload).
     * @param {object} tokens - `{ accessToken, refreshToken, expiresAt }`.
     */
    setTokens(tokens) {
      if (refreshing) {
        // A refresh in flight wins: its tokens are newer than the stored ones.
        return;
      }
      current = { ...current, ...tokens };
    },

    /** @returns {boolean} True when a sign-in happened (a refresh token is known). */
    hasGrant() {
      return Boolean(current.refreshToken);
    },

    /**
     * @description Forget the tokens (disconnect, or a refused refresh).
     * @returns {Promise<void>}
     */
    async clear() {
      current = { accessToken: '', refreshToken: '', expiresAt: 0 };
      await saveTokens(current);
    },

    /**
     * @description Trade an authorization code for the tokens.
     * @param {object} options - `{ code, redirectUri, verifier }`.
     * @returns {Promise<object>} The tokens.
     */
    async exchangeCode({ code, redirectUri, verifier }) {
      const body = await postToken({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });
      return adopt(readTokens(body, now()));
    },

    /**
     * @description A valid access token, refreshed when needed. One refresh
     * at a time: concurrent callers share it.
     * @param {object} [options] - `{ rejected }`: the token an API call just
     * refused (401), refreshed even if not expired — unless another caller
     * already replaced it.
     * @returns {Promise<string>} The access token.
     * @throws {OAuthError} With `reauth` when the user must sign in again.
     */
    async getAccessToken({ rejected = null } = {}) {
      const stale = rejected !== null && rejected === current.accessToken;
      if (!stale && current.accessToken && current.expiresAt - EXPIRY_MARGIN_MS > now()) {
        return current.accessToken;
      }
      if (!current.refreshToken) {
        throw new OAuthError('Not connected to Volvo ID', { reauth: true });
      }
      if (!refreshing) {
        const refreshToken = current.refreshToken;
        refreshing = postToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
          .then((body) => adopt(readTokens(body, now(), refreshToken)))
          .finally(() => {
            refreshing = null;
          });
      }
      const tokens = await refreshing;
      return tokens.accessToken;
    },
  };
}

export {
  AUTHORIZE_URL,
  TOKEN_URL,
  SCOPES,
  OAuthError,
  createVerifier,
  challengeOf,
  createState,
  buildAuthorizeUrl,
  readTokens,
  createTokenManager,
};
