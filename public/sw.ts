// Minimal Service Worker for PWA installation requirement
// It uses a standard online-passthrough fallback strategy.

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'it-asset-management-v1';

self.addEventListener('install', (event: ExtendableEvent) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  // Claim clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event: FetchEvent) => {
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
