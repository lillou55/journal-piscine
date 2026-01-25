/* sw.js */
//const CACHE_VERSION = "v8"; // 🔁 incrémentable si besoin
const CACHE_VERSION = "__BUILD__"; // <--- GitHub Action remplacera ceci
const CACHE_NAME = `journal-piscine-${CACHE_VERSION}`;
const BUILD_ID = CACHE_VERSION; // pour debug

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))
    )
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

// DEBUG + COMMANDS
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "GET_VERSION") {
    event.ports[0].postMessage({
      build: BUILD_ID,
      cache: CACHE_NAME,
      assets: ASSETS
    });
  }
});

// FETCH
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 🟢 NAVIGATION / INDEX : NETWORK FIRST
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }

  // 🟡 ASSETS : CACHE FIRST
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return cached;
    }
  })());
});
