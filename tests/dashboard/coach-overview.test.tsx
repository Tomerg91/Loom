import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CoachOverview } from '@/modules/dashboard/components/CoachOverview';
import type { CoachOverviewData } from '@/modules/dashboard/types';

const useCoachOverviewMock = vi.fn();

vi.mock('@/modules/dashboard/api/useCoachOverview', () => ({
  useCoachOverview: () => useCoachOverviewMock(),
}));

const baseData: CoachOverviewData = {
  summary: {
    totalClients: 8,
    activeTasks: 5,
    overdueTasks: 1,
    upcomingSessions: 2,
  },
  upcomingSessions: [
    {
      id: 'session-1',
      title: 'Strategy Session',
      scheduledAt: '2025-02-10T10:00:00.000Z',
      durationMinutes: 60,
      status: 'scheduled',
      clientId: 'client-1',
      clientName: 'John Doe',
      meetingUrl: 'https://example.com/session',
    },
  ],
  taskHighlights: [
    {
      id: 'task-1',
      title: 'Review notes',
      clientId: 'client-1',
      clientName: 'John Doe',
      dueDate: '2025-02-12T08:00:00.000Z',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
  ],
  clientProgress: [
    {
      clientId: 'client-1',
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      lastSessionAt: '2025-02-01T09:00:00.000Z',
      activeTasks: 2,
      completionRate: 75,
    },
  ],
  generatedAt: '2025-02-09T12:00:00.000Z',
};

describe('CoachOverview', () => {
  beforeEach(() => {
    useCoachOverviewMock.mockReset();
  });

  it('renders summary metrics and widgets when data is available', () => {
    const refetch = vi.fn();
    useCoachOverviewMock.mockReturnValue({
      data: baseData,
      error: null,
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch,
    });

    render(<CoachOverview locale="en" />);

    expect(screen.getByText('Coach overview')).toBeInTheDocument();
    expect(screen.getByText('Active clients')).toBeInTheDocument();
    expect(screen.getByText('Open tasks')).toBeInTheDocument();
    expect(screen.getByText('Strategy Session')).toBeInTheDocument();
    expect(screen.getByText('Review notes')).toBeInTheDocument();
    expect(screen.getByText('75% complete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows loading skeletons when data is still being fetched', () => {
    useCoachOverviewMock.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    });

    render(<CoachOverview locale="en" />);

    expect(screen.getAllByLabelText(/loading/i).length).toBeGreaterThan(0);
  });

  it('displays an error alert when the query fails', () => {
    useCoachOverviewMock.mockReturnValue({
      data: undefined,
      error: new Error('Test failure'),
      isLoading: false,
      isError: true,
      isRefetching: false,
      refetch: vi.fn(),
    });

    render(<CoachOverview locale="en" />);

    expect(
      screen.getByText(/we couldn't load your overview/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/test failure/i)).toBeInTheDocument();
  });
});
