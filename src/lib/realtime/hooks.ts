'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@/lib/store/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeClient } from './realtime-client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications() {
  const user = useUser();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const handleNotificationChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Notification change:', payload);
      
      // Invalidate notifications query to refetch data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // You could also update the cache directly for better performance
      if (payload.eventType === 'INSERT') {
        // Show toast notification for new notifications
        const notification = payload.new;
        if (notification && !notification.read_at) {
          // You could integrate with a toast library here
          console.log('New notification received:', notification.title);
        }
      }
    };

    subscriptionRef.current = realtimeClient.subscribeToNotifications(
      user.id,
      handleNotificationChange
    );

    return () => {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, [user?.id, queryClient]);

  return {
    isConnected: realtimeClient.getConnectionStatus(),
    reconnect: () => realtimeClient.reconnect(),
  };
}

/**
 * Hook for real-time session updates
 */
export function useRealtimeSessions() {
  const user = useUser();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const handleSessionChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Session change:', payload);
      
      // Invalidate session-related queries
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['client-stats'] });
      queryClient.invalidateQueries({ queryKey: ['coach-stats'] });
      
      // Handle specific session events
      if (payload.eventType === 'UPDATE') {
        const session = payload.new;
        if (session?.status === 'cancelled') {
          console.log('Session cancelled:', session.title);
        } else if (session?.status === 'completed') {
          console.log('Session completed:', session.title);
        }
      }
    };

    if (user.role === 'admin') {
      subscriptionRef.current = realtimeClient.subscribeToAllSessions(handleSessionChange);
    } else {
      subscriptionRef.current = realtimeClient.subscribeToUserSessions(user.id, handleSessionChange);
    }

    return () => {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, [user?.id, user?.role, queryClient]);

  return {
    isConnected: realtimeClient.getConnectionStatus(),
    reconnect: () => realtimeClient.reconnect(),
  };
}

/**
 * Hook for real-time coach notes (for coaches)
 */
export function useRealtimeCoachNotes() {
  const user = useUser();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || user.role !== 'coach') return;

    const handleNotesChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Coach notes change:', payload);
      queryClient.invalidateQueries({ queryKey: ['coach-notes'] });
    };

    subscriptionRef.current = realtimeClient.subscribeToCoachNotes(user.id, handleNotesChange);

    return () => {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, [user?.id, user?.role, queryClient]);

  return {
    isConnected: realtimeClient.getConnectionStatus(),
  };
}

/**
 * Hook for real-time reflections (for clients)
 */
export function useRealtimeReflections() {
  const user = useUser();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || user.role !== 'client') return;

    const handleReflectionsChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Reflections change:', payload);
      queryClient.invalidateQueries({ queryKey: ['reflections'] });
      queryClient.invalidateQueries({ queryKey: ['recent-reflections'] });
    };

    subscriptionRef.current = realtimeClient.subscribeToReflections(user.id, handleReflectionsChange);

    return () => {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, [user?.id, user?.role, queryClient]);

  return {
    isConnected: realtimeClient.getConnectionStatus(),
  };
}

/**
 * Hook for real-time coach availability updates
 */
export function useRealtimeAvailability(coachId?: string) {
  const user = useUser();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);
  const targetCoachId = coachId || (user?.role === 'coach' ? user.id : undefined);

  useEffect(() => {
    if (!targetCoachId) return;

    const handleAvailabilityChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Availability change:', payload);
      queryClient.invalidateQueries({ queryKey: ['coach-availability'] });
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
    };

    subscriptionRef.current = realtimeClient.subscribeToCoachAvailability(
      targetCoachId,
      handleAvailabilityChange
    );

    return () => {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, [targetCoachId, queryClient]);

  return {
    isConnected: realtimeClient.getConnectionStatus(),
  };
}

/**
 * Hook for user presence (online/offline status)
 */
export function usePresence(channelName: string) {
  const user = useUser();
  const [presenceState, setPresenceState] = useState<Record<string, unknown>>({});
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const userInfo = {
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.email,
      avatar: user.avatarUrl,
      role: user.role,
    };

    subscriptionRef.current = realtimeClient.subscribeToPresence(
      channelName,
      user.id,
      userInfo
    );

    // Poll for presence state changes
    const interval = setInterval(() => {
      const state = realtimeClient.getPresenceState(channelName);
      setPresenceState(state);
    }, 1000);

    return () => {
      clearInterval(interval);
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, [user?.id, channelName, user?.firstName, user?.lastName, user?.email, user?.avatarUrl, user?.role]);

  const onlineUsers = Object.values(presenceState).flat().filter((user): user is {
    user_id: string;
    name: string;
    avatar: string;
    role: 'admin' | 'coach' | 'client';
  } => {
    return typeof user === 'object' && 
           user !== null && 
           'user_id' in user && 
           'name' in user && 
           'avatar' in user && 
           'role' in user;
  });

  return {
    presenceState,
    onlineUsers,
    isConnected: realtimeClient.getConnectionStatus(),
  };
}

/**
 * Hook for connection status monitoring
 */
export function useRealtimeConnection() {
  const [isConnected, setIsConnected] = useState(realtimeClient.getConnectionStatus());

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(realtimeClient.getConnectionStatus());
    };

    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    reconnect: () => realtimeClient.reconnect(),
  };
}

/**
 * Hook to setup all real-time subscriptions for a user
 */
export function useRealtimeSubscriptions() {
  const notifications = useRealtimeNotifications();
  const sessions = useRealtimeSessions();
  const connection = useRealtimeConnection();

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      realtimeClient.unsubscribeAll();
    };
  }, []);

  return {
    notifications,
    sessions,
    isConnected: connection.isConnected,
    reconnect: connection.reconnect,
  };
}