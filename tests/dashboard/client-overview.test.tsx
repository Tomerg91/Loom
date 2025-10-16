import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientOverview } from '@/modules/dashboard/components/ClientOverview';
import type { ClientOverviewData } from '@/modules/dashboard/types';

const useClientOverviewMock = vi.fn();

vi.mock('@/modules/dashboard/api/useClientOverview', () => ({
  useClientOverview: () => useClientOverviewMock(),
}));

const baseData: ClientOverviewData = {
  summary: {
    upcomingSessions: 2,
    activeTasks: 3,
    goalsInProgress: 1,
    completedGoals: 4,
  },
  upcomingSessions: [
    {
      id: 'session-1',
      title: 'Somatic Breathwork',
      scheduledAt: '2025-02-11T10:00:00.000Z',
      durationMinutes: 60,
      status: 'scheduled',
      coachId: 'coach-1',
      coachName: 'Coach Carter',
      meetingUrl: 'https://example.com/session',
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Complete reflection',
      dueDate: '2025-02-12T08:00:00.000Z',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      coachId: 'coach-1',
      coachName: 'Coach Carter',
    },
  ],
  goals: [
    {
      id: 'goal-1',
      title: 'Increase daily breathing practice',
      status: 'active',
      progressPercentage: 45,
      priority: 'medium',
      targetDate: '2025-03-01',
    },
  ],
  generatedAt: '2025-02-10T12:00:00.000Z',
};

describe('ClientOverview', () => {
  beforeEach(() => {
    useClientOverviewMock.mockReset();
  });

  it('renders summary metrics and widgets when data is available', () => {
    const refetch = vi.fn();
    useClientOverviewMock.mockReturnValue({
      data: baseData,
      error: null,
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch,
    });

    render(<ClientOverview locale="en" />);

    expect(screen.getByText('Client overview')).toBeInTheDocument();
    expect(screen.getAllByText('Upcoming sessions').length).toBeGreaterThan(0);
    expect(screen.getByText('My tasks')).toBeInTheDocument();
    expect(
      screen.getByText("What's scheduled with your coach")
    ).toBeInTheDocument();
    expect(screen.getByText('Somatic Breathwork')).toBeInTheDocument();
    expect(screen.getByText('Complete reflection')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows loading skeletons when data is still being fetched', () => {
    useClientOverviewMock.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    });

    render(<ClientOverview locale="en" />);

    expect(screen.getAllByLabelText(/loading/i).length).toBeGreaterThan(0);
  });

  it('displays an error alert when the query fails', () => {
    useClientOverviewMock.mockReturnValue({
      data: undefined,
      error: new Error('Client test failure'),
      isLoading: false,
      isError: true,
      isRefetching: false,
      refetch: vi.fn(),
    });

    render(<ClientOverview locale="en" />);

    expect(
      screen.getByText(/we couldn't load your overview/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/client test failure/i)).toBeInTheDocument();
  });
});
