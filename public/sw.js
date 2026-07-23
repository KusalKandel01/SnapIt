// A deliberately simple service worker: cache the app shell (pages, static
// assets) so the app still opens offline — your projects/drafts already
// live in localStorage, so opening the Editor offline still gets you your
// work. API routes (/api/stock, /api/ai, /api/news) are explicitly
// network-only and never cached — they need live data, and the app
// already handles their failure gracefully (clear error toasts) when
// there's no connection, so there's nothing worth caching there.

const CACHE_NAME = 'snapstudio-shell-v1';
const SHELL_URLS = [
  '/', '/editor', '/templates', '/projects', '/calendar', '/news', '/media', '/brand',
  '/manifest.json', '/icon-192.png', '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls — they need live data, and errors are already
  // handled gracefully by the app itself.
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // offline — fall back to whatever's cached
      return cached || network;
    })
  );
});
