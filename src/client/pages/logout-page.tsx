/**
 * /logout — signing out happens here, on its own page, after the member
 * confirms. The page then stays to say it is done.
 */
import { LogOut } from 'lucide-react';
import { Link } from 'react-router';

import { useCaller, useLogout, useMe } from '../api/queries';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';

export function LogoutPage() {
  const { t } = useI18n();
  const me = useMe();
  const caller = useCaller();
  const logout = useLogout();

  return (
    <section
      className="auth-page"
      data-testid={TESTID.logout.page}
      aria-labelledby="logout-heading"
    >
      <h2 id="logout-heading">{t('auth.signOut')}</h2>
      {caller === 'anyone' ? (
        <Alert tone="info">{t('auth.disabled')}</Alert>
      ) : logout.isSuccess ? (
        // Checked before `me`: right after signing out, `me` is already null.
        <>
          <Alert tone="success" testId={TESTID.logout.done}>
            {t('auth.logout.done')}
          </Alert>
          <div className="auth-page__actions">
            <Button to="/" variant="secondary" testId={TESTID.logout.homeLink}>
              {t('auth.goHome')}
            </Button>
            <Button to="/login" variant="ghost" testId={TESTID.logout.loginLink}>
              {t('auth.signIn')}
            </Button>
          </div>
        </>
      ) : me.data ? (
        <>
          <p>{t('auth.logout.confirm', { name: me.data.displayName })}</p>
          <div className="auth-page__actions">
            <Button
              loading={logout.isPending}
              onClick={() => logout.mutate()}
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
      ) : caller === 'guest' ? (
        <p data-testid={TESTID.logout.notSignedIn}>
          {t('auth.logout.notSignedIn')}{' '}
          <Link to="/login" data-testid={TESTID.logout.loginLink}>
            {t('auth.signIn')}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
