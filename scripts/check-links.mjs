// Ogni link della guida deve portare da qualche parte: un 404 scoperto in
// viaggio, magari offline poco dopo, non si ripara più. Questo script raccoglie
// tutti gli URL pubblicati — dai dati e dal codice — e li prova davvero.
//
// Tre esiti, non due: OK, ROTTO (404/410: il server dice che la pagina non
// esiste) e DA VERIFICARE A MANO. Tabelog e qualche sito ufficiale giapponese
// rispondono 403 ai controlli automatici ma si aprono benissimo dal browser:
// bocciarli qui insegnerebbe solo a ignorare il controllo. Falliamo il check
// soltanto sui rotti veri.
//
// I link di Google Maps non si scaricano (rispondono comunque 200): per loro
// conta il formato — api=1, l'unico che Google documenta identico su app
// Android, iPhone e web — e le coordinate, che verificano gli altri script.
//
//   node scripts/check-links.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const TIMEOUT_MS = 15000;
const GLOBAL_CONCURRENCY = 6;
// Pausa di cortesia fra richieste allo stesso dominio.
const DOMAIN_DELAYS = { "tabelog.com": 3000, "commons.wikimedia.org": 500, "default": 300 };

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

// --- 1) URL dai dati: si valutano i file e si cammina l'oggetto risultante ---
const context = vm.createContext({ window: {}, console });
const dataFiles = [
  "assets/data.js", "assets/food-data.js", "assets/shopping-data.js", "assets/food-extra-data.js",
  "assets/travel-data.js", "assets/history-data.js", "assets/phrases-data.js", "assets/map-data.js",
  "assets/merchants-data.js", "assets/transit-data.js", "assets/experiences-data.js",
  "assets/money-data.js", "assets/glossary-data.js", "assets/packing-data.js", "assets/day-tips-data.js",
  "assets/source-data.js", "assets/guide-data.js"
];
for (const file of dataFiles) vm.runInContext(read(file), context, { filename: file });

const found = new Map(); // url -> Set(sorgenti)
function note(url, source) {
  if (!found.has(url)) found.set(url, new Set());
  found.get(url).add(source);
}
function walk(value, source) {
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) note(value.trim(), source);
    return;
  }
  if (Array.isArray(value)) { value.forEach(function (entry) { walk(entry, source); }); return; }
  if (value && typeof value === "object") {
    Object.keys(value).forEach(function (key) { walk(value[key], source); });
  }
}
walk(context.window.JAPAN_DATA, "dati");
walk(context.window.JAPAN_MAP_DATA, "dati mappa");
walk(context.window.JAPAN_TRANSIT, "transit");
walk(context.window.JAPAN_MONEY, "money");
walk(context.window.JAPAN_RESEARCH_SOURCES, "fonti");

// --- 2) URL scritti nel codice e nella shell ---
const codeFiles = ["assets/app.js", "assets/map.js", "index.html", "sw.js", "manifest.webmanifest"];
for (const file of codeFiles) {
  const source = read(file);
  for (const match of source.matchAll(/https?:\/\/[^\s"'<>\\)]+/g)) {
    note(match[0].replace(/[.,;]$/, ""), file);
  }
}

// --- 3) Il formato dei link Google Maps: api=1 o niente ---
let formatFailures = 0;
for (const file of ["assets/app.js", "assets/map.js", "index.html"]) {
  const source = read(file);
  for (const match of source.matchAll(/https?:\/\/www\.google\.com\/maps[^\s"']*/g)) {
    // Nei pezzi di HTML la e commerciale è scritta &amp;: è lo stesso URL.
    const url = match[0].replace(/&amp;/g, "&");
    const ok = url.startsWith("https://www.google.com/maps/search/?api=1&query=")
      || url.startsWith("https://www.google.com/maps/dir/?api=1");
    if (!ok) {
      console.error("FORMATO  " + file + ": " + url + "  ← non è il formato api=1 documentato");
      formatFailures += 1;
    }
  }
}
if (!formatFailures) console.log("Formato Google Maps: tutte le occorrenze usano api=1 (search o dir).\n");

// --- 4) Pulizia della lista da controllare via HTTP ---
function skippable(url) {
  if (url.includes("{")) return "template";                      // tile {z}/{x}/{y} e simili
  if (/google\.com\/maps/.test(url)) return "maps (solo formato)";
  if (/^https?:\/\/(www\.)?(translate\.google\.com|google\.com\/search)/.test(url)) return "ricerca costruita a runtime";
  if (url.includes("localhost") || url.includes("127.0.0.1")) return "locale";
  // Nel codice molti indirizzi sono l'inizio di un URL a cui si aggiunge un id
  // o una ricerca: provarli così com'è darebbe un 404 che non esiste per
  // nessun utente. Si riconoscono dalla coda: finiscono con /, = o ?.
  if (/[/=?]$/.test(url)) return "prefisso completato a runtime";
  return null;
}
const toCheck = [];
for (const [url, sources] of found) {
  const why = skippable(url);
  if (!why) toCheck.push({ url, sources: [...sources] });
}
console.log(toCheck.length + " URL unici da controllare (su " + found.size + " trovati).\n");

// Un'origine nuda (niente percorso) è lì per il preconnect o come radice di
// un'API: conta che l'host risponda, non che la home esista.
function isBareOrigin(url) {
  const parsed = new URL(url);
  return (parsed.pathname === "/" || parsed.pathname === "") && !parsed.search;
}

// --- 5) Fetch con code per dominio ---
const wait = (ms) => new Promise(function (resolve) { setTimeout(resolve, ms); });

async function probe(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "it,ja;q=0.8,en;q=0.6" }
    });
    // Il corpo non serve: libera la connessione.
    if (response.body) try { await response.body.cancel(); } catch { /* già chiuso */ }
    return { status: response.status, finalUrl: response.url };
  } finally {
    clearTimeout(timer);
  }
}

// Overpass non è una pagina: risponde 400 a chi bussa senza una domanda. Per
// sapere se è vivo bisogna chiedergli qualcosa, e la domanda più piccola è il
// conteggio a vuoto.
function probeUrl(url) {
  return url.endsWith("/api/interpreter") ? url + "?data=" + encodeURIComponent("[out:json];out count;") : url;
}

async function check(url) {
  url = probeUrl(url);
  let last = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      let result = await probe(url, "HEAD");
      if ([405, 403, 501, 400].includes(result.status)) result = await probe(url, "GET");
      last = result;
      if (result.status === 429 || result.status >= 500) {
        await wait(1500 * (attempt + 1));
        continue;
      }
      break;
    } catch (error) {
      last = { status: 0, error: error.name === "AbortError" ? "timeout" : String(error.cause && error.cause.code || error.message) };
      await wait(1000 * (attempt + 1));
    }
  }
  return last;
}

const byDomain = new Map();
for (const entry of toCheck) {
  const host = new URL(entry.url).hostname;
  if (!byDomain.has(host)) byDomain.set(host, []);
  byDomain.get(host).push(entry);
}

const okList = [], brokenList = [], unsureList = [];
const queues = [...byDomain.entries()];
let active = 0, queueIndex = 0;
await new Promise(function (resolve) {
  const next = function () {
    while (active < GLOBAL_CONCURRENCY && queueIndex < queues.length) {
      const [host, entries] = queues[queueIndex];
      queueIndex += 1;
      active += 1;
      (async function () {
        const delay = DOMAIN_DELAYS[host] || DOMAIN_DELAYS[Object.keys(DOMAIN_DELAYS).find(function (key) { return host.endsWith(key); }) || "default"] || DOMAIN_DELAYS.default;
        for (const entry of entries) {
          const result = await check(entry.url);
          const record = { ...entry, result };
          if (result && result.status >= 200 && result.status < 400) {
            okList.push(record);
            const finalHost = result.finalUrl ? new URL(result.finalUrl).hostname : host;
            if (finalHost !== host) record.redirectedTo = finalHost;
          } else if (result && result.status > 0 && isBareOrigin(entry.url)) {
            okList.push(record);
          } else if (result && [404, 410].includes(result.status)) {
            brokenList.push(record);
            console.error("ROTTO   " + result.status + "  " + entry.url + "  [" + entry.sources.join(", ") + "]");
          } else {
            unsureList.push(record);
          }
          await wait(delay);
        }
        active -= 1;
        next();
      })();
    }
    if (active === 0 && queueIndex >= queues.length) resolve();
  };
  next();
});

console.log("\nOK: " + okList.length + "   Rotti: " + brokenList.length + "   Da verificare a mano: " + unsureList.length);
const redirected = okList.filter(function (entry) { return entry.redirectedTo; });
if (redirected.length) {
  console.log("\nRedirect verso un altro dominio (funzionano, ma il dato può essere aggiornato):");
  redirected.forEach(function (entry) { console.log("  " + entry.url + " → " + entry.redirectedTo); });
}
if (unsureList.length) {
  console.log("\nDa verificare a mano nel browser (bot-block o rete, non per forza rotti):");
  unsureList.forEach(function (entry) {
    const result = entry.result || {};
    console.log("  [" + (result.status || result.error || "?") + "] " + entry.url + "  [" + entry.sources.join(", ") + "]");
  });
}
if (brokenList.length || formatFailures) {
  console.error("\nCheck fallito: " + brokenList.length + " link rotti, " + formatFailures + " formati sbagliati.");
  process.exit(1);
}
console.log("\nNessun link rotto.");
