/**
 * /logged-out — where every sign-out ends (Hydra's post-logout page, and the
 * end of a sign-out with no Hydra configured). Arriving here also drops this
 * app's own session, which covers a visitor signed in here but unknown to
 * Hydra: Hydra then skips the logout page and sends them straight here.
 */
import { useEffect, useRef } from 'react';

import { useLogout } from '../api/queries';
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
    <section
      className="auth-page"
      data-testid={TESTID.loggedOut.page}
      aria-labelledby="logged-out-heading"
    >
      <h2 id="logged-out-heading">{t('auth.signOut')}</h2>
      <Alert tone="success" testId={TESTID.loggedOut.done}>
        {t('auth.logout.done')}
      </Alert>
      <div className="auth-page__actions">
        <Button to="/" variant="secondary" testId={TESTID.loggedOut.homeLink}>
          {t('auth.goHome')}
        </Button>
        <Button to="/login" variant="ghost" testId={TESTID.loggedOut.loginLink}>
          {t('auth.signIn')}
        </Button>
      </div>
    </section>
  );
}
