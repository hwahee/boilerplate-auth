/**
 * User domain — the shared contract between server and client.
 *
 * There is no password anywhere in this contract, by design (CLAUDE.md):
 * a member signs up with an id, a nickname and an optional bio, and signs in
 * with the id alone (development stage).
 */
import type { UtcIsoString } from '../time';
import { s, toValidator, type Infer } from '../validation';

export interface User {
  /** The handle typed to sign in. */
  id: string;
  /** The nickname others see. */
  displayName: string;
  /** Self-introduction; `null` when the member left it out. */
  bio: string | null;
  /** UTC — converted to the viewer's time zone only at the client boundary. */
  createdAt: UtcIsoString;
}

/**
 * A user id is 1–50 characters of lowercase letters, digits, `_` and `-`
 * (so it reads the same in a URL, a cookie and a log line).
 */
const userIdSchema = s.string().check(s.minLength(1), s.maxLength(50), s.regex(/^[a-z0-9_-]+$/));

/**
 * A Hydra challenge: the opaque, one-time handle of a login or logout a
 * service started (`login_challenge` / `logout_challenge` on the page URL).
 */
const challengeSchema = s.string().check(s.minLength(1), s.maxLength(4096));

/** Longest nickname; the database allows more, so this is the binding limit. */
export const NICKNAME_MAX_LENGTH = 30;
/** Longest bio; the database enforces the same limit. */
export const BIO_MAX_LENGTH = 500;

/**
 * Body of `POST /api/auth/sign-up`. The nickname must not be blank; the bio
 * is optional, and a blank one counts as left out. Strict: unknown fields are
 * rejected.
 */
export const signUpValidator = toValidator(
  s.strictObject({
    userId: userIdSchema,
    displayName: s.string().check(
      s.minLength(1),
      s.maxLength(NICKNAME_MAX_LENGTH),
      s.refine((value) => value.trim().length > 0, { message: 'Nickname must not be blank' }),
    ),
    bio: s.optional(s.string().check(s.maxLength(BIO_MAX_LENGTH))),
    /** Present when a service sent the visitor here to sign in. */
    loginChallenge: s.optional(challengeSchema),
  }),
);
export type SignUpInput = Infer<typeof signUpValidator>;

/** Body of `POST /api/auth/login` — the id alone (development stage). */
export const loginValidator = toValidator(
  s.strictObject({ userId: userIdSchema, loginChallenge: s.optional(challengeSchema) }),
);
export type LoginInput = Infer<typeof loginValidator>;

/** Body of `POST /api/auth/login/resume` — a service sent someone to sign in. */
export const loginResumeValidator = toValidator(
  s.strictObject({ loginChallenge: challengeSchema }),
);

/** Body of `POST /api/auth/logout` — the challenge when a service asked for it. */
export const logoutValidator = toValidator(
  s.strictObject({ logoutChallenge: s.optional(challengeSchema) }),
);

/**
 * What sign-up and sign-in answer: the member, and — when a service sent
 * them here — where to send the browser to finish (`null` otherwise).
 */
export interface SignInResult {
  user: User;
  redirectTo: string | null;
}

/** What `POST /api/auth/login/resume` answers. */
export type LoginResumption =
  { redirectTo: string } | { redirectTo: null; service: { id: string; name: string } };

/** What `GET /api/auth/logout-request` answers. */
export interface LogoutRequestInfo {
  displayName: string | null;
  /** The member already confirmed signing out on this app's page. */
  confirmed: boolean;
}
