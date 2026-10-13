/**
 * Header sign-in controls: a user-id field while signed out, the user and a
 * sign-out button while signed in. Renders nothing while `me` is loading or
 * when the server runs without sign-in (`AUTH_DRIVER=none` answers 404).
 */
import { devLoginValidator } from '@shared/domain/user';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { ApiRequestError } from '../api/http';
import { useDevLogin, useLogout, useMe } from '../api/queries';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Button } from '../ui/button';
import { TextField } from '../ui/text-field';

export function AccountControls() {
  const { t } = useI18n();
  const me = useMe();
  const devLogin = useDevLogin();
  const logout = useLogout();

  // The only local state: the uncommitted user-id input (+ its validation error).
  const [userId, setUserId] = useState('');
  const [userIdError, setUserIdError] = useState<string | undefined>(undefined);

  if (!me.isSuccess) return null;

  if (me.data) {
    return (
      <div className="account-controls">
        <span className="account-controls__user muted" data-testid={TESTID.app.account.user}>
          <UserRound aria-hidden size="1em" />
          {t('auth.signedInAs', { name: me.data.displayName })}
        </span>
        <Button
          variant="ghost"
          loading={logout.isPending}
          onClick={() => logout.mutate()}
          testId={TESTID.app.account.signOut}
        >
          <LogOut aria-hidden size="1em" />
          {t('auth.signOut')}
        </Button>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = devLoginValidator.safeParse({ userId: userId.trim() });
    if (!parsed.ok) {
      setUserIdError(t('auth.userIdInvalid'));
      return;
    }
    setUserIdError(undefined);
    devLogin.mutate(parsed.value.userId, { onSuccess: () => setUserId('') });
  };

  const serverError =
    devLogin.error instanceof ApiRequestError ? devLogin.error.message : undefined;

  return (
    <form
      className="account-controls"
      onSubmit={submit}
      aria-label={t('auth.signIn')}
      data-testid={TESTID.app.account.form}
    >
      <TextField
        label={t('auth.userId')}
        hideLabel
        placeholder={t('auth.userIdPlaceholder')}
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
        error={userIdError ?? serverError}
        maxLength={50}
        autoComplete="username"
        testId={TESTID.app.account.userIdInput}
      />
      <Button
        type="submit"
        variant="secondary"
        loading={devLogin.isPending}
        testId={TESTID.app.account.signIn}
      >
        <LogIn aria-hidden size="1em" />
        {t('auth.signIn')}
      </Button>
    </form>
  );
}
