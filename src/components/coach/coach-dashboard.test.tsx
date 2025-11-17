import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoachDashboard } from './coach-dashboard';
import { useCoachDashboardSubscriptions } from '@/lib/hooks/use-coach-dashboard-subscriptions';
import { useUser } from '@/lib/auth/use-user';
import { renderWithProviders } from '@/test/utils';
import { screen } from '@testing-library/react';
import { mockFetch } from '@/test/utils';

// Unmock TanStack Query to use real implementation with test QueryClient
vi.unmock('@tanstack/react-query');

// Mock dependencies
vi.mock('@/lib/hooks/use-coach-dashboard-subscriptions');
vi.mock('@/lib/auth/use-user');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock child components
vi.mock('@/components/coach/add-client-modal', () => ({
  AddClientModal: () => <div>AddClientModal</div>,
}));
vi.mock('@/components/coach/add-session-modal', () => ({
  AddSessionModal: () => <div>AddSessionModal</div>,
}));
vi.mock('@/components/coach/clients-page', () => ({
  CoachClientsPage: () => <div>CoachClientsPage</div>,
}));
vi.mock('@/components/coach/reflection-space-widget', () => ({
  ReflectionSpaceWidget: () => <div>ReflectionSpaceWidget</div>,
}));
vi.mock('@/components/sessions/session-calendar', () => ({
  SessionCalendar: () => <div>SessionCalendar</div>,
}));
vi.mock('@/components/sessions/session-list', () => ({
  SessionList: () => <div>SessionList</div>,
}));
vi.mock('@/components/coach/empty-state', () => ({
  EmptyState: () => <div>EmptyState</div>,
}));

describe('CoachDashboard', () => {
  beforeEach(() => {
    // Mock fetch for API calls
    mockFetch({
      data: {
        totalSessions: 10,
        completedSessions: 5,
        upcomingSessions: 3,
        totalClients: 8,
        activeClients: 6,
        thisWeekSessions: 2,
        averageRating: 4.5,
        totalRevenue: 1000,
      },
    });

    // Mock useUser
    vi.mocked(useUser).mockReturnValue({
      id: 'coach-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'coach',
    } as any);

    // Mock useCoachDashboardSubscriptions with default connected state
    vi.mocked(useCoachDashboardSubscriptions).mockReturnValue({
      isConnected: true,
      connectionStatus: 'connected',
      subscriptions: [],
    });
  });

  it('should call useCoachDashboardSubscriptions with coach ID', () => {
    renderWithProviders(<CoachDashboard />);

    expect(useCoachDashboardSubscriptions).toHaveBeenCalledWith('coach-123');
  });

  it('should display "Realtime" indicator when connected', () => {
    vi.mocked(useCoachDashboardSubscriptions).mockReturnValue({
      isConnected: true,
      connectionStatus: 'connected',
      subscriptions: [],
    });

    renderWithProviders(<CoachDashboard />);

    expect(screen.getByText('Realtime')).toBeInTheDocument();
  });

  it('should display "Polling" indicator when disconnected', () => {
    vi.mocked(useCoachDashboardSubscriptions).mockReturnValue({
      isConnected: false,
      connectionStatus: 'disconnected',
      subscriptions: [],
    });

    renderWithProviders(<CoachDashboard />);

    expect(screen.getByText('Polling')).toBeInTheDocument();
  });

  it('should display "Connecting..." indicator when reconnecting', () => {
    vi.mocked(useCoachDashboardSubscriptions).mockReturnValue({
      isConnected: false,
      connectionStatus: 'reconnecting',
      subscriptions: [],
    });

    renderWithProviders(<CoachDashboard />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should render the dashboard header', () => {
    renderWithProviders(<CoachDashboard />);

    expect(screen.getByText('coachTitle')).toBeInTheDocument();
  });

  it('should render the tabs', () => {
    renderWithProviders(<CoachDashboard />);

    expect(screen.getByText('tabs.overview')).toBeInTheDocument();
    expect(screen.getByText('tabs.sessions')).toBeInTheDocument();
    expect(screen.getByText('tabs.clients')).toBeInTheDocument();
  });
});
