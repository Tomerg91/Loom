'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/store/auth-store';
import { AdminOnly, CoachOnly, ClientOnly } from '@/components/ui/conditional-render';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
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
  TrendingUp
} from 'lucide-react';
import { createAuthService } from '@/lib/auth/auth';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { CompactLanguageSwitcher } from '@/components/ui/language-switcher';

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
  
  if (!user) {
    return null;
  }

  const authService = createAuthService(false);

  const handleSignOut = async () => {
    await authService.signOut();
    window.location.href = '/auth/signin';
  };

  // Common navigation items
  const commonItems: NavItem[] = [
    { label: t('dashboard'), href: '/dashboard', icon: Home, exact: true },
    { label: t('sessions'), href: '/sessions', icon: Calendar },
  ];

  // Role-specific navigation items
  const adminItems: NavItem[] = [
    { label: t('users'), href: '/admin/users', icon: Users },
    { label: t('analytics'), href: '/admin/analytics', icon: BarChart3 },
    { label: t('system'), href: '/admin/system', icon: Settings },
  ];

  const coachItems: NavItem[] = [
    { label: t('clients'), href: '/coach/clients', icon: Users },
    { label: t('notes'), href: '/coach/notes', icon: FileText },
    { label: t('availability'), href: '/coach/availability', icon: Clock },
    { label: t('insights'), href: '/coach/insights', icon: TrendingUp },
  ];

  const clientItems: NavItem[] = [
    { label: t('coaches'), href: '/client/coaches', icon: Users },
    { label: t('reflections'), href: '/client/reflections', icon: BookOpen },
    { label: t('progress'), href: '/client/progress', icon: TrendingUp },
    { label: t('book'), href: '/client/book', icon: Calendar },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
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
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">Loom</span>
            </Link>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center space-x-1">
              {/* Common items */}
              {commonItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href, item.exact) ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}

              {/* Role-specific items */}
              <AdminOnly>
                {adminItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </AdminOnly>

              <CoachOnly>
                {coachItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </CoachOnly>

              <ClientOnly>
                {clientItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </ClientOnly>
            </div>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <CompactLanguageSwitcher />
            
            {/* Notifications */}
            <NotificationCenter />

            {/* Role badge */}
            <Badge 
              variant={
                user.role === 'admin' ? 'default' : 
                user.role === 'coach' ? 'secondary' : 
                'outline'
              }
            >
              {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
              {t(`roles.${user.role}`)}
            </Badge>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={getUserDisplayName(user)} />
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
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('profile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('settings')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-card border-t border-border">
          {/* Common items */}
          {commonItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href, item.exact) ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start flex items-center space-x-2"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            </Link>
          ))}

          {/* Role-specific items */}
          <AdminOnly>
            {adminItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </AdminOnly>

          <CoachOnly>
            {coachItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </CoachOnly>

          <ClientOnly>
            {clientItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </ClientOnly>
        </div>
      </div>
    </nav>
  );
}