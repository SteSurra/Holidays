(function () {
  "use strict";
  function parse(text) {
    const fields = ["city","slug","name","jp","category","where","price","description","tip","imageQuery"];
    return text.trim().split("\n").filter(Boolean).map(function (line) {
      const values = line.split("|");
      return fields.reduce(function (item, field, index) { item[field] = values[index]; return item; }, {});
    });
  }
  const rows = parse(`
all|goshuincho|Goshuincho|御朱印帳|tradizione|Templi e santuari|€€|Album a fisarmonica per raccogliere calligrafie e sigilli durante il viaggio.|Compralo nel primo santuario e non usarlo come taccuino.|goshuincho Japan
all|omamori|Omamori|お守り|tradizione|Templi e santuari|€|Amuleti dedicati a salute, viaggio, studio o relazioni.|Non aprire il sacchetto; scegline uno legato al luogo.|omamori Japan
all|tenugui|Tenugui|手ぬぐい|tessili|Botteghe e musei|€|Telo di cotone stampato, leggero e versatile come asciugamano o decorazione.|I bordi non cuciti sono tradizionali.|tenugui Japan
all|furoshiki|Furoshiki|風呂敷|tessili|Department store|€€|Quadrato di stoffa per avvolgere oggetti e regali.|Chiedi una dimostrazione dei nodi.|furoshiki Japan
all|chopsticks|Bacchette artigianali|箸|casa|Botteghe di cucina|€-€€|Legno laccato, bambù o essenze locali: leggere e facili da portare.|Verifica lunghezza e lavaggio in lavastoviglie.|Japanese chopsticks craft
all|ceramics|Ceramica regionale|焼き物|casa|Mercati e botteghe|€€-€€€|Tazze yunomi, ciotole e piatti in stili diversi per ogni regione.|Cerca firma o timbro dell'atelier.|Japanese pottery shop
all|incense|Incenso giapponese|お香|benessere|Botteghe storiche|€€|Profumi raffinati di legni, erbe e fiori, spesso senza anima di bambù.|Scegli confezioni campione prima del formato grande.|Japanese incense
all|green-tea|Tè giapponese|日本茶|dispensa|Negozi di tè|€-€€€|Sencha, gyokuro, hojicha e matcha cambiano molto per raccolto e provenienza.|Chiedi temperatura e grammi per infusione.|Japanese green tea leaves
all|dashi|Dashi e katsuobushi|だし|dispensa|Mercati|€|Basi per brodo in buste, kombu e scaglie di bonito.|Controlla gli ingredienti se vuoi evitare additivi.|katsuobushi dashi Japan
all|furikake|Furikake|ふりかけ|dispensa|Supermercati|€|Condimento secco per riso in decine di gusti.|Ottimo souvenir economico; verifica ingredienti animali.|furikake Japan
all|stationery|Cartoleria giapponese|文房具|cartoleria|Loft, Hands e negozi specializzati|€-€€|Penne, quaderni e nastri washi progettati con grande precisione.|Prova le penne e visita i piani professionali.|Japanese stationery
all|hanko|Hanko personalizzato|判子|cartoleria|Negozi di timbri|€€|Timbro con nome traslitterato o simbolo personale.|È un souvenir, non un sigillo legale.|hanko stamp Japan
all|skincare|Skincare giapponese|スキンケア|beauty|Drugstore|€-€€|Detergenti, lozioni, creme solari e maschere in formati convenienti.|Confronta ingredienti e limita le scorte.|Japanese skincare drugstore
all|sunscreen|Protezione solare|日焼け止め|beauty|Drugstore|€|Formule leggere e trasparenti, pratiche nel clima umido.|Controlla resistenza ad acqua e volume.|Japanese sunscreen
all|nail-clippers|Tagliaunghie di precisione|爪切り|casa|Department store|€€|Acciaio ben affilato, leva solida e contenitore per i ritagli.|I modelli di Seki sono una scelta affidabile.|Japanese nail clipper Seki
all|kitchen-knife|Coltello giapponese|包丁|casa|Coltellerie specializzate|€€€|Santoku, gyuto o petty in acciai e finiture molto diverse.|Va nel bagaglio da stiva; dichiara uso e budget.|Japanese kitchen knife shop
all|gachapon|Gachapon|ガチャポン|pop|Sale giochi e stazioni|€|Miniature in capsula, dalle icone locali agli oggetti assurdi.|Fissa un piccolo budget: creano dipendenza.|gachapon Japan
all|eki-stamp|Eki stamp book|駅スタンプ帳|cartoleria|Stazioni|€|Taccuino per raccogliere gratuitamente i timbri delle stazioni.|Scegli carta non troppo sottile.|eki stamp Japan
all|hada-labo|Hada Labo Gokujyun|肌ラボ 極潤|beauty|Drugstore e Don Quijote|€|Lozione idratante giapponese dalla consistenza acquosa, disponibile in più livelli di ricchezza e anche in ricarica.|Controlla il nome completo e scegli la versione in base alla pelle, non al colore preferito della confezione.|Hada Labo Gokujyun lotion Japan
all|melano-cc|Melano CC Essence|メラノCC 美容液|beauty|Drugstore|€|Essenza cosmetica in tubetto molto diffusa in Giappone, pensata per una routine mirata e facile da dosare.|Verifica formula e ingredienti sull'etichetta; fai una prova su una piccola zona.|Melano CC essence Japan
all|rice-mask|Keana Nadeshiko Rice Mask|毛穴撫子 お米のマスク|beauty|Drugstore e Loft|€|Maschere viso in pacco multiplo riconoscibili dal volto illustrato e dal riferimento al riso.|Controlla il numero di fogli e la chiusura della busta prima di fare scorta.|Keana Nadeshiko rice mask
all|lululun|LuLuLun maschere regionali|旅するルルルン|beauty|Stazioni, aeroporti e negozi regionali|€-€€|Maschere in edizioni legate a regioni e ingredienti locali, spesso più interessanti delle versioni standard.|Scegli una variante della zona visitata e controlla sempre gli ingredienti.|LuLuLun regional face mask Japan
all|canmake-uv|Canmake Mermaid Skin Gel UV|マーメイドスキンジェルUV|beauty|Drugstore e variety store|€|Gel solare cosmetico leggero che può funzionare anche come base trucco, in varianti trasparenti o correttive.|Confronta numero, tonalità e finitura: confezioni simili fanno prodotti diversi.|Canmake Mermaid Skin Gel UV
all|canmake-cheek|Canmake Cream Cheek|クリームチーク|beauty|Drugstore e variety store|€|Blush compatto in crema, piccolo e disponibile in colori che cambiano spesso con collezioni limitate.|Prova la tonalità in negozio e cerca l'adesivo LIMITED senza inseguire ogni colore come un Pokémon.|Canmake Cream Cheek Japan
all|heroine-mascara|Heroine Make Mascara|ヒロインメイク マスカラ|beauty|Drugstore|€|Mascara giapponese noto per versioni molto resistenti e altre film, con modalità di rimozione differenti.|Compra anche il remover dedicato se scegli Super Waterproof e leggi bene la variante.|Heroine Make mascara Japan
all|uzu-liner|UZU Eye Opening Liner|UZU アイオープニングライナー|beauty|Loft, Plaza e department store|€€|Eyeliner liquido con pennello fine e gamma di colori spesso più ampia sul mercato giapponese.|Prova il tester su mano e confronta le edizioni stagionali senza confondere il colore del tappo.|UZU Eye Opening Liner Japan
all|fino-mask|Fino Premium Touch Hair Mask|フィーノ プレミアムタッチ|beauty|Drugstore|€|Maschera per capelli in barattolo rosso, popolare per il formato generoso e la texture ricca.|È pesante in valigia: valuta una confezione, non una succursale del drugstore.|Fino Premium Touch hair mask
all|tsubaki-mask|Tsubaki Premium Hair Mask|ツバキ プレミアムマスク|beauty|Drugstore|€|Trattamento capelli in barattolo rosso o dorato a seconda della linea, con profumo e consistenza intensi.|Non confonderlo con shampoo o conditioner della stessa famiglia.|Tsubaki Premium Repair hair mask
all|and-honey|&honey Hair Oil|アンドハニー ヘアオイル|beauty|Drugstore e Loft|€€|Olio per capelli in flaconi sfaccettati, con più linee per idratazione, controllo o lucentezza.|Scegli in base al tipo di capello e proteggi bene il dosatore nel bagaglio.|and honey hair oil Japan
all|softymo-oil|Kose Softymo Cleansing Oil|ソフティモ クレンジングオイル|beauty|Drugstore|€|Olio detergente economico venduto anche in ricarica, in versioni Speedy, Deep e White.|La ricarica pesa meno e riduce plastica, ma serve un contenitore adatto a casa.|Kose Softymo cleansing oil Japan
all|anessa|Anessa UV Milk|アネッサ パーフェクトUV|beauty|Drugstore e department store|€€|Solare giapponese in latte, riconoscibile dal flacone dorato; esistono formule e dimensioni diverse.|Leggi SPF, resistenza all'acqua e modalità d'uso; non scegliere solo perché luccica.|Anessa Perfect UV Sunscreen Skincare Milk Japan
all|yojiya-paper|Yojiya Aburatorigami|よーじや あぶらとり紙|beauty|Negozi Yojiya a Kyoto e principali stazioni|€|Cartine assorbenti sottili con l'iconico volto di Yojiya, facili da usare e regalare.|Compra nei punti ufficiali e scegli edizioni stagionali solo se il sovrapprezzo ti diverte davvero.|Yojiya aburatorigami Kyoto
all|kyoto-nails|Ueba Eso smalti Kyoto|胡粉ネイル|beauty|Botteghe beauty di Kyoto|€€|Smalti a base di pigmento gofun, con colori ispirati alla palette tradizionale giapponese.|Controlla tempi di asciugatura, resa e regole del bagaglio per i liquidi.|Ueba Eso Gofun nail polish Kyoto
all|refa-brush|ReFa Heart Brush edizioni locali|リファ ハートブラシ|beauty|Department store e negozi ufficiali|€€|Spazzola compatta a forma di cuore proposta in numerosi colori ed edizioni regalo giapponesi.|Confronta colori disponibili e prezzo ufficiale per evitare rivendite gonfiate.|ReFa Heart Brush Japan
all|shiseido-paper|Cartine Shiseido|資生堂 あぶらとり紙|beauty|Drugstore e department store|€|Cartine opacizzanti compatte, un acquisto piccolo e molto giapponese per la cura dei dettagli.|Verifica quantità e formato; sono un souvenir utile, non un trattamento miracoloso.|Shiseido oil blotting paper Japan
all|japan-tankobon|Tankōbon in giapponese con obi|単行本 帯付き|manga|Librerie, Book Off e Mandarake|€|Volumi manga nell'edizione originale, spesso con sovraccoperta e fascetta obi promozionale.|Per collezione controlla obi, prima edizione, ingiallimento e presenza di inserti.|Japanese manga tankobon obi
all|manga-magazine|Rivista manga settimanale|週刊漫画雑誌|manga|Konbini e librerie|€|Numeri correnti di riviste come Weekly Shonen Jump: grandi, su carta leggera e legati al momento del viaggio.|Scegli un numero con copertina memorabile; sono voluminosi e non nati per sopravvivere a uno zaino ostile.|Weekly Shonen Jump magazine Japan
all|manga-artbook|Artbook ufficiale manga|公式画集|manga|Librerie grandi e Animate|€€-€€€|Raccolte illustrate ufficiali con tavole a colori, studi e talvolta interviste non tradotte.|Controlla editore, ISBN e contenuti per distinguere artbook da guide economiche o prodotti non ufficiali.|Japanese manga official art book
all|animation-layouts|Raccolte di layout e key animation|原画集|manga|Animate, musei e negozi di studi|€€-€€€|Libri tecnici con disegni di produzione, storyboard e key frame, spesso legati a mostre temporanee.|Cerca il logo dello studio o del comitato di produzione e verifica se è una ristampa.|Japanese anime key animation art book
all|clear-files|Clear file illustrati|クリアファイル|manga|Animate, musei, convenience store|€|Cartelline trasparenti A4 con illustrazioni esclusive di eventi, campagne e serie.|Sono economiche ma si moltiplicano: usa una cartellina rigida per riportarle intere.|anime clear file Japan
all|acrylic-stands|Acrylic stand|アクリルスタンド|manga|Animate, Jump Shop e negozi ufficiali|€-€€|Sagome acriliche da esposizione, spesso vendute in serie o blind box e molto comuni nel merchandising giapponese.|Controlla licenza, pellicola protettiva e contenuto casuale prima di pagare.|anime acrylic stand Japan
all|animate-bonus|Edizioni con bonus Animate|アニメイト特典|manga|Animate|€-€€|Manga, CD e home video con cartoline, illustrazioni o altri bonus legati alla catena e al periodo di uscita.|Chiedi se il tokuten è ancora disponibile: la copertina da sola non garantisce il bonus.|Animate exclusive bonus Japan manga
all|jump-shop|Merchandise Jump Shop|ジャンプショップ|manga|Jump Shop ufficiali|€-€€|Oggetti ufficiali delle serie Shueisha, inclusi articoli stagionali e legati a copertine o anniversari.|Confronta il marchio ufficiale e accetta che il personaggio preferito possa essere esaurito.|Jump Shop merchandise Japan
all|ichiban-kuji|Premi Ichiban Kuji|一番くじ|manga|Konbini e official shop|€-€€€|Lotteria senza biglietti perdenti con premi fisici di livelli diversi, da figure a piccoli gadget.|Controlla i premi rimasti prima di giocare e stabilisci un limite: la matematica non prova affetto.|Ichiban Kuji prizes Japan
all|manga-drawing-tools|Retini, pennini e carta manga|漫画画材|manga|Sekaido, Tools e cartolerie professionali|€-€€|Materiali usati per disegno manga tradizionale: G-pen, maru-pen, retini, righelli e carta graduata.|Verifica compatibilità dei pennini e scegli pochi strumenti da provare invece di comprare uno studio intero.|Japanese manga drawing tools G pen screentone
all|pokemon-center|Pokémon Center original goods|ポケモンセンター オリジナル|gaming|Pokémon Center|€-€€|Peluche, cancelleria, accessori e collezioni stagionali prodotti per i negozi ufficiali giapponesi.|Cerca etichetta Pokémon Center Original e controlla i limiti per articolo.|Pokemon Center Japan original merchandise
all|nintendo-store|Nintendo Store original goods|Nintendo TOKYO OSAKA KYOTO|gaming|Nintendo TOKYO, OSAKA e KYOTO|€-€€|Merchandise ufficiale di Mario, Zelda, Animal Crossing, Pikmin e altre serie, con linee dedicate agli store.|Visita lo store della città già in itinerario e verifica eventuale accesso a fascia oraria.|Nintendo Tokyo store merchandise
all|ghibli-goods|Donguri Kyōwakoku Ghibli goods|どんぐり共和国|gaming|Negozi Donguri Kyōwakoku|€-€€€|Oggetti ufficiali Studio Ghibli, dalle piccole figure alle stoviglie e ai tessili.|Guarda marchio e produttore; Totoro non rende automaticamente ufficiale una teiera.|Donguri Republic Studio Ghibli goods
all|chiikawa-land|Chiikawa Land goods|ちいかわらんど|gaming|Chiikawa Land e pop-up ufficiali|€-€€|Peluche, piccoli accessori e articoli stagionali del fenomeno Chiikawa, spesso con uscite molto rapide.|Controlla comunicazioni dello store e limiti di acquisto; le code sono parte non dichiarata del prodotto.|Chiikawa Land Japan merchandise
all|sanrio-limited|Sanrio Japan limited goods|サンリオ 限定グッズ|gaming|Sanrio World, Gift Gate e department store|€-€€|Colori, collaborazioni e personaggi secondari che nel mercato italiano arrivano raramente o più tardi.|Controlla l'etichetta e scegli collaborazioni realmente legate al Giappone.|Sanrio Japan limited merchandise
all|gashapon-premium|Gashapon premium e miniature|プレミアムガシャポン|gaming|Gashapon Department Store|€-€€|Capsule più grandi con miniature, oggetti funzionali e riproduzioni assurde ma sorprendentemente accurate.|Guarda l'intera serie sul display e trova prima una macchina cambiamonete.|Premium Gashapon Japan
all|gunpla|Gunpla Japan editions|ガンプラ|gaming|Gundam Base e negozi hobby|€-€€€|Model kit Gundam, incluse colorazioni, clear version e articoli legati ai punti ufficiali.|Controlla grado, dimensione della scatola e disponibilità reale; la valigia non è un hangar.|Gunpla Gundam Base limited Japan
all|retro-games|Videogiochi e console usati giapponesi|レトロゲーム|gaming|Akihabara, Nipponbashi e Hard Off|€-€€€|Cartucce, dischi, manuali e hardware del mercato giapponese, spesso con cataloghi molto più profondi.|Verifica regione, lingua, alimentazione, batteria, stato e compatibilità prima dell'acquisto.|Japanese retro video games shop
all|tamagotchi|Tamagotchi edizioni giapponesi|たまごっち|gaming|Toy store, Bic Camera e Bandai shop|€-€€|Modelli, colori e collaborazioni che compaiono prima o solo sul mercato domestico.|Controlla lingua, batterie e funzioni online; il nuovo coinquilino digitale avrà esigenze precise.|Tamagotchi Japan edition
all|reon-pocket|Sony REON POCKET|レオンポケット|tecnologia|Sony Store e grandi catene elettroniche|€€€|Dispositivo termico indossabile che raffredda o riscalda la superficie del corpo a contatto.|Verifica modello, app disponibile sul tuo telefono, accessori, garanzia e istruzioni prima di acquistare.|Sony REON POCKET Japan
all|pomera|King Jim Pomera|ポメラ|tecnologia|Yodobashi, Bic Camera e cartolerie tech|€€€€|Dispositivo compatto dedicato alla scrittura, con tastiera e ambiente volutamente privo delle distrazioni di un laptop.|Controlla layout giapponese, metodi di esportazione e supporto caratteri italiani.|King Jim Pomera DM250
all|tepra|King Jim TEPRA|テプラ|tecnologia|Cartolerie e negozi elettronici|€€-€€€|Etichettatrice molto radicata negli uffici e nelle case giapponesi, con nastri, caratteri e formati particolari.|Verifica app, alimentazione e disponibilità futura dei nastri compatibili in Italia.|King Jim TEPRA label printer Japan
all|exword|Casio EX-word|電子辞書 エクスワード|tecnologia|Yodobashi e Bic Camera|€€€|Dizionario elettronico autonomo con modelli per lingue, studio e discipline specialistiche.|Controlla dizionari inclusi, lingua dell'interfaccia, tastiera e possibilità di aggiungere contenuti.|Casio EX-word electronic dictionary
all|hhkb-jis|HHKB layout giapponese|HHKB 日本語配列|tecnologia|PFU Direct e negozi PC specializzati|€€€€|Tastiera compatta elettrocapacitiva in variante JIS, con disposizione e tasti diversi dalle versioni europee.|Provala davvero: layout, rimappatura e garanzia contano più dell'aura da programmatore illuminato.|HHKB Japanese layout keyboard
all|realforce-jis|REALFORCE JIS|リアルフォース 日本語配列|tecnologia|Negozi PC e department elettronici|€€€€|Tastiera elettrocapacitiva Topre in layout giapponese, disponibile in pesi e configurazioni peculiari.|Controlla layout, forza dei tasti, connessione e supporto software.|Realforce Japanese keyboard JIS
all|jdm-watch|Orologi JDM Casio, Seiko e Citizen|国内モデル 腕時計|tecnologia|Yodobashi, Bic Camera e negozi di orologi|€€-€€€€|Referenze destinate al mercato domestico, incluse colorazioni, quadranti o funzioni non distribuite normalmente in Italia.|Confronta codice modello esatto, garanzia internazionale e ricezione radio o app in Europa.|Japan domestic market watch Casio Seiko Citizen
all|used-camera|Fotocamere e obiettivi usati|中古カメラ|tecnologia|Map Camera, Kitamura e negozi specializzati|€€-€€€€|Usato fotografico spesso classificato con grande precisione e ampia scelta di modelli giapponesi.|Prova sensore, ghiere e autofocus; verifica lingua menu, garanzia e tasse al rientro.|used camera shop Japan lens
all|japan-earphones|Auricolari e cuffie Japan edition|日本限定 イヤホン|tecnologia|e-earphone e catene elettroniche|€€-€€€€|Marchi audio giapponesi e colorazioni o accordature vendute soprattutto sul mercato locale.|Ascolta prima, controlla connettori, codec, garanzia e disponibilità di ricambi.|Japanese earphones e-earphone Tokyo
all|nanoe-dryer|Asciugacapelli Nanoe giapponese|ナノケア ドライヤー|tecnologia|Catene elettroniche|€€€-€€€€|Asciugacapelli beauty-tech con varianti domestiche molto note in Giappone.|Molti modelli sono 100 V: compra solo una versione compatibile con 220-240 V e spina europea o lascialo sullo scaffale.|Panasonic Nanoe hair dryer Japan
all|japanese-calculator|Calcolatrice premium giapponese|高級電卓|tecnologia|Loft, Itoya e negozi elettronici|€€-€€€|Calcolatrici Casio, Canon o Sharp curate in tastiera, stabilità e finiture, talvolta in serie speciali.|Controlla layout di virgola, percentuali e modalità fiscale prima di innamorarti dell'alluminio.|Japanese premium calculator
all|electronic-memo|Boogie Board e memo elettronici|電子メモ|tecnologia|Loft, Hands e catene elettroniche|€-€€|Tavolette per appunti veloci e memo LCD in formati insoliti, molto presenti nella cultura da scrivania giapponese.|Verifica se il contenuto si salva davvero o scompare con un solo pulsante.|Japanese electronic memo pad
all|usb-gadgets|Mini gadget USB giapponesi|USB ガジェット|tecnologia|Yodobashi, Bic Camera e Thanko|€-€€|Ventole, scaldatazze, accessori da scrivania e invenzioni molto specifiche che raramente arrivano nei negozi italiani.|Controlla tensione, potenza, certificazioni e utilità dopo l'effetto sorpresa.|Japanese USB gadgets Thanko
all|hobonichi|Hobonichi Techo|ほぼ日手帳|cartoleria|Tobichi, Loft e cartolerie selezionate|€€-€€€|Planner annuale in formati A6, A5 e Weeks, con carta sottile e copertine collaborative che cambiano ogni anno.|Scegli formato e lingua prima della cover; a Tobichi cerca i bonus del negozio ufficiale.|Hobonichi Techo planner Japan
all|travelers-tokyo|TRAVELER'S notebook Tokyo Edition|トラベラーズノート TOKYO EDITION|cartoleria|Traveler's Factory e cartolerie selezionate|€€-€€€|Taccuino modulare in pelle con grafica dedicata a Tokyo e refill coordinati.|Controlla formato regular o passport e compra solo i refill che userai davvero.|Travelers notebook Tokyo Edition
all|kuru-toga|Uni Kuru Toga|クルトガ|cartoleria|Itoya, Loft e Hands|€-€€€|Portamine con meccanismo che ruota la mina, proposto in molte fasce e frequenti colori limitati.|Prova impugnatura e diametro mina; Dive è raro e non giustifica qualsiasi prezzo da rivenditore.|Uni Kuru Toga Japan mechanical pencil
all|jetstream-limited|Jetstream edizioni limitate|ジェットストリーム 限定|cartoleria|Loft, Hands e cartolerie|€-€€|Penne a sfera a bassa viscosità con corpi multicolore, collaborazioni ed edizioni stagionali giapponesi.|Verifica tipo e ricambio della cartuccia: il corpo bello deve continuare a scrivere.|Uni Jetstream limited edition Japan
all|frixion-colors|Pilot FriXion colori giapponesi|フリクション|cartoleria|Cartolerie e convenience store|€|Penne cancellabili disponibili in punte, set e colori più ampi rispetto alla normale scelta italiana.|Non usarle per firme o documenti importanti e non lasciare gli appunti al caldo.|Pilot Frixion Japan colors
all|sailor-ink|Inchiostri Sailor regionali|セーラー ご当地インク|cartoleria|Cartolerie specializzate|€€|Inchiostri per stilografica nati con negozi e palette locali, spesso difficili da comprare fuori dal Giappone.|Annota nome e negozio, controlla che il flacone sia sigillato e mettilo in doppio sacchetto.|Sailor regional fountain pen ink Japan
all|mt-washi|mt masking tape locale|mt 限定マスキングテープ|cartoleria|Musei, eventi e cartolerie|€|Nastri washi in pattern regionali, collaborazioni ed edizioni create per negozi o mostre.|Piccoli e pericolosamente collezionabili: stabilisci una palette prima del collasso morale.|mt limited masking tape Japan
all|kokuyo-campus|Kokuyo Campus edizioni Japan|キャンパスノート 限定|cartoleria|Loft, Hands e cartolerie|€|Quaderni, loose leaf e raccoglitori con rigature e sistemi molto più vari del catalogo italiano.|Controlla formato e numero di fori per trovare ricambi compatibili.|Kokuyo Campus notebook Japan limited
all|midori-clips|Midori strumenti da taccuino|ミドリ 文具|cartoleria|Loft, Hands e cartolerie|€-€€|Righelli pieghevoli, clip, timbri rotanti e accessori compatti con soluzioni meccaniche intelligenti.|Prova il meccanismo e chiediti se risolve davvero un problema o ne crea uno adorabile.|Midori stationery Japan ruler stamp
all|porter-yoshida|Borse Porter Yoshida|ポーター 吉田カバン|moda|Porter flagship e department store|€€€-€€€€|Borse e accessori prodotti da Yoshida & Co., con linee e colori spesso più ampi in Giappone.|Controlla etichetta, cuciture, codice linea e misure per il bagaglio a mano.|Porter Yoshida bag Japan
all|sousou|SOU・SOU tessili Kyoto|SOU・SOU|moda|Negozi SOU・SOU a Kyoto|€€-€€€|Abiti, tabi, borse e tessili contemporanei costruiti su motivi e forme giapponesi.|Prova le taglie e scegli un pezzo davvero portabile, non un costume per il prossimo martedì.|SOU SOU Kyoto clothing
all|tabi-socks|Calze tabi|足袋ソックス|moda|Department store, Don Quijote e botteghe|€|Calze con alluce separato, in fantasie tradizionali, sportive o totalmente deliranti.|Controlla misura e composizione; sono un regalo facile e occupano quasi zero valigia.|Japanese tabi socks
all|japanese-denim|Denim selvedge giapponese|セルビッジデニム|moda|Tokyo, Osaka e negozi denim specializzati|€€€-€€€€|Jeans in tessuti cimosati giapponesi, spesso non sanforizzati e proposti da marchi domestici.|Chiedi shrinkage, peso in once, lavaggio e orlo a catenella prima di scegliere la taglia.|Japanese selvedge denim jeans
all|vintage-haori|Haori e kimono vintage|古着羽織|moda|Mercatini, Kyoto e negozi vintage|€€-€€€|Giacche haori e tessili d'epoca più facili da riutilizzare nella vita quotidiana rispetto a un kimono completo.|Controlla macchie, odore, cuciture e materiale; evita di comprare solo perché costa poco.|vintage haori kimono Japan
all|japanese-sneakers|Sneaker colorazioni Japan|日本限定スニーカー|moda|Flagship di Tokyo e Osaka|€€-€€€|Colorazioni, collaborazioni o modelli distribuiti prima e più ampiamente in Giappone.|Confronta il codice articolo con il catalogo europeo e prova la taglia in centimetri.|Japan exclusive sneakers
all|indigo-sashiko|Accessori sashiko e boro|刺し子・襤褸|moda|Botteghe tessili e mercati artigiani|€€-€€€|Borse, panni e abiti che usano cuciture sashiko o estetica boro, da distinguere tra lavoro autentico e stampa imitativa.|Guarda retro, cuciture e provenienza; una stampa blu non diventa secolare per entusiasmo.|Japanese sashiko boro textile
all|shichimi|Yawataya Isogoro shichimi|八幡屋礒五郎 七味|dispensa|Nagano e grandi department store|€|Miscela di sette spezie in lattine illustrate, con varianti locali e possibilità di personalizzazione.|Controlla piccantezza e ingredienti; la lattina classica è già un ottimo souvenir.|Yawataya Isogoro shichimi Nagano
all|sansho|Sansho giapponese|山椒|dispensa|Mercati, Kyoto e department store|€-€€|Pepe giapponese agrumato e leggermente anestetico, venduto in polvere, grani o miscele.|Compra confezioni piccole e recenti: l'aroma svanisce prima della vostra determinazione a cucinare.|Japanese sansho pepper
all|yuzu-kosho|Yuzu kosho|柚子胡椒|dispensa|Supermercati e mercati|€|Pasta intensa di agrume yuzu, peperoncino e sale, utile in quantità minuscole.|Preferisci tubetti o vasetti sigillati e proteggili bene nel bagaglio.|Yuzu kosho Japan jar
all|regional-kitkat|KitKat regionali|ご当地キットカット|dispensa|Stazioni, aeroporti e souvenir shop|€-€€|Gusti stagionali o regionali pensati per il mercato dei regali giapponese, dal matcha a ingredienti locali.|Controlla la regione e il periodo: alcuni gusti sono nazionali con una confezione molto convincente.|Japanese regional KitKat flavors
all|premium-nori|Nori di qualità|高級海苔|dispensa|Negozi specializzati e department store|€€|Fogli di alga con differenze evidenti di profumo, spessore e croccantezza rispetto ai prodotti base.|Scegli confezioni ermetiche e chiedi se è yaki nori, ajitsuke o per onigiri.|Japanese premium nori shop
all|ume-products|Umeboshi e prodotti alla ume|梅干し|dispensa|Department store e mercati|€-€€|Prugne ume conservate in livelli diversi di sale e dolcezza, oltre a paste e condimenti.|Assaggia quando possibile e scegli confezioni sigillate non troppo liquide.|Japanese umeboshi shop
all|kaikado-caddy|Chazutsu Kaikado|開化堂 茶筒|casa|Kaikado Kyoto e rivenditori selezionati|€€€-€€€€|Contenitore da tè in metallo lavorato con grande precisione, destinato a sviluppare patina con l'uso.|Prova la chiusura, scegli materiale e dimensione, poi proteggilo dagli urti.|Kaikado tea caddy Kyoto
all|shoyeido-incense|Incenso Shoyeido|松栄堂 お香|benessere|Negozi Shoyeido a Kyoto e Tokyo|€-€€€|Linee di incenso e miscele per koh-do con profili dal delicato al profondamente legnoso.|Inizia da un assortimento e verifica se servono supporto o bruciatore specifici.|Shoyeido incense Kyoto
osaka|naniwa-tinware|Naniwa suzuki|浪華錫器|artigianato|Botteghe artigiane di Osaka|€€€|Bicchieri e piccoli oggetti in peltro lavorato, legati alla tradizione metallurgica locale.|Controlla produttore, peso e istruzioni di pulizia.|Naniwa tinware Osaka
nara|nara-ink|Inchiostro sumi di Nara|奈良墨|cartoleria|Naramachi e negozi di calligrafia|€€-€€€|Bastoncini d'inchiostro solidi prodotti con fuliggine e colle, spesso decorati e profumati.|Chiedi se è pensato per uso, collezione o regalo e abbinalo a una pietra adeguata.|Nara sumi ink stick
nara|akahada-yaki|Akahada-yaki|赤膚焼|casa|Nara e botteghe della prefettura|€€-€€€|Ceramica locale dai toni caldi, spesso decorata con motivi narrativi legati a Nara.|Cerca firma del forno e confronta pezzi d'uso con quelli puramente ornamentali.|Akahada pottery Nara
hiroshima|tulip-needles|Aghi Tulip di Hiroshima|チューリップ針|artigianato|Mercerie e department store|€-€€|Aghi da cucito, ricamo e crochet prodotti nella prefettura, apprezzati per finitura e varietà.|Scegli il set per la tecnica corretta: l'ago perfetto per sashiko non è universale.|Tulip Hiroshima needles
kyoto|kyoto-stationery|Cartoleria artigianale di Kyoto|京文具|cartoleria|Kyukyodo, TAG e piccole botteghe|€-€€|Carta, buste, timbri e inchiostri con palette e motivi di Kyoto, spesso in serie stagionali.|Preferisci un oggetto legato a una bottega precisa invece di un generico motivo di geisha.|Kyoto traditional stationery shop
kanazawa|kaga-mizubiki-jewelry|Gioielli in Kaga mizuhiki|加賀水引アクセサリー|moda|Kanazawa centro e Higashi Chaya|€€|Orecchini, spille e fermagli costruiti con cordoncini di carta annodati.|Controlla finitura, protezione dall'acqua e provenienza dell'atelier.|Kaga mizuhiki jewelry Kanazawa
takayama|hida-wood-small|Piccoli oggetti in legno di Hida|飛騨木工|casa|Takayama e botteghe di falegnameria|€€-€€€|Vassoi, posate, scatole e accessori che portano in valigia la cultura del mobile di Hida senza portare il mobile.|Osserva incastri, levigatura e specie del legno; evita souvenir con provenienza vaga.|Hida wood craft Takayama
matsumoto|matsumoto-broom|Scope Matsumoto e oggetti mingei|松本民芸生活道具|casa|Nakamachi e negozi mingei|€€|Utensili domestici in fibre, legno e bambù scelti per uso quotidiano e bellezza funzionale.|Chiedi materiale e manutenzione; una piccola spazzola è più sensata di una scopa intera in treno.|Matsumoto mingei household craft
tokyo|japanese-vinyl|Vinili giapponesi con obi|帯付きレコード|arte|Shinjuku, Shibuya e Jimbocho|€€-€€€€|Pressaggi giapponesi apprezzati per confezione, inserti e fascetta obi, inclusi generi locali difficili da trovare in Italia.|Controlla disco, matrice, inserti e obi; Japanese pressing non significa automaticamente suono migliore.|Japanese vinyl record obi Tokyo
tokyo|kappabashi-tools|Utensili professionali Kappabashi|かっぱ橋道具|casa|Kappabashi|€-€€€|Stampi, grattugie, pentole, coltelli e utensili estremamente specifici per cucine domestiche e professionali.|Compra ciò che sai nominare e usare; il misterioso attrezzo perfetto diventa presto un fermacarte.|Kappabashi kitchen tools Tokyo
tokyo|edo-kiriko|Vetro Edo Kiriko|江戸切子|artigianato|Asakusa e Sumida|€€€|Vetro colorato inciso a mano con motivi geometrici in trasparenza.|Cerca il marchio Edo Kiriko.|Edo Kiriko glass
tokyo|ukiyoe|Stampa ukiyo-e|浮世絵|arte|Jimbocho e musei|€€-€€€|Originali, ristampe da matrice e riproduzioni hanno valori molto diversi.|Chiedi chiaramente epoca e tecnica.|ukiyoe print shop Tokyo
tokyo|anime|Merchandise anime e manga|アニメグッズ|pop|Akihabara, Ikebukuro, Nakano|€-€€€|Figure, artbook, cel e usato da collezione.|Controlla Mandarake e gli scaffali second-hand.|Akihabara anime figures
tokyo|vintage|Moda vintage giapponese|古着|moda|Shimokitazawa e Koenji|€€-€€€|Workwear, designer locali e pezzi d'archivio molto selezionati.|Guarda anche i negozi fuori dalla via principale.|Shimokitazawa vintage clothing
tokyo|food-samples|Cibo finto sampuru|食品サンプル|artigianato|Kappabashi|€-€€€|Riproduzioni iperrealistiche in resina usate dai ristoranti.|Portachiavi facili da portare; pezzi grandi fragili.|Japanese food samples Kappabashi
kamakura|kamakura-bori|Kamakura-bori|鎌倉彫|artigianato|Komachi e Hase|€€€|Legno intagliato e laccato con rilievi profondi.|Un piccolo vassoio è più gestibile.|Kamakura bori lacquerware
kamakura|shonan-glass|Vetro Shonan|湘南ガラス|artigianato|Botteghe costiere|€€|Piccoli oggetti in vetro ispirati al mare e alla luce della costa.|Preferisci studi che indicano produzione locale.|Shonan glass craft
hakone|yosegi|Hakone yosegi-zaiku|箱根寄木細工|artigianato|Hakone e Odawara|€€-€€€|Mosaico di essenze naturali per scatole segrete e vassoi.|Cerca la certificazione e prova le himitsu-bako.|Hakone yosegi zaiku
hakone|onsen-cosmetics|Cosmetici da onsen|温泉コスメ|benessere|Ryokan e negozi|€-€€|Sali, saponi e creme ispirati alle acque termali.|Leggi l'etichetta: non tutto contiene acqua termale.|Hakone onsen cosmetics
matsumoto|mingei|Oggetti Matsumoto Mingei|松本民芸|artigianato|Nakamachi|€€-€€€|Legno scuro, incastri e design del movimento mingei.|Cerca vassoi e piccoli oggetti da tavola.|Matsumoto mingei craft
matsumoto|temari|Matsumoto temari|松本てまり|tessili|Musei e botteghe|€€|Sfere ricamate a mano con motivi geometrici colorati.|Guarda regolarità del ricamo e provenienza.|Matsumoto temari
nagano|apple-products|Prodotti alla mela Shinshu|信州りんご|dispensa|Stazioni e mercati|€-€€|Succo, sidro, confetture e dolci dalle mele locali.|Bottiglie piccole o lattine sono più pratiche.|Nagano apple products
nagano|togakushi-bamboo|Bambù di Togakushi|戸隠竹細工|artigianato|Togakushi|€€|Cesti e scolapasta per soba intrecciati in bambù locale.|I piccoli zaru sono utili anche in cucina.|Togakushi bamboo craft
nagano|shinshu-miso|Miso Shinshu|信州味噌|dispensa|Produttori e mercati|€|Miso di riso equilibrato in confezioni sottovuoto.|Mettilo in doppio sacchetto in stiva.|Shinshu miso shop
kanazawa|gold-leaf|Foglia d'oro di Kanazawa|金沢金箔|artigianato|Higashi Chaya|€€-€€€|Accessori e oggetti decorati nella capitale giapponese della foglia d'oro.|Preferisci applicazioni artigianali a gadget generici.|Kanazawa gold leaf craft
kanazawa|kaga-yuzen|Kaga Yuzen|加賀友禅|tessili|Botteghe specializzate|€€€|Tintura su seta con colori realistici e sfumature caratteristiche.|Foulard e accessori sono più accessibili dei kimono.|Kaga Yuzen
kanazawa|kutani|Ceramica Kutani|九谷焼|casa|Kanazawa e Kaga|€€-€€€|Porcellana dai colori saturi verde, giallo, viola, blu e rosso.|Confronta tradizione e studi contemporanei.|Kutani pottery
kanazawa|mizuhiki|Mizuhiki di Kaga|加賀水引|artigianato|Centro|€€|Cordoncini di carta annodati in forme simboliche e gioielli.|Un piccolo accessorio viaggia bene.|Kaga mizuhiki
shirakawago|sarubobo|Sarubobo|さるぼぼ|tradizione|Botteghe del villaggio|€|Bambolina senza volto, amuleto di Hida per famiglia e buona sorte.|I colori moderni hanno significati diversi.|sarubobo doll
shirakawago|gassho-craft|Miniatura gassho-zukuri|合掌造り模型|artigianato|Ogimachi|€-€€|Piccole case in legno o carta con tetti a mani giunte.|Cerca produzione locale, non plastica industriale.|gassho zukuri miniature
takayama|ichii-itto|Ichii itto-bori|一位一刀彫|artigianato|Sanmachi|€€-€€€|Sculture in tasso lasciate naturali per mostrare venature e patina.|Piccoli animali o netsuke sono facili da trasportare.|Ichii itto bori Takayama
takayama|hida-shunkei|Hida Shunkei|飛騨春慶|casa|Sanmachi|€€-€€€|Legno laccato trasparente color ambra, leggero e luminoso.|Vassoi e scatole mostrano bene le venature.|Hida Shunkei lacquerware
takayama|local-sake|Sake di Hida|飛騨の地酒|dispensa|Birrifici Sanmachi|€-€€|Sake locale assaggiabile con una piccola tazza ochoko.|Valuta una bottiglia piccola e proteggila bene.|Takayama sake
kyoto|kiyomizu-yaki|Kiyomizu-yaki|清水焼|casa|Gojo e Higashiyama|€€-€€€|Ceramica di Kyoto, da decorazioni classiche a studi contemporanei.|Visita più botteghe prima di scegliere.|Kiyomizu yaki pottery
kyoto|kyoto-incense|Incenso di Kyoto|京香|benessere|Teramachi e negozi storici|€€|Miscele legate alla cultura di corte e alla cerimonia dell'incenso.|Le confezioni campione aiutano a scegliere.|Kyoto incense shop
kyoto|uji-matcha|Matcha di Uji|宇治抹茶|dispensa|Negozi di tè|€€-€€€|Polvere di tè ombreggiato per preparazione tradizionale o pasticceria.|Chiedi se è per usucha, koicha o cucina.|Uji matcha tin
kyoto|nishijin|Nishijin-ori|西陣織|tessili|Kyoto nord|€€-€€€|Broccato complesso usato per obi, borse e accessori.|Piccoli astucci offrono ottimo valore.|Nishijin ori Kyoto
kyoto|kyoto-knives|Coltelli di Kyoto|京刃物|casa|Nishiki e botteghe|€€€|Lame da cucina spesso affilate e incise sul posto.|Chiedi acciaio, manutenzione e fodero.|Kyoto knife shop
kyoto|wagasa|Wagasa|和傘|artigianato|Botteghe tradizionali|€€€|Ombrelli in bambù e carta washi, scenografici e delicati.|Per il viaggio scegli un piccolo parasole.|Kyoto wagasa umbrella
nara|nara-fude|Pennelli di Nara|奈良筆|cartoleria|Naramachi|€€-€€€|Pennelli da calligrafia assemblati con tecniche storiche.|Spiega se lo userai per calligrafia o pittura.|Nara fude brush
nara|ittobori|Nara ittobori|奈良一刀彫|artigianato|Naramachi|€€-€€€|Sculture in legno dai tagli netti, spesso cervi o figure sacre.|Le tracce di scalpello sono parte dell'estetica.|Nara ittobori
nara|kaya-cloth|Tessuto kaya|蚊帳生地|tessili|Naramachi|€|Panni da cucina assorbenti dalla tradizione delle zanzariere.|Lavandoli diventano più morbidi.|Nara kaya cloth
osaka|sakai-knives|Coltelli Sakai|堺刃物|casa|Sennichimae e Sakai|€€€|Lame nate dalla tradizione delle spade e amate dai cuochi.|Acquista dove offrono manutenzione.|Sakai Japanese knives
osaka|konamon-sauce|Salse per konamon|粉もんソース|dispensa|Supermercati|€|Salse per okonomiyaki e takoyaki, aonori e katsuobushi.|Le bottiglie piccole pesano meno.|okonomiyaki sauce Japan
osaka|retro-goods|Insegne e grafica rétro|レトロ雑貨|pop|Shinsekai|€|T-shirt, spille e oggetti dall'estetica rumorosa e ironica di Osaka.|Cerca piccole produzioni grafiche.|Shinsekai Osaka souvenirs
hiroshima|kumano-brush|Pennelli Kumano|熊野筆|beauty|Department store|€€-€€€|Pennelli da trucco, pittura e calligrafia prodotti nella prefettura.|Chiedi tipo di pelo e uso.|Kumano brushes
hiroshima|hiroshima-lemon|Prodotti al limone Setouchi|瀬戸内レモン|dispensa|Stazioni e mercati|€|Condimenti, dolci e bevande con limoni del Mare Interno.|Sale al limone e biscotti viaggiano bene.|Setouchi lemon products
hiroshima|carp-goods|Hiroshima Carp goods|カープグッズ|pop|Centro e stazione|€-€€|Merchandise rosso della squadra di baseball amata dalla città.|Un cappellino è il souvenir più riconoscibile.|Hiroshima Carp merchandise
miyajima|rice-scoop|Shamoji di Miyajima|宮島杓子|casa|Omotesando|€-€€|Mestolo da riso in legno, simbolo portafortuna dell'isola.|Puoi far incidere nome o data.|Miyajima rice scoop
miyajima|oyster-oil|Ostriche sott'olio|牡蠣オイル漬け|dispensa|Negozi alimentari|€€|Ostriche di Hiroshima conservate in olio e condimenti.|Verifica regole doganali e tenuta della confezione.|Hiroshima oyster oil jar
miyajima|deer-goods|Artigianato del cervo|鹿雑貨|artigianato|Machiya-dori|€-€€|Piccoli oggetti in legno, carta e tessuto ispirati ai cervi sacri.|Cerca firma o atelier sulla confezione.|Miyajima deer craft
all|small-woodblock-print|Piccola xilografia hanga|木版画|arte|Musei, gallerie e botteghe di stampe|€€-€€€|Xilografia contemporanea o ristampa tradizionale in formato facile da incorniciare.|Chiedi autore, tecnica, tiratura e se è originale o riproduzione.|Japanese small woodblock print hanga
all|mini-shikishi|Quadretto shikishi|色紙|arte|Cartolerie artistiche, templi e botteghe|€-€€|Tavoletta quadrata di carta rigida con calligrafia, pittura o stampa, leggera e pronta da esporre.|Controlla se l'opera è dipinta a mano, stampata o firmata.|Japanese shikishi art board painting
kyoto|small-sumie|Piccolo sumi-e originale|墨絵|arte|Gallerie e atelier di Kyoto|€€-€€€|Pittura a inchiostro su carta con pochi tratti, paesaggi, bambù, animali o soggetti zen.|Chiedi una custodia rigida e il nome dell'artista scritto in caratteri latini.|small sumi-e ink painting Kyoto
kyoto|mini-byobu|Mini paravento byobu|ミニ屏風|arte|Botteghe artigiane e musei|€€-€€€|Paravento pieghevole da tavolo con pittura, foglia metallica o riproduzioni di opere classiche.|Verifica materiale delle cerniere e proteggi angoli e superficie.|Japanese miniature byobu screen art
kanazawa|gold-leaf-panel|Pannello con foglia d'oro|金箔パネル|arte|Atelier di foglia d'oro|€€-€€€|Piccolo pannello decorativo che usa la foglia d'oro di Kanazawa con motivi astratti o tradizionali.|Preferisci atelier che spiegano supporto, tecnica e manutenzione.|Kanazawa gold leaf art panel
tokyo|artist-postcard-print|Stampa di illustratore indipendente|作家プリント|arte|Design Festa Gallery, librerie d'arte e mercati creativi|€-€€|Piccole stampe, risograph e cartoline firmate da illustratori contemporanei giapponesi.|Cerca firma, tiratura e contatto dell'autore; una busta rigida costa meno del rimorso.|Japanese independent artist risograph print Tokyo
nara|ittobori-relief|Piccolo rilievo ittobori|一刀彫|arte|Naramachi e botteghe specializzate|€€-€€€|Bassorilievo o tavoletta scolpita con tagli netti della tradizione ittobori di Nara.|Le tracce dello scalpello devono essere intenzionali e coerenti.|Nara ittobori small relief art
all|chigirie-collage|Chigiri-e in washi|ちぎり絵|arte|Botteghe di carta e gallerie artigiane|€€|Quadretto creato strappando e sovrapponendo carta washi per ottenere sfumature morbide.|Chiedi se è un lavoro manuale originale o un kit assemblato in serie.|Japanese chigiri-e washi collage art
`);

  const shopCategories = {
    tradizione:"Riti e simboli", tessili:"Tessili", casa:"Casa e cucina",
    benessere:"Benessere", dispensa:"Dispensa", cartoleria:"Cartoleria",
    beauty:"Beauty", manga:"Manga e anime", gaming:"Gaming e personaggi",
    tecnologia:"Tecnologia", pop:"Cultura pop", artigianato:"Artigianato",
    arte:"Arte e musica", moda:"Moda"
  };
  function commonsImage(filename, sourceUrl, credit) {
    return {
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + encodeURIComponent(filename) + "?width=960",
      sourceUrl: sourceUrl,
      credit: credit
    };
  }
  const officialImages = {
    "hada-labo": {
      url: "https://jp.rohto.com/-/Media/com/hadalabo/promo/gokujyun/200825/img_gokujyun2020_sp_10.png",
      sourceUrl: "https://jp.rohto.com/hadalabo/promo/gokujyun/",
      credit: "Rohto Pharmaceutical · immagine ufficiale"
    },
    "melano-cc": {
      url: "https://jp.rohto.com/-/media/com/melanocc/essence/img_169658_03.jpg?sc_lang=ja-jp",
      sourceUrl: "https://jp.rohto.com/melanocc/essence/",
      credit: "Rohto Pharmaceutical · immagine ufficiale"
    },
    "rice-mask": {
      url: "https://www.ishizawa-lab.co.jp/keana_skincare/images/mask/product-mask-img01.png",
      sourceUrl: "https://www.ishizawa-lab.co.jp/keana_skincare/mask.html",
      credit: "Ishizawa Research Institute · immagine ufficiale"
    },
    "canmake-uv": {
      url: "https://www.canmake.com/wp-content/uploads/2025/08/A06_67_col01_chip_01.jpg",
      sourceUrl: "https://www.canmake.com/item/detail/mermaid-skin-gel-uv/",
      credit: "CANMAKE · immagine ufficiale"
    },
    "heroine-mascara": {
      url: "https://www.isehan.co.jp/heroine/wp-content/uploads/2025/08/lashhype_color01-1.jpg",
      sourceUrl: "https://www.isehan.co.jp/heroine/product/mascara/lashhype/",
      credit: "Isehan Heroine Make · immagine ufficiale"
    },
    "fino-mask": {
      url: "https://brand.finetoday.com/jp/fino/assets/img/mask/prod3.png",
      sourceUrl: "https://brand.finetoday.com/jp/fino/mask/",
      credit: "FineToday fino · immagine ufficiale"
    },
    "tsubaki-mask": {
      url: "https://brand.finetoday.com/jp/tsubaki/assets/img/mask/suzy_mask.png",
      sourceUrl: "https://brand.finetoday.com/jp/tsubaki/mask/",
      credit: "FineToday TSUBAKI · immagine ufficiale"
    },
    "and-honey": {
      url: "https://www.and-honey.com/img/deep/product/img-hairoil-1.png",
      sourceUrl: "https://www.and-honey.com/deep/product/",
      credit: "&honey · immagine ufficiale"
    },
    "softymo-oil": {
      url: "https://maison.kose.co.jp/img/goods/L/WMHF_main.png",
      sourceUrl: "https://maison.kose.co.jp/site/softymo/g/gWMHF/",
      credit: "Kose Softymo · immagine ufficiale"
    },
    "reon-pocket": {
      url: "https://reonpocket.sony.co.jp/common/image/og.png",
      sourceUrl: "https://reonpocket.sony.co.jp/",
      credit: "Sony REON POCKET · immagine ufficiale"
    },
    "mini-shikishi": commonsImage("Mount Utsu by Tawaraya Sotatsu, Metropolitan Museum of Art.jpg", "https://commons.wikimedia.org/wiki/File:Mount_Utsu_by_Tawaraya_Sotatsu,_Metropolitan_Museum_of_Art.jpg", "Metropolitan Museum of Art · pubblico dominio · Wikimedia Commons"),
    "small-sumie": commonsImage("Gion Nankai - Ink Bamboo - 105-1982 - Saint Louis Art Museum.jpg", "https://commons.wikimedia.org/wiki/File:Gion_Nankai_-_Ink_Bamboo_-_105-1982_-_Saint_Louis_Art_Museum.jpg", "Saint Louis Art Museum · pubblico dominio · Wikimedia Commons"),
    "mini-byobu": commonsImage("Hikone Screen.jpg", "https://commons.wikimedia.org/wiki/File:Hikone_Screen.jpg", "opera del periodo Edo · pubblico dominio · Wikimedia Commons"),
    "gold-leaf-panel": commonsImage("Kanazawa Gold Factory.jpg", "https://commons.wikimedia.org/wiki/File:Kanazawa_Gold_Factory.jpg", "Eckhard Pecher · CC BY 2.5 · Wikimedia Commons"),
    "artist-postcard-print": commonsImage("Carteles en riso.jpg", "https://commons.wikimedia.org/wiki/File:Carteles_en_riso.jpg", "stampe risograph · Wikimedia Commons"),
    "ittobori-relief": commonsImage("実演一位一刀彫 (岐阜県高山市) - panoramio.jpg", "https://commons.wikimedia.org/wiki/File:実演一位一刀彫_(岐阜県高山市)_-_panoramio.jpg", "gundam2345 · CC BY 3.0 · Wikimedia Commons"),
    "chigirie-collage": commonsImage("Chigiri-e 'Tulip' by Paddy Summerfield.jpg", "https://commons.wikimedia.org/wiki/File:Chigiri-e_%27Tulip%27_by_Paddy_Summerfield.jpg", "Leyton35 · CC BY-SA 4.0 · Wikimedia Commons")
  };
  const allowedCities = new Set(window.__JAPAN_PARTIAL__.cities.map(function (city) { return city.id; }));
  const shopping = rows.filter(function (row) { return row.city === "all" || allowedCities.has(row.city); }).map(function (row) {
    row.id = "shop-" + row.city + "-" + row.slug;
    row.type = "shop";
    if (officialImages[row.slug]) Object.assign(row, {
      imageUrl: officialImages[row.slug].url,
      imageSourceUrl: officialImages[row.slug].sourceUrl,
      imageCredit: officialImages[row.slug].credit
    });
    return row;
  });
  window.__JAPAN_PARTIAL__.shopping = shopping;
  window.__JAPAN_PARTIAL__.labels.shopCategories = shopCategories;
  window.JAPAN_DATA = window.__JAPAN_PARTIAL__;
  delete window.__JAPAN_PARTIAL__;
})();
