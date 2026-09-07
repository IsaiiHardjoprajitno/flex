/**
 * FieldOps Service Worker
 * Provides offline caching for static assets and app shell
 */

const CACHE_NAME = 'fieldops-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/client/',
  '/client/index.html',
  '/css/styles.css',
  '/js/auth.js',
  '/js/db.js',
  '/js/app.js',
  '/js/modules/staff.js',
  '/js/modules/teamLogger.js',
  '/js/modules/attendance.js',
  '/js/modules/analytics.js',
  '/js/modules/export.js',
  '/manifest.json',
  '/icon.svg',
  '/privacy.html',
  '/terms.html',
  '/client/privacy.html',
  '/client/terms.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache warning:', err);
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
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for http/https
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Network-first for APIs, Cache-first fallback for static assets
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
