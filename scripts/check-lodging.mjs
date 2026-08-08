// I sette hotel del viaggio hanno un punto sulla mappa e un link Google Maps a
// coordinate: se il punto è sbagliato, il link accompagna nel posto sbagliato
// con la valigia in mano. Questo script geocodifica l'indirizzo pubblico di
// ogni hotel e pretende che il punto pubblicato cada entro 300 metri: un
// edificio, non un quartiere.
//
// Il geocoder primario è quello nazionale giapponese (GSI): con gli indirizzi a
// blocchi (丁目・番・号) è molto più affidabile di Nominatim, che resta come
// riserva. Sono due servizi distinti anche nei guasti: se uno non risponde,
// l'altro può funzionare — l'esito va riportato per servizio, mai "geocoder
// giù" in blocco.
//
// I nomi in OSM possono contenere spazi anche in giapponese ("出町 ふたば"):
// qualunque confronto per nome qui passa da normalize() — NFKC, spazi
// collassati, minuscole — e comunque l'accettazione la decide il raggio in
// coordinate, mai l'uguaglianza del testo.
//
//   node scripts/check-lodging.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";

const UA = "TabiJapanGuide/1.0 (personal trip planner)";
const RADIUS_M = 300;

// Solo dati pubblici: gli indirizzi degli hotel come esercizi commerciali.
// `blocco` è il quartiere/machi che DEVE comparire nel risultato del geocoder:
// GSI, quando non risolve l'indirizzo, ripiega in silenzio sul centroide della
// città (a Nagano lo faceva: 537 m di errore spacciati per risposta) — un
// risultato senza il machi giusto va trattato come mancato, non come buono.
const ADDRESSES = {
  osaka: { ja: "大阪市北区豊崎3-12-10", romaji: "3-12-10 Toyosaki, Kita-ku, Osaka", blocco: "豊崎" },
  hiroshima: { ja: "広島市中区流川町7-10", romaji: "7-10 Nagarekawacho, Naka-ku, Hiroshima", blocco: "流川町" },
  kyoto: { ja: "京都市中京区西ノ京職司町22-7", romaji: "22-7 Nishinokyo Shokushicho, Nakagyo-ku, Kyoto", blocco: "職司町" },
  kanazawa: { ja: "金沢市広岡3丁目2-37", romaji: "3-2-37 Hirooka, Kanazawa", blocco: "広岡" },
  takayama: { ja: "高山市初田町2丁目51", romaji: "2-51 Hatsudamachi, Takayama", blocco: "初田町" },
  nagano: { ja: "長野市問御所町1221", romaji: "1221 Toigosho-machi, Nagano", blocco: "問御所町", nomeJa: "ホテルJALシティ長野" },
  tokyo: { ja: "台東区浅草2丁目12-4", romaji: "2-12-4 Asakusa, Taito-ku, Tokyo", blocco: "浅草" }
};

const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync(new URL("../assets/map-data.js", import.meta.url), "utf8"), context);
const hotels = context.window.JAPAN_MAP_DATA.points.filter(function (point) { return point.type === "hotel"; });

function metersBetween(a, b) {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function normalize(text) {
  return (text || "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

const wait = (ms) => new Promise(function (resolve) { setTimeout(resolve, ms); });

// Geocoder nazionale giapponese (GSI): capisce gli indirizzi a blocchi.
async function searchGsi(query) {
  const url = "https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + encodeURIComponent(query);
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error("GSI HTTP " + response.status);
  const found = await response.json();
  return (found || []).map(function (entry) {
    return {
      lat: entry.geometry.coordinates[1],
      lng: entry.geometry.coordinates[0],
      label: entry.properties && entry.properties.title || ""
    };
  });
}

async function searchNominatim(query) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=jp&q=" + encodeURIComponent(query);
  const response = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ja,en" } });
  if (!response.ok) throw new Error("Nominatim HTTP " + response.status);
  const found = await response.json();
  return (found || []).map(function (entry) {
    return { lat: Number(entry.lat), lng: Number(entry.lon), label: entry.display_name.split(",")[0] };
  });
}

let failures = 0;
const suggestions = [];

for (const hotel of hotels) {
  const address = ADDRESSES[hotel.city];
  if (!address) {
    console.log("??  " + hotel.city.padEnd(10) + "manca l'indirizzo in questo script");
    failures += 1;
    continue;
  }
  let hit = null;
  let via = "";
  try {
    const fromGsi = await searchGsi(address.ja);
    const resolved = fromGsi.find(function (entry) { return normalize(entry.label).includes(normalize(address.blocco)); });
    if (resolved) { hit = resolved; via = "GSI"; }
    else if (fromGsi.length) console.log("  · GSI ha risposto senza il blocco «" + address.blocco + "» (" + fromGsi[0].label + "): scartato");
  } catch (error) {
    console.error("  ! GSI: " + error.message);
  }
  await wait(300);
  if (!hit) {
    // Riserva: prima l'indirizzo romaji, poi il nome dell'hotel. Il confronto
    // col nome serve solo a scegliere il candidato, la verità resta il raggio.
    for (const attempt of [address.romaji + ", Japan", address.nomeJa, hotel.name + " Japan"].filter(Boolean)) {
      try {
        const found = await searchNominatim(attempt);
        const wanted = normalize(hotel.name);
        const preferred = found.find(function (entry) { return normalize(entry.label).includes(wanted) || wanted.includes(normalize(entry.label)); });
        if (found.length) { hit = preferred || found[0]; via = "Nominatim (" + attempt + ")"; break; }
      } catch (error) {
        console.error("  ! Nominatim: " + error.message);
      } finally {
        await wait(1100);
      }
    }
  }
  if (!hit) {
    console.log("NO  " + hotel.city.padEnd(10) + hotel.name.padEnd(40) + "nessun geocoder ha risolto l'indirizzo");
    failures += 1;
    continue;
  }
  const away = metersBetween(hit, hotel);
  const ok = away <= RADIUS_M;
  if (!ok) {
    failures += 1;
    suggestions.push(hotel.city + ': "lat": ' + hit.lat.toFixed(5) + ', "lng": ' + hit.lng.toFixed(5));
  }
  console.log((ok ? "OK  " : "NO  ") + hotel.city.padEnd(10) + hotel.name.padEnd(40)
    + Math.round(away) + " m dall'indirizzo (" + via + ": " + hit.label + ")"
    + (ok ? "" : "  ← OLTRE " + RADIUS_M + " m"));
}

if (failures) {
  console.log("\n" + failures + " hotel fuori posto o non verificabili.");
  if (suggestions.length) console.log("Coordinate suggerite (dall'indirizzo del voucher):\n" + suggestions.join("\n"));
  process.exit(1);
}
console.log("\nTutti i " + hotels.length + " hotel cadono entro " + RADIUS_M + " m dal loro indirizzo.");
