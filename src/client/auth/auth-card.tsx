/**
 * The frame every member page shares: one card in the middle of an otherwise
 * empty screen, under the account brand — the page a service sends its
 * visitors to for signing in, like any large service's account page. Nothing
 * else is on screen: the service that sent the visitor picks the look
 * (@shared/domain/appearance), and the visitor goes straight back when done.
 */
import { CircleUserRound, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

import { useI18n } from '../i18n/locale-context';
import { Card } from '../ui/card';

interface AuthCardProps {
  /** The page heading, also the tab title. */
  title: string;
  /** `id` of the heading, for forms labelled by it. */
  headingId: string;
  /** One line under the heading: who it is for, what happens. */
  subtitle?: ReactNode;
  children?: ReactNode;
  /** Under a divider at the bottom: the way to the sibling page ("Not a member yet? Sign up"). */
  footer?: ReactNode;
  testId: string;
}

export function AuthCard({ title, headingId, subtitle, children, footer, testId }: AuthCardProps) {
  const { t } = useI18n();
  return (
    <section className="auth-page" aria-labelledby={headingId} data-testid={testId}>
      <title>{`${title} · ${t('auth.brand')}`}</title>
      <Card>
        <p className="auth-page__brand">
          <ShieldCheck aria-hidden size="1.25em" />
          {t('auth.brand')}
        </p>
        <h1 id={headingId} className="auth-page__title">
          {title}
        </h1>
        {subtitle && <p className="auth-page__subtitle">{subtitle}</p>}
        {children && <div className="auth-page__body">{children}</div>}
        {footer && <p className="auth-page__footer">{footer}</p>}
      </Card>
    </section>
  );
}

/** Who is signed in, as a chip: the nickname, and the id when known. */
export function MemberIdentity({
  name,
  userId,
  testId,
}: {
  name: string;
  userId?: string;
  testId?: string;
}) {
  return (
    <div className="auth-identity" data-testid={testId}>
      <CircleUserRound aria-hidden className="auth-identity__icon" />
      <div>
        <p className="auth-identity__name">{name}</p>
        {userId && <p className="auth-identity__id">@{userId}</p>}
      </div>
    </div>
  );
}
