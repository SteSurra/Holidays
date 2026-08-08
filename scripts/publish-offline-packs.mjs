#!/usr/bin/env node
/**
 * Publish measured PMTiles under tmp/offline-packs/ to GitHub Releases.
 *
 * IMPORTANT: GitHub Release download URLs are NOT CORS-safe for the PWA.
 * release-assets.githubusercontent.com omits Access-Control-Allow-Origin, so
 * browser fetch from GitHub Pages fails. For in-app downloads use:
 *   node scripts/publish-offline-map-packs-cors.mjs
 * which publishes to branch offline-map-packs (raw.githubusercontent.com).
 *
 * This script remains useful as a backup mirror / gh CLI distribution.
 * GitHub release assets are limited to 2 GiB per file. japan-z15.pmtiles exceeds
 * that; host it elsewhere and pass --max-z15-url (or set TABI_MAX_Z15_URL).
 *
 *   node scripts/publish-offline-packs.mjs --dry-run
 *   node scripts/publish-offline-packs.mjs
 *   node scripts/publish-offline-packs.mjs --max-z15-url https://example.com/japan-z15.pmtiles
 *   node scripts/publish-offline-packs.mjs --allow-partial   # GitHub packs only
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PACK_DIR = path.join(ROOT, "tmp", "offline-packs");
const MANIFEST_PATH = path.join(ROOT, "assets", "offline-pack-manifest.js");

const RELEASE_TAG = "offline-packs-v1";
const GITHUB_MAX_BYTES = 2 * 1024 * 1024 * 1024;

const PACKS = [
  { key: "ampio_z14", file: "ampio-z14.pmtiles", bytes: 76430958 },
  { key: "ampio_z15", file: "ampio-z15.pmtiles", bytes: 204151159 },
  { key: "max_z14", file: "japan-z14.pmtiles", bytes: 1253060341 },
  { key: "max_z15", file: "japan-z15.pmtiles", bytes: 2729756673 }
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const writeManifestOnly = args.has("--write-manifest-only");
const allowPartial = args.has("--allow-partial");

function die(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function ghOk() {
  const r = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  return r.status === 0;
}

function repoSlug() {
  const r = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (r.status !== 0) die("Could not read git remote origin.");
  const url = (r.stdout || "").trim();
  const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/i);
  if (!m) die(`Origin is not a GitHub URL: ${url}`);
  return m[1];
}

function releaseAssetUrl(ownerRepo, file) {
  return `https://github.com/${ownerRepo}/releases/download/${RELEASE_TAG}/${file}`;
}

function parseMaxZ15Url() {
  const flagIdx = process.argv.indexOf("--max-z15-url");
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) {
    return process.argv[flagIdx + 1];
  }
  return process.env.TABI_MAX_Z15_URL || "";
}

function verifyLocalFiles() {
  for (const pack of PACKS) {
    const full = path.join(PACK_DIR, pack.file);
    if (!existsSync(full)) die(`Missing ${full}`);
    const size = statSync(full).size;
    if (size !== pack.bytes) {
      die(
        `Byte mismatch for ${pack.file}: disk ${size}, manifest ${pack.bytes}. Re-measure or fix manifest.`
      );
    }
  }
}

function runGh(argv) {
  console.log(`$ gh ${argv.join(" ")}`);
  if (dryRun) return { status: 0, stdout: "", stderr: "" };
  return spawnSync("gh", argv, { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
}

function ensureRelease(ownerRepo) {
  const view = runGh(["release", "view", RELEASE_TAG, "--repo", ownerRepo]);
  if (view.status === 0) {
    console.log(`Release ${RELEASE_TAG} already exists on ${ownerRepo}.`);
    return;
  }
  const create = runGh([
    "release",
    "create",
    RELEASE_TAG,
    "--repo",
    ownerRepo,
    "--title",
    "Tabi offline map packs (PMTiles)",
    "--notes",
    "PMTiles extracts for Ampio (stops) and Massimo (Japan) offline map download in Tabi. See assets/offline-pack-manifest.js for byte sizes."
  ]);
  if (create.status !== 0) {
    die(create.stderr || create.stdout || "gh release create failed");
  }
}

function uploadAsset(ownerRepo, filePath, label) {
  const upload = runGh([
    "release",
    "upload",
    RELEASE_TAG,
    filePath,
    "--repo",
    ownerRepo,
    "--clobber"
  ]);
  if (upload.status !== 0) {
    die(upload.stderr || upload.stdout || `Upload failed: ${label}`);
  }
}

function renderManifest(urlsByKey) {
  const lines = [
    "// Map pack URLs: set when .pmtiles are published (e.g. GitHub Release offline-packs-v1).",
    "// bytes must match the published file; the app verifies size after download.",
    "window.TABI_OFFLINE_MANIFEST = {",
    "  version: 1,",
    `  releaseTag: "${RELEASE_TAG}",`,
    "  packs: {"
  ];
  for (const pack of PACKS) {
    const url = urlsByKey[pack.key];
    lines.push(
      `    ${pack.key}: { file: "${pack.file}", bytes: ${pack.bytes}, url: ${JSON.stringify(url)} },`
    );
  }
  lines.push("  }", "};", "");
  return lines.join("\n");
}

function main() {
  verifyLocalFiles();
  const maxZ15Url = parseMaxZ15Url();
  const ownerRepo = repoSlug();

  const githubPacks = PACKS.filter((p) => p.bytes <= GITHUB_MAX_BYTES);
  const oversized = PACKS.filter((p) => p.bytes > GITHUB_MAX_BYTES);

  if (oversized.length) {
    console.warn(
      "GitHub per-file limit is 2 GiB. These packs need a non-GitHub URL:",
      oversized.map((p) => `${p.file} (${p.bytes} B)`).join(", ")
    );
    if (!maxZ15Url && oversized.some((p) => p.key === "max_z15")) {
      if (!allowPartial) {
        die(
          "Set --max-z15-url or TABI_MAX_Z15_URL for japan-z15.pmtiles, use --allow-partial to publish the other three packs, or re-extract below 2 GiB."
        );
      }
      console.warn("--allow-partial: max_z15 url will stay null until TABI_MAX_Z15_URL is set and manifest re-run.");
    }
  }

  if (!dryRun && !writeManifestOnly && !ghOk()) {
    die("gh is not authenticated. Run: gh auth login");
  }

  const urls = {};
  for (const pack of githubPacks) {
    urls[pack.key] = releaseAssetUrl(ownerRepo, pack.file);
  }
  if (oversized.some((p) => p.key === "max_z15")) {
    urls.max_z15 = maxZ15Url || null;
  }

  if (writeManifestOnly) {
    writeFileSync(MANIFEST_PATH, renderManifest(urls));
    console.log(`Wrote ${MANIFEST_PATH}`);
    return;
  }

  ensureRelease(ownerRepo);
  for (const pack of githubPacks) {
    const full = path.join(PACK_DIR, pack.file);
    console.log(`Uploading ${pack.file}…`);
    uploadAsset(ownerRepo, full, pack.file);
  }

  if (oversized.some((p) => p.key === "max_z15")) {
    console.log("Skipping GitHub upload for japan-z15.pmtiles (use external URL).");
  }

  if (!dryRun) {
    writeFileSync(MANIFEST_PATH, renderManifest(urls));
    console.log(`Wrote ${MANIFEST_PATH}`);
  }
  console.log(
    dryRun
      ? "Dry run complete (no gh calls, manifest not written unless --write-manifest-only)."
      : `Release: https://github.com/${ownerRepo}/releases/tag/${RELEASE_TAG}`
  );
  if (!dryRun) {
    console.log("Next: node scripts/bump-version.mjs && node scripts/check-guide-integrity.mjs");
  }
}

main();
