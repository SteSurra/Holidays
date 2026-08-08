(function () {
  "use strict";

  // Lista valigia riutilizzabile: solo oggetti, nessun nome di persona.
  // Riga: slug|qty|note|contexts|bag|tip
  // contexts = mare,montagna,citta (vuoto = sempre visibile)
  // bag = mano | stiva | entrambi | solo_mano
  const groups = [
    {
      id: "abbigliamento",
      title: "Abbigliamento",
      note: "In Giappone si cammina molto e si entra spesso scalzi: privilegia strati leggeri e calze presentabili.",
      rows: `
mutande||Meglio abbondare: le lavanderie a gettoni sono ovunque ma il tempo no||entrambi|
calze||Si tolgono le scarpe in templi, ryokan e alcuni ristoranti||entrambi|
reggiseni||||entrambi|
t-shirt-canotte||||entrambi|
pantaloncini||||entrambi|
pantaloni||||entrambi|
vestito-gonna||||entrambi|
camicia-leggera|1|Utile per cene e locali un po' più formali|citta|entrambi|
felpa|2|Le sere in montagna a Takayama e Nagano restano fresche|montagna|entrambi|
foulard-leggero|1|Ripara dall'aria condizionata molto fredda di treni e negozi||entrambi|
k-way-leggero|1|Compatto: gli acquazzoni arrivano senza preavviso||entrambi|
pigiama|3|Molti hotel forniscono lo yukata, ma non tutti||entrambi|
costume-bagno|2|Serve per piscine e alcuni parchi, non per gli onsen tradizionali|mare|entrambi|
cappellino|2|Protegge dal sole estivo|mare,citta|entrambi|
abbigliamento-volo|1|Comodo e a strati: undici ore cambiano tre climi||mano|
giacca-impermeabile|1|Utile in montagna e nei giorni di pioggia|montagna|entrambi|
pile-caldo|1|Strato medio per serate fresche in montagna|montagna|entrambi|
guanti-leggeri|1|Mattine fredde in alta quota|montagna|entrambi|
berretto|1||montagna,citta|entrambi|
calze-compressione|1|Utili nel volo lungo||mano|
`
    },
    {
      id: "scarpe",
      title: "Scarpe",
      note: "Si superano facilmente i 20.000 passi al giorno e le scarpe si tolgono spesso: conta più la comodità dell'estetica.",
      rows: `
sneakers-comode|1|Già rodate: il Giappone non è il posto dove inaugurarle|citta|entrambi|
infradito|1||mare|entrambi|
sandali|1||mare,citta|entrambi|
scarpe-trekking|1|Per sentieri e Kamikochi|montagna|entrambi|
calze-trekking|2|Meglio di calze cotone per escursioni|montagna|entrambi|
`
    },
    {
      id: "beauty",
      title: "Beauty case",
      note: "Quasi tutto si ricompra in konbini e drugstore, spesso meglio: porta il minimo e lascia spazio in valigia.",
      rows: `
spazzolino||||mano|
dentifricio||||mano|Conta come liquido: flacone ≤100 ml in cabina
filo-interdentale||||mano|
deodorante||Il deodorante giapponese è molto più leggero di quello europeo||mano|Spray o roll-on: regole liquidi in cabina
bagnoschiuma||Gli hotel lo forniscono quasi sempre||stiva|Formati grandi meglio in stiva
shampoo||||stiva|Flaconi grandi in stiva; mini ≤100 ml in cabina
balsamo||||stiva|
definizione-ricci||||mano|
olio-argan||||mano|
pettine-spazzola||||entrambi|
elastici-mollette||||entrambi|
crema-corpo||||mano|Creme = liquidi: ≤100 ml in cabina
profumo||||mano|≤100 ml in cabina
crema-viso||||mano|≤100 ml in cabina
contorno-occhi||||mano|≤100 ml in cabina
burrocacao||||mano|
make-up||||mano|
assorbenti-tampax||Reperibili ovunque, ma le marche cambiano parecchio||entrambi|
pulisci-orecchie||||entrambi|
forbicine||Solo in stiva: in cabina vengono sequestrate||stiva|
lima-unghie||||mano|
rasoio||Solo in stiva se è a lama||stiva|
tagliaunghie||||stiva|In cabina solo se senza tagliente
pinzetta||||stiva|
salviettine-struccanti||||mano|
salviettine-wc||Molti bagni pubblici non hanno carta né asciugamani||mano|
fazzoletti-carta||||entrambi|
sapone-marsiglia||Per il bucato a mano nei lavandini||entrambi|
sacchetto-liquidi|1|Trasparente, richiudibile, max 1 L||mano|Un solo sacchetto: ogni contenitore ≤100 ml
flaconi-viaggio|1|Set da 100 ml per dentifricio, shampoo, creme||mano|Ogni flacone ≤100 ml in cabina
disinfettante-mani||Spray o gel||mano|Conta come liquido in cabina
crema-mani||||mano|≤100 ml in cabina
dopobarba||||mano|≤100 ml in cabina
after-sun||Dopo giornate al sole|mare|mano|≤100 ml in cabina
repellente-zanzare||Spray estivo, soprattutto vicino ai templi||mano|Aerosol: regole liquidi in cabina
`
    },
    {
      id: "farmacia",
      title: "Farmacia",
      note: "In Giappone i farmaci da banco hanno principi attivi e dosaggi diversi: porta ciò che sai già usare.",
      rows: `
tachipirina||||entrambi|In JP spesso fino a 2 mesi di scorta personale
ibuprofene||||entrambi|
oki||||entrambi|
termometro-elettronico||||entrambi|
cerotti||||entrambi|
cerotti-compeed||Le vesciche sono il problema numero uno di questo viaggio||entrambi|
fermenti-lattici||||entrambi|
imodium||||entrambi|
integratori||||entrambi|
crema-solare-spf50||||mano|≤100 ml in cabina; tubetto grande in stiva
crema-solare-stick||||mano|Lo stick in cabina non conta come liquido
stick-dopo-puntura||Le zanzare estive sono insistenti, soprattutto vicino ai templi||mano|
antistaminico||||entrambi|
mal-dauto||||mano|Utile sui bus di montagna e sulle curve
antiacido||||entrambi|
collutorio-viaggio||||mano|Flacone ≤100 ml in cabina
elettroliti||||entrambi|
antisettico||||mano|≤100 ml in cabina
`
    },
    {
      id: "vista",
      title: "Occhi e vista",
      note: "Occhiali, lenti e liquidi: tieni il necessario a portata di mano e il resto ben protetto in valigia.",
      rows: `
occhiali-vista-giorno|1|La coppia che usi ogni giorno||entrambi|
occhiali-scorta|1|Utile se perdi o rompi quelli principali||entrambi|
lenti-contatto||Lenti monouso: fino a circa 2 mesi in dogana JP||entrambi|
liquido-lenti||Flacone piccolo in cabina, grande in stiva||mano|≤100 ml in cabina
collirio||Medicinale essenziale: può superare 100 ml con prova||mano|
custodia-occhiali|1|||entrambi|
panno-occhiali||||entrambi|
`
    },
    {
      id: "accessori",
      title: "Accessori",
      note: "Le strade sono quasi prive di cestini: quello che apri te lo riporti dietro fino a sera.",
      rows: `
occhiali-sole|1||mare,citta|entrambi|
ventaglio|1|Si vende ovunque e in estate diventa indispensabile|citta|entrambi|
shopper-richiudibile|1|I sacchetti sono a pagamento e servono a portarsi via i rifiuti|citta|entrambi|
lucchetto|1|||entrambi|
organizer-documenti|1|||mano|
organizer-abbigliamento|4|||stiva|
sacco-biancheria|2|||stiva|
sacchetti-spazzatura||Per tenere i rifiuti nello zaino fino a un cestino vero|citta|entrambi|
accappatoio-microfibra|1||mare|entrambi|
mini-asciugamano|2|Nei bagni pubblici non c'è di che asciugarsi le mani|citta|entrambi|
etichette-bagaglio|2|||entrambi|
sacca-stagna-costume|1||mare|entrambi|
copri-zaino-impermeabile|1|||mano|
ombrello-compatto|1|Gli acquazzoni estivi arrivano senza preavviso|citta|entrambi|
mascherina|2|Utile in metro affollate e con raffreddore|citta|mano|
portamonete|1|Monete yen: i cestini sono rari|citta|entrambi|
detersivo-fogli|1|Per bucato a mano nei lavandini||entrambi|
tappi-orecchie||Utili in volo e nei ryokan rumorosi||mano|
maschera-sonno||Volo lungo e jet lag||mano|
bilancina-bagaglio||Prima di partire per l'aeroporto||mano|
occhialini|1||mare|entrambi|
scarpette-scoglio|1||mare|entrambi|
telo-mare|1||mare|stiva|Ingombra: meglio in stiva
custodia-waterproof|1|Per telefono e documenti al mare|mare|mano|
dry-bag|1|Protegge da spruzzi e pioggia|mare|entrambi|
headlamp|1|Per escursioni e ryokan bui|montagna|mano|
bastoncini-trekking|1||montagna|stiva|Verifica compagnia: spesso in stiva
`
    },
    {
      id: "tecnologia",
      title: "Tecnologia",
      note: "Le prese sono di tipo A a 100 V: la maggior parte dei caricatori moderni regge, gli apparecchi con resistenza no.",
      rows: `
kindle||||solo_mano|Batteria al litio: solo cabina
caricatore-kindle||||mano|
caricatore-telefono||||mano|
cover-cordino||Comoda per fotografare e usare le mappe camminando|citta|mano|
power-bank||In stiva è vietato: va in bagaglio a mano||solo_mano|Max 2 a persona; non ricaricare a bordo
adattatore-prese||Tipo A, due lamelle piatte, 100 V||mano|
fotocamera-vintage||||solo_mano|Batteria al litio: solo cabina
pellicole||Chiedi il controllo manuale ai raggi X per le pellicole sensibili||mano|
auricolari||In treno e in metro si parla a voce bassissima||mano|
cavo-auricolari||||mano|
`
    },
    {
      id: "volo",
      title: "Zainetto per il volo",
      note: "Tutto ciò che non puoi permetterti di perdere, più il minimo per sopravvivere a undici ore e a un eventuale bagaglio in ritardo.",
      rows: `
documenti||||mano|
passaporto||Controlla che sia valido almeno per tutta la durata del viaggio||mano|
fotocopia-documenti||Tienile separate dagli originali||mano|
carta-pagamento||Il Giappone accetta le carte quasi ovunque, ma non nei templi e nei banchi piccoli||mano|
contanti||Qualche banconota già cambiata evita di cercare un ATM appena atterrati||mano|
penna|1|Serve per i moduli di immigrazione e dogana||mano|
blocchetto|1|Scrivere un indirizzo è più veloce che spiegarlo||mano|
borraccia-vuota|1|Si riempie dopo i controlli||mano|
cuscino-viaggio|1|||mano|
occhiali-vista|1|Tienili nello zaino a mano, non in stiva||mano|
burrocacao-volo|1|||mano|
fazzoletti-volo||||mano|
tampax-volo||||mano|
salviettine-volo||||mano|
intimo-cambio|1|L'assicurazione contro il bagaglio che arriva un giorno dopo||mano|
sacchetto-spazzatura-volo|1|||mano|
felpina|1|In aereo e nelle stazioni l'aria condizionata è aggressiva||mano|
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
    "camicia-leggera": "Camicia leggera",
    "felpa": "Felpa",
    "foulard-leggero": "Foulard leggero",
    "k-way-leggero": "K-way leggero",
    "pigiama": "Pigiama",
    "costume-bagno": "Costume da bagno",
    "cappellino": "Cappellino",
    "abbigliamento-volo": "Abbigliamento per il volo",
    "giacca-impermeabile": "Giacca impermeabile",
    "pile-caldo": "Pile o strato caldo",
    "guanti-leggeri": "Guanti leggeri",
    "berretto": "Berretto",
    "calze-compressione": "Calze a compressione",
    "sneakers-comode": "Sneakers comode",
    "infradito": "Infradito",
    "sandali": "Sandali",
    "scarpe-trekking": "Scarpe da trekking",
    "calze-trekking": "Calze da trekking",
    "spazzolino": "Spazzolino",
    "dentifricio": "Dentifricio",
    "filo-interdentale": "Filo interdentale",
    "deodorante": "Deodorante",
    "bagnoschiuma": "Bagnoschiuma",
    "shampoo": "Shampoo",
    "balsamo": "Balsamo",
    "definizione-ricci": "Definizione ricci",
    "olio-argan": "Olio di argan per capelli",
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
    "pinzetta": "Pinzetta",
    "salviettine-struccanti": "Salviettine struccanti",
    "salviettine-wc": "Salviettine wc",
    "fazzoletti-carta": "Fazzoletti di carta",
    "sapone-marsiglia": "Sapone di Marsiglia per bucato",
    "sacchetto-liquidi": "Sacchetto trasparente per liquidi",
    "flaconi-viaggio": "Flaconi da viaggio 100 ml",
    "disinfettante-mani": "Disinfettante mani",
    "crema-mani": "Crema mani",
    "dopobarba": "Dopobarba",
    "after-sun": "Crema dopo-sole",
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
    "antiacido": "Antiacido",
    "collutorio-viaggio": "Collutorio da viaggio",
    "elettroliti": "Sal integratori o elettroliti",
    "antisettico": "Antisettico",
    "occhiali-vista-giorno": "Occhiali da vista",
    "occhiali-scorta": "Occhiali da vista di scorta",
    "lenti-contatto": "Lenti a contatto",
    "liquido-lenti": "Liquido per lenti a contatto",
    "collirio": "Collirio o gocce oculari",
    "custodia-occhiali": "Custodia per occhiali",
    "panno-occhiali": "Panno per occhiali",
    "occhiali-sole": "Occhiali da sole",
    "ventaglio": "Ventaglio",
    "shopper-richiudibile": "Shopper richiudibile",
    "lucchetto": "Lucchetto",
    "organizer-documenti": "Organizer per documenti",
    "organizer-abbigliamento": "Organizer per abbigliamento",
    "sacco-biancheria": "Sacco per biancheria sporca",
    "sacchetti-spazzatura": "Sacchetti per la spazzatura",
    "accappatoio-microfibra": "Accappatoio in microfibra",
    "mini-asciugamano": "Mini asciugamano in microfibra",
    "etichette-bagaglio": "Etichette per il bagaglio",
    "sacca-stagna-costume": "Sacca stagna porta costume",
    "copri-zaino-impermeabile": "Copri zaino impermeabile",
    "ombrello-compatto": "Ombrello compatto",
    "mascherina": "Mascherine",
    "portamonete": "Portamonete",
    "detersivo-fogli": "Detersivo in fogli per bucato",
    "tappi-orecchie": "Tappi per le orecchie",
    "maschera-sonno": "Maschera per dormire",
    "bilancina-bagaglio": "Bilancina per bagaglio",
    "occhialini": "Occhialini da nuoto",
    "scarpette-scoglio": "Scarpette da scoglio",
    "telo-mare": "Telo mare",
    "custodia-waterproof": "Custodia impermeabile",
    "dry-bag": "Dry bag",
    "headlamp": "Frontale o torcia",
    "bastoncini-trekking": "Bastoncini da trekking",
    "kindle": "Lettore e-book",
    "caricatore-kindle": "Caricatore del lettore",
    "caricatore-telefono": "Caricatore del telefono",
    "cover-cordino": "Cover con cordino per smartphone",
    "power-bank": "Power bank",
    "adattatore-prese": "Adattatore prese Giappone",
    "fotocamera-vintage": "Fotocamera analogica",
    "pellicole": "Pellicole",
    "auricolari": "Auricolari",
    "cavo-auricolari": "Cavo per auricolari",
    "documenti": "Documenti",
    "passaporto": "Passaporto",
    "fotocopia-documenti": "Fotocopia di documenti e passaporto",
    "carta-pagamento": "Carta di pagamento",
    "contanti": "Contanti in euro e yen",
    "penna": "Penna",
    "blocchetto": "Blocchetto di carta",
    "borraccia-vuota": "Borraccia vuota",
    "cuscino-viaggio": "Cuscino da viaggio",
    "occhiali-vista": "Occhiali da vista",
    "burrocacao-volo": "Burrocacao",
    "fazzoletti-volo": "Fazzoletti",
    "tampax-volo": "Tamponi",
    "salviettine-volo": "Salviettine wc",
    "intimo-cambio": "Intimo di ricambio",
    "sacchetto-spazzatura-volo": "Sacchetto per la spazzatura",
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
