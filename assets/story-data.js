(function () {
  "use strict";

  // Le schede scritte una per una. Tutto il resto della guida costruisce i
  // testi lunghi assemblando modelli per categoria e per città: comodo per
  // partire, ma il risultato era che Kinkaku-ji e Ginkaku-ji condividevano
  // cinque frasi su otto, parola per parola. Un modello sa dire che cos'è un
  // tempio; non sa dire perché quel tempio è bruciato nel 1950.
  //
  // Qui dentro ogni voce è testo scritto per quel luogo e per nessun altro.
  // Chi c'è vince sul modello; chi non c'è resta al modello, che è comunque
  // meglio di una scheda vuota. Anche i titoli delle sezioni cambiano da
  // scheda a scheda: un formato fisso è la ripetizione che torna dalla porta
  // di servizio.
  //
  // Regole per chi ne aggiunge:
  // - fatti verificabili, con le fonti nel campo sources;
  // - niente frasi che potrebbero stare su un'altra scheda;
  // - la nota semiseria deve essere unica in tutta la guida (lo verifica
  //   scripts/check-guide-integrity.mjs).
  const stories = {
    "place-kyoto-kinkakuji": {
      long: "Non nacque come tempio ma come buen retiro di un uomo che aveva già vinto tutto: Ashikaga Yoshimitsu, terzo shogun Muromachi, se lo fece costruire nel 1397 come villa di Kitayama, e solo dopo la sua morte, per volontà testamentaria, il complesso diventò il monastero zen Rokuon-ji. Il padiglione racconta quella biografia piano per piano: il primo è in stile aristocratico Heian, con le pareti che si aprono sull'acqua; il secondo è in stile guerriero e ospita una sala di Kannon; il terzo è una cella zen in stile cinese. Solo i due superiori sono coperti d'oro, ed è un dislivello voluto — il potere che sale di gradino in gradino fino a farsi religione, con una fenice di bronzo in cima. Quello che vedete non è però l'edificio di Yoshimitsu: nel 1950 un novizio del monastero gli diede fuoco e lo ridusse in cenere, un fatto di cronaca che scosse il Giappone e che Mishima trasformò nel romanzo «Il padiglione d'oro». La ricostruzione è del 1955, la doratura attuale del 1987, con foglia cinque volte più spessa dell'originale.",
      sections: [
        { title: "Lo stagno è metà dell'opera", body: "Il Kyōko-chi, lo «stagno specchio», non è un contorno ma la seconda metà dell'architettura: è scavato e sagomato perché il padiglione ci si rifletta intero, e le isolette di pietra che lo punteggiano rappresentano le isole degli immortali della tradizione cinese. Per questo il percorso di visita gira attorno all'acqua invece di puntare all'edificio: la vista frontale dalla riva sud è composta come un quadro, ed è lì che si ferma tutto il mondo con il telefono in mano." },
        { title: "Cosa cercare, oltre all'oro", body: "Dietro il padiglione il giro prosegue e quasi nessuno alza gli occhi: c'è la cascatella di Ryūmon con la pietra della carpa, che nella leggenda cinese risale la corrente e diventa drago. Più su, la sala del tè Sekkatei, di epoca Edo, e una fonte che serviva Yoshimitsu. Il percorso è a senso unico e non si torna indietro: se volete guardare due volte la facciata, fatelo prima di incamminarvi." },
        { title: "Il 1950 e il romanzo", body: "L'incendio doloso è parte della storia del luogo quanto la fondazione. Il novizio che appiccò il fuoco tentò poi il suicidio e fu giudicato mentalmente infermo; il tempio perse in una notte statue e documenti originali. Mishima Yukio ne fece nel 1956 un romanzo sulla bellezza insopportabile, che è ancora oggi il modo in cui molti giapponesi pensano a questo posto: non solo cartolina, ma anche ferita." },
        { title: "Quando andarci", body: "Apre presto e riempie subito: il primo turno del mattino è l'unica finestra in cui la riva sud non è una fila. La luce migliore per l'oro è quella laterale del tardo pomeriggio, ma l'ultimo ingresso è anticipato rispetto alla chiusura. D'inverno, con la neve sul tetto, è la giornata che i fotografi aspettano tutto l'anno.", },
        { title: "Nota semiseria", body: "È l'unico patrimonio dell'umanità che si visita camminando sempre nella stessa direzione come in un Ikea: passata la cascatella non si torna alla facciata, e il rimpianto per la foto non fatta è la vera tassa d'ingresso.", fun: true }
      ],
      sources: [
        { title: "Rokuon-ji · sito ufficiale", url: "https://www.shokoku-ji.jp/kinkakuji/", kind: "sito ufficiale" },
        { title: "UNESCO · Monumenti storici dell'antica Kyoto", url: "https://whc.unesco.org/en/list/688/", kind: "patrimonio" }
      ]
    },

    "place-kyoto-ginkakuji": {
      long: "Il Padiglione d'Argento non è argentato e non lo è mai stato: il nome è un soprannome nato per contrasto con quello d'oro del nonno, e la leggenda del rivestimento mai completato per mancanza di fondi è quasi certamente posteriore. Ashikaga Yoshimasa, ottavo shogun, iniziò a costruirsi qui la villa di Higashiyama nel 1482, mentre Kyoto era ancora in macerie per la guerra Ōnin che lui stesso non era riuscito a fermare: si ritirò dal governo e passò gli ultimi anni a occuparsi di tè, incenso, giardini e teatro. Da quel ritiro nacque la cosiddetta cultura Higashiyama, cioè buona parte di ciò che oggi chiamiamo estetica giapponese: la cerimonia del tè come la conosciamo, l'ikebana, la pittura a inchiostro, il gusto per l'imperfetto e il consumato. Il vero tesoro non è quindi il padiglione ma l'edificio accanto, il Tōgu-dō: dentro c'è il Dōjinsai, una stanza di quattro tatami e mezzo considerata l'antenata di tutte le stanze da tè e dello studio giapponese.",
      sections: [
        { title: "La sabbia non è decorazione", body: "Il cono tronco che vedete arrivando si chiama Kōgetsudai, «piattaforma per guardare la luna», e la distesa pettinata attorno è il Ginshadan, il «mare di sabbia d'argento», rastrellato a onde. Non risalgono a Yoshimasa: la forma attuale è di epoca Edo, e viene rifatta a mano di continuo. L'ipotesi più accreditata è che servissero a riflettere la luce lunare sul giardino, trasformando il buio in un secondo spettacolo." },
        { title: "Il sentiero che quasi tutti saltano", body: "Dopo il padiglione il percorso sale sul retro, dentro un bosco di muschio, fino a un belvedere da cui si vede tutta Kyoto incassata nella sua conca. Sono dieci minuti in salita e cambiano la visita: dall'alto si capisce perché uno shogun in fuga dalla politica scelse proprio questo fianco di montagna. Il giro è a senso unico anche qui." },
        { title: "Un ritiro costruito su una città distrutta", body: "Vale la pena tenere le date insieme: la guerra Ōnin devastò Kyoto fra il 1467 e il 1477, e Yoshimasa cominciò la villa cinque anni dopo la fine. Mentre la capitale bruciava lui collezionava oggetti cinesi e ordinava giardini, e la storiografia gli è stata addosso per secoli. Il paradosso è che quel disimpegno produsse il canone estetico che il Giappone esporta ancora oggi." },
        { title: "Nota semiseria", body: "Il posto più famoso al mondo per una cosa che non c'è: gente da mezzo pianeta viene a fotografare l'argento che non è mai stato steso, e nessuno chiede il rimborso.", fun: true }
      ],
      sources: [
        { title: "Jishō-ji · sito ufficiale", url: "https://www.shokoku-ji.jp/ginkakuji/", kind: "sito ufficiale" },
        { title: "UNESCO · Monumenti storici dell'antica Kyoto", url: "https://whc.unesco.org/en/list/688/", kind: "patrimonio" }
      ]
    }
  };

  window.TABI_STORIES = stories;
})();
