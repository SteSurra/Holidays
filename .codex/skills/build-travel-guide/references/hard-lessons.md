# Hard lessons: robustness and speed rules paid for in this repository

Engineering rules for the next guide, each learned from a real defect or a real
measurement in the Japan 2026 guide. Follow them from the start; retrofitting
them cost a full audit. When a new fix in any guide reveals a generalizable
lesson, append it here in the same commit — this file is the skill's memory.

## Offline and the service worker

For the on-demand refresh checklist (which pack to rebuild when content changes),
see [offline-packs.md](offline-packs.md).

- **Map tiles are only cacheable with CORS.** A tile layer without `crossOrigin`
  produces `no-cors` requests; the responses are *opaque*, `response.ok` is
  `false`, and a `if (response.ok)` cache guard silently stores nothing. Set
  `crossOrigin: ""` on the Leaflet tile layer, fetch prefetches with
  `mode: "cors"`, and accept `response.type === "opaque"` as a safety net.
  The guide shipped for weeks claiming "297 riquadri salvati" while storing
  zero tiles.
- **Never trust a success message you wrote yourself.** Verify offline claims
  against Cache Storage (`caches.open(...).keys()`), not against the counter
  the code increments. Count `response.ok`, not attempts.
- **Navigations are cache-first, revalidate in background.** Network-first
  means every cold start waits on a slow foreign SIM before painting. The
  cached shell opens instantly; the fresh copy lands in cache for next time.
- **A missing subresource must fail as itself.** Falling back to `index.html`
  for a failed `.js` or `.png` turns a clean miss into a syntax error or a
  corrupt image. Only navigations may fall back to the shell.
- **Updates never reload the page by themselves.** `controllerchange` →
  `location.reload()` yanks the page out from under a reader. Offer a toast
  with a reload action; the new version also applies naturally on next launch.
- **One version token for the files; a STABLE URL for the registration.** The
  `?v=` token must be identical in `index.html`, in `sw.js` (`VERSION` and the
  `CACHE` bump), and in a `RELEASE` constant in `app.js` that signs the
  cache-ready check. But the service worker must be registered at a fixed
  `sw.js` with `updateViaCache: "none"`: putting the token in the
  registration URL made every release re-register the worker at a new
  address, the browser installed it as a second worker, and the update toast
  fired twice in a row. (The original sin was signing cache-readiness with
  `worker.scriptURL` — version the signature, never the URL.) Keep a
  `bump-version` script so a release is one command, and assert both the
  alignment and the URL stability in the integrity script.
- **The SHELL list must be provably complete.** Assert that every asset
  `index.html` requests appears in the service worker precache list; a file
  missing there works online and 404s exactly when the trip needs it.
- **Cache ceilings must fit the feature.** A 320-tile cap under a 297-tile
  prefetch means one session of panning evicts the cities saved on purpose.
- **An errorTileUrl beats a broken-image icon.** Offline, missing tiles should
  render as neutral paper, not as a grid of broken images under floating pins.
- **Never strip the OSM basemap until an offline layer is proven.** After an
  Ampio pack install, `applyOfflineBasemap` used to remove the OSM tile layer
  as soon as a local archive looked present, then call
  `protomapsL.leafletLayer(...).addTo(map)`. If that constructor or first paint
  failed silently, the map stayed blank forever — including after the network
  returned. When `navigator.onLine`, always keep OSM; only when offline, try
  the local PMTiles layer. Create and `addTo` inside try/catch *before*
  removing OSM; on failure keep OSM (`errorTileUrl` paper) and toast once;
  re-run on `online` / `offline` so connectivity flips restore a working base.
- **Local vector PMTiles need FileSource, not a bare blob: URL.**
  `protomaps-leaflet` decides PMTiles vs ZXY with
  `new URL(url).pathname.endsWith(".pmtiles")`. `URL.createObjectURL(blob)` is
  `blob:origin/uuid` — pathname never ends in `.pmtiles` — so the layer is wired
  as a ZXY template and paints nothing. Read the OPFS/IDB Blob via `getMapBlob`,
  wrap with `pmtiles.FileSource` + `pmtiles.PMTiles`, and pass that instance as
  `leafletLayer({ url })`. Do not use `leafletRasterLayer` on Protomaps extracts:
  those archives are MVT (tileType 1), not PNG/JPEG.
- **Match the protomaps-leaflet style key to the library major.** v4 styles with
  `theme: "light"`; v5 with `flavor: "light"`. Passing only `flavor` on v4 leaves
  `paintRules` / `labelRules` empty → transparent canvas tiles after OSM is
  removed (blank map). Pin CDN major + SW `EXTERNAL` together; canvas labels use
  system/`Noto` font families and do not require a separate glyphs CDN, but
  missing web fonts degrade text, not the road fill.
- **A partial offline job is not the active tier.** `tabi-offline-tier` stores
  only a verified-complete plan; `tabi-offline-job` may stay `partial` until the
  user taps Riprendi. Never toast “pronto” from a progress counter — verify
  Cache Storage photo counts and OPFS/IndexedDB map bytes against the manifest.
- **Dismissing a partial pack must not erase the job.** A «Chiudi» /
  «Nascondi» control may hide Riprendi UI, but must never `setJob(null)` while
  status is `partial` — that deletes resumable bytes and forces a full
  re-download. Keep `tabi-offline-job` until the user completes, cancels via
  a deliberate purge, or starts a different target.
- **Tier radios are a draft; confirm is explicit.** Do not open the download
  confirm modal on every radio `change`. Let the traveler browse Minimo /
  Medio / Ampio, show «Scarica piano» / «Riduci piano», and confirm once.
  Dismiss (× / Annulla) clears `draftKey` and restores radios to the active
  tier. Upgrade prompts belong on the Settings view, never at boot over
  Viaggio.
- **Shell reconcile timeout is failure.** A 12s SW reconcile that never
  replies must resolve `{ ok: false, timeout: true }` and abort the pack job
  into `partial` — never treat timeout as `{ ok: true }` and continue.
- **Map packs need versioned URLs and byte checks.** Do not hotlink ephemeral
  planet builds for user downloads; ship `offline-pack-manifest.js` with `url`
  + `bytes`, verify after download, delete corrupt OPFS / IndexedDB files.
- **OPFS `createWritable` is missing on Safari/iOS.** `navigator.storage.getDirectory`
  and `getFileHandle` can exist while `typeof handle.createWritable !== "function"`.
  Detect via `FileSystemFileHandle.prototype.createWritable`. Keep the OPFS path
  on Chrome (seek + Range resume). On Safari, do **not** assemble multi-part packs
  (~195MB Ampio z15) into one in-memory Blob and one `IDB.put`: progress hits
  “100%” after the network while the UI stays busy with no status change, then
  the giant put hangs or OOMs. Download parts sequentially, `IDB.put` each part
  under `file::part::N` plus a `file::meta` record, and let `getMapBlob` return a
  composite `new Blob(parts)` (lazy, no second full copy). Show an explicit
  “Salvataggio mappa…” phase after bytes finish; cap the download bar under 100%
  until verify+promote; time out hung IDB puts and surface errors instead of
  leaving `status: "busy"`. Single-URL smaller packs may still use one Blob put.
  `getMapBlobUrl` / `verifyMapFile` / purge must use that store when OPFS writable
  is absent (and still clear both backends on purge).
- **Confirm and progress MB must be download delta, not full tier size.** Ampio
  z14 is ~203 MB from zero but ~73 MB when photos are already on device. Compute
  `toDownloadBytes` from photos (skipped if `photosAlreadyOnDevice`) plus sum of
  *missing* map pack part bytes (inspect OPFS prefix / `file::part::N` sizes
  against the manifest) — never show the full `TABI_OFFLINE_SIZES` tier label
  as “what you will download” on an upgrade or Riprendi.
- **GitHub Release assets are not fetchable from a Pages PWA (CORS).**
  `github.com/.../releases/download/...` 302s to `release-assets.githubusercontent.com`
  (or similar) with `Accept-Ranges: bytes` but **no** `Access-Control-Allow-Origin`.
  A `fetch` from `*.github.io` fails after the photo phase and looks “stuck”.
  Host packs where GET (and Range) returns ACAO for the Pages origin — e.g.
  `raw.githubusercontent.com` on an orphan branch (`offline-map-packs`), splitting
  files over ~95 MiB because Git rejects ≥100 MiB blobs. Wire the manifest to
  those URLs (commit SHA, not a mutable branch tip). Do not rely on
  `mode: "no-cors"`: opaque bodies cannot be written to OPFS. Surface 401/403/404
  and CORS/`TypeError` as clear Italian errors; show map progress in MB + ETA.
  Prefer parallel Range chunks (about 8 MiB × 4) on fresh large single-URL packs,
  with sequential resume when OPFS already has a prefix.
- **Photo pack skips per item; abort only below the ratio.** Missing Commons
  files become SVG fallbacks offline; fail the job only when fewer than 95% of
  curated photos cache.
- **Verify offline photos by curated URL hits (or pack install meta), never raw
  `cache.keys().length`.** Cache Storage stores one entry per Commons URL;
  many curated items share the same file (here ~609 items → ~443 unique URLs).
  Counting keys against `curatedEntries().length` falsely fails a good Medio
  install (e.g. “Foto in cache insufficienti (443/609)” after a 606/609 pack
  unpack). Count `cache.match` hits across curated URLs (item-weighted), and
  accept a successful `photos_medio` unpack (≥95% of pack manifest entries)
  recorded in localStorage meta.
- **Curated photo packs need a real worker pool, not a paced serial loop.**
  Medio is ~600 Commons redirects (~130 MB). Fetching nearly one-by-one with a
  `wait(120)` throttle (and a misnamed “concurrency” that only gated the pause)
  made wall-clock 10–30+ minutes on fast Wi‑Fi — the bottleneck was request
  count × artificial delay, not bulk bandwidth. Use a small parallel pool
  (about 6) for the Commons photo phase only, drop per-item pacing when the
  pool is live, keep shared `Retry-After` / 429 cooldowns and `AbortSignal`,
  and never apply that pool to OSM tile / map-pack traffic.
- **Many small third-party GETs ≠ bulk MB — ship a photo archive.** Even a
  polite 6-wide Commons pool left Medio around ~20 minutes: hundreds of
  redirects, TLS handshakes, and 429 risk dominate wall-clock, not the ~130 MB
  payload. Build `photos-medio.tar.gz` at publish time (`build-offline-photo-pack.mjs`),
  host it with CORS (same orphan-branch / `raw.githubusercontent.com` pattern as
  map packs; Release CDN alone is not enough), and in the app prefer one
  download + `DecompressionStream('gzip')` + ustar parse into Cache Storage
  under the Commons URL keys. Keep the parallel Commons fetch only as fallback
  when `photos_medio` URLs are null. Progress: bytes for the archive, then a
  brief “Installazione foto…”.
- **Reuse curated photos across Medio → Ampio → Max upgrades.** All three
  tiers share the same `photos_medio` set. Re-downloading ~130 MB on every
  upgrade wastes data and looks broken when the user already finished Medio.
  Before the photo phase, skip the archive (and the Commons fallback pool)
  when curated Cache Storage hits are ≥95% or pack meta is accepted with the
  same published `bytes` and at least some cached responses remain. Still
  download the map pack when that layer is missing; on Ampio → Max only skip
  photos (map files differ). Downgrade Ampio → Medio must purge maps but keep
  the image cache. Status copy: “Foto già presenti — scarico solo la mappa…”.
- **Resume map packs by part size — never restart the full pack on Riprendi.**
  Multi-part Safari/IDB packs (`file::part::N`) often hang after the network
  bar hits ~100% while `IDB.put` / meta write finishes. A naive resume that
  deletes “incomplete” storage or re-fetches every part from index 0 doubles
  wall-clock and burns data. Before each part GET, check that part’s Blob size
  against the manifest; skip complete parts; count already-present bytes in
  progress (start from the resumed offset); write `::meta` only after gaps are
  filled. On mid-download errors keep complete parts (do not `idbDeleteMap` the
  whole set). OPFS with `createWritable` keeps Range resume on the contiguous
  file. `estimateDownloadBytes` / confirm dialog must sum missing part bytes
  (and photos only when `photosAlreadyOnDevice` is false). Status when both
  apply: “Foto già presenti · mappa: 2/3 pezzi già salvati, scarico il resto…”.
- **Never persist a live `busy` offline job across reloads.** `tabi-offline-job`
  survives in localStorage; the in-memory `AbortController` does not. After a
  hung map download (or any crash mid-job), reload showed “Foto già sul
  telefono…” / “Scarico…” with an Annulla that called `jobAbort.abort()` on
  `null` and did nothing forever. On `setupUI` / every render, if status is
  `busy` and there is no live controller, demote to `partial` with
  “Download interrotto. Tocca Riprendi.” and offer Riprendi / Chiudi — never
  Annulla without an AbortController. Cancel must always clear or demote the
  job even when `jobAbort` is null; guard `progress` writers on
  `signal.aborted` so a hung await cannot rewrite `busy` after cancel.
- **Offline tiers live only in Settings, not in Packing.**
  Host the full Minimo/Medio/Ampio/Massimo selector, zoom options, progress,
  and download actions in Impostazioni (`data-view="settings"`). Do not put
  the panel in Valigia / packing — packing is the checklist only. Discoverability:
  header ⚙ **and** a Settings tile in the Utilità menu (same as other tools).
- **Hide map zoom options whose manifest `url` is null.** Do not offer Max z15
  (or any pack) until the release asset exists — show only published zooms.
- **Never leave “Controllo in corso…” as the permanent offline status.** The
  HTML placeholder must be replaced on boot. If `TABI_OFFLINE_PACK` is missing
  (script 404 while Pages is down, precache hole, parse error) or `setupUI`
  throws, paint the four tiers (disabled if needed) and write a warn status —
  an empty fieldset plus the placeholder reads as a stuck spinner.
- **`setupUI` must always paint the four tier radios on first call.** Size
  labels can be empty if measurements are missing; the radios themselves must
  still appear so the panel never looks blank.
- **Preserve draft selection across tier re-renders; confirm is explicit.**
  If `change` rebuilds the radio HTML from `getActiveTier()` alone, the new
  choice is wiped before actions render — “Scarica piano” never appears.
  Keep a `draftKey` for the user’s pending choice and paint checked state
  from that. Do **not** open the confirm modal on every radio change — show
  «Scarica piano» / «Riduci piano» and open confirm only on that CTA.
  Dismiss (× / Annulla) clears `draftKey` and restores radios to the active tier.
- **Never put bare `.primary-action` on a light dialog.** The global class is
  hero cream (`#f1eee5`) with `color: var(--ink)`. On a `.feedback-dialog`
  (paper/white surface) Continua becomes a white pill; in dark theme `--ink`
  lightens and the label vanishes. Scope dialog CTAs like `.dialog-body`:
  ink background / paper text for primary (same token pair as itinerary and
  documents toolbars).
- **Tier confirm: Continua plus Annulla that reverts the draft.** × and
  Annulla must clear `draftKey` and restore radios to the active tier —
  leaving a ghost selection after dismiss desyncs UI from `tabi-offline-tier`.
  Panel-level Annulla (next to Scarica piano) does the same without opening
  the dialog.

## Storage

- **Guard every `localStorage.setItem`.** Quota errors and private browsing
  throw; an unguarded write inside a tap handler aborts the gesture halfway
  and leaves the UI inconsistent. Route writes through a `safeSetItem` that
  evicts the one rebuildable dataset (the image cache) and retries once.
- **Blobs belong in IndexedDB.** localStorage holds ~5 MB and the image cache
  already lives there; user documents, tickets, and photos go to IndexedDB
  with `navigator.storage.persist()` requested and usage shown via
  `storage.estimate()`.
- **Third-party facts get a shelf life.** Facilities scraped from OSM carry a
  TTL (30 days, refreshed on every save, so it never expires mid-trip); a
  konbini deleted upstream must not live forever in the cache. Evicted points
  must also remove their markers — data and presentation age together.
- **Serialize once per burst.** Stringifying a 4000-point cache on every
  arriving chunk is main-thread work a phone can feel; debounce the save.
- **The safety copy lives outside the blast radius of the reset it protects
  against.** "Reset the app" clears localStorage, so the single-slot backup
  lives in its own IndexedDB database and survives by construction — never by
  a list of exceptions someone must remember to maintain. Replace the slot
  with ONE atomic `put` in one transaction (a quota failure rolls back to the
  previous copy instead of leaving none); on restore, replace the risky blob
  store first in one transaction, then the plain keys, then reload — a fresh
  page load is the only trustworthy re-init after bulk state change. Never
  back up cache-readiness signatures: restored stale, they suppress the
  reconcile that keeps the offline copy complete.

## External services

- **Respect `Retry-After` everywhere, not just where it was easy.** The image
  pipeline had per-provider cooldowns while Overpass got instant retries on
  the mirror. Every 429 sets a per-endpoint cooldown (the header's value, or
  60 s).
- **Against a rate limit, cut calls before you tune waits.** A curation pass
  over ~900 items was throttled to 3 items/min — a 4-hour run. Two wrong
  guesses first: the limit is not per host (en.wikipedia and Commons returned
  429 together — it is per IP across the platform) and it is not about the
  User-Agent. The fix was arithmetic: batch what the API batches. MediaWiki
  takes up to 50 titles per `titles=` query and Wikidata 50 ids per
  `wbgetentities`, so per-item metadata and claim lookups collapse into one
  call per 25 items — ~3.5 calls per item became ~1.5, and the run went from
  4 hours to 9 minutes. Only searches stay per item, because nothing batches
  them; skip the ones a previous answer made redundant (don't ask ja.wiki
  when en.wiki already returned a lead image and a QID).
- **A backoff must decay as fast as it grows.** Multiplying spacing by 1.6 on
  every 429 while shrinking it 3% per success meant one bad minute slowed the
  queue for the rest of the run — the throttle outlived the throttling. Pair
  every penalty factor with a comparable recovery factor (×1.6 up, ×0.82
  down) and floor it at a base spacing.
- **`navigator.onLine === false` is truth; `true` is a rumor.** Captive
  portals and dead-but-associated Wi-Fi report `true` — exactly the airport
  scenario a travel guide serves. Therefore shape-validate every 200 body
  before dereferencing it (a maintenance page once masqueraded as weather).
- **Timeout on the client, failover on the mirror, abort on viewport change.**
  A hung request and "found nothing" must not look the same.

## Rendering speed on phones

- **Work happens when it is looked at, not when it is touched.** Views render
  on first entry; mutations to closed views set a dirty flag settled on
  re-entry. Recomputing a closed Progress screen on every heart tap cost tens
  of thousands of comparisons per touch. Bulk operations redraw only the grid
  on screen and force the others to re-render on next open.
- **Leaflet popups are functions, not strings.** `bindPopup(() => html(point))`
  defers ~400 string builds from map-open to popup-open, and a closed popup
  refreshes itself for free; only the popup currently open needs `update()`.
  Look up guide items through a `Map` index — a per-marker linear scan over a
  700-item concat cost ~300k array copies on the first map open.
- **Lasso walking routes exclude stamps.** Stamp markers pass `!point.guideId`
  and would otherwise join the Google Maps walk. Filter `point.type === "stamp"`
  out of lasso selection — collectibles are not visit stops.
- **Clamp long stamp popup bodies on small screens.** Stamp copy concatenates
  description + Dove:; give `.map-popup-body.is-stamp` a max-height + scroll
  so the popup stays scannable at 320px.
- **Patch rows, don't rebuild lists.** A packing checkbox that re-rendered the
  whole list lost the user's scroll mid-suitcase; the quantity field next to
  it was already surgical. Make the two paths symmetrical from day one.
- **Clearing packing qty must uncheck.** Writing a quantity auto-checks; an
  empty field (or zero) must `packed.delete(id)` — otherwise the checkmark
  stays after the traveler clears the number.
- **Packing ids are immutable.** Checkmarks key off `pack-{group}-{slug}`; never
  rename or move ids when enriching the catalog — only add new rows, retag, or
  relabel. Custom items and hidden catalog ids live in
  `tabi-packing-custom-v1` / `tabi-packing-hidden-v1` and must ship in backup
  restore alongside `tabi-packing` and `tabi-packing-qty-v1`.
- **Nothing expensive inside comparators or per-item predicates.** No
  `localStorage.getItem`, no `new RegExp`, no `normalize()` per comparison:
  hoist the query normalization, precompile the word-boundary regex, and
  decorate-sort-undecorate with a score computed once per item.
- **Memoize normalization in boot-time fuzzy joins.** The name→pin matching
  renormalized the same few hundred names tens of thousands of times (NFD +
  regex per comparison) — the single dearest line of startup on a phone. A
  `Map` from raw string to normalized string cut it 5×; the join logic stays
  byte-identical, verified by identical catalog counts.
- **Unobserve before you innerHTML.** An IntersectionObserver holds strong
  references: grids rebuilt on every filter keystroke leak every discarded
  card until the page dies. Disconnect or unobserve before replacing.
- **Third-party CSS must not block first paint.** Google Fonts loads via the
  `media="print" onload` promotion with a `<noscript>` fallback; the precache
  keeps it offline. `font-display: swap` text beats a blank page on 3G.

## Battery and pocket use

- **`backdrop-filter` on fixed elements is a per-scroll tax.** Each blur on a
  sticky header, toolbar, or bottom bar composites over the whole viewport on
  every scroll frame. On phones, replace with semi-opaque fills; keep blur for
  desktop widths.
- **Full-viewport decorative overlays are invisible in sunlight and expensive
  always.** The SVG-turbulence paper grain repaints the entire screen; below
  tablet width it goes off.
- **Dark mode lives in ONE block, driven by a class on the root.** Three
  `@media (prefers-color-scheme)` blocks hundreds of lines apart meant every
  new component silently missed its dark rules. A single `html.theme-dark`
  block (class set by a tiny inline head script, so no light flash) also
  enables a manual system→light→dark toggle — forced light for sunlight,
  forced dark for evenings before the OS switches. Update the theme-color
  metas from the same code path.
- **One shared parser, with the variants as named options.** The same
  pipe-table parser was copy-pasted six times and had drifted into three
  accidental variants (undefined vs "" fill, trimmed cells). The shared
  helper keeps each file's exact semantics as explicit options — and the
  refactor is only done when a byte-for-byte snapshot of the full data model
  before and after says IDENTICAL.

## Touch targets and gestures

- **A gesture that hides chrome starts on its own handle, never on the
  controls it hides.** The swipe-to-hide listener sat on the whole bottom nav:
  a thumb rolling 26 px during a tab tap collapsed the bar instead of
  switching view. Scope the gesture to the grip; the tabs stay tap-only by
  construction, and no threshold tuning can beat that.
- **Invisible hit areas must not overlap the fat-finger band of neighbors.**
  The grip's transparent 92×30 px target floated over the strip where thumbs
  actually land when aiming at the top of the center tabs. Size hidden targets
  so they end at the edge of the sibling control, and give them an `:active`
  state — with `-webkit-tap-highlight-color: transparent` the pill itself is
  the only feedback that says "you hit the handle, not the tab".
- **Every touch sequence ends three ways.** `touchend` is not guaranteed: iOS
  cancels gestures for notifications and palm rejection, and a missing
  `touchcancel` handler leaves the "was swiping" flag armed for the next
  unrelated tap. Handle start/end/cancel symmetrically, and `touch-action:
  none` on the handle so the drag never doubles as a page scroll.

## Data integrity and checks

- **A check that cannot fail is documentation.** The transfer-stop validator
  printed FUORI RAGGIO and exited 0; every violation must set a non-zero exit
  code, or CI green means nothing.
- **Deterministic checks run in CI; network checks stay manual.** The route
  optimizer proof (exact DP vs brute force) is free to run on every push; the
  link/lodging/stop validators hit rate-limited services and are invoked by
  hand before a release.
- **Load-bearing script order gets an assert.** Three data files hand off a
  global (`__JAPAN_PARTIAL__` → `JAPAN_DATA`); the contract lived only in the
  order of `<script>` tags until the integrity script learned to enforce it.
- **One venue, one set of coordinates.** The same shop plotted from two data
  files drifted 90 m apart — two pins on two corners reads as two shops. When
  layers intentionally duplicate a point, reconcile coordinates against OSM;
  the geocoder-verified value wins.
- **Verify coordinates against the map, and test "near me" by faking a
  position — not by faking an IP.** A latitude does not change with where you
  test from, so a VPN in the destination country proves nothing about the
  pins; worse, it feels like a test and is not one, because browser
  geolocation comes from GPS and Wi-Fi, never from the IP address. What can
  actually be wrong is the stored value, so check it: query OSM by the venue's
  NATIVE name (the localized display name means nothing to a Japanese
  gazetteer) and flag anything beyond a few hundred metres — then read those
  by hand, because a park or a mountain legitimately has a centroid far from
  its entrance, and sometimes it is the gazetteer that matched the wrong
  homonym. For the position-dependent features, override the geolocation in
  devtools and drive the real coordinates.
- **A name-joined dataset needs its join audited, not assumed.** Cards get
  their coordinates by matching guide names to map points at boot; a miss
  silently downgrades the link to a name search (which drifts on a foreign
  phone) and a false hit sends the traveler to another venue entirely. Count
  both: how many items ended up with no point, and every match that was not
  an exact name equality — the inexact ones are short enough to read one by
  one, and that reading is the only proof the join is sound.
- **Init never dies of a renamed id.** `getElementById(...).innerHTML` chains
  at startup turn one HTML rename into a blank app. Write and listen through
  guards that warn and continue.
- **Packing rows are exactly six pipe fields.** Schema is
  `slug|qty|note|contexts|bag|tip`. An extra `|` between note and bag (easy
  when contexts is empty) shifts bag into tip: power banks lose `solo_mano`,
  notes land in context tags, and mano/stiva filters lie. Assert field count,
  bag enum, and context tags in the integrity script; never rename existing
  `pack-{group}-{slug}` ids — checkmarks are keyed by id, so a retitle is
  fine and a slug/group move is a silent data loss on update.

## Geolocation UX

- **Three failures, three remedies.** PERMISSION_DENIED, POSITION_UNAVAILABLE
  and TIMEOUT each get their own message; only one of them is fixable in
  browser settings, and a merged message helps with none.
- **Buttons recover from errors.** A locate button frozen on "Posizione non
  disponibile" forever is a dead end; reset it after a few seconds and put
  the detail in a toast.
- **`watchPosition` needs a real error handler.** An empty one leaves the
  blue dot frozen at the last fix — confidently wrong is worse than absent.
  On error, stop following and say so.
- **Offline "not yet" is not an error.** A facility layer toggled with no
  network must keep its switch on with an honest message, not untick itself;
  the area loads by itself when the network returns.
- **Facility packs live in IndexedDB, not localStorage.** Pre-seeding ten
  thousand OSM nodes into `localStorage` blows the quota and slows every boot.
  Ship a gzip JSON pack (~130 KB for trip bubbles) with every offline tier from
  Minimo upward — small enough to download on confirm, useful on the map even
  before Ampio tiles — load it into memory once, and keep Overpass only for
  online gaps outside the trip bubbles.
- **A verified tier can still be incomplete after new pack components ship.**
  `tabi-offline-tier` promotes only after `verifyJobComplete`; users who
  installed Ampio before facilities existed keep a “complete” tier with no
  facility blob. On boot, compare `estimateDownloadBytes(activeKey)` to zero —
  if positive while tier matches, prompt once per session (× or dialog close
  sets a session flag only — re-prompt on every cold boot until download) with
  confirm copy and `runJob` on the same key so photos/maps
  skip via existing resume logic. Status must not say “completo” when bytes
  remain; offer “Scarica aggiornamento” in the panel.

## Representative photos

- **Search rank is not iconicity — the encyclopedia's own choice is.** A
  Commons full-text search for "Osaka castle" ranks a moat-and-office-towers
  shot first and an Italian tourist's garden upload as the top "relevant"
  hit; the article's lead image and Wikidata's P18 are curated by humans to
  BE the representative view. Resolve images at build time through that trust
  cascade (article lead → P18 → scored search as last resort), store the
  chosen file per item id, and let the runtime search survive only as a
  fallback for the uncovered tail.
- **Never gate relevance on the localized display name.** Requiring the
  Italian "castello" in file titles rejected every good English-titled
  candidate and left only amateur uploads with Italian names. Key terms come
  from the search query written in the titles' language (and the native name
  for CJK titles), with diacritics folded ("Sensō-ji" ≈ "Sensoji") — but
  compact substring matching needs a minimum key length, or "sky" matches
  "Skytree".
- **Grep the chosen filenames; the eye slides over what the text makes
  obvious.** Reviewing ~170 images by sight caught seventeen wrong ones and
  still missed "Entrance of Warner Bros. Studio Tour **London**" on a Tokyo
  card — it looked exactly like what it should have been. One regex over the
  picked filenames for wrong-medium words (plan, sketch, drawing, diagram,
  map, detail, poster) and wrong-place words (London, Berlin, Paris, Cornwall,
  Seoul…) found it in a second, plus a Berlin monument standing in for a
  Hiroshima bike ride. Run both passes: eyes for "is this the iconic view",
  text for "is this even the right subject". Then push both word lists into
  the resolver so the next run never proposes them.
- **A generic subject needs a second proof.** For categories rather than
  proper nouns (a dish, a product type, a craft), one shared word between
  query and article title is coincidence: "Japanese pottery shop" matched
  "Leach Pottery" and put a Cornwall museum on a Japanese ceramics card.
  Require two significant words, or the native-language name, before trusting
  an article — and keep the single-word rule only for named places.
- **A curated pick is a promise: verify it like one, and version the cache.**
  The audit HEAD-checks every stored file and fails loud on a broken one
  instead of falling back to search; and when curation replaces a live-search
  cache, bump the cache key — 650 stale wrong choices otherwise survive on
  every returning device.
- **Shopping cards sell objects, not storefronts.** A Commons hit for
  "Pokémon Center" or "Jump Shop" often returns the building or a display
  aisle — readable as a place, useless as a product photo. For merch rows
  without an official press image, `null` in `image-overrides.json` beats a
  curated storefront; grep filenames for `head office`, `store`, `facade`,
  `entrance`, and wrong-country words before shipping.

## Writing the guide with agents

- **A research ledger date can fail the public-content gate.** The repository
  bans exact ISO `YYYY-MM-DD` everywhere tracked files can appear, including
  workbench notes under `story-work/`. Store retrieval timing as `YYYY-MM` or
  prose months in ledgers; keep day precision only outside the repo if needed.
- **Story corpora need a merge build, not hand-edits of the ship file.**
  `assets/story-data.js` is generated from `story-work/batches/**/*.json` plus
  a seed of existing cards. Compute and validate the full merge in memory,
  refuse to write if the corpus shrinks, then write once — or a failed batch
  wipes hundreds of handwritten place stories.
- **Coverage gates arm per domain when that domain hits 100%.** Soft-warn on
  any domain still open while another is being authored; once a domain is
  complete, put it in `STORY_COVERAGE_HARD` so a new catalog row without a
  story fails CI instead of shipping a templated card. Food (212) and
  shopping (124) both joined the hard set after their handwritten passes.
- **Story sources must be HTTPS, not merely “a real URL”.** `build-stories`
  rejects any `http://` source even when the card already has two valid
  HTTPS cites — a manufacturer homepage that still redirects from plain HTTP
  will fail the whole merge. Normalize to `https://` or swap in a tourism /
  association / encyclopedia HTTPS page before writing the batch.
- **Food (and shopping) deep stories must invent section titles.** `enrichFood`
  / `enrichShopping` ship fixed template headings ("Come riconoscerlo", "Che
  sapore aspettarsi", …). A handwritten story that reuses those titles looks
  "done" in the data file and still reads like the template on the phone.
  Custom narrative titles are part of the contract, not decoration.
- **Parallel batch writers need one inventory pass before merge.** City agents
  can finish "their" file and still leave a sibling city at zero. Reconcile
  `story-status --missing --domain=…` against every batch on disk before
  running `build-stories.mjs`; the merge path is single, the gap check is not
  optional.
- **An exact-match uniqueness check licenses the repetition it cannot see.**
  The integrity script refuses two cards that share a whole sentence, and
  every card passed it — while a third of the guide closed on the same joke
  shape ("probably the only X in the world"). Repetition arrives as
  paraphrase, and no string comparison catches paraphrase. Budget a reader
  whose only job is to read the cards in a row, hand it the corpus already
  shipped AND the rules the automated check enforces, and let it say what the
  check structurally cannot. Then rewrite in batches that each see what the
  previous batches wrote, or the replacements converge on a new single shape.
- **The reviewer's justification is not the traveler's description.** A
  selection pass produces text aimed at whoever ordered the selection —
  "for this reason medium and not high", "it turns the castle card into a
  chapter", "the guide already has". Piped straight into a data field it
  ships to someone walking with a phone. Convert it deliberately, and have
  the importer refuse to write when it still smells of the review.
- **Compute every file before touching any of them.** An importer that wrote
  the places, then failed to find the experiences table and exited, left
  twenty-four cards with no map point and no activities — a half-written
  dataset that passes no check and is harder to diagnose than a clean
  failure. Build all outputs in memory, verify every anchor exists, then
  write.
- **A handwritten story is not on the phone until every enrichment path
  applies it.** `enrichAll` ran `applyStory` on the curated catalogs, then
  `enrichMapPoints` created twenty-four more guide items from visit pins
  and stopped at the category model. The stories for those IDs sat in
  `story-data.js`, integrity counted the keys, and the cards on the phone
  stayed templated. Any path that invents a guide item after the main pass
  must call the same story apply — or run one apply over the whole catalog
  at the end.
- **Anchor a validation to the specific subject, never to its category.** The
  stamp check measured each castle stamp against *any* castle in the same
  city: one stamp was judged against a castle thirty-seven kilometres away,
  and legitimate stamps were rejected because the guide happens not to list
  their castle. Match by native name, and when there is no match fall back to
  something the journey actually touches — including the transfer stations,
  because a stamp can sit in a station you only change trains at.
- **Agent runs are expensive and their cache is scoped to the session.**
  Resuming a workflow in a new session silently re-runs the research instead
  of replaying it. Persist every raw result outside the session as soon as it
  lands, and generate follow-up scripts with the data embedded rather than
  passed as arguments: the run then reproduces anywhere, and the payload never
  crosses the context window twice.

## Photo translation

- **In-app OCR pipelines age poorly; the user's AI app does not.** Tesseract
  from a CDN plus a hand-built handoff to a translator broke silently and
  added the only dependency the service worker could not precache. Instead:
  capture the photo, then hand it to the AI app the user already has via the
  Web Share API (`navigator.canShare({files})`) with a prefilled prompt;
  fall back to copy-to-clipboard plus opening the assistant. The photo
  leaves the device only by the user's explicit share gesture — the app
  itself never uploads anything. Keep a plain text deep link
  (`translate.google.com/?sl=…&tl=…&text=…`) for typed translation.
- **"Open in the app" means the app, not the website.** On Android use
  `intent://host#Intent;scheme=https;package=…;S.browser_fallback_url=…;end`
  — it opens the installed app and falls back to the site by itself. On iOS
  navigate to the app's custom scheme and arm a ~1.4 s timer that goes to
  the site only if the page never went hidden (hidden = the app opened).
  On phones, wait up to a second for the clipboard write to land BEFORE
  deep-linking: navigating away too early leaves the clipboard empty. There
  is no reliable way to feature-detect an installed app from the web — the
  fallback is the design, not an apology.
- **Walking `dir` links need the same app-first tap handler.** A published
  `https://www.google.com/maps/dir/?api=1…` href is correct for desktop and CI,
  but `target="_blank"` from a PWA often opens the mobile web instead of Google
  Maps. Intercept taps on multi-stop walk links only: Android
  `intent://…#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=…;end`,
  iOS `comgooglemapsurl://` plus a ~1.4 s hidden-page fallback to the https URL.
  Keep single-pin `search` links as plain `api=1` anchors.

## Reader tabs (history / stories)

- **A chapter intro beats a cold grid.** For anthologies (history/stories),
  put one featured piece for the current stop above the cards — large kanji,
  title, two-sentence teaser from `long`/`explanation`, CTA into detail —
  so the tab reads as a book, not another filterable catalogue.
- **Category spine in addition to selects.** Thumb-height horizontal chips
  for subject filters matter more than a second `<select>` buried behind
  "Filtri"; keep the select for parity and sync both ways.
- **Anecdotes are marginalia, not twin cards.** Style "Da ricordare" as an
  italic pull-quote with a thin gold rule, never another gray box that looks
  like the description block above it.
- **Related places v1 is a curated map, not a graph.** A small
  `historyId → [place|experience ids]` table plus same-city slug overlap
  covers the obvious bridges (Togakushi, Fushimi, Itsukushima) without
  inventing a full knowledge graph; omit the section when nothing matches.
- **Detail as vertical reading flow.** History detail keeps the kanji hero
  and `guide-intro`, then stacks sections in a single column with light
  numbering — drop the 2-column card grid that works for place practicalities
  but fights long cultural prose on a phone.

## User documents

- **Fixed trip categories beat free folders.** At a ticket gate nobody
  navigates a tree; Transport / Lodging / Entrances / Personal / Other plus a
  name filter finds "the museum QR" in two taps.
- **A QR is a full-screen artifact.** Render it in a `<dialog>` at maximum
  size with a brightness hint; a thumbnail in a list cannot be scanned.
- **Say where the data lives, in the interface.** "Everything stays on this
  device: nothing is uploaded" in the footer is the difference between a
  feature people use for real documents and one they do not trust.
- **Collapse rows when the label is already enough.** A document list shows
  the file name on every row; start collapsed like saved favourites and load
  thumbnails and object URLs only on first expand — a wall of previews is
  noise at the gate.
- **Preserve `expandedId` across document `render()`.** Search and category
  changes rebuild the list and revoke object URLs; without remembering the
  open row id, expand collapses mid-edit. Re-open that id after paint (or
  clear it if the row is filtered out).

## Developer feedback

- **mailto beats a backend for a static guide.** A two-step sheet (problem vs
  idea) that opens the user's mail client with subject and body prefilled
  captures item context without a server, analytics SDK, or extra form fields.
  Offer a clipboard fallback toast: some phones have no default mail app.
- **Never assign `location.href = mailto` in a PWA.** That can unload the
  standalone webview and lose the open detail. Prefer a temporary
  `<a target="_blank" rel="noopener">` click (or `window.open`); keep the
  clipboard toast as fallback.
- **Device-gate honesty beats a fake hardware pass.** Without a physical phone,
  maximize coverage with Playwright mobile emulation (390/360, light/dark) plus
  code-path checks for Web Share, real `tel:`/`mailto` apps, pack GB downloads,
  and standalone safe-area. Record `emulated-pass` / `code-verified` /
  `blocked-needs-hardware` / `fail` in `qa/DEVICE-GATE.md` — never mark A2HS,
  share sheet, or airplane tiles green from headless Chromium alone. Runner:
  `qa/device-gate-playwright.mjs`. Keep result dates as `YYYY-MM` prose so
  `check-public-content` does not fail the QA artifacts.
- **Assemble the developer address at runtime.** `check-public-content.mjs`
  rejects literal email strings in tracked files; `["user", "domain.tld"].join("@")`
  keeps the inbox out of the public repo while still enabling mailto links.
- **Segnala in header, errore in scheda.** A global ✉ in the site header opens
  app-level feedback (problem or idea) from any view; Impostazioni is header ⚙
  **and** a Utilità menu tile (offline tiers are otherwise hard to find).
  Inside an item detail sheet, use the same ✉ glyph with fixed copy
  **Segnala un errore**; item context still rides in the mailto body via
  `data-id`, not in per-type link text.

## Story batch merge order

- **Later sorted path wins for the same story id.** `build-stories.mjs` walks
  `story-work/batches/` in lexicographic path order and overlays each id; a
  newer fix batch named `zz-…` loses to an older `zz-…-strict` if the strict
  name sorts after. Prefix late overlays `zzz-` / `zzzz-` (or date-stamp past
  siblings) when they must beat prior paraphrase batches, then re-grep the
  mould after build — three food fun titles came back until the moulds file
  was renamed; a later non-food fun-title pass needed `zzzz-` to sit after
  `zzz-paraphrase-moulds`.
- **Fun-title moulds span domains.** Clearing `Il/La/Lo X che…` on food leaves
  the same factory on place/experience/history/shopping; inventory by domain
  and break article + relative `che` with item-specific labels, not a second
  shared syntax.

## Access facts (free / paid / mixed)

- **Access is a researched structured field, not prose derivation.** Tip,
  booking copy, FREE_ENTRY-style regexes, and category defaults
  ("temples are paid", "parks are free") are not evidence. Publish
  `admission: free|paid|mixed` only after an official venue or municipal /
  national tourism page confirms the main visit; leave the field unset while
  pending so gratis/pagamento filters never claim certainty. Never store yen
  or price bands on the card — only the access class. Mixed sites
  (free precinct + paid garden/museum) need the `mixed` value, not a guess
  toward free or paid.
- **Public-open beats explicit-Free-only for Solo gratis UX.** When an
  official venue or city/tourism page (GO TOKYO, JNTO, municipal) describes
  open public access to the main visit area and does not state an entrance /
  拝観料 / 入場料 requirement, classify `free`. Do not leave forever-pending
  just because the page never prints the word “Free”. Use `mixed` when the
  same place has a documented paid sub-area; leave `guide-map-visit-*`
  synthetics pending until promoted to a persistable row.
- **Filter: `mixed` belongs in Solo gratis, not Solo a pagamento.** Matching
  `item.admission === "mixed"` for every non-`all` filter wrongly lists free-
  main venues under paid-only. Implement
  `admission === filter || (filter === "free" && admission === "mixed")`.
- **Experience admission is the last column, after optional `sourceKey` and
  `setting`.** Appending `free|paid|mixed` directly after `lat|lng` on a
  short experience row writes the class into `sourceKey`, so the parser
  never sees `admission` and the card stays pending. Match verified Kyoto
  rows: `lat|lng|||admission` (empty sourceKey + empty setting) or
  `lat|lng||outdoor|admission` when setting is set. Re-check live
  `item.admission` after edits — a trailing token in the pipe is not enough.
- **Closeout requires admission except a tiny structural allowlist.** After
  city batches finish, integrity must fail on any non-allowlisted place /
  experience missing `free|paid|mixed`. Keep pending only for
  `guide-map-visit-*` synthetics and curated no-venue generics without a
  single official admission page — never invent classes for those just to
  clear the counter.
