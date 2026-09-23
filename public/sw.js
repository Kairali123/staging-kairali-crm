self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('Service worker activated');
});

self.addEventListener('fetch', (event) => {
  // Just a dummy pass-through fetch handler to satisfy PWA requirements
});
