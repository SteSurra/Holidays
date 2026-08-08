(function () {
  "use strict";

  const data = window.JAPAN_DATA;
  const sourceRegistry = window.JAPAN_RESEARCH_SOURCES || { general:{}, cities:{} };
  const cityGuides = {
    all: {
      identity: "Le soste quotidiane tra stazioni, konbini, depachika e distributori automatici raccontano il Giappone contemporaneo quanto i piatti regionali più famosi.",
      place: "Questi prodotti si incontrano lungo tutto il viaggio e cambiano per catena, stagione e regione.",
      food: "Confronta versioni, temperatura di servizio e ingredienti: anche una bevanda in lattina o un panino da konbini può avere una cultura d'uso precisa.",
      history: "Convenience store, ferrovie e distribuzione automatica hanno trasformato abitudini urbane, pasti rapidi e disponibilità di prodotti durante tutto il giorno.",
      signs: "Cerca etichette stagionali, prodotti regionali, ripiani caldi e freddi e indicazioni limited.",
      route: "Usa queste scoperte come pause tra le tappe, senza sostituire tutti i pasti con triangoli di riso per puro entusiasmo logistico."
    },
    osaka: {
      identity: "Osaka si capisce attraverso l'acqua, i commerci e una cultura urbana diretta: qui l'eleganza conta meno dell'energia con cui strade, mercati e locali vengono vissuti.",
      place: "La città alterna grandi infrastrutture contemporanee a tracce della città mercantile. Nei quartieri centrali osserva ponti, canali, insegne verticali e il rapporto continuo tra piano strada e locali ai piani superiori.",
      food: "La cucina di Osaka è popolare, saporita e spesso cotta davanti al cliente. Dashi, piastra e impasti di farina sono ricorrenti; il ritmo ideale è assaggiare porzioni piccole in più soste.",
      history: "Fu il grande nodo commerciale del paese e il mercato del riso dell'età Edo. Il potere politico del castello e quello economico dei mercanti hanno lasciato due anime ancora leggibili.",
      signs: "Cerca i grandi blocchi di pietra del castello, gli antichi corsi d'acqua, le vie coperte shōtengai e i piccoli santuari assorbiti nel tessuto commerciale.",
      route: "Collega la visita alle aree di Namba, Dōtonbori e Shinsekai per confrontare tre modi diversi di vivere la strada."
    },
    nara: {
      identity: "Nara conserva la scala della prima capitale stabile del Giappone: grandi complessi buddhisti, bosco sacro e potere imperiale formano un unico paesaggio culturale.",
      place: "Qui gli spazi tra gli edifici sono parte della visita. Viali, lanterne, recinti e bosco raccontano gerarchie e rituali quanto le sale principali.",
      food: "La cucina locale riflette conservazione e vie di pellegrinaggio: sushi pressato, somen, tè e dolci semplici sono legati a ingredienti trasportabili e tradizioni molto antiche.",
      history: "Tra 710 e 784 Nara fu il centro di uno stato che usò il buddhismo anche come progetto politico. Templi e statue furono strumenti di protezione, prestigio e organizzazione nazionale.",
      signs: "Osserva tegole, basamenti, porte monumentali e la relazione tra Tōdai-ji, Kasuga Taisha e il monte Wakakusa. I cervi collegano ancora mito, santuario e città.",
      route: "Procedi lentamente dal parco verso i complessi maggiori; le distanze aiutano a percepire la scala dell'antica capitale."
    },
    miyajima: {
      identity: "Miyajima non è soltanto il torii sull'acqua: l'intera isola è stata pensata come presenza sacra, con il santuario disposto sul margine tra terra, mare e montagna.",
      place: "Marea, luce e affollamento cambiano radicalmente l'esperienza. Tornare nello stesso punto in due momenti diversi fa capire meglio l'architettura di Itsukushima.",
      food: "Ostriche, grongo anago e dolci momiji manjū raccontano il mare interno di Seto e una lunga economia di pellegrini, botteghe e prodotti facili da portare con sé.",
      history: "Il santuario acquistò splendore con Taira no Kiyomori nel XII secolo. La scelta di costruire sull'acqua rispettava simbolicamente la sacralità del suolo dell'isola.",
      signs: "Guarda come passerelle e padiglioni seguono il litorale, come il torii cambia con la marea e come il monte Misen resta sempre il fondale spirituale dell'insediamento.",
      route: "Combina lungomare, santuario e una salita verso Daishō-in o Misen: il significato emerge dal passaggio dal mare alla montagna."
    },
    hiroshima: {
      identity: "Hiroshima è una città del delta: fiumi, ponti e isole urbane orientano il movimento. La memoria del 1945 convive con una città viva, ricostruita e non riducibile al solo memoriale.",
      place: "Nel Parco della Pace presta attenzione agli assi visivi e ai vuoti, poi confrontali con i quartieri commerciali e il castello per ricostruire la storia prima e dopo la distruzione.",
      food: "Okonomiyaki a strati, ostriche e noodles piccanti hanno un carattere concreto. Molti piatti sono legati alla ricostruzione, al porto e alla disponibilità di ingredienti del Mare Interno.",
      history: "Nata come città-castello alla fine del Cinquecento, divenne centro militare e industriale. Dopo il 1945 scelse di costruire un'identità internazionale fondata sulla pace.",
      signs: "Segui il corso dei fiumi, cerca gli alberi sopravvissuti, leggi la distanza tra A-Bomb Dome, cenotafio e museo, e nota quanto verde struttura oggi il centro.",
      route: "Dopo il memoriale attraversa a piedi il centro contemporaneo: il contrasto evita una lettura astratta e restituisce la città ai suoi abitanti."
    },
    kyoto: {
      identity: "Kyoto è un mosaico di corti imperiali, templi, quartieri artigiani e montagne sacre. Non esiste un solo centro: ogni area ha un proprio ritmo e una diversa relazione con l'acqua e il paesaggio.",
      place: "Leggi le sequenze: porta, cortile, sala, veranda e giardino sono progettati come un percorso. I dettagli stagionali e gli scorci incorniciati contano più della corsa tra edifici famosi.",
      food: "La cucina di Kyoto valorizza stagionalità, consistenze e presentazione. Tofu, verdure, dashi, tè e dolci wagashi usano sapori più misurati, spesso legati a templi e cerimonia del tè.",
      history: "Capitale dal 794 al 1868, Kyoto accumulò oltre mille anni di istituzioni, incendi, ricostruzioni e mecenatismo. Molto di ciò che appare antico è il risultato di una continuità rinnovata.",
      signs: "Osserva l'orientamento sulla griglia stradale, i canali, i tetti, le gronde profonde, i giardini presi in prestito dal paesaggio e la distinzione tra tempio buddhista e santuario shintoista.",
      route: "Raggruppa le visite per area e lascia spazio alle strade tra una tappa e l'altra: Kyoto si comprende nei passaggi, non soltanto nelle destinazioni."
    },
    kanazawa: {
      identity: "Kanazawa unisce castello feudale, quartieri di samurai e chaya, giardini e botteghe. La sua ricchezza culturale nacque dalla strategia dei Maeda di investire in arti e artigianato.",
      place: "Le distanze sono compatte ma i quartieri hanno caratteri distinti. Confronta muri in terra, canali, facciate a listelli e il paesaggio controllato di Kenroku-en.",
      food: "Il Mare del Giappone porta pesce, granchi e molluschi; la tradizione Kaga aggiunge verdure, fermentazioni e una presentazione raffinata sostenuta dalla cultura delle ceramiche.",
      history: "Durante il periodo Edo il dominio dei Maeda fu tra i più ricchi. Arti performative, foglia d'oro, lacca e cucina divennero una forma di prestigio meno minacciosa del potere militare.",
      signs: "Cerca i canali dei quartieri samurai, i muri in terra protetti da stuoie, le facciate delle chaya e l'uso intenzionale di acqua, pietre e prospettive nel giardino.",
      route: "Collega mercato Ōmichō, castello, Kenroku-en e un quartiere storico: insieme mostrano approvvigionamento, potere, estetica e vita urbana."
    },
    shirakawago: {
      identity: "Shirakawa-go è un paesaggio di adattamento collettivo: tetti ripidi, grandi case e campi stretti rispondono a neve, isolamento e lavoro domestico.",
      place: "Non guardare soltanto la forma delle case. Osserva orientamento, ventilazione, focolare, sottotetti e distanza tra gli edifici per capire come funzionava il villaggio.",
      food: "La cucina di montagna usa miso, verdure conservate, grano saraceno e pesci di torrente. I sapori sono robusti perché nati per sostenere lavoro e inverni lunghi.",
      history: "Le case gasshō-zukuri concentravano famiglia, produzione e allevamento dei bachi da seta. Il sistema comunitario yui rendeva possibile rifare insieme i tetti di paglia.",
      signs: "Guarda le falde senza chiodi, le corde, il fumo che sale dal focolare e la distribuzione dei piani. Dal punto panoramico leggi il villaggio come sistema, non come collezione di case.",
      route: "Alterna una casa visitabile, il percorso a livello strada e il belvedere: interno, vita quotidiana e forma del paesaggio si spiegano a vicenda."
    },
    takayama: {
      identity: "Takayama porta in città la cultura delle montagne di Hida: legname, falegnameria, sake, mercati e case mercantili definiscono un centro storico ancora leggibile.",
      place: "A Sanmachi osserva la continuità delle facciate, i canali lungo strada, le insegne delle sakagura e la profondità delle case, strette davanti e allungate sul retro.",
      food: "Manzo Hida, miso su foglia di magnolia, verdure conservate e sake locale riflettono clima alpino e disponibilità stagionale. La brace e la fermentazione sono fili conduttori.",
      history: "Lo shogunato controllò direttamente Hida per le sue risorse forestali. I carpentieri locali acquisirono una fama nazionale, mentre mercanti e produttori di sake animavano la città.",
      signs: "Cerca sugidama di cedro davanti ai birrifici, magazzini dei carri del festival, griglie in legno e canali. Ogni elemento collega materia prima, mestiere e rituale.",
      route: "Visita il mercato al mattino, poi Jinya e Sanmachi: amministrazione, commercio e vita quotidiana emergono in una sequenza naturale."
    },
    matsumoto: {
      identity: "Matsumoto è una città di castello ai piedi delle Alpi, con una forte cultura di artigianato, musica e oggetti d'uso. Il nero del mastio contrasta con la luce ampia della valle.",
      place: "Nel castello segui la logica difensiva verticale; a Nakamachi e Nawate passa invece alla scala dei mercanti, dei kura resistenti al fuoco e dei piccoli negozi.",
      food: "Soba, miso, verdure di montagna e prodotti caseari riflettono altitudine e clima. I sapori sono netti e spesso valorizzano ingredienti semplici più che salse elaborate.",
      history: "Il castello conserva strutture lignee originali del primo Seicento. La città mercantile e il movimento mingei hanno poi costruito un'identità fondata sul fare bene oggetti quotidiani.",
      signs: "Osserva feritoie, scale ripide e travi del mastio, poi le pareti namako dei magazzini e le montagne che restano visibili dietro la griglia urbana.",
      route: "Accosta castello, museo cittadino e quartieri di Nakamachi e Nawate: il passaggio dal potere militare alla cultura materiale è immediato."
    },
    nagano: {
      identity: "Nagano è una porta verso montagne sacre e comunità alpine. Pellegrinaggio, neve e vie storiche hanno plasmato sia la città di Zenkō-ji sia i santuari di Togakushi.",
      place: "Le visite richiedono di leggere il percorso: la salita verso Zenkō-ji e il lungo viale di cedri di Togakushi preparano fisicamente e mentalmente all'arrivo.",
      food: "Soba, oyaki, mele, miso e conserve rispondono a inverni lunghi e terreni montani. Molte specialità sono nate come cibo pratico per casa, lavoro e pellegrinaggio.",
      history: "Zenkō-ji crebbe come meta aperta a fedeli diversi, mentre Togakushi sovrappone mito shintoista, ascetismo di montagna e tradizioni locali.",
      signs: "Nota le botteghe lungo l'accesso al tempio, il fumo d'incenso, le pietre di pellegrinaggio e, a Togakushi, la transizione dal villaggio al bosco di cedri.",
      route: "Dedica ritmi distinti alla città e alla montagna: Zenkō-ji si legge nella via urbana, Togakushi nella distanza e nel silenzio del bosco."
    },
    tokyo: {
      identity: "Tokyo è fatta di centralità sovrapposte. Antichi quartieri, nodi ferroviari e nuovi skyline convivono; per capirla bisogna osservare come ogni stazione genera una città diversa.",
      place: "Alterna grande scala e dettagli: un santuario tra i palazzi, una via commerciale sotto i binari o un vicolo di case basse spesso raccontano Tokyo meglio di una sola veduta panoramica.",
      food: "La cucina di Edo privilegiava preparazioni rapide e sapori definiti: sushi, tempura, soba e anguilla. La metropoli contemporanea aggiunge specializzazioni estreme e cucine regionali da tutto il paese.",
      history: "Edo divenne sede dello shogunato nel 1603 e una delle maggiori città del mondo. Dal 1868 Tokyo trasformò fossati, quartieri e infrastrutture senza cancellare del tutto la geografia precedente.",
      signs: "Cerca dislivelli, fossati, nomi di porte, vecchie vie commerciali e santuari di quartiere. Nei panorami individua fiumi e linee ferroviarie: sono la struttura nascosta della metropoli.",
      route: "Esplora per quartieri e limita gli attraversamenti inutili. Dentro una stessa area passa da un luogo celebre a una strada ordinaria per cogliere la vita quotidiana."
    },
    kamakura: {
      identity: "Kamakura è una capitale che non è diventata una metropoli. Per un secolo e mezzo governò il paese, poi il potere se ne andò e restarono i templi, incastrati fra colline boscose e mare: una città che si attraversa a piedi in un giorno.",
      place: "Il paesaggio è chiuso su tre lati da rilievi e aperto sul quarto verso la baia: è la ragione militare per cui fu scelta, e ancora oggi decide dove si può camminare. I templi stanno nelle valli laterali, raggiunti da sentieri brevi che salgono subito nel verde.",
      food: "Cucina di mare e di tempio: shirasu, i minuscoli bianchetti serviti crudi o lessati sul riso, e la tradizione vegetariana shōjin ryōri legata ai monasteri zen. Komachi-dōri è invece la via dello street food dolce.",
      history: "Nel 1185 Minamoto no Yoritomo vi insediò il primo shogunato, spostando il potere reale lontano dalla corte di Kyoto. Con lui arrivò lo zen dalla Cina, e con lo zen l'architettura, i giardini e l'estetica sobria che segnano ancora i templi della città.",
      signs: "Cerca i valichi scavati nella roccia che collegano le valli, le grotte yagura usate come tombe nei costoni, e i giardini pensati per essere guardati da seduti invece che percorsi.",
      route: "Escursione in giornata da Tokyo: circa un'ora di treno. Conviene percorrerla da ovest a est, dal Grande Buddha verso il centro, così la fatica sta all'inizio e la stazione alla fine."
    },
    hakone: {
      identity: "Hakone è una caldera abitata. Tutto quello che si visita — il lago, le fumarole, le terme, perfino il modo in cui si sale — sta dentro il cratere di un vulcano ancora attivo, e il viaggio consiste nell'attraversarlo cambiando mezzo cinque volte.",
      place: "Il dislivello è il tema: si sale in treno a cremagliera, funicolare e funivia perché la pendenza cambia troppo per un mezzo solo. Ogni cambio apre un paesaggio diverso, dalla valle boscosa alle rocce gialle di zolfo al lago.",
      food: "Cucina di montagna e di locanda: soba di grano saraceno, verdure di stagione e i pasti serviti nei ryokan. Le uova nere di Ōwakudani, annerite dallo zolfo delle sorgenti, sono il souvenir commestibile dell'area.",
      history: "Sulla Tōkaidō, la strada che univa Edo a Kyoto, Hakone ospitava un posto di blocco dove lo shogunato controllava chi passava. Dalla fine dell'Ottocento le sorgenti termali l'hanno trasformata nel luogo di villeggiatura di Tokyo.",
      signs: "Cerca il vapore che esce dal terreno lungo i pendii, i cedri secolari del viale che portava al posto di blocco, e la linea del Fuji sopra il lago quando l'aria è pulita.",
      route: "Escursione in giornata da Tokyo, circa un'ora e mezza. Il giro classico è ad anello e va fatto in un verso solo: invertirlo significa aspettare coincidenze che non ci sono."
    }
  };

  const placeGuides = {
    tempio: {
      why: "Un tempio non è un monumento isolato ma un complesso religioso costruito per guidare il passaggio dal quotidiano a uno spazio di pratica e contemplazione.",
      observe: "Individua la porta principale, il braciere dell'incenso, la sala dell'immagine venerata e gli edifici secondari. Tetti, campane, tavolette votive e giardini indicano funzione, epoca e scuola buddhista.",
      visit: "Fai una prima lettura d'insieme e poi torna sui dettagli. Se è consentito, entra nelle sale senza fretta e osserva come luce, profumo d'incenso e suono costruiscono l'esperienza.",
      etiquette: "Parla a voce bassa, rispetta i divieti fotografici e non oltrepassare corde o soglie chiuse. Davanti all'incenso evita di trasformare il gesto in una posa fotografica."
    },
    santuario: {
      why: "Il santuario shintoista mette in relazione comunità, natura e kami. La sua importanza si legge nei rituali e nel paesaggio, non soltanto nell'età degli edifici.",
      observe: "Riconosci il torii d'ingresso, la fontana di purificazione, la sala di culto, le corde shimenawa e i messaggeri animali. Le tavolette ema raccontano desideri molto contemporanei.",
      visit: "Attraversa il torii lateralmente, segui il percorso e lascia che il bosco o il viale preparino l'arrivo. Una sosta breve ma attenta vale più di una fotografia veloce.",
      etiquette: "Alla fontana si purificano mani e bocca senza toccare il mestolo con le labbra. Davanti alla sala segui i gesti degli altri e mantieni libero lo spazio centrale."
    },
    panorama: {
      why: "Un punto panoramico serve a ricomporre la geografia incontrata a livello strada: acqua, montagne, linee ferroviarie e quartieri diventano leggibili insieme.",
      observe: "Prima di fotografare, identifica almeno tre riferimenti già visitati. Nota direzione della luce, distanza delle montagne e infrastrutture che separano o collegano le aree.",
      visit: "Concediti un giro completo e torna sul lato migliore dopo alcuni minuti. Al tramonto considera il tempo necessario per uscire insieme agli altri visitatori.",
      etiquette: "Non occupare a lungo il punto migliore e tieni libero il passaggio. Con vento o pioggia segui le indicazioni del personale e proteggi bene telefono e cappello."
    },
    quartiere: {
      why: "Un quartiere storico o commerciale si comprende attraverso continuità e trasformazioni: abitazioni, botteghe, insegne e vita quotidiana contano quanto le singole attrazioni.",
      observe: "Guarda larghezza delle strade, materiali delle facciate, canalette, accessi laterali e attività al piano terra. Cerca ciò che è ancora usato, non soltanto ciò che è conservato.",
      visit: "Percorri prima l'asse principale, poi scegli una o due traverse. Fermati in una bottega o in un caffè per cambiare ritmo e osservare il quartiere dall'interno.",
      etiquette: "Ricorda che molte case e vie laterali sono spazi di vita. Evita fotografie ravvicinate alle persone, ingressi e finestre, e non bloccare il passaggio."
    },
    shopping: {
      why: "Le aree commerciali giapponesi sono osservatori privilegiati di gusto, stagionalità e vita urbana: assortimento e confezione raccontano a chi si rivolge il quartiere.",
      observe: "Confronta grandi magazzini, negozi specializzati e shōtengai. Nei piani alimentari depachika guarda provenienza, stagionalità e cura della confezione.",
      visit: "Fai un primo giro senza acquistare e annota prezzi e varianti. Raggruppa gli acquisti fragili o alimentari alla fine della giornata.",
      etiquette: "Chiedi prima di fotografare, non aprire confezioni e usa i cestini del negozio. Il tax-free richiede procedure specifiche: segui le indicazioni esposte."
    },
    castello: {
      why: "Un castello giapponese era una macchina politica e difensiva: mura, fossati, porte e visuali comunicavano controllo prima ancora del mastio.",
      observe: "Segui la salita e le svolte obbligate, cerca feritoie, pendenze delle mura e differenze tra parti originali e ricostruite. Il mastio è solo l'elemento più visibile del sistema.",
      visit: "Inizia dall'esterno per capire terreno e fossati, poi entra. Le scale possono essere ripide e la visita interna richiede più tempo di quanto suggerisca la distanza.",
      etiquette: "Dove richiesto togli le scarpe e porta con te la borsa fornita. Non toccare legni, intonaci o reperti e lascia passare chi procede più velocemente sulle scale."
    },
    museo: {
      why: "Il museo fornisce la grammatica per leggere ciò che vedrai fuori: cronologie, materiali e oggetti originali trasformano una visita successiva.",
      observe: "Seleziona pochi nuclei: una mappa, un oggetto quotidiano, una tecnica e una storia personale. Leggi le didascalie che collegano il reperto al luogo visitato.",
      visit: "Definisci prima quanto tempo dedicare e non cercare di vedere tutto. Parti dalla sezione più utile al resto della giornata e conserva energia per l'esterno.",
      etiquette: "Controlla i simboli relativi alle fotografie e mantieni distanza dalle vetrine. Audio e video vanno usati con cuffie e luminosità ridotta."
    },
    natura: {
      why: "Il paesaggio naturale giapponese è spesso anche culturale: sentieri, boschi sacri, coltivazioni e punti di sosta mostrano secoli di relazione tra comunità e ambiente.",
      observe: "Nota specie dominanti, acqua, pendenza e segni di manutenzione. Cerca il modo in cui sentiero, edifici e vedute sono stati inseriti nel terreno.",
      visit: "Valuta dislivello, fondo e meteo prima di partire. Procedi con margine, acqua e scarpe adatte, soprattutto quando il percorso è parte di una giornata già intensa.",
      etiquette: "Resta sui sentieri, riporta con te i rifiuti e non nutrire gli animali. In montagna dai priorità alle indicazioni locali rispetto al programma."
    },
    giardino: {
      why: "Il giardino giapponese è una composizione da attraversare: pietre, acqua, vegetazione e architettura organizzano sequenze e punti di vista.",
      observe: "Cerca paesaggi presi in prestito, ponti, lanterne, pietre di passaggio e cambi di scala. Osserva ciò che viene nascosto e rivelato a ogni curva.",
      visit: "Percorri il circuito una volta senza fermarti troppo, poi torna su due o tre vedute. Una pausa seduta dalla veranda cambia completamente la lettura.",
      etiquette: "Non uscire dai percorsi e non calpestare muschio o ghiaia rastrellata. Mantieni silenzio nei punti di contemplazione e limita l'attrezzatura ingombrante."
    },
    mercato: {
      why: "Il mercato mostra ingredienti, stagioni e abitudini meglio di molti musei. È però prima di tutto un luogo di lavoro e approvvigionamento.",
      observe: "Leggi provenienza e specializzazione dei banchi, confronta prodotti freschi e conservati e cerca utensili o confezioni legate alla cucina locale.",
      visit: "Arriva con appetito ma assaggia in modo selettivo. Mangia negli spazi indicati e alterna cibo pronto a una bottega che spieghi ingredienti o lavorazioni.",
      etiquette: "Non toccare i prodotti senza invito, evita di mangiare camminando dove è sconsigliato e lascia liberi corridoi e accessi ai banchi."
    },
    "casa-storica": {
      why: "Una casa storica rende visibili gerarchie familiari, lavoro e adattamento al clima. Pianta e materiali spiegano la società meglio di una facciata.",
      observe: "Guarda il genkan, la differenza tra pavimento in terra e tatami, il focolare, i magazzini e la flessibilità delle pareti scorrevoli.",
      visit: "Segui il percorso indicato e confronta stanze di rappresentanza e spazi di lavoro. Dall'interno osserva come finestre e verande incorniciano l'esterno.",
      etiquette: "Togli le scarpe quando richiesto, non salire sui bordi dei tatami e non appoggiarti a pareti o porte scorrevoli."
    },
    memoriale: {
      why: "Un memoriale richiede tempo per collegare eventi storici, vite individuali e spazio urbano. Non è una tappa da consumare velocemente.",
      observe: "Leggi nomi, date, assi visivi e scelte dei materiali. Alterna la scala collettiva del monumento a una testimonianza personale.",
      visit: "Procedi dal contesto generale alle storie individuali e lascia qualche minuto finale senza nuovi contenuti. Il silenzio fa parte dell'esperienza.",
      etiquette: "Mantieni un comportamento sobrio, limita selfie e pose, e non intralciare cerimonie o gruppi in raccoglimento."
    },
    cibo: {
      why: "Una tappa gastronomica racconta territorio, mestieri e rituali quotidiani. Osservare preparazione e servizio è parte dell'esperienza.",
      observe: "Guarda ingredienti esposti, attrezzatura, ritmo del banco e modo in cui ordinano i clienti abituali. Le specializzazioni strette sono spesso un segno di competenza.",
      visit: "Scegli una specialità centrale e lascia spazio a un assaggio imprevisto. Se c'è fila, decidi prima l'ordine per non rallentare il servizio.",
      etiquette: "Rispetta la coda, non occupare il tavolo oltre il necessario nei locali rapidi e riporta vassoi o stoviglie dove indicato."
    }
  };

  const foodGuides = {
    primi: {
      recognize: "Osserva forma e spessore di noodles o riso, trasparenza del brodo, condimenti e ingredienti aggiunti alla fine. Sono questi elementi a distinguere varianti regionali che sembrano simili.",
      flavor: "Brodo, salsa o condimento danno la direzione, ma consistenza e temperatura sono altrettanto importanti. Assaggia prima di aggiungere spezie.",
      eat: "Nei noodles caldi è normale avvicinare la ciotola e aspirare; nei piatti di riso alterna guarnizione e base per mantenere l'equilibrio.",
      know: "La porzione può essere un pasto completo. Dashi e tare sono parte della ricetta anche quando non sono visibili."
    },
    secondi: {
      recognize: "Identifica taglio, metodo di cottura e condimento: griglia, frittura, marinatura o crudo cambiano completamente lo stesso ingrediente.",
      flavor: "Inizia dal boccone meno condito e usa salse, sale o agrumi in piccole quantità. Spesso l'equilibrio è pensato insieme a riso e contorni.",
      eat: "Segui la presentazione e dividi i pezzi senza smontare tutto il piatto. Se viene servito riso, alternarlo ai bocconi più intensi è parte del ritmo.",
      know: "Chiedi la specialità della casa o la provenienza dell'ingrediente principale: nei locali specializzati è spesso la scelta più interessante."
    },
    street: {
      recognize: "Cerca preparazioni finite davanti a te, rotazione rapida e una superficie appena cotta. Il contrasto tra esterno caldo e interno morbido è spesso essenziale.",
      flavor: "Salse dolci-salate, dashi, zenzero e guarnizioni possono essere intensi. Aspetta qualche secondo: molti street food vengono serviti molto caldi.",
      eat: "Consumalo vicino al banco o negli spazi indicati, tenendo involucro e stecco fino a trovare il cestino corretto.",
      know: "Una porzione condivisa permette di provare più specialità senza trasformare ogni sosta in un pasto completo."
    },
    dolci: {
      recognize: "Valuta la base: riso glutinoso, pasta di fagioli, tè, gelatina o impasto da forno. Colore e forma spesso richiamano stagione e luogo.",
      flavor: "La dolcezza è spesso moderata e bilanciata da tè, kinako, sesamo o note amare di matcha. La consistenza conta quanto il gusto.",
      eat: "Assaggia a piccoli bocconi e abbina tè non zuccherato quando disponibile. Nei wagashi la presentazione anticipa il tema stagionale.",
      know: "Molti dolci hanno durata breve; controlla conservazione e scadenza prima di acquistarli come souvenir."
    },
    contorni: {
      recognize: "Piccole porzioni, colori distinti e tecniche diverse servono a costruire equilibrio. Fermentazione, marinatura e dashi possono concentrare molto sapore.",
      flavor: "Alterna i contorni al piatto principale invece di terminarli uno alla volta. Acidità, sale e umami puliscono o prolungano il gusto.",
      eat: "Prendi piccole quantità e usa il riso come elemento neutro. Nei pasti condivisi usa le posate comuni quando vengono fornite.",
      know: "Sono un ottimo modo per scoprire verdure locali e tecniche domestiche che raramente diventano un piatto famoso."
    },
    bevande: {
      recognize: "Osserva servizio, temperatura, trasparenza e recipiente. La stessa bevanda può cambiare molto se servita fredda, ambiente o calda.",
      flavor: "Procedi lentamente e cerca dolcezza, acidità, umami e finale più che una sola nota aromatica. Acqua e cibo aiutano il confronto.",
      eat: "Quando è previsto un abbinamento, alterna piccoli sorsi al piatto. Nei tasting segui l'ordine suggerito dal produttore.",
      know: "Chiedi provenienza e stile anziché soltanto se è dolce o secco: la risposta aiuta a capire il prodotto e il territorio."
    }
  };

  const contextGuides = {
    ristorante: { how: "Aspetta che tutto il gruppo sia servito, poi inizia con itadakimasu. Nei locali specializzati il menu breve indica spesso la scelta migliore.", order: "Mostra il nome giapponese e chiedi osusume, il consiglio della casa. Se esistono set, confronta cosa includono prima di ordinare singoli piatti." },
    "street food": { how: "Ordina, spostati dal banco e mangia nell'area indicata. Evita di camminare nella folla con cibo caldo o stecchi.", order: "Prima di arrivare alla cassa scegli quantità e variante. Hitotsu kudasai significa 'uno, per favore'." },
    "sala da tè": { how: "Lascia che servizio e presentazione stabiliscano il ritmo. Un sorso di tè tra i bocconi chiarisce dolcezza e consistenze.", order: "Un set con tè e dolce rende più leggibile l'abbinamento; chiedi quale proposta è stagionale." },
    izakaya: { how: "I piatti sono pensati per essere condivisi e arrivano in ordine libero. Ordina una prima tornata piccola e aggiungi dopo.", order: "Chiedi honjitsu no osusume per le proposte del giorno e verifica la presenza dell'otoshi, il piccolo piatto iniziale addebitato al tavolo." },
    "ramen-ya": { how: "Acquista prima il ticket se c'è una macchina, consegnalo e scegli eventuali preferenze. Il tavolo gira rapidamente.", order: "Osserva foto e pulsanti prima di inserire il denaro. Tokusei indica spesso una versione completa con più guarnizioni." },
    mercato: { how: "Assaggia vicino al banco e conserva rifiuti e contenitori fino al punto di raccolta. Il mercato resta un luogo di lavoro.", order: "Scegli porzioni piccole e chiedi quale prodotto è shun, cioè nel momento migliore della stagione." },
    panetteria: { how: "Prendi un vassoio e le pinze, scegli i prodotti e portali alla cassa. Le etichette distinguono ripieni dolci e salati.", order: "Controlla le sfornate appena esposte e chiedi ninki, il prodotto più popolare, se vuoi una scelta rappresentativa." },
    pasticceria: { how: "Guarda prima le specialità stagionali e la durata. Molti prodotti freschi sono confezionati con grande attenzione ma vanno consumati presto.", order: "Specifica se mangerai subito o porterai via; la confezione e gli elementi refrigeranti possono cambiare." },
    negozio: { how: "Confronta varianti e confezioni prima dell'acquisto. Spesso è disponibile un piccolo assaggio o una descrizione degli ingredienti.", order: "Indica il prodotto e la quantità; omiyage-yō segnala che lo cerchi come regalo da viaggio." },
    sakagura: { how: "Segui l'ordine di degustazione e usa acqua tra gli assaggi. Nota differenze di riso, filtrazione e temperatura.", order: "Chiedi un nomikurabe, confronto di più sake, e indica se preferisci uno stile secco, aromatico o corposo." },
    caffè: { how: "Prenditi tempo: molti dessert sono assemblati al momento e pensati come esperienza completa.", order: "Controlla i set bevanda-dessert e le proposte limitate alla stagione prima di scegliere dal menu standard." }
    ,konbini: { how: "Porta i prodotti alla cassa; per quelli caldi indica ciò che vuoi dal banco. Usa gli spazi interni o esterni quando disponibili e differenzia i rifiuti.", order: "Controlla etichetta, allergeni e data. Atatamete kudasai chiede di scaldare il prodotto, se è previsto." }
    ,distributore: { how: "Controlla il colore dell'etichetta del pulsante: rosso indica spesso caldo e blu freddo. Recupera prodotto e resto prima di allontanarti.", order: "Inserisci monete, banconote compatibili o una carta IC, seleziona e verifica la temperatura prima di aprire." }
    ,stazione: { how: "Mangia l'ekiben sullo shinkansen o sui treni dove è normale consumare un pasto; sui commuter affollati è meglio aspettare.", order: "Cerca il nome della regione, il contenuto illustrato e l'eventuale cordino che scalda il bento." }
    ,depachika: { how: "Osserva i banchi prima di scegliere: il reparto combina specialità regionali, gastronomia e pasticceria in uno spazio molto denso.", order: "Indica quantità e prodotto; poco prima della chiusura possono apparire sconti, seguiti da una competizione silenziosa ma molto seria." }
    ,tempio: { how: "Consuma il piatto con calma e segui le regole del luogo: la cucina templare valorizza ingredienti, stagioni e assenza di spreco.", order: "Verifica se serve prenotazione e comunica esigenze alimentari in anticipo; vegetariano non esclude automaticamente tutti gli allergeni." }
  };

  const historyGuides = {
    storia: { lens: "Chiediti chi controllava il luogo, quali risorse lo rendevano importante e come le trasformazioni politiche sono rimaste nella geografia.", look: "Mappe, fossati, assi stradali, nomi antichi e ricostruzioni aiutano a collegare il racconto allo spazio presente." },
    cultura: { lens: "Considera la pratica come risposta a lavoro, clima, status sociale e vita comunitaria, evitando di ridurla a una curiosità folcloristica.", look: "Gesti quotidiani, oggetti d'uso, insegne e regole implicite mostrano come una tradizione continua o cambia." },
    spiritualita: { lens: "Distingui dottrina, rituale e devozione popolare. Buddhismo e shintoismo hanno spesso convissuto e si sono influenzati.", look: "Porte, immagini, offerte, formule rituali e rapporto con boschi o montagne indicano la natura del luogo sacro." },
    architettura: { lens: "Leggi l'edificio come soluzione a funzione, clima, materiali e rappresentazione del potere, non soltanto come stile estetico.", look: "Giunzioni, tetti, basamenti, percorsi e proporzioni rivelano tecniche e gerarchie anche senza entrare." },
    mitologia: { lens: "Il mito non va trattato come cronaca: spiega perché una comunità considera significativo un monte, un animale o un rituale.", look: "Nomi, simboli, statue e feste rendono visibile il racconto mitico nel paesaggio contemporaneo." },
    artigianato: { lens: "Segui la catena completa: materia locale, strumenti, gesto, tempo di lavorazione e uso finale dell'oggetto.", look: "Irregolarità, giunzioni, superfici e segni della mano distinguono una tecnica reale da una semplice decorazione." },
    aneddoti: { lens: "Usa l'aneddoto come porta d'ingresso, poi collegalo al contesto più ampio e verifica cosa è memoria, simbolo o fatto documentato.", look: "Monumenti, offerte e racconti ripetuti dai luoghi mostrano come una storia viene ricordata nel tempo." }
  };

  const shoppingGuides = {
    beauty: {
      why: "Il mercato beauty giapponese premia texture leggere, formati ricarica, protezione solare e prodotti molto specializzati. Drugstore e variety store permettono di confrontare linee che in Italia arrivano solo in parte o molto più tardi.",
      recognize: "Leggi nome completo, numero della variante, quantità e funzione: confezioni quasi identiche possono indicare formula moist, light, medicated, waterproof o limited.",
      buy: "Confronta il prezzo in due catene, controlla il sigillo e preferisci un prodotto adatto alla tua routine a una scorta guidata soltanto dalla viralità."
    },
    manga: {
      why: "In Giappone il manga è ancora un ecosistema fisico fatto di riviste settimanali, tankōbon, artbook, bonus di catena e materiali di produzione che raramente vengono localizzati integralmente.",
      recognize: "Controlla editore, ISBN, fascetta obi, allegati e indicazioni shokai o tokuten. Per l'usato guarda dorso, ingiallimento, odore e presenza degli inserti.",
      buy: "Scegli una serie o un autore prima di entrare: gli scaffali sono progettati per demolire rapidamente ogni piano ragionevole."
    },
    gaming: {
      why: "Store ufficiali, lotterie, capsule e catene hobby distribuiscono collezioni, colori e collaborazioni legate al mercato domestico e alle singole città.",
      recognize: "Cerca logo del produttore, copyright, etichetta dello store e confezione originale. Distingui merce ufficiale, premio da sala giochi e riproduzione non autorizzata.",
      buy: "Controlla se l'articolo è casuale, limitato per persona o incompatibile fuori dal Giappone; stabilisci un budget prima di incontrare la parete dei blind box."
    },
    tecnologia: {
      why: "Le grandi catene giapponesi concentrano modelli domestici, accessori di nicchia, usato ben classificato e dispositivi pensati per abitudini locali che raramente compaiono nei negozi italiani.",
      recognize: "Annota il codice modello esatto e verifica layout, lingua, tensione, spina, frequenze radio, regione, app necessaria, garanzia e disponibilità dei consumabili.",
      buy: "Fai una foto al cartellino e confronta scheda tecnica e prezzo finale. Se il prodotto funziona soltanto grazie a un trasformatore enorme, il souvenir tecnologico ha già perso la discussione."
    },
    cartoleria: {
      why: "La cartoleria giapponese unisce strumenti molto precisi a collaborazioni, colori e sistemi di carta pensati per il mercato locale. La differenza emerge nell'uso, non solo nella confezione.",
      recognize: "Prova impugnatura, scorrimento e meccanismo; controlla formato, rigatura, diametro, numero di fori e codice delle ricariche.",
      buy: "Compra un sistema completo ma piccolo: corpo, un ricambio e il supporto corretto. Una penna rara senza cartuccia reperibile è soltanto una scultura sottile."
    },
    moda: {
      why: "Marchi domestici, denim, tessili tradizionali e second hand offrono tagli, materiali e capsule che in Italia hanno distribuzione limitata o prezzi molto diversi.",
      recognize: "Controlla misure in centimetri, composizione, cuciture, codice articolo e istruzioni di lavaggio. Nel vintage esamina luce, odore e punti di stress.",
      buy: "Prova tutto e immagina tre occasioni reali in cui lo userai. Se nessuna include una festa in costume, il test sta funzionando."
    },
    dispensa: {
      why: "Supermercati, depachika e negozi regionali mostrano condimenti, tè, fermentati e confezioni regalo che raccontano il territorio molto meglio di un souvenir generico.",
      recognize: "Leggi provenienza, ingredienti, data, conservazione e tipo di confezione. Distingui il prodotto regionale da una semplice grafica turistica.",
      buy: "Preferisci formati piccoli, sigillati e robusti; verifica le regole doganali aggiornate prima di portare prodotti animali, freschi o non chiaramente etichettati."
    },
    casa: {
      why: "Utensili e oggetti domestici giapponesi mettono insieme specializzazione, ergonomia e tradizioni materiali locali. I pezzi migliori continuano a essere utili dopo il viaggio.",
      recognize: "Chiedi materiale, luogo di produzione, tecnica, manutenzione e destinazione d'uso. Peso e bilanciamento spesso rivelano più della decorazione.",
      buy: "Misura spazio e fragilità prima di pagare; per lame e utensili controlla sempre le regole del trasporto e usa una protezione adeguata."
    },
    artigianato: {
      why: "Ogni regione sviluppa tecniche legate a materie, clima e committenza. Acquistare in bottega permette di collegare oggetto, artigiano e luogo invece di comprare soltanto un motivo decorativo.",
      recognize: "Cerca nome dell'atelier, materia, segni della lavorazione e una spiegazione della tecnica. Una piccola irregolarità coerente è diversa da una finitura trascurata.",
      buy: "Chiedi come proteggere e mantenere il pezzo. Il prezzo va confrontato con tempo e competenza, non con il portachiavi industriale della bancarella accanto."
    },
    tessili: {
      why: "Tenugui, furoshiki, tessiture regionali e ricami trasformano tecniche storiche in oggetti leggeri e realmente utilizzabili.",
      recognize: "Controlla fibra, stampa o tessitura, bordi, solidità del colore e provenienza. Chiedi se il tessuto può essere lavato e come cambierà con l'uso.",
      buy: "Apri il tessuto quando consentito per vedere il disegno completo; la confezione può nascondere la metà più interessante o quella più discutibile."
    },
    tradizione: {
      why: "Amuleti, sigilli e oggetti rituali acquistati nel loro luogo d'uso conservano un legame preciso con la visita e con la pratica che rappresentano.",
      recognize: "Leggi scopo, luogo e modalità d'uso; non trattare un oggetto consacrato come un gadget intercambiabile.",
      buy: "Scegli pochi oggetti con un significato chiaro e conservali con rispetto. La collezione completa delle protezioni cosmiche non è obbligatoria."
    },
    benessere: {
      why: "Incenso, oggetti per il bagno e piccoli rituali domestici mostrano un'idea del benessere fondata anche su profumo, stagione e gesto quotidiano.",
      recognize: "Controlla ingredienti, intensità, modalità d'uso e accessori necessari. Per l'incenso prova campioni prima di comprare confezioni grandi.",
      buy: "Evita promesse terapeutiche vaghe e scegli in base a uso e sensibilità personali; naturale non significa automaticamente adatto a tutti."
    },
    arte: {
      why: "Stampe, dischi e opere su carta permettono di portare a casa grafica, musica e tecniche visive con una provenienza verificabile.",
      recognize: "Chiedi autore, editore o bottega, tecnica, data, tiratura e stato. Distingui originale, ristampa, riproduzione e prodotto decorativo.",
      buy: "Pretendi una custodia rigida o una spedizione adeguata. L'arte piegata in quattro per risparmiare spazio diventa performance, ma non quella desiderata."
    },
    pop: {
      why: "Insegne, squadre locali, mascotte e oggetti quotidiani trasformano il linguaggio visivo di una città in souvenir più personali dei prodotti nazionali.",
      recognize: "Cerca un riferimento preciso a quartiere, evento, squadra o creatore e controlla che non sia una stampa generica applicata ovunque.",
      buy: "Scegli ciò che farà ancora ridere o ricordare il luogo tra un anno; l'effetto neon del momento non supera sempre il controllo qualità domestico."
    }
  };

  function stableIndex(item, length) {
    const text = String(item.id || item.name || item.title);
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    return Math.abs(hash) % length;
  }

  function itemText(item) {
    return (item.name + " " + (item.jp || "") + " " + (item.description || item.explanation || "")).toLowerCase();
  }

  function placeHumorFor(item) {
    const endings = [
      "La foto va bene, ma prima concedigli almeno trenta secondi senza telefono: pratica radicale, apparentemente.",
      "Se il gruppo propone una visita rapida, ricordate che 'rapida' è un'unità di misura che smette di esistere appena compare una bottega.",
      "Il vero test non è arrivarci: è uscire senza aver aperto Google Maps altre sei volte dentro lo stesso isolato."
    ];
    const notes = {
      tempio:"A " + item.name + " l'illuminazione spirituale non è garantita; il cedimento davanti agli amuleti, invece, ha statistiche eccellenti.",
      santuario:"Attraversate il torii di " + item.name + " con rispetto: la modalità solenne dura almeno finché qualcuno non chiede la diciassettesima foto.",
      panorama:"Da " + item.name + " guardate prima l'orizzonte, poi producete pure il tradizionale archivio di 38 immagini identiche.",
      quartiere:"Perdersi attorno a " + item.name + " è esplorazione urbana; girare in tondo per la quarta volta è ormai una visita guidata autogestita.",
      shopping:"A " + item.name + " si entra per curiosità e si esce con una busta e una tesi sul valore antropologico dell'acquisto.",
      castello:"Le difese di " + item.name + " rallentavano gli invasori; scale e dislivelli continuano il servizio sui polpacci contemporanei.",
      museo:"A " + item.name + " scegliete tre cose da ricordare: leggere ogni pannello trasforma la cultura in una punizione per i piedi.",
      curiosita:"Fuori contesto, la foto di " + item.name + " sembrerà un errore di giudizio. Proprio per questo finirà tra le migliori.",
      esperienza:"A " + item.name + " il piano è fare cultura; il risultato potrebbe essere la storia imbarazzante citata dal gruppo fino al 2037.",
      natura:"Il paesaggio di " + item.name + " non ha letto il programma: meteo, fango e salita conservano diritto di veto.",
      giardino:"A " + item.name + " tutto sembra spontaneo, ma perfino una pietra ha probabilmente un piano di carriera più preciso del nostro.",
      mercato:"A " + item.name + " il dodicesimo assaggio non è fame: è ricerca sul campo con un budget sempre meno scientifico.",
      "casa-storica":"Gli interni di " + item.name + " faranno desiderare una vita minimalista. L'effetto scade al prossimo negozio.",
      memoriale:"A " + item.name + " la battuta resta fuori: prendete tempo, leggete una storia individuale e ascoltate il luogo.",
      cibo:"Vicino a " + item.name + ", 'solo un assaggio' resta la formula ufficiale con cui iniziano pasti fuori controllo."
    };
    return (notes[item.category] || notes.quartiere) + " " + endings[stableIndex(item, endings.length)];
  }

  function foodHumorFor(item) {
    const text = itemText(item);
    let joke;
    if (/natto/.test(text)) joke = item.name + " mette alla prova due cose: il rapporto con le consistenze filanti e la sincerità di chi dice 'io mangio tutto'.";
    else if (/fugu|pesce palla/.test(text)) joke = "Con " + item.name + " niente eroismi da film: scegliete un locale autorizzato e lasciate la suspense alla sceneggiatura.";
    else if (/melon.?pan|melopan/.test(text)) joke = item.name + " non contiene necessariamente melone: il primo piccolo tradimento del giorno arriva però con una crosta così buona da essere perdonato.";
    else if (/takoyaki/.test(text)) joke = item.name + " sembra innocuo, ma dentro conserva lava al polpo. Mordere subito è coraggio; aspettare è intelligenza raramente documentata.";
    else if (/okonomiyaki/.test(text)) joke = "Davanti a " + item.name + " tutti diventano esperti di spatola. La piastra, professionista navigata, non commenta.";
    else if (/kobe|wagyu|hida|gyū|manzo|beef/.test(text)) joke = "Con " + item.name + " il gruppo discuterà di marezzatura con l'autorità di chi, fino a ieri, diceva soltanto 'ben cotta'.";
    else if (/ramen|udon|soba|sōmen|noodle|yakisoba/.test(text)) joke = "Per " + item.name + " lo slurp è ammesso; indossare metà brodo sulla maglietta resta invece una reinterpretazione personale dell'etichetta.";
    else if (/sushi|sashimi|tataki|crudo|ostric|iwagaki/.test(text)) joke = item.name + " richiede freschezza, fiducia e moderazione con la salsa di soia: annegare tutto non è degustazione, è occultamento di prove.";
    else if (/konbini|onigiri|sandwich|sando|vending|distribut|lattina/.test(text)) joke = item.name + " dimostra che la sosta tecnica può degenerare in una spedizione gastronomica tra scaffali entro novanta secondi.";
    else if (/sake|shōchū|birra|umeshu|highball|whisky|alcol/.test(text)) joke = "Con " + item.name + " prendete nota del preferito prima del terzo assaggio: dopo, la classifica tende a diventare diplomatica e poco leggibile.";
    else if (/matcha|tè|tea/.test(text)) joke = item.name + " promette una pausa zen; scegliere tra sessanta confezioni nel negozio può annullare l'effetto con notevole efficienza.";
    else if (/mochi|dango|daifuku/.test(text)) joke = item.name + " è elegante e gommoso: masticare con calma è rispetto culturale e anche un ottimo accordo con le vie respiratorie.";
    else if (/curry|karē/.test(text)) joke = item.name + " arriva rassicurante, poi il livello di piccantezza trasforma la sicurezza occidentale in una trattativa sindacale con la fronte.";
    else if (/purin|parfait|gelat|cake|torta|dolce|wagashi|manjū|castella/.test(text)) joke = item.name + " è piccolo e curato, quindi il cervello lo classifica come innocente. La richiesta del bis sfrutta esattamente questa falla.";
    else if (/fritt|katsu|karaage|tempura/.test(text)) joke = item.name + " fa quel rumore croccante che sospende ogni proposito di moderazione pronunciato nelle precedenti ventiquattr'ore.";
    else joke = item.name + " sarà ordinato 'per dividerlo'. Questa formula giuridica decade appena qualcuno scopre di aver preso il boccone migliore.";
    return joke + " A " + cityName(item.city) + " il campione va comunque assaggiato prima di emettere sentenze internazionali.";
  }

  const experienceGuides = {
    museum: { why: "Un museo ben scelto rende visibili dettagli, materiali e storie che fuori resterebbero senza didascalia.", do: "Prima individua il tema centrale, poi scegli poche opere o sale da osservare davvero. La completezza forzata è il modo più rapido per ricordare soltanto il guardaroba.", know: "Controlla mostre temporanee, ultimo ingresso, fotografie consentite e chiusure parziali." },
    theme: { why: "I grandi ambienti immersivi e i parchi raccontano anche il modo giapponese di progettare flussi, attese, scenografie e merchandising.", do: "Decidi prima le priorità, lascia margine tra attività e non passare l'intera visita a ottimizzare una coda che nel frattempo ha cambiato forma.", know: "Biglietti, fasce, pass e regole possono cambiare: usa sempre il canale ufficiale prima di partire." },
    workshop: { why: "Fare un oggetto costringe a notare gesti, tempi e materiali che una vetrina rende invisibili.", do: "Chiedi di vedere un esempio finito, ascolta la sequenza completa e accetta che la prima prova non sembri prodotta da un maestro con quarant'anni di esperienza.", know: "Verifica lingua, materiali inclusi, tempi di asciugatura o cottura e modalità di ritiro o spedizione." },
    show: { why: "Musica, teatro e danza permettono di capire ritmo, costume e rapporto con il pubblico senza trasformare ogni tradizione in un oggetto fermo.", do: "Leggi una breve introduzione prima, poi durante lo spettacolo osserva voce, strumenti, gesti e cambi di scena invece di inseguire ogni parola.", know: "Controlla calendario, durata, lingua dei supporti, fotografia e politica sui ritardi." },
    wellness: { why: "Sentō e onsen sono spazi quotidiani con regole precise, non soltanto piscine più calde e molto più silenziose.", do: "Lavati prima di entrare, tieni l'asciugamano fuori dalla vasca, parla piano e lascia il telefono nell'armadietto.", know: "Verifica politica sui tatuaggi, separazione delle aree, asciugamani, sapone e accesso giornaliero." },
    sports: { why: "Partecipare o assistere a uno sport mostra disciplina, tifo, rituali e uso dello spazio in modo molto più diretto di una spiegazione astratta.", do: "Segui l'istruttore o le regole dello stadio, usa attrezzatura adatta e non confondere entusiasmo con diritto di precedenza.", know: "Controlla assicurazione, condizioni fisiche, meteo, licenze e regole del traffico quando l'attività esce su strada." },
    nature: { why: "Un percorso attivo collega paesaggio, clima e orientamento; è spesso il modo migliore per capire perché un santuario o un villaggio esistano proprio lì.", do: "Parti con acqua, scarpe e tempo di ritorno realistico. Il percorso non diventa più corto perché il gruppo ha prenotato cena.", know: "Verifica meteo, trasporti, orario dell'ultima corsa, accessi stagionali e luce residua." },
    food: { why: "Una degustazione o una lezione pratica trasforma il piatto da fotografia a sequenza di ingredienti, temperature e gesti.", do: "Assaggia in ordine, prendi due appunti comprensibili e fai domande sulla tecnica invece di limitarti a dichiarare tutto buonissimo.", know: "Comunica allergie, dieta e limiti con anticipo; per l'alcol pianifica il rientro senza guida." },
    quirky: { why: "Le attività insolite funzionano quando mostrano un'abitudine o una passione locale, non soltanto quando producono una foto rumorosa.", do: "Capisci prima regole e contesto, poi partecipa senza occupare spazi, bloccare passaggi o trasformare i residenti in comparse.", know: "Controlla costi extra, lingua, assicurazione, accessibilità e reputazione recente dell'operatore." }
  };

  const experienceHumorLead = {
    museum: "Il piano era vedere due sale con calma. Poi è comparso il bookshop, il vero boss finale di ogni istituzione culturale.",
    theme: "La giornata verrà misurata in attrazioni, passi e percentuale di batteria. Il romanticismo sopravvive finché qualcuno non apre l'app delle code.",
    workshop: "Il maestro farà sembrare il gesto semplicissimo. Il vostro oggetto dimostrerà, con grande sincerità, che era un'illusione ottica.",
    show: "Se non capite ogni parola non è un problema. Se applaudite da soli nel silenzio assoluto, avete appena creato una scena bonus.",
    wellness: "Dopo dieci minuti di acqua calda sarete persone nuove. Dopo venti, persone nuove che devono sedersi un attimo.",
    sports: "Competere è naturale. Trasformare un laboratorio introduttivo nelle Olimpiadi del gruppo è invece una scelta perfettamente evitabile.",
    nature: "La vista ripaga la salita. Questa frase viene tradizionalmente pronunciata da chi è già arrivato e ha recuperato il fiato.",
    food: "La lezione insegna tecnica e moderazione. Il gruppo apprenderà sicuramente la prima.",
    quirky: "Potrebbe diventare il ricordo migliore del viaggio o una storia che inizierà sempre con: sembrava una buona idea. Entrambi sono risultati utili."
  };

  const experienceSources = {
    osaka:"https://osaka-info.jp/en/spot/experience/", nara:"https://www.visitnara.jp/see-and-do/", miyajima:"https://www.miyajima.or.jp/english/",
    hiroshima:"https://dive-hiroshima.com/en/explore/?category=5", kyoto:"https://kyoto.travel/en/experiences/", kanazawa:"https://visitkanazawa.jp/en/activities/",
    shirakawago:"https://shirakawa-go.gr.jp/en/active/", takayama:"https://www.hida.jp/english/recreationandleisure/foodandculture/",
    matsumoto:"https://visitmatsumoto.com/en/", nagano:"https://www.go-nagano.net/en/trip-idea/things-to-do-around-nagano-city", tokyo:"https://www.gotokyo.org/en/experiences/index.html"
  };

  const historyHumorLead = {
    storia: "Riassunto brutale: qualcuno voleva più potere, qualcun altro non era d'accordo e nel frattempo sono comparsi mura, tasse e un numero impressionante di incendi.",
    cultura: "Se una regola vi sembra inspiegabilmente precisa, probabilmente dietro ci sono tre secoli di pratica e almeno una persona che vi sta osservando mentre la sbagliate.",
    spiritualita: "Non serve raggiungere l'illuminazione entro la chiusura. Basta rallentare, osservare e non trasformare ogni gesto rituale in un servizio fotografico.",
    architettura: "Quell'incastro di legno sopravvive da secoli senza la vostra libreria di brugole. Un piccolo colpo all'autostima del fai-da-te occidentale.",
    mitologia: "Quando la spiegazione include una dea, una montagna scagliata in aria e un animale messaggero, il realismo può tranquillamente aspettare fuori.",
    artigianato: "Dopo aver visto quante ore richiede un oggetto, il prezzo smette di sembrare alto e inizia a sembrare un educato rimprovero.",
    aneddoti: "È la storia che ricorderete a cena, probabilmente con dettagli sempre più spettacolari a ogni nuova narrazione."
  };

  const shoppingHumorLead = {
    beauty: "Entrare per un balsamo labbra e uscire con una routine in nove passaggi è una trasformazione narrativa molto rispettata nei drugstore.",
    manga: "La frase 'prendo solo un volume' perde validità giuridica appena compare uno scaffale con bonus esclusivi.",
    gaming: "Il personaggio era casuale, il secondo tentativo necessario e il quinto ormai una questione d'onore: così nasce un piccolo problema statistico.",
    tecnologia: "Se servono tre adattatori, un account giapponese e un tutorial di quaranta minuti, forse avete comprato un hobby e non un dispositivo.",
    cartoleria: "Una nuova penna non sistemerà la vostra vita. Scriverà però la lista delle cose da sistemare con una fluidità eccezionale.",
    moda: "Il capo avant-garde funziona perfettamente a Tokyo. La prova definitiva sarà indossarlo per andare al supermercato sotto casa.",
    dispensa: "Il limite della valigia trasforma rapidamente il depachika da paradiso gastronomico a esercizio avanzato di logistica.",
    casa: "L'utensile monofunzione giapponese risolve un problema che non sapevate di avere e ora, inspiegabilmente, appare urgente.",
    artigianato: "Dopo aver ascoltato la lavorazione per venti minuti, l'oggetto non è più caro: siete voi a sentirvi improvvisamente prodotti in serie.",
    tessili: "Il furoshiki è riutilizzabile, elegante e sostenibile. Riempirlo di altri acquisti era probabilmente previsto fin dall'inizio.",
    tradizione: "Avere un amuleto per viaggio, salute, studio e fortuna non è ansia: è diversificazione spirituale del portafoglio.",
    benessere: "L'incenso promette calma. Il tentativo di scegliere tra sessanta profumi diversi metterà alla prova la tesi prima dell'acquisto.",
    arte: "Avete comprato una stampa minimalista per semplificare casa. Ora serve una cornice su misura, una parete libera e una riunione condominiale.",
    pop: "Era un gadget ironico e costava poco. Ventisette gadget dopo, il concetto di poco richiede una commissione d'inchiesta."
  };

  function foodSafety(item) {
    const text = (item.name + " " + item.jp + " " + item.description).toLowerCase();
    const notes = [];
    if (/fugu|pesce palla/.test(text)) notes.push("Il fugu va consumato soltanto in locali autorizzati alla sua preparazione.");
    if (/sushi|ostric|iwagaki|sashimi|basashi|crudo|tataki/.test(text)) notes.push("Può includere ingredienti crudi o poco cotti: verifica la preparazione se preferisci evitarli.");
    if (/sake|doburoku|birra|shōchū|alcol/.test(text)) notes.push("È una bevanda alcolica; chiedi sempre la gradazione e alterna acqua.");
    if (/gamber|granch|ostric|mollusc|polpo|calamar|ika|ebi|kani/.test(text)) notes.push("Può contenere crostacei o molluschi.");
    if (/manzo|beef|gyū|bue/.test(text)) notes.push("Contiene carne bovina.");
    if (/maiale|pork|tonkatsu|butaman/.test(text)) notes.push("Contiene carne suina o derivati.");
    if (/soba/.test(text)) notes.push("La soba contiene grano saraceno e spesso anche frumento.");
    if (/udon|ramen|noodle|farina|glutine|nama-fu|ciambell/.test(text)) notes.push("La preparazione contiene normalmente frumento.");
    notes.push("Per allergie o esigenze alimentari mostra una frase scritta in giapponese: dashi, salse e condimenti possono includere ingredienti non evidenti.");
    return notes.join(" ");
  }

  function cityName(id) {
    if (id === "all") return "Tutto il Giappone";
    const city = data.cities.find(function (candidate) { return candidate.id === id; });
    return city ? city.name : id;
  }

  function uniqueSources(sources) {
    const seen = new Set();
    return sources.filter(function (entry) {
      if (!entry || !entry.url || seen.has(entry.url)) return false;
      seen.add(entry.url);
      return true;
    });
  }

  function sourcesFor(item, domain) {
    const current = item.sourceUrl ? [{ title:item.sourceTitle || "Fonte ufficiale", url:item.sourceUrl, kind:"fonte specifica" }] : [];
    const local = (sourceRegistry.cities && sourceRegistry.cities[item.city]) || [];
    const general = (sourceRegistry.general && sourceRegistry.general[domain]) || [];
    return uniqueSources(current.concat(local.slice(0, 2), general.slice(0, 2))).slice(0, 4);
  }

  function foodProfile(item) {
    const text = itemText(item);
    if (/natto/.test(text)) return { see:"Cerca i fagioli interi coperti da fili tenaci: mescolandolo, la trama diventa ancora più evidente.", taste:"Aspettati fermentazione decisa, note tostate di soia e una consistenza vischiosa che conta quanto il sapore." };
    if (/ramen|udon|soba|sōmen|noodle|yakisoba/.test(text)) return { see:"Guarda spessore e curvatura del noodle, limpidezza o densità del brodo e guarnizioni: sono gli indizi più rapidi per distinguere lo stile.", taste:"Assaggia prima brodo e pasta separatamente, poi insieme: sapidità, grasso, dashi e consistenza cambiano molto tra una preparazione e l'altra." };
    if (/sushi|sashimi|tataki|crudo/.test(text)) return { see:"Osserva taglio, lucentezza, temperatura e rapporto tra pesce, riso o condimento; una montagna di salsa nasconde proprio ciò che dovresti valutare.", taste:"La qualità emerge da temperatura, consistenza e umami più che da condimenti aggressivi. Parti senza aggiunte e correggi soltanto dopo." };
    if (/wagyu|kobe|hida|gyū|manzo|beef/.test(text)) return { see:"La marezzatura deve essere fine e distribuita, non soltanto una fascia di grasso esterna. Chiedi taglio, provenienza e quantità prima di ordinare.", taste:"Aspettati grasso dolce, fusione rapida e porzioni più piccole del normale: il confronto migliore è tra tagli e cotture, non tra montagne di carne." };
    if (/mochi|dango|daifuku/.test(text)) return { see:"La superficie deve apparire morbida e regolare; ripieno, tostatura o salsa distinguono preparazioni che in vetrina possono sembrare simili.", taste:"La componente centrale è la masticabilità del riso glutinoso, bilanciata da fagiolo rosso, soia tostata, sesamo o frutta." };
    if (/takoyaki|okonomiyaki|ikayaki|negiyaki/.test(text)) return { see:"Piastra, doratura, salse e movimento del cuoco fanno parte del riconoscimento. Controlla che l'interno sia cotto ma ancora morbido.", taste:"Il contrasto tipico è tra superficie rosolata, interno cremoso o elastico, dashi, salsa dolce-salata e guarnizioni aromatiche." };
    if (/sake|shōchū|birra|umeshu|highball|whisky|alcol/.test(text)) return { see:"Leggi stile, gradazione, produttore e servizio. Temperatura e bicchiere possono cambiare molto la percezione dello stesso prodotto.", taste:"Procedi dal più delicato al più intenso, alterna acqua e annota subito aroma, dolcezza, acidità e finale." };
    if (item.category === "dolci") return { see:"Forma, ripieno, stagione e finitura sono indizi importanti: molti dolci comunicano il periodo dell'anno prima ancora del gusto.", taste:"La dolcezza è spesso più misurata di quella italiana; consistenza, fagiolo, riso, tè o frutta hanno un ruolo altrettanto importante." };
    return { see:"Usa la descrizione specifica della scheda come controllo: forma, ingrediente dominante, metodo di cottura e guarnizione devono raccontare la stessa preparazione.", taste:"Assaggia il primo boccone senza correggere subito con salse o spezie; poi separa consistenza, sapidità, dolcezza, acidità, aroma e retrogusto." };
  }

  function experienceHumorFor(item) {
    const lead = experienceHumorLead[item.category] || experienceHumorLead.quirky;
    const variants = ["A " + item.name + " il gruppo avrà comunque prove fotografiche.", "Per " + item.name + " nominate prima un adulto responsabile; probabilmente si dimetterà a metà.", item.name + " è il genere di idea che migliora molto quando nessuno pronuncia 'facciamo una gara'."];
    return lead + " " + variants[stableIndex(item, variants.length)];
  }

  function historyHumorFor(item) {
    const lead = historyHumorLead[item.category] || historyHumorLead.storia;
    const variants = ["Usate " + item.title + " per sembrare preparati; citare anche l'aneddoto vi porterà pericolosamente vicino a diventare la guida del gruppo.", "Dopo aver letto " + item.title + ", almeno una pietra a " + cityName(item.city) + " sembrerà meno casuale. È già un risultato accademico.", "Memorizzate una sola idea di " + item.title + ": sette date confuse non impressionano nessuno, soprattutto prima di pranzo."];
    return lead + " " + variants[stableIndex(item, variants.length)] + " Il riferimento, qui, è proprio " + cityName(item.city) + ".";
  }

  function shoppingHumorFor(item) {
    const lead = shoppingHumorLead[item.category] || shoppingHumorLead.artigianato;
    return lead + " Nel caso di " + item.name + " a " + cityName(item.city) + ", la frase 'entra comodamente in valigia' richiede una verifica indipendente.";
  }

  function lower(text) {
    const value = String(text || "");
    return value.charAt(0).toLowerCase() + value.slice(1);
  }

  function enrichPlace(item) {
    const city = cityGuides[item.city] || cityGuides.all;
    const guide = placeGuides[item.category] || placeGuides.quartiere;
    item.longDescription = item.description
      + " Si trova nell'area di " + item.area + ", a " + cityName(item.city) + ", e ci si sta di solito " + item.duration.toLowerCase() + "."
      + " " + guide.why
      + " Se è la prima volta che vedete un luogo di questo tipo, conviene sapere in anticipo cosa state guardando: " + lower(guide.observe)
      + " " + city.identity
      + " Il consiglio pratico che fa la differenza qui è semplice: " + item.tip.charAt(0).toLowerCase() + item.tip.slice(1) + ".";
    item.sources = sourcesFor(item, "culture");
    item.guideSections = [
      { title: "Perché vale la visita", body: item.description + " " + guide.why + " " + city.identity },
      { title: "Cosa osservare", body: "A " + item.name + " parti dagli elementi citati nella descrizione e confrontali con scala, materiali, accessi e rapporto con il quartiere. " + guide.observe + " Nell'area di " + item.area + ", " + city.signs.charAt(0).toLowerCase() + city.signs.slice(1) },
      // "Da sapere prima" e non "Momento consigliato": i consigli non parlano
      // solo di orari, ma anche di prenotazioni, biglietti e regole d'accesso.
      { title: "Come viverlo", body: "Tempo indicativo: " + item.duration + ". Da sapere prima: " + item.tip + ". " + guide.visit },
      { title: "La chiave della città", body: city.place + " " + city.history },
      { title: "Rispetto e buone maniere", body: guide.etiquette },
      { title: "Come collegarlo al viaggio", body: city.route },
      { title: "Nota semiseria", body: placeHumorFor(item), fun: true }
    ];
  }

  function enrichFood(item) {
    const city = cityGuides[item.city];
    const guide = foodGuides[item.category] || foodGuides.secondi;
    const context = contextGuides[item.context] || contextGuides.ristorante;
    const profile = foodProfile(item);
    item.longDescription = item.description
      + " In giapponese si scrive " + item.jp + ", ed è il nome da mostrare o indicare se non riuscite a pronunciarlo."
      + " Lo si trova soprattutto in un contesto preciso, " + item.context + ": " + lower(context.how)
      + " " + profile.see
      + " " + profile.taste
      + " " + guide.know;
    item.sources = sourcesFor(item, "food");
    item.guideSections = [
      { title: "Come riconoscerlo", body: profile.see + " " + guide.recognize + " Per " + item.name + " il riferimento principale resta questo: " + item.description },
      { title: "Che sapore aspettarsi", body: profile.taste + " " + guide.flavor + " " + city.food },
      { title: "Come si mangia", body: guide.eat + " " + context.how },
      { title: "Come ordinarlo", body: "Mostra il nome " + item.jp + " al personale. " + context.order },
      { title: "Da sapere", body: guide.know + " " + foodSafety(item) },
      { title: "Per capirne il contesto", body: city.identity + " " + city.history },
      { title: "Nota semiseria", body: foodHumorFor(item), fun: true }
    ];
  }

  function enrichExperience(item) {
    const city = cityGuides[item.city] || cityGuides.all;
    const guide = experienceGuides[item.category] || experienceGuides.quirky;
    item.longDescription = item.description
      + " Si fa a " + cityName(item.city) + ", zona " + item.area + ", e richiede " + item.duration.toLowerCase() + "."
      + " " + guide.why
      + " In concreto, ecco come funziona per chi non l'ha mai fatto. " + guide.do
      + " Una cosa da sapere prima di presentarsi: " + lower(guide.know)
      + " " + (item.booking || "Verifica accesso e disponibilità prima di andare.");
    if (!item.sourceUrl) {
      item.sourceUrl = experienceSources[item.city];
      item.sourceTitle = "Guida turistica ufficiale · " + cityName(item.city);
    }
    item.sources = sourcesFor(item, "culture");
    item.imageQueries = [item.imageQuery, item.jp + " " + item.name, item.name + " " + cityName(item.city)];
    item.guideSections = [
      { title: "Perché farla", body: guide.why + " " + city.identity },
      { title: "Cosa succede davvero", body: item.description + " Tempo indicativo: " + item.duration + "." },
      { title: "Come viverla bene", body: guide.do },
      { title: "Prima di andare", body: (item.booking || item.tip || "Verifica accesso e disponibilità.") + " " + guide.know },
      { title: "Rispetto e sicurezza", body: "Segui il personale, non invadere aree di lavoro e chiedi sempre prima di fotografare persone o procedure. Le attività su strada o fisicamente impegnative richiedono una valutazione più severa di una normale visita." },
      { title: "Come collegarla alla tappa", body: city.route + " " + city.place },
      { title: "Nota semiseria", body: experienceHumorFor(item), fun: true }
    ];
  }

  function enrichHistory(item) {
    const city = cityGuides[item.city];
    const guide = historyGuides[item.category] || historyGuides.storia;
    item.name = item.title;
    item.jp = item.kanji;
    item.longDescription = item.explanation
      + " In giapponese la parola chiave è " + item.kanji + "."
      + " Perché serve saperlo prima di arrivare: " + lower(guide.lens)
      + " Sul posto si traduce in cose molto concrete da guardare. " + guide.look
      + " " + city.history
      + " Se dovete portarvi via una cosa sola da questa scheda, portatevi questa: " + item.anecdote;
    item.sources = sourcesFor(item, "culture");
    item.guideSections = [
      { title: "Il quadro generale", body: city.history + " " + item.explanation },
      { title: "La domanda giusta", body: guide.lens + " Per " + item.title + ", chiediti quali parti del racconto sono ancora visibili e quali sopravvivono soltanto nei rituali, nei nomi o nella memoria locale." },
      { title: "Cosa riconoscere sul posto", body: guide.look + " " + city.signs },
      { title: "Collegalo alle visite", body: city.place + " " + city.route },
      { title: "L'aneddoto da ricordare", body: item.anecdote },
      { title: "Parole chiave", body: item.kanji + " · " + item.title + " · " + data.labels.historyCategories[item.category] + " · " + data.cities.find(function (candidate) { return candidate.id === item.city; }).name },
      { title: "Nota semiseria", body: historyHumorFor(item), fun: true }
    ];
  }

  function shoppingChecks(item) {
    const text = (item.name + " " + item.jp + " " + item.description + " " + item.tip).toLowerCase();
    const notes = [];
    if (item.category === "beauty") notes.push("Leggi ingredienti e istruzioni, verifica la scadenza dopo apertura e fai un patch test se la formula è nuova per te.");
    if (item.category === "tecnologia") notes.push("Un apparecchio giapponese può essere progettato per 100 V, layout JIS, servizi regionali o garanzia domestica: il codice modello va verificato prima del pagamento.");
    if (/liquid|olio|lozione|siero|smalt|inchiostro|sake|salsa|miso|pasta/.test(text)) notes.push("Proteggi i liquidi in un sacchetto separato e controlla i limiti del bagaglio a mano.");
    if (/coltello|lama|knife/.test(text)) notes.push("Le lame vanno protette e trasportate secondo le regole della compagnia e del paese di arrivo.");
    if (/usato|vintage|second.hand|中古/.test(text)) notes.push("Per l'usato controlla condizioni, accessori, reso e funzionamento prima di lasciare il negozio.");
    if (item.category === "dispensa") notes.push("Per alimenti e prodotti di origine animale verifica le regole doganali in vigore al momento del rientro.");
    if (!notes.length) notes.push("Conserva etichetta, ricevuta e istruzioni almeno fino al rientro, soprattutto per oggetti fragili o di valore.");
    return notes.join(" ");
  }

  function enrichShopping(item) {
    const guide = shoppingGuides[item.category] || shoppingGuides.artigianato;
    const placeContext = item.city === "all" ? "È una ricerca adatta a più tappe del viaggio: confrontare assortimenti tra città aiuta a distinguere un prodotto nazionale da un'edizione realmente locale." : "Cercarlo a " + cityName(item.city) + " collega l'acquisto alle botteghe, ai materiali e alla cultura commerciale della zona.";
    item.longDescription = item.description + " " + placeContext;
    item.sources = sourcesFor(item, "shopping");
    item.imageQueries = [item.imageQuery, item.jp + " " + item.name, item.name + " Japan product"];
    item.guideSections = [
      { title: "Perché cercarlo in Giappone", body: guide.why + " " + placeContext },
      { title: "Come riconoscerlo", body: guide.recognize },
      { title: "Dove guardare", body: "Punto di partenza: " + item.where + ". Confronta negozio ufficiale, specialista e grande catena quando esistono; disponibilità, colori ed edizioni cambiano rapidamente." },
      { title: "Quanto è davvero raro", body: "Consideralo soprattutto più facile da trovare, più vario o più conveniente in Giappone, non automaticamente impossibile da acquistare in Italia. Verifica codice o edizione esatta prima di pagare un sovrapprezzo per la parola limited." },
      { title: "Compatibilità e valigia", body: shoppingChecks(item) },
      { title: "Strategia d'acquisto", body: "Fascia indicativa: " + item.price + ". " + item.tip + " " + guide.buy },
      { title: "Nota semiseria", body: shoppingHumorFor(item), fun: true }
    ];
  }

  // L'aggancio punto\u2192scheda rinormalizzava gli stessi ~260 nomi per ognuno dei
  // 261 punti mappa, all'avvio: era la voce pi\u00f9 cara di tutto il boot. Il
  // risultato si ricorda per stringa; la logica di aggancio non cambia.
  const normalizedNames = new Map();

  function normalizeName(value) {
    const key = String(value || "");
    let cached = normalizedNames.get(key);
    if (cached === undefined) {
      cached = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
      normalizedNames.set(key, cached);
    }
    return cached;
  }

  function findGuideItem(point) {
    const pointName = normalizeName(point.name);
    const candidates = [].concat(data.places, data.experiences || []);
    if (point.guideId) {
      const linked = candidates.find(function (item) { return item.id === point.guideId; });
      if (linked) return linked;
    }
    // Si prende la corrispondenza più precisa, non la prima trovata. Con la
    // ricerca lineare il punto "Animate Akihabara" si agganciava alla scheda del
    // quartiere "Akihabara", solo perché veniva prima in elenco e il nome è
    // contenuto: la scheda del negozio restava senza punto, e quindi senza
    // quadratino per metterla sulla mappa.
    let best = null;
    let bestScore = 0;
    candidates.forEach(function (item) {
      if (item.city !== point.city) return;
      const itemName = normalizeName(item.name);
      let score = 0;
      if (pointName === itemName) score = 1000;
      else if (Math.min(pointName.length, itemName.length) >= 7
        && (pointName.includes(itemName) || itemName.includes(pointName))) {
        // Più lungo è il nome in comune, più specifica è la scheda.
        score = Math.min(pointName.length, itemName.length);
      }
      if (score > bestScore) { bestScore = score; best = item; }
    });
    return best;
  }

  function mapExperienceCategory(point) {
    if (point.category === "museo") return "museum";
    const text = normalizeName(point.name + " " + point.category);
    if (/onsen|sento|spa/.test(text)) return "wellness";
    if (/universal|disney|aquarium|teamlab|ghibli/.test(text)) return "theme";
    if (/kabuki|kembu|theater|theatre/.test(text)) return "show";
    if (/kokugikan|sumo|baseball|cycling|kart/.test(text)) return "sports";
    if (/kimono|workshop|craft|yuzen|pottery/.test(text)) return "workshop";
    return "quirky";
  }

  function enrichMapPoints() {
    data.mapPlaces = [];
    if (!window.JAPAN_MAP_DATA) return;
    window.JAPAN_MAP_DATA.points.filter(function (point) { return point.type === "visit"; }).forEach(function (point) {
      const curated = findGuideItem(point);
      if (curated) {
        point.guideId = curated.id;
        return;
      }
      const isExperience = point.category === "museo" || point.category === "esperienza";
      const category = data.labels.placeCategories[point.category] ? point.category : "quartiere";
      const item = {
        id: "guide-" + point.id,
        type: isExperience ? "experience" : "place",
        city: point.city,
        name: point.name,
        jp: "",
        category: isExperience ? mapExperienceCategory(point) : category,
        area: point.area || point.group || cityName(point.city),
        description: point.description,
        duration: "Da adattare alla giornata",
        tip: "Valuta affluenza e accessi sul posto",
        booking: "Controlla calendario, accesso e disponibilità sul sito ufficiale",
        imageQuery: point.name + " " + cityName(point.city) + " Japan"
      };
      if (isExperience) {
        enrichExperience(item);
        data.experiences.push(item);
      } else {
        enrichPlace(item);
        data.mapPlaces.push(item);
      }
      point.guideId = item.id;
    });
  }

  // Il testo scritto a mano vince sempre sul testo assemblato. I modelli qui
  // sopra sanno dire che cos'è un tempio, non perché quel tempio sia bruciato
  // nel 1950: dove qualcuno l'ha scritto, quella è la scheda. Le fonti si
  // sostituiscono solo se la storia ne porta di sue, così una scheda scritta
  // senza bibliografia non resta scoperta.
  function applyStory(item) {
    const story = (window.TABI_STORIES || {})[item.id];
    if (!story) return;
    if (story.long) item.longDescription = story.long;
    if (Array.isArray(story.sections) && story.sections.length) item.guideSections = story.sections;
    if (Array.isArray(story.sources) && story.sources.length) item.sources = story.sources;
    item.hasStory = true;
  }

  function enrichAll(list, enrich) {
    (list || []).forEach(function (item) { enrich(item); applyStory(item); });
  }

  enrichAll(data.places, enrichPlace);
  enrichAll(data.foods, enrichFood);
  enrichAll(data.shopping, enrichShopping);
  enrichAll(data.history, enrichHistory);
  enrichAll(data.experiences, enrichExperience);
  enrichMapPoints();
})();
