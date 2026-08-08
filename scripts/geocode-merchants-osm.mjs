// Secondo giro per i negozianti rimasti senza coordinate.
//
// Il primo giro li cercava e li buttava via: OpenStreetMap scrive «出町 ふたば»
// con uno spazio in mezzo, la scheda dice «出町ふたば», e il confronto fra i due
// nomi falliva. La ricerca aveva trovato il negozio giusto — era il controllo a
// scartarlo.
//
// Qui il nome si confronta senza spazi (anche quelli ideografici) e accettando
// che uno contenga l'altro, perché in OSM il nome porta spesso in coda la
// filiale: «一保堂茶舗 京都本店» è comunque «一保堂茶舗». A tenere onesta la cosa
// resta la distanza: un risultato lontano dalla città della scheda viene
// scartato comunque, per non piazzare a Tokyo un negozio di Kyoto.
//
//   node scripts/geocode-merchants-osm.mjs
import { readFileSync } from "node:fs";

const UA = "TabiJapanGuide/1.0 (personal trip planner)";
const RADIUS_KM = 30;

function read(file) {
  return readFileSync(new URL("../assets/" + file, import.meta.url), "utf8");
}

const cities = {};
[...read("data.js").matchAll(/\["([a-z-]+)","([^"]+)","[^"]*","[^"]*",([\d.]+),([\d.]+)/g)].forEach(function (m) {
  cities[m[1]] = { name:m[2], lat:Number(m[3]), lng:Number(m[4]) };
});

const source = read("merchants-data.js");
const start = source.indexOf("const rows = `") + 14;
const rows = source.slice(start, source.indexOf("`", start)).split("\n").map(function (l) { return l.trim(); }).filter(Boolean);

const missing = rows.map(function (line) {
  const v = line.split("|");
  return { city:v[0], slug:v[1], name:v[2], jp:v[3], area:v[6], lat:v[7], imageQuery:v[14] };
}).filter(function (row) { return !row.lat; });

function metersBetween(a, b) {
  const t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t;
  const dLng = (b.lng - a.lng) * t;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Senza spazi e senza i suffissi di filiale: è la stessa insegna scritta in due modi.
function squash(text) {
  return String(text || "").replace(/[\s　]/g, "").replace(/(本店|支店|店)$/, "");
}

function looksLikeSame(wanted, found) {
  const a = squash(wanted);
  const b = squash(found);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

async function search(query) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=jp&namedetails=1&extratags=1&q=" + encodeURIComponent(query);
  const response = await fetch(url, { headers:{ "User-Agent":UA, "Accept-Language":"ja,en" } });
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}

// Un negoziante è un negozio, non un comune. Senza questo filtro «瑞穂» —
// l'insegna di una pasticceria di Harajuku — trova il comune di Mizuho a
// quaranta chilometri, e il nome combacia pure.
const PLACE_KINDS = ["shop", "amenity", "craft", "tourism", "office", "building", "leisure", "historic"];
function isShop(entry) {
  return PLACE_KINDS.includes(entry.class);
}

// L'ancora fine è il quartiere scritto sulla scheda: dentro una città grande il
// centro non basta a dire se un risultato è quello giusto.
const areaCache = {};
async function anchorFor(row, city) {
  const key = row.city + "|" + row.area;
  if (areaCache[key] !== undefined) return areaCache[key];
  if (!row.area || /centro|botteghe/i.test(row.area)) return (areaCache[key] = null);
  let hit = null;
  try {
    const results = await search(row.area + " " + city.name);
    hit = results
      .map(function (e) { return { lat:Number(e.lat), lng:Number(e.lon) }; })
      .filter(function (p) { return metersBetween(city, p) <= 25000; })[0] || null;
  } catch (_) { /* si resta senza ancora fine */ }
  await wait(1100);
  return (areaCache[key] = hit);
}

const wait = (ms) => new Promise(function (r) { setTimeout(r, ms); });

console.log(missing.length + " negozianti senza coordinate\n");

const found = [];
const still = [];
for (const row of missing) {
  const anchor = cities[row.city];
  if (!anchor) { still.push(row); continue; }
  const fine = await anchorFor(row, anchor);
  // Con il quartiere noto si accetta solo ciò che gli sta attorno; senza, si
  // resta larghi sulla città ma il filtro sul tipo tiene fuori i comuni omonimi.
  const centre = fine || anchor;
  const limit = fine ? 2500 : RADIUS_KM * 1000;
  const attempts = [row.jp, squash(row.jp), row.jp + " " + row.area, row.name + " " + anchor.name, row.imageQuery].filter(Boolean);
  let hit = null;
  for (const attempt of attempts) {
    let results = [];
    try { results = await search(attempt); } catch (error) { console.error("  ! " + error.message); }
    await wait(1100);
    const candidate = results
      .filter(isShop)
      .map(function (entry) {
        const names = entry.namedetails || {};
        return {
          lat:Number(entry.lat), lng:Number(entry.lon),
          label:names.name || entry.display_name.split(",")[0],
          alt:[names.name, names["name:ja"], names["name:en"], entry.display_name.split(",")[0]].filter(Boolean)
        };
      })
      .filter(function (point) { return metersBetween(centre, point) <= limit; })
      .filter(function (point) { return point.alt.some(function (label) { return looksLikeSame(row.jp, label) || looksLikeSame(row.name, label); }); })
      .sort(function (a, b) { return metersBetween(centre, a) - metersBetween(centre, b); })[0];
    if (candidate) { hit = candidate; break; }
  }
  if (hit) {
    found.push({ row, hit });
    console.log("OK  " + row.slug.padEnd(28) + hit.lat.toFixed(5) + "," + hit.lng.toFixed(5)
      + "  " + Math.round(metersBetween(fine || anchor, hit)) + "m da " + (fine ? row.area : anchor.name) + "  «" + hit.label + "»");
  } else {
    still.push(row);
    console.log("no  " + row.slug.padEnd(28) + row.name + " (" + row.jp + ")");
  }
}

console.log("\nTrovati " + found.length + " di " + missing.length + ".");
if (found.length) {
  console.log("\n--- city|slug\tlat\tlng ---");
  found.forEach(function (entry) {
    console.log(entry.row.city + "|" + entry.row.slug + "\t" + entry.hit.lat.toFixed(5) + "\t" + entry.hit.lng.toFixed(5));
  });
}
if (still.length) {
  console.log("\n--- restano senza coordinate ---");
  still.forEach(function (row) { console.log(row.city + "|" + row.slug + "  " + row.name); });
}
