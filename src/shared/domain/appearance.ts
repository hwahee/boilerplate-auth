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
 *   design=standard|contrast|office|kids  (also the old a|b, see below)
 *   ui_locales=ko en   — the OIDC standard parameter; the first one we speak wins
 *
 * Anything missing or unknown is left out, and the page keeps what it had.
 */
import { isLocale, type Locale } from '../i18n';

const THEMES = ['light', 'dark'] as const;
const DESIGNS = ['standard', 'contrast', 'office', 'kids'] as const;

export type Theme = (typeof THEMES)[number];
export type Design = (typeof DESIGNS)[number];

/**
 * What the first two designs were called before they were renamed (A, B).
 * Links from a service that hasn't taken the rename yet, and choices saved in
 * a browser before it, still carry these.
 */
const RENAMED_DESIGNS = new Map<string, Design>([
  ['a', 'standard'],
  ['b', 'contrast'],
]);

export interface Appearance {
  theme?: Theme;
  design?: Design;
  locale?: Locale;
}

function oneOf<T extends string>(options: readonly T[], value: string | null): T | undefined {
  return options.find((option) => option === value);
}

/** The design a stored or passed-along value names, old names included. */
export function designFrom(value: string | null): Design | undefined {
  return oneOf(DESIGNS, value) ?? RENAMED_DESIGNS.get(value ?? '');
}

export function appearanceFromParams(params: URLSearchParams): Appearance {
  const theme = oneOf(THEMES, params.get('theme'));
  const design = designFrom(params.get('design'));
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

/** The query parameters for `appearance`, ready for a URL; nothing for what is unset. */
export function appearanceParams(appearance: Appearance): Record<string, string> {
  return {
    ...(appearance.theme && { theme: appearance.theme }),
    ...(appearance.design && { design: appearance.design }),
    ...(appearance.locale && { ui_locales: appearance.locale }),
  };
}
