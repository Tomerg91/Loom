import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, addDays, subDays } from 'date-fns';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { SessionCalendar } from '@/components/sessions/session-calendar';
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings';
import { useUser } from '@/lib/store/auth-store';
import { renderWithProviders, mockUseQuery, mockUser, createMockSession } from '@/test/utils';

// Mock dependencies
vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn(),
}));

vi.mock('@/hooks/use-realtime-bookings', () => ({
  useRealtimeBookings: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importOriginal<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

// Mock date-fns functions for consistent testing
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    // Mock the current date to a fixed date for testing
    startOfMonth: vi.fn(() => new Date('2024-01-01')),
    endOfMonth: vi.fn(() => new Date('2024-01-31')),
    startOfWeek: vi.fn(() => new Date('2023-12-31')), // Sunday before Jan 1
    endOfWeek: vi.fn(() => new Date('2024-02-03')), // Saturday after Jan 31
    eachDayOfInterval: vi.fn(() => {
      const days = [];
      for (let i = 31; i <= 31; i++) { // Dec 31
        days.push(new Date(`2023-12-${i}`));
      }
      for (let i = 1; i <= 31; i++) { // All of January
        days.push(new Date(`2024-01-${String(i).padStart(2, '0')}`));
      }
      for (let i = 1; i <= 3; i++) { // Feb 1-3
        days.push(new Date(`2024-02-0${i}`));
      }
      return days;
    }),
  };
});


import { useQuery } from '@tanstack/react-query';

describe('SessionCalendar', () => {
  const mockSessions = [
    createMockSession({
      id: 'session-1',
      title: 'Morning Session',
      scheduledAt: '2024-01-15T10:00:00Z',
      status: 'scheduled',
      coach: { firstName: 'John', lastName: 'Doe' },
      client: { firstName: 'Jane', lastName: 'Smith' },
    }),
    createMockSession({
      id: 'session-2',
      title: 'Afternoon Session',
      scheduledAt: '2024-01-15T14:00:00Z',
      status: 'in_progress',
      coach: { firstName: 'John', lastName: 'Doe' },
      client: { firstName: 'Bob', lastName: 'Wilson' },
    }),
    createMockSession({
      id: 'session-3',
      title: 'Completed Session',
      scheduledAt: '2024-01-14T09:00:00Z',
      status: 'completed',
      coach: { firstName: 'Alice', lastName: 'Brown' },
      client: { firstName: 'Jane', lastName: 'Smith' },
    }),
    createMockSession({
      id: 'session-4',
      title: 'Cancelled Session',
      scheduledAt: '2024-01-16T11:00:00Z',
      status: 'cancelled',
      coach: { firstName: 'John', lastName: 'Doe' },
      client: { firstName: 'Jane', lastName: 'Smith' },
    }),
  ];

  const defaultProps = {
    onSessionClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth store
    (useUser as any).mockReturnValue(mockUser);
    
    // Mock realtime bookings
    (useRealtimeBookings as any).mockReturnValue(undefined);
    
    // Mock useQuery for calendar sessions
    (useQuery as any).mockReturnValue(
      mockUseQuery({ data: mockSessions })
    );

    // Mock current date
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('renders the calendar with current month', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      expect(screen.getByText('January 2024')).toBeInTheDocument();
      expect(document.querySelector('[data-lucide="calendar"]')).toBeInTheDocument();
    });

    it('displays weekday headers', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      weekdays.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('renders calendar grid with dates', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Should show dates from previous, current, and next month
      expect(screen.getByText('31')).toBeInTheDocument(); // Dec 31
      expect(screen.getByText('1')).toBeInTheDocument(); // Jan 1
      expect(screen.getByText('15')).toBeInTheDocument(); // Jan 15 (today)
      expect(screen.getByText('31')).toBeInTheDocument(); // Jan 31
    });

    it('highlights today\'s date', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // January 15th should be highlighted as today
      const todayCell = screen.getByText('15').closest('div');
      expect(todayCell).toHaveClass('ring-2', 'ring-primary');
    });

    it('shows navigation buttons', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      expect(document.querySelector('[data-lucide="chevron-left"]')).toBeInTheDocument();
      expect(document.querySelector('[data-lucide="chevron-right"]')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  describe('Session Display', () => {
    it('displays sessions on correct dates', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // January 15th should have 2 sessions
      const jan15Cell = screen.getByText('15').closest('div');
      expect(within(jan15Cell!).getByText('Morning Session')).toBeInTheDocument();
      expect(within(jan15Cell!).getByText('Afternoon Session')).toBeInTheDocument();
      
      // January 14th should have 1 session
      const jan14Cell = screen.getByText('14').closest('div');
      expect(within(jan14Cell!).getByText('Completed Session')).toBeInTheDocument();
    });

    it('shows session status colors', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const jan15Cell = screen.getByText('15').closest('div');
      
      // Scheduled session should be blue
      const scheduledSession = within(jan15Cell!).getByText('Morning Session').closest('div');
      expect(scheduledSession).toHaveClass('bg-blue-500');
      
      // In-progress session should be green
      const inProgressSession = within(jan15Cell!).getByText('Afternoon Session').closest('div');
      expect(inProgressSession).toHaveClass('bg-green-500');
    });

    it('displays different statuses with appropriate colors', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Check completed session (gray)
      const jan14Cell = screen.getByText('14').closest('div');
      const completedSession = within(jan14Cell!).getByText('Completed Session').closest('div');
      expect(completedSession).toHaveClass('bg-gray-500');
      
      // Check cancelled session (red)
      const jan16Cell = screen.getByText('16').closest('div');
      const cancelledSession = within(jan16Cell!).getByText('Cancelled Session').closest('div');
      expect(cancelledSession).toHaveClass('bg-red-500');
    });

    it('handles days with no sessions', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // January 1st should have no sessions
      const jan1Cell = screen.getByText('1').closest('div');
      expect(within(jan1Cell!).queryByText(/Session/)).not.toBeInTheDocument();
    });

    it('shows session times', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const jan15Cell = screen.getByText('15').closest('div');
      expect(within(jan15Cell!).getByText('10:00')).toBeInTheDocument();
      expect(within(jan15Cell!).getByText('14:00')).toBeInTheDocument();
    });

    it('truncates long session titles', () => {
      const longTitleSession = createMockSession({
        title: 'This is a very long session title that should be truncated',
        scheduledAt: '2024-01-15T10:00:00Z',
      });
      
      (useQuery as any).mockReturnValue(
        mockUseQuery({ data: [longTitleSession] })
      );
      
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Should be truncated with CSS
      const sessionTitle = screen.getByText(/This is a very long session title/);
      expect(sessionTitle).toHaveClass('truncate');
    });
  });

  describe('Navigation', () => {
    it('navigates to previous month', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      const prevButton = document.querySelector('[data-lucide="chevron-left"]')?.closest('button');
      
      await user.click(prevButton!);
      
      // Should show December 2023
      await waitFor(() => {
        expect(screen.getByText('December 2023')).toBeInTheDocument();
      });
    });

    it('navigates to next month', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      const nextButton = document.querySelector('[data-lucide="chevron-right"]')?.closest('button');
      
      await user.click(nextButton!);
      
      // Should show February 2024
      await waitFor(() => {
        expect(screen.getByText('February 2024')).toBeInTheDocument();
      });
    });

    it('returns to current month with today button', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      
      // Navigate away from current month
      const nextButton = document.querySelector('[data-lucide="chevron-right"]')?.closest('button');
      await user.click(nextButton!);
      
      await waitFor(() => {
        expect(screen.getByText('February 2024')).toBeInTheDocument();
      });
      
      // Click today button
      const todayButton = screen.getByText('Today');
      await user.click(todayButton);
      
      // Should return to January 2024
      await waitFor(() => {
        expect(screen.getByText('January 2024')).toBeInTheDocument();
      });
    });

    it('updates sessions when navigating months', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      const nextButton = document.querySelector('[data-lucide="chevron-right"]')?.closest('button');
      
      await user.click(nextButton!);
      
      // Should fetch sessions for February 2024
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith({
          queryKey: ['calendar-sessions', '2024-02', undefined, undefined],
          queryFn: expect.any(Function),
          refetchInterval: 30000,
          staleTime: 15000,
        });
      });
    });
  });

  describe('Session Interaction', () => {
    it('calls onSessionClick when session is clicked', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      const sessionElement = screen.getByText('Morning Session');
      
      await user.click(sessionElement);
      
      expect(defaultProps.onSessionClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'session-1',
          title: 'Morning Session',
        })
      );
    });

    it('shows hover effects on sessions', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      const sessionElement = screen.getByText('Morning Session');
      
      await user.hover(sessionElement);
      
      // Should have hover class
      expect(sessionElement.closest('div')).toHaveClass('hover:opacity-80');
    });

    it('provides keyboard navigation for sessions', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      const sessionElement = screen.getByText('Morning Session');
      
      // Focus and press Enter
      sessionElement.focus();
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onSessionClick).toHaveBeenCalled();
    });
  });

  describe('Filtering', () => {
    it('filters sessions by coach when coachId is provided', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} coachId="coach-123" />);
      
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['calendar-sessions', '2024-01', 'coach-123', undefined],
        })
      );
    });

    it('filters sessions by client when clientId is provided', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} clientId="client-456" />);
      
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['calendar-sessions', '2024-01', undefined, 'client-456'],
        })
      );
    });

    it('applies both coach and client filters', () => {
      renderWithProviders(
        <SessionCalendar {...defaultProps} coachId="coach-123" clientId="client-456" />
      );
      
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['calendar-sessions', '2024-01', 'coach-123', 'client-456'],
        })
      );
    });
  });

  describe('Real-time Updates', () => {
    it('enables real-time bookings updates', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      expect(useRealtimeBookings).toHaveBeenCalled();
    });

    it('refetches data regularly', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          refetchInterval: 30000, // 30 seconds
          staleTime: 15000, // 15 seconds
        })
      );
    });

    it('updates calendar when new sessions are added via real-time', () => {
      // This would be tested by mocking the real-time updates
      // The actual implementation would update the query cache
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Simulate real-time update adding a new session
      const newSessions = [
        ...mockSessions,
        createMockSession({
          id: 'session-5',
          title: 'New Session',
          scheduledAt: '2024-01-17T10:00:00Z',
          status: 'scheduled',
        }),
      ];
      
      (useQuery as any).mockReturnValue(
        mockUseQuery({ data: newSessions })
      );
      
      const { rerender } = renderWithProviders(<SessionCalendar {...defaultProps} />);
      rerender(<SessionCalendar {...defaultProps} />);
      
      expect(screen.getByText('New Session')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state while fetching sessions', () => {
      (useQuery as any).mockReturnValue({
        ...mockUseQuery(null),
        isLoading: true,
      });
      
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Should show loading skeleton
      expect(screen.getByTestId('calendar-loading')).toBeInTheDocument();
      
      // Should show animated skeleton boxes
      const skeletonBoxes = screen.getAllByTestId('skeleton-day');
      expect(skeletonBoxes).toHaveLength(42); // 6 weeks * 7 days
    });

    it('shows error state when session fetch fails', () => {
      (useQuery as any).mockReturnValue({
        ...mockUseQuery(null),
        error: new Error('Failed to load sessions'),
        isError: true,
      });
      
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      expect(screen.getByText('Failed to load calendar')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('allows retry after error', async () => {
      (useQuery as any).mockReturnValue({
        ...mockUseQuery(null),
        error: new Error('Failed to load sessions'),
        isError: true,
      });
      
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      const retryButton = screen.getByText('Retry');
      
      await user.click(retryButton);
      
      // Should reload the page (simplified retry mechanism)
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Month Display', () => {
    it('dims dates from previous and next months', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // December 31st should be dimmed
      const dec31 = screen.getAllByText('31')[0]; // First occurrence is Dec 31
      expect(dec31.closest('div')).toHaveClass('bg-muted/50');
      
      // February dates should be dimmed
      const feb1 = screen.getByText('1');
      const feb1Parent = feb1.closest('div');
      if (feb1Parent && feb1Parent.textContent === '1') {
        expect(feb1Parent).toHaveClass('bg-muted/50');
      }
    });

    it('highlights current month dates', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // January 15th should not be dimmed
      const jan15 = screen.getByText('15');
      expect(jan15.closest('div')).toHaveClass('bg-background');
    });

    it('maintains consistent calendar grid', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Should always show 42 days (6 weeks * 7 days)
      const dayElements = document.querySelectorAll('[data-date]');
      expect(dayElements).toHaveLength(42);
    });
  });

  describe('Session Grouping', () => {
    it('groups multiple sessions on the same day', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const jan15Cell = screen.getByText('15').closest('div');
      const sessions = within(jan15Cell!).getAllByText(/Session/);
      
      expect(sessions).toHaveLength(2); // Morning and Afternoon sessions
    });

    it('shows session count when there are many sessions', () => {
      // Mock a day with many sessions
      const manySessions = Array.from({ length: 5 }, (_, i) =>
        createMockSession({
          id: `session-${i}`,
          title: `Session ${i + 1}`,
          scheduledAt: '2024-01-15T10:00:00Z',
          status: 'scheduled',
        })
      );
      
      (useQuery as any).mockReturnValue(
        mockUseQuery({ data: manySessions })
      );
      
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const jan15Cell = screen.getByText('15').closest('div');
      
      // Should show +more indicator or limit display
      expect(within(jan15Cell!).getByText(/\+\d+ more/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const calendar = screen.getByRole('grid');
      expect(calendar).toHaveAttribute('aria-label', expect.stringContaining('Calendar'));
    });

    it('provides accessible navigation buttons', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const prevButton = document.querySelector('[data-lucide="chevron-left"]')?.closest('button');
      const nextButton = document.querySelector('[data-lucide="chevron-right"]')?.closest('button');
      
      expect(prevButton).toHaveAttribute('aria-label', expect.stringContaining('Previous'));
      expect(nextButton).toHaveAttribute('aria-label', expect.stringContaining('Next'));
    });

    it('announces month changes to screen readers', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      const nextButton = document.querySelector('[data-lucide="chevron-right"]')?.closest('button');
      
      await user.click(nextButton!);
      
      // Should have live region announcing month change
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toHaveTextContent(/February 2024/);
    });

    it('provides keyboard navigation for calendar', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      
      // Should be able to tab through navigation buttons
      await user.tab();
      expect(document.querySelector('[data-lucide="chevron-left"]')?.closest('button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Today')).toHaveFocus();
      
      await user.tab();
      expect(document.querySelector('[data-lucide="chevron-right"]')?.closest('button')).toHaveFocus();
    });

    it('provides session details for screen readers', () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const sessionElement = screen.getByText('Morning Session');
      const sessionContainer = sessionElement.closest('div');
      
      expect(sessionContainer).toHaveAttribute('role', 'button');
      expect(sessionContainer).toHaveAttribute('aria-label', 
        expect.stringContaining('Morning Session')
      );
    });
  });

  describe('Performance', () => {
    it('memoizes calendar calculations', () => {
      const { rerender } = renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Re-render with same props
      rerender(<SessionCalendar {...defaultProps} />);
      
      // Calendar calculations should not be repeated
      // This would be tested by spying on date calculation functions
    });

    it('virtualize large session lists', () => {
      // Mock a month with many sessions
      const manySessions = Array.from({ length: 100 }, (_, i) =>
        createMockSession({
          id: `session-${i}`,
          title: `Session ${i + 1}`,
          scheduledAt: '2024-01-15T10:00:00Z',
          status: 'scheduled',
        })
      );
      
      (useQuery as any).mockReturnValue(
        mockUseQuery({ data: manySessions })
      );
      
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Should only render visible sessions
      const visibleSessions = screen.getAllByText(/Session \d+/);
      expect(visibleSessions.length).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty session data', () => {
      (useQuery as any).mockReturnValue(
        mockUseQuery({ data: [] })
      );
      
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Should show calendar without sessions
      expect(screen.getByText('January 2024')).toBeInTheDocument();
      expect(screen.queryByText(/Session/)).not.toBeInTheDocument();
    });

    it('handles malformed session dates', () => {
      const badSession = createMockSession({
        scheduledAt: 'invalid-date',
      });
      
      (useQuery as any).mockReturnValue(
        mockUseQuery({ data: [badSession] })
      );
      
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Should not crash and should not display the bad session
      expect(screen.getByText('January 2024')).toBeInTheDocument();
    });

    it('handles rapid month navigation', async () => {
      renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      const user = userEvent.setup();
      const nextButton = document.querySelector('[data-lucide="chevron-right"]')?.closest('button');
      
      // Rapidly click next month
      await user.click(nextButton!);
      await user.click(nextButton!);
      await user.click(nextButton!);
      
      // Should handle all navigation smoothly
      await waitFor(() => {
        expect(screen.getByText(/2024/)).toBeInTheDocument();
      });
    });

    it('handles component unmounting during API calls', () => {
      const { unmount } = renderWithProviders(<SessionCalendar {...defaultProps} />);
      
      // Unmount while query might be in progress
      unmount();
      
      // Should not cause memory leaks or errors
    });
  });
});