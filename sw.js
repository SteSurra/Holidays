const CACHE = "tabi-japan-v11";
const VERSION = "?v=20260801b";
const SHELL = [
  "./", "index.html", "manifest.webmanifest" + VERSION,
  "assets/styles.css" + VERSION, "assets/data.js" + VERSION, "assets/food-data.js" + VERSION,
  "assets/shopping-data.js" + VERSION, "assets/travel-data.js" + VERSION, "assets/history-data.js" + VERSION,
  "assets/map-data.js" + VERSION, "assets/guide-data.js" + VERSION, "assets/map.js" + VERSION,
  "assets/app.js" + VERSION, "assets/photos.js" + VERSION,
  "assets/fallback-food.svg", "assets/fallback-place.svg",
  "assets/fallback-shop.svg", "assets/icons/icon.svg" + VERSION,
  "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(function (response) {
      if (response.ok) caches.open(CACHE).then(function (cache) { cache.put("index.html", response.clone()); });
      return response;
    }).catch(function () { return caches.match("index.html"); }));
    return;
  }
  event.respondWith(caches.match(event.request).then(function (cached) {
    const network = fetch(event.request).then(function (response) {
      if (response.ok) caches.open(CACHE).then(function (cache) { cache.put(event.request, response.clone()); });
      return response;
    }).catch(function () { return cached || caches.match("index.html"); });
    return cached || network;
  }));
});
