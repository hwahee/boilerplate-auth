/**
 * The /api/auth routes a Hydra flow goes through, on the real app with the
 * in-memory driver and a fake Hydra admin API (src/server/identity/fake-hydra.ts).
 * The flow against a real Hydra is exercised by hand (README).
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import type { LoginResumption, LogoutRequestInfo, SignInResult } from '@shared/domain/user';

import { buildApp, type SocketData } from '../app';
import { loadServerConfig } from '../config';
import { createContainer, type Container } from '../container';
import { createFakeHydra, FAKE_HYDRA_URL } from '../identity/fake-hydra';
import { silentLogger } from '../lib/log';

const hydra = createFakeHydra();
let container: Container;
let server: Bun.Server<SocketData>;
let baseUrl: string;

beforeAll(() => {
  const config = loadServerConfig({ DB_DRIVER: 'memory', AUTH_DRIVER: 'dev' });
  container = createContainer(config, { log: silentLogger, hydra });
  const app = buildApp(container, { shuttingDown: false });
  server = Bun.serve({ port: 0, ...app });
  baseUrl = String(server.url).replace(/\/$/, '');
});

afterAll(async () => {
  await server.stop(true);
  await container.dispose();
});

async function call<T = unknown>(
  method: string,
  path: string,
  options: { body?: unknown; cookie?: string } = {},
): Promise<{ status: number; body: T; headers: Headers }> {
  const response = await fetch(baseUrl + path, {
    method,
    redirect: 'manual',
    headers: {
      ...(options.cookie === undefined ? {} : { cookie: options.cookie }),
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: (text ? JSON.parse(text) : undefined) as T,
    headers: response.headers,
  };
}

const cookieFrom = (headers: Headers) => (headers.get('set-cookie') ?? '').split(';')[0] ?? '';

describe('a service sends someone to sign in', () => {
  test('signing up on the page hands them back to the service, signed in here too', async () => {
    const loginChallenge = hydra.startLogin({ clientId: 'todo-app' });
    const { status, body, headers } = await call<SignInResult>('POST', '/api/auth/sign-up', {
      body: { userId: 'newcomer', displayName: 'Newcomer', loginChallenge },
    });
    expect(status).toBe(201);
    expect(body.user.id).toBe('newcomer');
    expect(body.redirectTo).toStartWith(FAKE_HYDRA_URL);
    expect(hydra.answers.get(loginChallenge)).toEqual({ subject: 'newcomer' });
    expect(cookieFrom(headers)).toBe('session=newcomer');
  });

  test('the page asks only when nobody is known; a member signed in here goes straight back', async () => {
    await call('POST', '/api/auth/sign-up', { body: { userId: 'bob', displayName: 'Bob' } });

    const asked = hydra.startLogin({ clientId: 'chat-app', clientName: 'Chat' });
    const guest = await call<LoginResumption>('POST', '/api/auth/login/resume', {
      body: { loginChallenge: asked },
    });
    expect(guest.body).toEqual({ redirectTo: null, service: { id: 'chat-app', name: 'Chat' } });

    const login = await call<SignInResult>('POST', '/api/auth/login', {
      body: { userId: 'bob', loginChallenge: asked },
    });
    expect(login.body.redirectTo).toStartWith(FAKE_HYDRA_URL);

    const again = hydra.startLogin({ clientId: 'todo-app' });
    const member = await call<LoginResumption>('POST', '/api/auth/login/resume', {
      body: { loginChallenge: again },
      cookie: 'session=bob',
    });
    expect(member.body.redirectTo).toStartWith(FAKE_HYDRA_URL);
    expect(hydra.answers.get(again)).toEqual({ subject: 'bob' });
  });

  test('a request that is gone is a 404 naming the request, and signs nobody in', async () => {
    const loginChallenge = hydra.startLogin();
    await call('POST', '/api/auth/sign-up', {
      body: { userId: 'carol', displayName: 'Carol', loginChallenge },
    });
    const { status, body } = await call<{ error: { code: string; details: unknown } }>(
      'POST',
      '/api/auth/login/resume',
      { body: { loginChallenge } },
    );
    expect(status).toBe(404);
    expect(body.error).toMatchObject({
      code: 'NOT_FOUND',
      details: { resource: 'login request', id: loginChallenge },
    });
  });

  test('consent is answered without a screen: a redirect onwards', async () => {
    const consentChallenge = hydra.startConsent('bob');
    const { status, headers } = await call(
      'GET',
      `/api/auth/consent?consent_challenge=${consentChallenge}`,
    );
    expect(status).toBe(302);
    expect(headers.get('location')).toStartWith(FAKE_HYDRA_URL);
    expect(hydra.answers.get(consentChallenge)).toMatchObject({ idToken: { name: 'Bob' } });

    expect((await call('GET', '/api/auth/consent')).status).toBe(400);
  });
});

describe('signing out', () => {
  test('from a service: the page learns who, then accepting ends the session everywhere', async () => {
    await call('POST', '/api/auth/sign-up', { body: { userId: 'dave', displayName: 'Dave' } });
    const logoutChallenge = hydra.startLogout({ subject: 'dave' });

    const request = await call<LogoutRequestInfo>(
      'GET',
      `/api/auth/logout-request?logout_challenge=${logoutChallenge}`,
    );
    expect(request.body).toEqual({ displayName: 'Dave', confirmed: false });

    const { status, body, headers } = await call<{ redirectTo: string }>(
      'POST',
      '/api/auth/logout',
      { body: { logoutChallenge }, cookie: 'session=dave' },
    );
    expect(status).toBe(200);
    expect(body.redirectTo).toStartWith(FAKE_HYDRA_URL);
    expect(cookieFrom(headers)).toBe('session=');
    expect(hydra.answers.get(logoutChallenge)).toBe(true);
  });

  test('confirmed on this page: through Hydra, marked so the page does not ask again', async () => {
    const { status, headers } = await call('GET', '/api/auth/logout/start');
    expect(status).toBe(302);
    const location = headers.get('location') ?? '';
    expect(location).toBe(`${FAKE_HYDRA_URL}/oauth2/sessions/logout?confirmed=1`);

    const logoutChallenge = hydra.startLogout({ subject: 'dave', requestUrl: location });
    const request = await call<LogoutRequestInfo>(
      'GET',
      `/api/auth/logout-request?logout_challenge=${logoutChallenge}`,
    );
    expect(request.body.confirmed).toBe(true);
  });

  test('without a challenge it only clears this app (the /logged-out page)', async () => {
    const { status, headers } = await call('POST', '/api/auth/logout', { cookie: 'session=dave' });
    expect(status).toBe(204);
    expect(cookieFrom(headers)).toBe('session=');
  });
});

describe('without Hydra configured', () => {
  test('the Hydra-only routes are 404 and a confirmed sign-out goes to /logged-out', async () => {
    const config = loadServerConfig({ DB_DRIVER: 'memory', AUTH_DRIVER: 'dev' });
    const alone = createContainer(config, { log: silentLogger, hydra: null });
    const app = buildApp(alone, { shuttingDown: false });
    const local = Bun.serve({ port: 0, ...app });
    try {
      const url = String(local.url).replace(/\/$/, '');
      const resume = await fetch(`${url}/api/auth/login/resume`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ loginChallenge: 'login-1' }),
      });
      expect(resume.status).toBe(404);
      const start = await fetch(`${url}/api/auth/logout/start`, { redirect: 'manual' });
      expect(start.headers.get('location')).toBe('/logged-out');
    } finally {
      await local.stop(true);
      await alone.dispose();
    }
  });
});
