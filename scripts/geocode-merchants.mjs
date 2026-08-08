// Cerca su Nominatim le coordinate dei negozianti e scarta quelle che cadono
// fuori dalla città a cui dovrebbero appartenere. Serve al livello "Negozianti"
// della mappa: senza lat/lng una scheda non può diventare un punto.
//
// Si usa a mano, quando si aggiungono negozi nuovi:
//   node scripts/geocode-merchants.mjs "Isetan Shinjuku|tokyo" "Aritsugu Nishiki|kyoto"
// oppure senza argomenti per ripassare tutte le righe di merchants-data.js che
// non hanno ancora le coordinate.
//
// Nominatim è un servizio pubblico e gratuito: una richiesta al secondo e uno
// User-Agent che dice chi siamo, come chiede la loro politica d'uso.

import { readFileSync } from "node:fs";

const AGENT = "TabiGuide/1.0 (guida di viaggio personale)";
const PAUSE_MS = 1100;

// Il riquadro di ogni città: una coordinata che cade fuori è un omonimo, non il
// negozio che cercavamo. Senza questo controllo "Daiso Harajuku" finisce nel
// quartiere omonimo di Sagamihara, quaranta chilometri più in là.
const CITY_BOX = {
  tokyo: [35.55, 35.82, 139.60, 139.92],
  kyoto: [34.93, 35.11, 135.66, 135.83],
  osaka: [34.60, 34.76, 135.38, 135.56],
  kanazawa: [36.52, 36.62, 136.58, 136.70],
  nara: [34.64, 34.72, 135.76, 135.88],
  hiroshima: [34.35, 34.45, 132.40, 132.52],
  takayama: [36.09, 36.20, 137.20, 137.30],
  matsumoto: [36.19, 36.28, 137.92, 138.02],
  kamakura: [35.28, 35.36, 139.50, 139.59],
  nagano: [36.60, 36.72, 138.14, 138.25],
  miyajima: [34.26, 34.32, 132.29, 132.35],
  shirakawago: [36.22, 36.30, 136.86, 136.95]
};

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// Stare nel riquadro giusto non basta: cercando 柚気 a Kanazawa, Nominatim
// risponde con un asilo che sta in città ma non c'entra niente. Si accetta solo
// se il nome trovato contiene davvero quello cercato — meglio nessuna coordinata
// che una che manda dall'altra parte del quartiere.
function nameMatches(query, displayName) {
  const found = displayName.toLowerCase();
  const wanted = query.toLowerCase().trim();
  if (found.includes(wanted)) return true;
  // Le insegne latine spesso sono più lunghe del nome ufficiale ("Yodobashi
  // Camera Akiba" per "ヨドバシAkiba"): basta che la prima parola coincida.
  const head = wanted.split(/[\s·・]/)[0];
  return head.length >= 4 && found.includes(head);
}

async function geocode(query, city) {
  const box = CITY_BOX[city];
  const params = new URLSearchParams({ format: "json", limit: "3", q: query });
  if (box) {
    // viewbox vuole west,north,east,south
    params.set("viewbox", [box[2], box[1], box[3], box[0]].join(","));
    params.set("bounded", "1");
  }
  const response = await fetch("https://nominatim.openstreetmap.org/search?" + params, {
    headers: { "User-Agent": AGENT }
  });
  if (!response.ok) return null;
  const results = await response.json();
  for (const hit of results) {
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (box && (lat < box[0] || lat > box[1] || lng < box[2] || lng > box[3])) continue;
    if (!nameMatches(query, hit.display_name)) continue;
    return { lat: lat.toFixed(5), lng: lng.toFixed(5), name: hit.display_name };
  }
  return null;
}

// Il nome giapponese trova quello che il nome latino non trova: su OpenStreetMap
// le insegne sono scritte come stanno sulla porta. Si prova prima quello, poi il
// nome con il quartiere, e per ultima la query pensata per le fotografie.
function rowsWithoutCoordinates() {
  const src = readFileSync(new URL("../assets/merchants-data.js", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("const rows = `") + 14, src.indexOf("`;"));
  return block.split("\n").filter(Boolean).map(function (line) {
    const v = line.split("|");
    const city = v[0].charAt(0).toUpperCase() + v[0].slice(1);
    return {
      city: v[0], slug: v[1], lat: v[7],
      queries: [
        v[3], v[3] && v[6] ? v[3] + " " + v[6] : "", v[3] ? v[3] + ", " + city : "",
        v[2] + " " + v[6], v[2] + ", " + city, v[14]
      ].filter(Boolean)
    };
  }).filter(function (row) { return !row.lat; });
}

const wanted = process.argv.slice(2).length
  ? process.argv.slice(2).map(function (arg) {
    const [query, city] = arg.split("|");
    return { slug: query, city: city, queries: [query] };
  })
  : rowsWithoutCoordinates();

let found = 0;
for (const row of wanted) {
  let hit = null;
  for (const query of row.queries) {
    hit = await geocode(query, row.city);
    await sleep(PAUSE_MS);
    if (hit) break;
  }
  if (hit) {
    found += 1;
    console.log([row.slug, row.city, hit.lat, hit.lng, hit.name.slice(0, 70)].join("|"));
  } else {
    console.log([row.slug, row.city, "", "", "NON TROVATO"].join("|"));
  }
}
console.error("Verificati " + found + " su " + wanted.length);
