'use client';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import { useUser } from '@/lib/auth/use-user';

import { realtimeClient } from './realtime-client';


// Debounce utility for subscription management
function useDebounce<T extends unknown[]>(callback: (...args: T) => void, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

// Connection status type from realtime client
type ConnectionStatus = {
  isConnected: boolean;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  reconnectionAttempts: number;
  error: string | null;
};

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
 * Enhanced hook for real-time notifications with improved error handling and performance
 */
export function useRealtimeNotifications() {
  const user = useUser();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => 
    realtimeClient.getDetailedConnectionStatus()
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [fallbackPollingActive, setFallbackPollingActive] = useState(false);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
  // Memoized callback for notification handling to prevent unnecessary re-renders
  const handleNotificationChange = useCallback(async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    try {
      console.log('Notification change:', payload.eventType, payload.table);
      setLastError(null); // Clear previous errors on successful processing
      
      // Invalidate notifications query to refetch data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Handle new notifications
      if (payload.eventType === 'INSERT') {
        const notification = payload.new;
        if (notification && !notification.read_at) {
          console.log('New notification received:', notification.title);
          
          try {
            // Get user's notification preferences with fallback
            let preferences = null;
            try {
              const prefsResponse = await fetch('/api/notifications/preferences');
              if (prefsResponse.ok) {
                const prefsData = await prefsResponse.json();
                preferences = prefsData.data;
              }
            } catch (prefError) {
              console.warn('Could not fetch notification preferences, using defaults:', prefError);
            }

            // Show browser notification with fallback behavior
            const shouldShowBrowserNotification = preferences?.inApp?.desktop ?? true;
            if (shouldShowBrowserNotification && notificationPermission === 'granted') {
              showBrowserNotification(
                notification.title as string,
                notification.message as string
              );
            }

            // Play sound with fallback behavior
            const shouldPlaySound = preferences?.inApp?.sounds ?? false;
            if (shouldPlaySound) {
              playNotificationSound();
            }
          } catch (error) {
            console.warn('Error processing notification preferences:', error);
            // Graceful degradation - show notification if permission granted
            if (notificationPermission === 'granted') {
              showBrowserNotification(
                notification.title as string,
                notification.message as string
              );
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing notification';
      console.error('Error handling notification change:', errorMessage);
      setLastError(errorMessage);
    }
  }, [queryClient, notificationPermission]);

  // Debounced subscription function to prevent rapid re-subscriptions
  const debouncedSubscribe = useDebounce((userId: string) => {
    try {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      subscriptionRef.current = realtimeClient.subscribeToNotifications(
        userId,
        handleNotificationChange
      );
      
      retryCountRef.current = 0; // Reset retry count on successful subscription
      setLastError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe to notifications';
      console.error('Subscription error:', errorMessage);
      setLastError(errorMessage);
      
      // Implement retry logic with exponential backoff
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
        console.log(`Retrying subscription in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        
        setTimeout(() => {
          if (user?.id) {
            debouncedSubscribe(user.id);
          }
        }, delay);
      } else {
        console.error('Max retry attempts reached, enabling fallback polling');
        enableFallbackPolling();
      }
    }
  }, 1000); // 1 second debounce

  // Fallback polling when realtime fails
  const enableFallbackPolling = useCallback(() => {
    if (fallbackPollingActive || !user?.id) return;
    
    setFallbackPollingActive(true);
    console.log('Enabling fallback polling for notifications');
    
    const poll = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    
    // Poll every 30 seconds when realtime is unavailable
    fallbackTimerRef.current = setInterval(poll, 30000);
  }, [fallbackPollingActive, user?.id, queryClient]);

  const disableFallbackPolling = useCallback(() => {
    if (!fallbackPollingActive) return;
    
    setFallbackPollingActive(false);
    console.log('Disabling fallback polling for notifications');
    
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, [fallbackPollingActive]);

  // Request notification permission on mount
  useEffect(() => {
    let isMounted = true;

    const getPermission = async () => {
      const permission = await requestNotificationPermission();
      if (isMounted) {
        setNotificationPermission(permission);
      }
    };
    getPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  // Connection status monitoring
  useEffect(() => {
    const unsubscribeConnectionListener = realtimeClient.addConnectionListener((status) => {
      setConnectionStatus(status);
      
      if (status.isConnected) {
        disableFallbackPolling();
        retryCountRef.current = 0; // Reset retry count when connection is restored
        setLastError(null);
      } else if (status.error && retryCountRef.current >= maxRetries) {
        enableFallbackPolling();
      }
    });

    // Update initial connection status
    setConnectionStatus(realtimeClient.getDetailedConnectionStatus());
    
    return unsubscribeConnectionListener;
  }, [enableFallbackPolling, disableFallbackPolling]);

  // Subscription management with debouncing and error handling
  useEffect(() => {
    if (!user?.id) {
      // Clean up subscription when user logs out
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      disableFallbackPolling();
      return;
    }

    // Subscribe with debouncing
    debouncedSubscribe(user.id);

    return () => {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      disableFallbackPolling();
    };
  }, [user?.id, debouncedSubscribe, disableFallbackPolling]);

  // Manual reconnection with error handling
  const reconnect = useCallback(async () => {
    try {
      setLastError(null);
      await realtimeClient.reconnect();
      
      // Re-subscribe if we have a user
      if (user?.id) {
        retryCountRef.current = 0;
        debouncedSubscribe(user.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reconnection failed';
      setLastError(errorMessage);
      console.error('Manual reconnection failed:', errorMessage);
    }
  }, [user?.id, debouncedSubscribe]);

  // Memoized return object to prevent unnecessary re-renders
  return useMemo(() => ({
    isConnected: connectionStatus.isConnected,
    connectionStatus,
    lastError,
    fallbackPollingActive,
    reconnect,
    notificationPermission,
    requestPermission: requestNotificationPermission,
    // Helper function to reset connection state
    resetConnectionState: () => {
      realtimeClient.resetConnectionStatus();
      setLastError(null);
      retryCountRef.current = 0;
      disableFallbackPolling();
    },
  }), [
    connectionStatus,
    lastError,
    fallbackPollingActive,
    reconnect,
    notificationPermission,
    disableFallbackPolling,
  ]);
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
 * Enhanced hook for connection status monitoring with detailed status
 */
export function useRealtimeConnection() {
  const [connectionStatus, setConnectionStatus] = useState(() => 
    realtimeClient.getDetailedConnectionStatus()
  );

  useEffect(() => {
    const unsubscribeConnectionListener = realtimeClient.addConnectionListener((status) => {
      setConnectionStatus(status);
    });

    // Update initial status
    setConnectionStatus(realtimeClient.getDetailedConnectionStatus());
    
    return unsubscribeConnectionListener;
  }, []);

  const reconnect = useCallback(async () => {
    try {
      await realtimeClient.reconnect();
    } catch (error) {
      console.error('Manual reconnection failed:', error);
    }
  }, []);

  return useMemo(() => ({
    isConnected: connectionStatus.isConnected,
    connectionStatus,
    reconnect,
    resetConnectionState: () => realtimeClient.resetConnectionStatus(),
  }), [connectionStatus, reconnect]);
}

/**
 * Hook for real-time messaging updates
 */
export function useRealtimeMessages(conversationId?: string) {
  const user = useUser();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !conversationId) return;

    const handleMessageChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Message change:', payload);
      
      // Invalidate conversation and messages queries
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['typing-indicators', conversationId] });
      
      // Handle new message notifications
      if (payload.eventType === 'INSERT') {
        const message = payload.new;
        if (message && message.sender_id !== user.id) {
          console.log('New message received:', message.content);
          
          // Show browser notification if enabled
          if (typeof window !== 'undefined' && Notification.permission === 'granted') {
            new Notification('New Message', {
              body: message.content as string,
              icon: '/favicon.ico',
            });
          }
        }
      }
    };

    subscriptionRef.current = realtimeClient.subscribeToMessages(
      conversationId,
      handleMessageChange
    );

    return () => {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, [user?.id, conversationId, queryClient]);

  return {
    isConnected: realtimeClient.getConnectionStatus(),
  };
}

/**
 * Hook for real-time conversation updates
 */
export function useRealtimeConversations() {
  const user = useUser();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const handleConversationChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Conversation change:', payload);
      
      // Invalidate conversations query
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    subscriptionRef.current = realtimeClient.subscribeToUserConversations(
      user.id,
      handleConversationChange
    );

    return () => {
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, [user?.id, queryClient]);

  return {
    isConnected: realtimeClient.getConnectionStatus(),
  };
}

/**
 * Hook for typing indicators in a conversation
 */
export function useTypingIndicators(conversationId?: string) {
  const user = useUser();
  const [typingUsers, setTypingUsers] = useState<unknown[]>([]);
  const subscriptionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !conversationId) return;

    const abortController = new AbortController();

    const handleTypingChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('Typing indicator change:', payload);

      // Refetch typing indicators
      fetch(`/api/messages/${conversationId}/typing`, { signal: abortController.signal })
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setTypingUsers(data.data);
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Error fetching typing indicators:', err);
          }
        });
    };

    subscriptionRef.current = realtimeClient.subscribeToTypingIndicators(
      conversationId,
      handleTypingChange
    );

    return () => {
      abortController.abort();
      if (subscriptionRef.current) {
        realtimeClient.unsubscribe(subscriptionRef.current);
      }
    };
  }, [user?.id, conversationId]);

  const setTyping = useCallback(async (typing: boolean) => {
    if (!conversationId) return;

    try {
      await fetch(`/api/messages/${conversationId}/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ typing }),
      });
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }, [conversationId]);

  return {
    typingUsers,
    setTyping,
    isConnected: realtimeClient.getConnectionStatus(),
  };
}

/**
 * Hook to setup all real-time subscriptions for a user
 */
export function useRealtimeSubscriptions() {
  const notifications = useRealtimeNotifications();
  const sessions = useRealtimeSessions();
  const conversations = useRealtimeConversations();
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
    conversations,
    isConnected: connection.isConnected,
    reconnect: connection.reconnect,
  };
}
