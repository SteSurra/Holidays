(function () {
  "use strict";
  let map;
  let routeLayer;
  let userMarker;
  const pointLayers = {};
  const markerByGuideId = {};
  const pointByGuideId = {};

  function completedIds() {
    try { return new Set(JSON.parse(localStorage.getItem("tabi-done") || "[]")); } catch (_) { return new Set(); }
  }
  const doneIds = completedIds();

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
    const item = point.guideId && findGuideItem(point.guideId);
    let imageType = "place";
    if ((item && item.type === "food") || point.type === "tabelog") imageType = "food";
    else if (item && item.type === "shop") imageType = "shop";
    else if (item && item.type === "experience") imageType = "experience";
    const imageId = point.guideId || "map-image-" + point.id;
    const fallback = imageType === "food" ? "assets/fallback-food.svg" : imageType === "shop" ? "assets/fallback-shop.svg" : "assets/fallback-place.svg";
    const typeLabel = point.type === "tabelog" ? "Locale Tabelog" : point.type === "hotel" ? "Hotel del viaggio" : "Da visitare";
    const rating = point.type === "tabelog" ? '<span class="tabelog-rating">Tabelog ' + Number(point.score).toFixed(2) + '</span>' : "";
    const guide = point.guideId ? '<button class="map-popup-detail" type="button" data-action="details" data-id="' + escapeHTML(point.guideId) + '">Apri la guida completa ↗</button>' : "";
    const done = point.guideId && item && (item.type === "place" || item.type === "experience") ? '<button class="map-popup-done' + (doneIds.has(point.guideId) ? ' is-done' : '') + '" type="button" data-action="done" data-id="' + escapeHTML(point.guideId) + '">' + (doneIds.has(point.guideId) ? (item.type === "experience" ? "✓ Fatta" : "✓ Visitato") : (item.type === "experience" ? "Segna fatta" : "Segna visitato")) + '</button>' : "";
    return '<div class="map-popup point-popup"><div class="map-popup-media"><img src="' + fallback + '" data-map-image-id="' + escapeHTML(imageId) + '" data-map-image-type="' + imageType + '" alt="' + escapeHTML(point.name) + '" referrerpolicy="no-referrer"><a class="map-photo-credit" target="_blank" rel="noopener" hidden></a></div><p class="map-popup-kicker">' + escapeHTML(typeLabel) + ' · ' + escapeHTML(point.category) + '</p>'
      + '<h3>' + escapeHTML(point.name) + '</h3>'
      + '<p class="point-location">' + escapeHTML(point.group || point.area || (city && city.name)) + (point.area && point.group !== point.area ? ' · ' + escapeHTML(point.area) : '') + '</p>'
      + '<p>' + escapeHTML(point.description) + '</p>' + rating
      + '<div class="map-popup-actions">' + done + guide + '<a class="map-popup-action" href="' + googleMapsUrl(point) + '" target="_blank" rel="noopener">Raggiungi con Google Maps ↗</a></div></div>';
  }

  function findGuideItem(id) {
    const data = window.JAPAN_DATA;
    return [].concat(data.places || [], data.mapPlaces || [], data.experiences || [], data.foods || [], data.shopping || []).find(function (item) {
      return item.id === id;
    });
  }

  function popupImageItem(point) {
    const linked = point.guideId && findGuideItem(point.guideId);
    if (linked) return linked;
    return {
      id: "map-image-" + point.id,
      type: point.type === "tabelog" ? "food" : "place",
      city: point.city,
      name: point.name,
      jp: "",
      imageQuery: point.name + " " + ((window.JAPAN_DATA.cities.find(function (city) { return city.id === point.city; }) || {}).name || "Japan")
    };
  }

  function hydratePopupImage(marker, point) {
    const popup = marker.getPopup() && marker.getPopup().getElement();
    const image = popup && popup.querySelector("[data-map-image-id]");
    if (!image || image.dataset.loading === "true" || image.dataset.loaded === "true" || !window.TABI_IMAGES) return;
    const item = popupImageItem(point);
    const credit = popup.querySelector(".map-photo-credit");
    image.dataset.loading = "true";

    function apply(result) {
      image.dataset.loading = "false";
      if (!result || !result.url) return;
      image.dataset.provider = result.provider || "";
      image.src = result.url;
      if (result.credit && result.sourceUrl && credit) {
        credit.href = result.sourceUrl;
        credit.textContent = "Foto: " + result.credit + " ↗";
        credit.hidden = false;
      }
    }

    image.addEventListener("load", function () { image.dataset.loaded = "true"; });
    image.addEventListener("error", function () {
      const failed = new Set((image.dataset.failedProviders || "").split(",").filter(Boolean));
      failed.add(image.dataset.provider || item.imageProvider || "official");
      image.dataset.failedProviders = Array.from(failed).join(",");
      image.dataset.loaded = "false";
      if (credit) credit.hidden = true;
      const providerLimit = 4 + (item.imageUrl ? 1 : 0);
      if (failed.size >= providerLimit) {
        image.src = window.TABI_IMAGES.fallbackFor(item.type);
        image.dataset.provider = "fallback";
        return;
      }
      window.TABI_IMAGES.resolveItem(item, { skipDirect:true, force:true, excludedProviders:Array.from(failed) }).then(apply);
    });
    window.TABI_IMAGES.resolveItem(item).then(apply);
  }

  function pointIcon(point) {
    if (point.type === "tabelog") {
      return L.divIcon({ className:"map-point-icon", html:'<span class="map-score-marker">' + Number(point.score).toFixed(2) + '</span>', iconSize:[42, 24], iconAnchor:[21, 12] });
    }
    if (point.type === "hotel") {
      return L.divIcon({ className:"map-point-icon", html:'<span class="map-hotel-marker">H</span>', iconSize:[28, 28], iconAnchor:[14, 14] });
    }
    const isDone = point.guideId && doneIds.has(point.guideId);
    return L.divIcon({ className:"map-point-icon", html:'<span class="map-visit-marker' + (isDone ? ' is-done' : '') + '">' + (isDone ? '✓' : '') + '</span>', iconSize:[isDone ? 24 : 18, isDone ? 24 : 18], iconAnchor:[isDone ? 12 : 9, isDone ? 12 : 9] });
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

    map = L.map(container, {
      zoomControl:true,
      scrollWheelZoom:true,
      touchZoom:true,
      doubleClickZoom:true,
      zoomSnap:0.25,
      zoomDelta:0.5,
      wheelDebounceTime:25,
      wheelPxPerZoomLevel:110,
      bounceAtZoomLimits:false,
      preferCanvas:true
    });
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
        .bindPopup(pointPopupHTML(point), { maxWidth:popupMaxWidth() });
      marker.on("add", function () { marker.getElement().setAttribute("aria-label", point.name); });
      marker.on("popupopen", function () { fitPopup(marker); hydratePopupImage(marker, point); });
      if (point.guideId && !markerByGuideId[point.guideId]) {
        markerByGuideId[point.guideId] = marker;
        pointByGuideId[point.guideId] = point;
      }
      marker.addTo(pointLayers[point.type]);
    });
    ["visit", "tabelog", "hotel"].forEach(syncLayer);
    fitRoute();
  }

  // Il popup vive dentro #tripMap, che ha overflow:hidden: oltre le misure del
  // contenitore verrebbe tagliato, pulsante di chiusura compreso.
  function popupMaxWidth() {
    const container = document.getElementById("tripMap");
    const available = (container ? container.clientWidth : window.innerWidth) - 48;
    return Math.max(190, Math.min(310, available));
  }

  // L'altezza è gestita in CSS (max-height su .leaflet-popup-content): Leaflet
  // misura una volta sola all'apertura e la foto arriva dopo, quindi il suo
  // maxHeight resterebbe indietro.
  function fitPopup(marker) {
    const popup = marker.getPopup();
    if (!popup || popup.options.maxWidth === popupMaxWidth()) return;
    popup.options.maxWidth = popupMaxWidth();
    popup.update();
  }

  function fitRoute() {
    if (map && routeLayer) map.fitBounds(routeLayer.getBounds(), { padding:[30, 30] });
  }

  function locateUser() {
    const button = document.getElementById("locateButton");
    if (!window.TABI_GEO) return;
    button.disabled = true;
    button.textContent = "Ricerca posizione…";
    window.TABI_GEO.requestPosition({ maximumAge:60000 }).then(function (position) {
      const latlng = [position.coords.latitude, position.coords.longitude];
      if (userMarker) userMarker.remove();
      userMarker = L.circleMarker(latlng, { radius:9, color:"#fff", weight:3, fillColor:"#1b76d1", fillOpacity:1 }).addTo(map).bindPopup("Sei qui");
      map.setView(latlng, 13);
      userMarker.openPopup();
      button.disabled = false;
      button.textContent = "◎ La mia posizione";
    }).catch(function () {
      button.disabled = false;
      button.textContent = "Posizione non disponibile";
    });
  }

  function focusPoint(guideId) {
    initMap();
    const marker = markerByGuideId[guideId];
    if (!map || !marker) return false;
    const visitToggle = document.querySelector('[data-map-layer="visit"]');
    if (visitToggle) visitToggle.checked = true;
    syncLayer("visit");
    const panel = document.querySelector(".map-panel");
    if (panel) panel.scrollIntoView({ behavior:"smooth", block:"start" });
    window.setTimeout(function () {
      map.invalidateSize();
      map.setView(marker.getLatLng(), 16, { animate:true });
      marker.openPopup();
    }, 100);
    return true;
  }

  function refreshProgressMarker(guideId) {
    const marker = markerByGuideId[guideId];
    const point = pointByGuideId[guideId];
    if (!marker || !point) return;
    marker.setIcon(pointIcon(point));
    marker.setPopupContent(pointPopupHTML(point));
    if (marker.isPopupOpen()) window.setTimeout(function () { hydratePopupImage(marker, point); }, 0);
  }

  function refreshAllProgressMarkers() {
    Object.keys(markerByGuideId).forEach(refreshProgressMarker);
  }

  function toggleExpandedMap() {
    const panel = document.querySelector(".map-panel");
    const button = document.getElementById("expandMapButton");
    const expanded = panel.classList.toggle("is-expanded");
    document.body.classList.toggle("map-is-expanded", expanded);
    button.setAttribute("aria-pressed", String(expanded));
    button.textContent = expanded ? "Chiudi mappa" : "Espandi mappa";
    window.setTimeout(function () { if (map) map.invalidateSize(); }, 80);
  }

  // ---- Lazo: si disegna un'area col dito e si ottiene il giro a piedi -------

  let lassoActive = false;
  let lassoLayer = null;
  let lassoPoints = [];
  let lassoSelection = [];

  function lassoStatus(text) {
    const box = document.getElementById("lassoStatus");
    if (box) box.textContent = text;
  }

  function containerToLatLng(event) {
    const rect = map.getContainer().getBoundingClientRect();
    const touch = event.touches && event.touches[0];
    const x = (touch ? touch.clientX : event.clientX) - rect.left;
    const y = (touch ? touch.clientY : event.clientY) - rect.top;
    return map.containerPointToLatLng([x, y]);
  }

  // Punto dentro poligono, algoritmo ray casting: nessuna libreria in più.
  function insidePolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const yi = polygon[i].lat, xi = polygon[i].lng;
      const yj = polygon[j].lat, xj = polygon[j].lng;
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function metersBetween(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  // Vicino più prossimo per l'ordine iniziale, poi 2-opt per raddrizzare gli
  // incroci: su una decina di tappe basta e avanza, e gira in un istante.
  function shortestOrder(start, stops) {
    const remaining = stops.slice();
    const route = [];
    let current = start;
    while (remaining.length) {
      let best = 0;
      for (let i = 1; i < remaining.length; i += 1) {
        if (metersBetween(current, remaining[i]) < metersBetween(current, remaining[best])) best = i;
      }
      current = remaining[best];
      route.push(current);
      remaining.splice(best, 1);
    }
    const legs = function (order) {
      let total = metersBetween(start, order[0]);
      for (let i = 1; i < order.length; i += 1) total += metersBetween(order[i - 1], order[i]);
      return total;
    };
    let improved = true;
    while (improved && route.length > 3) {
      improved = false;
      for (let i = 0; i < route.length - 1; i += 1) {
        for (let j = i + 1; j < route.length; j += 1) {
          const candidate = route.slice(0, i).concat(route.slice(i, j + 1).reverse(), route.slice(j + 1));
          if (legs(candidate) < legs(route) - 1) {
            route.splice(0, route.length, ...candidate);
            improved = true;
          }
        }
      }
    }
    return route;
  }

  function clearLasso() {
    if (lassoLayer) { lassoLayer.remove(); lassoLayer = null; }
    lassoPoints = [];
    lassoSelection = [];
    document.getElementById("lassoLink").hidden = true;
    document.getElementById("lassoUseGpsButton").hidden = true;
  }

  function finishLasso() {
    if (lassoPoints.length < 8) { lassoStatus("Area troppo piccola: riprova disegnando un cerchio più ampio."); clearLasso(); return; }
    const visible = window.JAPAN_MAP_DATA.points.filter(function (point) {
      const toggle = document.querySelector('[data-map-layer="' + point.type + '"]');
      return (!toggle || toggle.checked) && Number.isFinite(point.lat) && Number.isFinite(point.lng);
    });
    lassoSelection = visible.filter(function (point) { return insidePolygon(point.lat, point.lng, lassoPoints); });
    if (!lassoSelection.length) { lassoStatus("Nessun luogo dentro l'area. Prova a disegnarla più larga o riattiva i livelli."); return; }
    prepareRoute();
  }

  // Google Maps accetta origine, destinazione e al massimo 9 tappe intermedie.
  const MAX_WAYPOINTS = 9;

  function routeLength(start, ordered) {
    let total = metersBetween(start, ordered[0]);
    for (let i = 1; i < ordered.length; i += 1) total += metersBetween(ordered[i - 1], ordered[i]);
    return total;
  }

  function buildRoute(start, selection) {
    // Con una partenza esterna entrano origine + 9 intermedie + destinazione;
    // senza, la prima tappa fa da origine e ne entra una in più.
    const limit = start ? MAX_WAYPOINTS + 1 : MAX_WAYPOINTS + 2;
    let stops = selection.slice();
    let trimmed = 0;
    if (stops.length > limit) {
      const anchor = start || stops[0];
      stops = stops
        .map(function (point) { return { point: point, distance: metersBetween(anchor, point) }; })
        .sort(function (a, b) { return a.distance - b.distance; })
        .slice(0, limit)
        .map(function (entry) { return entry.point; });
      trimmed = selection.length - limit;
    }
    if (start) {
      const ordered = shortestOrder(start, stops);
      return { origin: start, ordered: ordered, trimmed: trimmed, meters: routeLength(start, ordered) };
    }
    // Senza posizione si prova ogni tappa come partenza e si tiene il giro più
    // corto: con dieci punti costa nulla e il risultato è molto migliore che
    // partire dalla prima capitata.
    let best = null;
    stops.forEach(function (candidate) {
      const rest = stops.filter(function (point) { return point !== candidate; });
      const ordered = rest.length ? shortestOrder(candidate, rest) : [];
      const meters = ordered.length ? routeLength(candidate, ordered) : 0;
      if (!best || meters < best.meters) best = { origin: candidate, ordered: ordered, trimmed: trimmed, meters: meters };
    });
    return best;
  }

  function routeUrl(route) {
    const stops = route.ordered;
    const destination = stops.length ? stops[stops.length - 1] : route.origin;
    const waypoints = stops.slice(0, -1).map(function (point) { return point.lat + "," + point.lng; }).join("|");
    return "https://www.google.com/maps/dir/?api=1&travelmode=walking"
      + "&origin=" + route.origin.lat + "," + route.origin.lng
      + "&destination=" + destination.lat + "," + destination.lng
      + (waypoints ? "&waypoints=" + encodeURIComponent(waypoints) : "");
  }

  // Niente window.open: su iPhone la scheda aperta prima di attendere la
  // posizione resta bianca, e finché il permesso non risponde — fino a dodici
  // secondi — sembra che non succeda nulla. Il percorso viene quindi calcolato
  // subito alla chiusura del lazo e messo in un vero link: toccarlo è un gesto
  // diretto dell'utente, che nessun browser blocca.
  function showRoute(route, note) {
    const link = document.getElementById("lassoLink");
    if (!route) { lassoStatus("Non riesco a costruire il giro con questi punti."); return; }
    link.href = routeUrl(route);
    link.hidden = false;
    lassoStatus(note + " Giro di " + (route.ordered.length + 1) + " tappe, circa "
      + (route.meters / 1000).toFixed(1).replace(".", ",") + " km in linea d'aria."
      + (route.trimmed ? " Ne ho lasciate fuori " + route.trimmed + ": Google Maps non accetta più di " + MAX_WAYPOINTS + " tappe intermedie." : ""));
  }

  function prepareRoute() {
    if (!lassoSelection.length) return;
    // Percorso pronto subito, con una delle tappe come partenza: il link è
    // toccabile prima ancora che il telefono decida cosa fare col permesso.
    showRoute(buildRoute(null, lassoSelection), lassoSelection.length + " luoghi nell'area."
      + " Il giro è pronto e parte da una delle tappe: tocca “Parti da dove sono” se preferisci partire dalla tua posizione.");
    document.getElementById("lassoUseGpsButton").hidden = false;
  }

  function useGpsForRoute() {
    const button = document.getElementById("lassoUseGpsButton");
    if (!lassoSelection.length || !window.TABI_GEO) return;
    button.disabled = true;
    lassoStatus("Cerco la tua posizione… il link qui accanto funziona già, parte da una delle tappe.");
    window.TABI_GEO.requestPosition().then(function (position) {
      button.disabled = false;
      button.hidden = true;
      const start = { lat: position.coords.latitude, lng: position.coords.longitude, name: "la tua posizione" };
      showRoute(buildRoute(start, lassoSelection), "Parto dalla tua posizione.");
    }).catch(function (error) {
      button.disabled = false;
      lassoStatus(error.message + " Il link resta valido: parte da una delle tappe selezionate.");
    });
  }

  function toggleLasso() {
    const button = document.getElementById("lassoButton");
    const container = map && map.getContainer();
    if (!container) return;
    lassoActive = !lassoActive;
    button.setAttribute("aria-pressed", String(lassoActive));
    button.textContent = lassoActive ? "Annulla area" : "✎ Disegna un'area";
    container.classList.toggle("is-lasso", lassoActive);
    if (lassoActive) {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      lassoStatus("Tieni premuto sulla mappa e disegna un cerchio attorno alla zona che vuoi girare.");
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      clearLasso();
      lassoStatus("");
    }
  }

  function setupLasso() {
    const container = map.getContainer();
    function start(event) {
      if (!lassoActive) return;
      event.preventDefault();
      clearLasso();
      lassoPoints = [containerToLatLng(event)];
      lassoLayer = L.polygon(lassoPoints, { color:"#b6422e", weight:2, dashArray:"6 5", fillOpacity:.12 }).addTo(map);
      container.addEventListener("mousemove", move);
      container.addEventListener("touchmove", move, { passive:false });
    }
    function move(event) {
      if (!lassoActive || !lassoLayer) return;
      event.preventDefault();
      lassoPoints.push(containerToLatLng(event));
      lassoLayer.setLatLngs(lassoPoints);
    }
    function end() {
      container.removeEventListener("mousemove", move);
      container.removeEventListener("touchmove", move);
      if (lassoActive && lassoLayer) finishLasso();
    }
    container.addEventListener("mousedown", start);
    container.addEventListener("touchstart", start, { passive:false });
    document.addEventListener("mouseup", end);
    document.addEventListener("touchend", end);
  }

  document.getElementById("lassoButton").addEventListener("click", function () {
    initMap();
    if (!map) return;
    if (!map.__lassoReady) { setupLasso(); map.__lassoReady = true; }
    toggleLasso();
  });
  document.getElementById("lassoUseGpsButton").addEventListener("click", useGpsForRoute);

  document.getElementById("locateButton").addEventListener("click", locateUser);
  document.getElementById("fitRouteButton").addEventListener("click", fitRoute);
  document.getElementById("expandMapButton").addEventListener("click", toggleExpandedMap);
  document.querySelectorAll("[data-map-layer]").forEach(function (input) {
    input.addEventListener("change", function () { syncLayer(input.dataset.mapLayer); });
  });
  window.addEventListener("tabi:viewchange", function (event) {
    if (event.detail.view !== "places") return;
    initMap();
    setTimeout(function () { if (map) map.invalidateSize(); }, 80);
  });
  window.addEventListener("tabi:progresschange", function (event) {
    if (event.detail.done) doneIds.add(event.detail.id);
    else doneIds.delete(event.detail.id);
    refreshProgressMarker(event.detail.id);
  });
  window.addEventListener("tabi:progressreset", function () {
    doneIds.clear();
    refreshAllProgressMarkers();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.querySelector(".map-panel.is-expanded")) toggleExpandedMap();
  });
  window.TABI_MAP = { focusPoint:focusPoint, fitRoute:fitRoute };
})();
