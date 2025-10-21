import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AuthProvider, useAuth } from '@/components/auth/auth-provider';
import { RouteGuard } from '@/components/auth/route-guard';
import { SigninForm } from '@/components/auth/signin-form';
import type { AuthUser } from '@/lib/auth/auth';
import { useAuthStore } from '@/lib/store/auth-store';
import { renderWithProviders, mockUser, mockFetch } from '@/test/utils';

type AuthStateChangeHandler = (user: AuthUser | null) => Promise<void> | void;

const mocks = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  const mockSupabaseClient = {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  } as const;

  let authStateChangeHandler: AuthStateChangeHandler | null = null;

  const mockAuthService = {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getCurrentUser: vi.fn(),
    onAuthStateChange: vi.fn((callback: AuthStateChangeHandler) => {
      authStateChangeHandler = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as const;
    }),
    updateProfile: vi.fn(),
    get stateChangeHandler() {
      return authStateChangeHandler;
    },
    resetHandler() {
      authStateChangeHandler = null;
    },
  };

  return {
    mockPush,
    mockReplace,
    mockSupabaseClient,
    mockAuthService,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.mockPush,
    replace: mocks.mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/signin',
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mocks.mockSupabaseClient,
  supabase: mocks.mockSupabaseClient,
}));

vi.mock('@/lib/auth/client-auth', () => ({
  createClientAuthService: () => mocks.mockAuthService,
}));

const renderWithAuthProvider = (ui: React.ReactElement) => {
  return renderWithProviders(<AuthProvider>{ui}</AuthProvider>);
};

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockAuthService.resetHandler();
    window.localStorage.clear();

    useAuthStore.setState(state => ({
      ...state,
      user: null,
      isLoading: false,
      error: null,
      mfaRequired: false,
      mfaVerified: false,
      mfaSessionToken: null,
      isMfaSession: false,
    }));

    mockFetch({ success: true });

    mocks.mockAuthService.signIn.mockImplementation(
      async ({ email, password }) => {
        const result = await mocks.mockSupabaseClient.auth.signInWithPassword({
          email,
          password,
        });
        if (result.error) {
          return { user: null, error: result.error.message || 'Unknown error' };
        }
        return { user: result.data.user, error: null };
      }
    );

    mocks.mockAuthService.signUp.mockResolvedValue({
      user: mockUser,
      error: null,
      sessionActive: true,
    });
    mocks.mockAuthService.signOut.mockImplementation(async () => {
      const { error } = await mocks.mockSupabaseClient.auth.signOut();
      if (!error) {
        useAuthStore.getState().clearAuth();
      }
      return { error: error?.message || null };
    });
    mocks.mockAuthService.getSession.mockResolvedValue({ user: null });
    mocks.mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

    mocks.mockSupabaseClient.auth.signInWithPassword.mockReset();
    mocks.mockSupabaseClient.auth.signUp.mockReset();
    mocks.mockSupabaseClient.auth.signOut.mockReset();
    mocks.mockSupabaseClient.auth.getSession.mockReset();
    mocks.mockSupabaseClient.auth.getUser.mockReset();
  });

  afterEach(() => {
    useAuthStore.persist?.clearStorage?.();
  });

  describe('Sign In Flow', () => {
    it('completes full signin flow successfully', async () => {
      mocks.mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: 'token', refresh_token: 'refresh' },
        },
        error: null,
      });

      renderWithAuthProvider(<SigninForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          mocks.mockSupabaseClient.auth.signInWithPassword
        ).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(useAuthStore.getState().user).toEqual(mockUser);
      });

      expect(mocks.mockPush).toHaveBeenCalledWith('/en/dashboard');
    });

    it('handles signin errors correctly', async () => {
      mocks.mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      renderWithAuthProvider(<SigninForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/invalid login credentials/i)
        ).toBeInTheDocument();
      });

      expect(useAuthStore.getState().user).toBeNull();
      expect(mocks.mockPush).not.toHaveBeenCalled();
    });

    it('shows validation errors for invalid input', async () => {
      renderWithAuthProvider(<SigninForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      expect(
        mocks.mockSupabaseClient.auth.signInWithPassword
      ).not.toHaveBeenCalled();
    });
  });

  describe('Route Protection', () => {
    const ProtectedComponent = () => <div>Protected Content</div>;

    it('allows access when user is authenticated', async () => {
      useAuthStore.setState(state => ({
        ...state,
        user: mockUser,
        isLoading: false,
      }));
      mocks.mockAuthService.getSession.mockResolvedValueOnce({
        user: mockUser,
      });

      renderWithAuthProvider(
        <RouteGuard requireRole="client">
          <ProtectedComponent />
        </RouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('redirects to signin when user is not authenticated', async () => {
      useAuthStore.setState(state => ({
        ...state,
        user: null,
        isLoading: false,
      }));

      renderWithAuthProvider(
        <RouteGuard requireRole="client">
          <ProtectedComponent />
        </RouteGuard>
      );

      await waitFor(() => {
        expect(mocks.mockPush).toHaveBeenCalledWith(
          '/en/auth/signin?redirectTo=%2Fen%2Fsignin'
        );
      });
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects when user lacks required role', async () => {
      useAuthStore.setState(state => ({
        ...state,
        user: { ...mockUser, role: 'client' },
        isLoading: false,
      }));

      renderWithAuthProvider(
        <RouteGuard requireRole="admin">
          <ProtectedComponent />
        </RouteGuard>
      );

      await waitFor(() => {
        expect(mocks.mockPush).toHaveBeenCalledWith('/en/dashboard');
      });
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows loading state while checking authentication', () => {
      useAuthStore.setState(state => ({ ...state, isLoading: true }));

      renderWithAuthProvider(
        <RouteGuard requireRole="client">
          <ProtectedComponent />
        </RouteGuard>
      );

      expect(screen.getByTestId('route-guard-loading')).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('handles session expiration gracefully', async () => {
      useAuthStore.setState(state => ({
        ...state,
        user: mockUser,
        isLoading: false,
      }));

      const ProtectedComponent = () => {
        const user = useAuthStore(s => s.user);
        return user ? <div>Protected Content</div> : <div>Please sign in</div>;
      };

      renderWithAuthProvider(<ProtectedComponent />);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      await mocks.mockAuthService.stateChangeHandler?.(null);

      await waitFor(() => {
        expect(useAuthStore.getState().user).toBeNull();
      });
    });

    it('maintains session across page refreshes', async () => {
      mocks.mockAuthService.getSession.mockResolvedValueOnce({
        user: mockUser,
      });
      mocks.mockAuthService.getCurrentUser.mockResolvedValueOnce(mockUser);

      const App = () => {
        const user = useAuthStore(s => s.user);
        return <div>{user ? 'Authenticated App' : 'App'}</div>;
      };

      renderWithAuthProvider(<App />);

      await waitFor(() => {
        expect(useAuthStore.getState().user).toEqual(mockUser);
      });

      expect(screen.getByText('Authenticated App')).toBeInTheDocument();
    });
  });

  describe('Sign Out Flow', () => {
    const SignOutTrigger = () => {
      const { signOut } = useAuth();
      return (
        <button
          type="button"
          onClick={async () => {
            const result = await signOut();
            if (!result.error) {
              mocks.mockPush('/auth/signin');
            }
          }}
        >
          Sign out
        </button>
      );
    };

    it('completes sign out successfully', async () => {
      useAuthStore.setState(state => ({
        ...state,
        user: mockUser,
        isLoading: false,
      }));
      mocks.mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      renderWithAuthProvider(<SignOutTrigger />);

      fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

      await waitFor(() => {
        expect(mocks.mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(useAuthStore.getState().user).toBeNull();
      });

      expect(mocks.mockPush).toHaveBeenCalledWith('/auth/signin');
    });

    it('handles sign out errors gracefully', async () => {
      useAuthStore.setState(state => ({
        ...state,
        user: mockUser,
        isLoading: false,
      }));
      mocks.mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      renderWithAuthProvider(<SignOutTrigger />);

      fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

      await waitFor(() => {
        expect(mocks.mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      });

      expect(useAuthStore.getState().user).toBeNull();
      expect(mocks.mockPush).not.toHaveBeenCalledWith('/auth/signin');
    });
  });
});
