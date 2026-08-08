import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);

const forbiddenExtensions = /\.(?:pdf|docx?|heic|heif|jpe?g|png|webp)$/i;
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
    failures.push(`${file}: personal/binary document type is not allowed`);
    continue;
  }
  let content;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  for (const [label, pattern] of textRules) {
    if (pattern.test(content)) failures.push(`${file}: detected ${label}`);
  }
}

if (failures.length) {
  console.error("Public-content check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Public-content check passed for ${files.length} files.`);
