/**
 * Request identity — the one place "who is calling" enters the server, and
 * where what each kind of caller may do is enforced.
 *
 * AUTH_DRIVER decides how a request proves who it is:
 *   - `none` — sign-in does not exist; a session cookie is ignored even if sent.
 *   - `dev`  — the cookie holds the user id itself, unsigned: anyone who knows
 *              an id can sign in as it. That is the accepted premise of the dev
 *              driver (CLAUDE.md), which is why config.ts refuses to boot it
 *              with APP_ENV=production.
 *
 * A later driver (an external login provider) changes what the cookie holds
 * and how it is verified — here. Routes and services only ever read
 * `ctx.caller` (src/server/http/context.ts).
 */
import { UnauthorizedError } from '../lib/errors';
import type { ServerConfig } from '../config';

const SESSION_COOKIE = 'session';

/**
 * Who is calling:
 *   - `member` — signed in.
 *   - `guest`  — sign-in exists but this request is not signed in.
 *   - `anyone` — AUTH_DRIVER=none: sign-in does not exist, so there is no
 *                member/guest split to enforce.
 */
export type Caller = { kind: 'member'; userId: string } | { kind: 'guest' } | { kind: 'anyone' };

export function readCaller(req: Request, config: Pick<ServerConfig, 'authDriver'>): Caller {
  if (config.authDriver === 'none') return { kind: 'anyone' };
  const header = req.headers.get('cookie');
  const userId = header ? new Bun.CookieMap(header).get(SESSION_COOKIE) : null;
  // Empty is what a cleared cookie holds — signed out, not a user named ''.
  // The dev driver trusts the id as-is, just like its sign-in does, so an id
  // with no user row (e.g. after an in-memory restart) still counts as a
  // member here, while `GET /api/auth/me` answers 401 for it.
  return userId ? { kind: 'member', userId } : { kind: 'guest' };
}

/**
 * Guards an action whose result still means something after the visitor
 * leaves (a saved todo, a setting): members only (CLAUDE.md). Actions that
 * only mean something while the visitor is here stay open to guests.
 * Throws UnauthorizedError (→ 401) for a guest.
 */
export function requireMember(caller: Caller): void {
  if (caller.kind === 'guest') throw new UnauthorizedError();
}

/** Signs the response's browser in as `userId` (httpOnly: page scripts never see it). */
export function setSessionCookie(req: Bun.BunRequest, userId: string): void {
  req.cookies.set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: 'lax', path: '/' });
}

export function clearSessionCookie(req: Bun.BunRequest): void {
  req.cookies.delete({ name: SESSION_COOKIE, path: '/' });
}
