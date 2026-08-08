(function () {
  "use strict";

  const data = window.JAPAN_DATA;
  const cityById = Object.fromEntries(data.cities.map(function (city) { return [city.id, city]; }));
  const itemById = Object.fromEntries([].concat(data.places, data.mapPlaces || [], data.experiences || [], data.foods, data.shopping, data.history).map(function (item) { return [item.id, item]; }));
  const mapGuideIds = new Set(((window.JAPAN_MAP_DATA && window.JAPAN_MAP_DATA.points) || []).map(function (point) { return point.guideId; }).filter(Boolean));
  const fallbackByType = {
    place: "assets/fallback-place.svg",
    experience: "assets/fallback-place.svg",
    food: "assets/fallback-food.svg",
    shop: "assets/fallback-shop.svg"
  };
  const state = {
    favorites: new Set(readJSON("tabi-favorites", [])),
    done: new Set(readJSON("tabi-done", [])),
    // Chi è *escluso* dalla mappa, non chi è incluso: l'insieme vuoto vale
    // "mostra tutto", e un luogo aggiunto in futuro compare da solo invece di
    // sparire in silenzio. La guida mostra tutte le possibilità; è l'utente a
    // decidere cosa nascondere.
    hidden: new Set(readJSON("tabi-hidden-v1", [])),
    listView: localStorage.getItem("tabi-list-view") === "list" ? "list" : "cards",
    imageCache: readJSON("tabi-image-cache-v4", {}),
    position: null,
    currentView: "",
    previousView: "",
    packed: new Set(readJSON("tabi-packing", [])),
    notes: readJSON("tabi-notes-v1", []),
    // Da quale menu (Scopri o Utilità) è stata aperta una schermata: serve al
    // tasto indietro per riportare al menu invece che alla pagina sottostante.
    menuOrigin: {},
    filters: {
      place: { search: "", city: "all", category: "all", nearby: false },
      experience: { search: "", city: "all", category: "all", setting: "all", nearby: false },
      food: { search: "", city: "all", category: "all", local: false },
      shop: { search: "", city: "all", category: "all" },
      history: { search: "", city: "all", category: "all" },
      phrase: { search: "", category: "all" }
    }
  };
  let imageObserver;
  let imageQueueActive = 0;
  let nextImageSearchAt = 0;
  const imageQueue = [];
  const imageRequests = new Map();
  const imageProviderCooldowns = {};
  let deferredInstallPrompt;
  let quickRateSync;
  let moneyRateRequested = false;
  let toastTimer;
  let ocrWorker;
  let ocrPreviewUrl;

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; }
  }

  function saveState() {
    localStorage.setItem("tabi-favorites", JSON.stringify(Array.from(state.favorites)));
    localStorage.setItem("tabi-done", JSON.stringify(Array.from(state.done)));
  }

  // La mappa si riallinea da sola: ricostruisce il livello dei luoghi invece di
  // reinizializzarsi, come già fa per le spunte di visita.
  function saveHidden() {
    localStorage.setItem("tabi-hidden-v1", JSON.stringify(Array.from(state.hidden)));
    window.dispatchEvent(new CustomEvent("tabi:selectionchange"));
  }

  // Solo i luoghi che hanno un punto sulla mappa possono essere nascosti: hotel,
  // Tabelog, WC, fontanelle e konbini hanno già i loro interruttori di livello.
  function isSelectable(item) {
    return mapGuideIds.has(item.id);
  }

  function isSelected(id) {
    return !state.hidden.has(id);
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char];
    });
  }

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function cityName(id) {
    return id === "all" ? "Tutto il Giappone" : (cityById[id] ? cityById[id].name : id);
  }

  function cityOptions(includeAllJapan) {
    const base = ['<option value="all">Tutte le città</option>'];
    if (includeAllJapan) base.push('<option value="all-japan">Tutto il Giappone</option>');
    return base.concat(data.cities.map(function (city) {
      return '<option value="' + city.id + '">' + escapeHTML(city.name) + '</option>';
    })).join("");
  }

  function categoryOptions(labels, label) {
    return '<option value="all">' + label + '</option>' + Object.entries(labels).map(function (entry) {
      return '<option value="' + entry[0] + '">' + escapeHTML(entry[1]) + '</option>';
    }).join("");
  }

  function setupFilters() {
    document.getElementById("placeCity").innerHTML = cityOptions(false);
    document.getElementById("experienceCity").innerHTML = cityOptions(false);
    document.getElementById("foodCity").innerHTML = cityOptions(true);
    document.getElementById("shopCity").innerHTML = cityOptions(true);
    document.getElementById("historyCity").innerHTML = cityOptions(false);
    document.getElementById("placeCategory").innerHTML = categoryOptions(data.labels.placeCategories, "Tutte le categorie");
    document.getElementById("experienceCategory").innerHTML = categoryOptions(data.labels.experienceCategories, "Tutte le esperienze");
    document.getElementById("experienceSetting").innerHTML = categoryOptions(data.labels.experienceSettings, "Ovunque");
    document.getElementById("foodCategory").innerHTML = categoryOptions(data.labels.foodCategories, "Tutte le portate");
    document.getElementById("shopCategory").innerHTML = categoryOptions(data.labels.shopCategories, "Tutte le categorie");
    document.getElementById("historyCategory").innerHTML = categoryOptions(data.labels.historyCategories, "Tutti gli argomenti");

    bindFilter("placeSearch", "place", "search", "input");
    bindFilter("placeCity", "place", "city", "change");
    bindFilter("placeCategory", "place", "category", "change");
    bindFilter("experienceSearch", "experience", "search", "input");
    bindFilter("experienceCity", "experience", "city", "change");
    bindFilter("experienceCategory", "experience", "category", "change");
    bindFilter("experienceSetting", "experience", "setting", "change");
    bindFilter("foodSearch", "food", "search", "input");
    bindFilter("foodCity", "food", "city", "change");
    bindFilter("foodCategory", "food", "category", "change");
    bindFilter("shopSearch", "shop", "search", "input");
    bindFilter("shopCity", "shop", "city", "change");
    bindFilter("shopCategory", "shop", "category", "change");
    bindFilter("historySearch", "history", "search", "input");
    bindFilter("historyCity", "history", "city", "change");
    bindFilter("historyCategory", "history", "category", "change");
    document.getElementById("foodLocal").addEventListener("change", function (event) {
      state.filters.food.local = event.target.checked;
      renderFoods();
      updateFilterToggle("food");
    });
    ["place", "experience", "food", "shop", "history"].forEach(updateFilterToggle);
  }

  function bindFilter(elementId, group, field, eventName) {
    document.getElementById(elementId).addEventListener(eventName, function (event) {
      state.filters[group][field] = event.target.value;
      renderGroup(group);
      updateFilterToggle(group);
    });
  }

  function updateFilterToggle(group) {
    const filters = state.filters[group];
    const count = (filters.city !== "all" ? 1 : 0) + (filters.category !== "all" ? 1 : 0)
      + (filters.setting && filters.setting !== "all" ? 1 : 0) + (filters.local ? 1 : 0) + (filters.nearby ? 1 : 0);
    const button = document.querySelector('[data-filter-toggle="' + group + '"]');
    if (!button) return;
    button.querySelector("span").textContent = count;
    button.classList.toggle("has-active", count > 0);
  }

  function resetFilters(group) {
    const filters = state.filters[group];
    filters.city = "all";
    filters.category = "all";
    if (Object.prototype.hasOwnProperty.call(filters, "local")) filters.local = false;
    if (Object.prototype.hasOwnProperty.call(filters, "nearby")) {
      filters.nearby = false;
      const nearby = document.querySelector('[data-nearby="' + group + '"]');
      if (nearby) nearby.checked = false;
    }
    const ids = {
      place: ["placeCity", "placeCategory"],
      experience: ["experienceCity", "experienceCategory", "experienceSetting"],
      food: ["foodCity", "foodCategory"],
      shop: ["shopCity", "shopCategory"],
      history: ["historyCity", "historyCategory"]
    };
    ids[group].forEach(function (id) { document.getElementById(id).value = "all"; });
    if (group === "food") document.getElementById("foodLocal").checked = false;
    renderGroup(group);
    updateFilterToggle(group);
  }

  // Il testo delle guide generate è lungo: normalizzarlo a ogni tasto premuto
  // per ~650 schede si sente su un telefono, quindi si calcola una volta sola.
  const haystackCache = new Map();

  function itemHaystack(item) {
    let value = haystackCache.get(item.id);
    if (value === undefined) {
      const guideText = (item.guideSections || []).map(function (section) { return section.title + " " + section.body; }).join(" ");
      value = normalize([item.name, item.jp, item.description, item.longDescription, item.context, item.area, item.where, item.title, item.explanation, item.anecdote, (item.aliases || []).join(" "), guideText, cityName(item.city)].join(" "));
      haystackCache.set(item.id, value);
    }
    return value;
  }

  function matches(item, filters) {
    const haystack = itemHaystack(item);
    const cityMatch = filters.city === "all"
      || (filters.city === "all-japan" && item.city === "all")
      || item.city === filters.city
      || (["shop", "food"].includes(item.type) && item.city === "all" && filters.city !== "all-japan");
    return (!filters.search || haystack.includes(normalize(filters.search)))
      && cityMatch
      && (filters.category === "all" || item.category === filters.category)
      && (!filters.setting || filters.setting === "all" || item.setting === filters.setting || item.setting === "misto")
      && (!filters.local || item.local);
  }

  function cardImage(item) {
    return '<div class="card-media">'
      + '<div class="image-shimmer"></div>'
      + '<img class="lazy-remote-image" src="' + fallbackByType[item.type] + '" data-image-id="' + escapeHTML(item.id) + '" data-type="' + item.type + '" alt="' + escapeHTML(item.name) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
      + '<span class="media-badge">' + escapeHTML(cityName(item.city)) + '</span>'
      + '</div>';
  }

  function actionButtons(item) {
    const favorite = state.favorites.has(item.id);
    return '<div class="card-actions">' + selectionToggle(item)
      + '<button class="icon-button favorite-button ' + (favorite ? "is-active" : "") + '" type="button" data-action="favorite" data-id="' + item.id + '" aria-label="' + (favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti") + '">' + (favorite ? "♥" : "♡") + '</button></div>';
  }

  // Il quadratino non è un preferito: dice soltanto se il luogo sta sulla mappa.
  // Tenerlo distinto dal cuore e dalla spunta di visita evita di confondere
  // "non mi interessa" con "ci sono già stato".
  function selectionToggle(item) {
    if (!isSelectable(item)) return "";
    const on = isSelected(item.id);
    return '<button class="select-toggle' + (on ? " is-on" : "") + '" type="button" role="switch" aria-checked="' + on + '"'
      + ' data-action="select" data-id="' + item.id + '"'
      + ' aria-label="' + escapeHTML(item.name) + (on ? ": togli dalla mappa" : ": rimetti sulla mappa") + '">'
      + '<span aria-hidden="true">' + (on ? "✓" : "") + '</span></button>';
  }

  // Vista compatta: solo il nome e il quadratino. Serve a scegliere in fretta
  // cosa portarsi sulla mappa, non a leggere.
  function compactRow(item) {
    const done = state.done.has(item.id);
    // Chi non ha un punto sulla mappa non ha il quadratino, ma tiene il suo
    // posto: una colonna che salta rende l'elenco illeggibile.
    return '<article class="compact-row' + (done ? " is-done" : "") + '" data-card-id="' + item.id + '">'
      + (isSelectable(item) ? selectionToggle(item) : '<span class="select-spacer" aria-hidden="true"></span>')
      + '<button class="compact-main" type="button" data-action="details" data-id="' + item.id + '">'
      + '<b>' + escapeHTML(item.name) + (done ? ' <span class="compact-done" aria-label="già visitato">✓</span>' : '') + '</b>'
      + '<small>' + escapeHTML(cityName(item.city)) + ' · ' + escapeHTML(item.jp || "") + '</small>'
      + '</button></article>';
  }

  function completionLabels(item) {
    if (item.type === "place") return ["Visitato", "Segna visitato", "Segnato come visitato"];
    if (item.type === "experience") return ["Fatta", "Segna fatta", "Esperienza segnata come fatta"];
    if (item.type === "food") return ["Provato", "Segna provato", "Segnato come provato"];
    if (item.type === "history") return ["Letta", "Segna letta", "Storia segnata come letta"];
    return ["Comprato", "Segna comprato", "Segnato come comprato"];
  }

  function typeLabel(item) {
    return { place:"Luogo", experience:"Esperienza", food:"Cibo", shop:"Acquisto", history:"Storia" }[item.type] || item.type;
  }

  function footer(item) {
    const done = state.done.has(item.id);
    const labels = completionLabels(item);
    const maps = ["place", "experience"].includes(item.type) ? '<a href="' + mapsUrl(item) + '" target="_blank" rel="noopener">Maps ↗</a>' : '';
    // Se il luogo non sta sulla mappa il collegamento resta nel DOM ma sparisce:
    // così torna da solo quando lo si riseleziona, senza ricostruire la scheda,
    // e nel frattempo non offre un link che non troverebbe niente.
    const ownMap = mapGuideIds.has(item.id)
      ? '<a class="own-map-link' + (isSelected(item.id) ? "" : " is-off") + '" href="' + ownMapUrl(item) + '" data-map-focus="' + item.id + '">Mappa Tabi ⌖</a>'
      : '';
    return '<div class="card-footer">'
      + '<button class="done-button ' + (done ? "is-done" : "") + '" type="button" data-action="done" data-id="' + item.id + '">' + (done ? "✓ " + labels[0] : labels[1]) + '</button>'
      + ownMap + maps
      + '<button type="button" data-action="details" data-id="' + item.id + '">Dettagli ↗</button>'
      + '</div>';
  }

  // Ogni parola giapponese usata nella scheda viene spiegata in fondo alla
  // scheda stessa: chi legge non deve già sapere cosa sia un honden o il koji.
  function glossaryHTML(item) {
    const glossary = data.glossary || {};
    const aliases = data.glossaryAliases || {};
    const haystack = normalize([
      item.longDescription, item.description, item.explanation, item.anecdote, item.context, item.where,
      (item.guideSections || []).map(function (section) { return section.body; }).join(" ")
    ].join(" "));
    const found = [];
    const seen = new Set();
    Object.keys(glossary).concat(Object.keys(aliases)).forEach(function (word) {
      const key = aliases[word] || word;
      if (seen.has(key) || !glossary[key]) return;
      const pattern = new RegExp("(^|[^a-z])" + normalize(word).replace(/[-]/g, "[- ]?") + "([^a-z]|$)");
      if (!pattern.test(haystack)) return;
      seen.add(key);
      found.push(key);
    });
    if (!found.length) return "";
    return '<section class="detail-glossary"><p class="eyebrow">Senza dare niente per scontato</p><h3>Le parole di questa scheda</h3><dl>'
      + found.slice(0, 8).map(function (key) {
        return '<div><dt>' + escapeHTML(key) + '</dt><dd>' + escapeHTML(glossary[key]) + '</dd></div>';
      }).join("") + '</dl></section>';
  }

  // Link alle piattaforme di prenotazione. Nessun prezzo e nessuna
  // disponibilità vengono mostrati qui: senza un accordo da partner sarebbero
  // dati inventati. Si apre la loro ricerca già filtrata e si legge da loro.
  function bookingHTML(item) {
    if (!["experience", "place"].includes(item.type)) return "";
    const query = item.name + " " + cityName(item.city);
    const channels = [
      {
        name: "GetYourGuide",
        note: "Visite guidate, biglietti salta-fila e attività",
        url: "https://www.getyourguide.it/s/?q=" + encodeURIComponent(query) + "&partner_id="
      },
      {
        name: "Klook",
        note: "Spesso più forte su Asia, trasporti e pass",
        url: "https://www.klook.com/it/search/?query=" + encodeURIComponent(query)
      }
    ];
    if (item.sourceUrl) {
      channels.push({ name: item.sourceTitle || "Sito ufficiale", note: "Orari, chiusure e prezzi reali", url: item.sourceUrl });
    }
    return '<section class="detail-booking"><p class="eyebrow">Se vuoi prenotare</p><h3>Dove si compra il biglietto</h3>'
      + '<div>' + channels.map(function (channel) {
        return '<a href="' + escapeHTML(channel.url.replace(/&partner_id=$/, "")) + '" target="_blank" rel="noopener nofollow">'
          + '<strong>' + escapeHTML(channel.name) + '</strong><span>' + escapeHTML(channel.note) + ' ↗</span></a>';
      }).join("") + '</div>'
      + '<p class="helper-note">Prezzi e disponibilità si leggono sulle loro pagine: qui non ne teniamo copia, perché cambiano di continuo. Confronta sempre con il sito ufficiale del luogo, che spesso costa meno.</p></section>';
  }

  function mapsUrl(item) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.name + " " + cityName(item.city) + " Japan");
  }

  function ownMapUrl(item) {
    const url = new URL(window.location.href);
    url.searchParams.set("point", item.id);
    url.hash = "places";
    return url.pathname + url.search + url.hash;
  }

  function placeCard(item) {
    return '<article class="content-card' + (isSelectable(item) && !isSelected(item.id) ? " is-off-map" : "") + '" data-card-id="' + item.id + '">'
      + actionButtons(item) + cardImage(item)
      + '<div class="card-body"><div class="card-kicker"><span>' + escapeHTML(data.labels.placeCategories[item.category]) + escapeHTML(distanceLabel(item)) + '</span><span>' + escapeHTML(item.duration) + '</span></div>'
      + '<h3>' + escapeHTML(item.name) + '<span class="jp-name">' + escapeHTML(item.jp) + '</span></h3>'
      + '<p class="card-description">' + escapeHTML(item.description) + '</p>'
      + '<div class="tag-row"><span class="tag">' + escapeHTML(item.area) + '</span><span class="tag">' + escapeHTML(item.tip) + '</span></div>'
      + footer(item) + '</div></article>';
  }

  function foodCard(item) {
    return '<article class="content-card" data-card-id="' + item.id + '">' + actionButtons(item) + cardImage(item)
      + '<div class="card-body"><div class="card-kicker"><span>' + escapeHTML(data.labels.foodCategories[item.category]) + '</span><span class="rating">★ ' + item.rating.toFixed(1) + '</span></div>'
      + '<h3>' + escapeHTML(item.name) + '<span class="jp-name">' + escapeHTML(item.jp) + '</span></h3>'
      + '<p class="card-description">' + escapeHTML(item.description) + '</p>'
      + '<div class="tag-row"><span class="tag">' + escapeHTML(item.context) + '</span>' + (item.local ? '<span class="tag">Scoperta locale</span>' : '<span class="tag">Classico</span>') + '</div>'
      + footer(item) + '</div></article>';
  }

  function experienceCard(item) {
    return '<article class="content-card experience-card' + (isSelectable(item) && !isSelected(item.id) ? " is-off-map" : "") + '" data-card-id="' + item.id + '">'
      + actionButtons(item) + cardImage(item)
      + '<div class="card-body"><div class="card-kicker"><span>' + escapeHTML(data.labels.experienceCategories[item.category]) + escapeHTML(distanceLabel(item)) + '</span><span>' + escapeHTML(item.duration) + '</span></div>'
      + '<h3>' + escapeHTML(item.name) + '<span class="jp-name">' + escapeHTML(item.jp) + '</span></h3>'
      + '<p class="card-description">' + escapeHTML(item.description) + '</p>'
      + '<div class="tag-row"><span class="tag">' + escapeHTML(item.area) + '</span><span class="tag">' + escapeHTML(item.booking || item.tip) + '</span></div>'
      + footer(item) + '</div></article>';
  }

  function shopCard(item) {
    return '<article class="content-card" data-card-id="' + item.id + '">' + actionButtons(item) + cardImage(item)
      + '<div class="card-body"><div class="card-kicker"><span>' + escapeHTML(data.labels.shopCategories[item.category]) + '</span><span>' + escapeHTML(item.price) + '</span></div>'
      + '<h3>' + escapeHTML(item.name) + '<span class="jp-name">' + escapeHTML(item.jp) + '</span></h3>'
      + '<p class="card-description">' + escapeHTML(item.description) + '</p>'
      + '<div class="tag-row"><span class="tag">' + escapeHTML(item.where) + '</span></div>'
      + footer(item) + '</div></article>';
  }

  function historyCard(item) {
    return '<article class="history-card" data-card-id="' + item.id + '" data-kanji="' + escapeHTML(item.kanji) + '">'
      + actionButtons(item) + '<div><div class="card-kicker"><span>' + escapeHTML(cityName(item.city)) + '</span><span>' + escapeHTML(data.labels.historyCategories[item.category]) + '</span></div>'
      + '<h2>' + escapeHTML(item.title) + '</h2><p>' + escapeHTML(item.explanation) + '</p></div>'
      + '<div><p class="anecdote"><strong>Da ricordare:</strong> ' + escapeHTML(item.anecdote) + '</p>'
      + footer(item) + '</div></article>';
  }

  // Schede o elenco: stessi dati, due densità. L'elenco serve a decidere in
  // fretta cosa portarsi sulla mappa; le schede a capire cosa si sta scegliendo.
  function listRenderer(cardRenderer) {
    return state.listView === "list" ? compactRow : cardRenderer;
  }

  function renderPlaces() {
    const items = [].concat(data.places, data.mapPlaces || []).filter(function (item) { return matches(item, state.filters.place); });
    document.getElementById("placeGrid").classList.toggle("is-compact", state.listView === "list");
    renderCards("placeGrid", "placeMeta", "placeEmpty", state.filters.place.nearby ? sortByDistance(items) : items, listRenderer(placeCard), "luoghi");
    renderSelectionBar();
  }

  function renderFoods() {
    const items = data.foods.filter(function (item) { return matches(item, state.filters.food); });
    renderCards("foodGrid", "foodMeta", "foodEmpty", items, foodCard, "specialità");
  }

  function renderExperiences() {
    const items = (data.experiences || []).filter(function (item) { return matches(item, state.filters.experience); });
    document.getElementById("experienceGrid").classList.toggle("is-compact", state.listView === "list");
    renderCards("experienceGrid", "experienceMeta", "experienceEmpty", state.filters.experience.nearby ? sortByDistance(items) : items, listRenderer(experienceCard), "esperienze");
    renderSelectionBar();
  }

  function renderShopping() {
    const items = data.shopping.filter(function (item) { return matches(item, state.filters.shop); });
    renderCards("shopGrid", "shopMeta", "shopEmpty", items, shopCard, "acquisti");
    document.querySelectorAll("#shopCategoryRail .category-chip").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.category === state.filters.shop.category);
    });
  }

  function renderHistory() {
    const items = data.history.filter(function (item) { return matches(item, state.filters.history); });
    const grid = document.getElementById("historyGrid");
    grid.innerHTML = items.map(historyCard).join("");
    document.getElementById("historyMeta").textContent = items.length + " storie e contesti";
    document.getElementById("historyEmpty").hidden = items.length !== 0;
  }

  function phrasebookPhrases() {
    const allowed = new Set(data.phrasebookCategories || Object.keys(data.phraseCategories));
    return data.phrases.filter(function (item) { return allowed.has(item.category); });
  }

  function renderPhrases() {
    const filters = state.filters.phrase;
    const query = normalize(filters.search);
    const items = phrasebookPhrases().filter(function (item) {
      const haystack = normalize([item.jp, item.romaji, item.italianReading, item.meaning, item.note].join(" "));
      return (!query || haystack.includes(query)) && (filters.category === "all" || item.category === filters.category);
    });
    document.getElementById("phraseGrid").innerHTML = items.map(phraseCardHTML).join("");
    document.getElementById("phraseMeta").textContent = items.length + " frasi utili";
    document.querySelectorAll("#phraseCategoryRail [data-phrase-category]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.phraseCategory === filters.category);
    });
  }

  // getVoices() è vuoto al primo giro e si popola dopo qualche centinaio di ms:
  // senza aspettarlo non si può scegliere una voce giapponese, e senza voce
  // esplicita speak() resta appeso senza emettere né start né error.
  let japaneseVoice = null;
  let voicesReady = false;

  // Su Android la lingua è scritta in modi diversi da motore a motore: Google
  // dice "ja-JP", altri "ja_JP" o "jpn-JPN". Un solo formato non basta.
  function isJapaneseVoice(voice) {
    const lang = String(voice.lang || "").toLowerCase().replace(/_/g, "-");
    return lang === "ja" || lang.indexOf("ja-") === 0 || lang.indexOf("jpn") === 0
      || /japanese|日本/i.test(voice.name || "");
  }

  function pickJapaneseVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    voicesReady = true;
    japaneseVoice = voices.find(isJapaneseVoice) || null;
    return japaneseVoice;
  }

  function setupSpeech() {
    if (!("speechSynthesis" in window)) return;
    pickJapaneseVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickJapaneseVoice);
    // Android popola l'elenco molto dopo il caricamento e non sempre emette
    // voiceschanged: senza qualche tentativo la prima frase toccata direbbe
    // "manca la voce giapponese" anche quando la voce c'è eccome.
    let attempts = 0;
    const timer = window.setInterval(function () {
      attempts += 1;
      if (pickJapaneseVoice() || attempts >= 12) window.clearInterval(timer);
    }, 400);
  }

  function speakJapanese(text, meaning) {
    if (!("speechSynthesis" in window)) {
      openSpeechHelp(text, meaning, "Questo browser non sa leggere ad alta voce.");
      return;
    }
    if (!voicesReady) pickJapaneseVoice();
    window.speechSynthesis.cancel();
    // cancel() e speak() nello stesso tick si annullano a vicenda su Chrome e Safari.
    window.setTimeout(function () {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.82;
      if (japaneseVoice) utterance.voice = japaneseVoice;
      let started = false;
      let watchdog = 0;
      utterance.onstart = function () {
        started = true;
        window.clearTimeout(watchdog);
      };
      utterance.onerror = function (event) {
        window.clearTimeout(watchdog);
        if (started || event.error === "interrupted" || event.error === "canceled") return;
        openSpeechHelp(text, meaning, "Il telefono non è riuscito a pronunciare la frase.");
      };
      // Se i dati vocali giapponesi non sono installati, quasi nessun motore
      // Android segnala un errore: semplicemente non parte niente. Un cronometro
      // è l'unico modo per accorgersene e spiegare come rimediare.
      watchdog = window.setTimeout(function () {
        if (started) return;
        window.speechSynthesis.cancel();
        openSpeechHelp(text, meaning, japaneseVoice
          ? "La voce giapponese è installata ma non ha risposto: spesso basta togliere il silenzioso e ritentare."
          : "Su questo telefono non risulta installata nessuna voce giapponese.");
      }, 1800);
      window.speechSynthesis.speak(utterance);
    }, 60);
  }

  function openSpeechHelp(text, meaning, reason) {
    const dialog = document.getElementById("speechDialog");
    if (!dialog) {
      showToast(reason);
      return;
    }
    document.getElementById("speechReason").textContent = reason;
    const link = document.getElementById("speechFallbackLink");
    link.href = "https://translate.google.com/?sl=ja&tl=it&text=" + encodeURIComponent(text) + "&op=translate";
    link.querySelector("span").textContent = meaning
      ? "Ascolta «" + meaning + "» su Google Traduttore ↗"
      : "Ascolta la frase su Google Traduttore ↗";
    if (!dialog.open) dialog.showModal();
  }

  // Divisione in more, come Duolingo mostra i kana: la ん isolata, la pausa
  // della doppia consonante e le vocali lunghe contano ciascuna una battuta.
  const MORA_MACRONS = { "ā":"aa", "ī":"ii", "ū":"uu", "ē":"ee", "ō":"ou" };
  const MORA_CLUSTERS = ["tch", "cch", "ch", "sh", "ts", "ky", "gy", "ny", "hy", "by", "py", "my", "ry", "dz"];
  const MORA_VOWELS = "aeiou";

  function moras(word) {
    const text = word.toLowerCase().replace(/[āīūēō]/g, function (char) { return MORA_MACRONS[char] || char; });
    const out = [];
    let index = 0;
    while (index < text.length) {
      const rest = text.slice(index);
      if (/^([kstpgzdbhfjmr])\1/.test(rest) || /^tch/.test(rest) || /^cch/.test(rest)) { out.push(rest[0]); index += 1; continue; }
      if (rest[0] === "n" && !/^n[aeiouy]/.test(rest)) { out.push("n"); index += 1; continue; }
      const cluster = MORA_CLUSTERS.find(function (candidate) {
        return rest.startsWith(candidate) && MORA_VOWELS.includes(rest[candidate.length] || "");
      });
      if (cluster) { out.push(cluster + rest[cluster.length]); index += cluster.length + 1; continue; }
      if (MORA_VOWELS.includes(rest[0])) { out.push(rest[0]); index += 1; continue; }
      if (MORA_VOWELS.includes(rest[1] || "")) { out.push(rest.slice(0, 2)); index += 2; continue; }
      out.push(rest[0]); index += 1;
    }
    return out;
  }

  function syllableHTML(romaji) {
    return String(romaji || "").split(/\s+/).filter(Boolean).map(function (word) {
      if (word === "/") return '<span class="mora-break">/</span>';
      return '<span class="mora-word">' + moras(word).map(function (mora) {
        return '<i>' + escapeHTML(mora) + '</i>';
      }).join("") + '</span>';
    }).join("");
  }

  function phraseCardHTML(item) {
    return '<article class="phrase-card"><div class="phrase-jp"><span>' + escapeHTML(item.jp) + '</span><button type="button" data-speak="' + item.id + '" aria-label="Ascolta la pronuncia di ' + escapeHTML(item.meaning) + '">♪</button></div>'
      + '<h2>' + escapeHTML(item.meaning) + '</h2>'
      + '<dl><div class="phrase-moras"><dt>Sillabe</dt><dd>' + syllableHTML(item.romaji) + '</dd></div>'
      + '<div><dt>Come leggerla</dt><dd>' + escapeHTML(item.italianReading) + '</dd></div>'
      + '<div><dt>Romaji</dt><dd>' + escapeHTML(item.romaji) + '</dd></div></dl>'
      + '<p>' + escapeHTML(item.note) + '</p></article>';
  }

  function setupPhrasebook() {
    const entries = [["all", "Tutto"]].concat((data.phrasebookCategories || Object.keys(data.phraseCategories)).map(function (key) {
      return [key, data.phraseCategories[key]];
    }));
    document.getElementById("phraseCategoryRail").innerHTML = entries.map(function (entry) {
      return '<button class="category-chip ' + (entry[0] === "all" ? "is-active" : "") + '" type="button" data-phrase-category="' + entry[0] + '">' + escapeHTML(entry[1]) + '</button>';
    }).join("");
    document.getElementById("emergencyGrid").innerHTML = data.emergencyNumbers.map(function (item) {
      return '<a class="emergency-card" href="' + item.href + '"><strong>' + escapeHTML(item.number) + '</strong><span>' + escapeHTML(item.title) + '</span><small>' + escapeHTML(item.detail) + '</small></a>';
    }).join("") + '<a class="emergency-source" href="https://www.japan.travel/en/plan/emergencies/" target="_blank" rel="noopener">Fonte e assistenza ufficiale JNTO ↗</a>';
    document.getElementById("emergencyPhraseGrid").innerHTML = data.phrases.filter(function (item) {
      return item.category === "salute" || item.category === "emergenza";
    }).map(phraseCardHTML).join("");
    document.getElementById("phraseSearch").addEventListener("input", function (event) {
      state.filters.phrase.search = event.target.value;
      renderPhrases();
    });
  }

  function renderCards(gridId, metaId, emptyId, items, renderer, noun) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = items.map(renderer).join("");
    document.getElementById(metaId).textContent = items.length + " " + noun;
    document.getElementById(emptyId).hidden = items.length !== 0;
    observeImages(grid);
  }

  // La barra vive sia in Mappa sia in Esperienze: i due elenchi alimentano lo
  // stesso livello, quindi il conteggio è uno solo ed è sempre sul totale.
  function renderSelectionBar() {
    const total = mapGuideIds.size;
    const on = total - Array.from(state.hidden).filter(function (id) { return mapGuideIds.has(id); }).length;
    // Una mappa con dei buchi deve dire perché li ha.
    const counter = document.getElementById("mapSelectionCount");
    if (counter) counter.textContent = on === total ? "" : "Sulla mappa ci sono " + on + " luoghi di " + total + ": gli altri li hai nascosti.";
    document.querySelectorAll("[data-selection-bar]").forEach(function (bar) {
      bar.innerHTML = '<p class="selection-count"><b>' + on + '</b> luoghi di ' + total + ' sulla mappa</p>'
        + '<div class="selection-actions">'
        + '<button type="button" data-select-all' + (on === total ? " disabled" : "") + '>Seleziona tutto (' + total + ')</button>'
        + '<button type="button" data-select-none' + (on === 0 ? " disabled" : "") + '>Deseleziona tutto (' + total + ')</button>'
        + '</div>'
        + '<div class="view-switch" role="group" aria-label="Come mostrare l\'elenco">'
        + '<button type="button" data-list-view="cards" aria-pressed="' + (state.listView !== "list") + '">Schede</button>'
        + '<button type="button" data-list-view="list" aria-pressed="' + (state.listView === "list") + '">Elenco</button>'
        + '</div>';
    });
  }

  // Luoghi ed Esperienze alimentano lo stesso livello della mappa e mostrano la
  // stessa barra: se si cambia da una, l'altra non può restare indietro. Si
  // chiama solo dalle azioni in blocco, non a ogni singolo quadratino.
  function refreshSelectionViews() {
    renderPlaces();
    renderExperiences();
  }

  function toggleSelected(id) {
    if (state.hidden.has(id)) state.hidden.delete(id);
    else state.hidden.add(id);
    saveHidden();
    const on = isSelected(id);
    document.querySelectorAll('[data-card-id="' + id + '"]').forEach(function (card) {
      card.classList.toggle("is-off-map", !on);
      const toggle = card.querySelector(".select-toggle");
      if (!toggle) return;
      toggle.classList.toggle("is-on", on);
      toggle.setAttribute("aria-checked", String(on));
      toggle.setAttribute("aria-label", (itemById[id] ? itemById[id].name : "") + (on ? ": togli dalla mappa" : ": rimetti sulla mappa"));
      toggle.firstElementChild.textContent = on ? "✓" : "";
      const link = card.querySelector(".own-map-link");
      if (link) link.classList.toggle("is-off", !on);
    });
    renderSelectionBar();
  }

  // Cancellare 249 scelte per sbaglio è troppo facile: la si può annullare
  // finché il toast è a schermo.
  function setAllSelected(hide) {
    const previous = new Set(state.hidden);
    if (hide) mapGuideIds.forEach(function (id) { state.hidden.add(id); });
    else mapGuideIds.forEach(function (id) { state.hidden.delete(id); });
    saveHidden();
    refreshSelectionViews();
    showToast(hide ? "Nessun luogo sulla mappa" : "Tutti i luoghi sulla mappa", "Annulla", function () {
      state.hidden = previous;
      saveHidden();
      refreshSelectionViews();
    });
  }

  function setListView(mode) {
    state.listView = mode === "list" ? "list" : "cards";
    localStorage.setItem("tabi-list-view", state.listView);
    refreshSelectionViews();
  }

  function renderGroup(group) {
    if (group === "place") renderPlaces();
    if (group === "experience") renderExperiences();
    if (group === "food") renderFoods();
    if (group === "shop") renderShopping();
    if (group === "history") renderHistory();
  }

  function setupRoute() {
    document.getElementById("routeStrip").innerHTML = data.cities.map(function (city) {
      return '<button class="route-stop" type="button" data-city-route="' + city.id + '"><span class="stop-index">TAPPA ' + String(city.order).padStart(2, "0") + ' · ' + escapeHTML(city.visitType) + '</span><b>' + escapeHTML(city.name) + ' ' + escapeHTML(city.jp) + '</b><small>' + escapeHTML(city.summary) + '</small><em>' + escapeHTML(city.arrival) + '</em></button>';
    }).join("");
    document.getElementById("transferGrid").innerHTML = data.legs.map(function (leg, index) {
      return '<article class="transfer-card"><span>' + String(index + 1).padStart(2, "0") + '</span><div><b>' + escapeHTML(leg.from) + ' → ' + escapeHTML(leg.to) + '</b><small>' + escapeHTML(leg.mode) + ' · ' + escapeHTML(leg.note) + '</small></div></article>';
    }).join("");
    document.getElementById("stayGrid").innerHTML = data.lodging.map(function (stay) {
      const hotelMaps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(stay.name + " Japan");
      return '<article class="stay-card"><span>' + escapeHTML(cityName(stay.city)) + '</span><b>' + escapeHTML(stay.name) + '</b><small class="stay-area">' + escapeHTML(stay.area) + '</small><small>' + escapeHTML(stay.note) + '</small><a href="' + hotelMaps + '" target="_blank" rel="noopener">Apri in Google Maps ↗</a></article>';
    }).join("");
  }

  // Nessuna data nel repo: la tappa corrente la sceglie l'utente e resta sul
  // telefono. Basta a far diventare la home un "dove siamo adesso".
  function setupCurrentCity() {
    const select = document.getElementById("currentCity");
    select.innerHTML = '<option value="">Non ancora partiti</option>' + data.cities.map(function (city) {
      return '<option value="' + city.id + '">' + escapeHTML(city.name) + '</option>';
    }).join("");
    select.value = localStorage.getItem("tabi-current-city") || "";
    select.addEventListener("change", function () {
      if (select.value) localStorage.setItem("tabi-current-city", select.value);
      else localStorage.removeItem("tabi-current-city");
      renderCurrentCity();
    });
    renderCurrentCity();
  }

  // Posizione del sole con l'algoritmo solare standard: nessuna rete, nessuna
  // data nel repo, solo l'orologio del telefono e le coordinate della tappa.
  function sunTimes(date, lat, lng) {
    const rad = Math.PI / 180;
    const dayMs = 86400000;
    const J1970 = 2440588;
    const J2000 = 2451545;
    const toDays = date.valueOf() / dayMs - 0.5 + J1970 - J2000;
    const lw = rad * -lng;
    const phi = rad * lat;
    const cycle = Math.round(toDays - 0.0009 - lw / (2 * Math.PI));
    const approx = function (angle) { return 0.0009 + (angle + lw) / (2 * Math.PI) + cycle; };
    const meanAnomaly = rad * (357.5291 + 0.98560028 * approx(0));
    const eclipticLongitude = meanAnomaly
      + rad * (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) + 0.0003 * Math.sin(3 * meanAnomaly))
      + rad * 102.9372 + Math.PI;
    const obliquity = rad * 23.4397;
    const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
    const transit = function (ds) {
      return J2000 + ds + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * eclipticLongitude);
    };
    // -0.833° tiene conto della rifrazione atmosferica e del diametro del disco.
    const cosOmega = (Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(declination)) / (Math.cos(phi) * Math.cos(declination));
    if (cosOmega < -1 || cosOmega > 1) return null;
    const omega = Math.acos(cosOmega);
    const fromJulian = function (julian) { return new Date((julian + 0.5 - J1970) * dayMs); };
    return {
      sunset: fromJulian(transit(approx(omega))),
      sunrise: fromJulian(transit(approx(-omega)))
    };
  }

  function japanTime(date) {
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
  }

  function countdownLabel(target) {
    const minutes = Math.round((target.valueOf() - Date.now()) / 60000);
    if (minutes < -60) return "";
    if (minutes < 0) return "già passato";
    if (minutes < 60) return "tra " + minutes + " minuti";
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return "tra " + hours + (rest ? "h " + rest + "min" : hours === 1 ? " ora" : " ore");
  }

  // Meteo della tappa scelta. Fonte gratuita e senza chiave; l'ultimo dato
  // resta sul telefono, così anche senza rete si vede almeno com'era stamattina.
  const WEATHER_CODES = {
    0: ["Sereno", "☀"], 1: ["Poco nuvoloso", "🌤"], 2: ["Parzialmente nuvoloso", "⛅"], 3: ["Coperto", "☁"],
    45: ["Nebbia", "🌫"], 48: ["Nebbia gelata", "🌫"],
    51: ["Pioviggine leggera", "🌦"], 53: ["Pioviggine", "🌦"], 55: ["Pioviggine intensa", "🌦"],
    61: ["Pioggia debole", "🌧"], 63: ["Pioggia", "🌧"], 65: ["Pioggia forte", "🌧"],
    71: ["Neve debole", "🌨"], 73: ["Neve", "🌨"], 75: ["Neve forte", "🌨"],
    80: ["Rovesci", "🌦"], 81: ["Rovesci intensi", "🌧"], 82: ["Rovesci violenti", "⛈"],
    95: ["Temporale", "⛈"], 96: ["Temporale con grandine", "⛈"], 99: ["Temporale forte", "⛈"]
  };

  function weatherLabel(code) {
    return WEATHER_CODES[code] || ["Condizioni variabili", "🌡"];
  }

  async function fetchWeather(city) {
    const cached = readJSON("tabi-weather", {})[city.id];
    if (cached && Date.now() - cached.at < 60 * 60 * 1000) return cached;
    if (!navigator.onLine) return cached || null;
    try {
      const url = "https://api.open-meteo.com/v1/forecast?latitude=" + city.lat + "&longitude=" + city.lng
        + "&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
        + "&timezone=Asia%2FTokyo&forecast_days=1";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return cached || null;
      const payload = await response.json();
      const record = {
        at: Date.now(),
        now: Math.round(payload.current.temperature_2m),
        code: payload.daily.weather_code[0],
        max: Math.round(payload.daily.temperature_2m_max[0]),
        min: Math.round(payload.daily.temperature_2m_min[0]),
        rain: payload.daily.precipitation_probability_max[0]
      };
      const store = readJSON("tabi-weather", {});
      store[city.id] = record;
      localStorage.setItem("tabi-weather", JSON.stringify(store));
      return record;
    } catch (_) {
      return cached || null;
    }
  }

  function renderWeather(city) {
    const box = document.getElementById("nowWeather");
    if (!box) return;
    const forecast = "https://www.google.com/search?q=" + encodeURIComponent("meteo " + city.name + " Giappone");
    fetchWeather(city).then(function (weather) {
      if (!document.getElementById("nowWeather")) return;
      if (!weather) {
        box.innerHTML = '<a class="weather-card is-empty" href="' + forecast + '" target="_blank" rel="noopener">'
          + '<strong>Meteo non disponibile</strong><span>Serve la rete. Apri le previsioni complete ↗</span></a>';
        return;
      }
      const label = weatherLabel(weather.code);
      const stale = Date.now() - weather.at > 3 * 60 * 60 * 1000;
      box.innerHTML = '<a class="weather-card" href="' + forecast + '" target="_blank" rel="noopener">'
        + '<span class="weather-icon" aria-hidden="true">' + label[1] + '</span>'
        + '<span class="weather-body"><strong>' + weather.now + '°</strong>'
        + '<b>' + escapeHTML(label[0]) + '</b>'
        + '<small>Massima ' + weather.max + '° · minima ' + weather.min + '° · pioggia ' + weather.rain + '%'
        + (stale ? " · dato non recente, sei stato offline" : "") + '</small></span>'
        + '<span class="weather-link">Previsioni complete ↗</span></a>';
    });
  }

  function dayTipsHTML(city) {
    const tips = (data.dayTips || []).find(function (item) { return item.city === city.id; });
    if (!tips) return "";
    const sun = sunTimes(new Date(), city.lat, city.lng);
    const countdown = sun ? countdownLabel(sun.sunset) : "";
    const rotating = (data.alwaysTips || [])[new Date().getDate() % (data.alwaysTips || [1]).length] || "";
    return '<section class="day-tips" aria-labelledby="dayTipsTitle">'
      + '<div class="day-tips-head"><p class="eyebrow">Da ricordare oggi</p><h3 id="dayTipsTitle">A ' + escapeHTML(city.name) + ' conviene sapere che…</h3></div>'
      + '<ul class="day-tips-list">'
      + '<li><b>Andateci presto</b><span>' + escapeHTML(tips.early) + '</span></li>'
      + '<li><b>Da prenotare</b><span>' + escapeHTML(tips.book) + '</span></li>'
      + '<li><b>Prima che chiuda</b><span>' + escapeHTML(tips.evening) + '</span></li>'
      + '</ul>'
      + (sun
        ? '<div class="day-sun"><div><span class="eyebrow">Tramonto</span><strong>' + japanTime(sun.sunset) + '</strong>'
          + (countdown ? '<small>' + escapeHTML(countdown) + '</small>' : "") + '</div>'
          + '<div><b>' + escapeHTML(tips.sunsetSpot) + '</b><small>' + escapeHTML(tips.sunsetNote) + '</small></div></div>'
        : "")
      + (rotating ? '<p class="day-tips-always">' + escapeHTML(rotating) + '</p>' : "")
      + '<p class="helper-note">Orari e code sono tendenze, non garanzie: cambiano per stagione, giorno della settimana e festività.</p>'
      + '</section>';
  }

  function renderCurrentCity() {
    const body = document.getElementById("nowBody");
    const cityId = localStorage.getItem("tabi-current-city") || "";
    const city = cityById[cityId];
    if (!city) {
      const groups = data.packing || [];
      const total = groups.reduce(function (sum, group) { return sum + group.items.length; }, 0);
      const done = groups.reduce(function (sum, group) {
        return sum + group.items.filter(function (item) { return state.packed.has(item.id); }).length;
      }, 0);
      body.innerHTML = '<p class="now-empty">Scegli la tappa in cui vi trovate: qui compaiono il meteo di oggi e i promemoria della giornata.</p>'
        + '<div class="now-actions"><button type="button" data-go="packing">Valigia: ' + done + ' di ' + total + ' spuntati →</button></div>';
      return;
    }
    // Meteo e promemoria del giorno bastano: hotel, trasferimenti e conteggi
    // hanno già una sezione tutta loro poco più sotto e nei Progressi.
    body.innerHTML = '<div id="nowWeather" class="now-weather"></div>' + dayTipsHTML(city);
    renderWeather(city);
  }

  function setupCategoryRail() {
    const entries = [["all", "Tutto"]].concat(Object.entries(data.labels.shopCategories));
    document.getElementById("shopCategoryRail").innerHTML = entries.map(function (entry) {
      return '<button class="category-chip ' + (entry[0] === "all" ? "is-active" : "") + '" type="button" data-category="' + entry[0] + '">' + escapeHTML(entry[1]) + '</button>';
    }).join("");
  }

  function setupImages() {
    imageObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        imageObserver.unobserve(entry.target);
        enqueueImage(entry.target);
      });
    }, { rootMargin: "500px 0px" });
  }

  function observeImages(root) {
    root.querySelectorAll(".lazy-remote-image").forEach(function (image) {
      image.addEventListener("load", function () {
        image.classList.add("is-loaded");
        const shimmer = image.previousElementSibling;
        if (shimmer) shimmer.hidden = true;
      }, { once: true });
      image.addEventListener("error", function () {
        const item = itemById[image.dataset.imageId];
        if (!item) return;
        const failed = new Set((image.dataset.failedProviders || "").split(",").filter(Boolean));
        failed.add(image.dataset.provider || "direct");
        image.dataset.failedProviders = Array.from(failed).join(",");
        delete state.imageCache[item.id];
        const providerLimit = 4 + (item.imageUrl ? 1 : 0);
        if (failed.size >= providerLimit) return applyImageResult(image, null);
        resolveImage(item, { skipDirect:true, force:true, excludedProviders:Array.from(failed) }).then(function (result) {
          applyImageResult(image, result);
        });
      });
      imageObserver.observe(image);
    });
  }

  function enqueueImage(image) {
    if (image.dataset.queued === "true") return;
    image.dataset.queued = "true";
    imageQueue.push(image);
    drainImageQueue();
  }

  function drainImageQueue() {
    while (imageQueueActive < 2 && imageQueue.length) {
      const image = imageQueue.shift();
      if (!image.isConnected) continue;
      imageQueueActive += 1;
      resolveImage(itemById[image.dataset.imageId]).then(function (result) {
        if (image.isConnected) applyImageResult(image, result);
      }).finally(function () {
        imageQueueActive -= 1;
        drainImageQueue();
      });
    }
  }

  function applyImageResult(image, result) {
    if (!image || !image.isConnected) return;
    // Nessuna foto attendibile: il riquadro sparisce del tutto invece di
    // mostrare un segnaposto o, peggio, una foto a caso. Resta la descrizione.
    if (!result || !result.url) {
      const media = image.closest(".card-media");
      if (media) media.remove();
      return;
    }
    image.dataset.resolved = result.url;
    image.dataset.credit = result.credit || "";
    image.dataset.sourceUrl = result.sourceUrl || "";
    image.dataset.provider = result.provider || "";
    if (image.src !== new URL(image.dataset.resolved, document.baseURI).href) image.src = image.dataset.resolved;
  }

  function imageQueries(item) {
    if (!item) return [];
    const typeHint = item.type === "food" ? "Japanese food" : item.type === "shop" ? "Japan product" : "Japan";
    return [].concat(item.imageQuery || [], item.name || [], item.imageQueries || [], [
      item.jp + " " + item.name,
      item.name + " " + cityName(item.city) + " Japan",
      item.name + " " + typeHint
    ]).map(function (query) { return String(query || "").trim(); }).filter(function (query, index, values) {
      return query && values.indexOf(query) === index;
    }).slice(0, 3);
  }

  function cleanCredit(value) {
    const node = document.createElement("div");
    node.innerHTML = String(value || "");
    return (node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function usableImage(info, title) {
    if (!info || !(info.thumburl || info.url)) return false;
    if (info.mime && !/^image\/(jpeg|png|webp)$/i.test(info.mime)) return false;
    if (info.width && info.height && (info.width < 360 || info.height < 240)) return false;
    return !/(^|\b)(logo|location map|map of|flag of|diagram|pictogram|icon|chart|graph|signboard|coat of arms|floor plan)(\b|$)/i.test(title || "");
  }

  // Commons e Openverse restituiscono comunque qualcosa: senza un controllo di
  // pertinenza il primo risultato "utilizzabile" finisce sulla scheda anche
  // quando non c'entra nulla. Meglio nessuna foto che una foto sbagliata.
  const IGNORED_QUERY_WORDS = new Set(["japan", "japanese", "food", "dish", "product", "style", "traditional"]);

  function significantWords(text) {
    return normalize(text).replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter(function (word) {
      return word.length >= 3 && !IGNORED_QUERY_WORDS.has(word);
    });
  }

  // Il titolo che somiglia alla ricerca non basta: "Takoyaki festival, Osaka"
  // somiglia moltissimo e mostra una folla. Per cibi e acquisti la fonte deve
  // anche dichiarare che soggetto è — categorie di Commons, tag di Openverse,
  // descrizione di Wikidata — e senza quella dichiarazione la foto si scarta.
  const SUBJECT_HINTS = {
    food: /(\b(food|foods|cuisine|dish|dishes|cooking|cooked|meal|meals|snack|snacks|dessert|desserts|sweets|confection|candy|noodle|noodles|ramen|udon|soba|somen|sushi|sashimi|rice|donburi|curry|soup|stew|hotpot|nabe|grilled|fried|roasted|steamed|bread|pastry|cake|pancake|dumpling|dumplings|skewer|skewers|tofu|miso|seafood|fish|meat|beef|pork|chicken|egg|vegetable|vegetables|fruit|tea|matcha|sake|beer|whisky|drink|drinks|beverage|beverages|bento|breakfast|lunch|dinner|restaurant dish|street food)\b)|料理|食品|食べ物|菓子|和菓子|丼|麺|寿司|鮨|そば|うどん|ラーメン|飲料|茶/i,
    shop: /(\b(craft|crafts|handicraft|handicrafts|pottery|ceramic|ceramics|porcelain|stoneware|lacquer|lacquerware|textile|textiles|fabric|dyeing|kimono|yukata|obi|paper|washi|knife|knives|cutlery|tableware|chopsticks|toy|toys|figure|figurine|doll|dolls|fan|umbrella|incense|cosmetic|cosmetics|skincare|stationery|souvenir|souvenirs|goods|product|products|print|prints|woodblock|painting|calligraphy|jewellery|jewelry|lantern|basket|broom|comb|tea|matcha|sake|snack|sweets|confection)\b)|工芸|陶器|磁器|漆器|織物|染色|着物|和紙|人形|扇子|香|菓子|茶/i
  };

  function subjectEvidence(item, texts) {
    const hints = item && SUBJECT_HINTS[item.type];
    // Luoghi ed esperienze hanno nomi propri: lì è il nome a fare da prova.
    if (!hints) return true;
    const joined = texts.filter(Boolean).join(" · ");
    if (hints.test(joined)) return true;
    // Il nome giapponese esatto nel titolo o nelle categorie è una prova
    // altrettanto buona, e copre i piatti che nessun vocabolario contiene.
    return Boolean(item.jp && item.jp.length > 1 && joined.indexOf(item.jp) !== -1);
  }

  // Un piatto va fotografato, non evocato: vetrine, insegne, feste e locali
  // portano il nome giusto e mostrano tutt'altro. La foto della "Midarashi
  // Dango Shop" è una strada di Takayama, non un dango.
  const SUBJECT_DECOYS = /\b(shop|shops|shopping|mall|arcade|plaza|store|stores|storefront|restaurant|ristorante|cafe|café|coffeehouse|izakaya|bar|pub|brewery|factory|building|buildings|exterior|facade|interior of|street|streets|road|alley|station|festival|matsuri|parade|procession|crowd|sign|signboard|signage|banner|poster|billboard|museum|hotel|shrine|temple|castle|park|garden|portrait|logo|map|menu board)\b/i;

  // Le categorie di Commons dicono cosa ritrae davvero il file: quando parlano
  // di insegne, vetrine o edifici, la foto è del locale e non del piatto.
  const CATEGORY_DECOYS = /\b(signs|signboards|signage|storefronts|shop fronts|shopfronts|buildings|architecture|streets|roads|exteriors|facades|logos|advertising|billboards)\b/i;

  function looksLikeDecoy(item, text) {
    return Boolean(item && SUBJECT_HINTS[item.type]) && SUBJECT_DECOYS.test(String(text || ""));
  }

  // Nelle miniature di Wikimedia il nome vero del file è il penultimo segmento.
  // Serve perché la foto in cima a una voce di Wikipedia spesso non ritrae la
  // voce: "Nodoguro" è anche un ristorante di Portland, e la sua vetrina
  // finiva sulla scheda del pesce.
  function fileNameFromUrl(url) {
    const parts = String(url || "").split("?")[0].split("/");
    const raw = /\/thumb\//.test(url) && parts.length > 1 ? parts[parts.length - 2] : parts[parts.length - 1];
    try {
      return decodeURIComponent(raw || "").replace(/_/g, " ").replace(/\.[a-z0-9]+$/i, "");
    } catch (_) {
      return String(raw || "").replace(/_/g, " ");
    }
  }

  function hasKeyTerm(item, text) {
    const key = keyTerm(item, significantWords((item && item.name) || ""));
    if (!key) return true;
    return new Set(significantWords(text)).has(key)
      || Boolean(item && item.jp && item.jp.length > 1 && String(text).indexOf(item.jp) !== -1);
  }

  // La parola più caratteristica del nome deve comparire: senza questo vincolo
  // "Okonomiyaki Hiroshima" accettava qualunque veduta di Hiroshima, che è
  // esattamente il modo in cui finivano stazioni e cartelli sulle schede.
  function keyTerm(item, queryWords) {
    const own = significantWords((item && item.name) || "").filter(function (word) { return !CITY_WORDS.has(word); });
    const pool = own.length ? own : queryWords;
    return pool.slice().sort(function (left, right) { return right.length - left.length; })[0] || "";
  }

  // Regola: nel dubbio, nessuna foto. Una sola parola in comune non basta più,
  // perché è così che finivano ceramiche giapponesi illustrate da archivi
  // parrocchiali americani. Meglio una scheda senza immagine che una scheda che
  // mostra la cosa sbagliata: la descrizione da sola è più onesta.
  function isRelevant(query, title, item) {
    // Il nome giapponese esatto nel titolo è la prova più forte che esista, e
    // sulle voci in kana è l'unica: lì le parole latine non compaiono mai.
    if (item && item.jp && item.jp.length > 1 && String(title || "").indexOf(item.jp) !== -1) return true;
    const queryWords = significantWords(query);
    const titleWords = new Set(significantWords(title));
    if (!queryWords.length) return false;
    const key = keyTerm(item, queryWords);
    // Sulle Wikipedia giapponesi il titolo è in kana: lì fa fede il nome nativo.
    if (key && !titleWords.has(key) && !(item && item.jp && String(title || "").indexOf(item.jp) !== -1)) return false;
    const matches = queryWords.filter(function (word) { return titleWords.has(word); }).length;
    if (queryWords.length === 1) return matches === 1;
    return matches >= 2;
  }

  function wait(milliseconds) {
    return new Promise(function (resolve) { window.setTimeout(resolve, milliseconds); });
  }

  async function fetchImageSearch(url, provider) {
    if ((imageProviderCooldowns[provider] || 0) > Date.now()) return null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const queueDelay = Math.max(0, nextImageSearchAt - Date.now());
      if (queueDelay) await wait(queueDelay);
      nextImageSearchAt = Date.now() + 420;
      let response;
      try {
        response = await fetch(url, { mode: "cors" });
      } catch (_) {
        if (attempt === 1) return null;
        await wait(900);
        continue;
      }
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After")) * 1000;
        imageProviderCooldowns[provider] = Date.now() + Math.min(10 * 60 * 1000, Math.max(retryAfter || 0, 2 * 60 * 1000));
        return null;
      }
      if (response.status < 500) return response;
      const retryAfter = Number(response.headers.get("Retry-After")) * 1000;
      await wait(Math.min(5000, Math.max(retryAfter || 0, 1200 * (attempt + 1))));
    }
    return null;
  }

  async function searchCommons(query, item) {
    const params = new URLSearchParams({
      action: "query", generator: "search", gsrsearch: query + " filetype:bitmap",
      gsrnamespace: "6", gsrlimit: "8", prop: "imageinfo|categories", iiprop: "url|mime|size|extmetadata",
      iiurlwidth: "900", cllimit: "max", clshow: "!hidden", format: "json", origin: "*"
    });
    const response = await fetchImageSearch("https://commons.wikimedia.org/w/api.php?" + params.toString(), "commons");
    if (!response || !response.ok) return null;
    const payload = await response.json();
    const pages = Object.values((payload.query && payload.query.pages) || {}).sort(function (left, right) {
      return (left.index || 99) - (right.index || 99);
    });
    const page = pages.find(function (candidate) {
      const title = String(candidate.title || "").replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "");
      const categories = (candidate.categories || []).map(function (entry) {
        return String(entry.title || "").replace(/^Category:/, "");
      });
      return usableImage(candidate.imageinfo && candidate.imageinfo[0], candidate.title)
        && !looksLikeDecoy(item, title)
        && !(SUBJECT_HINTS[item && item.type] && CATEGORY_DECOYS.test(categories.join(" · ")))
        && isRelevant(query, title, item)
        && subjectEvidence(item, [title].concat(categories));
    });
    if (!page) return null;
    const info = page.imageinfo[0];
    const metadata = info.extmetadata || {};
    const creator = cleanCredit(metadata.Artist && metadata.Artist.value);
    const license = cleanCredit(metadata.LicenseShortName && metadata.LicenseShortName.value);
    return {
      url: info.thumburl || info.url,
      credit: [creator || page.title.replace(/^File:/, ""), license, "Wikimedia Commons"].filter(Boolean).join(" · "),
      sourceUrl: "https://commons.wikimedia.org/wiki/" + encodeURIComponent(page.title.replace(/ /g, "_")),
      provider: "commons"
    };
  }

  async function searchOpenverse(query, item) {
    const params = new URLSearchParams({ q: query, page_size: "10", category: "photograph", mature: "false" });
    const response = await fetchImageSearch("https://api.openverse.org/v1/images/?" + params.toString(), "openverse");
    if (!response || !response.ok) return null;
    const payload = await response.json();
    const candidate = (payload.results || []).find(function (result) {
      const tags = (result.tags || []).map(function (tag) { return tag.name; }).join(" ");
      return !result.mature && (result.thumbnail || result.url) && (!result.width || result.width >= 360) && (!result.height || result.height >= 240)
        && (!SUBJECT_HINTS[item && item.type] || hasKeyTerm(item, result.title))
        && !looksLikeDecoy(item, result.title)
        && isRelevant(query, [result.title, tags].join(" "), item)
        && subjectEvidence(item, [result.title, tags]);
    });
    if (!candidate) return null;
    return {
      url: candidate.thumbnail || candidate.url,
      credit: [candidate.creator || candidate.source, candidate.license && candidate.license.toUpperCase(), "Openverse"].filter(Boolean).join(" · "),
      sourceUrl: candidate.foreign_landing_url || candidate.detail_url || "https://openverse.org/",
      provider: "openverse"
    };
  }

  // Collezioni museali in pubblico dominio, senza chiave. Coprono bene gli
  // oggetti tradizionali (stampe, ceramica, tessuti, lacche) che le ricerche
  // generiche sbagliavano. Il filtro sull'origine giapponese è severo perché
  // anche questi archivi, se non trovano nulla, rispondono lo stesso.
  function looksJapanese(text) {
    return /giapp|japan|nippon|日本/i.test(String(text || ""));
  }

  // Negli archivi museali il nome della città inganna: "Matsumoto temari"
  // pescava il ritratto di un attore che si chiamava Matsumoto, e un oggetto di
  // Kyoto qualsiasi rispondeva a qualunque ricerca su Kyoto. L'origine
  // giapponese è già garantita dal filtro sul paese, quindi le città si tolgono
  // dal confronto e deve restare un aggancio sul termine specifico.
  const CITY_WORDS = new Set(data.cities.map(function (city) { return normalize(city.name).replace(/[^a-z]/g, ""); }));

  function museumMatch(query, title) {
    const wanted = significantWords(query).filter(function (word) { return !CITY_WORDS.has(word); });
    if (!wanted.length) return false;
    const titleWords = new Set(significantWords(title));
    return wanted.some(function (word) { return titleWords.has(word); });
  }

  async function searchMet(query, item) {
    const search = await fetchImageSearch("https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&artistOrCulture=true&q=" + encodeURIComponent(query), "met");
    if (!search || !search.ok) return null;
    const payload = await search.json();
    const ids = (payload.objectIDs || []).slice(0, 4);
    for (const id of ids) {
      const detail = await fetchImageSearch("https://collectionapi.metmuseum.org/public/collection/v1/objects/" + id, "met");
      if (!detail || !detail.ok) continue;
      const object = await detail.json();
      if (!object.primaryImageSmall || !object.isPublicDomain) continue;
      if (!looksJapanese(object.culture) && !looksJapanese(object.country) && !looksJapanese(object.artistNationality)) continue;
      if (!museumMatch(query, object.title + " " + (object.objectName || ""))) continue;
      if (!subjectEvidence(item, [object.title, object.objectName, object.classification, object.medium])) continue;
      return {
        url: object.primaryImageSmall,
        credit: [object.title, object.objectDate, "The Met · pubblico dominio"].filter(Boolean).join(" · "),
        sourceUrl: object.objectURL || "https://www.metmuseum.org/",
        provider: "met"
      };
    }
    return null;
  }

  async function searchArtInstitute(query, item) {
    const params = new URLSearchParams({
      q: query, limit: "5",
      fields: "id,title,image_id,place_of_origin,artwork_type_title,medium_display,date_display,is_public_domain"
    });
    const response = await fetchImageSearch("https://api.artic.edu/api/v1/artworks/search?" + params.toString(), "artic");
    if (!response || !response.ok) return null;
    const payload = await response.json();
    const hit = (payload.data || []).find(function (artwork) {
      return artwork.image_id && artwork.is_public_domain !== false && looksJapanese(artwork.place_of_origin)
        && museumMatch(query, artwork.title + " " + (artwork.artwork_type_title || ""))
        && subjectEvidence(item, [artwork.title, artwork.artwork_type_title, artwork.medium_display]);
    });
    if (!hit) return null;
    return {
      url: "https://www.artic.edu/iiif/2/" + hit.image_id + "/full/843,/0/default.jpg",
      credit: [hit.title, hit.date_display, "Art Institute of Chicago · CC0"].filter(Boolean).join(" · "),
      sourceUrl: "https://www.artic.edu/artworks/" + hit.id,
      provider: "artic"
    };
  }

  async function searchWikipedia(query, language, item) {
    const provider = "wikipedia-" + language;
    const params = new URLSearchParams({
      action: "query", generator: "search", gsrsearch: query, gsrlimit: "8",
      prop: "pageimages|info|pageterms", piprop: "thumbnail", pithumbsize: "900",
      wbptterms: "description", inprop: "url", format: "json", origin: "*"
    });
    const response = await fetchImageSearch("https://" + language + ".wikipedia.org/w/api.php?" + params.toString(), provider);
    if (!response || !response.ok) return null;
    const payload = await response.json();
    const pages = Object.values((payload.query && payload.query.pages) || {}).sort(function (left, right) {
      return (left.index || 99) - (right.index || 99);
    });
    const page = pages.find(function (candidate) {
      if (!candidate.thumbnail || !candidate.thumbnail.source) return false;
      const description = ((candidate.terms && candidate.terms.description) || []).join(" ");
      const fileName = fileNameFromUrl(candidate.thumbnail.source);
      // Per cibi e acquisti la foto in cima alla voce non basta: deve portare
      // nel nome del file la cosa giusta e non ritrarre vetrine o feste.
      if (SUBJECT_HINTS[item && item.type] && (!hasKeyTerm(item, fileName) || looksLikeDecoy(item, fileName))) return false;
      return isRelevant(query, candidate.title, item)
        && (!candidate.thumbnail.width || candidate.thumbnail.width >= 360)
        && !/(disambiguation|曖昧さ回避)/i.test(candidate.title || "")
        && !looksLikeDecoy(item, description)
        && subjectEvidence(item, [candidate.title, description]);
    });
    if (!page) return null;
    return {
      url: page.thumbnail.source,
      credit: "Wikipedia " + language.toUpperCase() + " · " + page.title,
      sourceUrl: page.fullurl || "https://" + language + ".wikipedia.org/",
      provider: provider
    };
  }

  function stableHash(value) {
    return Array.from(String(value || "")).reduce(function (hash, character) {
      return ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    }, 0);
  }

  // I musei illustrano reperti storici, non quello che c'è oggi sullo scaffale:
  // per una stampa ukiyo-e o un kimono d'epoca è esattamente il soggetto giusto,
  // per una ceramica che compri domani una tazza del Settecento sarebbe
  // fuorviante. Quindi solo arte, moda d'epoca e oggetti rituali.
  const MUSEUM_CATEGORIES = new Set(["arte", "tradizione", "moda"]);

  function rotatedProviders(item) {
    const providers = [
      ["commons", searchCommons],
      ["openverse", searchOpenverse],
      ["wikipedia-ja", function (query, entry) { return searchWikipedia(query, "ja", entry); }],
      ["wikipedia-en", function (query, entry) { return searchWikipedia(query, "en", entry); }]
    ];
    if (item.type === "history" || (item.type === "shop" && MUSEUM_CATEGORIES.has(item.category))) {
      providers.push(["met", searchMet], ["artic", searchArtInstitute]);
    }
    const offset = Math.abs(stableHash(item.id)) % providers.length;
    return providers.slice(offset).concat(providers.slice(0, offset));
  }

  async function resolveImage(item, options) {
    if (!item) return null;
    if (options === true) options = { skipDirect:true, force:true };
    options = options || {};
    const excluded = new Set(options.excludedProviders || []);
    const directProvider = item.imageProvider || "official";
    if (!options.skipDirect && !excluded.has(directProvider) && item.imageUrl) return {
      url: item.imageUrl,
      credit: item.imageCredit || "Immagine ufficiale",
      sourceUrl: item.imageSourceUrl || "",
      provider: directProvider
    };
    if (!options.force && state.imageCache[item.id] && !excluded.has(state.imageCache[item.id].provider)) return state.imageCache[item.id];
    if (!navigator.onLine) return "";
    const requestKey = item.id + "|" + Array.from(excluded).sort().join(",");
    if (imageRequests.has(requestKey)) return imageRequests.get(requestKey);
    const request = resolveUncachedImage(item, excluded);
    imageRequests.set(requestKey, request);
    try {
      return await request;
    } finally {
      imageRequests.delete(requestKey);
    }
  }

  async function resolveUncachedImage(item, excluded) {
    try {
      const queries = imageQueries(item);
      let result = null;
      const providers = rotatedProviders(item).filter(function (provider) {
        return !excluded.has(provider[0]) && (imageProviderCooldowns[provider[0]] || 0) <= Date.now();
      });
      for (const provider of providers) {
        for (const query of queries.slice(0, 2)) {
          result = await provider[1](query, item);
          if (result) break;
        }
        if (result) break;
      }
      if (!result) return null;
      state.imageCache[item.id] = result;
      const keys = Object.keys(state.imageCache);
      if (keys.length > 650) delete state.imageCache[keys[0]];
      localStorage.setItem("tabi-image-cache-v4", JSON.stringify(state.imageCache));
      return result;
    } catch (_) {
      return "";
    }
  }

  window.TABI_IMAGES = {
    resolveById: function (id, options) { return resolveImage(itemById[id], options); },
    resolveItem: function (item, options) { return resolveImage(item, options); },
    retryById: function (id, excludedProviders) {
      delete state.imageCache[id];
      return resolveImage(itemById[id], { skipDirect:true, force:true, excludedProviders:excludedProviders || [] });
    },
    fallbackFor: function (type) { return fallbackByType[type] || fallbackByType.place; }
  };

  window.TABI_GEO = { requestPosition: function (options) { return requestPosition(options); } };

  const VIEW_TITLES = {
    overview: "Viaggio", places: "Mappa", experiences: "Esperienze", history: "Storie",
    food: "Cibo", shopping: "Acquisti", phrases: "Parole", progress: "Progressi",
    translate: "Traduttore", packing: "Valigia", notes: "Note", saved: "Salvati",
    emergency: "Emergenze", money: "Contanti"
  };
  const MENU_TITLES = { discover: "Scopri", tools: "Utilità" };
  const NAV_GROUPS = {
    discover: ["experiences", "food", "shopping", "history"],
    tools: ["emergency", "translate", "money", "packing", "notes", "saved"]
  };

  function viewTitle(view) {
    return VIEW_TITLES[view] || "";
  }

  // I menu Scopri e Utilità sono a tutti gli effetti una schermata: chi ci entra
  // e poi torna indietro si aspetta di ritrovarli aperti, non di essere
  // sbalzato sulla pagina che c'era prima.
  function openNavMenu(menu) {
    const dialog = document.getElementById("navMenuDialog");
    if (!dialog || !NAV_GROUPS[menu]) return;
    dialog.querySelectorAll("[data-nav-panel]").forEach(function (panel) {
      panel.hidden = panel.dataset.navPanel !== menu;
    });
    if (!dialog.open) dialog.showModal();
    if (menu === "tools" && quickRateSync) {
      quickRateSync();
      refreshRate(false).then(quickRateSync);
    }
  }

  function rememberMenuOrigin(view, menu) {
    if (menu) state.menuOrigin[view] = menu;
    else delete state.menuOrigin[view];
  }

  function reopenMenuFor(view) {
    const menu = state.menuOrigin[view];
    if (!menu) return;
    delete state.menuOrigin[view];
    openNavMenu(menu);
  }

  // Il tasto indietro va su ogni schermata, non solo su quelle secondarie:
  // generarlo qui evita di ripeterlo dodici volte nell'HTML e garantisce che
  // nessuna vista se lo dimentichi.
  function setupBackButtons() {
    document.querySelectorAll(".view").forEach(function (section) {
      if (section.dataset.view === "overview" || section.querySelector("[data-back]")) return;
      const button = document.createElement("button");
      button.className = "back-link";
      button.type = "button";
      button.setAttribute("data-back", "");
      button.textContent = "← Indietro";
      section.insertBefore(button, section.firstElementChild);
    });
  }

  function switchView(view, updateHash) {
    if (!document.querySelector('[data-view="' + view + '"]')) view = "overview";
    document.querySelectorAll(".view").forEach(function (section) {
      section.classList.toggle("is-active", section.dataset.view === view);
    });
    document.querySelectorAll("[data-nav]").forEach(function (button) {
      const active = button.dataset.nav === view;
      button.classList.toggle("is-active", active);
      if (active) window.setTimeout(function () { button.scrollIntoView({ behavior:"smooth", block:"nearest", inline:"center" }); }, 0);
    });
    document.querySelectorAll("[data-nav-menu]").forEach(function (button) {
      button.classList.toggle("is-active", (NAV_GROUPS[button.dataset.navMenu] || []).includes(view));
    });
    const navDialog = document.getElementById("navMenuDialog");
    if (navDialog && navDialog.open) navDialog.close();
    if (view === "saved") renderSaved();
    if (view === "progress") renderProgress();
    if (view === "money") renderMoney();
    if (updateHash !== false) {
      const url = new URL(window.location.href);
      if (view !== "places") url.searchParams.delete("point");
      url.hash = view;
      const target = url.pathname + url.search + url.hash;
      // pushState invece di replaceState: così il gesto "indietro" del telefono
      // e il tasto del browser tornano alla schermata precedente, invece di
      // buttare fuori dall'app. Senza, dalle viste secondarie non si esce.
      if (location.hash.slice(1) !== view) history.pushState({ view: view }, "", target);
      else history.replaceState({ view: view }, "", target);
    }
    state.previousView = state.currentView && state.currentView !== view ? state.currentView : state.previousView;
    state.currentView = view;
    const back = document.querySelector('[data-view="' + view + '"] [data-back]');
    if (back) {
      const menu = state.menuOrigin[view];
      back.textContent = "← " + (menu ? MENU_TITLES[menu] : (viewTitle(state.previousView) || "Viaggio"));
      back.hidden = view === "overview";
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { window.scrollTo({ top:0, behavior:"auto" }); });
    });
    window.dispatchEvent(new CustomEvent("tabi:viewchange", { detail: { view: view } }));
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) {
      state.favorites.delete(id);
      showToast("Rimosso dai salvati");
    } else {
      state.favorites.add(id);
      showToast("Aggiunto ai salvati");
    }
    saveState();
    refreshCardState(id);
    updateProgress();
  }

  function toggleDone(id) {
    if (state.done.has(id)) {
      state.done.delete(id);
    } else {
      state.done.add(id);
      const item = itemById[id];
      showToast(completionLabels(item)[2]);
    }
    saveState();
    refreshCardState(id);
    updateProgress();
    window.dispatchEvent(new CustomEvent("tabi:progresschange", { detail:{ id:id, done:state.done.has(id) } }));
  }

  function refreshCardState(id) {
    const item = itemById[id];
    document.querySelectorAll('[data-card-id="' + id + '"]').forEach(function (card) {
      const favorite = card.querySelector(".favorite-button");
      const done = card.querySelector(".done-button");
      if (favorite) {
        favorite.classList.toggle("is-active", state.favorites.has(id));
        favorite.textContent = state.favorites.has(id) ? "♥" : "♡";
      }
      if (done) {
        const labels = completionLabels(item);
        done.classList.toggle("is-done", state.done.has(id));
        done.textContent = state.done.has(id) ? "✓ " + labels[0] : labels[1];
      }
    });
    const dialog = document.getElementById("detailDialog");
    if (dialog.dataset.itemId === id) {
      const dialogDone = dialog.querySelector(".detail-done-button");
      const labels = completionLabels(item);
      if (dialogDone) dialogDone.textContent = state.done.has(id) ? "✓ " + labels[0] : labels[1];
    }
    document.querySelectorAll('[data-action="done"][data-id="' + id + '"]').forEach(function (button) {
      const labels = completionLabels(item);
      button.classList.toggle("is-done", state.done.has(id));
      button.textContent = state.done.has(id) ? "✓ " + labels[0] : labels[1];
    });
  }

  function showDetails(id) {
    const item = itemById[id];
    if (!item) return;
    const cardImageElement = document.querySelector('[data-card-id="' + id + '"] img');
    const imageUrl = cardImageElement && (cardImageElement.dataset.resolved || cardImageElement.src);
    const imageCredit = cardImageElement && cardImageElement.dataset.credit;
    const imageSourceUrl = cardImageElement && cardImageElement.dataset.sourceUrl;
    let details = "";
    let hero = "";
    let actions = "";
    if (item.type === "place") {
      details = detailCells([["Categoria", data.labels.placeCategories[item.category]], ["Zona", item.area], ["Tempo", item.duration], ["Quando", item.tip]]);
    } else if (item.type === "experience") {
      details = detailCells([["Tipo", data.labels.experienceCategories[item.category]], ["Zona", item.area], ["Tempo", item.duration], ["Da organizzare", item.booking || item.tip]]);
    } else if (item.type === "food") {
      details = detailCells([["Portata", data.labels.foodCategories[item.category]], ["Contesto", item.context], ["Gradimento", "★ " + item.rating.toFixed(1) + " / 5"], ["Selezione", item.local ? "Scoperta locale" : "Grande classico"]]);
    } else if (item.type === "history") {
      details = detailCells([["Città", cityName(item.city)], ["Argomento", data.labels.historyCategories[item.category]]]);
    } else {
      details = detailCells([["Categoria", data.labels.shopCategories[item.category]], ["Dove cercarlo", item.where], ["Prezzo", item.price], ["Consiglio", item.tip]]);
    }
    const actionLinks = [];
    if (["place", "experience"].includes(item.type)) {
      if (mapGuideIds.has(item.id)) actionLinks.push('<a class="primary-action" href="' + ownMapUrl(item) + '" data-map-focus="' + item.id + '">Apri nella mappa Tabi</a>');
      actionLinks.push('<a class="secondary-action" href="' + mapsUrl(item) + '" target="_blank" rel="noopener">Raggiungi con Google Maps</a>');
    }
    if (item.sourceUrl && !(item.sources && item.sources.length)) actionLinks.push('<a class="secondary-action" href="' + escapeHTML(item.sourceUrl) + '" target="_blank" rel="noopener">' + escapeHTML(item.sourceTitle || "Fonte utile") + ' ↗</a>');
    actionLinks.push('<button class="secondary-action detail-done-button" type="button" data-action="done" data-id="' + item.id + '">' + (state.done.has(item.id) ? "✓ " + completionLabels(item)[0] : completionLabels(item)[1]) + '</button>');
    actions = '<div class="hero-actions">' + actionLinks.join("") + '</div>';
    if (item.type === "history") {
      hero = '<div class="history-detail-hero" aria-hidden="true"><span>' + escapeHTML(item.kanji) + '</span><small>' + escapeHTML(cityName(item.city)) + '</small></div>';
    } else {
      hero = '<img class="dialog-hero" src="' + escapeHTML(imageUrl || fallbackByType[item.type] || fallbackByType.place) + '" alt="' + escapeHTML(item.name) + '" referrerpolicy="no-referrer">';
      if (imageCredit && imageSourceUrl) hero += '<a class="photo-credit" href="' + escapeHTML(imageSourceUrl) + '" target="_blank" rel="noopener">Foto: ' + escapeHTML(imageCredit) + ' ↗</a>';
    }
    const sections = (item.guideSections || []).map(function (section, index) {
      return '<section class="guide-section' + (index === 0 ? ' guide-section-lead' : '') + (section.fun ? ' guide-section-fun' : '') + '"><span>' + String(index + 1).padStart(2, "0") + '</span><div><h3>' + escapeHTML(section.title) + '</h3><p>' + escapeHTML(section.body) + '</p></div></section>';
    }).join("");
    const booking = bookingHTML(item);
    const glossary = glossaryHTML(item);
    const sources = (item.sources || []).length ? '<section class="detail-sources"><p class="eyebrow">Per approfondire e verificare</p><h3>Fonti della guida</h3><div>' + item.sources.map(function (source) {
      return '<a href="' + escapeHTML(source.url) + '" target="_blank" rel="noopener"><strong>' + escapeHTML(source.title) + '</strong><span>' + escapeHTML(source.kind || "fonte") + ' ↗</span></a>';
    }).join("") + '</div></section>' : "";
    document.getElementById("dialogContent").innerHTML =
      hero
      + '<div class="dialog-body"><p class="eyebrow">' + escapeHTML(cityName(item.city)) + '</p>'
      + '<h2>' + escapeHTML(item.name) + ' <span class="jp-name">' + escapeHTML(item.jp) + '</span></h2>'
      + '<p class="guide-intro">' + escapeHTML(item.longDescription || item.description) + '</p>' + details
      + (sections ? '<div class="guide-sections">' + sections + '</div>' : '') + glossary + booking + sources
      + actions + '</div>';
    const detailDialog = document.getElementById("detailDialog");
    detailDialog.dataset.itemId = id;
    detailDialog.showModal();
    const dialogHero = detailDialog.querySelector(".dialog-hero");
    if (dialogHero) dialogHero.addEventListener("error", function () {
      const credit = detailDialog.querySelector(".photo-credit");
      if (credit) credit.remove();
      const failed = new Set((dialogHero.dataset.failedProviders || "").split(",").filter(Boolean));
      failed.add(dialogHero.dataset.provider || (item.imageProvider || "official"));
      dialogHero.dataset.failedProviders = Array.from(failed).join(",");
      if (failed.size >= 4) return void dialogHero.remove();
      resolveImage(item, { skipDirect:true, force:true, excludedProviders:Array.from(failed) }).then(function (result) {
        if (!result || !result.url) return void dialogHero.remove();
        dialogHero.dataset.provider = result.provider || "";
        dialogHero.src = result.url;
      });
    });
    if (item.type !== "history" && !imageCredit) {
      resolveImage(item).then(function (result) {
        if (!detailDialog.open || detailDialog.dataset.itemId !== id) return;
        const dialogImage = detailDialog.querySelector(".dialog-hero");
        if (!result || !result.url) return void (dialogImage && dialogImage.remove());
        if (dialogImage) {
          dialogImage.dataset.provider = result.provider || "";
          dialogImage.src = result.url;
        }
        if (result.credit && result.sourceUrl && !detailDialog.querySelector(".photo-credit")) {
          const credit = document.createElement("a");
          credit.className = "photo-credit";
          credit.href = result.sourceUrl;
          credit.target = "_blank";
          credit.rel = "noopener";
          credit.textContent = "Foto: " + result.credit + " ↗";
          if (dialogImage) dialogImage.insertAdjacentElement("afterend", credit);
        }
      });
    }
  }

  function detailCells(entries) {
    return '<div class="detail-list">' + entries.map(function (entry) {
      return '<div><b>' + escapeHTML(entry[0]) + '</b><span>' + escapeHTML(entry[1]) + '</span></div>';
    }).join("") + '</div>';
  }

  function renderSaved() {
    const favoriteItems = Array.from(state.favorites).map(function (id) { return itemById[id]; }).filter(Boolean);
    const doneItems = Array.from(state.done).map(function (id) { return itemById[id]; }).filter(Boolean);
    const types = ["place", "experience", "food", "shop", "history"];
    const counts = types.map(function (type) {
      return favoriteItems.filter(function (item) { return item.type === type; }).length;
    });
    document.getElementById("savedSummary").innerHTML = [
      ["Luoghi", counts[0]], ["Esperienze", counts[1]], ["Cibi", counts[2]], ["Acquisti", counts[3]], ["Storie", counts[4]]
    ].map(function (entry) {
      return '<div class="saved-tile"><strong>' + entry[1] + '</strong><span>' + entry[0] + '</span></div>';
    }).join("");

    const groups = [
      ["Preferiti", favoriteItems, "favorite"],
      ["Già vissuti", doneItems, "done"]
    ];
    document.getElementById("savedSections").innerHTML = groups.map(function (group) {
      if (!group[1].length) return '<section class="saved-group"><h2>' + group[0] + '</h2><div class="empty-state"><div><strong>Ancora vuoto.</strong><span>Usa il cuore o i pulsanti sulle schede.</span></div></div></section>';
      return '<section class="saved-group"><h2>' + group[0] + '</h2><div class="saved-list">' + group[1].map(function (item) {
        return '<article class="saved-row"><div><b>' + escapeHTML(item.name) + '</b><small>' + escapeHTML(cityName(item.city)) + ' · ' + typeLabel(item) + '</small></div><button type="button" data-action="' + group[2] + '" data-id="' + item.id + '" aria-label="Rimuovi">×</button></article>';
      }).join("") + '</div></section>';
    }).join("");
  }

  function progressAreas() {
    return [
      { type:"place", title:"Luoghi", action:"Visitati", view:"places", items:[].concat(data.places, data.mapPlaces || []) },
      { type:"experience", title:"Esperienze", action:"Fatte", view:"experiences", items:data.experiences || [] },
      { type:"food", title:"Cibi", action:"Provati", view:"food", items:data.foods },
      // Gli acquisti restano fuori dai progressi: cosa si compra è una faccenda
      // personale e non ha senso trasformarla in una percentuale condivisa.
      { type:"history", title:"Storie", action:"Lette", view:"history", items:data.history }
    ];
  }

  function progressStat(items) {
    const completed = items.filter(function (item) { return state.done.has(item.id); }).length;
    const total = items.length;
    return { completed:completed, total:total, percent:total ? Math.round((completed / total) * 100) : 0 };
  }

  function renderProgress() {
    const root = document.getElementById("progressOverview");
    if (!root) return;
    const areas = progressAreas();
    const allItems = areas.flatMap(function (area) { return area.items; });
    const overall = progressStat(allItems);
    root.innerHTML = '<section class="progress-hero"><div class="progress-ring" style="--progress:' + overall.percent + '%"><strong>' + overall.percent + '%</strong><span>del viaggio</span></div>'
      + '<div><p class="eyebrow">La checklist completa</p><h2>' + overall.completed + ' di ' + overall.total + ' scoperte</h2><p>Le spunte restano in questo browser e su questo dispositivo. Non serve un account; per passarle a un altro telefono usa esportazione e importazione nella sezione Salvati.</p><div class="progress-actions"><button type="button" data-go="saved">Gestisci e condividi</button><button class="danger-action" type="button" data-reset-progress>Cancella tutti i progressi</button></div></div></section>';

    document.getElementById("progressAreaGrid").innerHTML = areas.map(function (area) {
      const stat = progressStat(area.items);
      return '<button class="progress-area-card" type="button" data-go="' + area.view + '"><span>' + escapeHTML(area.action) + '</span><strong>' + stat.completed + '<small> / ' + stat.total + '</small></strong><div><i style="width:' + stat.percent + '%"></i></div><b>' + escapeHTML(area.title) + ' · ' + stat.percent + '%</b></button>';
    }).join("");

    const cities = data.cities.concat(allItems.some(function (item) { return item.city === "all"; }) ? [{ id:"all", name:"Tutto il Giappone" }] : []);
    document.getElementById("progressCityGrid").innerHTML = cities.map(function (city) {
      const cityItems = allItems.filter(function (item) { return item.city === city.id; });
      const stat = progressStat(cityItems);
      const breakdown = areas.map(function (area) {
        const areaItems = area.items.filter(function (item) { return item.city === city.id; });
        if (!areaItems.length) return "";
        const areaStat = progressStat(areaItems);
        return '<span>' + escapeHTML(area.title) + ' ' + areaStat.completed + '/' + areaStat.total + '</span>';
      }).join("");
      return '<article class="progress-city-card"><div><h3>' + escapeHTML(city.name) + '</h3><strong>' + stat.percent + '%</strong></div><div class="progress-city-bar"><i style="width:' + stat.percent + '%"></i></div><p>' + breakdown + '</p></article>';
    }).join("");
  }

  function updateProgress() {
    renderProgress();
    renderCurrentCity();
  }

  // Il cambio si aggiorna da solo quando c'è rete e resta sul telefono per
  // quando non ce n'è. Il valore scritto a mano, se presente, ha la precedenza.
  const RATE_SOURCES = [
    { url: "https://api.frankfurter.dev/v1/latest?base=JPY&symbols=EUR", read: function (json) { return json && json.rates && json.rates.EUR; }, label: "BCE" },
    { url: "https://open.er-api.com/v6/latest/JPY", read: function (json) { return json && json.rates && json.rates.EUR; }, label: "exchangerate-api" }
  ];
  const RATE_MAX_AGE = 12 * 60 * 60 * 1000;

  function manualRate() {
    const stored = Number(localStorage.getItem("tabi-jpy-rate"));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  }

  function autoRate() {
    const stored = readJSON("tabi-jpy-rate-auto", null);
    return stored && Number.isFinite(stored.rate) && stored.rate > 0 ? stored : null;
  }

  function jpyRate() {
    const manual = manualRate();
    if (manual) return { rate: manual, source: "impostato da te", at: 0 };
    const auto = autoRate();
    return auto ? { rate: auto.rate, source: auto.label, at: auto.at } : null;
  }

  function rateAgeLabel(at) {
    if (!at) return "";
    const days = Math.floor((Date.now() - at) / 86400000);
    if (days <= 0) return "aggiornato oggi";
    if (days === 1) return "aggiornato ieri";
    return "aggiornato " + days + " giorni fa";
  }

  async function refreshRate(force) {
    if (!navigator.onLine) return null;
    const current = autoRate();
    if (!force && current && Date.now() - current.at < RATE_MAX_AGE) return current;
    for (const source of RATE_SOURCES) {
      try {
        const response = await fetch(source.url, { cache: "no-store" });
        if (!response.ok) continue;
        const value = Number(source.read(await response.json()));
        if (!Number.isFinite(value) || value <= 0) continue;
        const record = { rate: value, at: Date.now(), label: source.label };
        localStorage.setItem("tabi-jpy-rate-auto", JSON.stringify(record));
        return record;
      } catch (_) { /* si prova la fonte successiva, poi si tiene il valore vecchio */ }
    }
    return current;
  }

  // Convertitore sempre a portata: sta nel menu Utilità, quindi non occupa
  // spazio permanente ma è a un tocco da qualsiasi schermata.
  function setupQuickRate() {
    const input = document.getElementById("quickYen");
    const output = document.getElementById("quickYenOut");
    const note = document.getElementById("quickYenNote");
    function sync() {
      const current = jpyRate();
      const amount = Number(String(input.value).replace(",", "."));
      if (!current) {
        output.textContent = "—";
        note.textContent = navigator.onLine ? "Recupero il cambio…" : "Cambio non ancora scaricato: serve la rete una volta sola.";
        return;
      }
      output.textContent = Number.isFinite(amount) && amount > 0 ? formatNumber(amount * current.rate, 2) + " €" : "—";
      note.textContent = "1 ¥ = " + formatNumber(current.rate, 4) + " € · " + current.source
        + (current.at ? " · " + rateAgeLabel(current.at) : "");
    }
    input.addEventListener("input", sync);
    quickRateSync = sync;
    sync();
  }

  function setupRateField() {
    const input = document.getElementById("jpyRate");
    const preview = document.getElementById("jpyRatePreview");
    const status = document.getElementById("jpyRateStatus");
    function sync() {
      const current = jpyRate();
      preview.textContent = current ? formatNumber(current.rate, 4) : "—";
      if (!current) {
        status.textContent = navigator.onLine ? "Recupero del cambio in corso…" : "Sei offline: il cambio si aggiornerà alla prossima connessione.";
        return;
      }
      const auto = autoRate();
      status.textContent = manualRate()
        ? "Stai usando il tuo valore. Svuota il campo per tornare al cambio automatico" + (auto ? " (" + formatNumber(auto.rate, 4) + " €, " + rateAgeLabel(auto.at) + ")" : "") + "."
        : "Fonte " + current.source + ", " + rateAgeLabel(current.at) + ". Si aggiorna da solo quando c'è rete.";
    }
    input.value = manualRate() || "";
    input.addEventListener("change", function () {
      const value = Number(String(input.value).replace(",", "."));
      if (Number.isFinite(value) && value > 0) {
        localStorage.setItem("tabi-jpy-rate", String(value));
        showToast("Cambio impostato a mano");
      } else {
        localStorage.removeItem("tabi-jpy-rate");
        showToast("Torno al cambio automatico");
      }
      sync();
    });
    sync();
    refreshRate(false).then(sync);
    window.addEventListener("online", function () { refreshRate(false).then(sync); });
  }

  function parseAmount(query) {
    const cleaned = String(query).trim().replace(/[¥￥€]|yen|jpy|eur|euro/gi, "").replace(/\s|\./g, "").replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
    const amount = Number(cleaned);
    return amount > 0 ? amount : null;
  }

  function converterHTML(query) {
    const amount = parseAmount(query);
    if (!amount) return "";
    const current = jpyRate();
    const isEuro = /€|eur/i.test(query);
    if (!current) {
      return '<div class="search-group"><h3>Convertitore</h3><button class="search-convert is-empty" type="button" data-go="saved">'
        + '<strong>Cambio non ancora disponibile</strong><span>Si scarica da solo appena c\'è rete. Puoi anche scriverlo a mano in Salvati →</span></button></div>';
    }
    const from = isEuro ? amount / current.rate : amount;
    const to = isEuro ? amount : amount * current.rate;
    const age = current.at ? " · " + rateAgeLabel(current.at) : "";
    return '<div class="search-group"><h3>Convertitore</h3><div class="search-convert">'
      + '<strong>' + formatNumber(from, 0) + ' ¥ ≈ ' + formatNumber(to, 2) + ' €</strong>'
      + '<span>1 ¥ = ' + formatNumber(current.rate, 4) + ' € · ' + escapeHTML(current.source) + age + '</span></div></div>';
  }

  function formatNumber(value, decimals) {
    return value.toLocaleString("it-IT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  // ---- Monete e banconote --------------------------------------------------

  // Disegnate in scala tra loro, 2,2 px per millimetro vero: in mano un taglio
  // si riconosce dal diametro e dal colore molto prima che dai kanji.
  const COIN_SCALE = 2.2;
  const NOTE_SCALE = 0.85;
  const NOTE_HEIGHT_MM = 76;

  function euroLabel(yen) {
    const current = jpyRate();
    return current ? "≈ " + formatNumber(yen * current.rate, 2) + " €" : "";
  }

  function millimetres(value) {
    return String(value).replace(".", ",") + " mm";
  }

  function coinArt(coin) {
    const size = Math.round(coin.diameter * COIN_SCALE);
    const center = size / 2;
    const outer = center - 1;
    const hole = Math.round(size * 0.115);
    const label = coin.value === 5 ? "五" : String(coin.value);
    const fontSize = Math.round(size * (coin.hole ? 0.26 : 0.32));
    const textY = coin.hole ? center + hole + fontSize * 0.92 : center;
    // La 500 yen è bicolore: anello di ottone e cuore argentato.
    return '<svg class="coin-art" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="Moneta da ' + coin.value + ' yen, diametro ' + millimetres(coin.diameter) + '">'
      + '<circle cx="' + center + '" cy="' + center + '" r="' + outer + '" fill="' + (coin.ring || coin.color) + '" stroke="' + coin.edge + '" stroke-width="1.6"></circle>'
      + (coin.ring ? '<circle cx="' + center + '" cy="' + center + '" r="' + (outer * 0.62) + '" fill="' + coin.color + '"></circle>' : '')
      + (coin.hole ? '<circle cx="' + center + '" cy="' + center + '" r="' + hole + '" fill="var(--paper)" stroke="' + coin.edge + '" stroke-width="1"></circle>' : '')
      + '<text x="' + center + '" y="' + textY + '" text-anchor="middle" dominant-baseline="' + (coin.hole ? "auto" : "central") + '" font-family="Noto Serif JP, serif" font-size="' + fontSize + '" font-weight="700" fill="' + coin.edge + '">' + label + '</text>'
      + '</svg>';
  }

  function noteArt(note) {
    const width = Math.round(note.width * NOTE_SCALE);
    const height = Math.round(NOTE_HEIGHT_MM * NOTE_SCALE);
    return '<svg class="note-art" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" role="img" aria-label="Banconota da ' + note.value + ' yen, lunga ' + millimetres(note.width) + '">'
      + '<rect x="1" y="1" width="' + (width - 2) + '" height="' + (height - 2) + '" rx="4" fill="' + note.color + '" stroke="' + note.ink + '" stroke-opacity=".4"></rect>'
      + '<rect x="5" y="5" width="' + (width - 10) + '" height="' + (height - 10) + '" rx="2" fill="none" stroke="' + note.ink + '" stroke-opacity=".22"></rect>'
      + '<circle cx="' + (width - 22) + '" cy="' + (height / 2) + '" r="15" fill="' + note.ink + '" fill-opacity=".2"></circle>'
      + '<text x="12" y="' + (height / 2 - 1) + '" font-family="DM Sans, sans-serif" font-size="18" font-weight="800" fill="' + note.ink + '">' + note.value + '</text>'
      + '<text x="12" y="' + (height - 13) + '" font-family="Noto Serif JP, serif" font-size="10" font-weight="700" fill="' + note.ink + '" fill-opacity=".8">' + escapeHTML(note.kanji) + '</text>'
      + '</svg>';
  }

  function moneyRow(art, value, meta, description, extra) {
    const euro = euroLabel(value);
    return '<article class="money-row"><div class="money-art">' + art + '</div>'
      + '<div class="money-body"><div class="money-head"><b>¥' + formatNumber(value, 0) + '</b>'
      + (euro ? '<span>' + euro + '</span>' : '') + '</div>'
      + '<p class="money-meta">' + escapeHTML(meta) + '</p>'
      + '<p>' + escapeHTML(description) + '</p>'
      + '<small>' + escapeHTML(extra) + '</small></div></article>';
  }

  function renderMoney() {
    const money = window.JAPAN_MONEY;
    const coinGrid = document.getElementById("moneyCoinGrid");
    if (!money || !coinGrid) return;
    coinGrid.innerHTML = money.coins.map(function (coin) {
      const meta = [coin.kanji, coin.metal, "⌀ " + millimetres(coin.diameter), coin.weight, coin.hole ? "col buco" : ""].filter(Boolean).join(" · ");
      return moneyRow(coinArt(coin), coin.value, meta, coin.note, "Disegno: " + coin.face);
    }).join("");
    document.getElementById("moneyNoteGrid").innerHTML = money.notes.map(function (note) {
      return moneyRow(noteArt(note), note.value, note.kanji + " · lunga " + millimetres(note.width) + " · alta " + millimetres(NOTE_HEIGHT_MM),
        note.note, "Fronte: " + note.portrait + " · Retro: " + note.back);
    }).join("");
    document.getElementById("moneyTips").innerHTML = money.tips.map(function (tip) {
      return '<li>' + escapeHTML(tip) + '</li>';
    }).join("");
    // Il cambio arriva dalla rete: se non c'è ancora, si riprova una volta sola
    // e i valori in euro compaiono senza far ricaricare la schermata.
    if (!jpyRate() && !moneyRateRequested) {
      moneyRateRequested = true;
      refreshRate(false).then(function () { if (state.currentView === "money") renderMoney(); });
    }
  }

  const searchGroups = [
    { key: "place", label: "Luoghi" },
    { key: "experience", label: "Esperienze" },
    { key: "food", label: "Cibo" },
    { key: "shop", label: "Acquisti" },
    { key: "history", label: "Storie" }
  ];

  function searchCatalog() {
    return [].concat(data.places, data.mapPlaces || [], data.experiences || [], data.foods, data.shopping, data.history);
  }

  function renderSearchResults(query) {
    const container = document.getElementById("searchResults");
    const normalized = normalize(query.trim());
    const converter = converterHTML(query);
    if (normalized.length < 2) {
      container.innerHTML = converter || '<p class="search-hint">Cerca in tutta la guida: luoghi, esperienze, piatti, acquisti, storie e frasi. Scrivi un numero per convertirlo in euro.</p>';
      return;
    }
    const found = searchCatalog().filter(function (item) { return itemHaystack(item).includes(normalized); });
    const byType = {};
    found.forEach(function (item) { (byType[item.type] = byType[item.type] || []).push(item); });
    const phrases = phrasebookPhrases().filter(function (item) {
      return normalize([item.jp, item.romaji, item.italianReading, item.meaning, item.note].join(" ")).includes(normalized);
    });

    const sections = searchGroups.map(function (group) {
      const items = byType[group.key] || [];
      if (!items.length) return "";
      const rows = items.slice(0, 6).map(function (item) {
        return '<button class="search-row" type="button" data-search-item="' + escapeHTML(item.id) + '">'
          + '<b>' + escapeHTML(item.name || item.title) + '</b>'
          + '<small>' + escapeHTML(cityName(item.city)) + ' · ' + escapeHTML(typeLabel(item)) + '</small></button>';
      }).join("");
      const more = items.length > 6 ? '<p class="search-more">e altri ' + (items.length - 6) + '</p>' : "";
      return '<div class="search-group"><h3>' + group.label + ' <em>' + items.length + '</em></h3>' + rows + more + '</div>';
    }).join("");

    const phraseSection = phrases.length
      ? '<div class="search-group"><h3>Frasi <em>' + phrases.length + '</em></h3>' + phrases.slice(0, 4).map(function (item) {
          return '<div class="search-phrase"><b>' + escapeHTML(item.jp) + '</b><span>' + escapeHTML(item.italianReading) + '</span>'
            + '<small>' + escapeHTML(item.meaning) + '</small>'
            + '<button type="button" data-speak="' + item.id + '" aria-label="Ascolta la pronuncia di ' + escapeHTML(item.meaning) + '">♪</button></div>';
        }).join("") + '</div>'
      : "";

    const body = converter + sections + phraseSection;
    container.innerHTML = body || '<p class="search-hint">Nessun risultato per “' + escapeHTML(query.trim()) + '”. Prova con una parola più corta.</p>';
  }

  function setupGlobalSearch() {
    const dialog = document.getElementById("searchDialog");
    const input = document.getElementById("globalSearch");
    document.getElementById("searchButton").addEventListener("click", function () {
      dialog.showModal();
      renderSearchResults(input.value);
      input.focus();
      input.select();
    });
    dialog.querySelector(".search-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
    input.addEventListener("input", function () { renderSearchResults(input.value); });
    document.getElementById("searchResults").addEventListener("click", function (event) {
      const row = event.target.closest("[data-search-item]");
      if (row) {
        dialog.close();
        showDetails(row.dataset.searchItem);
        return;
      }
      if (event.target.closest("[data-go]")) dialog.close();
    });
  }

  // ---- Valigia -------------------------------------------------------------

  function renderPacking() {
    const packed = state.packed;
    const groups = data.packing || [];
    const total = groups.reduce(function (sum, group) { return sum + group.items.length; }, 0);
    const done = groups.reduce(function (sum, group) {
      return sum + group.items.filter(function (item) { return packed.has(item.id); }).length;
    }, 0);
    const percent = total ? Math.round((done / total) * 100) : 0;
    document.getElementById("packingSummary").innerHTML =
      '<div class="packing-bar"><div><strong>' + done + '</strong><span>di ' + total + ' oggetti spuntati</span></div>'
      + '<div class="progress-city-bar"><i style="width:' + percent + '%"></i></div></div>';
    document.getElementById("packingGroups").innerHTML = groups.map(function (group) {
      const groupDone = group.items.filter(function (item) { return packed.has(item.id); }).length;
      return '<section class="packing-group"><div class="packing-group-head"><h2>' + escapeHTML(group.title) + '</h2>'
        + '<span>' + groupDone + '/' + group.items.length + '</span></div>'
        + '<p class="packing-group-note">' + escapeHTML(group.note) + '</p>'
        + group.items.map(function (item) {
          const checked = packed.has(item.id);
          return '<label class="packing-item' + (checked ? " is-packed" : "") + '">'
            + '<input type="checkbox" data-pack="' + item.id + '"' + (checked ? " checked" : "") + '>'
            + '<span><b>' + escapeHTML(item.name) + (item.quantity ? ' <em>×' + escapeHTML(item.quantity) + '</em>' : "") + '</b>'
            + (item.note ? '<small>' + escapeHTML(item.note) + '</small>' : "") + '</span></label>';
        }).join("") + '</section>';
    }).join("");
  }

  function setupPacking() {
    document.getElementById("packingGroups").addEventListener("change", function (event) {
      const box = event.target.closest("[data-pack]");
      if (!box) return;
      if (box.checked) state.packed.add(box.dataset.pack);
      else state.packed.delete(box.dataset.pack);
      localStorage.setItem("tabi-packing", JSON.stringify(Array.from(state.packed)));
      renderPacking();
      renderCurrentCity();
    });
    document.getElementById("packingResetButton").addEventListener("click", function () {
      if (!state.packed.size) return;
      if (!window.confirm("Togliere tutte le spunte dalla lista valigia su questo telefono?")) return;
      state.packed.clear();
      localStorage.setItem("tabi-packing", JSON.stringify([]));
      renderPacking();
      renderCurrentCity();
      showToast("Lista valigia azzerata");
    });
    renderPacking();
  }

  // ---- Note ----------------------------------------------------------------

  function saveNotes() {
    localStorage.setItem("tabi-notes-v1", JSON.stringify(state.notes));
  }

  function renderNotes(focusId) {
    const list = document.getElementById("notesList");
    list.innerHTML = state.notes.map(function (note) {
      return '<article class="note-card" data-note="' + escapeHTML(note.id) + '">'
        + '<textarea rows="4" placeholder="Scrivi qui…" aria-label="Nota">' + escapeHTML(note.text) + '</textarea>'
        + '<div class="note-foot"><small>' + escapeHTML(noteStamp(note.updatedAt)) + '</small>'
        + '<button type="button" data-note-delete="' + escapeHTML(note.id) + '">Elimina</button></div></article>';
    }).join("");
    document.getElementById("notesEmpty").hidden = state.notes.length !== 0;
    document.getElementById("notesStatus").textContent = state.notes.length
      ? state.notes.length + (state.notes.length === 1 ? " nota su questo telefono" : " note su questo telefono")
      : "";
    if (focusId) {
      const area = list.querySelector('[data-note="' + focusId + '"] textarea');
      if (area) area.focus();
    }
  }

  function noteStamp(at) {
    if (!at) return "";
    const date = new Date(at);
    return "Aggiornata alle " + date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
      + " del " + date.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
  }

  function setupNotes() {
    const list = document.getElementById("notesList");
    let saveTimer;
    document.getElementById("noteAddButton").addEventListener("click", function () {
      const note = { id: "note-" + Date.now().toString(36), text: "", updatedAt: Date.now() };
      state.notes.unshift(note);
      saveNotes();
      renderNotes(note.id);
    });
    list.addEventListener("input", function (event) {
      const area = event.target.closest(".note-card textarea");
      if (!area) return;
      const id = area.closest("[data-note]").dataset.note;
      const note = state.notes.find(function (item) { return item.id === id; });
      if (!note) return;
      note.text = area.value;
      note.updatedAt = Date.now();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        saveNotes();
        const stamp = list.querySelector('[data-note="' + id + '"] small');
        if (stamp) stamp.textContent = noteStamp(note.updatedAt);
      }, 400);
    });
    list.addEventListener("click", function (event) {
      const remove = event.target.closest("[data-note-delete]");
      if (!remove) return;
      const note = state.notes.find(function (item) { return item.id === remove.dataset.noteDelete; });
      if (note && note.text.trim() && !window.confirm("Eliminare questa nota da questo telefono?")) return;
      state.notes = state.notes.filter(function (item) { return item.id !== remove.dataset.noteDelete; });
      saveNotes();
      renderNotes();
      showToast("Nota eliminata");
    });
    renderNotes();
  }

  // ---- Pronta per il viaggio ----------------------------------------------

  function renderReadyStatus(text, tone) {
    const box = document.getElementById("readyStatus");
    box.textContent = text;
    box.dataset.tone = tone || "";
  }

  function setupReadyPanel() {
    const refresh = document.getElementById("readyRefreshButton");
    const tiles = document.getElementById("readyTilesButton");
    const tilesStatus = document.getElementById("readyTilesStatus");

    async function check() {
      if (!("caches" in window)) {
        renderReadyStatus("Questo browser non tiene una copia offline: la guida funzionerà solo con rete.", "warn");
        return;
      }
      const names = await caches.keys();
      const shell = names.find(function (name) { return name.indexOf("tabi-japan") === 0; });
      if (!shell) {
        renderReadyStatus("Copia offline non ancora creata. Tocca “Completa il download”.", "warn");
        return;
      }
      const entries = await (await caches.open(shell)).keys();
      const tileCache = names.find(function (name) { return name.indexOf("tabi-tiles") === 0; });
      const tileCount = tileCache ? (await (await caches.open(tileCache)).keys()).length : 0;
      renderReadyStatus("Guida, frasi, mappe delle tappe e schede sono sul telefono: " + entries.length
        + " file salvati e " + tileCount + " riquadri di mappa. Senza rete resta fuori solo il caricamento di foto nuove.", "ok");
    }

    refresh.addEventListener("click", async function () {
      refresh.disabled = true;
      renderReadyStatus("Scarico quello che manca…", "");
      localStorage.removeItem("tabi-cache-ready");
      const registration = await navigator.serviceWorker.ready.catch(function () { return null; });
      if (registration && registration.active) {
        registration.active.postMessage({ type: "tabi:reconcile", signature: registration.active.scriptURL });
        setTimeout(function () { refresh.disabled = false; check(); }, 2500);
      } else {
        refresh.disabled = false;
        renderReadyStatus("Copia offline non disponibile in questo browser.", "warn");
      }
    });

    // Pre-carica i riquadri di mappa attorno alle tappe: senza rete il resto del
    // Giappone resterà grigio, ma le città del viaggio no.
    tiles.addEventListener("click", async function () {
      if (!navigator.onLine) { tilesStatus.textContent = "Serve la rete: riprova quando sei connesso."; return; }
      tiles.disabled = true;
      const zooms = [11, 13, 14];
      const jobs = [];
      data.cities.forEach(function (city) {
        zooms.forEach(function (zoom) {
          const scale = Math.pow(2, zoom);
          const x = Math.floor(((city.lng + 180) / 360) * scale);
          const latRad = city.lat * Math.PI / 180;
          const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale);
          for (let dx = -1; dx <= 1; dx += 1) {
            for (let dy = -1; dy <= 1; dy += 1) {
              jobs.push("https://tile.openstreetmap.org/" + zoom + "/" + (x + dx) + "/" + (y + dy) + ".png");
            }
          }
        });
      });
      let loaded = 0;
      // Una richiesta alla volta con una pausa: le tile OSM sono un servizio
      // gratuito e non vanno martellate.
      for (const url of jobs) {
        try {
          await fetch(url, { mode: "no-cors" });
          loaded += 1;
        } catch (_) { /* si prosegue */ }
        tilesStatus.textContent = "Scarico le mappe: " + loaded + " di " + jobs.length + "…";
        await new Promise(function (resolve) { setTimeout(resolve, 90); });
      }
      tilesStatus.textContent = "Mappe delle tappe salvate (" + loaded + " riquadri). Zoom molto ravvicinati richiedono comunque la rete.";
      tiles.disabled = false;
      check();
    });

    check();
  }

  function setupLocalProfile() {
    const profile = readJSON("tabi-local-profile", { nickname: "", group: "" });
    const nickname = document.getElementById("localNickname");
    const group = document.getElementById("localGroup");
    nickname.value = profile.nickname || "";
    group.value = profile.group || "";
    document.getElementById("saveProfileButton").addEventListener("click", function () {
      localStorage.setItem("tabi-local-profile", JSON.stringify({ nickname: nickname.value.trim(), group: group.value.trim() }));
      showToast("Profilo del gruppo salvato");
    });
    document.getElementById("exportProgressButton").addEventListener("click", function () {
      const payload = {
        format: "tabi-checklist-v2",
        exportedAt: new Date().toISOString(),
        profile: readJSON("tabi-local-profile", {}),
        favorites: Array.from(state.favorites),
        done: Array.from(state.done)
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "tabi-checklist-gruppo.json";
      link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    });
    document.getElementById("importProgressInput").addEventListener("change", async function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const payload = JSON.parse(await file.text());
        if (!["tabi-checklist-v1", "tabi-checklist-v2"].includes(payload.format)) throw new Error("Formato non valido");
        (payload.favorites || []).filter(function (id) { return itemById[id]; }).forEach(function (id) { state.favorites.add(id); });
        (payload.done || []).filter(function (id) { return itemById[id]; }).forEach(function (id) { state.done.add(id); });
        saveState();
        updateProgress();
        renderPlaces();
        renderExperiences();
        renderFoods();
        renderShopping();
        renderHistory();
        renderSaved();
        showToast("Checklist del gruppo unita");
      } catch (_) {
        showToast("File checklist non riconosciuto");
      }
      event.target.value = "";
    });
  }

  function setupEmergencyLocation() {
    const button = document.getElementById("emergencyLocationButton");
    const output = document.getElementById("emergencyLocationOutput");
    button.addEventListener("click", function () {
      button.disabled = true;
      output.textContent = "Ricerca della posizione in corso…";
      requestPosition().then(function (position) {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        output.innerHTML = '<strong>' + latitude + ', ' + longitude + '</strong><span>Precisione circa ' + Math.round(position.coords.accuracy) + ' m</span><a href="https://www.google.com/maps/search/?api=1&amp;query=' + latitude + '%2C' + longitude + '" target="_blank" rel="noopener">Apri questo punto in Google Maps ↗</a>';
        button.disabled = false;
      }).catch(function (error) {
        output.textContent = error.message;
        button.disabled = false;
      });
    });
  }

  // Unico punto in cui si chiede la posizione: mappa, emergenze e "vicino a me"
  // passano tutti da qui. Il punto non viene mai salvato.
  function requestPosition(options) {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error("Posizione non supportata da questo dispositivo."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, function () {
        reject(new Error("Posizione non disponibile. Controlla il permesso del browser e riprova."));
      }, Object.assign({ enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }, options || {}));
    });
  }

  // Ogni punto "visit" della mappa porta un guideId verso la sua scheda: è il
  // solo posto in cui luoghi ed esperienze hanno delle coordinate.
  const coordsByGuideId = (function () {
    const index = {};
    ((window.JAPAN_MAP_DATA && window.JAPAN_MAP_DATA.points) || []).forEach(function (point) {
      if (point.guideId && !index[point.guideId]) index[point.guideId] = { lat: point.lat, lng: point.lng };
    });
    return index;
  })();

  function distanceInMeters(from, to) {
    const radius = 6371000;
    const toRad = Math.PI / 180;
    const dLat = (to.lat - from.lat) * toRad;
    const dLng = (to.lng - from.lng) * toRad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(from.lat * toRad) * Math.cos(to.lat * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(meters) {
    if (meters < 1000) return Math.round(meters / 10) * 10 + " m";
    return formatNumber(meters / 1000, meters < 10000 ? 1 : 0) + " km";
  }

  function sortByDistance(items) {
    if (!state.position) return items;
    const origin = state.position;
    return items.slice().sort(function (a, b) {
      const first = coordsByGuideId[a.id];
      const second = coordsByGuideId[b.id];
      if (!first && !second) return 0;
      if (!first) return 1;
      if (!second) return -1;
      return distanceInMeters(origin, first) - distanceInMeters(origin, second);
    });
  }

  function distanceLabel(item) {
    const coords = state.position && coordsByGuideId[item.id];
    return coords ? ' · ' + formatDistance(distanceInMeters(state.position, coords)) : "";
  }

  function setupNearby() {
    document.querySelectorAll("[data-nearby]").forEach(function (input) {
      const group = input.dataset.nearby;
      input.addEventListener("change", function () {
        if (!input.checked) {
          state.filters[group].nearby = false;
          renderGroup(group);
          updateFilterToggle(group);
          return;
        }
        input.disabled = true;
        requestPosition().then(function (position) {
          state.position = { lat: position.coords.latitude, lng: position.coords.longitude };
          state.filters[group].nearby = true;
          input.disabled = false;
          renderGroup(group);
          updateFilterToggle(group);
          showToast("Ordinati dal più vicino");
        }).catch(function (error) {
          input.checked = false;
          input.disabled = false;
          state.filters[group].nearby = false;
          showToast(error.message);
        });
      });
    });
  }

  function setupExperienceVideos() {
    const grid = document.getElementById("videoGuideGrid");
    if (!grid) return;
    grid.innerHTML = (data.videoGuides || []).map(function (video) {
      return '<a class="video-guide-card" href="' + escapeHTML(video.url) + '" target="_blank" rel="noopener"><span>▶</span><div><small>' + escapeHTML(video.author) + '</small><h3>' + escapeHTML(video.title) + '</h3><p>' + escapeHTML(video.note) + '</p></div></a>';
    }).join("");
  }

  function loadExternalScript(src) {
    const existing = document.querySelector('script[src="' + src + '"]');
    if (existing) return new Promise(function (resolve, reject) {
      if (window.Tesseract) return resolve();
      existing.addEventListener("load", resolve, { once:true });
      existing.addEventListener("error", reject, { once:true });
    });
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function setupPhotoTranslator() {
    const input = document.getElementById("translatePhotoInput");
    if (!input) return;
    const preview = document.getElementById("translatePhotoPreview");
    const readButton = document.getElementById("ocrReadButton");
    const shareButton = document.getElementById("ocrShareButton");
    const clearButton = document.getElementById("ocrClearButton");
    const output = document.getElementById("ocrOutput");
    const status = document.getElementById("ocrStatus");
    const translateLink = document.getElementById("ocrTranslateLink");

    function currentFile() {
      return input.files && input.files[0];
    }

    function canShareFile(file) {
      if (!navigator.share || !navigator.canShare) return false;
      try {
        return navigator.canShare({ files:[file] });
      } catch (_) {
        return false;
      }
    }

    function reset() {
      input.value = "";
      output.value = "";
      status.textContent = "Nessuna foto selezionata.";
      readButton.disabled = true;
      shareButton.hidden = true;
      translateLink.classList.add("is-disabled");
      translateLink.removeAttribute("href");
      preview.hidden = true;
      preview.removeAttribute("src");
      if (ocrPreviewUrl) URL.revokeObjectURL(ocrPreviewUrl);
      ocrPreviewUrl = "";
    }

    input.addEventListener("change", function () {
      const file = currentFile();
      if (!file) return reset();
      if (ocrPreviewUrl) URL.revokeObjectURL(ocrPreviewUrl);
      ocrPreviewUrl = URL.createObjectURL(file);
      preview.src = ocrPreviewUrl;
      preview.hidden = false;
      output.value = "";
      readButton.disabled = false;
      status.textContent = "Foto pronta. Il riconoscimento avviene sul dispositivo.";
      shareButton.hidden = !canShareFile(file);
      translateLink.classList.add("is-disabled");
      translateLink.removeAttribute("href");
    });

    readButton.addEventListener("click", async function () {
      const file = currentFile();
      if (!file) return;
      readButton.disabled = true;
      status.textContent = "Carico il lettore giapponese…";
      try {
        await loadExternalScript("https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/tesseract.min.js");
        if (!ocrWorker) {
          ocrWorker = await window.Tesseract.createWorker(["jpn", "eng"], 1, {
            logger: function (message) {
              if (Number.isFinite(message.progress)) status.textContent = "Lettura in corso: " + Math.round(message.progress * 100) + "%";
            }
          });
        }
        const result = await ocrWorker.recognize(file);
        const textResult = String(result.data && result.data.text || "").trim();
        output.value = textResult;
        if (!textResult) {
          status.textContent = "Non ho riconosciuto testo. Prova più vicino, dritto e con più luce.";
        } else {
          status.textContent = "Testo riconosciuto sul dispositivo. Controllalo prima di tradurre.";
          translateLink.href = "https://translate.google.com/?sl=ja&tl=it&text=" + encodeURIComponent(textResult.slice(0, 3500)) + "&op=translate";
          translateLink.classList.remove("is-disabled");
        }
      } catch (_) {
        status.textContent = "Lettore non disponibile. Puoi condividere la foto con Google Lens o l'app Traduci del telefono.";
      } finally {
        readButton.disabled = false;
      }
    });

    shareButton.addEventListener("click", async function () {
      const file = currentFile();
      if (!file || !navigator.share) return;
      try { await navigator.share({ files:[file], title:"Traduci questa foto" }); } catch (_) { /* Condivisione annullata. */ }
    });
    clearButton.addEventListener("click", reset);
    reset();
  }

  // La barra in basso si abbassa con uno scorrimento verso il basso, per
  // liberare lo schermo, e torna con uno verso l'alto. La maniglia sporge
  // sempre dal bordo, quindi resta anche il tocco per chi non usa i gesti, e la
  // scelta resta su questo telefono.
  function setupNavGestures() {
    const nav = document.getElementById("bottomNav");
    const grip = document.getElementById("navGrip");
    if (!nav || !grip) return;
    let collapsed = null;
    let startY = 0;
    let swiped = false;

    function setCollapsed(value, remember) {
      if (collapsed === value) return;
      collapsed = value;
      nav.classList.toggle("is-collapsed", value);
      grip.setAttribute("aria-expanded", String(!value));
      grip.setAttribute("aria-label", value ? "Mostra la barra di navigazione" : "Nascondi la barra di navigazione");
      if (remember !== false) localStorage.setItem("tabi-nav-hidden", value ? "1" : "0");
    }

    setCollapsed(localStorage.getItem("tabi-nav-hidden") === "1", false);

    nav.addEventListener("touchstart", function (event) {
      startY = event.touches[0].clientY;
      swiped = false;
    }, { passive: true });

    nav.addEventListener("touchmove", function (event) {
      const delta = event.touches[0].clientY - startY;
      if (Math.abs(delta) < 26) return;
      swiped = true;
      setCollapsed(delta > 0);
    }, { passive: true });

    // Il dito si stacca sopra un pulsante anche quando si voleva solo abbassare
    // la barra: senza questo, nascondendola si cambierebbe pure schermata.
    nav.addEventListener("touchend", function (event) {
      if (!swiped) return;
      event.preventDefault();
      swiped = false;
    }, { passive: false });

    grip.addEventListener("click", function () { setCollapsed(!collapsed); });
  }

  function showToast(message, undoLabel, onUndo) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.toggle("has-action", Boolean(undoLabel && onUndo));
    if (undoLabel && onUndo) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "toast-action";
      button.textContent = undoLabel;
      button.addEventListener("click", function () {
        toast.classList.remove("is-visible", "has-action");
        clearTimeout(toastTimer);
        onUndo();
      });
      toast.appendChild(button);
    }
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible", "has-action"); }, undoLabel ? 6000 : 1800);
  }

  function setupEvents() {
    document.addEventListener("click", function (event) {
      const navMenu = event.target.closest("[data-nav-menu]");
      if (navMenu) {
        openNavMenu(navMenu.dataset.navMenu);
        return;
      }
      const nav = event.target.closest("[data-nav], [data-go]");
      if (nav) {
        const view = nav.dataset.nav || nav.dataset.go;
        const panel = nav.closest("[data-nav-panel]");
        rememberMenuOrigin(view, panel && panel.dataset.navPanel);
        switchView(view);
        return;
      }
      const resetProgress = event.target.closest("[data-reset-progress]");
      if (resetProgress) {
        if (!window.confirm("Cancellare tutte le spunte di luoghi, esperienze, cibi, acquisti e storie su questo dispositivo? I preferiti resteranno salvati.")) return;
        state.done.clear();
        saveState();
        renderPlaces();
        renderExperiences();
        renderFoods();
        renderShopping();
        renderHistory();
        renderSaved();
        renderProgress();
        window.dispatchEvent(new CustomEvent("tabi:progressreset"));
        showToast("Tutti i progressi sono stati cancellati");
        return;
      }
      const route = event.target.closest("[data-city-route]");
      if (route) {
        state.filters.place.city = route.dataset.cityRoute;
        document.getElementById("placeCity").value = route.dataset.cityRoute;
        renderPlaces();
        updateFilterToggle("place");
        switchView("places");
        return;
      }
      const filterToggle = event.target.closest("[data-filter-toggle]");
      if (filterToggle) {
        const toolbar = document.querySelector('[data-filter-group="' + filterToggle.dataset.filterToggle + '"]');
        const open = toolbar.classList.toggle("filters-open");
        filterToggle.setAttribute("aria-expanded", String(open));
        return;
      }
      const filterReset = event.target.closest("[data-filter-reset]");
      if (filterReset) {
        resetFilters(filterReset.dataset.filterReset);
        return;
      }
      const mapFocus = event.target.closest("[data-map-focus]");
      if (mapFocus) {
        event.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.set("point", mapFocus.dataset.mapFocus);
        url.hash = "places";
        history.replaceState(null, "", url.pathname + url.search + url.hash);
        const dialog = document.getElementById("detailDialog");
        if (dialog.open) dialog.close();
        switchView("places", false);
        window.setTimeout(function () {
          if (window.TABI_MAP) window.TABI_MAP.focusPoint(mapFocus.dataset.mapFocus);
        }, 120);
        return;
      }
      const selectAll = event.target.closest("[data-select-all], [data-select-none]");
      if (selectAll) {
        setAllSelected(selectAll.hasAttribute("data-select-none"));
        return;
      }
      const viewSwitch = event.target.closest("[data-list-view]");
      if (viewSwitch) {
        setListView(viewSwitch.dataset.listView);
        return;
      }
      const action = event.target.closest("[data-action]");
      if (action) {
        if (action.dataset.action === "favorite") toggleFavorite(action.dataset.id);
        if (action.dataset.action === "done") toggleDone(action.dataset.id);
        if (action.dataset.action === "details") showDetails(action.dataset.id);
        if (action.dataset.action === "select") toggleSelected(action.dataset.id);
        return;
      }
      const chip = event.target.closest("[data-category]");
      if (chip) {
        state.filters.shop.category = chip.dataset.category;
        document.getElementById("shopCategory").value = chip.dataset.category;
        renderShopping();
        updateFilterToggle("shop");
        return;
      }
      const phraseChip = event.target.closest("[data-phrase-category]");
      if (phraseChip) {
        state.filters.phrase.category = phraseChip.dataset.phraseCategory;
        renderPhrases();
        return;
      }
      const speaker = event.target.closest("[data-speak]");
      if (speaker) {
        const phrase = data.phrases.find(function (item) { return item.id === speaker.dataset.speak; });
        if (phrase) speakJapanese(phrase.jp, phrase.meaning);
      }
    });
    window.addEventListener("popstate", function () {
      const leaving = state.currentView;
      const next = location.hash.slice(1) || "overview";
      switchView(next, false);
      if (next !== leaving) reopenMenuFor(leaving);
    });
    // Sulla home l'hash è vuoto ma la vista si chiama "overview": senza questo
    // confronto la schermata veniva ridisegnata due volte a ogni ritorno,
    // richiudendo al volo il menu appena riaperto.
    window.addEventListener("hashchange", function () {
      const view = location.hash.slice(1) || "overview";
      if (state.currentView !== view) switchView(view, false);
    });
    document.addEventListener("click", function (event) {
      if (!event.target.closest("[data-back]")) return;
      if (history.length > 1) history.back();
      else switchView(state.previousView || "overview");
    });
    document.querySelectorAll(".detail-dialog, .speech-dialog").forEach(function (element) {
      element.querySelector(".dialog-close").addEventListener("click", function () { element.close(); });
      element.addEventListener("click", function (event) { if (event.target === element) element.close(); });
    });
    const navDialog = document.getElementById("navMenuDialog");
    navDialog.querySelector(".nav-menu-close").addEventListener("click", function () { navDialog.close(); });
    navDialog.addEventListener("click", function (event) { if (event.target === navDialog) navDialog.close(); });
  }

  function setupInstall() {
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredInstallPrompt = event;
      document.getElementById("installButton").hidden = false;
    });
    document.getElementById("installButton").addEventListener("click", async function () {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      this.hidden = true;
    });
    if ("serviceWorker" in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js?v=20260804z", { updateViaCache: "none" }).then(function (registration) {
          registration.update();
        });
      });
    }
  }

  // La guida deve essere leggibile in aereo senza che nessuno si ricordi di
  // scaricarla: il service worker precarica tutto alla prima apertura e qui
  // controlliamo a ogni avvio che non manchi nulla. Nel caso normale il
  // controllo è un confronto di stringhe: nessuna richiesta, nessuna lettura
  // della cache. Il lavoro vero parte solo alla prima apertura, dopo un
  // aggiornamento o se il browser ha sfrattato dei file per far spazio.
  function setupOfflineReadiness() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.addEventListener("message", function (event) {
      const data = event.data;
      if (!data || data.type !== "tabi:reconciled") return;
      if (data.report.failed) return;
      localStorage.setItem("tabi-cache-ready", data.report.signature);
      if (data.report.restored) showToast("Guida completa disponibile offline");
    });
    navigator.serviceWorker.ready.then(function (registration) {
      const worker = registration.active;
      if (!worker) return;
      if (localStorage.getItem("tabi-cache-ready") === worker.scriptURL) return;
      worker.postMessage({ type: "tabi:reconcile", signature: worker.scriptURL });
    });
  }

  function setupConnectionBanner() {
    const banner = document.getElementById("offlineBanner");
    function sync() {
      const offline = navigator.onLine === false;
      banner.hidden = !offline;
      document.body.classList.toggle("is-offline", offline);
    }
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
  }

  function init() {
    setupImages();
    setupFilters();
    setupBackButtons();
    setupSpeech();
    setupRoute();
    setupCurrentCity();
    setupCategoryRail();
    setupPhrasebook();
    setupExperienceVideos();
    setupPhotoTranslator();
    setupEmergencyLocation();
    setupEvents();
    setupNavGestures();
    setupInstall();
    setupOfflineReadiness();
    setupConnectionBanner();
    setupRateField();
    setupQuickRate();
    setupGlobalSearch();
    setupNearby();
    setupPacking();
    setupNotes();
    setupReadyPanel();
    renderPlaces();
    renderExperiences();
    renderFoods();
    renderShopping();
    renderHistory();
    renderPhrases();
    updateProgress();
    setupLocalProfile();
    switchView(location.hash.slice(1) || "overview", false);
    const requestedPoint = location.hash === "#places" && new URLSearchParams(location.search).get("point");
    if (requestedPoint) window.setTimeout(function () {
      if (window.TABI_MAP) window.TABI_MAP.focusPoint(requestedPoint);
    }, 180);
  }

  init();
})();
