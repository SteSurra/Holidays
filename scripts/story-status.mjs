#!/usr/bin/env node
// Coverage report: how many catalog items have a handwritten story, by domain.
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
const stories = context.window.TABI_STORIES || {};
const domains = {
  place: [...data.places, ...(data.mapPlaces || [])],
  experience: data.experiences,
  history: data.history,
  food: data.foods,
  shopping: data.shopping
};

const showMissing = process.argv.includes("--missing");
const only = process.argv.find((a) => a.startsWith("--domain="))?.slice("--domain=".length);

console.log("Story coverage\n");
for (const [name, items] of Object.entries(domains)) {
  if (only && only !== name) continue;
  const missing = items.filter((item) => !stories[item.id]).map((item) => item.id);
  const covered = items.length - missing.length;
  const pct = items.length ? Math.round((100 * covered) / items.length) : 100;
  const flag = pct === 100 ? "COMPLETE" : "open";
  console.log(`${name.padEnd(12)} ${String(covered).padStart(4)}/${String(items.length).padEnd(4)}  ${String(pct).padStart(3)}%  ${flag}`);
  if (showMissing && missing.length) {
    for (const id of missing) console.log(`  - ${id}`);
  }
}

const catalogIds = new Set(Object.values(domains).flat().map((i) => i.id));
const orphans = Object.keys(stories).filter((id) => !catalogIds.has(id));
const mapOrphans = orphans.filter((id) => id.startsWith("guide-map-visit-"));
const otherOrphans = orphans.filter((id) => !id.startsWith("guide-map-visit-"));
console.log(`\nstories total: ${Object.keys(stories).length}`);
console.log(`map-visit stories (enrichMapPoints): ${mapOrphans.length}`);
if (otherOrphans.length) {
  console.log(`orphan story ids (no catalog row): ${otherOrphans.length}`);
  if (showMissing) for (const id of otherOrphans) console.log(`  - ${id}`);
}
