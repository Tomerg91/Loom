'use client';

// src/lib/realtime/coach-subscriptions.ts
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type CoachEvent = RealtimePostgresChangesPayload<Record<string, any>>;

/**
 * Subscribe to session changes (INSERT/UPDATE/DELETE)
 * Filtered by coach_id to only see own sessions
 */
export function subscribeToSessions(
  coachId: string,
  onEvent: (event: CoachEvent) => void
): () => void {
  const client = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    channel = client
      .channel(`coach-sessions-${coachId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `coach_id=eq.${coachId}`,
        },
        onEvent
      )
      .subscribe((status) => {
        console.log(`Sessions subscription status for coach ${coachId}:`, status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Session subscription failed:', status);
        }
      });
  } catch (error) {
    console.error('Failed to subscribe to sessions:', error);
  }

  return () => {
    if (channel) {
      client.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to session feedback changes (ratings, comments)
 * Filtered by coach_id
 */
export function subscribeToSessionFeedback(
  coachId: string,
  onEvent: (event: CoachEvent) => void
): () => void {
  const client = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    channel = client
      .channel(`coach-feedback-${coachId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_feedback',
          filter: `coach_id=eq.${coachId}`,
        },
        onEvent
      )
      .subscribe((status) => {
        console.log(`Session feedback subscription status for coach ${coachId}:`, status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Session feedback subscription failed:', status);
        }
      });
  } catch (error) {
    console.error('Failed to subscribe to session feedback:', error);
  }

  return () => {
    if (channel) {
      client.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to session ratings changes (revenue impact)
 * Filtered by coach_id
 */
export function subscribeToSessionRatings(
  coachId: string,
  onEvent: (event: CoachEvent) => void
): () => void {
  const client = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    channel = client
      .channel(`coach-ratings-${coachId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_ratings',
          filter: `coach_id=eq.${coachId}`,
        },
        onEvent
      )
      .subscribe((status) => {
        console.log(`Session ratings subscription status for coach ${coachId}:`, status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Session ratings subscription failed:', status);
        }
      });
  } catch (error) {
    console.error('Failed to subscribe to session ratings:', error);
  }

  return () => {
    if (channel) {
      client.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to client/user updates
 * Watches for new clients assigned to coach or client profile changes
 */
export function subscribeToClientUpdates(
  coachId: string,
  onEvent: (event: CoachEvent) => void
): () => void {
  const client = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    channel = client
      .channel(`coach-clients-${coachId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `coach_id=eq.${coachId}`,
        },
        onEvent
      )
      .subscribe((status) => {
        console.log(`Client updates subscription status for coach ${coachId}:`, status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Client updates subscription failed:', status);
        }
      });
  } catch (error) {
    console.error('Failed to subscribe to client updates:', error);
  }

  return () => {
    if (channel) {
      client.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to goal updates
 * Watches for new goals, goal completions, and goal progress changes
 */
export function subscribeToGoalUpdates(
  coachId: string,
  onEvent: (event: CoachEvent) => void
): () => void {
  const client = createClient();
  let channel: RealtimeChannel | null = null;

  try {
    channel = client
      .channel(`coach-goals-${coachId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `coach_id=eq.${coachId}`,
        },
        onEvent
      )
      .subscribe((status) => {
        console.log(`Goal updates subscription status for coach ${coachId}:`, status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Goal updates subscription failed:', status);
        }
      });
  } catch (error) {
    console.error('Failed to subscribe to goal updates:', error);
  }

  return () => {
    if (channel) {
      client.removeChannel(channel);
    }
  };
}
