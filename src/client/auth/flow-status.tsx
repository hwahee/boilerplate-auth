/**
 * Shared bits of the pages a service sends visitors to (login, sign-up,
 * logout): reading the Hydra challenge off the URL, the "working on it" line
 * shown while the browser is about to leave, and telling a member who is
 * unknown apart from a request that expired.
 */
import { useSearchParams } from 'react-router';

import { ApiRequestError } from '../api/http';
import { Spinner } from '../ui/spinner';

/** `login_challenge` / `logout_challenge` from the page URL, or null. */
export function useChallenge(name: 'login_challenge' | 'logout_challenge'): string | null {
  const [searchParams] = useSearchParams();
  return searchParams.get(name);
}

/** `path` keeping the login challenge, so moving between /login and /sign-up keeps the request. */
export function withLoginChallenge(path: string, loginChallenge: string | null): string {
  return loginChallenge === null
    ? path
    : `${path}?login_challenge=${encodeURIComponent(loginChallenge)}`;
}

/** The request a service started is gone (expired or already answered). */
export function isExpiredRequest(error: unknown): boolean {
  if (!(error instanceof ApiRequestError) || error.code !== 'NOT_FOUND') return false;
  const resource = (error.details as { resource?: unknown } | undefined)?.resource;
  return typeof resource === 'string' && resource.endsWith(' request');
}

/** A live "working on it" line while the browser is about to leave the page. */
export function FlowStatus({ text, testId }: { text: string; testId: string }) {
  return (
    <p className="auth-page__status" role="status" data-testid={testId}>
      <Spinner size="sm" />
      {text}
    </p>
  );
}
