/*
  Minimal PWA service worker for Loom
  - Caches Next.js static assets with stale-while-revalidate
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

