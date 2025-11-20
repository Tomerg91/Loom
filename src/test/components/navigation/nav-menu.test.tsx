import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { NavMenu } from '@/components/navigation/nav-menu';
import type { AuthUser } from '@/lib/auth/auth';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
  useTranslations: vi.fn(() => (key: string) => key),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));

// Mock client auth service
vi.mock('@/lib/auth/client-auth', () => {
  return {
    createClientAuthService: () => ({
      signOut: vi.fn(),
    }),
  };
});

// Mock Link component from i18n/routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock NotificationCenter
vi.mock('@/components/notifications/notification-center', () => ({
  NotificationCenter: () => <div>Notification Center</div>,
}));

// Mock language switcher
vi.mock('@/components/ui/language-switcher', () => ({
  CompactLanguageSwitcher: () => <div>Language Switcher</div>,
}));

// Mock conditional render components
vi.mock('@/components/ui/conditional-render', () => ({
  AdminOnly: ({ children }: any) => <div>{children}</div>,
  CoachOnly: ({ children }: any) => <div>{children}</div>,
  ClientOnly: ({ children }: any) => <div>{children}</div>,
}));

const mockUser: AuthUser = {
  id: 'user_123',
  email: 'test@example.com',
  role: 'client',
  firstName: 'Test',
  lastName: 'User',
  language: 'en',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  mfaEnabled: false,
  onboardingStatus: 'completed',
};

// Mock useUser hook
vi.mock('@/lib/auth/use-user', () => ({
  useUser: vi.fn(() => mockUser),
}));

describe('NavMenu', () => {
  describe('Profile navigation link', () => {
    it('should link to /settings instead of /profile', () => {
      // Read the source file to verify the fix
      const fs = require('fs');
      const sourceCode = fs.readFileSync(
        'src/components/navigation/nav-menu.tsx',
        'utf-8'
      );

      // Check that there is a Link with href="/settings" that is for profile
      // (should have User icon near it)
      const profileLinkPattern = /<Link href="\/settings">[\s\S]*?<User className/;
      expect(sourceCode).toMatch(profileLinkPattern);

      // Verify that there is NO Link with href="/profile"
      const badProfileLinkPattern = /<Link href="\/profile">/;
      expect(sourceCode).not.toMatch(badProfileLinkPattern);
    });
  });
});
