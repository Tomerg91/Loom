'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/store/auth-store';
import { PushNotificationService } from '@/lib/services/push-notification-service';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const user = useUser();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = PushNotificationService.isPushSupported();

  // Check current permission status and subscription
  useEffect(() => {
    if (!isSupported || !user?.id) return;

    const checkStatus = async () => {
      try {
        setPermission(PushNotificationService.getNotificationPermission());
        
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (error) {
        console.error('Error checking push notification status:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    checkStatus();
  }, [isSupported, user?.id]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      setError('Push notifications are not supported');
      return 'denied';
    }

    try {
      setError(null);
      const newPermission = await PushNotificationService.requestNotificationPermission();
      setPermission(newPermission);
      return newPermission;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permission';
      setError(errorMessage);
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user?.id) {
      setError('Push notifications not supported or user not authenticated');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission first if needed
      const currentPermission = await requestPermission();
      if (currentPermission !== 'granted') {
        setError('Notification permission denied');
        return false;
      }

      // Register service worker if not already registered
      if ('serviceWorker' in navigator) {
        let registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          await navigator.serviceWorker.ready;
        }

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          // Get VAPID public key
          const response = await fetch('/api/notifications/push/vapid-key');
          if (!response.ok) {
            throw new Error('Failed to get VAPID key');
          }
          
          const { vapidPublicKey } = await response.json();
          
          if (!vapidPublicKey) {
            throw new Error('VAPID public key not configured');
          }

          // Subscribe to push notifications
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        // Send subscription to server
        const subscribeResponse = await fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
          }),
        });

        if (!subscribeResponse.ok) {
          const errorData = await subscribeResponse.json();
          throw new Error(errorData.error || 'Failed to subscribe');
        }

        setIsSubscribed(true);
        return true;
      }

      setError('Service Worker not supported');
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe';
      setError(errorMessage);
      console.error('Error subscribing to push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user?.id) {
      setError('Push notifications not supported or user not authenticated');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }

        // Remove subscription from server
        const unsubscribeResponse = await fetch('/api/notifications/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!unsubscribeResponse.ok) {
          const errorData = await unsubscribeResponse.json();
          throw new Error(errorData.error || 'Failed to unsubscribe');
        }

        setIsSubscribed(false);
        return true;
      }

      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unsubscribe';
      setError(errorMessage);
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

/**
 * Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}