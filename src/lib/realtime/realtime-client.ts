'use client';

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/client';

type SubscriptionCallback<T extends { [key: string]: unknown } = { [key: string]: unknown }> = (payload: RealtimePostgresChangesPayload<T>) => void;

interface ConnectionStatus {
  isConnected: boolean;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  reconnectionAttempts: number;
  error: string | null;
}

export class RealtimeClient {
  private supabase = createClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    lastConnected: null,
    lastDisconnected: null,
    reconnectionAttempts: 0,
    error: null,
  };
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private maxReconnectionAttempts = 10;
  private baseReconnectionDelay = 1000; // Start with 1 second
  private maxReconnectionDelay = 30000; // Max 30 seconds
  private connectionListeners = new Set<(status: ConnectionStatus) => void>();
  private isReconnecting = false;

  constructor() {
    this.initializeConnectionMonitoring();
  }

  private initializeConnectionMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor connection status changes
    const checkConnection = () => {
      const wasConnected = this.connectionStatus.isConnected;
      const isNowConnected = this.supabase.realtime.isConnected();
      
      if (wasConnected !== isNowConnected) {
        if (isNowConnected) {
          this.connectionStatus = {
            ...this.connectionStatus,
            isConnected: true,
            lastConnected: new Date(),
            reconnectionAttempts: 0,
            error: null,
          };
          this.isReconnecting = false;
          console.log('Realtime connection established');
        } else {
          this.connectionStatus = {
            ...this.connectionStatus,
            isConnected: false,
            lastDisconnected: new Date(),
          };
          console.log('Realtime connection lost');
          this.scheduleReconnection();
        }
        
        this.notifyConnectionListeners();
      }
    };

    // Check connection status every second
    setInterval(checkConnection, 1000);

    // Listen for network events
    window.addEventListener('online', () => {
      console.log('Network came online, attempting reconnection...');
      this.reconnect();
    });

    window.addEventListener('offline', () => {
      console.log('Network went offline');
      this.connectionStatus = {
        ...this.connectionStatus,
        isConnected: false,
        lastDisconnected: new Date(),
        error: 'Network offline',
      };
      this.notifyConnectionListeners();
    });
  }

  private scheduleReconnection() {
    if (this.isReconnecting || this.connectionStatus.reconnectionAttempts >= this.maxReconnectionAttempts) {
      return;
    }

    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
    }

    const delay = Math.min(
      this.baseReconnectionDelay * Math.pow(2, this.connectionStatus.reconnectionAttempts),
      this.maxReconnectionDelay
    );

    this.reconnectionTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private notifyConnectionListeners() {
    this.connectionListeners.forEach(listener => {
      try {
        listener(this.connectionStatus);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  public addConnectionListener(listener: (status: ConnectionStatus) => void): () => void {
    this.connectionListeners.add(listener);
    // Return unsubscribe function
    return () => this.connectionListeners.delete(listener);
  }

  /**
   * Subscribe to notifications for a specific user
   */
  subscribeToNotifications(userId: string, callback: SubscriptionCallback) {
    const channelName = `notifications:${userId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const wrappedCallback = (payload: RealtimePostgresChangesPayload<unknown>) => {
      try {
        // Additional security check: ensure the payload is for the correct user
        if (payload.new && payload.new.user_id !== userId) {
          console.warn('Received notification for different user, ignoring');
          return;
        }
        callback(payload);
      } catch (error) {
        console.error('Error processing notification payload:', error);
      }
    };

    const channel = this.supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: userId },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        wrappedCallback
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to notifications for user: ${userId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to notifications for user: ${userId}`);
          this.connectionStatus = {
            ...this.connectionStatus,
            error: `Subscription failed for ${channelName}`,
          };
          this.notifyConnectionListeners();
        }
      });

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to session updates for a specific user (coach or client)
   */
  subscribeToUserSessions(userId: string, callback: SubscriptionCallback) {
    const channelName = `sessions:${userId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `coach_id=eq.${userId}`,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `client_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to all session updates (admin view)
   */
  subscribeToAllSessions(callback: SubscriptionCallback) {
    const channelName = 'sessions:all';
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to coach notes updates for a specific coach
   */
  subscribeToCoachNotes(coachId: string, callback: SubscriptionCallback) {
    const channelName = `notes:${coachId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_notes',
          filter: `coach_id=eq.${coachId}`,
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to reflections updates for a specific client
   */
  subscribeToReflections(clientId: string, callback: SubscriptionCallback) {
    const channelName = `reflections:${clientId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reflections',
          filter: `client_id=eq.${clientId}`,
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to coach availability updates
   */
  subscribeToCoachAvailability(coachId: string, callback: SubscriptionCallback) {
    const channelName = `availability:${coachId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coach_availability',
          filter: `coach_id=eq.${coachId}`,
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to user profile updates
   */
  subscribeToUserProfile(userId: string, callback: SubscriptionCallback) {
    const channelName = `profile:${userId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to presence for online/offline status
   */
  subscribeToPresence(channelName: string, userId: string, userInfo: { name: string; avatar?: string }) {
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName, {
        config: {
          presence: {
            key: userId,
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence sync:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...userInfo,
          });
        }
      });

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Get presence state for a channel
   */
  getPresenceState(channelName: string) {
    const channel = this.channels.get(channelName);
    return channel?.presenceState() || {};
  }

  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    console.log(`Unsubscribing from ${this.channels.size} channels`);
    for (const [channelName, channel] of this.channels) {
      try {
        this.supabase.removeChannel(channel);
        console.log(`Unsubscribed from ${channelName}`);
      } catch (error) {
        console.error(`Error unsubscribing from ${channelName}:`, error);
      }
    }
    this.channels.clear();
    
    // Clear connection listeners
    this.connectionListeners.clear();
    
    // Clear reconnection timer
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.connectionStatus.isConnected;
  }

  /**
   * Get detailed connection status
   */
  getDetailedConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Subscribe to messages in a specific conversation
   */
  subscribeToMessages(conversationId: string, callback: SubscriptionCallback) {
    const channelName = `messages:${conversationId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          // Check if this reaction belongs to a message in this conversation
          // This is handled by the callback which will invalidate queries
          callback(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to conversation updates for a user
   */
  subscribeToUserConversations(userId: string, callback: SubscriptionCallback) {
    const channelName = `user-conversations:${userId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Subscribe to typing indicators in a conversation
   */
  subscribeToTypingIndicators(conversationId: string, callback: SubscriptionCallback) {
    const channelName = `typing:${conversationId}`;
    
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channelName;
  }

  /**
   * Manual reconnection with exponential backoff
   */
  async reconnect() {
    if (this.isReconnecting) {
      console.log('Reconnection already in progress');
      return;
    }

    this.isReconnecting = true;
    this.connectionStatus.reconnectionAttempts++;
    
    try {
      console.log(`Attempting reconnection (${this.connectionStatus.reconnectionAttempts}/${this.maxReconnectionAttempts})`);
      
      // Clear existing timer
      if (this.reconnectionTimer) {
        clearTimeout(this.reconnectionTimer);
        this.reconnectionTimer = null;
      }

      // Disconnect and reconnect
      await this.supabase.realtime.disconnect();
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause
      await this.supabase.realtime.connect();
      
      // Wait a moment to check if connection was successful
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.supabase.realtime.isConnected()) {
        console.log('Reconnection successful');
        this.connectionStatus = {
          ...this.connectionStatus,
          isConnected: true,
          lastConnected: new Date(),
          reconnectionAttempts: 0,
          error: null,
        };
      } else {
        throw new Error('Connection not established after reconnect attempt');
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.connectionStatus = {
        ...this.connectionStatus,
        error: error instanceof Error ? error.message : 'Unknown reconnection error',
      };
      
      if (this.connectionStatus.reconnectionAttempts < this.maxReconnectionAttempts) {
        this.scheduleReconnection();
      } else {
        console.error('Max reconnection attempts reached');
        this.connectionStatus.error = 'Max reconnection attempts reached';
      }
    } finally {
      this.isReconnecting = false;
      this.notifyConnectionListeners();
    }
  }

  /**
   * Reset connection status (useful for testing or manual intervention)
   */
  resetConnectionStatus() {
    this.connectionStatus.reconnectionAttempts = 0;
    this.connectionStatus.error = null;
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
    this.isReconnecting = false;
  }
}

// Export singleton instance
export const realtimeClient = new RealtimeClient();