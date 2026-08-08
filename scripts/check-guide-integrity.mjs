import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ window: {}, console });
const dataFiles = [
  "assets/parse-lib.js",
  "assets/data.js",
  "assets/food-data.js",
  "assets/shopping-data.js",
  "assets/food-extra-data.js",
  "assets/travel-data.js",
  "assets/history-data.js",
  "assets/phrases-data.js",
  "assets/map-data.js",
  "assets/merchants-data.js",
  "assets/stamps-data.js",
  "assets/experiences-data.js",
  "assets/source-data.js",
  "assets/story-data.js",
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

// Un punto "visit" che non aggancia nessuna scheda curata genera in
// guide-data.js una scheda sintetica ("Da adattare alla giornata"): qualità da
// segnaposto che entrava in app in silenzio. Qui diventa un errore di build:
// o il punto trova la sua scheda, o la scheda si scrive davvero. L'app non
// concatena più data.mapPlaces da nessuna parte, e deve restare vuoto.
for (const item of data.mapPlaces || []) {
  failures.push(`${item.id}: synthetic stub card for an unmatched map point — curate a real entry or fix the point name`);
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

// Le schede scritte a mano esistono per non ripetersi: se due condividono una
// frase intera, il problema che dovevano risolvere è tornato. Il modello
// generato può ripetersi — è fatto di pezzi comuni — ma il testo d'autore no.
const stories = context.window.TABI_STORIES || {};
const storyIds = Object.keys(stories);
const sentenceOwner = new Map();
for (const id of storyIds) {
  const story = stories[id];
  if (!story.long || story.long.length < 400) {
    failures.push(`story ${id}: long description under 400 characters — that is a caption, not a story`);
  }
  if (!Array.isArray(story.sections) || story.sections.length < 3) {
    failures.push(`story ${id}: fewer than three sections`);
  }
  if (!(story.sections || []).some((section) => section.fun)) {
    failures.push(`story ${id}: missing the semiserious note`);
  }
  if (!Array.isArray(story.sources) || story.sources.length < 2) {
    failures.push(`story ${id}: fewer than two sources for a written card`);
  }
  for (const source of story.sources || []) {
    if (!source.title || !/^https:\/\//.test(source.url || "")) failures.push(`story ${id}: invalid source`);
  }
  const text = [story.long].concat((story.sections || []).map((section) => section.body)).join(" ");
  // Frasi lunghe soltanto: "Il percorso è a senso unico" può legittimamente
  // ricorrere, un periodo di quaranta parole no.
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const clean = sentence.trim();
    if (clean.length < 90) continue;
    const owner = sentenceOwner.get(clean);
    if (owner && owner !== id) failures.push(`story ${id}: shares a whole sentence with ${owner} — the written cards must not repeat each other`);
    else sentenceOwner.set(clean, id);
  }
}

// I timbri sono una lista scritta a mano perché OpenStreetMap non li mappa:
// senza controllo, un refuso nelle coordinate manderebbe qualcuno a cercare un
// banco dentro un altro isolato. Ogni timbro deve portare la sua fonte, stare
// vicino al castello che dichiara, e quel castello deve esistere nella guida.
const stamps = (context.window.JAPAN_STAMPS || {}).stamps || [];
const stampPoints = mapPoints.filter((point) => point.type === "stamp");
if (stamps.length !== stampPoints.length) {
  failures.push(`stamps: ${stamps.length} declared but ${stampPoints.length} reached the map`);
}
const metersBetween = (lat1, lon1, lat2, lon2) => {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
};
for (const stamp of stamps) {
  if (!Number.isFinite(stamp.lat) || !Number.isFinite(stamp.lng)) {
    failures.push(`stamp ${stamp.slug}: missing coordinates`);
    continue;
  }
  if (!stamp.where || !stamp.site) failures.push(`stamp ${stamp.slug}: missing the exact spot or the site it belongs to`);
  if (!stamp.sourceUrl || !/^https:\/\//.test(stamp.sourceUrl)) failures.push(`stamp ${stamp.slug}: a stamp without a source is a rumour`);

  // Ogni timbro si ancora a qualcosa di diverso a seconda del programma: un
  // timbro dei 100 castelli sta nel recinto del suo castello, uno di stazione
  // sta in stazione, gli altri stanno almeno nella città che dichiarano. Il
  // metro serve a intercettare una cifra sbagliata — un refuso sposta di
  // chilometri o di continenti — non a misurare la precisione.
  const city = data.cities.find((entry) => entry.id === stamp.city);
  if (!city) {
    failures.push(`stamp ${stamp.slug}: unknown city ${stamp.city}`);
    continue;
  }
  // Il timbro si ancora al SUO sito, cercato per nome nativo o latino — non a
  // un sito qualsiasi della stessa città. La prima versione agganciava ogni
  // timbro-castello al primo castello del posto, e così il timbro di Takiyama
  // veniva misurato contro il castello di Edo, a trentotto chilometri, mentre
  // i castelli attorno a Hakone venivano respinti perché la guida non li ha:
  // ci sono programmi che toccano siti fuori dall'itinerario, ed è normale.
  const compact = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  const siteKey = compact(stamp.site);
  const anchors = mapPoints.filter((point) => {
    if (point.type === "stamp" || point.city !== stamp.city) return false;
    if (stamp.jp && point.jp && point.jp === stamp.jp) return true;
    const pointKey = compact(point.name);
    if (siteKey.length < 5 || pointKey.length < 5) return false;
    if (!pointKey.includes(siteKey) && !siteKey.includes(pointKey)) return false;
    // "Takiyama-jō" contiene "Takiya", che è un negozio a trentasette
    // chilometri: la sottostringa da sola aggancia qualunque cosa, serve che
    // i due nomi siano quasi tutto l'uno dell'altro.
    return Math.min(siteKey.length, pointKey.length) / Math.max(siteKey.length, pointKey.length) >= 0.7;
  }).filter((anchor) => Number.isFinite(anchor.lat));

  // Il recinto del castello di Edo è largo più di un chilometro e mezzo e le
  // sue tre postazioni stanno agli angoli: due chilometri quando il sito è
  // noto. Quando non lo è, basta che il timbro sia raggiungibile dal viaggio:
  // il riferimento sono tutte le tappe E le fermate dei trasferimenti, perché
  // un timbro può stare in una stazione di cambio — Tsuruga sta a centoquattordici
  // chilometri da Kanazawa e ci si passa comunque, scendendo dal Thunderbird.
  const fermate = (data.legs || []).flatMap((leg) => leg.stops || []).filter((stop) => Number.isFinite(stop.lat));
  const limit = anchors.length ? 2000 : 50000;
  const reference = anchors.length ? anchors : [city].concat(fermate);
  const distance = Math.min(...reference.map((anchor) => metersBetween(stamp.lat, stamp.lng, anchor.lat, anchor.lng)));
  if (distance > limit) {
    failures.push(`stamp ${stamp.slug}: ${distance} m from ${anchors.length ? anchors[0].name : city.name} — beyond the ${limit} m allowed`);
  }
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

// L'URL di registrazione deve restare "sw.js" fisso: con un token nell'URL
// ogni rilascio ri-registrava il worker a un indirizzo nuovo, il browser lo
// installava come se fosse un altro worker e il toast di aggiornamento
// arrivava due volte di fila. La versione dell'app vive nella costante
// RELEASE, che fa da firma "cache pronta" e deve seguire il token dei file.
const appSource = readFileSync("assets/app.js", "utf8");
const registerUrl = (appSource.match(/serviceWorker\.register\("([^"]+)"/) || [])[1];
if (!registerUrl) failures.push("app.js: service worker registration not found");
else if (registerUrl !== "sw.js") {
  failures.push(`app.js: the service worker must be registered at the stable URL "sw.js" (found "${registerUrl}") — a per-release URL forces an extra install and a duplicate update toast`);
}
const releaseToken = (appSource.match(/const RELEASE = "([0-9a-z]+)"/) || [])[1];
if (!releaseToken) failures.push("app.js: RELEASE constant not found");
else if (indexVersions.length === 1 && "?v=" + releaseToken !== indexVersions[0]) {
  failures.push(`release token mismatch: app.js RELEASE is ${releaseToken}, index.html uses ${indexVersions[0]} — the cache-ready check would go stale`);
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
const expectedPrefix = ["parse-lib.js", "data.js", "food-data.js", "shopping-data.js"];
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

// Due schede con nomi diversi non possono mostrare la stessa foto: chi legge
// non vede due cose vicine, vede un doppione e smette di fidarsi. Restano
// legittimi i casi in cui un nome contiene l'altro — la stessa cosa raccontata
// da una scheda e dal suo punto sulla mappa, o da un luogo e dalla sua visita.
const curatedImages = (() => {
  const box = {};
  try { new Function("window", readFileSync(new URL("../assets/curated-images-data.js", root), "utf8"))(box); }
  catch (_) { return {}; }
  return box.TABI_CURATED_IMAGES || {};
})();
const nameById = new Map();
[].concat(data.places, data.mapPlaces || [], data.experiences || [], data.merchants || [], data.foods || [], data.shopping || [])
  .forEach((item) => nameById.set(item.id, item.name));
mapPoints.forEach((point) => { if (!nameById.has("map-image-" + point.id)) nameById.set("map-image-" + point.id, point.name); });
[].concat(data.foods || [], data.shopping || []).forEach((item) => {
  const match = item.imageUrl && item.imageUrl.match(/file\/([^?]+)/);
  if (match) curatedImages[item.id] = [match[1]];
});

const flatName = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
const idsByFile = new Map();
for (const [id, entry] of Object.entries(curatedImages)) {
  const file = decodeURIComponent(entry[0]);
  if (!idsByFile.has(file)) idsByFile.set(file, []);
  idsByFile.get(file).push(id);
}
for (const [file, ids] of idsByFile) {
  const names = [...new Set(ids.map((id) => flatName(nameById.get(id) || id)))];
  if (names.length < 2) continue;
  const unrelated = names.filter((one, index) =>
    names.every((other, position) => position === index || (!one.includes(other) && !other.includes(one))));
  if (unrelated.length > 1) {
    const labels = [...new Set(ids.map((id) => nameById.get(id) || id))].join(" / ");
    failures.push(`curated-images-data.js: "${file}" is shared by different subjects (${labels})`);
  }
}

if (failures.length) {
  console.error("Guide-integrity check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Guide-integrity check passed: ${mapPoints.filter((point) => point.type === "visit").length} map points, ${data.places.length + data.mapPlaces.length} places, ${data.experiences.length} experiences, ${data.foods.length} foods, ${data.shopping.length} purchases, ${data.history.length} stories, ${merchants.length} merchants, ${data.phrases.length} phrases.`);
