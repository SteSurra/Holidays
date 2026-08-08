# Tabi — Giappone 2026

PWA statica vanilla-JS senza build step, servita da GitHub Pages. La guida di
riferimento per estendere o rifare questo tipo di app è la skill in
`.codex/skills/build-travel-guide/` (schema contenuti, dottrina link mappa,
foto, rating presi in prestito).

## Regola permanente: la skill impara dalle correzioni

Ogni fix che rivela una lezione generalizzabile di robustezza, velocità o UX
va appuntato in `.codex/skills/build-travel-guide/references/hard-lessons.md`
**nello stesso commit del fix**, senza che nessuno lo chieda. Quel file è la
memoria della skill: la prossima guida parte dalle lezioni già pagate qui.

## Comandi

- Rilascio: `node scripts/bump-version.mjs` (allinea token `?v=`, `VERSION`,
  `CACHE` e la costante `RELEASE` di app.js in un colpo solo). Ogni push che
  tocca file della SHELL richiede un bump. L'URL di registrazione del service
  worker resta `sw.js` fisso, senza token: versionarlo causava un doppio
  toast di aggiornamento a ogni rilascio.
- Check locali (sempre prima di un push):
  `node scripts/check-guide-integrity.mjs && node scripts/check-public-content.mjs && node scripts/check-route-optimizer.mjs`
- Check con rete (prima di un rilascio importante): `check-links.mjs`,
  `check-lodging.mjs`, `check-transfer-stops.mjs`.
- Server locale: configurazioni in `.claude/launch.json` (`tabi-static`).

## Vincoli non negoziabili

- Niente date esatte in formato ISO, booking code, contatti o credenziali nel
  repo (CI la fa rispettare: `check-public-content.mjs`).
- Link mappa solo `https://www.google.com/maps/search/?api=1&query=lat,lng`
  (coordinate, mai nomi) — vedi `references/maps-links.md` della skill.
- I dati personali dell'utente (preferiti, progressi, documenti, foto) restano
  sul dispositivo: localStorage per lo stato, IndexedDB per i blob.
- Commit in inglese, stile conventional (`fix(japan): …`), senza co-autore;
  push subito dopo il commit.
- Semplicità e tascabilità prima di tutto: l'app si usa camminando, con una
  mano, spesso offline — boot rapido, batteria, niente complessità di build.
