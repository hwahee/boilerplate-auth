/**
 * The Hydra adapter against a stand-in admin API: the requests it sends and
 * how it reads the answers (shapes per Hydra v2's admin API).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { NotFoundError } from '../lib/errors';
import { createHydraClient, type HydraClient } from './hydra';

interface Seen {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
}

let admin: Bun.Server<undefined>;
let seen: Seen[];
/** What the stand-in answers next: a status and a JSON body. */
let reply: { status: number; body: unknown };
let hydra: HydraClient;

beforeAll(() => {
  admin = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const text = await req.text();
      seen.push({
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: text ? (JSON.parse(text) as unknown) : undefined,
      });
      return Response.json(reply.body, { status: reply.status });
    },
  });
  const client = createHydraClient({
    hydraPublicUrl: 'https://auth-hydra.example.com',
    hydraAdminUrl: String(admin.url),
  });
  if (!client) throw new Error('expected a client');
  hydra = client;
});

afterAll(async () => {
  await admin.stop(true);
});

beforeEach(() => {
  seen = [];
  reply = { status: 200, body: {} };
});

describe('createHydraClient', () => {
  test('is null unless both URLs are configured', () => {
    expect(createHydraClient({ hydraPublicUrl: undefined, hydraAdminUrl: undefined })).toBeNull();
    expect(
      createHydraClient({ hydraPublicUrl: 'http://localhost:4444', hydraAdminUrl: undefined }),
    ).toBeNull();
  });
});

describe('login', () => {
  test('reads the request; an unnamed client goes by its id', async () => {
    reply.body = { skip: false, subject: '', client: { client_id: 'todo-app', client_name: '' } };
    expect(await hydra.getLoginRequest('abc')).toEqual({
      skip: false,
      subject: '',
      clientId: 'todo-app',
      clientName: 'todo-app',
    });
    expect(seen[0]).toMatchObject({
      method: 'GET',
      path: '/admin/oauth2/auth/requests/login',
      query: { login_challenge: 'abc' },
    });
  });

  test('accepts as our member id, remembered for the browser session', async () => {
    reply.body = { redirect_to: 'https://auth-hydra.example.com/oauth2/auth?login_verifier=v' };
    expect(await hydra.acceptLogin('abc', 'alice')).toBe(
      'https://auth-hydra.example.com/oauth2/auth?login_verifier=v',
    );
    expect(seen[0]).toEqual({
      method: 'PUT',
      path: '/admin/oauth2/auth/requests/login/accept',
      query: { login_challenge: 'abc' },
      body: { subject: 'alice', remember: true, remember_for: 0 },
    });
  });

  test('a request that is gone (unknown, expired, answered) is a NotFoundError naming it', async () => {
    for (const status of [401, 404, 410]) {
      reply = { status, body: { error: 'gone' } };
      const error = await hydra.getLoginRequest('old').catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toMatchObject({ resource: 'login request', id: 'old' });
    }
  });

  test('any other failure is an error, not a missing request', async () => {
    reply = { status: 500, body: { error: 'boom' } };
    const error = await hydra.acceptLogin('abc', 'alice').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(NotFoundError);
  });
});

describe('consent', () => {
  test('reads what was asked; missing lists are empty', async () => {
    reply.body = { subject: 'alice', requested_scope: ['openid'] };
    expect(await hydra.getConsentRequest('c1')).toEqual({
      subject: 'alice',
      requestedScope: ['openid'],
      requestedAudience: [],
    });
    expect(seen[0]?.query).toEqual({ consent_challenge: 'c1' });
  });

  test('grants with id_token claims, remembered for the browser session', async () => {
    reply.body = { redirect_to: 'next' };
    await hydra.acceptConsent('c1', {
      scope: ['openid', 'profile'],
      audience: [],
      idToken: { name: 'Alice' },
    });
    expect(seen[0]).toMatchObject({
      method: 'PUT',
      path: '/admin/oauth2/auth/requests/consent/accept',
      body: {
        grant_scope: ['openid', 'profile'],
        grant_access_token_audience: [],
        session: { id_token: { name: 'Alice' } },
        remember: true,
        remember_for: 0,
      },
    });
  });
});

describe('logout', () => {
  test('reads who and the requested URL; no session is a null subject', async () => {
    reply.body = { subject: '', request_url: '/oauth2/sessions/logout?confirmed=1' };
    expect(await hydra.getLogoutRequest('l1')).toEqual({
      subject: null,
      requestUrl: '/oauth2/sessions/logout?confirmed=1',
    });
    expect(seen[0]?.query).toEqual({ logout_challenge: 'l1' });
  });

  test('accepts, and every sign-out starts at the public logout endpoint', async () => {
    reply.body = { redirect_to: 'after' };
    expect(await hydra.acceptLogout('l1')).toBe('after');
    expect(seen[0]).toMatchObject({
      method: 'PUT',
      path: '/admin/oauth2/auth/requests/logout/accept',
    });
    expect(hydra.logoutUrl({ confirmed: '1' })).toBe(
      'https://auth-hydra.example.com/oauth2/sessions/logout?confirmed=1',
    );
  });
});
