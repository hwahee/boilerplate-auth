/**
 * Completing the OIDC flows Hydra hands to this app — pure of HTTP concerns.
 *
 * Hydra asks three questions, each carrying a one-time challenge: who is
 * signing in (login), may the service know them (consent), and sign them out
 * (logout). This service answers with members from this app's database; the
 * pages (/login, /sign-up, /logout) only collect what a member types.
 */
import type { LoginResumption, LogoutRequestInfo } from '@shared/domain/user';

import type { HydraClient } from '../identity/hydra';
import { NotFoundError } from '../lib/errors';
import type { MembershipRepository, UserRepository } from '../repositories/types';

interface IdentityServiceDeps {
  /** `null` when no Hydra is configured: the flows below then answer 404. */
  hydra: HydraClient | null;
  users: UserRepository;
  memberships: MembershipRepository;
}

/**
 * Query parameter a sign-out carries through Hydra when the member already
 * confirmed it on this app's page, so the logout page doesn't ask twice.
 * Hydra ignores parameters it doesn't know and hands back the URL as is.
 */
const CONFIRMED_PARAM = 'confirmed';

export class IdentityService {
  constructor(private readonly deps: IdentityServiceDeps) {}

  private hydra(): HydraClient {
    if (!this.deps.hydra) throw new NotFoundError('identity provider', 'hydra');
    return this.deps.hydra;
  }

  /**
   * A service sent someone to sign in. When Hydra already remembers them, or
   * they are signed in to this app, they go straight back — no page.
   * Otherwise the page asks, and tells them which service they are going to.
   */
  async resumeLogin(challenge: string, signedInUserId?: string): Promise<LoginResumption> {
    const request = await this.hydra().getLoginRequest(challenge);
    if (request.skip) {
      return { redirectTo: await this.finishLogin(challenge, request.clientId, request.subject) };
    }
    if (signedInUserId !== undefined && (await this.deps.users.findById(signedInUserId))) {
      return { redirectTo: await this.finishLogin(challenge, request.clientId, signedInUserId) };
    }
    return { redirectTo: null, service: { id: request.clientId, name: request.clientName } };
  }

  /** The member signed in (or up) on the page: hand them back to the service. */
  async completeLogin(challenge: string, userId: string): Promise<string> {
    const request = await this.hydra().getLoginRequest(challenge);
    return this.finishLogin(challenge, request.clientId, userId);
  }

  /** First sign-in to a service is joining it (one person, many services). */
  private async finishLogin(challenge: string, service: string, userId: string): Promise<string> {
    await this.deps.memberships.ensure(userId, service);
    return this.hydra().acceptLogin(challenge, userId);
  }

  /**
   * No consent screen: the services are our own, and may know who signed in.
   * The nickname rides in the id_token as the standard `name` claim.
   */
  async consent(challenge: string): Promise<string> {
    const request = await this.hydra().getConsentRequest(challenge);
    const user = await this.deps.users.findById(request.subject);
    return this.hydra().acceptConsent(challenge, {
      scope: request.requestedScope,
      audience: request.requestedAudience,
      idToken: { name: user?.displayName ?? request.subject },
    });
  }

  /** Who is signing out, and whether they already confirmed it here. */
  async logoutRequest(challenge: string): Promise<LogoutRequestInfo> {
    const request = await this.hydra().getLogoutRequest(challenge);
    const user = request.subject ? await this.deps.users.findById(request.subject) : null;
    const requested = new URL(request.requestUrl, 'http://hydra.invalid');
    return {
      displayName: user?.displayName ?? request.subject,
      confirmed: requested.searchParams.get(CONFIRMED_PARAM) === '1',
    };
  }

  /** Ends the Hydra session; Hydra then signs every service out (front-channel). */
  acceptLogout(challenge: string): Promise<string> {
    return this.hydra().acceptLogout(challenge);
  }

  /**
   * Where a sign-out the member confirmed on this app's page goes: through
   * Hydra (so every service signs out too), or — with no Hydra — straight to
   * the signed-out page.
   */
  confirmedLogoutUrl(): string {
    return this.deps.hydra ? this.deps.hydra.logoutUrl({ [CONFIRMED_PARAM]: '1' }) : '/logged-out';
  }
}
