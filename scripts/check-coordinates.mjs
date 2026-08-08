// Verifica le coordinate dei punti mappa contro OpenStreetMap. Serve a
// rispondere all'unica domanda che conta davvero una volta arrivati: il pin
// porta al posto giusto? La risposta NON dipende da dove si esegue il
// controllo — una latitudine è la stessa da Milano e da Tokyo — ma dipende
// dalla qualità del dato, ed è quella che qui si misura.
//
// Controllo di rete: si esegue a mano prima di un rilascio importante, non in
// CI (Nominatim chiede una richiesta al secondo e non va martellato).
//
// Uso:
//   node scripts/check-coordinates.mjs [--limit=N] [--offset=N]
//     [--tolerance=300] [--type=visit|merchant|tabelog|hotel]
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = { window: {} };
vm.createContext(context);
// guide-data.js collega punti e schede a runtime: senza, metà dei punti
// risulterebbe orfana e il controllo salterebbe proprio le voci da verificare.
const FILES = [
  "assets/parse-lib.js", "assets/data.js", "assets/food-data.js", "assets/shopping-data.js",
  "assets/food-extra-data.js", "assets/travel-data.js", "assets/history-data.js",
  "assets/phrases-data.js", "assets/glossary-data.js", "assets/packing-data.js",
  "assets/money-data.js", "assets/day-tips-data.js", "assets/map-data.js",
  "assets/merchants-data.js", "assets/transit-data.js", "assets/experiences-data.js",
  "assets/source-data.js", "assets/guide-data.js"
];
for (const file of FILES) {
  try { vm.runInContext(readFileSync(new URL(file, root), "utf8"), context, { filename: file }); }
  catch (error) { console.log(`(salto ${file}: ${error.message.slice(0, 60)})`); }
}

const data = context.window.JAPAN_DATA;
const points = (context.window.JAPAN_MAP_DATA && context.window.JAPAN_MAP_DATA.points) || [];
const itemById = new Map();
[].concat(data.places || [], data.experiences || [], data.merchants || []).forEach((item) => itemById.set(item.id, item));

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] || fallback;
const tolerance = Number(arg("tolerance", 300));
const typeArg = arg("type", "");
const offset = Number(arg("offset", 0));
const limit = Number(arg("limit", 0));

// Si verifica solo ciò che OSM può riconoscere: il nome nativo. I nomi
// italiani delle schede non esistono nelle mappe giapponesi.
let queue = points
  .filter((point) => !typeArg || point.type === typeArg)
  .map((point) => ({ point, item: point.guideId ? itemById.get(point.guideId) : null }))
  .filter((row) => row.item && row.item.jp && row.item.jp.length > 1)
  .slice(offset);
if (limit > 0) queue = queue.slice(0, limit);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const UA = "TabiTravelGuide/1.0 (https://github.com/SteSurra/Holidays; coordinate verification) node";

function metersBetween(lat1, lon1, lat2, lon2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

async function locate(nativeName) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nativeName)}&countrycodes=jp&format=json&limit=3`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await wait(1100); // la policy di Nominatim: una richiesta al secondo, e basta
    let response;
    try { response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) }); }
    catch (_) { continue; }
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) { await wait(5000 * (attempt + 1)); continue; }
    return null;
  }
  return null;
}

console.log(`Verifico ${queue.length} punti contro OpenStreetMap (tolleranza ${tolerance} m).\n`);
const far = [];
const unknown = [];
let close = 0;

for (const { point, item } of queue) {
  const hits = await locate(item.jp);
  if (!hits) { unknown.push({ item, reason: "rete" }); continue; }
  if (!hits.length) { unknown.push({ item, reason: "OSM non conosce il nome" }); continue; }
  const best = Math.min(...hits.map((hit) => metersBetween(point.lat, point.lng, Number(hit.lat), Number(hit.lon))));
  if (best <= tolerance) { close += 1; continue; }
  far.push({ item, point, best, osm: hits[0] });
  console.log(`  ${String(best).padStart(6)} m  ${item.name} (${item.jp})`);
}

console.log(`\nEntro ${tolerance} m: ${close}/${queue.length}.`);
if (unknown.length) {
  console.log(`Non verificabili (${unknown.length}): il nome nativo non è in OSM o la rete è caduta.`);
  unknown.slice(0, 10).forEach((row) => console.log(`  - ${row.item.name}: ${row.reason}`));
}
if (far.length) {
  // Distanza grande non significa sempre errore: un parco o una montagna
  // hanno un centro convenzionale diverso dall'ingresso che serve al viaggio,
  // e a volte è OSM ad avere il nome ambiguo. Vanno guardati a uno a uno.
  console.log(`\nDa guardare a mano (${far.length}):`);
  far.forEach((row) => console.log(
    `  ${row.item.name}: ${row.best} m — nostro ${row.point.lat},${row.point.lng} · osm ${row.osm.lat},${row.osm.lon} (${String(row.osm.display_name || "").slice(0, 60)})`
  ));
  process.exitCode = 1;
}
