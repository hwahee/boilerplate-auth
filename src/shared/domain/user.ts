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
  }),
);
export type SignUpInput = Infer<typeof signUpValidator>;

/** Body of `POST /api/auth/login` — the id alone (development stage). */
export const loginValidator = toValidator(s.strictObject({ userId: userIdSchema }));
export type LoginInput = Infer<typeof loginValidator>;
