const CACHE = "tabi-japan-v2";
const SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "assets/styles.css", "assets/data.js", "assets/food-data.js",
  "assets/shopping-data.js", "assets/app.js",
  "assets/fallback-food.svg", "assets/fallback-place.svg",
  "assets/fallback-shop.svg", "assets/icons/icon.svg"
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
  event.respondWith(caches.match(event.request).then(function (cached) {
    const network = fetch(event.request).then(function (response) {
      if (response.ok) caches.open(CACHE).then(function (cache) { cache.put(event.request, response.clone()); });
      return response;
    }).catch(function () { return cached || caches.match("index.html"); });
    return cached || network;
  }));
});
