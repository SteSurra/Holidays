# Map links that still work on a phone abroad

Every rule here was paid for with a link that opened the wrong place. The guide is
used on a phone, in the destination country, often on a local eSIM: that is a
harsher environment than the laptop the link was written on.

## The one format to use

```
https://www.google.com/maps/search/?api=1&query=<lat>,<lng>
```

This is the only search form Google documents as behaving identically on the
Android app, the iOS app, and the web. Use it for every link whose job is to land
on an exact point: transfer stops, hotels, the user's own position, emergency
screens, and place cards that have coordinates.

Directions use the sibling form:

```
https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=<lat>,<lng>&destination=<lat>,<lng>&waypoints=<lat>,<lng>|<lat>,<lng>
```

Nothing else is contractual. In particular:

- `https://www.google.com/maps/search/<name>/@<lat>,<lng>,17z` is the URL the Maps
  *website* builds for itself. On a phone the link is intercepted by the native
  app, which is only obliged to honour the `api=1` contract — the `@lat,lng,17z`
  viewport is dropped and the name is searched again near the user. A link that
  "works on the computer" then fails on the phone, which is the only device that
  matters at a bus stop.
- `maps.google.com/?q=`, `geo:`, `comgooglemaps://` — legacy or platform-specific.
  Do not publish them.

## Coordinates beat names, and why

Name search is resolved by Google's search engine, and that resolution depends on
the device language, the device region, and where the device physically is. Same
URL, different result:

- 宮島口フェリーのりば, searched from a Japanese-locale phone, opened a result list
  whose first pin sat 911 m from the actual ferry pier.
- "Nagano Station" matched a namesake 140 km from the right one.
- "Takayama Nohi Bus Center" — the name printed on the travel voucher — returns
  *nothing* on Nominatim, because OpenStreetMap calls the same building
  高山濃飛バスターミナル. Two official names for one place is normal, not an error.
- "Smile Hotel Kanazawa" resolves to a hotel 2.5 km from "Smile Hotel Kanazawa
  Nishiguchi Ekimae". Chains reuse names across a city.

So: **if the item has coordinates, link the coordinates.** The place name stays
written on the card next to the link, which is where a human needs to read it.

The one deliberate exception is a link whose payload *is* the Google place card —
today's opening hours, holiday closures, the live rating. A coordinate pin does
not show any of that. In this repo that is exactly one link per merchant ("voto e
orari"), and it is built by a separate function (`mapsSearchByName`) so the
distinction is visible in the code rather than remembered.

## Encoding

- In `query=<lat>,<lng>` the comma may be literal or `%2C`; both work. Coordinates
  are numbers, so they can be concatenated without `encodeURIComponent`.
- Anything containing free text — a place name — must go through
  `encodeURIComponent`.
- In `waypoints` the `|` separators must be encoded; encode the whole joined
  string.
- Inside a string that will be assigned to `innerHTML`, the ampersand is written
  `&amp;`. It is the same URL; any format check must unescape before comparing.

## The 9-waypoint ceiling

A `dir` link accepts an origin, a destination and **at most 9 intermediate
waypoints** — 11 points per link. Above that, either split the walk into several
links or drop stops; either way the interface must say so out loud. Silently
truncating a route reads as "this is your whole walk" when it is not.

## Short links in travel documents

Vouchers often carry `https://maps.app.goo.gl/...`. Resolve them while building
the data — `curl -sIL`, or a fetch that follows redirects, gives back a
`/maps/place/<name>/@<lat>,<lng>,<zoom>/data=...` URL you can read coordinates
out of — and publish the coordinates, never the short link. Short links are
opaque, they expire, and they can redirect through a consent interstitial.

## Geocoding, when you need the coordinates in the first place

- **GSI** (`https://msearch.gsi.go.jp/address-search/AddressSearch?q=`) is the
  Japanese national geocoder and the right primary for Japanese block addresses
  (丁目・番・号), which Nominatim usually cannot parse. Catch: when GSI cannot
  resolve an address it silently falls back to the city centroid. Always assert
  that the returned label contains the expected machi/neighbourhood — otherwise a
  537 m error arrives dressed as a valid answer.
- **Nominatim** is the fallback, and it is good at proper names (in Japanese or in
  romaji) where GSI wants an address.
- **Nominatim and Overpass are different services.** One can be perfectly
  reachable while the other is blocked or refuses connections — as happens in
  sandboxed CI. Report them separately; never conclude "OSM is down" from one
  failing endpoint.
- **Normalize before comparing names, always.** OSM names carry full-width
  characters and spaces even in Japanese — 出町 ふたば for a shop the guide calls
  出町ふたば — and a strict `===` throws away the correct result. Normalize with
  NFKC, collapse whitespace (including U+3000), lowercase. And keep the *acceptance*
  criterion geographic: a radius around a known anchor, never string equality.

## Verification checklist

Scripted, all re-runnable, no personal data:

- `node scripts/check-transfer-stops.mjs` — every stop within its anchor radius,
  plus the completeness list of stops the travel documents name.
- `node scripts/check-lodging.mjs` — every hotel within 300 m of its voucher
  address (a building, not a district).
- `node scripts/check-links.mjs` — every published URL fetched; hard 404/410 fail
  the build, bot-blocks (403/429) are reported as "verify by hand" rather than
  failing, because a red build for a link that opens fine in Safari trains people
  to ignore the check. Also asserts that every `google.com/maps` occurrence in the
  code uses `api=1`.
- `node scripts/check-route-optimizer.mjs` — the walking order is provably the
  shortest.

By hand, in a browser: open one stop link (pin on the station), one hotel link
(pin on the building, not the block), one place link, one `dir` link (a walking
route actually drawn).

What no script can prove: whether the native Maps app on a real phone intercepts
the link and honours it. A simulator has no Google Maps app, so it only exercises
the mobile-web path. The residual risk is covered by Google documenting `api=1`
as cross-platform — which is the whole reason this format was chosen — and that
limit should be stated plainly rather than papered over.
