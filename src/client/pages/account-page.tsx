/**
 * / — the member server's front page: account things only. A guest gets the
 * ways in (sign in, sign up), a member sees who they are and the way out.
 * It only navigates; each step has its own page.
 *
 * The boilerplate's demos (todos + chat, the design-system showcase) are kept
 * in the tree but not routed — see knip.json — so rebasing on the boilerplate
 * stays cheap.
 */
import { LogIn, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

import { useCaller, useMe } from '../api/queries';
import { AuthCard, MemberIdentity } from '../auth/auth-card';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';

export function AccountPage() {
  const { t } = useI18n();
  const caller = useCaller();
  const me = useMe();

  let subtitle: string | undefined;
  let body: ReactNode = null;
  if (caller === 'anyone') {
    body = (
      <Alert tone="info" testId={TESTID.account.disabled}>
        {t('auth.disabled')}
      </Alert>
    );
  } else if (caller === 'guest') {
    subtitle = t('auth.account.guest');
    body = (
      <div className="auth-page__actions">
        <Button to="/login" testId={TESTID.account.signIn}>
          <LogIn aria-hidden size="1em" />
          {t('auth.signIn')}
        </Button>
        <Button to="/sign-up" variant="secondary" testId={TESTID.account.signUp}>
          {t('auth.signUp')}
        </Button>
      </div>
    );
  } else if (caller === 'member' && me.data) {
    body = (
      <>
        <MemberIdentity
          name={me.data.displayName}
          userId={me.data.id}
          testId={TESTID.account.user}
        />
        {me.data.bio === null ? null : <p className="auth-page__bio">{me.data.bio}</p>}
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
    <AuthCard
      title={t('auth.account.title')}
      headingId="account-heading"
      subtitle={subtitle}
      testId={TESTID.account.page}
    >
      {body}
    </AuthCard>
  );
}
