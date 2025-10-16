/**
 * @fileoverview Responsive dashboard sidebar used by the authenticated shell.
 */

'use client';

import { MessageSquare, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment, useMemo, type ReactNode } from 'react';

import type {
  DashboardNavigationConfig,
  NavigationItem,
  NavigationRole,
  NavigationSection,
} from '@/components/layout/navigation-types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { LocaleSwitcher } from '@/modules/i18n/components/LocaleSwitcher';

interface SidebarProps {
  locale: string;
  navigation: DashboardNavigationConfig;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  footer?: ReactNode;
  /** Optional user metadata for the account summary block. */
  userSummary?: {
    name: string;
    email: string;
    role: NavigationRole;
  } | null;
}

interface SidebarContentProps {
  navigation: DashboardNavigationConfig;
  activePath: string;
  role: NavigationRole;
  footer?: ReactNode;
  locale: string;
  onClose: () => void;
  userSummary?: {
    name: string;
    email: string;
    role: NavigationRole;
  } | null;
}

const ROLE_BADGE_TONES: Record<NavigationRole, 'default' | 'secondary'> = {
  admin: 'secondary',
  coach: 'default',
  client: 'default',
  all: 'default',
};

function isItemVisible(item: NavigationItem, role: NavigationRole) {
  if (!item.roles || item.roles.length === 0) {
    return true;
  }

  if (item.roles.includes('all')) {
    return true;
  }

  return item.roles.includes(role);
}

function isItemActive(pathname: string, item: NavigationItem) {
  if (item.matchBehavior === 'exact') {
    return pathname === item.href;
  }

  return pathname.startsWith(item.href);
}

interface NavigationListProps {
  section: NavigationSection;
  activePath: string;
  role: NavigationRole;
}

function NavigationList({ section, activePath, role }: NavigationListProps) {
  const hasLabel = Boolean(section.label);

  return (
    <div
      className="space-y-2"
      aria-labelledby={hasLabel ? `${section.id}-label` : undefined}
    >
      {hasLabel ? (
        <p
          id={`${section.id}-label`}
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {section.label}
        </p>
      ) : null}

      <div className="space-y-1">
        {section.items
          .filter(item => isItemVisible(item, role))
          .map(item => {
            const Icon = item.icon;
            const active = isItemActive(activePath, item);

            return (
              <Button
                key={item.id}
                asChild
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'w-full justify-start gap-3',
                  active && 'font-semibold'
                )}
              >
                <Link
                  href={item.href as `/${string}`}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noreferrer' : undefined}
                >
                  {Icon ? (
                    <Icon className="h-4 w-4" aria-hidden={true} />
                  ) : null}
                  <span className="truncate">{item.label}</span>
                  {item.badge ? (
                    <Badge variant="outline" className="ml-auto">
                      {item.badge}
                    </Badge>
                  ) : null}
                </Link>
              </Button>
            );
          })}
      </div>
    </div>
  );
}

function SidebarContent({
  navigation,
  activePath,
  role,
  footer,
  locale,
  onClose,
  userSummary,
}: SidebarContentProps) {
  const t = useTranslations('navigation.roles');

  const summary = useMemo(() => {
    if (!userSummary) {
      return null;
    }

    const initials = userSummary.name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);

    return (
      <div className="rounded-lg border bg-muted/40 p-4" aria-live="polite">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-primary/10 text-primary">
            <AvatarFallback>
              {initials || userSummary.email.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{userSummary.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {userSummary.email}
            </p>
          </div>
        </div>
        <Badge variant={ROLE_BADGE_TONES[userSummary.role]} className="mt-3">
          {t(userSummary.role)}
        </Badge>
      </div>
    );
  }, [t, userSummary]);

  return (
    <div className="dashboard-sidebar">
      <div className="dashboard-sidebar__content">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/${locale}/dashboard` as `/${string}`}
            className="flex items-center gap-2 font-semibold text-lg"
            aria-label="Loom dashboard"
            onClick={onClose}
          >
            <MessageSquare
              className="h-6 w-6 text-primary"
              aria-hidden="true"
            />
            <span className="truncate">Loom</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {summary}

        {navigation.primary.map(section => (
          <NavigationList
            key={section.id}
            section={section}
            activePath={activePath}
            role={role}
          />
        ))}

        {navigation.secondary?.length ? (
          <Fragment>
            <Separator className="my-2" />
            {navigation.secondary.map(section => (
              <NavigationList
                key={section.id}
                section={section}
                activePath={activePath}
                role={role}
              />
            ))}
          </Fragment>
        ) : null}
      </div>

      <div className="dashboard-sidebar__footer">
        {footer ?? <LocaleSwitcher className="w-full" />}
      </div>
    </div>
  );
}

export function Sidebar({
  locale,
  navigation,
  isMobileOpen,
  onMobileClose,
  footer,
  userSummary,
}: SidebarProps) {
  const pathname = usePathname();
  const normalizedPath = pathname.split('?')[0];
  const role = userSummary?.role ?? 'all';

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block"
        aria-label="Dashboard navigation"
        id="main-navigation"
      >
        <SidebarContent
          navigation={navigation}
          activePath={normalizedPath}
          role={role}
          footer={footer}
          locale={locale}
          onClose={onMobileClose}
          userSummary={userSummary}
        />
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen ? (
        <div className="lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="dashboard-sidebar__overlay"
            aria-label="Close navigation"
            onClick={onMobileClose}
          />
          <div
            className="dashboard-sidebar__mobile-panel"
            data-testid="dashboard-mobile-sidebar"
          >
            <SidebarContent
              navigation={navigation}
              activePath={normalizedPath}
              role={role}
              footer={footer}
              locale={locale}
              onClose={onMobileClose}
              userSummary={userSummary}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
