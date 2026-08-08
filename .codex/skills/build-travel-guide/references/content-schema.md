# Travel Guide Content Schema

## City

Required: stable `id`, display `name`, local-script name when applicable, region, latitude, longitude, route order, and one-sentence summary.

## Place

Required: stable `id`, city ID, name, local name, category, area, recognition-focused description, typical visit duration, practical tip, image-search query, and one or more reliable factual sources.

Target enough meaningful places to cover the actual route deeply, usually eight to twenty per base city and fewer for day trips. Mix essential sights, temples, shrines, sculpture, architecture, neighborhoods, nature, markets, shopping anchors, and quieter discoveries. Put museums and participatory activities in Experiences. Every map visit must resolve to a full guide detail.

## Experience

Required: stable `id`, city ID, name, local name, category, area, duration, booking or access note, description, image-search query, official source, and coordinates when tied to a fixed venue.

Use categories for museums, immersive or theme attractions, workshops, performances, wellness, sports, active nature, food activities, and unusual local experiences. Move existing museum and activity IDs rather than replacing them so saved state survives. Give every mapped experience both Google Maps and an in-site marker deep link. Generic activities without a verified meeting point may omit the marker instead of publishing a misleading coordinate.

## Food

Required: stable `id`, city ID, Italian name, local name, course category, eating context, indicative rating, visual description, primary image-search query, alternate image queries, local-discovery flag, and one or more food-authority or official-local sources.

Use the shared course categories: `primi`, `secondi`, `street`, `dolci`, `contorni`, and `bevande`. Target eight to fifteen items per city where the local cuisine supports it. Duplicates across neighboring cities are acceptable only when the context differs.

Support `all` for nationally available discoveries such as konbini food, ekiben, depachika meals, vending-machine drinks, and common chains. Universal items should remain visible while filtering any itinerary city unless the user explicitly chooses only nationwide results.

## Restaurant

Required: stable `id`, city ID, name, cuisine category, area or district, coordinates, one-sentence recognition description, rating snapshot, and the direct path to the venue's own page on the rating platform.

Select by dish coverage, never by score ranking: one or two addresses for each specialty the stop is actually known for, so that a traveler standing in that city can eat every local dish it is famous for. A celebrated address for a signature dish belongs in the list even when its score sits below better-rated but generic restaurants; conversely a high score never justifies a second entry for a dish already covered. Expect roughly three to eight per stop, scaled by how long the itinerary stays there, and vary course and price band inside each stop.

Use the rating only to choose between candidates for the same dish in the same stop, never to rank unlike cuisines against each other. Ratings on these platforms are compressed: treat 3.5 as already strong and 4 as exceptional, so a 3.1 tsukemen counter can be the right pick for its category.

Store the score as the snapshot it is, label it as a snapshot in the interface, and always link the venue page so that current score, opening hours and booking come from the source instead of from the guide. Platforms such as Tabelog have no public API, block cross-origin reads, and forbid automated collection: the outbound link is the only honest way to keep the number current, so never build a scraper to refresh it.

## Shopping

Required: stable `id`, city or `all`, name, local name, category, where to look, indicative price band, description, authenticity or baggage tip, primary image-search query, and alternate image queries.

Cover craftsmanship, pantry, home and kitchen, textiles, stationery, beauty, fashion, rites and symbols, art, manga and anime, gaming and characters, and technology as relevant. Target at least ten useful categories and enough items to make filters meaningful.

For each shopping item, generate or store guide sections for: why to seek it locally, recognition, where to look, actual scarcity, compatibility and baggage, purchase strategy, and a memorable note. Phrase availability as `domestic-market`, `local edition`, `limited distribution`, or `harder to find in the user's home market`; avoid unsupported absolute claims.

## Remote Image

Required runtime fields: stable item ID, meaningful alt text, local fallback, one primary query, two or more alternate queries, and cached resolution metadata containing URL, creator or source, license label, and landing-page URL.

Use constrained concurrency and retry temporary server failures with backoff. On `429`, cool down that provider and immediately rotate to another catalog. Distribute first-choice providers deterministically by item ID across Commons, Openverse, Japanese Wikipedia, and English Wikipedia. Reject tiny files, SVG logos, maps, flags, diagrams, and obviously irrelevant matches. Audit all queries before release and manually inspect representative beauty, branded merchandise, technology, experiences, and obscure regional foods.

## History

Required: stable `id`, city ID, subject category, display kanji or symbol, title, explanation, memorable anecdote, and one or more cultural-authority or official-local sources.

Target at least six entries per city for a deep guide. Explain how to recognize architectural elements, distinguish religious structures, understand historical layers, connect crafts and food to local life, and behave respectfully. Include memorable, non-disrespectful humor in a separate note.

## Phrase

Required: stable `id`, category, local script, standard romanization, pronunciation approximated for the user's language, meaning, and a practical note. Include official emergency numbers and a source link outside the phrase catalog.

## Lodging

Publish only city, hotel name when explicitly supplied for public use, neighborhood or base, and a general logistics note. Exclude dates, room details, prices paid, booking platform, confirmation codes, and guest names.

## Local Data

When an optional device-only gallery is enabled, store personal photos as compressed blobs in IndexedDB. Store favorites, completion state, nickname, and group label in localStorage. Completion covers places, experiences, foods, shopping, and history and is summarized overall, by domain, and by city. Provide a confirmed one-click reset for completion state only. Export group progress as a versioned JSON document containing only stable item IDs and optional local labels.

## Photo OCR

For an optional sign or menu reader, accept camera or file input, preview locally, lazy-load browser OCR, and recognize local script plus a fallback language. Do not persist or upload the image. Open an external translator only after recognition and an explicit user action, passing the recognized text rather than the photo. Provide a native share option when the browser supports file sharing.

In shared-gallery mode, use authenticated users, a private object bucket, trip membership, photo metadata, row-level authorization, and owner or group-admin deletion as described by the cloud-photo architecture reference.

## Validation

- All IDs are unique and stable.
- Every category has a user-facing label.
- Every remote image has a fallback.
- Remote image metadata includes a source link and attribution.
- Filters return deterministic counts.
- No horizontal overflow at 390 px.
- Navigation restores the top of each view.
- The map initializes only when visible and offers Google Maps plus shareable in-site marker links.
- Every point popup can resolve a lazy photo with attribution and fallback.
- Every visit marker has a full detail link and every route hotel name matches its map marker exactly.
- Every mapped restaurant covers a specialty of its stop, links its own venue page on the rating platform, and shows its score as a snapshot rather than a live value.
- Progress totals equal the union of all five completion catalogs and survive reload on the same browser.
- One action clears all completion state while preserving favorites, and map markers update immediately.
- Place, experience, food, and history details expose their factual sources and do not reuse identical memorable notes.
- The service-worker cache lists every first-party runtime file.
