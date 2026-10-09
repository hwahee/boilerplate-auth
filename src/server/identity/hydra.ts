/**
 * Ory Hydra — the ONE file that talks to Hydra's admin API (CLAUDE.md).
 *
 * Hydra owns the OIDC protocol (redirect checks, codes, tokens, the session
 * cookie that makes sign-in carry across services). It owns no members and
 * draws no screens: for each login, consent and logout it hands a "challenge"
 * to this app, which decides and answers here. Swapping Hydra for another
 * provider of the same kind means rewriting this file only; ESLint keeps
 * every other file away from `hydraAdminUrl`.
 *
 * Member ids are this app's ids: the subject accepted here is a `users.id`,
 * never something Hydra generated.
 */
import type { ServerConfig } from '../config';
import { NotFoundError } from '../lib/errors';
import type { ServiceRegistration } from './services';

export interface LoginRequest {
  /** True when Hydra already knows who this is (its session cookie). */
  skip: boolean;
  /** The member Hydra remembers; meaningful only when `skip`. */
  subject: string;
  /** The service asking — its OAuth client id doubles as the service name. */
  clientId: string;
  clientName: string;
}

export interface ConsentRequest {
  subject: string;
  requestedScope: string[];
  requestedAudience: string[];
}

export interface LogoutRequest {
  /** The member signing out; null when Hydra no longer knows the session. */
  subject: string | null;
  /** The logout URL as the browser requested it, query included. */
  requestUrl: string;
}

export interface HydraClient {
  getLoginRequest(challenge: string): Promise<LoginRequest>;
  /** Accepts the login as `subject`; returns where to send the browser next. */
  acceptLogin(challenge: string, subject: string): Promise<string>;
  getConsentRequest(challenge: string): Promise<ConsentRequest>;
  /** Grants what was asked, with `idToken` claims; returns where to go next. */
  acceptConsent(
    challenge: string,
    grant: { scope: string[]; audience: string[]; idToken: Record<string, string> },
  ): Promise<string>;
  getLogoutRequest(challenge: string): Promise<LogoutRequest>;
  /** Ends the Hydra session (every service, via front-channel logout). */
  acceptLogout(challenge: string): Promise<string>;
  /** Hydra's logout endpoint, where every sign-out starts; extra params ride along. */
  logoutUrl(params?: Record<string, string>): string;
}

/**
 * Remembered for the browser session (`remember_for: 0` = a session cookie):
 * sign-in carries across services until the browser closes or the member
 * signs out.
 */
const REMEMBER = { remember: true, remember_for: 0 } as const;

/** Hydra leaves unset text fields empty rather than out. */
function nonEmpty(value: string | undefined): string | null {
  return value === undefined || value === '' ? null : value;
}

/** The Hydra this app fronts, or `null` when none is configured (pages work alone). */
export function createHydraClient(
  config: Pick<ServerConfig, 'hydraPublicUrl' | 'hydraAdminUrl'>,
): HydraClient | null {
  const { hydraPublicUrl, hydraAdminUrl } = config;
  if (hydraPublicUrl === undefined || hydraAdminUrl === undefined) return null;

  const admin = (path: string, challengeParam: string, challenge: string) => {
    const url = new URL(`/admin/oauth2/auth/requests/${path}`, hydraAdminUrl);
    url.searchParams.set(challengeParam, challenge);
    return url;
  };

  async function call<T>(kind: string, url: URL, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: { accept: 'application/json', 'content-type': 'application/json' },
    });
    // The flow is gone and the browser has to start over at the service: an
    // unknown challenge (404), an expired one (401 `request_unauthorized` —
    // the admin API has no other 401), or one already answered (410).
    // Hydra v2 challenges are stateless, so a replayed one may still read as
    // valid; Hydra then refuses it at the service's callback (access_denied).
    if (response.status === 401 || response.status === 404 || response.status === 410) {
      throw new NotFoundError(`${kind} request`, url.searchParams.values().next().value ?? '');
    }
    if (!response.ok) {
      throw new Error(`Hydra ${kind} request failed: HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }

  const accept = async (kind: string, url: URL, body: unknown) =>
    (
      await call<{ redirect_to: string }>(kind, url, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    ).redirect_to;

  return {
    async getLoginRequest(challenge) {
      const request = await call<{
        skip: boolean;
        subject: string;
        client: { client_id: string; client_name?: string };
      }>('login', admin('login', 'login_challenge', challenge));
      return {
        skip: request.skip,
        subject: request.subject,
        clientId: request.client.client_id,
        // Hydra answers an unnamed client with an empty name.
        clientName: nonEmpty(request.client.client_name) ?? request.client.client_id,
      };
    },

    acceptLogin(challenge, subject) {
      return accept('login', admin('login/accept', 'login_challenge', challenge), {
        subject,
        ...REMEMBER,
      });
    },

    async getConsentRequest(challenge) {
      const request = await call<{
        subject: string;
        requested_scope?: string[];
        requested_access_token_audience?: string[];
      }>('consent', admin('consent', 'consent_challenge', challenge));
      return {
        subject: request.subject,
        requestedScope: request.requested_scope ?? [],
        requestedAudience: request.requested_access_token_audience ?? [],
      };
    },

    acceptConsent(challenge, grant) {
      return accept('consent', admin('consent/accept', 'consent_challenge', challenge), {
        grant_scope: grant.scope,
        grant_access_token_audience: grant.audience,
        session: { id_token: grant.idToken },
        ...REMEMBER,
      });
    },

    async getLogoutRequest(challenge) {
      const request = await call<{ subject?: string; request_url?: string }>(
        'logout',
        admin('logout', 'logout_challenge', challenge),
      );
      // No Hydra session (signed out elsewhere already) comes as an empty subject.
      return { subject: nonEmpty(request.subject), requestUrl: request.request_url ?? '' };
    },

    acceptLogout(challenge) {
      return accept('logout', admin('logout/accept', 'logout_challenge', challenge), {});
    },

    logoutUrl(params = {}) {
      const url = new URL('/oauth2/sessions/logout', hydraPublicUrl);
      for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
      return String(url);
    },
  };
}

/** Registers the services that sign in through Hydra (`bun run services:register`). */
interface ServiceRegistry {
  /** Whether Hydra answers yet (it may still be starting). */
  ready(): Promise<boolean>;
  /** Creates or updates the service's OAuth client, and says which. */
  register(service: ServiceRegistration): Promise<'created' | 'updated'>;
}

export function createHydraServiceRegistry(
  config: Pick<ServerConfig, 'hydraAdminUrl'>,
): ServiceRegistry | null {
  const { hydraAdminUrl } = config;
  if (hydraAdminUrl === undefined) return null;

  const clientUrl = (id?: string) =>
    new URL(id === undefined ? '/admin/clients' : `/admin/clients/${id}`, hydraAdminUrl);

  return {
    async ready() {
      try {
        return (await fetch(new URL('/health/ready', hydraAdminUrl))).ok;
      } catch {
        return false;
      }
    },

    async register(service) {
      const existing = await fetch(clientUrl(service.id), {
        headers: { accept: 'application/json' },
      });
      if (!existing.ok && existing.status !== 404) {
        throw new Error(`Hydra client lookup failed for ${service.id}: HTTP ${existing.status}`);
      }
      const created = existing.status === 404;
      const response = await fetch(created ? clientUrl() : clientUrl(service.id), {
        method: created ? 'POST' : 'PUT',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: service.id,
          client_name: service.name,
          client_secret: service.secret,
          grant_types: ['authorization_code'],
          response_types: ['code'],
          scope: 'openid profile',
          redirect_uris: service.redirectUris,
          token_endpoint_auth_method: 'client_secret_basic',
          frontchannel_logout_uri: service.frontchannelLogoutUri,
          frontchannel_logout_session_required: true,
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Hydra rejected ${service.id}: HTTP ${response.status} ${await response.text()}`,
        );
      }
      return created ? 'created' : 'updated';
    },
  };
}
