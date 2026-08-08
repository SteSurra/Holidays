#!/usr/bin/env node
/**
 * Rebuild story-work/admission-ledger.md from live place/experience catalogs.
 * Does not invent free|paid|mixed — every row starts pending for research.
 *
 * Usage: node scripts/dump-admission-ledger.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
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
const cityName = Object.fromEntries(data.cities.map((city) => [city.id, city.name]));

const BATCHES = [
  { step: "C1", title: "Tokyo", cities: ["tokyo"] },
  { step: "C2", title: "Kamakura + Hakone", cities: ["kamakura", "hakone"] },
  { step: "C3", title: "Matsumoto + Nagano + Shirakawa-go + Takayama", cities: ["matsumoto", "nagano", "shirakawago", "takayama"] },
  { step: "C4", title: "Kanazawa", cities: ["kanazawa"] },
  { step: "C5", title: "Kyoto", cities: ["kyoto"] },
  { step: "C6", title: "Nara + Osaka", cities: ["nara", "osaka"] },
  { step: "C7", title: "Hiroshima + Miyajima", cities: ["hiroshima", "miyajima"] }
];

const covered = new Set(BATCHES.flatMap((batch) => batch.cities));
const leftovers = [...new Set([...data.places, ...data.experiences].map((item) => item.city))]
  .filter((city) => city !== "all" && !covered.has(city));
if (leftovers.length) {
  console.error("Cities not in admission batches:", leftovers.join(", "));
  process.exit(1);
}

function statusOf(item) {
  return item.admission ? "verified" : "pending";
}

function proposedOf(item) {
  return item.admission || "";
}

function rowsFor(cities, type) {
  const catalog = type === "place" ? data.places : data.experiences;
  return catalog
    .filter((item) => cities.includes(item.city))
    .slice()
    .sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name, "it"));
}

function table(items) {
  const header = "| id | city | name | proposed | evidence | sourceTitle | sourceUrl | checkedAt | status |";
  const sep = "|---|---|---|---|---|---|---|---|---|";
  const body = items.map((item) => {
    return `| ${item.id} | ${cityName[item.city] || item.city} | ${item.name.replace(/\|/g, "/")} | ${proposedOf(item)} |  |  |  |  | ${statusOf(item)} |`;
  });
  return [header, sep, ...body].join("\n");
}

const lines = [];
lines.push("# Admission research ledger");
lines.push("");
lines.push("Verified access class for places and experiences (`free` | `paid` | `mixed`).");
lines.push("Never record yen or price bands here or in the published data.");
lines.push("");
lines.push("## Rules");
lines.push("");
lines.push("- **free** — the main visit in the guide needs no ticket (voluntary offerings / goshuin do not count as paid).");
lines.push("- **paid** — the main visit needs a ticket or mandatory fee (including a “symbolic” mandatory fee).");
lines.push("- **mixed** — typically free part + typically paid part at the same place (precinct + garden/museum). Shows under both Solo gratis and Solo a pagamento.");
lines.push("- **pending** — leave `admission` unset in data files; the UI filter must not claim free/paid.");
lines.push("- **No yen** — evidence may quote access wording, never amounts.");
lines.push("- **Source priority** — (1) official venue / operator, (2) municipal / prefectural / JNTO tourism, (3) third-party guides only as a lead, never sole proof.");
lines.push("- **Forbidden as sole proof** — tip/booking prose already in the guide, Wikimedia, category defaults (“shrines are free”).");
lines.push("- **Date note** — do not use ISO `YYYY-MM-DD` in this tree; prefer `YYYY-MM` or prose months for `checkedAt`.");
lines.push("- **When unsure** — keep pending; prefer paid over guessing free if the only ambiguity is a seasonal free window on an otherwise ticketed visit.");
lines.push("");
lines.push("Regenerate scaffold (preserves nothing — edit this file by hand after research, or re-dump only before filling):");
lines.push("`node scripts/dump-admission-ledger.mjs`");
lines.push("");

let total = 0;
let pending = 0;
for (const batch of BATCHES) {
  const places = rowsFor(batch.cities, "place");
  const experiences = rowsFor(batch.cities, "experience");
  total += places.length + experiences.length;
  pending += [...places, ...experiences].filter((item) => !item.admission).length;
  lines.push(`## ${batch.step} — ${batch.title}`);
  lines.push("");
  lines.push(`Cities: ${batch.cities.map((id) => cityName[id] || id).join(", ")}. Places: ${places.length}. Experiences: ${experiences.length}.`);
  lines.push("");
  lines.push("### Places");
  lines.push("");
  lines.push(places.length ? table(places) : "_No places in this batch._");
  lines.push("");
  lines.push("### Experiences");
  lines.push("");
  lines.push(experiences.length ? table(experiences) : "_No experiences in this batch._");
  lines.push("");
}

lines.push("## Progress");
lines.push("");
lines.push(`Total place + experience rows: ${total}. Pending (no verified admission in data): ${pending}.`);
lines.push("");

const out = "story-work/admission-ledger.md";
writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${out}: ${total} rows, ${pending} pending.`);
