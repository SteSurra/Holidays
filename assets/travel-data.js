(function () {
  "use strict";

  // Only public names and practical area notes are published here.
  window.JAPAN_DATA.lodging = [
    { city:"osaka", name:"Hearton Hotel Kita Umeda", area:"Kita / Umeda", note:"Comodo per Umeda, Nakatsu e i collegamenti ferroviari verso le tappe successive." },
    { city:"hiroshima", name:"Smile Hotel Hiroshima", area:"Centro di Hiroshima", note:"Base centrale per il Parco della Pace, Hondori e la cucina serale della città." },
    { city:"kyoto", name:"The Royal Park Canvas Kyoto Nijo", area:"Nijo", note:"Vicino al castello e ben collegato ai quartieri orientali e alla stazione." },
    { city:"kanazawa", name:"Smile Hotel Kanazawa Nishiguchi Ekimae", area:"Uscita ovest della stazione", note:"Punto pratico per bus urbani, mercato Omicho e partenza verso Shirakawa-go. Attenzione all'omonimo in centro: quello del viaggio è il Nishiguchi, sul lato ovest della stazione." },
    { city:"takayama", name:"KOKO Hotel Hida Takayama", area:"Stazione / città vecchia", note:"A breve distanza dai bus e dalle vie storiche di Sanmachi. L'insegna può ancora riportare il vecchio nome Hotel Wing International." },
    { city:"nagano", name:"Hotel JAL City Nagano", area:"Stazione / Zenko-ji", note:"Tra la stazione e il tempio, utile sia per il centro sia per le escursioni." },
    { city:"tokyo", name:"Hotel Keihan Asakusa", area:"Asakusa", note:"Base nel quartiere storico, vicino a Senso-ji e ai collegamenti della metropolitana." }
  ];

  // Le fermate da cui si parte e a cui si arriva, con il nome giapponese da
  // mostrare a un passante e il collegamento a Google Maps: sono le stesse del
  // programma prenotato, ma qui sta solo il nome pubblico della fermata — mai
  // orari, codici o dati dei viaggiatori, che non entrano nella guida.
  //
  // Ogni fermata porta le sue coordinate, non un nome da cercare. Cercare per
  // nome apriva ricerche vuote — "Takayama Nohi Bus Center" su Nominatim non
  // restituisce nulla, e il posto ha perfino due nomi: バスセンター sui voucher
  // e sul sito del gestore, バスターミナル su OpenStreetMap — o portava
  // sull'omonimo sbagliato: c'è una "stazione di Nagano" a centoquaranta
  // chilometri da quella giusta. Con il punto esatto il collegamento non può
  // sbagliare bersaglio.
  // Le coordinate sono verificate da scripts/check-transfer-stops.mjs.
  const stops = {
    kix: { name:"Stazione aeroporto di Kansai", jp:"関西空港駅", lat:34.43593, lng:135.24341 },
    shinOsaka: { name:"Shin-Osaka", jp:"新大阪駅", lat:34.73288, lng:135.49814 },
    osakaStation: { name:"Osaka", jp:"大阪駅", lat:34.70251, lng:135.49618 },
    nara: { name:"Nara (JR)", jp:"奈良駅", lat:34.68090, lng:135.81890 },
    miyajimaguchi: { name:"Molo di Miyajimaguchi", jp:"宮島口フェリーのりば", lat:34.31110, lng:132.30523 },
    miyajimaPier: { name:"Molo di Miyajima", jp:"宮島桟橋", lat:34.30210, lng:132.32225 },
    hiroshima: { name:"Hiroshima", jp:"広島駅", lat:34.39783, lng:132.47558 },
    kyoto: { name:"Kyoto", jp:"京都駅", lat:34.98535, lng:135.75877 },
    tsuruga: { name:"Tsuruga", jp:"敦賀駅", lat:35.64498, lng:136.07549 },
    kanazawa: { name:"Kanazawa", jp:"金沢駅", lat:36.57817, lng:136.64879 },
    kanazawaWest: { name:"Kanazawa, uscita ovest", jp:"金沢駅西口", lat:36.57858, lng:136.64647 },
    ogimachi: { name:"Shirakawa-go, Ogimachi", jp:"白川郷（荻町）", lat:36.26200, lng:136.90688 },
    takayamaBus: { name:"Takayama Nohi Bus Center", jp:"高山濃飛バスセンター", lat:36.14206, lng:137.25148 },
    matsumotoBus: { name:"Matsumoto Bus Terminal", jp:"松本バスターミナル", lat:36.23008, lng:137.96667 },
    matsumoto: { name:"Matsumoto", jp:"松本駅", lat:36.23095, lng:137.96473 },
    nagano: { name:"Nagano", jp:"長野駅", lat:36.64371, lng:138.18830 },
    naganoBus: { name:"Nagano, stallo 7", jp:"長野駅 ７番のりば", lat:36.64371, lng:138.18830 },
    bustaShinjuku: { name:"Busta Shinjuku, uscita sud", jp:"バスタ新宿（南口）", lat:35.68846, lng:139.70033 },
    tawaramachi: { name:"Tawaramachi", jp:"田原町駅", lat:35.70984, lng:139.79075 },
    mitsukoshimae: { name:"Mitsukoshimae", jp:"三越前駅", lat:35.68499, lng:139.77154 },
    suitengumae: { name:"Suitengumae", jp:"水天宮前駅", lat:35.68252, lng:139.78564 },
    tcat: { name:"Tokyo City Air Terminal", jp:"東京シティエアターミナル", lat:35.68201, lng:139.78753 },
    haneda: { name:"Aeroporto di Haneda", jp:"羽田空港", lat:35.55137, lng:139.77603 }
  };

  window.JAPAN_DATA.legs = [
    { from:"Aeroporto di Kansai", to:"Osaka", mode:"Treno Haruka", note:"Il biglietto vale sia per Shin-Osaka sia per Osaka: si scende dove conviene all'hotel. Il carnet descrive anche il limousine bus KATE per Umeda, con biglietteria automatica alla fermata Hankyu Sanbangai.", stops:[stops.kix, stops.shinOsaka, stops.osakaStation] },
    { from:"Osaka", to:"Nara e ritorno", mode:"Treno", note:"Escursione giornaliera. Il programma non indica la stazione: con il pass JR è la stazione JR, non quella Kintetsu.", stops:[stops.nara] },
    { from:"Osaka", to:"Miyajima e Hiroshima", mode:"Treno + traghetto", note:"Visita dell'isola lungo il trasferimento verso Hiroshima; il traghetto è compreso nel pass.", stops:[stops.shinOsaka, stops.miyajimaguchi, stops.miyajimaPier, stops.hiroshima] },
    { from:"Hiroshima", to:"Kyoto", mode:"Shinkansen Nozomi", note:"Partenza dopo le visite principali di Hiroshima.", stops:[stops.hiroshima, stops.kyoto] },
    { from:"Kyoto", to:"Kanazawa", mode:"Thunderbird + Shinkansen Tsurugi", note:"Cambio a Tsuruga verso la costa del Mar del Giappone.", stops:[stops.kyoto, stops.tsuruga, stops.kanazawa] },
    { from:"Kanazawa", to:"Shirakawa-go e Takayama", mode:"Bus", note:"Si parte dall'uscita ovest, non da quella est; sosta nel villaggio prima di Takayama.", stops:[stops.kanazawaWest, stops.ogimachi, stops.takayamaBus] },
    { from:"Takayama", to:"Matsumoto e Nagano", mode:"Bus + treno Shinano", note:"Il bus arriva al terminal di Matsumoto, che è staccato dalla stazione dei treni.", stops:[stops.takayamaBus, stops.matsumotoBus, stops.matsumoto, stops.nagano] },
    { from:"Nagano", to:"Tokyo", mode:"Bus", note:"Si parte dallo stallo 7 del piazzale della stazione e si arriva all'uscita sud di Busta Shinjuku.", stops:[stops.naganoBus, stops.bustaShinjuku] },
    { from:"Tokyo", to:"Aeroporto di Haneda", mode:"Metro + limousine bus", note:"Ginza fino a Mitsukoshimae, Hanzomon per una fermata, poi il bus dal T-CAT.", stops:[stops.tawaramachi, stops.mitsukoshimae, stops.suitengumae, stops.tcat, stops.haneda] }
  ];
})();
