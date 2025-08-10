import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Providers } from '@/components/providers/providers';
import { getServerUser } from '@/lib/auth/auth';
import { routing } from '@/i18n/routing';
import { PerformanceMonitorComponent } from '@/components/monitoring/performance-monitor';
import { initSentry } from '@/lib/monitoring/sentry';
import { SkipLink } from '@/components/ui/skip-link';
import '../globals.css';

// Force dynamic rendering to avoid prerender issues with event handlers in client components
export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
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
        <SkipLink href="#main-content">
          {locale === 'he' ? 'עבור לתוכן הראשי' : 'Skip to main content'}
        </SkipLink>
        <SkipLink href="#main-navigation" className="left-32">
          {locale === 'he' ? 'עבור לניווט' : 'Skip to navigation'}
        </SkipLink>
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
