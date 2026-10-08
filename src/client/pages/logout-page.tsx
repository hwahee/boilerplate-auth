/**
 * /logout — signing out happens here, on its own page, after the member
 * confirms (CLAUDE.md). It always ends every service's sign-in, not just
 * this app's, and always finishes on /logged-out.
 *
 * Two ways in:
 *   - from a service, through Hydra, with `?logout_challenge=` — confirm,
 *     then Hydra signs every service out (front-channel) on the way out;
 *   - straight here — confirm, then go through Hydra the same way, carrying
 *     a marker so its logout request doesn't ask a second time.
 */
import { LogOut } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';

import { ApiRequestError } from '../api/http';
import { useCaller, useLogout, useLogoutRequest, useMe } from '../api/queries';
import { FlowStatus, isExpiredRequest, useChallenge } from '../auth/flow-status';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';

/** Starts a sign-out the member confirmed here (server answers with a redirect). */
const CONFIRMED_LOGOUT_START = '/api/auth/logout/start';

export function LogoutPage() {
  const { t } = useI18n();
  const me = useMe();
  const caller = useCaller();
  const logout = useLogout();
  const logoutChallenge = useChallenge('logout_challenge');
  const request = useLogoutRequest(logoutChallenge);

  // Already confirmed on this page before going through Hydra: finish without
  // asking again. Once per challenge (a ref: StrictMode runs effects twice).
  const { mutate: signOut } = logout;
  const accepted = useRef<string | null>(null);
  const confirmed = request.data?.confirmed === true;
  useEffect(() => {
    if (logoutChallenge === null || !confirmed || accepted.current === logoutChallenge) return;
    accepted.current = logoutChallenge;
    signOut(logoutChallenge);
  }, [logoutChallenge, confirmed, signOut]);

  const confirmText = (name: string | null | undefined) =>
    name ? t('auth.logout.confirm', { name }) : t('auth.logout.confirmUnknown');

  let body: ReactNode;
  if (caller === 'anyone') {
    body = <Alert tone="info">{t('auth.disabled')}</Alert>;
  } else if (isExpiredRequest(request.error) || isExpiredRequest(logout.error)) {
    body = (
      <Alert tone="error" testId={TESTID.logout.expired}>
        {t('auth.requestExpired')}
      </Alert>
    );
  } else if (logoutChallenge !== null) {
    if (confirmed || logout.isPending || logout.isSuccess) {
      body = <FlowStatus text={t('auth.logout.signingOut')} testId={TESTID.logout.signingOut} />;
    } else if (request.data) {
      body = (
        <>
          <p>{confirmText(request.data.displayName)}</p>
          <div className="auth-page__actions">
            <Button
              loading={logout.isPending}
              onClick={() => signOut(logoutChallenge)}
              testId={TESTID.logout.confirm}
            >
              <LogOut aria-hidden size="1em" />
              {t('auth.signOut')}
            </Button>
            <Button to="/" variant="ghost" testId={TESTID.logout.cancel}>
              {t('common.cancel')}
            </Button>
          </div>
        </>
      );
    } else if (request.error) {
      body = (
        <Alert tone="error">
          {request.error instanceof ApiRequestError ? request.error.message : null}
        </Alert>
      );
    }
  } else if (me.data) {
    body = (
      <>
        <p>{confirmText(me.data.displayName)}</p>
        <div className="auth-page__actions">
          {/* Signing out is an action, even though it leaves the page. */}
          <Button
            onClick={() => window.location.assign(CONFIRMED_LOGOUT_START)}
            testId={TESTID.logout.confirm}
          >
            <LogOut aria-hidden size="1em" />
            {t('auth.signOut')}
          </Button>
          <Button to="/" variant="ghost" testId={TESTID.logout.cancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </>
    );
  } else if (caller === 'guest') {
    body = (
      <p data-testid={TESTID.logout.notSignedIn}>
        {t('auth.logout.notSignedIn')}{' '}
        <Link to="/login" data-testid={TESTID.logout.loginLink}>
          {t('auth.signIn')}
        </Link>
      </p>
    );
  }

  return (
    <section
      className="auth-page"
      data-testid={TESTID.logout.page}
      aria-labelledby="logout-heading"
    >
      <h2 id="logout-heading">{t('auth.signOut')}</h2>
      {body}
    </section>
  );
}
