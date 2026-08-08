// Risolve al build time l'immagine più rappresentativa di ogni elemento e
// scrive assets/curated-images-data.js. La qualità non si decide più con una
// ricerca full-text a runtime: la fonte di fiducia è la scelta editoriale
// dell'enciclopedia (lead image dell'articolo Wikipedia, poi Wikidata P18),
// e solo in mancanza si ripiega su una ricerca Commons con punteggio.
//
// Uso:
//   node scripts/refresh-curated-images.mjs [--type=place|experience|merchant|food|shop|mappoint|all]
//     [--limit=N] [--offset=N] [--state=path] [--force] [--emit-only]
//
// Lo stato (checkpoint riprendibile, con le alternative per la revisione
// visiva) vive FUORI dal repo; le correzioni manuali stanno in
// scripts/image-overrides.json e vincono sempre sulla scelta automatica.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = { window: {} };
vm.createContext(context);
for (const file of ["assets/parse-lib.js", "assets/data.js", "assets/food-data.js", "assets/shopping-data.js", "assets/food-extra-data.js", "assets/map-data.js", "assets/merchants-data.js", "assets/experiences-data.js"]) {
  vm.runInContext(readFileSync(new URL(file, root), "utf8"), context, { filename: file });
}
const data = context.window.JAPAN_DATA;
const mapPoints = (context.window.JAPAN_MAP_DATA && context.window.JAPAN_MAP_DATA.points) || [];

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || fallback;
const typeArg = arg("type", "all");
const limitArg = Number(arg("limit", 0));
const offsetArg = Number(arg("offset", 0));
const statePath = arg("state", join(tmpdir(), "tabi-image-refresh-state.json"));
const force = process.argv.includes("--force");
const emitOnly = process.argv.includes("--emit-only");
const overridesPath = fileURLToPath(new URL("image-overrides.json", import.meta.url));
const outputPath = fileURLToPath(new URL("../assets/curated-images-data.js", import.meta.url));

const guideItems = [data.places || [], data.experiences || [], data.merchants || [], data.foods || [], data.shopping || []].flat();

// I punti mappa senza scheda collegata risolvono la foto a runtime con un
// item sintetico (id "map-image-<point.id>", vedi map.js): vanno curati sotto
// quello stesso id, o il popup resterebbe all'esito della ricerca live. Il
// loro nome è italiano, quindi la strada è un'altra: prima il riuso della
// scheda guida omonima, poi l'articolo di it.wikipedia → QID → P18.
const soloMapItems = mapPoints
  .filter((point) => !point.guideId && point.name)
  .map((point) => ({
    id: "map-image-" + point.id,
    name: point.name,
    jp: "",
    imageQuery: "",
    city: point.city,
    type: point.type === "tabelog" ? "food" : "place",
    solo: true
  }));

const collectionsByType = {
  place: [data.places || []],
  experience: [data.experiences || []],
  merchant: [data.merchants || []],
  food: [data.foods || []],
  shop: [data.shopping || []],
  mappoint: [soloMapItems],
  all: [data.places || [], data.experiences || [], data.merchants || [], data.foods || [], data.shopping || [], soloMapItems]
};
let items = (collectionsByType[typeArg] || collectionsByType.all).flat()
  // Le curazioni già presenti nei data file (food/shopping) restano la prima
  // scelta a runtime: qui si lavora solo su chi non ha ancora un URL.
  .filter((item) => !item.imageUrl)
  .slice(Math.max(offsetArg, 0));
if (limitArg > 0) items = items.slice(0, limitArg);

// ---------------------------------------------------------------------------
// Parole: normalizzazione con diacritici ("Sensō-ji" deve combaciare con
// "Sensoji"), città e generici esclusi dal termine-soggetto.
const CITY_WORDS = new Set();
for (const city of data.cities || []) {
  for (const token of `${city.id} ${city.name}`.toLowerCase().split(/[^\p{L}]+/u)) if (token.length >= 3) CITY_WORDS.add(token);
}
for (const extra of ["japan", "japanese", "giappone", "nippon", "tokyo", "kyoto", "osaka", "asakusa", "shibuya", "shinjuku", "ginza", "dotonbori", "gion", "arashiyama"]) CITY_WORDS.add(extra);
const GENERIC_WORDS = new Set([
  "the", "and", "with", "food", "dish", "cuisine", "restaurant", "shop", "store", "market",
  "district", "area", "street", "view", "vending", "machine", "product", "traditional", "famous",
  "hall", "center", "centre",
  // Nomi italiani dei punti mappa: il generico non discrimina il soggetto.
  "tempio", "santuario", "castello", "giardino", "giardini", "parco", "museo", "mercato",
  "quartiere", "isola", "monte", "lago", "ponte", "stazione", "punto", "panoramico", "vista",
  "negozio", "centro", "sala", "foresta", "cascata", "spiaggia", "torre", "grande", "della", "delle", "degli"
]);

const cityLabel = (id) => (data.cities || []).find((city) => city.id === id)?.name || "Japan";
const fold = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const words = (value) => fold(value).split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
const compact = (value) => fold(value).replace(/[^a-z0-9]+/g, "");
const significant = (value) => words(value).filter((word) => !GENERIC_WORDS.has(word));

// Il soggetto è la prima parola significativa non-città della query: le query
// sono scritte "soggetto qualificatore città" ("Osaka castle" → castle,
// "Ichiran ramen restaurant Dotonbori" → ichiran). Mai dal nome localizzato,
// tranne che per i punti mappa, dove il nome è tutto ciò che esiste.
function subjectKey(item) {
  const source = item.imageQuery || (item.solo ? item.name : "");
  const pool = significant(source).filter((word) => !CITY_WORDS.has(word));
  return pool[0] || significant(source)[0] || words(source)[0] || "";
}

function titleMatchesSubject(item, title) {
  const key = subjectKey(item);
  const flat = compact(title);
  if (item.jp && item.jp.length > 1 && String(title).includes(item.jp)) return true;
  if (!key) return false;
  if (new Set(words(title)).has(key)) return true;
  // La sottostringa compatta serve per i trattini ("Sensō-ji" ≈ "sensoji"),
  // ma su chiavi corte inventa soggetti: "sky" dentro "skytree" agganciava
  // lo Shibuya Sky all'articolo dello Skytree.
  return compact(key).length >= 5 && flat.includes(compact(key));
}

// Sui titoli giapponesi la grafia storica tradisce il confronto letterale
// (大阪城 → articolo 大坂城): basta la maggioranza dei caratteri in comune.
function cjkOverlap(a, b) {
  const setA = new Set(Array.from(String(a || "")));
  const chars = Array.from(String(b || ""));
  if (!chars.length || !setA.size) return 0;
  return chars.filter((c) => setA.has(c)).length / Math.max(chars.length, setA.size);
}

// Tipi il cui soggetto è una categoria, non un nome proprio: lì l'omonimia è
// la regola, non l'eccezione, e serve una prova in più.
const GENERIC_SUBJECT_TYPES = new Set(["food", "shop", "merchant"]);
// Il nome del file tradisce i due modi in cui una foto "pertinente" può essere
// comunque sbagliata: il MEZZO (una pianta, uno schizzo, una mappa storica al
// posto di una fotografia) e il LUOGO (il Warner Bros. Studio Tour di Londra
// per quello di Tokyo, un monumento di Berlino per una pedalata a Hiroshima).
const FILE_DECOYS = /(location.?map|locator|\bmap\b|\bmappa\b|logo|diagram|pictogram|icon\b|flag.of|seal.of|coat.of.arms|montage|collage|blank|emblem|\bplan\b|planned|sketch|drawing|blueprint|\bdetail\b|engraving|woodblock|manuscript|\bcover\b|poster)/i;
const FOREIGN_PLACES = /\b(london|paris|berlin|new york|chicago|boston|seoul|beijing|shanghai|taipei|hong kong|singapore|bangkok|sydney|melbourne|toronto|vancouver|amsterdam|madrid|barcelona|milano|roma|москва|moscow|dubai|honolulu|orlando|anaheim|cornwall|st. ives)\b/i;
const SEARCH_DECOYS = /(garden|giardin|moat|gate\b|interior|inside|night|museum|plaque|sign\b|signboard|station|menu|ticket|crowd|stairs|toilet|parking|entrance|door|wall\b|walls\b|detail|closeup|close.up|ruins|model\b|miniature|reconstruction|painting|drawing|print\b|ukiyo)/i;

// ---------------------------------------------------------------------------
// Rete: il limite di Wikimedia si è rivelato per IP e a raffica (en.wiki e
// Commons rispondevano 429 insieme), non per host. Quindi un tetto globale,
// più una spaziatura per host, e soprattutto POCHE chiamate: le fasi in
// blocco più sotto valgono più di qualunque taratura dell'attesa.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function chunk(list, size) {
  const groups = [];
  for (let index = 0; index < list.length; index += size) groups.push(list.slice(index, index + size));
  return groups;
}

// Poche richieste in volo insieme: la coda impone comunque il ritmo, questa
// serve solo a non pagare la latenza di rete una richiesta per volta.
async function mapLimit(list, limit, run) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (cursor < list.length) await run(list[cursor++]);
  }));
}

const hostQueues = {};
const globalQueue = { nextAt: 0, spacing: 320, chain: Promise.resolve() };
function hostQueue(url) {
  const host = new URL(url).host;
  return hostQueues[host] || (hostQueues[host] = { nextAt: 0, spacing: 420 });
}
function reserveSlot(url) {
  const host = hostQueue(url);
  // Prenotazione seriale attraverso l'unica catena globale: due richieste in
  // volo non possono prendersi lo stesso varco, né globale né di host.
  const turn = globalQueue.chain.then(async () => {
    const now = Date.now();
    const delay = Math.max(globalQueue.nextAt, host.nextAt, now) - now;
    if (delay) await wait(delay);
    globalQueue.nextAt = Date.now() + globalQueue.spacing;
    host.nextAt = Date.now() + host.spacing;
  });
  globalQueue.chain = turn.catch(() => {});
  return turn;
}
async function fetchJson(url) {
  const queue = hostQueue(url);
  let response = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await reserveSlot(url);
    try {
      response = await fetch(url, {
        // La policy di Wikimedia chiede un contatto nello User-Agent: l'URL
        // pubblico del progetto è il contatto giusto (nessun dato personale).
        headers: { "User-Agent": "TabiTravelGuide/1.0 (https://github.com/SteSurra/Holidays; representative image curation) node" },
        signal: AbortSignal.timeout(20000)
      });
    } catch (error) {
      if (attempt === 3) throw error;
      await wait(1500 * (attempt + 1));
      continue;
    }
    if (response.ok) {
      // La penalità deve sciogliersi in fretta quanto si è formata: con un
      // decadimento del 3% la coda restava lenta per sempre dopo un brutto
      // minuto, e la corsa passava da minuti a ore.
      queue.spacing = Math.max(420, Math.round(queue.spacing * 0.82));
      globalQueue.spacing = Math.max(320, Math.round(globalQueue.spacing * 0.85));
      return response.json();
    }
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get("Retry-After")) * 1000;
      queue.spacing = Math.min(6000, Math.round(queue.spacing * 1.6));
      globalQueue.spacing = Math.min(2000, Math.round(globalQueue.spacing * 1.3));
      // Il 429 qui è per IP su tutta la piattaforma: si raffreddano TUTTE le
      // code, non solo l'host che ha risposto — riprovare altrove rinfresca
      // la penalità invece di aggirarla.
      const cooldown = Math.min(60000, Math.max(retryAfter || 0, 5000 * (attempt + 1)));
      const resumeAt = Date.now() + cooldown;
      globalQueue.nextAt = Math.max(globalQueue.nextAt, resumeAt);
      queue.nextAt = Math.max(queue.nextAt, resumeAt);
      await wait(cooldown);
      continue;
    }
    throw new Error(`HTTP ${response.status} su ${url.slice(0, 90)}`);
  }
  throw new Error(`HTTP ${response?.status} dopo i tentativi su ${url.slice(0, 90)}`);
}

// ---------------------------------------------------------------------------
// Passo A: articolo Wikipedia (en dalla imageQuery, ja dal nome nativo,
// it dal nome italiano per i punti mappa).
async function wikipediaArticle(language, query, item) {
  const params = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: query, gsrlimit: "5",
    prop: "pageimages|pageprops", piprop: "name", ppprop: "wikibase_item|disambiguation",
    redirects: "1", format: "json"
  });
  const payload = await fetchJson(`https://${language}.wikipedia.org/w/api.php?${params}`);
  const pages = Object.values(payload.query?.pages || {}).sort((a, b) => (a.index || 99) - (b.index || 99));
  for (const page of pages) {
    const title = String(page.title || "");
    if (!title || page.pageprops?.disambiguation !== undefined) continue;
    if (/(disambiguation|disambigua|曖昧さ回避)/i.test(title)) continue;
    const okLatin = titleMatchesSubject(item, title);
    const okCjk = language === "ja" && item.jp && cjkOverlap(item.jp, title) >= 0.6;
    if (!okLatin && !okCjk) continue;
    // Cibo, acquisti e negozianti hanno soggetti generici ("Japanese pottery
    // shop"): una sola parola in comune fa passare qualunque omonimia, ed è
    // così che la ceramica giapponese si è ritrovata un museo della Cornovaglia
    // ("Leach Pottery"). Lì serve una seconda prova: due parole della query nel
    // titolo, oppure il nome giapponese esatto.
    if (language !== "ja" && GENERIC_SUBJECT_TYPES.has(item.type)) {
      const titleWords = new Set(words(title));
      const overlap = significant(item.imageQuery || "").filter((word) => titleWords.has(word)).length;
      const nativeProof = Boolean(item.jp && item.jp.length > 1 && String(title).includes(item.jp));
      if (overlap < 2 && !nativeProof) continue;
    }
    return { title, lead: page.pageimage || "", qid: page.pageprops?.wikibase_item || "" };
  }
  return null;
}

// Passo B: Wikidata P18, l'"immagine del soggetto" scelta dalla comunità.
// A blocchi di 25 entità: una chiamata sola invece di una per voce.
// Un blocco che fallisce restituisce le sue chiavi in `failed`: senza questo
// un errore di rete si travestiva da "questa voce non ha immagine" e veniva
// archiviato per sempre — Kiyomizu-dera e Gion sono rimasti senza foto avendo
// candidati ottimi. Un fallimento deve poter essere ritentato, non concluso.
async function wikidataP18Batch(qids) {
  const found = new Map();
  const failed = new Set();
  const unique = Array.from(new Set(qids.filter(Boolean)));
  for (const group of chunk(unique, 25)) {
    const params = new URLSearchParams({ action: "wbgetentities", ids: group.join("|"), props: "claims", format: "json" });
    let payload;
    try { payload = await fetchJson(`https://www.wikidata.org/w/api.php?${params}`); }
    catch (_) { group.forEach((qid) => failed.add(qid)); continue; }
    for (const [qid, entity] of Object.entries(payload.entities || {})) {
      const claim = ((entity.claims || {}).P18 || [])[0];
      const file = claim && claim.mainsnak?.datavalue?.value;
      if (file) found.set(qid, file);
    }
  }
  return { found, failed };
}

// Passo C (solo senza articolo, mai per i punti mappa in italiano): ricerca
// Commons con punteggio; il rank di ricerca da solo non decide mai.
async function commonsScoredSearch(item) {
  const query = String(item.imageQuery || "").trim();
  if (!query) return { pick: "", candidates: [] };
  const params = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6",
    gsrlimit: "20", prop: "imageinfo", iiprop: "url|mime|size", format: "json"
  });
  const payload = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const queryWords = new Set(significant(query).map(fold));
  const scored = [];
  for (const page of Object.values(payload.query?.pages || {})) {
    const info = page.imageinfo?.[0];
    const title = String(page.title || "").replace(/^File:/, "");
    if (!info || !/^image\/(jpeg|png|webp)$/i.test(info.mime || "")) continue;
    if (!info.width || info.width < 640 || !info.height || info.height < 420) continue;
    if (FILE_DECOYS.test(title)) continue;
    if (!titleMatchesSubject(item, title)) continue;
    const titleWords = new Set(words(title));
    let score = 2; // il soggetto c'è già, per costruzione
    score += [...queryWords].filter((word) => titleWords.has(word)).length;
    if (SEARCH_DECOYS.test(title)) score -= 4;
    if (info.width >= 1600) score += 2; else if (info.width >= 1000) score += 1;
    const aspect = info.width / info.height;
    if (aspect >= 1.15 && aspect <= 2.2) score += 1;
    if (aspect < 0.9) score -= 1;
    scored.push({ file: title, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return { pick: best && best.score >= 4 ? best.file : "", candidates: scored.slice(0, 4).map((c) => c.file) };
}

// Verifica finale su Commons: il file esiste, è una bitmap decente, e da
// extmetadata escono credito e licenza da mostrare in app. A blocchi di 25
// titoli — è la chiamata che prima costava di più, una per candidato.
function fileKey(fileName) {
  return String(fileName || "").replace(/^File:/, "").replace(/_/g, " ").trim();
}

function describeFile(page) {
  const info = page?.imageinfo?.[0];
  if (!info || !/^image\/(jpeg|png|webp)$/i.test(info.mime || "")) return null;
  if (!info.width || info.width < 640) return null;
  const meta = info.extmetadata || {};
  const artist = String(meta.Artist?.value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  const license = String(meta.LicenseShortName?.value || "").replace(/<[^>]*>/g, "").trim();
  if (/fair use/i.test(license)) return null;
  const credit = [artist || null, license || null, "Wikimedia Commons"].filter(Boolean).join(" · ");
  const title = String(page.title || "").replace(/^File:/, "");
  return { file: title, sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/File:${title.replace(/ /g, "_")}`, credit };
}

async function commonsFileInfoBatch(fileNames) {
  const found = new Map();
  const failed = new Set();
  // Il pipe separa i titoli: un nome che lo contiene spezzerebbe la query.
  const unique = Array.from(new Set(fileNames.filter((name) => name && !name.includes("|")).map(fileKey)));
  for (const group of chunk(unique, 25)) {
    const params = new URLSearchParams({
      action: "query", titles: group.map((name) => `File:${name}`).join("|"), prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata", iiextmetadatafilter: "Artist|LicenseShortName", format: "json"
    });
    let payload;
    try { payload = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`); }
    catch (_) { group.forEach((name) => failed.add(name)); continue; }
    // MediaWiki normalizza i titoli chiesti: senza questa mappa il risultato
    // non si ritroverebbe più sotto il nome con cui è stato chiesto.
    const requestedBy = new Map();
    for (const row of payload.query?.normalized || []) requestedBy.set(row.to, row.from);
    for (const page of Object.values(payload.query?.pages || {})) {
      const described = describeFile(page);
      if (!described) continue;
      const title = String(page.title || "");
      found.set(fileKey(title), described);
      const requested = requestedBy.get(title);
      if (requested) found.set(fileKey(requested), described);
    }
  }
  return { found, failed };
}

function usableLeadName(fileName) {
  if (!fileName) return false;
  if (/\.(svg|gif|tif|tiff|pdf)$/i.test(fileName)) return false;
  if (FOREIGN_PLACES.test(fileName)) return false;
  return !FILE_DECOYS.test(fileName);
}

// Indice nome→scheda per i punti mappa che duplicano una scheda guida senza
// dichiararlo: stessa insegna, stessa foto. Le parentesi vanno indicizzate a
// parte, perché il punto mappa aggiunge spesso una glossa che la scheda non
// ha ("Ginkaku-ji (Padiglione d'Argento)" è "Ginkaku-ji") e a volte è la
// parentesi a contenere il nome vero ("Ninja-dera (Myoryu-ji)").
function nameKeys(name) {
  const full = String(name || "");
  const outside = full.replace(/\([^)]*\)/g, " ");
  const inside = (full.match(/\(([^)]*)\)/) || [])[1] || "";
  return [full, outside, inside].map(compact).filter(Boolean);
}

const guideByName = new Map();
for (const item of guideItems) {
  for (const key of nameKeys(item.name)) {
    if (!guideByName.has(key)) guideByName.set(key, item);
  }
}

// La risoluzione lavora a gruppi, non a voce singola: le ricerche restano una
// per voce (nessuna API le raggruppa), ma P18 e info dei file diventano una
// chiamata ogni 25. Da ~3,5 chiamate a voce a ~1,5 — ed è questo, non la
// taratura delle attese, ad aver riportato la corsa da ore a minuti.
async function resolveChunk(items) {
  const rows = items.map((item) => ({ item, result: { alternates: {}, provider: "", pick: null }, en: null, ja: null, it: null, p18: "", twin: null, error: "" }));

  // 1. Articoli. Concorrenza bassa: la coda impone comunque la spaziatura,
  //    questa serve solo a non pagare la latenza una richiesta per volta.
  await mapLimit(rows, 3, async (row) => {
    const item = row.item;
    try {
      if (item.solo) {
        const twin = nameKeys(item.name).map((key) => guideByName.get(key)).find(Boolean);
        if (twin) { row.twin = twin; return; }
        // Il nome del punto mappa è spesso già inglese o romaji ("Kyoto
        // National Museum", "Funaoka Onsen"): en va provata per prima, it
        // resta per i nomi tradotti ("Castello di …", "Giardino …").
        const plain = String(item.name).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim() || item.name;
        row.en = await wikipediaArticle("en", `${plain} ${cityLabel(item.city)}`, item);
        if (row.en) row.result.alternates.en = { title: row.en.title, lead: row.en.lead };
        if (!row.en || !row.en.lead) {
          row.it = await wikipediaArticle("it", plain, item);
          if (row.it) row.result.alternates.it = { title: row.it.title, lead: row.it.lead };
        }
        return;
      }
      row.en = item.imageQuery ? await wikipediaArticle("en", item.imageQuery, item) : null;
      if (row.en) row.result.alternates.en = { title: row.en.title, lead: row.en.lead };
      // La voce giapponese si interroga solo quando quella inglese non basta:
      // metà delle chiamate in meno, e ja resta il paracadute per i soggetti
      // locali che en non copre.
      if ((!row.en || !row.en.lead || !row.en.qid) && item.jp && item.jp.length > 1) {
        row.ja = await wikipediaArticle("ja", item.jp, item);
        if (row.ja) row.result.alternates.ja = { title: row.ja.title, lead: row.ja.lead };
      }
    } catch (error) {
      // Errore di rete: la voce resta da rifare al prossimo giro, non viene
      // archiviata come "nessuna immagine esiste".
      row.error = String(error && error.message || error);
    }
  });

  // 2. P18 di tutto il gruppo in una volta. Vale la chiamata anche quando la
  //    lead c'è: è l'alternativa più forte in revisione, scelta a mano.
  const qids = rows.map((row) => (row.en && row.en.qid) || (row.ja && row.ja.qid) || (row.it && row.it.qid) || "");
  const { found: p18, failed: p18Failed } = await wikidataP18Batch(qids);
  rows.forEach((row, index) => {
    const file = p18.get(qids[index]);
    if (file) { row.p18 = file; row.result.alternates.p18 = file; }
    else if (p18Failed.has(qids[index])) row.p18Unknown = true;
  });

  // 3. Info dei candidati in blocco, poi la cascata su dati già in mano.
  for (const row of rows) {
    row.ordered = [
      ["wikipedia-en-lead", row.en && row.en.lead],
      ["wikipedia-ja-lead", row.ja && row.ja.lead],
      ["wikipedia-it-lead", row.it && row.it.lead],
      ["wikidata-p18", row.p18]
    ].filter(([, file]) => usableLeadName(file || ""));
  }
  const { found: info, failed: infoFailed } = await commonsFileInfoBatch(rows.flatMap((row) => row.ordered.map(([, file]) => file)));
  for (const row of rows) {
    if (row.twin) { row.result.provider = "alias"; row.result.aliasOf = row.twin.id; continue; }
    for (const [provider, file] of row.ordered) {
      const found = info.get(fileKey(file));
      if (found) { row.result.provider = provider; row.result.pick = found; break; }
    }
    // Nessuna scelta E una risposta mai arrivata: è un'incertezza, non un
    // "non esiste". Va ritentata, non archiviata.
    if (!row.result.pick && (row.p18Unknown || row.ordered.some(([, file]) => infoFailed.has(fileKey(file))))) {
      row.error = "risposta mancante da Commons o Wikidata";
    }
  }

  // 4. Chi resta senza articolo passa alla ricerca con punteggio — mai i punti
  //    mappa, il cui nome italiano non descrive il soggetto.
  const leftovers = rows.filter((row) => !row.result.pick && !row.result.aliasOf && !row.item.solo && !row.error);
  await mapLimit(leftovers, 3, async (row) => {
    const search = await commonsScoredSearch(row.item).catch(() => ({ pick: "", candidates: [] }));
    if (search.candidates?.length) row.result.alternates.search = search.candidates;
    row.searchPick = search.pick;
  });
  const { found: searchInfo, failed: searchFailed } = await commonsFileInfoBatch(leftovers.map((row) => row.searchPick));
  for (const row of leftovers) {
    const found = row.searchPick && searchInfo.get(fileKey(row.searchPick));
    if (found) { row.result.provider = "commons-scored"; row.result.pick = found; }
    else if (row.searchPick && searchFailed.has(fileKey(row.searchPick))) row.error = "risposta mancante da Commons";
  }
  // Chi arriva qui senza scelta resta al fallback runtime: meglio nessuna
  // foto fissata per sempre che una foto sbagliata fissata per sempre.
  return rows;
}

// ---------------------------------------------------------------------------
// Stato, override, emissione.
function loadJson(path, fallback) {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback; } catch { return fallback; }
}
const state = loadJson(statePath, {});
const overrides = loadJson(overridesPath, {});

function pickFor(id, depth) {
  if (depth > 2) return null;
  const override = overrides[id];
  if (override === null) return null; // forzato "senza curazione"
  if (override) return override;
  const entry = state[id];
  if (!entry) return null;
  if (entry.aliasOf) return pickFor(entry.aliasOf, (depth || 0) + 1);
  return entry.pick && entry.pick.file ? entry.pick : null;
}

function emit() {
  const all = collectionsByType.all.flat();
  const entries = [];
  for (const item of all) {
    if (item.imageUrl) continue;
    const pick = pickFor(item.id, 0);
    if (!pick || !pick.file) continue;
    entries.push([item.id, [encodeURIComponent(pick.file), pick.sourceUrl, pick.credit]]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const body = entries.map(([id, value]) => `  ${JSON.stringify(id)}: ${JSON.stringify(value)}`).join(",\n");
  const banner = "// Generato da scripts/refresh-curated-images.mjs — non modificare a mano.\n" +
    "// La scelta arriva da lead image Wikipedia / Wikidata P18 / Commons con\n" +
    "// punteggio; le correzioni puntuali vivono in scripts/image-overrides.json\n" +
    "// e sopravvivono a ogni rigenerazione. L'app costruisce l'URL con\n" +
    "// commons.wikimedia.org/wiki/Special:Redirect/file/<nome>?width=960.\n";
  writeFileSync(outputPath, `${banner}window.TABI_CURATED_IMAGES = {\n${body}\n};\n`);
  return entries.length;
}

if (emitOnly) {
  const count = emit();
  console.log(`Emesse ${count} curazioni in assets/curated-images-data.js (solo emissione).`);
  process.exit(0);
}

mkdirSync(dirname(statePath), { recursive: true });
const pending = items.filter((item) => force || !state[item.id]?.done);
const groupSize = Math.max(10, Math.min(Number(arg("group", 40)), 100));
let processed = 0;
let failures = 0;
const startedAt = Date.now();
for (const group of chunk(pending, groupSize)) {
  let rows;
  try {
    rows = await resolveChunk(group);
  } catch (error) {
    // Guasto dell'intero gruppo: le voci restano da rifare, non archiviate.
    failures += group.length;
    console.log(`Gruppo saltato (${group.length} voci): ${error && error.message}`);
    continue;
  }
  for (const row of rows) {
    const item = row.item;
    if (row.error) {
      failures += 1;
      state[item.id] = { done: false, name: item.name, error: row.error };
      continue;
    }
    state[item.id] = {
      done: true, name: item.name, query: item.imageQuery || "", jp: item.jp || "",
      type: item.type || "mappoint", provider: row.result.provider, pick: row.result.pick,
      aliasOf: row.result.aliasOf || "", alternates: row.result.alternates
    };
  }
  processed += group.length;
  writeFileSync(statePath, JSON.stringify(state));
  const curated = Object.values(state).filter((entry) => (entry.pick && entry.pick.file) || entry.aliasOf).length;
  const rate = processed / Math.max((Date.now() - startedAt) / 60000, 0.01);
  const left = Math.max(pending.length - processed, 0);
  console.log(`[${processed}/${pending.length}] curati finora: ${curated}${failures ? ` — errori: ${failures}` : ""} — ${rate.toFixed(0)}/min, restano ~${Math.ceil(left / Math.max(rate, 0.1))} min`);
}
writeFileSync(statePath, JSON.stringify(state));

const count = emit();
const finished = Object.values(state).filter((entry) => entry.done);
const withPick = finished.filter((entry) => (entry.pick && entry.pick.file) || entry.aliasOf);
const byProvider = withPick.reduce((groups, entry) => { groups[entry.provider] = (groups[entry.provider] || 0) + 1; return groups; }, {});
console.log(`\nCurate ${withPick.length}/${finished.length} voci (${count} emesse nel data file).`);
for (const [provider, total] of Object.entries(byProvider)) console.log(`- ${provider}: ${total}`);
const uncurated = finished.filter((entry) => !(entry.pick && entry.pick.file) && !entry.aliasOf);
if (uncurated.length) {
  console.log(`Senza curazione (${uncurated.length}) — restano al fallback runtime:`);
  for (const entry of uncurated.slice(0, 40)) console.log(`- ${entry.name} (${entry.query || "punto mappa"})`);
  if (uncurated.length > 40) console.log(`  … e altre ${uncurated.length - 40}`);
}
if (failures) {
  console.log(`Errori di rete su ${failures} voci: rilanciare per riprendere dal checkpoint.`);
  process.exitCode = 1;
}
