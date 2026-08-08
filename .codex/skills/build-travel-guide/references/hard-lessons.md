# Hard lessons: robustness and speed rules paid for in this repository

Engineering rules for the next guide, each learned from a real defect or a real
measurement in the Japan 2026 guide. Follow them from the start; retrofitting
them cost a full audit. When a new fix in any guide reveals a generalizable
lesson, append it here in the same commit — this file is the skill's memory.

## Offline and the service worker

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
- **Patch rows, don't rebuild lists.** A packing checkbox that re-rendered the
  whole list lost the user's scroll mid-suitcase; the quantity field next to
  it was already surgical. Make the two paths symmetrical from day one.
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

## User documents

- **Fixed trip categories beat free folders.** At a ticket gate nobody
  navigates a tree; Transport / Lodging / Entrances / Personal / Other plus a
  name filter finds "the museum QR" in two taps.
- **A QR is a full-screen artifact.** Render it in a `<dialog>` at maximum
  size with a brightness hint; a thumbnail in a list cannot be scanned.
- **Say where the data lives, in the interface.** "Everything stays on this
  device: nothing is uploaded" in the footer is the difference between a
  feature people use for real documents and one they do not trust.
