/**
 * /sign-up — register with a user id, a nickname and an optional bio. No
 * password, by design (CLAUDE.md). A successful sign-up also signs in — and,
 * when a service sent the visitor (`?login_challenge=`, carried over from
 * /login), returns them to it.
 */
import {
  BIO_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  signUpValidator,
  type SignUpInput,
} from '@shared/domain/user';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';

import { ApiRequestError } from '../api/http';
import { useCaller, useSignUp } from '../api/queries';
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
import { TextArea } from '../ui/text-area';
import { TextField } from '../ui/text-field';

type Field = 'userId' | 'displayName' | 'bio';

const isField = (value: string): value is Field =>
  value === 'userId' || value === 'displayName' || value === 'bio';

export function SignUpPage() {
  const { t } = useI18n();
  const caller = useCaller();
  const signUp = useSignUp();
  const loginChallenge = useChallenge('login_challenge');

  // The only local state: the uncommitted form (+ its validation errors).
  const [values, setValues] = useState<Record<Field, string>>({
    userId: '',
    displayName: '',
    bio: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  // Signed in on their own (no service waiting) — including right after this
  // page's own sign-up — goes home.
  if (loginChallenge === null && caller === 'member') return <Navigate to="/" replace />;

  const fieldMessages: Record<Field, string> = {
    userId: t('auth.userIdInvalid'),
    displayName: t('auth.nicknameInvalid', { max: NICKNAME_MAX_LENGTH }),
    bio: t('auth.bioInvalid', { max: BIO_MAX_LENGTH }),
  };

  const change = (field: Field) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues({ ...values, [field]: event.target.value });
    // Editing a field answers its error; the others keep theirs until submit.
    setErrors({ ...errors, [field]: undefined });
    if (signUp.isError) signUp.reset();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input: SignUpInput = {
      userId: values.userId.trim(),
      displayName: values.displayName,
      ...(values.bio.trim() === '' ? {} : { bio: values.bio }),
      ...(loginChallenge === null ? {} : { loginChallenge }),
    };
    const parsed = signUpValidator.safeParse(input);
    if (!parsed.ok) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.issues) {
        const field = issue.path.split('.')[0] ?? '';
        if (isField(field)) next[field] = fieldMessages[field];
      }
      setErrors(next);
      return;
    }
    setErrors({});
    signUp.mutate(parsed.value);
  };

  const failure = signUp.error instanceof ApiRequestError ? signUp.error : undefined;
  // A taken id belongs to the id field; anything else gets the page-level alert.
  const idTaken = failure?.code === 'CONFLICT';
  const expired = isExpiredRequest(signUp.error);
  // Signed up for a service: the browser is on its way back to it.
  const leaving = loginChallenge !== null && signUp.isSuccess;

  return (
    <section
      className="auth-page"
      data-testid={TESTID.signUp.page}
      aria-labelledby="sign-up-heading"
    >
      <h2 id="sign-up-heading">{t('auth.signUp')}</h2>
      {caller === 'anyone' ? (
        <Alert tone="info" testId={TESTID.signUp.disabled}>
          {t('auth.disabled')}
        </Alert>
      ) : expired ? (
        <Alert tone="error" testId={TESTID.signUp.expired}>
          {t('auth.requestExpired')}
        </Alert>
      ) : leaving ? (
        <FlowStatus text={t('auth.returning')} testId={TESTID.signUp.returning} />
      ) : (
        <>
          <p className="muted">{t('auth.signUp.description')}</p>
          {failure && !idTaken && (
            <Alert tone="error" testId={TESTID.signUp.error}>
              {failure.message}
            </Alert>
          )}
          <form
            className="auth-form"
            onSubmit={submit}
            aria-labelledby="sign-up-heading"
            data-testid={TESTID.signUp.form}
          >
            <TextField
              label={t('auth.userId')}
              placeholder={t('auth.userIdPlaceholder')}
              value={values.userId}
              onChange={change('userId')}
              error={errors.userId ?? (idTaken ? t('auth.signUp.idTaken') : undefined)}
              maxLength={50}
              autoComplete="username"
              testId={TESTID.signUp.userId}
            />
            <TextField
              label={t('auth.nickname')}
              placeholder={t('auth.nicknamePlaceholder')}
              value={values.displayName}
              onChange={change('displayName')}
              error={errors.displayName}
              maxLength={NICKNAME_MAX_LENGTH}
              autoComplete="nickname"
              testId={TESTID.signUp.displayName}
            />
            <TextArea
              label={t('auth.bio')}
              placeholder={t('auth.bioPlaceholder')}
              value={values.bio}
              onChange={change('bio')}
              error={errors.bio}
              hint={t('auth.bioCount', { count: values.bio.length, max: BIO_MAX_LENGTH })}
              maxLength={BIO_MAX_LENGTH}
              testId={TESTID.signUp.bio}
            />
            <Button type="submit" loading={signUp.isPending} testId={TESTID.signUp.submit}>
              {t('auth.signUp')}
            </Button>
          </form>
          <p>
            {t('auth.signUp.haveAccount')}{' '}
            <Link
              to={withLoginChallenge('/login', loginChallenge)}
              data-testid={TESTID.signUp.loginLink}
            >
              {t('auth.signIn')}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
