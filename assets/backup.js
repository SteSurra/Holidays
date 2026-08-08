(function () {
  "use strict";

  // La copia di sicurezza vive in IndexedDB, in un database TUTTO SUO
  // (tabi-backup): "Riporta l'app come nuova" cancella solo localStorage,
  // quindi il backup sopravvive al reset per costruzione — è il suo scopo.
  // Uno slot solo: ogni salvataggio sostituisce il precedente con una singola
  // put atomica, così una quota piena fa rollback alla copia precedente
  // invece di lasciarne nessuna. Tutto resta sul dispositivo, niente in rete.

  const DB_NAME = "tabi-backup";
  const STORE = "slots";
  const SLOT_ID = "latest";
  const FORMAT = "tabi-backup-v1";

  // Solo lo stato che l'utente ha costruito a mano. Fuori, con motivo:
  // - tabi-image-cache-v5 / tabi-weather / tabi-jpy-rate-auto /
  //   tabi-facilities-v4: cache ricostruibili, peso morto nel backup;
  // - tabi-cache-ready: firma della cache di QUESTA installazione — se
  //   ripristinata stantia può sopprimere la riconciliazione offline.
  const BACKUP_KEYS = [
    "tabi-favorites", "tabi-done", "tabi-hidden-v1",
    "tabi-itineraries-v1", "tabi-itinerary-active-v1",
    "tabi-notes-v1", "tabi-packing", "tabi-packing-qty-v1",
    "tabi-packing-hidden-v1", "tabi-packing-custom-v1",
    "tabi-current-city", "tabi-merchants-start-hidden",
    "tabi-nav-hidden", "tabi-theme"
  ];
  const NEVER_RESTORE = /^(tabi-cache-ready|tabi-image-cache|tabi-facilities|tabi-weather|tabi-jpy-rate)/;

  const RELEASE = (function () {
    const src = (document.currentScript && document.currentScript.src) || "";
    return (src.match(/[?&]v=([0-9a-z]+)/i) || [])[1] || "";
  })();

  let busy = false;

  function byId(id) { return document.getElementById(id); }
  function toast(message, label, action) {
    if (window.TABI_UI) window.TABI_UI.toast(message, label, action);
  }

  // Apertura per singola operazione, chiusura sempre: nessuna connessione
  // tenuta viva che possa bloccare upgrade o cancellazioni future.
  function withStore(mode, run) {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("IndexedDB non disponibile"));
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = function () {
        open.result.createObjectStore(STORE, { keyPath: "id" });
      };
      open.onerror = function () { reject(open.error); };
      open.onsuccess = function () {
        const db = open.result;
        let settled = false;
        let result;
        try {
          const transaction = db.transaction(STORE, mode);
          const request = run(transaction.objectStore(STORE));
          if (request) request.onsuccess = function () { result = request.result; };
          transaction.oncomplete = function () { db.close(); if (!settled) { settled = true; resolve(result); } };
          transaction.onerror = function () { db.close(); if (!settled) { settled = true; reject(transaction.error); } };
          transaction.onabort = function () { db.close(); if (!settled) { settled = true; reject(transaction.error); } };
        } catch (error) {
          db.close();
          reject(error);
        }
      };
    });
  }

  function readSlot() {
    return withStore("readonly", function (store) { return store.get(SLOT_ID); });
  }

  // "Mai fidarsi di un messaggio di successo scritto da te": dopo la put si
  // rilegge lo slot e si confronta con quel che si voleva scrivere.
  function writeSlot(record) {
    return withStore("readwrite", function (store) { return store.put(record); }).then(function () {
      return readSlot();
    }).then(function (saved) {
      if (!saved || saved.createdAt !== record.createdAt || (saved.documents || []).length !== (record.documents || []).length) {
        throw new Error("verifica del backup fallita");
      }
      return saved;
    });
  }

  function deleteSlot() {
    return withStore("readwrite", function (store) { return store.delete(SLOT_ID); }).then(function () {
      return readSlot();
    }).then(function (leftover) {
      if (leftover) throw new Error("lo slot non risulta eliminato");
    });
  }

  function snapshotLocalStorage() {
    const snapshot = {};
    BACKUP_KEYS.forEach(function (key) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) snapshot[key] = value;
      } catch (_) { /* lettura negata: la chiave resta fuori dallo snapshot */ }
    });
    return snapshot;
  }

  function countOf(snapshot, key) {
    try {
      const parsed = JSON.parse(snapshot[key] || "[]");
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (_) { return 0; }
  }

  function computeCounts(snapshot, documents) {
    return {
      favorites: countOf(snapshot, "tabi-favorites"),
      itineraries: countOf(snapshot, "tabi-itineraries-v1"),
      notes: countOf(snapshot, "tabi-notes-v1"),
      documents: (documents || []).length
    };
  }

  // Specchio di safeSetItem di app.js: qui non c'è accesso a quello, ma la
  // regola è la stessa — alla quota piena si sacrifica la cache immagini.
  function trySetItem(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {
      try {
        localStorage.removeItem("tabi-image-cache-v5");
        localStorage.setItem(key, value);
      } catch (_) { /* si prosegue: il reload rilegge quel che c'è */ }
    }
  }

  function applySnapshot(snapshot) {
    Object.keys(snapshot || {}).forEach(function (key) {
      // Solo chiavi nostre, mai le firme di cache: un backup non deve poter
      // convincere l'app che l'offline è già pronto.
      if (!/^tabi-/.test(key) || NEVER_RESTORE.test(key)) return;
      trySetItem(key, String(snapshot[key]));
    });
    BACKUP_KEYS.forEach(function (key) {
      if (snapshot && Object.prototype.hasOwnProperty.call(snapshot, key)) return;
      try { localStorage.removeItem(key); } catch (_) { /* come sopra */ }
    });
  }

  function describeSlot(record) {
    const when = new Date(record.createdAt).toLocaleString("it-IT", {
      day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
    });
    const counts = record.counts || {};
    const parts = [];
    if (counts.favorites) parts.push(counts.favorites + (counts.favorites === 1 ? " preferito" : " preferiti"));
    if (counts.itineraries) parts.push(counts.itineraries + (counts.itineraries === 1 ? " itinerario" : " itinerari"));
    if (counts.notes) parts.push(counts.notes + (counts.notes === 1 ? " nota" : " note"));
    if (counts.documents) parts.push(counts.documents + (counts.documents === 1 ? " documento" : " documenti"));
    return "Ultimo backup: " + when + (parts.length ? " — " + parts.join(", ") + "." : ".");
  }

  function setBusyUI(value) {
    ["backupSaveButton", "backupRestoreButton", "backupDeleteButton"].forEach(function (id) {
      const button = byId(id);
      if (button) button.disabled = value || button.dataset.unavailable === "true";
    });
  }

  function refresh() {
    const status = byId("backupStatus");
    if (!status) return;
    readSlot().then(function (record) {
      const hasSlot = Boolean(record && record.format === FORMAT);
      status.textContent = hasSlot ? describeSlot(record) : "Nessun backup salvato su questo telefono.";
      const save = byId("backupSaveButton");
      const restore = byId("backupRestoreButton");
      const remove = byId("backupDeleteButton");
      if (save) { save.disabled = busy; save.dataset.unavailable = "false"; }
      if (restore) { restore.disabled = busy || !hasSlot; restore.dataset.unavailable = String(!hasSlot); }
      if (remove) { remove.disabled = busy || !hasSlot; remove.dataset.unavailable = String(!hasSlot); }
    }).catch(function () {
      status.textContent = "Archivio locale non disponibile (navigazione privata?): il backup non si può usare qui.";
      ["backupSaveButton", "backupRestoreButton", "backupDeleteButton"].forEach(function (id) {
        const button = byId(id);
        if (button) { button.disabled = true; button.dataset.unavailable = "true"; }
      });
    });
  }

  function saveBackup() {
    if (busy) return;
    readSlot().catch(function () { return null; }).then(function (existing) {
      if (existing && existing.createdAt) {
        const when = new Date(existing.createdAt).toLocaleString("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
        if (!window.confirm("Sostituire il backup del " + when + " con uno nuovo?\n\nIl backup precedente andrà perso.")) return;
      }
      busy = true;
      setBusyUI(true);
      const status = byId("backupStatus");
      if (status) status.textContent = "Salvo il backup…";
      const docs = window.TABI_DOCS ? window.TABI_DOCS.exportAll() : Promise.resolve([]);
      return docs.then(function (documents) {
        const snapshot = snapshotLocalStorage();
        const record = {
          id: SLOT_ID,
          format: FORMAT,
          createdAt: Date.now(),
          release: RELEASE,
          counts: computeCounts(snapshot, documents),
          localStorage: snapshot,
          documents: documents
        };
        return writeSlot(record);
      }).then(function () {
        // Un backup è esattamente il dato che il browser non deve sfrattare.
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
        toast("Backup salvato su questo telefono.");
      }).catch(function () {
        toast("Backup non salvato: spazio insufficiente o archivio non disponibile. Il backup precedente non è stato toccato.");
      }).then(function () {
        busy = false;
        refresh();
      });
    });
  }

  function restoreBackup() {
    if (busy) return;
    readSlot().catch(function () { return null; }).then(function (record) {
      if (!record || record.format !== FORMAT) {
        toast("Nessun backup da ripristinare su questo telefono.");
        refresh();
        return;
      }
      const when = new Date(record.createdAt).toLocaleString("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
      if (!window.confirm("Ripristinare il backup del " + when + "?\n\nQuello che c'è adesso — preferiti, itinerari, spunte, note, valigia e documenti — verrà sostituito dai dati del backup. Non si può annullare.")) return;
      busy = true;
      setBusyUI(true);
      const status = byId("backupStatus");
      if (status) status.textContent = "Ripristino in corso…";
      // Prima i documenti (l'unico passo che può fallire davvero, atomico),
      // poi le chiavi, e per ultimo il reload: una pagina fresca è l'unica
      // definizione affidabile di stato coerente dopo un cambio in blocco.
      const docs = window.TABI_DOCS ? window.TABI_DOCS.replaceAll(record.documents || []) : Promise.reject(new Error("documenti non disponibili"));
      docs.then(function () {
        applySnapshot(record.localStorage || {});
        try { sessionStorage.setItem("tabi-backup-restored", "1"); } catch (_) { /* niente toast al riavvio */ }
        window.location.href = window.location.pathname;
      }).catch(function () {
        busy = false;
        toast("Ripristino non riuscito: i dati attuali non sono stati toccati.");
        refresh();
      });
    });
  }

  function removeBackup() {
    if (busy) return;
    readSlot().catch(function () { return null; }).then(function (record) {
      if (!record) { refresh(); return; }
      if (!window.confirm("Eliminare l'unico backup salvato?\n\nSenza backup, le cancellazioni per errore e «Riporta l'app come nuova» non si potranno più annullare.")) return;
      busy = true;
      setBusyUI(true);
      deleteSlot().then(function () {
        busy = false;
        refresh();
        // Annullabile finché il toast è a schermo: il record è in closure.
        toast("Backup eliminato", "Annulla", function () {
          writeSlot(record).then(refresh).catch(function () {
            toast("Non sono riuscito a rimettere il backup.");
          });
        });
      }).catch(function () {
        busy = false;
        toast("Non sono riuscito a eliminare il backup.");
        refresh();
      });
    });
  }

  function bindEvents() {
    const save = byId("backupSaveButton");
    const restore = byId("backupRestoreButton");
    const remove = byId("backupDeleteButton");
    if (save) save.addEventListener("click", saveBackup);
    if (restore) restore.addEventListener("click", restoreBackup);
    if (remove) remove.addEventListener("click", removeBackup);
  }

  window.TABI_BACKUP = { refresh: refresh };

  bindEvents();
  refresh();

  // Il toast di conferma arriva DOPO il reload del ripristino: il flag di
  // sessione sopravvive alla navigazione ma non a una chiusura dell'app.
  try {
    if (sessionStorage.getItem("tabi-backup-restored")) {
      sessionStorage.removeItem("tabi-backup-restored");
      document.addEventListener("DOMContentLoaded", function () {
        toast("Backup ripristinato: l'app è tornata a quel momento.");
      });
    }
  } catch (_) { /* navigazione privata: il ripristino resta valido comunque */ }
})();
