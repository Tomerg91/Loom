/**
 * Offline Message Queue
 * Handles message retry logic for offline scenarios
 */

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  replyToId?: string;
  attachments?: unknown[];
  timestamp: number;
  retryCount: number;
  lastRetryAt?: number;
  error?: string;
}

const QUEUE_STORAGE_KEY = 'message_offline_queue';
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms

class OfflineMessageQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadQueue();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load message queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save message queue:', error);
    }
  }

  /**
   * Add message to queue
   */
  addMessage(message: Omit<QueuedMessage, 'timestamp' | 'retryCount'>): string {
    const queuedMessage: QueuedMessage = {
      ...message,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedMessage);
    this.saveQueue();

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return queuedMessage.id;
  }

  /**
   * Remove message from queue
   */
  removeMessage(messageId: string) {
    this.queue = this.queue.filter(m => m.id !== messageId);
    this.saveQueue();
  }

  /**
   * Get all queued messages
   */
  getQueuedMessages(): QueuedMessage[] {
    return [...this.queue];
  }

  /**
   * Get queued messages for a specific conversation
   */
  getQueuedMessagesForConversation(conversationId: string): QueuedMessage[] {
    return this.queue.filter(m => m.conversationId === conversationId);
  }

  /**
   * Process the message queue
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;

    // Create a copy of the queue to iterate
    const messagesToProcess = [...this.queue];

    for (const message of messagesToProcess) {
      // Check if we should retry this message
      if (message.retryCount >= MAX_RETRIES) {
        console.warn(`Message ${message.id} exceeded max retries, removing from queue`);
        this.removeMessage(message.id);
        continue;
      }

      // Check if we need to wait before retrying
      if (message.lastRetryAt) {
        const delay = RETRY_DELAYS[message.retryCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        const nextRetryTime = message.lastRetryAt + delay;

        if (Date.now() < nextRetryTime) {
          continue; // Skip this message for now
        }
      }

      try {
        await this.sendMessage(message);
        this.removeMessage(message.id);
      } catch (error) {
        console.error(`Failed to send queued message ${message.id}:`, error);

        // Update retry count and timestamp
        const index = this.queue.findIndex(m => m.id === message.id);
        if (index !== -1) {
          this.queue[index].retryCount++;
          this.queue[index].lastRetryAt = Date.now();
          this.queue[index].error = error instanceof Error ? error.message : 'Unknown error';
          this.saveQueue();
        }
      }
    }

    this.isProcessing = false;

    // If there are still messages in queue and we're online, schedule another attempt
    if (this.queue.length > 0 && navigator.onLine) {
      setTimeout(() => this.processQueue(), 5000); // Try again in 5 seconds
    }
  }

  /**
   * Send a single message
   */
  private async sendMessage(message: QueuedMessage): Promise<void> {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: message.conversationId,
        content: message.content,
        replyToId: message.replyToId,
        attachments: message.attachments,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }

    return response.json();
  }

  /**
   * Handle offline event
   */
  private handleOffline() {
    console.log('Device went offline. Messages will be queued.');
  }

  /**
   * Manually retry a specific message
   */
  async retryMessage(messageId: string): Promise<void> {
    const message = this.queue.find(m => m.id === messageId);
    if (!message) {
      throw new Error('Message not found in queue');
    }

    if (!navigator.onLine) {
      throw new Error('Cannot retry while offline');
    }

    try {
      await this.sendMessage(message);
      this.removeMessage(messageId);
    } catch (error) {
      // Update retry count
      const index = this.queue.findIndex(m => m.id === messageId);
      if (index !== -1) {
        this.queue[index].retryCount++;
        this.queue[index].lastRetryAt = Date.now();
        this.queue[index].error = error instanceof Error ? error.message : 'Unknown error';
        this.saveQueue();
      }
      throw error;
    }
  }

  /**
   * Clear all queued messages
   */
  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      isOnline: navigator.onLine,
      failedMessages: this.queue.filter(m => m.retryCount >= MAX_RETRIES).length,
    };
  }
}

// Export singleton instance
export const offlineQueue = new OfflineMessageQueue();
