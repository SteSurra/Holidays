// Genera una pagina HTML locale (fuori dal repo) per la revisione visiva
// delle immagini curate: per ogni voce mostra la scelta e le alternative
// (lead en/ja/it, Wikidata P18, candidati della ricerca), con lo snippet di
// override pronto da copiare in scripts/image-overrides.json. La pagina è
// solo uno strumento di lavoro: non viene servita né committata.
//
// Uso:
//   node scripts/build-image-review.mjs [--state=path] [--out=path]
//     [--type=place|experience|merchant|food|shop|mappoint|all] [--only=scored]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || fallback;
const statePath = arg("state", join(tmpdir(), "tabi-image-refresh-state.json"));
const outPath = arg("out", join(tmpdir(), "tabi-image-review.html"));
const typeArg = arg("type", "all");
const onlyArg = arg("only", "");
// --compact: solo la scelta, in griglia fitta — per scorrere centinaia di
// voci a colpo d'occhio; la pagina piena resta per decidere le correzioni.
const compactMode = process.argv.includes("--compact");

if (!existsSync(statePath)) {
  console.error(`Nessuno stato in ${statePath}: eseguire prima refresh-curated-images.mjs`);
  process.exit(1);
}
const state = JSON.parse(readFileSync(statePath, "utf8"));

const thumb = (file, width) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(String(file || "").replace(/^File:/, ""))}?width=${width || 360}`;
const esc = (value) => String(value || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const entries = Object.entries(state)
  .filter(([, entry]) => entry.done && !entry.aliasOf)
  .filter(([, entry]) => typeArg === "all" || entry.type === typeArg || (typeArg === "mappoint" && entry.type === "mappoint"))
  .filter(([, entry]) => !onlyArg || (onlyArg === "scored" && entry.provider === "commons-scored"))
  .sort((a, b) => (a[1].type || "").localeCompare(b[1].type || "") || a[0].localeCompare(b[0]));

function alternatesFor(entry) {
  const seen = new Set([entry.pick && entry.pick.file].filter(Boolean));
  const list = [];
  const push = (label, file) => {
    if (!file || seen.has(file)) return;
    seen.add(file);
    list.push({ label, file });
  };
  const alt = entry.alternates || {};
  if (alt.en) push(`lead en · ${alt.en.title}`, alt.en.lead);
  if (alt.ja) push(`lead ja · ${alt.ja.title}`, alt.ja.lead);
  if (alt.it) push(`lead it · ${alt.it.title}`, alt.it.lead);
  push("Wikidata P18", alt.p18);
  for (const file of alt.search || []) push("ricerca", file);
  return list;
}

const cards = compactMode ? entries.map(([id, entry]) => {
  const pick = entry.pick;
  if (!pick || !pick.file) return `<figure class="cell none"><figcaption>${esc(entry.name)}<br>— nessuna scelta —</figcaption></figure>`;
  return `<figure class="cell"><img loading="lazy" src="${esc(thumb(pick.file, 300))}" alt=""><figcaption><strong>${esc(entry.name)}</strong><br>${esc(id)}</figcaption></figure>`;
}).join("\n") : entries.map(([id, entry]) => {
  const pick = entry.pick;
  const alternates = alternatesFor(entry);
  const chosen = pick && pick.file
    ? `<figure class="chosen"><img loading="lazy" src="${esc(thumb(pick.file, 480))}" alt=""><figcaption>${esc(entry.provider)} · ${esc(pick.file)}</figcaption></figure>`
    : `<p class="none">Nessuna curazione — fallback runtime</p>`;
  const altHtml = alternates.map((a) =>
    `<figure><img loading="lazy" src="${esc(thumb(a.file, 240))}" alt=""><figcaption>${esc(a.label)}</figcaption>` +
    `<code>&quot;${esc(id)}&quot;: {&quot;file&quot;: ${esc(JSON.stringify(a.file))}, &quot;sourceUrl&quot;: &quot;https://commons.wikimedia.org/wiki/File:${esc(encodeURIComponent(a.file.replace(/ /g, "_")))}&quot;, &quot;credit&quot;: &quot;Wikimedia Commons&quot;}</code></figure>`
  ).join("");
  return `<article id="${esc(id)}">
    <h3>${esc(entry.name)} <small>${esc(id)} · ${esc(entry.type)}${entry.query ? " · “" + esc(entry.query) + "”" : ""}</small></h3>
    ${chosen}
    ${altHtml ? `<div class="alts">${altHtml}</div>` : ""}
    <code class="null">&quot;${esc(id)}&quot;: null</code>
  </article>`;
}).join("\n");

const withPick = entries.filter(([, entry]) => entry.pick && entry.pick.file).length;
const html = `<!doctype html><meta charset="utf-8">
<title>Revisione immagini Tabi</title>
<style>
  body { font: 14px/1.4 system-ui; margin: 16px; background: #14181c; color: #e8e8e4; }
  article { border: 1px solid #2c343a; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; }
  h3 { margin: 0 0 8px; font-size: 15px; } h3 small { color: #9aa6ad; font-weight: normal; }
  figure { display: inline-block; vertical-align: top; margin: 0 10px 8px 0; max-width: 480px; }
  figure img { max-width: 100%; border-radius: 8px; display: block; background: #000; min-height: 40px; }
  figcaption { font-size: 11px; color: #9aa6ad; margin-top: 2px; max-width: 480px; }
  .alts figure { max-width: 240px; } .alts figcaption { max-width: 240px; }
  code { display: block; font-size: 10px; color: #7f8b93; margin-top: 2px; max-width: 240px; overflow-wrap: anywhere; }
  code.null { color: #5c676e; max-width: none; }
  .none { color: #d9a05b; }
  header { position: sticky; top: 0; background: #14181cee; padding: 8px 0; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .cell { margin: 0; max-width: none; }
  .cell img { width: 100%; height: 150px; object-fit: cover; }
  .cell figcaption { font-size: 11px; max-width: none; }
  .cell.none { display: grid; place-items: center; min-height: 150px; border: 1px dashed #4a5258; border-radius: 8px; }
</style>
<header><strong>${withPick}</strong> curate su ${entries.length} voci — stato: ${esc(statePath)}</header>
${compactMode ? `<div class="grid">${cards}</div>` : cards}`;

writeFileSync(outPath, html);
console.log(`Scritte ${entries.length} voci (${withPick} con scelta) in ${outPath}`);
