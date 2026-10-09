/**
 * An in-memory stand-in for Hydra's admin API, for tests. It hands out
 * challenges the way Hydra does when a service sends a browser here, and
 * answers each challenge once — a second answer is the 404 of a request that
 * is gone, as with the real adapter.
 */
import { NotFoundError } from '../lib/errors';
import type { ConsentRequest, HydraClient, LoginRequest, LogoutRequest } from './hydra';

export const FAKE_HYDRA_URL = 'http://hydra.test';

interface FakeHydra extends HydraClient {
  /** A service sent someone to sign in; `rememberedAs` = Hydra already knows them. */
  startLogin(options?: { clientId?: string; clientName?: string; rememberedAs?: string }): string;
  /** Hydra asks whether `subject` may be shared with the service. */
  startConsent(subject: string, requestedScope?: string[]): string;
  /** Someone started signing out; `requestUrl` is the logout URL as requested. */
  startLogout(options: { subject: string | null; requestUrl?: string }): string;
  /** What each challenge was answered with. */
  readonly answers: Map<string, unknown>;
}

export function createFakeHydra(): FakeHydra {
  let next = 0;
  const logins = new Map<string, LoginRequest>();
  const consents = new Map<string, ConsentRequest>();
  const logouts = new Map<string, LogoutRequest>();
  const answers = new Map<string, unknown>();

  /** The pending request for `challenge`, or the 404 of a gone one. */
  const pending = <T>(kind: string, requests: Map<string, T>, challenge: string): T => {
    const request = requests.get(challenge);
    if (request === undefined || answers.has(challenge)) {
      throw new NotFoundError(`${kind} request`, challenge);
    }
    return request;
  };
  const answer = <T>(
    kind: string,
    requests: Map<string, T>,
    challenge: string,
    value: unknown,
  ): string => {
    pending(kind, requests, challenge);
    answers.set(challenge, value);
    return `${FAKE_HYDRA_URL}/after-${kind}?verifier=${challenge}`;
  };

  return {
    answers,

    startLogin({ clientId = 'todo-app', clientName = 'Todo App', rememberedAs } = {}) {
      const challenge = `login-${++next}`;
      logins.set(challenge, {
        skip: rememberedAs !== undefined,
        subject: rememberedAs ?? '',
        clientId,
        clientName,
      });
      return challenge;
    },
    startConsent(subject, requestedScope = ['openid', 'profile']) {
      const challenge = `consent-${++next}`;
      consents.set(challenge, { subject, requestedScope, requestedAudience: [] });
      return challenge;
    },
    startLogout({ subject, requestUrl = `${FAKE_HYDRA_URL}/oauth2/sessions/logout` }) {
      const challenge = `logout-${++next}`;
      logouts.set(challenge, { subject, requestUrl });
      return challenge;
    },

    getLoginRequest: (challenge) => Promise.resolve(pending('login', logins, challenge)),
    acceptLogin: (challenge, subject) =>
      Promise.resolve(answer('login', logins, challenge, { subject })),
    getConsentRequest: (challenge) => Promise.resolve(pending('consent', consents, challenge)),
    acceptConsent: (challenge, grant) =>
      Promise.resolve(answer('consent', consents, challenge, grant)),
    getLogoutRequest: (challenge) => Promise.resolve(pending('logout', logouts, challenge)),
    acceptLogout: (challenge) => Promise.resolve(answer('logout', logouts, challenge, true)),
    logoutUrl(params = {}) {
      const url = new URL('/oauth2/sessions/logout', FAKE_HYDRA_URL);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      return url.toString();
    },
  };
}
