# QA test matrices

Apply subsets of these in every phase; record which matrix was used in each finding.

## Viewports

- 320px — minimum width
- 360px — small Android
- 390px — iPhone class
- 430px — large phone / label hiding threshold
- Landscape phone — nav, toast, map actions

## Theme

- `light` — `tabi-theme` = light
- `dark` — `tabi-theme` = dark
- `auto` — follows `prefers-color-scheme`
- FOUC check on cold start (inline head script before CSS)

## Network

| Mode | How | What to verify |
|------|-----|----------------|
| Online | normal | weather, images, facility fetch |
| Airplane | after warm cache | shell, phrases; honest map/photo limits |
| Fake online | block hosts / throttle | banner vs failed fetches |
| Wi‑Fi | real device | offline pack download (Medio/Ampio; Max z14 large) |

## Persistence profiles

| Profile | Contents |
|---------|----------|
| Clean | no localStorage / fresh profile |
| Dirty | favorites, done, hidden, itineraries, notes, packing, offline tier/job |
| Post-reset | factory reset; theme + docs + backup survive |
| Private / incognito | quota and `safeSetItem` behavior |

## Motion

- `prefers-reduced-motion: reduce` — nav, detail soft-in, toast

## Device gate (mandatory before trip)

| Capability | iOS Safari | Android Chrome |
|------------|------------|----------------|
| PWA standalone | Add to Home | Install |
| Web Share (translate photo) | | |
| Clipboard + deep link fallback | | |
| TTS ja-JP | speech dialog if missing | |
| `tel:` emergency | | |
| Geolocation one-shot | deny / allow / timeout | |
| Safe area / home indicator | notch device | |
| Offline pack download | Wi‑Fi | Wi‑Fi |

Mark findings `device-pending` until verified on hardware.

## Catalog filter matrix (per list view)

For each of places, experiences, food, shopping, merchants, history:

- search: 0 / 1 / ≥2 chars / no results
- each filter dimension × empty state × show-more
- favorite + done (where applicable) + open detail
- admission filters (places, experiences only): all / free / paid; mixed in both; pending excluded

## Cross-state stress (phase 8)

Combine: done + favorite + hidden + active itinerary + city filter + offline + dark + nav collapsed + active offline tier.
