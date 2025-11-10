import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { renderWithProviders, mockUser, mockCoachUser, mockAdminUser, createTestQueryClient } from '@/test/utils';
import { useUser, useAuthLoading } from '@/lib/store/auth-store';

// Mock the auth store
vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn(),
  useAuthLoading: vi.fn(),
}));

// Mock the dashboard components
vi.mock('@/components/dashboard/admin/admin-dashboard', () => ({
  AdminDashboard: ({ userId, locale }: { userId: string; locale: string }) => (
    <div data-testid="admin-dashboard">
      <div>Admin Dashboard - User: {userId}, Locale: {locale}</div>
    </div>
  ),
}));

vi.mock('@/components/dashboard/coach/coach-dashboard', () => ({
  CoachDashboard: ({ userId, locale, userName }: { userId: string; locale: string; userName: string }) => (
    <div data-testid="coach-dashboard">
      <div>Coach Dashboard - User: {userName}</div>
    </div>
  ),
}));

vi.mock('@/components/dashboard/client/client-dashboard', () => ({
  ClientDashboard: ({ userId, locale }: { userId: string; locale: string }) => (
    <div data-testid="client-dashboard">
      <div>Client Dashboard</div>
    </div>
  ),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'dashboard.welcome': 'Welcome back, {name}!',
      'dashboard.subtitle': "Here's what's happening with your coaching journey",
      'dashboard.roles.admin': 'Administrator',
      'dashboard.roles.coach': 'Coach',
      'dashboard.roles.client': 'Client',
      'dashboard.adminPlaceholder.title': 'Administrator dashboard',
      'dashboard.adminPlaceholder.body': 'We are working on a dedicated experience for administrators...',
      'common.loading': 'Loading...',
      'dashboard.loadError': 'Error loading dashboard',
    };
    return translations[key] || key;
  },
}));

describe('DashboardContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Admin Role', () => {
    it('renders AdminDashboard when user is admin', async () => {
      (useUser as any).mockReturnValue(mockAdminUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('coach-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('client-dashboard')).not.toBeInTheDocument();
    });

    it('displays admin welcome message for admin user', async () => {
      (useUser as any).mockReturnValue(mockAdminUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Test/)).toBeInTheDocument();
      });
    });

    it('displays Administrator badge for admin user', async () => {
      (useUser as any).mockReturnValue(mockAdminUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByText('Administrator')).toBeInTheDocument();
      });
    });
  });

  describe('Coach Role', () => {
    it('renders CoachDashboard when user is coach', async () => {
      (useUser as any).mockReturnValue(mockCoachUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByTestId('coach-dashboard')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('client-dashboard')).not.toBeInTheDocument();
    });

    it('displays Coach badge for coach user', async () => {
      (useUser as any).mockReturnValue(mockCoachUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByText('Coach')).toBeInTheDocument();
      });
    });
  });

  describe('Client Role', () => {
    it('renders ClientDashboard when user is client', async () => {
      (useUser as any).mockReturnValue(mockUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByTestId('client-dashboard')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('coach-dashboard')).not.toBeInTheDocument();
    });

    it('displays Client badge for client user', async () => {
      (useUser as any).mockReturnValue(mockUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByText('Client')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('displays loading state while auth is loading', () => {
      (useUser as any).mockReturnValue(null);
      (useAuthLoading as any).mockReturnValue(true);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not render any dashboard component while loading', () => {
      (useUser as any).mockReturnValue(null);
      (useAuthLoading as any).mockReturnValue(true);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('coach-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('client-dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when user is not found after loading', () => {
      (useUser as any).mockReturnValue(null);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
    });
  });

  describe('Header Display', () => {
    it('displays page title for admin user', async () => {
      (useUser as any).mockReturnValue(mockAdminUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Test/)).toBeInTheDocument();
      });
    });

    it('displays subtitle message', async () => {
      (useUser as any).mockReturnValue(mockAdminUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByText(/Here's what's happening/)).toBeInTheDocument();
      });
    });
  });

  describe('Props Passing', () => {
    it('passes userId and locale to AdminDashboard', async () => {
      (useUser as any).mockReturnValue(mockAdminUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByText(`Admin Dashboard - User: ${mockAdminUser.id}, Locale: en`)).toBeInTheDocument();
      });
    });

    it('passes userName to CoachDashboard', async () => {
      (useUser as any).mockReturnValue(mockCoachUser);
      (useAuthLoading as any).mockReturnValue(false);

      renderWithProviders(
        <DashboardContent locale="en" />,
        { queryClient: createTestQueryClient() }
      );

      await waitFor(() => {
        expect(screen.getByText(`Coach Dashboard - User: ${mockCoachUser.firstName} ${mockCoachUser.lastName}`)).toBeInTheDocument();
      });
    });
  });
});
