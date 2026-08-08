(function () {
  "use strict";

  // L'unico parser delle tabelle a pipe: prima era copiato in sei file, con
  // tre piccole varianti nate per caso. Le varianti restano come opzioni
  // esplicite, così ogni file dichiara la sua invece di reinventare la
  // funzione: `fill` è il valore per le colonne mancanti (undefined per i
  // cataloghi storici, "" per chi si aspetta stringhe), `trim` pulisce gli
  // spazi attorno a ogni cella (serve ai negozianti, con le righe lunghe).
  window.TABI_PARSE = {
    table: function (text, fields, options) {
      const fill = options && "fill" in options ? options.fill : undefined;
      const trim = Boolean(options && options.trim);
      return String(text || "").trim().split("\n").filter(Boolean).map(function (line) {
        const values = line.split("|");
        return fields.reduce(function (item, field, index) {
          let value = values[index] === undefined ? fill : values[index];
          if (trim && typeof value === "string") value = value.trim();
          item[field] = value;
          return item;
        }, {});
      });
    }
  };
})();
