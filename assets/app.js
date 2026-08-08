(function () {
  "use strict";

  const data = window.JAPAN_DATA;
  const cityById = Object.fromEntries(data.cities.map(function (city) { return [city.id, city]; }));
  const itemById = Object.fromEntries([].concat(data.places, data.mapPlaces || [], data.foods, data.shopping, data.history).map(function (item) { return [item.id, item]; }));
  const fallbackByType = {
    place: "assets/fallback-place.svg",
    food: "assets/fallback-food.svg",
    shop: "assets/fallback-shop.svg"
  };
  const state = {
    favorites: new Set(readJSON("tabi-favorites", [])),
    done: new Set(readJSON("tabi-done", [])),
    imageCache: readJSON("tabi-image-cache-v1", {}),
    filters: {
      place: { search: "", city: "all", category: "all" },
      food: { search: "", city: "all", category: "all", local: false },
      shop: { search: "", city: "all", category: "all" },
      history: { search: "", city: "all", category: "all" }
    }
  };
  let imageObserver;
  let imageQueueActive = 0;
  const imageQueue = [];
  let deferredInstallPrompt;
  let toastTimer;

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; }
  }

  function saveState() {
    localStorage.setItem("tabi-favorites", JSON.stringify(Array.from(state.favorites)));
    localStorage.setItem("tabi-done", JSON.stringify(Array.from(state.done)));
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
    document.getElementById("foodCity").innerHTML = cityOptions(false);
    document.getElementById("shopCity").innerHTML = cityOptions(true);
    document.getElementById("historyCity").innerHTML = cityOptions(false);
    document.getElementById("placeCategory").innerHTML = categoryOptions(data.labels.placeCategories, "Tutte le categorie");
    document.getElementById("foodCategory").innerHTML = categoryOptions(data.labels.foodCategories, "Tutte le portate");
    document.getElementById("shopCategory").innerHTML = categoryOptions(data.labels.shopCategories, "Tutte le categorie");
    document.getElementById("historyCategory").innerHTML = categoryOptions(data.labels.historyCategories, "Tutti gli argomenti");

    bindFilter("placeSearch", "place", "search", "input");
    bindFilter("placeCity", "place", "city", "change");
    bindFilter("placeCategory", "place", "category", "change");
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
    ["place", "food", "shop", "history"].forEach(updateFilterToggle);
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
    const count = (filters.city !== "all" ? 1 : 0) + (filters.category !== "all" ? 1 : 0) + (filters.local ? 1 : 0);
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
    const ids = {
      place: ["placeCity", "placeCategory"],
      food: ["foodCity", "foodCategory"],
      shop: ["shopCity", "shopCategory"],
      history: ["historyCity", "historyCategory"]
    };
    ids[group].forEach(function (id) { document.getElementById(id).value = "all"; });
    if (group === "food") document.getElementById("foodLocal").checked = false;
    renderGroup(group);
    updateFilterToggle(group);
  }

  function matches(item, filters) {
    const guideText = (item.guideSections || []).map(function (section) { return section.title + " " + section.body; }).join(" ");
    const haystack = normalize([item.name, item.jp, item.description, item.longDescription, item.context, item.area, item.where, item.title, item.explanation, item.anecdote, guideText, cityName(item.city)].join(" "));
    const cityMatch = filters.city === "all"
      || (filters.city === "all-japan" && item.city === "all")
      || item.city === filters.city
      || (item.type === "shop" && item.city === "all" && filters.city !== "all-japan");
    return (!filters.search || haystack.includes(normalize(filters.search)))
      && cityMatch
      && (filters.category === "all" || item.category === filters.category)
      && (!filters.local || item.local);
  }

  function cardImage(item) {
    return '<div class="card-media">'
      + '<div class="image-shimmer"></div>'
      + '<img class="lazy-remote-image" src="' + fallbackByType[item.type] + '" data-query="' + escapeHTML(item.imageQuery) + '" data-type="' + item.type + '" alt="' + escapeHTML(item.name) + '" loading="lazy" decoding="async">'
      + '<span class="media-badge">' + escapeHTML(cityName(item.city)) + '</span>'
      + '</div>';
  }

  function actionButtons(item) {
    const favorite = state.favorites.has(item.id);
    return '<div class="card-actions"><button class="icon-button favorite-button ' + (favorite ? "is-active" : "") + '" type="button" data-action="favorite" data-id="' + item.id + '" aria-label="' + (favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti") + '">' + (favorite ? "♥" : "♡") + '</button></div>';
  }

  function footer(item) {
    const done = state.done.has(item.id);
    const labels = item.type === "place" ? ["Visitato", "Segna visitato"] : item.type === "food" ? ["Provato", "Segna provato"] : ["Comprato", "Segna comprato"];
    const maps = item.type === "place" ? '<a href="' + mapsUrl(item) + '" target="_blank" rel="noopener">Maps ↗</a>' : '';
    return '<div class="card-footer">'
      + '<button class="done-button ' + (done ? "is-done" : "") + '" type="button" data-action="done" data-id="' + item.id + '">' + (done ? "✓ " + labels[0] : labels[1]) + '</button>'
      + maps
      + '<button type="button" data-action="details" data-id="' + item.id + '">Dettagli ↗</button>'
      + '</div>';
  }

  function mapsUrl(item) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.name + " " + cityName(item.city) + " Japan");
  }

  function placeCard(item) {
    return '<article class="content-card" data-card-id="' + item.id + '">' + actionButtons(item) + cardImage(item)
      + '<div class="card-body"><div class="card-kicker"><span>' + escapeHTML(data.labels.placeCategories[item.category]) + '</span><span>' + escapeHTML(item.duration) + '</span></div>'
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
      + '<div><div class="card-kicker"><span>' + escapeHTML(cityName(item.city)) + '</span><span>' + escapeHTML(data.labels.historyCategories[item.category]) + '</span></div>'
      + '<h2>' + escapeHTML(item.title) + '</h2><p>' + escapeHTML(item.explanation) + '</p></div>'
      + '<div><p class="anecdote"><strong>Da ricordare:</strong> ' + escapeHTML(item.anecdote) + '</p>'
      + '<div class="history-card-footer"><button type="button" data-action="details" data-id="' + item.id + '">Approfondisci ↗</button></div></div></article>';
  }

  function renderPlaces() {
    const items = data.places.filter(function (item) { return matches(item, state.filters.place); });
    renderCards("placeGrid", "placeMeta", "placeEmpty", items, placeCard, "luoghi");
  }

  function renderFoods() {
    const items = data.foods.filter(function (item) { return matches(item, state.filters.food); });
    renderCards("foodGrid", "foodMeta", "foodEmpty", items, foodCard, "specialità");
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

  function renderCards(gridId, metaId, emptyId, items, renderer, noun) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = items.map(renderer).join("");
    document.getElementById(metaId).textContent = items.length + " " + noun;
    document.getElementById(emptyId).hidden = items.length !== 0;
    observeImages(grid);
  }

  function renderGroup(group) {
    if (group === "place") renderPlaces();
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
        image.src = fallbackByType[image.dataset.type];
      });
      imageObserver.observe(image);
    });
  }

  function enqueueImage(image) {
    imageQueue.push(image);
    drainImageQueue();
  }

  function drainImageQueue() {
    while (imageQueueActive < 3 && imageQueue.length) {
      const image = imageQueue.shift();
      imageQueueActive += 1;
      resolveImage(image.dataset.query).then(function (url) {
        if (url && image.isConnected) {
          image.dataset.resolved = url;
          image.src = url;
        }
      }).finally(function () {
        imageQueueActive -= 1;
        drainImageQueue();
      });
    }
  }

  async function resolveImage(query) {
    if (state.imageCache[query]) return state.imageCache[query];
    if (!navigator.onLine) return "";
    const params = new URLSearchParams({
      action: "query", generator: "search", gsrsearch: query + " filetype:bitmap",
      gsrnamespace: "6", gsrlimit: "5", prop: "imageinfo", iiprop: "url",
      iiurlwidth: "900", format: "json", origin: "*"
    });
    try {
      const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params.toString(), { mode: "cors" });
      if (!response.ok) return "";
      const payload = await response.json();
      const pages = Object.values((payload.query && payload.query.pages) || {});
      const page = pages.find(function (candidate) {
        const info = candidate.imageinfo && candidate.imageinfo[0];
        return info && (info.thumburl || info.url);
      });
      if (!page) return "";
      const info = page.imageinfo[0];
      const url = info.thumburl || info.url;
      state.imageCache[query] = url;
      const keys = Object.keys(state.imageCache);
      if (keys.length > 320) delete state.imageCache[keys[0]];
      localStorage.setItem("tabi-image-cache-v1", JSON.stringify(state.imageCache));
      return url;
    } catch (_) {
      return "";
    }
  }

  function switchView(view, updateHash) {
    if (!document.querySelector('[data-view="' + view + '"]')) view = "overview";
    document.querySelectorAll(".view").forEach(function (section) {
      section.classList.toggle("is-active", section.dataset.view === view);
    });
    document.querySelectorAll("[data-nav]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.nav === view);
    });
    if (view === "saved") renderSaved();
    if (updateHash !== false) history.replaceState(null, "", "#" + view);
    window.scrollTo({ top: 0, behavior: "auto" });
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
      showToast(item.type === "place" ? "Segnato come visitato" : item.type === "food" ? "Segnato come provato" : "Segnato come comprato");
    }
    saveState();
    refreshCardState(id);
    updateProgress();
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
        const labels = item.type === "place" ? ["Visitato", "Segna visitato"] : item.type === "food" ? ["Provato", "Segna provato"] : ["Comprato", "Segna comprato"];
        done.classList.toggle("is-done", state.done.has(id));
        done.textContent = state.done.has(id) ? "✓ " + labels[0] : labels[1];
      }
    });
  }

  function showDetails(id) {
    const item = itemById[id];
    if (!item) return;
    const cardImageElement = document.querySelector('[data-card-id="' + id + '"] img');
    const imageUrl = cardImageElement && (cardImageElement.dataset.resolved || cardImageElement.src);
    let details = "";
    let hero = "";
    let actions = "";
    if (item.type === "place") {
      details = detailCells([["Categoria", data.labels.placeCategories[item.category]], ["Zona", item.area], ["Tempo", item.duration], ["Quando", item.tip]]);
      actions = '<div class="hero-actions"><a class="primary-action" href="' + mapsUrl(item) + '" target="_blank" rel="noopener">Apri in Maps</a></div>';
    } else if (item.type === "food") {
      details = detailCells([["Portata", data.labels.foodCategories[item.category]], ["Contesto", item.context], ["Gradimento", "★ " + item.rating.toFixed(1) + " / 5"], ["Selezione", item.local ? "Scoperta locale" : "Grande classico"]]);
    } else if (item.type === "history") {
      details = detailCells([["Città", cityName(item.city)], ["Argomento", data.labels.historyCategories[item.category]]]);
    } else {
      details = detailCells([["Categoria", data.labels.shopCategories[item.category]], ["Dove cercarlo", item.where], ["Prezzo", item.price], ["Consiglio", item.tip]]);
    }
    if (item.type === "history") {
      hero = '<div class="history-detail-hero" aria-hidden="true"><span>' + escapeHTML(item.kanji) + '</span><small>' + escapeHTML(cityName(item.city)) + '</small></div>';
    } else {
      hero = '<img class="dialog-hero" src="' + escapeHTML(imageUrl || fallbackByType[item.type]) + '" alt="' + escapeHTML(item.name) + '">';
    }
    const sections = (item.guideSections || []).map(function (section, index) {
      return '<section class="guide-section' + (index === 0 ? ' guide-section-lead' : '') + (section.fun ? ' guide-section-fun' : '') + '"><span>' + String(index + 1).padStart(2, "0") + '</span><div><h3>' + escapeHTML(section.title) + '</h3><p>' + escapeHTML(section.body) + '</p></div></section>';
    }).join("");
    document.getElementById("dialogContent").innerHTML =
      hero
      + '<div class="dialog-body"><p class="eyebrow">' + escapeHTML(cityName(item.city)) + '</p>'
      + '<h2>' + escapeHTML(item.name) + ' <span class="jp-name">' + escapeHTML(item.jp) + '</span></h2>'
      + '<p class="guide-intro">' + escapeHTML(item.longDescription || item.description) + '</p>' + details
      + (sections ? '<div class="guide-sections">' + sections + '</div>' : '')
      + actions + '</div>';
    document.getElementById("detailDialog").showModal();
  }

  function detailCells(entries) {
    return '<div class="detail-list">' + entries.map(function (entry) {
      return '<div><b>' + escapeHTML(entry[0]) + '</b><span>' + escapeHTML(entry[1]) + '</span></div>';
    }).join("") + '</div>';
  }

  function renderSaved() {
    const favoriteItems = Array.from(state.favorites).map(function (id) { return itemById[id]; }).filter(Boolean);
    const doneItems = Array.from(state.done).map(function (id) { return itemById[id]; }).filter(Boolean);
    const counts = ["place", "food", "shop"].map(function (type) {
      return favoriteItems.filter(function (item) { return item.type === type; }).length;
    });
    document.getElementById("savedSummary").innerHTML = [
      ["Luoghi salvati", counts[0]], ["Cibi salvati", counts[1]], ["Acquisti salvati", counts[2]]
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
        return '<article class="saved-row"><div><b>' + escapeHTML(item.name) + '</b><small>' + escapeHTML(cityName(item.city)) + ' · ' + (item.type === "place" ? "Luogo" : item.type === "food" ? "Cibo" : "Acquisto") + '</small></div><button type="button" data-action="' + group[2] + '" data-id="' + item.id + '" aria-label="Rimuovi">×</button></article>';
      }).join("") + '</div></section>';
    }).join("");
  }

  function updateProgress() {
    const total = data.places.length + data.foods.length + data.shopping.length;
    const percent = Math.round((state.done.size / total) * 100);
    document.getElementById("progressText").textContent = percent + "% vissuto";
    document.getElementById("progressBar").style.width = percent + "%";
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
        format: "tabi-checklist-v1",
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
        if (payload.format !== "tabi-checklist-v1") throw new Error("Formato non valido");
        (payload.favorites || []).filter(function (id) { return itemById[id]; }).forEach(function (id) { state.favorites.add(id); });
        (payload.done || []).filter(function (id) { return itemById[id]; }).forEach(function (id) { state.done.add(id); });
        saveState();
        updateProgress();
        renderPlaces();
        renderFoods();
        renderShopping();
        renderSaved();
        showToast("Checklist del gruppo unita");
      } catch (_) {
        showToast("File checklist non riconosciuto");
      }
      event.target.value = "";
    });
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 1800);
  }

  function setupEvents() {
    document.addEventListener("click", function (event) {
      const nav = event.target.closest("[data-nav], [data-go]");
      if (nav) {
        switchView(nav.dataset.nav || nav.dataset.go);
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
      const action = event.target.closest("[data-action]");
      if (action) {
        if (action.dataset.action === "favorite") toggleFavorite(action.dataset.id);
        if (action.dataset.action === "done") toggleDone(action.dataset.id);
        if (action.dataset.action === "details") showDetails(action.dataset.id);
        return;
      }
      const chip = event.target.closest("[data-category]");
      if (chip) {
        state.filters.shop.category = chip.dataset.category;
        document.getElementById("shopCategory").value = chip.dataset.category;
        renderShopping();
        updateFilterToggle("shop");
      }
    });
    window.addEventListener("hashchange", function () { switchView(location.hash.slice(1), false); });
    const dialog = document.getElementById("detailDialog");
    document.querySelector(".dialog-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
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
        navigator.serviceWorker.register("sw.js?v=20260801b", { updateViaCache: "none" }).then(function (registration) {
          registration.update();
        });
      });
    }
  }

  function init() {
    document.getElementById("placeCount").textContent = window.JAPAN_MAP_DATA.points.filter(function (point) { return point.type === "visit"; }).length;
    document.getElementById("foodCount").textContent = data.foods.length;
    document.getElementById("shopCount").textContent = data.shopping.length;
    setupImages();
    setupFilters();
    setupRoute();
    setupCategoryRail();
    setupEvents();
    setupInstall();
    renderPlaces();
    renderFoods();
    renderShopping();
    renderHistory();
    updateProgress();
    setupLocalProfile();
    switchView(location.hash.slice(1) || "overview", false);
  }

  init();
})();
