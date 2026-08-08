#!/usr/bin/env node
/**
 * Build gzip facility pack for Ampio/Max offline layers (trip bubbles only).
 *
 *   node scripts/build-offline-facility-pack.mjs
 *   node scripts/build-offline-facility-pack.mjs --dry-run
 *
 * Output: tmp/offline-packs/facilities-ampio.json.gz + facilities-ampio.meta.json
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REGION_GEOJSON = path.join(ROOT, "scripts", "offline-pack-regions", "ampio-tappe.geojson");
const PACK_DIR = path.join(ROOT, "tmp", "offline-packs");
const OUT_GZ = path.join(PACK_DIR, "facilities-ampio.json.gz");
const OUT_META = path.join(PACK_DIR, "facilities-ampio.meta.json");

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
const UA = "TabiTravelGuideFacilityPack/1.0 (https://github.com/SteSurra/Holidays; offline facility pack build)";
const BUBBLE_PAUSE_MS = 2500;
const dryRun = process.argv.includes("--dry-run");

const FACILITY_CLAUSES = [
  { kind: "toilet", clause: 'node["amenity"="toilets"]' },
  { kind: "water", clause: 'node["amenity"="drinking_water"]' },
  { kind: "konbini", clause: 'node["shop"="convenience"]' },
  { kind: "hospital", clause: 'node["amenity"="hospital"]' },
  { kind: "station", clause: 'node["railway"="station"]' }
];

function die(message) {
  console.error(message);
  process.exit(1);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadVm(file, expose) {
  const context = { window: expose || {} };
  vm.createContext(context);
  vm.runInContext(readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
  return context.window;
}

function loadCities() {
  const win = loadVm("assets/data.js", { TABI_PARSE: loadVm("assets/parse-lib.js").TABI_PARSE });
  const partial = win.__JAPAN_PARTIAL__;
  if (!partial || !partial.cities) die("Could not load cities from assets/data.js");
  return partial.cities;
}

function loadTransit() {
  return loadVm("assets/transit-data.js").JAPAN_TRANSIT;
}

function metersBetween(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestCity(lat, lng, cities) {
  return cities.reduce((best, city) => {
    const distance = metersBetween({ lat, lng }, city);
    return !best || distance < best.distance ? { city, distance } : best;
  }, null);
}

function isSubwayTags(tags) {
  return tags.station === "subway" || tags.subway === "yes";
}

function parseElements(elements, cities, transit) {
  const out = [];
  for (const element of elements || []) {
    const tags = element.tags || {};
    const lat = Number(element.lat);
    const lng = Number(element.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    let kind = null;
    if (tags.amenity === "toilets") kind = "toilet";
    else if (tags.amenity === "drinking_water") kind = "water";
    else if (tags.shop === "convenience") kind = "konbini";
    else if (tags.amenity === "hospital") kind = "hospital";
    else if (tags.railway === "station") kind = isSubwayTags(tags) ? "subway" : "station";
    if (!kind) continue;
    const city = (nearestCity(lat, lng, cities) || { city: { id: "" } }).city.id;
    const row = [
      kind,
      Math.round(lat * 1e5) / 1e5,
      Math.round(lng * 1e5) / 1e5,
      String(tags["name:en"] || tags.name || "").slice(0, 60),
      city
    ];
    if (kind === "station") {
      row.push(String(tags["operator:en"] || tags.operator || "").slice(0, 60));
    } else if (kind === "subway" && transit) {
      const line = transit.lineFor(tags, city);
      if (line) row.push(line.code || "", line.color || "", line.name || "", line.network || "");
    }
    out.push(row);
  }
  return out;
}

function ringToPoly(ring) {
  return ring.map(([lng, lat]) => `${lat} ${lng}`).join(" ");
}

function loadBubblePolys() {
  const geo = JSON.parse(readFileSync(REGION_GEOJSON, "utf8"));
  const polys = [];
  const bboxes = [];
  for (const feature of geo.features || []) {
    const geom = feature.geometry;
    if (!geom) continue;
    const groups = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
    for (const poly of groups) {
      const outer = poly[0];
      if (!outer || outer.length < 4) continue;
      polys.push(ringToPoly(outer));
      let south = Infinity;
      let north = -Infinity;
      let west = Infinity;
      let east = -Infinity;
      for (const [lng, lat] of outer) {
        south = Math.min(south, lat);
        north = Math.max(north, lat);
        west = Math.min(west, lng);
        east = Math.max(east, lng);
      }
      bboxes.push({ south, west, north, east });
    }
  }
  if (!polys.length) die(`No polygons in ${REGION_GEOJSON}`);
  return { polys, bboxes };
}

function overpassQuery(poly) {
  const clauses = FACILITY_CLAUSES.map((row) => `  ${row.clause}(poly:"${poly}");`).join("\n");
  return `[out:json][timeout:180];\n(\n${clauses}\n);\nout body;`;
}

async function fetchOverpass(query) {
  const body = "data=" + encodeURIComponent(query);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
          body,
          signal: AbortSignal.timeout(200000)
        });
        if (response.status === 429 || response.status === 504) {
          const retryAfter = Number(response.headers.get("Retry-After")) * 1000;
          await wait(Math.min(60000, Math.max(retryAfter || 0, 5000 * (attempt + 1))));
          continue;
        }
        if (!response.ok) continue;
        return await response.json();
      } catch (_) {
        /* try next endpoint */
      }
    }
    await wait(3000 * (attempt + 1));
  }
  return null;
}

function expandPoint(row, index) {
  const [kind, lat, lng, name, city, extra1, extra2, extra3, extra4] = row;
  const point = {
    id: `${kind}-pack-${index}`,
    kind,
    lat,
    lng,
    city: city || "",
    name: name || ""
  };
  if (kind === "station" && extra1) point.operator = extra1;
  if (kind === "subway" && extra1) {
    point.line = { code: extra1, color: extra2 || "#6c7b86", name: extra3 || "", network: extra4 || "" };
  }
  return point;
}

async function main() {
  if (!existsSync(REGION_GEOJSON)) die(`Missing ${REGION_GEOJSON}`);
  const cities = loadCities();
  const transit = loadTransit();
  const { polys, bboxes } = loadBubblePolys();
  console.log(`Region: ${polys.length} bubble polygon(s)`);

  const byId = new Map();
  for (let i = 0; i < polys.length; i += 1) {
    if (i > 0) await wait(BUBBLE_PAUSE_MS);
    console.log(`Bubble ${i + 1}/${polys.length}: Overpass…`);
    if (dryRun) continue;
    const payload = await fetchOverpass(overpassQuery(polys[i]));
    if (!payload) die(`Overpass failed for bubble ${i + 1}`);
    for (const element of payload.elements || []) {
      if (!element.id) continue;
      byId.set(element.id, element);
    }
    console.log(`  elements so far: ${byId.size}`);
  }

  if (dryRun) {
    console.log("Dry run: skipping pack write.");
    return;
  }

  const points = parseElements([...byId.values()], cities, transit);
  points.sort((a, b) => (a[0] + a[1] + a[2]).localeCompare(b[0] + b[1] + b[2]));

  const pack = {
    v: 1,
    region: "ampio-tappe",
    builtAt: new Date().toISOString(),
    count: points.length,
    bboxes,
    points
  };

  mkdirSync(PACK_DIR, { recursive: true });
  const json = JSON.stringify(pack);
  const gz = gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  writeFileSync(OUT_GZ, gz);
  const meta = {
    file: "facilities-ampio.json.gz",
    bytes: gz.length,
    jsonBytes: json.length,
    count: points.length,
    bubbles: bboxes.length,
    builtAt: pack.builtAt
  };
  writeFileSync(OUT_META, JSON.stringify(meta, null, 2) + "\n");
  console.log(`Wrote ${path.relative(ROOT, OUT_GZ)} (${meta.bytes} bytes gzip, ${meta.count} points, json ${meta.jsonBytes})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
