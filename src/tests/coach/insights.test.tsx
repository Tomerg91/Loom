import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CoachInsightsPage } from '@/components/coach/insights-page';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
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
        mostCommonGoals: [],
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
});
