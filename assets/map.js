(function () {
  "use strict";
  let map;
  let routeLayer;
  let userMarker;
  let watchId = null;
  const pointLayers = {};
  const markerByGuideId = {};
  const pointByGuideId = {};
  const placedMarkers = [];

  function completedIds() {
    try { return new Set(JSON.parse(localStorage.getItem("tabi-done") || "[]")); } catch (_) { return new Set(); }
  }
  const doneIds = completedIds();

  // I luoghi che l'utente ha tolto dalla mappa. Si tiene l'elenco degli esclusi:
  // l'insieme vuoto vale "mostra tutto", che è il comportamento di partenza.
  function hiddenIdSet() {
    try { return new Set(JSON.parse(localStorage.getItem("tabi-hidden-v1") || "[]")); } catch (_) { return new Set(); }
  }
  let hiddenIds = hiddenIdSet();

  function onMap(point) {
    return !point.guideId || !hiddenIds.has(point.guideId);
  }

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
    const rating = point.type === "tabelog" ? '<span class="tabelog-rating">Tabelog ' + Number(point.score).toFixed(2) + ' alla selezione</span>' : "";
    const tabelog = point.tabelog ? '<a class="map-popup-action is-tabelog" href="' + tabelogUrl(point) + '" target="_blank" rel="noopener">Voto di oggi, orari e prenotazione ↗</a>' : "";
    const guide = point.guideId ? '<button class="map-popup-detail" type="button" data-action="details" data-id="' + escapeHTML(point.guideId) + '">Apri la guida completa ↗</button>' : "";
    const done = point.guideId && item && (item.type === "place" || item.type === "experience") ? '<button class="map-popup-done' + (doneIds.has(point.guideId) ? ' is-done' : '') + '" type="button" data-action="done" data-id="' + escapeHTML(point.guideId) + '">' + (doneIds.has(point.guideId) ? (item.type === "experience" ? "✓ Fatta" : "✓ Visitato") : (item.type === "experience" ? "Segna fatta" : "Segna visitato")) + '</button>' : "";
    // Togliere un punto dalla mappa mentre lo si sta guardando, senza tornare
    // all'elenco e senza confonderlo con "ci sono già stato".
    const select = point.guideId && point.type === "visit"
      ? '<button class="map-popup-select" type="button" data-action="select" data-id="' + escapeHTML(point.guideId) + '">'
        + (hiddenIds.has(point.guideId) ? "Rimetti sulla mappa" : "Togli dalla mappa") + '</button>'
      : "";
    return '<div class="map-popup point-popup"><div class="map-popup-media"><img src="' + fallback + '" data-map-image-id="' + escapeHTML(imageId) + '" data-map-image-type="' + imageType + '" alt="' + escapeHTML(point.name) + '" referrerpolicy="no-referrer"><a class="map-photo-credit" target="_blank" rel="noopener" hidden></a></div><p class="map-popup-kicker">' + escapeHTML(typeLabel) + ' · ' + escapeHTML(point.category) + '</p>'
      + '<h3>' + escapeHTML(point.name) + '</h3>'
      + '<p class="point-location">' + escapeHTML(point.group || point.area || (city && city.name)) + (point.area && point.group !== point.area ? ' · ' + escapeHTML(point.area) : '') + '</p>'
      + '<p>' + escapeHTML(point.description) + '</p>' + rating
      + '<div class="map-popup-actions">' + done + select + guide + tabelog + '<a class="map-popup-action" href="' + googleMapsUrl(point) + '" target="_blank" rel="noopener">Raggiungi con Google Maps ↗</a></div></div>';
  }

  // Il punteggio salvato è quello del giorno in cui il locale è entrato in
  // guida. Su Tabelog cambia di settimana in settimana e non esiste un modo
  // lecito di rileggerlo da qui: la scheda ufficiale, con voto aggiornato,
  // orari e prenotazione, resta a un tocco di distanza.
  function tabelogUrl(point) {
    return "https://tabelog.com/en/" + point.tabelog + "/";
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

  // Il colore dice "da visitare", il simbolo dice che cosa: tutti i templi
  // hanno lo stesso pittogramma, tutti i castelli un altro, e il verde resta
  // quello per tutti. Disegnati come SVG e non come emoji, che ogni telefono
  // colora a modo suo e romperebbe l'unica regola: un solo colore.
  const VISIT_GLYPHS = {
    tempio: '<path d="M12 3 L22 9.5 H2 Z"/><path d="M12 10.5 L19.5 15.5 H4.5 Z"/><path d="M9 16.5h6v4.5H9z"/>',
    santuario: '<path d="M1.5 5h21v2.8h-21z"/><path d="M4.5 10h15v2.2h-15z"/><path d="M5.6 5h2.8v16H5.6z"/><path d="M15.6 5h2.8v16h-2.8z"/>',
    castello: '<path d="M12 5.5 L20.5 11.5 H3.5 Z"/><path d="M6.5 12.5h11v8.5h-11z"/><path d="M11.2 1.5h1.4v4h-1.4z"/><path d="M12.6 1.8h4.2l-1.6 1.6 1.6 1.6h-4.2z"/>',
    museo: '<path d="M12 3.5 L22 9 H2 Z"/><path d="M5 10.5h2.6v7.5H5z"/><path d="M10.7 10.5h2.6v7.5h-2.6z"/><path d="M16.4 10.5h2.6v7.5h-2.6z"/><path d="M3.5 19h17v2.2h-17z"/>',
    quartiere: '<path d="M2.5 21v-8.5H8V21z"/><path d="M9.3 21V8h5.4v13z"/><path d="M16 21v-6.5h5.5V21z"/>',
    panorama: '<circle cx="18" cy="6.5" r="2.8"/><path d="M1.5 20.5 L8.5 9.5 L13.5 17 L16.5 12.5 L22.5 20.5 Z"/>',
    natura: '<circle cx="12" cy="9.5" r="6"/><path d="M10.9 14h2.2v7h-2.2z"/>',
    giardino: '<path d="M12 21 C5.5 17 4.5 8 12 3 C19.5 8 18.5 17 12 21 Z"/>',
    mercato: '<path d="M3.5 11.5 L6 6.5 h12 L20.5 11.5 Z"/><path d="M5.5 13h13v8h-13z"/>',
    shopping: '<path d="M5 9h14l1 12H4z"/><path d="M8.6 9V6.8a3.4 3.4 0 0 1 6.8 0V9h-2.2V6.8a1.2 1.2 0 0 0-2.4 0V9z"/>',
    memoriale: '<path d="M12 3a3 3 0 0 1 3 3v11H9V6a3 3 0 0 1 3-3z"/><path d="M6.5 18h11v3h-11z"/>',
    "casa-storica": '<path d="M12 4.5 L21 11.5 H3 Z"/><path d="M6 12.5h12v8.5H6z"/><path d="M15.5 4H18v3.6h-2.5z"/>',
    esperienza: '<path d="M12 2.5 L14.1 9.9 L21.5 12 L14.1 14.1 L12 21.5 L9.9 14.1 L2.5 12 L9.9 9.9 Z"/>',
    curiosita: '<path d="M12 3l2.7 5.9 6.4.7-4.8 4.4 1.3 6.3-5.6-3.2-5.6 3.2 1.3-6.3-4.8-4.4 6.4-.7z"/>',
    altro: '<circle cx="12" cy="12" r="5"/>'
  };

  // Un luogo già visitato tiene il suo simbolo di categoria: sbiadirlo dice
  // "ci sei passato" senza far dimenticare *cosa* fosse. Sostituirlo con una
  // spunta, come si faceva prima, cancellava proprio l'informazione utile.
  function visitMarkerHTML(point, isDone) {
    const glyph = VISIT_GLYPHS[point.category] || VISIT_GLYPHS.altro;
    return '<span class="map-visit-marker' + (isDone ? " is-done" : "") + '">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + glyph + '</svg>'
      + (isDone ? '<i class="visit-check" aria-hidden="true">✓</i>' : '')
      + '</span>';
  }

  function pointIcon(point) {
    if (point.type === "tabelog") {
      return L.divIcon({ className:"map-point-icon", html:'<span class="map-score-marker">' + Number(point.score).toFixed(2) + '</span>', iconSize:[42, 24], iconAnchor:[21, 12] });
    }
    if (point.type === "hotel") {
      return L.divIcon({ className:"map-point-icon", html:'<span class="map-hotel-marker">H</span>', iconSize:[28, 28], iconAnchor:[14, 14] });
    }
    const isDone = Boolean(point.guideId && doneIds.has(point.guideId));
    return L.divIcon({ className:"map-point-icon", html:visitMarkerHTML(point, isDone), iconSize:[22, 22], iconAnchor:[11, 11] });
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

  // ---- WC pubblici e fontanelle -------------------------------------------
  // Sono migliaia, cambiano di continuo e non hanno niente da raccontare:
  // tenerli nei dati della guida non avrebbe senso. Si chiedono a OpenStreetMap
  // solo quando l'utente accende il flag, e poi restano sul telefono.

  const FACILITY_KINDS = {
    toilet: { tag:"amenity", value:"toilets", label:"WC pubblico", plural:"i WC pubblici", count:"WC", glyph:"WC" },
    water: { tag:"amenity", value:"drinking_water", label:"Fontanella", plural:"le fontanelle", count:"fontanelle", glyph:"水" },
    konbini: { tag:"shop", value:"convenience", label:"Konbini", plural:"i konbini", count:"konbini", glyph:"24h" }
  };
  const FACILITY_CACHE = "tabi-facilities-v2";
  const FACILITY_RADIUS = 2000;
  const FACILITY_PER_CITY = 40;
  const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];
  const facilityLayers = {};
  const facilityMarkers = {};
  let facilityPoints = null;
  let facilityRequest = null;

  function isFacility(type) {
    return Object.prototype.hasOwnProperty.call(FACILITY_KINDS, type);
  }

  function facilityKinds() {
    return Object.keys(FACILITY_KINDS);
  }

  function enabledFacilityKinds() {
    return facilityKinds().filter(function (kind) { return layerEnabled(kind); });
  }

  // WC e fontanelle vivono solo sulla mappa: niente elenco sotto ai luoghi, che
  // è lo spazio delle cose da vedere. Il messaggio va anche dentro il pannello
  // dei livelli: è lì che si sta guardando quando si accende un interruttore, e
  // la riga sotto la mappa resta fuori campo.
  function facilityStatus(text) {
    lassoStatus(text);
    const box = document.getElementById("facilityStatus");
    if (!box) return;
    box.textContent = text;
    box.hidden = !text;
  }

  // Un WC utile è quello a duecento metri, non quello a trecento chilometri.
  // Sull'intero Giappone questi punti finiscono sotto i pin delle tappe e non se
  // ne vede nemmeno uno: se la mappa è larga, si stringe sulla tappa corrente.
  function zoomToFacilities() {
    if (!map || map.getZoom() >= 13) return "";
    const cities = window.JAPAN_DATA.cities;
    const currentId = localStorage.getItem("tabi-current-city") || "";
    const center = map.getCenter();
    const target = cities.find(function (city) { return city.id === currentId; })
      || (nearestCity(center.lat, center.lng) || {}).city
      || cities[0];
    if (!target) return "";
    map.setView([target.lat, target.lng], 15);
    return " Ti ho portato su " + target.name + ": da lontano finiscono sotto i pin delle tappe.";
  }

  function facilityName(point) {
    return point.name || FACILITY_KINDS[point.kind].label;
  }

  function overpassQuery() {
    const clauses = [];
    window.JAPAN_DATA.cities.forEach(function (city) {
      facilityKinds().forEach(function (kind) {
        const spec = FACILITY_KINDS[kind];
        clauses.push('node["' + spec.tag + '"="' + spec.value + '"](around:' + FACILITY_RADIUS + ',' + city.lat + ',' + city.lng + ');');
      });
    });
    return "[out:json][timeout:60];(" + clauses.join("") + ");out body 2500;";
  }

  function nearestCity(lat, lng) {
    return window.JAPAN_DATA.cities.reduce(function (best, city) {
      const distance = metersBetween({ lat:lat, lng:lng }, city);
      return !best || distance < best.distance ? { city:city, distance:distance } : best;
    }, null);
  }

  function parseFacilities(payload) {
    const grouped = {};
    (payload.elements || []).forEach(function (element) {
      const tags = element.tags || {};
      const kind = facilityKinds().find(function (key) { return tags[FACILITY_KINDS[key].tag] === FACILITY_KINDS[key].value; });
      const lat = Number(element.lat);
      const lng = Number(element.lon);
      if (!kind || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const near = nearestCity(lat, lng);
      const key = kind + "|" + near.city.id;
      (grouped[key] = grouped[key] || []).push({
        id: kind + "-" + element.id,
        kind: kind,
        city: near.city.id,
        distance: near.distance,
        lat: Math.round(lat * 1e5) / 1e5,
        lng: Math.round(lng * 1e5) / 1e5,
        name: String(tags["name:en"] || tags.name || "").slice(0, 60)
      });
    });
    // Solo i più vicini al centro di ogni tappa: gli altri occuperebbero spazio
    // sul telefono senza che nessuno ci arrivi mai a piedi.
    return Object.keys(grouped).reduce(function (all, key) {
      const nearest = grouped[key].sort(function (a, b) { return a.distance - b.distance; }).slice(0, FACILITY_PER_CITY);
      nearest.forEach(function (item) { delete item.distance; });
      return all.concat(nearest);
    }, []);
  }

  function readFacilityCache() {
    try {
      const stored = JSON.parse(localStorage.getItem(FACILITY_CACHE) || "null");
      return stored && Array.isArray(stored.points) && stored.points.length ? stored.points : null;
    } catch (_) { return null; }
  }

  function fetchFacilities() {
    const body = "data=" + encodeURIComponent(overpassQuery());
    return OVERPASS_ENDPOINTS.reduce(function (chain, endpoint) {
      return chain.then(function (payload) {
        if (payload) return payload;
        return fetch(endpoint, { method:"POST", body:body, headers:{ "Content-Type":"application/x-www-form-urlencoded" } })
          .then(function (response) { return response.ok ? response.json() : null; })
          .catch(function () { return null; });
      });
    }, Promise.resolve(null));
  }

  // Un WC non si sposta: una volta scaricato l'elenco resta valido, e soprattutto
  // resta disponibile quando la rete non c'è, che è esattamente il momento in cui
  // serve.
  function ensureFacilities() {
    if (facilityPoints) return Promise.resolve(facilityPoints);
    if (facilityRequest) return facilityRequest;
    const cached = readFacilityCache();
    if (cached) {
      facilityPoints = cached;
      return Promise.resolve(cached);
    }
    if (!navigator.onLine) return Promise.reject(new Error("Servono i dati di OpenStreetMap: riprova quando hai rete."));
    facilityRequest = fetchFacilities().then(function (payload) {
      const points = payload ? parseFacilities(payload) : [];
      if (!points.length) throw new Error("OpenStreetMap non ha risposto: riprova tra un minuto.");
      facilityPoints = points;
      try {
        localStorage.setItem(FACILITY_CACHE, JSON.stringify({ at:Date.now(), points:points }));
      } catch (_) { /* memoria piena: restano validi per questa sessione */ }
      return points;
    }).finally(function () { facilityRequest = null; });
    return facilityRequest;
  }

  function facilityIcon(kind) {
    return L.divIcon({
      className:"map-point-icon",
      html:'<span class="map-facility-marker is-' + kind + '">' + FACILITY_KINDS[kind].glyph + '</span>',
      iconSize:[26, 20], iconAnchor:[13, 10]
    });
  }

  function facilityPopupHTML(point) {
    const city = window.JAPAN_DATA.cities.find(function (candidate) { return candidate.id === point.city; });
    return '<div class="map-popup facility-popup"><p class="map-popup-kicker">' + escapeHTML(FACILITY_KINDS[point.kind].label) + '</p>'
      + '<h3>' + escapeHTML(facilityName(point)) + '</h3>'
      + '<p class="point-location">' + escapeHTML(city ? city.name : "") + '</p>'
      + '<div class="map-popup-actions"><a class="map-popup-action" href="' + googleMapsUrl(point) + '" target="_blank" rel="noopener">Raggiungi con Google Maps ↗</a></div>'
      + '<p class="facility-source">Segnalato su OpenStreetMap: orari e apertura non sono garantiti.</p></div>';
  }

  function buildFacilityMarkers() {
    if (!map || !facilityPoints) return;
    facilityKinds().forEach(function (kind) {
      if (!facilityLayers[kind]) facilityLayers[kind] = L.layerGroup();
    });
    facilityPoints.forEach(function (point) {
      if (facilityMarkers[point.id] || !facilityLayers[point.kind]) return;
      const marker = L.marker([point.lat, point.lng], { icon:facilityIcon(point.kind), title:facilityName(point), alt:facilityName(point) })
        .bindPopup(facilityPopupHTML(point), { maxWidth:popupMaxWidth(), autoPan:false });
      marker.on("popupopen", function () { fitPopup(marker); centerPopup(marker); });
      marker.addTo(facilityLayers[point.kind]);
      facilityMarkers[point.id] = marker;
    });
  }

  function syncFacilityLayer(kind) {
    if (!layerEnabled(kind)) {
      if (facilityLayers[kind] && map) facilityLayers[kind].removeFrom(map);
      if (!enabledFacilityKinds().length) facilityStatus("");
      return;
    }
    // La prima richiesta a OpenStreetMap richiede una decina di secondi: senza
    // dirlo, l'attesa si legge come "non ha trovato niente".
    if (!facilityPoints) facilityStatus("Cerco " + FACILITY_KINDS[kind].plural + " su OpenStreetMap… ci vogliono una decina di secondi, solo la prima volta.");
    ensureFacilities().then(function () {
      buildFacilityMarkers();
      if (!map || !layerEnabled(kind)) return;
      facilityLayers[kind].addTo(map);
      facilityStatus(facilityCountLabel() + zoomToFacilities());
    }).catch(function (error) {
      const input = document.querySelector('[data-map-layer="' + kind + '"]');
      if (input) input.checked = false;
      facilityStatus(error.message);
    });
  }

  function facilityCountLabel() {
    const kinds = enabledFacilityKinds();
    if (!kinds.length || !facilityPoints) return "";
    const counts = kinds.map(function (kind) {
      const total = facilityPoints.filter(function (point) { return point.kind === kind; }).length;
      return total + " " + FACILITY_KINDS[kind].count;
    });
    return counts.join(" e ") + " attorno alle tappe.";
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
        .bindPopup(pointPopupHTML(point), { maxWidth:popupMaxWidth(), autoPan:false });
      marker.on("add", function () { marker.getElement().setAttribute("aria-label", point.name); });
      marker.on("popupopen", function () { fitPopup(marker); centerPopup(marker); hydratePopupImage(marker, point); });
      if (point.guideId && !markerByGuideId[point.guideId]) {
        markerByGuideId[point.guideId] = marker;
        pointByGuideId[point.guideId] = point;
      }
      // Si tiene la coppia punto/marker anche per i doppioni di guideId, così
      // la selezione li governa tutti e non solo il primo.
      placedMarkers.push({ point:point, marker:marker });
      if (onMap(point)) marker.addTo(pointLayers[point.type]);
    });
    ["visit", "tabelog", "hotel"].forEach(syncLayer);
    facilityKinds().forEach(function (kind) { if (layerEnabled(kind)) syncFacilityLayer(kind); });
    openOnCurrentCity();
  }

  // Se sappiamo in che tappa siete, la mappa si apre lì invece che sull'intero
  // Giappone: in viaggio interessa l'isolato, non l'arcipelago.
  function openOnCurrentCity() {
    const cityId = localStorage.getItem("tabi-current-city") || "";
    const city = cityId && window.JAPAN_DATA.cities.find(function (candidate) { return candidate.id === cityId; });
    if (city && Number.isFinite(city.lat) && Number.isFinite(city.lng)) map.setView([city.lat, city.lng], 13);
    else fitRoute();
  }

  // Il popup vive dentro #tripMap, che ha overflow:hidden: oltre le misure del
  // contenitore verrebbe tagliato, pulsante di chiusura compreso. Sul telefono
  // resta volutamente più stretto, così attorno al punto si vede ancora la
  // mappa e si capisce dove ci si trova.
  function popupMaxWidth() {
    const container = document.getElementById("tripMap");
    const width = container ? container.clientWidth : window.innerWidth;
    return Math.max(190, Math.min(width < 560 ? 268 : 310, width - 64));
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

  // L'autoPan di Leaflet si limita a far entrare il popup nella mappa, quindi
  // sul telefono restava incollato a un bordo. Qui la mappa si sposta finché il
  // riquadro non è al centro: il punto resta appena sotto, ben visibile.
  function centerPopup(marker) {
    const popup = marker.getPopup();
    const element = popup && popup.getElement();
    if (!map || !element) return;
    const size = map.getSize();
    const point = map.latLngToContainerPoint(marker.getLatLng());
    const targetX = Math.round(size.x / 2);
    const targetY = Math.round(Math.min(size.y - 16, size.y / 2 + (element.offsetHeight || 0) / 2));
    if (Math.abs(point.x - targetX) < 2 && Math.abs(point.y - targetY) < 2) return;
    map.panBy([point.x - targetX, point.y - targetY], { animate: true, duration: .28 });
  }

  function fitRoute() {
    if (map && routeLayer) map.fitBounds(routeLayer.getBounds(), { padding:[30, 30] });
  }

  function drawUser(latlng) {
    if (userMarker) userMarker.setLatLng(latlng);
    else userMarker = L.circleMarker(latlng, { radius:9, color:"#fff", weight:3, fillColor:"#1b76d1", fillOpacity:1 }).addTo(map).bindPopup("Sei qui");
  }

  // Il puntino segue chi cammina finché la mappa è aperta. Prima si leggeva la
  // posizione una volta sola e bisognava ritoccare ◎ a ogni isolato: va bene per
  // guardare una mappa, non per usarla mentre ci si muove.
  function startFollowing() {
    if (watchId !== null || !navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(function (position) {
      if (!map) return;
      drawUser([position.coords.latitude, position.coords.longitude]);
    }, function () {}, { enableHighAccuracy:true, maximumAge:10000, timeout:20000 });
  }

  function stopFollowing() {
    if (watchId === null) return;
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  function locateUser() {
    const button = document.getElementById("locateButton");
    if (!window.TABI_GEO) return;
    button.disabled = true;
    button.textContent = "Ricerca posizione…";
    window.TABI_GEO.requestPosition({ maximumAge:60000 }).then(function (position) {
      const latlng = [position.coords.latitude, position.coords.longitude];
      drawUser(latlng);
      map.setView(latlng, 15);
      userMarker.openPopup();
      startFollowing();
      button.disabled = false;
      button.textContent = "◎ Ti sto seguendo";
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
      // Senza animazione: il popup si centra da solo appena si apre e durante
      // uno spostamento animato le coordinate a schermo sono ancora le vecchie.
      map.setView(marker.getLatLng(), 16, { animate:false });
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

  // Rilegge la selezione e aggiunge o toglie i marker dal livello, senza
  // reinizializzare la mappa: gli stessi marker restano, cambia solo chi è a
  // schermo. Il popup si rigenera perché contiene l'interruttore.
  function syncSelection() {
    hiddenIds = hiddenIdSet();
    if (!map) return;
    placedMarkers.forEach(function (entry) {
      const layer = pointLayers[entry.point.type];
      if (!layer) return;
      const shouldShow = onMap(entry.point);
      const isOnLayer = layer.hasLayer(entry.marker);
      if (shouldShow && !isOnLayer) layer.addLayer(entry.marker);
      if (!shouldShow && isOnLayer) layer.removeLayer(entry.marker);
      if (shouldShow && entry.point.guideId) entry.marker.setPopupContent(pointPopupHTML(entry.point));
    });
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
  let lassoSkippedNote = "";

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
    lassoSkippedNote = "";
    document.getElementById("lassoLink").hidden = true;
    document.getElementById("lassoUseGpsButton").hidden = true;
  }

  function finishLasso() {
    if (lassoPoints.length < 8) { lassoStatus("Area troppo piccola: riprova disegnando un cerchio più ampio."); clearLasso(); return; }
    hiddenIds = hiddenIdSet();
    const visible = window.JAPAN_MAP_DATA.points.filter(function (point) {
      const toggle = document.querySelector('[data-map-layer="' + point.type + '"]');
      return (!toggle || toggle.checked) && onMap(point) && Number.isFinite(point.lat) && Number.isFinite(point.lng);
    });
    const inArea = visible.filter(function (point) { return insidePolygon(point.lat, point.lng, lassoPoints); });
    // Un posto dove si è già stati non va rimesso nel giro. Resta comunque
    // raggiungibile dal suo punto: nel popup c'è il collegamento a Google Maps,
    // e togliendo la spunta di visita rientra subito nella selezione ad area.
    lassoSelection = inArea.filter(function (point) { return !point.guideId || !doneIds.has(point.guideId); });
    const skipped = inArea.length - lassoSelection.length;
    lassoSkippedNote = skipped ? " " + skipped + (skipped === 1 ? " già visitato escluso." : " già visitati esclusi.") : "";
    if (!lassoSelection.length) {
      lassoStatus(skipped
        ? "Nell'area ci sono solo luoghi già visitati (" + skipped + "). Disegnala più larga o togli la spunta di visita per rimetterli nel giro."
        : "Nessun luogo dentro l'area. Prova a disegnarla più larga o riattiva i livelli.");
      return;
    }
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
    showRoute(buildRoute(null, lassoSelection), lassoSelection.length + " luoghi nell'area." + lassoSkippedNote
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
  document.getElementById("layersButton").addEventListener("click", function () {
    const legend = document.getElementById("mapLegend");
    const button = document.getElementById("layersButton");
    legend.hidden = !legend.hidden;
    button.setAttribute("aria-expanded", String(!legend.hidden));
  });
  document.querySelectorAll("[data-map-layer]").forEach(function (input) {
    input.addEventListener("change", function () {
      const type = input.dataset.mapLayer;
      if (!isFacility(type)) return void syncLayer(type);
      initMap();
      syncFacilityLayer(type);
    });
  });
  window.addEventListener("tabi:viewchange", function (event) {
    if (event.detail.view !== "places") {
      // Fuori dalla mappa il GPS si spegne: tenerlo acceso in Cibi tipici
      // consumerebbe batteria per niente.
      stopFollowing();
      return;
    }
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
  window.addEventListener("tabi:selectionchange", syncSelection);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.querySelector(".map-panel.is-expanded")) toggleExpandedMap();
  });
  window.TABI_MAP = { focusPoint:focusPoint, fitRoute:fitRoute };
})();
