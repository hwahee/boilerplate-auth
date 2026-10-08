/**
 * /login — sign in with a registered user id alone (development stage; no
 * password, by design — CLAUDE.md). Signing in never creates a member: an
 * unknown id points the visitor to sign-up instead.
 *
 * A service sends visitors here through Hydra with `?login_challenge=`. The
 * page first asks whether it is needed at all — someone already signed in
 * goes straight back — and otherwise signs them in for that service, then
 * returns them to it.
 */
import { loginValidator } from '@shared/domain/user';
import { LogIn } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router';

import { ApiRequestError } from '../api/http';
import { useCaller, useLogin, useResumeLogin } from '../api/queries';
import {
  FlowStatus,
  isExpiredRequest,
  useChallenge,
  withLoginChallenge,
} from '../auth/flow-status';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { TextField } from '../ui/text-field';

export function LoginPage() {
  const { t } = useI18n();
  const caller = useCaller();
  const login = useLogin();
  const resume = useResumeLogin();
  const loginChallenge = useChallenge('login_challenge');

  // The only local state: the uncommitted input (+ its validation error).
  const [userId, setUserId] = useState('');
  const [userIdError, setUserIdError] = useState<string | undefined>(undefined);

  // Ask once per challenge whether a page is needed. A ref, not state: a
  // challenge can be answered only once, and StrictMode runs effects twice.
  const { mutate: resumeLogin } = resume;
  const resumed = useRef<string | null>(null);
  useEffect(() => {
    if (loginChallenge === null || resumed.current === loginChallenge) return;
    resumed.current = loginChallenge;
    resumeLogin(loginChallenge);
  }, [loginChallenge, resumeLogin]);

  // Signed in on their own (no service waiting) — including right after this
  // page's own sign-in — goes home.
  if (loginChallenge === null && caller === 'member') return <Navigate to="/" replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = loginValidator.safeParse({ userId: userId.trim() });
    if (!parsed.ok) {
      setUserIdError(t('auth.userIdInvalid'));
      return;
    }
    setUserIdError(undefined);
    login.mutate({
      userId: parsed.value.userId,
      ...(loginChallenge === null ? {} : { loginChallenge }),
    });
  };

  const expired = isExpiredRequest(resume.error) || isExpiredRequest(login.error);
  const serverError =
    login.error instanceof ApiRequestError && !expired
      ? login.error.code === 'NOT_FOUND'
        ? t('auth.login.notRegistered')
        : login.error.message
      : undefined;
  // About to leave for the service: Hydra already knew them, or they just signed in.
  const leaving =
    loginChallenge !== null &&
    (resume.isPending ||
      (resume.data !== undefined && resume.data.redirectTo !== null) ||
      login.isSuccess);
  const service = resume.data?.redirectTo === null ? resume.data.service : null;

  let body: ReactNode;
  if (caller === 'anyone') {
    body = (
      <Alert tone="info" testId={TESTID.login.disabled}>
        {t('auth.disabled')}
      </Alert>
    );
  } else if (expired) {
    body = (
      <Alert tone="error" testId={TESTID.login.expired}>
        {t('auth.requestExpired')}
      </Alert>
    );
  } else if (leaving) {
    body = <FlowStatus text={t('auth.returning')} testId={TESTID.login.returning} />;
  } else if (loginChallenge !== null && !service) {
    // The resume answer hasn't come in yet (or failed for another reason).
    body = resume.error ? (
      <Alert tone="error">
        {resume.error instanceof ApiRequestError ? resume.error.message : null}
      </Alert>
    ) : null;
  } else {
    body = (
      <>
        <p className="muted">
          {service
            ? t('auth.login.forService', { service: service.name })
            : t('auth.login.description')}
        </p>
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
          <Link
            to={withLoginChallenge('/sign-up', loginChallenge)}
            data-testid={TESTID.login.signUpLink}
          >
            {t('auth.signUp')}
          </Link>
        </p>
      </>
    );
  }

  return (
    <section className="auth-page" data-testid={TESTID.login.page} aria-labelledby="login-heading">
      <h2 id="login-heading">{t('auth.signIn')}</h2>
      {body}
    </section>
  );
}
