/**
 * Applies how a service asked the page to look when the ask arrives with its
 * Hydra request (login resume, logout request) rather than on the page URL.
 */
import type { Appearance } from '@shared/domain/appearance';
import { useEffect } from 'react';

import { useI18n } from '../i18n/locale-context';
import { useTheme } from './theme-context';

export function useApplyAppearance(appearance: Appearance | undefined) {
  const { setTheme, setDesign } = useTheme();
  const { setLocale } = useI18n();

  useEffect(() => {
    if (appearance?.theme) setTheme(appearance.theme);
    if (appearance?.design) setDesign(appearance.design);
    if (appearance?.locale) setLocale(appearance.locale);
  }, [appearance, setTheme, setDesign, setLocale]);
}
