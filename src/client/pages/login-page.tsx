/**
 * /login — sign in with a registered user id alone (development stage; no
 * password, by design — CLAUDE.md). Signing in never creates a member: an
 * unknown id points the visitor to sign-up instead.
 */
import { loginValidator } from '@shared/domain/user';
import { LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';

import { ApiRequestError } from '../api/http';
import { useCaller, useLogin } from '../api/queries';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { TextField } from '../ui/text-field';

export function LoginPage() {
  const { t } = useI18n();
  const caller = useCaller();
  const login = useLogin();

  // The only local state: the uncommitted input (+ its validation error).
  const [userId, setUserId] = useState('');
  const [userIdError, setUserIdError] = useState<string | undefined>(undefined);

  // Signed in — including right after this page's own sign-in — goes home.
  if (caller === 'member') return <Navigate to="/" replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = loginValidator.safeParse({ userId: userId.trim() });
    if (!parsed.ok) {
      setUserIdError(t('auth.userIdInvalid'));
      return;
    }
    setUserIdError(undefined);
    login.mutate(parsed.value.userId);
  };

  const serverError =
    login.error instanceof ApiRequestError
      ? login.error.code === 'NOT_FOUND'
        ? t('auth.login.notRegistered')
        : login.error.message
      : undefined;

  return (
    <section className="auth-page" data-testid={TESTID.login.page} aria-labelledby="login-heading">
      <h2 id="login-heading">{t('auth.signIn')}</h2>
      {caller === 'anyone' ? (
        <Alert tone="info" testId={TESTID.login.disabled}>
          {t('auth.disabled')}
        </Alert>
      ) : (
        <>
          <p className="muted">{t('auth.login.description')}</p>
          <form
            className="auth-form"
            onSubmit={submit}
            aria-labelledby="login-heading"
            data-testid={TESTID.login.form}
          >
            <TextField
              label={t('auth.userId')}
              placeholder={t('auth.userIdPlaceholder')}
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
                setUserIdError(undefined);
                if (login.isError) login.reset();
              }}
              error={userIdError ?? serverError}
              maxLength={50}
              autoComplete="username"
              testId={TESTID.login.userId}
            />
            <Button type="submit" loading={login.isPending} testId={TESTID.login.submit}>
              <LogIn aria-hidden size="1em" />
              {t('auth.signIn')}
            </Button>
          </form>
          <p>
            {t('auth.login.noAccount')}{' '}
            <Link to="/sign-up" data-testid={TESTID.login.signUpLink}>
              {t('auth.signUp')}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
