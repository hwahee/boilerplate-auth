/**
 * / — the member server's front page: account things only. A guest gets the
 * ways in (sign in, sign up), a member sees who they are and the way out.
 * Like the header controls it only navigates; each step has its own page.
 *
 * The boilerplate's demos (todos + chat, the design-system showcase) are kept
 * in the tree but not routed — see knip.json — so rebasing on the boilerplate
 * stays cheap.
 */
import { LogIn, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

import { useCaller, useMe } from '../api/queries';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';

export function AccountPage() {
  const { t } = useI18n();
  const caller = useCaller();
  const me = useMe();

  let body: ReactNode = null;
  if (caller === 'anyone') {
    body = (
      <Alert tone="info" testId={TESTID.account.disabled}>
        {t('auth.disabled')}
      </Alert>
    );
  } else if (caller === 'guest') {
    body = (
      <>
        <p className="muted">{t('auth.account.guest')}</p>
        <div className="auth-page__actions">
          <Button to="/login" variant="secondary" testId={TESTID.account.signIn}>
            <LogIn aria-hidden size="1em" />
            {t('auth.signIn')}
          </Button>
          <Button to="/sign-up" testId={TESTID.account.signUp}>
            {t('auth.signUp')}
          </Button>
        </div>
      </>
    );
  } else if (caller === 'member' && me.data) {
    body = (
      <>
        <p data-testid={TESTID.account.user}>
          {t('auth.signedInAs', { name: me.data.displayName })}{' '}
          <span className="muted">@{me.data.id}</span>
        </p>
        {me.data.bio === null ? null : <p className="muted">{me.data.bio}</p>}
        <div className="auth-page__actions">
          <Button to="/logout" variant="secondary" testId={TESTID.account.signOut}>
            <LogOut aria-hidden size="1em" />
            {t('auth.signOut')}
          </Button>
        </div>
      </>
    );
  }

  return (
    <section
      className="auth-page"
      data-testid={TESTID.account.page}
      aria-labelledby="account-heading"
    >
      <h2 id="account-heading">{t('auth.account.title')}</h2>
      {body}
    </section>
  );
}
