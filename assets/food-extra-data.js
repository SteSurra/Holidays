(function () {
  "use strict";

  const data = window.JAPAN_DATA;
  const fields = ["city", "slug", "name", "jp", "category", "context", "rating", "local", "description", "imageQuery", "aliases"];
  const sourceUrl = "https://www.japan.travel/en/gastronomy/";

  function parseRows(text) {
    // Parser condiviso in parse-lib.js; qui le colonne mancanti diventano "".
    return window.TABI_PARSE.table(text, fields, { fill: "" });
  }

  const rows = parseRows(`
all|japanese-curry|Curry rice giapponese|カレーライス|primi|ristorante|4.7|0|Riso bianco con curry denso, dolce-speziato e spesso arricchito con verdure e carne.|Japanese curry rice kare raisu|kare raisu;curry giapponese
all|katsu-curry|Katsu curry|カツカレー|primi|ristorante|4.8|0|Curry giapponese versato su riso e cotoletta di maiale croccante tagliata a strisce.|Japanese katsu curry rice|curry con cotoletta
all|omurice|Omurice|オムライス|primi|ristorante|4.7|0|Riso saltato avvolto o coperto da una frittata morbida, spesso con ketchup o salsa demi-glace.|Japanese omurice omelette rice|omu rice;omelette rice
all|gyudon|Gyudon|牛丼|primi|ristorante|4.6|0|Ciotola di riso con fettine di manzo e cipolla cotte in salsa dolce-salata.|Japanese gyudon beef bowl|beef bowl
all|oyakodon|Oyakodon|親子丼|primi|ristorante|4.7|0|Riso coperto da pollo, cipolla e uovo appena rappreso nel dashi. Il nome gioca su genitore e figlio.|Japanese oyakodon chicken egg rice bowl|pollo e uovo
all|katsudon|Katsudon|カツ丼|primi|ristorante|4.7|0|Cotoletta di maiale, uovo e cipolla su riso, più morbida e succosa del tonkatsu servito da solo.|Japanese katsudon pork cutlet bowl|cotoletta su riso
all|tendon|Tendon|天丼|primi|ristorante|4.7|0|Tempura di gamberi o verdure sopra riso con salsa tentsuyu dolce-salata.|Japanese tendon tempura rice bowl|tempura donburi
all|unadon|Unadon|鰻丼|primi|ristorante|4.8|0|Anguilla laccata alla griglia su riso, profumata di carbone e salsa tare.|Japanese unadon grilled eel rice bowl|unagi donburi
all|ochazuke|Ochazuke|お茶漬け|primi|izakaya|4.4|0|Riso su cui si versa tè verde o dashi, completato con salmone, umeboshi, alga o sesamo.|Japanese ochazuke tea rice|cha zuke
all|takikomi-gohan|Takikomi gohan|炊き込みご飯|primi|ristorante|4.5|0|Riso cotto insieme a dashi, funghi, radici, pollo o ingredienti stagionali.|Japanese takikomi gohan mixed rice|kayaku gohan
all|tamago-kake-gohan|Tamago kake gohan|卵かけご飯|primi|ristorante|4.4|1|Uovo crudo sicuro per il consumo locale mescolato a riso caldo e salsa di soia.|Japanese tamago kake gohan raw egg rice|tkg;uovo crudo riso
all|japanese-breakfast|Colazione giapponese|和朝食|primi|ristorante|4.6|0|Set con riso, zuppa di miso, pesce grigliato, sottaceti, alga e piccoli contorni.|Traditional Japanese breakfast set|washoku breakfast
all|tsukemen|Tsukemen|つけ麺|primi|ramen-ya|4.7|0|Noodle serviti separati da un brodo molto concentrato in cui si intingono boccone per boccone.|Japanese tsukemen dipping noodles|dipping ramen
all|abura-soba|Abura soba|油そば|primi|ramen-ya|4.6|1|Noodle senza brodo da mescolare energicamente con olio aromatico, tare, aceto e peperoncino.|Japanese abura soba soupless ramen|mazesoba;ramen senza brodo
all|curry-udon|Curry udon|カレーうどん|primi|ristorante|4.6|0|Udon spessi in un brodo al curry vellutato che unisce dashi e comfort food.|Japanese curry udon noodles|udon al curry
all|yakisoba|Yakisoba|焼きそば|primi|street food|4.6|0|Noodle saltati sulla piastra con cavolo, carne, salsa scura, aonori e zenzero rosso.|Japanese yakisoba fried noodles|noodle alla piastra
all|napolitan|Spaghetti Napolitan|ナポリタン|primi|caffè|4.3|1|Spaghetti saltati con ketchup, cipolla, peperone e salsiccia. Napoli non è stata consultata.|Japanese Napolitan spaghetti ketchup|naporitan
all|hayashi-rice|Hayashi rice|ハヤシライス|primi|ristorante|4.5|1|Riso con stufato scuro di manzo, cipolle e salsa demi-glace, meno speziato del curry.|Japanese hayashi rice hashed beef|hashed beef rice
all|doria|Doria|ドリア|primi|caffè|4.4|1|Gratin di riso con besciamella, formaggio e carne o frutti di mare, nato nella cucina yoshoku.|Japanese doria rice gratin|rice gratin
all|gyoza|Gyoza|餃子|secondi|izakaya|4.7|0|Ravioli sottili con ripieno di maiale, cavolo, aglio e nira, rosolati sotto e cotti al vapore sopra.|Japanese pan fried gyoza|ravioli giapponesi
all|karaage|Karaage|唐揚げ|secondi|izakaya|4.8|0|Bocconi di pollo marinati in soia, zenzero e aglio, poi fritti con una crosta leggera.|Japanese chicken karaage|pollo fritto giapponese
all|korokke|Korokke|コロッケ|street|street food|4.5|0|Crocchetta impanata di patate, carne o crema, spesso mangiata calda davanti alla bottega.|Japanese korokke potato croquette|crocchetta giapponese
all|menchi-katsu|Menchi katsu|メンチカツ|street|street food|4.6|1|Polpetta piatta di carne macinata e cipolla, impanata e fritta fino a diventare molto succosa.|Japanese menchi katsu|cotoletta carne macinata
all|hambagu|Hambagu|ハンバーグ|secondi|ristorante|4.6|0|Hamburger spesso senza panino, servito su piastra con demi-glace, daikon o salsa ponzu.|Japanese hambagu steak|hamburger giapponese
all|sukiyaki|Sukiyaki|すき焼き|secondi|ristorante|4.8|0|Manzo sottile, tofu, negi, funghi e noodles cotti al tavolo in salsa dolce di soia e mirin.|Japanese sukiyaki hot pot|nabe manzo
all|shabu-shabu|Shabu-shabu|しゃぶしゃぶ|secondi|ristorante|4.7|0|Fettine sottili di carne passate rapidamente nel brodo e intinte in ponzu o salsa al sesamo.|Japanese shabu shabu hot pot|hot pot giapponese
all|chawanmushi|Chawanmushi|茶碗蒸し|contorni|ristorante|4.5|1|Budino salato di uovo al dashi cotto al vapore con pollo, gambero, funghi o ginkgo.|Japanese chawanmushi savory egg custard|budino salato uovo
all|agedashi-tofu|Agedashi tofu|揚げ出し豆腐|contorni|izakaya|4.5|0|Tofu fritto dalla crosta sottile in brodo dashi, con daikon, zenzero e cipollotto.|Japanese agedashi tofu|tofu fritto dashi
all|yakizakana|Yakizakana|焼き魚|secondi|ristorante|4.5|0|Pesce grigliato e salato servito intero o a filetto, pilastro delle colazioni e dei set washoku.|Japanese yakizakana grilled fish|pesce grigliato giapponese
all|saba-shioyaki|Saba shioyaki|鯖の塩焼き|secondi|ristorante|4.6|0|Sgombro salato e grigliato, dalla pelle croccante e carne grassa, con daikon grattugiato.|Japanese saba shioyaki grilled mackerel|sgombro grigliato
all|natto|Natto|納豆|contorni|ristorante|3.8|1|Soia fermentata filante e intensamente aromatica, da mescolare con salsa e senape prima del riso.|Japanese natto fermented soybeans|soia fermentata
all|miso-soup|Zuppa di miso|味噌汁|contorni|ristorante|4.4|0|Brodo dashi con miso, tofu, wakame o ingredienti stagionali. Cambia molto tra casa e regione.|Japanese miso soup tofu wakame|miso shiru
all|yakisoba-pan|Yakisoba pan|焼きそばパン|street|konbini|4.4|1|Panino morbido riempito di noodle yakisoba, salsa, zenzero e maionese. Carboidrati che abbracciano carboidrati.|Japanese yakisoba pan bread|panino con noodle
all|anpan|Anpan|あんパン|dolci|panetteria|4.4|0|Panino soffice ripieno di anko, la pasta dolce di fagioli azuki.|Japanese anpan red bean bun|pane azuki
all|curry-pan|Curry pan|カレーパン|street|panetteria|4.7|0|Pane impanato e fritto con ripieno di curry giapponese denso.|Japanese curry pan fried bread|kare pan
all|dorayaki|Dorayaki|どら焼き|dolci|pasticceria|4.6|0|Due dischi morbidi simili a pancake racchiudono una generosa dose di anko.|Japanese dorayaki red bean pancake|dolce doraemon
all|daifuku|Daifuku|大福|dolci|pasticceria|4.6|0|Mochi tenero ripieno di anko, crema o frutta. La variante ichigo contiene una fragola intera.|Japanese daifuku mochi strawberry|ichigo daifuku
all|dango|Dango|団子|dolci|street food|4.5|0|Palline di farina di riso su stecco, glassate, tostate o servite con anko.|Japanese dango skewers|hanami dango
all|castella|Castella|カステラ|dolci|pasticceria|4.4|0|Pan di Spagna umido a base di uova, zucchero e sciroppo, introdotto e trasformato in Giappone.|Japanese castella cake kasutera|kasutera
all|purin|Purin|プリン|dolci|konbini|4.7|0|Budino al caramello compatto e setoso, disponibile dal kissaten al konbini.|Japanese purin caramel pudding|pudding giapponese
all|kakigori|Kakigori|かき氷|dolci|caffè|4.7|0|Ghiaccio rasato finissimo con sciroppi, frutta, matcha, latte condensato o azuki.|Japanese kakigori shaved ice|granita giapponese
all|fruit-sando|Fruit sando|フルーツサンド|dolci|konbini|4.5|1|Shokupan senza crosta con panna e frutta disposta per creare una sezione perfetta.|Japanese fruit sando sandwich|tramezzino frutta
all|souffle-pancakes|Pancake soufflé|スフレパンケーキ|dolci|caffè|4.5|1|Pancake molto alti e tremolanti, cotti lentamente per trattenere l'aria.|Japanese souffle pancakes fluffy|pancake giapponesi alti;souffle pancakes;fluffy pancakes
all|japanese-cheesecake|Cheesecake giapponese|スフレチーズケーキ|dolci|pasticceria|4.5|0|Torta al formaggio più leggera e ariosa, a metà tra cheesecake e soufflé.|Japanese souffle cheesecake|cotton cheesecake
all|shokupan-toast|Shokupan toast|食パン|dolci|caffè|4.4|1|Pane al latte in cassetta, alto e filante, tostato spesso con burro, miele o pasta azuki.|Japanese shokupan milk bread toast|pane al latte giapponese
all|cream-soda|Cream soda da kissaten|クリームソーダ|bevande|caffè|4.3|1|Soda verde al melone con gelato alla vaniglia e ciliegina, icona rétro dei kissaten.|Japanese kissaten melon cream soda|soda al melone gelato
all|matcha|Matcha|抹茶|bevande|sala da tè|4.6|0|Tè verde in polvere frullato con acqua, erbaceo, umami e più intenso delle bevande dolci al matcha.|Japanese matcha tea bowl|tè matcha
all|mugicha|Mugicha|麦茶|bevande|ristorante|4.3|1|Infuso freddo di orzo tostato, senza caffeina e onnipresente in estate.|Japanese mugicha barley tea|tè orzo
all|umeshu|Umeshu|梅酒|bevande|izakaya|4.5|0|Liquore dolce-acidulo ottenuto macerando ume, servito liscio, con ghiaccio o soda.|Japanese umeshu plum wine|liquore di prugna
all|highball|Japanese highball|ハイボール|bevande|izakaya|4.4|0|Whisky e soda molto freddi, leggero e pensato per accompagnare fritti e yakitori.|Japanese whisky highball|whisky soda
all|chuhai|Chuhai|チューハイ|bevande|izakaya|4.2|1|Shochu o distillato neutro con soda e aromi, dal limone alle varianti stagionali in lattina.|Japanese chuhai lemon sour|chu hi;lemon sour
all|sake-tasting|Degustazione di sake|日本酒飲み比べ|bevande|sakagura|4.7|0|Piccolo confronto tra sake di stili, risi e territori diversi, spesso serviti in tre bicchieri.|Japanese sake tasting flight nomikurabe|nihonshu;nomikurabe
all|amazake|Amazake|甘酒|bevande|tempio|4.2|1|Bevanda dolce di riso fermentato, calda o fredda; alcune versioni sono quasi prive di alcol, altre no.|Japanese amazake rice drink|bevanda riso fermentato
  `).map(function (row) {
    row.id = "food-" + row.city + "-" + row.slug;
    row.rating = Number(row.rating);
    row.local = row.local === "1";
    row.aliases = row.aliases ? row.aliases.split(";") : [];
    row.type = "food";
    row.sourceUrl = sourceUrl;
    row.sourceTitle = "JNTO · Gastronomia giapponese";
    return row;
  });

  // Immagini scelte a mano: per questi piatti la ricerca automatica restituiva
  // scatti che non c'entravano nulla, o niente del tutto.
  const curatedImages = {
    "all/dango": ["Hanami%20dango%20by%20gochie-%20in%20Seiryu-cho%2C%20Kyoto.jpg", "https://commons.wikimedia.org/wiki/File:Hanami_dango_by_gochie-_in_Seiryu-cho,_Kyoto.jpg", "gochie* · CC BY 2.0 · Wikimedia Commons"],
    "all/castella": ["Castella%2Cmade%20in%20nagasaki-city%2Cjapan.JPG", "https://commons.wikimedia.org/wiki/File:Castella,made_in_nagasaki-city,japan.JPG", "katorisi · CC BY-SA 3.0 · Wikimedia Commons"],
    "all/tonkotsu-ramen": ["Tonkotsu%20ramen%20in%20Tokyo.jpg", "https://commons.wikimedia.org/wiki/File:Tonkotsu_ramen_in_Tokyo.jpg", "Syced · CC0 · Wikimedia Commons"],
    "all/miso-ramen": ["Miso%20ramen%20of%20Sapporo%2002.jpg", "https://commons.wikimedia.org/wiki/File:Miso_ramen_of_Sapporo_02.jpg", "ノボホショコロトソ · CC BY 4.0 · Wikimedia Commons"],
    "all/hiyashi-chuka": ["Hiyashi%20chuka%20002.jpg", "https://commons.wikimedia.org/wiki/File:Hiyashi_chuka_002.jpg", "Ocdp · CC0 · Wikimedia Commons"],
    "all/nikujaga": ["Nikujaga%20by%20Takeshi%20aka%20Momotaro.jpg", "https://commons.wikimedia.org/wiki/File:Nikujaga_by_Takeshi_aka_Momotaro.jpg", "Takeshi aka. Momotaro · CC BY 2.0 · Wikimedia Commons"],
    "all/motsunabe": ["Motsunabe%20002.jpg", "https://commons.wikimedia.org/wiki/File:Motsunabe_002.jpg", "徳永涼 · CC BY-SA 3.0 · Wikimedia Commons"],
    "all/gyutan": ["Sendai%20gyutan.JPG", "https://commons.wikimedia.org/wiki/File:Sendai_gyutan.JPG", "Sakurai Midori · CC BY-SA 3.0 · Wikimedia Commons"],
    // Il file precedente si chiamava "tebasaki karaage" e finiva su entrambe le
    // schede: due voci diverse con la stessa foto si leggono come un doppione.
    "all/tebasaki": ["Nagoya%20chicken%20wings.jpg", "https://commons.wikimedia.org/wiki/File:Nagoya_chicken_wings.jpg", "Geographer · CC BY-SA 3.0 · Wikimedia Commons"],
    "all/tsukune": ["Tsukune%20%28chicken%20meatballs%29%20%2816065642291%29.jpg", "https://commons.wikimedia.org/wiki/File:Tsukune_(chicken_meatballs)_(16065642291).jpg", "Arnold Gatilao · CC BY 2.0 · Wikimedia Commons"],
    "all/inarizushi": ["Kantofu%20Inarizushi.jpg", "https://commons.wikimedia.org/wiki/File:Kantofu_Inarizushi.jpg", "Ocdp · CC BY-SA 3.0 · Wikimedia Commons"],
    "all/katsu-sando": ["Katsu%20sando%20%2837686169334%29.jpg", "https://commons.wikimedia.org/wiki/File:Katsu_sando_(37686169334).jpg", "Kent Wang · CC BY-SA 2.0 · Wikimedia Commons"],
    "all/imagawayaki": ["Imagawayaki%20001.jpg", "https://commons.wikimedia.org/wiki/File:Imagawayaki_001.jpg", "Ocdp · CC0 · Wikimedia Commons"],
    "all/hojicha": ["Houjicha.jpg", "https://commons.wikimedia.org/wiki/File:Houjicha.jpg", "FCartegnie · CC BY-SA 3.0 · Wikimedia Commons"],
    "all/genmaicha": ["Genmaicha%20-%20Sencha%20green%20tea%20with%20toasted%20rice.jpg", "https://commons.wikimedia.org/wiki/File:Genmaicha_-_Sencha_green_tea_with_toasted_rice.jpg", "Selena N. B. H. · CC BY 2.0 · Wikimedia Commons"],
    "all/japanese-whisky": ["Japanese%20whisky.jpg", "https://commons.wikimedia.org/wiki/File:Japanese_whisky.jpg", "Culture Japon · CC BY-SA 4.0 · Wikimedia Commons"],
    "kyoto/yuba": ["Yuba%20for%20sale%20by%20sunday%20driver%20in%20Kyoto.jpg", "https://commons.wikimedia.org/wiki/File:Yuba_for_sale_by_sunday_driver_in_Kyoto.jpg", "sunday driver · CC BY 2.0 · Wikimedia Commons"]
  };

  const additions = parseRows(`
all|tonkotsu-ramen|Tonkotsu ramen|豚骨ラーメン|primi|ristorante|4.8|0|Brodo bianco e denso ottenuto bollendo ossa di maiale per ore, con noodles sottili e cottura del pane da ordinare a piacere.|Japanese tonkotsu ramen pork bone|ramen di maiale;hakata ramen
all|miso-ramen|Miso ramen|味噌ラーメン|primi|ristorante|4.7|0|Brodo arricchito di miso, più corposo e dolce del shoyu, con mais, burro e germogli di soia saltati.|Japanese miso ramen Sapporo|ramen al miso
all|hiyashi-chuka|Hiyashi chuka|冷やし中華|primi|ristorante|4.5|0|Noodles freddi con striscioline di frittata, prosciutto, cetriolo e salsa acidula: compare nei menu solo d'estate.|Japanese hiyashi chuka cold noodles|ramen freddo;noodles freddi
all|nikujaga|Nikujaga|肉じゃが|secondi|izakaya|4.5|0|Stufato casalingo di manzo, patate e cipolla in brodo dolce di soia: il piatto che i giapponesi associano a casa propria.|Japanese nikujaga beef potato stew|stufato di carne e patate
all|motsunabe|Motsunabe|もつ鍋|secondi|izakaya|4.6|0|Pentola di trippa di manzo con cavolo, aglio e peperoncino, in brodo di soia o miso: si finisce con noodles nel fondo.|Japanese motsunabe offal hot pot|nabe di trippa
all|gyutan|Gyutan|牛タン|secondi|ristorante|4.7|0|Lingua di manzo tagliata spessa e grigliata al carbone, servita con riso all'orzo e zuppa di coda: specialità nata a Sendai e ormai diffusa.|Japanese gyutan grilled beef tongue|lingua di manzo
all|tebasaki|Tebasaki|手羽先|street|izakaya|4.6|0|Ali di pollo fritte due volte e laccate con salsa dolce-piccante e pepe, da mangiare con le mani: origine Nagoya, presenza nazionale.|Japanese tebasaki fried chicken wings|ali di pollo
all|tsukune|Tsukune|つくね|street|izakaya|4.6|0|Polpette di pollo macinato su spiedo, laccate con tare e spesso servite con tuorlo crudo in cui intingerle.|Japanese tsukune chicken meatball skewer|polpette di pollo
all|inarizushi|Inarizushi|いなり寿司|primi|street food|4.4|0|Sacchetti di tofu fritto marinati nel dolce e riempiti di riso da sushi: economico, si mangia freddo e viaggia bene.|Japanese inarizushi tofu pouch sushi|sushi di tofu
all|katsu-sando|Katsu sando|カツサンド|street|konbini|4.7|0|Cotoletta di maiale tra due fette di pane in cassetta senza crosta, con salsa tonkatsu: il panino dei treni e delle notti tarde.|Japanese katsu sando pork cutlet sandwich|panino con cotoletta
all|imagawayaki|Imagawayaki|今川焼き|dolci|street food|4.5|0|Disco spesso di pastella cotto in stampi di rame e riempito di anko o crema: cambia nome quasi in ogni regione.|Japanese imagawayaki filled cake|obanyaki;taiko manju
all|hojicha|Hojicha|ほうじ茶|bevande|ristorante|4.6|0|Tè verde tostato, ambrato e senza amaro, quasi privo di caffeina: quello che si beve la sera e si dà ai bambini.|Japanese hojicha roasted green tea|tè tostato
all|genmaicha|Genmaicha|玄米茶|bevande|ristorante|4.5|0|Tè verde mescolato a riso soffiato tostato, con un fondo che ricorda i cereali: economico e molto quotidiano.|Japanese genmaicha brown rice tea|tè con riso tostato
all|japanese-whisky|Whisky giapponese|ジャパニーズウイスキー|bevande|izakaya|4.8|0|Distillati costruiti sullo stile scozzese ma con acqua, botti e clima locali: le etichette più note sono rare e care, quelle base ottime nell'highball.|Japanese whisky bottle|whisky nipponico
kyoto|yuba|Yuba|湯葉|contorni|ristorante|4.7|1|La pellicola che si forma sul latte di soia caldo, raccolta a mano: si mangia fresca al momento o essiccata nei piatti di tempio.|Kyoto yuba tofu skin|pelle di tofu
`);

  additions.forEach(function (row) {
    row.id = "food-" + row.city + "-" + row.slug;
    row.rating = Number(row.rating);
    row.local = row.local === "1";
    row.type = "food";
    row.aliases = row.aliases ? row.aliases.split(";") : [];
    row.sourceUrl = sourceUrl;
    row.sourceTitle = "JNTO · Gastronomia giapponese";
  });

  const existingIds = new Set(data.foods.map(function (item) { return item.id; }));
  rows.concat(additions).forEach(function (item) {
    if (!existingIds.has(item.id)) data.foods.push(item);
  });

  data.foods.forEach(function (item) {
    const curated = curatedImages[item.city + "/" + item.slug];
    if (!curated) return;
    item.imageUrl = "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + curated[0] + "?width=960";
    item.imageSourceUrl = curated[1];
    item.imageCredit = curated[2];
  });

  const melonPan = data.foods.find(function (item) { return item.id === "food-all-melon-pan"; });
  if (melonPan) melonPan.aliases = ["melopan", "melonpan", "meron pan", "pane al melone"];
})();
