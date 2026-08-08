(function () {
  "use strict";
  let map;
  let routeLayer;
  let userMarker;
  const pointLayers = {};

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char];
    });
  }

  function googleMapsUrl(point) {
    const query = Number.isFinite(point.lat) && Number.isFinite(point.lng)
      ? point.lat + "," + point.lng
      : point.name + " Japan";
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  }

  function cityPopupHTML(city) {
    const points = window.JAPAN_MAP_DATA.points.filter(function (point) { return point.city === city.id; });
    const visits = points.filter(function (point) { return point.type === "visit"; }).length;
    const restaurants = points.filter(function (point) { return point.type === "tabelog"; }).length;
    return '<div class="map-popup"><p class="map-popup-kicker">Tappa ' + city.order + ' · ' + escapeHTML(city.visitType) + '</p>'
      + '<h3>' + escapeHTML(city.name) + ' ' + escapeHTML(city.jp) + '</h3><p>' + escapeHTML(city.summary) + '</p>'
      + '<div class="map-popup-stats"><span>' + visits + ' visite</span><span>' + restaurants + ' locali</span></div>'
      + '<a class="map-popup-action" href="' + googleMapsUrl(city) + '" target="_blank" rel="noopener">Apri la città in Google Maps ↗</a></div>';
  }

  function pointPopupHTML(point) {
    const city = window.JAPAN_DATA.cities.find(function (candidate) { return candidate.id === point.city; });
    const typeLabel = point.type === "tabelog" ? "Locale Tabelog" : point.type === "hotel" ? "Hotel del viaggio" : "Da visitare";
    const rating = point.type === "tabelog" ? '<span class="tabelog-rating">Tabelog ' + Number(point.score).toFixed(2) + '</span>' : "";
    const guide = point.guideId ? '<button class="map-popup-detail" type="button" data-action="details" data-id="' + escapeHTML(point.guideId) + '">Apri la guida completa ↗</button>' : "";
    return '<div class="map-popup point-popup"><p class="map-popup-kicker">' + escapeHTML(typeLabel) + ' · ' + escapeHTML(point.category) + '</p>'
      + '<h3>' + escapeHTML(point.name) + '</h3>'
      + '<p class="point-location">' + escapeHTML(point.group || point.area || (city && city.name)) + (point.area && point.group !== point.area ? ' · ' + escapeHTML(point.area) : '') + '</p>'
      + '<p>' + escapeHTML(point.description) + '</p>' + rating
      + '<div class="map-popup-actions">' + guide + '<a class="map-popup-action" href="' + googleMapsUrl(point) + '" target="_blank" rel="noopener">Raggiungi con Google Maps ↗</a></div></div>';
  }

  function pointIcon(point) {
    if (point.type === "tabelog") {
      return L.divIcon({ className:"map-point-icon", html:'<span class="map-score-marker">' + Number(point.score).toFixed(2) + '</span>', iconSize:[42, 24], iconAnchor:[21, 12] });
    }
    if (point.type === "hotel") {
      return L.divIcon({ className:"map-point-icon", html:'<span class="map-hotel-marker">H</span>', iconSize:[28, 28], iconAnchor:[14, 14] });
    }
    return L.divIcon({ className:"map-point-icon", html:'<span class="map-visit-marker"></span>', iconSize:[18, 18], iconAnchor:[9, 9] });
  }

  function layerEnabled(type) {
    const input = document.querySelector('[data-map-layer="' + type + '"]');
    return !input || input.checked;
  }

  function syncLayer(type) {
    if (!map || !pointLayers[type]) return;
    if (layerEnabled(type)) pointLayers[type].addTo(map);
    else pointLayers[type].removeFrom(map);
  }

  function initMap() {
    const container = document.getElementById("tripMap");
    if (!container || map) return;
    if (!window.L) {
      container.innerHTML = '<div class="empty-state"><div><strong>Mappa non disponibile.</strong><span>Le schede e i collegamenti Google Maps restano utilizzabili.</span></div></div>';
      return;
    }

    map = L.map(container, { zoomControl:true, scrollWheelZoom:false, preferCanvas:true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom:18,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const coordinates = window.JAPAN_DATA.cities.map(function (city) {
      const icon = L.divIcon({ className:"route-marker", html:String(city.order), iconSize:[34, 34] });
      const marker = L.marker([city.lat, city.lng], { icon:icon, zIndexOffset:700, title:"Apri tappa " + city.name, alt:"Tappa " + city.name }).bindPopup(cityPopupHTML(city));
      marker.on("add", function () { marker.getElement().setAttribute("aria-label", "Apri tappa " + city.name); });
      marker.on("click", function () { map.setView([city.lat, city.lng], 13); });
      marker.addTo(map);
      return [city.lat, city.lng];
    });
    routeLayer = L.polyline(coordinates, { color:"#b6422e", weight:3, opacity:.72, dashArray:"8 9" }).addTo(map);

    ["visit", "tabelog", "hotel"].forEach(function (type) { pointLayers[type] = L.layerGroup(); });
    window.JAPAN_MAP_DATA.points.forEach(function (point) {
      const marker = L.marker([point.lat, point.lng], { icon:pointIcon(point), zIndexOffset:point.type === "hotel" ? 500 : 0, title:point.name, alt:point.name })
        .bindPopup(pointPopupHTML(point), { maxWidth:310 });
      marker.on("add", function () { marker.getElement().setAttribute("aria-label", point.name); });
      marker.addTo(pointLayers[point.type]);
    });
    ["visit", "tabelog", "hotel"].forEach(syncLayer);
    fitRoute();
  }

  function fitRoute() {
    if (map && routeLayer) map.fitBounds(routeLayer.getBounds(), { padding:[30, 30] });
  }

  function locateUser() {
    const button = document.getElementById("locateButton");
    if (!navigator.geolocation) {
      button.textContent = "Posizione non supportata";
      return;
    }
    button.disabled = true;
    button.textContent = "Ricerca posizione…";
    navigator.geolocation.getCurrentPosition(function (position) {
      const latlng = [position.coords.latitude, position.coords.longitude];
      if (userMarker) userMarker.remove();
      userMarker = L.circleMarker(latlng, { radius:9, color:"#fff", weight:3, fillColor:"#1b76d1", fillOpacity:1 }).addTo(map).bindPopup("Sei qui");
      map.setView(latlng, 13);
      userMarker.openPopup();
      button.disabled = false;
      button.textContent = "◎ La mia posizione";
    }, function () {
      button.disabled = false;
      button.textContent = "Posizione non disponibile";
    }, { enableHighAccuracy:true, timeout:12000, maximumAge:60000 });
  }

  document.getElementById("locateButton").addEventListener("click", locateUser);
  document.getElementById("fitRouteButton").addEventListener("click", fitRoute);
  document.querySelectorAll("[data-map-layer]").forEach(function (input) {
    input.addEventListener("change", function () { syncLayer(input.dataset.mapLayer); });
  });
  window.addEventListener("tabi:viewchange", function (event) {
    if (event.detail.view !== "places") return;
    initMap();
    setTimeout(function () { if (map) map.invalidateSize(); }, 80);
  });
})();
