// Minimal service worker for PWA support
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  // No caching for now, just pass through
  event.respondWith(fetch(event.request));
});
