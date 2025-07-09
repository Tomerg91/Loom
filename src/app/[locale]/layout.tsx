import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Providers } from '@/components/providers/providers';
import { getServerUser } from '@/lib/auth/auth';
import { locales } from '@/i18n/config';
import { PerformanceMonitorComponent } from '@/components/monitoring/performance-monitor';
import { initSentry } from '@/lib/monitoring/sentry';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
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
  const { locale } = await params;
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages();
  
  // Get initial user for SSR
  let initialUser = null;
  try {
    initialUser = await getServerUser();
  } catch {
    // User not authenticated, which is fine
  }

  return (
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize Sentry as early as possible
              window.addEventListener('load', function() {
                if (typeof window !== 'undefined') {
                  // Initialize monitoring
                  ${initSentry.toString()}
                  initSentry();
                }
              });
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Skip navigation links for keyboard users */}
        <a
          href="#main-content"
          className="skip-link sr-only-focusable"
          style={{
            position: 'absolute',
            top: '-40px',
            left: '6px',
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            padding: '8px 12px',
            textDecoration: 'none',
            borderRadius: '4px',
            zIndex: 100,
            fontWeight: 600,
            fontSize: '14px',
            transition: 'top 0.2s ease-in-out',
          }}
          onFocus={(e) => {
            e.currentTarget.style.top = '6px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.top = '-40px';
          }}
        >
          {locale === 'he' ? 'עבור לתוכן הראשי' : 'Skip to main content'}
        </a>
        <a
          href="#main-navigation"
          className="skip-link sr-only-focusable"
          style={{
            position: 'absolute',
            top: '-40px',
            left: '140px',
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            padding: '8px 12px',
            textDecoration: 'none',
            borderRadius: '4px',
            zIndex: 100,
            fontWeight: 600,
            fontSize: '14px',
            transition: 'top 0.2s ease-in-out',
          }}
          onFocus={(e) => {
            e.currentTarget.style.top = '6px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.top = '-40px';
          }}
        >
          {locale === 'he' ? 'עבור לניווט' : 'Skip to navigation'}
        </a>
        <Providers 
          locale={locale} 
          messages={messages} 
          initialUser={initialUser}
        >
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <PerformanceMonitorComponent />
        </Providers>
      </body>
    </html>
  );
}
