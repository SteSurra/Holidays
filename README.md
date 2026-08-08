# Holidays

Compagno di viaggio statico e installabile, pubblicato con GitHub Pages. La prima vacanza disponibile è **Giappone 2026**.

## Funzioni

- 13 tappe con 60 luoghi tra classici e deviazioni interessanti
- 126 specialità gastronomiche filtrabili per città e portata
- 59 acquisti tipici organizzati per categoria e località
- immagini caricate progressivamente da Wikimedia Commons
- illustrazioni locali quando una foto non è disponibile
- preferiti e stati `visitato`, `provato`, `comprato` salvati sul dispositivo
- interfaccia responsive e installabile come app
- contenuti e navigazione disponibili offline dopo la prima visita

## Struttura

```text
.
├── index.html
├── manifest.webmanifest
├── sw.js
└── assets
    ├── app.js
    ├── data.js
    ├── food-data.js
    ├── shopping-data.js
    ├── styles.css
    ├── fallback-*.svg
    └── icons
```

I dati sono separati dall'interfaccia. Una futura vacanza può riutilizzare componenti, filtri, preferiti e caricamento immagini sostituendo gli archivi in `assets/`.

## Sviluppo locale

Il service worker richiede un server HTTP; aprire direttamente `index.html` non replica il comportamento della versione pubblicata.

```bash
python3 -m http.server 4173
```

Aprire `http://localhost:4173`.

## Pubblicazione

GitHub Pages usa il branch `main` e la cartella radice `/`. Dopo un push, GitHub rigenera automaticamente il sito. La configurazione si trova in **Settings → Pages**.

## Immagini e privacy

Le foto vengono cercate tramite l'API pubblica di Wikimedia Commons soltanto quando una scheda si avvicina allo schermo. Gli URL risolti vengono memorizzati nel browser per evitare richieste ripetute. Il sito non usa account, analytics o server applicativi; preferiti e avanzamento restano in `localStorage` sul dispositivo.
