/// <reference lib="webworker" />

self.addEventListener("install", () => {
  // @ts-expect-error: skipping TS check for valid JS deployment
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // @ts-expect-error: skipping TS check for valid JS deployment
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // @ts-expect-error: skipping TS check for valid JS deployment
  if (event.request.method !== "GET") return;
  // @ts-expect-error: skipping TS check for valid JS deployment
  event.respondWith(
    // @ts-expect-error: skipping TS check for valid JS deployment
    fetch(event.request).catch(() => new Response("Offline", { status: 503, statusText: "Service Unavailable" }))
  );
});
