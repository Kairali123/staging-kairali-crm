self.addEventListener('install', (event) => {
  // Force new service worker to take over immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately so updates happen on the fly
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy for everything to ensure constant updates.
  // We don't cache anything aggressively to ensure the app is always up to date.
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
