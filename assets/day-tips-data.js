(function () {
  "use strict";

  // Promemoria pratici per la giornata, tappa per tappa. Sono tendenze, non
  // orari ufficiali: gli orari cambiano per stagione, giorno e festività e
  // vanno sempre verificati sul posto o sul sito ufficiale.
  const rows = [
    {
      city: "osaka",
      early: "Il castello e l'Umeda Sky Building si riempiono a metà mattina: andateci all'apertura. Dotonbori al contrario dà il meglio dopo il tramonto, quando le insegne si accendono.",
      book: "Teppanyaki di manzo, kaiseki e i parchi a tema vogliono prenotazione con giorni di anticipo. I locali piccoli di Dotonbori no, ma si fa la fila.",
      evening: "Le bancarelle del Kuromon chiudono nel primo pomeriggio. I piani gastronomici dei grandi magazzini abbassano verso le 20, le izakaya tirano tardi.",
      sunsetSpot: "Umeda Sky Building, giardino sospeso",
      sunsetNote: "Salite 30-40 minuti prima: il bello è vedere la città passare dal giorno alla notte."
    },
    {
      city: "nara",
      early: "Il parco dei cervi al mattino presto è un'altra cosa: meno gruppi, meno caldo e animali più tranquilli. Il Todai-ji accumula code verso metà giornata.",
      book: "Niente di obbligatorio, ma i ristoranti di Naramachi sono pochi e piccoli: pranzate presto o tardi.",
      evening: "Quasi tutti i templi chiudono nel tardo pomeriggio e Naramachi si spegne presto. Per la cena conviene rientrare a Osaka.",
      sunsetSpot: "Collina di Wakakusa oppure il padiglione Ukimido sullo stagno Sarusawa",
      sunsetNote: "Dal padiglione il riflesso sull'acqua vale la deviazione; sulla collina controllate che l'accesso sia aperto."
    },
    {
      city: "miyajima",
      early: "L'isola cambia completamente con la marea: cercate l'orario prima di partire, perché decide se il torii è nell'acqua o si raggiunge a piedi.",
      book: "Non serve prenotare, ma il traghetto e il rientro sì: guardate l'ultima corsa prima di rilassarvi.",
      evening: "Le botteghe della Omotesando chiudono nel tardo pomeriggio e l'isola si svuota. Dopo l'ultimo traghetto restano solo gli ospiti degli alberghi.",
      sunsetSpot: "Riva davanti al torii, lato nord",
      sunsetNote: "Con la marea alta il torii si riflette; con la bassa si cammina fin sotto, ma la foto è meno scenografica.",
      // La tabella non si copia qui: cambia ogni giorno e invecchierebbe subito.
      // L'associazione turistica dell'isola pubblica i livelli ora per ora e
      // segna già da sola le due fasce che interessano.
      lookup: {
        label: "Controlla la marea di oggi",
        title: "Su un solo giorno, la marea decide l'orario",
        note: "Ci sono due alte e due basse al giorno e slittano di circa 50 minuti ogni giorno, quindi non esiste una regola da imparare: si guarda la data. Con la marea bassa si cammina fin sotto il torii; con l'alta sembra galleggiare. La pagina ufficiale dell'isola segna direttamente le fasce “walking to the Torii Gate” e “viewing the floating shrine”.",
        url: "https://www.miyajima.or.jp/english/sio/sio.php",
        sourceLabel: "Miyajima Tourist Association",
        backupUrl: "https://www.data.jma.go.jp/kaiyou/db/tide/suisan/index.php",
        backupLabel: "Tabelle di marea dell'Agenzia meteorologica giapponese"
      }
    },
    {
      city: "hiroshima",
      early: "Il museo della Pace è più affollato a metà mattina, quando arrivano le scolaresche. Presto o nel tardo pomeriggio si visita con un altro ritmo.",
      book: "Gli okonomiyaki più noti non prenotano: si fa la coda a pranzo e verso le 19. Andate alle 17.30 e la fila sparisce.",
      evening: "Il parco della Pace resta attraversabile a ogni ora, il museo no: chiude nel tardo pomeriggio, prima in inverno.",
      sunsetSpot: "Ponte sul fiume Motoyasu, davanti alla Cupola della bomba atomica",
      sunsetNote: "La luce bassa sul reticolo della cupola è il momento in cui il luogo si capisce meglio."
    },
    {
      city: "kyoto",
      early: "Fushimi Inari va fatto prima delle 8 o dopo il tramonto: è sempre aperto ed è l'unico modo di vedere i torii senza folla. Anche il bambuseto di Arashiyama e il Kinkaku-ji vogliono la prima ora.",
      book: "Kaiseki, cerimonia del tè, cene di ryokan e i ristoranti di Pontocho vanno prenotati, spesso con giorni di anticipo.",
      evening: "Quasi tutti i templi chiudono tra le 16.30 e le 17 e l'ultimo ingresso è prima. Il mercato Nishiki si spegne nel tardo pomeriggio; Gion e Pontocho si accendono dopo.",
      sunsetSpot: "Terrazza del Kiyomizu-dera o le rive del fiume Kamo",
      sunsetNote: "Dal Kiyomizu si guarda la città illuminarsi; sul Kamo si siede la gente del posto, ed è gratis."
    },
    {
      city: "kanazawa",
      early: "Il mercato Omicho è vivo al mattino e si smorza dopo pranzo. Il Kenroku-en apre presto: la prima ora è quella giusta.",
      book: "I laboratori di foglia d'oro e le case da tè di Higashi Chaya hanno pochi posti: prenotate prima di arrivare.",
      evening: "I quartieri storici chiudono presto e restano bellissimi ma vuoti. La cena si trova soprattutto attorno alla stazione e a Katamachi.",
      sunsetSpot: "Parco del castello di Kanazawa, lato Ishikawa-mon",
      sunsetNote: "Gli spalti bianchi prendono una luce calda che di giorno non hanno."
    },
    {
      city: "shirakawago",
      early: "È una sosta lungo il trasferimento: la prima cosa da guardare non è il villaggio ma l'orario del bus successivo, perché ne passano pochi.",
      book: "Il bus tra Kanazawa e Takayama è a prenotazione obbligatoria in alta stagione. Le case museo hanno biglietto sul posto.",
      evening: "Le case visitabili chiudono nel tardo pomeriggio e con l'ultimo bus il villaggio torna ai residenti.",
      sunsetSpot: "Terrazza panoramica di Shiroyama",
      sunsetNote: "Bello, ma verificate prima l'ultima navetta: a piedi la discesa al buio è lunga."
    },
    {
      city: "takayama",
      early: "I mercati mattutini di Jinya-mae e Miyagawa finiscono verso mezzogiorno: se dormite troppo, li avete persi.",
      book: "Le degustazioni nelle distillerie di sake hanno orari stretti e a volte turni. I ristoranti di manzo Hida a cena si riempiono.",
      evening: "Le botteghe di Sanmachi chiudono nel tardo pomeriggio. La sera la città vecchia è silenziosa e illuminata, ma quasi tutto è chiuso.",
      sunsetSpot: "Parco di Shiroyama, sopra la città vecchia",
      sunsetNote: "Salita breve ma in pendenza: partite con luce ancora piena."
    },
    {
      city: "matsumoto",
      early: "Il castello si visita salendo scale di legno molto ripide e strette, una persona alla volta: a metà giornata l'attesa dentro può superare quella all'ingresso.",
      book: "Non serve prenotare, ma il biglietto del mastio a volte è a fasce orarie nei periodi di punta.",
      evening: "Il castello chiude nel tardo pomeriggio. Nakamachi, con i magazzini bianchi e neri, resta piacevole da percorrere anche dopo.",
      sunsetSpot: "Fossato del castello, lato nord",
      sunsetNote: "Il mastio nero contro il cielo chiaro è la fotografia che tutti provano a fare."
    },
    {
      city: "nagano",
      early: "La cerimonia dell'alba allo Zenko-ji è il motivo per svegliarsi presto qui: comincia col sorgere del sole e cambia orario ogni giorno.",
      book: "Per il parco delle scimmie di Jigokudani contano i bus, non la prenotazione: andata e ritorno vanno pianificati insieme.",
      evening: "Il parco delle scimmie chiude nel pomeriggio e l'ultimo bus è prima del tramonto. In città la via dello Zenko-ji si svuota presto.",
      sunsetSpot: "Viale di accesso allo Zenko-ji",
      sunsetNote: "Le lanterne si accendono mentre la luce cala: è il momento più bello della giornata qui."
    },
    {
      city: "tokyo",
      early: "Il Senso-ji all'alba è vuoto e la Nakamise è tutta un'altra strada. Shibuya e Shinjuku invece migliorano di sera.",
      book: "Osservatori panoramici, teamLab e i ristoranti più noti vanno su biglietti a fascia oraria, spesso esauriti giorni prima.",
      evening: "Attenzione all'ultimo treno, tra mezzanotte e le 00.30 a seconda della linea: dopo restano solo i taxi, cari. I konbini non chiudono mai.",
      sunsetSpot: "Osservatorio del Palazzo del Governo Metropolitano a Shinjuku",
      sunsetNote: "È gratuito: nelle giornate limpide si vede il Fuji stagliarsi sull'orizzonte."
    },
    {
      city: "kamakura",
      early: "Il Grande Buddha e Hase-dera aprono presto e si riempiono verso le dieci, quando arrivano i treni da Tokyo. Hōkoku-ji è piccolo: nel bambù ci sta poca gente per volta, e con la calma vale il doppio.",
      book: "Niente da prenotare, ma la Enoden è una sola linea a binario unico e nei fine settimana si viaggia in piedi. Il matcha nel giardino di Hōkoku-ji si paga a parte all'ingresso.",
      evening: "I templi chiudono nel tardo pomeriggio, prima in inverno, e le botteghe di Komachi-dōri abbassano poco dopo. La sera Kamakura è residenziale: per cena si torna a Tokyo.",
      sunsetSpot: "Spiaggia di Yuigahama, guardando verso ovest",
      sunsetNote: "Il sole cala dietro il promontorio di Enoshima e nelle giornate limpide il Fuji si vede in controluce."
    },
    {
      city: "hakone",
      early: "Ōwakudani e il lago vogliono la mattina: è quando il Fuji si vede, prima che la foschia salga. Il pomeriggio la valle si copre quasi ogni giorno.",
      book: "Le funivie e i battelli non si prenotano, ma Ōwakudani chiude senza preavviso quando il livello di gas sulfureo sale: controllate lo stato del giorno prima di salire. Per un ryokan con onsen invece si prenota con settimane di anticipo.",
      evening: "Il giro ad anello — treno, funicolare, funivia, battello, bus — è tutto su ultime corse nel tardo pomeriggio: se perdete un anello, il resto salta a catena.",
      sunsetSpot: "Riva di Moto-Hakone, vicino al torii sull'acqua",
      sunsetNote: "La luce bassa accende il rosso del torii contro il lago scuro; il Fuji, se c'è, sta esattamente dietro."
    }
  ];

  // Valgono ovunque e tutti i giorni.
  window.JAPAN_DATA.alwaysTips = [
    "Tenete contanti: templi, mercati e locali piccoli spesso non prendono carte.",
    "Per strada non ci sono cestini: quello che aprite ve lo riportate dietro fino a sera.",
    "In treno e in metro non si telefona e si tiene il volume basso.",
    "Prima di rientrare, controllate l'ultimo treno: in molte città è prima di mezzanotte."
  ];

  window.JAPAN_DATA.dayTips = rows;
})();
