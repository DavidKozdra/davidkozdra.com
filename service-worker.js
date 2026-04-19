const CACHE_NAME = "pwa-cache-v3";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/css/DE_styles.css?v=1.1",
  "/assets/css/modern.css?v=1.16",
  "/assets/css/retro.css?v=1.4",
  "/assets/js/Games.js?v=1.0",
  "/assets/js/index.js",
  "/assets/js/apps.js",
  "/assets/images/brand/favicon.webp",
  "/assets/images/brand/icon-192.png",
  "/assets/images/brand/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  const isDocument = event.request.mode === "navigate";

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (isDocument) {
        try {
          const networkResponse = await fetch(event.request);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch {
          return (await cache.match(event.request)) || (await cache.match("/index.html"));
        }
      }

      const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetch(event.request);
      if (networkResponse.ok) {
        cache.put(event.request, networkResponse.clone());
      }
      return networkResponse;
    })()
  );
});
