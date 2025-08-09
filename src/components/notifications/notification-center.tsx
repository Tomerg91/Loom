'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/store/auth-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeNotifications } from '@/lib/realtime/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Calendar, 
  MessageSquare, 
  AlertCircle,
  Settings,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/toast-provider';
import { useOfflineNotificationQueue } from '@/lib/notifications/offline-queue';
import type { Notification, NotificationType } from '@/types';

interface NotificationsResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
  };
}

export function NotificationCenter() {
  const t = useTranslations('notifications');
  const router = useRouter();
  const user = useUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const offlineQueue = useOfflineNotificationQueue();
  
  const [isOpen, setIsOpen] = useState(false);

  // Enable real-time notifications
  const { isConnected } = useRealtimeNotifications();

  // Fetch notifications
  const { data: notificationsData, isLoading, error: fetchError } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<NotificationsResponse> => {
      const response = await fetch('/api/notifications?limit=20&sortOrder=desc');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: isConnected ? false : 30000, // Only poll when not connected to real-time
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for auth errors
      if (failureCount >= 3) return false;
      if (error.message.includes('Unauthorized')) return false;
      return true;
    },
    onError: (error) => {
      console.error('Failed to fetch notifications:', error);
      if (!error.message.includes('Unauthorized')) {
        toast.error('Error', 'Failed to load notifications. Please refresh the page.');
      }
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!navigator.onLine) {
        // Add to offline queue
        offlineQueue.addToQueue('mark_read', notificationId);
        throw new Error('offline');
      }

      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark notification as read');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error, notificationId) => {
      if (error.message === 'offline') {
        toast.info('Offline', 'Action queued for when connection is restored');
        // Optimistically update the UI
        queryClient.setQueryData<NotificationsResponse>(['notifications', user?.id], (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map(n => 
              n.id === notificationId 
                ? { ...n, readAt: new Date().toISOString() }
                : n
            ),
            pagination: {
              ...old.pagination,
              unreadCount: Math.max(0, old.pagination.unreadCount - 1),
            },
          };
        });
      } else {
        console.error('Failed to mark notification as read:', error);
        toast.error('Error', 'Failed to mark notification as read. Please try again.');
      }
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!navigator.onLine) {
        // Add to offline queue
        offlineQueue.addToQueue('mark_all_read');
        throw new Error('offline');
      }

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark all notifications as read');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Success', 'All notifications marked as read');
    },
    onError: (error) => {
      if (error.message === 'offline') {
        toast.info('Offline', 'Action queued for when connection is restored');
        // Optimistically update the UI
        queryClient.setQueryData<NotificationsResponse>(['notifications', user?.id], (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
            pagination: {
              ...old.pagination,
              unreadCount: 0,
            },
          };
        });
      } else {
        console.error('Failed to mark all notifications as read:', error);
        toast.error('Error', 'Failed to mark all notifications as read. Please try again.');
      }
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!navigator.onLine) {
        // Add to offline queue
        offlineQueue.addToQueue('delete', notificationId);
        throw new Error('offline');
      }

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete notification');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Success', 'Notification deleted');
    },
    onError: (error, notificationId) => {
      if (error.message === 'offline') {
        toast.info('Offline', 'Action queued for when connection is restored');
        // Optimistically update the UI
        queryClient.setQueryData<NotificationsResponse>(['notifications', user?.id], (old) => {
          if (!old) return old;
          const deletedNotification = old.data.find(n => n.id === notificationId);
          return {
            ...old,
            data: old.data.filter(n => n.id !== notificationId),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1,
              unreadCount: deletedNotification && !deletedNotification.readAt 
                ? old.pagination.unreadCount - 1 
                : old.pagination.unreadCount,
            },
          };
        });
      } else {
        console.error('Failed to delete notification:', error);
        toast.error('Error', 'Failed to delete notification. Please try again.');
      }
    },
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'session_reminder':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'session_confirmation':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'new_message':
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case 'system_update':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'session_reminder':
        return t('sessionReminder');
      case 'session_confirmation':
        return t('sessionConfirmation');
      case 'new_message':
        return t('newMessage');
      case 'system_update':
        return t('systemUpdate');
      default:
        return t('notification');
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'PP');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark notification as read if not already read
      if (!notification.readAt) {
        markAsReadMutation.mutate(notification.id);
      }

      // Close the notification panel
      setIsOpen(false);

      // Handle notification action based on type and data
      let targetPath = '/dashboard'; // Default fallback

      if (notification.data?.sessionId) {
        // Navigate to session details page
        targetPath = `/sessions/${notification.data.sessionId}`;
      } else if (notification.type === 'new_message') {
        // Navigate to messages based on user role and notification data
        if (notification.data?.coachId && user?.role === 'client') {
          targetPath = `/client/coach/${notification.data.coachId}`;
        } else if (notification.data?.clientId && user?.role === 'coach') {
          targetPath = `/coach/clients/${notification.data.clientId}`;
        } else if (notification.data?.noteId && user?.role === 'client') {
          targetPath = `/client/notes`;
        } else {
          // Fallback based on user role
          targetPath = user?.role === 'client' ? '/client' : '/coach/clients';
        }
      } else if (notification.type === 'session_reminder' || notification.type === 'session_confirmation') {
        // Navigate to appropriate dashboard or session view
        if (notification.data?.sessionId) {
          targetPath = `/sessions/${notification.data.sessionId}`;
        } else {
          targetPath = user?.role === 'client' ? '/client/sessions' : '/coach/sessions';
        }
      } else if (notification.type === 'system_update') {
        // Navigate to settings or announcements
        targetPath = '/settings';
      }

      // Navigate to the target path
      await router.push(targetPath);
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Error', 'Failed to navigate. Please try again.');
    }
  };

  const notifications = notificationsData?.data || [];
  const unreadCount = notificationsData?.pagination.unreadCount || 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" data-testid="notification-bell">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
              data-testid="unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end" data-testid="notification-dropdown">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/settings?tab=notifications');
                  }}
                  title="Notification Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {/* Real-time indicator */}
                <div className="flex items-center gap-1">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    title={isConnected ? 'Real-time updates active' : 'Real-time updates inactive'}
                  />
                </div>
              </div>
            </div>
            {unreadCount > 0 && (
              <CardDescription>
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : fetchError ? (
                <div className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
                  <p className="text-destructive mb-2">Failed to load notifications</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {fetchError.message || 'Please try again later'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}
                  >
                    Try Again
                  </Button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                        !notification.readAt ? 'bg-blue-50/50 border-l-2 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                      data-testid="notification-item"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium line-clamp-2">
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {notification.message}
                              </p>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 ml-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!notification.readAt && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsReadMutation.mutate(notification.id);
                                    }}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Mark as read
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotificationMutation.mutate(notification.id);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs">
                              {getNotificationTypeLabel(notification.type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}