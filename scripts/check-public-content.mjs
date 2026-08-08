import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const forbiddenExtensions = /\.(?:pdf|docx?|heic|heif|jpe?g|png|webp)$/i;
// Solo le icone dell'app. Ogni altra immagine resta vietata, perché è da lì che
// passerebbero foto del viaggio, biglietti e documenti.
const allowedBinaryAssets = /^assets\/icons\/(?:icon-192|icon-512|apple-touch-icon)\.png$/;
// Cataloghi di nomi file di terze parti: unica eccezione, e solo alla regola
// delle date ISO (vedi il commento nel ciclo qui sotto).
const imageCatalogs = /^(?:assets\/curated-images-data\.js|scripts\/image-overrides\.json)$/;
const textRules = [
  ["email address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ["exact ISO date", /\b20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[opsu]_[A-Za-z0-9]{30,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["generic API secret", /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"']{12,}["']/i]
];

const failures = [];
for (const file of files) {
  if (forbiddenExtensions.test(file)) {
    if (!allowedBinaryAssets.test(file)) {
      failures.push(`${file}: personal/binary document type is not allowed`);
      continue;
    }
    // Le regole qui sotto cercano testo. Passarci i byte compressi di un PNG
    // produce solo falsi allarmi: in una schermata della guida sette byte a caso
    // sono finiti sotto la regola degli indirizzi di posta. Il filtro su questi
    // file è la lista dei percorsi ammessi, non le parole al loro interno.
    continue;
  }
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  for (const [label, pattern] of textRules) {
    // I due cataloghi di immagini contengono nomi di file di Wikimedia
    // Commons, e molti fotografi datano lo scatto dentro il nome del file. È
    // la data della foto, pubblica e altrui: questa regola difende le date
    // del viaggio, che in un file generato dai metadati di Commons non
    // possono comparire. Tutte le altre regole — indirizzi, chiavi, token —
    // restano attive anche su questi due file.
    if (label === "exact ISO date" && imageCatalogs.test(file)) continue;
    if (pattern.test(content)) failures.push(`${file}: detected ${label}`);
  }
}

if (failures.length) {
  console.error("Public-content check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Public-content check passed for ${files.length} files.`);
