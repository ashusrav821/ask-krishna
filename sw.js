const CACHE = 'ask-krishna-v1';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.svg', '/icon-512.svg'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    fetch(e.request).catch(function() { return caches.match(e.request); })
  );
});
