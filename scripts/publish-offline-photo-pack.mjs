#!/usr/bin/env node
/**
 * Publish photos-medio.tar.gz for CORS-safe browser download.
 *
 * GitHub Release assets lack Access-Control-Allow-Origin. Same pattern as maps:
 * orphan branch `offline-photo-packs` + raw.githubusercontent.com (ACAO: *),
 * pinned to the content commit SHA. Files over ~95 MiB are split.
 *
 * Also uploads the single archive to release offline-packs-v1 when `gh` works
 * (human/curl mirror; not used by the PWA).
 *
 *   node scripts/publish-offline-photo-pack.mjs --dry-run
 *   node scripts/publish-offline-photo-pack.mjs
 *   node scripts/publish-offline-photo-pack.mjs --skip-release
 *   node scripts/publish-offline-photo-pack.mjs --write-manifest-only
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
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PACK_DIR = path.join(ROOT, "tmp", "offline-packs");
const ARCHIVE = path.join(PACK_DIR, "photos-medio.tar.gz");
const META = path.join(PACK_DIR, "photos-medio.meta.json");
const MANIFEST_PATH = path.join(ROOT, "assets", "offline-pack-manifest.js");

const RELEASE_TAG = "offline-packs-v1";
const BRANCH = "offline-photo-packs";
const PART_MAX = 95 * 1024 * 1024;
const PHOTO_KEY = "photos_medio";
const PHOTO_FILE = "photos-medio.tar.gz";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipRelease = args.has("--skip-release");
const writeManifestOnly = args.has("--write-manifest-only");

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

function ghOk() {
  return run("gh", ["auth", "status"], { allowFail: true }).status === 0;
}

function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return { version: 2, packs: {} };
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(readFileSync(MANIFEST_PATH, "utf8"), context, {
    filename: "offline-pack-manifest.js"
  });
  return context.window.TABI_OFFLINE_MANIFEST || { version: 2, packs: {} };
}

function rawUrl(ownerRepo, sha, fileName) {
  return `https://raw.githubusercontent.com/${ownerRepo}/${sha}/${encodeURIComponent(fileName).replace(/%2F/g, "/")}`;
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

function renderManifest(existing, ownerRepo, sha, parts, bytes) {
  const packs = { ...(existing.packs || {}) };
  if (parts.length === 1 && parts[0].name === PHOTO_FILE) {
    packs[PHOTO_KEY] = {
      file: PHOTO_FILE,
      bytes,
      url: rawUrl(ownerRepo, sha, parts[0].name)
    };
  } else {
    packs[PHOTO_KEY] = {
      file: PHOTO_FILE,
      bytes,
      url: null,
      parts: parts.map((p) => ({ url: rawUrl(ownerRepo, sha, p.name), bytes: p.bytes }))
    };
  }

  const order = ["ampio_z14", "ampio_z15", "max_z14", "max_z15", PHOTO_KEY];
  const keys = [...order, ...Object.keys(packs)].filter((k, i, arr) => arr.indexOf(k) === i);

  const lines = [
    "// Offline pack URLs: CORS-safe raw.githubusercontent.com (map + photo orphan branches).",
    "// GitHub Release assets lack Access-Control-Allow-Origin — do not use them for browser fetch.",
    "// bytes must match the published file; the app verifies size after download.",
    "window.TABI_OFFLINE_MANIFEST = {",
    `  version: ${existing.version || 2},`,
    `  releaseTag: ${JSON.stringify(existing.releaseTag || "offline-packs-v1")},`,
    existing.contentSha ? `  contentSha: ${JSON.stringify(existing.contentSha)},` : null,
    `  photoContentSha: ${JSON.stringify(sha)},`,
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

function uploadRelease(ownerRepo) {
  if (!ghOk()) {
    console.warn("gh not authenticated — skipping release upload.");
    return false;
  }
  const view = run("gh", ["release", "view", RELEASE_TAG, "--repo", ownerRepo], { allowFail: true });
  if (view.status !== 0) {
    run("gh", [
      "release",
      "create",
      RELEASE_TAG,
      "--repo",
      ownerRepo,
      "--title",
      "Tabi offline packs",
      "--notes",
      "PMTiles map packs and photos-medio.tar.gz for Tabi offline install."
    ]);
  }
  const upload = run(
    "gh",
    ["release", "upload", RELEASE_TAG, ARCHIVE, "--repo", ownerRepo, "--clobber"],
    { allowFail: true }
  );
  if (upload.status !== 0) {
    console.warn((upload.stderr || upload.stdout || "release upload failed").trim());
    return false;
  }
  console.log(`Uploaded ${PHOTO_FILE} to release ${RELEASE_TAG}`);
  return true;
}

async function main() {
  if (!existsSync(ARCHIVE) || !existsSync(META)) {
    die(`Missing ${ARCHIVE} or ${META}. Run: node scripts/build-offline-photo-pack.mjs`);
  }
  const meta = JSON.parse(readFileSync(META, "utf8"));
  const bytes = statSync(ARCHIVE).size;
  if (bytes !== meta.bytes) die(`Byte mismatch: archive ${bytes} vs meta ${meta.bytes}`);

  const ownerRepo = repoSlug();
  const existing = loadManifest();

  if (writeManifestOnly) {
    // Keep previous photo URLs if present; only rewrite structure when sha known.
    if (!existing.packs?.[PHOTO_KEY]) {
      die("No photos_medio in manifest yet; run a full publish first.");
    }
    writeFileSync(MANIFEST_PATH, readFileSync(MANIFEST_PATH, "utf8"));
    console.log("Manifest already contains photos_medio; nothing to rewrite.");
    return;
  }

  const work = path.join(ROOT, "tmp", "offline-photo-packs-publish");
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
      "# Tabi offline photo pack",
      "",
      "`photos-medio.tar.gz` (or parts) for Medio+ offline install.",
      "Served via `raw.githubusercontent.com` so GitHub Pages gets CORS.",
      "Built by `scripts/build-offline-photo-pack.mjs`.",
      ""
    ].join("\n")
  );
  copyFileSync(META, path.join(work, "photos-medio.meta.json"));

  console.log(`Preparing ${PHOTO_FILE}…`);
  const parts = await splitFile(ARCHIVE, work, PHOTO_FILE);

  run("git", ["add", "-A"], { cwd: work });
  if (dryRun) {
    console.log("Dry run: skipping commit/push. Would publish parts:");
    for (const p of parts) console.log(`  ${p.name} (${p.bytes} B)`);
    console.log(renderManifest(existing, ownerRepo, "DRYRUN_SHA", parts, bytes));
    return;
  }

  run("git", ["commit", "-m", "chore(japan): publish CORS-safe offline photo pack"], { cwd: work });
  const sha = (run("git", ["rev-parse", "HEAD"], { cwd: work }).stdout || "").trim();
  if (!sha) die("Could not read pack commit SHA");

  run("git", ["push", "origin", `HEAD:refs/heads/${BRANCH}`, "--force"], {
    cwd: work,
    stdio: "inherit"
  });

  if (!skipRelease) uploadRelease(ownerRepo);

  writeFileSync(MANIFEST_PATH, renderManifest(existing, ownerRepo, sha, parts, bytes));
  console.log(`Wrote ${MANIFEST_PATH}`);
  console.log(`Branch ${BRANCH} @ ${sha}`);
  console.log(
    `Release mirror: https://github.com/${ownerRepo}/releases/tag/${RELEASE_TAG}`
  );
  console.log("Next: node scripts/bump-version.mjs && node scripts/check-guide-integrity.mjs");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
