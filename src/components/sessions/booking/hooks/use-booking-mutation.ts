'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/auth/use-user';
import type { Session } from '@/types';
import type { TimeSlot } from './use-booking-time-slots';

interface BookingFormData {
  coachId: string;
  date: string;
  timeSlot: string;
  title: string;
  description?: string;
  duration: number;
  timezone?: string;
}

interface UseBookingMutationOptions {
  enableOptimisticUpdates?: boolean;
  onSuccess?: (sessionData: Session) => void;
  onError?: (error: Error) => void;
}

/**
 * Domain hook for session booking mutation
 * Handles creating a new booking with optional optimistic updates
 */
export function useBookingMutation(options: UseBookingMutationOptions = {}) {
  const { enableOptimisticUpdates = false, onSuccess, onError } = options;
  const queryClient = useQueryClient();
  const user = useUser();

  const mutation = useMutation({
    mutationFn: async (formData: BookingFormData): Promise<Session> => {
      const scheduledAtDateTime = `${formData.date}T${formData.timeSlot}:00`;

      const response = await fetch('/api/sessions/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduledAt: scheduledAtDateTime,
          durationMinutes: formData.duration,
          coachId: formData.coachId,
          timezone: formData.timezone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to book session');
      }

      const result = await response.json();
      return result.data;
    },
    onMutate: enableOptimisticUpdates
      ? async (formData) => {
          // Cancel outgoing refetches
          await queryClient.cancelQueries({ queryKey: ['timeSlots'] });

          // Optimistically update the time slot as booked
          const queryKey = ['timeSlots', formData.coachId, formData.date, formData.duration];
          const previousSlots = queryClient.getQueryData(queryKey);

          queryClient.setQueryData(queryKey, (oldSlots: TimeSlot[] | undefined) => {
            if (!oldSlots) return [];
            return oldSlots.map((slot) =>
              slot.startTime === formData.timeSlot
                ? {
                    ...slot,
                    isAvailable: false,
                    isBooked: true,
                    clientName: `${user?.firstName} ${user?.lastName}`,
                    sessionTitle: formData.title,
                  }
                : slot
            );
          });

          return { previousSlots, queryKey };
        }
      : undefined,
    onError: (error, formData, context) => {
      console.error('Session booking failed:', error);

      // Revert optimistic update on error
      if (enableOptimisticUpdates && context?.previousSlots) {
        queryClient.setQueryData(context.queryKey, context.previousSlots);
      }

      onError?.(error as Error);
    },
    onSuccess: (sessionData) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-sessions'] });

      onSuccess?.(sessionData);
    },
  });

  return {
    createBooking: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}
