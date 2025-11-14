/*
  Enhanced PWA service worker for Loom
  - Caches Next.js static assets with stale-while-revalidate
  - Handles push notifications with rich media support
  - Manages notification clicks and actions
  - Avoids caching API/auth and HTML navigations to prevent stale auth
*/

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const STATIC_CACHE = 'static-v1';

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache API/auth or Supabase endpoints
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;
  if (url.hostname.endsWith('.supabase.co')) return;

  // Only cache Next static assets and images
  const isStaticAsset = (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/')
  );

  if (!isStaticAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    const network = fetch(req)
      .then((res) => {
        cache.put(req, res.clone());
        return res;
      })
      .catch(() => cached);
    return cached || network;
  })());
});

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'loom-notification',
    requireInteraction: false,
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || payload.message || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        image: payload.image,
        tag: payload.tag || notificationData.tag,
        requireInteraction: payload.requireInteraction || false,
        vibrate: payload.vibrate || [200, 100, 200],
        actions: payload.actions || [],
        data: {
          url: payload.url || payload.data?.url || '/',
          notificationId: payload.notificationId || payload.data?.notificationId,
          type: payload.type || payload.data?.type,
          ...payload.data
        }
      };
    } catch (error) {
      console.error('Error parsing push notification payload:', error);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      actions: notificationData.actions,
      data: notificationData.data,
      silent: false
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const notificationId = event.notification.data?.notificationId;

  event.waitUntil(
    (async () => {
      // Mark notification as read if we have an ID
      if (notificationId) {
        try {
          await fetch(`${self.location.origin}/api/notifications/${notificationId}/read`, {
            method: 'POST',
            credentials: 'include'
          });
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      }

      // Track notification click analytics
      try {
        await fetch(`${self.location.origin}/api/notifications/analytics/click`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            notificationId,
            type: event.notification.data?.type,
            action: event.action || 'default',
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Error tracking notification click:', error);
      }

      // Handle action button clicks
      if (event.action) {
        const actionUrl = event.notification.actions?.find(a => a.action === event.action)?.url;
        if (actionUrl) {
          const fullUrl = new URL(actionUrl, self.location.origin).href;
          return self.clients.openWindow(fullUrl);
        }
      }

      // Open or focus the target URL
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Check if there's already a window open with this URL
      for (const client of clients) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);

        if (clientUrl.pathname === targetUrl.pathname) {
          if ('focus' in client) {
            return client.focus();
          }
        }
      }

      // If no matching window found, open a new one
      if (self.clients.openWindow) {
        const fullUrl = new URL(urlToOpen, self.location.origin).href;
        return self.clients.openWindow(fullUrl);
      }
    })()
  );
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);

  // Track dismissal analytics
  const notificationId = event.notification.data?.notificationId;
  if (notificationId) {
    event.waitUntil(
      fetch(`${self.location.origin}/api/notifications/analytics/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          notificationId,
          type: event.notification.data?.type,
          timestamp: new Date().toISOString()
        })
      }).catch(error => {
        console.error('Error tracking notification dismissal:', error);
      })
    );
  }
});

// Background sync for offline notification actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notification-actions') {
    event.waitUntil(
      (async () => {
        // Process queued notification actions when back online
        try {
          const response = await fetch(`${self.location.origin}/api/notifications/sync`, {
            method: 'POST',
            credentials: 'include'
          });
          console.log('Notification actions synced:', response.status);
        } catch (error) {
          console.error('Error syncing notification actions:', error);
        }
      })()
    );
  }
});

