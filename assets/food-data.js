(function () {
  "use strict";
  function parse(text) {
    const fields = ["city","slug","name","jp","category","context","rating","local","description","imageQuery"];
    return text.trim().split("\n").filter(Boolean).map(function (line) {
      const values = line.split("|");
      return fields.reduce(function (item, field, index) { item[field] = values[index]; return item; }, {});
    });
  }

  const rows = parse(`
tokyo|edomae-sushi|Edomae sushi|江戸前寿司|secondi|ristorante|4.9|0|Nigiri nato a Edo: pesce marinato, cotto o stagionato sopra riso tiepido.|sushi nigiri Japan
tokyo|monjayaki|Monjayaki|もんじゃ焼き|primi|ristorante|4.3|1|Pastella morbida con cavolo e condimenti, cotta e mangiata sulla piastra.|monjayaki Tokyo
tokyo|tempura|Tempura|天ぷら|secondi|ristorante|4.8|0|Pesce e verdure avvolti in una pastella sottilissima e croccante.|tempura Japan
tokyo|edo-soba|Edo soba|江戸そば|primi|ristorante|4.6|0|Tagliolini di grano saraceno freddi con tsuyu o in brodo caldo.|zaru soba Japan
tokyo|unagi|Unagi kabayaki|うなぎ蒲焼|secondi|ristorante|4.8|0|Anguilla laccata con salsa dolce-salata e grigliata sul carbone.|unagi kabayaki
tokyo|fukagawa-meshi|Fukagawa-meshi|深川めし|primi|ristorante|4.4|1|Riso con vongole asari e miso, piatto dei pescatori della vecchia Tokyo.|Fukagawa meshi
tokyo|chanko|Chanko nabe|ちゃんこ鍋|secondi|ristorante|4.6|1|Pentola ricca di carne, pesce, tofu e verdure legata al sumo.|chanko nabe
tokyo|ningyoyaki|Ningyo-yaki|人形焼|dolci|street food|4.4|0|Dolcetti a forma di bambola o lanterna ripieni di anko.|ningyoyaki Asakusa
tokyo|anmitsu|Anmitsu|あんみつ|dolci|sala da tè|4.4|1|Gelatina kanten, frutta, anko e sciroppo nero kuromitsu.|anmitsu Japan
tokyo|taiyaki|Taiyaki|たい焼き|dolci|street food|4.7|0|Cialda a forma di pesce ripiena di fagioli rossi o crema.|taiyaki Japan
tokyo|yakitori|Yakitori|焼き鳥|secondi|izakaya|4.7|0|Spiedini di pollo e frattaglie alla brace, con sale o tare.|yakitori Japan
tokyo|shoyu-ramen|Tokyo shoyu ramen|東京醤油ラーメン|primi|ramen-ya|4.7|0|Brodo limpido alla soia, noodle ondulati, chashu e menma.|Tokyo shoyu ramen
tokyo|tonkatsu|Tonkatsu|とんかつ|secondi|ristorante|4.7|0|Cotoletta di maiale impanata panko con cavolo e salsa speziata.|tonkatsu Japan
tokyo|tamagoyaki|Tamagoyaki|玉子焼き|street|mercato|4.5|0|Omelette arrotolata, dolce e succosa, servita anche su stecco.|tamagoyaki Tsukiji
tokyo|dojo-nabe|Dojo nabe|どじょう鍋|secondi|ristorante|4.0|1|Cobite stufato in pentola bassa: cucina popolare Edo per curiosi.|dojo nabe Tokyo
kamakura|shirasu-don|Shirasu-don|しらす丼|primi|ristorante|4.6|0|Riso coperto da piccoli bianchetti cotti, specialità della costa Shonan.|shirasu don Kamakura
kamakura|nama-shirasu|Nama shirasu|生しらす|secondi|ristorante|4.3|1|Bianchetti crudi traslucidi, disponibili soltanto quando il mare consente la pesca.|nama shirasu Japan
kamakura|kamakura-yasai|Verdure Kamakura|鎌倉野菜|contorni|ristorante|4.5|1|Ortaggi locali colorati, spesso grigliati o serviti in insalate curate.|Kamakura vegetables
kamakura|kenchin-jiru|Kenchin-jiru|けんちん汁|secondi|tempio|4.4|1|Zuppa vegetariana di radici, tofu e konnyaku nata nella cucina zen.|kenchin jiru
kamakura|hato-sabure|Hato Sabure|鳩サブレー|dolci|pasticceria|4.4|0|Biscotto al burro a forma di colomba, simbolo commestibile della città.|Hato Sabure Kamakura
kamakura|daibutsu-yaki|Daibutsu-yaki|大仏焼き|dolci|street food|4.2|1|Dolcetto cotto nello stampo del Grande Buddha con ripieni diversi.|Daibutsu yaki Kamakura
kamakura|murasaki-imo|Soft cream alla patata viola|紫いもソフト|dolci|street food|4.5|0|Gelato viola, cremoso e leggermente terroso, facilissimo da riconoscere.|purple sweet potato soft cream Japan
kamakura|matcha-sweets|Dolci al matcha|抹茶菓子|dolci|sala da tè|4.5|0|Parfait, mochi e torte al tè verde lungo Komachi-dori.|matcha parfait Kamakura
hakone|kuro-tamago|Kuro-tamago|黒たまご|street|street food|4.3|0|Uova cotte nelle acque vulcaniche di Owakudani, dal guscio nero.|kuro tamago Hakone
hakone|yuba-don|Yuba-don|湯葉丼|primi|ristorante|4.5|1|Riso con sfoglie di tofu in dashi e uovo, morbido e confortante.|yuba don Hakone
hakone|hakone-soba|Hakone soba|箱根そば|primi|ristorante|4.4|0|Soba di montagna, spesso con tororo, funghi o verdure selvatiche.|soba Hakone
hakone|kamaboko|Odawara kamaboko|小田原かまぼこ|secondi|negozio|4.2|1|Panetto elastico di pesce bianco cotto al vapore.|Odawara kamaboko
hakone|onsen-manju|Onsen manju|温泉まんじゅう|dolci|street food|4.3|0|Panino dolce al vapore con anko, classico delle località termali.|onsen manju Hakone
hakone|amazake|Amazake|甘酒|bevande|sala da tè|4.2|1|Bevanda dolce e cremosa di riso fermentato, spesso quasi analcolica.|amazake Japan
hakone|tofu-katsuni|Tofu katsuni|豆腐かつ煮|secondi|ristorante|4.3|1|Tofu fritto stufato con uovo e dashi, morbido e saporito.|tofu katsuni Hakone
hakone|yosegi-wagashi|Wagashi di Hakone|箱根和菓子|dolci|pasticceria|4.2|1|Dolci stagionali decorati con motivi ispirati al mosaico yosegi.|wagashi Hakone
matsumoto|sanzoku-yaki|Sanzoku-yaki|山賊焼|secondi|izakaya|4.7|0|Grande coscia di pollo marinata all'aglio, impanata e fritta.|sanzoku yaki Matsumoto
matsumoto|shinshu-soba|Shinshu soba|信州そば|primi|ristorante|4.7|0|Soba profumata grazie al clima fresco e secco di Nagano.|Shinshu soba
matsumoto|basashi|Basashi|馬刺し|secondi|izakaya|4.2|1|Fettine di cavallo crude con zenzero, aglio e salsa di soia.|basashi Japan
matsumoto|nozawana|Nozawana-zuke|野沢菜漬け|contorni|izakaya|4.3|1|Foglie di rapa in salamoia, croccanti e leggermente piccanti.|nozawana pickles
matsumoto|shinshu-miso|Shinshu miso|信州味噌|contorni|ristorante|4.4|1|Miso chiaro e fragrante prodotto in una regione storica.|Shinshu miso
matsumoto|gyunyu-pan|Gyunyu pan|牛乳パン|dolci|panetteria|4.5|1|Pane soffice rettangolare con uno spesso strato di crema al latte.|gyunyu pan Nagano
matsumoto|gohei-mochi|Gohei mochi|五平餅|street|street food|4.5|0|Riso pestato su stecco, glassato con miso e noci e grigliato.|gohei mochi
matsumoto|oyaki|Oyaki|おやき|street|panetteria|4.5|0|Focaccina rustica ripiena di verdure, miso o anko.|oyaki Nagano
nagano|oyaki|Oyaki|おやき|street|street food|4.6|0|Panino rustico con nozawana, zucca o melanzane.|oyaki Nagano
nagano|sobagaki|Sobagaki|そばがき|primi|ristorante|4.1|1|Impasto caldo di farina di grano saraceno, antenato morbido della soba.|sobagaki
nagano|oshibori-udon|Oshibori udon|おしぼりうどん|primi|ristorante|4.2|1|Udon da intingere in succo piccante di daikon e miso.|oshibori udon
nagano|shinshu-salmon|Shinshu salmon|信州サーモン|secondi|ristorante|4.5|1|Pesce allevato in acqua di montagna, dalla carne fine e poco grassa.|Shinshu salmon
nagano|kuri-kinton|Kuri kinton|栗きんとん|dolci|pasticceria|4.5|0|Purea di castagne dolce modellata a mano, specialità autunnale.|kuri kinton Japan
nagano|hachinoko|Hachinoko|蜂の子|secondi|izakaya|3.7|1|Larve di ape cotte in salsa dolce di soia, tradizione montana.|hachinoko Japan
nagano|inago|Inago no tsukudani|いなごの佃煮|secondi|mercato|3.8|1|Cavallette caramellate con soia e zucchero, croccanti e intense.|inago tsukudani
nagano|apple-pie|Torta di mele Shinshu|信州りんごパイ|dolci|pasticceria|4.6|0|Mele locali profumate dentro pie, dorayaki e dolci da viaggio.|Nagano apple pie
nagano|sauce-katsudon|Sauce katsudon|ソースカツ丼|primi|ristorante|4.6|1|Riso con cotoletta di maiale immersa in salsa scura e cavolo.|sauce katsudon Nagano
kanazawa|kaisendon|Kaisen-don|海鮮丼|primi|mercato|4.8|0|Riso coperto con pescato del Mar del Giappone, perfetto a Omicho.|kaisendon Kanazawa
kanazawa|jibuni|Jibuni|治部煮|secondi|ristorante|4.5|1|Anatra o pollo infarinato, stufato con verdure, funghi e wasabi.|jibuni Kanazawa
kanazawa|nodoguro|Nodoguro|のどぐろ|secondi|ristorante|4.9|1|Pesce dalla gola nera, grasso e delicato, ottimo grigliato.|nodoguro fish
kanazawa|gold-ice|Gelato alla foglia d'oro|金箔ソフト|dolci|street food|4.2|0|Soft cream ricoperto da una foglia d'oro intera, molto scenografico.|gold leaf ice cream Kanazawa
kanazawa|hanton|Hanton rice|ハントンライス|primi|ristorante|4.4|1|Omurice con pesce fritto, ketchup e salsa tartara.|Hanton rice
kanazawa|kaburazushi|Kabura-zushi|かぶら寿司|secondi|mercato|4.0|1|Rapa fermentata con ricciola tra strati di koji.|kaburazushi
kanazawa|oden|Kanazawa oden|金沢おでん|secondi|izakaya|4.5|1|Ingredienti locali come kurumabu e radici in brodo dashi.|Kanazawa oden
kanazawa|iwagaki|Iwagaki|岩牡蠣|secondi|mercato|4.7|1|Grande ostrica di roccia estiva, carnosa e minerale.|iwagaki oyster Japan
kanazawa|kaga-wagashi|Wagashi di Kaga|加賀和菓子|dolci|sala da tè|4.6|0|Dolci raffinati legati alla cultura del tè e alle stagioni.|Kanazawa wagashi
kanazawa|kaga-yasai|Verdure Kaga|加賀野菜|contorni|ristorante|4.4|1|Varietà tradizionali come zucca uchiuri e radice di loto.|Kaga vegetables Kanazawa
shirakawago|hoba-miso|Hoba miso|朴葉味噌|secondi|ristorante|4.7|0|Miso, cipollotto e funghi cotti su una foglia di magnolia.|hoba miso
shirakawago|hida-skewer|Spiedino di manzo Hida|飛騨牛串|secondi|street food|4.8|0|Cubetti marezzati di manzo Hida grigliati al momento.|Hida beef skewer
shirakawago|gohei-mochi|Gohei mochi|五平餅|street|street food|4.5|0|Riso schiacciato, salsa di miso e noci, bordi caramellati.|gohei mochi Shirakawago
shirakawago|tochimochi|Tochi mochi|栃餅|dolci|negozio|4.3|1|Mochi con castagne d'ippocastano trattate, dal gusto rustico.|tochi mochi Japan
shirakawago|iwana|Iwana alla brace|岩魚塩焼き|secondi|ristorante|4.5|1|Salmerino di torrente infilzato intero e grigliato con sale.|iwana grilled fish Japan
shirakawago|doburoku|Doburoku|どぶろく|bevande|izakaya|4.1|1|Sake rustico non filtrato, bianco e cremoso.|doburoku sake
shirakawago|sansai-soba|Sansai soba|山菜そば|primi|ristorante|4.3|1|Soba calda con felci e verdure selvatiche di montagna.|sansai soba
takayama|hida-sushi|Hida beef sushi|飛騨牛寿司|secondi|street food|4.8|0|Manzo Hida scottato su riso, spesso su una cialda commestibile.|Hida beef sushi Takayama
takayama|hoba-miso|Hoba miso|朴葉味噌|secondi|ristorante|4.7|0|Miso tostato su foglia di magnolia, da mescolare al riso.|hoba miso Takayama
takayama|takayama-ramen|Takayama ramen|高山ラーメン|primi|ramen-ya|4.6|0|Noodle sottili in brodo di pollo, pesce secco e soia.|Takayama ramen
takayama|mitarashi|Mitarashi dango di Hida|みたらし団子|street|street food|4.6|0|Palline di riso grigliate con soia, meno dolci della versione Kyoto.|mitarashi dango Takayama
takayama|tsukemono-steak|Tsukemono steak|漬物ステーキ|secondi|izakaya|4.3|1|Verdure in salamoia saltate sulla piastra con uovo.|tsukemono steak
takayama|hida-croquette|Crocchetta di manzo Hida|飛騨牛コロッケ|street|street food|4.5|0|Crocchetta calda di patate con piccoli pezzi di manzo.|Hida beef croquette
takayama|gohei-mochi|Gohei mochi|五平餅|street|mercato|4.4|0|Riso pestato su stecco con salsa locale di miso e noci.|gohei mochi Takayama
takayama|hoba-zushi|Hoba-zushi|朴葉寿司|primi|ristorante|4.2|1|Riso sushi e ingredienti stagionali avvolti in foglia di magnolia.|hoba sushi
takayama|local-sake|Sake di Hida|飛騨の地酒|bevande|sakagura|4.6|0|Sake di acqua alpina, assaggiabile nei birrifici di Sanmachi.|Takayama sake brewery
kyoto|kaiseki|Kaiseki|懐石料理|secondi|ristorante|4.8|0|Sequenza stagionale di piccoli piatti, ceramiche e tecniche raffinate.|kaiseki Kyoto
kyoto|yudofu|Yudofu|湯豆腐|secondi|ristorante|4.4|0|Tofu scaldato con kombu e condito al tavolo, cucina dei templi.|yudofu Kyoto
kyoto|nishin-soba|Nishin soba|にしんそば|primi|ristorante|4.4|1|Soba calda con aringa dolce-salata cotta lentamente.|nishin soba Kyoto
kyoto|obanzai|Obanzai|おばんざい|contorni|izakaya|4.7|0|Piccoli piatti casalinghi di verdure, tofu e ingredienti locali.|obanzai Kyoto
kyoto|yatsuhashi|Yatsuhashi|八ツ橋|dolci|negozio|4.5|0|Sfoglia morbida di riso e cannella, spesso ripiena di anko.|yatsuhashi Kyoto
kyoto|matcha-parfait|Matcha parfait|抹茶パフェ|dolci|sala da tè|4.7|0|Gelato, gelatina, anko e mochi intorno al matcha di Uji.|matcha parfait Kyoto
kyoto|namafu|Nama-fu dengaku|生麩田楽|secondi|ristorante|4.3|1|Glutine di frumento morbido e colorato, grigliato con miso.|nama fu dengaku Kyoto
kyoto|hamo|Hamo|鱧|secondi|ristorante|4.5|1|Grongo finemente inciso per neutralizzare le lische, protagonista estivo.|hamo Kyoto cuisine
kyoto|sabazushi|Saba-zushi|鯖寿司|primi|ristorante|4.5|1|Sushi pressato di sgombro marinato nato lungo le vie del pesce.|saba sushi Kyoto
kyoto|tsukemono|Kyo-tsukemono|京漬物|contorni|mercato|4.3|0|Verdure in salamoia come suguki, shibazuke e senmaizuke.|Kyoto tsukemono
kyoto|dashimaki|Dashimaki tamago|だし巻き卵|secondi|mercato|4.6|0|Omelette arrotolata molto succosa grazie al dashi.|dashimaki tamago Kyoto
kyoto|tofu-donuts|Ciambelle di tofu|豆腐ドーナツ|dolci|street food|4.3|1|Piccole ciambelle soffici preparate con tofu o latte di soia.|tofu donuts Kyoto
kyoto|warabi-mochi|Warabi mochi|わらび餅|dolci|sala da tè|4.6|0|Cubetti tremolanti di amido di felce con kinako e kuromitsu.|warabi mochi Kyoto
nara|kakinoha|Kakinoha-zushi|柿の葉寿司|primi|ristorante|4.6|0|Sushi pressato di sgombro o salmone avvolto in foglia di cachi.|kakinoha sushi Nara
nara|miwa-somen|Miwa somen|三輪そうめん|primi|ristorante|4.5|0|Noodle sottilissimi, freddi d'estate o in brodo nyumen.|Miwa somen Nara
nara|chagayu|Chagayu|茶粥|primi|ristorante|4.1|1|Porridge di riso cotto nel tè tostato, colazione tradizionale.|chagayu Nara
nara|narazuke|Narazuke|奈良漬|contorni|negozio|4.0|1|Verdure scure fermentate nelle fecce di sake, aromatiche e alcoliche.|narazuke
nara|kaki-sweets|Dolci al cachi|柿菓子|dolci|pasticceria|4.3|1|Cachi secchi, gelatine e wagashi legati al frutto della zona.|persimmon sweets Nara
nara|kuzu-mochi|Kuzu mochi|葛餅|dolci|sala da tè|4.4|1|Gelatina traslucida di kudzu con kinako e kuromitsu.|kuzu mochi Nara
nara|yomogi-mochi|Yomogi mochi|よもぎ餅|dolci|street food|4.7|0|Mochi verde all'artemisia, pestato velocemente e riempito di anko.|yomogi mochi Nara
nara|shika-manju|Manju di Nara|奈良まんじゅう|dolci|street food|4.2|1|Dolcetti a vapore decorati con cervi o motivi antichi.|Nara manju deer
nara|asuka-nabe|Asuka nabe|飛鳥鍋|secondi|ristorante|4.3|1|Pentola di pollo e verdure in brodo di latte e miso.|Asuka nabe Nara
osaka|takoyaki|Takoyaki|たこ焼き|street|street food|4.8|0|Sfere con polpo, salsa, maionese, aonori e katsuobushi danzante.|takoyaki Osaka
osaka|okonomiyaki|Okonomiyaki Osaka|大阪お好み焼き|secondi|ristorante|4.8|0|Pancake salato con cavolo e ingredienti mescolati nella pastella.|Osaka okonomiyaki
osaka|kushikatsu|Kushikatsu|串カツ|secondi|izakaya|4.7|0|Spiedini impanati e fritti di carne, verdure e formaggio.|kushikatsu Osaka
osaka|kitsune-udon|Kitsune udon|きつねうどん|primi|ristorante|4.5|0|Udon in brodo con grande fetta di tofu fritto dolce.|kitsune udon Osaka
osaka|doteyaki|Doteyaki|どて焼き|secondi|izakaya|4.6|1|Tendine di manzo stufato lentamente con miso bianco.|doteyaki Osaka
osaka|negiyaki|Negiyaki|ねぎ焼き|secondi|ristorante|4.5|1|Pancake sottile carico di cipollotto e condito con soia.|negiyaki Osaka
osaka|ikayaki|Ikayaki|いか焼き|street|street food|4.4|1|Crêpe salata pressata con pezzi di calamaro.|ikayaki Osaka
osaka|butaman|Butaman|豚まん|street|street food|4.7|0|Grande panino al vapore ripieno di maiale e cipolla.|butaman Osaka
osaka|oshizushi|Osaka oshizushi|大阪押し寿司|primi|ristorante|4.4|1|Sushi pressato in scatola con pesce cotto o marinato.|oshizushi Osaka
osaka|horumon|Horumon-yaki|ホルモン焼き|secondi|izakaya|4.3|1|Frattaglie marinate e grigliate, amate per consistenze e sapore.|horumon yaki Osaka
osaka|tecchiri|Tecchiri|てっちり|secondi|ristorante|4.4|1|Pentola di fugu, tofu e verdure, solo in locali autorizzati.|tecchiri fugu Osaka
osaka|udonsuki|Udon-suki|うどんすき|primi|ristorante|4.5|1|Pentola di udon, pesce, pollo e verdure in dashi.|udon suki Osaka
osaka|taiko-manju|Taiko manju|太鼓饅頭|dolci|street food|4.3|1|Tortino tondo cotto su piastra e ripieno di anko o crema.|taiko manju Osaka
osaka|mixed-juice|Mixed juice|ミックスジュース|bevande|caffè|4.5|1|Frullato denso di banana, agrumi e frutta, nato nei kissaten.|Osaka mixed juice
hiroshima|hiroshima-okonomi|Okonomiyaki Hiroshima|広島お好み焼き|primi|ristorante|4.9|0|Strati di pastella, cavolo, maiale, noodle e uovo sulla piastra.|Hiroshima okonomiyaki
hiroshima|anagomeshi|Anago-meshi|あなご飯|primi|ristorante|4.8|0|Grongo grigliato e laccato disposto sul riso saporito.|anagomeshi Hiroshima
hiroshima|oysters|Ostriche di Hiroshima|広島牡蠣|secondi|ristorante|4.8|0|Grandi ostriche crude, grigliate, fritte o al vapore.|Hiroshima oysters
hiroshima|momiji|Momiji manju|もみじ饅頭|dolci|pasticceria|4.6|0|Tortina a foglia d'acero con anko, crema o matcha.|momiji manju
hiroshima|tantanmen|Shirunashi tantanmen|汁なし担担麺|primi|ristorante|4.7|1|Noodle senza brodo con carne, sesamo, peperoncino e sansho.|Hiroshima shirunashi tantanmen
hiroshima|kone|Kone|コウネ|secondi|izakaya|4.4|1|Taglio sottile e grasso della spalla bovina, grigliato con limone.|kone beef Hiroshima
hiroshima|lemon-sweets|Dolci al limone di Setouchi|瀬戸内レモン菓子|dolci|pasticceria|4.5|1|Torte, biscotti e gelatine profumati con limoni del Mare Interno.|Setouchi lemon sweets
hiroshima|hiroshima-tsukemen|Hiroshima tsukemen|広島つけ麺|primi|ristorante|4.5|1|Noodle freddi con verdure e salsa rossa piccante al sesamo.|Hiroshima tsukemen
hiroshima|kaki-dotenabe|Kaki no dotenabe|牡蠣の土手鍋|secondi|ristorante|4.6|1|Ostriche e verdure in pentola con una parete di miso.|kaki dotenabe Hiroshima
miyajima|grilled-oysters|Ostriche alla griglia|焼き牡蠣|secondi|street food|4.8|0|Ostriche aperte sul fuoco, carnose e servite nel guscio.|grilled oysters Miyajima
miyajima|anagomeshi|Anago-meshi|あなご飯|primi|ristorante|4.9|0|Grongo dolce-affumicato sopra riso cotto nel suo brodo.|anagomeshi Miyajima
miyajima|momiji|Momiji manju|もみじ饅頭|dolci|pasticceria|4.6|0|Tortina morbida a foglia d'acero, ottima appena sfornata.|momiji manju Miyajima
miyajima|age-momiji|Age momiji|揚げもみじ|dolci|street food|4.7|0|Momiji manju su stecco, pastellato e fritto.|age momiji Miyajima
miyajima|oyster-curry-pan|Oyster curry pan|牡蠣カレーパン|street|street food|4.4|1|Pane fritto ripieno di curry e ostriche.|oyster curry bread Miyajima
miyajima|nigiriten|Nigiri-ten|にぎり天|street|street food|4.4|1|Spiedino caldo di pasta di pesce con formaggio o polpo.|nigiriten Miyajima
miyajima|momiji-croissant|Momiji croissant|もみじクロワッサン|dolci|panetteria|4.3|1|Croissant a forma d'acero con ripieni stagionali.|momiji croissant Miyajima
`);

  const foodCategories = {
    primi:"Primi e riso", secondi:"Secondi", street:"Street food",
    dolci:"Dolci", contorni:"Contorni", bevande:"Bevande"
  };
  const allowedCities = new Set(window.__JAPAN_PARTIAL__.cities.map(function (city) { return city.id; }));
  const foods = rows.filter(function (row) { return allowedCities.has(row.city); }).map(function (row) {
    row.id = "food-" + row.city + "-" + row.slug;
    row.rating = Number(row.rating);
    row.local = row.local === "1";
    row.type = "food";
    return row;
  });
  window.__JAPAN_PARTIAL__.foods = foods;
  window.__JAPAN_PARTIAL__.labels.foodCategories = foodCategories;
})();
