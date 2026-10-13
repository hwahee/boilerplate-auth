/**
 * User domain — the shared contract between server and client.
 *
 * There is no password anywhere in this contract, by design (CLAUDE.md).
 */
import type { UtcIsoString } from '../time';
import { s, toValidator, type Infer } from '../validation';

export interface User {
  /** With AUTH_DRIVER=dev, the handle typed to sign in. */
  id: string;
  displayName: string;
  /** UTC — converted to the viewer's time zone only at the client boundary. */
  createdAt: UtcIsoString;
}

/**
 * Body of `POST /api/auth/dev-login`. A user id is 1–50 characters of
 * lowercase letters, digits, `_` and `-` (so it reads the same in a URL,
 * a cookie and a log line). Strict: unknown fields are rejected.
 */
export const devLoginValidator = toValidator(
  s.strictObject({
    userId: s.string().check(s.minLength(1), s.maxLength(50), s.regex(/^[a-z0-9_-]+$/)),
  }),
);
export type DevLoginInput = Infer<typeof devLoginValidator>;
