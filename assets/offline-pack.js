(function () {
  "use strict";

  const IMAGE_CACHE = "tabi-images-v1";
  const TIER_KEY = "tabi-offline-tier";
  const JOB_KEY = "tabi-offline-job";
  const PHOTO_OK_RATIO = 0.95;
  const RETRY_MS = [1000, 3000, 8000];
  const PHOTO_CONCURRENCY = 2;

  const LEVELS = [
    { id: "minimo", label: "Minimo", hint: "Guide e storie. Foto e mappa chiedono rete." },
    { id: "medio", label: "Medio", hint: "Anche le foto delle schede. Mappa ancora online." },
    { id: "ampio", label: "Ampio", hint: "Foto + mappe a dettaglio strada intorno a ogni tappa." },
    { id: "max", label: "Massimo", hint: "Foto + mappa del Giappone a dettaglio strada. Solo Wi‑Fi." }
  ];

  const ZOOMS = [
    { id: "14", label: "Standard", sub: "z14" },
    { id: "15", label: "Alto dettaglio", sub: "z15" }
  ];

  let jobAbort = null;
  let mapBlobUrl = null;
  let mapBlobKey = "";
  const photoObjectUrls = {};
  const tierListeners = [];

  function sizes() {
    return window.TABI_OFFLINE_SIZES || { options: {} };
  }

  function manifest() {
    return window.TABI_OFFLINE_MANIFEST || { packs: {} };
  }

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; }
  }

  function safeSetItem(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (_) { return false; }
  }

  function targetKey(level, zoom) {
    if (level === "minimo") return "minimo";
    if (level === "medio") return "medio";
    if (level === "ampio") return "ampio_z" + zoom;
    return "max_z" + zoom;
  }

  function parseTarget(key) {
    if (key === "minimo") return { level: "minimo", zoom: "14" };
    if (key === "medio") return { level: "medio", zoom: "14" };
    const ampio = key.match(/^ampio_z(14|15)$/);
    if (ampio) return { level: "ampio", zoom: ampio[1] };
    const max = key.match(/^max_z(14|15)$/);
    if (max) return { level: "max", zoom: max[1] };
    return { level: "minimo", zoom: "14" };
  }

  function getActiveTier() {
    const stored = readJSON(TIER_KEY, null);
    if (!stored || !stored.key) return { key: "minimo", level: "minimo", zoom: "14" };
    const parsed = parseTarget(stored.key);
    return { key: stored.key, level: parsed.level, zoom: parsed.zoom };
  }

  function getJob() {
    return readJSON(JOB_KEY, null);
  }

  function setJob(job) {
    if (!job) {
      localStorage.removeItem(JOB_KEY);
      return;
    }
    job.updatedAt = new Date().toISOString();
    safeSetItem(JOB_KEY, JSON.stringify(job));
  }

  function humanBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return "—";
    const abs = Math.abs(bytes);
    if (abs < 1024) return bytes + " B";
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let unit = 0;
    while (Math.abs(value) >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
    const sep = unit >= 1 ? "," : ".";
    const formatted = value.toFixed(digits).replace(".", sep);
    return formatted + " " + units[unit];
  }

  function optionLabel(key) {
    const opt = sizes().options[key];
    return opt ? opt.label : humanBytes(opt && opt.bytes);
  }

  function needsPhotos(level) {
    return level !== "minimo";
  }

  function needsMap(level) {
    return level === "ampio" || level === "max";
  }

  function mapPackKey(level, zoom) {
    if (level === "ampio") return "ampio_z" + zoom;
    if (level === "max") return "max_z" + zoom;
    return null;
  }

  function packAvailable(packKey) {
    if (!packKey) return true;
    const pack = manifest().packs[packKey];
    return !!(pack && pack.url);
  }

  function availableZooms(level) {
    return ZOOMS.filter(function (zoom) {
      return packAvailable(mapPackKey(level, zoom.id));
    });
  }

  function preferredZoom(level, preferred) {
    const zooms = availableZooms(level);
    if (!zooms.length) return "14";
    if (preferred && zooms.some(function (zoom) { return zoom.id === preferred; })) {
      return preferred;
    }
    return zooms[0].id;
  }

  function curatedEntries() {
    const table = window.TABI_CURATED_IMAGES || {};
    return Object.keys(table).map(function (id) {
      const row = table[id];
      const file = row && row[0];
      const url = file
        ? "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + file + "?width=960"
        : "";
      return { id: id, file: file, url: url };
    }).filter(function (row) { return row.url; });
  }

  function curatedPhotoUrl(file) {
    return "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + file + "?width=960";
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function isQuotaError(error) {
    return error && (error.name === "QuotaExceededError" || error.code === 22);
  }

  async function fetchWithRetry(url, options, signal) {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_MS.length; attempt += 1) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        const response = await fetch(url, Object.assign({ mode: "cors", credentials: "omit" }, options || {}, { signal: signal }));
        if (response.status === 404 || response.status === 410) return response;
        if (response.ok || response.status === 206) return response;
        if (response.status >= 500 && attempt < RETRY_MS.length) {
          await wait(RETRY_MS[attempt]);
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
        if (signal && signal.aborted) throw error;
        if (attempt < RETRY_MS.length) await wait(RETRY_MS[attempt]);
      }
    }
    throw lastError || new Error("Rete non disponibile");
  }

  async function reconcileShell(release) {
    if (!("serviceWorker" in navigator)) return { ok: false, reason: "Service worker non disponibile" };
    const registration = await navigator.serviceWorker.ready.catch(function () { return null; });
    if (!registration || !registration.active) return { ok: false, reason: "Service worker non attivo" };
    return new Promise(function (resolve) {
      const timeout = setTimeout(function () { resolve({ ok: true, timeout: true }); }, 12000);
      function onMessage(event) {
        const data = event.data;
        if (!data || data.type !== "tabi:reconciled") return;
        navigator.serviceWorker.removeEventListener("message", onMessage);
        clearTimeout(timeout);
        resolve({ ok: !data.report || !data.report.failed, report: data.report });
      }
      navigator.serviceWorker.addEventListener("message", onMessage);
      registration.active.postMessage({ type: "tabi:reconcile", signature: release || "" });
    });
  }

  async function countCachedPhotos() {
    if (!("caches" in window)) return 0;
    const cache = await caches.open(IMAGE_CACHE);
    return (await cache.keys()).length;
  }

  async function photoCached(url) {
    if (!("caches" in window)) return false;
    const cache = await caches.open(IMAGE_CACHE);
    return !!(await cache.match(url));
  }

  async function cachePhoto(url, signal) {
    const response = await fetchWithRetry(url, {}, signal);
    if (!response.ok) return { ok: false, status: response.status };
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (type.indexOf("image") === -1) return { ok: false, status: "not-image" };
    const cache = await caches.open(IMAGE_CACHE);
    await cache.put(url, response.clone());
    return { ok: true };
  }

  async function purgePhotoCache() {
    if (!("caches" in window)) return;
    Object.keys(photoObjectUrls).forEach(function (key) {
      URL.revokeObjectURL(photoObjectUrls[key]);
      delete photoObjectUrls[key];
    });
    await caches.delete(IMAGE_CACHE);
  }

  async function opfsRoot() {
    if (!navigator.storage || !navigator.storage.getDirectory) throw new Error("Archiviazione locale non supportata");
    return navigator.storage.getDirectory();
  }

  async function opfsFileSize(name) {
    try {
      const root = await opfsRoot();
      const handle = await root.getFileHandle(name);
      const file = await handle.getFile();
      return file.size;
    } catch (_) {
      return 0;
    }
  }

  async function removeOpfsFile(name) {
    try {
      const root = await opfsRoot();
      await root.removeEntry(name);
    } catch (_) { /* già assente */ }
  }

  async function purgeMapFiles(keepFile) {
    const files = new Set(Object.values(manifest().packs || {}).map(function (p) { return p.file; }));
    for (const file of files) {
      if (file !== keepFile) await removeOpfsFile(file);
    }
    revokeMapBlob();
  }

  function revokeMapBlob() {
    if (mapBlobUrl) {
      URL.revokeObjectURL(mapBlobUrl);
      mapBlobUrl = null;
      mapBlobKey = "";
    }
  }

  async function verifyMapFile(packKey) {
    const pack = manifest().packs[packKey];
    if (!pack) return false;
    const size = await opfsFileSize(pack.file);
    return size === pack.bytes;
  }

  async function downloadMapPack(packKey, onProgress, signal) {
    const pack = manifest().packs[packKey];
    if (!pack || !pack.url) throw new Error("Pacchetto mappa non disponibile sul server.");
    const root = await opfsRoot();
    let offset = await opfsFileSize(pack.file);
    if (offset === pack.bytes) {
      onProgress(pack.bytes, pack.bytes);
      return;
    }
    if (offset > pack.bytes) {
      await removeOpfsFile(pack.file);
      offset = 0;
    }
    const headers = {};
    if (offset > 0) headers.Range = "bytes=" + offset + "-";
    const response = await fetchWithRetry(pack.url, { headers: headers }, signal);
    if (!response.ok && response.status !== 206 && !(offset === 0 && response.ok)) {
      if (response.status === 404) throw new Error("Pacchetto mappa non disponibile (404).");
      throw new Error("Download mappa fallito (" + response.status + ").");
    }
    const handle = await root.getFileHandle(pack.file, { create: true });
    const writable = await handle.createWritable({ keepExistingData: offset > 0 });
    if (offset > 0) await writable.seek(offset);
    const reader = response.body.getReader();
    let received = offset;
    while (true) {
      if (signal && signal.aborted) {
        await writable.abort();
        throw new DOMException("Aborted", "AbortError");
      }
      const chunk = await reader.read();
      if (chunk.done) break;
      await writable.write(chunk.value);
      received += chunk.value.length;
      onProgress(received, pack.bytes);
    }
    await writable.close();
    const finalSize = await opfsFileSize(pack.file);
    if (finalSize !== pack.bytes) {
      await removeOpfsFile(pack.file);
      throw new Error("Pacchetto mappa incompleto o corrotto.");
    }
  }

  async function getMapBlobUrl() {
    const tier = getActiveTier();
    const packKey = mapPackKey(tier.level, tier.zoom);
    if (!packKey) return null;
    const pack = manifest().packs[packKey];
    if (!pack) return null;
    const ok = await verifyMapFile(packKey);
    if (!ok) return null;
    if (mapBlobUrl && mapBlobKey === pack.file) return mapBlobUrl;
    revokeMapBlob();
    const root = await opfsRoot();
    const handle = await root.getFileHandle(pack.file);
    const file = await handle.getFile();
    mapBlobUrl = URL.createObjectURL(file);
    mapBlobKey = pack.file;
    return mapBlobUrl;
  }

  async function photoUrlForItem(itemId) {
    if (photoObjectUrls[itemId]) return photoObjectUrls[itemId];
    const row = window.TABI_CURATED_IMAGES && window.TABI_CURATED_IMAGES[itemId];
    if (!row || !row[0]) return "";
    const tier = getActiveTier();
    if (!needsPhotos(tier.level)) return "";
    const url = curatedPhotoUrl(row[0]);
    if (!("caches" in window)) return "";
    const cache = await caches.open(IMAGE_CACHE);
    const hit = await cache.match(url);
    if (!hit) return "";
    photoObjectUrls[itemId] = URL.createObjectURL(await hit.blob());
    return photoObjectUrls[itemId];
  }

  function notifyTierChange() {
    tierListeners.forEach(function (fn) {
      try { fn(getActiveTier()); } catch (_) { /* noop */ }
    });
  }

  function promoteTier(key) {
    safeSetItem(TIER_KEY, JSON.stringify({ key: key, at: new Date().toISOString() }));
    setJob(null);
    notifyTierChange();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  }

  async function purgeForTarget(target) {
    const parsed = parseTarget(target);
    if (!needsPhotos(parsed.level)) await purgePhotoCache();
    const keepPack = mapPackKey(parsed.level, parsed.zoom);
    const keepFile = keepPack && manifest().packs[keepPack] ? manifest().packs[keepPack].file : null;
    await purgeMapFiles(keepFile);
    revokeMapBlob();
  }

  async function applyDowngradePurge(target) {
    return purgeForTarget(target);
  }

  async function runJob(target, ui, release) {
    const parsed = parseTarget(target);
    const photos = curatedEntries();
    const mapKey = mapPackKey(parsed.level, parsed.zoom);
    const totalSteps = 1 + (needsPhotos(parsed.level) ? photos.length : 0) + (mapKey ? 1 : 0);
    let done = 0;

    function progress(phase, detail) {
      done = Math.min(done + (detail == null ? 1 : detail), totalSteps);
      const job = {
        status: "busy",
        target: target,
        phase: phase,
        done: done,
        total: totalSteps,
        error: null
      };
      setJob(job);
      if (ui && ui.onProgress) ui.onProgress(job);
    }

    jobAbort = new AbortController();
    const signal = jobAbort.signal;

    try {
      progress("shell");
      await reconcileShell(release);

      if (needsPhotos(parsed.level)) {
        let okCount = 0;
        let failCount = 0;
        for (let i = 0; i < photos.length; i += 1) {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          const entry = photos[i];
          if (await photoCached(entry.url)) {
            okCount += 1;
          } else {
            try {
              const result = await cachePhoto(entry.url, signal);
              if (result.ok) okCount += 1;
              else failCount += 1;
            } catch (error) {
              if (isQuotaError(error)) throw new Error("Spazio insufficiente sul telefono.");
              if (signal.aborted) throw error;
              failCount += 1;
            }
          }
          progress("photos", 1);
          if (ui && ui.onProgress) {
            ui.onProgress({
              status: "busy",
              target: target,
              phase: "photos",
              done: done,
              total: totalSteps,
              photoOk: okCount,
              photoFail: failCount
            });
          }
          if (i % PHOTO_CONCURRENCY === 0) await wait(120);
        }
        const ratio = photos.length ? okCount / photos.length : 1;
        if (ratio < PHOTO_OK_RATIO) {
          throw new Error("Molte foto non raggiungibili: riprova più tardi.");
        }
      } else {
        await purgePhotoCache();
      }

      if (mapKey) {
        const pack = manifest().packs[mapKey];
        if (!pack || !pack.url) {
          throw new Error("Pacchetto mappa non disponibile sul server.");
        }
        const already = await verifyMapFile(mapKey);
        if (!already) {
          progress("maps");
          await downloadMapPack(mapKey, function (received, total) {
            if (ui && ui.onProgress) {
              ui.onProgress({
                status: "busy",
                target: target,
                phase: "maps",
                done: done,
                total: totalSteps,
                mapReceived: received,
                mapTotal: total
              });
            }
          }, signal);
        }
        const keepFile = pack.file;
        await purgeMapFiles(keepFile);
      } else {
        await purgeMapFiles(null);
      }

      const verified = await verifyJobComplete(target);
      if (!verified.ok) throw new Error(verified.reason || "Verifica fallita.");

      await purgeForTarget(target);
      promoteTier(target);
      if (ui && ui.onComplete) ui.onComplete(target);
      return { ok: true };
    } catch (error) {
      if (signal.aborted) {
        setJob({
          status: "partial",
          target: target,
          phase: "cancelled",
          error: "Download annullato.",
          done: done,
          total: totalSteps
        });
        if (ui && ui.onPartial) ui.onPartial(getJob());
        return { ok: false, cancelled: true };
      }
      const message = isQuotaError(error)
        ? "Spazio insufficiente — libera spazio o scegli un piano più piccolo."
        : (error && error.message) || "Download non riuscito.";
      setJob({
        status: "partial",
        target: target,
        phase: "error",
        error: message,
        done: done,
        total: totalSteps
      });
      if (ui && ui.onPartial) ui.onPartial(getJob());
      return { ok: false, error: message };
    } finally {
      jobAbort = null;
    }
  }

  async function verifyJobComplete(target) {
    const parsed = parseTarget(target);
    if (needsPhotos(parsed.level)) {
      const cached = await countCachedPhotos();
      const expected = curatedEntries().length;
      const minOk = Math.ceil(expected * PHOTO_OK_RATIO);
      if (cached < minOk) return { ok: false, reason: "Foto in cache insufficienti (" + cached + "/" + expected + ")." };
    }
    const mapKey = mapPackKey(parsed.level, parsed.zoom);
    if (mapKey) {
      if (!(await verifyMapFile(mapKey))) return { ok: false, reason: "File mappa non verificato." };
    }
    return { ok: true };
  }

  function tierBannerText() {
    const tier = getActiveTier();
    const job = getJob();
    if (job && (job.status === "partial" || job.status === "busy")) {
      return null;
    }
    if (tier.level === "minimo") {
      return "Offline: guide e testi disponibili. Foto e mappa richiedono rete.";
    }
    if (tier.level === "medio") {
      return "Offline: guide, testi e foto delle schede. La mappa richiede rete.";
    }
    if (tier.level === "ampio") {
      return "Offline: guide, foto e mappe delle tappe. Fuori città la mappa può mancare.";
    }
    return "Offline: guida, foto e mappa del Giappone sul telefono.";
  }

  function confirmMessage(target, activeKey) {
    const opt = sizes().options[target];
    const sizeLabel = opt ? opt.label : "";
    const activeLabel = LEVELS.find(function (l) { return l.id === parseTarget(activeKey).level; });
    const goingUp = compareTarget(target, activeKey) > 0;
    if (goingUp) {
      return "Scaricherò circa " + sizeLabel + " sul telefono. Senza rete avrai tutto ciò che include questo piano. Continuare?";
    }
    return "Eliminerò i dati oltre il piano " + (activeLabel ? activeLabel.label : "") + " e libererò spazio. Offline resterà solo: " + describeTarget(target) + ". Continuare?";
  }

  function describeTarget(key) {
    const p = parseTarget(key);
    if (p.level === "minimo") return "testi e guide";
    if (p.level === "medio") return "testi, guide e foto";
    if (p.level === "ampio") return "testi, foto e mappe delle tappe (z" + p.zoom + ")";
    return "tutto incluso la mappa del Giappone (z" + p.zoom + ")";
  }

  function compareTarget(a, b) {
    const order = ["minimo", "medio", "ampio_z14", "ampio_z15", "max_z14", "max_z15"];
    return order.indexOf(a) - order.indexOf(b);
  }

  function cellularWarning() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return "";
    if (conn.saveData) return "Risparmio dati attivo: il download può essere costoso.";
    if (conn.type === "cellular") return "Sei su rete mobile: consigliato il Wi‑Fi.";
    return "";
  }

  function setupUI(root) {
    if (!root) return;
    const tierList = root.querySelector("#offlineTierList");
    const zoomList = root.querySelector("#offlineZoomList");
    const statusEl = root.querySelector("#offlinePackStatus");
    const storageEl = root.querySelector("#offlineStorageLine");
    const actionsEl = root.querySelector("#offlinePackActions");
    const progressEl = root.querySelector("#offlinePackProgress");
    const dialog = document.getElementById("offlinePackDialog");
    const dialogBody = document.getElementById("offlinePackDialogBody");
    const dialogConfirm = document.getElementById("offlinePackDialogConfirm");
    let pendingTarget = null;
    let pendingRelease = "";
    // Bozza scelta dall'utente: renderTiers ricostruisce i radio, quindi non
    // può basarsi solo su getActiveTier() altrimenti ogni change ripristina
    // il piano già attivo e "Scarica piano" non compare mai.
    let draftKey = null;

    // Senza questi nodi non si può dipingere i radio: esci con messaggio, non
    // lasciare lo status statico "Controllo in corso…" dell'HTML.
    if (!tierList || !zoomList || !statusEl || !actionsEl) {
      if (statusEl) {
        statusEl.textContent = "Pannello offline incompleto. Aggiorna la guida.";
        statusEl.dataset.tone = "warn";
      }
      return;
    }

    function selectionKey() {
      return draftKey || getActiveTier().key;
    }

    function captureDraftFromInputs() {
      const levelInput = tierList.querySelector('input[name="offline-tier"]:checked');
      const level = levelInput ? levelInput.value : "minimo";
      const zoomInput = zoomList.querySelector('input[name="offline-zoom"]:checked');
      const active = getActiveTier();
      const zoomHint = zoomInput
        ? zoomInput.value
        : (active.level === level ? active.zoom : "14");
      draftKey = targetKey(level, preferredZoom(level, zoomHint));
      return draftKey;
    }

    function renderTiers() {
      const active = getActiveTier();
      const selected = parseTarget(selectionKey());
      // Dipingi sempre i quattro piani: la fieldset non deve restare vuota
      // anche se le misure o il manifest non sono ancora pronti.
      tierList.innerHTML = LEVELS.map(function (level) {
        const zoomForSize = needsMap(level.id)
          ? preferredZoom(level.id, selected.level === level.id ? selected.zoom : active.zoom)
          : "14";
        const sizeKey = targetKey(level.id, zoomForSize);
        const size = sizes().options[sizeKey] || sizes().options[targetKey(level.id, "14")];
        const checked = selected.level === level.id ? " checked" : "";
        const sizeLabel = size ? size.label : "";
        return '<label class="offline-tier-option">'
          + '<input type="radio" name="offline-tier" value="' + level.id + '"' + checked + '>'
          + '<span class="offline-tier-copy"><strong>' + level.label + (sizeLabel ? " · " + sizeLabel : "") + '</strong>'
          + '<small>' + level.hint + '</small></span></label>';
      }).join("");

      const level = selected.level;
      const zooms = availableZooms(level);
      // Un solo zoom disponibile (es. Max senza z15 pubblicato): niente scelta.
      const showZoom = needsMap(level) && zooms.length > 1;
      zoomList.hidden = !showZoom;
      if (showZoom) {
        const selectedZoom = preferredZoom(level, selected.zoom);
        zoomList.innerHTML = zooms.map(function (zoom) {
          const zkey = targetKey(level, zoom.id);
          const zsize = sizes().options[zkey];
          const checked = selectedZoom === zoom.id ? " checked" : "";
          return '<label class="offline-zoom-option">'
            + '<input type="radio" name="offline-zoom" value="' + zoom.id + '"' + checked + '>'
            + '<span><strong>' + zoom.label + " (z" + zoom.id + ")"
            + (zsize ? " · " + zsize.label : "") + "</strong></span></label>";
        }).join("");
      } else {
        zoomList.innerHTML = "";
      }
    }

    function selectedTarget() {
      return selectionKey();
    }

    async function refreshStorageLine() {
      if (!storageEl || !navigator.storage || !navigator.storage.estimate) {
        if (storageEl) storageEl.textContent = "";
        return;
      }
      const est = await navigator.storage.estimate();
      const used = est.usage || 0;
      const quota = est.quota || 0;
      const free = Math.max(0, quota - used);
      storageEl.textContent = "Sul telefono: " + humanBytes(used) + " usati · " + humanBytes(free) + " liberi (stima)";
    }

    function renderStatus() {
      const active = getActiveTier();
      const job = getJob();
      const opt = sizes().options[active.key];
      if (job && job.status === "busy") {
        const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
        statusEl.textContent = "Scarico… " + pct + "%" + (job.phase === "photos" ? " (foto)" : job.phase === "maps" ? " (mappa)" : "");
        statusEl.dataset.tone = "";
        if (progressEl) {
          progressEl.hidden = false;
          progressEl.value = pct;
        }
        return;
      }
      if (job && job.status === "partial") {
        statusEl.textContent = job.error || "Download interrotto.";
        statusEl.dataset.tone = "warn";
        if (progressEl) progressEl.hidden = true;
        return;
      }
      statusEl.textContent = "Piano attivo: " + LEVELS.find(function (l) { return l.id === active.level; }).label
        + (needsMap(active.level) ? " (z" + active.zoom + ")" : "")
        + " · " + (opt ? opt.label : "") + " — completo";
      statusEl.dataset.tone = "ok";
      if (progressEl) progressEl.hidden = true;
    }

    function renderActions() {
      const active = getActiveTier();
      const job = getJob();
      const target = selectedTarget();
      actionsEl.innerHTML = "";
      if (job && job.status === "partial") {
        const resume = document.createElement("button");
        resume.type = "button";
        resume.textContent = "Riprendi";
        resume.addEventListener("click", function () { startChange(job.target || target); });
        actionsEl.appendChild(resume);
        const revert = document.createElement("button");
        revert.type = "button";
        revert.textContent = "Annulla download";
        revert.addEventListener("click", function () {
          setJob(null);
          renderAll();
        });
        actionsEl.appendChild(revert);
        return;
      }
      if (job && job.status === "busy") {
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.textContent = "Annulla";
        cancel.addEventListener("click", function () {
          if (jobAbort) jobAbort.abort();
        });
        actionsEl.appendChild(cancel);
        return;
      }
      if (target !== active.key) {
        const apply = document.createElement("button");
        apply.type = "button";
        apply.textContent = compareTarget(target, active.key) > 0 ? "Scarica piano" : "Riduci piano";
        apply.addEventListener("click", function () { openConfirm(target); });
        actionsEl.appendChild(apply);
      }
    }

    function renderAll() {
      renderTiers();
      renderStatus();
      renderActions();
      refreshStorageLine();
    }

    function openConfirm(target) {
      if (!navigator.onLine) {
        statusEl.textContent = "Serve la rete per cambiare piano.";
        statusEl.dataset.tone = "warn";
        return;
      }
      const mapKey = mapPackKey(parseTarget(target).level, parseTarget(target).zoom);
      if (mapKey && !packAvailable(mapKey)) {
        statusEl.textContent = "Questo dettaglio mappa non è ancora disponibile.";
        statusEl.dataset.tone = "warn";
        return;
      }
      pendingTarget = target;
      const active = getActiveTier();
      let body = confirmMessage(target, active.key);
      const cell = cellularWarning();
      if (cell && (parseTarget(target).level === "ampio" || parseTarget(target).level === "max")) {
        body += "\n\n" + cell;
      }
      if (dialogBody) dialogBody.textContent = body;
      if (dialog) dialog.showModal();
    }

    async function startChange(target) {
      if (dialog) dialog.close();
      draftKey = target;
      const release = pendingRelease || (window.TABI_RELEASE || "");
      await runJob(target, {
        onProgress: function () { renderAll(); },
        onComplete: function () {
          draftKey = null;
          renderAll();
          if (window.TABI_UI && window.TABI_UI.toast) {
            window.TABI_UI.toast("Piano offline pronto");
          }
        },
        onPartial: function () { renderAll(); }
      }, release);
      if (getActiveTier().key === target) draftKey = null;
      renderAll();
    }

    function onSelectionChange() {
      const target = captureDraftFromInputs();
      const activeKey = getActiveTier().key;
      if (target === activeKey) draftKey = null;
      renderTiers();
      renderActions();
      if (target !== activeKey) openConfirm(target);
    }

    if (dialogConfirm) {
      dialogConfirm.addEventListener("click", function () {
        if (pendingTarget) startChange(pendingTarget);
      });
    }

    tierList.addEventListener("change", onSelectionChange);
    zoomList.addEventListener("change", onSelectionChange);

    pendingRelease = window.TABI_RELEASE || "";
    renderAll();
  }

  window.TABI_OFFLINE_PACK = {
    IMAGE_CACHE: IMAGE_CACHE,
    getActiveTier: getActiveTier,
    getJob: getJob,
    humanBytes: humanBytes,
    optionLabel: optionLabel,
    targetKey: targetKey,
    parseTarget: parseTarget,
    tierBannerText: tierBannerText,
    photoUrlForItem: photoUrlForItem,
    getMapBlobUrl: getMapBlobUrl,
    onTierChange: function (fn) {
      tierListeners.push(fn);
    },
    setupUI: setupUI
  };
})();
