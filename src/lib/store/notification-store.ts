import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Notification, NotificationType } from '@/types';

// Enhanced notification preferences interface
export interface NotificationPreferences {
  email: {
    enabled: boolean;
    sessionReminders: boolean;
    sessionUpdates: boolean;
    messages: boolean;
    systemUpdates: boolean;
    marketing: boolean;
  };
  inApp: {
    enabled: boolean;
    sessionReminders: boolean;
    sessionUpdates: boolean;
    messages: boolean;
    systemUpdates: boolean;
    sounds: boolean;
    desktop: boolean;
  };
  push: {
    enabled: boolean;
    sessionReminders: boolean;
    messages: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
}

// Enhanced notification interface with additional properties
export interface EnhancedNotification extends Notification {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  channel?: 'email' | 'inapp' | 'push';
  expiresAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  isArchived?: boolean;
  snoozeUntil?: string;
  category?: string;
  threadId?: string;
  relatedNotifications?: string[];
}

interface NotificationState {
  notifications: EnhancedNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  preferences: NotificationPreferences | null;
  preferencesLoading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastSync: number | null;
  offlineQueue: Array<{
    id: string;
    action: string;
    notificationId?: string;
    timestamp: number;
    data?: any;
  }>;
  soundEnabled: boolean;
  doNotDisturb: boolean;
}

interface NotificationActions {
  // Basic CRUD operations
  setNotifications: (notifications: EnhancedNotification[]) => void;
  addNotification: (notification: EnhancedNotification) => void;
  updateNotification: (notificationId: string, updates: Partial<EnhancedNotification>) => void;
  removeNotification: (notificationId: string) => void;
  
  // Bulk operations
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  markMultipleAsRead: (notificationIds: string[]) => void;
  deleteMultiple: (notificationIds: string[]) => void;
  archiveMultiple: (notificationIds: string[]) => void;
  
  // State management
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearNotifications: () => void;
  
  // Connection management
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  updateLastSync: () => void;
  
  // Offline queue management
  addToOfflineQueue: (action: string, notificationId?: string, data?: any) => void;
  processOfflineQueue: () => Promise<void>;
  clearOfflineQueue: () => void;
  
  // Preferences management
  setPreferences: (preferences: NotificationPreferences) => void;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  setPreferencesLoading: (loading: boolean) => void;
  
  // UI state management
  setSoundEnabled: (enabled: boolean) => void;
  setDoNotDisturb: (enabled: boolean) => void;
  
  // Snooze functionality
  snoozeNotification: (notificationId: string, until: string) => void;
  unsnoozeNotification: (notificationId: string) => void;
  
  // Selectors
  getNotificationById: (notificationId: string) => EnhancedNotification | undefined;
  getNotificationsByType: (type: NotificationType) => EnhancedNotification[];
  getUnreadNotifications: () => EnhancedNotification[];
  getActiveNotifications: () => EnhancedNotification[];
  getNotificationsByPriority: (priority: string) => EnhancedNotification[];
  getNotificationsByCategory: (category: string) => EnhancedNotification[];
  
  // Analytics
  getNotificationStats: () => {
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    recentActivity: number;
  };
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        preferences: null,
        preferencesLoading: false,
        connectionStatus: 'disconnected' as const,
        lastSync: null,
        offlineQueue: [],
        soundEnabled: true,
        doNotDisturb: false,

        // Basic CRUD operations
        setNotifications: (notifications) => {
          set((state) => {
            state.notifications = notifications;
            state.unreadCount = notifications.filter((n) => !n.readAt && !n.isArchived).length;
            state.error = null;
            state.lastSync = Date.now();
          });
        },

        addNotification: (notification) => {
          set((state) => {
            // Check for duplicates
            const exists = state.notifications.some(n => n.id === notification.id);
            if (!exists) {
              state.notifications.unshift(notification);
              if (!notification.readAt && !notification.isArchived) {
                state.unreadCount += 1;
              }
            }
          });
        },

        updateNotification: (notificationId, updates) => {
          set((state) => {
            const index = state.notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
              const wasUnread = !state.notifications[index].readAt && !state.notifications[index].isArchived;
              Object.assign(state.notifications[index], updates);
              
              // Recalculate unread count
              const isNowUnread = !state.notifications[index].readAt && !state.notifications[index].isArchived;
              if (wasUnread && !isNowUnread) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              } else if (!wasUnread && isNowUnread) {
                state.unreadCount += 1;
              }
            }
          });
        },

        removeNotification: (notificationId) => {
          set((state) => {
            const index = state.notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
              const wasUnread = !state.notifications[index].readAt && !state.notifications[index].isArchived;
              state.notifications.splice(index, 1);
              if (wasUnread) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
            }
          });
        },

        // Bulk operations
        markAsRead: (notificationId) => {
          set((state) => {
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification && !notification.readAt) {
              notification.readAt = new Date().toISOString();
              if (!notification.isArchived) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
            }
          });
        },

        markAllAsRead: () => {
          set((state) => {
            const now = new Date().toISOString();
            state.notifications.forEach(notification => {
              if (!notification.readAt) {
                notification.readAt = now;
              }
            });
            state.unreadCount = 0;
          });
        },

        markMultipleAsRead: (notificationIds) => {
          set((state) => {
            const now = new Date().toISOString();
            let decrementCount = 0;
            
            notificationIds.forEach(id => {
              const notification = state.notifications.find(n => n.id === id);
              if (notification && !notification.readAt && !notification.isArchived) {
                notification.readAt = now;
                decrementCount += 1;
              }
            });
            
            state.unreadCount = Math.max(0, state.unreadCount - decrementCount);
          });
        },

        deleteMultiple: (notificationIds) => {
          set((state) => {
            let decrementCount = 0;
            
            state.notifications = state.notifications.filter(notification => {
              if (notificationIds.includes(notification.id)) {
                if (!notification.readAt && !notification.isArchived) {
                  decrementCount += 1;
                }
                return false;
              }
              return true;
            });
            
            state.unreadCount = Math.max(0, state.unreadCount - decrementCount);
          });
        },

        archiveMultiple: (notificationIds) => {
          set((state) => {
            let decrementCount = 0;
            
            notificationIds.forEach(id => {
              const notification = state.notifications.find(n => n.id === id);
              if (notification) {
                if (!notification.readAt && !notification.isArchived) {
                  decrementCount += 1;
                }
                notification.isArchived = true;
                notification.readAt = notification.readAt || new Date().toISOString();
              }
            });
            
            state.unreadCount = Math.max(0, state.unreadCount - decrementCount);
          });
        },

        // State management
        setUnreadCount: (unreadCount) => {
          set((state) => {
            state.unreadCount = unreadCount;
          });
        },

        setLoading: (isLoading) => {
          set((state) => {
            state.isLoading = isLoading;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
            state.isLoading = false;
          });
        },

        clearNotifications: () => {
          set((state) => {
            state.notifications = [];
            state.unreadCount = 0;
            state.error = null;
            state.isLoading = false;
          });
        },

        // Connection management
        setConnectionStatus: (status) => {
          set((state) => {
            state.connectionStatus = status;
          });
        },

        updateLastSync: () => {
          set((state) => {
            state.lastSync = Date.now();
          });
        },

        // Offline queue management
        addToOfflineQueue: (action, notificationId, data) => {
          set((state) => {
            state.offlineQueue.push({
              id: Date.now().toString(),
              action,
              notificationId,
              timestamp: Date.now(),
              data,
            });
          });
        },

        processOfflineQueue: async () => {
          const { offlineQueue } = get();
          if (offlineQueue.length === 0) return;

          try {
            for (const item of offlineQueue) {
              const endpoint = item.action === 'mark_read' 
                ? `/api/notifications/${item.notificationId}/read`
                : item.action === 'mark_all_read'
                ? '/api/notifications/mark-all-read'
                : `/api/notifications/${item.notificationId}`;
                
              const method = item.action === 'delete' ? 'DELETE' : 'POST';
              
              await fetch(endpoint, { method });
            }
            
            // Clear queue after successful processing
            get().clearOfflineQueue();
          } catch (error) {
            console.error('Failed to process offline queue:', error);
          }
        },

        clearOfflineQueue: () => {
          set((state) => {
            state.offlineQueue = [];
          });
        },

        // Preferences management
        setPreferences: (preferences) => {
          set((state) => {
            state.preferences = preferences;
            state.preferencesLoading = false;
          });
        },

        updatePreferences: (updates) => {
          set((state) => {
            if (state.preferences) {
              Object.assign(state.preferences, updates);
            }
          });
        },

        setPreferencesLoading: (loading) => {
          set((state) => {
            state.preferencesLoading = loading;
          });
        },

        // UI state management
        setSoundEnabled: (enabled) => {
          set((state) => {
            state.soundEnabled = enabled;
          });
        },

        setDoNotDisturb: (enabled) => {
          set((state) => {
            state.doNotDisturb = enabled;
          });
        },

        // Snooze functionality
        snoozeNotification: (notificationId, until) => {
          set((state) => {
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification) {
              notification.snoozeUntil = until;
              if (!notification.readAt && !notification.isArchived) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
            }
          });
        },

        unsnoozeNotification: (notificationId) => {
          set((state) => {
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification) {
              notification.snoozeUntil = undefined;
              if (!notification.readAt && !notification.isArchived) {
                state.unreadCount += 1;
              }
            }
          });
        },

        // Selectors
        getNotificationById: (notificationId) => {
          const notifications = get().notifications;
          return notifications.find((notification) => notification.id === notificationId);
        },

        getNotificationsByType: (type) => {
          const notifications = get().notifications;
          return notifications.filter((notification) => notification.type === type);
        },

        getUnreadNotifications: () => {
          const notifications = get().notifications;
          return notifications.filter((notification) => 
            !notification.readAt && !notification.isArchived && !notification.snoozeUntil
          );
        },

        getActiveNotifications: () => {
          const notifications = get().notifications;
          const now = new Date().toISOString();
          return notifications.filter((notification) => {
            if (notification.isArchived) return false;
            if (notification.expiresAt && notification.expiresAt <= now) return false;
            if (notification.snoozeUntil && notification.snoozeUntil > now) return false;
            return true;
          });
        },

        getNotificationsByPriority: (priority) => {
          const notifications = get().notifications;
          return notifications.filter((notification) => notification.priority === priority);
        },

        getNotificationsByCategory: (category) => {
          const notifications = get().notifications;
          return notifications.filter((notification) => notification.category === category);
        },

        // Analytics
        getNotificationStats: () => {
          const notifications = get().notifications;
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          
          const stats = {
            total: notifications.length,
            unread: notifications.filter(n => !n.readAt && !n.isArchived).length,
            byType: {} as Record<string, number>,
            byPriority: {} as Record<string, number>,
            recentActivity: notifications.filter(n => 
              new Date(n.createdAt).getTime() > oneDayAgo
            ).length,
          };
          
          notifications.forEach(notification => {
            // Count by type
            stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
            
            // Count by priority
            const priority = notification.priority || 'normal';
            stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
          });
          
          return stats;
        },
      })),
      {
        name: 'notification-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          notifications: state.notifications,
          unreadCount: state.unreadCount,
          preferences: state.preferences,
          soundEnabled: state.soundEnabled,
          doNotDisturb: state.doNotDisturb,
        }),
      }
    )
  )
);

// Enhanced selectors for better performance
export const useNotifications = () => useNotificationStore((state) => state.notifications);
export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);
export const useNotificationLoading = () => useNotificationStore((state) => state.isLoading);
export const useNotificationError = () => useNotificationStore((state) => state.error);
export const useNotificationPreferences = () => useNotificationStore((state) => state.preferences);
export const useNotificationConnectionStatus = () => useNotificationStore((state) => state.connectionStatus);
export const useNotificationStats = () => useNotificationStore((state) => state.getNotificationStats());

// Specific notification selectors
export const useUnreadNotifications = () => useNotificationStore((state) => state.getUnreadNotifications());
export const useActiveNotifications = () => useNotificationStore((state) => state.getActiveNotifications());