(function () {
  "use strict";

  // I timbri dei "100 castelli famosi del Giappone" (日本100名城), il programma
  // della Fondazione dei castelli giapponesi dal 2006: ogni castello della
  // lista ha un timbro in un punto preciso e dichiarato, e sei di quei
  // castelli sono in questo viaggio.
  //
  // Perché una lista scritta a mano e non un livello automatico come i WC:
  // OpenStreetMap non mappa i timbri. Cercandoli su tutta Tokyo escono tre
  // nodi, di cui due sono negozi che si chiamano così. Un livello "timbri"
  // costruito da lì sarebbe vuoto dove servono e sbagliato dove no, quindi
  // qui c'è solo ciò che è verificabile su una fonte, con la fonte accanto.
  //
  // Le coordinate sono del BANCO del timbro quando OpenStreetMap conosce
  // l'edificio (l'ufficio, il punto di ristoro, il torrione), non del centro
  // del castello: dentro un parco recintato la differenza è di camminata.
  const SOURCE = {
    title: "日本100名城 · elenco e postazioni dei timbri",
    url: "https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC100%E5%90%8D%E5%9F%8E"
  };

  const stamps = [
    {
      slug: "edo", city: "tokyo", number: 21,
      site: "Castello di Edo", jp: "江戸城",
      name: "Timbro n. 21 · Castello di Edo",
      lat: 35.692345, lng: 139.749462,
      where: "Casa di riposo di Kitanomaru (北の丸休憩場)",
      description: "Il timbro dei 100 castelli per il Castello di Edo, cioè l'attuale Palazzo Imperiale. Tre postazioni valide: Kitanomaru, Kusunoki (楠公休憩場) e Wadakura (和田倉休憩場). Il pin è sulla prima."
    },
    {
      slug: "matsumoto", city: "matsumoto", number: 29,
      site: "Castello di Matsumoto", jp: "松本城",
      name: "Timbro n. 29 · Castello di Matsumoto",
      lat: 36.238534, lng: 137.970109,
      where: "Ufficio di gestione del castello (松本城管理事務所)",
      description: "Il timbro sta nell'ufficio di gestione, non dentro il torrione: si può prendere anche senza salire."
    },
    {
      slug: "kanazawa", city: "kanazawa", number: 35,
      site: "Castello di Kanazawa", jp: "金沢城",
      name: "Timbro n. 35 · Castello di Kanazawa",
      lat: 36.565710, lng: 136.661608,
      where: "Punto informazioni all'ingresso di Ishikawa-mon (石川門入口案内所)",
      description: "Due postazioni: quella all'ingresso della porta Ishikawa, sul pin, e quella del Ninomaru (二の丸案内所) dentro il parco."
    },
    {
      slug: "nijo", city: "kyoto", number: 53,
      site: "Castello di Nijo", jp: "二条城",
      name: "Timbro n. 53 · Castello di Nijo",
      lat: 35.0142, lng: 135.7481,
      where: "Grande punto di ristoro (大休憩所)",
      description: "Il timbro è al grande punto di ristoro dentro le mura. Qui il pin è sul castello: la sala si trova seguendo le indicazioni dopo l'ingresso."
    },
    {
      slug: "osaka", city: "osaka", number: 54,
      site: "Castello di Osaka", jp: "大坂城",
      name: "Timbro n. 54 · Castello di Osaka",
      lat: 34.687487, lng: 135.525887,
      where: "Banco informazioni al 1° piano del torrione (天守閣1階インフォメーション)",
      description: "È dentro il torrione, al primo piano: serve il biglietto d'ingresso per arrivarci."
    },
    {
      slug: "hiroshima", city: "hiroshima", number: 73,
      site: "Castello di Hiroshima", jp: "広島城",
      name: "Timbro n. 73 · Castello di Hiroshima",
      lat: 34.402736, lng: 132.459054,
      where: "Negozio del museo al 1° piano del torrione (1階ミュージアムショップ)",
      description: "Al bookshop del primo piano del torrione ricostruito, dentro il percorso di visita."
    }
  ];

  // La fonte sta su ogni timbro, non solo sulla lista: quando arriveranno i
  // timbri di stazione e dei musei ognuno avrà la propria, e il controllo di
  // integrità deve poterla pretendere voce per voce.
  stamps.forEach(function (stamp) {
    if (!stamp.sourceUrl) stamp.sourceUrl = SOURCE.url;
    if (!stamp.sourceTitle) stamp.sourceTitle = SOURCE.title;
  });

  const mapData = window.JAPAN_MAP_DATA;
  if (mapData && Array.isArray(mapData.points)) {
    stamps.forEach(function (stamp) {
      mapData.points.push({
        id: "map-stamp-" + stamp.slug,
        city: stamp.city,
        group: "Timbri",
        name: stamp.name,
        type: "stamp",
        category: "timbro",
        area: stamp.site,
        lat: stamp.lat,
        lng: stamp.lng,
        description: stamp.description + " Dove: " + stamp.where + ".",
        sourceTitle: SOURCE.title,
        sourceUrl: SOURCE.url
      });
    });
  }

  window.JAPAN_STAMPS = { stamps: stamps, source: SOURCE };
})();
