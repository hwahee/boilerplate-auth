/**
 * /logged-out — where every sign-out ends (Hydra's post-logout page, and the
 * end of a sign-out with no Hydra configured). Arriving here also drops this
 * app's own session, which covers a visitor signed in here but unknown to
 * Hydra: Hydra then skips the logout page and sends them straight here.
 */
import { useEffect, useRef } from 'react';

import { useLogout } from '../api/queries';
import { AuthCard } from '../auth/auth-card';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';

export function LoggedOutPage() {
  const { t } = useI18n();
  const { mutate: signOutHere } = useLogout();

  // Once (a ref: StrictMode runs effects twice).
  const cleared = useRef(false);
  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    signOutHere(undefined);
  }, [signOutHere]);

  return (
    <AuthCard
      title={t('auth.signOut')}
      headingId="logged-out-heading"
      testId={TESTID.loggedOut.page}
    >
      <Alert tone="success" testId={TESTID.loggedOut.done}>
        {t('auth.logout.done')}
      </Alert>
      <div className="auth-page__actions">
        <Button to="/login" testId={TESTID.loggedOut.loginLink}>
          {t('auth.signIn')}
        </Button>
        <Button to="/" variant="ghost" testId={TESTID.loggedOut.homeLink}>
          {t('auth.goHome')}
        </Button>
      </div>
    </AuthCard>
  );
}
