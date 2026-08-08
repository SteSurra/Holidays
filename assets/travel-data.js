(function () {
  "use strict";

  // Only public names and practical area notes are published here.
  window.JAPAN_DATA.lodging = [
    { city:"osaka", name:"Hearton Hotel Kita Umeda", area:"Kita / Umeda", note:"Comodo per Umeda, Nakatsu e i collegamenti ferroviari verso le tappe successive." },
    { city:"hiroshima", name:"Smile Hotel Hiroshima", area:"Centro di Hiroshima", note:"Base centrale per il Parco della Pace, Hondori e la cucina serale della città." },
    { city:"kyoto", name:"The Royal Park Canvas Kyoto Nijo", area:"Nijo", note:"Vicino al castello e ben collegato ai quartieri orientali e alla stazione." },
    { city:"kanazawa", name:"Smile Hotel Kanazawa Nishiguchi Ekimae", area:"Uscita ovest della stazione", note:"Punto pratico per bus urbani, mercato Omicho e partenza verso Shirakawa-go." },
    { city:"takayama", name:"KOKO Hotel Hida Takayama", area:"Stazione / città vecchia", note:"A breve distanza dai bus e dalle vie storiche di Sanmachi." },
    { city:"nagano", name:"Hotel JAL City Nagano", area:"Stazione / Zenko-ji", note:"Tra la stazione e il tempio, utile sia per il centro sia per le escursioni." },
    { city:"tokyo", name:"Hotel Keihan Asakusa", area:"Asakusa", note:"Base nel quartiere storico, vicino a Senso-ji e ai collegamenti della metropolitana." }
  ];

  // Le fermate da cui si parte e a cui si arriva, con il nome giapponese da
  // mostrare a un passante e il collegamento a Google Maps: sono le stesse del
  // programma prenotato, ma qui sta solo il nome pubblico della stazione — mai
  // orari, codici o dati dei viaggiatori, che non entrano nella guida.
  // `search` è quello che si scrive in Maps quando il nome italiano non basta.
  const stops = {
    kix: { name:"Kansai Airport Station", jp:"関西空港駅", search:"Kansai Airport Station 関西空港駅" },
    shinOsaka: { name:"Shin-Osaka", jp:"新大阪駅", search:"Shin-Osaka Station 新大阪駅" },
    hiroshima: { name:"Hiroshima", jp:"広島駅", search:"Hiroshima Station 広島駅" },
    kyoto: { name:"Kyoto", jp:"京都駅", search:"Kyoto Station 京都駅" },
    tsuruga: { name:"Tsuruga", jp:"敦賀駅", search:"Tsuruga Station 敦賀駅" },
    kanazawa: { name:"Kanazawa", jp:"金沢駅", search:"Kanazawa Station 金沢駅" },
    kanazawaWest: { name:"Kanazawa, uscita ovest", jp:"金沢駅西口", search:"金沢駅西口 バスのりば" },
    ogimachi: { name:"Shirakawa-go, Ogimachi", jp:"白川郷（荻町）", search:"白川郷バスターミナル Shirakawago bus terminal" },
    takayamaBus: { name:"Takayama Nohi Bus Center", jp:"高山濃飛バスセンター", search:"高山濃飛バスセンター Takayama Nohi Bus Center" },
    matsumotoBus: { name:"Matsumoto Bus Terminal", jp:"松本バスターミナル", search:"松本バスターミナル Matsumoto Bus Terminal" },
    matsumoto: { name:"Matsumoto", jp:"松本駅", search:"Matsumoto Station 松本駅" },
    nagano: { name:"Nagano", jp:"長野駅", search:"Nagano Station 長野駅" },
    naganoBus: { name:"Nagano, stallo 7", jp:"長野駅 ７番のりば", search:"長野駅前 高速バスのりば" },
    bustaShinjuku: { name:"Busta Shinjuku", jp:"バスタ新宿", search:"バスタ新宿 Busta Shinjuku" },
    tawaramachi: { name:"Tawaramachi", jp:"田原町駅", search:"Tawaramachi Station 田原町駅 銀座線" },
    mitsukoshimae: { name:"Mitsukoshimae", jp:"三越前駅", search:"Mitsukoshimae Station 三越前駅" },
    suitengumae: { name:"Suitengumae", jp:"水天宮前駅", search:"Suitengumae Station 水天宮前駅" },
    tcat: { name:"Tokyo City Air Terminal", jp:"東京シティエアターミナル", search:"東京シティエアターミナル T-CAT" }
  };

  window.JAPAN_DATA.legs = [
    { from:"Aeroporto di Kansai", to:"Osaka", mode:"Treno Haruka", note:"Espresso dall'aeroporto alla base di Osaka.", stops:[stops.kix, stops.shinOsaka] },
    { from:"Osaka", to:"Nara e ritorno", mode:"Treno", note:"Escursione giornaliera con rientro alla base di Osaka." },
    { from:"Osaka", to:"Miyajima e Hiroshima", mode:"Treno + traghetto", note:"Visita dell'isola lungo il trasferimento verso Hiroshima.", stops:[stops.shinOsaka, stops.hiroshima] },
    { from:"Hiroshima", to:"Kyoto", mode:"Shinkansen Nozomi", note:"Partenza dopo le visite principali di Hiroshima.", stops:[stops.hiroshima, stops.kyoto] },
    { from:"Kyoto", to:"Kanazawa", mode:"Thunderbird + Shinkansen Tsurugi", note:"Cambio a Tsuruga verso la costa del Mar del Giappone.", stops:[stops.kyoto, stops.tsuruga, stops.kanazawa] },
    { from:"Kanazawa", to:"Shirakawa-go e Takayama", mode:"Bus", note:"Si parte dall'uscita ovest della stazione; sosta nel villaggio prima di Takayama.", stops:[stops.kanazawaWest, stops.ogimachi, stops.takayamaBus] },
    { from:"Takayama", to:"Matsumoto e Nagano", mode:"Bus + treno Shinano", note:"Bus fino al terminal di Matsumoto, poi treno per Nagano.", stops:[stops.takayamaBus, stops.matsumotoBus, stops.matsumoto, stops.nagano] },
    { from:"Nagano", to:"Tokyo", mode:"Bus", note:"Ultimo trasferimento verso la base di Asakusa.", stops:[stops.naganoBus, stops.bustaShinjuku] },
    { from:"Tokyo", to:"Aeroporto di Haneda", mode:"Metro + limousine bus", note:"Ginza fino a Mitsukoshimae, Hanzomon per una fermata, poi il bus dal T-CAT.", stops:[stops.tawaramachi, stops.mitsukoshimae, stops.suitengumae, stops.tcat] }
  ];
})();
