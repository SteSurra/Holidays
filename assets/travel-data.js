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

  window.JAPAN_DATA.legs = [
    { from:"Osaka", to:"Nara e ritorno", mode:"Treno", note:"Escursione giornaliera con rientro alla base di Osaka." },
    { from:"Osaka", to:"Miyajima e Hiroshima", mode:"Treno + traghetto", note:"Visita dell'isola lungo il trasferimento verso Hiroshima." },
    { from:"Hiroshima", to:"Kyoto", mode:"Treno", note:"Partenza dopo le visite principali di Hiroshima." },
    { from:"Kyoto", to:"Kanazawa", mode:"Treno", note:"Cambio di regione verso la costa del Mar del Giappone." },
    { from:"Kanazawa", to:"Shirakawa-go e Takayama", mode:"Bus", note:"Sosta nel villaggio prima di proseguire verso Takayama." },
    { from:"Takayama", to:"Matsumoto e Nagano", mode:"Bus + treno", note:"Sosta a Matsumoto prima della base a Nagano." },
    { from:"Nagano", to:"Tokyo", mode:"Bus", note:"Ultimo trasferimento verso la base di Asakusa." }
  ];
})();
