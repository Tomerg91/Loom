import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useUser } from '@/lib/auth/use-user';
import { createClient } from '@/lib/supabase/client';

const shouldLogRealtimeEvents = process.env.NODE_ENV !== 'production';
const logRealtimeDebug = (...args: unknown[]) => {
  if (shouldLogRealtimeEvents) {
    console.log(...args);
  }
};

type SessionRow = {
  coach_id: string;
  client_id: string;
  id: string;
  [key: string]: unknown;
};

type AvailabilityRow = {
  coach_id?: string;
  [key: string]: unknown;
};

type NotificationRow = {
  title?: string;
  type?: string;
  user_id?: string;
  [key: string]: unknown;
};

/**
 * Hook for real-time session booking updates
 * Listens to database changes and updates relevant queries
 */
export function useRealtimeBookings() {
  const queryClient = useQueryClient();
  const user = useUser();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel('session-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `or=(client_id.eq.${user.id},coach_id.eq.${user.id})`,
        },
        (payload: RealtimePostgresChangesPayload<SessionRow>) => {
          logRealtimeDebug('Session change detected:', payload);

          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-sessions'] });
          queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
          
          // Handle specific events
          if (payload.eventType === 'INSERT') {
            // New session booked
            const session = payload.new;
            if (session?.client_id === user.id) {
              // User booked a session
              queryClient.invalidateQueries({
                queryKey: ['upcoming-sessions', user.id]
              });
            } else if (session?.coach_id === user.id) {
              // Someone booked with this coach
              queryClient.invalidateQueries({
                queryKey: ['coach-sessions', user.id]
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Session updated (status change, reschedule, etc.)
            const sessionId = payload.new?.id;
            if (sessionId) {
              queryClient.invalidateQueries({
                queryKey: ['session', sessionId]
              });
            }
          } else if (payload.eventType === 'DELETE') {
            // Session cancelled/deleted
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
          }
        }
      )
      .subscribe();

    // Subscribe to coach availability changes
    const availabilityChannel = supabase
      .channel('coach-availability')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_availability',
        },
        (payload: RealtimePostgresChangesPayload<AvailabilityRow>) => {
          logRealtimeDebug('Availability change detected:', payload);

          // Invalidate time slots queries for affected coach
          const coachId = payload.new?.coach_id ?? payload.old?.coach_id;
          if (coachId) {
            queryClient.invalidateQueries({
              queryKey: ['timeSlots', coachId],
            });
          }
        }
      )
      .subscribe();

    // Subscribe to notification changes
    const notificationChannel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          logRealtimeDebug('New notification:', payload);

          // Invalidate notifications query
          queryClient.invalidateQueries({
            queryKey: ['notifications', user.id]
          });

          // Show toast notification if it's session-related
          const notification = payload.new;
          if (notification?.type === 'session_confirmation') {
            // Could trigger a toast notification here
            logRealtimeDebug('Session notification received:', notification?.title);
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      sessionChannel.unsubscribe();
      availabilityChannel.unsubscribe();
      notificationChannel.unsubscribe();
    };
  }, [user?.id, queryClient, supabase]);
}
