(function () {
  "use strict";

  // Lista valigia riutilizzabile: solo oggetti, nessun nome di persona.
  // Riga: slug|qty|note|contexts|bag|tip
  // contexts = mare,montagna,citta (vuoto = sempre visibile)
  // bag = mano | stiva | entrambi | solo_mano
  // Gli id (pack-{group}-{slug}) non si rinominano: le spunte vivono lì.
  const groups = [
    {
      id: "abbigliamento",
      title: "Abbigliamento",
      note: "Si cammina tanto e si entra spesso scalzi: strati leggeri e calze presentabili. Per il freddo di montagna basta felpa o pile.",
      rows: `
mutande||Meglio abbondare: le lavanderie ci sono, il tempo no||entrambi|
calze||Si tolgono le scarpe in templi, ryokan e alcuni ristoranti||entrambi|
reggiseni||||entrambi|
t-shirt-canotte||||entrambi|
pantaloncini||||entrambi|
pantaloni||||entrambi|
vestito-gonna||||entrambi|
camicia-leggera|1|Utile per cene un po' più formali|citta|entrambi|
felpa|2|O pile: sere fresche a Takayama e Nagano|montagna|entrambi|
foulard-leggero|1|Contro l'aria condizionata di treni e negozi||entrambi|
k-way-leggero|1|Compatto: acquazzoni e sentieri umidi||entrambi|
pigiama|3|Molti hotel danno lo yukata, non tutti||entrambi|
costume-bagno|2|Piscine e parchi, non per gli onsen tradizionali|mare|entrambi|
cappellino|2|Sole estivo|mare,citta|entrambi|
abbigliamento-sportivo||Palestra, running o outdoor leggero — un set basta||entrambi|
abbigliamento-volo|1|Comodo a strati: undici ore, tre climi||mano|
guanti-leggeri|1|Mattine fresche in alta quota|montagna|entrambi|
berretto|1|Vento e sere fresche|montagna,citta|entrambi|
calze-compressione|1|Solo per il volo lungo||mano|
`
    },
    {
      id: "scarpe",
      title: "Scarpe",
      note: "Facili 20.000 passi al giorno e scarpe che si tolgono spesso: comodità prima dell'estetica.",
      rows: `
sneakers-comode|1|Già rodate: non inaugurarle qui|citta|entrambi|
infradito|1||mare|entrambi|
sandali|1||mare,citta|entrambi|
scarpe-trekking|1|Sentieri e Kamikochi; meglio con calze tecniche|montagna|entrambi|
`
    },
    {
      id: "beauty",
      title: "Beauty case",
      note: "Quasi tutto si ricompra in konbini e drugstore: porta il minimo. Liquidi ≤100 ml in cabina → vedi consigli in alto.",
      rows: `
spazzolino||||mano|
dentifricio||||mano|≤100 ml in cabina
filo-interdentale||||mano|
deodorante||Quello giapponese è più leggero del nostro||mano|
bagnoschiuma||Gli hotel lo forniscono quasi sempre||stiva|
shampoo||||stiva|
balsamo||||stiva|
definizione-ricci||||mano|
olio-argan||||mano|
pettine-spazzola||||entrambi|
elastici-mollette||||entrambi|
crema-corpo||||mano|
profumo||||mano|
crema-viso||||mano|
contorno-occhi||||mano|
burrocacao||||mano|
make-up||||mano|
assorbenti-tampax||Reperibili ovunque, marche diverse||entrambi|
pulisci-orecchie||||entrambi|
forbicine||Solo in stiva||stiva|Taglienti: solo stiva
lima-unghie||||mano|
rasoio||Solo in stiva se a lama||stiva|
tagliaunghie||||stiva|In cabina solo senza tagliente
salviettine-struccanti||||mano|
salviettine-wc||Molti bagni pubblici senza carta né asciugamani||mano|
fazzoletti-carta||||entrambi|
sapone-marsiglia||O detersivo in fogli: bucato a mano nel lavandino||entrambi|
sacchetto-liquidi|1|Trasparente, richiudibile, max 1 L||mano|Un solo sacchetto: ogni contenitore ≤100 ml
flaconi-viaggio|1|Set da 100 ml per dentifricio, shampoo, creme||mano|
disinfettante-mani||||mano|
repellente-zanzare||Estate, soprattutto vicino ai templi||mano|
`
    },
    {
      id: "farmacia",
      title: "Farmacia",
      note: "I farmaci da banco in Giappone hanno dosaggi diversi: porta ciò che già usi.",
      rows: `
tachipirina||||entrambi|In JP spesso fino a 2 mesi di scorta personale
ibuprofene||||entrambi|
oki||||entrambi|
termometro-elettronico||||entrambi|
cerotti||||entrambi|
cerotti-compeed||Le vesciche sono il problema numero uno||entrambi|
fermenti-lattici||||entrambi|
imodium||||entrambi|
integratori||||entrambi|
crema-solare-spf50||||mano|Tubetto grande in stiva; in cabina ≤100 ml
crema-solare-stick||||mano|Lo stick in cabina non conta come liquido
stick-dopo-puntura||||mano|
antistaminico||||entrambi|
mal-dauto||||mano|Bus di montagna e curve
antisettico||||mano|
`
    },
    {
      id: "vista",
      title: "Occhi e vista",
      note: "Una coppia al giorno, una di scorta se ti serve, e nello zainetto del volo non in stiva. Lenti e liquidi a parte.",
      rows: `
occhiali-vista-giorno|1|La coppia di tutti i giorni||entrambi|
occhiali-scorta|1|Se perdi o rompi quelli principali||entrambi|
lenti-contatto||Monouso: fino a circa 2 mesi in dogana JP||entrambi|
liquido-lenti||Piccolo in cabina, grande in stiva||mano|≤100 ml in cabina
collirio||Medicinale essenziale: può superare 100 ml con prova||mano|
custodia-occhiali|1|Con panno pulisci-lenti||entrambi|
`
    },
    {
      id: "accessori",
      title: "Accessori",
      note: "Pochi cestini in strada: ciò che apri te lo riporti fino a sera. Mare e montagna compaiono col filtro Dove.",
      rows: `
occhiali-sole|1||mare,citta|entrambi|
ventaglio|1|Si vende ovunque; in estate diventa indispensabile|citta|entrambi|
shopper-richiudibile|1|Sacchetti a pagamento e per portarsi via i rifiuti|citta|entrambi|
lucchetto|1|||entrambi|
organizer-documenti|1|||mano|
organizer-abbigliamento|4|||stiva|
sacco-biancheria|2|||stiva|
sacchetti-spazzatura||Rifiuti nello zaino fino a un cestino vero|citta|entrambi|
accappatoio-microfibra|1||mare|entrambi|
mini-asciugamano|2|Nei bagni pubblici spesso non c'è di che asciugarsi|citta|entrambi|
etichette-bagaglio|2|||entrambi|
sacca-stagna-costume|1|Costume, telefono o documenti bagnati|mare|entrambi|
copri-zaino-impermeabile|1|||mano|
ombrello-compatto|1|Acquazzoni estivi senza preavviso|citta|entrambi|
mascherina|2|Metro affollate o raffreddore|citta|mano|
portamonete|1|Monete yen: i cestini sono rari|citta|entrambi|
tappi-orecchie||Volo e ryokan rumorosi||mano|
maschera-sonno||Volo lungo e jet lag||mano|
bilancina-bagaglio||Prima di partire per l'aeroporto||mano|
scarpette-scoglio|1||mare|entrambi|
telo-mare|1||mare|stiva|
custodia-waterproof|1|Telefono e documenti al mare|mare|mano|
headlamp|1|Escursioni e ryokan poco illuminati|montagna|mano|
moschettoni||Per appendere shopper, borraccia o etichette allo zaino||entrambi|
sacchetti-sottovuoto||Comprimono i vestiti e liberano spazio per i souvenir||entrambi|
`
    },
    {
      id: "tecnologia",
      title: "Tecnologia",
      note: "Prese tipo A a 100 V: i caricatori moderni di solito reggono; attenzione agli apparecchi con resistenza.",
      rows: `
kindle||||solo_mano|Batteria al litio: solo cabina
caricatore-kindle||||mano|
caricatore-telefono||||mano|
cover-cordino||Comoda per mappe e foto camminando|citta|mano|
power-bank||Mai in stiva: solo a mano||solo_mano|Max 2 a persona; non ricaricare a bordo
adattatore-prese||Tipo A, due lamelle piatte, 100 V||mano|
fotocamera-vintage||||solo_mano|Batteria al litio: solo cabina
pellicole||Chiedi il controllo manuale ai raggi X se sensibili||mano|
auricolari||In treno e metro si parla a voce bassissima||mano|
cavo-auricolari||||mano|
esim||Attiva prima o all'arrivo: dati Giappone, non solo Wi‑Fi hotel; tieni QR/install offline||mano|
`
    },
    {
      id: "volo",
      title: "Zainetto per il volo",
      note: "Cose che non puoi perdere, più il minimo per undici ore e un bagaglio in ritardo. Gli occhiali qui sono un promemoria di dove metterli, non una seconda coppia.",
      rows: `
documenti||||mano|
passaporto||Valido almeno per tutta la durata del viaggio||mano|
fotocopia-documenti||Separate dagli originali||mano|
carta-pagamento||Quasi ovunque, non nei templi e nei banchi piccoli||mano|
contanti||Qualche banconota già cambiata evita la caccia all'ATM||mano|
penna|1|Moduli di immigrazione e dogana||mano|
blocchetto|1|Scrivere un indirizzo è più veloce che spiegarlo||mano|
borraccia-vuota|1|Si riempie dopo i controlli||mano|
cuscino-viaggio|1|||mano|
occhiali-vista|1|Gli stessi del giorno: nello zaino, non in stiva||mano|
burrocacao-volo|1|||mano|
fazzoletti-volo||||mano|
tampax-volo||||mano|
salviettine-volo||||mano|
intimo-cambio|1|Se il bagaglio arriva un giorno dopo||mano|
sacchetto-spazzatura-volo|1|||mano|
felpina|1|Aereo e stazioni: aria condizionata aggressiva||mano|
`
    }
  ];

  const labels = {
    "mutande": "Mutande",
    "calze": "Calze",
    "reggiseni": "Reggiseni",
    "t-shirt-canotte": "T-shirt e canotte",
    "pantaloncini": "Pantaloncini",
    "pantaloni": "Pantaloni",
    "vestito-gonna": "Vestito o gonna",
    "camicia-leggera": "Camicia",
    "felpa": "Felpa o pile",
    "foulard-leggero": "Foulard",
    "k-way-leggero": "K-way",
    "pigiama": "Pigiama",
    "costume-bagno": "Costume da bagno",
    "cappellino": "Cappellino",
    "abbigliamento-sportivo": "Abbigliamento sportivo",
    "abbigliamento-volo": "Abbigliamento per il volo",
    "guanti-leggeri": "Guanti",
    "berretto": "Berretto",
    "calze-compressione": "Calze a compressione",
    "sneakers-comode": "Sneakers comode",
    "infradito": "Infradito",
    "sandali": "Sandali",
    "scarpe-trekking": "Scarpe da trekking",
    "spazzolino": "Spazzolino",
    "dentifricio": "Dentifricio",
    "filo-interdentale": "Filo interdentale",
    "deodorante": "Deodorante",
    "bagnoschiuma": "Bagnoschiuma",
    "shampoo": "Shampoo",
    "balsamo": "Balsamo",
    "definizione-ricci": "Definizione ricci",
    "olio-argan": "Olio di argan",
    "pettine-spazzola": "Pettine o spazzola",
    "elastici-mollette": "Elastici e mollette",
    "crema-corpo": "Crema corpo",
    "profumo": "Profumo",
    "crema-viso": "Crema viso",
    "contorno-occhi": "Contorno occhi",
    "burrocacao": "Burrocacao",
    "make-up": "Make-up",
    "assorbenti-tampax": "Assorbenti e tamponi",
    "pulisci-orecchie": "Pulisci-orecchie",
    "forbicine": "Forbicine",
    "lima-unghie": "Lima per unghie",
    "rasoio": "Rasoio",
    "tagliaunghie": "Tagliaunghie",
    "salviettine-struccanti": "Salviettine struccanti",
    "salviettine-wc": "Salviettine wc",
    "fazzoletti-carta": "Fazzoletti di carta",
    "sapone-marsiglia": "Sapone o detersivo per bucato",
    "sacchetto-liquidi": "Sacchetto trasparente per liquidi",
    "flaconi-viaggio": "Flaconi da viaggio 100 ml",
    "disinfettante-mani": "Disinfettante mani",
    "repellente-zanzare": "Repellente zanzare",
    "tachipirina": "Paracetamolo",
    "ibuprofene": "Ibuprofene",
    "oki": "Antinfiammatorio in bustine",
    "termometro-elettronico": "Termometro elettronico",
    "cerotti": "Cerotti",
    "cerotti-compeed": "Cerotti per vesciche",
    "fermenti-lattici": "Fermenti lattici",
    "imodium": "Antidiarroico",
    "integratori": "Integratori",
    "crema-solare-spf50": "Crema solare SPF 50",
    "crema-solare-stick": "Crema solare stick",
    "stick-dopo-puntura": "Stick dopo-puntura",
    "antistaminico": "Antistaminico",
    "mal-dauto": "Antinausea",
    "antisettico": "Antisettico",
    "occhiali-vista-giorno": "Occhiali da vista",
    "occhiali-scorta": "Occhiali di scorta",
    "lenti-contatto": "Lenti a contatto",
    "liquido-lenti": "Liquido per lenti",
    "collirio": "Collirio",
    "custodia-occhiali": "Custodia per occhiali",
    "occhiali-sole": "Occhiali da sole",
    "ventaglio": "Ventaglio",
    "shopper-richiudibile": "Shopper richiudibile",
    "lucchetto": "Lucchetto",
    "organizer-documenti": "Organizer documenti",
    "organizer-abbigliamento": "Organizer abbigliamento",
    "sacco-biancheria": "Sacco biancheria sporca",
    "sacchetti-spazzatura": "Sacchetti spazzatura",
    "accappatoio-microfibra": "Accappatoio microfibra",
    "mini-asciugamano": "Mini asciugamano",
    "etichette-bagaglio": "Etichette bagaglio",
    "sacca-stagna-costume": "Sacca stagna",
    "copri-zaino-impermeabile": "Copri zaino",
    "ombrello-compatto": "Ombrello compatto",
    "mascherina": "Mascherine",
    "portamonete": "Portamonete",
    "tappi-orecchie": "Tappi per le orecchie",
    "maschera-sonno": "Maschera per dormire",
    "bilancina-bagaglio": "Bilancina bagaglio",
    "scarpette-scoglio": "Scarpette da scoglio",
    "telo-mare": "Telo mare",
    "custodia-waterproof": "Custodia impermeabile telefono",
    "headlamp": "Frontale",
    "moschettoni": "Moschettoni",
    "sacchetti-sottovuoto": "Sacchetti sottovuoto",
    "kindle": "Lettore e-book",
    "caricatore-kindle": "Caricatore del lettore",
    "caricatore-telefono": "Caricatore telefono",
    "cover-cordino": "Cover con cordino",
    "power-bank": "Power bank",
    "adattatore-prese": "Adattatore prese Giappone",
    "fotocamera-vintage": "Fotocamera analogica",
    "pellicole": "Pellicole",
    "auricolari": "Auricolari",
    "cavo-auricolari": "Cavo auricolari",
    "esim": "eSIM",
    "documenti": "Documenti",
    "passaporto": "Passaporto",
    "fotocopia-documenti": "Fotocopia documenti",
    "carta-pagamento": "Carta di pagamento",
    "contanti": "Contanti euro e yen",
    "penna": "Penna",
    "blocchetto": "Blocchetto",
    "borraccia-vuota": "Borraccia vuota",
    "cuscino-viaggio": "Cuscino da viaggio",
    "occhiali-vista": "Occhiali nello zainetto",
    "burrocacao-volo": "Burrocacao",
    "fazzoletti-volo": "Fazzoletti",
    "tampax-volo": "Tamponi",
    "salviettine-volo": "Salviettine wc",
    "intimo-cambio": "Intimo di ricambio",
    "sacchetto-spazzatura-volo": "Sacchetto spazzatura",
    "felpina": "Felpa leggera"
  };

  // Schema fisso a 6 campi: slug|qty|note|contexts|bag|tip
  // Un "|" in più tra note e bag sposta bag nel tip e rompe i filtri.
  const VALID_BAGS = { mano: 1, stiva: 1, entrambi: 1, solo_mano: 1 };
  const VALID_CONTEXTS = { mare: 1, montagna: 1, citta: 1 };

  function parseRow(groupId, line) {
    const parts = line.split("|");
    const slug = parts[0];
    if (!slug) return null;
    if (parts.length !== 6) {
      console.error("[packing] row must have 6 fields (slug|qty|note|contexts|bag|tip):", groupId, line);
    }
    const contexts = parts[3] ? parts[3].split(",").map(function (tag) { return tag.trim(); }).filter(Boolean) : [];
    contexts.forEach(function (tag) {
      if (!VALID_CONTEXTS[tag]) console.error("[packing] invalid context tag:", groupId, slug, tag);
    });
    const bag = parts[4] || "entrambi";
    if (!VALID_BAGS[bag]) console.error("[packing] invalid bag:", groupId, slug, bag);
    return {
      id: "pack-" + groupId + "-" + slug,
      name: labels[slug] || slug,
      quantity: parts[1] || "",
      note: parts[2] || "",
      contexts: contexts,
      bag: bag,
      tip: parts[5] || "",
      custom: false
    };
  }

  window.JAPAN_DATA.packing = groups.map(function (group) {
    return {
      id: group.id,
      title: group.title,
      note: group.note,
      items: group.rows.trim().split("\n").map(function (line) {
        return parseRow(group.id, line.trim());
      }).filter(Boolean)
    };
  });

  window.JAPAN_DATA.packingTips = [
    {
      title: "Liquidi in cabina (LAG)",
      body: "Ogni contenitore max 100 ml, tutti in un solo sacchetto trasparente richiudibile da max 1 litro (~18×20 cm), presentato a parte ai controlli. Creme, gel, dentifricio e spray contano come liquidi."
    },
    {
      title: "Liquidi grandi e duty free",
      body: "Flaconi oltre 100 ml vanno in stiva. Il duty free in sacchetto STEB sigillato con scontrino può restare in cabina fino a destinazione."
    },
    {
      title: "Medicinali e neonati",
      body: "Medicinali essenziali e alimenti per neonati possono superare i 100 ml per il viaggio: tienili a parte e preparati a dimostrare che servono davvero."
    },
    {
      title: "Taglienti e strumenti",
      body: "Forbici con lama oltre 6 cm, coltelli e rasoi a lama vanno in stiva. Lima e tagliaunghie senza tagliente di solito passano in cabina."
    },
    {
      title: "Power bank e batterie",
      body: "Solo in bagaglio a mano, mai in stiva. Di norma max 2 power bank a persona, non ricaricarli a bordo. Se imbarcano lo zaino al gate, togli prima dispositivi e batterie."
    },
    {
      title: "Farmaci in Giappone",
      body: "Senza permessi speciali: circa 2 mesi di farmaci da banco, 1 mese per ricette; cosmetici fino a 24 pezzi per voce. I principi attivi giapponesi spesso differiscono: porta ciò che conosci."
    },
    {
      title: "Verifica sempre",
      body: "Regole e pesi dipendono da compagnia e aeroporto. Controlla il sito della compagnia prima di partire."
    }
  ];
})();
