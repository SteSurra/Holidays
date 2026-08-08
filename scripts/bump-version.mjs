#!/usr/bin/env node
// Un rilascio è: nuovo token ?v= dappertutto e nuova cache del service worker.
// A mano erano quattro punti da tenere allineati (index.html, VERSION e CACHE
// in sw.js, la registrazione in app.js): dimenticarne uno significa telefoni
// che servono file vecchi da cache nuove. Qui è un comando solo.
//
//   node scripts/bump-version.mjs            → token di oggi, lettera successiva
//   node scripts/bump-version.mjs 20260812c  → token esplicito
import { readFileSync, writeFileSync } from "node:fs";

const INDEX = "index.html";
const SW = "sw.js";
const APP = "assets/app.js";

const indexSrc = readFileSync(INDEX, "utf8");
const tokens = new Set(Array.from(indexSrc.matchAll(/\?v=([0-9a-z]+)/g), (m) => m[1]));
if (tokens.size !== 1) {
  console.error("index.html deve avere un solo token ?v=, trovati:", Array.from(tokens).join(", "));
  process.exit(1);
}
const current = Array.from(tokens)[0];

function nextToken() {
  const explicit = process.argv[2];
  if (explicit) return explicit;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (current.startsWith(today)) {
    const letter = current.slice(8) || "a";
    return today + String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return today + "a";
}

const next = nextToken();
if (next === current) {
  console.error("Il token nuovo è uguale al vecchio (" + current + "): niente da fare.");
  process.exit(1);
}

let swSrc = readFileSync(SW, "utf8");
const cacheMatch = swSrc.match(/const CACHE = "tabi-japan-v(\d+)"/);
if (!cacheMatch) {
  console.error("Non trovo la costante CACHE in sw.js.");
  process.exit(1);
}
const nextCache = Number(cacheMatch[1]) + 1;

writeFileSync(INDEX, indexSrc.split("?v=" + current).join("?v=" + next));
swSrc = swSrc
  .split("?v=" + current).join("?v=" + next)
  .replace(/const CACHE = "tabi-japan-v\d+"/, 'const CACHE = "tabi-japan-v' + nextCache + '"');
writeFileSync(SW, swSrc);
const appSrc = readFileSync(APP, "utf8");
writeFileSync(APP, appSrc.split("sw.js?v=" + current).join("sw.js?v=" + next));

console.log("Token: " + current + " → " + next + " · cache: tabi-japan-v" + nextCache);
console.log("Ora: node scripts/check-guide-integrity.mjs per la conferma.");
