/**
 * @fileoverview Dashboard topbar with mobile navigation toggle, locale switcher
 * and user account menu.
 */

'use client';

import { Bell, Menu, LogOut, Settings, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, type ReactNode } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { createClientAuthService } from '@/lib/auth/client-auth';
import { useUser } from '@/lib/auth/use-user';
import { useAuthLoading } from '@/lib/store/auth-store';
import { cn } from '@/lib/utils';
import { LocaleSwitcher } from '@/modules/i18n/components/LocaleSwitcher';

interface TopbarProps {
  onToggleMobileNav: () => void;
  actionsSlot?: ReactNode;
}

function getUserInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  if (user.firstName && user.lastName) {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  if (user.firstName) {
    return user.firstName.charAt(0).toUpperCase();
  }

  return user.email.charAt(0).toUpperCase();
}

function getUserDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  return user.firstName ?? user.email;
}

function TopbarSkeleton() {
  return (
    <div className="dashboard-topbar" aria-hidden="true">
      <div className="dashboard-topbar__content">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <SkeletonText className="w-40" />
        <div className="dashboard-topbar__actions">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function Topbar({ onToggleMobileNav, actionsSlot }: TopbarProps) {
  const t = useTranslations('common');
  const navigationTranslations = useTranslations('navigation');
  const user = useUser();
  const isAuthLoading = useAuthLoading();
  const currentLocale = useLocale();

  const authService = useMemo(() => createClientAuthService(), []);

  const handleSignOut = async () => {
    await authService.signOut();
    window.location.href = `/${currentLocale}/auth/signin`;
  };

  if (isAuthLoading && !user) {
    return <TopbarSkeleton />;
  }

  if (!user) {
    return null;
  }

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const openNavLabel =
    currentLocale === 'he' ? 'פתח תפריט ניווט' : 'Open navigation menu';

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__content" role="banner">
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          onClick={onToggleMobileNav}
          aria-label={openNavLabel}
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="dashboard-topbar__user">
          <div className="hidden sm:flex flex-col">
            <span className="text-sm text-muted-foreground">
              {t('welcome')}
            </span>
            <span className="font-semibold leading-tight truncate">
              {displayName}
            </span>
          </div>
        </div>

        <div className="dashboard-topbar__actions">
          {actionsSlot}
          <Button
            variant="ghost"
            size="icon"
            aria-label={navigationTranslations('notifications')}
          >
            <Bell className="h-5 w-5" aria-hidden={true} />
          </Button>
          <LocaleSwitcher className="hidden md:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={t('profile')}
              >
                <Avatar className="h-9 w-9">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm font-semibold">{displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={cn('gap-2')}>
                <User className="h-4 w-4" aria-hidden="true" />
                {navigationTranslations('profile')}
              </DropdownMenuItem>
              <DropdownMenuItem className={cn('gap-2')}>
                <Settings className="h-4 w-4" aria-hidden="true" />
                {navigationTranslations('settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={cn('gap-2 text-destructive')}
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {navigationTranslations('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <LocaleSwitcher compact className="md:hidden" />
        </div>
      </div>
    </header>
  );
}
