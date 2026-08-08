(function () {
  "use strict";

  // Le linee della metropolitana, con il loro colore ufficiale.
  //
  // In Giappone ogni stazione della metro porta un codice fatto di una lettera e
  // un numero — M18, Z08, K11 — dove la lettera è la linea. OpenStreetMap lo
  // registra nel tag "ref", e ogni linea ha il suo nodo stazione: a Otemachi ne
  // esistono cinque, uno per linea, non uno solo con cinque nomi. Basta quindi
  // la lettera per sapere su quale linea sei, senza scaricare le relazioni dei
  // percorsi, che pesano centinaia di volte di più.
  //
  // La lettera da sola però non basta: la M di Tokyo è la Marunouchi, quella di
  // Osaka è la Midosuji. Serve l'operatore, e quando manca — succede — la città
  // più vicina.
  const networks = [
    {
      id: "tokyo-metro",
      name: "Tokyo Metro",
      match: ["東京地下鉄", "東京メトロ", "Tokyo Metro"],
      cities: ["tokyo"],
      lines: {
        G: { name: "Ginza", color: "#ff9500" },
        M: { name: "Marunouchi", color: "#f62e36" },
        H: { name: "Hibiya", color: "#9caeb7" },
        T: { name: "Tozai", color: "#009bbf" },
        C: { name: "Chiyoda", color: "#00bb85" },
        Y: { name: "Yurakucho", color: "#c1a470" },
        Z: { name: "Hanzomon", color: "#8f76d6" },
        N: { name: "Namboku", color: "#00ac9b" },
        F: { name: "Fukutoshin", color: "#9c5e31" }
      }
    },
    {
      id: "toei",
      name: "Toei",
      match: ["東京都交通局", "都営地下鉄", "Toei"],
      cities: ["tokyo"],
      lines: {
        A: { name: "Asakusa", color: "#ef454a" },
        I: { name: "Mita", color: "#006ab8" },
        S: { name: "Shinjuku", color: "#6cbb5a" },
        E: { name: "Oedo", color: "#b6007a" }
      }
    },
    {
      id: "osaka-metro",
      name: "Osaka Metro",
      match: ["大阪市高速電気軌道", "大阪市営地下鉄", "Osaka Metro"],
      cities: ["osaka"],
      lines: {
        M: { name: "Midosuji", color: "#e5171f" },
        T: { name: "Tanimachi", color: "#814487" },
        Y: { name: "Yotsubashi", color: "#0078ba" },
        C: { name: "Chuo", color: "#019a66" },
        S: { name: "Sennichimae", color: "#e44d93" },
        K: { name: "Sakaisuji", color: "#814721" },
        N: { name: "Nagahori Tsurumi-ryokuchi", color: "#a9cc51" },
        I: { name: "Imazatosuji", color: "#ee7b1a" },
        P: { name: "Nanko Port Town", color: "#00a7db" }
      }
    },
    {
      id: "kyoto-subway",
      name: "Kyoto Municipal Subway",
      match: ["京都市交通局", "Kyoto Municipal"],
      cities: ["kyoto"],
      lines: {
        K: { name: "Karasuma", color: "#009a44" },
        T: { name: "Tozai", color: "#e04e39" }
      }
    }
  ];

  const UNKNOWN_LINE = { name: "", color: "#6c7b86" };

  // tags = i tag OSM della stazione, cityId = la tappa più vicina (serve solo
  // quando l'operatore non è scritto).
  function lineFor(tags, cityId) {
    const ref = String((tags && tags.ref) || "").trim().toUpperCase();
    const letter = ref.slice(0, 1);
    if (!/^[A-Z]$/.test(letter)) return null;
    const haystack = [tags.operator, tags["operator:en"], tags.network, tags["network:en"]].filter(Boolean).join(" ");
    let network = networks.find(function (candidate) {
      return candidate.match.some(function (needle) { return haystack.indexOf(needle) !== -1; });
    });
    if (!network) network = networks.find(function (candidate) { return candidate.cities.indexOf(cityId) !== -1; });
    const line = network && network.lines[letter];
    if (!line) return { code: ref, name: "", color: UNKNOWN_LINE.color, network: network ? network.name : "" };
    return { code: ref, name: line.name, color: line.color, network: network.name };
  }

  window.JAPAN_TRANSIT = { networks: networks, lineFor: lineFor, unknownColor: UNKNOWN_LINE.color };
})();
