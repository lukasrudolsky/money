#!/usr/bin/env node
// Z preview/index.html udělá stránku, která jde publikovat jako Artifact.
//
//   node scripts/build-preview.mjs           kvíz  -> dist/bonus-quiz.html
//   node scripts/build-preview.mjs home      úvod  -> dist/home.html
//
// Publikační obal dodává <!doctype>, <html>, <head> i <body> sám, takže se
// musí odstranit — jinak skončí <style> a <script> mimo dokument. Zároveň se
// color-scheme přesune z <meta> do CSS, protože meta tagy se do obalu
// nedostanou.
//
// Nezasahuje do preview/index.html; výstup je dist/bonus-quiz.html.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = {
  quiz: { src: "preview/index.html", out: "dist/bonus-quiz.html" },
  home: { src: "preview/home.html", out: "dist/home.html" },
};
const which = process.argv[2] === "home" ? "home" : "quiz";
const { src: SRC_REL, out: OUT_REL } = PAGES[which];
const SRC = resolve(ROOT, SRC_REL);
const OUT = resolve(ROOT, OUT_REL);

// Každý krok se ověří: když se preview přepíše tak, že značka zmizí, ať to
// spadne tady, ne až na publikované stránce.
function cut(html, needle, replacement, what) {
  if (!html.includes(needle)) {
    console.error(`✗ ${what}: v ${SRC_REL} nenacházím ${JSON.stringify(needle.trim())}`);
    process.exit(1);
  }
  return html.replace(needle, replacement);
}

let html = await readFile(SRC, "utf8");

const titleAt = html.indexOf("<title>");
if (titleAt === -1) {
  console.error(`✗ ${SRC_REL} nemá <title>, ten určuje jméno artefaktu`);
  process.exit(1);
}
html = html.slice(titleAt);

// <meta> tagy stojí v hlavičce před <title>, takže je uřízl už slice výš.
// Kontrola forbidden níž hlídá, že se tam žádný nevrátil.
html = cut(html, "</head>\n<body>\n", "", "hlavička");
html = cut(html, "\n</body>\n</html>\n", "\n", "patička");
// Kvíz má color-scheme v <meta>, které slice výš uřízl, takže se dopisuje do
// CSS. Úvodní stránka ho má v :root rovnou, tam se jen ověří, že tam zůstal.
if (which === "quiz") {
  html = cut(html, "    --dur: 220ms;", "    --dur: 220ms;\n    color-scheme: dark;", "color-scheme do CSS");
} else if (!html.includes("color-scheme: light")) {
  console.error("✗ v úvodní stránce chybí color-scheme: light v CSS");
  process.exit(1);
}

for (const tag of ["<html", "<body", "</body>", "</html>", "<!doctype", "<meta", "</head>"]) {
  if (html.toLowerCase().includes(tag)) {
    console.error(`✗ ve výstupu zůstal ${tag} — obal by se zdvojil`);
    process.exit(1);
  }
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, html, "utf8");

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`✓ ${OUT_REL} (${kb} kB)`);
console.log("  Publikuj tenhle soubor; při další změně ho přepiš na stejné adrese, ať zůstane odkaz.");
