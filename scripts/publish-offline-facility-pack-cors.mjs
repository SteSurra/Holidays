#!/usr/bin/env node
/**
 * Publish facilities-ampio.json.gz to orphan branch offline-facility-packs
 * (raw.githubusercontent.com, CORS-safe).
 *
 *   node scripts/publish-offline-facility-pack-cors.mjs --dry-run
 *   node scripts/publish-offline-facility-pack-cors.mjs
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PACK_DIR = path.join(ROOT, "tmp", "offline-packs");
const ARCHIVE = path.join(PACK_DIR, "facilities-ampio.json.gz");
const META = path.join(PACK_DIR, "facilities-ampio.meta.json");
const MANIFEST_PATH = path.join(ROOT, "assets", "offline-pack-manifest.js");
const BRANCH = "offline-facility-packs";
const PACK_KEY = "facilities_ampio";
const PACK_FILE = "facilities-ampio.json.gz";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

function die(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function run(cmd, argv, opts = {}) {
  console.log(`$ ${cmd} ${argv.join(" ")}`);
  const r = spawnSync(cmd, argv, {
    cwd: opts.cwd || ROOT,
    encoding: "utf8",
    stdio: opts.stdio || "pipe",
    maxBuffer: 32 * 1024 * 1024
  });
  if (r.status !== 0 && !opts.allowFail) {
    die((r.stderr || r.stdout || `${cmd} failed`).trim());
  }
  return r;
}

function repoSlug() {
  const r = run("git", ["remote", "get-url", "origin"]);
  const url = (r.stdout || "").trim();
  const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/i);
  if (!m) die(`Origin is not a GitHub URL: ${url}`);
  return m[1];
}

function originHttps() {
  const r = run("git", ["remote", "get-url", "origin"]);
  let url = (r.stdout || "").trim();
  const ssh = url.match(/^git@([^:]+):(.+)$/i);
  if (ssh) url = `https://${ssh[1]}/${ssh[2]}`;
  return url.replace(/\.git$/, "") + ".git";
}

function rawUrl(ownerRepo, sha, fileName) {
  return `https://raw.githubusercontent.com/${ownerRepo}/${sha}/${encodeURIComponent(fileName).replace(/%2F/g, "/")}`;
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { version: 2, packs: {} };
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(readFileSync(MANIFEST_PATH, "utf8"), context, { filename: "offline-pack-manifest.js" });
  return context.window.TABI_OFFLINE_MANIFEST || { version: 2, packs: {} };
}

function renderManifest(existing, ownerRepo, sha, bytes) {
  const packs = { ...(existing.packs || {}) };
  packs[PACK_KEY] = {
    file: PACK_FILE,
    bytes,
    url: rawUrl(ownerRepo, sha, PACK_FILE)
  };
  const order = ["ampio_z14", "ampio_z15", "max_z14", "max_z15", "photos_medio", PACK_KEY];
  const keys = [...order, ...Object.keys(packs)].filter((k, i, arr) => arr.indexOf(k) === i);
  const lines = [
    "// Offline pack URLs: CORS-safe raw.githubusercontent.com (map + photo + facility orphan branches).",
    "// GitHub Release assets lack Access-Control-Allow-Origin — do not use them for browser fetch.",
    "// bytes must match the published file; the app verifies size after download.",
    "window.TABI_OFFLINE_MANIFEST = {",
    `  version: ${existing.version || 2},`,
    `  releaseTag: ${JSON.stringify(existing.releaseTag || "offline-map-packs")},`,
    existing.contentSha ? `  contentSha: ${JSON.stringify(existing.contentSha)},` : null,
    existing.photoContentSha ? `  photoContentSha: ${JSON.stringify(existing.photoContentSha)},` : null,
    `  facilityContentSha: ${JSON.stringify(sha)},`,
    "  packs: {"
  ].filter((line) => line != null);
  for (const key of keys) {
    const pack = packs[key];
    if (!pack) continue;
    lines.push(`    ${key}: ${JSON.stringify(pack, null, 2).replace(/\n/g, "\n    ")},`);
  }
  lines.push("  }", "};", "");
  return lines.join("\n");
}

async function main() {
  if (!existsSync(ARCHIVE) || !existsSync(META)) {
    die(`Missing ${ARCHIVE} or ${META}. Run: node scripts/build-offline-facility-pack.mjs`);
  }
  const meta = JSON.parse(readFileSync(META, "utf8"));
  const bytes = statSync(ARCHIVE).size;
  if (bytes !== meta.bytes) die(`Byte mismatch: archive ${bytes} vs meta ${meta.bytes}`);

  const ownerRepo = repoSlug();
  const existing = loadManifest();
  const work = path.join(ROOT, "tmp", "offline-facility-packs-publish");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  run("git", ["init"], { cwd: work });
  const name = run("git", ["config", "user.name"], { allowFail: true }).stdout.trim();
  const email = run("git", ["config", "user.email"], { allowFail: true }).stdout.trim();
  if (name) run("git", ["config", "user.name", name], { cwd: work });
  if (email) run("git", ["config", "user.email", email], { cwd: work });
  run("git", ["remote", "add", "origin", originHttps()], { cwd: work });

  writeFileSync(
    path.join(work, "README.md"),
    [
      "# Tabi offline facility pack",
      "",
      "`facilities-ampio.json.gz` for Ampio/Max WC, konbini, stations, etc.",
      "Trip bubbles only (`ampio-tappe.geojson`). Served via raw.githubusercontent.com.",
      ""
    ].join("\n")
  );
  copyFileSync(ARCHIVE, path.join(work, PACK_FILE));
  copyFileSync(META, path.join(work, "facilities-ampio.meta.json"));

  run("git", ["add", "-A"], { cwd: work });
  if (dryRun) {
    console.log("Dry run: would publish", PACK_FILE, bytes, "bytes");
    return;
  }

  run("git", ["commit", "-m", "chore(japan): publish CORS-safe offline facility pack"], { cwd: work });
  const sha = (run("git", ["rev-parse", "HEAD"], { cwd: work }).stdout || "").trim();
  if (!sha) die("Could not read pack commit SHA");

  run("git", ["push", "origin", `HEAD:refs/heads/${BRANCH}`, "--force"], {
    cwd: work,
    stdio: "inherit"
  });

  writeFileSync(MANIFEST_PATH, renderManifest(existing, ownerRepo, sha, bytes));
  console.log(`Wrote ${MANIFEST_PATH}`);
  console.log(`Branch ${BRANCH} @ ${sha}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
