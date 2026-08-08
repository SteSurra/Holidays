(function () {
  "use strict";

  const source = function (title, url, kind) {
    return { title:title, url:url, kind:kind };
  };

  // Registro gemello di quello in experiences-data.js: qui le pagine-guida
  // per la ricerca, lì le pagine-attività che firmano le schede. Chi aggiorna
  // un ente turistico deve guardare in entrambi.
  window.JAPAN_RESEARCH_SOURCES = {
    general: {
      food: [
        source("JNTO · Gastronomia giapponese", "https://www.japan.travel/en/gastronomy/", "turismo nazionale"),
        source("MAFF · Cucine regionali", "https://www.maff.go.jp/e/policies/market/k_ryouri/index.html", "ministero"),
        source("MAFF · Cibi tradizionali", "https://www.maff.go.jp/e/policies/market/dento_syoku/index.html", "ministero")
      ],
      culture: [
        source("Agency for Cultural Affairs · Cultural Properties", "https://www.bunka.go.jp/english/policy/cultural_properties/", "ente culturale"),
        source("JNTO · Patrimonio culturale", "https://www.japan.travel/en/guide/japans-cultural-heritage/", "turismo nazionale")
      ],
      etiquette: [
        source("JNTO · Food etiquette", "https://www.japan.travel/en/guide/japanese-food-etiquette/", "turismo nazionale")
      ],
      shopping: [
        source("JNTO · Shopping in Japan", "https://www.japan.travel/en/things-to-do/shopping/", "turismo nazionale")
      ],
      restaurants: [
        source("Tabelog · Ricerca ristoranti", "https://tabelog.com/en/rstLst.php", "catalogo ristoranti")
      ],
      safety: [
        source("JNTO · Emergenze", "https://www.japan.travel/en/plan/emergencies/", "turismo nazionale"),
        source("JNTO · Safety Tips", "https://www.jnto.go.jp/safety-tips/eng/", "sicurezza ufficiale")
      ]
    },
    cities: {
      osaka: [source("Osaka Info · Guida ufficiale", "https://www.osaka-info.jp/en/osaka/", "turismo locale"), source("Osaka Info · Cibo", "https://www.osaka-info.jp/en/osaka/food/", "turismo locale")],
      nara: [source("Visit Nara · Destinazioni", "https://www.visitnara.jp/destinations/", "turismo locale"), source("Visit Nara · Cosa fare", "https://www.visitnara.jp/see-and-do/", "turismo locale")],
      miyajima: [source("Miyajima Tourist Association", "https://www.miyajima.or.jp/english/", "turismo locale")],
      hiroshima: [source("Dive Hiroshima · Guida ufficiale", "https://dive-hiroshima.com/en/", "turismo locale"), source("Hiroshima Prefecture · Food", "https://www.pref.hiroshima.lg.jp/site/english/food.html", "ente locale")],
      kyoto: [source("Kyoto City Official Travel Guide", "https://kyoto.travel/en/", "turismo locale"), source("JNTO · Kyoto", "https://www.japan.travel/en/destinations/kansai/kyoto/", "turismo nazionale")],
      kanazawa: [source("Visit Kanazawa · Attrazioni", "https://visitkanazawa.jp/en/attractions/", "turismo locale"), source("Visit Kanazawa · Attività", "https://visitkanazawa.jp/en/activities/", "turismo locale")],
      shirakawago: [source("Shirakawa-go Tourist Association", "https://shirakawa-go.gr.jp/en/", "turismo locale")],
      takayama: [source("Hida Takayama Official Travel Guide", "https://www.hida.jp/english/", "turismo locale")],
      matsumoto: [source("Visit Matsumoto", "https://visitmatsumoto.com/en/index.html", "turismo locale")],
      nagano: [source("Go Nagano · Guida ufficiale", "https://www.go-nagano.net/en/", "turismo locale")],
      tokyo: [source("GO TOKYO · Attrazioni", "https://www.gotokyo.org/en/see-and-do/attractions/", "turismo locale"), source("GO TOKYO · Guide", "https://www.gotokyo.org/en/story-and-guide/index.html", "turismo locale")]
    },
    restaurantDiscovery: {
      osaka:"https://tabelog.com/en/osaka/rstLst/", nara:"https://tabelog.com/en/nara/rstLst/", miyajima:"https://tabelog.com/en/hiroshima/rstLst/", hiroshima:"https://tabelog.com/en/hiroshima/rstLst/", kyoto:"https://tabelog.com/en/kyoto/rstLst/", kanazawa:"https://tabelog.com/en/ishikawa/rstLst/", shirakawago:"https://tabelog.com/en/gifu/rstLst/", takayama:"https://tabelog.com/en/gifu/rstLst/", matsumoto:"https://tabelog.com/en/nagano/rstLst/", nagano:"https://tabelog.com/en/nagano/rstLst/", tokyo:"https://tabelog.com/en/tokyo/rstLst/"
    }
  };
})();
