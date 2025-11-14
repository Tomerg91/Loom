'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked?: boolean;
  isBlocked?: boolean;
  clientName?: string;
  sessionTitle?: string;
  conflictReason?: string;
}

export interface AvailabilityStatus {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  blockedSlots: number;
  lastUpdated?: Date;
}

interface UseBookingTimeSlotsOptions {
  coachId: string | null;
  date: string | null;
  duration: number;
  variant?: 'basic' | 'enhanced' | 'realtime';
  isConnected?: boolean;
}

/**
 * Domain hook for fetching available time slots
 * Handles time slot data with optional detailed information
 */
export function useBookingTimeSlots(options: UseBookingTimeSlotsOptions) {
  const { coachId, date, duration, variant = 'basic', isConnected = true } = options;

  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const {
    data: timeSlots,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['timeSlots', coachId, date, duration, lastRefresh.getTime()],
    queryFn: async (): Promise<TimeSlot[]> => {
      if (!coachId || !date) return [];

      const detailedParam = variant !== 'basic' ? '&detailed=true' : '';
      const response = await fetch(
        `/api/coaches/${coachId}/availability?date=${date}&duration=${duration}${detailedParam}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch time slots');
      }

      const data = await response.json();
      const slots: TimeSlot[] = data.data;

      // Calculate availability status for enhanced/realtime variants
      if (variant !== 'basic' && slots) {
        const status: AvailabilityStatus = {
          totalSlots: slots.length,
          availableSlots: slots.filter((s) => s.isAvailable && !s.isBooked && !s.isBlocked).length,
          bookedSlots: slots.filter((s) => s.isBooked).length,
          blockedSlots: slots.filter((s) => s.isBlocked).length,
          lastUpdated: new Date(),
        };
        setAvailabilityStatus(status);
      }

      return slots;
    },
    enabled: !!(coachId && date),
    staleTime: 30000,
    // Auto-refetch for realtime variant when connected
    refetchInterval: variant === 'realtime' && isConnected ? 60000 : false,
  });

  const refresh = useCallback(() => {
    setLastRefresh(new Date());
    refetch();
  }, [refetch]);

  return {
    timeSlots: timeSlots ?? [],
    availabilityStatus,
    isLoading,
    error,
    lastRefresh,
    refresh,
  };
}
