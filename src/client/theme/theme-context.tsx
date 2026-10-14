/**
 * Theme context — two independent axes, both applied as attributes on <html>
 * and consumed purely by CSS custom properties (src/client/styles/tokens.css):
 *
 *   data-theme:  'light' | 'dark'     — color scheme
 *   data-design: 'a' | 'b' | 'office' | 'kids' — design variant:
 *       A      = aesthetic-first (refined spacing, softer contrast)
 *       B      = visibility-first (larger type, high contrast, bigger targets)
 *       Office = 2000s MS Office (dense, beveled controls, no motion)
 *       Kids  = playground/toy vibe (chunky, rounded, exaggerated motion)
 *
 * Neither has a switch on the member server's pages: the service that sends
 * a visitor here picks them (@shared/domain/appearance) — on the page URL,
 * read once here, or on its Hydra request, applied by useApplyAppearance.
 * Both persist to localStorage for a visit that names none; without either,
 * the theme derives from the OS preference.
 */
import { appearanceFromParams } from '@shared/domain/appearance';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Design = 'a' | 'b' | 'office' | 'kids';

interface ThemeContextValue {
  theme: Theme;
  design: Design;
  setTheme: (theme: Theme) => void;
  setDesign: (design: Design) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'app.theme';
const DESIGN_KEY = 'app.design';

/** What the page URL asks for, read once on load. */
const requested = appearanceFromParams(new URLSearchParams(window.location.search));

function initialTheme(): Theme {
  if (requested.theme) return requested.theme;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialDesign(): Design {
  if (requested.design) return requested.design;
  const stored = localStorage.getItem(DESIGN_KEY);
  return stored === 'b' || stored === 'office' || stored === 'kids' ? stored : 'a';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [design, setDesign] = useState<Design>(initialDesign);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.design = design;
    localStorage.setItem(DESIGN_KEY, design);
  }, [design]);

  return (
    <ThemeContext.Provider value={{ theme, design, setTheme, setDesign }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within <ThemeProvider>');
  return value;
}
