const CACHE = 'ask-krishna-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/om.mp3'
];

// Install — cache all core assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return Promise.allSettled(ASSETS.map(function(a) { return c.add(a); }));
    })
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return clients.claim(); })
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', function(e) {
  // Don't intercept API calls — always go network for those
  if(e.request.url.indexOf('oletyashrith.workers.dev') !== -1) return;

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Cache successful GET responses
        if(e.request.method === 'GET' && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return response;
      })
      .catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || new Response('Offline — please reconnect to access Ask Krishna.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});
