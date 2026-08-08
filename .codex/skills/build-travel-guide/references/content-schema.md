# Travel Guide Content Schema

## City

Required: stable `id`, display `name`, local-script name when applicable, region, latitude, longitude, route order, and one-sentence summary.

## Place

Required: stable `id`, city ID, name, local name, category, area, recognition-focused description, typical visit duration, practical tip, and image-search query.

Target four to seven meaningful places per city. Mix essential sights, neighborhoods, nature, markets, museums, and quieter discoveries.

## Food

Required: stable `id`, city ID, Italian name, local name, course category, eating context, indicative rating, visual description, image-search query, and local-discovery flag.

Use the shared course categories: `primi`, `secondi`, `street`, `dolci`, `contorni`, and `bevande`. Target eight to fifteen items per city where the local cuisine supports it. Duplicates across neighboring cities are acceptable only when the context differs.

## Shopping

Required: stable `id`, city or `all`, name, local name, category, where to look, indicative price band, description, authenticity or baggage tip, and image-search query.

Cover craftsmanship, pantry, home and kitchen, textiles, stationery, beauty, fashion, rites and symbols, art, and pop culture as relevant.

## History

Required: stable `id`, city ID, subject category, display kanji or symbol, title, explanation, and memorable anecdote.

Target at least three entries per city. Explain how to recognize architectural elements, distinguish religious structures, understand historical layers, and behave respectfully.

## Lodging

Publish only city, hotel name when explicitly supplied for public use, neighborhood or base, and a general logistics note. Exclude dates, room details, prices paid, booking platform, confirmation codes, and guest names.

## Local Data

Store personal photos as compressed blobs in IndexedDB. Store favorites, completion state, nickname, and group label in localStorage. Export group progress as a versioned JSON document containing only stable item IDs and optional local labels.

## Validation

- All IDs are unique and stable.
- Every category has a user-facing label.
- Every remote image has a fallback.
- Filters return deterministic counts.
- No horizontal overflow at 390 px.
- Navigation restores the top of each view.
- The map initializes only when visible and offers direct Maps links.
- The service-worker cache lists every first-party runtime file.
