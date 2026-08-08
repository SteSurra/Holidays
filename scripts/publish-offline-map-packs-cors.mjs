#!/usr/bin/env node
/**
 * Publish PMTiles to orphan branch offline-map-packs, served by
 * raw.githubusercontent.com (Access-Control-Allow-Origin: *).
 *
 * GitHub Release download URLs redirect to release-assets.githubusercontent.com
 * with no ACAO — browser fetch from GitHub Pages fails. Host packs here instead.
 *
 * Blobs ≥ 100 MiB are rejected by Git; files over PART_MAX are split and the
 * app reassembles them in OPFS.
 *
 *   node scripts/publish-offline-map-packs-cors.mjs --dry-run
 *   node scripts/publish-offline-map-packs-cors.mjs
 *   node scripts/publish-offline-map-packs-cors.mjs --skip-max
 *   node scripts/publish-offline-map-packs-cors.mjs --write-manifest-only <sha>
 *     Rewrite assets/offline-pack-manifest.js from an already-pushed orphan
 *     commit using tmp/offline-map-packs-publish part sizes; preserves photos_medio.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PACK_DIR = path.join(ROOT, "tmp", "offline-packs");
const MANIFEST_PATH = path.join(ROOT, "assets", "offline-pack-manifest.js");
const BRANCH = "offline-map-packs";
const PART_MAX = 95 * 1024 * 1024;

const PACKS = [
  { key: "ampio_z14", file: "ampio-z14.pmtiles", bytes: 76430958 },
  { key: "ampio_z15", file: "ampio-z15.pmtiles", bytes: 204151159 },
  { key: "max_z14", file: "japan-z14.pmtiles", bytes: 1253060341 },
  { key: "max_z15", file: "japan-z15.pmtiles", bytes: 2729756673 }
];

const argv = process.argv.slice(2);
const args = new Set(argv);
const dryRun = args.has("--dry-run");
const skipMax = args.has("--skip-max");
const writeManifestOnlyIdx = argv.indexOf("--write-manifest-only");
const writeManifestOnlySha =
  writeManifestOnlyIdx >= 0 ? String(argv[writeManifestOnlyIdx + 1] || "").trim() : "";

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

function verifyLocal(pack) {
  const full = path.join(PACK_DIR, pack.file);
  if (!existsSync(full)) die(`Missing ${full}`);
  const size = statSync(full).size;
  if (size !== pack.bytes) {
    die(`Byte mismatch for ${pack.file}: disk ${size}, expected ${pack.bytes}`);
  }
  return full;
}

async function splitFile(srcPath, destDir, baseName) {
  mkdirSync(destDir, { recursive: true });
  const total = statSync(srcPath).size;
  if (total <= PART_MAX) {
    const dest = path.join(destDir, baseName);
    copyFileSync(srcPath, dest);
    return [{ name: baseName, bytes: total }];
  }

  const parts = [];
  let index = 0;
  let offset = 0;
  while (offset < total) {
    const chunkSize = Math.min(PART_MAX, total - offset);
    const name = `${baseName}.part-${String(index).padStart(3, "0")}`;
    const dest = path.join(destDir, name);
    const read = createReadStream(srcPath, { start: offset, end: offset + chunkSize - 1 });
    await pipeline(read, createWriteStream(dest));
    const written = statSync(dest).size;
    if (written !== chunkSize) die(`Short write for ${name}: ${written} != ${chunkSize}`);
    parts.push({ name, bytes: written });
    offset += chunkSize;
    index += 1;
    console.log(`  part ${name} (${written} bytes)`);
  }
  return parts;
}

function rawUrl(ownerRepo, sha, fileName) {
  return `https://raw.githubusercontent.com/${ownerRepo}/${sha}/${encodeURIComponent(fileName).replace(/%2F/g, "/")}`;
}

function loadExistingManifest() {
  if (!existsSync(MANIFEST_PATH)) return { packs: {} };
  try {
    const src = readFileSync(MANIFEST_PATH, "utf8");
    const context = { window: {} };
    // eslint-disable-next-line no-new-func
    const fn = new Function("window", src + "\nreturn window.TABI_OFFLINE_MANIFEST;");
    return fn(context.window) || { packs: {} };
  } catch (_) {
    return { packs: {} };
  }
}

function renderManifest(ownerRepo, sha, published) {
  const existing = loadExistingManifest();
  const photoPack = existing.packs && existing.packs.photos_medio;
  const lines = [
    "// Offline pack URLs: CORS-safe raw.githubusercontent.com (map + photo orphan branches).",
    "// GitHub Release assets lack Access-Control-Allow-Origin — do not use them for browser fetch.",
    "// bytes must match the published file; the app verifies size after download.",
    "window.TABI_OFFLINE_MANIFEST = {",
    "  version: 2,",
    `  releaseTag: ${JSON.stringify(existing.releaseTag || BRANCH)},`,
    `  contentSha: ${JSON.stringify(sha)},`,
    existing.photoContentSha
      ? `  photoContentSha: ${JSON.stringify(existing.photoContentSha)},`
      : null,
    "  packs: {"
  ].filter((line) => line != null);
  for (const pack of PACKS) {
    const pub = published[pack.key];
    if (!pub) {
      lines.push(
        `    ${pack.key}: { file: "${pack.file}", bytes: ${pack.bytes}, url: null },`
      );
      continue;
    }
    if (pub.parts.length === 1 && pub.parts[0].name === pack.file) {
      const url = rawUrl(ownerRepo, sha, pub.parts[0].name);
      lines.push(
        `    ${pack.key}: { file: "${pack.file}", bytes: ${pack.bytes}, url: ${JSON.stringify(url)} },`
      );
    } else {
      const partObjs = pub.parts.map((p) => ({
        url: rawUrl(ownerRepo, sha, p.name),
        bytes: p.bytes
      }));
      lines.push(
        `    ${pack.key}: { file: "${pack.file}", bytes: ${pack.bytes}, url: null, parts: ${JSON.stringify(partObjs)} },`
      );
    }
  }
  if (photoPack) {
    lines.push(`    photos_medio: ${JSON.stringify(photoPack, null, 2).replace(/\n/g, "\n    ")},`);
  }
  lines.push("  }", "};", "");
  return lines.join("\n");
}

function publishedFromWorkDir(workDir) {
  const published = {};
  for (const pack of PACKS) {
    if (pack.key === "max_z15") {
      published[pack.key] = null;
      continue;
    }
    const single = path.join(workDir, pack.file);
    if (existsSync(single)) {
      published[pack.key] = { parts: [{ name: pack.file, bytes: statSync(single).size }] };
      continue;
    }
    const parts = [];
    for (let i = 0; ; i += 1) {
      const name = `${pack.file}.part-${String(i).padStart(3, "0")}`;
      const full = path.join(workDir, name);
      if (!existsSync(full)) break;
      parts.push({ name, bytes: statSync(full).size });
    }
    if (!parts.length) {
      published[pack.key] = null;
      continue;
    }
    const sum = parts.reduce((n, p) => n + p.bytes, 0);
    if (sum !== pack.bytes) {
      die(`Part sum mismatch for ${pack.file}: ${sum} != ${pack.bytes}`);
    }
    published[pack.key] = { parts };
  }
  return published;
}

async function main() {
  const ownerRepo = repoSlug();
  const work = path.join(ROOT, "tmp", "offline-map-packs-publish");

  if (writeManifestOnlyIdx >= 0) {
    if (!/^[0-9a-f]{7,40}$/i.test(writeManifestOnlySha)) {
      die("Usage: node scripts/publish-offline-map-packs-cors.mjs --write-manifest-only <sha>");
    }
    if (!existsSync(work)) die(`Missing ${work}; need a prior publish staging dir`);
    const published = publishedFromWorkDir(work);
    writeFileSync(MANIFEST_PATH, renderManifest(ownerRepo, writeManifestOnlySha, published));
    console.log(`Wrote ${MANIFEST_PATH} for ${writeManifestOnlySha}`);
    return;
  }

  const selected = PACKS.filter((p) => {
    if (p.key === "max_z15") return false;
    if (skipMax && p.key.startsWith("max_")) return false;
    return true;
  });

  for (const pack of selected) verifyLocal(pack);

  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  run("git", ["init"], { cwd: work });
  // Reuse identity from the main repo when set
  const name = run("git", ["config", "user.name"], { allowFail: true }).stdout.trim();
  const email = run("git", ["config", "user.email"], { allowFail: true }).stdout.trim();
  if (name) run("git", ["config", "user.name", name], { cwd: work });
  if (email) run("git", ["config", "user.email", email], { cwd: work });
  run("git", ["remote", "add", "origin", originHttps()], { cwd: work });

  writeFileSync(
    path.join(work, "README.md"),
    [
      "# Tabi offline map packs",
      "",
      "PMTiles for in-app Ampio/Max downloads.",
      "Served via `raw.githubusercontent.com` so browsers on GitHub Pages get CORS.",
      "Do not point `offline-pack-manifest.js` at GitHub Release download URLs.",
      ""
    ].join("\n")
  );

  const published = {};
  for (const pack of selected) {
    const src = path.join(PACK_DIR, pack.file);
    console.log(`Preparing ${pack.file}…`);
    published[pack.key] = { parts: await splitFile(src, work, pack.file) };
  }

  run("git", ["add", "-A"], { cwd: work });
  if (dryRun) {
    console.log("Dry run: skipping commit/push. Manifest not written.");
    console.log("Would publish:", Object.keys(published).join(", "));
    return;
  }

  run(
    "git",
    ["commit", "-m", "chore(japan): publish CORS-safe offline map packs"],
    { cwd: work }
  );
  const sha = (run("git", ["rev-parse", "HEAD"], { cwd: work }).stdout || "").trim();
  if (!sha) die("Could not read pack commit SHA");

  run("git", ["push", "origin", `HEAD:refs/heads/${BRANCH}`, "--force"], {
    cwd: work,
    stdio: "inherit"
  });

  const finalPublished = {};
  for (const pack of PACKS) finalPublished[pack.key] = published[pack.key] || null;
  writeFileSync(MANIFEST_PATH, renderManifest(ownerRepo, sha, finalPublished));
  console.log(`Wrote ${MANIFEST_PATH}`);
  console.log(`Branch ${BRANCH} @ ${sha}`);
  console.log("Next: node scripts/bump-version.mjs && node scripts/check-guide-integrity.mjs");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
