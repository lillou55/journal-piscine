/* sw.js */
const CACHE_VERSION = "v6"; // 👈 incrémente à chaque déploiement
const CACHE_NAME = `journal-piscine-${CACHE_VERSION}`;

// Mets ici les fichiers statiques (si tu en as d'autres : icons, css, etc.)
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // 👈 prend la main dès l’installation
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim(); // 👈 contrôle les pages ouvertes
  })());
});

// Permet à la page de dire au SW "active-toi maintenant"
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ IMPORTANT : index.html en NETWORK FIRST (pour éviter l’app figée)
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        // offline -> cache
        const cached = await caches.match(req);
        return cached || caches.match("./index.html");
      }
    })());
    return;
  }

  // Le reste : cache-first (rapide), fallback réseau
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