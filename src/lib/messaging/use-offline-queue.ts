/**
 * React hook for offline message queue
 */

import { useEffect, useState } from 'react';

import { offlineQueue, type QueuedMessage } from './offline-queue';

export function useOfflineQueue() {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [status, setStatus] = useState(offlineQueue.getStatus());

  useEffect(() => {
    // Update state with current queue
    const updateQueue = () => {
      setQueuedMessages(offlineQueue.getQueuedMessages());
      setStatus(offlineQueue.getStatus());
    };

    // Initial load
    updateQueue();

    // Subscribe to queue changes
    const unsubscribe = offlineQueue.subscribe(updateQueue);

    return unsubscribe;
  }, []);

  return {
    queuedMessages,
    status,
    addMessage: offlineQueue.addMessage.bind(offlineQueue),
    removeMessage: offlineQueue.removeMessage.bind(offlineQueue),
    retryMessage: offlineQueue.retryMessage.bind(offlineQueue),
    clearQueue: offlineQueue.clearQueue.bind(offlineQueue),
    processQueue: offlineQueue.processQueue.bind(offlineQueue),
  };
}

/**
 * Hook to get queued messages for a specific conversation
 */
export function useConversationOfflineQueue(conversationId: string) {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);

  useEffect(() => {
    const updateQueue = () => {
      setQueuedMessages(
        offlineQueue.getQueuedMessagesForConversation(conversationId)
      );
    };

    // Initial load
    updateQueue();

    // Subscribe to queue changes
    const unsubscribe = offlineQueue.subscribe(updateQueue);

    return unsubscribe;
  }, [conversationId]);

  return {
    queuedMessages,
    retryMessage: offlineQueue.retryMessage.bind(offlineQueue),
  };
}

/**
 * Hook to monitor online/offline status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
