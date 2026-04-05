/**
 * Sahgal Classes PWA — network-first for HTML navigations so new Vite deploys
 * are not stuck behind a stale cached index.html (avoids white screen after release).
 */
const CACHE_NAME = "sahgal-classes-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached ?? new Response("Offline", { status: 503, statusText: "Offline" })
          )
        )
    );
    return;
  }

  event.respondWith(caches.match(request).then((response) => response || fetch(request)));
});
