---
name: build-travel-guide
description: Build or extend a privacy-safe static travel companion website using the Holidays repository pattern. Use when creating a guide for a new trip, country, region, or city; populating itinerary, places, experiences, food, shopping, local merchants with sourced ratings, cultural history, maps, transit layers, saved itineraries and walking routes, lodging bases, offline features, local photos, progress, favorites, photo OCR, or group checklists; or preparing a guide for GitHub Pages.
---

# Build Travel Guide

Create a public travel guide with modular destination data, reliable remote imagery, and an explicit choice between device-only or authenticated shared personal data.

## Intake

Before editing, ask for the minimum missing information in one compact message:

- destination and ordered cities or areas;
- trades the destination is known for, so the merchant catalog is local rather than generic;
- trip style and priorities;
- public hotel names or preferred neighborhoods, if they should appear;
- transport assumptions;
- dietary needs and shopping interests;
- shopping depth by category, including beauty, books and media, gaming, technology, fashion, stationery, home, and food;
- photo mode: device-only, private shared group gallery, or no gallery;
- language, desired content depth, activity interests, and whether a phonetic phrasebook or local photo OCR is useful.

Treat exact dates as optional research context. Never publish dates, booking codes, tickets, identity documents, contact details, personal notes, credentials, or precise live location.

If an existing guide is provided, inspect and preserve its itinerary, hotel names, data shape, visual language, saved-state keys, and offline behavior before changing it.

## Build Workflow

1. Read [references/content-schema.md](references/content-schema.md), [references/research-sources.md](references/research-sources.md), and [references/hard-lessons.md](references/hard-lessons.md) — the engineering rules paid for in past guides; follow them from the first commit rather than retrofitting them. Create or update a destination source ledger before writing content. When any later fix teaches a generalizable robustness or speed lesson, append it to hard-lessons.md in the same commit: that file is this skill's memory.
2. Inventory existing routes, views, datasets, local persistence, maps, and deployment files.
3. Research current facts using the priority order and query recipes in the source registry. Prefer item-specific official pages, then city or prefecture tourism, national institutions, and specialist discovery catalogs. Use image catalogs only for media, never as factual sources. Keep restaurant ratings and opening details separate from cultural or historical claims.
4. Populate cities, places, experiences, foods, shopping, lodging bases, history, and useful phrases with stable IDs, useful descriptions, and source arrays. Keep museums, workshops, performances, theme parks, baths, sports, and bookable activities in an Experiences catalog rather than duplicating them as sights. Every detail must add item-specific recognition, context, practical use, and a distinct memorable note; reject category boilerplate repeated across cards.
5. Choose mapped restaurants by dish coverage rather than by score, one or two addresses per specialty the stop is known for, and store the direct link to each venue's own page so the live score, hours, and booking stay with the source. Categorize food by course and context, including yoshoku, bakery staples, convenience stores, stations, markets, vending machines, and nationally available everyday products when relevant. Add common spelling aliases and local-script names so travelers can find items they remember phonetically. Divide history by city and subject. For shopping, distinguish regional goods, domestic-market models, local editions, and items merely easier to find in the destination. Never promise absolute unavailability elsewhere without evidence.
6. Build a merchant catalog of shopkeepers grouped by the trades the destination is actually known for, three or four per trade, chosen by rating or by being genuinely peculiar. Research every rating against a real listing and store it with its platform, the date it was read, and the venue page when one exists; render it with source and date and link the live page from every card. Where the rating platform does not cover a trade, say so in the card and link a general maps listing. Never write a number the interface cannot attribute, and never infer one from reputation.
7. Let users save the map selection as a named itinerary bound to one stop, and cut one or more routes inside it. Store item IDs only, keep routes constrained to their parent itinerary, restore selections without touching other cities, surface the active selection wherever the map is shown, and say plainly when the live selection has drifted from the saved one. Reuse the existing walking-route builder for external directions and disclose how many stops the external service accepted.
8. Make every saved favourite and completed item expandable in place into the same photo, copy, detail table, and actions as its full card. Build it from the shared card helpers so the two cannot diverge, and render each expansion on demand rather than up front.
9. When photo mode is device-only, keep photos in IndexedDB and state in localStorage with explicit export/import. For a shared gallery, read [references/cloud-photos.md](references/cloud-photos.md) and obtain an explicit access and retention decision before adding a backend.
10. Add a route map, user geolocation only after a button press, a Google Maps link for every mapped item — built as coordinates in the documented `api=1` form, per [references/maps-links.md](references/maps-links.md), which also covers name-search drift on a foreign phone, geocoding, and the 9-waypoint ceiling on walking routes — a shareable in-site link that focuses its Leaflet marker, completion controls inside each relevant popup, and a full detail entry reachable from each popup. Enable wheel, trackpad, pinch, double-click, fractional zoom, and a focused or expanded map mode. Resolve popup photos lazily only when opened. When importing a user map, discard folder descriptions and unrelated logistics, preserve existing points, normalize duplicates, and ingest only public-safe names, categories, and coordinates.
11. Add transit layers when the destination has them, off by default: railway stations under one symbol and colour, and metro stops resolved to their individual line. Derive the line from the station code and operator carried by the open map data rather than downloading route relations, keep a curated table of official line names and colours so the mapping works offline, and fall back to a neutral marker when the line cannot be determined instead of guessing. Show a legend of the lines currently in view, not of the whole network.
12. Load openly licensed remote images lazily with limited concurrency, per-item caching, meaningful alt text, source attribution, at least two alternate queries, retry/backoff, provider cooldowns, deterministic provider rotation, and local SVG fallback. Rotate Wikimedia Commons, Openverse, Japanese Wikipedia, and English Wikipedia; do not keep hammering a provider after `429`.
13. Keep the application installable and the static shell available offline. Do not claim map tiles or remote photos work fully offline.
14. Audit image-query resolution across food and shopping datasets instead of spot-checking. Review unresolved and obviously irrelevant matches manually; do not replace a missing image with a confidently wrong one.
15. Track completion across places, experiences, foods, shopping, and history using stable IDs in localStorage. Show overall, per-domain, and per-city progress; preserve existing keys, provide one confirmed reset for all completion state without deleting favorites, and support versioned export/import without requiring registration.
16. If photo text recognition is useful, keep OCR in the browser, load it only on demand, never persist the image, and send only user-approved recognized text to an external translator. Present browser OCR as text extraction, Google Translate as the default for live camera and offline travel use, DeepL as a second opinion for longer text, and native Live Text where supported.
17. Verify JavaScript syntax, unique IDs, required fields, source coverage, distinct detail copy, mobile width at 320 and 390 px, mobile navigation grouping, filters, saved state, progress totals and reset, image rotation and fallback, attribution, popup photos and completion, marker deep links, wheel and touch map interaction, map resizing, service-worker cache version and its asset token matching the one the page requests, every published link reachable and every map link in the `api=1` form, lodging and transfer-stop coordinates verified against the trip documents, the walking order proved shortest, repository cleanliness, exact lodging-name alignment between route and map, a detail link for every visit marker, every merchant rating carrying its source and date, saved selections restoring without touching other stops, and each saved entry expanding into its full card.
18. Commit and push only when requested or required for the agreed deployment. Keep the repository private until the user explicitly approves public visibility.

## Shopping Depth

Build a discovery guide, not a souvenir list. Cover at least ten relevant categories and give each item:

- what it is and why it is interesting in this destination;
- how to recognize the exact product, technique, edition, or model;
- where to look and what type of seller is trustworthy;
- whether it is local, domestic-market, limited, or simply easier to find;
- price band, authenticity checks, compatibility, baggage, and import considerations;
- one memorable, light, non-disrespectful note when the site's tone supports it.

For beauty, discuss formula variants, ingredients, patch testing, shade, refill formats, and removal method without making medical claims. For technology, require exact model checks for voltage, plug, radio bands, layout, language, region lock, app availability, warranty, and consumables. For manga and gaming, distinguish licensed goods, store bonuses, prize items, random products, used condition, and regional compatibility.

Include compact, travel-safe art when it matches the user's interests: small original paintings, woodblock prints, shikishi boards, washi collage, risograph, miniature screens, and regional decorative panels. Always distinguish original, edition, reprint, and decorative reproduction.

## Borrowed Ratings

Any number the guide did not produce belongs to whoever produced it, and the interface must say so every time it shows one.

- Store the score together with the platform, the date it was read, and the venue page when a stable one exists. A score without those three is not publishable.
- Show source and date next to the number, and put a link to the live listing on the same card. Scores drift within weeks and a static site cannot follow them.
- Do not scrape or re-request a rating platform from the browser to fake freshness. Link out instead.
- When a platform does not cover a category, say so in the card and point at a general listing. Never fill the gap with a number derived from reputation, from a review count, or from another category.
- Keep borrowed scores visually distinct from the guide's own opinions, in colour and in wording, so the two are never read as the same claim.
- Make the rule machine-checkable in the repository's integrity script rather than leaving it to review.

## Phrasebook

Add a final, searchable phrasebook when language support is useful. Each entry should contain local script, standard romanization, an approximate pronunciation for the user's language, meaning, context, and one memorable caution or light note. Include courtesy, orientation, transport, food, shopping, lodging, health, and emergency categories. Browser speech synthesis may supplement but never replace the written pronunciation.

Verify emergency numbers against an official current source. Clearly separate emergency services from visitor assistance and link the official source in the interface.

## Privacy Boundary

Public repository data may contain destination, route order, hotel names, neighborhood bases, general recommendations, and non-personal descriptions.

By default, personal photos, completion state, favorites, nickname, group name, and imported checklists remain device-only. A shared gallery may move selected state and photos to an authenticated backend only after a separate explicit decision covering provider, group membership, retention, access, export, account removal, and deletion.

For an intentionally public gallery, require a clear consent dialog before the file picker opens for every single or batch upload. State that selected photos will be online and visible to everyone. Do not use anonymous unsigned uploads when reliable deletion, abuse prevention, or ownership is required; a static host cannot safely keep administrative deletion credentials in browser code.

Never expose an administrative or service-role secret in frontend code. Public client identifiers may be committed only when the provider explicitly designs them for browser use and row-level access rules are enabled and tested.

## Publication Gate

Before making a repository public or deploying:

- search the repository and Git history for sensitive material;
- confirm no exact dates, booking artifacts, credentials, personal photos, or private notes are tracked;
- show the local result and obtain explicit publication approval;
- verify the final public URL after deployment.
