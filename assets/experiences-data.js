(function () {
  "use strict";

  const data = window.JAPAN_DATA;
  const mapData = window.JAPAN_MAP_DATA;
  const sources = {
    osaka: ["Osaka Info · Attività", "https://osaka-info.jp/en/spot/experience/"],
    nara: ["Visit Nara · Cose da fare", "https://www.visitnara.jp/see-and-do/"],
    miyajima: ["Miyajima Tourist Association", "https://www.miyajima.or.jp/english/"],
    hiroshima: ["Dive Hiroshima · Attività", "https://dive-hiroshima.com/en/explore/?category=5"],
    kyoto: ["Kyoto City Tourism · Attività", "https://kyoto.travel/en/experiences/"],
    kanazawa: ["Visit Kanazawa · Attività", "https://visitkanazawa.jp/en/activities/"],
    shirakawago: ["Shirakawa-go Tourist Association", "https://shirakawa-go.gr.jp/en/active/"],
    takayama: ["Hida Takayama · Attività", "https://www.hida.jp/english/recreationandleisure/foodandculture/"],
    matsumoto: ["Visit Matsumoto", "https://visitmatsumoto.com/en/"],
    nagano: ["Go Nagano · Attività", "https://www.go-nagano.net/en/trip-idea/things-to-do-around-nagano-city"],
    tokyo: ["GO TOKYO · Attività", "https://www.gotokyo.org/en/experiences/index.html"],
    driving: ["JAF · Guidare in Giappone", "https://english.jaf.or.jp/driving-in-japan/drive-in-japan/switch-to-japanese-license"]
  };

  data.labels.experienceCategories = {
    museum: "Musei e mostre",
    theme: "Parchi e mondi immersivi",
    workshop: "Laboratori",
    show: "Spettacoli",
    wellness: "Bagni e benessere",
    sports: "Sport e movimento",
    nature: "Natura attiva",
    food: "Cucina e degustazioni",
    quirky: "Giappone insolito"
  };

  // L'aggancio nome\u2192punto rinormalizzava gli stessi ~400 nomi per ognuna delle
  // 100 attivit\u00e0, all'avvio, sul telefono: il risultato si ricorda per stringa.
  const normalizeCache = new Map();

  function normalize(value) {
    const key = String(value || "");
    let cached = normalizeCache.get(key);
    if (cached === undefined) {
      cached = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
      normalizeCache.set(key, cached);
    }
    return cached;
  }

  function inferCategory(item) {
    const text = normalize(item.name + " " + item.category);
    if (item.category === "museo") return "museum";
    if (/onsen|sento|spa/.test(text)) return "wellness";
    if (/universal|disney|aquarium|teamlab|ghibli/.test(text)) return "theme";
    if (/kabuki|kembu|theater|theatre|bunraku|geisha/.test(text)) return "show";
    if (/sumo|kokugikan|baseball|cycling|kart/.test(text)) return "sports";
    if (/kimono|workshop|craft|yuzen|pottery|goldleaf|goldleaf/.test(text)) return "workshop";
    return "quirky";
  }

  function attachSource(item, sourceKey) {
    const source = sources[sourceKey || item.city] || sources.tokyo;
    item.sourceTitle = source[0];
    item.sourceUrl = source[1];
  }

  const moved = data.places.filter(function (item) {
    return item.category === "museo" || item.category === "esperienza";
  });
  data.places = data.places.filter(function (item) { return !moved.includes(item); });
  data.experiences = moved.map(function (item) {
    item.originalCategory = item.category;
    item.category = inferCategory(item);
    item.type = "experience";
    item.booking = item.tip || "Verifica accesso e disponibilità prima della visita";
    attachSource(item);
    return item;
  });
  delete data.labels.placeCategories.museo;
  delete data.labels.placeCategories.esperienza;

  const fields = ["city", "slug", "name", "jp", "category", "area", "duration", "booking", "description", "imageQuery", "lat", "lng", "sourceKey", "setting"];

  // Al chiuso o all'aperto: è la prima domanda che ci si fa quando piove o
  // quando fa 35 gradi. Dove non è dichiarato si deduce dalla tipologia.
  data.labels.experienceSettings = { indoor: "Al chiuso", outdoor: "All'aperto", misto: "Chiuso e aperto" };
  const settingByCategory = { museum: "indoor", show: "indoor", workshop: "indoor", food: "indoor", theme: "misto", wellness: "indoor", nature: "outdoor", sports: "misto", quirky: "misto" };
  const settingOverrides = {
    "experience-nara-cycling": "outdoor",
    "experience-hiroshima-peace-cycling": "outdoor",
    "experience-hiroshima-kyudo": "indoor",
    "experience-tokyo-baseball-game": "indoor",
    "experience-tokyo-street-kart": "outdoor",
    "experience-nara-wakakusa-hike": "outdoor",
    "experience-miyajima-ropeway": "outdoor"
  };
  function parseRows(text) {
    return text.trim().split("\n").filter(Boolean).map(function (line) {
      const values = line.split("|");
      return fields.reduce(function (item, field, index) {
        item[field] = values[index] || "";
        return item;
      }, {});
    });
  }

  const additions = parseRows(`
osaka|teamlab-botanical|teamLab Botanical Garden Osaka|チームラボ ボタニカルガーデン 大阪|theme|Nagai Botanical Garden|2 ore|Biglietto a fascia; controlla meteo e orario serale|Installazioni digitali notturne che reagiscono al vento, alle persone e alla vegetazione reale del giardino.|teamLab Botanical Garden Osaka night|34.7185|135.5733|
osaka|bunraku-theatre|National Bunraku Theatre|国立文楽劇場|show|Nippombashi|2-4 ore|Calendario a stagioni; prenota quando coincide con il viaggio|Il teatro delle marionette ningyo joruri unisce pupazzi mossi da tre persone, canto narrativo e shamisen.|National Bunraku Theatre Osaka puppets|34.6674|135.5064|
osaka|housing-living|Osaka Museum of Housing and Living|大阪くらしの今昔館|museum|Tenjinbashisuji|2 ore|Verifica aperture e ingresso dell'ultimo turno|Una strada di Osaka del periodo Edo ricostruita a grandezza naturale, con luce e suoni che simulano la giornata.|Osaka Museum Housing Living Edo street|34.7102|135.5114|
osaka|spa-world|Spa World|スパワールド 世界の大温泉|wellness|Shinsekai|2-4 ore|Controlla aree aperte, regole sui tatuaggi e separazione dei bagni|Grande complesso di bagni a tema, saune e piscine: più luna park termale che ritiro zen.|Spa World Osaka baths|34.6498|135.5058|
nara|national-museum|Nara National Museum|奈良国立博物館|museum|Nara Park|2 ore|Controlla mostra temporanea e chiusure delle gallerie|Una delle collezioni migliori per capire scultura buddhista, rituali e oggetti dei grandi templi di Nara.|Nara National Museum Buddhist art|34.6832|135.8361|
nara|visitor-center-workshop|Laboratori al Nara Visitor Center|奈良県猿沢イン|workshop|Sarusawa-ike|45-90 min|Controlla il programma giornaliero e arriva con anticipo|Calligrafia, origami, kimono e piccole attività culturali pensate per chi vuole fare, non soltanto fotografare.|Nara Visitor Center cultural workshop|34.6792|135.8309|
nara|wakakusa-hike|Salita al Monte Wakakusa|若草山|nature|Nara Park est|2-3 ore|Scarpe adatte, acqua e verifica accesso stagionale|Una salita breve ma vera sopra il parco, con prati aperti, cervi e vista sulla conca di Nara.|Mount Wakakusa hike Nara|34.6915|135.8548|
nara|harushika-sake|Degustazione Harushika|春鹿 酒蔵|food|Naramachi|45-75 min|Verifica orari, disponibilità e consumo responsabile|Assaggio guidato di sake prodotti a Nara, utile per confrontare secchezza, riso e acqua locale.|Harushika sake brewery Nara tasting|34.6741|135.8346|
nara|cycling|Nara in bicicletta|奈良サイクリング|sports|Naramachi e parco|2-4 ore|Noleggia solo con meteo buono e rispetta pedoni e cervi|Un modo rapido per collegare Naramachi, templi periferici e zone verdi senza trasformare ogni trasferimento in una marcia.|Nara cycling Naramachi|34.6812|135.8176|
miyajima|ropeway|Miyajima Ropeway e Shishiiwa|宮島ロープウエー|nature|Monte Misen|2-4 ore|Controlla vento, manutenzione e coda di ritorno|Due funivie portano verso Shishiiwa; resta comunque un tratto a piedi per i punti sacri e la vetta.|Miyajima Ropeway Shishiiwa Mount Misen|34.2924|132.3195|
miyajima|aquarium|Miyajima Public Aquarium|宮島水族館 みやじマリン|museum|Costa occidentale|1.5-2 ore|Buon piano con caldo o pioggia; verifica gli spettacoli|Acquario dedicato soprattutto agli ecosistemi del Mare Interno di Seto, tra ostriche, focene e vita costiera.|Miyajima Public Aquarium Seto Inland Sea|34.2959|132.3166|
miyajima|momiji-workshop|Laboratorio di momiji manju|もみじ饅頭手焼き体験|food|Omotesando|45-60 min|Controlla sessioni e prenotazione sul posto|Si cuoce il dolce a foglia d'acero negli stampi, capendo perché ripieno, temperatura e crosta cambiano tanto tra una bottega e l'altra.|Miyajima momiji manju workshop|34.2993|132.3212|
hiroshima|orizuru-tower|Orizuru Tower|おりづるタワー|museum|Parco della Pace|1-2 ore|Valuta luce e visibilità per la terrazza|Mostre, parete di gru di carta e una terrazza aperta che permette di leggere insieme delta, Memoriale e città ricostruita.|Orizuru Tower Hiroshima rooftop|34.3954|132.4521|
hiroshima|mazda-museum|Mazda Museum|マツダミュージアム|museum|Fuchu|2-3 ore|Tour su prenotazione; verifica lingua e accesso|Storia del marchio, motore rotativo, design e produzione automobilistica dentro il grande complesso industriale locale.|Mazda Museum Hiroshima rotary engine|34.3602|132.4961|
hiroshima|okosta|OKOSTA okonomiyaki cooking|オコスタ|food|Hiroshima Station|1.5-2 ore|Prenotazione consigliata e allergie da comunicare|Lezione pratica per costruire gli strati dell'okonomiyaki di Hiroshima e capire piastra, cavolo, noodle e salsa.|OKOSTA Hiroshima cooking experience|34.3969|132.4758|
hiroshima|peace-cycling|Peace Cycling Tour|ピースサイクリングツアー|sports|Parco della Pace e periferia|2-3 ore|Prenota una guida locale e controlla il meteo|Un percorso guidato collega memoriali centrali, ponti e storie nei quartieri meno immediati a piedi.|Hiroshima Peace Cycling Tour|34.3928|132.4529|
hiroshima|kyudo|Prova di kyudo|弓道体験|sports|Centro|1-2 ore|Attività guidata; abiti comodi e prenotazione necessaria|Introduzione all'arco giapponese, dove postura, respirazione e gesto contano almeno quanto colpire il bersaglio.|Hiroshima kyudo Japanese archery experience|34.4015|132.4566|
kyoto|manga-museum|Kyoto International Manga Museum|京都国際マンガミュージアム|museum|Karasuma Oike|2-3 ore|Controlla mostre e giorni di chiusura|Una ex scuola piena di scaffali consultabili, mostre sulla storia del manga e dimostrazioni legate al disegno narrativo.|Kyoto International Manga Museum|35.0119|135.7595|
kyoto|tea-ceremony|Cerimonia del tè a Higashiyama|茶道体験|workshop|Higashiyama|1-1.5 ore|Scegli gruppi piccoli e prenota la lingua desiderata|Un'introduzione pratica a utensili, gesti, dolce wagashi e matcha, evitando di ridurre tutto a una posa con la tazza.|Kyoto tea ceremony Higashiyama|34.9986|135.7795|
kyoto|yuzen-workshop|Laboratorio Kyo-yuzen|京友禅体験|workshop|Centro|1-2 ore|Verifica tecnica, oggetto finale e tempi di asciugatura|Colorazione a stencil o pennello su tessuto per capire registri, pigmenti e precisione dietro i motivi dei kimono.|Kyoto Kyo Yuzen dyeing workshop|35.0102|135.7526|
kyoto|fushimi-sake|Museo e degustazione del sake a Fushimi|伏見 酒蔵|food|Fushimi|2 ore|Controlla età, orari e sessioni di degustazione|Le acque di Fushimi e i magazzini lungo i canali spiegano perché il quartiere sia uno dei grandi centri del sake.|Fushimi sake brewery museum Kyoto|34.9297|135.7601|
kyoto|gion-corner|Spettacolo di arti tradizionali a Gion Corner|ギオンコーナー|show|Gion|1-1.5 ore|Verifica calendario e acquista il posto in anticipo|Una sequenza compatta di danza, musica, teatro e arti tradizionali utile come assaggio prima di approfondire ciò che interessa davvero.|Gion Corner Kyoto traditional performance|35.0007|135.7767|
kyoto|kiyomizu-pottery|Laboratorio di Kiyomizu-yaki|清水焼絵付け体験|workshop|Gojozaka|1-2 ore|Chiedi se il pezzo si ritira o viene spedito dopo la cottura|Decorazione o modellazione della ceramica nata attorno alle fornaci orientali di Kyoto.|Kyoto Kiyomizu yaki pottery workshop|34.9952|135.7802|
kanazawa|national-crafts-museum|National Crafts Museum|国立工芸館|museum|Kenrokuen|1.5-2 ore|Controlla la mostra in corso: la collezione ruota|Ceramica, lacca, tessili, metallo e design moderno letti come artigianato vivo, non come vetrina di soprammobili.|National Crafts Museum Kanazawa kogei|36.5588|136.6568|
kanazawa|gold-leaf-workshop|Laboratorio di foglia d'oro|金箔貼り体験|workshop|Higashi Chaya|1 ora|Prenotazione consigliata nei periodi affollati|Si applica una lamina sottilissima a bacchette, scatole o piccoli oggetti, scoprendo quanto poco serva per far sembrare regale anche un portapenne.|Kanazawa gold leaf workshop Higashi Chaya|36.5722|136.6664|
kanazawa|kaga-yuzen-workshop|Laboratorio Kaga-yuzen|加賀友禅体験|workshop|Hirosaka|1-1.5 ore|Controlla giorni di apertura e tipo di laboratorio|Stencil e colori Kaga su tessuto introducono una tradizione più naturalistica e sobria rispetto a molte decorazioni di Kyoto.|Kanazawa Kaga Yuzen dyeing workshop|36.5592|136.6599|
kanazawa|geisha-performance|Geisha evening a Kanazawa|金沢芸妓|show|Higashi Chaya|1-2 ore|Posti limitati; prenota tramite programma ufficiale o struttura affidabile|Danza, shamisen, canto e giochi da banchetto mostrano il lato performativo dei quartieri chaya oltre le facciate perfette.|Kanazawa geisha performance Higashi Chaya|36.5726|136.6662|
kanazawa|kutani-painting|Decorazione Kutani-yaki|九谷焼絵付け体験|workshop|Centro|1-2 ore|Verifica cottura, ritiro e spedizione del pezzo|Pittura su ceramica con palette vivaci e contorni decisi, ideale per riconoscere le differenze tra stili Kutani.|Kanazawa Kutani ware painting workshop|36.5608|136.6572|
shirakawago|local-guide|Passeggiata con guida locale|白川郷ガイドツアー|nature|Ogimachi|1.5-2 ore|Prenotazione consigliata; scegli una guida autorizzata|Una guida collega tetti, irrigazione, allevamento dei bachi e vita comunitaria, evitando che il villaggio resti una semplice cartolina con molte scale.|Shirakawago local guide walking tour|36.2574|136.9064|
shirakawago|no-yu|Shirakawago no Yu|白川郷の湯|wellness|Ogimachi|1-2 ore|Controlla accesso giornaliero e regole dei bagni|Onsen nel villaggio con vasche interne ed esterne affacciate sul fiume Shogawa.|Shirakawago no Yu onsen|36.2567|136.9054|
takayama|sake-brewery-tour|Tour e degustazione in sakagura|酒蔵見学|food|Sanmachi|45-75 min|Prenotazione richiesta; niente guida dopo l'assaggio|Visita a un birrificio per vedere riso, koji, fermentazione e poi confrontare più sake di Hida.|Hirata sake brewery Takayama tour|36.1435|137.2581|
takayama|showa-kan|Takayama Showa-kan|高山昭和館|museum|Città vecchia|1-1.5 ore|Buon piano con pioggia; controlla ultimo ingresso|Strade, negozi, sale giochi e oggetti ricostruiscono il Giappone quotidiano dell'era Showa con nostalgia molto fotogenica.|Takayama Showa kan museum|36.1426|137.2591|
matsumoto|city-art-museum|Matsumoto City Museum of Art|松本市美術館|museum|Centro|2 ore|Controlla mostra e chiusure; il cortile è già parte della visita|Museo legato a Yayoi Kusama e ad artisti locali, riconoscibile dalle grandi installazioni floreali esterne.|Matsumoto City Museum of Art Yayoi Kusama|36.2330|137.9762|
matsumoto|ukiyoe-museum|Japan Ukiyo-e Museum|日本浮世絵博物館|museum|Shimada|1.5-2 ore|Verifica giorni e collegamenti dalla stazione|Una collezione privata importante di stampe ukiyo-e, utile per distinguere matrice, tiratura, editore e conservazione.|Japan Ukiyo-e Museum Matsumoto|36.2308|137.9371|
matsumoto|ishii-miso|Tour di Ishii Miso|石井味噌|food|Centro est|1-1.5 ore|Verifica orari del tour e lingua disponibile|Botti di legno, lunga fermentazione e assaggi spiegano perché lo Shinshu miso abbia una presenza così netta nella cucina locale.|Ishii Miso brewery Matsumoto tour|36.2387|137.9791|
nagano|togakushi-ninja|Togakushi Ninja Museum e trick house|戸隠民俗館 忍法資料館|quirky|Togakushi|2-3 ore|Combina bus e sentiero; controlla apertura stagionale|Attrezzi storici, casa degli inganni e lancio di shuriken in un luogo che separa pratica reale e superpoteri da anime.|Togakushi Ninja Museum trick house|36.7655|138.0538|
nagano|prefectural-art|Nagano Prefectural Art Museum|長野県立美術館|museum|Zenko-ji|1.5-2 ore|Controlla mostre e terrazza panoramica|Arte moderna e opere di Kaii Higashiyama in un edificio aperto verso il paesaggio di Zenko-ji.|Nagano Prefectural Art Museum|36.6622|138.1908|
nagano|sake-station|Nomikurabe di sake Shinshu|信州地酒飲み比べ|food|Nagano Station|45-75 min|Bevi acqua, mangia qualcosa e non trasformarlo in una gara|Un confronto compatto tra etichette della prefettura, utile quando il tempo non permette di raggiungere più sakagura.|Nagano Station Shinshu sake tasting|36.6433|138.1881|
tokyo|teamlab-borderless|teamLab Borderless|チームラボボーダレス|theme|Azabudai Hills|2-3 ore|Biglietto a fascia; prenota e arriva puntuale|Ambienti digitali senza percorso fisso in cui le opere migrano tra le stanze e reagiscono al pubblico.|teamLab Borderless Azabudai Hills Tokyo|35.6602|139.7288|
tokyo|warner-bros-studio|Warner Bros. Studio Tour Tokyo|ワーナー ブラザース スタジオツアー東京|theme|Nerima|4-5 ore|Prenotazione obbligatoria e trasferimento da calcolare|Set, costumi ed effetti della saga di Harry Potter in un percorso enorme che non è un parco con giostre.|Warner Bros Studio Tour Tokyo Harry Potter|35.7508|139.6166|
tokyo|disneysea|Tokyo DisneySea|東京ディズニーシー|theme|Maihama|Giornata intera|Acquista ingresso ufficiale e studia pass e code nell'app|Parco Disney unico al mondo costruito attorno a porti immaginari, scenografia nautica e attrazioni molto curate.|Tokyo DisneySea Mediterranean Harbor|35.6267|139.8851|
tokyo|edo-open-air|Edo-Tokyo Open Air Architectural Museum|江戸東京たてもの園|museum|Koganei|3-4 ore|Prevedi trasferimento e controlla edifici aperti|Case, bagni, negozi e architetture trasferite raccontano come viveva la città prima dei grattacieli.|Edo Tokyo Open Air Architectural Museum|35.7158|139.5122|
tokyo|baseball-game|Partita di baseball al Tokyo Dome|東京ドーム 野球観戦|sports|Korakuen|3-4 ore|Controlla calendario e compra da canali ufficiali|Cori organizzati, bento, merchandising e ritmo della partita rendono lo stadio un piccolo manuale di cultura popolare.|Tokyo Dome baseball game Giants|35.7056|139.7519|
tokyo|karaoke|Karaoke in stanza privata|カラオケ|quirky|Shibuya o Shinjuku|1-3 ore|Controlla tariffa a persona, bevande e orario finale|Una stanza per il gruppo, catalogo infinito e nessun pubblico esterno: il luogo ideale per scoprire chi conosce inspiegabilmente tutte le sigle.|Japanese karaoke private room Tokyo|||
tokyo|kintsugi-workshop|Laboratorio di kintsugi|金継ぎ体験|workshop|Tokyo centrale|2-3 ore|Scegli un laboratorio che spieghi materiali, tempi e sicurezza|Introduzione alla riparazione decorativa della ceramica, distinguendo tecnica tradizionale e versioni rapide con resine moderne.|Tokyo kintsugi workshop||||
tokyo|street-kart|Street kart a Tokyo|公道カート|sports|Sede da verificare|1-2 ore|Solo con patente valida in Giappone, operatore assicurato e regole stradali chiare|Go-kart su strada pubblica: esperienza appariscente ma da valutare prima per legalità, assicurazione, traffico e impatto sui residenti.|Tokyo street kart driving|||driving
  `).map(function (item) {
    item.id = "experience-" + item.city + "-" + item.slug;
    item.type = "experience";
    item.lat = item.lat ? Number(item.lat) : null;
    item.lng = item.lng ? Number(item.lng) : null;
    attachSource(item, item.sourceKey);
    return item;
  });

  // Sport, movimento e parchi dove si corre: i parchi compaiono anche tra i
  // luoghi da visitare, ma qui rispondono a una domanda diversa.
  const sportAdditions = parseRows(`
osaka|castle-park-run|Giro di corsa al parco del castello|大阪城公園ランニング|sports|Osaka-jo koen|45-70 min|Percorso libero e gratuito: acqua dai distributori, spogliatoi solo a pagamento|L'anello attorno ai fossati del castello è il percorso urbano più usato della città: quasi quattro chilometri quasi tutti piani, con fondo regolare e il mastio che ricompare a ogni curva.|Osaka Castle Park running moat|34.6866|135.5261||outdoor
osaka|utsubo-park|Utsubo Park|靱公園|nature|Utsubo Honmachi|30-60 min|Campi da tennis su prenotazione comunale; il parco è sempre accessibile|Un rettangolo verde lungo due isolati tra uffici e caffè, con roseto, viali alberati e campi da tennis: il posto dove Osaka va a correre prima di lavorare.|Utsubo Park Osaka roses|34.6829|135.4919||outdoor
osaka|edion-arena-sumo|Sumo all'Edion Arena|エディオンアリーナ大阪|sports|Namba|3-5 ore|Il torneo si tiene una volta l'anno; biglietti da canali ufficiali, esauriscono presto|Il torneo di Osaka porta il sumo dentro un palazzetto cittadino: cerimonie lente, incontri di pochi secondi e un pubblico che conosce ogni lottatore per nome.|Osaka sumo tournament Edion Arena|34.6636|135.4986||indoor
nara|nara-park-walk|Camminata nel parco di Nara|奈良公園|nature|Nara Park|1-3 ore|Non date da mangiare ai cervi cibo non autorizzato e non correte verso di loro|Cinquecento ettari di prati, templi e cervi liberi: si attraversa a piedi collegando Todai-ji, Kasuga Taisha e Naramachi senza mai prendere un mezzo.|Nara Park deer lawns|34.6851|135.8430||outdoor
miyajima|misen-trail|Sentieri per il Monte Misen|弥山登山道|sports|Monte Misen|3-4 ore andata e ritorno|Tre percorsi di difficoltà diversa: scarpe vere, acqua e partenza al mattino|Salita di circa cinquecento metri di dislivello per sentieri lastricati e scalinate nel bosco, con santuari lungo la via e il Mare Interno che si apre in vetta.|Mount Misen hiking trail Miyajima|34.2795|132.3195||outdoor
hiroshima|carp-baseball|Baseball al Mazda Stadium|マツダスタジアム|sports|Minami-ku|3-4 ore|Stadio all'aperto: controlla meteo e calendario, i biglietti si esauriscono|Lo stadio dei Carp è il contrario del Tokyo Dome: cielo aperto, tifo organizzato per nove inning e birra portata a spalla lungo le gradinate.|Mazda Zoom-Zoom Stadium Hiroshima baseball|34.3915|132.4842||outdoor
hiroshima|shukkeien-walk|Passeggiata a Shukkei-en|縮景園|nature|Naka-ku|45-90 min|Giardino a pagamento, con orari stagionali|Un giardino da passeggio costruito in miniatura attorno a un laghetto: sentieri, ponti e scorci pensati per essere camminati lentamente e in ordine preciso.|Shukkeien garden Hiroshima pond|34.3985|132.4664||outdoor
kyoto|kamo-river-run|Corsa lungo il fiume Kamo|鴨川ランニング|sports|Rive del Kamo|40-90 min|Percorso libero, senza semafori: attenzione ai ciclisti nelle ore di punta|La pista sulle rive è il campo di allenamento di mezza Kyoto: chilometri continui tra ponti, aironi e coppie sedute a distanza regolare, con le montagne davanti.|Kamo River Kyoto running path|35.0116|135.7727||outdoor
kyoto|butokuden-budo|Arti marziali al Butokuden|武徳殿|sports|Okazaki|1-2 ore|Le sessioni aperte al pubblico sono rare: verifica il calendario prima|La sala di arti marziali costruita a fine Ottocento è ancora usata per allenamenti e dimostrazioni di kendo, judo e kyudo, sotto un tetto di legno che amplifica ogni passo.|Butokuden Kyoto martial arts hall|35.0166|135.7833||indoor
kyoto|hozugawa-boat|Discesa del fiume Hozu|保津川下り|sports|Kameoka verso Arashiyama|2 ore|Dipende dal livello dell'acqua: si cancella con le piene|Barche a fondo piatto scendono sedici chilometri di gole con barcaioli che spingono con la pertica; è una discesa turistica, ma le rapide e le rocce sono vere.|Hozugawa river boat ride Arashiyama|35.0094|135.5786||outdoor
kanazawa|utatsuyama-trail|Sentieri di Utatsuyama|卯辰山|nature|Utatsuyama|1.5-2.5 ore|Sentieri segnalati ma poco frequentati: meglio non salire da soli al tramonto|La collina a est della città alterna boschi, templi minori e terrazze panoramiche: il modo più rapido per uscire dal centro senza prendere un mezzo.|Utatsuyama hill Kanazawa viewpoint|36.5726|136.6712||outdoor
kanazawa|kenrokuen-walk|Kenroku-en all'apertura|兼六園|nature|Centro|1-1.5 ore|Ingresso gratuito nella prima fascia oraria in alcuni periodi: verifica|Uno dei tre grandi giardini del Giappone si percorre in anello tra stagni, lanterne di pietra e pini sorretti da funi: all'apertura è quasi vuoto.|Kenrokuen garden Kanazawa morning|36.5622|136.6626||outdoor
shirakawago|shiroyama-walk|Salita al belvedere di Shiroyama|城山展望台|sports|Sopra il villaggio|40-60 min andata e ritorno|Sentiero breve ma ripido; c'è anche una navetta con orari limitati|Venti minuti di salita nel bosco portano alla terrazza da cui il villaggio si vede intero, con i tetti di paglia allineati lungo la valle.|Shirakawa-go Shiroyama viewpoint|36.2611|136.9083||outdoor
takayama|higashiyama-course|Percorso Higashiyama|東山遊歩道|sports|Higashiyama|2-3 ore|Percorso urbano segnalato e gratuito, con qualche tratto in salita|Un itinerario segnato di circa tre chilometri e mezzo collega una dozzina di templi, un cimitero sul pendio e i resti del castello, uscendo dalla parte turistica della città.|Higashiyama walking course Takayama temples|36.1416|137.2617||outdoor
takayama|hida-cycling|Hida in bicicletta|飛騨サイクリング|sports|Valle di Hida|2-4 ore|Noleggio in stazione e in alcune locande: casco consigliato, strade strette|Fuori dal centro la valle diventa risaie, canali e case isolate: in bicicletta si copre in un pomeriggio quello che a piedi richiederebbe due giorni.|Hida Takayama countryside cycling|36.1465|137.2520||outdoor
matsumoto|kamikochi-hike|Camminata a Kamikochi|上高地|nature|Alpi Giapponesi|4-8 ore con trasferimento|Accessibile solo in bus, chiuso in inverno: controlla stagione e ultima corsa|Un altopiano a 1.500 metri tra il fiume Azusa e le pareti delle Alpi Giapponesi: percorsi pianeggianti lungo l'acqua limpida, senza bisogno di essere alpinisti.|Kamikochi Azusa river Japanese Alps|36.2500|137.6333||outdoor
matsumoto|alps-park|Alps Park|アルプス公園|nature|Colline a ovest|1.5-3 ore|Parco pubblico gratuito, raggiungibile in autobus o taxi|Un parco collinare con sentieri nel bosco, prati aperti e una vista frontale sulla catena alpina: il posto dove le famiglie di Matsumoto passano la domenica.|Matsumoto Alps Park mountain view|36.2444|137.9411||outdoor
nagano|mwave-skating|Pattinaggio alla M-Wave|エムウェーブ|sports|Periferia est|1.5-2 ore|Sessioni pubbliche solo in stagione: verifica calendario e noleggio pattini|L'ovale olimpico del 1998, con il tetto in legno di larice a forma di onda, apre l'anello di ghiaccio al pubblico: si pattina dove sono caduti record del mondo.|Nagano M-Wave Olympic speed skating|36.6430|138.2470||indoor
nagano|togakushi-trail|Sentieri di Togakushi|戸隠古道|nature|Togakushi|3-5 ore con trasferimento|Bus dalla stazione, ultima corsa presto: pianifica il ritorno prima di partire|Il viale di cedri secolari che porta al santuario superiore è solo l'inizio: attorno corrono sentieri tra paludi d'altura, boschi e pareti rocciose.|Togakushi cedar avenue shrine trail|36.7561|138.0742||outdoor
nagano|jigokudani-walk|Sentiero per Jigokudani|地獄谷遊歩道|sports|Yamanouchi|2-3 ore con trasferimento|Trenta minuti a piedi nel bosco per raggiungere le scimmie: scarpe chiuse|L'ultimo tratto verso le scimmie delle nevi si fa solo a piedi, su un sentiero forestale in leggera salita che segue la valle e il vapore delle sorgenti.|Jigokudani monkey park forest trail|36.7333|138.4633||outdoor
tokyo|imperial-palace-run|Anello del Palazzo Imperiale|皇居ランニング|sports|Chiyoda|35-60 min|Si corre in senso antiorario per convenzione: rispettala|Il circuito di cinque chilometri attorno ai fossati è la corsa più famosa del Giappone: nessun semaforo, fondo continuo e migliaia di persone all'ora di punta serale.|Imperial Palace running course Tokyo moat|35.6852|139.7528||outdoor
tokyo|yoyogi-park|Yoyogi Park|代々木公園|nature|Shibuya|1-2 ore|Parco pubblico gratuito e sempre aperto|Il grande prato accanto a Harajuku è dove Tokyo smette di essere verticale: corsa, cani, gruppi che ballano e picnic, a due minuti dalla folla di Takeshita.|Yoyogi Park Tokyo lawn|35.6720|139.6949||outdoor
tokyo|kokugikan-sumo|Sumo al Ryogoku Kokugikan|両国国技館|sports|Ryogoku|3-6 ore|Tre tornei l'anno a Tokyo: biglietti ufficiali, esauriscono in poche ore|Il tempio del sumo: un palazzetto costruito attorno al dohyo, dove si entra a metà pomeriggio e si resta fino agli incontri dei campioni, mangiando chanko.|Ryogoku Kokugikan sumo tournament|35.6970|139.7933||indoor
tokyo|komazawa-park|Komazawa Olympic Park|駒沢オリンピック公園|nature|Setagaya|1-2 ore|Percorsi separati per corsa e bicicletta: rispetta le corsie|Il parco costruito per le Olimpiadi del 1964 ha un anello di due chilometri con corsie divise, campi sportivi e la torre di controllo originale ancora in piedi.|Komazawa Olympic Park Tokyo running|35.6262|139.6620||outdoor
`).map(function (item) {
    item.id = "experience-" + item.city + "-" + item.slug;
    item.type = "experience";
    item.lat = item.lat ? Number(item.lat) : null;
    item.lng = item.lng ? Number(item.lng) : null;
    attachSource(item, item.sourceKey);
    return item;
  });

  const existingIds = new Set(data.experiences.map(function (item) { return item.id; }));
  additions.concat(sportAdditions).forEach(function (item) {
    if (!existingIds.has(item.id)) data.experiences.push(item);
  });

  data.experiences.forEach(function (item) {
    if (!item.setting) item.setting = settingOverrides[item.id] || settingByCategory[item.category] || "misto";
  });

  const pointOverrides = {
    "map-visit-hiroshima-museo-memoriale-della-pace": "place-hiroshima-peace-museum",
    "map-visit-kanazawa-d-t-suzuki-museum": "place-kanazawa-suzuki",
    "map-visit-shirakawago-gassho-zukuri-minka-en": "place-shirakawago-open-air",
    "map-visit-takayama-hida-no-sato-villaggio-popolare": "place-takayama-folk-village",
    "map-visit-matsumoto-matsumoto-city-museum-of-art": "experience-matsumoto-city-art-museum"
  };
  mapData.points.forEach(function (point) {
    if (pointOverrides[point.id]) point.guideId = pointOverrides[point.id];
  });

  function findMapPoint(item) {
    const itemName = normalize(item.name);
    return mapData.points.find(function (point) {
      if (point.city !== item.city || point.type !== "visit") return false;
      if (point.guideId === item.id) return true;
      const pointName = normalize(point.name);
      return pointName === itemName || (Math.min(pointName.length, itemName.length) >= 8 && (pointName.includes(itemName) || itemName.includes(pointName)));
    });
  }

  data.experiences.forEach(function (item) {
    const existing = findMapPoint(item);
    if (existing) {
      existing.guideId = item.id;
      return;
    }
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;
    mapData.points.push({
      id: "map-" + item.id,
      guideId: item.id,
      city: item.city,
      name: item.name,
      type: "visit",
      category: item.category === "museum" ? "museo" : "esperienza",
      group: "Attività",
      area: item.area,
      lat: item.lat,
      lng: item.lng,
      description: item.description
    });
  });
})();
