(function () {
  "use strict";

  const data = window.JAPAN_DATA;
  const cityGuides = {
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

  const placeHumor = {
    tempio: "Obiettivo ufficiale: contemplazione. Obiettivo realistico: non farsi ipnotizzare dal negozio degli amuleti dopo sette minuti di pace interiore.",
    santuario: "Se dopo il torii ti senti improvvisamente più solenne, funziona. Se compri cinque omamori per coprire ogni possibile catastrofe, funziona anche il marketing.",
    panorama: "Prima guarda il panorama con gli occhi. Poi fai pure 38 foto quasi identiche che, a casa, nessuno saprà distinguere.",
    quartiere: "La regola è semplice: quando Google Maps dice di tornare indietro, probabilmente hai appena trovato la strada più interessante.",
    shopping: "Entra per dare un'occhiata, esci con una busta e una spiegazione molto articolata sul perché quell'oggetto fosse culturalmente indispensabile.",
    castello: "Le scale furono progettate per rallentare gli invasori. Dopo qualche piano capirai che funzionano ancora benissimo sui turisti.",
    museo: "Non serve leggere ogni pannello come se ci fosse un esame finale. Scegli tre cose da ricordare e risparmia la dignità dei tuoi piedi.",
    natura: "La montagna non sa che avete una tabella di marcia. Se decide di aggiungere nebbia, fango o salite infinite, ha sempre l'ultima parola.",
    giardino: "Sembra tutto spontaneo, ma ogni pietra è probabilmente più studiata della disposizione dei mobili in casa vostra.",
    mercato: "Assaggiare tutto è ricerca culturale. Ripeterlo dopo il dodicesimo spuntino è una linea difensiva comunque rispettabile.",
    "casa-storica": "Le stanze minimaliste fanno venire voglia di buttare metà delle proprie cose. L'effetto dura in media fino al prossimo negozio di souvenir.",
    memoriale: "Qui la battuta si ferma: prendetevi il tempo necessario, leggete una storia individuale e lasciate che il luogo faccia il resto.",
    cibo: "Dire 'prendiamo solo un assaggio' è il modo tradizionale con cui iniziano pasti completamente fuori controllo."
  };

  const foodHumor = {
    primi: "Il rumore dei noodles non è un difetto di educazione: è il momento in cui potete fare slurp con convinzione e chiamarlo immersione culturale.",
    secondi: "Se il primo boccone vi fa chiudere gli occhi, ottimo. Se vi fa anche annuire lentamente come giudici televisivi, state forse esagerando ma nessuno vi fermerà.",
    street: "Viene servito a temperatura vulcano e voi direte comunque 'tranquilli, non scotta'. La lingua presenterà reclamo poco dopo.",
    dolci: "Sono piccoli, eleganti e quindi apparentemente innocui. Questa è propaganda della pasticceria: ordinare il secondo resta facilissimo.",
    contorni: "Il piattino che sembrava decorativo finirà per essere la cosa di cui discuterete per venti minuti. È così che il Giappone vince ai dettagli.",
    bevande: "Il tasting nasce per confrontare aromi e territorio. Fotografare i bicchieri e poi dimenticare quale fosse il preferito è una variante turistica molto diffusa."
  };

  const historyHumor = {
    storia: "Riassunto brutale: qualcuno voleva più potere, qualcun altro non era d'accordo e nel frattempo sono comparsi mura, tasse e un numero impressionante di incendi.",
    cultura: "Se una regola vi sembra inspiegabilmente precisa, probabilmente dietro ci sono tre secoli di pratica e almeno una persona che vi sta osservando mentre la sbagliate.",
    spiritualita: "Non serve raggiungere l'illuminazione entro la chiusura. Basta rallentare, osservare e non trasformare ogni gesto rituale in un servizio fotografico.",
    architettura: "Quell'incastro di legno sopravvive da secoli senza la vostra libreria di brugole. Un piccolo colpo all'autostima del fai-da-te occidentale.",
    mitologia: "Quando la spiegazione include una dea, una montagna scagliata in aria e un animale messaggero, il realismo può tranquillamente aspettare fuori.",
    artigianato: "Dopo aver visto quante ore richiede un oggetto, il prezzo smette di sembrare alto e inizia a sembrare un educato rimprovero.",
    aneddoti: "È la storia che ricorderete a cena, probabilmente con dettagli sempre più spettacolari a ogni nuova narrazione."
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
    const city = data.cities.find(function (candidate) { return candidate.id === id; });
    return city ? city.name : id;
  }

  function enrichPlace(item) {
    const city = cityGuides[item.city];
    const guide = placeGuides[item.category] || placeGuides.quartiere;
    item.longDescription = item.description + " Nel contesto di " + cityName(item.city) + ", questa tappa aiuta a leggere il carattere della città e merita di essere osservata oltre la fotografia più famosa.";
    item.guideSections = [
      { title: "Perché vale la visita", body: guide.why + " A " + cityGuides[item.city].identity },
      { title: "Cosa osservare", body: guide.observe + " In particolare, nell'area di " + item.area + ", " + city.signs.charAt(0).toLowerCase() + city.signs.slice(1) },
      { title: "Come viverlo", body: "Tempo indicativo: " + item.duration + ". Momento consigliato: " + item.tip + ". " + guide.visit },
      { title: "La chiave della città", body: city.place + " " + city.history },
      { title: "Rispetto e buone maniere", body: guide.etiquette },
      { title: "Come collegarlo al viaggio", body: city.route },
      { title: "Nota semiseria", body: placeHumor[item.category] || placeHumor.quartiere, fun: true }
    ];
  }

  function enrichFood(item) {
    const city = cityGuides[item.city];
    const guide = foodGuides[item.category] || foodGuides.secondi;
    const context = contextGuides[item.context] || contextGuides.ristorante;
    item.longDescription = item.description + " Provarlo a " + cityName(item.city) + " aiuta a collegare ingredienti, tecniche e abitudini locali oltre le specialità più note.";
    item.guideSections = [
      { title: "Come riconoscerlo", body: guide.recognize + " Per " + item.name + ", usa come riferimento la descrizione della scheda e confronta aspetto, cottura e guarnizioni prima di ordinare." },
      { title: "Che sapore aspettarsi", body: guide.flavor + " " + city.food },
      { title: "Come si mangia", body: guide.eat + " " + context.how },
      { title: "Come ordinarlo", body: "Mostra il nome " + item.jp + " al personale. " + context.order },
      { title: "Da sapere", body: guide.know + " " + foodSafety(item) },
      { title: "Per capirne il contesto", body: city.identity + " " + city.history },
      { title: "Nota semiseria", body: foodHumor[item.category] || foodHumor.secondi, fun: true }
    ];
  }

  function enrichHistory(item) {
    const city = cityGuides[item.city];
    const guide = historyGuides[item.category] || historyGuides.storia;
    item.name = item.title;
    item.jp = item.kanji;
    item.longDescription = item.explanation + " Questo tema offre una chiave concreta per leggere " + cityName(item.city) + " sul posto e collegare ciò che vedrai alla storia della città.";
    item.guideSections = [
      { title: "Il quadro generale", body: city.history + " " + item.explanation },
      { title: "La domanda giusta", body: guide.lens },
      { title: "Cosa riconoscere sul posto", body: guide.look + " " + city.signs },
      { title: "Collegalo alle visite", body: city.place + " " + city.route },
      { title: "L'aneddoto da ricordare", body: item.anecdote },
      { title: "Parole chiave", body: item.kanji + " · " + item.title + " · " + data.labels.historyCategories[item.category] + " · " + data.cities.find(function (candidate) { return candidate.id === item.city; }).name },
      { title: "Nota semiseria", body: historyHumor[item.category] || historyHumor.storia, fun: true }
    ];
  }

  function normalizeName(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function findCuratedPlace(point) {
    const pointName = normalizeName(point.name);
    return data.places.find(function (place) {
      if (place.city !== point.city) return false;
      const placeName = normalizeName(place.name);
      return pointName === placeName || (Math.min(pointName.length, placeName.length) >= 7 && (pointName.includes(placeName) || placeName.includes(pointName)));
    });
  }

  function enrichMapPoints() {
    data.mapPlaces = [];
    if (!window.JAPAN_MAP_DATA) return;
    window.JAPAN_MAP_DATA.points.filter(function (point) { return point.type === "visit"; }).forEach(function (point) {
      const curated = findCuratedPlace(point);
      if (curated) {
        point.guideId = curated.id;
        return;
      }
      const category = placeGuides[point.category] ? point.category : "quartiere";
      const item = {
        id: "guide-" + point.id,
        type: "place",
        city: point.city,
        name: point.name,
        jp: "",
        category: category,
        area: point.area || point.group || cityName(point.city),
        description: point.description,
        duration: "Da adattare alla giornata",
        tip: "Valuta affluenza e accessi sul posto",
        imageQuery: point.name + " " + cityName(point.city) + " Japan"
      };
      enrichPlace(item);
      data.mapPlaces.push(item);
      point.guideId = item.id;
    });
  }

  data.places.forEach(enrichPlace);
  data.foods.forEach(enrichFood);
  data.history.forEach(enrichHistory);
  enrichMapPoints();
})();
