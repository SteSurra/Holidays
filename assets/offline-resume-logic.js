/**
 * Pure offline resume helpers (Node-testable, no DOM / IDB / OPFS).
 * Used by assets/offline-pack.js in the browser and by
 * scripts/test-offline-resume.mjs in CI.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) root.TABI_OFFLINE_RESUME = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PHOTO_OK_RATIO = 0.95;

  function sumSourceBytes(sources) {
    return (sources || []).reduce(function (sum, src) {
      return sum + (src && src.bytes ? src.bytes : 0);
    }, 0);
  }

  /**
   * IDB multi-part presence from known part sizes (null/undefined = missing).
   * Complete parts must match manifest bytes exactly.
   */
  function inspectIdbParts(sources, partSizes, packBytes, meta) {
    const list = sources || [];
    const totalParts = list.length;
    const expectedBytes = packBytes != null ? packBytes : sumSourceBytes(list);
    const empty = {
      complete: false,
      presentBytes: 0,
      missingBytes: expectedBytes,
      presentParts: 0,
      totalParts: totalParts,
      partOk: list.map(function () { return false; }),
      fetchIndexes: list.map(function (_, i) { return i; }),
      skipIndexes: [],
      stale: false,
      backend: "none"
    };
    if (!totalParts) return empty;

    if (meta && meta.multi
      && (meta.bytes !== expectedBytes || meta.partCount !== totalParts)) {
      return Object.assign({}, empty, { stale: true });
    }

    const partOk = [];
    const fetchIndexes = [];
    const skipIndexes = [];
    let presentBytes = 0;
    let presentParts = 0;
    for (let i = 0; i < totalParts; i += 1) {
      const expected = list[i].bytes;
      const size = partSizes && partSizes[i];
      const ok = size === expected;
      partOk.push(ok);
      if (ok) {
        presentBytes += expected;
        presentParts += 1;
        skipIndexes.push(i);
      } else {
        fetchIndexes.push(i);
      }
    }
    return {
      complete: presentParts === totalParts && presentBytes === expectedBytes,
      presentBytes: presentBytes,
      missingBytes: Math.max(0, expectedBytes - presentBytes),
      presentParts: presentParts,
      totalParts: totalParts,
      partOk: partOk,
      fetchIndexes: fetchIndexes,
      skipIndexes: skipIndexes,
      stale: false,
      backend: presentParts > 0 ? "idb-parts" : "none"
    };
  }

  /** Contiguous OPFS / Range-resume prefix → which whole parts are already covered. */
  function inspectOpfsPrefix(sources, opfsSize, packBytes) {
    const list = sources || [];
    const totalParts = list.length;
    const expectedBytes = packBytes != null ? packBytes : sumSourceBytes(list);
    const empty = {
      complete: false,
      presentBytes: 0,
      missingBytes: expectedBytes,
      presentParts: 0,
      totalParts: totalParts,
      partOk: list.map(function () { return false; }),
      fetchIndexes: list.map(function (_, i) { return i; }),
      skipIndexes: [],
      stale: false,
      backend: "none"
    };
    if (!totalParts) return empty;
    if (opfsSize === expectedBytes) {
      return {
        complete: true,
        presentBytes: expectedBytes,
        missingBytes: 0,
        presentParts: totalParts,
        totalParts: totalParts,
        partOk: list.map(function () { return true; }),
        fetchIndexes: [],
        skipIndexes: list.map(function (_, i) { return i; }),
        stale: false,
        backend: "opfs"
      };
    }
    if (!(opfsSize > 0) || opfsSize > expectedBytes) return empty;

    let covered = 0;
    let presentParts = 0;
    const partOk = [];
    const skipIndexes = [];
    const fetchIndexes = [];
    for (let i = 0; i < totalParts; i += 1) {
      if (opfsSize >= covered + list[i].bytes) {
        partOk.push(true);
        presentParts += 1;
        skipIndexes.push(i);
        covered += list[i].bytes;
      } else {
        partOk.push(false);
        fetchIndexes.push(i);
        for (let j = i + 1; j < totalParts; j += 1) {
          partOk.push(false);
          fetchIndexes.push(j);
        }
        break;
      }
    }
    return {
      complete: false,
      presentBytes: opfsSize,
      missingBytes: expectedBytes - opfsSize,
      presentParts: presentParts,
      totalParts: totalParts,
      partOk: partOk,
      fetchIndexes: fetchIndexes,
      skipIndexes: skipIndexes,
      stale: false,
      backend: "opfs"
    };
  }

  /**
   * Simulate the IDB multi-part download planner: only missing/incomplete parts
   * are queued. Returns the fetch list a real downloader would issue.
   */
  function planPartFetches(sources, partSizes, packBytes, meta) {
    const inspection = inspectIdbParts(sources, partSizes, packBytes, meta);
    if (inspection.stale) {
      return {
        fetchIndexes: (sources || []).map(function (_, i) { return i; }),
        skipIndexes: [],
        fetchBytes: sumSourceBytes(sources),
        skipBytes: 0,
        inspection: inspection
      };
    }
    let fetchBytes = 0;
    let skipBytes = 0;
    const fetches = [];
    for (let i = 0; i < inspection.fetchIndexes.length; i += 1) {
      const index = inspection.fetchIndexes[i];
      const src = sources[index];
      fetchBytes += src.bytes;
      fetches.push({ index: index, bytes: src.bytes, url: src.url || null });
    }
    for (let i = 0; i < inspection.skipIndexes.length; i += 1) {
      skipBytes += sources[inspection.skipIndexes[i]].bytes;
    }
    return {
      fetchIndexes: inspection.fetchIndexes.slice(),
      skipIndexes: inspection.skipIndexes.slice(),
      fetchBytes: fetchBytes,
      skipBytes: skipBytes,
      fetches: fetches,
      inspection: inspection
    };
  }

  /**
   * Photo reuse gate (same rules as photosAlreadyOnDevice, without Cache API).
   * counted: { ok, expected }; packMeta optional; packBytes from manifest.
   */
  function photosAlreadyOnDeviceDecision(counted, packMeta, packBytes, ratio) {
    const okRatio = ratio == null ? PHOTO_OK_RATIO : ratio;
    const expected = counted && counted.expected || 0;
    const ok = counted && counted.ok || 0;
    const minOk = Math.ceil(expected * okRatio);
    if (expected > 0 && ok >= minOk) {
      return { ok: true, reason: "cache-hits" };
    }
    const metaAccepted = !!(
      packMeta
      && packMeta.expected
      && (packMeta.okCount || 0) / packMeta.expected >= okRatio
      && (packBytes == null || packMeta.bytes == null || packMeta.bytes === packBytes)
    );
    if (metaAccepted && ok > 0) {
      return { ok: true, reason: "pack-meta" };
    }
    return { ok: false };
  }

  /** Remaining download for confirm dialog / progress: photos if needed + missing map + facilities. */
  function estimateRemainingDownloadBytes(opts) {
    return inspectTierGap(opts).totalBytes;
  }

  /** Byte breakdown when an installed tier is missing pack components (e.g. facilities). */
  function inspectTierGap(opts) {
    const options = opts || {};
    let photoMissingBytes = 0;
    if (options.needsPhotos && !options.photosAlreadyOnDevice) {
      photoMissingBytes = options.photoBytes || 0;
    }
    const mapMissingBytes = options.mapComplete
      ? 0
      : (options.mapMissingBytes || 0);
    const facilityMissingBytes = options.facilityMissingBytes || 0;
    return {
      photoMissingBytes: photoMissingBytes,
      mapMissingBytes: mapMissingBytes,
      facilityMissingBytes: facilityMissingBytes,
      totalBytes: photoMissingBytes + mapMissingBytes + facilityMissingBytes
    };
  }

  function mapPartProgressExtra(sources, offsetOrPartOk) {
    if (!sources || sources.length <= 1) return {};
    let presentParts = 0;
    if (Array.isArray(offsetOrPartOk)) {
      for (let i = 0; i < offsetOrPartOk.length; i += 1) {
        if (offsetOrPartOk[i]) presentParts += 1;
      }
    } else {
      let covered = 0;
      const offset = offsetOrPartOk || 0;
      for (let i = 0; i < sources.length; i += 1) {
        if (offset >= covered + sources[i].bytes) {
          presentParts += 1;
          covered += sources[i].bytes;
        } else break;
      }
    }
    return {
      mapPartsPresent: presentParts,
      mapPartsTotal: sources.length
    };
  }

  function resumeSkipStatusText(job, needsMapFlag) {
    if (!job) return "";
    const partsTotal = job.mapPartsTotal || 0;
    const partsPresent = job.mapPartsPresent || 0;
    const mapPartsLine = partsTotal > 1 && partsPresent > 0 && partsPresent < partsTotal
      ? ("mappa: " + partsPresent + "/" + partsTotal + " pezzi già salvati, scarico il resto")
      : "";
    if (job.photoReused && mapPartsLine) {
      return "Foto già presenti · " + mapPartsLine + "…";
    }
    if (job.photoReused) {
      return needsMapFlag
        ? "Foto già presenti — scarico solo la mappa…"
        : "Foto già presenti — niente da riscaricare.";
    }
    if (mapPartsLine) return mapPartsLine.charAt(0).toUpperCase() + mapPartsLine.slice(1) + "…";
    return "";
  }

  return {
    PHOTO_OK_RATIO: PHOTO_OK_RATIO,
    sumSourceBytes: sumSourceBytes,
    inspectIdbParts: inspectIdbParts,
    inspectOpfsPrefix: inspectOpfsPrefix,
    planPartFetches: planPartFetches,
    photosAlreadyOnDeviceDecision: photosAlreadyOnDeviceDecision,
    estimateRemainingDownloadBytes: estimateRemainingDownloadBytes,
    inspectTierGap: inspectTierGap,
    mapPartProgressExtra: mapPartProgressExtra,
    resumeSkipStatusText: resumeSkipStatusText
  };
});
