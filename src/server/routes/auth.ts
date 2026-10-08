/**
 * /api/auth — sign-up, sign-in, the current user, sign-out, and the answers
 * to the login / consent / logout requests Hydra hands this app.
 *
 * Mounted only with AUTH_DRIVER=dev (see app.ts); with `none` these paths
 * answer the JSON 404 of the /api/* fallback. Without a configured Hydra the
 * Hydra-only paths answer 404 too, and the pages work on their own.
 */
import {
  loginResumeValidator,
  loginValidator,
  logoutValidator,
  signUpValidator,
  type SignInResult,
  type User,
} from '@shared/domain/user';

import { clearSessionCookie, setSessionCookie } from '../auth/session';
import type { Container } from '../container';
import { apiRoute, json, type HttpDeps } from '../http/respond';
import { ValidationError } from '@shared/validation';

/** Plain-path routes (no `:params`), so their requests type as `BunRequest<string>`. */
type AuthRoutes = Record<
  string,
  Record<string, (req: Bun.BunRequest<string>) => Promise<Response>>
>;

/** A browser redirect. Built by hand: `Response.redirect` freezes its headers. */
function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

/** A required query parameter, as a 400 when missing. */
function queryParam(req: Request, name: string): string {
  const value = new URL(req.url).searchParams.get(name);
  if (!value) {
    throw new ValidationError([{ path: name, message: 'Required', code: 'required' }]);
  }
  return value;
}

/** A JSON body that may also be absent (an empty POST reads as `{}`). */
async function optionalJson(req: Request): Promise<unknown> {
  const text = await req.text();
  return text.trim() === '' ? {} : (JSON.parse(text) as unknown);
}

export function authRoutes(container: Container, deps: HttpDeps): AuthRoutes {
  /** Signs `user` in here and, when a service is waiting, hands them back to it. */
  const signIn = async (
    req: Bun.BunRequest<string>,
    user: User,
    loginChallenge: string | undefined,
  ): Promise<SignInResult> => {
    setSessionCookie(req, user.id);
    const redirectTo =
      loginChallenge === undefined
        ? null
        : await container.identityService().completeLogin(loginChallenge, user.id);
    return { user, redirectTo };
  };

  return {
    '/api/auth/sign-up': apiRoute<'/api/auth/sign-up'>(
      {
        /** POST {userId, displayName, bio?, loginChallenge?} → 201 {user, redirectTo} | 409 */
        POST: async (req) => {
          const { loginChallenge, ...input } = signUpValidator.parse(await req.json());
          const user = await container.authService().signUp(input);
          return json(await signIn(req, user, loginChallenge), { status: 201 });
        },
      },
      deps,
    ),

    '/api/auth/login': apiRoute<'/api/auth/login'>(
      {
        /** POST {userId, loginChallenge?} → {user, redirectTo} | 404 when not signed up */
        POST: async (req) => {
          const { userId, loginChallenge } = loginValidator.parse(await req.json());
          const user = await container.authService().login(userId);
          return json(await signIn(req, user, loginChallenge));
        },
      },
      deps,
    ),

    '/api/auth/login/resume': apiRoute<'/api/auth/login/resume'>(
      {
        /**
         * POST {loginChallenge} → {redirectTo} when no page is needed (Hydra
         * remembers them, or they are signed in here), else {redirectTo: null,
         * service} for the page to show. 404 when the request expired.
         */
        POST: async (req, { caller }) => {
          const { loginChallenge } = loginResumeValidator.parse(await req.json());
          return json(
            await container
              .identityService()
              .resumeLogin(loginChallenge, caller.kind === 'member' ? caller.userId : undefined),
          );
        },
      },
      deps,
    ),

    '/api/auth/consent': apiRoute<'/api/auth/consent'>(
      {
        /** GET ?consent_challenge= — Hydra sends the browser here; answered without a screen. */
        GET: async (req) =>
          redirect(await container.identityService().consent(queryParam(req, 'consent_challenge'))),
      },
      deps,
    ),

    '/api/auth/logout-request': apiRoute<'/api/auth/logout-request'>(
      {
        /** GET ?logout_challenge= → {displayName, confirmed} for the logout page */
        GET: async (req) =>
          json(
            await container.identityService().logoutRequest(queryParam(req, 'logout_challenge')),
          ),
      },
      deps,
    ),

    '/api/auth/logout': apiRoute<'/api/auth/logout'>(
      {
        /**
         * POST {logoutChallenge?} — clears this app's session cookie. With a
         * challenge, also ends the Hydra session (every service signs out) and
         * answers {redirectTo}; without one, 204.
         */
        POST: async (req) => {
          const { logoutChallenge } = logoutValidator.parse(await optionalJson(req));
          clearSessionCookie(req);
          if (logoutChallenge === undefined) return new Response(null, { status: 204 });
          return json({
            redirectTo: await container.identityService().acceptLogout(logoutChallenge),
          });
        },
      },
      deps,
    ),

    '/api/auth/logout/start': apiRoute<'/api/auth/logout/start'>(
      {
        /** GET — a sign-out the member confirmed here: through Hydra, or straight to /logged-out. */
        GET: () => Promise.resolve(redirect(container.identityService().confirmedLogoutUrl())),
      },
      deps,
    ),

    '/api/auth/me': apiRoute<'/api/auth/me'>(
      {
        /** GET /api/auth/me → User | 401 */
        GET: async (_req, { caller }) =>
          json(
            await container
              .authService()
              .currentUser(caller.kind === 'member' ? caller.userId : undefined),
          ),
      },
      deps,
    ),
  };
}
