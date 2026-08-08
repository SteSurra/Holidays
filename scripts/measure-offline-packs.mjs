#!/usr/bin/env node
/**
 * Measure real byte sizes for offline pack UI options (shell / photos / PMTiles).
 * Writes story-work/offline-size-ledger.json + .md for later UI labels.
 *
 *   node scripts/measure-offline-packs.mjs
 *   node scripts/measure-offline-packs.mjs --photos-only
 *   node scripts/measure-offline-packs.mjs --maps-only
 *   node scripts/measure-offline-packs.mjs --skip-maps
 *
 * PROTOMAPS_SRC overrides the default planet PMTiles URL.
 * PMTILES_BIN overrides the go-pmtiles binary path.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TMP_PACKS = path.join(ROOT, "tmp", "offline-packs");
const REGION_GEOJSON = path.join(ROOT, "scripts", "offline-pack-regions", "ampio-tappe.geojson");
const LEDGER_JSON = path.join(ROOT, "story-work", "offline-size-ledger.json");
const LEDGER_MD = path.join(ROOT, "story-work", "offline-size-ledger.md");
const SIZE_DATA_JS = path.join(ROOT, "assets", "offline-size-data.js");
const FACILITY_META = path.join(ROOT, "tmp", "offline-packs", "facilities-ampio.meta.json");
const DEFAULT_SRC = "https://build.protomaps.com/20260806.pmtiles";
const PHOTO_WIDTH = 960;
const PHOTO_CONCURRENCY = 2;
const UA =
  "TabiTravelGuideOfflineMeasure/1.0 (https://github.com/SteSurra/Holidays; offline pack size measurement) node";
const JAPAN_BBOX = "129.0,30.9,145.9,45.6";

const args = new Set(process.argv.slice(2));
const photosOnly = args.has("--photos-only");
const mapsOnly = args.has("--maps-only");
const skipMaps = args.has("--skip-maps") || photosOnly;
const skipPhotos = mapsOnly;
const skipShell = mapsOnly || photosOnly;

function die(message) {
  console.error(message);
  process.exit(1);
}

function humanBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let value = bytes / 1024;
  let unit = 0;
  while (Math.abs(value) >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

function resolvePmtilesBin() {
  if (process.env.PMTILES_BIN && existsSync(process.env.PMTILES_BIN)) {
    return process.env.PMTILES_BIN;
  }
  const local = path.join(ROOT, "tmp", "bin", "pmtiles");
  if (existsSync(local)) return local;
  const which = spawnSync("which", ["pmtiles"], { encoding: "utf8" });
  if (which.status === 0) return which.stdout.trim();
  return null;
}

function parseShellPaths() {
  const swPath = path.join(ROOT, "sw.js");
  const source = readFileSync(swPath, "utf8");
  const match = source.match(/const SHELL\s*=\s*\[([\s\S]*?)\];/);
  if (!match) die("Could not parse SHELL list from sw.js");
  const paths = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(match[1]))) {
    // Strip cache-busting ?v=… so we measure the on-disk file.
    const clean = m[1].replace(/\?v=[^"]*$/, "").replace(/^\.\//, "");
    paths.push(clean === "" ? "." : clean);
  }
  return { paths, swPath };
}

function measureShell() {
  const { paths, swPath } = parseShellPaths();
  const files = [];
  let totalBytes = 0;
  const seen = new Set();

  function addFile(relOrAbs, label) {
    const abs = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(ROOT, relOrAbs);
    const key = path.resolve(abs);
    if (seen.has(key)) return;
    seen.add(key);
    if (!existsSync(abs)) {
      files.push({ path: label || relOrAbs, bytes: null, missing: true });
      return;
    }
    const st = statSync(abs);
    // Directory "./" is listed in SHELL for SW scope; skip byte count.
    if (st.isDirectory()) {
      files.push({ path: label || relOrAbs, bytes: 0, directory: true });
      return;
    }
    totalBytes += st.size;
    files.push({ path: label || relOrAbs, bytes: st.size });
  }

  for (const p of paths) addFile(p, p);
  addFile(swPath, "sw.js");

  const missing = files.filter((f) => f.missing);
  if (missing.length) {
    console.warn(`Shell: ${missing.length} missing path(s): ${missing.map((f) => f.path).join(", ")}`);
  }
  console.log(`Shell: ${humanBytes(totalBytes)} across ${files.filter((f) => f.bytes != null && !f.directory).length} files`);
  return { totalBytes, files, missingCount: missing.length };
}

function loadCuratedImages() {
  const file = path.join(ROOT, "assets", "curated-images-data.js");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(readFileSync(file, "utf8"), context, { filename: "curated-images-data.js" });
  const map = context.window.TABI_CURATED_IMAGES || {};
  return Object.entries(map).map(([id, row]) => ({
    id,
    file: Array.isArray(row) ? row[0] : null
  })).filter((entry) => entry.file);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function measureOnePhoto(entry) {
  const url = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${entry.file}?width=${PHOTO_WIDTH}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "image/*,*/*;q=0.8" },
        redirect: "follow",
        signal: AbortSignal.timeout(45000)
      });
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After")) * 1000;
        await wait(Math.min(20000, Math.max(retryAfter || 0, 2000 * (attempt + 1))));
        continue;
      }
      if (!response.ok) {
        return { id: entry.id, file: entry.file, bytes: null, status: response.status, error: `HTTP ${response.status}` };
      }
      const headerLen = response.headers.get("Content-Length");
      if (headerLen && /^\d+$/.test(headerLen)) {
        // Drain body so the connection can close cleanly without buffering fully in memory when possible.
        try { await response.arrayBuffer(); } catch { /* ignore */ }
        return { id: entry.id, file: entry.file, bytes: Number(headerLen), status: response.status, via: "content-length" };
      }
      const buf = Buffer.from(await response.arrayBuffer());
      return { id: entry.id, file: entry.file, bytes: buf.byteLength, status: response.status, via: "body" };
    } catch (err) {
      if (attempt === 2) {
        return { id: entry.id, file: entry.file, bytes: null, status: null, error: String(err.message || err) };
      }
      await wait(1500 * (attempt + 1));
    }
  }
  return { id: entry.id, file: entry.file, bytes: null, status: null, error: "exhausted retries" };
}

async function measurePhotos() {
  const entries = loadCuratedImages();
  console.log(`Photos: measuring ${entries.length} curated files @ width=${PHOTO_WIDTH} (concurrency ${PHOTO_CONCURRENCY})…`);
  const results = new Array(entries.length);
  let cursor = 0;
  let done = 0;
  let totalBytes = 0;
  const failures = [];

  async function worker() {
    while (cursor < entries.length) {
      const index = cursor;
      cursor += 1;
      const result = await measureOnePhoto(entries[index]);
      results[index] = result;
      done += 1;
      if (result.bytes != null) totalBytes += result.bytes;
      else failures.push(result);
      if (done % 25 === 0 || done === entries.length) {
        console.log(`  photos ${done}/${entries.length} · ok sum ${humanBytes(totalBytes)} · fails ${failures.length}`);
      }
      // Polite pacing between requests per worker.
      await wait(350);
    }
  }

  await Promise.all(Array.from({ length: PHOTO_CONCURRENCY }, () => worker()));
  console.log(`Photos: ${humanBytes(totalBytes)} from ${entries.length - failures.length}/${entries.length} ok`);
  if (failures.length) {
    console.warn(`Photos: ${failures.length} failure(s). First few:`);
    for (const fail of failures.slice(0, 10)) {
      console.warn(`  - ${fail.id}: ${fail.error || fail.status}`);
    }
  }
  return {
    totalBytes,
    count: entries.length,
    okCount: entries.length - failures.length,
    failCount: failures.length,
    failures: failures.map((f) => ({ id: f.id, file: f.file, error: f.error || String(f.status) })),
    // Keep per-file detail out of the ledger body; available if needed later.
    sampleVia: results.find((r) => r && r.via)?.via || null
  };
}

function isValidPmtiles(bin, filePath) {
  if (!existsSync(filePath) || statSync(filePath).size < 16) return false;
  const check = spawnSync(bin, ["show", filePath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 2 * 1024 * 1024
  });
  return check.status === 0 && /pmtiles spec version/i.test(check.stdout || "");
}

function runPmtilesExtract({ bin, src, outName, maxzoom, region, bbox }) {
  mkdirSync(TMP_PACKS, { recursive: true });
  const outPath = path.join(TMP_PACKS, outName);
  // -q avoids progress-bar stderr that can blow Node's spawnSync maxBuffer
  // and kill multi-GB Japan extracts mid-download.
  const argv = ["-q", "extract", src, outPath, `--maxzoom=${maxzoom}`];
  if (region) argv.push(`--region=${region}`);
  if (bbox) argv.push(`--bbox=${bbox}`);
  console.log(`Maps: pmtiles ${argv.join(" ")}`);
  const started = Date.now();
  const result = spawnSync(bin, argv, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
    // Large Japan extracts can run for a long time.
    timeout: 0
  });
  const elapsedMs = Date.now() - started;
  if (result.error) {
    console.error(`Maps: FAILED ${outName}: ${result.error.message}`);
    return {
      name: outName,
      path: path.relative(ROOT, outPath),
      bytes: existsSync(outPath) ? statSync(outPath).size : null,
      maxzoom,
      mode: region ? "region" : "bbox",
      ok: false,
      error: result.error.message,
      elapsedMs
    };
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || `exit ${result.status}`).trim();
    console.error(`Maps: FAILED ${outName}: ${err.slice(0, 800)}`);
    return {
      name: outName,
      path: path.relative(ROOT, outPath),
      bytes: existsSync(outPath) ? statSync(outPath).size : null,
      maxzoom,
      mode: region ? "region" : "bbox",
      ok: false,
      error: err.slice(0, 2000),
      elapsedMs
    };
  }
  if (!existsSync(outPath)) {
    return {
      name: outName,
      path: path.relative(ROOT, outPath),
      bytes: null,
      maxzoom,
      mode: region ? "region" : "bbox",
      ok: false,
      error: "output file missing after extract",
      elapsedMs
    };
  }
  if (!isValidPmtiles(bin, outPath)) {
    console.error(`Maps: FAILED ${outName}: output is not a valid PMTiles archive`);
    return {
      name: outName,
      path: path.relative(ROOT, outPath),
      bytes: statSync(outPath).size,
      maxzoom,
      mode: region ? "region" : "bbox",
      ok: false,
      error: "output is not a valid PMTiles archive (incomplete extract?)",
      elapsedMs
    };
  }
  const bytes = statSync(outPath).size;
  console.log(`Maps: ${outName} → ${humanBytes(bytes)} (${Math.round(elapsedMs / 1000)}s)`);
  return {
    name: outName,
    path: path.relative(ROOT, outPath),
    bytes,
    maxzoom,
    mode: region ? "region" : "bbox",
    ok: true,
    elapsedMs
  };
}

function measureMaps(bin) {
  const src = process.env.PROTOMAPS_SRC || DEFAULT_SRC;
  if (!existsSync(REGION_GEOJSON)) {
    die(`Missing region geojson: ${REGION_GEOJSON}`);
  }
  const jobs = [
    { outName: "ampio-z14.pmtiles", maxzoom: 14, region: REGION_GEOJSON },
    { outName: "ampio-z15.pmtiles", maxzoom: 15, region: REGION_GEOJSON },
    { outName: "japan-z14.pmtiles", maxzoom: 14, bbox: JAPAN_BBOX },
    { outName: "japan-z15.pmtiles", maxzoom: 15, bbox: JAPAN_BBOX }
  ];
  const extracts = [];
  for (const job of jobs) {
    // Reuse a valid existing extract so re-runs can fill gaps.
    const existing = path.join(TMP_PACKS, job.outName);
    if (existsSync(existing) && isValidPmtiles(bin, existing)) {
      const bytes = statSync(existing).size;
      console.log(`Maps: reusing existing ${job.outName} (${humanBytes(bytes)})`);
      extracts.push({
        name: job.outName,
        path: path.relative(ROOT, existing),
        bytes,
        maxzoom: job.maxzoom,
        mode: job.region ? "region" : "bbox",
        ok: true,
        reused: true,
        elapsedMs: 0
      });
      continue;
    }
    if (existsSync(existing)) {
      console.warn(`Maps: discarding invalid/incomplete ${job.outName} (${humanBytes(statSync(existing).size)})`);
      try { unlinkSync(existing); } catch { /* extract will overwrite */ }
    }
    extracts.push(runPmtilesExtract({ bin, src, ...job }));
  }
  return { src, extracts };
}

function loadPreviousLedger() {
  if (!existsSync(LEDGER_JSON)) return null;
  try {
    return JSON.parse(readFileSync(LEDGER_JSON, "utf8"));
  } catch {
    return null;
  }
}

function measureFacilities() {
  if (!existsSync(FACILITY_META)) {
    console.warn(`Facilities: missing ${FACILITY_META} — run node scripts/build-offline-facility-pack.mjs`);
    return null;
  }
  const meta = JSON.parse(readFileSync(FACILITY_META, "utf8"));
  const bytes = meta.bytes ?? null;
  console.log(
    `Facilities: ${humanBytes(bytes)} (${meta.count ?? "—"} points, ${meta.bubbles ?? "—"} bubbles)`
  );
  return { totalBytes: bytes, meta };
}

function uiLabel(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1).replace(".", ",")} GB`;
  if (mb >= 100) return `${Math.round(mb)} MB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

function buildUiTotals({ shell, photos, maps, facilities }) {
  const shellBytes = shell?.totalBytes ?? null;
  const photoBytes = photos?.totalBytes ?? null;
  const facilityBytes = facilities?.totalBytes ?? null;
  const minimo =
    shellBytes != null
      ? (facilityBytes != null ? shellBytes + facilityBytes : shellBytes)
      : null;
  const medio =
    shellBytes != null && photoBytes != null
      ? (facilityBytes != null ? shellBytes + photoBytes + facilityBytes : shellBytes + photoBytes)
      : null;
  const byName = Object.fromEntries((maps?.extracts || []).filter((e) => e.ok).map((e) => [e.name, e.bytes]));

  function withMap(mapBytes) {
    if (medio == null || mapBytes == null) return null;
    return medio + mapBytes;
  }

  return {
    minimo,
    medio,
    ampio_z14: withMap(byName["ampio-z14.pmtiles"]),
    ampio_z15: withMap(byName["ampio-z15.pmtiles"]),
    max_z14: withMap(byName["japan-z14.pmtiles"]),
    max_z15: withMap(byName["japan-z15.pmtiles"])
  };
}

function writeSizeData(ledger) {
  const ui = ledger.uiTotals || {};
  const maps = Object.fromEntries(
    (ledger.maps?.extracts || []).filter((e) => e.ok).map((e) => {
      const key = e.name === "ampio-z14.pmtiles"
        ? "ampio_z14"
        : e.name === "ampio-z15.pmtiles"
          ? "ampio_z15"
          : e.name === "japan-z14.pmtiles"
            ? "max_z14"
            : e.name === "japan-z15.pmtiles"
              ? "max_z15"
              : null;
      return key ? [key, e.bytes] : [];
    }).filter((row) => row.length)
  );
  const options = {};
  for (const key of ["minimo", "medio", "ampio_z14", "ampio_z15", "max_z14", "max_z15"]) {
    options[key] = { bytes: ui[key] ?? null, label: uiLabel(ui[key]) };
  }
  const body = [
    "// Generated from story-work/offline-size-ledger.json — re-run measure-offline-packs.mjs to refresh.",
    "window.TABI_OFFLINE_SIZES = {",
    `  measuredAt: ${JSON.stringify(ledger.measuredAt)},`,
    "  options: {",
    ...Object.keys(options).map((key) =>
      `    ${key}: { bytes: ${options[key].bytes}, label: ${JSON.stringify(options[key].label)} },`
    ),
    "  },",
    "  components: {",
    `    shell: ${ledger.shell?.totalBytes ?? "null"},`,
    `    photos: ${ledger.photos?.totalBytes ?? "null"},`,
    `    facilities: ${ledger.facilities?.totalBytes ?? "null"},`,
    "    maps: {",
    ...Object.keys(maps).map((key) => `      ${key}: ${maps[key]},`),
    "    }",
    "  }",
    "};",
    ""
  ].join("\n");
  writeFileSync(SIZE_DATA_JS, body);
  console.log(`Wrote ${path.relative(ROOT, SIZE_DATA_JS)}`);
}

function writeLedger(ledger) {
  mkdirSync(path.dirname(LEDGER_JSON), { recursive: true });
  writeFileSync(LEDGER_JSON, JSON.stringify(ledger, null, 2) + "\n");

  const ui = ledger.uiTotals || {};
  const mapsNote = ledger.maps?.skipped
    ? ledger.maps.skipReason
    : (ledger.maps?.extracts || [])
      .map((e) => `${e.name}: ${e.ok ? humanBytes(e.bytes) : `FAILED (${e.error || "error"})`}`)
      .join("; ") || "—";

  const rows = [
    ["minimo", "Shell + facility layers", ui.minimo, "Shell files from sw.js SHELL + facilities-ampio.json.gz"],
    ["medio", "Shell + curated photos @960 + facility layers", ui.medio, `${ledger.photos?.okCount ?? "—"}/${ledger.photos?.count ?? "—"} photos ok + facilities`],
    ["ampio_z14", "Medio + Ampio z≤14 + facility layers", ui.ampio_z14, "region=ampio-tappe.geojson + facilities"],
    ["ampio_z15", "Medio + Ampio z≤15 + facility layers", ui.ampio_z15, "region=ampio-tappe.geojson + facilities"],
    ["max_z14", "Medio + Japan z≤14 + facility layers", ui.max_z14, `bbox=${JAPAN_BBOX} + trip-bubble facilities`],
    ["max_z15", "Medio + Japan z≤15 + facility layers", ui.max_z15, `bbox=${JAPAN_BBOX} + trip-bubble facilities`]
  ];

  const md = [
    "# Offline size ledger",
    "",
    `Measured: ${ledger.measuredAt}`,
    "",
    "Byte sizes for the offline-pack UI options. Prefer this file (and the JSON twin) over hand estimates.",
    "",
    "## UI options",
    "",
    "| Option | Includes | Bytes | Size | Notes |",
    "|---|---|---:|---:|---|",
    ...rows.map(([key, includes, bytes, notes]) =>
      `| \`${key}\` | ${includes} | ${bytes == null ? "—" : bytes} | ${humanBytes(bytes)} | ${notes} |`
    ),
    "",
    "## Components",
    "",
    `| Component | Bytes | Size | Detail |`,
    `|---|---:|---:|---|`,
    `| Shell | ${ledger.shell?.totalBytes ?? "—"} | ${humanBytes(ledger.shell?.totalBytes)} | ${ledger.shell?.files?.filter((f) => !f.directory && f.bytes != null).length ?? "—"} files; missing ${ledger.shell?.missingCount ?? 0} |`,
    `| Photos @${PHOTO_WIDTH} | ${ledger.photos?.totalBytes ?? "—"} | ${humanBytes(ledger.photos?.totalBytes)} | ok ${ledger.photos?.okCount ?? "—"} / ${ledger.photos?.count ?? "—"}; fails ${ledger.photos?.failCount ?? "—"} |`,
    `| Facilities (trip bubbles) | ${ledger.facilities?.totalBytes ?? "—"} | ${humanBytes(ledger.facilities?.totalBytes)} | ${ledger.facilities?.meta?.count ?? "—"} points; build with build-offline-facility-pack.mjs |`,
    `| Maps | — | — | ${mapsNote} |`,
    "",
    "## Map extracts",
    ""
  ];

  if (ledger.maps?.skipped) {
    md.push(`Skipped: ${ledger.maps.skipReason}`, "");
    md.push(
      "Install go-pmtiles (Darwin arm64 example):",
      "",
      "```bash",
      "mkdir -p tmp/bin",
      "curl -sL -o /tmp/go-pmtiles.zip \\",
      "  https://github.com/protomaps/go-pmtiles/releases/download/v1.31.2/go-pmtiles-1.31.2_Darwin_arm64.zip",
      "unzip -o /tmp/go-pmtiles.zip -d tmp/bin",
      "chmod +x tmp/bin/pmtiles",
      "export PATH=\"$PWD/tmp/bin:$PATH\"",
      "node scripts/measure-offline-packs.mjs --maps-only",
      "```",
      ""
    );
  } else {
    md.push("| Extract | Bytes | Size | Zoom | Mode | Status |", "|---|---:|---:|---:|---|---|");
    for (const e of ledger.maps?.extracts || []) {
      md.push(
        `| \`${e.name}\` | ${e.bytes ?? "—"} | ${humanBytes(e.bytes)} | z${e.maxzoom} | ${e.mode} | ${e.ok ? (e.reused ? "ok (reused)" : "ok") : "FAILED"} |`
      );
    }
    md.push("", `Source: \`${ledger.maps?.src || DEFAULT_SRC}\``, "");
  }

  if (ledger.photos?.failures?.length) {
    md.push("## Photo failures", "");
    for (const fail of ledger.photos.failures) {
      md.push(`- \`${fail.id}\`: ${fail.error} (\`${fail.file}\`)`);
    }
    md.push("");
  }

  if (ledger.partial) {
    md.push("## Partial run", "", ledger.partial, "");
  }

  md.push(
    "## Formulas",
    "",
    "- `minimo` = shell + facilities-ampio.json.gz",
    "- `medio` = shell + photos + facilities-ampio.json.gz",
    "- `ampio_z14` = medio + ampio-z14.pmtiles",
    "- `ampio_z15` = medio + ampio-z15.pmtiles",
    "- `max_z14` = medio + japan-z14.pmtiles",
    "- `max_z15` = medio + japan-z15.pmtiles",
    ""
  );

  writeFileSync(LEDGER_MD, md.join("\n"));
  writeSizeData(ledger);
  console.log(`Wrote ${path.relative(ROOT, LEDGER_JSON)}`);
  console.log(`Wrote ${path.relative(ROOT, LEDGER_MD)}`);
}

async function main() {
  if (photosOnly && mapsOnly) die("Use only one of --photos-only / --maps-only");

  const previous = loadPreviousLedger();
  const ledger = {
    measuredAt: new Date().toISOString(),
    protomapsSrcDefault: DEFAULT_SRC,
    japanBbox: JAPAN_BBOX,
    photoWidth: PHOTO_WIDTH,
    flags: {
      photosOnly,
      mapsOnly,
      skipMaps
    },
    shell: previous?.shell || null,
    photos: previous?.photos || null,
    maps: previous?.maps || null,
    facilities: previous?.facilities || null,
    uiTotals: null,
    partial: null
  };

  if (!skipShell) {
    ledger.shell = measureShell();
  } else if (!ledger.shell) {
    // Still need shell for medio totals when photos-only.
    ledger.shell = measureShell();
  }

  if (!skipPhotos) {
    ledger.photos = await measurePhotos();
  }

  const bin = resolvePmtilesBin();
  if (!skipMaps) {
    if (!bin) {
      ledger.maps = {
        skipped: true,
        skipReason:
          "go-pmtiles (`pmtiles`) not found on PATH or at tmp/bin/pmtiles. Install from https://github.com/protomaps/go-pmtiles/releases (Darwin arm64: go-pmtiles-*_Darwin_arm64.zip → tmp/bin/pmtiles), then re-run with --maps-only."
      };
      console.warn(ledger.maps.skipReason);
      ledger.partial = "Maps skipped (pmtiles CLI missing). Shell and photos measured.";
    } else {
      console.log(`Using pmtiles binary: ${bin}`);
      try {
        ledger.maps = measureMaps(bin);
        const failed = (ledger.maps.extracts || []).filter((e) => !e.ok);
        const ok = (ledger.maps.extracts || []).filter((e) => e.ok);
        if (failed.length) {
          ledger.partial = `Map extracts partial: ${ok.map((e) => e.name).join(", ") || "none"} ok; failed: ${failed.map((e) => e.name).join(", ")}.`;
        }
      } catch (err) {
        ledger.maps = {
          skipped: true,
          skipReason: `Map measurement aborted: ${err.message || err}`
        };
        ledger.partial = ledger.maps.skipReason;
      }
    }
  } else if (!ledger.maps) {
    ledger.maps = {
      skipped: true,
      skipReason: "--skip-maps / --photos-only: map extracts not run in this invocation."
    };
    ledger.partial = "Maps not measured in this run (--skip-maps or --photos-only).";
  }

  if (!ledger.facilities) {
    ledger.facilities = measureFacilities();
  }

  ledger.uiTotals = buildUiTotals(ledger);
  writeLedger(ledger);

  console.log("\nUI totals:");
  for (const [key, bytes] of Object.entries(ledger.uiTotals)) {
    console.log(`  ${key.padEnd(10)} ${humanBytes(bytes)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
