'use client';

// No external imports needed - logging only

interface QueuedNotification {
  id: string;
  action: 'mark_read' | 'delete' | 'mark_all_read';
  notificationId?: string;
  timestamp: number;
  retryCount: number;
}

class OfflineNotificationQueue {
  private queue: QueuedNotification[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds
  private storageKey = 'loom_notification_queue';

  constructor() {
    this.loadFromStorage();
    
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.processQueue.bind(this));
      window.addEventListener('offline', this.onOffline.bind(this));
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load notification queue from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save notification queue to storage:', error);
    }
  }

  private onOffline() {
    console.log('Network went offline - notification actions will be queued');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  public addToQueue(action: QueuedNotification['action'], notificationId?: string) {
    const queuedItem: QueuedNotification = {
      id: this.generateId(),
      action,
      notificationId,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedItem);
    this.saveToStorage();

    // If online, try to process immediately
    if (navigator.onLine) {
      this.processQueue();
    } else {
      console.log('Action queued for when connection is restored:', action);
    }
  }

  public async processQueue() {
    if (this.isProcessing || !navigator.onLine || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing ${this.queue.length} queued notification actions...`);

    const itemsToProcess = [...this.queue];
    
    for (const item of itemsToProcess) {
      try {
        await this.processQueuedItem(item);
        // Remove successful item from queue
        this.queue = this.queue.filter(q => q.id !== item.id);
      } catch (error) {
        console.error('Failed to process queued notification action:', error);
        
        // Increment retry count
        const queuedItem = this.queue.find(q => q.id === item.id);
        if (queuedItem) {
          queuedItem.retryCount++;
          
          // Remove if max retries exceeded
          if (queuedItem.retryCount >= this.maxRetries) {
            console.error('Max retries exceeded for notification action, removing from queue:', queuedItem);
            this.queue = this.queue.filter(q => q.id !== item.id);
          }
        }
      }
    }

    this.saveToStorage();
    this.isProcessing = false;

    if (this.queue.length > 0) {
      // Schedule retry for remaining items
      setTimeout(() => this.processQueue(), this.retryDelay);
    } else {
      console.log('All queued notification actions processed successfully');
    }
  }

  private async processQueuedItem(item: QueuedNotification): Promise<void> {
    switch (item.action) {
      case 'mark_read':
        if (!item.notificationId) throw new Error('Missing notification ID');
        await this.markAsRead(item.notificationId);
        break;
        
      case 'delete':
        if (!item.notificationId) throw new Error('Missing notification ID');
        await this.deleteNotification(item.notificationId);
        break;
        
      case 'mark_all_read':
        await this.markAllAsRead();
        break;
        
      default:
        throw new Error(`Unknown action: ${item.action}`);
    }
  }

  private async markAsRead(notificationId: string): Promise<void> {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark notification as read');
    }
  }

  private async deleteNotification(notificationId: string): Promise<void> {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete notification');
    }
  }

  private async markAllAsRead(): Promise<void> {
    const response = await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark all notifications as read');
    }
  }

  public getQueueStatus() {
    return {
      count: this.queue.length,
      isProcessing: this.isProcessing,
      items: this.queue.map(item => ({
        id: item.id,
        action: item.action,
        timestamp: item.timestamp,
        retryCount: item.retryCount,
      })),
    };
  }

  public clearQueue() {
    this.queue = [];
    this.saveToStorage();
    console.log('Notification queue cleared');
  }
}

// Export singleton instance
export const offlineNotificationQueue = new OfflineNotificationQueue();

// Hook for using the offline queue
export function useOfflineNotificationQueue() {
  const addToQueue = (action: QueuedNotification['action'], notificationId?: string) => {
    offlineNotificationQueue.addToQueue(action, notificationId);
  };

  const processQueue = () => {
    offlineNotificationQueue.processQueue();
  };

  const getStatus = () => {
    return offlineNotificationQueue.getQueueStatus();
  };

  const clearQueue = () => {
    offlineNotificationQueue.clearQueue();
  };

  return {
    addToQueue,
    processQueue,
    getStatus,
    clearQueue,
  };
}