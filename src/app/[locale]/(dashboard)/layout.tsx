/**
 * @fileoverview Locale-aware dashboard layout shell that hydrates navigation
 * labels server-side and defers rendering to the shared client shell.
 */

import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  TrendingUp,
  Users2,
  Clock,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { RouteGuard } from '@/components/auth/route-guard';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { DashboardNavigationConfig } from '@/components/layout/navigation-types';
import '@/styles/dashboard.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DashboardLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params;
  const navigationTranslations = await getTranslations({
    locale,
    namespace: 'navigation',
  });

  const navigation: DashboardNavigationConfig = {
    primary: [
      {
        id: 'primary',
        items: [
          {
            id: 'overview',
            label: navigationTranslations('dashboard'),
            href: `/${locale}/dashboard`,
            icon: LayoutDashboard,
            matchBehavior: 'exact',
          },
          {
            id: 'sessions',
            label: navigationTranslations('sessions'),
            href: `/${locale}/sessions`,
            icon: CalendarDays,
          },
          {
            id: 'messages',
            label: navigationTranslations('notifications'),
            href: `/${locale}/messages`,
            icon: MessageCircle,
          },
        ],
      },
    ],
    secondary: [
      {
        id: 'coach',
        label: navigationTranslations('roles.coach'),
        items: [
          {
            id: 'coach-clients',
            label: navigationTranslations('clients'),
            href: `/${locale}/coach/clients`,
            icon: Users2,
            roles: ['coach'],
          },
          {
            id: 'coach-tasks',
            label: navigationTranslations('tasks'),
            href: `/${locale}/coach/tasks`,
            icon: ClipboardList,
            roles: ['coach'],
          },
          {
            id: 'coach-availability',
            label: navigationTranslations('availability'),
            href: `/${locale}/coach/availability`,
            icon: Clock,
            roles: ['coach'],
          },
        ],
      },
      {
        id: 'client',
        label: navigationTranslations('roles.client'),
        items: [
          {
            id: 'client-tasks',
            label: navigationTranslations('tasks'),
            href: `/${locale}/client/tasks`,
            icon: ClipboardList,
            roles: ['client'],
          },
          {
            id: 'client-progress',
            label: navigationTranslations('progress'),
            href: `/${locale}/client/progress`,
            icon: TrendingUp,
            roles: ['client'],
          },
          {
            id: 'client-book',
            label: navigationTranslations('book'),
            href: `/${locale}/client/book`,
            icon: CalendarDays,
            roles: ['client'],
          },
        ],
      },
      {
        id: 'admin',
        label: navigationTranslations('roles.admin'),
        items: [
          {
            id: 'admin-dashboard',
            label: navigationTranslations('admin_dashboard'),
            href: `/${locale}/admin`,
            icon: LayoutDashboard,
            roles: ['admin'],
          },
          {
            id: 'admin-users',
            label: navigationTranslations('users'),
            href: `/${locale}/admin/users`,
            icon: Users2,
            roles: ['admin'],
          },
          {
            id: 'admin-analytics',
            label: navigationTranslations('analytics'),
            href: `/${locale}/admin/analytics`,
            icon: TrendingUp,
            roles: ['admin'],
          },
        ],
      },
    ],
  };

  return (
    <RouteGuard requireAuth>
      <DashboardShell locale={locale} navigation={navigation}>
        {children}
      </DashboardShell>
    </RouteGuard>
  );
}
