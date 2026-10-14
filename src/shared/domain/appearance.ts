/**
 * How the member server's pages look — chosen by the service that sends a
 * visitor here, never by a switch on these pages (CLAUDE.md: theme and skin
 * travel as query parameters).
 *
 * A service adds them to the URL it redirects to: this app's page itself, or
 * the authorization / logout request it sends to Hydra, which keeps the URL
 * as requested (OAuth ignores parameters it doesn't know):
 *
 *   theme=light|dark
 *   design=a|b|office|kids
 *   ui_locales=ko en   — the OIDC standard parameter; the first one we speak wins
 *
 * Anything missing or unknown is left out, and the page keeps what it had.
 */
import { isLocale, type Locale } from '../i18n';

const THEMES = ['light', 'dark'] as const;
const DESIGNS = ['a', 'b', 'office', 'kids'] as const;

export interface Appearance {
  theme?: (typeof THEMES)[number];
  design?: (typeof DESIGNS)[number];
  locale?: Locale;
}

function oneOf<T extends string>(options: readonly T[], value: string | null): T | undefined {
  return options.find((option) => option === value);
}

export function appearanceFromParams(params: URLSearchParams): Appearance {
  const theme = oneOf(THEMES, params.get('theme'));
  const design = oneOf(DESIGNS, params.get('design'));
  const locale = (params.get('ui_locales') ?? '')
    .split(' ')
    .map((tag) => tag.split('-')[0]?.toLowerCase())
    .find(isLocale);
  return {
    ...(theme && { theme }),
    ...(design && { design }),
    ...(locale && { locale }),
  };
}
