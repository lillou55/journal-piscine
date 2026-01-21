/* sw.js */
const CACHE_VERSION = "v8"; // ⬅️ incrémente à chaque déploiement
const CACHE_NAME = `journal-piscine-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ Toujours tenter le réseau pour index.html / navigation (évite le “site figé”)
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        // ✅ clé stable (important iOS)
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }

  // ✅ Assets : cache-first, fallback réseau
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return cached;
    }
  })());
});