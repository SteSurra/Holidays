# Findings and checklist templates

## FINDINGS.md header

```markdown
# Tabi QA findings

Campaign: YYYY-MM
Environment: desktop DevTools / device (specify)
Baseline scripts: pass | fail (note)

| ID | Sev | Phase | Area | Summary | Status |
|----|-----|-------|------|---------|--------|
```

## Finding entry (one block per issue)

```markdown
### QA-NNN — Short title

- **Severity:** P0 | P1 | P2 | Nota
- **Phase:** 0–10
- **Area:** e.g. offline-pack, admission, map-stamps
- **Status:** open | fixed | device-pending | wontfix
- **Viewport / theme / network:** 390 / dark / offline
- **Steps:** numbered reproduction
- **Expected:** …
- **Actual:** …
- **Files:** paths if known
- **Device note:** needs iOS/Android if applicable
```

## CHECKLIST.md structure

```markdown
# Tabi QA checklist

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| baseline | Scripts | | |
| 0 | Boot / chrome / PWA | | |
| 1 | Overview | | |
| 2 | Mappa + stamps + admission | | |
| 3 | Cataloghi + Storie | | |
| 4 | Itinerari | | |
| 5 | Progressi + Salvati | | |
| 6 | Traduci / Parole / Emergency / Money | | |
| 7 | Offline tiers / Docs / Backup | | |
| 8 | Search / Segnala / cross-cutting | | |
| 9 | Scenario E2E | | |
| 10 | Passaggio visivo | | |
| device | iOS / Android gate | | |
| report | Triage + fix waves | | |
```

Status values: `pass`, `fail`, `partial`, `skip (reason)`, `device-pending`.

## Fix wave proposal (end of campaign)

```markdown
## Fix waves

### Wave 1 — P0
- QA-…

### Wave 2 — P1 (map / offline / saved)
- …

### Wave 3 — P1 (catalogs / translate / docs)
- …

### Wave 4 — P2 visual
- …
```
