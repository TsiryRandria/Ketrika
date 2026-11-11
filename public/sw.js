// Ketrika Offline Service Worker
const CACHE_NAME = 'ketrika-offline-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/fonts/local-fonts.css',
  '/sql-wasm.wasm',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/assets/images/avatar_user.jpg',
  '/assets/images/project_architecture.jpg',
  '/assets/images/project_code.jpg',
  '/assets/images/project_eco.jpg',
  '/assets/images/project_tech.jpg',
  '/assets/images/note_meeting.jpg',
  '/assets/logos/google.ico',
  '/assets/logos/microsoft.svg',
  '/assets/logos/meta.svg',
  '/assets/logos/aws.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Ketrika SW] Pre-caching offline assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[Ketrika SW] Pre-cache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Ketrika SW] Deleting stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-First for static assets, fonts, wasm, images
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and refresh in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {
          // offline, ignore
        });
        return cachedResponse;
      }

      // Fetch from network, and cache successful responses
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/') || caches.match('/index.html');
          }
        });
    })
  );
});
