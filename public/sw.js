// ─── Task360 Service Worker ─────────────────────────────────────────
const CACHE_NAME = 'task360-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/kanban',
  '/meetings',
  '/settings',
  '/manifest.json',
];

// Install — precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — Network First for API, Cache First for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // API requests: network first, no cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // If offline and it's a GET request, return offline response
        return new Response(
          JSON.stringify({ success: false, error: 'Sem ligação à internet' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          // Update cache with fresh response
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return cached;
        });

      return cached || networkFetch;
    })
  );
});

// Push notifications (future-ready)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Task360', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: data.data || {},
        tag: data.tag || 'task360-notification',
      })
    );
  } catch {
    // ignore malformed push data
  }
});

// Notification click — open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window or open new
      for (const client of clients) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/dashboard');
    })
  );
});
