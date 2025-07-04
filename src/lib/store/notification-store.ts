import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Notification, NotificationType } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

interface NotificationActions {
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  updateNotification: (notificationId: string, updates: Partial<Notification>) => void;
  removeNotification: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearNotifications: () => void;
  getNotificationById: (notificationId: string) => Notification | undefined;
  getNotificationsByType: (type: NotificationType) => Notification[];
  getUnreadNotifications: () => Notification[];
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // State
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,

      // Actions
      setNotifications: (notifications) => {
        const unreadCount = notifications.filter((n) => !n.readAt).length;
        set({ notifications, unreadCount, error: null });
      },

      addNotification: (notification) => {
        const notifications = get().notifications;
        const newNotifications = [notification, ...notifications];
        const unreadCount = newNotifications.filter((n) => !n.readAt).length;
        set({ notifications: newNotifications, unreadCount });
      },

      updateNotification: (notificationId, updates) => {
        const notifications = get().notifications;
        const updatedNotifications = notifications.map((notification) =>
          notification.id === notificationId 
            ? { ...notification, ...updates } 
            : notification
        );
        const unreadCount = updatedNotifications.filter((n) => !n.readAt).length;
        set({ notifications: updatedNotifications, unreadCount });
      },

      removeNotification: (notificationId) => {
        const notifications = get().notifications;
        const filteredNotifications = notifications.filter(
          (notification) => notification.id !== notificationId
        );
        const unreadCount = filteredNotifications.filter((n) => !n.readAt).length;
        set({ notifications: filteredNotifications, unreadCount });
      },

      markAsRead: (notificationId) => {
        const notifications = get().notifications;
        const updatedNotifications = notifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, readAt: new Date().toISOString() }
            : notification
        );
        const unreadCount = updatedNotifications.filter((n) => !n.readAt).length;
        set({ notifications: updatedNotifications, unreadCount });
      },

      markAllAsRead: () => {
        const notifications = get().notifications;
        const now = new Date().toISOString();
        const updatedNotifications = notifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt || now,
        }));
        set({ notifications: updatedNotifications, unreadCount: 0 });
      },

      setUnreadCount: (unreadCount) => set({ unreadCount }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      clearNotifications: () => set({
        notifications: [],
        unreadCount: 0,
        error: null,
        isLoading: false,
      }),

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
        return notifications.filter((notification) => !notification.readAt);
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }), // Only persist notification data
    }
  )
);

// Selectors for better performance
export const useNotifications = () => useNotificationStore((state) => state.notifications);
export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);
export const useNotificationLoading = () => useNotificationStore((state) => state.isLoading);
export const useNotificationError = () => useNotificationStore((state) => state.error);