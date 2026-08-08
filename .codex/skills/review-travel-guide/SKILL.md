---
name: review-travel-guide
description: Run exhaustive manual QA on a Holidays travel PWA — bugs, offline tiers, admission filters, map/stamps, stories reader, Segnala, PWA shell, and travel UX. Use before a trip, after feature work, for regression, pre-release, or when the user asks to test/review/QA the guide.
---

# Review Travel Guide

Regression and travel-readiness QA for static travel PWAs built with the Holidays pattern. **Do not add features** during a review campaign — find bugs and UX friction only.

## When to use

- Pre-trip or pre-release regression
- After shell, map, offline-pack, admission, stories, or persistence changes
- User asks to test, QA, audit, or find bugs/UX issues

## Relationship to build-travel-guide

- **build-travel-guide** — authoring content, schema, deployment
- **review-travel-guide** — proving the shipped app works for a traveler

Engineering memory for defects lives in [../build-travel-guide/references/hard-lessons.md](../build-travel-guide/references/hard-lessons.md). This skill holds **repeatable checks** so none are forgotten.

## Method

1. **Baseline scripts** (must pass before manual UI):
   ```bash
   node scripts/check-guide-integrity.mjs && node scripts/check-public-content.mjs && node scripts/check-route-optimizer.mjs
   ```
2. **Full manual audit** — one phase per turn; see [references/qa-phases.md](references/qa-phases.md)
3. **Log every finding** locally in `qa/FINDINGS.md` using [references/findings-template.md](references/findings-template.md)
4. **Track progress** locally in `qa/CHECKLIST.md` (and `qa/DEVICE-GATE.md` for the device gate)
5. **Triage** P0 → P1 → P2 → Nota; propose fix waves; fix only after explicit user go
6. **Re-test** only the area touched after each fix wave
7. **Device gate** — iOS Safari and/or Android Chrome for share, TTS, `tel:`, PWA standalone, geolocation, safe-area, offline pack download on Wi‑Fi

## Campaign output (local only)

`qa/` is **gitignored**. Create it for the current campaign; do not commit FINDINGS, CHECKLIST, REPORT, DEVICE-GATE notes, Playwright runners, results JSON, screenshots, or `node_modules` / `package.json` used only for device-gate emulation. Durable process lives in this skill (`qa-phases`, `matrices`, `findings-template`); durable defect lessons go in [../build-travel-guide/references/hard-lessons.md](../build-travel-guide/references/hard-lessons.md).

## Severity

| Level | Meaning |
|-------|---------|
| P0 | Data loss, blocked navigation, broken map/offline shell, wrong emergency or Maps links |
| P1 | Frequent flow broken or confusing (filters, saved, itineraries, translate, documents, double toasts) |
| P2 | Layout, tap targets, contrast, copy, micro-interactions |
| Nota | Future idea / redesign — not blocking |

## Matrices (apply every phase)

Read [references/matrices.md](references/matrices.md): viewports 320/360/390/430, light/dark/auto, online/airplane/fake-online, clean/dirty profile, reduced motion.

## Inventory

Current views, dialogs, storage keys, and scripts: [references/inventory.md](references/inventory.md). **When adding a view, dialog, or persistence key, update inventory + the relevant phase in the same commit as the feature.**

## Maintenance rule

A fix that teaches a generalizable lesson → append to `hard-lessons.md` **and** add or tighten the matching checklist line in `qa-phases.md` in the **same commit** as the fix.

## Output per phase

- New/updated rows in local `qa/FINDINGS.md`
- Phase marked pass/fail/skip in local `qa/CHECKLIST.md`
- Note if device re-test is required
- Leave campaign files untracked (they stay under gitignored `qa/`)

## P0 mid-audit

Fix P0 only if it blocks continuing the test; otherwise log and continue.

## Network checks (important releases)

Run manually when network available: `check-links.mjs`, `check-lodging.mjs`, `check-transfer-stops.mjs`, `check-coordinates.mjs`, `audit-remote-images.mjs`.
