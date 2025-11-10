import { screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { UnifiedSessionBooking, type UnifiedSessionBookingProps } from '@/components/sessions/unified-session-booking';
import { 
  renderWithProviders, 
  mockFetch, 
 
  createMockQueryResult, 
  createMockMutationResult,
  createMockSession,
  mockUseQuery,
  mockUseMutation,
  mockUseQueryClient,
  mockQueryClient
} from '@/test/utils';

// Mock dependencies
vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn().mockReturnValue({
    id: 'test-user-id',
    firstName: 'Test',
    lastName: 'User',
    role: 'client',
  }),
}));

vi.mock('@/hooks/use-realtime-bookings', () => ({
  useRealtimeBookings: vi.fn(),
}));

vi.mock('@/hooks/use-realtime-booking', () => ({
  useRealtimeBooking: vi.fn().mockReturnValue(null),
}));

// Mock sub-components
vi.mock('@/components/sessions/booking-confirmation-dialog', () => ({
  BookingConfirmationDialog: ({ open, onClose, onConfirm, session }: unknown) =>
    open ? (
      <div data-testid="booking-confirmation-dialog">
        <div data-testid="session-title">{session?.title}</div>
        <button data-testid="confirm-booking" onClick={onConfirm}>
          Confirm
        </button>
        <button data-testid="cancel-booking" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn((name) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    })),
    handleSubmit: vi.fn((fn) => (e?: Event) => {
      e?.preventDefault();
      return fn({
        coachId: 'coach-123',
        date: '2024-01-15',
        timeSlot: '10:00',
        title: 'Test Session',
        description: 'Test session description',
        duration: 60,
      });
    }),
    setValue: vi.fn(),
    watch: vi.fn((field) => {
      const values = {
        coachId: 'coach-123',
        date: '2024-01-15',
        timeSlot: '10:00',
        duration: 60,
      };
      return values[field as keyof typeof values];
    }),
    reset: vi.fn(),
    formState: {
      errors: {},
      isSubmitting: false,
    },
  })),
}));

describe('UnifiedSessionBooking', () => {
  const mockCoaches = [
    {
      id: 'coach-123',
      firstName: 'John',
      lastName: 'Doe',
      avatar: null,
      bio: 'Experienced coach',
      isOnline: true,
      timezone: 'UTC',
    },
    {
      id: 'coach-456',
      firstName: 'Jane',
      lastName: 'Smith',
      avatar: '/avatar.jpg',
      bio: 'Life coach',
      isOnline: false,
      timezone: 'UTC',
    },
  ];

  const mockTimeSlots = [
    {
      startTime: '09:00',
      endTime: '10:00',
      isAvailable: true,
      isBooked: false,
      isBlocked: false,
    },
    {
      startTime: '10:00',
      endTime: '11:00',
      isAvailable: true,
      isBooked: false,
      isBlocked: false,
    },
    {
      startTime: '11:00',
      endTime: '12:00',
      isAvailable: false,
      isBooked: true,
      isBlocked: false,
      clientName: 'Another Client',
      sessionTitle: 'Existing Session',
    },
  ];

  const mockMutate = vi.fn();
  const mockBookingMutation = createMockMutationResult(createMockSession(), {
    mutate: mockMutate,
  });

  const defaultProps: UnifiedSessionBookingProps = {
    onSuccess: vi.fn(),
    variant: 'basic',
  };

  // Mock fetch globally for API calls
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock fetch for API calls
    mockFetch({
      data: mockCoaches,
    });
    
    // Mock useQuery for coaches
    mockUseQuery.mockImplementation(({ queryKey }: unknown) => {
      if (queryKey[0] === 'coaches') {
        return createMockQueryResult(mockCoaches, { isSuccess: true });
      }
      if (queryKey[0] === 'timeSlots') {
        return createMockQueryResult(mockTimeSlots, { isSuccess: true });
      }
      return createMockQueryResult(null);
    });

    // Mock useMutation for booking
    mockUseMutation.mockReturnValue(mockBookingMutation);

    // Mock useQueryClient
    mockUseQueryClient.mockReturnValue(mockQueryClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the booking form with basic configuration', () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: /book session/i })).toBeInTheDocument();
      expect(screen.getByTestId('coach-select')).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByTestId('session-title')).toBeInTheDocument();
    });

    it('shows coach selection dropdown', () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const coachSelect = screen.getByTestId('coach-select');
      expect(coachSelect).toBeInTheDocument();
    });

    it('displays available coaches', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const coachSelect = screen.getByTestId('coach-select');
      await userEvent.click(coachSelect);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('preselects coach when selectedCoachId is provided', () => {
      renderWithProviders(
        <UnifiedSessionBooking {...defaultProps} selectedCoachId="coach-123" />
      );
      
      // The form should be initialized with the selected coach
      expect(screen.getByDisplayValue(/John Doe/i)).toBeInTheDocument();
    });

    it('shows loading state while fetching coaches', () => {
      mockUseQuery.mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'coaches') {
          return createMockQueryResult(null, { isPending: true });
        }
        return createMockQueryResult(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('applies custom title and description when provided', () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          customTitle="Custom Booking"
          customDescription="Custom description"
        />
      );
      
      expect(screen.getByText('Custom Booking')).toBeInTheDocument();
      expect(screen.getByText('Custom description')).toBeInTheDocument();
    });
  });

  describe('Coach Selection', () => {
    beforeEach(() => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
    });

    it('shows coach information when showCoachInfo is enabled', () => {
      renderWithProviders(
        <UnifiedSessionBooking {...defaultProps} showCoachInfo={true} />
      );
      
      // Should show coach bio and online status
      expect(screen.getByText(/Experienced coach/i)).toBeInTheDocument();
      expect(screen.getByText(/online/i)).toBeInTheDocument();
    });

    it('hides coach information when showCoachInfo is disabled', () => {
      renderWithProviders(
        <UnifiedSessionBooking {...defaultProps} showCoachInfo={false} />
      );
      
      expect(screen.queryByText(/Experienced coach/i)).not.toBeInTheDocument();
    });

    it('updates time slots when coach is selected', async () => {
      const user = userEvent.setup();
      const coachSelect = screen.getByTestId('coach-select');
      
      await user.click(coachSelect);
      await user.click(screen.getByText('John Doe'));
      
      // Should trigger time slots query
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['timeSlots', 'coach-123', '2024-01-15', 60],
        })
      );
    });

    it('shows coach online status indicators', () => {
      renderWithProviders(
        <UnifiedSessionBooking {...defaultProps} showCoachInfo={true} />
      );
      
      // John Doe should show as online
      expect(screen.getByText(/online/i)).toBeInTheDocument();
    });
  });

  describe('Date and Time Selection', () => {
    beforeEach(async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const coachSelect = screen.getByTestId('coach-select');
      await user.click(coachSelect);
      await user.click(screen.getByText('John Doe'));
    });

    it('shows date picker', () => {
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('displays available time slots after selecting date', async () => {
      const user = userEvent.setup();
      const dateSelect = screen.getByLabelText(/date/i);
      
      await user.click(dateSelect);
      
      await waitFor(() => {
        expect(screen.getByText(/09:00 - 10:00/)).toBeInTheDocument();
        expect(screen.getByText(/10:00 - 11:00/)).toBeInTheDocument();
      });
    });

    it('disables booked time slots', async () => {
      const user = userEvent.setup();
      const dateSelect = screen.getByLabelText(/date/i);
      
      await user.click(dateSelect);
      
      await waitFor(() => {
        const bookedSlot = screen.getByText(/11:00 - 12:00/);
        expect(bookedSlot.closest('button')).toBeDisabled();
        expect(screen.getByText('Existing Session')).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching time slots', () => {
      mockUseQuery.mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'timeSlots') {
          return createMockQueryResult(null, { isPending: true });
        }
        if (queryKey[0] === 'coaches') {
          return createMockQueryResult(mockCoaches);
        }
        return createMockQueryResult(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('updates available slots based on duration', async () => {
      const user = userEvent.setup();
      const durationSelect = screen.getByLabelText(/duration/i);
      
      await user.click(durationSelect);
      await user.click(screen.getByText(/90/));
      
      // Should refetch time slots with new duration
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['timeSlots', 'coach-123', '2024-01-15', 90],
        })
      );
    });
  });

  describe('Session Details Form', () => {
    it('requires session title', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const titleInput = screen.getByTestId('session-title');
      expect(titleInput).toBeRequired();
    });

    it('allows optional session description', () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const descriptionInput = screen.getByTestId('session-description');
      expect(descriptionInput).not.toBeRequired();
    });

    it('validates required fields before submission', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const submitButton = screen.getByRole('button', { name: /book session/i });
      
      await user.click(submitButton);
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/coach selection is required/i)).toBeInTheDocument();
        expect(screen.getByText(/date is required/i)).toBeInTheDocument();
        expect(screen.getByText(/session title is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Booking Flow', () => {
    it('shows booking confirmation dialog', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const submitButton = screen.getByTestId('book-session-submit');
      
      await user.click(submitButton);
      
      expect(screen.getByTestId('booking-confirmation-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('session-title')).toHaveTextContent('Test Session');
    });

    it('confirms booking and calls API', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const submitButton = screen.getByTestId('book-session-submit');
      
      await user.click(submitButton);
      
      const confirmButton = screen.getByTestId('confirm-booking');
      await user.click(confirmButton);
      
      expect(mockMutate).toHaveBeenCalledWith({
        coachId: 'coach-123',
        date: '2024-01-15',
        timeSlot: '10:00',
        title: 'Test Session',
        description: 'Test session description',
        duration: 60,
      });
    });

    it('cancels booking from confirmation dialog', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const submitButton = screen.getByTestId('book-session-submit');
      
      await user.click(submitButton);
      
      const cancelButton = screen.getByTestId('cancel-booking');
      await user.click(cancelButton);
      
      expect(screen.queryByTestId('booking-confirmation-dialog')).not.toBeInTheDocument();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('calls onSuccess after successful booking', async () => {
      const onSuccess = vi.fn();
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} onSuccess={onSuccess} />);
      
      const user = userEvent.setup();
      const submitButton = screen.getByTestId('book-session-submit');
      
      await user.click(submitButton);
      
      const confirmButton = screen.getByTestId('confirm-booking');
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
          id: expect.any(String),
          title: 'Test Session'
        }));
      });
    });

    it('shows loading state during booking submission', async () => {
      const loadingMutation = createMockMutationResult(null, { 
        mutate: mockMutate, 
        isPending: true 
      });
      mockUseMutation.mockReturnValue(loadingMutation);
      
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const submitButton = screen.getByTestId('book-session-submit');
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('handles booking errors', async () => {
      const errorMutation = createMockMutationResult(null, { 
        mutate: mockMutate,
        isError: true, 
        error: new Error('Booking failed') 
      });
      mockUseMutation.mockReturnValue(errorMutation);
      
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/Booking failed/i)).toBeInTheDocument();
    });
  });

  describe('Session Actions (Existing Sessions)', () => {
    const sessionActions = {
      onStart: vi.fn().mockResolvedValue(undefined),
      onComplete: vi.fn().mockResolvedValue(undefined),
      onCancel: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
      // Mock successful fetch responses for session actions
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true }),
      });
    });

    it('shows session actions for existing sessions', () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          existingSessionId="session-123"
          sessionStatus="scheduled"
          showSessionActions={true}
          sessionActions={sessionActions}
        />
      );
      
      expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel session/i })).toBeInTheDocument();
    });

    it('handles session start action', async () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          existingSessionId="session-123"
          sessionStatus="scheduled"
          showSessionActions={true}
          sessionActions={sessionActions}
        />
      );
      
      const user = userEvent.setup();
      const startButton = screen.getByRole('button', { name: /start session/i });
      
      await user.click(startButton);
      
      expect(sessionActions.onStart).toHaveBeenCalledWith('session-123');
    });

    it('handles session completion action', async () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          existingSessionId="session-123"
          sessionStatus="in_progress"
          showSessionActions={true}
          sessionActions={sessionActions}
        />
      );
      
      const user = userEvent.setup();
      const completeButton = screen.getByRole('button', { name: /complete session/i });
      
      await user.click(completeButton);
      
      expect(sessionActions.onComplete).toHaveBeenCalledWith('session-123', undefined);
    });

    it('handles session cancellation action', async () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          existingSessionId="session-123"
          sessionStatus="scheduled"
          showSessionActions={true}
          sessionActions={sessionActions}
        />
      );
      
      const user = userEvent.setup();
      const cancelButton = screen.getByRole('button', { name: /cancel session/i });
      
      await user.click(cancelButton);
      
      expect(sessionActions.onCancel).toHaveBeenCalledWith('session-123', 'Session cancelled by user');
    });

    it('shows different actions based on session status', () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          existingSessionId="session-123"
          sessionStatus="completed"
          showSessionActions={true}
          sessionActions={sessionActions}
        />
      );
      
      // Completed sessions shouldn't show action buttons
      expect(screen.queryByRole('button', { name: /start session/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /complete session/i })).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty coach list', () => {
      mockUseQuery.mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'coaches') {
          return createMockQueryResult([], { isSuccess: true });
        }
        return createMockQueryResult(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/no coaches available/i)).toBeInTheDocument();
    });

    it('handles no available time slots', () => {
      mockUseQuery.mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'coaches') {
          return createMockQueryResult(mockCoaches, { isSuccess: true });
        }
        if (queryKey[0] === 'timeSlots') {
          return createMockQueryResult([], { isSuccess: true });
        }
        return createMockQueryResult(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/no available time slots/i)).toBeInTheDocument();
    });

    it('handles API errors gracefully', () => {
      mockUseQuery.mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'coaches') {
          return createMockQueryResult(null, { 
            isError: true, 
            error: new Error('Failed to load coaches') 
          });
        }
        return createMockQueryResult(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/Failed to load coaches/i)).toBeInTheDocument();
    });

    it('cleans up on unmount', () => {
      const { unmount } = renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      unmount();
      
      // Should not cause any memory leaks or errors
      // This is more about ensuring no errors are thrown
    });
  });
});
