import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import { PerformanceMonitorComponent } from '@/components/monitoring/performance-monitor';
import { Providers } from '@/components/providers/providers';
import { getServerUser } from '@/lib/auth/auth';
import { getLocaleDirection } from '@/modules/i18n/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AuthenticatedLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AuthenticatedLayout({
  children,
  params,
}: AuthenticatedLayoutProps) {
  const { locale } = await params;
  const direction = getLocaleDirection(locale);

  const [messages, initialUser] = await Promise.allSettled([
    getMessages(),
    getServerUser().catch(() => null),
  ]);

  const resolvedMessages = messages.status === 'fulfilled' ? messages.value : {};
  const resolvedUser = initialUser.status === 'fulfilled' ? initialUser.value : null;

  return (
    <Providers locale={locale} messages={resolvedMessages} initialUser={resolvedUser}>
      {children}
      <PerformanceMonitorComponent />
      <Toaster
        position={direction === 'rtl' ? 'top-left' : 'top-right'}
        dir={direction}
        richColors
      />
    </Providers>
  );
}
