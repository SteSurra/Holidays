#!/usr/bin/env node
// Merge story-work/batches/**/*.json into assets/story-data.js.
// Existing handwritten cards are preserved via 00-seed-existing.json (and as a
// safety net by reading the current TABI_STORIES before overlay). Compute all
// in memory, validate, then write once — never leave a half-written corpus.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BATCH_DIR = join(ROOT, "story-work", "batches");
const OUT = join(ROOT, "assets", "story-data.js");
const MIN_LONG = 400;
const MIN_SECTIONS = 3;
const MIN_SOURCES = 2;
const MIN_SENTENCE = 90;

function walkJson(dir) {
  const out = [];
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...walkJson(path));
    else if (name.endsWith(".json")) out.push(path);
  }
  return out;
}

function loadExistingStories() {
  try {
    const context = vm.createContext({ window: {}, console });
    vm.runInContext(readFileSync(OUT, "utf8"), context, { filename: OUT });
    return { ...(context.window.TABI_STORIES || {}) };
  } catch {
    return {};
  }
}

function validateStory(id, story, failures) {
  if (!story || typeof story !== "object") {
    failures.push(`${id}: not an object`);
    return;
  }
  if (!story.long || typeof story.long !== "string" || story.long.length < MIN_LONG) {
    failures.push(`${id}: long under ${MIN_LONG} characters`);
  }
  if (!Array.isArray(story.sections) || story.sections.length < MIN_SECTIONS) {
    failures.push(`${id}: fewer than ${MIN_SECTIONS} sections`);
  }
  if (!(story.sections || []).some((s) => s && s.fun)) {
    failures.push(`${id}: missing fun section`);
  }
  for (const [i, section] of (story.sections || []).entries()) {
    if (!section?.title || !section?.body) failures.push(`${id}: section ${i} missing title/body`);
  }
  if (!Array.isArray(story.sources) || story.sources.length < MIN_SOURCES) {
    failures.push(`${id}: fewer than ${MIN_SOURCES} sources`);
  }
  for (const source of story.sources || []) {
    if (!source?.title || !/^https:\/\//.test(source.url || "")) {
      failures.push(`${id}: invalid source`);
    }
  }
}

function checkSentenceOverlap(stories) {
  const failures = [];
  const sentenceOwner = new Map();
  for (const [id, story] of Object.entries(stories)) {
    const text = [story.long || ""]
      .concat((story.sections || []).map((s) => s.body || ""))
      .join(" ");
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const clean = sentence.trim();
      if (clean.length < MIN_SENTENCE) continue;
      const owner = sentenceOwner.get(clean);
      if (owner && owner !== id) {
        failures.push(`${id}: shares a whole sentence with ${owner}`);
      } else {
        sentenceOwner.set(clean, id);
      }
    }
  }
  return failures;
}

function serializeStories(stories) {
  const ids = Object.keys(stories).sort();
  const body = ids
    .map((id) => {
      const story = stories[id];
      const json = JSON.stringify(
        {
          long: story.long,
          sections: story.sections,
          sources: story.sources
        },
        null,
        2
      );
      // Indent object under the key the same way as the handwritten file.
      const indented = json
        .split("\n")
        .map((line, i) => (i === 0 ? line : "    " + line))
        .join("\n");
      return `    ${JSON.stringify(id)}: ${indented}`;
    })
    .join(",\n\n");

  return `(function () {
  "use strict";

  // Le schede scritte una per una. Tutto il resto della guida costruisce i
  // testi lunghi assemblando modelli per categoria e per città: comodo per
  // partire, ma il risultato era che Kinkaku-ji e Ginkaku-ji condividevano
  // cinque frasi su otto, parola per parola. Un modello sa dire che cos'è un
  // tempio; non sa dire perché quel tempio è bruciato nel 1950.
  //
  // Qui dentro ogni voce è testo scritto per quel luogo e per nessun altro.
  // Chi c'è vince sul modello; chi non c'è resta al modello, che è comunque
  // meglio di una scheda vuota. Anche i titoli delle sezioni cambiano da
  // scheda a scheda: un formato fisso è la ripetizione che torna dalla porta
  // di servizio.
  //
  // Il file è generato: si modifica la fonte in story-work/batches/, non
  // questo. Regole: nessuna frase intera lunga condivisa, almeno due fonti
  // HTTPS, ≥3 sezioni con ≥1 nota semiseria, long ≥400 caratteri.
  // Ricostruire con: node scripts/build-stories.mjs
  const stories = {
${body}
  };

  window.TABI_STORIES = stories;
})();
`;
}

const failures = [];
const stories = loadExistingStories();
const baseCount = Object.keys(stories).length;

const batchFiles = walkJson(BATCH_DIR);
if (!batchFiles.length) {
  console.error("No batch JSON under story-work/batches/");
  process.exit(1);
}

let overlayCount = 0;
const seenBatchIds = new Map(); // id → first batch path (warn on multi-batch redefine)

for (const file of batchFiles) {
  let payload;
  try {
    payload = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    failures.push(`${relative(ROOT, file)}: invalid JSON (${err.message})`);
    continue;
  }
  const schede = payload.schede || payload.stories || [];
  if (!Array.isArray(schede) || !schede.length) {
    failures.push(`${relative(ROOT, file)}: empty schede array`);
    continue;
  }
  for (const entry of schede) {
    if (!entry?.id || typeof entry.id !== "string") {
      failures.push(`${relative(ROOT, file)}: entry without id`);
      continue;
    }
    const { id, ...rest } = entry;
    const story = {
      long: rest.long,
      sections: rest.sections,
      sources: rest.sources
    };
    validateStory(id, story, failures);
    if (seenBatchIds.has(id) && seenBatchIds.get(id) !== file) {
      // Allowed: later sorted path overlays earlier. Record only.
    }
    seenBatchIds.set(id, file);
    stories[id] = story;
    overlayCount += 1;
  }
}

failures.push(...checkSentenceOverlap(stories));

if (failures.length) {
  console.error(`build-stories failed with ${failures.length} error(s):`);
  for (const f of failures.slice(0, 80)) console.error(" -", f);
  if (failures.length > 80) console.error(` … and ${failures.length - 80} more`);
  process.exit(1);
}

const finalCount = Object.keys(stories).length;
if (baseCount && finalCount < baseCount) {
  console.error(
    `Refusing to write: merged corpus (${finalCount}) is smaller than existing story-data.js (${baseCount}). Batches must not wipe cards.`
  );
  process.exit(1);
}

writeFileSync(OUT, serializeStories(stories));
console.log(
  `Wrote ${OUT}: ${finalCount} stories (base ${baseCount}, batch entries applied ${overlayCount} from ${batchFiles.length} files).`
);
