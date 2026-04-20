const CACHE_NAME = "fartmaths-shell-v2";
const RUNTIME_CACHE = "fartmaths-runtime-v2";
const scopeUrl = new URL(self.registration.scope);
const homePath = new URL("./", scopeUrl).pathname;
const indexPath = new URL("./index.html", scopeUrl).pathname;
const appShell = [
  homePath,
  indexPath,
  new URL("./manifest.webmanifest", scopeUrl).pathname,
  new URL("./icon-192.png", scopeUrl).pathname,
  new URL("./icon-512.png", scopeUrl).pathname,
  new URL("./apple-touch-icon.png", scopeUrl).pathname
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(appShell)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(indexPath, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(indexPath);
          return cached || caches.match(homePath);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
