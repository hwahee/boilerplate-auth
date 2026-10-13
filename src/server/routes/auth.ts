/**
 * /api/auth — sign-in, the current user, sign-out.
 *
 * Mounted only with AUTH_DRIVER=dev (see app.ts); with `none` these paths
 * answer the JSON 404 of the /api/* fallback.
 */
import { devLoginValidator } from '@shared/domain/user';

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
    '/api/auth/dev-login': apiRoute<'/api/auth/dev-login'>(
      {
        /** POST /api/auth/dev-login {userId} → User (created on first sign-in) + session cookie */
        POST: async (req) => {
          const { userId } = devLoginValidator.parse(await req.json());
          const user = await container.authService().devLogin(userId);
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
