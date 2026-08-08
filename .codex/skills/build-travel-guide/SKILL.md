---
name: build-travel-guide
description: Build or extend a privacy-safe static travel companion website using the Holidays repository pattern. Use when creating a guide for a new trip, country, region, or city; populating itinerary, places, food, shopping, cultural history, maps, lodging bases, offline features, local photos, favorites, or group checklists; or preparing a guide for GitHub Pages.
---

# Build Travel Guide

Create a public travel guide while keeping personal travel data on the user's device.

## Intake

Before editing, ask for the minimum missing information in one compact message:

- destination and ordered cities or areas;
- trip style and priorities;
- public hotel names or preferred neighborhoods, if they should appear;
- transport assumptions;
- dietary needs and shopping interests;
- language and desired content depth.

Treat exact dates as optional research context. Never publish dates, booking codes, tickets, identity documents, contact details, personal notes, credentials, or precise live location.

If an existing guide is provided, inspect and preserve its itinerary, hotel names, data shape, visual language, saved-state keys, and offline behavior before changing it.

## Build Workflow

1. Read [references/content-schema.md](references/content-schema.md).
2. Inventory existing routes, views, datasets, local persistence, maps, and deployment files.
3. Research current facts using official tourism, cultural institution, transport, and municipal sources. Use Wikimedia Commons only as a runtime image source, never as the sole factual source.
4. Populate cities, places, foods, shopping, lodging bases, and history with stable IDs and useful descriptions.
5. Categorize food by course and context; categorize shopping by practical type; divide history by city and subject.
6. Keep photos, favorites, progress, nickname, and group checklist in browser storage. Provide explicit export/import when cross-device transfer is useful.
7. Add a route map, user geolocation only after a button press, and a Google Maps link for every place.
8. Load remote images lazily with limited concurrency, browser caching, meaningful alt text, and local SVG fallback.
9. Keep the application installable and the static shell available offline. Do not claim map tiles or remote photos work fully offline.
10. Verify JavaScript syntax, unique IDs, required fields, mobile width, filters, saved state, image fallback, map resizing, service-worker cache version, and repository cleanliness.
11. Commit and push only when requested or required for the agreed deployment. Keep the repository private until the user explicitly approves public visibility.

## Privacy Boundary

Public repository data may contain destination, route order, hotel names, neighborhood bases, general recommendations, and non-personal descriptions.

Device-only data must include photos, completion state, favorites, nickname, group name, and imported checklists. Do not add analytics, authentication, databases, or cloud photo storage without a separate explicit decision covering provider, retention, access, and deletion.

## Publication Gate

Before making a repository public or deploying:

- search the repository and Git history for sensitive material;
- confirm no exact dates, booking artifacts, credentials, personal photos, or private notes are tracked;
- show the local result and obtain explicit publication approval;
- verify the final public URL after deployment.
