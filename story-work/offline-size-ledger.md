# Offline size ledger

Measured: 2026-08-07T17:03:42.282Z

Byte sizes for the offline-pack UI options. Prefer this file (and the JSON twin) over hand estimates.

## UI options

| Option | Includes | Bytes | Size | Notes |
|---|---|---:|---:|---|
| `minimo` | Shell only | 3654086 | 3.48 MiB | Shell files from sw.js SHELL + sw.js |
| `medio` | Shell + curated photos @960 | 136297844 | 130 MiB | 609/609 photos ok |
| `ampio_z14` | Medio + Ampio city bubbles z≤14 | 212728802 | 203 MiB | region=ampio-tappe.geojson |
| `ampio_z15` | Medio + Ampio city bubbles z≤15 | 340449003 | 325 MiB | region=ampio-tappe.geojson |
| `max_z14` | Medio + Japan bbox z≤14 | 1389358185 | 1.29 GiB | bbox=129.0,30.9,145.9,45.6 |
| `max_z15` | Medio + Japan bbox z≤15 | 2866054517 | 2.67 GiB | bbox=129.0,30.9,145.9,45.6 |

## Components

| Component | Bytes | Size | Detail |
|---|---:|---:|---|
| Shell | 3654086 | 3.48 MiB | 36 files; missing 0 |
| Photos @960 | 132643758 | 126 MiB | ok 609 / 609; fails 0 |
| Maps | — | — | ampio-z14.pmtiles: 72.9 MiB; ampio-z15.pmtiles: 195 MiB; japan-z14.pmtiles: 1.17 GiB; japan-z15.pmtiles: 2.54 GiB |

## Map extracts

| Extract | Bytes | Size | Zoom | Mode | Status |
|---|---:|---:|---:|---|---|
| `ampio-z14.pmtiles` | 76430958 | 72.9 MiB | z14 | region | ok (reused) |
| `ampio-z15.pmtiles` | 204151159 | 195 MiB | z15 | region | ok (reused) |
| `japan-z14.pmtiles` | 1253060341 | 1.17 GiB | z14 | bbox | ok |
| `japan-z15.pmtiles` | 2729756673 | 2.54 GiB | z15 | bbox | ok |

Source: `https://build.protomaps.com/20260806.pmtiles`

## Formulas

- `minimo` = shell
- `medio` = shell + photos
- `ampio_z14` = medio + ampio-z14.pmtiles
- `ampio_z15` = medio + ampio-z15.pmtiles
- `max_z14` = medio + japan-z14.pmtiles
- `max_z15` = medio + japan-z15.pmtiles
