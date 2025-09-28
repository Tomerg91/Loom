import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AuthProvider, useUser, useRequireAuth } from '@/components/auth/auth-provider';
import type { AuthUser } from '@/lib/auth/auth';
import { useAuthStore } from '@/lib/store/auth-store';

// Mock next-intl locale hook
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
}));

// Stub the client auth service to avoid Supabase calls
vi.mock('@/lib/auth/client-auth', () => {
  return {
    createClientAuthService: () => ({
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue(null),
      getCurrentUser: vi.fn().mockResolvedValue(null),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    }),
  };
});

describe('AuthProvider + hooks', () => {
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
  };

  beforeEach(() => {
    // Ensure clean persisted state between tests
    localStorage.clear();
    // Reset Zustand store
    useAuthStore.getState().clearAuth();
  });

  it('provides user from initialUser and hydrates Zustand', async () => {
    const Probe = () => {
      const user = useUser();
      return <div data-testid="name">{user?.firstName}</div>;
    };

    render(
      <AuthProvider initialUser={mockUser}>
        <Probe />
      </AuthProvider>
    );

    // Context exposes user
    expect(await screen.findByTestId('name')).toHaveTextContent('Test');

    // Zustand store is hydrated
    const stateUser = useAuthStore.getState().user;
    expect(stateUser?.id).toBe('user_123');
    expect(stateUser?.email).toBe('test@example.com');
  });

  it('useRequireAuth redirects to /en/auth/signin when no user', async () => {
    const push = vi.fn();
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({ push }),
      usePathname: () => '/mock',
      useSearchParams: () => new URLSearchParams(),
    }));

    const GateProbe = () => {
      // Should trigger redirect and render nothing meaningful
      const user = useRequireAuth();
      return <div data-testid="guard">{user ? 'authed' : 'redirected'}</div>;
    };

    render(
      <AuthProvider>
        <GateProbe />
      </AuthProvider>
    );

    // No user -> redirected state and router.push called
    expect(await screen.findByTestId('guard')).toHaveTextContent('redirected');
    expect(push).toHaveBeenCalledWith('/en/auth/signin');
  });
});

