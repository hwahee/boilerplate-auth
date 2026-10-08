/**
 * /api/auth — sign-up, sign-in, the current user, sign-out.
 *
 * Mounted only with AUTH_DRIVER=dev (see app.ts); with `none` these paths
 * answer the JSON 404 of the /api/* fallback.
 */
import { loginValidator, signUpValidator } from '@shared/domain/user';

import { clearSessionCookie, setSessionCookie } from '../auth/session';
import type { Container } from '../container';
import { apiRoute, json, type HttpDeps } from '../http/respond';

/** Plain-path routes (no `:params`), so their requests type as `BunRequest<string>`. */
type AuthRoutes = Record<
  string,
  Record<string, (req: Bun.BunRequest<string>) => Promise<Response>>
>;

export function authRoutes(container: Container, deps: HttpDeps): AuthRoutes {
  return {
    '/api/auth/sign-up': apiRoute<'/api/auth/sign-up'>(
      {
        /** POST /api/auth/sign-up {userId, displayName, bio?} → 201 User + session cookie | 409 */
        POST: async (req) => {
          const input = signUpValidator.parse(await req.json());
          const user = await container.authService().signUp(input);
          setSessionCookie(req, user.id);
          return json(user, { status: 201 });
        },
      },
      deps,
    ),

    '/api/auth/login': apiRoute<'/api/auth/login'>(
      {
        /** POST /api/auth/login {userId} → User + session cookie | 404 when not signed up */
        POST: async (req) => {
          const { userId } = loginValidator.parse(await req.json());
          const user = await container.authService().login(userId);
          setSessionCookie(req, user.id);
          return json(user);
        },
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

    '/api/auth/logout': apiRoute<'/api/auth/logout'>(
      {
        /** POST /api/auth/logout → 204, session cookie cleared (also when already signed out) */
        POST: (req) => {
          clearSessionCookie(req);
          return Promise.resolve(new Response(null, { status: 204 }));
        },
      },
      deps,
    ),
  };
}
