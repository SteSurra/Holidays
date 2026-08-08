// Le fermate dei trasferimenti finiscono in un link di Google Maps, e un nome
// che Maps non riconosce apre una ricerca vuota: te ne accorgi alla stazione,
// con il treno che parte. Perciò nei dati non stanno più i nomi da cercare ma le
// coordinate, e questo script è ciò che le ricava e le ricontrolla.
//
// Cercare per nome non basta da solo: "Nagano Station" restituisce un omonimo a
// centoquaranta chilometri. Ogni fermata ha quindi un'ancora — il punto dove
// sappiamo che si trova — e un risultato troppo lontano viene scartato invece di
// essere accettato perché il nome combacia.
//
//   node scripts/check-transfer-stops.mjs
import { readFileSync } from "node:fs";

const UA = "TabiJapanGuide/1.0 (personal trip planner)";

// Le ancore stanno qui e non nei dati pubblicati: servono solo a questo
// controllo. Sono i centri delle tappe, più i due punti che stanno fuori da
// esse. Il raggio è la distanza massima accettabile dall'ancora.
const ANCHORS = {
  kix: { lat:34.4320, lng:135.2304, km:6, label:"aeroporto di Kansai" },
  shinOsaka: { lat:34.7335, lng:135.5003, km:6, label:"Shin-Osaka" },
  osakaStation: { lat:34.7025, lng:135.4959, km:6, label:"Osaka" },
  nara: { lat:34.6851, lng:135.8048, km:8, label:"Nara" },
  miyajimaguchi: { lat:34.3130, lng:132.3035, km:6, label:"Miyajimaguchi" },
  miyajimaPier: { lat:34.2977, lng:132.3226, km:6, label:"Miyajima" },
  hiroshima: { lat:34.3975, lng:132.4753, km:8, label:"Hiroshima" },
  kyoto: { lat:34.9858, lng:135.7588, km:8, label:"Kyoto" },
  tsuruga: { lat:35.6450, lng:136.0555, km:8, label:"Tsuruga" },
  kanazawa: { lat:36.5780, lng:136.6480, km:6, label:"Kanazawa" },
  kanazawaWest: { lat:36.5785, lng:136.6465, km:3, label:"Kanazawa, uscita ovest" },
  ogimachi: { lat:36.2578, lng:136.9063, km:6, label:"Shirakawa-go" },
  takayamaBus: { lat:36.1440, lng:137.2540, km:6, label:"Takayama" },
  matsumotoBus: { lat:36.2300, lng:137.9670, km:6, label:"Matsumoto" },
  matsumoto: { lat:36.2295, lng:137.9670, km:6, label:"Matsumoto" },
  nagano: { lat:36.6432, lng:138.1888, km:6, label:"Nagano" },
  naganoBus: { lat:36.6432, lng:138.1888, km:3, label:"Nagano, piazzale bus" },
  bustaShinjuku: { lat:35.6896, lng:139.7006, km:4, label:"Shinjuku" },
  tawaramachi: { lat:35.7098, lng:139.7907, km:4, label:"Asakusa" },
  mitsukoshimae: { lat:35.6851, lng:139.7731, km:4, label:"Nihonbashi" },
  suitengumae: { lat:35.6825, lng:139.7856, km:4, label:"Suitengumae" },
  tcat: { lat:35.6820, lng:139.7875, km:4, label:"T-CAT" },
  haneda: { lat:35.5494, lng:139.7798, km:9, label:"Haneda" }
};

const travel = readFileSync(new URL("../assets/travel-data.js", import.meta.url), "utf8");
const block = travel.slice(travel.indexOf("const stops = {"), travel.indexOf("window.JAPAN_DATA.legs"));
const stops = [...block.matchAll(/(\w+):\s*\{([^}]+)\}/g)].map(function (m) {
  const body = m[2];
  const field = function (key) {
    const found = body.match(new RegExp(key + ':"([^"]*)"'));
    return found ? found[1] : "";
  };
  const num = function (key) {
    const found = body.match(new RegExp(key + ":([\\d.]+)"));
    return found ? Number(found[1]) : null;
  };
  return { key:m[1], name:field("name"), jp:field("jp"), lat:num("lat"), lng:num("lng") };
});

// Le fermate che i documenti di viaggio nominano: se una chiave manca dai
// dati, la griglia dei trasferimenti è incompleta rispetto al programma
// prenotato. Qui stanno solo le chiavi — i documenti restano fuori dal repo.
const PDF_STOPS = [
  "kix", "shinOsaka", "osakaStation", "nara", "miyajimaguchi", "miyajimaPier",
  "hiroshima", "kyoto", "tsuruga", "kanazawa", "kanazawaWest", "ogimachi",
  "takayamaBus", "matsumotoBus", "matsumoto", "nagano", "naganoBus",
  "bustaShinjuku", "tawaramachi", "mitsukoshimae", "suitengumae", "tcat", "haneda"
];
const presentKeys = new Set(stops.map(function (stop) { return stop.key; }));
const missingFromData = PDF_STOPS.filter(function (key) { return !presentKeys.has(key); });
if (missingFromData.length) {
  console.error("Fermate nominate dai documenti ma assenti dai dati: " + missingFromData.join(", "));
  process.exitCode = 1;
}

function metersBetween(a, b) {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

async function search(query) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=jp&q=" + encodeURIComponent(query);
  const response = await fetch(url, { headers:{ "User-Agent":UA, "Accept-Language":"ja,en" } });
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}

const wait = (ms) => new Promise(function (resolve) { setTimeout(resolve, ms); });

const results = [];
for (const stop of stops) {
  const anchor = ANCHORS[stop.key];
  if (!anchor) {
    console.log("??  " + stop.key.padEnd(15) + "manca l'ancora in questo script");
    results.push({ stop, hit:null });
    continue;
  }
  // Se il dato ha già le coordinate, il controllo è che cadano dove devono:
  // basta un numero storto in un incollaggio per spedire il link altrove.
  if (Number.isFinite(stop.lat) && Number.isFinite(stop.lng)) {
    const away = metersBetween(anchor, { lat:stop.lat, lng:stop.lng });
    const ok = away <= anchor.km * 1000;
    results.push({ stop, hit:ok ? { lat:stop.lat, lng:stop.lng } : null });
    console.log((ok ? "OK  " : "NO  ") + stop.key.padEnd(15) + stop.name.padEnd(30)
      + stop.lat.toFixed(5) + "," + stop.lng.toFixed(5) + "  " + Math.round(away) + "m da " + anchor.label
      + (ok ? "" : "  ← FUORI RAGGIO"));
    continue;
  }
  const attempts = [stop.jp, stop.jp.replace(/[（(].*$/, ""), stop.name + " Japan"].filter(Boolean);
  let best = null;
  let used = "";
  for (const attempt of attempts) {
    let found = [];
    try { found = await search(attempt); } catch (error) { console.error("  ! " + error.message); }
    const near = found
      .map(function (entry) { return { lat:Number(entry.lat), lng:Number(entry.lon), label:entry.display_name.split(",")[0] }; })
      .filter(function (point) { return metersBetween(anchor, point) <= anchor.km * 1000; })
      .sort(function (a, b) { return metersBetween(anchor, a) - metersBetween(anchor, b); })[0];
    await wait(1100);
    if (near) { best = near; used = attempt; break; }
  }
  results.push({ stop, hit:best, used });
  console.log((best ? "OK  " : "NO  ") + stop.key.padEnd(15) + stop.name.padEnd(28)
    + (best ? best.lat.toFixed(5) + "," + best.lng.toFixed(5) + "  " + Math.round(metersBetween(anchor, best)) + "m da " + anchor.label + "  ← " + used
      : "nessun risultato entro " + anchor.km + " km da " + anchor.label));
}

const missing = results.filter(function (entry) { return !entry.hit; });
console.log("\n" + (results.length - missing.length) + "/" + results.length + " fermate confermate.");
if (missing.length) {
  console.log("Da mettere a mano: " + missing.map(function (entry) { return entry.stop.key; }).join(", "));
  // Una fermata fuori raggio stampava l'errore e usciva comunque con 0: in uno
  // script di controllo un fallimento che non fallisce è peggio di niente.
  process.exitCode = 1;
}

// Il formato del link conta quanto le coordinate: `api=1` è l'unico che Google
// dichiara valido allo stesso modo su Android, iPhone e web. L'indirizzo interno
// del sito (/@lat,lng,17z) sul telefono viene raccolto dall'app nativa, che non
// è tenuta a interpretarlo — ed è così che un link "che dal computer funziona"
// non funziona dal telefono.
const render = readFileSync(new URL("../assets/app.js", import.meta.url), "utf8");
const linkLine = render.slice(render.indexOf("const stops = (leg.stops"), render.indexOf("return '<a class=\"transfer-stop\""));
const usaFormatoUfficiale = linkLine.includes("maps/search/?api=1&query=") && linkLine.includes("stop.lat");
console.log("\nFormato del link: " + (usaFormatoUfficiale
  ? "api=1 con coordinate — supportato su Android, iPhone e web"
  : "ATTENZIONE: non è il formato api=1 con coordinate, sul telefono può aprire altro"));

console.log("\n--- coordinate ---");
results.forEach(function (entry) {
  if (entry.hit) console.log(entry.stop.key + ': lat:' + entry.hit.lat.toFixed(5) + ", lng:" + entry.hit.lng.toFixed(5));
});
