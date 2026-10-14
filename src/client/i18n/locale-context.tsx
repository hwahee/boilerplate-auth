/**
 * Client binding of the shared i18n facade (@shared/i18n).
 * Keeps `<html lang>` in sync so assistive tech announces the right language,
 * and persists the choice. `useI18n().t` is the only way UI code gets text.
 * A service picks the locale with `ui_locales` (@shared/domain/appearance).
 */
import { appearanceFromParams } from '@shared/domain/appearance';
import {
  DEFAULT_LOCALE,
  isLocale,
  translate,
  type Locale,
  type MessageKey,
  type MessageParams,
} from '@shared/i18n';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LOCALE_KEY = 'app.locale';

function initialLocale(): Locale {
  const requested = appearanceFromParams(new URLSearchParams(window.location.search)).locale;
  if (requested) return requested;
  const stored = localStorage.getItem(LOCALE_KEY);
  if (isLocale(stored)) return stored;
  const browser = navigator.language.split('-')[0];
  return isLocale(browser) ? browser : DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t: (key, params) => translate(locale, key, params) }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used within <LocaleProvider>');
  return value;
}
