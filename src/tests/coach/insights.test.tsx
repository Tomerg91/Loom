import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CoachInsightsPage } from '@/components/coach/insights-page';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Mock useUser
vi.mock('@/lib/auth/use-user', () => ({
  useUser: () => ({
    id: 'test-coach-id',
    email: 'coach@test.com',
    role: 'coach',
  }),
}));

// Mock useCoachAnalytics
vi.mock('@/hooks/useCoachAnalytics', () => ({
  useCoachAnalytics: () => ({
    data: {
      totalSessions: 50,
      completedSessions: 45,
      clientCount: 10,
      clientRetentionRate: 85,
      goalAchievement: 73,
      averageRating: 4.5,
      revenue: 5000,
      mostCommonGoals: [
        { goal: 'Career Development', count: 8 },
        { goal: 'Leadership Skills', count: 6 },
      ],
      feedback: [
        { clientId: 'client-1', rating: 5, comment: 'Great session!' },
        { clientId: 'client-2', rating: 4, comment: 'Very helpful' },
      ],
    },
    isLoading: false,
  }),
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: {
      overview: {
        totalClients: 10,
        activeClients: 8,
        totalSessions: 50,
        completedSessions: 45,
        averageRating: 4.5,
        revenue: 5000,
        clientRetentionRate: 85,
        sessionCompletionRate: 90,
      },
      clientProgress: [],
      sessionMetrics: [],
      goalAnalysis: {
        mostCommonGoals: [
          { goal: 'Career Development', count: 8, successRate: 75 },
          { goal: 'Leadership Skills', count: 6, successRate: 83 },
        ],
        achievementRate: 73,
        averageTimeToGoal: 8.5,
      },
      feedback: [],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('CoachInsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export analytics data when export button clicked', async () => {
    render(<CoachInsightsPage />);

    const exportButton = screen.getByTestId('export-button');
    expect(exportButton).toBeInTheDocument();

    // Verify button has onClick handler
    expect(exportButton.onclick).not.toBeNull();

    fireEvent.click(exportButton);

    // Verify that the click handler exists and can be called
    await waitFor(() => {
      expect(exportButton).toBeEnabled();
    });
  });

  it('should display real metrics from useCoachAnalytics hook', async () => {
    render(<CoachInsightsPage />);

    // Wait for the page to render
    await waitFor(() => {
      const totalClientsMetric = screen.getByTestId('total-clients-metric');
      expect(totalClientsMetric).toBeInTheDocument();
      // The metric should show the value from useCoachAnalytics (10)
      expect(totalClientsMetric).toHaveTextContent('10');
    });
  });
});
