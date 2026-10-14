/**
 * i18n facade — locale negotiation and message translation, usable from both
 * the server (localized API error messages via `Accept-Language`) and the
 * client (UI strings via the locale context).
 *
 * The message catalogs live in ./messages. Adding a locale:
 *   1. Create `messages/<locale>.ts` typed as `Record<MessageKey, string>`.
 *   2. Register it in `catalogs` and `SUPPORTED_LOCALES` below.
 */
import { en, type MessageKey } from './messages/en';
import { ko } from './messages/ko';

export type { MessageKey };

const SUPPORTED_LOCALES = ['en', 'ko'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, ko };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Message parameters interpolated into `{placeholder}` tokens. */
export type MessageParams = Readonly<Record<string, string | number>>;

/**
 * Translates `key` for `locale`, falling back to the default locale's text
 * when a key is (unexpectedly) missing at runtime.
 */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const template = catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key];
  if (!params) return template;
  return template.replaceAll(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Picks the best supported locale from an `Accept-Language` header value.
 * Quality factors are respected; unknown languages fall back to the default.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { language: tag.trim().toLowerCase().split('-')[0] ?? '', q: Number.isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);
  for (const { language } of ranked) {
    if (isLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}
