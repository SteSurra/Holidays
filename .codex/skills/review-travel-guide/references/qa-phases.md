# QA phases — exhaustive checklist

Run in order. Mark each item pass/fail in `qa/CHECKLIST.md`.

## Baseline

- [ ] `check-guide-integrity.mjs` pass (stories 731, admission allowlist, SW/shell `?v=` alignment)
- [ ] `check-public-content.mjs` pass (no ISO `YYYY-MM-DD` in tracked files / ledgers — use `YYYY-MM`)
- [ ] `check-route-optimizer.mjs` pass

## Phase 0 — Boot, chrome, routing, PWA

- [ ] Cold start: no theme FOUC; fonts non-blocking
- [ ] Skip link focuses `#main`
- [ ] Header: search, ⚙, ✉, theme, Salvati, Install (when prompted)
- [ ] ⚙ active on `#settings` only (offline lives here)
- [ ] Every valid hash opens correct view incl. `#settings`
- [ ] Invalid hash → overview; browser Back between views; brand → overview
- [ ] Bottom nav 6 tabs; active state; grip hide/show (`tabi-nav-hidden`); grip does not steal center tab taps
- [ ] Scopri / Utilità menus; back returns to menu origin
- [ ] Utilità includes **Impostazioni** tile (offline tiers); Cosa portare = valigia only
- [ ] Offline banner wraps on 320/360 (no nowrap clip); safe-area vs header/nav/toast
- [ ] `?point=` cleaned when leaving places; refocus on back to `places?point=`
- [ ] SW registers `sw.js` stable URL; single update toast; Ricarica works
- [ ] Manifest shortcuts: emergency, phrases, places
- [ ] Toast above nav; undo 6s / plain 1.8s

## Phase 1 — Overview

- [ ] City picker "Sono a" persists `tabi-current-city`
- [ ] Weather ok / fail / cache / offline
- [ ] Day tips + sunset
- [ ] Route strip horizontal scroll
- [ ] Transfer + stay → Maps `api=1&query=lat,lng`
- [ ] Kit cards readable at 320px
- [ ] Dark mode

## Phase 2 — Mappa (+ stamps + admission places)

- [ ] Locate allow / deny / timeout
- [ ] Fit trip; layer panel; map resize expanded
- [ ] Layers: visit, tabelog, hotel, merchant, **stamp** (legend hints trip-wide stamps)
- [ ] Stamp popup: counter, source, own photo or none; long body scrolls inside clamp
- [ ] Facility layers: online fetch; offline honest message; subway legend in view
- [ ] `#placeAdmission`: all / free / paid; **mixed in gratis only, not paid**; pending excluded; reset filters; tags on cards
- [ ] Popup: lazy photo, details, done, hide/show, Maps coords, deep link `?point=` cleared on leave
- [ ] Lasso walking route; **stamps excluded**; >11 stops trim + disclosure
- [ ] Selection `tabi-hidden-v1`; merchants start-hidden; select/deselect filtered
- [ ] Nearby; place search/filters/empty/show-more
- [ ] Wheel/pinch/dblclick; dense markers
- [ ] Cards below map: done stamp, favorite, detail, focus

## Phase 3 — Cataloghi + Storie

**Experiences:** admission filter same rules as places (`mixed` in free only).

**Food / shopping / merchants:** search × filters × empty × show-more; shopping product photos not storefronts.

**Storie (`#history`):** reader intro; chapter for current city **only if featured story is in filteredItems**; category rail sync; "letta"; vertical detail (kanji hero, pull-quote, related places).

**Detail (all types):** story sections, glossary, sources, Maps, Tabi focus, Segnala contestuale, Accesso if set; scroll reset between items.

**Map-derived samples:** `applyStory` not empty template; admission pending OK.

## Phase 4 — Itinerari

- [ ] Create from map selection per city
- [ ] Apply / sync / delete; nested routes; active state
- [ ] Drift → "Rimetti la selezione"
- [ ] Auto-route proximity / GPS
- [ ] Walking Google CTA; waypoint trim
- [ ] Other cities untouched

## Phase 5 — Progressi + Salvati

- [ ] Progress totals; area/city; jump; reset progress only (favorites remain)
- [ ] Saved chips; expand in-place = detail body
- [ ] Off-map favorites without coords
- [ ] Export/import checklist merge (v1/v2)
- [ ] Merchant "Rimetti tutti" warning

## Phase 6 — Traduci, Parole, Emergenze, Contanti

- [ ] Photo translate: share ChatGPT/Gemini; copy+open fallback
- [ ] Text → Google Translate; empty disabled
- [ ] Phrases search, categories, TTS; speech dialog
- [ ] Emergency tel, assist, geoloc not persisted, phrases, official links
- [ ] Money scale; JPY rate live/manual/cache; quick ¥→€ in Utilità

## Phase 7 — Offline tiers, Settings, Docs, Backup, Reset

**Offline pack:**
- [ ] Four tier radios always visible; MB line; never stuck "Controllo in corso…"
- [ ] Browse tiers without modal spam; **Scarica piano** opens confirm once; Annulla / × reverts draft radios to active tier
- [ ] Zoom list only published URLs; **no Max z15**
- [ ] Mid-download interrupt → Riprendi; **Nascondi does not wipe `tabi-offline-job`**
- [ ] Shell reconcile timeout → failure/partial, not success
- [ ] Upgrade prompt only when `#settings` is active (not over Viaggio at boot)
- [ ] Settings copy: page intro ≠ panel eyebrow duplicate «Prima di partire»
- [ ] Missing `offline-pack.js` → warn, not empty panel
- [ ] Dialog Continua readable light + dark

**Also:** packing ticks/qty (clear qty unchecks); notes CRUD; documents keep expanded row across search/category; QR viewer; backup IDB; factory reset keeps theme/docs/backup; clears offline keys.

## Phase 8 — Search, Segnala, cross-cutting

- [ ] Global search ≥2 chars all domains + phrases + yen
- [ ] Segnala header + detail context; mailto via blank-target / open (not `location.href`); clipboard toast
- [ ] Cross favorite/done card ↔ detail ↔ saved ↔ progress ↔ map
- [ ] Quota / `safeSetItem` under gesture
- [ ] Theme + reduced motion
- [ ] Stress combo: offline + dark + nav collapsed + itinerary + tier

## Phase 9 — Scenario E2E

1. Overview + weather  
2. Map: locate, konbini, stamp, pin, Maps  
3. Solo gratis filter; done + favorite; short itinerary  
4. Storie chapter + detail; Segnala  
5. Food/shopping; translate; TTS  
6. Document QR fullscreen  
7. Tier Medio/Ampio download path; airplane behavior matches tier copy  
8. Import checklist; SW update toast once; state preserved  

## Phase 10 — Visual pass

320/390 light+dark: typography, overflow, tap ≥44px, sticky vs banner/nav, Storie chapter/reader, offline tier list + dialog, stamp markers, admission tags, documents collapsed, thumb reach.

## Device gate

Track status in local `qa/DEVICE-GATE.md` (gitignored campaign folder). Prefer a real iOS Safari standalone and/or Android Chrome pass before travel.

**Emulation (maximize without a phone):** optional local Playwright under `qa/` (Chromium, iPhone 390 + Android 360, light/dark) — keep the runner, results, and `node_modules` out of git. Mark results `emulated-pass` / `code-verified` / `blocked-needs-hardware` / `fail` — do not claim hardware pass from headless alone.

- [ ] iOS and/or Android hardware: share sheet, TTS ja voice, real `tel:`, PWA A2HS/standalone safe-area, geoloc timeout, offline pack on Wi‑Fi, airplane tiles, Segnala mailto return-from-Mail
- [ ] Emulation session: Segnala blank-target mailto (SPA stays), offline Scarica→Annulla revert, locate allow/deny, tel hrefs, nav grip, banner wrap 320, Utilità→Settings, SW `sw.js` register
