import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { createNotificationService } from '@/lib/database';
import type { Notification, NotificationType } from '@/types';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...notificationKeys.lists(), { filters }] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  user: (userId: string) => [...notificationKeys.all, 'user', userId] as const,
  unreadCount: (userId: string) => [...notificationKeys.user(userId), 'unread-count'] as const,
  byType: (userId: string, type: NotificationType) => [...notificationKeys.user(userId), 'type', type] as const,
  scheduled: () => [...notificationKeys.all, 'scheduled'] as const,
};

// Hooks
export function useUserNotifications(
  userId: string, 
  limit = 50, 
  includeRead = true
) {
  const notificationService = createNotificationService(false);
  
  return useQuery({
    queryKey: notificationKeys.list({ userId, limit, includeRead }),
    queryFn: () => notificationService.getUserNotifications(userId, limit, includeRead),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

export function useUnreadNotificationCount(userId: string) {
  const notificationService = createNotificationService(false);
  
  return useQuery({
    queryKey: notificationKeys.unreadCount(userId),
    queryFn: () => notificationService.getUnreadCount(userId),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 1 * 60 * 1000, // Refetch every minute
  });
}

export function useNotification(notificationId: string) {
  const notificationService = createNotificationService(false);
  
  return useQuery({
    queryKey: notificationKeys.detail(notificationId),
    queryFn: () => notificationService.getNotification(notificationId),
    enabled: !!notificationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNotificationsByType(userId: string, type: NotificationType, limit = 20) {
  const notificationService = createNotificationService(false);
  
  return useQuery({
    queryKey: notificationKeys.byType(userId, type),
    queryFn: () => notificationService.getNotificationsByType(userId, type, limit),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useScheduledNotifications() {
  const notificationService = createNotificationService(false);
  
  return useQuery({
    queryKey: notificationKeys.scheduled(),
    queryFn: () => notificationService.getScheduledNotifications(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Mutations
export function useCreateNotification() {
  const queryClient = useQueryClient();
  const notificationService = createNotificationService(false);

  return useMutation({
    mutationFn: (notificationData: {
      userId: string;
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, unknown>;
      scheduledFor?: Date;
    }) => notificationService.createNotification(notificationData),
    onSuccess: (data, variables) => {
      if (data) {
        // Invalidate user notifications
        queryClient.invalidateQueries({ 
          queryKey: notificationKeys.user(variables.userId) 
        });
        queryClient.invalidateQueries({ 
          queryKey: notificationKeys.unreadCount(variables.userId) 
        });
        
        // If it's a scheduled notification, invalidate scheduled notifications
        if (variables.scheduledFor) {
          queryClient.invalidateQueries({ 
            queryKey: notificationKeys.scheduled() 
          });
        }
      }
    },
  });
}

export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();
  const notificationService = createNotificationService(false);

  return useMutation({
    mutationFn: ({ userId, notificationIds }: { 
      userId: string; 
      notificationIds?: string[] 
    }) => notificationService.markAsRead(userId, notificationIds),
    onSuccess: (updatedCount, { userId }) => {
      if (updatedCount > 0) {
        // Invalidate user notifications and unread count
        queryClient.invalidateQueries({ 
          queryKey: notificationKeys.user(userId) 
        });
        queryClient.invalidateQueries({ 
          queryKey: notificationKeys.unreadCount(userId) 
        });
      }
    },
  });
}

export function useMarkSingleNotificationAsRead() {
  const queryClient = useQueryClient();
  const notificationService = createNotificationService(false);

  return useMutation({
    mutationFn: ({ notificationId, userId }: { 
      notificationId: string; 
      userId: string 
    }) => notificationService.markSingleAsRead(notificationId, userId),
    onSuccess: (success, { notificationId, userId }) => {
      if (success) {
        // Update the specific notification cache
        queryClient.setQueryData(
          notificationKeys.detail(notificationId),
          (old: Notification | undefined) => 
            old ? { ...old, readAt: new Date().toISOString() } : old
        );
        
        // Invalidate user notifications and unread count
        queryClient.invalidateQueries({ 
          queryKey: notificationKeys.user(userId) 
        });
        queryClient.invalidateQueries({ 
          queryKey: notificationKeys.unreadCount(userId) 
        });
      }
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const notificationService = createNotificationService(false);

  return useMutation({
    mutationFn: ({ notificationId, userId }: { 
      notificationId: string; 
      userId: string 
    }) => notificationService.deleteNotification(notificationId, userId),
    onSuccess: (success, { notificationId, userId }) => {
      if (success) {
        // Remove from cache
        queryClient.removeQueries({ 
          queryKey: notificationKeys.detail(notificationId) 
        });
        
        // Invalidate user notifications and unread count
        queryClient.invalidateQueries({ 
          queryKey: notificationKeys.user(userId) 
        });
        queryClient.invalidateQueries({ 
          queryKey: notificationKeys.unreadCount(userId) 
        });
      }
    },
  });
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();
  const notificationService = createNotificationService(false);

  return useMutation({
    mutationFn: (userId: string) => notificationService.deleteAllNotifications(userId),
    onSuccess: (success, userId) => {
      if (success) {
        // Clear all notification caches for this user
        queryClient.removeQueries({ 
          queryKey: notificationKeys.user(userId) 
        });
        queryClient.setQueryData(notificationKeys.unreadCount(userId), 0);
      }
    },
  });
}

// Convenience mutation hooks for specific notification types
export function useCreateSessionReminder() {
  const { ...rest } = useCreateNotification();

  const createSessionReminder = (
    userId: string, 
    sessionId: string, 
    sessionTitle: string, 
    scheduledAt: Date
  ) => {
    const notificationService = createNotificationService(false);
    return notificationService.createSessionReminder(userId, sessionId, sessionTitle, scheduledAt);
  };

  return {
    createSessionReminder,
    ...rest,
  };
}

export function useCreateNewMessageNotification() {
  const { ...rest } = useCreateNotification();

  const createNewMessageNotification = (
    userId: string, 
    fromUserName: string, 
    messageType: string
  ) => {
    const notificationService = createNotificationService(false);
    return notificationService.createNewMessageNotification(userId, fromUserName, messageType);
  };

  return {
    createNewMessageNotification,
    ...rest,
  };
}

export function useCreateSessionConfirmation() {
  const { ...rest } = useCreateNotification();

  const createSessionConfirmation = (
    userId: string, 
    sessionId: string, 
    sessionTitle: string
  ) => {
    const notificationService = createNotificationService(false);
    return notificationService.createSessionConfirmation(userId, sessionId, sessionTitle);
  };

  return {
    createSessionConfirmation,
    ...rest,
  };
}

export function useMarkNotificationAsSent() {
  const queryClient = useQueryClient();
  const notificationService = createNotificationService(false);

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsSent(notificationId),
    onSuccess: (success, notificationId) => {
      if (success) {
        // Update the specific notification cache
        queryClient.setQueryData(
          notificationKeys.detail(notificationId),
          (old: Notification | undefined) => 
            old ? { ...old, sentAt: new Date().toISOString() } : old
        );
        
        // Invalidate scheduled notifications
        queryClient.invalidateQueries({ 
          queryKey: notificationKeys.scheduled() 
        });
      }
    },
  });
}