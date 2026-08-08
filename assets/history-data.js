(function () {
  "use strict";
  const fields = ["city","slug","category","kanji","title","explanation","anecdote"];
  const rows = `
tokyo|edo-city|storia|江戸|Da Edo a Tokyo|Per oltre due secoli Edo fu il centro politico dello shogunato Tokugawa, mentre Kyoto restava capitale imperiale. Nel 1868 il nome cambiò in Tokyo, capitale orientale.|La rete di canali e molti quartieri moderni seguono ancora la forma della città dei samurai.
tokyo|shitamachi|cultura|町|Che cosa significa shitamachi|La città bassa era l'area popolare di artigiani e mercanti a est del palazzo. Asakusa, Ueno e Yanaka conservano ancora una scala più umana.|I piccoli santuari tra le case spesso appartengono alla storia del singolo vicinato.
tokyo|shrine-temple|spiritualita|社|Santuario o tempio?|I santuari shintoisti hanno torii e celebrano i kami; i templi buddhisti hanno porte sanmon, incenso e statue del Buddha. Le due tradizioni convivono da secoli.|A Senso-ji puoi incontrare un tempio buddhista e, a pochi passi, il santuario Asakusa.
kamakura|shogunate|storia|幕府|La prima capitale dei guerrieri|Nel 1192 Minamoto no Yoritomo stabilì a Kamakura il primo governo militare stabile. La città divenne il laboratorio politico dei samurai.|Le colline e i passi stretti erano una difesa naturale più efficace di grandi mura.
kamakura|zen|spiritualita|禅|Lo Zen dei samurai|I reggenti Hojo favorirono lo Zen importato dalla Cina, adatto a una classe guerriera che apprezzava disciplina e controllo.|I giardini asciutti non sono decorazione vuota: invitano a concentrare lo sguardo.
kamakura|great-buddha|aneddoti|仏|Il Buddha sopravvissuto al mare|Il Grande Buddha era originariamente protetto da un edificio. Tifoni e probabilmente uno tsunami lo distrussero, lasciando la statua all'aperto.|Si può entrare nel bronzo e vedere dall'interno come fu assemblato nel XIII secolo.
hakone|tokaido|storia|道|Il controllo sulla Tokaido|Hakone era uno dei checkpoint più severi della strada tra Edo e Kyoto. Funzionari controllavano armi e viaggiatori, soprattutto le donne delle famiglie feudali.|Il detto iri-deppo ni de-onna riassumeva il timore di armi in entrata e donne in fuga da Edo.
hakone|onsen|cultura|湯|La cultura dell'onsen|Le sorgenti di Hakone servono locande da secoli. Il bagno è un rito sociale e di riposo, non una piscina.|Prima ci si lava completamente; nell'acqua termale si entra senza costume e con il piccolo asciugamano fuori dalla vasca.
hakone|yosegi|architettura|木|Il mosaico dei boschi|Lo yosegi-zaiku usa i colori naturali di molte essenze per creare motivi geometrici, poi applicati come sottili fogli su scatole e oggetti.|Le scatole segrete himitsu-bako si aprono con una sequenza precisa di movimenti.
matsumoto|original-castle|architettura|城|Un castello originale|Matsumoto conserva un mastio in legno dell'inizio del Seicento, non una ricostruzione in cemento. Le scale ripide erano parte della difesa.|Il cosiddetto Moon Viewing Turret fu aggiunto in tempo di pace e non ha feritoie.
matsumoto|kura|architettura|蔵|I magazzini kura|Le facciate bianche e nere di Nakamachi appartengono a magazzini resistenti al fuoco, essenziali in una città di mercanti.|Le spesse porte venivano chiuse e sigillate quando un incendio si avvicinava.
matsumoto|mingei|cultura|民|Lo spirito mingei|Il movimento mingei rivalutò la bellezza degli oggetti anonimi, utili e ben fatti. Matsumoto ne diventò un centro importante.|Una sedia o un vassoio mingei non cercano lusso: mostrano materiali, uso e mano dell'artigiano.
nagano|zenkoji|spiritualita|光|Un tempio senza setta|Zenko-ji accoglie fedeli oltre le divisioni tra scuole buddhiste ed è legato a una delle più antiche immagini del Buddha in Giappone.|La statua principale è un hibutsu: nessuno la vede direttamente, nemmeno i sacerdoti.
nagano|togakushi|mitologia|岩|La porta di roccia|Secondo il mito, la dea del sole Amaterasu si nascose in una grotta. La porta scagliata via atterrò a Togakushi, la montagna della porta nascosta.|La tradizione degli asceti di montagna contribuì alla successiva fama locale dei ninja.
nagano|mountain-food|cultura|山|Mangiare in montagna|Inverni lunghi e pochi terreni pianeggianti favorirono soba, conserve e proteine insolite come insetti e pesci d'acqua dolce.|Molti cibi oggi curiosi erano semplicemente strategie intelligenti per attraversare l'inverno.
kanazawa|maeda|storia|加|La ricchezza prudente dei Maeda|I signori Maeda furono tra i più ricchi del paese. Investirono in arti e cultura anche per apparire meno minacciosi agli occhi dello shogun.|La raffinatezza di Kanazawa fu anche una strategia politica di sopravvivenza.
kanazawa|chaya|architettura|茶|Dentro una chaya|Le case da tè erano luoghi di spettacolo con musica, danza e conversazione. Le facciate a listelli proteggevano la privacy lasciando filtrare la luce.|Una chaya non è una normale sala da tè: storicamente l'accesso avveniva tramite presentazione.
kanazawa|gold-leaf|artigianato|金|Perché tanta foglia d'oro|Clima umido, acqua adatta e abilità artigiane hanno reso Kanazawa il principale centro giapponese della foglia d'oro.|La foglia è così sottile che un soffio può piegarla o farla sparire.
shirakawago|gassho|architettura|合|Case come mani in preghiera|I tetti gassho-zukuri sono molto inclinati per far scivolare la neve e non usano chiodi nelle grandi giunzioni.|Gassho indica le mani giunte: la stessa forma evocata dalle due falde.
shirakawago|attic|cultura|蚕|Il lavoro nei sottotetti|I piani alti ventilati delle case erano usati per allevare bachi da seta, importante fonte di reddito nelle valli isolate.|Il fumo del focolare aiutava a proteggere paglia e travi dagli insetti.
shirakawago|yui|cultura|結|Il tetto è un lavoro collettivo|La sostituzione della paglia richiede molte mani ed era organizzata attraverso il sistema comunitario yui.|Una casa dipendeva dal villaggio: il paesaggio esiste perché la manutenzione era condivisa.
takayama|shogun-land|storia|天|Legname sotto controllo diretto|La ricchezza forestale di Hida spinse lo shogunato a governare direttamente Takayama dal Jinya.|Gli abili carpentieri di Hida lavorarono in templi e palazzi in tutto il Giappone.
takayama|festival-floats|artigianato|祭|Carri come teatri mobili|Gli yatai del festival combinano lacca, metallo, tessuti e marionette meccaniche karakuri.|Per il resto dell'anno i carri riposano in alti magazzini riconoscibili nelle strade.
takayama|sugidama|cultura|酒|La sfera di cedro|Una grande sfera di aghi di cedro fuori da una sakagura annuncia il nuovo sake. Verde all'inizio, diventa marrone mentre matura.|Il cambiamento di colore era un calendario visivo per i clienti.
kyoto|capital|storia|京|Più di mille anni capitale|Heian-kyo fu fondata nel 794 su una griglia ispirata alle capitali cinesi. Kyoto rimase sede imperiale fino al 1868.|Molte strade centrali conservano ancora la griglia, anche quando i nomi cambiano.
kyoto|temple-buildings|architettura|寺|Leggere un complesso templare|La porta segna il passaggio, il kondo ospita l'immagine principale, la pagoda conserva simbolicamente reliquie e i giardini guidano la mente.|Non tutti gli edifici sono aperti: spesso il percorso esterno è parte essenziale della visita.
kyoto|gion-etiquette|cultura|祇|Gion non è un set fotografico|Le geiko e maiko sono professioniste di arti performative che si spostano tra appuntamenti di lavoro.|Bloccare una maiko o entrare in vicoli privati trasforma la curiosità in invasione.
nara|first-capital|storia|奈|La capitale che precedette Kyoto|Nara fu capitale stabile dal 710 al 784 e centro di un progetto statale che univa governo e buddhismo.|La pianta di Heijo-kyo seguiva un modello cinese, con il palazzo a nord.
nara|great-buddha|architettura|大|Un Buddha per proteggere il paese|Todai-ji e il Grande Buddha furono voluti nell'VIII secolo durante epidemie e crisi, come progetto religioso e politico nazionale.|La statua consumò una parte enorme delle risorse di bronzo del paese.
nara|deer|mitologia|鹿|Perché i cervi sono sacri|La tradizione racconta che una divinità di Kasuga arrivò cavalcando un cervo bianco. Gli animali divennero messaggeri dei kami.|Il loro inchino è anche un comportamento appreso per ottenere gli shika senbei.
osaka|merchant-city|storia|商|La cucina del paese|Osaka divenne il grande mercato del riso e delle merci del Giappone, guadagnando il soprannome tenka no daidokoro, cucina della nazione.|I mercanti, pur socialmente inferiori ai samurai, costruirono una cultura urbana ricchissima.
osaka|castle-power|architettura|阪|Il castello come dichiarazione|Toyotomi Hideyoshi costruì Osaka-jo per mostrare il potere dell'unificazione nazionale. Le mura usano blocchi di scala impressionante.|Alcune pietre portano ancora i marchi dei signori feudali obbligati a fornirle.
osaka|kuidaore|cultura|食|Mangiare fino a rovinarsi|Kuidaore descrive ironicamente l'idea di spendere tutto nel cibo. Riassume l'orgoglio di Osaka per gusto, informalità e abbondanza.|Molte specialità konamon nacquero come cibo rapido e popolare, non come alta cucina.
hiroshima|castle-town|storia|広|Prima del 1945|Hiroshima nacque come città-castello nel delta del fiume Ota e divenne un importante centro militare e industriale.|La struttura dei fiumi continua a orientare quartieri, ponti e spostamenti.
hiroshima|reconstruction|storia|復|Ricostruire una città di pace|Dopo la distruzione atomica, Hiroshima scelse di rappresentarsi come città della pace e della memoria internazionale.|Il parco fu progettato da Kenzo Tange lungo un asse visivo che collega cenotafio e cupola.
hiroshima|origami-cranes|aneddoti|鶴|Le gru di Sadako|La storia di Sadako Sasaki, malata per le radiazioni, rese le gru di carta un simbolo globale di speranza.|Al Children's Peace Monument arrivano ancora ogni anno milioni di gru da tutto il mondo.
miyajima|sacred-island|spiritualita|島|Un'isola considerata divina|Itsukushima era venerata come corpo sacro; per secoli nascita e morte furono tenute lontane dall'isola per preservarne la purezza.|Il santuario sull'acqua permetteva simbolicamente di avvicinarsi senza profanare la terra.
miyajima|tides|architettura|潮|Un edificio progettato con le maree|Itsukushima Jinja non galleggia: poggia su pali e piattaforme che cambiano aspetto con il livello del mare.|Con la bassa marea si raggiunge il torii a piedi; con l'alta sembra sospeso sull'acqua.
miyajima|shamoji|aneddoti|杓|Il mestolo portafortuna|Un monaco avrebbe promosso il mestolo da riso come prodotto locale, ispirandosi alla forma del liuto biwa della dea Benzaiten.|La parola meshi-toru può suonare come catturare il nemico, rendendolo un portafortuna militare e poi sportivo.
`.trim().split("\n").map(function (line) {
    const values = line.split("|");
    return fields.reduce(function (item, field, index) { item[field] = values[index]; return item; }, {});
  });
  const historyCategories = {
    storia:"Storia", architettura:"Architettura", spiritualita:"Spiritualità",
    cultura:"Vita e cultura", aneddoti:"Aneddoti", mitologia:"Miti",
    artigianato:"Artigianato"
  };
  const allowedCities = new Set(window.JAPAN_DATA.cities.map(function (city) { return city.id; }));
  window.JAPAN_DATA.history = rows.filter(function (row) { return allowedCities.has(row.city); }).map(function (row) {
    row.id = "history-" + row.city + "-" + row.slug;
    row.type = "history";
    return row;
  });
  window.JAPAN_DATA.labels.historyCategories = historyCategories;
})();
