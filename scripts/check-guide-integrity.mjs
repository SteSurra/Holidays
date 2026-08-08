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
  "assets/merchants-data.js",
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
const catalogs = [data.places, data.mapPlaces, data.experiences, data.foods, data.shopping, data.history, data.merchants];
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

// Un luogo o un'esperienza senza punto sulla mappa non ha il quadratino per
// metterlo o toglierlo, quindi resta fuori da "seleziona tutti". Succedeva senza
// accorgersene: il punto "Animate Akihabara" si agganciava alla scheda del
// quartiere e lasciava il negozio senza. Chi ne aggiunge uno nuovo deve
// decidere: dargli delle coordinate, oppure metterlo qui e dire perché.
const placelessOnPurpose = new Map([
  ["place-shirakawago-viewpoint", "stesso belvedere di experience-shirakawago-shiroyama-walk, che porta il punto"],
  ["experience-tokyo-karaoke", "catene sparse per la citta, nessun indirizzo unico"],
  ["experience-tokyo-kintsugi-workshop", "si tiene in sedi diverse a seconda del corso"],
  ["experience-tokyo-street-kart", "operatori con garage multipli, nessuna sede unica"]
]);
const mappedGuideIds = new Set(mapPoints.map((point) => point.guideId).filter(Boolean));
for (const item of [...data.places, ...data.mapPlaces, ...data.experiences]) {
  if (mappedGuideIds.has(item.id) || placelessOnPurpose.has(item.id)) continue;
  failures.push(`${item.id}: no map point, so its card has no map checkbox — add coordinates or record the reason in placelessOnPurpose`);
}
for (const id of placelessOnPurpose.keys()) {
  if (mappedGuideIds.has(id)) failures.push(`${id}: now has a map point, drop it from placelessOnPurpose`);
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
  "assets/experiences-data.js",
  "assets/merchants-data.js"
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

// I negozianti portano un voto che non è nostro. La regola è una sola e va
// verificata: un numero senza la fonte che lo ha prodotto non deve esistere,
// perché a schermo diventerebbe indistinguibile da un giudizio della guida.
const merchants = data.merchants || [];
const merchantCategories = new Set(Object.keys(data.labels.merchantCategories || {}));
reportDuplicates(merchants.map((item) => item.id), "merchant id");
if (!merchants.length) failures.push("merchants catalogue is empty");
if (!data.merchantRatingChecked) failures.push("merchants: missing the date the ratings were read");
for (const item of merchants) {
  if (!item.name || !item.description || !item.tip || !item.area) failures.push(`${item.id}: incomplete merchant card`);
  if (!merchantCategories.has(item.category)) failures.push(`${item.id}: unknown merchant trade ${item.category}`);
  if (!cityIds.has(item.city)) failures.push(`${item.id}: unknown city ${item.city}`);
  if (!item.imageQuery) failures.push(`${item.id}: missing image query`);
  if (item.rating && !item.ratingSource) failures.push(`${item.id}: rating without a source`);
  if (item.ratingSource && !item.rating) failures.push(`${item.id}: rating source without a rating`);
  if (item.rating && (item.rating < 1 || item.rating > 5)) failures.push(`${item.id}: rating outside the Tabelog scale`);
  if (item.ratingUrl && !/^https:\/\//.test(item.ratingUrl)) failures.push(`${item.id}: invalid rating link`);
}
// La promessa della schermata è "tre o quattro nomi per mestiere": un mestiere
// con due sole schede non è una selezione. Il conto è sul mestiere, non sulla
// singola città — a Nara esiste un solo produttore storico di inchiostro e va
// bene così — ma un mestiere presente in una città sola sarebbe una curiosità
// locale travestita da categoria.
// Un negozio conta per il mestiere principale e per quelli in cui compare di
// rimbalzo: la schermata dei vestiti mostra anche i grandi magazzini, quindi
// "vestiti" non è una curiosità di una città sola solo perché le boutique
// stanno tutte a Tokyo.
const tradesOf = (item) => [item.category].concat(item.extraCategories || []);
const perTrade = new Map();
for (const item of merchants) {
  for (const trade of tradesOf(item)) {
    if (!perTrade.has(trade)) perTrade.set(trade, new Set());
    perTrade.get(trade).add(item.city);
  }
}
for (const trade of merchantCategories) {
  const cities = perTrade.get(trade);
  const count = merchants.filter((item) => tradesOf(item).includes(trade)).length;
  if (count < 3) failures.push(`${trade}: only ${count} merchant(s) — the screen promises three or four per trade`);
  if (!cities || cities.size < 2) failures.push(`${trade}: present in a single city — it is a local curiosity, not a trade`);
}
for (const city of ["tokyo", "kyoto", "osaka"]) {
  const count = merchants.filter((item) => item.city === city).length;
  if (count < 4) failures.push(`${city}: only ${count} merchant(s) for a main stop`);
}

// Il service worker precacha gli asset con il token ?v= : se diverge da quello
// usato in index.html, la shell "in cache" contiene URL che la pagina non
// richiede mai e offline non funziona niente.
const swSource = readFileSync("sw.js", "utf8");
const indexSource = readFileSync("index.html", "utf8");
const swVersion = (swSource.match(/const VERSION = "(\?v=[^"]+)"/) || [])[1];
const indexVersions = [...new Set([...indexSource.matchAll(/\?v=[0-9a-z]+/g)].map((match) => match[0]))];
if (!swVersion) failures.push("sw.js: VERSION token not found");
if (indexVersions.length !== 1) failures.push(`index.html: expected one ?v= token, found ${indexVersions.length} (${indexVersions.join(", ")})`);
if (swVersion && indexVersions.length === 1 && swVersion !== indexVersions[0]) {
  failures.push(`service-worker version mismatch: sw.js has ${swVersion}, index.html has ${indexVersions[0]}`);
}

// La registrazione in app.js porta il proprio token: se resta indietro, la
// firma "cache pronta" (worker.scriptURL) non cambia mai fra una versione e
// l'altra e il reconcile post-aggiornamento non riparte. È successo.
const appSource = readFileSync("assets/app.js", "utf8");
const registerToken = (appSource.match(/serviceWorker\.register\("sw\.js(\?v=[0-9a-z]+)"/) || [])[1];
if (!registerToken) failures.push("app.js: service worker registration token not found");
else if (swVersion && registerToken !== swVersion) {
  failures.push(`service-worker registration mismatch: app.js registers sw.js${registerToken}, sw.js declares ${swVersion}`);
}

// Ogni file che index.html chiede deve stare nella SHELL del service worker:
// un file dimenticato lì funziona con la rete e sparisce offline, cioè
// esattamente quando serve. (Le risorse esterne hanno la loro lista EXTERNAL.)
const requestedAssets = [...indexSource.matchAll(/(?:src|href)="(assets\/[^"?]+)(?:\?v=[0-9a-z]+)?"/g)]
  .map((match) => match[1])
  .filter((path) => !path.endsWith(".png"));
const shellPaths = [...swSource.matchAll(/"((?:\.\/|assets\/|index|manifest)[^"]*?)"(?: \+ VERSION)?/g)].map((match) => match[1]);
const shellSet = new Set(shellPaths);
for (const asset of new Set(requestedAssets)) {
  if (!shellSet.has(asset)) failures.push(`sw.js SHELL: missing "${asset}" requested by index.html — offline it would 404`);
}

// L'ordine dei primi tre script è portante: data.js crea __JAPAN_PARTIAL__,
// food-data lo estende, shopping-data lo promuove a JAPAN_DATA. Invertirli
// significa un TypeError al primo avvio. Il contratto vive solo qui.
const scriptOrder = [...indexSource.matchAll(/<script[^>]+src="assets\/([a-z-]+\.js)/g)].map((match) => match[1]);
const expectedPrefix = ["data.js", "food-data.js", "shopping-data.js"];
for (let i = 0; i < expectedPrefix.length; i += 1) {
  if (scriptOrder[i] !== expectedPrefix[i]) {
    failures.push(`index.html: script #${i + 1} must be ${expectedPrefix[i]} (found ${scriptOrder[i] || "none"}) — the __JAPAN_PARTIAL__ handoff depends on this order`);
    break;
  }
}
if (scriptOrder.indexOf("guide-data.js") !== -1 && scriptOrder.indexOf("map-data.js") !== -1
  && scriptOrder.indexOf("guide-data.js") < scriptOrder.indexOf("map-data.js")) {
  failures.push("index.html: guide-data.js must load after map-data.js — enrichMapPoints reads JAPAN_MAP_DATA");
}
if (scriptOrder.indexOf("guide-data.js") !== -1 && scriptOrder.indexOf("experiences-data.js") !== -1
  && scriptOrder.indexOf("guide-data.js") < scriptOrder.indexOf("experiences-data.js")) {
  failures.push("index.html: guide-data.js must load after experiences-data.js — the experience overrides come first");
}

if (failures.length) {
  console.error("Guide-integrity check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Guide-integrity check passed: ${mapPoints.filter((point) => point.type === "visit").length} map points, ${data.places.length + data.mapPlaces.length} places, ${data.experiences.length} experiences, ${data.foods.length} foods, ${data.shopping.length} purchases, ${data.history.length} stories, ${merchants.length} merchants, ${data.phrases.length} phrases.`);
