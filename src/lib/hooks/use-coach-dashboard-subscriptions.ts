// src/lib/hooks/use-coach-dashboard-subscriptions.ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  subscribeToSessions,
  subscribeToSessionFeedback,
  subscribeToSessionRatings,
  subscribeToClientUpdates,
  subscribeToGoalUpdates,
  CoachEvent,
} from '@/lib/realtime/coach-subscriptions';

export interface RealtimeSubscription {
  table: string;
  unsubscribe: () => void;
}

export interface UseDashboardSubscriptionsReturn {
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  subscriptions: RealtimeSubscription[];
}

/**
 * Hook that manages all coach dashboard realtime subscriptions
 * Automatically invalidates TanStack Query caches on database changes
 *
 * @param coachId - The coach's ID to filter subscriptions
 * @returns Connection status and active subscriptions
 */
export function useCoachDashboardSubscriptions(
  coachId: string
): UseDashboardSubscriptionsReturn {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'reconnecting'
  >('connected');
  const [subscriptions, setSubscriptions] = useState<RealtimeSubscription[]>(
    []
  );

  useEffect(() => {
    const handleSessionChange = (event: CoachEvent) => {
      console.log('[Dashboard] Session change:', event);
      queryClient.invalidateQueries({ queryKey: ['coach-stats'] });
      queryClient.invalidateQueries({ queryKey: ['coach-activity'] });
    };

    const handleFeedbackChange = (event: CoachEvent) => {
      console.log('[Dashboard] Feedback change:', event);
      queryClient.invalidateQueries({ queryKey: ['coach-insights'] });
      queryClient.invalidateQueries({ queryKey: ['coach-stats'] });
    };

    const handleRatingChange = (event: CoachEvent) => {
      console.log('[Dashboard] Rating change:', event);
      queryClient.invalidateQueries({ queryKey: ['coach-insights'] });
    };

    const handleClientChange = (event: CoachEvent) => {
      console.log('[Dashboard] Client change:', event);
      queryClient.invalidateQueries({ queryKey: ['coach-clients'] });
    };

    const handleGoalChange = (event: CoachEvent) => {
      console.log('[Dashboard] Goal change:', event);
      queryClient.invalidateQueries({ queryKey: ['coach-insights'] });
    };

    try {
      setConnectionStatus('connected');

      // Initialize all subscriptions
      const unsubSessions = subscribeToSessions(coachId, handleSessionChange);
      const unsubFeedback = subscribeToSessionFeedback(
        coachId,
        handleFeedbackChange
      );
      const unsubRatings = subscribeToSessionRatings(
        coachId,
        handleRatingChange
      );
      const unsubClients = subscribeToClientUpdates(
        coachId,
        handleClientChange
      );
      const unsubGoals = subscribeToGoalUpdates(coachId, handleGoalChange);

      const subs: RealtimeSubscription[] = [
        { table: 'sessions', unsubscribe: unsubSessions },
        { table: 'session_feedback', unsubscribe: unsubFeedback },
        { table: 'session_ratings', unsubscribe: unsubRatings },
        { table: 'users', unsubscribe: unsubClients },
        { table: 'goals', unsubscribe: unsubGoals },
      ];

      setSubscriptions(subs);
      setIsConnected(true);
      setConnectionStatus('connected');

      console.log('[Dashboard] Realtime subscriptions initialized', {
        coachId,
        subscriptionCount: subs.length,
      });

      // Cleanup on unmount
      return () => {
        console.log('[Dashboard] Cleaning up realtime subscriptions');
        subs.forEach((sub) => {
          try {
            sub.unsubscribe();
          } catch (error) {
            console.error(
              `[Dashboard] Error unsubscribing from ${sub.table}:`,
              error
            );
          }
        });
        setSubscriptions([]);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };
    } catch (error) {
      console.error('[Dashboard] Error initializing subscriptions:', error);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  }, [coachId, queryClient]); // Only coachId and queryClient as deps

  return {
    isConnected,
    connectionStatus,
    subscriptions,
  };
}
