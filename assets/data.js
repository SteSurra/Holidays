(function () {
  "use strict";
  const cityRows = [
    ["tokyo","Tokyo","東京","Kanto",35.6762,139.6503,"Tradizione Edo, quartieri verticali e notti infinite."],
    ["kamakura","Kamakura","鎌倉","Kanto",35.3192,139.5467,"Templi, mare e sentieri a un'ora da Tokyo."],
    ["hakone","Hakone","箱根","Kanto",35.2324,139.1069,"Onsen, arte e Fuji oltre il lago Ashi."],
    ["matsumoto","Matsumoto","松本","Chubu",36.238,137.972,"Castello nero e porta d'ingresso alle Alpi."],
    ["nagano","Nagano","長野","Chubu",36.6486,138.1948,"Santuari di montagna e sapori dello Shinshu."],
    ["kanazawa","Kanazawa","金沢","Hokuriku",36.5613,136.6562,"Giardini, case da tè e artigianato Kaga."],
    ["shirakawago","Shirakawa-go","白川郷","Gifu",36.257,136.906,"Villaggi gassho-zukuri tra risaie e montagne."],
    ["takayama","Takayama","高山","Gifu",36.146,137.252,"Mercati mattutini, legno e sake di montagna."],
    ["kyoto","Kyoto","京都","Kansai",35.0116,135.7681,"Templi, botteghe e una cucina di precisione."],
    ["nara","Nara","奈良","Kansai",34.6851,135.8048,"Il Giappone antico tra cervi e grandi Buddha."],
    ["osaka","Osaka","大阪","Kansai",34.6937,135.5023,"La capitale informale del mangiare bene."],
    ["hiroshima","Hiroshima","広島","Chugoku",34.3853,132.4553,"Memoria, rinascita e una cucina generosa."],
    ["miyajima","Miyajima","宮島","Chugoku",34.2959,132.3199,"Torii sull'acqua, sentieri sacri e ostriche."]
  ];
  const cities = cityRows.map(function (r, i) {
    return { id:r[0], name:r[1], jp:r[2], region:r[3], lat:r[4], lng:r[5], summary:r[6], order:i+1 };
  });

  function parseTable(text, fields) {
    return text.trim().split("\n").filter(Boolean).map(function (line) {
      const values = line.split("|");
      return fields.reduce(function (item, field, index) { item[field] = values[index]; return item; }, {});
    });
  }

  const placeRows = parseTable(`
tokyo|sensoji|Senso-ji|浅草寺|tempio|Asakusa|Il tempio più antico di Tokyo: arrivaci presto, poi perditi nelle vie laterali dietro Nakamise.|1-2 ore|Mattina presto o dopo il tramonto|Sensoji temple Tokyo
tokyo|meiji|Meiji Jingu|明治神宮|santuario|Harajuku|Un grande bosco nel cuore della città, separato dal rumore da un enorme torii.|1-2 ore|Abbinalo a Omotesando|Meiji shrine Tokyo
tokyo|shibuya-sky|Shibuya Sky|渋谷スカイ|panorama|Shibuya|Terrazza a 229 metri sopra l'incrocio, tra le migliori viste urbane della città.|1 ora|Prenota una fascia vicina al tramonto|Shibuya Sky Tokyo
tokyo|yanaka|Yanaka Ginza|谷中銀座|quartiere|Yanaka|Tokyo bassa, botteghe, snack e atmosfera Showa lontano dai grandi flussi.|2 ore|Vai nel tardo pomeriggio|Yanaka Ginza Tokyo
tokyo|kappabashi|Kappabashi|かっぱ橋|shopping|Taito|La via degli utensili da cucina: coltelli, ceramiche, bacchette e cibo finto.|2 ore|Molti negozi chiudono presto|Kappabashi Tokyo
kamakura|great-buddha|Grande Buddha|鎌倉大仏|tempio|Hase|L'icona in bronzo di Kamakura, monumentale ma sorprendentemente raccolta.|45 min|Combinalo con Hase-dera|Great Buddha Kamakura
kamakura|hasedera|Hase-dera|長谷寺|tempio|Hase|Giardini terrazzati, statue Jizo e una bella vista sulla baia.|1-2 ore|Percorri tutti i livelli|Hasedera Kamakura
kamakura|tsurugaoka|Tsurugaoka Hachimangu|鶴岡八幡宮|santuario|Centro|Il santuario simbolo della città alla fine del viale Wakamiya-oji.|1 ora|Passa da Komachi-dori|Tsurugaoka Hachimangu
kamakura|hokokuji|Hokoku-ji|報国寺|tempio|Kamakura est|Un piccolo bosco di bambù con sala da tè, più intimo di Arashiyama.|1 ora|Prendi il matcha nel giardino|Hokokuji bamboo Kamakura
hakone|open-air|Hakone Open-Air Museum|彫刻の森美術館|museo|Chokoku-no-mori|Sculture tra le montagne, padiglione Picasso e installazioni all'aperto.|2-3 ore|Prevedi tempo per il piediluvio|Hakone Open Air Museum
hakone|owakudani|Owakudani|大涌谷|natura|Hakone Ropeway|Valle vulcanica attiva, fumarole e viste sul Fuji quando il cielo è limpido.|1-2 ore|Controlla apertura della ropeway|Owakudani Hakone
hakone|lake-ashi|Lago Ashi|芦ノ湖|natura|Moto-Hakone|Il classico profilo del Fuji oltre il lago e sentieri tranquilli lungo la riva.|2 ore|Mattina per più probabilità di Fuji|Lake Ashi Fuji
hakone|hakone-shrine|Hakone Jinja|箱根神社|santuario|Moto-Hakone|Santuario nel bosco con torii sul lago; il recinto superiore è il più suggestivo.|1 ora|Non serve fare la coda per la foto|Hakone shrine lake torii
matsumoto|castle|Castello di Matsumoto|松本城|castello|Centro|Uno dei castelli originali meglio conservati, nero contro le Alpi giapponesi.|2 ore|Apri la giornata qui|Matsumoto castle
matsumoto|nakamachi|Nakamachi-dori|中町通り|quartiere|Centro|Magazzini kura bianchi e neri trasformati in caffè, gallerie e botteghe.|1-2 ore|Devia nei cortili|Nakamachi Matsumoto
matsumoto|nawate|Nawate-dori|縄手通り|shopping|Centro|Piccola via pedonale lungo il fiume, famosa per rane, snack e antiquariato.|1 ora|Prova il taiyaki|Nawate street Matsumoto
matsumoto|city-museum|Matsumoto City Museum|松本市立博物館|museo|Castello|Un museo contemporaneo per leggere storia, feste e cultura popolare.|1-2 ore|Ottimo con pioggia|Matsumoto City Museum
nagano|zenkoji|Zenko-ji|善光寺|tempio|Centro|Il grande tempio di Nagano; nel passaggio sotterraneo cerca la chiave al buio.|2 ore|Visitalo prima delle 9|Zenkoji Nagano
nagano|togakushi|Togakushi Jinja|戸隠神社|santuario|Togakushi|Cinque santuari nel bosco e un viale di cedri memorabile verso Okusha.|Mezza giornata|Verifica bus e meteo|Togakushi shrine cedar
nagano|snow-monkey|Jigokudani Monkey Park|地獄谷野猿公苑|natura|Yamanouchi|Macachi selvatici nella valle termale, raggiunti da un piacevole sentiero.|Mezza giornata|Non nutrire né toccare|Jigokudani monkey park
nagano|obuse|Obuse|小布施|quartiere|Obuse|Piccola città di castagne, sake e Hokusai, facile deviazione in treno.|Mezza giornata|Assaggia i dolci kuri|Obuse Nagano
kanazawa|kenrokuen|Kenroku-en|兼六園|giardino|Centro|Uno dei tre grandi giardini del Giappone, bello in ogni stagione.|2 ore|Entra all'apertura|Kenrokuen Kanazawa
kanazawa|castle|Castello di Kanazawa|金沢城|castello|Centro|Porte, mura e torrette ricostruite con tecniche tradizionali.|1-2 ore|Attraversa Gyokusen-inmaru|Kanazawa castle
kanazawa|higashi|Higashi Chaya|ひがし茶屋街|quartiere|Higashiyama|Case da tè in legno, foglia d'oro e vicoli che rendono meglio prima dei gruppi.|2 ore|Arriva entro le 9|Higashi Chaya Kanazawa
kanazawa|omicho|Mercato Omicho|近江町市場|mercato|Centro|Banchi di pesce, crostacei e prodotti Kaga, perfetti per una colazione salata.|1-2 ore|Vai affamato e condividi|Omicho market Kanazawa
kanazawa|suzuki|D.T. Suzuki Museum|鈴木大拙館|museo|Honda-machi|Architettura minimale, acqua e silenzio dedicati al filosofo zen.|1 ora|Concediti tempo nel giardino|DT Suzuki Museum Kanazawa
shirakawago|viewpoint|Osservatorio Shiroyama|城山展望台|panorama|Ogimachi|La vista da cartolina sul villaggio e sui tetti gassho-zukuri.|1 ora|Sali presto a piedi o navetta|Shirakawago viewpoint
shirakawago|wada-house|Wada House|和田家|casa-storica|Ogimachi|Una grande casa gassho ancora abitata, utile per capire struttura e vita quotidiana.|45 min|Osserva il sottotetto|Wada House Shirakawago
shirakawago|open-air|Gassho-zukuri Minka-en|合掌造り民家園|museo|Ogimachi|Museo all'aperto con case trasferite, mulini e laboratori tradizionali.|1-2 ore|Meno affollato del centro|Gassho zukuri Minkaen
shirakawago|myozenji|Myozen-ji|明善寺|tempio|Ogimachi|Tempio dal raro tetto di paglia, integrato nel paesaggio rurale.|30 min|Rispetta gli spazi di culto|Myozenji Shirakawago
takayama|sanmachi|Sanmachi Suji|三町筋|quartiere|Città vecchia|Case mercantili Edo, birrifici di sake e botteghe lungo tre vie compatte.|2-3 ore|Prima delle 9 è quasi vuota|Sanmachi Takayama
takayama|miyagawa|Mercato Miyagawa|宮川朝市|mercato|Fiume Miyagawa|Verdure, miso, artigianato e snack in un mercato mattutino lungo il fiume.|1 ora|Vai prima delle 11|Miyagawa morning market
takayama|jinya|Takayama Jinya|高山陣屋|casa-storica|Centro|L'antico ufficio del governo Tokugawa con sale tatami e granai originali.|1-2 ore|Segui il percorso amministrativo|Takayama Jinya
takayama|folk-village|Hida no Sato|飛騨の里|museo|Ovest|Villaggio all'aperto con case rurali di Hida, più quieto di Shirakawa-go.|2 ore|Bella luce nel pomeriggio|Hida Folk Village
kyoto|fushimi|Fushimi Inari|伏見稲荷大社|santuario|Fushimi|Migliaia di torii sul monte Inari; oltre Yotsutsuji la folla si dirada.|2-3 ore|Alba o dopo le 18|Fushimi Inari Kyoto
kyoto|kiyomizu|Kiyomizu-dera|清水寺|tempio|Higashiyama|Terrazza in legno e una splendida discesa tra Sannenzaka e Ninenzaka.|2-3 ore|Apri la giornata qui|Kiyomizudera Kyoto
kyoto|arashiyama|Arashiyama e Okochi Sanso|嵐山|natura|Arashiyama|Oltre il bambù, cerca il giardino Okochi Sanso e i sentieri verso nord.|Mezza giornata|Bambù prima delle 8|Arashiyama Okochi Sanso
kyoto|gion|Gion e Shirakawa|祇園|quartiere|Higashiyama|Machiya, canali e sale da tè in un quartiere che richiede rispetto.|2 ore|Passeggia al crepuscolo|Gion Shirakawa Kyoto
kyoto|kinkakuji|Kinkaku-ji|金閣寺|tempio|Kyoto nord|Il padiglione d'oro riflesso nello stagno, teatrale in ogni stagione.|1 ora|Continua verso Ryoan-ji|Kinkakuji Kyoto
kyoto|nishiki|Mercato Nishiki|錦市場|mercato|Centro|Una lunga dispensa: tsukemono, dashimaki, tè, coltelli e piccoli assaggi.|1-2 ore|Non mangiare camminando|Nishiki market Kyoto
nara|todaiji|Todai-ji|東大寺|tempio|Nara Park|La sala lignea del Grande Buddha dà la scala della prima capitale imperiale.|2 ore|Passa dalla porta Nandaimon|Todaiji Nara
nara|nara-park|Nara Park|奈良公園|natura|Centro est|Cervi sacri, prati e sentieri tra i grandi complessi religiosi.|2 ore|Mostra le mani vuote dopo i cracker|Nara Park deer
nara|kasuga|Kasuga Taisha|春日大社|santuario|Nara Park|Lanterne in bronzo e pietra lungo un bosco primordiale protetto.|1-2 ore|Percorri il sentiero nel bosco|Kasuga Taisha lanterns
nara|isuien|Isui-en|依水園|giardino|Todai-ji ovest|Due giardini che usano le colline di Nara come scenario preso in prestito.|1 ora|Perfetto tra due templi|Isuien garden Nara
nara|naramachi|Naramachi|ならまち|quartiere|Centro sud|Vecchie case mercantili, gallerie e negozi in strade meno battute.|2 ore|Entra nelle machiya aperte|Naramachi Nara
osaka|castle|Castello di Osaka|大阪城|castello|Chuo|Simbolo circondato da un parco enorme, mura monumentali e fossati.|2 ore|Passeggia fino alle mura est|Osaka castle
osaka|dotonbori|Dotonbori|道頓堀|quartiere|Namba|Insegne, canale e densità gastronomica: rumorosa e assolutamente Osaka.|2-3 ore|Arriva affamato dopo il tramonto|Dotonbori Osaka night
osaka|shinsekai|Shinsekai|新世界|quartiere|Tennoji|Sale da gioco, kushikatsu e insegne Showa sotto la torre Tsutenkaku.|2 ore|Ideale per cena informale|Shinsekai Osaka
osaka|kuromon|Kuromon Ichiba|黒門市場|mercato|Nippombashi|Mercato coperto di pesce, frutta e street food, turistico ma istruttivo.|1-2 ore|Confronta i prezzi|Kuromon market Osaka
osaka|umeda-sky|Umeda Sky Building|梅田スカイビル|panorama|Umeda|Due torri unite da un osservatorio aperto con vista sulla metropoli.|1-2 ore|Tramonto se il cielo è limpido|Umeda Sky Building
hiroshima|peace-museum|Peace Memorial Museum|平和記念資料館|museo|Parco della Pace|Una visita essenziale e intensa sulle conseguenze umane della bomba atomica.|2-3 ore|Prenota tempo per elaborare|Hiroshima Peace Memorial Museum
hiroshima|a-bomb-dome|A-Bomb Dome|原爆ドーム|memoriale|Parco della Pace|La rovina conservata dell'ex sala di promozione industriale, oggi monito visibile.|45 min|Osservala dalla riva opposta|Atomic Bomb Dome Hiroshima
hiroshima|shukkeien|Shukkeien|縮景園|giardino|Centro|Paesaggi in miniatura intorno a uno stagno, quiete a pochi passi dalla stazione.|1 ora|Ottimo all'apertura|Shukkeien Hiroshima
hiroshima|castle|Castello di Hiroshima|広島城|castello|Centro|Ricostruzione del castello dei Mori, utile per leggere la città feudale.|1-2 ore|Cammina lungo il fossato|Hiroshima castle
hiroshima|okonomimura|Okonomimura|お好み村|cibo|Hondori|Più piani di piccoli banchi dedicati all'okonomiyaki stile Hiroshima.|1-2 ore|Siediti dove c'è atmosfera|Okonomimura Hiroshima
miyajima|itsukushima|Itsukushima Jinja|厳島神社|santuario|Costa|Santuario su palafitte e torii nel mare; le maree cambiano completamente la visita.|2 ore|Controlla gli orari delle maree|Itsukushima shrine torii
miyajima|misen|Monte Misen|弥山|natura|Centro isola|Sentieri, rocce sacre e panorami sul Mare Interno di Seto.|3-5 ore|Ropeway più tratto a piedi|Mount Misen Miyajima
miyajima|daishoin|Daisho-in|大聖院|tempio|Base del Misen|Scale, ruote di sutra e centinaia di piccole statue.|1-2 ore|Non fermarti al primo cortile|Daishoin Miyajima
miyajima|omotesando|Omotesando|表参道|shopping|Miyajima|La via principale per momiji manju, ostriche, mestoli di riso e botteghe.|1-2 ore|Esplora anche Machiya-dori|Miyajima Omotesando
miyajima|senjokaku|Senjokaku|千畳閣|tempio|Itsukushima|Grande padiglione incompiuto, con pavimento in legno e vista tra gli aceri.|45 min|Sali anche alla pagoda|Senjokaku Miyajima
`, ["city","slug","name","jp","category","area","description","duration","tip","imageQuery"]);

  const placeCategories = {
    tempio:"Templi", santuario:"Santuari", quartiere:"Quartieri", natura:"Natura",
    panorama:"Panorami", museo:"Musei", castello:"Castelli", shopping:"Shopping",
    mercato:"Mercati", "casa-storica":"Case storiche", giardino:"Giardini",
    memoriale:"Memoria", cibo:"Cibo"
  };
  const places = placeRows.map(function (row) {
    row.id = "place-" + row.city + "-" + row.slug;
    row.type = "place";
    return row;
  });

  window.__JAPAN_PARTIAL__ = { cities:cities, places:places, labels:{ placeCategories:placeCategories } };
})();
