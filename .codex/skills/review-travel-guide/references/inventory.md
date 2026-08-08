# App inventory (update when shell changes)

Last aligned: 2026-08 (Japan 2026 / Tabi).

## Views (`data-view` / hash)

| Hash | Label | Primary files |
|------|-------|---------------|
| `overview` | Viaggio | `index.html`, `app.js` |
| `places` | Mappa | `index.html`, `app.js`, `map.js` |
| `experiences` | Attività | `index.html`, `app.js` |
| `history` | Storie | `index.html`, `app.js`, `story-data.js` |
| `food` | Cibo | `index.html`, `app.js` |
| `shopping` | Acquisti | `index.html`, `app.js` |
| `merchants` | Negozianti | `index.html`, `app.js` |
| `itineraries` | Itinerari | `index.html`, `app.js`, `map.js` |
| `progress` | Progressi | `index.html`, `app.js` |
| `saved` | Salvati | `index.html`, `app.js` |
| `phrases` | Parole | `index.html`, `app.js` |
| `translate` | Traduci | `index.html`, `app.js` |
| `emergency` | Emergenze | `index.html`, `app.js` |
| `money` | Contanti | `index.html`, `app.js` |
| `settings` | Impostazioni | `index.html`, `app.js` |
| `packing` | Valigia | `index.html`, `app.js` |
| `notes` | Note | `index.html`, `app.js` |
| `documents` | Documenti | `index.html`, `documents.js` |

Invalid hash → `overview`. Deep link: `?point=<id>#places`.

## Bottom nav

Direct: overview, places, itineraries, translate.  
Menus: Scopri (experiences, food, merchants, shopping, history), Utilità (phrases, emergency, progress, money, packing, documents, notes, saved, **settings**).  
Grip: `tabi-nav-hidden`. Offline tiers only under `#settings` (header ⚙ or Utilità → Impostazioni).

## Header chrome

Search, ⚙ settings (active on `#settings`), ✉ Segnala, theme cycle, Salvati, Install.

## Dialogs / overlays

| ID | Role |
|----|------|
| `searchDialog` | Global search |
| `detailDialog` | Full card / story reader |
| `navMenuDialog` | Scopri / Utilità |
| `feedbackDialog` | Segnala problema/idea |
| `offlinePackDialog` | Confirm tier change |
| `documentViewerDialog` | Full-screen QR/doc |
| `speechDialog` | TTS voice missing |
| `toast` | Status + optional undo |

## Map layers

Static: visit, tabelog, hotel, merchant, **stamp** (~76).  
Facility (OSM): toilet, water, konbini, hospital, station, subway.

## Admission (places + experiences)

Filters: Tutti / Solo gratis / Solo a pagamento. Values: `free`, `paid`, `mixed`.
`mixed` matches Solo gratis only (free main area); **not** Solo a pagamento.
Unset = excluded from filtered lists. Detail cell "Accesso".

## Offline packs

Tiers: Minimo, Medio, Ampio, Massimo. **Primary UI in `#settings`** (`#offlinePackTitle`); `#packing` is checklist-only. Entry: header ⚙ **or** Utilità → Impostazioni. Module: `offline-pack.js`, manifest `offline-pack-manifest.js`, sizes `offline-size-data.js`. Keys: `tabi-offline-tier`, `tabi-offline-job`. Max z15 `url: null` until hosted — must not appear in zoom list (`packAvailable`). Draft tier browsing + explicit Scarica; partial Nascondi keeps job.

## localStorage (user)

`tabi-favorites`, `tabi-done`, `tabi-hidden-v1`, `tabi-itineraries-v1`, `tabi-itinerary-active-v1`, `tabi-current-city`, `tabi-notes-v1`, `tabi-packing`, `tabi-packing-qty-v1`, `tabi-nav-hidden`, `tabi-theme`, `tabi-merchants-start-hidden`, `tabi-offline-tier`, `tabi-offline-job`.

Caches (rebuildable): `tabi-image-cache-v6`, `tabi-weather`, `tabi-jpy-rate`, `tabi-jpy-rate-auto`, `tabi-facilities-v4`, `tabi-cache-ready`.

## IndexedDB

`tabi-documents` — user images/PDFs.  
`tabi-backup` — single-slot backup (survives factory reset).

## Baseline scripts

`check-guide-integrity.mjs`, `check-public-content.mjs`, `check-route-optimizer.mjs`.

## Network scripts (release)

`check-links.mjs`, `check-lodging.mjs`, `check-transfer-stops.mjs`, `check-coordinates.mjs`, `audit-remote-images.mjs`.

## Stories

731 cards in `story-data.js`; build via `build-stories.mjs`; integrity gate in `check-guide-integrity.mjs`.
