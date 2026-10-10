import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TOKEN_URL,
  SCOPES,
  OAuthError,
  createVerifier,
  challengeOf,
  createState,
  buildAuthorizeUrl,
  readTokens,
  createTokenManager,
} from '../src/oauth.js';
import { fakeFetch, response, NOW } from './helpers/fixtures.js';

const client = () => ({ clientId: 'my-client', clientSecret: 'my-secret' });

test('computes the PKCE challenge of RFC 7636', () => {
  assert.equal(
    challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
  const verifier = createVerifier();
  assert.ok(verifier.length >= 43 && verifier.length <= 128);
  assert.match(verifier, /^[A-Za-z0-9_-]+$/);
  assert.match(createState(), /^[0-9a-f]{32}$/);
});

test('builds the Volvo ID authorization URL', () => {
  const url = new URL(
    buildAuthorizeUrl({
      clientId: 'my-client',
      redirectUri: 'https://my.gladysassistant.com/redirect/oauth',
      state: 'abc',
      verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    }),
  );
  assert.equal(
    url.origin + url.pathname,
    'https://volvoid.eu.volvocars.com/as/authorization.oauth2',
  );
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('client_id'), 'my-client');
  assert.equal(
    url.searchParams.get('redirect_uri'),
    'https://my.gladysassistant.com/redirect/oauth',
  );
  assert.equal(url.searchParams.get('state'), 'abc');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(
    url.searchParams.get('code_challenge'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
  const scopes = url.searchParams.get('scope').split(' ');
  assert.deepEqual(scopes, SCOPES);
  ['openid', 'conve:lock', 'conve:unlock', 'location:read', 'energy:state:read'].forEach((scope) =>
    assert.ok(scopes.includes(scope), scope),
  );
});

test('reads a token answer, keeping the refresh token when none is sent', () => {
  const tokens = readTokens({ access_token: 'a', expires_in: '1799' }, NOW, 'old-refresh');
  assert.deepEqual(tokens, {
    accessToken: 'a',
    refreshToken: 'old-refresh',
    expiresAt: NOW + 1799000,
  });
  assert.throws(() => readTokens({}, NOW), OAuthError);
});

test('exchanges the code with HTTP Basic and the verifier, and stores the tokens', async () => {
  const saved = [];
  const fetchImpl = fakeFetch(() =>
    response(200, { access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 1800 }),
  );
  const manager = createTokenManager({
    getClient: client,
    saveTokens: async (tokens) => saved.push(tokens),
    fetchImpl,
    now: () => NOW,
  });
  await manager.exchangeCode({ code: 'the-code', redirectUri: 'https://r', verifier: 'v' });
  const [call] = fetchImpl.calls;
  assert.equal(call.url, TOKEN_URL);
  assert.equal(
    call.init.headers.Authorization,
    `Basic ${Buffer.from('my-client:my-secret').toString('base64')}`,
  );
  const form = new URLSearchParams(call.init.body);
  assert.equal(form.get('grant_type'), 'authorization_code');
  assert.equal(form.get('code'), 'the-code');
  assert.equal(form.get('redirect_uri'), 'https://r');
  assert.equal(form.get('code_verifier'), 'v');
  assert.deepEqual(saved, [
    { accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: NOW + 1800000 },
  ]);
  assert.equal(await manager.getAccessToken(), 'access-1', 'still valid: no refresh');
  assert.equal(fetchImpl.calls.length, 1);
});

test('refreshes once for concurrent callers, and stores the rotated token', async () => {
  let clock = NOW;
  const saved = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const fetchImpl = fakeFetch(async () => {
    await gate;
    return response(200, {
      access_token: 'access-2',
      refresh_token: 'refresh-2',
      expires_in: 1800,
    });
  });
  const manager = createTokenManager({
    getClient: client,
    saveTokens: async (tokens) => saved.push(tokens),
    fetchImpl,
    now: () => clock,
  });
  manager.setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: NOW + 30000 });
  // 30 s left: inside the margin, refresh.
  const both = Promise.all([manager.getAccessToken(), manager.getAccessToken()]);
  release();
  assert.deepEqual(await both, ['access-2', 'access-2']);
  assert.equal(fetchImpl.calls.length, 1, 'a single refresh: the refresh token is single-use');
  const form = new URLSearchParams(fetchImpl.calls[0].init.body);
  assert.equal(form.get('grant_type'), 'refresh_token');
  assert.equal(form.get('refresh_token'), 'refresh-1');
  assert.equal(saved[0].refreshToken, 'refresh-2');
  clock += 60000;
  assert.equal(await manager.getAccessToken(), 'access-2');
});

test('refreshes a token an API refused, unless it was already replaced', async () => {
  let n = 0;
  const fetchImpl = fakeFetch(() => {
    n += 1;
    return response(200, {
      access_token: `access-${n + 1}`,
      refresh_token: `r${n + 1}`,
      expires_in: 1800,
    });
  });
  const manager = createTokenManager({
    getClient: client,
    saveTokens: async () => {},
    fetchImpl,
    now: () => NOW,
  });
  manager.setTokens({ accessToken: 'access-1', refreshToken: 'r1', expiresAt: NOW + 1800000 });
  assert.equal(await manager.getAccessToken({ rejected: 'access-1' }), 'access-2');
  assert.equal(
    await manager.getAccessToken({ rejected: 'access-1' }),
    'access-2',
    'already replaced',
  );
  assert.equal(fetchImpl.calls.length, 1);
});

test('a refused refresh asks for a new sign-in; a 5xx does not', async () => {
  const refused = createTokenManager({
    getClient: client,
    saveTokens: async () => {},
    fetchImpl: fakeFetch(() =>
      response(400, { error: 'invalid_grant', error_description: 'grant expired' }),
    ),
    now: () => NOW,
  });
  refused.setTokens({ accessToken: '', refreshToken: 'dead', expiresAt: 0 });
  await assert.rejects(refused.getAccessToken(), (err) => {
    assert.ok(err instanceof OAuthError);
    assert.equal(err.reauth, true);
    assert.equal(err.code, 'invalid_grant');
    assert.match(err.message, /grant expired/);
    return true;
  });

  const down = createTokenManager({
    getClient: client,
    saveTokens: async () => {},
    fetchImpl: fakeFetch(() => response(503, undefined)),
    now: () => NOW,
  });
  down.setTokens({ refreshToken: 'alive' });
  await assert.rejects(down.getAccessToken(), (err) => err.reauth === false);

  const never = createTokenManager({ getClient: client, saveTokens: async () => {} });
  await assert.rejects(never.getAccessToken(), (err) => err.reauth === true);
  assert.equal(never.hasGrant(), false);
});

test('clear forgets and stores empty tokens', async () => {
  const saved = [];
  const manager = createTokenManager({ getClient: client, saveTokens: async (t) => saved.push(t) });
  manager.setTokens({ accessToken: 'a', refreshToken: 'r', expiresAt: NOW });
  assert.equal(manager.hasGrant(), true);
  await manager.clear();
  assert.equal(manager.hasGrant(), false);
  assert.deepEqual(saved, [{ accessToken: '', refreshToken: '', expiresAt: 0 }]);
});
