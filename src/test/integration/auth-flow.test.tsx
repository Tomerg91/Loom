import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useUser } from '@/lib/store/auth-store';
import { renderWithProviders, mockUser, mockSupabaseClient, mockFetch } from '@/test/utils';
import { SigninForm } from '@/components/auth/signin-form';
import { RouteGuard } from '@/components/auth/route-guard';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/signin',
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock auth store
const mockSetUser = vi.fn();
const mockClearUser = vi.fn();

vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn(),
  useAuthStore: () => ({
    setUser: mockSetUser,
    clearUser: mockClearUser,
  }),
}));

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default to no user
    (vi.mocked(useUser)).mockReturnValue(null);
    
    // Mock successful API responses
    mockFetch({
      success: true,
      data: { user: mockUser },
    });
  });

  describe('Sign In Flow', () => {
    it('completes full signin flow successfully', async () => {
      // Mock successful authentication
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      renderWithProviders(<SigninForm />);

      // Fill out and submit form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Should update auth store
      expect(mockSetUser).toHaveBeenCalledWith(mockUser);

      // Should redirect to dashboard
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('handles signin errors correctly', async () => {
      // Mock authentication error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      renderWithProviders(<SigninForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
      });

      // Should not update auth store or redirect
      expect(mockSetUser).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows validation errors for invalid input', async () => {
      renderWithProviders(<SigninForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Should not attempt authentication
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe('Route Protection', () => {
    const ProtectedComponent = () => <div>Protected Content</div>;

    it('allows access when user is authenticated', () => {
      // Mock authenticated user
      (vi.mocked(useUser)).mockReturnValue(mockUser);

      renderWithProviders(
        <RouteGuard requireRole="client">
          <ProtectedComponent />
        </RouteGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('redirects to signin when user is not authenticated', () => {
      // Mock no user
      (vi.mocked(useUser)).mockReturnValue(null);

      renderWithProviders(
        <RouteGuard requireRole="client">
          <ProtectedComponent />
        </RouteGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(mockReplace).toHaveBeenCalledWith('/auth/signin');
    });

    it('redirects when user lacks required role', () => {
      // Mock user with insufficient role
      const clientUser = { ...mockUser, role: 'client' as const };
      (vi.mocked(useUser)).mockReturnValue(clientUser);

      renderWithProviders(
        <RouteGuard requireRole="admin">
          <ProtectedComponent />
        </RouteGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });

    it('shows loading state while checking authentication', () => {
      // Mock loading state
      (vi.mocked(useUser)).mockReturnValue(null);

      renderWithProviders(
        <RouteGuard requireRole="client">
          <ProtectedComponent />
        </RouteGuard>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('handles session expiration gracefully', async () => {
      // Mock authenticated user initially
      (vi.mocked(useUser)).mockReturnValue(mockUser);

      // Mock session check returning expired session
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      const ProtectedComponent = () => {
        const user = useUser();
        return user ? <div>Protected Content</div> : <div>Please sign in</div>;
      };

      renderWithProviders(<ProtectedComponent />);

      // Initially shows content
      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Simulate session expiration check
      mockSupabaseClient.auth.getUser();

      await waitFor(() => {
        expect(mockClearUser).toHaveBeenCalled();
      });
    });

    it('maintains session across page refreshes', async () => {
      // Mock valid session in storage
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Simulate app initialization
      const { rerender } = renderWithProviders(<div>App</div>);

      // Should restore user from session
      await waitFor(() => {
        expect(mockSetUser).toHaveBeenCalledWith(mockUser);
      });

      // Update user state
      (vi.mocked(useUser)).mockReturnValue(mockUser);

      rerender(<div>Authenticated App</div>);

      expect(screen.getByText('Authenticated App')).toBeInTheDocument();
    });
  });

  describe('Sign Out Flow', () => {
    it('completes sign out successfully', async () => {
      // Mock authenticated user
      (vi.mocked(useUser)).mockReturnValue(mockUser);

      // Mock successful sign out
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // Simulate sign out action
      await mockSupabaseClient.auth.signOut();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      
      // Should clear user from store
      expect(mockClearUser).toHaveBeenCalled();
      
      // Should redirect to signin
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });

    it('handles sign out errors gracefully', async () => {
      // Mock sign out error
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      try {
        await mockSupabaseClient.auth.signOut();
      } catch (error) {
        expect((error as Error).message).toBe('Sign out failed');
      }

      // Should still clear local state on error
      expect(mockClearUser).toHaveBeenCalled();
    });
  });
});