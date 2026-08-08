/**
 * Prove offline Riprendi / upgrade skips cached photos and complete map parts.
 * Exercises the pure helpers in assets/offline-resume-logic.js (no browser).
 *
 *   node scripts/test-offline-resume.mjs
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url);
const logicPath = new URL("../assets/offline-resume-logic.js", import.meta.url);
const packPath = new URL("../assets/offline-pack.js", import.meta.url);
const manifestPath = new URL("../assets/offline-pack-manifest.js", import.meta.url);

function loadResumeLogic() {
  const code = readFileSync(logicPath, "utf8");
  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    globalThis: {},
    console
  });
  vm.runInContext(code, context);
  const api = module.exports;
  if (!api || typeof api.planPartFetches !== "function") {
    throw new Error("offline-resume-logic.js did not export planPartFetches");
  }
  return api;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((message || "assertEqual") + ": got " + a + " expected " + e);
}

const Resume = loadResumeLogic();
const manifestCode = readFileSync(manifestPath, "utf8");
const manifestCtx = { window: {} };
vm.runInNewContext(manifestCode, manifestCtx);
const packs = manifestCtx.window.TABI_OFFLINE_MANIFEST.packs;
const ampio = packs.ampio_z15;
const sources = ampio.parts.map(function (part) {
  return { url: part.url, bytes: part.bytes };
});
const packBytes = ampio.bytes;
const photoBytes = packs.photos_medio.bytes;

let passed = 0;
function scenario(name, fn) {
  fn();
  passed += 1;
  console.log("OK  " + name);
}

scenario("complete map parts are skipped (no re-fetch)", function () {
  const partSizes = [sources[0].bytes, sources[1].bytes, null];
  const plan = Resume.planPartFetches(sources, partSizes, packBytes, null);
  assertEqual(plan.skipIndexes, [0, 1], "skip first two parts");
  assertEqual(plan.fetchIndexes, [2], "queue only the missing part");
  assertEqual(plan.fetches.length, 1, "one fetch record");
  assertEqual(plan.fetches[0].index, 2, "fetch index 2");
  assertEqual(plan.fetchBytes, sources[2].bytes, "fetch bytes = last part only");
  assertEqual(plan.skipBytes, sources[0].bytes + sources[1].bytes, "skip bytes = present parts");
  assert(!plan.inspection.complete, "pack still incomplete");
});

scenario("incomplete / wrong-size parts are queued", function () {
  const partSizes = [sources[0].bytes, sources[1].bytes - 1, null];
  const plan = Resume.planPartFetches(sources, partSizes, packBytes, null);
  assertEqual(plan.skipIndexes, [0], "only exact-size part skipped");
  assertEqual(plan.fetchIndexes, [1, 2], "incomplete + missing queued");
  assertEqual(
    plan.fetchBytes,
    sources[1].bytes + sources[2].bytes,
    "remaining bytes = sum of queued parts"
  );
});

scenario("all parts present → nothing to fetch", function () {
  const partSizes = sources.map(function (src) { return src.bytes; });
  const plan = Resume.planPartFetches(sources, partSizes, packBytes, null);
  assertEqual(plan.fetchIndexes, [], "no fetches");
  assertEqual(plan.skipIndexes, [0, 1, 2], "all skipped");
  assert(plan.inspection.complete, "complete");
  assertEqual(plan.fetchBytes, 0, "zero fetch bytes");
});

scenario("stale meta forces full re-queue", function () {
  const partSizes = [sources[0].bytes, sources[1].bytes, sources[2].bytes];
  const plan = Resume.planPartFetches(sources, partSizes, packBytes, {
    multi: true,
    bytes: packBytes - 1,
    partCount: 3
  });
  assert(plan.inspection.stale, "stale flag");
  assertEqual(plan.fetchIndexes, [0, 1, 2], "re-fetch all parts");
  assertEqual(plan.fetchBytes, packBytes, "full pack bytes");
});

scenario("OPFS prefix: whole parts covered count toward resume", function () {
  const prefix = sources[0].bytes + sources[1].bytes + 1000;
  const local = Resume.inspectOpfsPrefix(sources, prefix, packBytes);
  assertEqual(local.presentParts, 2, "two whole parts covered");
  assertEqual(local.partOk, [true, true, false], "partOk mask");
  assertEqual(local.presentBytes, prefix, "presentBytes = OPFS size");
  assertEqual(local.missingBytes, packBytes - prefix, "missing = pack − prefix");
  assertEqual(local.fetchIndexes, [2], "only last part still needed as a unit");
});

scenario("photosAlreadyOnDevice → estimate excludes photo pack bytes", function () {
  const reuse = Resume.photosAlreadyOnDeviceDecision(
    { ok: 600, expected: 609 },
    { okCount: 606, expected: 609, bytes: photoBytes },
    photoBytes,
    Resume.PHOTO_OK_RATIO
  );
  assert(reuse.ok, "photos reuse accepted");
  const mapMissing = sources[2].bytes;
  const remaining = Resume.estimateRemainingDownloadBytes({
    needsPhotos: true,
    photosAlreadyOnDevice: reuse.ok,
    photoBytes: photoBytes,
    mapComplete: false,
    mapMissingBytes: mapMissing
  });
  assertEqual(remaining, mapMissing, "estimate = missing map only, not photos+" + photoBytes);
  const fromScratch = Resume.estimateRemainingDownloadBytes({
    needsPhotos: true,
    photosAlreadyOnDevice: false,
    photoBytes: photoBytes,
    mapComplete: false,
    mapMissingBytes: packBytes
  });
  assertEqual(fromScratch, photoBytes + packBytes, "cold start includes photos + full map");
});

scenario("remaining byte estimate matches sum of missing parts only", function () {
  const partSizes = [sources[0].bytes, null, null];
  const plan = Resume.planPartFetches(sources, partSizes, packBytes, null);
  const missingSum = sources[1].bytes + sources[2].bytes;
  assertEqual(plan.fetchBytes, missingSum, "planner fetchBytes");
  assertEqual(plan.inspection.missingBytes, missingSum, "inspection missingBytes");
  const estimate = Resume.estimateRemainingDownloadBytes({
    needsPhotos: true,
    photosAlreadyOnDevice: true,
    photoBytes: photoBytes,
    mapComplete: false,
    mapMissingBytes: plan.inspection.missingBytes
  });
  assertEqual(estimate, missingSum, "confirm-dialog remaining bytes");
});

scenario("status copy mentions saved map parts when resuming", function () {
  const text = Resume.resumeSkipStatusText({
    photoReused: true,
    mapPartsPresent: 2,
    mapPartsTotal: 3,
    target: "ampio_z15"
  }, true);
  assert(
    text.indexOf("Foto già presenti") !== -1
      && text.indexOf("2/3") !== -1
      && text.indexOf("scarico il resto") !== -1,
    "expected resume status, got: " + text
  );
});

scenario("offline-pack.js wires Resume helpers and skips complete parts", function () {
  const packSrc = readFileSync(packPath, "utf8");
  assert(
    packSrc.indexOf("TABI_OFFLINE_RESUME") !== -1,
    "offline-pack.js must reference TABI_OFFLINE_RESUME"
  );
  assert(
    packSrc.indexOf("planPartFetches") !== -1,
    "offline-pack.js must call planPartFetches for IDB multi-part resume"
  );
  assert(
    packSrc.indexOf("inspectLocalMapPack") !== -1,
    "offline-pack.js must inspect local map before download"
  );
  assert(
    /fetchIndexes/.test(packSrc),
    "offline-pack.js must iterate fetchIndexes (not blindly re-download all parts)"
  );
  // Multi-part path must plan fetches; the only pre-loop idbDeleteMap for
  // multi-part is the stale-meta wipe (published bytes/partCount mismatch).
  const idbFn = packSrc.indexOf("async function downloadMapPackIdb");
  const opfsFn = packSrc.indexOf("async function downloadMapPackOpfs");
  assert(idbFn !== -1, "downloadMapPackIdb present");
  const idbBlock = packSrc.slice(idbFn, opfsFn > idbFn ? opfsFn : idbFn + 8000);
  assert(
    idbBlock.indexOf("planPartFetches") !== -1
      && idbBlock.indexOf("fetchIndexes") !== -1
      && idbBlock.indexOf("sources.length > 1") !== -1,
    "IDB multi-part must resume via planPartFetches/fetchIndexes"
  );
});

scenario("estimate includes missing facility pack bytes on upgrade", function () {
  const facilityBytes = 131583;
  const remaining = Resume.estimateRemainingDownloadBytes({
    needsPhotos: true,
    photosAlreadyOnDevice: true,
    photoBytes: 0,
    mapComplete: true,
    mapMissingBytes: 0,
    facilityMissingBytes: facilityBytes
  });
  assertEqual(remaining, facilityBytes, "facility pack counted when map+photos done");
});

scenario("minimo tier includes facility pack in estimate", function () {
  const packSrc = readFileSync(packPath, "utf8");
  assert(
    /function needsFacilities\(level\)[\s\S]*?level === "minimo"/.test(packSrc),
    "needsFacilities must include minimo"
  );
  const facilityBytes = packs.facilities_ampio.bytes;
  const shellOnly = Resume.estimateRemainingDownloadBytes({
    needsPhotos: false,
    photosAlreadyOnDevice: false,
    photoBytes: 0,
    mapComplete: true,
    mapMissingBytes: 0,
    facilityMissingBytes: facilityBytes
  });
  assertEqual(shellOnly, facilityBytes, "minimo cold install counts facility pack");
});

scenario("inspectTierGap: facilities-only gap on complete tier", function () {
  const facilityBytes = packs.facilities_ampio.bytes;
  const gap = Resume.inspectTierGap({
    needsPhotos: true,
    photosAlreadyOnDevice: true,
    photoBytes: photoBytes,
    mapComplete: true,
    mapMissingBytes: 0,
    facilityMissingBytes: facilityBytes
  });
  assertEqual(gap.totalBytes, facilityBytes, "total bytes");
  assertEqual(gap.facilityMissingBytes, facilityBytes, "facility bytes");
  assertEqual(gap.mapMissingBytes, 0, "map bytes");
  assertEqual(gap.photoMissingBytes, 0, "photo bytes");
});

scenario("offline-pack prompts when active tier has missing components", function () {
  const packSrc = readFileSync(packPath, "utf8");
  assert(
    packSrc.indexOf("maybePromptTierUpgrade") !== -1,
    "offline-pack.js must check missing components on boot"
  );
  assert(
    packSrc.indexOf("Scarica aggiornamento") !== -1,
    "offline-pack.js must offer Scarica aggiornamento CTA"
  );
  assert(
    packSrc.indexOf("Manca un aggiornamento offline") !== -1,
    "offline-pack.js must use upgrade confirm copy"
  );
  assert(
    packSrc.indexOf("refreshActiveTierMissingBytes") !== -1,
    "offline-pack.js must refresh missing-byte estimate for active tier"
  );
});

scenario("offline-pack upgrade dismiss is session-only, re-prompts on cold boot", function () {
  const packSrc = readFileSync(packPath, "utf8");
  assert(
    packSrc.indexOf("tabi-offline-upgrade-dismiss") === -1,
    "offline-pack.js must not persist upgrade dismiss in localStorage"
  );
  assert(
    packSrc.indexOf("upgradePromptShownSession") !== -1,
    "offline-pack.js must use session flag for upgrade dismiss"
  );
  const promptFn = packSrc.match(/async function maybePromptTierUpgrade\(\)[\s\S]*?\n    \}/);
  assert(promptFn, "maybePromptTierUpgrade found");
  assert(
    promptFn[0].indexOf("upgradePromptShownSession") !== -1,
    "maybePromptTierUpgrade must check upgradePromptShownSession"
  );
  assert(
    promptFn[0].indexOf("isUpgradeDismissed") === -1,
    "maybePromptTierUpgrade must not call isUpgradeDismissed"
  );
  const closeHandler = packSrc.match(/dialog\.addEventListener\("close"[\s\S]*?\n    \}/);
  assert(closeHandler, "dialog close handler found");
  assert(
    closeHandler[0].indexOf("upgradePromptShownSession = true") !== -1,
    "dialog close must set upgradePromptShownSession"
  );
  assert(
    closeHandler[0].indexOf("dismissUpgradePrompt") === -1,
    "dialog close must not call dismissUpgradePrompt"
  );
});

scenario("index.html loads resume logic before offline-pack.js", function () {
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const logicAt = index.indexOf("assets/offline-resume-logic.js");
  const packAt = index.indexOf("assets/offline-pack.js");
  assert(logicAt !== -1 && packAt !== -1 && logicAt < packAt, "script order");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert(sw.indexOf("offline-resume-logic.js") !== -1, "sw.js SHELL includes resume logic");
});

console.log("");
console.log("Passed " + passed + " scenarios (" + pathToFileURL(logicPath.pathname).href + ")");
