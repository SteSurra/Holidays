# Offline pack refresh (on demand)

Offline map, photo, and facility archives are **large, rate-limited, and expensive
to build**. They are **not** rebuilt on every content push and **not** gated in CI.
Refresh them only when the trigger matrix below says so, then publish to orphan
branches on demand.

For CORS, byte verification, resume, and client UX rules, see
[hard-lessons.md](hard-lessons.md) (Offline and the service worker).

## What does not auto-rebuild

- **No CI pack build.** Deterministic integrity checks run on every push; planet
  PMTiles extracts and Overpass facility scrapes do not.
- **Shell / JS / CSS / story text alone** do not touch orphan branches. Story
  merges and catalog edits that change no curated photo URL and no geo bubble
  need no pack work.
- **Publishing a new manifest on `main` does not rebuild server packs.** It only
  points clients at URLs that must already exist on the orphan branch.

## Client gap prompt (not a server rebuild)

After `assets/offline-pack-manifest.js` ships on `main` with a shell bump,
users who already completed a tier may see a boot prompt or **Scarica
aggiornamento** in Impostazioni when `estimateDownloadBytes(activeKey) > 0`
(e.g. a new `facilities_ampio` component was added to the manifest). That flow
downloads missing bytes from the published URLs — it does **not** run build
scripts on the server. See hard-lessons: *A verified tier can still be
incomplete after new pack components ship.*

## Trigger matrix

| Change | Pack action | Size data |
|---|---|---|
| Shell / JS / CSS only | `node scripts/bump-version.mjs` | No |
| Curated images or `image-data` / overrides change which Commons files Medio uses | Build + publish **photo** pack; update manifest | Re-run measure (photos) |
| `scripts/offline-pack-regions/ampio-tappe.geojson` or trip bubble geometry changes | Rebuild **maps** (region extracts) **and** **facilities** | Re-run measure (maps + facilities) |
| OSM facility refresh inside existing bubbles (shops, ATMs, etc.) | Build + publish **facilities** only | Re-run measure (facilities) |
| Protomaps planet / tile source refresh, or Ampio/Max extract policy change | Rebuild **maps** (`measure-offline-packs.mjs --maps-only`); publish | Re-run measure (maps) |
| Story / history / food / shopping text only; no photo or geo change | **No pack** | No |
| New offline tier component wired in manifest (e.g. first ship of facilities) | Publish that component if not already on orphan branch; commit manifest on `main` | Re-run measure |

**Maps cost notes**

- Ampio extracts use `ampio-tappe.geojson` (stops corridor). Max tiers use a
  Japan bbox from the measure script.
- `max_z15` (`japan-z15.pmtiles`) is multi-GB; publish may use
  `--skip-max` until hosted. The manifest may set `url: null` for unpublished
  zooms — the UI must hide options with no URL (hard-lessons).
- `PROTOMAPS_SRC` and `PMTILES_BIN` env vars override the default planet URL
  and `go-pmtiles` binary in `measure-offline-packs.mjs`.

## Commands and orphan branches

All browser-facing packs use **`raw.githubusercontent.com`** pinned to a **commit
SHA** on an orphan branch. Do **not** point the manifest at GitHub Release
download URLs (no CORS). Legacy `scripts/publish-offline-packs.mjs` targets
Releases for human mirrors only — the PWA uses the CORS publishers below.

### Photo pack (`offline-photo-packs`)

```bash
node scripts/build-offline-photo-pack.mjs
node scripts/publish-offline-photo-pack.mjs          # --dry-run first
```

Output: `tmp/offline-packs/photos-medio.tar.gz` (+ `.meta.json`). Publisher
updates `photos_medio` in `assets/offline-pack-manifest.js`.

### Map packs (`offline-map-packs`)

```bash
node scripts/measure-offline-packs.mjs --maps-only   # extracts → tmp/offline-packs/
node scripts/publish-offline-map-packs-cors.mjs      # --dry-run; --skip-max if needed
```

Publisher splits files over ~95 MiB (Git blob limit). Flags:
`--write-manifest-only <sha>` rewrites manifest from an already-pushed orphan
commit.

### Facility pack (`offline-facility-packs`)

```bash
node scripts/build-offline-facility-pack.mjs         # Overpass; respect rate limits
node scripts/publish-offline-facility-pack-cors.mjs  # --dry-run first
```

Output: `tmp/offline-packs/facilities-ampio.json.gz` (+ `.meta.json`).

### Size labels (UI tier totals)

```bash
node scripts/measure-offline-packs.mjs               # full ledger
node scripts/measure-offline-packs.mjs --photos-only
node scripts/measure-offline-packs.mjs --skip-maps
```

Writes `story-work/offline-size-ledger.json`, `story-work/offline-size-ledger.md`,
and **`assets/offline-size-data.js`** (`TABI_OFFLINE_SIZES` for the settings UI).

## Standard publish workflow on `main`

1. Build the affected pack(s) into `tmp/offline-packs/`.
2. Publish to the orphan branch (`publish-offline-*-cors.mjs` or
   `publish-offline-photo-pack.mjs`). Confirm dry-run output.
3. Ensure **`assets/offline-pack-manifest.js`** reflects the new SHA(s), URLs,
   and byte counts (publish scripts usually write this).
4. Re-run **`measure-offline-packs.mjs`** when tier totals or component sizes
   changed; commit `offline-size-data.js` and ledger files if updated.
5. Commit manifest (and size data) on **`main`**.
6. **`node scripts/bump-version.mjs`** — manifest and size scripts are shell
   assets loaded by `index.html`; existing installs need a new SW generation to
   see the gap prompt and **Scarica aggiornamento**.
7. Push **`main`**. Orphan-branch pushes are separate (`git push origin
   offline-map-packs` etc., often done by the publish script).

## After publish — what users need

| User state | What happens |
|---|---|
| Never installed offline | New manifest + sizes in fresh shell; download as usual |
| Partial / interrupted job | Riprendi uses resume logic; no extra server step |
| Tier marked complete but manifest gained a component | Boot gap prompt or panel CTA downloads only missing bytes |
| Shell not updated (no bump) | Old SW may not load new manifest; gap prompt never appears |

## Quick checks

- `node scripts/test-offline-resume.mjs` — resume, gap prompt, and manifest wiring.
- `node scripts/check-guide-integrity.mjs` — shell token alignment after bump.
- Do not commit multi-GB `tmp/offline-packs/*.pmtiles` to `main`; only manifest
  URLs and byte metadata live in the repo.
