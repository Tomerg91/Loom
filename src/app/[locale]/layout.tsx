import type { Metadata } from 'next';
import { Assistant, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';

import { EnvironmentCheck } from '@/components/environment-check';
import { AppFooter } from '@/components/layout/app-footer';
import { PerformanceMonitorComponent } from '@/components/monitoring/performance-monitor';
import { Providers } from '@/components/providers/providers';
import { PwaBootstrap } from '@/components/pwa/pwa-bootstrap';
import { SkipLink } from '@/components/ui/skip-link';
import { getServerUser } from '@/lib/auth/auth';
import { getLocaleDirection, isAppLocale } from '@/modules/i18n/config';
import { LocaleDirectionProvider } from '@/modules/i18n/direction-context';
import { routing } from '@/modules/i18n/routing';
import '../globals.css';

// Optimize for faster initial loads - reduce server work
export const dynamic = 'force-dynamic'; // Required for auth
export const revalidate = false; // Disable for auth-dependent content

// English font - Secondary
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
  preload: true,
  display: 'swap',
  fallback: ['system-ui', 'arial'],
});

// Hebrew font - Primary (Satya Method)
const assistant = Assistant({
  subsets: ['hebrew'],
  variable: '--font-assistant',
  weight: ['300', '400', '500', '600', '700'],
  preload: true,
  display: 'swap',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
});

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Loom - Coaching Platform',
  description: 'A modern coaching platform for coaches and clients',
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;

  if (!isAppLocale(rawLocale)) {
    notFound();
  }

  const locale = rawLocale;
  const direction = getLocaleDirection(locale);

  // Load messages and user data in parallel to reduce TTFB
  const [messages, initialUser] = await Promise.allSettled([
    getMessages(),
    getServerUser().catch(() => null), // Don't throw on auth errors
  ]);

  const resolvedMessages = messages.status === 'fulfilled' ? messages.value : {};
  const resolvedUser = initialUser.status === 'fulfilled' ? initialUser.value : null;

  return (
    <LocaleDirectionProvider value={{ locale, direction }}>
      <html lang={locale} dir={direction} data-locale={locale}>
        <head>
          {/* Preload critical resources for faster LCP */}
          <link rel="dns-prefetch" href="https://*.supabase.co" />
          <link rel="preconnect" href="https://*.supabase.co" crossOrigin="" />
          {/* PWA manifest and theming */}
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0ea5e9" />
          {/* iOS PWA support */}
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
          <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
          {/* Google Fonts Inter is loaded automatically - no preload needed */}
          {/* Critical CSS inlined in globals.css */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            /* Critical above-the-fold styles */
            .skeleton-loading { animation: skeleton-pulse 1.5s ease-in-out infinite; }
            @keyframes skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            .layout-stabilizer { min-height: 100vh; display: flex; flex-direction: column; }
          `,
            }}
          />
        </head>
        <body
          className={`${inter.variable} ${assistant.variable} font-sans antialiased layout-stabilizer premium-app-surface`}
          data-locale-direction={direction}
        >
          {/* Register service worker for PWA */}
          <PwaBootstrap />
          {/* Skip navigation links for keyboard users */}
          <SkipLink href="#main-content">
            {direction === 'rtl' ? 'עבור לתוכן הראשי' : 'Skip to main content'}
          </SkipLink>
          <SkipLink href="#main-navigation" className="left-32">
            {direction === 'rtl' ? 'עבור לניווט' : 'Skip to navigation'}
          </SkipLink>
          <EnvironmentCheck />
          <Providers locale={locale} messages={resolvedMessages} initialUser={resolvedUser}>
            <main id="main-content" tabIndex={-1} className="flex-1">
              {children}
            </main>
            <AppFooter locale={locale} />
            <PerformanceMonitorComponent />
            <Toaster
              position={direction === 'rtl' ? 'top-left' : 'top-right'}
              dir={direction}
              richColors
            />
          </Providers>
        </body>
      </html>
    </LocaleDirectionProvider>
  );
}
