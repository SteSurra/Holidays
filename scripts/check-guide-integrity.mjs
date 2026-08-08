import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ window: {}, console });
const dataFiles = [
  "assets/data.js",
  "assets/food-data.js",
  "assets/shopping-data.js",
  "assets/food-extra-data.js",
  "assets/travel-data.js",
  "assets/history-data.js",
  "assets/phrases-data.js",
  "assets/map-data.js",
  "assets/experiences-data.js",
  "assets/source-data.js",
  "assets/guide-data.js"
];

for (const file of dataFiles) {
  vm.runInContext(readFileSync(file, "utf8"), context, { filename: file });
}

const data = context.window.JAPAN_DATA;
const mapPoints = context.window.JAPAN_MAP_DATA.points;
const failures = [];
const catalogs = [data.places, data.mapPlaces, data.experiences, data.foods, data.shopping, data.history];
const allItems = catalogs.flat();

function reportDuplicates(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) failures.push(`${label}: duplicate ${value}`);
    seen.add(value);
  }
}

reportDuplicates(allItems.map((item) => item.id), "guide id");
reportDuplicates(mapPoints.map((point) => point.id), "map id");

const cityIds = new Set(data.cities.map((city) => city.id));
for (const item of allItems) {
  if (!item.id || !item.type || !item.city) failures.push(`incomplete guide item: ${JSON.stringify(item)}`);
  if (item.city !== "all" && !cityIds.has(item.city)) failures.push(`${item.id}: unknown city ${item.city}`);
}

const hotelsByCity = new Map(mapPoints.filter((point) => point.type === "hotel").map((hotel) => [hotel.city, hotel.name]));
for (const stay of data.lodging) {
  if (hotelsByCity.get(stay.city) !== stay.name) {
    failures.push(`hotel mismatch for ${stay.city}: travel=${stay.name}, map=${hotelsByCity.get(stay.city) || "missing"}`);
  }
}
if (hotelsByCity.size !== data.lodging.length) failures.push("hotel counts differ between travel and map data");

for (const point of mapPoints) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) failures.push(`${point.id}: invalid coordinates`);
  if (point.type === "visit" && !point.guideId) failures.push(`${point.id}: missing detail guide link`);
  if (point.guideId && !allItems.some((item) => item.id === point.guideId)) failures.push(`${point.id}: unknown guide link ${point.guideId}`);
}

for (const item of [...data.foods, ...data.shopping]) {
  if (!item.imageQuery && !item.imageUrl) failures.push(`${item.id}: missing image query or image URL`);
}

for (const item of data.experiences) {
  if (!item.imageQuery && !item.imageUrl) failures.push(`${item.id}: missing experience image query`);
  if (!item.sourceUrl) failures.push(`${item.id}: missing experience source`);
}

for (const item of [].concat(data.places, data.mapPlaces, data.experiences, data.foods, data.shopping, data.history)) {
  if (!item.longDescription || item.longDescription.length < 140) failures.push(`${item.id}: detail description is too short`);
  if (!Array.isArray(item.sources) || !item.sources.length) failures.push(`${item.id}: missing factual sources`);
  const invalidSource = (item.sources || []).find((source) => !source.title || !/^https:\/\//.test(source.url));
  if (invalidSource) failures.push(`${item.id}: invalid factual source`);
}

for (const [label, catalog] of [["places", [].concat(data.places, data.mapPlaces)], ["experiences", data.experiences], ["foods", data.foods], ["shopping", data.shopping], ["history", data.history]]) {
  const notes = catalog.map((item) => (item.guideSections || []).find((section) => section.fun)?.body).filter(Boolean);
  if (new Set(notes).size !== notes.length) failures.push(`${label}: repeated semiserious notes`);
}

if (!data.phrases.length || !data.emergencyNumbers.some((item) => item.number === "110") || !data.emergencyNumbers.some((item) => item.number === "119")) {
  failures.push("phrasebook or emergency numbers are incomplete");
}

// Le tabelle scartano in silenzio ogni riga la cui città non è in elenco. È così
// che 34 schede di Kamakura e Hakone sono rimaste scritte e invisibili per mesi,
// senza che nulla lo segnalasse: qui le righe scartate diventano un errore.
const cityKeyedFiles = [
  "assets/data.js",
  "assets/food-data.js",
  "assets/food-extra-data.js",
  "assets/history-data.js",
  "assets/shopping-data.js",
  "assets/experiences-data.js"
];
for (const file of cityKeyedFiles) {
  const dropped = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^([a-z][a-z0-9-]*)\|/.exec(line.trim());
    if (!match) continue;
    const city = match[1];
    if (city === "all" || cityIds.has(city)) continue;
    dropped.set(city, (dropped.get(city) || 0) + 1);
  }
  for (const [city, count] of dropped) {
    failures.push(`${file}: ${count} row(s) for unknown city "${city}" are silently dropped at runtime — add the city to data.js or delete the rows`);
  }
}

if (failures.length) {
  console.error("Guide-integrity check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Guide-integrity check passed: ${mapPoints.filter((point) => point.type === "visit").length} map points, ${data.places.length + data.mapPlaces.length} places, ${data.experiences.length} experiences, ${data.foods.length} foods, ${data.shopping.length} purchases, ${data.history.length} stories, ${data.phrases.length} phrases.`);
