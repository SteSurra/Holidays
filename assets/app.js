(function () {
  "use strict";

  const data = window.JAPAN_DATA;
  const cityById = Object.fromEntries(data.cities.map(function (city) { return [city.id, city]; }));
  const itemById = Object.fromEntries([].concat(data.places, data.foods, data.shopping).map(function (item) { return [item.id, item]; }));
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
      shop: { search: "", city: "all", category: "all" }
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
    document.getElementById("placeCategory").innerHTML = categoryOptions(data.labels.placeCategories, "Tutte le categorie");
    document.getElementById("foodCategory").innerHTML = categoryOptions(data.labels.foodCategories, "Tutte le portate");
    document.getElementById("shopCategory").innerHTML = categoryOptions(data.labels.shopCategories, "Tutte le categorie");

    bindFilter("placeSearch", "place", "search", "input");
    bindFilter("placeCity", "place", "city", "change");
    bindFilter("placeCategory", "place", "category", "change");
    bindFilter("foodSearch", "food", "search", "input");
    bindFilter("foodCity", "food", "city", "change");
    bindFilter("foodCategory", "food", "category", "change");
    bindFilter("shopSearch", "shop", "search", "input");
    bindFilter("shopCity", "shop", "city", "change");
    bindFilter("shopCategory", "shop", "category", "change");
    document.getElementById("foodLocal").addEventListener("change", function (event) {
      state.filters.food.local = event.target.checked;
      renderFoods();
    });
  }

  function bindFilter(elementId, group, field, eventName) {
    document.getElementById(elementId).addEventListener(eventName, function (event) {
      state.filters[group][field] = event.target.value;
      renderGroup(group);
    });
  }

  function matches(item, filters) {
    const haystack = normalize([item.name, item.jp, item.description, item.context, item.area, item.where, cityName(item.city)].join(" "));
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
    return '<div class="card-footer">'
      + '<button class="done-button ' + (done ? "is-done" : "") + '" type="button" data-action="done" data-id="' + item.id + '">' + (done ? "✓ " + labels[0] : labels[1]) + '</button>'
      + '<button type="button" data-action="details" data-id="' + item.id + '">Dettagli ↗</button>'
      + '</div>';
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
  }

  function setupRoute() {
    document.getElementById("routeStrip").innerHTML = data.cities.map(function (city) {
      return '<button class="route-stop" type="button" data-city-route="' + city.id + '"><span class="stop-index">TAPPA ' + String(city.order).padStart(2, "0") + '</span><b>' + escapeHTML(city.name) + ' ' + escapeHTML(city.jp) + '</b><small>' + escapeHTML(city.summary) + '</small></button>';
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
    if (item.type === "place") {
      details = detailCells([["Categoria", data.labels.placeCategories[item.category]], ["Zona", item.area], ["Tempo", item.duration], ["Quando", item.tip]]);
    } else if (item.type === "food") {
      details = detailCells([["Portata", data.labels.foodCategories[item.category]], ["Contesto", item.context], ["Gradimento", "★ " + item.rating.toFixed(1) + " / 5"], ["Selezione", item.local ? "Scoperta locale" : "Grande classico"]]);
    } else {
      details = detailCells([["Categoria", data.labels.shopCategories[item.category]], ["Dove cercarlo", item.where], ["Prezzo", item.price], ["Consiglio", item.tip]]);
    }
    const mapLink = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.name + " " + cityName(item.city) + " Japan");
    document.getElementById("dialogContent").innerHTML =
      '<img class="dialog-hero" src="' + escapeHTML(imageUrl || fallbackByType[item.type]) + '" alt="' + escapeHTML(item.name) + '">'
      + '<div class="dialog-body"><p class="eyebrow">' + escapeHTML(cityName(item.city)) + '</p>'
      + '<h2>' + escapeHTML(item.name) + ' <span class="jp-name">' + escapeHTML(item.jp) + '</span></h2>'
      + '<p>' + escapeHTML(item.description) + '</p>' + details
      + '<div class="hero-actions"><a class="primary-action" href="' + mapLink + '" target="_blank" rel="noopener">Apri in Maps</a></div></div>';
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
        switchView("places");
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
      window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js"); });
    }
  }

  function init() {
    document.getElementById("placeCount").textContent = data.places.length;
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
    updateProgress();
    switchView(location.hash.slice(1) || "overview", false);
  }

  init();
})();
