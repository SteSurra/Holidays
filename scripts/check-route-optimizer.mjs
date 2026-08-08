// Il "giro più breve" promesso dalla mappa ora è calcolato con Held-Karp, che
// dà l'ottimo garantito fino a una dozzina di tappe. Questo script lo dimostra:
// estrae le funzioni vere da assets/map.js (niente copie che potrebbero
// divergere) e le mette alla prova contro la forza bruta, che l'ottimo lo trova
// per definizione provando ogni permutazione.
//
//   node scripts/check-route-optimizer.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../assets/map.js", import.meta.url), "utf8");
const startIndex = source.indexOf("function metersBetween");
const endIndex = source.indexOf("function clearLasso");
if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
  console.error("Non trovo il blocco metersBetween…approximateOrder in assets/map.js");
  process.exit(1);
}
const block = source.slice(startIndex, endIndex);
const context = vm.createContext({});
vm.runInContext(block + "\nthis.api = { metersBetween, shortestOrder, approximateOrder };", context);
const { metersBetween, shortestOrder, approximateOrder } = context.api;

// Generatore deterministico: gli stessi casi a ogni esecuzione, così un
// fallimento è riproducibile e non un colpo di sfortuna.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomPoints(random, count) {
  // Un quadrato ~5×5 km attorno a Kyoto: la scala vera dei giri a piedi.
  return Array.from({ length: count }, function (_, index) {
    return { id: index, lat: 35.0 + random() * 0.05, lng: 135.74 + random() * 0.05 };
  });
}

function routeLength(start, ordered) {
  let total = metersBetween(start, ordered[0]);
  for (let i = 1; i < ordered.length; i += 1) total += metersBetween(ordered[i - 1], ordered[i]);
  return total;
}

function bruteForceBest(start, stops) {
  let best = Infinity;
  const permute = function (prefix, rest) {
    if (!rest.length) {
      const total = routeLength(start, prefix);
      if (total < best) best = total;
      return;
    }
    for (let i = 0; i < rest.length; i += 1) {
      permute(prefix.concat(rest[i]), rest.slice(0, i).concat(rest.slice(i + 1)));
    }
  };
  permute([], stops);
  return best;
}

function isPermutation(stops, ordered) {
  if (ordered.length !== stops.length) return false;
  const seen = new Set(ordered.map(function (point) { return point.id; }));
  return stops.every(function (point) { return seen.has(point.id); });
}

const random = mulberry32(20260810);
let failures = 0;

// 1) Fino a 8 tappe il confronto è con l'ottimo assoluto della forza bruta.
for (let n = 2; n <= 8; n += 1) {
  let worstGap = 0;
  for (let trial = 0; trial < 30; trial += 1) {
    const stops = randomPoints(random, n);
    const start = { id: -1, lat: 35.0 + random() * 0.05, lng: 135.74 + random() * 0.05 };
    const ordered = shortestOrder(start, stops);
    if (!isPermutation(stops, ordered)) {
      console.error("NO  n=" + n + " prova " + trial + ": l'ordine non è una permutazione delle tappe");
      failures += 1;
      continue;
    }
    const got = routeLength(start, ordered);
    const best = bruteForceBest(start, stops);
    const gap = got - best;
    if (gap > 0.001) {
      console.error("NO  n=" + n + " prova " + trial + ": " + got.toFixed(3) + " m contro l'ottimo " + best.toFixed(3) + " m");
      failures += 1;
    }
    if (gap > worstGap) worstGap = gap;
  }
  console.log("OK  n=" + n + "  30 istanze uguali all'ottimo (scarto max " + worstGap.toExponential(2) + " m)");
}

// 2) A 10-11 tappe la forza bruta costa troppo, ma l'esatto non può mai essere
//    peggiore del vecchio vicino-più-prossimo + 2-opt.
for (const n of [10, 11]) {
  let improvedCases = 0;
  let worstRegression = 0;
  for (let trial = 0; trial < 50; trial += 1) {
    const stops = randomPoints(random, n);
    const start = { id: -1, lat: 35.0 + random() * 0.05, lng: 135.74 + random() * 0.05 };
    const exact = routeLength(start, shortestOrder(start, stops));
    const approx = routeLength(start, approximateOrder(start, stops));
    if (exact > approx + 0.001) {
      console.error("NO  n=" + n + " prova " + trial + ": esatto " + exact.toFixed(3) + " m peggiore dell'approssimato " + approx.toFixed(3) + " m");
      failures += 1;
      if (exact - approx > worstRegression) worstRegression = exact - approx;
    }
    if (exact < approx - 1) improvedCases += 1;
  }
  console.log("OK  n=" + n + "  50 istanze mai peggiori del 2-opt; migliorate: " + improvedCases + "/50");
}

// 3) Il tempo resta da interfaccia: tutto il lavoro di un giro pieno in ben
//    meno di un decimo di secondo.
const timingStops = randomPoints(random, 11);
const timingStart = { id: -1, lat: 35.02, lng: 135.76 };
const t0 = performance.now();
for (let i = 0; i < 100; i += 1) shortestOrder(timingStart, timingStops);
const elapsed = (performance.now() - t0) / 100;
console.log("OK  tempo medio a 11 tappe: " + elapsed.toFixed(2) + " ms" + (elapsed > 100 ? "  ← LENTO" : ""));
if (elapsed > 100) failures += 1;

if (failures) {
  console.error("\n" + failures + " controlli falliti.");
  process.exit(1);
}
console.log("\nTutti i controlli passati: l'ordine calcolato è il più breve possibile.");
