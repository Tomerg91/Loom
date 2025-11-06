'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
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
  MoreHorizontal,
  Search,
  Filter,
  Archive,
  Download,
  Clock,
  Volume2,
  VolumeX,
  Star,
  Loader2,
  ExternalLink,
  RotateCcw,
  Pause,
  Play,
  ChevronDown,
  Group,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-provider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUser } from '@/lib/auth/use-user';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useOfflineNotificationQueue } from '@/lib/notifications/offline-queue';
import { useRealtimeNotifications } from '@/lib/realtime/hooks';
import type { Notification, NotificationType } from '@/types';
import { logger } from '@/lib/logger';

interface NotificationsResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
  };
}

type NotificationPriority = 'high' | 'medium' | 'low';
type NotificationImportance = 'urgent' | 'important' | 'normal';
type SortOption = 'newest' | 'oldest' | 'unread' | 'priority' | 'type';
type GroupByOption = 'none' | 'type' | 'date' | 'importance';
type FilterOption = 'all' | 'unread' | 'read' | 'today' | 'week';

interface NotificationWithEnhancement extends Omit<Notification, 'data' | 'priority'> {
  priority?: NotificationPriority;
  importance?: NotificationImportance;
  isArchived?: boolean;
  snoozeUntil?: string;
  category?: string;
  threadId?: string;
  relatedNotifications?: string[];
  data?: Record<string, unknown>;
}

interface NotificationGroup {
  key: string;
  label: string;
  notifications: NotificationWithEnhancement[];
  unreadCount: number;
}

interface NotificationAction {
  id: string;
  type: 'mark_read' | 'delete' | 'archive' | 'snooze' | 'mark_all_read' | 'delete_all' | 'export';
  notificationId?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface NotificationAnalytics {
  clickedAt: string;
  notificationId: string;
  type: NotificationType;
  action: string;
  metadata?: Record<string, unknown>;
}

// Memoized notification item component
const NotificationItem = memo(({ 
  notification, 
  isSelected, 
  getNotificationIcon, 
  getNotificationTypeLabel, 
  formatNotificationTime, 
  handleNotificationClick, 
  markAsReadMutation, 
  deleteNotificationMutation 
}: {
  notification: NotificationWithEnhancement;
  isSelected: boolean;
  getNotificationIcon: (type: NotificationType) => React.ReactNode;
  getNotificationTypeLabel: (type: NotificationType) => string;
  formatNotificationTime: (dateString: string) => string;
  handleNotificationClick: (notification: NotificationWithEnhancement) => void;
  markAsReadMutation: {
    mutate: (id: string) => void;
  };
  deleteNotificationMutation: {
    mutate: (id: string) => void;
  };
}) => {
  const handleClick = useCallback(() => {
    handleNotificationClick(notification);
  }, [notification, handleNotificationClick]);

  const handleMarkAsRead = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notification.id);
  }, [markAsReadMutation, notification.id]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notification.id);
  }, [deleteNotificationMutation, notification.id]);

  return (
    <div
      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
        !notification.readAt ? 'bg-blue-50/50 border-l-2 border-l-blue-500' : ''
      }`}
      onClick={handleClick}
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
                  <DropdownMenuItem onClick={handleMarkAsRead}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleDelete}
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
  );
});

NotificationItem.displayName = 'NotificationItem';

function NotificationCenterComponent() {
  const t = useTranslations('notification');
  const router = useRouter();
  const locale = useLocale();
  const user = useUser();
  const queryClient = useQueryClient();
  const toast = useToast();
  const offlineQueue = useOfflineNotificationQueue();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [groupBy, setGroupBy] = useState<GroupByOption>('date');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [notificationSounds, setNotificationSounds] = useState(true);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [previewNotification, setPreviewNotification] = useState<NotificationWithEnhancement | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ isOpen: false, title: '', description: '', action: () => {} });
  
  // Focus management refs
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationListRef = useRef<HTMLDivElement>(null);
  
  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Auto-focus search when opening notification center
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        bellButtonRef.current?.focus();
      } else if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (notificationSounds && typeof window !== 'undefined') {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Fallback to system notification if audio fails
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        });
      } catch (error) {
        logger.warn('Could not play notification sound:', error);
      }
    }
  }, [notificationSounds]);
  
  // Analytics tracking
  const trackNotificationClick = useCallback((notification: NotificationWithEnhancement, action: string) => {
    const analyticsData: NotificationAnalytics = {
      clickedAt: new Date().toISOString(),
      notificationId: notification.id,
      type: notification.type,
      action,
      metadata: {
        isRead: !!notification.readAt,
        priority: notification.priority,
        importance: notification.importance,
        category: notification.category,
        userRole: user?.role,
      }
    };
    
    // Track with analytics service
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('notification_clicked', analyticsData as unknown as Record<string, unknown>);
    }
    
    // Store in navigation history
    setNavigationHistory(prev => [
      `${action}:${notification.id}:${new Date().toISOString()}`,
      ...prev.slice(0, 49) // Keep last 50 entries
    ]);
  }, [user?.role]);
  
  // Action loading state management
  const setActionLoading = useCallback((actionId: string, loading: boolean) => {
    setLoadingActions(prev => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(actionId);
      } else {
        newSet.delete(actionId);
      }
      return newSet;
    });
  }, []);

  // Enable real-time notifications with enhanced status
  const { 
    isConnected, 
    connectionStatus, 
    lastError, 
    fallbackPollingActive, 
    reconnect, 
    resetConnectionState 
  } = useRealtimeNotifications();

  // Fetch notifications
  const { data: notificationsData, isLoading, error: fetchError } = useQuery({
    queryKey: ['notifications', user?.id] as const,
    queryFn: async (): Promise<NotificationsResponse> => {
      const response = await fetch('/api/notifications?limit=20&sortOrder=desc');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: isConnected && !fallbackPollingActive ? false : 30000, // Poll when disconnected or using fallback
    retry: (failureCount, error: Error) => {
      // Retry up to 3 times for network errors, but not for auth errors
      if (failureCount >= 3) return false;
      if (error.message.includes('Unauthorized')) return false;
      return true;
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
        logger.error('Failed to mark notification as read:', error);
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
        logger.error('Failed to mark all notifications as read:', error);
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
        logger.error('Failed to delete notification:', error);
        toast.error('Error', 'Failed to delete notification. Please try again.');
      }
    },
  });

  // Bulk actions mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, notificationIds }: { action: string; notificationIds: string[] }) => {
      if (!navigator.onLine) {
        // Add bulk actions to offline queue
        notificationIds.forEach(id => {
          offlineQueue.addToQueue(action as any, id);
        });
        throw new Error('offline');
      }

      const response = await fetch('/api/notifications/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notificationIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} notifications`);
      }

      return response.json();
    },
    onSuccess: (_, { action, notificationIds }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotifications(new Set());
      toast.success('Success', `Successfully ${action}ed ${notificationIds.length} notification${notificationIds.length !== 1 ? 's' : ''}`);
    },
    onError: (error, { action, notificationIds }) => {
      if (error.message === 'offline') {
        toast.info('Offline', 'Actions queued for when connection is restored');
        // Optimistically update the UI
        queryClient.setQueryData<NotificationsResponse>(['notifications', user?.id], (old) => {
          if (!old) return old;
          
          switch (action) {
            case 'mark_read':
              return {
                ...old,
                data: old.data.map(n => 
                  notificationIds.includes(n.id) && !n.readAt 
                    ? { ...n, readAt: new Date().toISOString() }
                    : n
                ),
                pagination: {
                  ...old.pagination,
                  unreadCount: Math.max(0, old.pagination.unreadCount - notificationIds.filter(id => {
                    const notification = old.data.find(n => n.id === id);
                    return notification && !notification.readAt;
                  }).length),
                },
              };
            case 'delete':
              return {
                ...old,
                data: old.data.filter(n => !notificationIds.includes(n.id)),
                pagination: {
                  ...old.pagination,
                  total: old.pagination.total - notificationIds.length,
                  unreadCount: Math.max(0, old.pagination.unreadCount - notificationIds.filter(id => {
                    const notification = old.data.find(n => n.id === id);
                    return notification && !notification.readAt;
                  }).length),
                },
              };
            case 'archive':
              return {
                ...old,
                data: old.data.map(n => 
                  notificationIds.includes(n.id) 
                    ? { ...n, data: { ...n.data, isArchived: true }, readAt: n.readAt || new Date().toISOString() }
                    : n
                ),
                pagination: {
                  ...old.pagination,
                  unreadCount: Math.max(0, old.pagination.unreadCount - notificationIds.filter(id => {
                    const notification = old.data.find(n => n.id === id);
                    return notification && !notification.readAt;
                  }).length),
                },
              };
            default:
              return old;
          }
        });
        setSelectedNotifications(new Set());
      } else {
        logger.error(`Failed to ${action} notifications:`, error);
        toast.error('Error', `Failed to ${action} notifications. Please try again.`);
      }
    },
  });

  // Export notifications mutation
  const exportNotificationsMutation = useMutation({
    mutationFn: async (format: 'json' | 'csv') => {
      const response = await fetch(`/api/notifications/export?format=${format}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export notifications');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notifications_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: (_, format) => {
      toast.success('Success', `Notifications exported as ${format.toUpperCase()}`);
    },
    onError: (error) => {
      logger.error('Failed to export notifications:', error);
      toast.error('Error', 'Failed to export notifications. Please try again.');
    },
  });

  // Handle bulk actions
  const handleBulkAction = useCallback((action: string, notificationIds: string[]) => {
    if (notificationIds.length === 0) return;
    
    setActionLoading('bulk-action', true);
    bulkActionMutation.mutate(
      { action, notificationIds },
      {
        onSettled: () => setActionLoading('bulk-action', false),
      }
    );
  }, [bulkActionMutation, setActionLoading]);

  const getNotificationIcon = useCallback((type: NotificationType) => {
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
  }, []);

  const getNotificationTypeLabel = useCallback((type: NotificationType) => {
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
  }, [t]);

  const formatNotificationTime = useCallback((dateString: string) => {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'PP');
    }
  }, []);

  const handleNotificationClick = useCallback(async (notification: NotificationWithEnhancement) => {
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
        // Navigate to messages page
        targetPath = '/messages';
        // If conversation ID is provided, we could add it as a query parameter
        if (notification.data?.conversationId) {
          targetPath = `/messages?conversation=${notification.data.conversationId}`;
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
      logger.error('Navigation error:', error);
      toast.error('Error', 'Failed to navigate. Please try again.');
    }
  }, [markAsReadMutation, setIsOpen, router, user?.role, toast]);

  // Enhanced notification processing with filtering, sorting, and grouping
  const enhancedNotifications = useMemo(() => {
    const baseNotifications = (notificationsData?.data || []).map((n: Notification): NotificationWithEnhancement => ({
      ...n,
      priority: (n.data?.priority as NotificationPriority) || n.priority || 'normal',
      importance: (n.data?.importance as NotificationImportance) || 'normal',
      isArchived: (n.data?.isArchived as boolean) || false,
      snoozeUntil: n.data?.snoozeUntil as string | undefined,
      category: (n.data?.category as string) || n.type,
      threadId: n.data?.threadId as string | undefined,
      relatedNotifications: (n.data?.relatedNotifications as string[]) || [],
    }));
    
    // Apply search filter
    let filteredNotifications = baseNotifications;
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filteredNotifications = baseNotifications.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        getNotificationTypeLabel(n.type).toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    switch (filterBy) {
      case 'unread':
        filteredNotifications = filteredNotifications.filter(n => !n.readAt);
        break;
      case 'read':
        filteredNotifications = filteredNotifications.filter(n => !!n.readAt);
        break;
      case 'today':
        filteredNotifications = filteredNotifications.filter(n => 
          isToday(parseISO(n.createdAt))
        );
        break;
      case 'week':
        const weekStart = startOfWeek(new Date());
        const weekEnd = endOfWeek(new Date());
        filteredNotifications = filteredNotifications.filter(n => {
          const date = parseISO(n.createdAt);
          return date >= weekStart && date <= weekEnd;
        });
        break;
    }
    
    // Apply sorting
    filteredNotifications.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'unread':
          if (!a.readAt && b.readAt) return -1;
          if (a.readAt && !b.readAt) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'priority': {
          const priorityOrder: Record<string, number> = { urgent: 4, high: 3, normal: 2, medium: 2, low: 1 };
          const importanceOrder: Record<string, number> = { urgent: 5, important: 4, normal: 3 };
          const aScore = (a.importance && importanceOrder[a.importance] ? importanceOrder[a.importance] : 3) +
                        (a.priority && priorityOrder[a.priority] ? priorityOrder[a.priority] : 2);
          const bScore = (b.importance && importanceOrder[b.importance] ? importanceOrder[b.importance] : 3) +
                        (b.priority && priorityOrder[b.priority] ? priorityOrder[b.priority] : 2);
          return bScore - aScore;
        }
        case 'type':
          return a.type.localeCompare(b.type);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filteredNotifications;
  }, [notificationsData, debouncedSearchQuery, filterBy, sortBy]);
  
  // Group notifications
  const groupedNotifications = useMemo(() => {
    if (groupBy === 'none') {
      return [{
        key: 'all',
        label: 'All Notifications',
        notifications: enhancedNotifications,
        unreadCount: enhancedNotifications.filter(n => !n.readAt).length,
      }] as NotificationGroup[];
    }
    
    const groups: Record<string, NotificationGroup> = {};
    
    enhancedNotifications.forEach(notification => {
      let groupKey: string;
      let groupLabel: string;
      
      switch (groupBy) {
        case 'type':
          groupKey = notification.type;
          groupLabel = getNotificationTypeLabel(notification.type);
          break;
        case 'date': {
          const date = parseISO(notification.createdAt);
          if (isToday(date)) {
            groupKey = 'today';
            groupLabel = 'Today';
          } else if (isYesterday(date)) {
            groupKey = 'yesterday';
            groupLabel = 'Yesterday';
          } else {
            groupKey = format(date, 'yyyy-MM-dd');
            groupLabel = format(date, 'MMMM d, yyyy');
          }
          break;
        }
        case 'importance':
          groupKey = notification.importance || 'normal';
          groupLabel = (notification.importance || 'normal').charAt(0).toUpperCase() + 
                      (notification.importance || 'normal').slice(1);
          break;
        default:
          groupKey = 'all';
          groupLabel = 'All Notifications';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          label: groupLabel,
          notifications: [],
          unreadCount: 0,
        };
      }
      
      groups[groupKey].notifications.push(notification);
      if (!notification.readAt) {
        groups[groupKey].unreadCount++;
      }
    });
    
    return Object.values(groups).sort((a, b) => {
      // Sort groups by importance for importance grouping
      if (groupBy === 'importance') {
        const order = { urgent: 3, important: 2, normal: 1 };
        return (order[b.key as keyof typeof order] || 1) - (order[a.key as keyof typeof order] || 1);
      }
      // Sort by date for date grouping
      if (groupBy === 'date') {
        if (a.key === 'today') return -1;
        if (b.key === 'today') return 1;
        if (a.key === 'yesterday') return -1;
        if (b.key === 'yesterday') return 1;
        return b.key.localeCompare(a.key);
      }
      // Default alphabetical sort
      return a.label.localeCompare(b.label);
    });
  }, [enhancedNotifications, groupBy]);
  
  const notifications = enhancedNotifications;
  const unreadCount = notifications.filter(n => !n.readAt).length;
  
  // Selection management
  const handleSelectNotification = useCallback((notificationId: string, selected: boolean) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(notificationId);
      } else {
        newSet.delete(notificationId);
      }
      return newSet;
    });
  }, []);
  
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    } else {
      setSelectedNotifications(new Set());
    }
  }, [notifications]);
  
  const selectedCount = selectedNotifications.size;
  const allSelected = selectedCount > 0 && selectedCount === notifications.length;

  return (
    <TooltipProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                ref={bellButtonRef}
                variant="ghost" 
                size="sm" 
                className="relative" 
                data-testid="notification-bell"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
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
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {unreadCount > 0 
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` 
                  : 'No unread notifications'
                }
              </p>
            </TooltipContent>
          </Tooltip>
        </PopoverTrigger>
      
        <PopoverContent 
          className="w-96 p-0" 
          align="end" 
          data-testid="notification-dropdown"
          onOpenAutoFocus={(e) => {
            // Prevent auto focus on popover open to maintain keyboard navigation
            e.preventDefault();
          }}
        >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Notifications
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCount} selected
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Sound toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNotificationSounds(!notificationSounds)}
                      className="h-8 w-8 p-0"
                      aria-label={`${notificationSounds ? 'Disable' : 'Enable'} notification sounds`}
                    >
                      {notificationSounds ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{notificationSounds ? 'Disable' : 'Enable'} notification sounds</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Bulk actions */}
                {selectedCount > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={loadingActions.has('bulk-action')}>
                        {loadingActions.has('bulk-action') ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleBulkAction('mark_read', Array.from(selectedNotifications))}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as read
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkAction('archive', Array.from(selectedNotifications))}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Notifications',
                            description: `Are you sure you want to delete ${selectedCount} notification${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`,
                            action: () => handleBulkAction('delete', Array.from(selectedNotifications))
                          });
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {unreadCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllAsReadMutation.mutate()}
                        disabled={markAllAsReadMutation.isPending}
                        aria-label="Mark all notifications as read"
                      >
                        {markAllAsReadMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCheck className="h-4 w-4 mr-1" />
                        )}
                        Mark all read
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark all {unreadCount} notifications as read</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {/* Export notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={exportNotificationsMutation.isPending}
                          aria-label="Export notifications"
                        >
                          {exportNotificationsMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Export notification history</p>
                      </TooltipContent>
                    </Tooltip>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => exportNotificationsMutation.mutate('json')}
                    >
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => exportNotificationsMutation.mutate('csv')}
                    >
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setIsOpen(false);
                        router.push(`/${locale}/settings?tab=notifications`);
                      }}
                      className="h-8 w-8 p-0"
                      aria-label="Notification settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Notification settings</p>
                  </TooltipContent>
                </Tooltip>
                {/* Enhanced real-time indicator with status details */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div 
                      className={`w-2 h-2 rounded-full transition-colors ${
                        isConnected 
                          ? 'bg-green-500 animate-pulse' 
                          : fallbackPollingActive
                          ? 'bg-yellow-500'
                          : 'bg-red-400'
                      }`}
                      title={
                        isConnected 
                          ? 'Real-time updates active' 
                          : fallbackPollingActive
                          ? 'Using fallback polling - real-time connection lost'
                          : 'Real-time updates inactive'
                      }
                    />
                    {connectionStatus.reconnectionAttempts > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({connectionStatus.reconnectionAttempts})
                      </span>
                    )}
                  </div>
                  {(!isConnected || lastError) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={reconnect}
                      title="Reconnect to real-time updates"
                      className="p-1 h-auto"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {/* Search and filters */}
            <div className="space-y-3 mt-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search notifications... (Ctrl+F)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8"
                    aria-label="Search notifications"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-8 w-8 p-0"
                  aria-label="Toggle filters"
                >
                  <Filter className={`h-4 w-4 ${showFilters ? 'text-blue-600' : ''}`} />
                </Button>
              </div>
              
              {showFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                      <SelectItem value="importance">Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <CardDescription className="flex items-center justify-between mt-3">
              <span className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAll(!allSelected)}
                    className="h-6 px-1 text-xs"
                    aria-label={allSelected ? 'Deselect all' : 'Select all'}
                  >
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {}}
                      className="mr-1"
                      aria-hidden="true"
                    />
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </Button>
                )}
                <span>
                  {unreadCount > 0 
                    ? `${unreadCount} unread` 
                    : 'All read'
                  } • {notifications.length} total
                </span>
              </span>
              <div className="flex items-center gap-2">
                {fallbackPollingActive && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    Polling mode
                  </Badge>
                )}
              </div>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96" ref={notificationListRef}>
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
                  {lastError && (
                    <p className="text-xs text-muted-foreground mb-4 p-2 bg-muted rounded">
                      Connection issue: {lastError}
                    </p>
                  )}
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                    {(!isConnected || lastError) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetConnectionState();
                          reconnect();
                        }}
                      >
                        Reconnect
                      </Button>
                    )}
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-2">
                    {debouncedSearchQuery ? 'No notifications found' : 'No notifications yet'}
                  </p>
                  {debouncedSearchQuery && (
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      isSelected={selectedNotifications.has(notification.id)}
                      getNotificationIcon={getNotificationIcon}
                      getNotificationTypeLabel={getNotificationTypeLabel}
                      formatNotificationTime={formatNotificationTime}
                      handleNotificationClick={handleNotificationClick}
                      markAsReadMutation={markAsReadMutation}
                      deleteNotificationMutation={deleteNotificationMutation}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => 
        setConfirmDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </Popover>
    </TooltipProvider>
  );
}

// Memoize the main component
export const NotificationCenter = memo(NotificationCenterComponent);

// Export as default for dynamic imports
export default NotificationCenter;
