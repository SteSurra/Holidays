(function () {
  "use strict";

  // Glossario: ogni parola giapponese che compare in una scheda viene spiegata
  // in fondo alla scheda stessa. Il turista non deve sapere già cosa significa
  // "honden" o "koji" per capire quello che sta leggendo, e ripetere la
  // spiegazione dove serve costa meno che lasciarlo indovinare.
  const terms = {
    "torii": "Il portale, di solito rosso o in legno grezzo, che segna il passaggio dal mondo ordinario a quello sacro di un santuario shintoista. Attraversarlo è già entrare: per questo si tende a non camminare esattamente al centro, corsia riservata per tradizione alle divinità.",
    "jinja": "Santuario shintoista. Si riconosce dal torii all'ingresso e dalla vasca d'acqua per lavarsi mani e bocca prima di avvicinarsi.",
    "honden": "L'edificio più interno di un santuario, quello che custodisce la divinità. Di norma non è visitabile e spesso non è nemmeno visibile: ci si ferma prima.",
    "haiden": "La sala delle preghiere di un santuario, davanti al honden: è qui che si getta la moneta, si suona la campana e si fanno i due inchini, due battiti di mani e un inchino finale.",
    "tera": "Tempio buddhista. In giapponese il nome finisce spesso in -ji o -dera, come Senso-ji o Kiyomizu-dera: la parola tempio è già dentro il nome.",
    "pagoda": "La torre a più tetti sovrapposti di un tempio buddhista. Nasce come contenitore di reliquie, non come campanile: i piani non si visitano quasi mai.",
    "bosatsu": "Bodhisattva: nel buddhismo, una figura che ha rinunciato al proprio nirvana per aiutare gli altri. Nelle statue si riconosce dagli ornamenti, mentre il Buddha è più spoglio.",
    "shogun": "Il capo militare che governò davvero il Giappone per quasi settecento anni, mentre l'imperatore restava a Kyoto con un ruolo soprattutto rituale.",
    "daimyo": "I signori feudali che controllavano le province sotto lo shogun. I castelli che si visitano oggi erano le loro sedi di potere.",
    "samurai": "La classe guerriera al servizio dei daimyo, abolita alla fine dell'Ottocento. Le loro case, più sobrie di quanto ci si aspetti, si visitano a Kanazawa e altrove.",
    "geiko": "A Kyoto è il nome locale della geisha: un'artista professionista di danza, musica e conversazione. Non è una cortigiana, e fotografarla per strada senza permesso è maleducazione punibile con una multa.",
    "maiko": "L'apprendista geiko, riconoscibile dal kimono con le maniche lunghissime e dagli ornamenti vistosi tra i capelli. Il percorso di formazione dura anni.",
    "machiya": "Le case a schiera in legno delle città storiche: strette sulla strada e lunghissime verso l'interno, perché un tempo le tasse si pagavano sui metri di facciata.",
    "gassho-zukuri": "Letteralmente \"mani giunte in preghiera\": il tetto di paglia molto ripido delle case di Shirakawa-go, disegnato così per scaricare metri di neve e ospitare i bachi da seta nel sottotetto.",
    "ryokan": "Locanda tradizionale con stanze in tatami, futon steso la sera e spesso cena e colazione incluse. Il prezzo si intende per persona, non per stanza.",
    "shukubo": "L'alloggio dentro un tempio, aperto anche ai visitatori. Orari rigidi, cucina vegetariana e, se ci si sveglia, la funzione dell'alba.",
    "tatami": "Le stuoie di paglia di riso che coprono i pavimenti tradizionali. Ci si cammina solo scalzi o in calze, mai con le pantofole della casa.",
    "shoji": "I pannelli scorrevoli di legno e carta che dividono le stanze e filtrano la luce. Si spostano con delicatezza: la carta si buca con niente.",
    "noren": "La tenda in tessuto appesa sopra la porta di un locale. Se è fuori il locale è aperto; quando la tirano dentro, hanno chiuso.",
    "onsen": "Bagno termale alimentato da acqua geotermica. Ci si lava accuratamente seduti prima di entrare, si entra nudi e l'asciugamano non tocca l'acqua.",
    "sento": "Bagno pubblico di quartiere con acqua di rubinetto riscaldata, non termale. Stesse regole dell'onsen, atmosfera più quotidiana.",
    "izakaya": "Locale dove si beve e si mangia in piccoli piatti da condividere, l'equivalente più vicino a un'osteria. Spesso arriva un coperto d'obbligo, l'otoshi, che non avete ordinato.",
    "yatai": "Bancarella o chiosco su strada, tipico delle feste e di alcune città. Si mangia in piedi, si paga contanti.",
    "konbini": "I minimarket aperti ventiquattr'ore: cibo pronto di qualità sorprendente, bancomat che accettano carte straniere, biglietti, spedizioni e bagni puliti.",
    "depachika": "Il piano interrato gastronomico dei grandi magazzini, dove si trovano bento, dolci e specialità regionali. Nell'ultima ora prima della chiusura molti banchi scontano.",
    "teishoku": "Il menu completo: piatto principale, riso, zuppa di miso e sottaceti. È il modo più economico ed equilibrato di pranzare.",
    "donburi": "La ciotola di riso con qualcosa sopra. Il suffisso -don nei nomi dei piatti significa esattamente questo: gyudon è manzo su riso.",
    "dashi": "Il brodo di base della cucina giapponese, di solito alga kombu e scaglie di tonnetto essiccato. È la ragione per cui molti piatti apparentemente vegetariani non lo sono.",
    "umami": "Il quinto gusto, oltre a dolce, salato, acido e amaro: la sapidità profonda di dashi, miso, salsa di soia e funghi. La parola è giapponese perché qui è stata identificata.",
    "miso": "Pasta fermentata di soia, sale e koji. Cambia colore, sapore e sapidità da regione a regione: quello bianco è dolce, quello scuro molto più deciso.",
    "koji": "La muffa nobile che avvia la fermentazione di sake, miso e salsa di soia. È l'ingrediente invisibile dietro metà della cucina giapponese.",
    "mirin": "Vino di riso dolce da cucina. Insieme a salsa di soia e zucchero dà la lucentezza tipica delle salse laccate.",
    "tsukemono": "I sottaceti che accompagnano quasi ogni pasto. Servono a pulire la bocca tra un boccone e l'altro, non sono un contorno da finire.",
    "wagashi": "I dolci tradizionali, spesso a base di pasta di fagioli azuki e riso. Poco zuccherini rispetto a quelli europei e pensati per accompagnare il tè amaro.",
    "anko": "La pasta dolce di fagioli azuki, ripieno di metà dei dolci giapponesi. Il sapore ricorda la castagna più che il fagiolo.",
    "mochi": "Riso glutinoso pestato fino a diventare una pasta elastica. Va masticato con calma: ogni anno provoca incidenti a chi lo ingoia in fretta.",
    "matcha": "Tè verde in polvere, macinato da foglie coltivate all'ombra e sbattuto con l'acqua invece che in infusione. Si beve tutto, foglia compresa: per questo è così intenso.",
    "sencha": "Il tè verde in foglia di uso quotidiano, in infusione. È quello che vi verrà servito quasi ovunque senza chiederlo.",
    "washoku": "La cucina tradizionale giapponese riconosciuta dall'UNESCO: stagionalità, rispetto dell'ingrediente e presentazione fanno parte del piatto quanto il sapore.",
    "kaiseki": "Il pasto formale a più portate, costruito sulla stagione e servito in un ordine preciso. Dura ore, si prenota e ha un prezzo di conseguenza.",
    "obanzai": "La cucina casalinga di Kyoto, fatta di piccoli piatti di verdure e conserve. È l'opposto del kaiseki: quotidiana, economica, poco appariscente.",
    "ukiyo-e": "Le stampe xilografiche del periodo Edo, \"immagini del mondo fluttuante\": attori, cortigiane, paesaggi. Erano stampe popolari a basso costo, non arte da museo.",
    "washi": "La carta giapponese fatta a mano con fibre di gelso. Più fibrosa e resistente della carta occidentale, si usa per lampade, porte e restauri.",
    "urushi": "La lacca ricavata dalla linfa di un albero, stesa in decine di strati sottili. Da grezza è irritante per la pelle, da finita è impermeabile e durissima.",
    "kintsugi": "La riparazione della ceramica con lacca e polvere d'oro, che evidenzia la rottura invece di nasconderla. È diventata una metafora, ma nasce come tecnica pratica.",
    "mingei": "Il movimento dell'artigianato popolare novecentesco: oggetti d'uso quotidiano fatti a mano, valorizzati per la loro funzione e non per la firma.",
    "obi": "La fascia che chiude il kimono, spesso più preziosa del kimono stesso. Nei dischi in vinile è invece la striscia di carta laterale con le informazioni in giapponese.",
    "yukata": "Il kimono leggero di cotone, senza fodera, per l'estate e per i bagni termali. Molti hotel lo forniscono nella stanza.",
    "shamisen": "Liuto a tre corde suonato con un grosso plettro, colonna sonora del teatro e dei quartieri di intrattenimento.",
    "taiko": "I tamburi giapponesi e, per estensione, l'arte di suonarli in gruppo. Il suono si sente nel petto prima che nelle orecchie.",
    "kabuki": "Teatro popolare con trucco marcato, costumi enormi e recitazione stilizzata. Tutti i ruoli, femminili compresi, sono interpretati da uomini.",
    "bunraku": "Teatro di marionette grandi quasi come persone, mosse a vista da tre burattinai, con un narratore e uno shamisen a raccontare.",
    "sumo": "La lotta rituale nazionale. Gli incontri durano pochi secondi, ma le cerimonie di sale, acqua e postura che li precedono sono metà dello spettacolo.",
    "shinkansen": "I treni ad alta velocità. Partono all'orario esatto, il posto si prenota o si viaggia in carrozza libera, e si mangia il bento senza che nessuno storca il naso.",
    "eki": "Stazione ferroviaria. Compare in fondo a moltissimi nomi di luogo: Kyoto-eki è la stazione di Kyoto.",
    "ekiben": "Il bento venduto in stazione, diverso in ogni città e pensato per essere mangiato in treno. Comprarlo è parte del viaggio, non un ripiego.",
    "sakura": "I ciliegi da fiore e la loro fioritura. Il picco dura pochi giorni e si sposta da sud a nord tra fine marzo e maggio.",
    "momiji": "Gli aceri giapponesi e il rosso del foliage autunnale, che tra novembre e dicembre attira quanta gente la fioritura dei ciliegi.",
    "zen": "La scuola buddhista che privilegia la meditazione seduta sull'erudizione. I giardini di sassi e i templi essenziali di Kyoto nascono da questa impostazione.",
    "goshuin": "Il timbro calligrafico che i templi e i santuari appongono a mano sul quaderno del visitatore. Non è un souvenir turistico ma un attestato di visita: si chiede con rispetto e si paga una piccola offerta.",
    "omamori": "L'amuleto in tessuto venduto nei santuari, ognuno per uno scopo preciso. Non va aperto, e per tradizione si riporta indietro dopo un anno.",
    "ema": "Le tavolette di legno su cui si scrive un desiderio e che si appendono al santuario perché le divinità lo leggano."
  };

  const aliases = {
    "santuario": "jinja", "santuari": "jinja", "tempio": "tera", "templi": "tera",
    "geisha": "geiko", "konbini": "konbini", "otoshi": "izakaya",
    "shukubo": "shukubo", "azuki": "anko", "-don": "donburi"
  };

  window.JAPAN_DATA.glossary = terms;
  window.JAPAN_DATA.glossaryAliases = aliases;
})();
