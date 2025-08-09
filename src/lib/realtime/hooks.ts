'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@/lib/store/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeClient } from './realtime-client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Browser notification helpers
const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

const showBrowserNotification = (title: string, message: string, icon?: string) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: message,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'loom-notification',
      silent: false,
      requireInteraction: false,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }
  return null;
};

const playNotificationSound = () => {
  try {
    // Create audio element for notification sound
    const audio = new Audio('/sounds/notification.wav');
    audio.volume = 0.5;
    audio.play().catch(error => {
      console.warn('Could not play notification sound:', error);
    });
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications() {
  const user = useUser();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Request notification permission on mount
  useEffect(() => {
    const getPermission = async () => {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
    };
    getPermission();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const handleNotificationChange = async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Notification change:', payload);
      
      // Invalidate notifications query to refetch data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Handle new notifications
      if (payload.eventType === 'INSERT') {
        const notification = payload.new;
        if (notification && !notification.read_at) {
          console.log('New notification received:', notification.title);
          
          // Get user's notification preferences
          try {
            const prefsResponse = await fetch('/api/notifications/preferences');
            const prefsData = await prefsResponse.json();
            const preferences = prefsData.data;

            // Check if we should show browser notification
            if (preferences?.inApp?.desktop && notificationPermission === 'granted') {
              showBrowserNotification(
                notification.title as string,
                notification.message as string
              );
            }

            // Check if we should play sound
            if (preferences?.inApp?.sounds) {
              playNotificationSound();
            }
          } catch (error) {
            console.warn('Could not fetch notification preferences:', error);
            // Fallback - show browser notification if permission granted
            if (notificationPermission === 'granted') {
              showBrowserNotification(
                notification.title as string,
                notification.message as string
              );
            }
          }
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
  }, [user?.id, queryClient, notificationPermission]);

  return {
    isConnected: realtimeClient.getConnectionStatus(),
    reconnect: () => realtimeClient.reconnect(),
    notificationPermission,
    requestPermission: requestNotificationPermission,
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