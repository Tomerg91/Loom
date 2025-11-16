'use client';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';

import { useUser } from '@/lib/auth/use-user';
import { useRealtimeConnection } from '@/lib/realtime/hooks';
import { realtimeClient } from '@/lib/realtime/realtime-client';


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

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  isOnline?: boolean;
  timezone?: string;
}

export interface AvailabilityStatus {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  blockedSlots: number;
  lastUpdated: Date;
}

export interface BookingFormData {
  coachId: string;
  date: string;
  timeSlot: string;
  title: string;
  description?: string;
  duration: number;
}

export function useRealtimeBooking(initialCoachId?: string) {
  const user = useUser();
  const queryClient = useQueryClient();
  const { isConnected, reconnect } = useRealtimeConnection();
  
  const [selectedCoach, setSelectedCoach] = useState<string>(initialCoachId || '');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  const subscriptionRef = useRef<string | null>(null);

  // Set up real-time availability subscription for selected coach
  useEffect(() => {
    if (!selectedCoach || !isConnected) return;

    const handleAvailabilityChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Real-time availability change:', payload);
      
      // Invalidate availability queries to trigger refetch
      queryClient.invalidateQueries({ 
        queryKey: ['timeSlots', selectedCoach] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['coach-availability', selectedCoach] 
      });
      
      // Update last refresh timestamp
      setLastRefresh(new Date());
    };

    // Subscribe to both coach availability and sessions for this coach
    const availabilitySubscription = realtimeClient.subscribeToCoachAvailability(
      selectedCoach, 
      handleAvailabilityChange
    );
    
    const sessionsSubscription = realtimeClient.subscribeToUserSessions(
      selectedCoach,
      handleAvailabilityChange
    );

    subscriptionRef.current = availabilitySubscription;

    return () => {
      if (availabilitySubscription) {
        realtimeClient.unsubscribe(availabilitySubscription);
      }
      if (sessionsSubscription) {
        realtimeClient.unsubscribe(sessionsSubscription);
      }
    };
  }, [selectedCoach, isConnected, queryClient]);

  // Fetch available coaches with online status
  const {
    data: coaches,
    isLoading: loadingCoaches,
    error: coachesError,
  } = useQuery({
    queryKey: ['coaches', 'with-status'],
    queryFn: async (): Promise<Coach[]> => {
      const response = await fetch('/api/users?role=coach&status=active&limit=50&include_online_status=true');
      if (!response.ok) throw new Error('Failed to fetch coaches');
      const data = await response.json();
      return data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for online status
    staleTime: 20000,
  });

  // Enhanced time slots query with real-time updates
  const {
    data: timeSlots,
    isLoading: loadingSlots,
    error: slotsError,
    refetch: refetchTimeSlots,
  } = useQuery({
    queryKey: ['timeSlots', selectedCoach, selectedDate, lastRefresh.getTime()],
    queryFn: async (): Promise<TimeSlot[]> => {
      if (!selectedCoach || !selectedDate) return [];

      const response = await fetch(
        `/api/coaches/${selectedCoach}/availability?date=${selectedDate}&duration=60&detailed=true`
      );
      if (!response.ok) throw new Error('Failed to fetch time slots');
      const data = await response.json();

      return data.data;
    },
    enabled: !!(selectedCoach && selectedDate),
    staleTime: 30000,
    refetchInterval: isConnected ? 60000 : false, // Only auto-refetch if connected
  });

  // Calculate availability status when time slots change
  useEffect(() => {
    let isMounted = true;

    if (timeSlots && isMounted) {
      const status: AvailabilityStatus = {
        totalSlots: timeSlots.length,
        availableSlots: timeSlots.filter(slot => slot.isAvailable && !slot.isBooked && !slot.isBlocked).length,
        bookedSlots: timeSlots.filter(slot => slot.isBooked).length,
        blockedSlots: timeSlots.filter(slot => slot.isBlocked).length,
        lastUpdated: new Date(),
      };
      setAvailabilityStatus(status);
    }

    return () => {
      isMounted = false;
    };
  }, [timeSlots]);

  // Create session mutation with optimistic updates
  const createSessionMutation = useMutation({
    mutationFn: async (formData: BookingFormData) => {
      const [, time] = formData.timeSlot.split('T');
      const scheduledAt = `${formData.date}T${time}`;
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduledAt,
          duration: formData.duration,
          coachId: formData.coachId,
          clientId: user?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create session');
      }

      return response.json();
    },
    onMutate: async (formData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['timeSlots', formData.coachId, formData.date] 
      });
      
      // Optimistically update the time slot as booked
      const queryKey = ['timeSlots', formData.coachId, formData.date, lastRefresh.getTime()];
      const previousSlots = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (oldSlots: TimeSlot[] | undefined) => {
        if (!oldSlots) return [];
        return oldSlots.map(slot => 
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
      
      // Update availability status optimistically
      if (availabilityStatus) {
        setAvailabilityStatus({
          ...availabilityStatus,
          availableSlots: availabilityStatus.availableSlots - 1,
          bookedSlots: availabilityStatus.bookedSlots + 1,
          lastUpdated: new Date(),
        });
      }
      
      return { previousSlots, queryKey };
    },
    onError: (err, formData, context) => {
      // Revert optimistic updates on error
      if (context?.previousSlots && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousSlots);
      }
      
      // Refresh data to get accurate state
      refetchTimeSlots();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      queryClient.invalidateQueries({ queryKey: ['coach-availability'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      
      // Reset form state
      setSelectedDate('');
      setAvailabilityStatus(null);
    },
  });

  // Manual refresh function
  const refreshAvailability = useCallback(() => {
    setLastRefresh(new Date());
    refetchTimeSlots();
  }, [refetchTimeSlots]);

  // Get selected coach data
  const selectedCoachData = coaches?.find(coach => coach.id === selectedCoach);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, []);

  return {
    // Data
    coaches,
    timeSlots,
    selectedCoach,
    selectedDate,
    selectedCoachData,
    availabilityStatus,
    
    // Loading states
    loadingCoaches,
    loadingSlots,
    isBooking: createSessionMutation.isPending,
    
    // Error states
    coachesError,
    slotsError,
    bookingError: createSessionMutation.error,
    
    // Connection state
    isConnected,
    lastRefresh,
    
    // Actions
    setSelectedCoach,
    setSelectedDate,
    createSession: createSessionMutation.mutate,
    refreshAvailability,
    reconnect,
    
    // Mutations
    createSessionMutation,
  };
}

export type UseRealtimeBookingReturn = ReturnType<typeof useRealtimeBooking>;
