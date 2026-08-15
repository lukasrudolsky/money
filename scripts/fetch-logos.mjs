#!/usr/bin/env node
// Stáhne loga bank i služeb do public/logos/ podle scripts/logo-sources.json.
//
//   node scripts/fetch-logos.mjs
//
// Položky, které v JSONu nemají vyplněné "file", skript přeskočí a jen vypíše,
// na které stránce se logo hledá. Nic nepřepisuje naslepo — když stažený soubor
// nevypadá jako obrázek, nechá na disku to, co tam je.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/logos");

const EXT_BY_TYPE = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function extFor(url, contentType) {
  const fromType = EXT_BY_TYPE[(contentType || "").split(";")[0].trim().toLowerCase()];
  if (fromType) return fromType;
  const fromUrl = new URL(url).pathname.match(/\.(svg|png|jpe?g|webp)$/i);
  if (fromUrl) return fromUrl[1].toLowerCase().replace("jpeg", "jpg");
  return null;
}

async function download(bank) {
  const res = await fetch(bank.file, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; logo-fetch/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const contentType = res.headers.get("content-type");
  const ext = extFor(bank.file, contentType);
  if (!ext) {
    // ZIP a PDF se rozbalují ručně, stejně tak HTML stránka omylem vložená
    // místo souboru. Radši to nahlásit, než uložit nepoužitelný soubor.
    throw new Error(`nepodporovaný typ (${contentType || "neznámý"}) — ZIP/PDF rozbal ručně`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error(`soubor má jen ${buf.length} B, to nebude logo`);

  const dest = resolve(OUT_DIR, `${bank.id}.${ext}`);
  await writeFile(dest, buf);
  return { dest, ext, bytes: buf.length };
}

const cfg = JSON.parse(await readFile(resolve(ROOT, "scripts/logo-sources.json"), "utf8"));
await mkdir(OUT_DIR, { recursive: true });

const todo = [];
let ok = 0;
let failed = 0;

for (const bank of cfg.logos) {
  if (!bank.file) {
    todo.push(bank);
    continue;
  }
  try {
    const { dest, ext, bytes } = await download(bank);
    ok++;
    console.log(`✓ ${bank.name} → ${dest.replace(ROOT + "/", "")} (${(bytes / 1024).toFixed(1)} kB)`);
    if (ext !== "svg") {
      console.log(`  pozn.: v OFFERS přepiš logo na "/logos/${bank.id}.${ext}"`);
    }
  } catch (err) {
    failed++;
    console.log(`✗ ${bank.name}: ${err.message}`);
    console.log(`  zdroj: ${bank.page}`);
  }
}

if (todo.length) {
  console.log(`\nChybí přímý odkaz (doplň "file" v scripts/logo-sources.json):`);
  for (const bank of todo) {
    console.log(`  · ${bank.name} — ${bank.page}`);
    if (bank.note) console.log(`    ${bank.note}`);
  }
}

console.log(`\nStaženo ${ok}, chyb ${failed}, čeká ${todo.length}.`);
process.exit(failed > 0 ? 1 : 0);
