(function () {
  "use strict";

  const IMAGE_CACHE = "tabi-images-v1";
  const TIER_KEY = "tabi-offline-tier";
  const JOB_KEY = "tabi-offline-job";
  const PHOTO_PACK_META_KEY = "tabi-offline-photo-pack";
  // Safari/iOS exposes OPFS getDirectory + getFileHandle but often lacks
  // createWritable — map packs fall back to this IndexedDB store.
  const MAP_IDB_NAME = "tabi-offline-maps";
  const MAP_IDB_STORE = "packs";
  // Multi-part Safari path: never assemble ~195MB+ into one IDB value.
  const MAP_IDB_PART_SEP = "::part::";
  const MAP_IDB_META_SUFFIX = "::meta";
  const MAP_IDB_PUT_TIMEOUT_MS = 120000;
  const PHOTO_OK_RATIO = (window.TABI_OFFLINE_RESUME && window.TABI_OFFLINE_RESUME.PHOTO_OK_RATIO) || 0.95;
  const Resume = window.TABI_OFFLINE_RESUME || null;
  const RETRY_MS = [1000, 3000, 8000];
  // Fallback Commons pool when photos_medio archive URL is missing.
  // Prefer one tar.gz (see installPhotoPack); many small GETs stay minutes-scale.
  const PHOTO_CONCURRENCY = 6;
  // Large PMTiles (japan-z14 ~1.2GB): parallel Range chunks when the host
  // supports byte ranges + CORS (raw.githubusercontent.com does; GitHub
  // Release assets do not — see hard-lessons).
  const MAP_RANGE_CHUNK = 8 * 1024 * 1024;
  const MAP_RANGE_CONCURRENCY = 4;
  const MAP_PARALLEL_MIN_BYTES = 16 * 1024 * 1024;
  // Busy rows older than this with no live AbortController are always reclaimed;
  // also used as a boot-time safety net when updatedAt is missing/ancient.
  const STALE_BUSY_MS = 5 * 60 * 1000;
  let fetchCooldownUntil = 0;

  const LEVELS = [
    { id: "minimo", label: "Minimo", hint: "Guide e storie + servizi utili sulla mappa. Foto e tiles chiedono rete." },
    { id: "medio", label: "Medio", hint: "Anche le foto delle schede + servizi utili sulla mappa. I tiles restano online." },
    { id: "ampio", label: "Ampio", hint: "Foto + mappe intorno alle tappe + WC, konbini e stazioni offline." },
    { id: "max", label: "Massimo", hint: "Foto + mappa del Giappone + servizi utili sulle tappe. Solo Wi‑Fi." }
  ];

  const ZOOMS = [
    { id: "14", label: "Standard", sub: "z14" },
    { id: "15", label: "Alto dettaglio", sub: "z15" }
  ];

  let jobAbort = null;
  let mapBlobUrl = null;
  let mapBlobKey = "";
  let activeTierMissingBytes = 0;
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

  async function refreshActiveTierMissingBytes() {
    const job = getJob();
    if (job && (job.status === "busy" || job.status === "partial")) {
      activeTierMissingBytes = 0;
      return 0;
    }
    const active = getActiveTier();
    try {
      activeTierMissingBytes = await estimateDownloadBytes(active.key);
    } catch (_) {
      activeTierMissingBytes = 0;
    }
    return activeTierMissingBytes;
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

  function jobAgeMs(job) {
    if (!job || !job.updatedAt) return Infinity;
    const ts = Date.parse(job.updatedAt);
    return Number.isFinite(ts) ? Math.max(0, Date.now() - ts) : Infinity;
  }

  // Reload (or a hung tab) can leave status:"busy" in localStorage while
  // jobAbort is null — UI shows Annulla that does nothing. Demote to partial.
  // Never show Annulla for busy without a live AbortController.
  function reclaimOrphanBusyJob() {
    const job = getJob();
    if (!job || job.status !== "busy") return false;
    // This tab owns an in-flight download — do not demote (Cancel uses abort).
    if (jobAbort) return false;
    const stale = jobAgeMs(job) >= STALE_BUSY_MS;
    setJob({
      status: "partial",
      target: job.target,
      phase: stale ? "stale" : "interrupted",
      error: "Download interrotto. Tocca Riprendi.",
      done: job.done,
      total: job.total,
      photoReused: job.photoReused
    });
    return true;
  }

  function cancelBusyJob() {
    const job = getJob();
    if (jobAbort) {
      try { jobAbort.abort(); } catch (_) { /* noop */ }
      // Drop the handle so a second tap / reclaim can free the UI even if
      // a hung await never rejects. progress() guards on signal.aborted.
      jobAbort = null;
    }
    // Always free the UI: Annulla must never be a no-op.
    if (job && job.status === "busy") {
      setJob({
        status: "partial",
        target: job.target,
        phase: "cancelled",
        error: "Download interrotto. Tocca Riprendi.",
        done: job.done,
        total: job.total,
        photoReused: job.photoReused
      });
    }
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

  function needsFacilities(level) {
    return level === "minimo" || level === "medio" || level === "ampio" || level === "max";
  }

  function facilityPackSpec() {
    const pack = manifest().packs && manifest().packs.facilities_ampio;
    if (!pack) return null;
    const sources = packSources(pack);
    if (!sources.length) return null;
    return { file: pack.file || "facilities-ampio.json.gz", bytes: pack.bytes, urls: sources.map(function (src) { return src.url; }) };
  }

  function mapPackKey(level, zoom) {
    if (level === "ampio") return "ampio_z" + zoom;
    if (level === "max") return "max_z" + zoom;
    return null;
  }

  function packSources(pack) {
    if (!pack) return [];
    if (pack.parts && pack.parts.length) {
      return pack.parts.map(function (part) {
        return { url: part.url, bytes: part.bytes };
      }).filter(function (part) { return part.url && part.bytes > 0; });
    }
    if (pack.url) return [{ url: pack.url, bytes: pack.bytes }];
    return [];
  }

  function packAvailable(packKey) {
    if (!packKey) return true;
    const pack = manifest().packs[packKey];
    return packSources(pack).length > 0;
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

  function withTimeout(promise, ms, message) {
    return new Promise(function (resolve, reject) {
      let settled = false;
      const timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error(message));
      }, ms);
      promise.then(function (value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, function (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function idbPartKey(file, index) {
    return file + MAP_IDB_PART_SEP + index;
  }

  function idbMetaKey(file) {
    return file + MAP_IDB_META_SUFFIX;
  }

  async function waitForFetchCooldown(signal) {
    while (Date.now() < fetchCooldownUntil) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      await wait(Math.min(500, Math.max(0, fetchCooldownUntil - Date.now())));
    }
  }

  function applyRetryAfter(response, fallbackMs) {
    const raw = Number(response.headers.get("Retry-After"));
    const fromHeader = Number.isFinite(raw) && raw >= 0 ? raw * 1000 : 0;
    const delay = Math.min(60 * 1000, Math.max(fromHeader || 0, fallbackMs || 2000));
    fetchCooldownUntil = Math.max(fetchCooldownUntil, Date.now() + delay);
    return delay;
  }

  function mapFetchErrorMessage(error, response) {
    if (response) {
      if (response.status === 401 || response.status === 403) {
        return "Pacchetto mappa non autorizzato (" + response.status + "). Controlla che l’URL sia pubblico.";
      }
      if (response.status === 404 || response.status === 410) {
        return "Pacchetto mappa non disponibile (" + response.status + ").";
      }
      return "Download mappa fallito (" + response.status + ").";
    }
    const name = error && error.name;
    const message = (error && error.message) || "";
    if (name === "TypeError" || /Failed to fetch|NetworkError|Load failed/i.test(message)) {
      return "Download mappa bloccato dalla rete o da CORS. Gli URL devono rispondere con Access-Control-Allow-Origin (non usare GitHub Release download).";
    }
    return message || "Rete non disponibile";
  }

  async function fetchWithRetry(url, options, signal) {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_MS.length; attempt += 1) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      await waitForFetchCooldown(signal);
      try {
        const response = await fetch(url, Object.assign({ mode: "cors", credentials: "omit" }, options || {}, { signal: signal }));
        if (response.status === 401 || response.status === 403) return response;
        if (response.status === 404 || response.status === 410) return response;
        if (response.ok || response.status === 206) return response;
        if (response.status === 429) {
          applyRetryAfter(response, RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]);
          if (attempt < RETRY_MS.length) continue;
          return response;
        }
        if (response.status >= 500 && attempt < RETRY_MS.length) {
          const headerWait = Number(response.headers.get("Retry-After"));
          if (Number.isFinite(headerWait) && headerWait > 0) applyRetryAfter(response, RETRY_MS[attempt]);
          else await wait(RETRY_MS[attempt]);
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
      const timeout = setTimeout(function () {
        resolve({ ok: false, timeout: true, reason: "Timeout riconciliazione shell" });
      }, 12000);
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

  function getPhotoPackMeta() {
    return readJSON(PHOTO_PACK_META_KEY, null);
  }

  function setPhotoPackMeta(meta) {
    if (!meta) {
      localStorage.removeItem(PHOTO_PACK_META_KEY);
      return;
    }
    safeSetItem(PHOTO_PACK_META_KEY, JSON.stringify(meta));
  }

  function photoPackInstallAccepted(meta) {
    if (!meta || !meta.expected) return false;
    return (meta.okCount || 0) / meta.expected >= PHOTO_OK_RATIO;
  }

  /** True when localStorage pack meta matches the published photos_medio bytes. */
  function photoPackMetaMatchesSpec(pack) {
    const meta = getPhotoPackMeta();
    if (!photoPackInstallAccepted(meta)) return false;
    if (pack && pack.bytes != null && meta.bytes != null && meta.bytes !== pack.bytes) return false;
    return true;
  }

  /**
   * Medio+ tiers share the same curated photo set. Skip re-download when Cache
   * Storage already covers ≥95% of curated cards, or when a matching pack meta
   * is recorded and at least some photo responses remain in cache.
   */
  async function photosAlreadyOnDevice(pack) {
    const counted = await countCachedCuratedPhotos();
    if (Resume && typeof Resume.photosAlreadyOnDeviceDecision === "function") {
      const decision = Resume.photosAlreadyOnDeviceDecision(
        counted,
        getPhotoPackMeta(),
        pack && pack.bytes,
        PHOTO_OK_RATIO
      );
      if (decision.ok) {
        return {
          ok: true,
          reason: decision.reason,
          counted: counted,
          meta: decision.reason === "pack-meta" ? getPhotoPackMeta() : undefined
        };
      }
      return { ok: false, counted: counted };
    }
    const minOk = Math.ceil((counted.expected || 0) * PHOTO_OK_RATIO);
    if (counted.expected > 0 && counted.ok >= minOk) {
      return { ok: true, reason: "cache-hits", counted: counted };
    }
    if (photoPackMetaMatchesSpec(pack) && counted.ok > 0) {
      return { ok: true, reason: "pack-meta", counted: counted, meta: getPhotoPackMeta() };
    }
    return { ok: false, counted: counted };
  }

  /** Cache Storage keys are unique by URL; many curated items share one Commons file. */
  async function countCachedCuratedPhotos() {
    const entries = curatedEntries();
    if (!("caches" in window)) {
      return { ok: 0, expected: entries.length, keys: 0, uniqueUrls: 0, hitUrls: 0 };
    }
    const cache = await caches.open(IMAGE_CACHE);
    const keys = (await cache.keys()).length;
    const byUrl = Object.create(null);
    for (let i = 0; i < entries.length; i += 1) {
      const url = entries[i].url;
      if (!byUrl[url]) byUrl[url] = 0;
      byUrl[url] += 1;
    }
    const urls = Object.keys(byUrl);
    let hitUrls = 0;
    let ok = 0;
    for (let i = 0; i < urls.length; i += 1) {
      if (await cache.match(urls[i])) {
        hitUrls += 1;
        ok += byUrl[urls[i]];
      }
    }
    return {
      ok: ok,
      expected: entries.length,
      keys: keys,
      uniqueUrls: urls.length,
      hitUrls: hitUrls
    };
  }

  async function photoCached(url) {
    if (!("caches" in window)) return false;
    const cache = await caches.open(IMAGE_CACHE);
    return !!(await cache.match(url));
  }

  async function cachePhoto(url, signal, cacheHandle) {
    const response = await fetchWithRetry(url, {}, signal);
    if (!response.ok) return { ok: false, status: response.status };
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (type.indexOf("image") === -1) return { ok: false, status: "not-image" };
    const cache = cacheHandle || await caches.open(IMAGE_CACHE);
    await cache.put(url, response.clone());
    return { ok: true };
  }

  function etaSeconds(finished, total, startedAt, minFinished) {
    const minDone = minFinished == null ? 8 : minFinished;
    if (finished < minDone || total <= finished) return null;
    const elapsed = Date.now() - startedAt;
    if (elapsed < 500) return null;
    return Math.max(1, Math.ceil((total - finished) / (finished / elapsed) / 1000));
  }

  function formatEtaSec(sec) {
    if (sec == null || !Number.isFinite(sec) || sec < 0) return "";
    if (sec < 60) return " · ~" + sec + " s";
    return " · ~" + Math.ceil(sec / 60) + " min";
  }

  function photoPackSpec() {
    const pack = manifest().packs && manifest().packs.photos_medio;
    if (!pack) return null;
    if (Array.isArray(pack.parts) && pack.parts.length) {
      const urls = pack.parts.map(function (part) { return part && part.url; }).filter(Boolean);
      if (urls.length) {
        return { file: pack.file || "photos-medio.tar.gz", bytes: pack.bytes, urls: urls, mode: "parts" };
      }
    }
    const urls = Array.isArray(pack.urls) ? pack.urls.filter(Boolean) : [];
    if (urls.length) {
      return { file: pack.file || "photos-medio.tar.gz", bytes: pack.bytes, urls: urls, mode: "parts" };
    }
    if (pack.url) {
      return { file: pack.file || "photos-medio.tar.gz", bytes: pack.bytes, urls: [pack.url], mode: "single" };
    }
    return null;
  }

  function parseTar(buffer) {
    const files = Object.create(null);
    const view = new Uint8Array(buffer);
    let offset = 0;
    function readString(buf, start, len) {
      let end = start;
      const max = start + len;
      while (end < max && buf[end] !== 0) end += 1;
      return new TextDecoder().decode(buf.subarray(start, end));
    }
    while (offset + 512 <= view.length) {
      const header = view.subarray(offset, offset + 512);
      offset += 512;
      let zero = true;
      for (let i = 0; i < 512; i += 1) {
        if (header[i] !== 0) { zero = false; break; }
      }
      if (zero) break;
      const name = readString(header, 0, 100);
      const sizeOctal = readString(header, 124, 12).trim();
      const size = parseInt(sizeOctal, 8) || 0;
      const typeflag = header[156] ? String.fromCharCode(header[156]) : "0";
      const prefix = readString(header, 345, 155);
      const fullName = prefix ? prefix + "/" + name : name;
      if (typeflag === "0" || typeflag === "\0" || typeflag === "") {
        files[fullName] = view.subarray(offset, offset + size).slice();
      }
      offset += size;
      const rem = size % 512;
      if (rem) offset += 512 - rem;
    }
    return files;
  }

  async function gunzipToBuffer(bytes, signal) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Decompressione gzip non supportata da questo browser.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      const step = await reader.read();
      if (step.done) break;
      chunks.push(step.value);
      total += step.value.length;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (let i = 0; i < chunks.length; i += 1) {
      out.set(chunks[i], offset);
      offset += chunks[i].length;
    }
    return out.buffer;
  }

  async function downloadBytes(urls, expectedBytes, onProgress, signal) {
    const parts = [];
    let received = 0;
    for (let i = 0; i < urls.length; i += 1) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      const response = await fetchWithRetry(urls[i], {}, signal);
      if (!response.ok) {
        throw new Error("Download pacchetto foto fallito (" + response.status + ").");
      }
      if (!response.body || !response.body.getReader) {
        const buf = new Uint8Array(await response.arrayBuffer());
        parts.push(buf);
        received += buf.length;
        if (onProgress) onProgress(received, expectedBytes || received);
        continue;
      }
      const reader = response.body.getReader();
      const chunks = [];
      while (true) {
        if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
        const chunk = await reader.read();
        if (chunk.done) break;
        chunks.push(chunk.value);
        received += chunk.value.length;
        if (onProgress) onProgress(received, expectedBytes || received);
      }
      let partLen = 0;
      for (let c = 0; c < chunks.length; c += 1) partLen += chunks[c].length;
      const merged = new Uint8Array(partLen);
      let off = 0;
      for (let c = 0; c < chunks.length; c += 1) {
        merged.set(chunks[c], off);
        off += chunks[c].length;
      }
      parts.push(merged);
    }
    if (parts.length === 1) return parts[0];
    let total = 0;
    for (let i = 0; i < parts.length; i += 1) total += parts[i].length;
    const all = new Uint8Array(total);
    let offset = 0;
    for (let i = 0; i < parts.length; i += 1) {
      all.set(parts[i], offset);
      offset += parts[i].length;
    }
    return all;
  }

  async function installPhotoPack(pack, signal, onProgress) {
    if (!("caches" in window)) return { okCount: 0, failCount: 1, mode: "pack" };
    const bytes = await downloadBytes(pack.urls, pack.bytes, function (received, total) {
      if (onProgress) onProgress({ phase: "photos-download", received: received, total: total });
    }, signal);
    if (pack.bytes && bytes.length !== pack.bytes) {
      throw new Error("Pacchetto foto incompleto (" + bytes.length + "/" + pack.bytes + ").");
    }
    if (onProgress) onProgress({ phase: "photos-install", received: bytes.length, total: pack.bytes || bytes.length });
    const tarBuf = await gunzipToBuffer(bytes, signal);
    const files = parseTar(tarBuf);
    const manifestBytes = files["manifest.json"];
    if (!manifestBytes) throw new Error("manifest.json assente nel pacchetto foto.");
    const packManifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    const entries = packManifest.entries || [];
    const cache = await caches.open(IMAGE_CACHE);
    let okCount = 0;
    let failCount = 0;
    for (let i = 0; i < entries.length; i += 1) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      const entry = entries[i];
      const body = files[entry.path];
      if (!body || !entry.url) {
        failCount += 1;
        continue;
      }
      try {
        const response = new Response(body, {
          status: 200,
          headers: {
            "Content-Type": entry.type || "image/jpeg",
            "Content-Length": String(body.length),
            "X-Tabi-Photo-Pack": "photos-medio"
          }
        });
        await cache.put(entry.url, response);
        okCount += 1;
      } catch (error) {
        if (isQuotaError(error)) throw error;
        failCount += 1;
      }
      if (onProgress && (i % 20 === 0 || i === entries.length - 1)) {
        onProgress({
          phase: "photos-install",
          received: bytes.length,
          total: pack.bytes || bytes.length,
          okCount: okCount,
          failCount: failCount,
          installDone: i + 1,
          installTotal: entries.length
        });
      }
    }
    const meta = {
      ok: true,
      kind: packManifest.kind || "photos-medio",
      version: packManifest.version || 1,
      okCount: okCount,
      failCount: failCount,
      expected: entries.length,
      bytes: pack.bytes || bytes.length,
      at: new Date().toISOString()
    };
    setPhotoPackMeta(meta);
    return {
      okCount: okCount,
      failCount: failCount,
      mode: "pack",
      expected: entries.length,
      packMeta: meta
    };
  }

  async function installFacilityPack(pack, signal, onProgress) {
    const bytes = await downloadBytes(pack.urls, pack.bytes, onProgress, signal);
    if (pack.bytes && bytes.length !== pack.bytes) {
      throw new Error("Pacchetto servizi incompleto (" + bytes.length + "/" + pack.bytes + ").");
    }
    await idbPutMapBlob(pack.file, new Blob([bytes]));
    return { bytes: bytes.length };
  }

  async function verifyFacilityPack() {
    const pack = manifest().packs && manifest().packs.facilities_ampio;
    if (!pack || !needsFacilities(getActiveTier().level)) return true;
    if (!packSources(pack).length) return true;
    return (await idbMapSize(pack.file)) === pack.bytes;
  }

  async function purgeFacilityPack() {
    const pack = manifest().packs && manifest().packs.facilities_ampio;
    if (pack && pack.file) await idbDeleteMap(pack.file);
  }

  async function loadFacilityPack() {
    const tier = getActiveTier();
    if (!needsFacilities(tier.level)) return null;
    const pack = manifest().packs && manifest().packs.facilities_ampio;
    if (!pack || !packSources(pack).length) return null;
    if ((await idbMapSize(pack.file)) !== pack.bytes) return null;
    const blob = await idbGetMapBlob(pack.file);
    if (!blob) return null;
    const buf = await gunzipToBuffer(new Uint8Array(await blob.arrayBuffer()));
    return JSON.parse(new TextDecoder().decode(buf));
  }

  async function cacheCuratedPhotos(photos, signal, onItem) {
    if (!photos.length) return { okCount: 0, failCount: 0 };
    if (!("caches" in window)) return { okCount: 0, failCount: photos.length };
    const cache = await caches.open(IMAGE_CACHE);
    let cursor = 0;
    let okCount = 0;
    let failCount = 0;
    const startedAt = Date.now();

    async function processOne(entry) {
      if (await cache.match(entry.url)) return true;
      try {
        const result = await cachePhoto(entry.url, signal, cache);
        return !!result.ok;
      } catch (error) {
        if (isQuotaError(error)) throw error;
        if (signal && signal.aborted) throw error;
        return false;
      }
    }

    async function worker() {
      while (true) {
        if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
        const index = cursor;
        cursor += 1;
        if (index >= photos.length) return;
        const ok = await processOne(photos[index]);
        if (ok) okCount += 1;
        else failCount += 1;
        if (onItem) {
          onItem({
            okCount: okCount,
            failCount: failCount,
            photoEtaSec: etaSeconds(okCount + failCount, photos.length, startedAt)
          });
        }
      }
    }

    const workers = Math.min(PHOTO_CONCURRENCY, photos.length);
    await Promise.all(Array.from({ length: workers }, function () { return worker(); }));
    return { okCount: okCount, failCount: failCount, mode: "commons" };
  }

  async function purgePhotoCache() {
    if (!("caches" in window)) return;
    Object.keys(photoObjectUrls).forEach(function (key) {
      URL.revokeObjectURL(photoObjectUrls[key]);
      delete photoObjectUrls[key];
    });
    setPhotoPackMeta(null);
    await caches.delete(IMAGE_CACHE);
  }

  /** Chrome has OPFS createWritable; Safari/iOS often does not. */
  function supportsOpfsWritable() {
    return !!(
      typeof FileSystemFileHandle !== "undefined"
      && typeof FileSystemFileHandle.prototype.createWritable === "function"
      && navigator.storage
      && typeof navigator.storage.getDirectory === "function"
    );
  }

  let mapIdb = null;

  function openMapIdb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB non disponibile"));
        return;
      }
      const request = indexedDB.open(MAP_IDB_NAME, 1);
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(MAP_IDB_STORE)) {
          db.createObjectStore(MAP_IDB_STORE);
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function ensureMapIdb() {
    if (mapIdb) return Promise.resolve(mapIdb);
    return openMapIdb().then(function (db) {
      mapIdb = db;
      return db;
    });
  }

  function mapIdbTx(mode, run) {
    return ensureMapIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const transaction = db.transaction(MAP_IDB_STORE, mode);
        const store = transaction.objectStore(MAP_IDB_STORE);
        const request = run(store);
        transaction.oncomplete = function () { resolve(request ? request.result : undefined); };
        transaction.onerror = function () { reject(transaction.error); };
        transaction.onabort = function () { reject(transaction.error); };
      });
    });
  }

  async function idbPutRaw(key, value) {
    await mapIdbTx("readwrite", function (store) { return store.put(value, key); });
  }

  async function idbGetMapMeta(name) {
    try {
      return await mapIdbTx("readonly", function (store) { return store.get(idbMetaKey(name)); });
    } catch (_) {
      return null;
    }
  }

  async function idbGetMapPart(name, index) {
    try {
      const value = await mapIdbTx("readonly", function (store) {
        return store.get(idbPartKey(name, index));
      });
      return value instanceof Blob ? value : null;
    } catch (_) {
      return null;
    }
  }

  async function idbDeleteMapKey(key) {
    try {
      await mapIdbTx("readwrite", function (store) { return store.delete(key); });
    } catch (_) { /* già assente */ }
  }

  /**
   * What is already on device for a map pack (OPFS prefix or IDB parts by size).
   * Riprendi / upgrades must use missingBytes — never assume a full re-fetch.
   * Part math lives in TABI_OFFLINE_RESUME (Node-tested).
   */
  async function inspectLocalMapPack(packKey) {
    const pack = manifest().packs[packKey];
    const sources = packSources(pack);
    const totalParts = sources.length;
    const empty = {
      complete: false,
      presentBytes: 0,
      missingBytes: pack && pack.bytes ? pack.bytes : 0,
      presentParts: 0,
      totalParts: totalParts,
      backend: "none",
      partOk: sources.map(function () { return false; }),
      stale: false
    };
    if (!pack || !sources.length) return empty;

    if (supportsOpfsWritable()) {
      const opfsSize = await opfsFileSize(pack.file);
      if (Resume && typeof Resume.inspectOpfsPrefix === "function") {
        // Chrome path: OPFS is authoritative even when size is 0 (fresh start).
        return Resume.inspectOpfsPrefix(sources, opfsSize, pack.bytes);
      }
    }

    const meta = await idbGetMapMeta(pack.file);
    if (sources.length > 1) {
      const partSizes = [];
      for (let i = 0; i < sources.length; i += 1) {
        const part = await idbGetMapPart(pack.file, i);
        partSizes.push(part ? part.size : null);
      }
      if (Resume && typeof Resume.inspectIdbParts === "function") {
        return Resume.inspectIdbParts(sources, partSizes, pack.bytes, meta);
      }
    }

    const idbSize = await idbMapSize(pack.file);
    if (idbSize === pack.bytes) {
      return {
        complete: true,
        presentBytes: pack.bytes,
        missingBytes: 0,
        presentParts: 1,
        totalParts: 1,
        backend: "idb",
        partOk: [true],
        stale: false
      };
    }
    // Single-blob IDB has no durable mid-download resume — count full re-fetch.
    if (meta && meta.multi
      && (meta.bytes !== pack.bytes || meta.partCount !== sources.length)) {
      return Object.assign({}, empty, { stale: true });
    }
    return empty;
  }

  async function idbGetMapBlob(name) {
    try {
      const meta = await idbGetMapMeta(name);
      if (meta && meta.multi && meta.partCount > 0) {
        const parts = [];
        for (let i = 0; i < meta.partCount; i += 1) {
          const part = await mapIdbTx("readonly", function (store) {
            return store.get(idbPartKey(name, i));
          });
          if (!(part instanceof Blob)) return null;
          parts.push(part);
        }
        // Composite Blob: no full re-copy of ~195MB into one ArrayBuffer.
        return new Blob(parts);
      }
      const value = await mapIdbTx("readonly", function (store) { return store.get(name); });
      if (!value) return null;
      if (value instanceof Blob) return value;
      if (value && value.blob instanceof Blob) return value.blob;
      return null;
    } catch (_) {
      return null;
    }
  }

  async function idbMapSize(name) {
    try {
      const meta = await idbGetMapMeta(name);
      if (meta && meta.multi && meta.partCount > 0) {
        let total = 0;
        for (let i = 0; i < meta.partCount; i += 1) {
          const part = await mapIdbTx("readonly", function (store) {
            return store.get(idbPartKey(name, i));
          });
          if (!(part instanceof Blob)) return 0;
          total += part.size;
        }
        return total;
      }
      const value = await mapIdbTx("readonly", function (store) { return store.get(name); });
      if (value instanceof Blob) return value.size;
      if (value && value.blob instanceof Blob) return value.blob.size;
      return 0;
    } catch (_) {
      return 0;
    }
  }

  async function idbPutMapBlob(name, blob) {
    await idbPutRaw(name, blob);
  }

  async function idbDeleteMap(name) {
    try {
      const db = await ensureMapIdb();
      await new Promise(function (resolve, reject) {
        const transaction = db.transaction(MAP_IDB_STORE, "readwrite");
        const store = transaction.objectStore(MAP_IDB_STORE);
        store.delete(name);
        store.delete(idbMetaKey(name));
        const keysReq = store.getAllKeys(
          IDBKeyRange.bound(name + MAP_IDB_PART_SEP, name + MAP_IDB_PART_SEP + "\uffff")
        );
        keysReq.onsuccess = function () {
          (keysReq.result || []).forEach(function (key) { store.delete(key); });
        };
        transaction.oncomplete = function () { resolve(); };
        transaction.onerror = function () { reject(transaction.error); };
        transaction.onabort = function () { reject(transaction.error); };
      });
    } catch (_) { /* già assente */ }
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

  async function removeMapFile(name) {
    await removeOpfsFile(name);
    await idbDeleteMap(name);
  }

  async function purgeMapFiles(keepFile) {
    const files = new Set(
      Object.keys(manifest().packs || {})
        .filter(function (key) { return key !== "photos_medio" && key !== "facilities_ampio"; })
        .map(function (key) { return manifest().packs[key].file; })
        .filter(Boolean)
    );
    for (const file of files) {
      if (file !== keepFile) await removeMapFile(file);
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

  function mapPackBytes(packKey) {
    const pack = manifest().packs[packKey];
    if (!pack) return 0;
    const sources = packSources(pack);
    if (sources.length) {
      return sources.reduce(function (sum, src) { return sum + src.bytes; }, 0);
    }
    return pack.bytes || 0;
  }

  async function verifyMapFile(packKey) {
    const pack = manifest().packs[packKey];
    if (!pack) return false;
    if (supportsOpfsWritable()) {
      const opfsSize = await opfsFileSize(pack.file);
      if (opfsSize === pack.bytes) return true;
    }
    const idbSize = await idbMapSize(pack.file);
    return idbSize === pack.bytes;
  }

  /**
   * Bytes that will actually be fetched for an upgrade: skip photos when already
   * on device; map bytes = missing parts / OPFS suffix only (not the full pack).
   */
  async function estimateDownloadBytes(target) {
    const parsed = parseTarget(target);
    const photoPack = needsPhotos(parsed.level) ? photoPackSpec() : null;
    let photosAlready = false;
    let photoBytes = 0;
    if (needsPhotos(parsed.level)) {
      const reuse = await photosAlreadyOnDevice(photoPack);
      photosAlready = !!(reuse && reuse.ok);
      if (photoPack && photoPack.bytes) photoBytes = photoPack.bytes;
      else if (sizes().components && sizes().components.photos) photoBytes = sizes().components.photos;
    }
    const mapKey = mapPackKey(parsed.level, parsed.zoom);
    let mapComplete = true;
    let mapMissingBytes = 0;
    if (mapKey && packAvailable(mapKey)) {
      const local = await inspectLocalMapPack(mapKey);
      mapComplete = !!local.complete;
      mapMissingBytes = local.complete ? 0 : local.missingBytes;
    }
    let facilityMissingBytes = 0;
    if (needsFacilities(parsed.level)) {
      const facPack = facilityPackSpec();
      if (facPack && facPack.bytes) {
        const facSize = await idbMapSize(facPack.file);
        if (facSize !== facPack.bytes) facilityMissingBytes = facPack.bytes;
      }
    }
    if (Resume && typeof Resume.estimateRemainingDownloadBytes === "function") {
      return Resume.estimateRemainingDownloadBytes({
        needsPhotos: needsPhotos(parsed.level),
        photosAlreadyOnDevice: photosAlready,
        photoBytes: photoBytes,
        mapComplete: mapComplete,
        mapMissingBytes: mapMissingBytes,
        facilityMissingBytes: facilityMissingBytes
      });
    }
    let bytes = 0;
    if (needsPhotos(parsed.level) && !photosAlready) bytes += photoBytes;
    if (!mapComplete) bytes += mapMissingBytes;
    bytes += facilityMissingBytes;
    return bytes;
  }

  function createWriteLock(writable) {
    let chain = Promise.resolve();
    return function writeAt(offset, data) {
      const run = chain.then(async function () {
        await writable.seek(offset);
        await writable.write(data);
      });
      chain = run.catch(function () { /* keep queue alive */ });
      return run;
    };
  }

  /** In-memory sink for single-URL Safari IDB path (no createWritable). */
  function createMemorySink() {
    const chunks = [];
    let chain = Promise.resolve();
    function writeAt(offset, data) {
      const run = chain.then(function () {
        // Copy: stream buffers may be reused after read(); Blob holds refs.
        const copy = data instanceof Uint8Array
          ? data.slice()
          : new Uint8Array(data);
        chunks.push({ offset: offset, data: copy });
      });
      chain = run.catch(function () { /* keep queue alive */ });
      return run;
    }
    writeAt.toBlob = function () {
      chunks.sort(function (a, b) { return a.offset - b.offset; });
      return new Blob(chunks.map(function (chunk) { return chunk.data; }));
    };
    writeAt.release = function () {
      chunks.length = 0;
    };
    return writeAt;
  }

  async function fetchUrlToBlob(url, expectedBytes, onBytes, signal) {
    let response;
    try {
      response = await fetchWithRetry(url, {}, signal);
    } catch (error) {
      throw new Error(mapFetchErrorMessage(error, null));
    }
    if (!response.ok) throw new Error(mapFetchErrorMessage(null, response));
    if (!response.body || typeof response.body.getReader !== "function") {
      const buf = await response.arrayBuffer();
      if (onBytes) onBytes(buf.byteLength);
      return new Blob([buf]);
    }
    const reader = response.body.getReader();
    const chunks = [];
    let written = 0;
    while (true) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      const chunk = await reader.read();
      if (chunk.done) break;
      chunks.push(chunk.value);
      written += chunk.value.length;
      if (onBytes) onBytes(chunk.value.length);
    }
    if (expectedBytes && written !== expectedBytes) {
      throw new Error("Parte mappa incompleta (" + written + "/" + expectedBytes + ").");
    }
    return new Blob(chunks);
  }

  async function idbPutWithTimeout(key, value, label) {
    try {
      await withTimeout(
        idbPutRaw(key, value),
        MAP_IDB_PUT_TIMEOUT_MS,
        "Salvataggio mappa bloccato" + (label ? " (" + label + ")" : "")
          + ". Libera spazio o scegli un piano più piccolo."
      );
    } catch (error) {
      if (isQuotaError(error)) throw new Error("Spazio insufficiente sul telefono.");
      throw error;
    }
  }

  async function streamResponseToWritable(response, writableWrite, destOffset, onBytes, signal) {
    if (!response.body) throw new Error("Download mappa senza corpo risposta.");
    const reader = response.body.getReader();
    let written = 0;
    while (true) {
      if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
      const chunk = await reader.read();
      if (chunk.done) break;
      await writableWrite(destOffset + written, chunk.value);
      written += chunk.value.length;
      if (onBytes) onBytes(chunk.value.length);
    }
    return written;
  }

  async function downloadMapStream(url, writableWrite, destOffset, resumeOffset, onBytes, signal) {
    const headers = {};
    if (resumeOffset > 0) headers.Range = "bytes=" + resumeOffset + "-";
    let response;
    try {
      response = await fetchWithRetry(url, { headers: headers }, signal);
    } catch (error) {
      throw new Error(mapFetchErrorMessage(error, null));
    }
    if (!response.ok && response.status !== 206) {
      throw new Error(mapFetchErrorMessage(null, response));
    }
    if (resumeOffset > 0 && response.status !== 206) {
      throw new Error("Il server mappa non supporta ripresa (Range). Riprova da capo.");
    }
    return streamResponseToWritable(
      response,
      writableWrite,
      destOffset + resumeOffset,
      onBytes,
      signal
    );
  }

  async function downloadMapRanges(url, totalBytes, writableWrite, onBytes, signal) {
    const chunks = [];
    for (let start = 0; start < totalBytes; start += MAP_RANGE_CHUNK) {
      chunks.push({
        start: start,
        end: Math.min(totalBytes, start + MAP_RANGE_CHUNK) - 1
      });
    }
    let cursor = 0;

    async function worker() {
      while (true) {
        if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
        const index = cursor;
        cursor += 1;
        if (index >= chunks.length) return;
        const spec = chunks[index];
        const headers = { Range: "bytes=" + spec.start + "-" + spec.end };
        let response;
        try {
          response = await fetchWithRetry(url, { headers: headers }, signal);
        } catch (error) {
          throw new Error(mapFetchErrorMessage(error, null));
        }
        if (response.status !== 206 && !(response.ok && spec.start === 0 && spec.end === totalBytes - 1)) {
          throw new Error(mapFetchErrorMessage(null, response));
        }
        const written = await streamResponseToWritable(
          response,
          writableWrite,
          spec.start,
          onBytes,
          signal
        );
        const expected = spec.end - spec.start + 1;
        if (written !== expected) {
          throw new Error("Chunk mappa incompleto (" + written + "/" + expected + ").");
        }
      }
    }

    const workers = Math.min(MAP_RANGE_CONCURRENCY, chunks.length);
    await Promise.all(Array.from({ length: workers }, function () { return worker(); }));
  }

  async function downloadMapSources(sources, startOffset, writableWrite, onBytes, signal) {
    let covered = 0;
    for (let i = 0; i < sources.length; i += 1) {
      const src = sources[i];
      const srcEnd = covered + src.bytes;
      if (startOffset >= srcEnd) {
        covered = srcEnd;
        continue;
      }
      const resumeInSource = Math.max(0, startOffset - covered);
      await downloadMapStream(src.url, writableWrite, covered, resumeInSource, onBytes, signal);
      covered = srcEnd;
      startOffset = covered;
    }
  }

  async function downloadMapPartsParallel(sources, writableWrite, onBytes, signal) {
    const jobs = [];
    let covered = 0;
    for (let i = 0; i < sources.length; i += 1) {
      jobs.push({ url: sources[i].url, bytes: sources[i].bytes, offset: covered });
      covered += sources[i].bytes;
    }
    let cursor = 0;
    async function worker() {
      while (true) {
        if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
        const index = cursor;
        cursor += 1;
        if (index >= jobs.length) return;
        const job = jobs[index];
        const written = await downloadMapStream(job.url, writableWrite, job.offset, 0, onBytes, signal);
        if (written !== job.bytes) {
          throw new Error("Parte mappa incompleta (" + written + "/" + job.bytes + ").");
        }
      }
    }
    const workers = Math.min(MAP_RANGE_CONCURRENCY, jobs.length);
    await Promise.all(Array.from({ length: workers }, function () { return worker(); }));
  }

  async function fillMapSink(sources, writableWrite, offset, bump, signal) {
    if (offset > 0) {
      await downloadMapSources(sources, offset, writableWrite, bump, signal);
    } else if (sources.length === 1 && sources[0].bytes >= MAP_PARALLEL_MIN_BYTES) {
      try {
        await downloadMapRanges(sources[0].url, sources[0].bytes, writableWrite, bump, signal);
      } catch (error) {
        if (signal && signal.aborted) throw error;
        throw Object.assign(error || new Error("Range fallito"), { mapRangeFailed: true });
      }
    } else if (sources.length > 1) {
      await downloadMapPartsParallel(sources, writableWrite, bump, signal);
    } else {
      await downloadMapSources(sources, 0, writableWrite, bump, signal);
    }
  }

  function mapPartProgressExtra(sources, offsetOrPartOk) {
    if (Resume && typeof Resume.mapPartProgressExtra === "function") {
      return Resume.mapPartProgressExtra(sources, offsetOrPartOk);
    }
    return {};
  }

  async function downloadMapPackOpfs(pack, sources, onProgress, signal) {
    const root = await opfsRoot();
    let offset = await opfsFileSize(pack.file);
    if (offset === pack.bytes) {
      onProgress(pack.bytes, pack.bytes, Object.assign({ mapEtaSec: null }, mapPartProgressExtra(sources, offset)));
      return;
    }
    if (offset > pack.bytes) {
      await removeOpfsFile(pack.file);
      offset = 0;
    }

    let received = offset;
    const startedAt = Date.now();
    const resumeFrom = offset;
    if (offset > 0) {
      onProgress(received, pack.bytes, Object.assign({
        mapEtaSec: null,
        mapResumed: true
      }, mapPartProgressExtra(sources, offset)));
    }

    function bump(bytes) {
      received += bytes;
      onProgress(received, pack.bytes, Object.assign({
        mapEtaSec: etaSeconds(received - resumeFrom, pack.bytes - resumeFrom, startedAt, 256 * 1024)
      }, mapPartProgressExtra(sources, received)));
    }

    async function withWritable(keepExisting, runner) {
      const handle = await root.getFileHandle(pack.file, { create: true });
      if (typeof handle.createWritable !== "function") {
        throw new Error("OPFS createWritable assente");
      }
      const writable = await handle.createWritable({ keepExistingData: keepExisting });
      const writableWrite = createWriteLock(writable);
      try {
        await runner(writableWrite);
        onProgress(received, pack.bytes, { mapEtaSec: null, mapPhase: "saving" });
        await writable.close();
      } catch (error) {
        try { await writable.abort(); } catch (_) { /* noop */ }
        throw error;
      }
    }

    try {
      await withWritable(offset > 0, function (writableWrite) {
        return fillMapSink(sources, writableWrite, offset, bump, signal);
      });
    } catch (error) {
      if (signal && signal.aborted) throw error;
      if (error && error.mapRangeFailed) {
        await removeOpfsFile(pack.file);
        received = 0;
        await withWritable(false, function (writableWrite) {
          return downloadMapStream(sources[0].url, writableWrite, 0, 0, bump, signal);
        });
      } else {
        throw error;
      }
    }

    onProgress(pack.bytes, pack.bytes, { mapEtaSec: null, mapPhase: "saving" });
    const finalSize = await opfsFileSize(pack.file);
    if (finalSize !== pack.bytes) {
      await removeOpfsFile(pack.file);
      throw new Error("Pacchetto mappa incompleto o corrotto.");
    }
  }

  async function downloadMapPackIdb(pack, sources, onProgress, signal) {
    const existing = await idbMapSize(pack.file);
    if (existing === pack.bytes) {
      onProgress(pack.bytes, pack.bytes, Object.assign({ mapEtaSec: null }, mapPartProgressExtra(sources, sources.map(function () { return true; }))));
      return;
    }

    const meta = await idbGetMapMeta(pack.file);
    if (meta && meta.multi
      && (meta.bytes !== pack.bytes || meta.partCount !== sources.length)) {
      // Published pack changed — cannot reuse old parts.
      await idbDeleteMap(pack.file);
    }

    function reportSaving(received, detail, partOk) {
      onProgress(Math.min(received, pack.bytes), pack.bytes, Object.assign({
        mapEtaSec: null,
        mapPhase: "saving"
      }, mapPartProgressExtra(sources, partOk || received), detail || {}));
    }

    try {
      if (sources.length > 1) {
        // Drop legacy monolithic blob if present; parts live under ::part::N.
        try {
          const mono = await mapIdbTx("readonly", function (store) { return store.get(pack.file); });
          if (mono) await idbDeleteMapKey(pack.file);
        } catch (_) { /* noop */ }

        // Resume by part size via TABI_OFFLINE_RESUME.planPartFetches.
        const partSizes = [];
        for (let i = 0; i < sources.length; i += 1) {
          const part = await idbGetMapPart(pack.file, i);
          partSizes.push(part ? part.size : null);
          if (part && part.size !== sources[i].bytes) {
            await idbDeleteMapKey(idbPartKey(pack.file, i));
            partSizes[i] = null;
          }
        }
        const plan = Resume && typeof Resume.planPartFetches === "function"
          ? Resume.planPartFetches(sources, partSizes, pack.bytes, meta)
          : null;
        const partOk = plan && plan.inspection
          ? plan.inspection.partOk.slice()
          : sources.map(function (_, i) { return partSizes[i] === sources[i].bytes; });
        let received = plan ? plan.skipBytes : partOk.reduce(function (sum, ok, i) {
          return sum + (ok ? sources[i].bytes : 0);
        }, 0);
        const fetchIndexes = plan
          ? plan.fetchIndexes
          : sources.map(function (_, i) { return i; }).filter(function (i) { return !partOk[i]; });

        const startedAt = Date.now();
        const resumeFrom = received;
        onProgress(received, pack.bytes, Object.assign({
          mapEtaSec: null,
          mapResumed: resumeFrom > 0
        }, mapPartProgressExtra(sources, partOk)));

        function bump(bytes) {
          received += bytes;
          onProgress(received, pack.bytes, Object.assign({
            mapEtaSec: etaSeconds(received - resumeFrom, pack.bytes - resumeFrom, startedAt, 256 * 1024)
          }, mapPartProgressExtra(sources, partOk)));
        }

        // Sequential parts: peak RAM ≈ one part (~95 MiB), not full assemble+put.
        for (let n = 0; n < fetchIndexes.length; n += 1) {
          if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
          const i = fetchIndexes[n];
          const src = sources[i];
          const partBlob = await fetchUrlToBlob(src.url, src.bytes, bump, signal);
          if (partBlob.size !== src.bytes) {
            throw new Error("Parte mappa incompleta (" + partBlob.size + "/" + src.bytes + ").");
          }
          reportSaving(received, {
            mapSavingPart: i + 1,
            mapSavingParts: sources.length
          }, partOk);
          await idbPutWithTimeout(
            idbPartKey(pack.file, i),
            partBlob,
            "parte " + (i + 1) + "/" + sources.length
          );
          partOk[i] = true;
        }
        reportSaving(received, {
          mapSavingPart: sources.length,
          mapSavingParts: sources.length
        }, partOk);
        await idbPutWithTimeout(idbMetaKey(pack.file), {
          multi: true,
          bytes: pack.bytes,
          partCount: sources.length
        }, "indice");
      } else {
        // Single-blob path: no durable mid-download resume in IDB.
        if (existing > 0) await idbDeleteMap(pack.file);
        let received = 0;
        const startedAt = Date.now();
        function bump(bytes) {
          received += bytes;
          onProgress(received, pack.bytes, {
            mapEtaSec: etaSeconds(received, pack.bytes, startedAt, 256 * 1024)
          });
        }
        const sink = createMemorySink();
        let blob;
        try {
          await fillMapSink(sources, sink, 0, bump, signal);
          blob = sink.toBlob();
          sink.release();
        } catch (error) {
          sink.release();
          if (signal && signal.aborted) throw error;
          if (error && error.mapRangeFailed && sources.length === 1) {
            received = 0;
            const retry = createMemorySink();
            await downloadMapStream(sources[0].url, retry, 0, 0, bump, signal);
            blob = retry.toBlob();
            retry.release();
          } else {
            throw error;
          }
        }
        if (!blob || blob.size !== pack.bytes) {
          throw new Error("Pacchetto mappa incompleto o corrotto.");
        }
        reportSaving(received);
        await idbPutWithTimeout(pack.file, blob, "file");
      }
    } catch (error) {
      // Keep complete multi-parts for Riprendi — only wipe single-blob attempts
      // or a hard quota failure where storage is unusable.
      if (sources.length <= 1 || isQuotaError(error)) {
        await idbDeleteMap(pack.file);
      }
      if (isQuotaError(error)) throw new Error("Spazio insufficiente sul telefono.");
      throw error;
    }

    reportSaving(pack.bytes, null, sources.map(function () { return true; }));
    if ((await idbMapSize(pack.file)) !== pack.bytes) {
      await idbDeleteMap(pack.file);
      throw new Error("Pacchetto mappa incompleto o corrotto.");
    }
  }

  async function downloadMapPack(packKey, onProgress, signal) {
    const pack = manifest().packs[packKey];
    const sources = packSources(pack);
    if (!pack || !sources.length) throw new Error("Pacchetto mappa non disponibile sul server.");

    if (supportsOpfsWritable()) {
      try {
        await downloadMapPackOpfs(pack, sources, onProgress, signal);
        await idbDeleteMap(pack.file);
        return;
      } catch (error) {
        if (signal && signal.aborted) throw error;
        // Rare: prototype reports createWritable but the handle rejects it.
        if (!/createWritable/i.test((error && error.message) || "")) throw error;
      }
    }
    await downloadMapPackIdb(pack, sources, onProgress, signal);
  }

  /**
   * Local map archive as Blob/File (OPFS File on Chrome, IDB Blob on Safari).
   * Prefer this over getMapBlobUrl for vector rendering: blob: URLs do not end
   * in ".pmtiles", so protomaps-leaflet treats them as ZXY tile templates.
   */
  async function getMapBlob() {
    const tier = getActiveTier();
    const packKey = mapPackKey(tier.level, tier.zoom);
    if (!packKey) return null;
    const pack = manifest().packs[packKey];
    if (!pack) return null;
    if (!(await verifyMapFile(packKey))) return null;

    if (supportsOpfsWritable()) {
      try {
        const size = await opfsFileSize(pack.file);
        if (size === pack.bytes) {
          const root = await opfsRoot();
          const handle = await root.getFileHandle(pack.file);
          return await handle.getFile();
        }
      } catch (_) { /* prova IndexedDB */ }
    }

    const blob = await idbGetMapBlob(pack.file);
    if (!blob || blob.size !== pack.bytes) return null;
    return blob;
  }

  async function getMapBlobUrl() {
    const tier = getActiveTier();
    const packKey = mapPackKey(tier.level, tier.zoom);
    if (!packKey) return null;
    const pack = manifest().packs[packKey];
    if (!pack) return null;
    const blob = await getMapBlob();
    if (!blob) return null;
    if (mapBlobUrl && mapBlobKey === pack.file) return mapBlobUrl;
    revokeMapBlob();
    mapBlobUrl = URL.createObjectURL(blob);
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
    if (!needsFacilities(parsed.level)) await purgeFacilityPack();
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
    const photoPack = needsPhotos(parsed.level) ? photoPackSpec() : null;
    const facilityPack = needsFacilities(parsed.level) ? facilityPackSpec() : null;
    const photoSteps = needsPhotos(parsed.level) ? (photoPack ? 1 : photos.length) : 0;
    const totalSteps = 1 + photoSteps + (mapKey ? 1 : 0) + (facilityPack ? 1 : 0);
    let done = 0;

    const controller = new AbortController();
    jobAbort = controller;
    const signal = controller.signal;

    function progress(phase, detail, extra) {
      if (signal.aborted) return;
      done = Math.min(done + (detail == null ? 1 : detail), totalSteps);
      const job = Object.assign({
        status: "busy",
        target: target,
        phase: phase,
        done: done,
        total: totalSteps,
        error: null
      }, extra || {});
      setJob(job);
      if (ui && ui.onProgress) ui.onProgress(job);
    }

    function setPhotoProgress(extra) {
      if (signal.aborted) return;
      const job = Object.assign({
        status: "busy",
        target: target,
        phase: extra && extra.phase === "photos-install" ? "photos-install" : "photos",
        done: done,
        total: totalSteps,
        error: null
      }, extra || {});
      setJob(job);
      if (ui && ui.onProgress) ui.onProgress(job);
    }
    let photoReused = false;

    try {
      progress("shell");
      const shell = await reconcileShell(release);
      if (!shell || !shell.ok) {
        throw new Error((shell && shell.reason) || "Shell non aggiornata.");
      }

      let photoInstall = null;
      if (needsPhotos(parsed.level)) {
        let okCount = 0;
        let failCount = 0;
        try {
          const reuse = await photosAlreadyOnDevice(photoPack);
          if (reuse.ok) {
            // Medio → Ampio/Max (and Ampio → Max): same photo set — do not
            // re-fetch photos-medio.tar.gz when only the map layer is missing.
            photoReused = true;
            okCount = reuse.counted ? reuse.counted.ok : 0;
            failCount = reuse.counted
              ? Math.max(0, (reuse.counted.expected || 0) - reuse.counted.ok)
              : 0;
            if (reuse.meta) {
              photoInstall = {
                okCount: reuse.meta.okCount,
                failCount: reuse.meta.failCount || 0,
                mode: "pack",
                expected: reuse.meta.expected,
                packMeta: reuse.meta,
                reused: true
              };
            } else {
              photoInstall = {
                okCount: okCount,
                failCount: failCount,
                mode: "reuse",
                expected: reuse.counted ? reuse.counted.expected : okCount,
                reused: true
              };
            }
            progress("photos-reuse", 1, {
              photoReused: true,
              photoOk: okCount,
              photoFail: failCount,
              photoReuseReason: reuse.reason
            });
          } else if (photoPack) {
            const result = await installPhotoPack(photoPack, signal, function (state) {
              setPhotoProgress({
                phase: state.phase,
                photoReceived: state.received,
                photoTotal: state.total,
                photoOk: state.okCount,
                photoFail: state.failCount,
                photoInstallDone: state.installDone,
                photoInstallTotal: state.installTotal
              });
            });
            okCount = result.okCount;
            failCount = result.failCount;
            photoInstall = result;
            progress("photos", 1, {
              photoOk: okCount,
              photoFail: failCount,
              photoReceived: photoPack.bytes,
              photoTotal: photoPack.bytes,
              photoInstallDone: okCount + failCount,
              photoInstallTotal: result.expected || (okCount + failCount)
            });
          } else {
            setPhotoPackMeta(null);
            // Commons fallback already skips URLs present in Cache Storage.
            const result = await cacheCuratedPhotos(photos, signal, function (state) {
              okCount = state.okCount;
              failCount = state.failCount;
              progress("photos", 1, {
                photoOk: okCount,
                photoFail: failCount,
                photoEtaSec: state.photoEtaSec
              });
            });
            okCount = result.okCount;
            failCount = result.failCount;
            photoInstall = result;
          }
        } catch (error) {
          if (isQuotaError(error)) throw new Error("Spazio insufficiente sul telefono.");
          throw error;
        }
        if (!photoReused) {
          const expected = photoPack ? (okCount + failCount) : photos.length;
          const ratio = expected ? okCount / expected : 1;
          if (ratio < PHOTO_OK_RATIO) {
            throw new Error(
              "Molte foto non raggiungibili (" + okCount + "/" + expected + "): riprova più tardi."
            );
          }
        }
      } else {
        await purgePhotoCache();
      }

      if (mapKey) {
        const pack = manifest().packs[mapKey];
        if (!packAvailable(mapKey)) {
          throw new Error("Pacchetto mappa non disponibile sul server.");
        }
        const localMap = await inspectLocalMapPack(mapKey);
        if (localMap.stale) await removeMapFile(pack.file);
        const already = localMap.complete || (await verifyMapFile(mapKey));
        if (!already) {
          const mapBytes = mapPackBytes(mapKey);
          const missing = localMap.stale ? mapBytes : localMap.missingBytes;
          progress("maps", 1, {
            photoReused: photoReused,
            mapReceived: localMap.stale ? 0 : localMap.presentBytes,
            mapTotal: mapBytes,
            toDownloadBytes: missing,
            mapPartsPresent: localMap.stale ? 0 : localMap.presentParts,
            mapPartsTotal: localMap.totalParts
          });
          await downloadMapPack(mapKey, function (received, total, extra) {
            if (signal.aborted) return;
            const saving = extra && extra.mapPhase === "saving";
            const mapJob = Object.assign({
              status: "busy",
              target: target,
              phase: saving ? "maps-saving" : "maps",
              done: done,
              total: totalSteps,
              mapReceived: received,
              mapTotal: total,
              photoReused: photoReused,
              toDownloadBytes: Math.max(0, total - received)
            }, extra || {});
            setJob(mapJob);
            if (ui && ui.onProgress) ui.onProgress(mapJob);
          }, signal);
        } else if (photoReused) {
          progress("maps", 1, { photoReused: true, mapSkipped: true, toDownloadBytes: 0 });
        }
        const keepFile = pack.file;
        await purgeMapFiles(keepFile);
      } else {
        await purgeMapFiles(null);
      }

      if (facilityPack) {
        const facSize = await idbMapSize(facilityPack.file);
        if (facSize !== facilityPack.bytes) {
          progress("facilities", 1, { photoReused: photoReused });
          await installFacilityPack(facilityPack, signal, function (received, total) {
            if (signal.aborted) return;
            const facJob = Object.assign({
              status: "busy",
              target: target,
              phase: "facilities",
              done: done,
              total: totalSteps,
              photoReused: photoReused,
              facilityReceived: received,
              facilityTotal: total
            });
            setJob(facJob);
            if (ui && ui.onProgress) ui.onProgress(facJob);
          });
        } else {
          progress("facilities", 1, { photoReused: photoReused, facilitySkipped: true });
        }
      } else if (!needsFacilities(parsed.level)) {
        await purgeFacilityPack();
      }

      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      const verifyJob = {
        status: "busy",
        target: target,
        phase: "verify",
        done: done,
        total: totalSteps,
        error: null,
        photoReused: photoReused
      };
      setJob(verifyJob);
      if (ui && ui.onProgress) ui.onProgress(verifyJob);

      const verified = await verifyJobComplete(target, photoInstall);
      if (!verified.ok) throw new Error(verified.reason || "Verifica fallita.");

      if (jobAbort !== controller) return { ok: false, cancelled: true };
      await purgeForTarget(target);
      promoteTier(target);
      if (ui && ui.onComplete) ui.onComplete(target);
      return { ok: true };
    } catch (error) {
      // Cancel nulls jobAbort before a hung await rejects; a newer Riprendi
      // may already own the slot — never clobber that job's storage.
      if (jobAbort && jobAbort !== controller) {
        return { ok: false, cancelled: true };
      }
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
      // Only release if this invocation still owns the slot — a newer runJob
      // (Riprendi after cancel of a hung await) must keep its controller.
      if (jobAbort === controller) jobAbort = null;
    }
  }

  async function verifyJobComplete(target, photoInstall) {
    const parsed = parseTarget(target);
    if (needsPhotos(parsed.level)) {
      const counted = await countCachedCuratedPhotos();
      const minOk = Math.ceil(counted.expected * PHOTO_OK_RATIO);
      let packMeta = null;
      let packAccepted = false;
      if (photoInstall && photoInstall.mode === "pack") {
        packMeta = photoInstall.packMeta || {
          okCount: photoInstall.okCount,
          expected: photoInstall.expected || (photoInstall.okCount + (photoInstall.failCount || 0))
        };
        packAccepted = photoPackInstallAccepted(packMeta);
      } else if (!photoInstall || photoInstall.reused) {
        packMeta = (photoInstall && photoInstall.packMeta) || getPhotoPackMeta();
        packAccepted = photoPackInstallAccepted(packMeta);
      }
      // Raw cache.keys().length undercounts when many items share one Commons URL.
      if (counted.ok < minOk && !packAccepted) {
        return {
          ok: false,
          reason: "Foto in cache insufficienti ("
            + counted.ok + "/" + counted.expected + " schede; "
            + counted.hitUrls + "/" + counted.uniqueUrls + " URL, "
            + counted.keys + " chiavi"
            + (packMeta
              ? "; pack " + (packMeta.okCount || 0) + "/" + (packMeta.expected || 0)
              : "")
            + ")."
        };
      }
    }
    const mapKey = mapPackKey(parsed.level, parsed.zoom);
    if (mapKey) {
      if (!(await verifyMapFile(mapKey))) return { ok: false, reason: "File mappa non verificato." };
    }
    if (!(await verifyFacilityPack())) return { ok: false, reason: "Pacchetto servizi non verificato." };
    return { ok: true };
  }

  function tierBannerText() {
    const tier = getActiveTier();
    const job = getJob();
    if (job && (job.status === "partial" || job.status === "busy")) {
      return null;
    }
    if (activeTierMissingBytes > 0) {
      if (tier.level === "minimo" || tier.level === "medio") {
        return "Offline: guide e testi. Servizi sulla mappa richiedono un aggiornamento (Impostazioni → Dati offline).";
      }
      return "Offline: contenuti parziali — scarica l'aggiornamento in Impostazioni → Dati offline.";
    }
    if (tier.level === "minimo") {
      return "Offline: guide, testi e servizi utili sulla mappa. Foto e tiles richiedono rete.";
    }
    if (tier.level === "medio") {
      return "Offline: guide, testi, foto e servizi utili sulla mappa. I tiles richiedono rete.";
    }
    if (tier.level === "ampio") {
      return "Offline: guide, foto, mappe e servizi utili intorno alle tappe.";
    }
    return "Offline: guida, foto, mappa del Giappone e servizi utili sulle tappe.";
  }

  function upgradeConfirmMessage(bytes) {
    return "Manca un aggiornamento offline (circa " + humanBytes(bytes) + "). Scaricare?";
  }

  function confirmMessage(target, activeKey, toDownloadBytes) {
    const opt = sizes().options[target];
    const fullLabel = opt ? opt.label : "";
    const deltaLabel = humanBytes(toDownloadBytes);
    const activeParsed = parseTarget(activeKey);
    const targetParsed = parseTarget(target);
    const activeLabel = LEVELS.find(function (l) { return l.id === activeParsed.level; });
    const targetLabel = (LEVELS.find(function (l) { return l.id === targetParsed.level; }) || {}).label;
    const goingUp = compareTarget(target, activeKey) > 0;
    if (goingUp) {
      if (toDownloadBytes === 0) {
        return "Niente di nuovo da scaricare; aggiorno solo il piano attivo. Continuare?";
      }
      if (needsPhotos(activeParsed.level) && needsPhotos(targetParsed.level) && needsMap(targetParsed.level)) {
        return "Le foto restano sul telefono; scaricherò solo ciò che manca della mappa del piano "
          + (targetLabel || "")
          + " (circa " + deltaLabel + " rimanenti). Continuare?";
      }
      return "Scaricherò circa " + deltaLabel + " rimanenti sul telefono"
        + (fullLabel ? " (piano completo " + fullLabel + ")" : "")
        + ". Senza rete avrai tutto ciò che include questo piano. Continuare?";
    }
    return "Eliminerò i dati oltre il piano " + (activeLabel ? activeLabel.label : "") + " e libererò spazio. Offline resterà solo: " + describeTarget(target) + ". Continuare?";
  }

  /** Status line when photos and/or map parts are already on device. */
  function resumeSkipStatusText(job) {
    if (Resume && typeof Resume.resumeSkipStatusText === "function") {
      return Resume.resumeSkipStatusText(
        job,
        needsMap(parseTarget((job && job.target) || "").level)
      );
    }
    return "";
  }

  function describeTarget(key) {
    const p = parseTarget(key);
    if (p.level === "minimo") return "testi, guide e servizi utili sulla mappa";
    if (p.level === "medio") return "testi, guide, foto e servizi utili sulla mappa";
    if (p.level === "ampio") return "testi, foto, mappe delle tappe e servizi utili (z" + p.zoom + ")";
    return "tutto incluso mappa del Giappone e servizi utili sulle tappe (z" + p.zoom + ")";
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
    const dialogTitle = document.getElementById("offlinePackDialogTitle");
    let pendingTarget = null;
    let pendingRelease = "";
    let pendingUpgradeOnly = false;
    let upgradeConfirmClicked = false;
    let upgradePromptShownSession = false;
    // Chiudi su un job parziale nasconde Riprendi/Chiudi senza cancellare
    // tabi-offline-job: i byte restano e Riprendi torna al prossimo render
    // utile (cambio piano o nuovo progresso).
    let partialUiDismissed = false;
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
        let pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
        let phaseLabel = "";
        if (job.phase === "photos-reuse") {
          statusEl.textContent = resumeSkipStatusText(Object.assign({}, job, {
            target: job.target || selectedTarget()
          })) || (needsMap(parseTarget(job.target || selectedTarget()).level)
            ? "Foto già presenti — scarico solo la mappa…"
            : "Foto già presenti — niente da riscaricare.");
          statusEl.dataset.tone = "";
          if (progressEl) {
            progressEl.hidden = false;
            progressEl.value = Math.max(pct, 40);
          }
          return;
        }
        if (job.phase === "photos" || job.phase === "photos-download") {
          const got = job.photoReceived || 0;
          const need = job.photoTotal || 0;
          if (need > 0) {
            pct = Math.min(99, Math.round((got / need) * 100));
            phaseLabel = " (foto " + humanBytes(got) + "/" + humanBytes(need) + ")";
          } else {
            phaseLabel = " (foto" + formatEtaSec(job.photoEtaSec) + ")";
          }
        } else if (job.phase === "photos-install") {
          pct = 99;
          if (job.photoInstallTotal) {
            phaseLabel = " (installazione foto "
              + (job.photoInstallDone || 0) + "/" + job.photoInstallTotal
              + (job.photoOk != null ? " · ok " + job.photoOk : "")
              + ")";
          } else {
            phaseLabel = " (installazione foto…)";
          }
        } else if (job.phase === "maps-saving") {
          pct = 99;
          const partInfo = job.mapSavingParts
            ? " (" + (job.mapSavingPart || 0) + "/" + job.mapSavingParts + ")"
            : "";
          statusEl.textContent = "Salvataggio mappa…" + partInfo;
          statusEl.dataset.tone = "";
          if (progressEl) {
            progressEl.hidden = false;
            progressEl.value = pct;
          }
          return;
        } else if (job.phase === "verify") {
          pct = 99;
          statusEl.textContent = "Verifica pacchetto…";
          statusEl.dataset.tone = "";
          if (progressEl) {
            progressEl.hidden = false;
            progressEl.value = pct;
          }
          return;
        } else if (job.phase === "maps") {
          const got = job.mapReceived || 0;
          const need = job.mapTotal || 0;
          // Network complete is not job complete — keep bar under 100 until save+verify.
          if (need > 0) pct = Math.min(99, Math.round((got / need) * 100));
          const skipLine = resumeSkipStatusText(job);
          if (skipLine) {
            statusEl.textContent = need > 0
              ? (skipLine.replace(/…$/, "") + " "
                + pct + "% (" + humanBytes(got) + "/" + humanBytes(need)
                + formatEtaSec(job.mapEtaSec) + ")")
              : skipLine;
            statusEl.dataset.tone = "";
            if (progressEl) {
              progressEl.hidden = false;
              progressEl.value = pct;
            }
            return;
          }
          phaseLabel = " (mappa " + humanBytes(got) + "/" + humanBytes(need) + formatEtaSec(job.mapEtaSec) + ")";
        }
        statusEl.textContent = "Scarico… " + pct + "%" + phaseLabel;
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
      const levelLabel = LEVELS.find(function (l) { return l.id === active.level; }).label;
      const zoomSuffix = needsMap(active.level) ? " (z" + active.zoom + ")" : "";
      const sizeLabel = opt ? opt.label : "";
      if (activeTierMissingBytes > 0) {
        statusEl.textContent = "Piano attivo: " + levelLabel + zoomSuffix
          + " · manca un aggiornamento (circa " + humanBytes(activeTierMissingBytes) + ")";
        statusEl.dataset.tone = "warn";
        if (progressEl) progressEl.hidden = true;
        return;
      }
      statusEl.textContent = "Piano attivo: " + levelLabel + zoomSuffix
        + " · " + sizeLabel + " — completo";
      statusEl.dataset.tone = "ok";
      if (progressEl) progressEl.hidden = true;
    }

    function revertDraftToActive() {
      draftKey = null;
      pendingTarget = null;
      renderTiers();
      renderActions();
    }

    function renderActions() {
      const active = getActiveTier();
      const job = getJob();
      const target = selectedTarget();
      actionsEl.innerHTML = "";
      if (job && job.status === "partial" && !partialUiDismissed) {
        const resume = document.createElement("button");
        resume.type = "button";
        resume.textContent = "Riprendi";
        resume.addEventListener("click", function () {
          partialUiDismissed = false;
          startChange(job.target || target);
        });
        actionsEl.appendChild(resume);
        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "Nascondi";
        close.addEventListener("click", function () {
          // Keep tabi-offline-job + bytes so Riprendi remains possible.
          partialUiDismissed = true;
          renderAll();
        });
        actionsEl.appendChild(close);
        return;
      }
      if (job && job.status === "busy") {
        // Only offer Annulla when this tab can abort — otherwise reclaim should
        // have already demoted the row to partial (Riprendi / Chiudi).
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.textContent = "Annulla";
        cancel.addEventListener("click", function () {
          cancelBusyJob();
          partialUiDismissed = false;
          renderAll();
        });
        actionsEl.appendChild(cancel);
        return;
      }
      if (job && job.status === "partial" && partialUiDismissed) {
        const resume = document.createElement("button");
        resume.type = "button";
        resume.textContent = "Riprendi download";
        resume.addEventListener("click", function () {
          partialUiDismissed = false;
          startChange(job.target || target);
        });
        actionsEl.appendChild(resume);
      }
      if (target === active.key && activeTierMissingBytes > 0 && !(job && job.status === "partial")) {
        const upgrade = document.createElement("button");
        upgrade.type = "button";
        upgrade.textContent = "Scarica aggiornamento";
        upgrade.addEventListener("click", function () {
          openUpgradeConfirm(active.key, activeTierMissingBytes);
        });
        actionsEl.appendChild(upgrade);
        return;
      }
      if (target !== active.key) {
        const apply = document.createElement("button");
        apply.type = "button";
        apply.textContent = compareTarget(target, active.key) > 0 ? "Scarica piano" : "Riduci piano";
        apply.addEventListener("click", function () { openConfirm(target); });
        actionsEl.appendChild(apply);
        const cancelDraft = document.createElement("button");
        cancelDraft.type = "button";
        cancelDraft.textContent = "Annulla";
        cancelDraft.addEventListener("click", revertDraftToActive);
        actionsEl.appendChild(cancelDraft);
      }
    }

    function renderAll() {
      reclaimOrphanBusyJob();
      refreshActiveTierMissingBytes().then(function () {
        renderTiers();
        renderStatus();
        renderActions();
        refreshStorageLine();
      });
    }

    async function maybePromptTierUpgrade() {
      const settingsView = document.getElementById("settings");
      if (!settingsView || !settingsView.classList.contains("is-active")) return;
      const job = getJob();
      if (job && (job.status === "busy" || job.status === "partial")) return;
      if (!navigator.onLine) return;
      if (upgradePromptShownSession) return;
      if (activeTierMissingBytes <= 0) return;
      upgradePromptShownSession = true;
      openUpgradeConfirm(getActiveTier().key, activeTierMissingBytes);
    }

    async function bootPanel() {
      reclaimOrphanBusyJob();
      await refreshActiveTierMissingBytes();
      renderTiers();
      renderStatus();
      renderActions();
      refreshStorageLine();
      // Upgrade prompt only when Impostazioni is on screen — never over Viaggio.
    }

    function openUpgradeConfirm(target, bytes) {
      if (!navigator.onLine) {
        statusEl.textContent = "Serve la rete per scaricare l'aggiornamento.";
        statusEl.dataset.tone = "warn";
        return;
      }
      pendingTarget = target;
      pendingUpgradeOnly = true;
      let body = upgradeConfirmMessage(bytes);
      const parsed = parseTarget(target);
      const cell = cellularWarning();
      if (cell && (needsMap(parsed.level) || parsed.level === "ampio" || parsed.level === "max")) {
        body += "\n\n" + cell;
      }
      if (dialogBody) dialogBody.textContent = body;
      if (dialogTitle) dialogTitle.textContent = "Aggiornamento offline?";
      if (dialog) dialog.showModal();
    }

    async function openConfirm(target) {
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
      pendingUpgradeOnly = false;
      const active = getActiveTier();
      const goingUp = compareTarget(target, active.key) > 0;
      let toDownloadBytes = 0;
      if (goingUp) {
        statusEl.textContent = "Calcolo cosa scaricare…";
        statusEl.dataset.tone = "";
        try {
          toDownloadBytes = await estimateDownloadBytes(target);
        } catch (_) {
          const opt = sizes().options[target];
          toDownloadBytes = opt ? opt.bytes : 0;
        }
      }
      if (pendingTarget !== target) return;
      let body = confirmMessage(target, active.key, toDownloadBytes);
      const cell = cellularWarning();
      if (cell && (parseTarget(target).level === "ampio" || parseTarget(target).level === "max")) {
        body += "\n\n" + cell;
      }
      if (dialogBody) dialogBody.textContent = body;
      if (dialogTitle) dialogTitle.textContent = "Cambiare piano offline?";
      if (dialog) dialog.showModal();
    }

    async function startChange(target) {
      if (dialog) dialog.close();
      pendingUpgradeOnly = false;
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
      // Confirm opens only via Scarica piano / Riduci piano — browsing tiers
      // must not spam the modal on every radio change.
    }

    if (dialogConfirm) {
      dialogConfirm.addEventListener("click", function () {
        if (pendingTarget) {
          upgradeConfirmClicked = true;
          partialUiDismissed = false;
          startChange(pendingTarget);
        }
      });
    }

    const dialogCancel = document.getElementById("offlinePackDialogCancel");
    if (dialogCancel) {
      dialogCancel.addEventListener("click", function () {
        if (dialog) dialog.close();
      });
    }

    if (dialog) {
      dialog.addEventListener("close", function () {
        if (pendingUpgradeOnly && !upgradeConfirmClicked) {
          upgradePromptShownSession = true;
        }
        const dismissedTierChange = !upgradeConfirmClicked && !pendingUpgradeOnly && pendingTarget;
        pendingUpgradeOnly = false;
        upgradeConfirmClicked = false;
        pendingTarget = null;
        if (dismissedTierChange) revertDraftToActive();
        if (dialogTitle) dialogTitle.textContent = "Cambiare piano offline?";
      });
    }

    tierList.addEventListener("change", onSelectionChange);
    zoomList.addEventListener("change", onSelectionChange);

    window.addEventListener("tabi:viewchange", function (event) {
      if (event.detail && event.detail.view === "settings") {
        refreshActiveTierMissingBytes().then(function () {
          renderAll();
          maybePromptTierUpgrade();
        });
      }
    });

    pendingRelease = window.TABI_RELEASE || "";
    bootPanel();
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
    getMapBlob: getMapBlob,
    getMapBlobUrl: getMapBlobUrl,
    loadFacilityPack: loadFacilityPack,
    needsFacilities: needsFacilities,
    estimateDownloadBytes: estimateDownloadBytes,
    refreshActiveTierMissingBytes: refreshActiveTierMissingBytes,
    missingBytesForActiveTier: function () { return activeTierMissingBytes; },
    onTierChange: function (fn) {
      tierListeners.push(fn);
    },
    setupUI: setupUI
  };
})();
