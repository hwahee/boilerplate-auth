/**
 * Header account controls. They only navigate: signing in, signing up and
 * signing out each happen on their own page (/login, /sign-up, /logout).
 * Renders nothing while `me` is loading or when the server runs without
 * sign-in (`AUTH_DRIVER=none` answers 404).
 */
import { LogIn, LogOut, UserRound } from 'lucide-react';

import { useMe } from '../api/queries';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Button } from '../ui/button';

export function AccountControls() {
  const { t } = useI18n();
  const me = useMe();

  if (!me.isSuccess) return null;

  if (me.data) {
    return (
      <div className="account-controls">
        <span className="account-controls__user muted" data-testid={TESTID.app.account.user}>
          <UserRound aria-hidden size="1em" />
          {t('auth.signedInAs', { name: me.data.displayName })}
        </span>
        <Button to="/logout" variant="ghost" testId={TESTID.app.account.signOut}>
          <LogOut aria-hidden size="1em" />
          {t('auth.signOut')}
        </Button>
      </div>
    );
  }

  return (
    <div className="account-controls">
      <Button to="/login" variant="secondary" testId={TESTID.app.account.signIn}>
        <LogIn aria-hidden size="1em" />
        {t('auth.signIn')}
      </Button>
      <Button to="/sign-up" testId={TESTID.app.account.signUp}>
        {t('auth.signUp')}
      </Button>
    </div>
  );
}
