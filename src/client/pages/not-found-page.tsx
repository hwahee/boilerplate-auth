import { AuthCard } from '../auth/auth-card';
import { useI18n } from '../i18n/locale-context';
import { TESTID } from '../testing/testids';
import { Button } from '../ui/button';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <AuthCard title={t('notFound.title')} headingId="nf-heading" testId={TESTID.notFound.page}>
      <div className="auth-page__actions">
        <Button to="/" variant="secondary" testId={TESTID.notFound.homeLink}>
          {t('notFound.goHome')}
        </Button>
      </div>
    </AuthCard>
  );
}
