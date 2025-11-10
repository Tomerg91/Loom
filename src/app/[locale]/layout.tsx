import type { Metadata } from 'next';
import { Assistant, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';

import { EnvironmentCheck } from '@/components/environment-check';
import { AppFooter } from '@/components/layout/app-footer';
import { PwaBootstrap } from '@/components/pwa/pwa-bootstrap';
import { SkipLink } from '@/components/ui/skip-link';
import { getLocaleDirection, isAppLocale } from '@/modules/i18n/config';
import { LocaleDirectionProvider } from '@/modules/i18n/direction-context';
import { routing } from '@/modules/i18n/routing';

import '../globals.css';
import { LocaleLayoutClient } from './locale-layout-client';

export const dynamic = 'force-static';
export const revalidate = 3600; // Refresh cached chrome every hour to pick up CMS tweaks

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
  preload: true,
  display: 'swap',
  fallback: ['system-ui', 'arial'],
});

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
  children: ReactNode;
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
  const messages = await getMessages();

  return (
    <LocaleDirectionProvider value={{ locale, direction }}>
      <html lang={locale} dir={direction} data-locale={locale}>
        <head>
          <link rel="dns-prefetch" href="https://*.supabase.co" />
          <link rel="preconnect" href="https://*.supabase.co" crossOrigin="" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0ea5e9" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
          <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
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
          <PwaBootstrap />
          <SkipLink href="#main-content">
            {(messages.common?.accessibility?.skipToMainContent as string) || 'Skip to main content'}
          </SkipLink>
          <SkipLink href="#main-navigation" className="left-32">
            {(messages.common?.accessibility?.skipToNavigation as string) || 'Skip to navigation'}
          </SkipLink>
          <EnvironmentCheck />
          <LocaleLayoutClient locale={locale} messages={messages}>
            <main id="main-content" tabIndex={-1} className="flex-1">
              {children}
            </main>
            <AppFooter locale={locale} />
          </LocaleLayoutClient>
        </body>
      </html>
    </LocaleDirectionProvider>
  );
}
