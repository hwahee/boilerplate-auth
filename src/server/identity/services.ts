/**
 * The services that sign in through this member server (OIDC clients), as a
 * provider-neutral list — `services/local.json` and its kind, registered with
 * `bun run services:register`.
 *
 * Every service starts from the boilerplate, so its sign-in callback and its
 * front-channel logout sit at the same paths under its origin; a list entry
 * names only the origin.
 */
import { s, toValidator, type Infer } from '@shared/validation';

/** Where a service receives the sign-in result (OIDC redirect URI). */
const CALLBACK_PATH = '/api/auth/callback';
/** Where a service is told the member signed out everywhere (OIDC front-channel logout). */
const FRONTCHANNEL_LOGOUT_PATH = '/api/auth/frontchannel-logout';

export const serviceListValidator = toValidator(
  s.array(
    s.strictObject({
      /** The service name: its subdomain, its OAuth client id, and its memberships key. */
      id: s.string().check(
        s.minLength(1),
        s.maxLength(63),
        s.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
        s.refine((id) => id !== 'auth', { message: '`auth` is the member server itself' }),
      ),
      /** Shown on the sign-in page ("Sign in to continue to {name}"). */
      name: s.string().check(s.minLength(1), s.maxLength(100)),
      secret: s.string().check(s.minLength(16)),
      origin: s.url(),
    }),
  ),
);
type ServiceListEntry = Infer<typeof serviceListValidator>[number];

/** A service as the identity provider needs to know it. */
export interface ServiceRegistration {
  id: string;
  name: string;
  secret: string;
  redirectUris: string[];
  frontchannelLogoutUri: string;
}

export function toRegistration(entry: ServiceListEntry): ServiceRegistration {
  return {
    id: entry.id,
    name: entry.name,
    secret: entry.secret,
    redirectUris: [new URL(CALLBACK_PATH, entry.origin).href],
    frontchannelLogoutUri: new URL(FRONTCHANNEL_LOGOUT_PATH, entry.origin).href,
  };
}
