/**
 * App shell: providers (query cache, theme, locale, overlays), router, and the layout.
 * No header and no switches: every page is one card in the middle of the
 * screen (auth/auth-card.tsx), and the service that sends a visitor here picks
 * the theme, design and language (@shared/domain/appearance).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';

import { isRetryableError } from './api/http';
import { LocaleProvider } from './i18n/locale-context';
import { AccountPage } from './pages/account-page';
import { LoggedOutPage } from './pages/logged-out-page';
import { LoginPage } from './pages/login-page';
import { LogoutPage } from './pages/logout-page';
import { NotFoundPage } from './pages/not-found-page';
import { SignUpPage } from './pages/sign-up-page';
import { ThemeProvider } from './theme/theme-context';
import { OverlayProvider } from './ui/overlay';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // One retry, and only when it could change the answer (never on a 4xx).
      retry: (failureCount, error) => failureCount < 1 && isRetryableError(error),
    },
  },
});

function Shell() {
  return (
    <main id="main" className="auth-shell">
      <Routes>
        <Route path="/" element={<AccountPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/logged-out" element={<LoggedOutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          <BrowserRouter>
            {/* Inside every provider and the router: overlays opened through
                useOverlay() render here, so they see exactly these contexts
                and nothing from the subtree that opened them. */}
            <OverlayProvider>
              <Shell />
            </OverlayProvider>
          </BrowserRouter>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
