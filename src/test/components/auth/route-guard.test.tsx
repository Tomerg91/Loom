import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { RouteGuard, AdminRoute, CoachRoute, ClientRoute, CoachOrAdminRoute, ClientOrAdminRoute } from '@/components/auth/route-guard';
import { usePermission, useAnyPermission, useHasAnyRole } from '@/lib/permissions/hooks';
import type { Permission } from '@/lib/permissions/permissions';
import { useUser, useAuthLoading } from '@/lib/store/auth-store';
import { renderWithProviders, mockUser, mockCoachUser, mockAdminUser } from '@/test/utils';
import type { UserRole } from '@/types';

// Mock the auth store
vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn(),
  useAuthLoading: vi.fn(),
}));

// Mock the permission hooks
vi.mock('@/lib/permissions/hooks', () => ({
  usePermission: vi.fn(),
  useAnyPermission: vi.fn(),
  useHasAnyRole: vi.fn(),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

// Import mocked dependencies

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

describe('RouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    (useUser as any).mockReturnValue(mockUser);
    (useAuthLoading as any).mockReturnValue(false);
    (usePermission as any).mockReturnValue(true);
    (useAnyPermission as any).mockReturnValue(true);
    (useHasAnyRole as any).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Requirements', () => {
    it('renders children when authenticated and no additional requirements', () => {
      renderWithProviders(
        <RouteGuard>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('redirects to login when authentication required but user not logged in', async () => {
      (useUser as any).mockReturnValue(null);
      
      renderWithProviders(
        <RouteGuard requireAuth={true}>
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/en/auth/signin?redirectTo=%2Fen%2Ftest-path');
      });
    });

    it('uses custom redirect path for unauthenticated users', async () => {
      (useUser as any).mockReturnValue(null);
      
      renderWithProviders(
        <RouteGuard requireAuth={true} redirectTo="/custom-login">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/en/custom-login');
      });
    });

    it('renders children when no auth required and user not logged in', () => {
      (useUser as any).mockReturnValue(null);
      
      renderWithProviders(
        <RouteGuard requireAuth={false}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('waits for auth loading before making decisions', () => {
      (useUser as any).mockReturnValue(null);
      (useAuthLoading as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requireAuth={true}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading component when auth is loading', () => {
      (useAuthLoading as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard>
          <TestComponent />
        </RouteGuard>
      );
      
      const loadingTexts = screen.getAllByText('Loading...');
      expect(loadingTexts.length).toBeGreaterThan(0);
      expect(document.querySelector('[class*="lucide-loader"]')).toBeInTheDocument();
    });

    it('hides loading component when showLoading is false', () => {
      (useAuthLoading as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard showLoading={false}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('displays loading state with spinner icon', () => {
      (useAuthLoading as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard>
          <TestComponent />
        </RouteGuard>
      );
      
      const spinner = document.querySelector('[class*="lucide-loader"]');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Role-Based Access Control', () => {
    it('allows access when user has required role', () => {
      (useUser as any).mockReturnValue(mockAdminUser);
      (useHasAnyRole as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requireRole="admin">
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('denies access when user lacks required role', async () => {
      (useUser as any).mockReturnValue(mockUser); // client user
      (useHasAnyRole as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requireRole="admin">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText(/You do not have permission to access this page/i)).toBeInTheDocument();
        expect(document.querySelector('[class*="lucide-circle-alert"]')).toBeInTheDocument();
      });
    });

    it('allows access when user has any of required roles', () => {
      (useUser as any).mockReturnValue(mockCoachUser);
      (useHasAnyRole as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requireAnyRole={['coach', 'admin']}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('redirects to dashboard when role check fails', async () => {
      (useUser as any).mockReturnValue(mockUser);
      (useHasAnyRole as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requireRole="admin">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/en/dashboard');
      });
    });

    it('uses custom redirect for role failures', async () => {
      (useUser as any).mockReturnValue(mockUser);
      (useHasAnyRole as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requireRole="admin" redirectTo="/unauthorized">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/en/unauthorized');
      });
    });
  });

  describe('Permission-Based Access Control', () => {
    it('allows access when user has required permission', () => {
      (usePermission as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requirePermission="user:view:all">
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('denies access when user lacks required permission', async () => {
      (usePermission as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requirePermission="user:create">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText(/You do not have the required permissions/i)).toBeInTheDocument();
      });
    });

    it('allows access when user has any of required permissions', () => {
      (useAnyPermission as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requireAnyPermission={['user:view:all', 'user:create']}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('denies access when user lacks any required permissions', async () => {
      (useAnyPermission as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requireAnyPermission={['user:create', 'admin:view:dashboard']}>
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
    });

    it('redirects when permission check fails', async () => {
      (usePermission as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requirePermission="admin:view:dashboard">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/en/dashboard');
      });
    });
  });

  describe('Combined Requirements', () => {
    it('allows access when both role and permission requirements are met', () => {
      (useUser as any).mockReturnValue(mockAdminUser);
      (useHasAnyRole as any).mockReturnValue(true);
      (usePermission as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requireRole="admin" requirePermission="user:create">
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('denies access when role requirement is met but permission is not', async () => {
      (useUser as any).mockReturnValue(mockAdminUser);
      (useHasAnyRole as any).mockReturnValue(true);
      (usePermission as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requireRole="admin" requirePermission="admin:manage:system">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
    });

    it('denies access when permission requirement is met but role is not', async () => {
      (useUser as any).mockReturnValue(mockUser);
      (useHasAnyRole as any).mockReturnValue(false);
      (usePermission as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requireRole="admin" requirePermission="user:view:all">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Error Messages', () => {
    it('displays custom unauthorized message', async () => {
      (useUser as any).mockReturnValue(mockUser);
      (useHasAnyRole as any).mockReturnValue(false);
      
      const customMessage = 'You need admin privileges to access this area';
      
      renderWithProviders(
        <RouteGuard requireRole="admin" unauthorizedMessage={customMessage}>
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(screen.getByText(customMessage)).toBeInTheDocument();
      });
    });

    it('falls back to default message when custom message not provided', async () => {
      (useUser as any).mockReturnValue(mockUser);
      (useHasAnyRole as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requireRole="admin">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/You do not have permission to access this page/i)).toBeInTheDocument();
      });
    });
  });

  describe('Convenience Wrapper Components', () => {
    describe('AdminRoute', () => {
      it('requires admin role', () => {
        (useUser as any).mockReturnValue(mockAdminUser);
        (useHasAnyRole as any).mockReturnValue(true);
        
        renderWithProviders(
          <AdminRoute>
            <TestComponent />
          </AdminRoute>
        );
        
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(useHasAnyRole).toHaveBeenCalledWith(['admin']);
      });

      it('denies access to non-admin users', async () => {
        (useUser as any).mockReturnValue(mockUser);
        (useHasAnyRole as any).mockReturnValue(false);
        
        renderWithProviders(
          <AdminRoute>
            <TestComponent />
          </AdminRoute>
        );
        
        await waitFor(() => {
          expect(screen.getByText('Access Denied')).toBeInTheDocument();
        });
      });
    });

    describe('CoachRoute', () => {
      it('requires coach role', () => {
        (useUser as any).mockReturnValue(mockCoachUser);
        (useHasAnyRole as any).mockReturnValue(true);
        
        renderWithProviders(
          <CoachRoute>
            <TestComponent />
          </CoachRoute>
        );
        
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(useHasAnyRole).toHaveBeenCalledWith(['coach']);
      });
    });

    describe('ClientRoute', () => {
      it('requires client role', () => {
        (useUser as any).mockReturnValue(mockUser);
        (useHasAnyRole as any).mockReturnValue(true);
        
        renderWithProviders(
          <ClientRoute>
            <TestComponent />
          </ClientRoute>
        );
        
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(useHasAnyRole).toHaveBeenCalledWith(['client']);
      });
    });

    describe('CoachOrAdminRoute', () => {
      it('allows coach users', () => {
        (useUser as any).mockReturnValue(mockCoachUser);
        (useHasAnyRole as any).mockReturnValue(true);
        
        renderWithProviders(
          <CoachOrAdminRoute>
            <TestComponent />
          </CoachOrAdminRoute>
        );
        
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(useHasAnyRole).toHaveBeenCalledWith(['coach', 'admin']);
      });

      it('allows admin users', () => {
        (useUser as any).mockReturnValue(mockAdminUser);
        (useHasAnyRole as any).mockReturnValue(true);
        
        renderWithProviders(
          <CoachOrAdminRoute>
            <TestComponent />
          </CoachOrAdminRoute>
        );
        
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      it('denies client users', async () => {
        (useUser as any).mockReturnValue(mockUser);
        (useHasAnyRole as any).mockReturnValue(false);
        
        renderWithProviders(
          <CoachOrAdminRoute>
            <TestComponent />
          </CoachOrAdminRoute>
        );
        
        await waitFor(() => {
          expect(screen.getByText('Access Denied')).toBeInTheDocument();
        });
      });
    });

    describe('ClientOrAdminRoute', () => {
      it('allows client users', () => {
        (useUser as any).mockReturnValue(mockUser);
        (useHasAnyRole as any).mockReturnValue(true);
        
        renderWithProviders(
          <ClientOrAdminRoute>
            <TestComponent />
          </ClientOrAdminRoute>
        );
        
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(useHasAnyRole).toHaveBeenCalledWith(['client', 'admin']);
      });

      it('allows admin users', () => {
        (useUser as any).mockReturnValue(mockAdminUser);
        (useHasAnyRole as any).mockReturnValue(true);
        
        renderWithProviders(
          <ClientOrAdminRoute>
            <TestComponent />
          </ClientOrAdminRoute>
        );
        
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles undefined user gracefully', () => {
      (useUser as any).mockReturnValue(undefined);
      (useAuthLoading as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requireAuth={false}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('handles empty permission arrays', () => {
      (useAnyPermission as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requireAnyPermission={[]}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('handles empty role arrays', () => {
      (useHasAnyRole as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requireAnyRole={[]}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('prevents infinite redirects by not redirecting when already loading', () => {
      (useUser as any).mockReturnValue(null);
      (useAuthLoading as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard requireAuth={true}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('maintains stable behavior with rapidly changing auth state', () => {
      const { rerender } = renderWithProviders(
        <RouteGuard requireAuth={true}>
          <TestComponent />
        </RouteGuard>
      );
      
      // Simulate rapid auth state changes
      (useUser as any).mockReturnValue(null);
      (useAuthLoading as any).mockReturnValue(true);
      rerender(
        <RouteGuard requireAuth={true}>
          <TestComponent />
        </RouteGuard>
      );
      
      (useUser as any).mockReturnValue(mockUser);
      (useAuthLoading as any).mockReturnValue(false);
      rerender(
        <RouteGuard requireAuth={true}>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('calls permission hooks consistently to avoid conditional hook calls', () => {
      renderWithProviders(
        <RouteGuard>
          <TestComponent />
        </RouteGuard>
      );
      
      // All hooks should be called even if not needed
      expect(usePermission).toHaveBeenCalled();
      expect(useAnyPermission).toHaveBeenCalled();
      expect(useHasAnyRole).toHaveBeenCalled();
    });

    it('passes empty arrays to hooks when no requirements specified', () => {
      renderWithProviders(
        <RouteGuard>
          <TestComponent />
        </RouteGuard>
      );
      
      expect(usePermission).toHaveBeenCalledWith('');
      expect(useAnyPermission).toHaveBeenCalledWith([]);
      expect(useHasAnyRole).toHaveBeenCalledWith([]);
    });
  });

  describe('Accessibility', () => {
    it('provides accessible error states', async () => {
      (useUser as any).mockReturnValue(mockUser);
      (useHasAnyRole as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requireRole="admin">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        const alert = screen.getByRole('region');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Access Denied');
      });
    });

    it('provides accessible loading states', () => {
      (useAuthLoading as any).mockReturnValue(true);
      
      renderWithProviders(
        <RouteGuard>
          <TestComponent />
        </RouteGuard>
      );
      
      const loadingRegion = screen.getByRole('region');
      expect(loadingRegion).toBeInTheDocument();
      expect(loadingRegion).toHaveTextContent('Loading...');
    });

    it('uses semantic HTML elements', async () => {
      (useUser as any).mockReturnValue(mockUser);
      (useHasAnyRole as any).mockReturnValue(false);
      
      renderWithProviders(
        <RouteGuard requireRole="admin">
          <TestComponent />
        </RouteGuard>
      );
      
      await waitFor(() => {
        // Should use proper card/content structure
        const card = screen.getByRole('region');
        expect(card).toBeInTheDocument();
      });
    });
  });
});