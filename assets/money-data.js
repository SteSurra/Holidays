(function () {
  "use strict";

  // Monete e banconote in corso legale. Le misure sono quelle ufficiali della
  // Zecca e della Banca del Giappone: servono a disegnarle in scala tra loro,
  // perché a mano si riconoscono prima dal diametro che dai kanji.
  const coins = [
    {
      value: 1, kanji: "一円", metal: "Alluminio", diameter: 20, weight: "1 g",
      color: "#dcdfe0", edge: "#b3b8ba", hole: false,
      face: "Un alberello stilizzato",
      note: "Talmente leggera da sembrare finta. Quasi nessun distributore la accetta: resta per gli arrotondamenti alla cassa."
    },
    {
      value: 5, kanji: "五円", metal: "Ottone", diameter: 22, weight: "3,75 g",
      color: "#cba22f", edge: "#9a7a1f", hole: true,
      face: "Spiga di riso, ingranaggio e acqua",
      note: "L'unica senza cifre arabe: se non riconosci i kanji, guarda il buco e il colore dell'ottone. Si dice go-en come 御縁, «legame fortunato», ed è la moneta che si lancia nelle offerte ai santuari."
    },
    {
      value: 10, kanji: "十円", metal: "Bronzo", diameter: 23.5, weight: "4,5 g",
      color: "#b5713f", edge: "#8a5228", hole: false,
      face: "La Sala della Fenice del Byodo-in",
      note: "L'unica ramata: si individua a colpo d'occhio nel mucchio. È la moneta dei distributori e delle cassette dei templi."
    },
    {
      value: 50, kanji: "五十円", metal: "Cupronichel", diameter: 21, weight: "4 g",
      color: "#c6cbcc", edge: "#9aa0a1", hole: true,
      face: "Un crisantemo",
      note: "Argentata e col buco: è la sola coppia possibile con la 5 yen, ma questa è più piccola e non è dorata."
    },
    {
      value: 100, kanji: "百円", metal: "Cupronichel", diameter: 22.6, weight: "4,8 g",
      color: "#c6cbcc", edge: "#9aa0a1", hole: false,
      face: "Fiori di ciliegio",
      note: "La moneta che userai di più: caffè, armadietti, biglietti brevi e capsule dei gachapon."
    },
    {
      value: 500, kanji: "五百円", metal: "Bicolore, ottone e cupronichel", diameter: 26.5, weight: "7,1 g",
      color: "#c6cbcc", ring: "#cba22f", edge: "#9a7a1f", hole: false,
      face: "Paulonia, bambù e mandarino tachibana",
      note: "La più grande e la più pesante, fra le monete di maggior valore al mondo. Dal 2021 ha il bordo dorato e il centro argentato; il vecchio modello tutto dorato resta valido."
    }
  ];

  // Le banconote sono tutte alte 76 mm: cambia solo la lunghezza, ed è il modo
  // più rapido per capire cosa stai porgendo senza guardare i numeri.
  const notes = [
    {
      value: 1000, kanji: "千円", width: 150, color: "#93b6cf", ink: "#1f3d52",
      portrait: "Kitasato Shibasaburo, il batteriologo",
      back: "La Grande Onda di Hokusai",
      note: "La banconota di tutti i giorni: è quella che accettano biglietterie e distributori. Il modello precedente ritrae Noguchi Hideyo ed è ancora valido."
    },
    {
      value: 2000, kanji: "二千円", width: 154, color: "#9dc3a6", ink: "#28503a",
      portrait: "La porta Shureimon di Naha",
      back: "Una scena del Genji monogatari",
      note: "Rarissima fuori da Okinawa: se ne ricevi una, tienila come souvenir. Molte macchinette non la riconoscono."
    },
    {
      value: 5000, kanji: "五千円", width: 156, color: "#b39ec6", ink: "#42305a",
      portrait: "Tsuda Umeko, pioniera dell'istruzione femminile",
      back: "Grappoli di glicine",
      note: "Il taglio intermedio, comodo per una cena. Il modello precedente ritrae la scrittrice Higuchi Ichiyo."
    },
    {
      value: 10000, kanji: "一万円", width: 160, color: "#c9a87e", ink: "#5b4021",
      portrait: "Shibusawa Eiichi, il padre dell'industria giapponese",
      back: "La stazione di Tokyo, lato Marunouchi",
      note: "La più lunga di tutte. Pagarci un caffè al konbini è normalissimo e nessuno storce il naso: il resto arriva in monete."
    }
  ];

  const tips = [
    "Alla cassa i soldi si appoggiano sul vassoietto, non si mettono in mano: vale anche per la carta di credito.",
    "Distributori, armadietti e biglietterie prendono monete da 10, 50, 100 e 500 yen e banconote da 1000. Le monete da 1 e 5 yen quasi mai.",
    "Le monete si accumulano in fretta: tieni un porta-monete e sbarazzatene alle casse automatiche, che accettano manciate intere.",
    "Il resto si conta davanti a te e si porge con due mani: aspetta di riceverlo prima di allontanarti.",
    "Le banconote nuove del 2024 e quelle vecchie convivono: valgono lo stesso e cambiano solo i volti."
  ];

  window.JAPAN_MONEY = { coins: coins, notes: notes, tips: tips };
})();
