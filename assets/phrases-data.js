(function () {
  "use strict";

  const categories = {
    cortesia: "Cortesia",
    orientamento: "Orientarsi",
    trasporti: "Trasporti",
    ristorante: "Mangiare",
    shopping: "Acquisti",
    hotel: "Hotel",
    salute: "Salute",
    emergenza: "Emergenze"
  };

  const fields = ["category", "jp", "romaji", "italianReading", "meaning", "note"];
  const rows = `
cortesia|こんにちは|konnichiwa|konnici-uà|Buongiorno / salve|Va bene durante il giorno. La doppia n si sente: non è koniciva sparato in discesa.
cortesia|こんばんは|konbanwa|kon-ban-uà|Buonasera|Si scrive con ha finale ma si pronuncia wa. Konbawa è comprensibile, ma qui facciamo i raffinati.
cortesia|おはようございます|ohayō gozaimasu|ohaiò gozaimàs|Buongiorno, forma cortese|Ottima al mattino in hotel, negozi e ristoranti.
cortesia|ありがとうございます|arigatō gozaimasu|arigatò gozaimàs|Grazie mille|Arigatō da solo è più informale; questa versione funziona quasi ovunque.
cortesia|すみません|sumimasen|sumimasèn|Mi scusi / scusa / grazie per il disturbo|La chiave universale: apre conversazioni, chiede attenzione e ripara piccoli disastri sociali.
cortesia|お願いします|onegaishimasu|onegài scimàs|Per favore / glielo chiedo|Si usa per richieste e servizi; kudasai accompagna più spesso una cosa concreta.
cortesia|ください|kudasai|kudasài|Per favore, me lo dia|Aggancialo a ciò che indichi: kore o kudasai, questo per favore.
cortesia|大丈夫です|daijōbu desu|daigiòbu des|Va bene / sto bene / no grazie|Dipende dal contesto. Detto sorridendo evita di ricevere il settimo sacchetto.
cortesia|はい / いいえ|hai / iie|hài / i-iè|Sì / no|Hai è breve. Iie ha tre vocali: non trasformarlo in un ululato diplomatico.
cortesia|わかりません|wakarimasen|uakarimasèn|Non capisco|Più onesto di annuire per tre minuti e scoprire di aver ordinato una riunione condominiale.
orientamento|トイレはどこですか|toire wa doko desu ka|toirè ua dòko des ka|Dov'è il bagno?|Toire è la parola che il cervello ricorderà anche al culmine dell'emergenza.
orientamento|駅はどこですか|eki wa doko desu ka|ekì ua dòko des ka|Dov'è la stazione?|Eki significa stazione. Mostra anche la mappa per evitare un elegante dialogo tra due persone perse.
orientamento|ここはどこですか|koko wa doko desu ka|kòko ua dòko des ka|Dove siamo?|Koko è qui, doko è dove. Geografia essenziale in quattro sillabe.
orientamento|この住所へ行きたいです|kono jūsho e ikitai desu|kòno giùscio e ikitài des|Vorrei andare a questo indirizzo|Mostra l'indirizzo scritto: i kanji lavorano meglio del tuo accento dopo dodici ore in giro.
orientamento|右 / 左 / まっすぐ|migi / hidari / massugu|mìghi / hidàri / massùgu|Destra / sinistra / sempre dritto|Tre parole che trasformano gesti vaghi in indicazioni quasi professionali.
orientamento|地図で見せてください|chizu de misete kudasai|cìzu de misetè kudasài|Me lo mostra sulla mappa?|La frase salvagente quando una spiegazione orale diventa un podcast incomprensibile.
trasporti|この電車は東京に行きますか|kono densha wa Tōkyō ni ikimasu ka|kòno denscià ua Tòchiò ni ikimàs ka|Questo treno va a Tokyo?|Sostituisci Tokyo con la destinazione e mostra il nome sul telefono.
trasporti|何番線ですか|nanbansen desu ka|nan-bansèn des ka|Quale binario?|Il tabellone resta il giudice supremo: controlla numero, destinazione e orario insieme.
trasporti|乗り換えはどこですか|norikae wa doko desu ka|norikàe ua dòko des ka|Dove devo cambiare?|Norikae significa cambio o coincidenza.
trasporti|切符を一枚ください|kippu o ichimai kudasai|chìppu o icimài kudasài|Un biglietto, per favore|Per due biglietti usa nimai. Le macchine sono spesso più indulgenti della pronuncia.
trasporti|この席は空いていますか|kono seki wa aiteimasu ka|kòno sèchi ua aiteimàs ka|Questo posto è libero?|Utile sui treni non prenotati. Un gesto verso il sedile completa l'opera.
trasporti|終電は何時ですか|shūden wa nanji desu ka|sciùden ua nangi des ka|A che ora è l'ultimo treno?|Domandala prima che l'ultimo treno diventi una leggenda urbana costosa.
ristorante|おすすめは何ですか|osusume wa nan desu ka|osusumè ua nan des ka|Che cosa consiglia?|Osusume è il consiglio della casa: spesso risolve menu lunghi e indecisione cronica.
ristorante|これをください|kore o kudasai|kòre o kudasài|Questo, per favore|Indica foto o riga del menu. Tecnologia linguistica collaudata da generazioni di viaggiatori.
ristorante|水をください|mizu o kudasai|mìzu o kudasài|Acqua, per favore|Mizu è acqua. Non presume che sia gratuita: controlla il contesto.
ristorante|お会計お願いします|okaikei onegaishimasu|okàikei onegài scimàs|Il conto, per favore|In molti locali si paga alla cassa mostrando il tagliando del tavolo.
ristorante|これは辛いですか|kore wa karai desu ka|kòre ua karài des ka|È piccante?|Karai è piccante; amai è dolce. Confonderli rende il pranzo più narrativo.
ristorante|肉なしでお願いします|niku nashi de onegaishimasu|nìku nàsci de onegài scimàs|Senza carne, per favore|Attenzione: il dashi può contenere pesce anche se il piatto sembra vegetariano.
ristorante|アレルギーがあります|arerugī ga arimasu|arerughì ga arimàs|Ho un'allergia|Mostra sempre anche l'allergene scritto in giapponese: questa frase da sola non basta per la sicurezza.
ristorante|とてもおいしいです|totemo oishii desu|tòtemo oisciì des|È davvero buonissimo|Un complimento semplice che mette tutti d'accordo e non richiede traduzione simultanea.
shopping|いくらですか|ikura desu ka|ìkura des ka|Quanto costa?|Se il numero detto a voce corre troppo, indica il display o chiedi di scriverlo.
shopping|カードは使えますか|kādo wa tsukaemasu ka|kàado ua zukàemàs ka|Posso usare la carta?|Kādo è carta; allunga appena la a. Tieni comunque contanti per negozi piccoli e templi.
shopping|免税できますか|menzei dekimasu ka|menzèi dekimàs ka|Si può fare tax-free?|Porta il passaporto e controlla soglie e regole aggiornate del negozio.
shopping|見てもいいですか|mite mo ii desu ka|mìte mo iì des ka|Posso guardare?|Utile per oggetti delicati o esposti dietro una vetrina.
shopping|試着できますか|shichaku dekimasu ka|sciciàku dekimàs ka|Posso provarlo?|Per vestiti e scarpe. Le taglie giapponesi meritano una prova, non un atto di fede.
shopping|別の色はありますか|betsu no iro wa arimasu ka|bezù no ìro ua arimàs ka|C'è un altro colore?|Iro significa colore. Funziona anche quando l'edizione limitata esiste solo nel colore che odiate.
hotel|ホテルはどこですか|hoteru wa doko desu ka|hoterù ua dòko des ka|Dov'è l'hotel?|Hoteru, non hotel: una vocale finale in più e improvvisamente sembra quasi giapponese.
hotel|荷物を預けられますか|nimotsu o azukeraremasu ka|nimòzu o azukeraremàs ka|Posso lasciare i bagagli?|Utile prima del check-in o dopo il check-out.
hotel|部屋の鍵が開きません|heya no kagi ga akimasen|heia no kàghi ga akimasèn|La chiave non apre la camera|Mostra la tessera: il duello con il lettore magnetico ha già avuto abbastanza pubblico.
hotel|Wi-Fiのパスワードは何ですか|waifai no pasuwādo wa nan desu ka|uaifài no pasu-uàado ua nan des ka|Qual è la password Wi-Fi?|Una delle frasi diplomatiche più importanti del XXI secolo.
salute|医者が必要です|isha ga hitsuyō desu|ìscia ga hizuiò des|Ho bisogno di un medico|Isha significa medico. In urgenza chiama il 119 o chiedi aiuto al personale.
salute|病院はどこですか|byōin wa doko desu ka|biòin ua dòko des ka|Dov'è l'ospedale?|Byōin è ospedale; mostra la frase e la posizione sul telefono.
salute|気分が悪いです|kibun ga warui desu|kibùn ga uarùi des|Mi sento male|Indica anche il sintomo e da quanto tempo è iniziato.
salute|薬局はどこですか|yakkyoku wa doko desu ka|iacchiòku ua dòko des ka|Dov'è la farmacia?|Yakkyoku ha una piccola pausa sulla doppia consonante.
emergenza|助けてください|tasukete kudasai|tasuketè kudasài|Aiutatemi, per favore|Dillo forte se c'è un pericolo immediato; attira attenzione senza costruire una frase complessa.
emergenza|警察を呼んでください|keisatsu o yonde kudasai|keisàzu o ionde kudasài|Chiamate la polizia|Per un'urgenza di polizia il numero nazionale è 110.
emergenza|救急車を呼んでください|kyūkyūsha o yonde kudasai|chiù-chiùscia o ionde kudasài|Chiamate un'ambulanza|Per ambulanza o vigili del fuoco il numero nazionale è 119.
emergenza|道に迷いました|michi ni mayoimashita|mìci ni maioimascità|Mi sono perso|La frase è utile; la posizione blu sulla mappa è ancora più convincente.
`.trim().split("\n").map(function (line) {
    const values = line.split("|");
    return fields.reduce(function (item, field, index) { item[field] = values[index]; return item; }, {});
  });

  rows.forEach(function (row, index) { row.id = "phrase-" + String(index + 1).padStart(2, "0"); });
  window.JAPAN_DATA.phraseCategories = categories;
  // Le frasi di emergenza vivono solo nel tab Emergenze: qui restano nel dataset,
  // ma fuori dal frasario per non avere due strade per la stessa cosa.
  window.JAPAN_DATA.phrasebookCategories = ["cortesia", "orientamento", "trasporti", "ristorante", "shopping", "hotel", "salute"];
  window.JAPAN_DATA.phrases = rows;
  window.JAPAN_DATA.emergencyNumbers = [
    { number: "110", title: "Polizia", detail: "Urgenze di polizia", href: "tel:110" },
    { number: "119", title: "Ambulanza e vigili del fuoco", detail: "Emergenze mediche e incendi", href: "tel:119" },
    { number: "050-3816-2787", title: "Japan Visitor Hotline", detail: "JNTO, 24 ore su 24 in inglese, cinese e coreano", href: "tel:+815038162787" }
  ];
})();
