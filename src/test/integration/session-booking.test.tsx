import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SessionBookingForm } from '@/components/sessions/booking';
import { SessionList } from '@/components/sessions/session-list';
import { renderWithProviders, mockUser, mockCoachUser, createMockSession, mockFetch } from '@/test/utils';

// Mock auth store
vi.mock('@/lib/store/auth-store', () => ({
  useUser: vi.fn(() => mockUser),
}));

describe('Session Booking Integration', () => {
  const mockCoaches = [
    { ...mockCoachUser, id: 'coach-1', firstName: 'John', lastName: 'Coach' },
    { ...mockCoachUser, id: 'coach-2', firstName: 'Jane', lastName: 'Mentor' },
  ];

  const mockTimeSlots = [
    {
      id: 'slot-1',
      coachId: 'coach-1',
      date: '2024-01-15',
      startTime: '09:00',
      endTime: '10:00',
      isAvailable: true,
    },
    {
      id: 'slot-2',
      coachId: 'coach-1',
      date: '2024-01-15',
      startTime: '10:00',
      endTime: '11:00',
      isAvailable: true,
    },
  ];

  const mockBookingMutation = vi.fn();
  const mockInvalidateQueries = vi.fn();
  const mockSetQueryData = vi.fn();
  const mockQueryClient = {
    invalidateQueries: mockInvalidateQueries,
    setQueryData: mockSetQueryData,
    getQueryData: vi.fn(),
    removeQueries: vi.fn(),
    cancelQueries: vi.fn(),
    isFetching: vi.fn(() => 0),
    isMutating: vi.fn(() => 0),
    getDefaultOptions: vi.fn(() => ({})),
    setDefaultOptions: vi.fn(),
    setQueryDefaults: vi.fn(),
    getQueryDefaults: vi.fn(() => ({})),
    setMutationDefaults: vi.fn(),
    getMutationDefaults: vi.fn(() => ({})),
    mount: vi.fn(),
    unmount: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses
    mockFetch({
      success: true,
      data: createMockSession(),
    });

    // Setup query mocks
    const mockUseQuery = vi.fn()
      .mockReturnValueOnce({
        data: mockCoaches,
        isLoading: false,
        isError: false,
        error: null,
      })
      .mockReturnValueOnce({
        data: mockTimeSlots,
        isLoading: false,
        isError: false,
        error: null,
      });

    const mockUseMutation = vi.fn().mockReturnValue({
      mutate: mockBookingMutation,
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: null,
    });

    (vi.mocked(useQuery)).mockImplementation(mockUseQuery);
    (vi.mocked(useMutation)).mockImplementation(mockUseMutation);
    (vi.mocked(useQueryClient)).mockReturnValue(mockQueryClient as any);
  });

  describe('Complete Booking Flow', () => {
    it('completes session booking from start to finish', async () => {
      renderWithProviders(<SessionBookingForm />);

      // Step 1: Fill in session details
      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'Career Coaching Session' } });

      const descriptionInput = screen.getByLabelText(/description/i);
      fireEvent.change(descriptionInput, { 
        target: { value: 'Discussing career development goals' } 
      });

      // Step 2: Select session type
      const typeSelect = screen.getByLabelText(/session type/i);
      fireEvent.click(typeSelect);
      
      await waitFor(() => {
        const individualOption = screen.getByText('Individual');
        fireEvent.click(individualOption);
      });

      // Step 3: Select coach
      const coachSelect = screen.getByLabelText(/coach/i);
      fireEvent.click(coachSelect);
      
      await waitFor(() => {
        const johnCoach = screen.getByText('John Coach');
        fireEvent.click(johnCoach);
      });

      // Step 4: Select time slot
      await waitFor(() => {
        const timeSlot = screen.getByText('09:00 - 10:00');
        fireEvent.click(timeSlot);
      });

      // Step 5: Submit booking
      const submitButton = screen.getByRole('button', { name: /book session/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockBookingMutation).toHaveBeenCalledWith({
          title: 'Career Coaching Session',
          description: 'Discussing career development goals',
          coachId: 'coach-1',
          timeSlotId: 'slot-1',
          type: 'individual',
          duration: 60,
        });
      });
    });

    it('handles booking errors gracefully', async () => {
      // Mock booking error
      const mockMutationWithError = vi.fn().mockReturnValue({
        mutate: mockBookingMutation,
        isPending: false,
        isError: true,
        error: new Error('Coach is no longer available at this time'),
        data: null,
      });

      (vi.mocked(useMutation)).mockImplementation(mockMutationWithError);

      renderWithProviders(<SessionBookingForm />);

      // Should show error message
      expect(screen.getByText(/coach is no longer available/i)).toBeInTheDocument();

      // Form should still be usable
      expect(screen.getByLabelText(/title/i)).toBeEnabled();
      expect(screen.getByRole('button', { name: /book session/i })).toBeEnabled();
    });

    it('updates available time slots when coach changes', async () => {
      const differentTimeSlots = [
        {
          id: 'slot-3',
          coachId: 'coach-2',
          date: '2024-01-15',
          startTime: '14:00',
          endTime: '15:00',
          isAvailable: true,
        },
      ];

      // Mock time slots changing based on coach selection
      const mockUseQuery = vi.fn()
        .mockReturnValueOnce({
          data: mockCoaches,
          isLoading: false,
          isError: false,
          error: null,
        })
        .mockReturnValueOnce({
          data: differentTimeSlots,
          isLoading: false,
          isError: false,
          error: null,
        });

      (vi.mocked(useQuery)).mockImplementation(mockUseQuery);

      renderWithProviders(<SessionBookingForm />);

      // Select different coach
      const coachSelect = screen.getByLabelText(/coach/i);
      fireEvent.click(coachSelect);
      
      await waitFor(() => {
        const janeCoach = screen.getByText('Jane Mentor');
        fireEvent.click(janeCoach);
      });

      // Should show different time slots
      await waitFor(() => {
        expect(screen.getByText('14:00 - 15:00')).toBeInTheDocument();
        expect(screen.queryByText('09:00 - 10:00')).not.toBeInTheDocument();
      });
    });

    it('prevents double booking by disabling unavailable slots', async () => {
      const slotsWithUnavailable = [
        ...mockTimeSlots,
        {
          id: 'slot-3',
          coachId: 'coach-1',
          date: '2024-01-15',
          startTime: '11:00',
          endTime: '12:00',
          isAvailable: false,
        },
      ];

      const mockUseQuery = vi.fn()
        .mockReturnValueOnce({
          data: mockCoaches,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: slotsWithUnavailable,
          isLoading: false,
        });

      (vi.mocked(useQuery)).mockImplementation(mockUseQuery);

      renderWithProviders(<SessionBookingForm />);

      const coachSelect = screen.getByLabelText(/coach/i);
      fireEvent.click(coachSelect);
      
      await waitFor(() => {
        const johnCoach = screen.getByText('John Coach');
        fireEvent.click(johnCoach);
      });

      await waitFor(() => {
        // Available slots should be visible
        expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
        expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
        
        // Unavailable slot should not be shown
        expect(screen.queryByText('11:00 - 12:00')).not.toBeInTheDocument();
      });
    });
  });

  describe('Session List Integration', () => {
    it('displays booked sessions correctly', () => {
      const mockSessions = [
        createMockSession({
          id: 'session-1',
          title: 'Career Coaching',
          status: 'scheduled',
          scheduledAt: '2024-01-15T09:00:00Z',
        }),
        createMockSession({
          id: 'session-2',
          title: 'Leadership Development',
          status: 'completed',
          scheduledAt: '2024-01-10T14:00:00Z',
        }),
      ];

      const mockUseQuery = vi.fn().mockReturnValue({
        data: {
          data: mockSessions,
          pagination: { page: 1, limit: 10, total: 2 },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      (vi.mocked(useQuery)).mockImplementation(mockUseQuery);

      renderWithProviders(<SessionList />);

      expect(screen.getByText('Career Coaching')).toBeInTheDocument();
      expect(screen.getByText('Leadership Development')).toBeInTheDocument();
      expect(screen.getByText('scheduled')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('refreshes session list after successful booking', async () => {
      const localMockInvalidateQueries = vi.fn();
      const localMockQueryClient = {
        invalidateQueries: localMockInvalidateQueries,
        setQueryData: vi.fn(),
        getQueryData: vi.fn(),
        removeQueries: vi.fn(),
        cancelQueries: vi.fn(),
        isFetching: vi.fn(() => 0),
        isMutating: vi.fn(() => 0),
        getDefaultOptions: vi.fn(() => ({})),
        setDefaultOptions: vi.fn(),
        setQueryDefaults: vi.fn(),
        getQueryDefaults: vi.fn(() => ({})),
        setMutationDefaults: vi.fn(),
        getMutationDefaults: vi.fn(() => ({})),
        mount: vi.fn(),
        unmount: vi.fn(),
        clear: vi.fn(),
      };

      // Mock successful booking
      const mockMutationSuccess = vi.fn().mockReturnValue({
        mutate: vi.fn((data, { onSuccess }) => {
          // Simulate successful mutation
          onSuccess(createMockSession());
        }),
        isPending: false,
        isError: false,
        error: null,
        data: null,
      });

      (vi.mocked(useMutation)).mockImplementation(mockMutationSuccess);
      (vi.mocked(useQueryClient)).mockReturnValue(localMockQueryClient as any);

      renderWithProviders(<SessionBookingForm />);

      // Complete booking form
      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Session' } });

      const coachSelect = screen.getByLabelText(/coach/i);
      fireEvent.click(coachSelect);
      
      await waitFor(() => {
        const johnCoach = screen.getByText('John Coach');
        fireEvent.click(johnCoach);
      });

      await waitFor(() => {
        const timeSlot = screen.getByText('09:00 - 10:00');
        fireEvent.click(timeSlot);
      });

      const submitButton = screen.getByRole('button', { name: /book session/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(localMockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: ['sessions'],
        });
      });
    });
  });

  describe('Real-time Updates', () => {
    it('updates time slot availability in real-time', async () => {
      // Mock real-time subscription hook
      const mockUseRealtimeAvailability = vi.fn(() => ({
        isConnected: true,
      }));

      vi.mock('@/lib/realtime/hooks', () => ({
        useRealtimeAvailability: mockUseRealtimeAvailability,
      }));

      renderWithProviders(<SessionBookingForm />);

      const coachSelect = screen.getByLabelText(/coach/i);
      fireEvent.click(coachSelect);
      
      await waitFor(() => {
        const johnCoach = screen.getByText('John Coach');
        fireEvent.click(johnCoach);
      });

      // Initially shows available slots
      await waitFor(() => {
        expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
      });

      // Simulate real-time update removing a slot
      const updatedSlots = mockTimeSlots.filter(slot => slot.id !== 'slot-1');
      
      const mockUseQueryUpdated = vi.fn()
        .mockReturnValueOnce({
          data: mockCoaches,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: updatedSlots,
          isLoading: false,
        });

      (vi.mocked(useQuery)).mockImplementation(mockUseQueryUpdated);

      // Re-render to simulate real-time update
      await waitFor(() => {
        expect(screen.queryByText('09:00 - 10:00')).not.toBeInTheDocument();
        expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
      });
    });
  });
});