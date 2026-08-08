# Story workbench

Editable source for handwritten deep stories. `assets/story-data.js` is the
**build output** — do not edit it by hand except for hotfixes, then backport
the change into a batch JSON here.

## Layout

```
story-work/
  README.md                 # this file (tracked)
  batches/                  # source of truth (tracked)
    00-seed-existing.json   # bootstrap of the 300 place/experience/map stories
    history-01-….json
    food-01-….json
    shopping-01-….json
  # Local-only scratch (gitignored — regenerate or keep on disk as you like):
  #   *BRIEF.md, *-catalog.json, STATUS.md, ledger.md, audits/
```

## Batch format

```json
{
  "schede": [
    {
      "id": "history-kyoto-capital",
      "long": "… (≥400 chars, Italian narrative) …",
      "sections": [
        { "title": "Custom title", "body": "…" },
        { "title": "Another", "body": "…" },
        { "title": "Semiserious unique note", "body": "…", "fun": true }
      ],
      "sources": [
        { "title": "…", "url": "https://…", "kind": "sito ufficiale" },
        { "title": "…", "url": "https://…", "kind": "ente turistico" }
      ]
    }
  ]
}
```

Rules (enforced by `scripts/build-stories.mjs` and integrity):

- unique `id` across the merged corpus
- `long` ≥ 400 characters
- ≥ 3 sections, ≥ 1 with `"fun": true`
- ≥ 2 HTTPS sources
- no shared whole sentence ≥ 90 characters between two stories
- custom section titles per card; myth ≠ chronicle
- history/food/shopping stories must not paraphrase existing place stories

## Commands

```bash
node scripts/build-stories.mjs     # merge batches → assets/story-data.js
node scripts/story-status.mjs      # coverage by domain + missing ids
node scripts/check-guide-integrity.mjs
```

Later batches overlay earlier ones on the same `id`. The seed file preserves
the handwritten place/experience/map cards; new work goes in dated geographic
or domain batches. Briefs, catalogs, STATUS, ledger, and audits stay local —
only `batches/` and this README are committed under `story-work/`.
