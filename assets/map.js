(function () {
  "use strict";
  let map;
  let routeLayer;
  let userMarker;
  let watchId = null;
  // I livelli dei punti che stanno nei dati della guida, elencati una volta
  // sola: erano ripetuti a mano in due punti, e un tipo aggiunto al primo e
  // dimenticato nel secondo esiste ma non compare mai sulla mappa.
  const STATIC_LAYERS = ["visit", "tabelog", "hotel", "merchant", "stamp"];
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
    else if (item && (item.type === "shop" || item.type === "merchant")) imageType = "shop";
    else if (item && item.type === "experience") imageType = "experience";
    const imageId = point.guideId || "map-image-" + point.id;
    const fallback = imageType === "food" ? "assets/fallback-food.svg" : imageType === "shop" ? "assets/fallback-shop.svg" : "assets/fallback-place.svg";
    const typeLabel = point.type === "tabelog" ? "Locale Tabelog" : point.type === "hotel" ? "Hotel del viaggio"
      : point.type === "merchant" ? "Negoziante" : point.type === "stamp" ? "Timbro dei 100 castelli" : "Da visitare";
    // Sul timbro la categoria ripeterebbe l'etichetta ("Timbro dei 100 castelli
    // · timbro"): lì il tipo dice già tutto.
    const kicker = typeLabel + (point.type === "stamp" ? "" : " · " + point.category);
    const rating = point.type === "tabelog" ? '<span class="tabelog-rating">Tabelog ' + Number(point.score).toFixed(2) + ' alla selezione</span>' : "";
    const tabelog = point.tabelog ? '<a class="map-popup-action is-tabelog" href="' + tabelogUrl(point) + '" target="_blank" rel="noopener">Voto di oggi, orari e prenotazione ↗</a>' : "";
    const guide = point.guideId ? '<button class="map-popup-detail" type="button" data-action="details" data-id="' + escapeHTML(point.guideId) + '">Apri la guida completa ↗</button>' : "";
    const done = point.guideId && item && (item.type === "place" || item.type === "experience" || item.type === "merchant") ? '<button class="map-popup-done' + (doneIds.has(point.guideId) ? ' is-done' : '') + '" type="button" data-action="done" data-id="' + escapeHTML(point.guideId) + '">' + (doneIds.has(point.guideId) ? (item.type === "experience" ? "✓ Fatta" : "✓ Visitato") : (item.type === "experience" ? "Segna fatta" : "Segna visitato")) + '</button>' : "";
    // Togliere un punto dalla mappa mentre lo si sta guardando, senza tornare
    // all'elenco e senza confonderlo con "ci sono già stato".
    const select = point.guideId && (point.type === "visit" || point.type === "merchant")
      ? '<button class="map-popup-select" type="button" data-action="select" data-id="' + escapeHTML(point.guideId) + '">'
        + (hiddenIds.has(point.guideId) ? "Rimetti sulla mappa" : "Togli dalla mappa") + '</button>'
      : "";
    // L'impronta di un timbro è un disegno, e i disegni dei 100 castelli non
    // esistono con licenza libera: per quei punti non si apre nemmeno la
    // cornice, invece di lasciarla vuota o di riempirla pescando una foto a
    // caso del castello. Dove l'immagine del timbro esiste ed è verificata
    // (i timbri di stazione su Commons), passa dalla via curata come tutti.
    const senzaImmagine = point.type === "stamp" && !point.imageUrl;
    const media = senzaImmagine ? "" : '<div class="map-popup-media"><img src="' + fallback + '" data-map-image-id="' + escapeHTML(imageId) + '" data-map-image-type="' + imageType + '" alt="' + escapeHTML(point.name) + '" referrerpolicy="no-referrer"><a class="map-photo-credit" target="_blank" rel="noopener" hidden></a></div>';
    // Stamp bodies concatenate description + Dove: — clamp in a scrollable
    // region so small screens do not trap the whole popup in endless text.
    const bodyClass = point.type === "stamp" ? "map-popup-body is-stamp" : "map-popup-body";
    return '<div class="map-popup point-popup' + (point.type === "stamp" ? " is-stamp" : "") + '">' + media + '<p class="map-popup-kicker">' + escapeHTML(kicker) + '</p>'
      + '<h3>' + escapeHTML(point.name) + '</h3>'
      + '<p class="point-location">' + escapeHTML(point.group || point.area || (city && city.name)) + (point.area && point.group !== point.area ? ' · ' + escapeHTML(point.area) : '') + '</p>'
      + '<p class="' + bodyClass + '">' + escapeHTML(point.description) + '</p>' + rating
      + '<div class="map-popup-actions">' + done + select + guide + tabelog + '<a class="map-popup-action" href="' + googleMapsUrl(point) + '" target="_blank" rel="noopener">Raggiungi con Google Maps ↗</a></div></div>';
  }

  // Il punteggio salvato è quello del giorno in cui il locale è entrato in
  // guida. Su Tabelog cambia di settimana in settimana e non esiste un modo
  // lecito di rileggerlo da qui: la scheda ufficiale, con voto aggiornato,
  // orari e prenotazione, resta a un tocco di distanza.
  function tabelogUrl(point) {
    return "https://tabelog.com/en/" + point.tabelog + "/";
  }

  // Cercare una scheda scorrendo ~700 voci andava bene per una chiamata, non
  // per una a marker: l'indice si costruisce alla prima richiesta, quando i
  // file dati hanno finito di arricchirsi, e da lì è una lettura secca.
  let guideItemIndex = null;

  function findGuideItem(id) {
    if (!guideItemIndex) {
      const data = window.JAPAN_DATA;
      guideItemIndex = new Map();
      [].concat(data.places || [], data.experiences || [], data.foods || [], data.shopping || [], data.merchants || []).forEach(function (item) {
        if (!guideItemIndex.has(item.id)) guideItemIndex.set(item.id, item);
      });
    }
    return guideItemIndex.get(id);
  }

  function popupImageItem(point) {
    const linked = point.guideId && findGuideItem(point.guideId);
    if (linked) return linked;
    // Un timbro non si cerca per nome: "Timbro n. 21 · Castello di Edo" su un
    // motore di ricerca non trova l'impronta, trova il castello. O l'immagine
    // è quella verificata del timbro, o non se ne cerca nessuna.
    if (point.type === "stamp") {
      if (!point.imageUrl) return null;
      return {
        id: "map-image-" + point.id, type: "place", city: point.city, name: point.name, jp: "",
        imageQuery: "", imageUrl: point.imageUrl, imageSourceUrl: point.imageSourceUrl,
        imageCredit: point.imageCredit, imageProvider: "curated"
      };
    }
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
    if (!item) return;
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
    // Il timbro si riconosce da solo: il tondo vermiglio dell'inchiostro dei
    // sigilli giapponesi, con dentro 印. Non ha stato "visitato" perché non è
    // una scheda della guida ma una postazione dentro un altro luogo.
    if (point.type === "stamp") {
      return L.divIcon({ className:"map-point-icon", html:'<span class="map-stamp-marker">印</span>', iconSize:[24, 24], iconAnchor:[12, 12] });
    }
    const isDone = Boolean(point.guideId && doneIds.has(point.guideId));
    // Il negoziante ha il suo simbolo — la tenda di stoffa all'ingresso delle
    // botteghe giapponesi — e il suo colore: sulla mappa non va confuso con un
    // tempio, e il verde dei luoghi da visitare è già preso.
    if (point.type === "merchant") {
      return L.divIcon({
        className:"map-point-icon",
        html:'<span class="map-shop-marker' + (isDone ? " is-done" : "") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v3.2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z"/><path d="M4.5 10.5h15V21h-15z"/></svg>'
          + (isDone ? '<i class="visit-check">✓</i>' : '') + '</span>',
        iconSize:[22, 22], iconAnchor:[11, 11]
      });
    }
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

  // Selezione e livelli sono due cose diverse: un punto acceso il cui livello è
  // spento resta invisibile lo stesso. Chi decide una selezione da un'altra
  // schermata deve poter accendere anche i livelli, altrimenti il tocco sembra
  // non aver fatto niente. Si accende soltanto: spegnere un livello che era
  // stato aperto a mano sarebbe una decisione non dell'utente. Vale anche prima
  // che la mappa esista — syncLayer esce subito, ma la casella resta spuntata e
  // initMap la legge quando costruisce i livelli.
  function showLayers(types) {
    (types || []).forEach(function (type) {
      const toggle = document.querySelector('[data-map-layer="' + type + '"]');
      if (!toggle || toggle.checked) return;
      toggle.checked = true;
      syncLayer(type);
    });
  }

  // ---- WC pubblici, fontanelle e konbini -----------------------------------
  // Sono migliaia, cambiano di continuo e non hanno niente da raccontare:
  // tenerli nei dati della guida non avrebbe senso. Si chiedono a OpenStreetMap
  // solo quando serve, e poi restano sul telefono.
  //
  // Una regola sola: si mostra quello che c'è nella finestra che stai
  // guardando, e spostandoti si scarica la parte nuova. Anche "attorno a me"
  // viene da qui, senza codice dedicato: ◎ La mia posizione porta la mappa su di
  // te, e quello che si cerca è di nuovo la finestra. Prima si cercava attorno
  // alle coordinate delle città tenendo i 40 più vicini, e a Tokyo quel cerchio
  // non arrivava nemmeno all'hotel di Asakusa, 14 km più in là. Ogni riquadro
  // scaricato resta ricordato: tornarci non costa niente e vale anche offline.

  // Ogni livello dice a Overpass che cosa chiedere (`clause`) e sa riconoscere
  // i propri nodi nella risposta (`accepts`). Prima bastavano un tag e un
  // valore; stazioni e metropolitane no, perché si distinguono fra loro per un
  // tag in più e non per il proprio.
  const FACILITY_KINDS = {
    toilet: { clause:'node["amenity"="toilets"]', accepts:function (t) { return t.amenity === "toilets"; }, label:"WC pubblico", plural:"i WC pubblici", count:"WC", glyph:"WC" },
    water: { clause:'node["amenity"="drinking_water"]', accepts:function (t) { return t.amenity === "drinking_water"; }, label:"Fontanella", plural:"le fontanelle", count:"fontanelle", glyph:"水" },
    konbini: { clause:'node["shop"="convenience"]', accepts:function (t) { return t.shop === "convenience"; }, label:"Konbini", plural:"i konbini", count:"konbini", glyph:"24h" },
    // Un ospedale si cerca una volta sola in tutto il viaggio, e in quel momento
    // si ha fretta: meglio averlo fra i livelli che cercarlo con un telefono in
    // mano mentre qualcuno sta male. Si prendono gli ospedali e non gli
    // ambulatori: al pronto soccorso si va negli ospedali.
    hospital: { clause:'node["amenity"="hospital"]', accepts:function (t) { return t.amenity === "hospital"; }, label:"Ospedale", plural:"gli ospedali", count:"ospedali", glyph:"＋" },
    // La stessa richiesta serve tutti e due i livelli: si chiedono le stazioni
    // e poi si separa chi sta sottoterra da chi sta in superficie.
    station: { clause:'node["railway"="station"]', accepts:function (t) { return t.railway === "station" && !isSubwayTags(t); }, label:"Stazione ferroviaria", plural:"le stazioni ferroviarie", count:"stazioni", glyph:"鉄" },
    subway: { clause:null, accepts:function (t) { return t.railway === "station" && isSubwayTags(t); }, label:"Metropolitana", plural:"le fermate della metro", count:"fermate metro", glyph:"M" }
  };

  function isSubwayTags(tags) {
    return tags.station === "subway" || tags.subway === "yes";
  }

  const FACILITY_CACHE = "tabi-facilities-v4";
  const FACILITY_MIN_ZOOM = 13;
  const FACILITY_MAX_POINTS = 4000;
  const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];
  const OVERPASS_TIMEOUT = 25000;
  const facilityLayers = {};
  const facilityMarkers = {};
  let facilityPoints = null;
  let facilityAreas = null;
  // Le richieste in volo, una per tipo e finestra: chi chiede la stessa cosa si
  // aggancia invece di ripeterla, e chi cambia finestra le può fermare.
  const facilityRequests = {};
  let facilityPackBboxes = null;
  const facilityPackIds = new Set();
  let facilityPackLoadPromise = null;

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

  function facilityName(point) {
    return point.name || FACILITY_KINDS[point.kind].label;
  }

  // Una richiesta per tipo, non una sola che li chiede tutti. Chi accende i
  // konbini non deve aspettare anche le stazioni ferroviarie che non ha chiesto,
  // e quello che arriva per primo si può già disegnare invece di restare fermo
  // ad aspettare il pezzo più lento.
  //
  // Le metropolitane non hanno una richiesta propria: si separano dalle stazioni
  // dopo, quindi le due caselle condividono la stessa domanda a Overpass.
  const REQUEST_KIND = { subway: "station" };
  const MAX_PARALLEL_REQUESTS = 2;

  function requestKindFor(kind) {
    return REQUEST_KIND[kind] || kind;
  }

  function kindsServedBy(requestKind) {
    return facilityKinds().filter(function (kind) { return requestKindFor(kind) === requestKind; });
  }

  function overpassQuery(area, requestKind) {
    const box = [area.south, area.west, area.north, area.east].join(",");
    return "[out:json][timeout:60];(" + FACILITY_KINDS[requestKind].clause + "(" + box + "););out body 1500;";
  }

  function areaKeyOf(area) {
    return [area.south, area.west, area.north, area.east].join(",");
  }

  // La finestra che stai guardando, con un margine: un piccolo spostamento non
  // deve far ripartire una richiesta per due isolati.
  function viewArea() {
    const bounds = map.getBounds();
    const margin = 0.004;
    return {
      south: Number((bounds.getSouth() - margin).toFixed(4)),
      west: Number((bounds.getWest() - margin).toFixed(4)),
      north: Number((bounds.getNorth() + margin).toFixed(4)),
      east: Number((bounds.getEast() + margin).toFixed(4))
    };
  }

  // I riquadri sono ricordati per tipo: aver già scaricato i konbini di una zona
  // non vuol dire avere anche i suoi WC. I riquadri salvati dalle versioni
  // precedenti non portano il tipo perché venivano da una richiesta che li
  // chiedeva tutti insieme: quelli valgono ancora per chiunque.
  function areaCoveredFor(kind, area) {
    if (facilityPackCoversArea(area)) return true;
    const requestKind = requestKindFor(kind);
    return (facilityAreas || []).some(function (done) {
      return (!done.kind || done.kind === requestKind)
        && done.south <= area.south && done.west <= area.west
        && done.north >= area.north && done.east >= area.east;
    });
  }

  function facilityPackCoversArea(area) {
    if (!facilityPackBboxes || !facilityPackBboxes.length) return false;
    const centerLat = (area.south + area.north) / 2;
    const centerLng = (area.west + area.east) / 2;
    return facilityPackBboxes.some(function (box) {
      return centerLat >= box.south && centerLat <= box.north
        && centerLng >= box.west && centerLng <= box.east;
    });
  }

  function expandPackFacilityRow(row, index) {
    const kind = row[0];
    const point = {
      id: kind + "-pack-" + index,
      kind: kind,
      lat: row[1],
      lng: row[2],
      city: row[4] || "",
      name: row[3] || ""
    };
    if (kind === "station" && row[5]) point.operator = row[5];
    if (kind === "subway" && row[5]) {
      point.line = { code: row[5], color: row[6] || "#6c7b86", name: row[7] || "", network: row[8] || "" };
    }
    return point;
  }

  function seedFacilitiesFromPack(pack) {
    if (!pack || !Array.isArray(pack.points)) return;
    loadFacilityCache();
    clearFacilityPackFromMemory();
    facilityPackBboxes = Array.isArray(pack.bboxes) ? pack.bboxes : null;
    const known = new Set(facilityPoints.map(function (point) { return point.id; }));
    pack.points.forEach(function (row, index) {
      const point = expandPackFacilityRow(row, index);
      facilityPackIds.add(point.id);
      if (!known.has(point.id)) {
        known.add(point.id);
        facilityPoints.push(point);
      }
    });
    buildFacilityMarkers();
  }

  function clearFacilityPackFromMemory() {
    if (!facilityPackIds.size) return;
    facilityPoints = (facilityPoints || []).filter(function (point) { return !facilityPackIds.has(point.id); });
    facilityPackIds.clear();
    facilityPackBboxes = null;
    pruneFacilityMarkers();
  }

  function ensureFacilityPackLoaded() {
    if (facilityPackBboxes) return Promise.resolve(true);
    if (!window.TABI_OFFLINE_PACK || typeof window.TABI_OFFLINE_PACK.loadFacilityPack !== "function") {
      return Promise.resolve(false);
    }
    if (!window.TABI_OFFLINE_PACK.needsFacilities
      || !window.TABI_OFFLINE_PACK.needsFacilities(window.TABI_OFFLINE_PACK.getActiveTier().level)) {
      clearFacilityPackFromMemory();
      return Promise.resolve(false);
    }
    if (!facilityPackLoadPromise) {
      facilityPackLoadPromise = window.TABI_OFFLINE_PACK.loadFacilityPack().then(function (pack) {
        if (pack) seedFacilitiesFromPack(pack);
        return !!facilityPackBboxes;
      }).finally(function () {
        facilityPackLoadPromise = null;
      });
    }
    return facilityPackLoadPromise;
  }

  function refreshFacilityPack() {
    return ensureFacilityPackLoaded().then(function (loaded) {
      if (!loaded) clearFacilityPackFromMemory();
      return loaded;
    });
  }

  function nearestCity(lat, lng) {
    return window.JAPAN_DATA.cities.reduce(function (best, city) {
      const distance = metersBetween({ lat:lat, lng:lng }, city);
      return !best || distance < best.distance ? { city:city, distance:distance } : best;
    }, null);
  }

  function parseFacilities(payload) {
    const out = [];
    (payload.elements || []).forEach(function (element) {
      const tags = element.tags || {};
      const kind = facilityKinds().find(function (key) { return FACILITY_KINDS[key].accepts(tags); });
      const lat = Number(element.lat);
      const lng = Number(element.lon);
      if (!kind || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      // Serve alla riga "Kyoto" nel riquadro del punto, e alla metro per
      // sapere di quale rete è la lettera quando l'operatore non è scritto.
      const city = (nearestCity(lat, lng) || { city:{ id:"" } }).city.id;
      const point = {
        id: kind + "-" + element.id,
        kind: kind,
        city: city,
        lat: Math.round(lat * 1e5) / 1e5,
        lng: Math.round(lng * 1e5) / 1e5,
        name: String(tags["name:en"] || tags.name || "").slice(0, 60)
      };
      if (kind === "subway" && window.JAPAN_TRANSIT) point.line = window.JAPAN_TRANSIT.lineFor(tags, city);
      if (kind === "station") point.operator = String(tags["operator:en"] || tags.operator || "").slice(0, 60);
      out.push(point);
    });
    return out;
  }

  // Le versioni vecchie della cache restavano nel telefono a occupare spazio
  // senza che nessuno le leggesse più, e la memoria di localStorage è poca.
  const FACILITY_CACHE_OLD = ["tabi-facilities-v2", "tabi-facilities-v3"];

  // Trenta giorni senza aprire la mappa e i punti scaricati si buttano: un
  // konbini chiuso o un WC rimosso da OpenStreetMap non devono sopravvivere per
  // sempre. Ogni salvataggio rinfresca la data, quindi durante il viaggio la
  // cache non scade mai sotto i piedi.
  const FACILITY_TTL = 30 * 24 * 60 * 60 * 1000;

  function loadFacilityCache() {
    if (facilityPoints) return;
    FACILITY_CACHE_OLD.forEach(function (key) { localStorage.removeItem(key); });
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(FACILITY_CACHE) || "null"); } catch (_) { stored = null; }
    const fresh = stored && Number.isFinite(stored.at) && Date.now() - stored.at < FACILITY_TTL;
    facilityPoints = fresh && Array.isArray(stored.points) ? stored.points : [];
    facilityAreas = fresh && Array.isArray(stored.areas) ? stored.areas : [];
  }

  // I punti sfrattati dalla cache lasciavano il marker sul livello: pin di zone
  // buttate settimane prima, vivi fino alla chiusura della pagina.
  function pruneFacilityMarkers() {
    const alive = new Set(facilityPoints.map(function (point) { return point.id; }));
    Object.keys(facilityMarkers).forEach(function (id) {
      if (alive.has(id)) return;
      const marker = facilityMarkers[id];
      Object.keys(facilityLayers).forEach(function (kind) {
        if (facilityLayers[kind].hasLayer(marker)) facilityLayers[kind].removeLayer(marker);
      });
      delete facilityMarkers[id];
    });
  }

  function saveFacilityCache() {
    // Se si supera il tetto si buttano i riquadri più vecchi con i loro punti:
    // meglio perdere una città attraversata settimane fa che riempire la memoria
    // del telefono.
    const hadEviction = facilityPoints.length > FACILITY_MAX_POINTS;
    while (facilityPoints.length > FACILITY_MAX_POINTS && facilityAreas.length > 1) {
      const oldest = facilityAreas.shift();
      // Si buttano solo i punti che quel riquadro aveva portato: dentro lo stesso
      // rettangolo possono esserci konbini scaricati ieri e WC scaricati adesso.
      const drop = new Set(oldest.kind ? kindsServedBy(oldest.kind) : facilityKinds());
      facilityPoints = facilityPoints.filter(function (point) {
        return !(drop.has(point.kind)
          && point.lat >= oldest.south && point.lat <= oldest.north
          && point.lng >= oldest.west && point.lng <= oldest.east);
      });
    }
    if (hadEviction) pruneFacilityMarkers();
    const incremental = facilityPoints.filter(function (point) { return !facilityPackIds.has(point.id); });
    try {
      localStorage.setItem(FACILITY_CACHE, JSON.stringify({ at:Date.now(), points:incremental, areas:facilityAreas }));
    } catch (_) { /* memoria piena: restano validi per questa sessione */ }
  }

  // Serializzare fino a 4000 punti a ogni pezzo arrivato è un lavoro da mezzo
  // secondo di telefono: si scrive una volta a raffica finita. Se la pagina
  // chiude prima, si perde solo l'ultimo pezzo — è riscaricabile.
  let facilitySaveTimer = null;

  function scheduleFacilitySave() {
    clearTimeout(facilitySaveTimer);
    facilitySaveTimer = setTimeout(saveFacilityCache, 800);
  }

  // Overpass a volte accetta la connessione e poi non risponde più. Senza un
  // tempo massimo la richiesta resta appesa e il pannello mostra "Cerco…" per
  // sempre, che è indistinguibile da "non ha trovato niente": dopo il tempo si
  // molla e si prova il secondo server.
  // Un server che risponde 429 sta chiedendo di rallentare: riprovarlo subito è
  // il modo migliore per farsi bloccare del tutto. Si rispetta Retry-After — o
  // un minuto, se non c'è — come già fa la pipeline delle foto in app.js.
  const overpassCooldowns = {};

  function fetchWithTimeout(endpoint, body, controller) {
    const timer = setTimeout(function () { controller.abort(); }, OVERPASS_TIMEOUT);
    return fetch(endpoint, {
      method: "POST", body: body, signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
      .then(function (response) {
        if (response.status === 429 || response.status === 504) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          overpassCooldowns[endpoint] = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60000);
          return null;
        }
        return response.ok ? response.json() : null;
      })
      .catch(function () { return null; })
      .finally(function () { clearTimeout(timer); });
  }

  function fetchArea(area, requestKind, controller) {
    const body = "data=" + encodeURIComponent(overpassQuery(area, requestKind));
    return OVERPASS_ENDPOINTS.reduce(function (chain, endpoint) {
      return chain.then(function (payload) {
        // Dopo un abort non si prova il secondo server: quella finestra non si
        // sta più guardando. Un server in castigo per 429 si salta finché non
        // scade il suo Retry-After.
        if (payload || controller.signal.aborted) return payload;
        if ((overpassCooldowns[endpoint] || 0) > Date.now()) return payload;
        return fetchWithTimeout(endpoint, body, controller);
      });
    }, Promise.resolve(null));
  }

  function mergeChunk(payload, area, requestKind) {
    const known = new Set(facilityPoints.map(function (point) { return point.id; }));
    parseFacilities(payload).forEach(function (point) {
      if (!known.has(point.id)) { known.add(point.id); facilityPoints.push(point); }
    });
    facilityAreas.push({ south:area.south, west:area.west, north:area.north, east:area.east, kind:requestKind });
    scheduleFacilitySave();
  }

  // Scarica i riquadri attorno a dove sei e attorno all'hotel della tappa, se non
  // li hai già. Un WC non si sposta: quello che è stato scaricato resta valido e
  // disponibile anche senza rete, che è esattamente il momento in cui serve.
  // La regola è una sola: quello che c'è nella finestra che stai guardando.
  // Spostandoti si scarica la parte nuova. Premendo ◎ La mia posizione la mappa
  // si porta su di te, quindi "attorno a me" viene da sé senza casi speciali.
  // Spostando la mappa, le richieste della finestra di prima non servono più:
  // si fermano invece di occupare la coda e di far aspettare quelle nuove.
  function abortStaleRequests(areaKey) {
    Object.keys(facilityRequests).forEach(function (key) {
      const job = facilityRequests[key];
      if (job.areaKey === areaKey) return;
      job.stale = true;
      job.controller.abort();
      delete facilityRequests[key];
    });
  }

  // Il tetto di due richieste alla volta vale per tutta la mappa, non per ogni
  // chiamata: accendendo tre caselle in fila partirebbero altrimenti sei
  // richieste insieme, che è il contrario di quello che si vuole ottenere.
  let activeRequests = 0;
  const waitingRequests = [];

  function withRequestSlot(run) {
    return new Promise(function (resolve) {
      const attempt = function () {
        if (activeRequests >= MAX_PARALLEL_REQUESTS) { waitingRequests.push(attempt); return; }
        activeRequests += 1;
        resolve(run().finally(function () {
          activeRequests -= 1;
          const next = waitingRequests.shift();
          if (next) next();
        }));
      };
      attempt();
    });
  }

  function startRequest(requestKind, area, areaKey) {
    const key = requestKind + "@" + areaKey;
    if (facilityRequests[key]) return facilityRequests[key];
    const job = { areaKey:areaKey, stale:false, controller:new AbortController() };
    job.promise = withRequestSlot(function () {
      return fetchArea(area, requestKind, job.controller);
    }).then(function (payload) {
      if (job.stale) return "stale";
      if (!payload) return "failed";
      mergeChunk(payload, area, requestKind);
      return "ok";
    }).finally(function () {
      if (facilityRequests[key] === job) delete facilityRequests[key];
    });
    facilityRequests[key] = job;
    return job;
  }

  // Il caricamento non è più un blocco solo: ogni tipo arriva per conto suo e
  // chi chiama disegna quello che è arrivato senza aspettare il resto. Due
  // richieste alla volta, perché Overpass è un servizio pubblico e gratuito e
  // sommergerlo di richieste parallele lo fa rispondere più lentamente a tutti.
  function loadFacilities(kinds, onChunk) {
    loadFacilityCache();
    return ensureFacilityPackLoaded().then(function () {
      if (!map) return facilityPoints;
      if (map.getZoom() < FACILITY_MIN_ZOOM) {
        const tooFar = new Error("Avvicinati sulla zona che ti interessa: da qui il riquadro sarebbe troppo grande.");
        tooFar.keepLayerOn = true;
        return Promise.reject(tooFar);
      }
      const area = viewArea();
      const areaKey = areaKeyOf(area);
      abortStaleRequests(areaKey);
      const missing = [];
      kinds.forEach(function (kind) {
        const requestKind = requestKindFor(kind);
        if (missing.indexOf(requestKind) === -1 && !areaCoveredFor(kind, area)) missing.push(requestKind);
      });
      if (!missing.length) return facilityPoints;
      if (!navigator.onLine) {
        const offline = new Error("Zona non ancora scaricata: serve la rete o il piano Ampio/Massimo. Le zone già scaricate restano.");
        offline.keepLayerOn = true;
        return Promise.reject(offline);
      }
      const settled = [];
      const jobs = missing.map(function (requestKind) {
        return startRequest(requestKind, area, areaKey).promise.then(function (outcome) {
          if (outcome === "stale") return outcome;
          settled.push(requestKind);
          if (outcome === "ok" && onChunk) {
            const arrived = function (kind) { return settled.indexOf(requestKindFor(kind)) !== -1; };
            onChunk(kinds.filter(arrived), kinds.filter(function (kind) { return !arrived(kind); }));
          }
          return outcome;
        });
      });
      return Promise.all(jobs).then(function (outcomes) {
        const done = outcomes.filter(function (outcome) { return outcome === "ok"; }).length;
        if (!done && outcomes.some(function (outcome) { return outcome === "stale"; })) return facilityPoints;
        if (!done && !facilityPoints.length) {
          throw new Error("OpenStreetMap non ha risposto: riprova tra un minuto.");
        }
        return facilityPoints;
      });
    });
  }

  // La fermata della metro porta addosso la propria linea: la lettera del
  // codice stazione sul colore ufficiale della linea. È l'unico modo per
  // distinguere a colpo d'occhio dodici linee che passano nello stesso isolato.
  function facilityIcon(point) {
    const kind = point.kind;
    if (kind === "subway") {
      const line = point.line || {};
      const color = line.color || (window.JAPAN_TRANSIT ? window.JAPAN_TRANSIT.unknownColor : "#6c7b86");
      const letter = escapeHTML((line.code || "M").slice(0, 1));
      return L.divIcon({
        className:"map-point-icon",
        html:'<span class="map-subway-marker" style="--metro:' + escapeHTML(color) + '">' + letter + '</span>',
        iconSize:[22, 22], iconAnchor:[11, 11]
      });
    }
    return L.divIcon({
      className:"map-point-icon",
      html:'<span class="map-facility-marker is-' + kind + '">' + FACILITY_KINDS[kind].glyph + '</span>',
      iconSize:[26, 20], iconAnchor:[13, 10]
    });
  }

  function facilityPopupHTML(point) {
    const city = window.JAPAN_DATA.cities.find(function (candidate) { return candidate.id === point.city; });
    const line = point.kind === "subway" && point.line
      ? '<p class="map-line-row"><span class="map-line-chip" style="--metro:' + escapeHTML(point.line.color) + '">' + escapeHTML(point.line.code) + '</span>'
        + '<b>' + escapeHTML([point.line.network, point.line.name ? point.line.name + " Line" : ""].filter(Boolean).join(" · ")) + '</b></p>'
      : "";
    const operator = point.kind === "station" && point.operator
      ? '<p class="point-location">' + escapeHTML(point.operator) + '</p>'
      : "";
    return '<div class="map-popup facility-popup"><p class="map-popup-kicker">' + escapeHTML(FACILITY_KINDS[point.kind].label) + '</p>'
      + '<h3>' + escapeHTML(facilityName(point)) + '</h3>' + line + operator
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
      const marker = L.marker([point.lat, point.lng], { icon:facilityIcon(point), title:facilityName(point), alt:facilityName(point) })
        // Come per i punti della guida: il popup si costruisce all'apertura.
        // Qui i marker possono essere migliaia (konbini, stazioni).
        .bindPopup(function () { return facilityPopupHTML(point); }, { maxWidth:popupMaxWidth(), autoPan:false });
      marker.on("popupopen", function () { fitPopup(marker); centerPopup(marker); });
      marker.addTo(facilityLayers[point.kind]);
      facilityMarkers[point.id] = marker;
    });
  }

  // Mostra sulla mappa i tipi già arrivati, senza toccare quelli che stanno
  // ancora caricando: è tutto il senso del caricamento a pezzi.
  function showArrivedLayers(kinds) {
    buildFacilityMarkers();
    if (!map) return;
    kinds.forEach(function (kind) {
      if (layerEnabled(kind) && facilityLayers[kind]) facilityLayers[kind].addTo(map);
    });
    renderSubwayLegend();
  }

  function syncFacilityLayer(kind) {
    if (!layerEnabled(kind)) {
      if (facilityLayers[kind] && map) facilityLayers[kind].removeFrom(map);
      if (!enabledFacilityKinds().length) facilityStatus("");
      renderSubwayLegend();
      return;
    }
    facilityStatus("Cerco " + FACILITY_KINDS[kind].plural + " in questa zona…");
    loadFacilities([kind], function (shown, pending) {
      showArrivedLayers(shown);
      facilityStatus(facilityProgressLabel(shown, pending));
    }).then(function () {
      showArrivedLayers([kind]);
      if (!map || !layerEnabled(kind)) return;
      facilityStatus(settledCountLabel());
    }).catch(function (error) {
      if (!error.keepLayerOn) {
        const input = document.querySelector('[data-map-layer="' + kind + '"]');
        if (input) input.checked = false;
      }
      facilityStatus(error.message);
    });
  }

  // Si richiama quando cambia qualcosa che sposta gli ancoraggi: la posizione
  // che si aggiorna mentre cammini, o la tappa scelta in Viaggio.
  function refreshFacilities() {
    const kinds = enabledFacilityKinds();
    if (!map || !kinds.length) return;
    // Spostandosi la richiesta parte in silenzio e il conteggio resta quello di
    // prima finché non arriva: senza una riga che lo dica sembra che la mappa
    // nuova non abbia niente.
    const missing = kinds.filter(function (kind) { return !areaCoveredFor(kind, viewArea()); });
    if (map.getZoom() >= FACILITY_MIN_ZOOM && missing.length) {
      facilityStatus("Cerco in questa zona…");
    }
    loadFacilities(kinds, function (shown, pending) {
      showArrivedLayers(shown);
      facilityStatus(facilityProgressLabel(shown, pending));
    }).then(function () {
      showArrivedLayers(kinds);
      facilityStatus(settledCountLabel());
    }).catch(function (error) { facilityStatus(error.message); });
  }

  // Si conta quello che è davvero sotto gli occhi, non il totale scaricato: se
  // hai i punti dell'hotel ma stai guardando un'altra città, "288 konbini" con
  // la mappa vuota non spiegherebbe niente.
  // Dodici pallini colorati sulla mappa non dicono quale linea sia quale. La
  // legenda elenca solo le linee che stai davvero guardando: a Tokyo sono
  // tredici in tutto, ma in un isolato non sono mai più di tre o quattro.
  function renderSubwayLegend() {
    const box = document.getElementById("subwayLegend");
    if (!box) return;
    if (!layerEnabled("subway") || !facilityPoints) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const bounds = map && map.getBounds();
    const seen = new Map();
    facilityPoints.forEach(function (point) {
      if (point.kind !== "subway" || !point.line || !point.line.name) return;
      if (bounds && !bounds.contains([point.lat, point.lng])) return;
      const key = point.line.network + "|" + point.line.name;
      if (!seen.has(key)) seen.set(key, point.line);
    });
    const lines = Array.from(seen.values()).sort(function (a, b) { return a.network.localeCompare(b.network) || a.name.localeCompare(b.name); });
    box.hidden = !lines.length;
    box.innerHTML = lines.map(function (line) {
      return '<span class="map-line-chip is-legend" style="--metro:' + escapeHTML(line.color) + '">'
        + escapeHTML(line.code.slice(0, 1)) + '</span><small>' + escapeHTML(line.name) + '</small>';
    }).join("");
  }

  function facilityCountLabel(only) {
    const kinds = only || enabledFacilityKinds();
    if (!kinds.length || !facilityPoints) return "";
    const bounds = map && map.getBounds();
    const counts = kinds.map(function (kind) {
      const inVista = facilityPoints.filter(function (point) {
        return point.kind === kind && (!bounds || bounds.contains([point.lat, point.lng]));
      }).length;
      return inVista + " " + FACILITY_KINDS[kind].count;
    });
    return counts.join(" e ") + " in questa zona.";
  }

  // "Cerco ancora" si dice solo di ciò che è davvero in volo: un livello la cui
  // richiesta è fallita non deve restare scritto come in arrivo per sempre.
  function pendingKinds() {
    const inFlight = Object.keys(facilityRequests).map(function (key) { return key.split("@")[0]; });
    return enabledFacilityKinds().filter(function (kind) { return inFlight.indexOf(requestKindFor(kind)) !== -1; });
  }

  // A fine caricamento si contano solo i livelli che hanno davvero una risposta:
  // accendendo tre caselle in fila, le prime a finire non devono dichiarare
  // "0 stazioni" per un livello che sta ancora arrivando.
  function settledCountLabel() {
    const waiting = pendingKinds();
    const enabled = enabledFacilityKinds();
    const area = map ? viewArea() : null;
    const ready = enabled.filter(function (kind) {
      return waiting.indexOf(kind) === -1 && (!area || areaCoveredFor(kind, area));
    });
    if (waiting.length) return facilityProgressLabel(ready, waiting);
    // Un livello che nessuno sta più cercando e di cui non abbiamo la zona è una
    // richiesta andata storta: "0 konbini" direbbe che non ce ne sono, che è
    // un'altra cosa e manderebbe a cercare un caffè al posto della colazione.
    const missed = enabled.filter(function (kind) { return ready.indexOf(kind) === -1; });
    const label = facilityCountLabel(ready);
    if (!missed.length) return label;
    const names = missed.map(function (kind) { return FACILITY_KINDS[kind].count; }).join(" e ");
    return (label ? label + " " : "") + "Per " + names + " OpenStreetMap non ha risposto: riprova fra un minuto.";
  }

  // Mentre si carica si dice quello che c'è già e quello che manca ancora: una
  // riga che cambia da sola dice "sta arrivando" meglio di un "Cerco…" fermo
  // per venti secondi.
  function facilityProgressLabel(shown, pending) {
    const found = shown.length ? facilityCountLabel(shown) : "";
    if (!pending.length) return found;
    const rest = pending.map(function (kind) { return FACILITY_KINDS[kind].count; }).join(" e ");
    return (found ? found.replace(/\.$/, "") + " · c" : "C") + "erco ancora " + rest + "…";
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
    let baseOfflineLayer = null;
    let offlineBasemapToastAt = 0;
    const baseOsmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom:18,
      // Con CORS la risposta non è "opaque" e il service worker può salvarla:
      // senza questo attributo nessuna tile finiva mai nella cache offline.
      crossOrigin:"",
      // Offline o con rete che perde colpi, un riquadro mancante diventa carta
      // neutra invece di un'icona di immagine rotta.
      errorTileUrl:"data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#ece7dc"/></svg>'),
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    function ensureOsmBasemap() {
      if (baseOfflineLayer && map.hasLayer(baseOfflineLayer)) {
        map.removeLayer(baseOfflineLayer);
        baseOfflineLayer = null;
      }
      if (baseOsmLayer && !map.hasLayer(baseOsmLayer)) baseOsmLayer.addTo(map);
    }

    function toastOfflineBasemapFail(detail) {
      const now = Date.now();
      if (now - offlineBasemapToastAt < 8000) return;
      offlineBasemapToastAt = now;
      const suffix = detail ? ": " + detail : "";
      if (window.TABI_UI) {
        window.TABI_UI.toast("Mappa offline non disponibile" + suffix);
      }
    }

    // Vector Protomaps packs need protomaps-leaflet + a PMTiles instance from
    // FileSource(blob). blob: object URLs do not end in ".pmtiles", so
    // sourcesToViews treats them as ZXY templates and paints nothing. Never
    // remove OSM until the offline layer is constructed and added successfully.
    async function buildOfflinePmtiles(blob, fileName) {
      if (!window.pmtiles || !window.pmtiles.PMTiles || !window.pmtiles.FileSource) {
        throw new Error("libreria PMTiles assente");
      }
      if (!window.protomapsL || typeof window.protomapsL.leafletLayer !== "function") {
        throw new Error("protomaps-leaflet assente");
      }
      const file = blob instanceof File
        ? blob
        : new File([blob], fileName || "offline.pmtiles", { type: "application/vnd.pmtiles" });
      const archive = new window.pmtiles.PMTiles(new window.pmtiles.FileSource(file));
      const header = await archive.getHeader();
      // 1 = MVT. leafletRasterLayer cannot draw these archives.
      if (header.tileType !== 1) {
        throw new Error("pacchetto non vettoriale");
      }
      return { archive: archive, maxDataZoom: header.maxZoom || 14 };
    }

    async function applyOfflineBasemap() {
      // Online: always OSM. Never replace a working network basemap with a
      // local PMTiles layer that can paint blank after a silent failure.
      if (navigator.onLine !== false) {
        ensureOsmBasemap();
        return;
      }

      if (!window.TABI_OFFLINE_PACK || !window.protomapsL) {
        ensureOsmBasemap();
        return;
      }

      const tier = window.TABI_OFFLINE_PACK.getActiveTier
        ? window.TABI_OFFLINE_PACK.getActiveTier()
        : null;
      const wantsMapPack = tier && (tier.level === "ampio" || tier.level === "max");

      let blob = null;
      try {
        blob = typeof window.TABI_OFFLINE_PACK.getMapBlob === "function"
          ? await window.TABI_OFFLINE_PACK.getMapBlob()
          : null;
      } catch (error) {
        console.error("[tabi] getMapBlob", error);
        blob = null;
      }

      if (!blob) {
        ensureOsmBasemap();
        if (wantsMapPack) toastOfflineBasemapFail("pacchetto assente");
        return;
      }

      const fileName = ((tier && tier.key) || "offline") + ".pmtiles";

      let nextLayer = null;
      try {
        const built = await buildOfflinePmtiles(blob, fileName);
        nextLayer = window.protomapsL.leafletLayer({
          url: built.archive,
          lang: "it",
          flavor: "light",
          theme: "light",
          maxDataZoom: built.maxDataZoom,
          maxZoom: 18,
          attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        });
        nextLayer.addTo(map);
        if (typeof nextLayer.bringToBack === "function") nextLayer.bringToBack();
      } catch (error) {
        console.error("[tabi] offline basemap", error);
        ensureOsmBasemap();
        if (wantsMapPack) toastOfflineBasemapFail((error && error.message) || "errore");
        return;
      }

      if (baseOsmLayer && map.hasLayer(baseOsmLayer)) map.removeLayer(baseOsmLayer);
      if (baseOfflineLayer && map.hasLayer(baseOfflineLayer) && baseOfflineLayer !== nextLayer) {
        map.removeLayer(baseOfflineLayer);
      }
      baseOfflineLayer = nextLayer;
    }

    applyOfflineBasemap();
    if (window.TABI_OFFLINE_PACK) {
      window.TABI_OFFLINE_PACK.onTierChange(function () {
        applyOfflineBasemap();
        refreshFacilityPack();
      });
      refreshFacilityPack();
    }
    window.addEventListener("online", function () { applyOfflineBasemap(); });
    window.addEventListener("offline", function () { applyOfflineBasemap(); });

    const coordinates = window.JAPAN_DATA.cities.map(function (city) {
      const icon = L.divIcon({ className:"route-marker", html:String(city.order), iconSize:[34, 34] });
      const marker = L.marker([city.lat, city.lng], { icon:icon, zIndexOffset:700, title:"Apri tappa " + city.name, alt:"Tappa " + city.name }).bindPopup(cityPopupHTML(city));
      marker.on("add", function () { marker.getElement().setAttribute("aria-label", "Apri tappa " + city.name); });
      marker.on("click", function () { map.setView([city.lat, city.lng], 13); });
      marker.addTo(map);
      return [city.lat, city.lng];
    });
    routeLayer = L.polyline(coordinates, { color:"#b6422e", weight:3, opacity:.72, dashArray:"8 9" }).addTo(map);

    STATIC_LAYERS.forEach(function (type) { pointLayers[type] = L.layerGroup(); });
    window.JAPAN_MAP_DATA.points.forEach(function (point) {
      const marker = L.marker([point.lat, point.lng], { icon:pointIcon(point), zIndexOffset:point.type === "hotel" ? 500 : 0, title:point.name, alt:point.name })
        // Il contenuto è una funzione: si valuta all'apertura, sempre fresco.
        // Costruire subito 400 popup teneva occupato il primo tocco su Mappa
        // per niente — quasi tutti non verranno mai aperti.
        .bindPopup(function () { return pointPopupHTML(point); }, { maxWidth:popupMaxWidth(), autoPan:false });
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
    STATIC_LAYERS.forEach(syncLayer);
    openOnCurrentCity();
    facilityKinds().forEach(function (kind) { if (layerEnabled(kind)) syncFacilityLayer(kind); });
    // Spostando la mappa si scarica anche la zona nuova, una volta sola quando
    // ci si ferma: senza, "quello che stai guardando" varrebbe solo nell'istante
    // in cui hai acceso l'interruttore.
    let settleTimer = null;
    map.on("moveend zoomend", function () {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(refreshFacilities, 600);
    });
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
    }, function () {
      // Il GPS sparisce in galleria o fra i palazzi: il puntino resterebbe
      // fermo su un posto in cui non sei più senza che nulla lo dica. Si smette
      // di seguire e il bottone torna a offrire la ricerca.
      stopFollowing();
      resetLocateButton();
    }, { enableHighAccuracy:true, maximumAge:10000, timeout:20000 });
  }

  function stopFollowing() {
    if (watchId === null) return;
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  const LOCATE_LABEL = "◎ La mia posizione";
  let locateResetTimer = null;

  function resetLocateButton() {
    const button = document.getElementById("locateButton");
    if (!button) return;
    button.disabled = false;
    button.textContent = LOCATE_LABEL;
  }

  function locateUser() {
    const button = document.getElementById("locateButton");
    if (!window.TABI_GEO) return;
    clearTimeout(locateResetTimer);
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
    }).catch(function (error) {
      // Il motivo vero (permesso negato, GPS assente, tempo scaduto) arriva da
      // requestPosition e passa dal toast; il bottone non resta bloccato
      // sull'errore per sempre.
      button.disabled = false;
      button.textContent = "Posizione non disponibile";
      if (window.TABI_UI && error && error.message) window.TABI_UI.toast(error.message);
      locateResetTimer = setTimeout(resetLocateButton, 5000);
    });
  }

  function focusPoint(guideId) {
    initMap();
    const marker = markerByGuideId[guideId];
    if (!map || !marker) return false;
    // Si accende il livello a cui il punto appartiene davvero: aprendo un
    // negoziante dalla sua scheda, accendere "luoghi da visitare" non lo
    // farebbe comparire.
    const point = pointByGuideId[guideId];
    const type = (point && point.type) || "visit";
    const toggle = document.querySelector('[data-map-layer="' + type + '"]');
    if (toggle) toggle.checked = true;
    syncLayer(type);
    const panel = document.querySelector(".map-panel");
    const smooth = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (panel) panel.scrollIntoView({ behavior:smooth ? "smooth" : "auto", block:"start" });
    window.setTimeout(function () {
      map.invalidateSize();
      // Senza animazione: il popup si centra da solo appena si apre e durante
      // uno spostamento animato le coordinate a schermo sono ancora le vecchie.
      map.setView(marker.getLatLng(), 16, { animate:false });
      marker.openPopup();
    }, 100);
    return true;
  }

  // Il contenuto dei popup è una funzione valutata all'apertura: un popup
  // chiuso non va toccato, si rigenererà fresco da solo. Solo quello aperto
  // sotto gli occhi dell'utente va ridisegnato subito, foto compresa.
  function redrawOpenPopup(marker, point) {
    if (!marker.isPopupOpen()) return;
    marker.getPopup().update();
    window.setTimeout(function () { hydratePopupImage(marker, point); }, 0);
  }

  function refreshProgressMarker(guideId) {
    const marker = markerByGuideId[guideId];
    const point = pointByGuideId[guideId];
    if (!marker || !point) return;
    marker.setIcon(pointIcon(point));
    redrawOpenPopup(marker, point);
  }

  // Rilegge la selezione e aggiunge o toglie i marker dal livello, senza
  // reinizializzare la mappa: gli stessi marker restano, cambia solo chi è a
  // schermo. Prima qui si rigeneravano ~340 popup a ogni spunta; ora nessuno,
  // salvo quello eventualmente aperto.
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
      if (shouldShow && entry.point.guideId) redrawOpenPopup(entry.marker, entry.point);
    });
  }

  function refreshAllProgressMarkers() {
    Object.keys(markerByGuideId).forEach(refreshProgressMarker);
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

  // Percorso più breve esatto (Held-Karp): con le tappe che un link Google
  // regge (fino a 11) la programmazione dinamica sui sottoinsiemi costa meno
  // di un millisecondo e garantisce l'ottimo, dove il 2-opt poteva fermarsi a
  // un incrocio quasi giusto. Oltre la dozzina — oggi irraggiungibile — si
  // torna al vicino-più-prossimo raddrizzato, che scala senza esplodere.
  const EXACT_ORDER_LIMIT = 12;

  function shortestOrder(start, stops) {
    if (!stops.length) return [];
    if (stops.length > EXACT_ORDER_LIMIT) return approximateOrder(start, stops);
    const n = stops.length;
    // La matrice delle distanze si calcola una volta sola: l'haversine è la
    // parte costosa e la DP la interroga migliaia di volte.
    const fromStart = new Float64Array(n);
    const dist = new Float64Array(n * n);
    for (let i = 0; i < n; i += 1) {
      fromStart[i] = metersBetween(start, stops[i]);
      for (let j = i + 1; j < n; j += 1) {
        const d = metersBetween(stops[i], stops[j]);
        dist[i * n + j] = d;
        dist[j * n + i] = d;
      }
    }
    const size = 1 << n;
    const cost = new Float64Array(size * n).fill(Infinity);
    const parent = new Int8Array(size * n).fill(-1);
    for (let j = 0; j < n; j += 1) cost[(1 << j) * n + j] = fromStart[j];
    for (let mask = 1; mask < size; mask += 1) {
      for (let j = 0; j < n; j += 1) {
        if (!(mask & (1 << j))) continue;
        const base = cost[mask * n + j];
        if (base === Infinity) continue;
        for (let k = 0; k < n; k += 1) {
          if (mask & (1 << k)) continue;
          const nextIndex = (mask | (1 << k)) * n + k;
          const candidate = base + dist[j * n + k];
          if (candidate < cost[nextIndex]) {
            cost[nextIndex] = candidate;
            parent[nextIndex] = j;
          }
        }
      }
    }
    const full = size - 1;
    let last = 0;
    for (let j = 1; j < n; j += 1) {
      if (cost[full * n + j] < cost[full * n + last]) last = j;
    }
    const order = [];
    let mask = full;
    let at = last;
    while (at !== -1) {
      order.push(stops[at]);
      const prev = parent[mask * n + at];
      mask ^= 1 << at;
      at = prev;
    }
    return order.reverse();
  }

  // Il vecchio ordine approssimato: vicino più prossimo, poi 2-opt per
  // raddrizzare gli incroci. Serve solo sopra EXACT_ORDER_LIMIT.
  function approximateOrder(start, stops) {
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
    const inArea = visible.filter(function (point) {
      if (point.type === "stamp") return false;
      return insidePolygon(point.lat, point.lng, lassoPoints);
    });
    // Un posto dove si è già stati non va rimesso nel giro. Resta comunque
    // raggiungibile dal suo punto: nel popup c'è il collegamento a Google Maps,
    // e togliendo la spunta di visita rientra subito nella selezione ad area.
    // Stamps never join a walking lasso — they are collectibles, not visit stops.
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

  // Misura dichiarata, non stimata: su questo telefono si legge in console
  // quanto costa davvero l'ordine ottimo. Con 11 tappe Node misura ~2 ms;
  // solo se un telefono reale superasse i ~16 ms varrebbe la pena spezzare il
  // calcolo — un Web Worker per un tocco singolo non ripaga la complessità.
  function timedRoute(label, run) {
    const t0 = performance.now();
    const result = run();
    const elapsed = performance.now() - t0;
    if (window.console && console.debug) console.debug("[tabi-map] " + label + " in " + elapsed.toFixed(1) + " ms");
    return result;
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
      const ordered = timedRoute("giro ottimo da origine fissa (" + stops.length + " tappe)", function () { return shortestOrder(start, stops); });
      return { origin: start, ordered: ordered, trimmed: trimmed, meters: routeLength(start, ordered) };
    }
    // Senza posizione si prova ogni tappa come partenza e si tiene il giro più
    // corto: con dieci punti costa nulla e il risultato è molto migliore che
    // partire dalla prima capitata.
    return timedRoute("giro ottimo su ogni partenza (" + stops.length + " tappe)", function () {
      let best = null;
      stops.forEach(function (candidate) {
        const rest = stops.filter(function (point) { return point !== candidate; });
        const ordered = rest.length ? shortestOrder(candidate, rest) : [];
        const meters = ordered.length ? routeLength(candidate, ordered) : 0;
        if (!best || meters < best.meters) best = { origin: candidate, ordered: ordered, trimmed: trimmed, meters: meters };
      });
      return best;
    });
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

  // Questi agganci girano all'esecuzione dello script: un id rinominato in
  // index.html faceva TypeError qui e uccideva l'intera IIFE, mappa compresa.
  // Il pezzo mancante si segnala e il resto continua a funzionare.
  function listen(id, eventName, handler) {
    const node = document.getElementById(id);
    if (node) node.addEventListener(eventName, handler);
    else console.warn("[tabi-map] elemento mancante: #" + id);
  }

  listen("lassoButton", "click", function () {
    initMap();
    if (!map) return;
    if (!map.__lassoReady) { setupLasso(); map.__lassoReady = true; }
    toggleLasso();
  });
  listen("lassoUseGpsButton", "click", useGpsForRoute);

  listen("locateButton", "click", locateUser);
  listen("fitRouteButton", "click", fitRoute);
  listen("layersButton", "click", function () {
    const legend = document.getElementById("mapLegend");
    const button = document.getElementById("layersButton");
    if (!legend || !button) return;
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
  // Un percorso di un itinerario è un elenco di luoghi. Qui diventa il giro a
  // piedi più corto che li tocca tutti, con lo stesso motore del lazo: non c'è
  // motivo di averne due che fanno la stessa cosa.
  // Si legge dai dati, non dai marker: gli itinerari si preparano anche senza
  // aver mai aperto la mappa, e pointByGuideId esiste solo dopo initMap.
  function stopsForIds(guideIds) {
    const byGuideId = {};
    ((window.JAPAN_MAP_DATA && window.JAPAN_MAP_DATA.points) || []).forEach(function (point) {
      if (point.guideId && !byGuideId[point.guideId]) byGuideId[point.guideId] = point;
    });
    return (guideIds || [])
      .map(function (id) { return byGuideId[id]; })
      .filter(function (point) { return point && Number.isFinite(point.lat) && Number.isFinite(point.lng); });
  }

  function walkingRouteForIds(guideIds) {
    const stops = stopsForIds(guideIds);
    if (stops.length < 2) return null;
    const route = buildRoute(null, stops);
    if (!route) return null;
    return { url:routeUrl(route), trimmed:route.trimmed, meters:route.meters, stops:route.ordered.length + 1 };
  }

  // ---- Percorsi automatici -------------------------------------------------
  //
  // Un solo link di Google Maps porta origine, destinazione e nove tappe
  // intermedie: undici luoghi, non di più. Trenta luoghi salvati non stanno in
  // un giro solo, e tagliarli a caso vuol dire attraversare la città due volte.
  //
  // La divisione si fa una volta sola e con l'algoritmo che c'è già: si costruisce
  // una catena partendo da un'ancora e prendendo ogni volta il luogo più vicino
  // a quello di prima, poi la si taglia ogni undici. Una catena buona, tagliata,
  // dà gruppi che stanno vicini fra loro senza bisogno di inventare un
  // raggruppamento a parte. Ogni gruppo viene poi raddrizzato con il 2-opt, che
  // su undici punti costa niente, e riparte da dove finiva il gruppo prima: i
  // giri si susseguono invece di rimbalzare.
  const MAX_STOPS_PER_LINK = MAX_WAYPOINTS + 2;

  function centroidOf(points) {
    return {
      lat: points.reduce(function (sum, p) { return sum + p.lat; }, 0) / points.length,
      lng: points.reduce(function (sum, p) { return sum + p.lng; }, 0) / points.length
    };
  }

  // Senza una posizione da cui partire si comincia dal punto più lontano dal
  // centro: partendo dal mezzo la catena si aprirebbe a raggiera e i gruppi
  // verrebbero fuori sovrapposti.
  function farthestFrom(anchor, points) {
    return points.reduce(function (best, point) {
      return !best || metersBetween(anchor, point) > metersBetween(anchor, best) ? point : best;
    }, null);
  }

  function nearestChain(anchor, points) {
    const remaining = points.slice();
    const chain = [];
    let current = anchor;
    while (remaining.length) {
      let best = 0;
      for (let i = 1; i < remaining.length; i += 1) {
        if (metersBetween(current, remaining[i]) < metersBetween(current, remaining[best])) best = i;
      }
      current = remaining[best];
      chain.push(current);
      remaining.splice(best, 1);
    }
    return chain;
  }

  function autoRouteGroups(guideIds, start) {
    const points = stopsForIds(guideIds);
    if (!points.length) return [];
    const from = start && Number.isFinite(start.lat) && Number.isFinite(start.lng) ? start : null;
    const anchor = from || farthestFrom(centroidOf(points), points);
    const chain = nearestChain(anchor, points);
    const groups = [];
    let previous = anchor;
    for (let i = 0; i < chain.length; i += MAX_STOPS_PER_LINK) {
      const slice = chain.slice(i, i + MAX_STOPS_PER_LINK);
      const ordered = slice.length > 1 ? shortestOrder(previous, slice) : slice;
      groups.push({
        ids: ordered.map(function (point) { return point.guideId; }).filter(Boolean),
        stops: ordered.length,
        meters: ordered.length > 1 ? routeLength(ordered[0], ordered.slice(1)) : 0
      });
      previous = ordered[ordered.length - 1];
    }
    return groups;
  }

  window.TABI_MAP = {
    focusPoint:focusPoint, fitRoute:fitRoute, walkingRouteForIds:walkingRouteForIds,
    autoRouteGroups:autoRouteGroups, maxStopsPerLink:MAX_STOPS_PER_LINK, showLayers:showLayers
  };
})();
