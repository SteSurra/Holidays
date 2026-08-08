(function () {
  "use strict";

  // I documenti del viaggio — biglietti, QR, conferme — vivono in IndexedDB:
  // localStorage tiene ~5 MB ed è già occupato dallo stato dell'app, mentre
  // qui passano foto e PDF. Tutto resta sul dispositivo: nessun file viene
  // caricato in rete, mai. La schermata si costruisce alla prima apertura,
  // come le altre (si ascolta tabi:viewchange, stesso schema della mappa).

  const DB_NAME = "tabi-documents";
  const STORE = "documents";

  // Categorie fisse da viaggio, non cartelle libere: al tornello si cerca "il
  // QR del museo", non si naviga un albero. L'ordine è quello d'uso.
  const CATEGORIES = [
    { id: "ingressi", label: "Ingressi", hint: "musei, attività, QR d'ingresso" },
    { id: "trasporti", label: "Trasporti", hint: "biglietti e prenotazioni di treni e bus" },
    { id: "alloggi", label: "Alloggi", hint: "conferme degli hotel" },
    { id: "personali", label: "Documenti personali", hint: "assicurazione, tessere, copie utili" },
    { id: "altro", label: "Altro", hint: "" }
  ];

  let db = null;
  let records = null;
  let ready = false;
  let filterText = "";
  let objectUrls = [];
  let persistAsked = false;
  // Survives search/category re-renders so an open row stays open.
  let expandedId = null;

  function openDb() {
    return new Promise(function (resolve, reject) {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  // Il backup legge i documenti anche se questa schermata non è mai stata
  // aperta: l'apertura del database non può più dipendere da init().
  function ensureDb() {
    if (db) return Promise.resolve(db);
    if (!window.indexedDB) return Promise.reject(new Error("IndexedDB non disponibile"));
    return openDb().then(function (database) {
      db = database;
      return db;
    });
  }

  function tx(mode, run) {
    return new Promise(function (resolve, reject) {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      const request = run(store);
      transaction.oncomplete = function () { resolve(request && request.result); };
      transaction.onerror = function () { reject(transaction.error); };
      transaction.onabort = function () { reject(transaction.error); };
    });
  }

  function loadAll() {
    return tx("readonly", function (store) { return store.getAll(); }).then(function (rows) {
      records = (rows || []).sort(function (a, b) { return b.addedAt - a.addedAt; });
    });
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function toast(message, label, action) {
    if (window.TABI_UI) window.TABI_UI.toast(message, label, action);
  }

  function byId(id) { return document.getElementById(id); }

  // Il nome proposto è il nome del file ripulito: "IMG_2041.jpeg" non aiuta
  // nessuno, ma "biglietto-teamlab.pdf" sì, quindi si tolgono solo estensione
  // e trattini e si lascia correggere nel campo sulla scheda.
  function suggestName(fileName) {
    return String(fileName || "Documento").replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim() || "Documento";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "";
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0) + " MB";
  }

  function updateUsage() {
    const box = byId("documentsUsage");
    if (!box || !navigator.storage || !navigator.storage.estimate) return;
    navigator.storage.estimate().then(function (estimate) {
      if (estimate && Number.isFinite(estimate.usage)) {
        box.textContent = "Spazio usato dall'app su questo telefono: " + formatBytes(estimate.usage) + ".";
      }
    }).catch(function () { /* stima non disponibile: la riga resta com'è */ });
  }

  // Lo storage persistente evita che il browser sfratti i biglietti per far
  // spazio: si chiede una volta sola, al primo documento vero.
  function askPersistence() {
    if (persistAsked || !navigator.storage || !navigator.storage.persist) return;
    persistAsked = true;
    navigator.storage.persist().catch(function () { /* facoltativo */ });
  }

  function matchesFilter(record) {
    if (!filterText) return true;
    return record.name.toLowerCase().indexOf(filterText) !== -1;
  }

  function categoryLabel(id) {
    const match = CATEGORIES.find(function (category) { return category.id === id; });
    return match ? match.label : "Altro";
  }

  function rowMeta(record) {
    const kind = /^image\//.test(record.type) ? formatBytes(record.size) : "PDF";
    return categoryLabel(record.category) + " · " + kind;
  }

  function documentPanelHTML(record, url) {
    const isImage = /^image\//.test(record.type);
    const preview = isImage
      ? '<button class="document-thumb" type="button" data-document-open="' + escapeHTML(record.id) + '" aria-label="Apri a schermo pieno: ' + escapeHTML(record.name) + '"><img src="' + url + '" alt=""></button>'
      : '<button class="document-thumb is-file" type="button" data-document-open="' + escapeHTML(record.id) + '" aria-label="Apri il PDF: ' + escapeHTML(record.name) + '"><span aria-hidden="true">📄</span><small>PDF</small></button>';
    const options = CATEGORIES.map(function (category) {
      return '<option value="' + category.id + '"' + (record.category === category.id ? " selected" : "") + '>' + category.label + '</option>';
    }).join("");
    return '<div class="document-card">'
      + preview
      + '<div class="document-fields">'
      + '<input class="document-name" type="text" value="' + escapeHTML(record.name) + '" data-document-name="' + escapeHTML(record.id) + '" aria-label="Nome del documento">'
      + '<label class="document-category"><span class="visually-hidden">Categoria</span><select data-document-category="' + escapeHTML(record.id) + '">' + options + '</select></label>'
      + '<div class="document-foot"><small>' + escapeHTML(formatBytes(record.size)) + '</small></div>'
      + '</div></div>';
  }

  function rowHTML(record) {
    return '<article class="document-row" data-document="' + escapeHTML(record.id) + '">'
      + '<button class="document-open" type="button" data-document-toggle="' + escapeHTML(record.id) + '" aria-expanded="false">'
      + '<span><b>' + escapeHTML(record.name) + '</b><small>' + escapeHTML(rowMeta(record)) + '</small></span>'
      + '<i aria-hidden="true">▾</i></button>'
      + '<button type="button" class="document-delete" data-document-delete="' + escapeHTML(record.id) + '" aria-label="Elimina ' + escapeHTML(record.name) + '">×</button>'
      + '<div class="document-panel" hidden></div></article>';
  }

  function toggleDocumentRow(id, button) {
    const row = button.closest(".document-row");
    const panel = row && row.querySelector(".document-panel");
    const record = findRecord(id);
    if (!panel || !record) return;
    const open = panel.hidden;
    if (open && !panel.dataset.ready) {
      const url = URL.createObjectURL(record.blob);
      objectUrls.push(url);
      panel.innerHTML = documentPanelHTML(record, url);
      panel.dataset.ready = "true";
    }
    panel.hidden = !open;
    row.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    expandedId = open ? id : (expandedId === id ? null : expandedId);
  }

  function expandDocumentRow(id) {
    const groupsBox = byId("documentsGroups");
    const button = groupsBox && groupsBox.querySelector('[data-document-toggle="' + id + '"]');
    if (!button) {
      expandedId = null;
      return;
    }
    const row = button.closest(".document-row");
    const panel = row && row.querySelector(".document-panel");
    const record = findRecord(id);
    if (!panel || !record || !panel.hidden) return;
    const url = URL.createObjectURL(record.blob);
    objectUrls.push(url);
    panel.innerHTML = documentPanelHTML(record, url);
    panel.dataset.ready = "true";
    panel.hidden = false;
    row.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
  }

  function render() {
    const groupsBox = byId("documentsGroups");
    if (!groupsBox || !records) return;
    // Gli object URL della passata precedente si revocano: ogni render ne
    // crea di nuovi e i vecchi terrebbero i blob vivi in memoria.
    objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    objectUrls = [];
    const visible = records.filter(matchesFilter);
    groupsBox.innerHTML = CATEGORIES.map(function (category) {
      const items = visible.filter(function (record) { return record.category === category.id; });
      if (!items.length) return "";
      const rows = items.map(function (record) { return rowHTML(record); }).join("");
      return '<section class="document-group"><div class="packing-group-head"><h2>' + category.label + '</h2><span>' + items.length + '</span></div>'
        + (category.hint ? '<p class="packing-group-note">' + escapeHTML(category.hint) + '</p>' : "")
        + '<div class="document-list">' + rows + '</div></section>';
    }).join("");
    byId("documentsEmpty").hidden = records.length !== 0;
    const status = byId("documentsStatus");
    if (filterText && !visible.length && records.length) status.textContent = "Nessun documento con questo nome.";
    else if (records.length) status.textContent = records.length + (records.length === 1 ? " documento salvato" : " documenti salvati") + " su questo telefono.";
    else status.textContent = "";
    if (expandedId) expandDocumentRow(expandedId);
    updateUsage();
  }

  function findRecord(id) {
    return (records || []).find(function (record) { return record.id === id; });
  }

  function addFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    const added = list.map(function (file) {
      return {
        id: "doc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
        name: suggestName(file.name),
        category: "altro",
        type: file.type || "application/octet-stream",
        size: file.size,
        addedAt: Date.now(),
        blob: file
      };
    });
    Promise.all(added.map(function (record) {
      return tx("readwrite", function (store) { return store.put(record); });
    })).then(function () {
      records = added.concat(records);
      askPersistence();
      render();
      toast(added.length === 1 ? "Documento salvato sul telefono" : added.length + " documenti salvati sul telefono");
    }).catch(function () {
      toast("Non sono riuscito a salvare: spazio esaurito o archivio non disponibile.");
    });
  }

  function saveRecord(record) {
    return tx("readwrite", function (store) { return store.put(record); });
  }

  function deleteRecord(id) {
    const record = findRecord(id);
    if (!record) return;
    tx("readwrite", function (store) { return store.delete(id); }).then(function () {
      records = records.filter(function (row) { return row.id !== id; });
      if (expandedId === id) expandedId = null;
      render();
      // Annullabile: il record resta in mano al toast finché non scade.
      toast("Documento eliminato", "Annulla", function () {
        saveRecord(record).then(function () {
          records.unshift(record);
          records.sort(function (a, b) { return b.addedAt - a.addedAt; });
          render();
        });
      });
    });
  }

  function openViewer(id) {
    const record = findRecord(id);
    if (!record) return;
    if (!/^image\//.test(record.type)) {
      // Un PDF si apre da solo in una scheda: il visore a schermo pieno è
      // pensato per i QR, che vanno mostrati grandi a un lettore ottico.
      const url = URL.createObjectURL(record.blob);
      objectUrls.push(url);
      window.open(url, "_blank", "noopener");
      return;
    }
    const dialog = byId("documentViewerDialog");
    const image = byId("documentViewerImage");
    const title = byId("documentViewerTitle");
    const url = URL.createObjectURL(record.blob);
    objectUrls.push(url);
    image.src = url;
    image.alt = record.name;
    title.textContent = record.name;
    dialog.showModal();
  }

  let nameTimer = null;

  function bindEvents() {
    byId("documentFileInput").addEventListener("change", function (event) {
      addFiles(event.target.files);
      event.target.value = "";
    });
    byId("documentFilter").addEventListener("input", function (event) {
      filterText = event.target.value.trim().toLowerCase();
      render();
    });
    const groups = byId("documentsGroups");
    groups.addEventListener("input", function (event) {
      const field = event.target.closest("[data-document-name]");
      if (!field) return;
      const record = findRecord(field.dataset.documentName);
      if (!record) return;
      record.name = field.value.trim() || "Documento";
      const row = field.closest(".document-row");
      const title = row && row.querySelector(".document-open b");
      if (title) title.textContent = record.name;
      clearTimeout(nameTimer);
      nameTimer = setTimeout(function () { saveRecord(record); }, 400);
    });
    groups.addEventListener("change", function (event) {
      const select = event.target.closest("[data-document-category]");
      if (!select) return;
      const record = findRecord(select.dataset.documentCategory);
      if (!record) return;
      record.category = select.value;
      saveRecord(record).then(render);
    });
    groups.addEventListener("click", function (event) {
      const toggle = event.target.closest("[data-document-toggle]");
      if (toggle) return void toggleDocumentRow(toggle.dataset.documentToggle, toggle);
      const open = event.target.closest("[data-document-open]");
      if (open) return void openViewer(open.dataset.documentOpen);
      const remove = event.target.closest("[data-document-delete]");
      if (remove) return void deleteRecord(remove.dataset.documentDelete);
    });
    const dialog = byId("documentViewerDialog");
    dialog.querySelector(".document-viewer-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
  }

  function init() {
    if (ready) return;
    ready = true;
    if (!window.indexedDB) {
      byId("documentsStatus").textContent = "Questo browser non ha l'archivio locale: i documenti non si possono salvare qui.";
      return;
    }
    ensureDb().then(function () {
      return loadAll();
    }).then(function () {
      bindEvents();
      render();
    }).catch(function () {
      byId("documentsStatus").textContent = "Archivio locale non disponibile (navigazione privata?): i documenti non si possono salvare.";
    });
  }

  window.addEventListener("tabi:viewchange", function (event) {
    if (event.detail && event.detail.view === "documents") init();
  });

  // API minima per il backup (assets/backup.js), sullo schema di TABI_UI e
  // TABI_MAP: lo schema di tabi-documents resta di proprietà di questo file.
  window.TABI_DOCS = {
    exportAll: function () {
      return ensureDb().then(function () {
        return tx("readonly", function (store) { return store.getAll(); });
      }).then(function (rows) { return rows || []; });
    },
    // Sostituzione integrale in UNA transazione: se una put fallisce (quota),
    // il rollback lascia i documenti attuali intatti invece di un archivio
    // svuotato a metà.
    replaceAll: function (rows) {
      return ensureDb().then(function () {
        return new Promise(function (resolve, reject) {
          const transaction = db.transaction(STORE, "readwrite");
          const store = transaction.objectStore(STORE);
          store.clear();
          (rows || []).forEach(function (row) { store.put(row); });
          transaction.oncomplete = function () { resolve(); };
          transaction.onerror = function () { reject(transaction.error); };
          transaction.onabort = function () { reject(transaction.error); };
        });
      }).then(function () {
        // Se la schermata era già stata aperta, l'elenco in memoria si
        // riallinea subito; se no, records resta null e il primo init rilegge.
        if (records) {
          records = (rows || []).slice().sort(function (a, b) { return b.addedAt - a.addedAt; });
          render();
        }
      });
    }
  };
})();
