(function () {
  "use strict";

  // Lista valigia riutilizzabile: solo oggetti, nessun nome di persona.
  // Il numero indica la quantità consigliata quando ha senso indicarla.
  const groups = [
    {
      id: "abbigliamento",
      title: "Abbigliamento",
      note: "In Giappone si cammina molto e si entra spesso scalzi: privilegia strati leggeri e calze presentabili.",
      rows: `
mutande||Meglio abbondare: le lavanderie a gettoni sono ovunque ma il tempo no
calze||Si tolgono le scarpe in templi, ryokan e alcuni ristoranti
reggiseni||
t-shirt-canotte||
pantaloncini||
pantaloni||
vestito-gonna||
camicia-leggera|1|Utile per cene e locali un po' più formali
felpa|2|Le sere in montagna a Takayama e Nagano restano fresche
foulard-leggero|1|Ripara dall'aria condizionata molto fredda di treni e negozi
k-way-leggero|1|Compatto: gli acquazzoni arrivano senza preavviso
pigiama|3|Molti hotel forniscono lo yukata, ma non tutti
costume-bagno|2|Serve per piscine e alcuni parchi, non per gli onsen tradizionali
cappellino|2|
abbigliamento-volo|1|Comodo e a strati: undici ore cambiano tre climi
`
    },
    {
      id: "scarpe",
      title: "Scarpe",
      note: "Si superano facilmente i 20.000 passi al giorno e le scarpe si tolgono spesso: conta più la comodità dell'estetica.",
      rows: `
sneakers-comode|1|Già rodate: il Giappone non è il posto dove inaugurarle
infradito|1|
sandali|1|
`
    },
    {
      id: "beauty",
      title: "Beauty case",
      note: "Quasi tutto si ricompra in konbini e drugstore, spesso meglio: porta il minimo e lascia spazio in valigia.",
      rows: `
spazzolino||
dentifricio||
filo-interdentale||
deodorante||Il deodorante giapponese è molto più leggero di quello europeo
bagnoschiuma||Gli hotel lo forniscono quasi sempre
shampoo||
balsamo||
definizione-ricci||
olio-argan||
pettine-spazzola||
elastici-mollette||
crema-corpo||
profumo||
crema-viso||
contorno-occhi||
burrocacao||
make-up||
assorbenti-tampax||Reperibili ovunque, ma le marche cambiano parecchio
pulisci-orecchie||
forbicine||Solo in stiva: in cabina vengono sequestrate
lima-unghie||
rasoio||Solo in stiva se è a lama
salviettine-struccanti||
salviettine-wc||Molti bagni pubblici non hanno carta né asciugamani
fazzoletti-carta||
sapone-marsiglia||Per il bucato a mano nei lavandini
`
    },
    {
      id: "farmacia",
      title: "Farmacia",
      note: "In Giappone i farmaci da banco hanno principi attivi e dosaggi diversi: porta ciò che sai già usare.",
      rows: `
tachipirina||
ibuprofene||
oki||
termometro-elettronico||
cerotti||
cerotti-compeed||Le vesciche sono il problema numero uno di questo viaggio
fermenti-lattici||
imodium||
integratori||
crema-solare-spf50||
crema-solare-stick||
stick-dopo-puntura||Le zanzare estive sono insistenti, soprattutto vicino ai templi
`
    },
    {
      id: "accessori",
      title: "Accessori",
      note: "Le strade sono quasi prive di cestini: quello che apri te lo riporti dietro fino a sera.",
      rows: `
occhiali-sole|1|
ventaglio|1|Si vende ovunque e in estate diventa indispensabile
shopper-richiudibile|1|I sacchetti sono a pagamento e servono a portarsi via i rifiuti
lucchetto|1|
organizer-documenti|1|
organizer-abbigliamento|4|
sacco-biancheria|2|
sacchetti-spazzatura||Per tenere i rifiuti nello zaino fino a un cestino vero
accappatoio-microfibra|1|
mini-asciugamano|2|Nei bagni pubblici non c'è di che asciugarsi le mani
etichette-bagaglio|2|
sacca-stagna-costume|1|
copri-zaino-impermeabile|1|
`
    },
    {
      id: "tecnologia",
      title: "Tecnologia",
      note: "Le prese sono di tipo A a 100 V: la maggior parte dei caricatori moderni regge, gli apparecchi con resistenza no.",
      rows: `
kindle||
caricatore-kindle||
caricatore-telefono||
cover-cordino||Comoda per fotografare e usare le mappe camminando
power-bank||In stiva è vietato: va in bagaglio a mano
adattatore-prese||Tipo A, due lamelle piatte, 100 V
fotocamera-vintage||
pellicole||Chiedi il controllo manuale ai raggi X per le pellicole sensibili
auricolari||In treno e in metro si parla a voce bassissima
cavo-auricolari||
`
    },
    {
      id: "volo",
      title: "Zainetto per il volo",
      note: "Tutto ciò che non puoi permetterti di perdere, più il minimo per sopravvivere a undici ore e a un eventuale bagaglio in ritardo.",
      rows: `
documenti||
passaporto||Controlla che sia valido almeno per tutta la durata del viaggio
fotocopia-documenti||Tienile separate dagli originali
carta-pagamento||Il Giappone accetta le carte quasi ovunque, ma non nei templi e nei banchi piccoli
contanti||Qualche banconota già cambiata evita di cercare un ATM appena atterrati
penna|1|Serve per i moduli di immigrazione e dogana
blocchetto|1|Scrivere un indirizzo è più veloce che spiegarlo
borraccia-vuota|1|Si riempie dopo i controlli
cuscino-viaggio|1|
occhiali-vista|1|
burrocacao-volo|1|
fazzoletti-volo||
tampax-volo||
salviettine-volo||
intimo-cambio|1|L'assicurazione contro il bagaglio che arriva un giorno dopo
sacchetto-spazzatura-volo|1|
felpina|1|In aereo e nelle stazioni l'aria condizionata è aggressiva
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
    "sneakers-comode": "Sneakers comode",
    "infradito": "Infradito",
    "sandali": "Sandali",
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
    "salviettine-struccanti": "Salviettine struccanti",
    "salviettine-wc": "Salviettine wc",
    "fazzoletti-carta": "Fazzoletti di carta",
    "sapone-marsiglia": "Sapone di Marsiglia per bucato",
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
    "occhiali-vista": "Occhiali da vista o lenti",
    "burrocacao-volo": "Burrocacao",
    "fazzoletti-volo": "Fazzoletti",
    "tampax-volo": "Tamponi",
    "salviettine-volo": "Salviettine wc",
    "intimo-cambio": "Intimo di ricambio",
    "sacchetto-spazzatura-volo": "Sacchetto per la spazzatura",
    "felpina": "Felpa leggera"
  };

  window.JAPAN_DATA.packing = groups.map(function (group) {
    return {
      id: group.id,
      title: group.title,
      note: group.note,
      items: group.rows.trim().split("\n").map(function (line) {
        const parts = line.split("|");
        return {
          id: "pack-" + group.id + "-" + parts[0],
          name: labels[parts[0]] || parts[0],
          quantity: parts[1] || "",
          note: parts[2] || ""
        };
      })
    };
  });
})();
