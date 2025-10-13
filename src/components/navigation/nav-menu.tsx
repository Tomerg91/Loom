'use client';

import {
  ClipboardList,
  Home,
  Calendar,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  User,
  LogOut,
  Shield,
  BookOpen,
  Clock,
  FileText,
  TrendingUp,
  Menu,
  X,
  FolderOpen
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { StableImage } from '@/components/layout/layout-stabilizer';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminOnly, CoachOnly, ClientOnly } from '@/components/ui/conditional-render';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CompactLanguageSwitcher } from '@/components/ui/language-switcher';
import { Link } from '@/i18n/routing';
import { createClientAuthService } from '@/lib/auth/client-auth';
import { useUser } from '@/lib/auth/use-user';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export function NavMenu() {
  const t = useTranslations('navigation');
  const user = useUser();
  const pathname = usePathname();
  const locale = useLocale();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return null;
  }

  const authService = createClientAuthService();

  const handleSignOut = async () => {
    await authService.signOut();
    window.location.href = `/${locale}/auth/signin`;
  };

  // Common navigation items
  const shouldShowOnboarding = user.role === 'coach' || user.role === 'client';
  const onboardingIncomplete = shouldShowOnboarding && user.onboardingStatus !== 'completed';

  const commonItems: NavItem[] = [
    ...(shouldShowOnboarding
      ? [{ label: t('onboarding'), href: '/onboarding', icon: ClipboardList, exact: true }]
      : []),
    { label: t('dashboard'), href: '/dashboard', icon: Home, exact: true },
    { label: t('sessions'), href: '/sessions', icon: Calendar },
  ];

  // Role-specific navigation items
  const adminItems: NavItem[] = [
    { label: t('admin_dashboard'), href: '/admin', icon: Shield, exact: true },
    { label: t('users'), href: '/admin/users', icon: Users },
    { label: t('sessions'), href: '/admin/sessions', icon: Calendar },
    { label: t('analytics'), href: '/admin/analytics', icon: BarChart3 },
    { label: t('audit'), href: '/admin/audit', icon: FileText },
    { label: t('system'), href: '/admin/system', icon: Settings },
  ];

  const coachItems: NavItem[] = [
    { label: t('clients'), href: '/coach/clients', icon: Users },
    { label: t('resources'), href: '/coach/resources', icon: FolderOpen },
    { label: t('notes'), href: '/coach/notes', icon: FileText },
    { label: t('availability'), href: '/coach/availability', icon: Clock },
    { label: t('insights'), href: '/coach/insights', icon: TrendingUp },
  ];

  const clientItems: NavItem[] = [
    { label: t('coaches'), href: '/client/coaches', icon: Users },
    { label: t('resources'), href: '/client/resources', icon: FolderOpen },
    { label: t('reflections'), href: '/client/reflections', icon: BookOpen },
    { label: t('progress'), href: '/client/progress', icon: TrendingUp },
    { label: t('book'), href: '/client/book', icon: Calendar },
  ];

  const isActive = (href: string, exact = false) => {
    const normalized = pathname.replace(/^\/(en|he)/, '');
    if (exact) {
      return normalized === href;
    }
    return normalized.startsWith(href);
  };

  const getUserInitials = (user: { firstName?: string; lastName?: string; email: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
  };

  const getUserDisplayName = (user: { firstName?: string; lastName?: string; email: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-md bg-card/95" id="main-navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center rtl:space-x-reverse space-x-8">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center rtl:space-x-reverse space-x-2 transition-transform hover:scale-105" aria-label="Loom - Go to dashboard">
              <MessageSquare className="h-8 w-8 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold text-foreground">Loom</span>
            </Link>

            {/* Navigation Items - Desktop */}
            <div className="hidden lg:flex items-center rtl:space-x-reverse space-x-1">
              {/* Common items */}
              {commonItems.map((item) => {
                const active = isActive(item.href, item.exact);
                const highlight = item.href === '/onboarding' && onboardingIncomplete;

                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={active ? 'default' : highlight ? 'success' : 'ghost'}
                    size="sm"
                    className="flex items-center rtl:space-x-reverse space-x-2"
                    aria-current={active ? 'page' : undefined}
                  >
                    <Link href={item.href as '/dashboard'}>
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}

              {/* Role-specific items */}
              <AdminOnly>
                {adminItems.map((item) => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant={active ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center rtl:space-x-reverse space-x-2"
                      aria-current={active ? "page" : undefined}
                    >
                      <Link href={item.href as '/dashboard'}>
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </AdminOnly>

              <CoachOnly>
                {coachItems.map((item) => (
                  <Button
                    key={item.href}
                    asChild
                    variant={isActive(item.href) ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center rtl:space-x-reverse space-x-2"
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <Link href={item.href as '/dashboard'}>
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                ))}
              </CoachOnly>

              <ClientOnly>
                {clientItems.map((item) => (
                  <Button
                    key={item.href}
                    asChild
                    variant={isActive(item.href) ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center rtl:space-x-reverse space-x-2"
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <Link href={item.href as '/dashboard'}>
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                ))}
              </ClientOnly>
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center rtl:space-x-reverse space-x-2 lg:space-x-4">
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </Button>

            {/* Language Switcher - Hidden on small screens */}
            <div className="hidden sm:block">
              <CompactLanguageSwitcher />
            </div>
            
            {/* Notifications */}
            <NotificationCenter />

            {/* Role badge - Hidden on small screens */}
            <div className="hidden md:block">
              <Badge 
                variant={
                  user.role === 'admin' ? 'default' : 
                  user.role === 'coach' ? 'secondary' : 
                  'outline'
                }
                role="status"
                aria-label={`Current role: ${t(`roles.${user.role}`)}`}
              >
                {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" aria-hidden="true" />}
                {t(`roles.${user.role}`)}
              </Badge>
            </div>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="user-menu">
                  <Avatar className="h-10 w-10">
                    <StableImage
                      src={user.avatarUrl}
                      alt={`${getUserDisplayName(user)} profile picture - ${t(`roles.${user.role}`)}`}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <AvatarFallback>
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {getUserDisplayName(user)}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <span className="flex items-center rtl:space-x-reverse space-x-2">
                      <User className="h-4 w-4" aria-hidden="true" />
                      <span>{t('profile')}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <span className="flex items-center rtl:space-x-reverse space-x-2">
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      <span>{t('settings')}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive" data-testid="logout-button">
                  <LogOut className="rtl:ml-2 rtl:mr-0 ltr:mr-2 ltr:ml-0 h-4 w-4" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile navigation with CLS prevention */}
      <div 
        className="lg:hidden"
        style={{
          maxHeight: isMobileMenuOpen ? '400px' : '0px',
          opacity: isMobileMenuOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out',
          contain: 'layout'
        }}
        id="mobile-navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-card border-t border-border">
          {/* Mobile menu header with role badge and language switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-border sm:hidden">
            <Badge 
              variant={
                user.role === 'admin' ? 'default' : 
                user.role === 'coach' ? 'secondary' : 
                'outline'
              }
              role="status"
              aria-label={`Current role: ${t(`roles.${user.role}`)}`}
            >
              {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" aria-hidden="true" />}
              {t(`roles.${user.role}`)}
            </Badge>
            <CompactLanguageSwitcher />
          </div>

          {/* Common items */}
          {commonItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const highlight = item.href === '/onboarding' && onboardingIncomplete;

            return (
              <Button
                key={item.href}
                asChild
                variant={active ? 'default' : highlight ? 'success' : 'ghost'}
                size="sm"
                className="w-full rtl:justify-end ltr:justify-start flex items-center rtl:space-x-reverse space-x-3 py-3 transition-all hover:scale-[1.02]"
                aria-current={active ? 'page' : undefined}
              >
                <Link href={item.href as '/dashboard'} onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="flex items-center rtl:space-x-reverse space-x-3">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>
                </Link>
              </Button>
            );
          })}

          {/* Role-specific items */}
          <AdminOnly>
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
                {t('admin')}
              </p>
              {adminItems.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className="w-full rtl:justify-end ltr:justify-start flex items-center rtl:space-x-reverse space-x-3 py-3 transition-all hover:scale-[1.02]"
                    aria-current={active ? "page" : undefined}
                  >
                    <Link href={item.href as '/dashboard'} onClick={() => setIsMobileMenuOpen(false)}>
                      <span className="flex items-center rtl:space-x-reverse space-x-3">
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                        <span>{item.label}</span>
                      </span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </AdminOnly>

          <CoachOnly>
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
                {t('coach')}
              </p>
              {coachItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  className="w-full rtl:justify-end ltr:justify-start flex items-center rtl:space-x-reverse space-x-3 py-3 transition-all hover:scale-[1.02]"
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  <Link href={item.href as '/dashboard'} onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="flex items-center rtl:space-x-reverse space-x-3">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          </CoachOnly>

          <ClientOnly>
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
                {t('client')}
              </p>
              {clientItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  className="w-full rtl:justify-end ltr:justify-start flex items-center rtl:space-x-reverse space-x-3 py-3 transition-all hover:scale-[1.02]"
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  <Link href={item.href as '/dashboard'} onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="flex items-center rtl:space-x-reverse space-x-3">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          </ClientOnly>
        </div>
      </div>
    </nav>
  );
}
