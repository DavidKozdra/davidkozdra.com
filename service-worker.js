const CACHE_NAME = "pwa-cache-v9";
const PRECACHE_URLS = [
  "/assets/css/desktop-shell.min.css",
  "/assets/js/desktop.min.js",
  "/",
  "/index.html",
  "/manifest.json",
  "/assets/css/DE_styles.min.css?v=1.5",
  "/assets/css/modern.min.css?v=1.18",
  "/assets/css/retro.min.css?v=1.6",
  "/assets/js/Games.min.js?v=1.1",
  "/assets/js/index.min.js?v=1.1",
  "/assets/js/apps.min.js",
  "/assets/images/brand/favicon.ico",
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

      const cachedResponse = await cache.match(event.request);
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
