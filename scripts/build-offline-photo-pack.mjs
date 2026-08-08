#!/usr/bin/env node
/**
 * Build a single curated-photo archive for Medio+ offline install.
 *
 * Many small Commons GETs will never be "seconds" on a phone; one .tar.gz is.
 *
 *   node scripts/build-offline-photo-pack.mjs
 *   node scripts/build-offline-photo-pack.mjs --concurrency 12
 *   node scripts/build-offline-photo-pack.mjs --reuse   # keep prior downloads in staging
 *
 * Output:
 *   tmp/offline-packs/photos-medio.tar.gz
 *   tmp/offline-packs/photos-medio.meta.json   (bytes, counts, sha256)
 *
 * Archive layout:
 *   manifest.json  — maps Cache Storage URL → entry path + content-type
 *   files/<itemId> — image bytes (stable item ids; extension omitted)
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { finished } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "tmp", "offline-packs");
const STAGING = path.join(OUT_DIR, "photos-medio-staging");
const FILES_DIR = path.join(STAGING, "files");
const ARCHIVE = path.join(OUT_DIR, "photos-medio.tar.gz");
const META = path.join(OUT_DIR, "photos-medio.meta.json");

const PHOTO_WIDTH = 960;
const UA =
  "TabiTravelGuideOfflinePack/1.0 (https://github.com/SteSurra/Holidays; offline photo pack build) node";

const args = process.argv.slice(2);
const reuse = args.includes("--reuse");
const concurrency = Math.max(
  1,
  Number(args.includes("--concurrency") ? args[args.indexOf("--concurrency") + 1] : 10) || 10
);

function die(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function humanBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

function loadCuratedImages() {
  const file = path.join(ROOT, "assets", "curated-images-data.js");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(readFileSync(file, "utf8"), context, { filename: "curated-images-data.js" });
  const map = context.window.TABI_CURATED_IMAGES || {};
  return Object.entries(map)
    .map(([id, row]) => ({
      id,
      file: Array.isArray(row) ? row[0] : null
    }))
    .filter((entry) => entry.file);
}

function cacheUrl(fileName) {
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${fileName}?width=${PHOTO_WIDTH}`;
}

function sniffType(buf, headerType) {
  const t = (headerType || "").toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return "image/jpeg";
  if (t.includes("png")) return "image/png";
  if (t.includes("webp")) return "image/webp";
  if (t.includes("gif")) return "image/gif";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return t.startsWith("image/") ? t.split(";")[0].trim() : "application/octet-stream";
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadOne(entry) {
  const url = cacheUrl(entry.file);
  const dest = path.join(FILES_DIR, entry.id);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "image/*,*/*;q=0.8" },
        redirect: "follow",
        signal: AbortSignal.timeout(60000)
      });
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After")) * 1000;
        await wait(Math.min(30000, Math.max(retryAfter || 0, 2000 * (attempt + 1))));
        continue;
      }
      if (!response.ok) {
        return { id: entry.id, url, ok: false, error: `HTTP ${response.status}` };
      }
      const buf = Buffer.from(await response.arrayBuffer());
      if (buf.length < 32) {
        return { id: entry.id, url, ok: false, error: "body too small" };
      }
      const type = sniffType(buf, response.headers.get("content-type"));
      if (!type.startsWith("image/")) {
        return { id: entry.id, url, ok: false, error: `not image (${type})` };
      }
      writeFileSync(dest, buf);
      return {
        id: entry.id,
        url,
        path: `files/${entry.id}`,
        bytes: buf.length,
        type,
        ok: true
      };
    } catch (err) {
      if (attempt === 3) {
        return { id: entry.id, url, ok: false, error: String(err.message || err) };
      }
      await wait(1500 * (attempt + 1));
    }
  }
  return { id: entry.id, url, ok: false, error: "exhausted retries" };
}

async function downloadAll(entries) {
  mkdirSync(FILES_DIR, { recursive: true });
  const results = new Array(entries.length);
  let cursor = 0;
  let done = 0;
  let okBytes = 0;
  const failures = [];

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= entries.length) return;
      const entry = entries[index];
      const dest = path.join(FILES_DIR, entry.id);
      let result;
      if (reuse && existsSync(dest) && statSync(dest).size > 32) {
        const buf = readFileSync(dest);
        const type = sniffType(buf, "");
        result = {
          id: entry.id,
          url: cacheUrl(entry.file),
          path: `files/${entry.id}`,
          bytes: buf.length,
          type: type.startsWith("image/") ? type : "image/jpeg",
          ok: type.startsWith("image/"),
          reused: true,
          error: type.startsWith("image/") ? undefined : "reused non-image"
        };
      } else {
        result = await downloadOne(entry);
      }
      results[index] = result;
      done += 1;
      if (result.ok) okBytes += result.bytes;
      else failures.push(result);
      if (done % 25 === 0 || done === entries.length) {
        console.log(
          `  photos ${done}/${entries.length} · ok ${humanBytes(okBytes)} · fails ${failures.length}`
        );
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { results, failures, okBytes };
}

/** Minimal ustar writer (POSIX) — enough for our short paths. */
function tarHeader(name, size, typeflag = "0") {
  const buf = Buffer.alloc(512, 0);
  const writeStr = (str, offset, len) => {
    Buffer.from(String(str), "utf8").copy(buf, offset, 0, len - 1);
  };
  const writeOctal = (num, offset, len) => {
    const s = num.toString(8).padStart(len - 1, "0");
    writeStr(s, offset, len);
  };
  if (name.length >= 100) throw new Error(`tar name too long: ${name}`);
  writeStr(name, 0, 100);
  writeOctal(0o644, 100, 8);
  writeOctal(0, 108, 8);
  writeOctal(0, 116, 8);
  writeOctal(size, 124, 12);
  writeOctal(Math.floor(Date.now() / 1000), 136, 12);
  buf.fill(0x20, 148, 156); // checksum space
  buf[156] = typeflag.charCodeAt(0);
  writeStr("ustar", 257, 6);
  writeStr("00", 263, 3);
  let sum = 0;
  for (let i = 0; i < 512; i += 1) sum += buf[i];
  writeOctal(sum, 148, 8);
  buf[155] = 0;
  return buf;
}

function pad512(size) {
  const rem = size % 512;
  return rem === 0 ? 0 : 512 - rem;
}

async function writeTarGz(manifest, fileEntries) {
  mkdirSync(OUT_DIR, { recursive: true });
  if (existsSync(ARCHIVE)) rmSync(ARCHIVE);

  const gzip = createGzip({ level: 6 });
  const out = createWriteStream(ARCHIVE);
  const sink = pipeline(gzip, out);

  async function writeBlock(buf) {
    if (!gzip.write(buf)) {
      await new Promise((resolve) => gzip.once("drain", resolve));
    }
  }

  async function addFile(name, data) {
    const size = data.length;
    await writeBlock(tarHeader(name, size, "0"));
    await writeBlock(data);
    const pad = pad512(size);
    if (pad) await writeBlock(Buffer.alloc(pad, 0));
  }

  const manifestBuf = Buffer.from(JSON.stringify(manifest), "utf8");
  await addFile("manifest.json", manifestBuf);

  for (const entry of fileEntries) {
    const data = readFileSync(path.join(STAGING, entry.path));
    await addFile(entry.path, data);
  }

  await writeBlock(Buffer.alloc(1024, 0));
  gzip.end();
  await sink;
  await finished(out);
}

function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));
  return hash.digest("hex");
}

async function main() {
  const entries = loadCuratedImages();
  if (!entries.length) die("No curated images found.");

  console.log(
    `Building photo pack: ${entries.length} curated @ width=${PHOTO_WIDTH}, concurrency=${concurrency}${
      reuse ? " (reuse staging)" : ""
    }`
  );

  if (!reuse && existsSync(STAGING)) {
    rmSync(STAGING, { recursive: true, force: true });
  }
  mkdirSync(FILES_DIR, { recursive: true });

  const { results, failures, okBytes } = await downloadAll(entries);
  const ok = results.filter((r) => r && r.ok);
  const ratio = ok.length / entries.length;
  console.log(`Downloaded ${ok.length}/${entries.length} (${(ratio * 100).toFixed(1)}%) · ${humanBytes(okBytes)}`);
  if (ratio < 0.95) {
    die(`Success ratio ${(ratio * 100).toFixed(1)}% below 95%. Refusing to pack.`);
  }

  const manifest = {
    version: 1,
    kind: "photos-medio",
    width: PHOTO_WIDTH,
    builtAt: new Date().toISOString(),
    count: ok.length,
    entries: ok.map((r) => ({
      id: r.id,
      url: r.url,
      path: r.path,
      bytes: r.bytes,
      type: r.type
    }))
  };
  writeFileSync(path.join(STAGING, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("Writing tar.gz…");
  await writeTarGz(manifest, ok);
  const bytes = statSync(ARCHIVE).size;
  const sha256 = sha256File(ARCHIVE);
  const meta = {
    file: "photos-medio.tar.gz",
    bytes,
    sha256,
    imageBytes: okBytes,
    imageCount: ok.length,
    curatedCount: entries.length,
    failCount: failures.length,
    failures: failures.slice(0, 40).map((f) => ({ id: f.id, error: f.error })),
    builtAt: manifest.builtAt,
    width: PHOTO_WIDTH
  };
  writeFileSync(META, JSON.stringify(meta, null, 2));
  console.log(`Wrote ${ARCHIVE} (${humanBytes(bytes)}, sha256 ${sha256.slice(0, 12)}…)`);
  console.log(`Meta ${META}`);

  // Prefer system tar for a quick round-trip sanity check when available.
  const list = spawnSync("tar", ["-tzf", ARCHIVE], { encoding: "utf8" });
  if (list.status === 0) {
    const names = list.stdout.trim().split("\n");
    console.log(`tar list ok: ${names.length} entries (first: ${names[0]})`);
  } else {
    console.warn("tar -tzf not available or failed; skipped archive listing check.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
