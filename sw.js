const CACHE = "tabi-japan-v171";
const TILE_CACHE = "tabi-tiles-v1";
const IMAGE_CACHE = "tabi-images-v1";
// Il solo prefetch delle tappe vale 297 riquadri: con un tetto più basso una
// passeggiata sulla mappa sfratterebbe le città appena scaricate.
const TILE_LIMIT = 700;
// Stesso token di index.html, sempre: se divergono il precache salva URL che la
// pagina non richiederà mai, e l'app "offline" riscarica tutto dalla rete.
// L'allineamento è verificato da scripts/check-guide-integrity.mjs.
const VERSION = "?v=20260808e";

// Guscio di prima parte: senza questo l'app non parte. L'installazione fallisce
// se manca anche un solo file, ed è giusto così.
const SHELL = [
  "./", "index.html", "manifest.webmanifest" + VERSION,
  "assets/styles.css" + VERSION, "assets/parse-lib.js" + VERSION, "assets/data.js" + VERSION, "assets/food-data.js" + VERSION,
  "assets/shopping-data.js" + VERSION, "assets/food-extra-data.js" + VERSION, "assets/travel-data.js" + VERSION, "assets/history-data.js" + VERSION,
  "assets/phrases-data.js" + VERSION, "assets/glossary-data.js" + VERSION, "assets/packing-data.js" + VERSION, "assets/money-data.js" + VERSION, "assets/day-tips-data.js" + VERSION,
  "assets/map-data.js" + VERSION, "assets/merchants-data.js" + VERSION, "assets/stamps-data.js" + VERSION, "assets/transit-data.js" + VERSION, "assets/experiences-data.js" + VERSION, "assets/source-data.js" + VERSION, "assets/story-data.js" + VERSION, "assets/guide-data.js" + VERSION, "assets/curated-images-data.js" + VERSION, "assets/offline-size-data.js" + VERSION, "assets/offline-pack-manifest.js" + VERSION, "assets/offline-resume-logic.js" + VERSION, "assets/offline-pack.js" + VERSION, "assets/map.js" + VERSION,
  "assets/documents.js" + VERSION, "assets/backup.js" + VERSION, "assets/app.js" + VERSION,
  "assets/fallback-food.svg", "assets/fallback-place.svg",
  "assets/fallback-shop.svg", "assets/icons/icon.svg" + VERSION,
  "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/apple-touch-icon.png"
];

// Risorse esterne: senza queste mappa e caratteri si degradano, ma l'app resta
// usabile. Vanno scaricate a parte, una alla volta, senza far fallire
// l'installazione se un CDN è irraggiungibile.
const EXTERNAL = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/pmtiles@4.3.0/dist/pmtiles.js",
  "https://unpkg.com/protomaps-leaflet@5.0.0/dist/protomaps-leaflet.js",
  "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Serif+JP:wght@500;600;700&display=swap"
];

const RUNTIME_HOSTS = ["unpkg.com", "fonts.googleapis.com", "fonts.gstatic.com"];
const TILE_HOST = "tile.openstreetmap.org";

function cacheExternal(cache) {
  return Promise.all(EXTERNAL.map(function (url) {
    return fetch(url, { mode: "cors", credentials: "omit" })
      .then(function (response) { return response.ok ? cache.put(url, response) : null; })
      .catch(function () { return null; });
  }));
}

// Scarica solo ciò che manca. Serve alla prima apertura, dopo ogni nuova
// versione e se il browser sfratta la cache per far spazio; nel caso normale
// l'app non la invoca nemmeno (vedi il flag tabi-cache-ready in app.js).
function reconcile() {
  return caches.open(CACHE).then(function (cache) {
    return cache.keys().then(function (keys) {
      const cached = new Set(keys.map(function (request) { return request.url; }));
      const missing = SHELL.filter(function (path) { return !cached.has(new URL(path, self.registration.scope).href); });
      const externalMissing = EXTERNAL.filter(function (url) { return !cached.has(url); });
      return Promise.all(missing.map(function (path) {
        return cache.add(path).then(function () { return true; }).catch(function () { return false; });
      })).then(function (results) {
        return (externalMissing.length ? cacheExternal(cache) : Promise.resolve()).then(function () {
          return {
            version: CACHE,
            expected: SHELL.length + EXTERNAL.length,
            restored: results.filter(Boolean).length + externalMissing.length,
            failed: results.filter(function (ok) { return !ok; }).length
          };
        });
      });
    });
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(SHELL).then(function () { return cacheExternal(cache); });
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key !== CACHE && key !== TILE_CACHE && key !== IMAGE_CACHE;
    }).map(function (key) { return caches.delete(key); }));
  }));
  self.clients.claim();
});

self.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "tabi:reconcile") return;
  const signature = event.data.signature;
  event.waitUntil(reconcile().then(function (report) {
    report.signature = signature;
    if (event.source) event.source.postMessage({ type: "tabi:reconciled", report: report });
  }));
});

function trimTiles(cache) {
  return cache.keys().then(function (keys) {
    if (keys.length <= TILE_LIMIT) return null;
    return Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map(function (request) { return cache.delete(request); }));
  });
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Tile della mappa: cache-first con tetto, così le zone già guardate restano
  // navigabili offline senza scaricare mezzo Giappone.
  if (url.hostname === TILE_HOST) {
    event.respondWith(caches.open(TILE_CACHE).then(function (cache) {
      return cache.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (response) {
          // Le tile chieste senza CORS arrivano "opaque": ok è false ma il
          // contenuto è buono. Scartarle significava non salvare mai niente.
          if (response.ok || response.type === "opaque") cache.put(event.request, response.clone()).then(function () { return trimTiles(cache); });
          return response;
        }).catch(function () { return Response.error(); });
      });
    }));
    return;
  }

  if (url.origin !== self.location.origin && RUNTIME_HOSTS.indexOf(url.hostname) === -1) return;

  if (event.request.mode === "navigate") {
    // Prima la copia locale, poi la rete in sottofondo: su una SIM straniera
    // lenta l'app deve aprirsi subito. La versione nuova finisce in cache e
    // arriva col prossimo avvio (o col "Ricarica" del toast di aggiornamento).
    event.respondWith(caches.match("index.html").then(function (cached) {
      const network = fetch(event.request).then(function (response) {
        if (response.ok) caches.open(CACHE).then(function (cache) { cache.put("index.html", response.clone()); });
        return response;
      }).catch(function () { return cached; });
      return cached || network;
    }));
    return;
  }

  event.respondWith(caches.match(event.request).then(function (cached) {
    const network = fetch(event.request).then(function (response) {
      if (response.ok) caches.open(CACHE).then(function (cache) { cache.put(event.request, response.clone()); });
      return response;
    // Un file che manca deve fallire da file: rispondere con index.html a uno
    // script o a un'immagine produce errori di sintassi e figure corrotte.
    }).catch(function () { return cached || Response.error(); });
    return cached || network;
  }));
});
