/// <reference lib="webworker" />

// Minimal Service Worker for PWA installation requirement
// It uses a standard online-passthrough fallback strategy.

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', () => {
  // Skip waiting to activate immediately
  sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
  // Claim clients immediately
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener('fetch', (event) => {
  // We only intercept GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      // Passthrough fallback strategy: if offline, return a 503 Service Unavailable response
      // This PWA is strictly online-only, so no offline write-caching or caching of API paths is done.
      return new Response('Offline', { 
        status: 503, 
        statusText: 'Service Unavailable' 
      });
    })
  );
});
