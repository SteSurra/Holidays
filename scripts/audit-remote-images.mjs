import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = { window: {} };
vm.createContext(context);
// Anche attività e negozianti: le loro query immagine non venivano mai
// verificate, ed erano proprio le schede con i soggetti più difficili.
for (const file of ["assets/parse-lib.js", "assets/data.js", "assets/food-data.js", "assets/shopping-data.js", "assets/food-extra-data.js", "assets/map-data.js", "assets/merchants-data.js", "assets/experiences-data.js", "assets/curated-images-data.js"]) {
  if (!existsSync(new URL(file, root))) continue; // il file curato nasce da refresh-curated-images.mjs
  vm.runInContext(readFileSync(new URL(file, root), "utf8"), context, { filename: file });
}

const data = context.window.JAPAN_DATA;
const curatedMap = context.window.TABI_CURATED_IMAGES || {};
// I punti mappa senza scheda risolvono con l'id sintetico di map.js: la
// verifica deve guardare lo stesso posto in cui guarderà il telefono.
const soloMapPoints = ((context.window.JAPAN_MAP_DATA && context.window.JAPAN_MAP_DATA.points) || [])
  .filter((point) => !point.guideId && point.name)
  .map((point) => ({ id: "map-image-" + point.id, name: point.name, jp: "", imageQuery: "", city: point.city, type: point.type === "tabelog" ? "food" : "place" }));
const typeArg = process.argv.find((arg) => arg.startsWith("--type="))?.split("=")[1] || "all";
const limitArg = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 0);
const offsetArg = Number(process.argv.find((arg) => arg.startsWith("--offset="))?.split("=")[1] || 0);
const workersArg = Number(process.argv.find((arg) => arg.startsWith("--workers="))?.split("=")[1] || 1);
const collectionsByType = {
  place: [data.places || []],
  food: [data.foods],
  shop: [data.shopping],
  experience: [data.experiences || []],
  merchant: [data.merchants || []],
  mappoint: [soloMapPoints],
  all: [data.places || [], data.foods, data.shopping, data.experiences || [], data.merchants || [], soloMapPoints]
};
const collections = collectionsByType[typeArg] || collectionsByType.all;
let items = collections.flat().slice(Math.max(offsetArg, 0));
if (limitArg > 0) items = items.slice(0, limitArg);

function cityName(id) {
  return data.cities.find((city) => city.id === id)?.name || "Japan";
}

function queriesFor(item) {
  const hint = item.type === "food" ? "Japanese food" : "Japan product";
  return [item.imageQuery, item.name + " " + cityName(item.city) + " Japan", item.jp + " " + item.name, item.name + " " + hint]
    .map((query) => String(query || "").trim())
    .filter((query, index, values) => query && values.indexOf(query) === index)
    .slice(0, 4);
}

function usableImage(info, title) {
  if (!info || !(info.thumburl || info.url)) return false;
  if (info.mime && !/^image\/(jpeg|png|webp)$/i.test(info.mime)) return false;
  if (info.width && info.height && (info.width < 360 || info.height < 240)) return false;
  return !/(^|\b)(logo|location map|map of|flag of|diagram|pictogram|icon)(\b|$)/i.test(title || "");
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let nextRequestAt = 0;

async function fetchWithBackoff(url, options = {}) {
  let lastResponse = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const queueDelay = Math.max(0, nextRequestAt - Date.now());
    if (queueDelay) await wait(queueDelay);
    nextRequestAt = Date.now() + 550;
    lastResponse = await fetch(url, {
      ...options,
      headers: { "User-Agent": "TabiTravelGuideImageAudit/1.0 (public static site image verification)" },
      signal: AbortSignal.timeout(15000)
    });
    if (lastResponse.status === 429 || lastResponse.status < 500) return lastResponse;
    const retryAfter = Number(lastResponse.headers.get("Retry-After")) * 1000;
    await wait(Math.min(10000, Math.max(retryAfter || 0, 1800 * (attempt + 1))));
  }
  return lastResponse;
}

async function searchCommons(query) {
  const params = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: query + " filetype:bitmap", gsrnamespace: "6",
    gsrlimit: "8", prop: "imageinfo", iiprop: "url|mime|size", iiurlwidth: "900", format: "json", origin: "*"
  });
  const response = await fetchWithBackoff("https://commons.wikimedia.org/w/api.php?" + params);
  if (!response?.ok) return false;
  const payload = await response.json();
  return Object.values(payload.query?.pages || {}).some((page) => usableImage(page.imageinfo?.[0], page.title));
}

async function searchOpenverse(query) {
  const params = new URLSearchParams({ q: query, page_size: "10", category: "photograph", mature: "false" });
  const response = await fetchWithBackoff("https://api.openverse.org/v1/images/?" + params);
  if (!response?.ok) return false;
  const payload = await response.json();
  return (payload.results || []).some((image) => !image.mature && (image.thumbnail || image.url));
}

async function searchWikipedia(query, language) {
  const params = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: query, gsrlimit: "8",
    prop: "pageimages", piprop: "thumbnail", pithumbsize: "900", format: "json", origin: "*"
  });
  const response = await fetchWithBackoff(`https://${language}.wikipedia.org/w/api.php?${params}`);
  if (!response?.ok) return false;
  const payload = await response.json();
  const ignoredWords = new Set(["japan", "japanese", "food", "dish", "product"]);
  const queryWords = query.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter((word) => word.length >= 3 && !ignoredWords.has(word));
  return Object.values(payload.query?.pages || {}).some((page) => {
    const titleWords = String(page.title || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/);
    const matches = queryWords.filter((word) => titleWords.includes(word)).length;
    const relevant = queryWords.length < 2 || matches >= 2 || (page.index === 1 && matches >= 1);
    return relevant && page.thumbnail?.source && (!page.thumbnail.width || page.thumbnail.width >= 360)
      && !/(disambiguation|曖昧さ回避)/i.test(page.title || "");
  });
}

function stableHash(value) {
  return Array.from(String(value || "")).reduce((hash, character) => {
    return ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  }, 0);
}

function providersFor(item) {
  const providers = [
    ["Wikimedia Commons", searchCommons],
    ["Openverse", searchOpenverse],
    ["Wikipedia JA", (query) => searchWikipedia(query, "ja")],
    ["Wikipedia EN", (query) => searchWikipedia(query, "en")]
  ];
  const offset = Math.abs(stableHash(item.id)) % providers.length;
  return providers.slice(offset).concat(providers.slice(0, offset));
}

async function audit(item) {
  const queries = queriesFor(item);
  try {
    // Un URL curato (nel data file o nella mappa centrale) è una promessa
    // fatta alla scheda: se è rotto deve fallire l'audit, non ripiegare in
    // silenzio sulla ricerca live.
    const curated = curatedMap[item.id];
    const directUrl = item.imageUrl || (curated ? "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + curated[0] + "?width=960" : "");
    if (directUrl) {
      const response = await fetchWithBackoff(directUrl, { method: "HEAD" });
      if (response?.ok && /^image\//i.test(response.headers.get("Content-Type") || "")) {
        return { item, provider: "Curated URL", query: directUrl };
      }
      return { item, error: `URL curato rotto (HTTP ${response?.status})` };
    }
    for (const [provider, search] of providersFor(item)) {
      for (const query of queries.slice(0, 2)) {
        if (await search(query)) return { item, provider, query, uncurated: true };
      }
    }
  } catch (error) {
    return { item, error: error.message };
  }
  return { item };
}

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < items.length) {
    const index = cursor++;
    results[index] = await audit(items[index]);
    await wait(180);
  }
}
await Promise.all(Array.from({ length: Math.max(1, Math.min(workersArg, 4)) }, worker));

const resolved = results.filter((result) => result.provider);
const unresolved = results.filter((result) => !result.provider);
const providers = resolved.reduce((groups, result) => {
  (groups[result.provider] ||= []).push(result);
  return groups;
}, {});
console.log(`Resolved ${resolved.length}/${results.length} (${Math.round((resolved.length / Math.max(results.length, 1)) * 100)}%).`);
for (const [provider, matches] of Object.entries(providers)) console.log(`- ${provider}: ${matches.length}`);
const uncurated = resolved.filter((result) => result.uncurated);
if (uncurated.length) {
  console.log(`Senza curazione, affidati alla ricerca live (${uncurated.length}):`);
  for (const result of uncurated) console.log(`- ${result.item.id}: ${result.item.name}`);
}
if (unresolved.length) {
  console.log("Unresolved:");
  for (const result of unresolved) console.log(`- ${result.item.id}: ${result.item.name}${result.error ? ` (${result.error})` : ""}`);
  process.exitCode = 1;
}
