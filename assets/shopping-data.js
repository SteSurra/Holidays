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
`);

  const shopCategories = {
    tradizione:"Riti e simboli", tessili:"Tessili", casa:"Casa e cucina",
    benessere:"Benessere", dispensa:"Dispensa", cartoleria:"Cartoleria",
    beauty:"Beauty", pop:"Cultura pop", artigianato:"Artigianato",
    arte:"Arte e stampe", moda:"Moda"
  };
  const shopping = rows.map(function (row) {
    row.id = "shop-" + row.city + "-" + row.slug;
    row.type = "shop";
    return row;
  });
  window.__JAPAN_PARTIAL__.shopping = shopping;
  window.__JAPAN_PARTIAL__.labels.shopCategories = shopCategories;
  window.JAPAN_DATA = window.__JAPAN_PARTIAL__;
  delete window.__JAPAN_PARTIAL__;
})();
