// Service Worker for My Reader's Haven PWA
// Strategy:
//   - HTML (navigation): network-first (always get fresh index.html)
//   - JS/CSS/images: cache-first with network fallback, versioned cache
// Cache version bumped on each deploy to clear stale assets.
const CACHE_VERSION = 'mrh-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Asset types to cache
const CACHEABLE_EXTS = ['.js', '.css', '.png', '.webp', '.woff2', '.woff', '.json'];

function isCacheable(url) {
  const u = new URL(url);
  return CACHEABLE_EXTS.some(ext => u.pathname.endsWith(ext));
}

// On install: skip waiting so new SW activates immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activate: delete all old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Only handle same-origin GET requests
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  const url = new URL(req.url);

  // Navigation requests (HTML pages): network-first so app always gets fresh code
  if (req.mode === 'navigate' || url.pathname === '/' || (!url.pathname.includes('.') && !url.pathname.startsWith('/api'))) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Static assets: cache-first
  if (isCacheable(req.url)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      })
    );
    return;
  }

  // Everything else: network only (API calls, Convex, etc.)
});
