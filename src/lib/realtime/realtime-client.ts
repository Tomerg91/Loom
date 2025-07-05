'use client';

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type SubscriptionCallback<T = Record<string, unknown>> = (payload: RealtimePostgresChangesPayload<T>) => void;

export class RealtimeClient {
  private supabase = createClient();
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to notifications for a specific user
   */
  subscribeToNotifications(userId: string, callback: SubscriptionCallback) {
    const channelName = `notifications:${userId}`;
    
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
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

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
          table: 'user_profiles',
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
    for (const [, channel] of this.channels) {
      this.supabase.removeChannel(channel);
    }
    this.channels.clear();
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.supabase.realtime.isConnected();
  }

  /**
   * Manual reconnection
   */
  reconnect() {
    this.supabase.realtime.disconnect();
    this.supabase.realtime.connect();
  }
}

// Export singleton instance
export const realtimeClient = new RealtimeClient();