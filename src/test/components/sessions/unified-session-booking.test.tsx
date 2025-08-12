import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockFetch, mockApiResponse, mockUseQuery, mockUseMutation, createMockSession } from '@/test/utils';
import { UnifiedSessionBooking, type UnifiedSessionBookingProps } from '@/components/sessions/unified-session-booking';

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

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

// Mock sub-components
vi.mock('@/components/sessions/booking-confirmation-dialog', () => ({
  BookingConfirmationDialog: ({ open, onClose, onConfirm, sessionData }: any) =>
    open ? (
      <div data-testid="booking-confirmation-dialog">
        <div data-testid="session-title">{sessionData?.title}</div>
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
    handleSubmit: vi.fn((fn) => (e) => {
      e?.preventDefault();
      return fn({
        coachId: 'coach-123',
        date: '2024-01-15',
        timeSlot: '10:00-11:00',
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
        timeSlot: '10:00-11:00',
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

// Import mocked dependencies
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

  const mockBookingMutation = mockUseMutation(createMockSession());

  const defaultProps: UnifiedSessionBookingProps = {
    onSuccess: vi.fn(),
    variant: 'basic',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useQuery for coaches
    (useQuery as any).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'coaches') {
        return mockUseQuery({ data: mockCoaches });
      }
      if (queryKey[0] === 'timeSlots') {
        return mockUseQuery(mockTimeSlots);
      }
      return mockUseQuery(null);
    });

    // Mock useMutation for booking
    (useMutation as any).mockReturnValue(mockBookingMutation);

    // Mock useQueryClient
    (useQueryClient as any).mockReturnValue({
      invalidateQueries: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the booking form with basic configuration', () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/booking.title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/coach/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/session title/i)).toBeInTheDocument();
    });

    it('shows coach selection dropdown', () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const coachSelect = screen.getByRole('combobox', { name: /coach/i });
      expect(coachSelect).toBeInTheDocument();
    });

    it('displays available coaches', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const coachSelect = screen.getByRole('combobox', { name: /coach/i });
      await userEvent.click(coachSelect);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('preselects coach when selectedCoachId is provided', () => {
      renderWithProviders(
        <UnifiedSessionBooking {...defaultProps} selectedCoachId="coach-123" />
      );
      
      // The form should be initialized with the selected coach
      expect(screen.getByDisplayValue(/John Doe/i)).toBeInTheDocument();
    });

    it('shows loading state while fetching coaches', () => {
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'coaches') {
          return { ...mockUseQuery(null), isLoading: true };
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByTestId('coaches-loading')).toBeInTheDocument();
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

    it('displays coach availability status', async () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          variant="enhanced"
          showAvailabilityStatus={true}
        />
      );
      
      const user = userEvent.setup();
      const coachSelect = screen.getByRole('combobox', { name: /coach/i });
      await user.selectOptions(coachSelect, 'coach-123');
      
      // Should show availability information
      expect(screen.getByText(/available slots/i)).toBeInTheDocument();
    });

    it('updates time slots when coach is selected', async () => {
      const user = userEvent.setup();
      const coachSelect = screen.getByRole('combobox', { name: /coach/i });
      
      await user.selectOptions(coachSelect, 'coach-123');
      
      // Should trigger time slots query
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['timeSlots', 'coach-123', '', 60],
        })
      );
    });

    it('shows coach online status indicators', () => {
      renderWithProviders(
        <UnifiedSessionBooking {...defaultProps} showCoachInfo={true} />
      );
      
      // John Doe should show as online
      expect(screen.getByText(/online/i)).toBeInTheDocument();
      
      // Jane Smith should show as offline (if displayed)
      // This would depend on how the component renders offline coaches
    });
  });

  describe('Date and Time Selection', () => {
    beforeEach(async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const coachSelect = screen.getByRole('combobox', { name: /coach/i });
      await user.selectOptions(coachSelect, 'coach-123');
    });

    it('shows date picker', () => {
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('displays available time slots after selecting date', async () => {
      const user = userEvent.setup();
      const dateInput = screen.getByLabelText(/date/i);
      
      await user.type(dateInput, '2024-01-15');
      
      await waitFor(() => {
        expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
        expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
      });
    });

    it('disables booked time slots', async () => {
      const user = userEvent.setup();
      const dateInput = screen.getByLabelText(/date/i);
      
      await user.type(dateInput, '2024-01-15');
      
      await waitFor(() => {
        const bookedSlot = screen.getByText('11:00 - 12:00');
        expect(bookedSlot).toHaveClass('disabled');
        expect(screen.getByText('Existing Session')).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching time slots', () => {
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'timeSlots') {
          return { ...mockUseQuery(null), isLoading: true };
        }
        if (queryKey[0] === 'coaches') {
          return mockUseQuery({ data: mockCoaches });
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByTestId('timeslots-loading')).toBeInTheDocument();
    });

    it('updates available slots based on duration', async () => {
      const user = userEvent.setup();
      const durationSelect = screen.getByLabelText(/duration/i);
      
      await user.selectOptions(durationSelect, '90');
      
      // Should refetch time slots with new duration
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['timeSlots', 'coach-123', '', 90],
        })
      );
    });
  });

  describe('Session Details Form', () => {
    it('requires session title', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const titleInput = screen.getByLabelText(/session title/i);
      expect(titleInput).toBeRequired();
    });

    it('allows optional session description', () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).not.toBeRequired();
    });

    it('shows character limit for description', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const descriptionInput = screen.getByLabelText(/description/i);
      
      const longText = 'a'.repeat(400);
      await user.type(descriptionInput, longText);
      
      expect(screen.getByText(/400.*500/)).toBeInTheDocument();
    });

    it('prevents exceeding character limits', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const titleInput = screen.getByLabelText(/session title/i);
      
      const longTitle = 'a'.repeat(150);
      await user.type(titleInput, longTitle);
      
      // Should be truncated to 100 characters
      expect(titleInput).toHaveValue('a'.repeat(100));
    });

    it('validates required fields before submission', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const submitButton = screen.getByRole('button', { name: /book session/i });
      
      await user.click(submitButton);
      
      // Should show validation errors
      expect(screen.getByText(/coach selection is required/i)).toBeInTheDocument();
      expect(screen.getByText(/date is required/i)).toBeInTheDocument();
      expect(screen.getByText(/session title is required/i)).toBeInTheDocument();
    });
  });

  describe('Booking Flow', () => {
    const completeBookingSetup = async () => {
      const user = userEvent.setup();
      
      // Select coach
      const coachSelect = screen.getByRole('combobox', { name: /coach/i });
      await user.selectOptions(coachSelect, 'coach-123');
      
      // Select date
      const dateInput = screen.getByLabelText(/date/i);
      await user.type(dateInput, '2024-01-15');
      
      // Select time slot
      await waitFor(() => {
        const timeSlot = screen.getByText('09:00 - 10:00');
        return user.click(timeSlot);
      });
      
      // Fill session details
      const titleInput = screen.getByLabelText(/session title/i);
      await user.type(titleInput, 'Test Session');
      
      return user;
    };

    it('shows booking confirmation dialog', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = await completeBookingSetup();
      const submitButton = screen.getByRole('button', { name: /book session/i });
      
      await user.click(submitButton);
      
      expect(screen.getByTestId('booking-confirmation-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('session-title')).toHaveTextContent('Test Session');
    });

    it('confirms booking and calls API', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = await completeBookingSetup();
      const submitButton = screen.getByRole('button', { name: /book session/i });
      
      await user.click(submitButton);
      
      const confirmButton = screen.getByTestId('confirm-booking');
      await user.click(confirmButton);
      
      expect(mockBookingMutation.mutate).toHaveBeenCalledWith({
        coachId: 'coach-123',
        date: '2024-01-15',
        timeSlot: '09:00-10:00',
        title: 'Test Session',
        description: '',
        duration: 60,
      });
    });

    it('cancels booking from confirmation dialog', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = await completeBookingSetup();
      const submitButton = screen.getByRole('button', { name: /book session/i });
      
      await user.click(submitButton);
      
      const cancelButton = screen.getByTestId('cancel-booking');
      await user.click(cancelButton);
      
      expect(screen.queryByTestId('booking-confirmation-dialog')).not.toBeInTheDocument();
      expect(mockBookingMutation.mutate).not.toHaveBeenCalled();
    });

    it('calls onSuccess after successful booking', async () => {
      const onSuccess = vi.fn();
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} onSuccess={onSuccess} />);
      
      const user = await completeBookingSetup();
      const submitButton = screen.getByRole('button', { name: /book session/i });
      
      await user.click(submitButton);
      
      const confirmButton = screen.getByTestId('confirm-booking');
      await user.click(confirmButton);
      
      // Simulate successful mutation
      mockBookingMutation.onSuccess?.(createMockSession());
      
      expect(onSuccess).toHaveBeenCalledWith(createMockSession());
    });

    it('shows loading state during booking submission', async () => {
      const loadingMutation = { ...mockBookingMutation, isPending: true };
      (useMutation as any).mockReturnValue(loadingMutation);
      
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = await completeBookingSetup();
      const submitButton = screen.getByRole('button', { name: /book session/i });
      
      await user.click(submitButton);
      
      expect(screen.getByText(/booking/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('handles booking errors', async () => {
      const errorMutation = { 
        ...mockBookingMutation, 
        isError: true, 
        error: new Error('Booking failed') 
      };
      (useMutation as any).mockReturnValue(errorMutation);
      
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      await completeBookingSetup();
      
      expect(screen.getByText(/Booking failed/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Features', () => {
    it('enables real-time updates for enhanced variant', () => {
      renderWithProviders(
        <UnifiedSessionBooking {...defaultProps} variant="enhanced" />
      );
      
      // Should use realtime booking hook
      expect(require('@/hooks/use-realtime-booking').useRealtimeBooking).toHaveBeenCalled();
    });

    it('shows connection status when enabled', () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          variant="realtime"
          showConnectionStatus={true}
        />
      );
      
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('displays last refresh time', () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          variant="enhanced"
          showAvailabilityStatus={true}
        />
      );
      
      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });

    it('allows manual refresh of availability', async () => {
      const queryClient = { invalidateQueries: vi.fn() };
      (useQueryClient as any).mockReturnValue(queryClient);
      
      renderWithProviders(
        <UnifiedSessionBooking {...defaultProps} variant="enhanced" />
      );
      
      const user = userEvent.setup();
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      await user.click(refreshButton);
      
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(['timeSlots']);
    });
  });

  describe('Session Actions (Existing Sessions)', () => {
    const sessionActions = {
      onStart: vi.fn().mockResolvedValue(undefined),
      onComplete: vi.fn().mockResolvedValue(undefined),
      onCancel: vi.fn().mockResolvedValue(undefined),
    };

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
      
      expect(sessionActions.onComplete).toHaveBeenCalledWith('session-123');
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
      
      expect(sessionActions.onCancel).toHaveBeenCalledWith('session-123');
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

  describe('Optimistic Updates', () => {
    it('applies optimistic updates when enabled', async () => {
      renderWithProviders(
        <UnifiedSessionBooking
          {...defaultProps}
          enableOptimisticUpdates={true}
        />
      );
      
      const user = await completeBookingSetup();
      const submitButton = screen.getByRole('button', { name: /book session/i });
      
      await user.click(submitButton);
      
      const confirmButton = screen.getByTestId('confirm-booking');
      await user.click(confirmButton);
      
      // Should immediately show the booked session in UI
      expect(screen.getByText(/session booked/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for form controls', () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByLabelText(/coach/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/session title/i)).toBeInTheDocument();
    });

    it('provides keyboard navigation support', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      
      await user.tab();
      expect(screen.getByRole('combobox', { name: /coach/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/date/i)).toHaveFocus();
    });

    it('announces form errors to screen readers', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const submitButton = screen.getByRole('button', { name: /book session/i });
      
      await user.click(submitButton);
      
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent(/coach selection is required/i);
    });

    it('has accessible button labels', () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /book session/i });
      expect(submitButton).toHaveAccessibleName();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty coach list', () => {
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'coaches') {
          return mockUseQuery({ data: [] });
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/no coaches available/i)).toBeInTheDocument();
    });

    it('handles no available time slots', () => {
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'coaches') {
          return mockUseQuery({ data: mockCoaches });
        }
        if (queryKey[0] === 'timeSlots') {
          return mockUseQuery([]);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/no available time slots/i)).toBeInTheDocument();
    });

    it('handles API errors gracefully', () => {
      (useQuery as any).mockImplementation(({ queryKey }: any) => {
        if (queryKey[0] === 'coaches') {
          return { ...mockUseQuery(null), isError: true, error: new Error('Failed to load') };
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      expect(screen.getByText(/Failed to load coaches/i)).toBeInTheDocument();
    });

    it('handles rapid form state changes', async () => {
      renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      const user = userEvent.setup();
      const coachSelect = screen.getByRole('combobox', { name: /coach/i });
      
      // Rapidly change coach selection
      await user.selectOptions(coachSelect, 'coach-123');
      await user.selectOptions(coachSelect, 'coach-456');
      await user.selectOptions(coachSelect, 'coach-123');
      
      // Should handle state changes gracefully
      expect(screen.getByDisplayValue(/John Doe/i)).toBeInTheDocument();
    });

    it('cleans up on unmount', () => {
      const { unmount } = renderWithProviders(<UnifiedSessionBooking {...defaultProps} />);
      
      unmount();
      
      // Should not cause any memory leaks or errors
      // This is more about ensuring no errors are thrown
    });
  });
});