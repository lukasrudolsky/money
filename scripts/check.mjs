#!/usr/bin/env node
// Zkontroluje, co v týhle repo může tiše shnít.
//
//   node scripts/check.mjs
//
// Data, ikony, loga i písma žijí dvakrát: jednou v components/BonusQuiz.jsx
// (aplikace) a jednou v preview/index.html (samostatná ukázka). Nic je nedrží
// v souladu — obě README na to jen upozorňují, což vydrží tak dva commity.
// Tohle je ta hlídka. Vrací nenulový exit kód, takže se dá pověsit na CI.

import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const notes = [];

// Kdyby kontrola spadla na něčem nečekaném — přejmenovaný soubor, rozbitý
// literál — ať to řekne lidsky a skončí nenulově. Tichý stack trace vypadá
// v CI skoro jako „prošlo" a to je přesně ten způsob, jak se hlídka obejde.
for (const ev of ["uncaughtException", "unhandledRejection"]) {
  process.on(ev, (err) => {
    console.log(`✗ Kontrola spadla: ${err?.message ?? err}`);
    console.log("  (to je chyba v check.mjs nebo neočekávaný tvar dat, ne úspěch)");
    process.exit(1);
  });
}

const fail = (msg) => problems.push(msg);
const read = (p) => readFile(resolve(ROOT, p), "utf8");
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

// Vytáhne z textu literál pole, které začíná za `marker`. Počítá závorky, takže
// si poradí i s vnořenými objekty a s hranatými závorkami v řetězcích to nerozbije
// jen proto, že se spoléhá na to, že v datech žádné nejsou — kdyby přibyly,
// spadne to tady, ne až v prohlížeči.
function arrayAfter(src, marker, where) {
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`${where}: nenašel jsem "${marker}"`);
  const open = src.indexOf("[", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]" && --depth === 0) {
      return new Function(`return ${src.slice(open, i + 1)}`)();
    }
  }
  throw new Error(`${where}: neuzavřené pole u "${marker}"`);
}

// Vrátí zdrojový text pole za markerem, nevyhodnocený. QUESTIONS se vyhodnotit
// nedají: v komponentě jsou v nich odkazy na komponenty ikon a volání .map().
function blockAfter(src, marker, where) {
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`${where}: nenašel jsem "${marker}"`);
  const open = src.indexOf("[", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]" && --depth === 0) return src.slice(open, i + 1);
  }
  throw new Error(`${where}: neuzavřené pole u "${marker}"`);
}

const keysInOrder = (src, marker) => {
  const block = src.slice(src.indexOf(marker));
  return [...block.matchAll(/key:\s*"([a-z]+)"/g)].map((m) => m[1]);
};

const [component, preview, icons, logoDir, fontDir] = await Promise.all([
  read("components/BonusQuiz.jsx"),
  read("preview/index.html"),
  read("components/icons.jsx"),
  readdir(resolve(ROOT, "public/logos")),
  readdir(resolve(ROOT, "public/fonts")),
]);

const appOffers = arrayAfter(component, "const OFFERS =", "BonusQuiz.jsx");
const appServices = arrayAfter(component, "const SERVICES =", "BonusQuiz.jsx");
const pvOffers = arrayAfter(preview, "const OFFERS =", "preview");
const pvServices = arrayAfter(preview, "const SERVICES =", "preview");

/* ---- 0. náhled je pořád celá stránka -------------------------------- */

// Náhled je jeden velký soubor, do kterého se sahá skripty a hromadnými
// náhradami. Když se z něj kus vyřízne, data v něm zůstanou v pořádku a
// všechny kontroly níž projdou — jen se stránka nevykreslí. Tohle je pojistka
// proti tomu: bez těchhle kusů kvíz nenaběhne.
const REQUIRED = [
  "<style>", "</style>", "<body>", "</body>", "</html>",
  'id="view"', 'id="bar"', 'id="totalicon"',
  "function renderIntro", "function renderQuestion",
  "function renderUnder18", "function renderResult",
  "function render(", "function bind(",
];
for (const needle of REQUIRED) {
  const n = preview.split(needle).length - 1;
  if (n !== 1) fail(`preview/index.html: ${JSON.stringify(needle)} se vyskytuje ${n}×, má právě 1× — soubor je useknutý nebo zdvojený`);
}

/* ---- 1. id jsou jedinečná napříč vším ------------------------------- */

// Banky i služby míří na /go/<id>, takže sdílí jeden jmenný prostor. Dvě
// stejná id znamenají, že jeden partnerský odkaz tiše přebije druhý.
const ids = [...appOffers, ...appServices].map((o) => o.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) fail(`Duplicitní id v OFFERS/SERVICES: ${[...new Set(dupes)].join(", ")}`);

/* ---- 2. každá nabídka je dosažitelná -------------------------------- */

// Po minulé chybě, kdy „do pěti" s hodnotou 4 brala lidem odměnu s minCards 5:
// když hranice v otázce neodpovídají hranicím v datech, nabídka je mrtvá
// a nikdo si toho nevšimne, protože se prostě nezobrazí.
const cardsOpts = [...component.matchAll(/\{ value: (\d+), label: "(?:Čtyři|Pět|Deset)[^"]*"/g)]
  .map((m) => Number(m[1]));
const incomeVals = Object.values(
  new Function(`return ${component.match(/const INCOME = (\{[^}]+\})/)[1]}`)()
);

if (cardsOpts.length === 0) fail("Nenašel jsem hodnoty otázky na platby kartou — zkontroluj regulár v check.mjs");
const maxCards = Math.max(...cardsOpts);
const maxIncome = Math.max(...incomeVals);

// Práh musí být „obkročený": nějaká odpověď ho splní a nějaká ne. Když ho
// splní všechny, podmínka nic nefiltruje; když žádná, nabídka je mrtvá.
// Přesně tohle byla ta minulá chyba, kdy „do pěti" s hodnotou 4 brala odměnu
// lidem, kteří pět plateb zvládnou.
const straddled = (threshold, options) =>
  threshold === 0 || (options.some((v) => v >= threshold) && options.some((v) => v < threshold));

for (const o of appOffers) {
  if (o.minCards > maxCards) {
    fail(`Nabídka "${o.id}" chce ${o.minCards} plateb kartou, ale nejvyšší odpověď je ${maxCards} — nikdy se nezobrazí`);
  } else if (!straddled(o.minCards, cardsOpts)) {
    fail(`Nabídka "${o.id}" chce ${o.minCards} plateb kartou, ale to splní každá odpověď (${cardsOpts.join(", ")}) — otázka na ni nefiltruje`);
  }

  if (o.minIncome > maxIncome) {
    fail(`Nabídka "${o.id}" chce příjem ${o.minIncome}, ale nejvyšší odpověď je ${maxIncome} — nikdy se nezobrazí`);
  } else if (!straddled(o.minIncome, incomeVals)) {
    fail(`Nabídka "${o.id}" chce příjem ${o.minIncome}, ale to splní každá odpověď (${incomeVals.join(", ")}) — otázka na ni nefiltruje`);
  }
}

/* ---- 3. soubory, na které se odkazuje, existují --------------------- */

for (const o of [...appOffers, ...appServices]) {
  const file = o.logo.replace("/logos/", "");
  if (!logoDir.includes(file)) fail(`"${o.id}" odkazuje na /logos/${file}, ten v public/logos/ není`);
}

// Cesta k písmu vzniká až interpolací v face(), takže se čte ze samotného
// volání — hledat url("/fonts/...") by našlo neinterpolovanou šablonu.
const faceCalls = [...component.matchAll(/face\("[^"]+",\s*"([^"]+)",\s*"[^"]+",\s*"([^"]+)"/g)];
if (faceCalls.length === 0) fail("Nenašel jsem volání face() — zkontroluj regulár v check.mjs");
for (const [, slug, sub] of faceCalls) {
  const file = `${slug}-${sub}.woff2`;
  if (!fontDir.includes(file)) fail(`@font-face odkazuje na /fonts/${file}, ten v public/fonts/ není`);
}

// fetch-logos.mjs ukládá pod jménem `<id>.<přípona>` z logo-sources.json.
// Když se id rozejde se jménem souboru, na který se odkazuje kód, stažení
// tiše vyrobí soubor vedle a původní nechá být — a nikdo si toho nevšimne,
// dokud si někdo nevšimne starého loga na webu.
const sources = JSON.parse(await read("scripts/logo-sources.json"));
const usedFiles = [...appOffers, ...appServices].map((o) => o.logo.replace("/logos/", ""));

for (const entry of sources.logos) {
  const match = usedFiles.filter((f) => f.replace(/\.[a-z]+$/, "") === entry.id);
  if (match.length === 0) {
    fail(`logo-sources.json má id "${entry.id}", ale žádné logo se tak nejmenuje — fetch-logos.mjs by uložil soubor, který nikdo nepoužívá`);
  }
}
for (const f of usedFiles) {
  const base = f.replace(/\.[a-z]+$/, "");
  if (!sources.logos.some((b) => b.id === base)) {
    notes.push(`Logo ${f} nemá záznam v logo-sources.json — nepůjde stáhnout znovu`);
  }
}

// Maskoti jsou jediné obrázky mimo public/logos/ — zapečené v náhledu,
// načítané v aplikaci: veverka u úvodu (MASCOT) a jásající u výsledku
// (CHEER). Když někdo vymění soubor, musí přegenerovat i data URI. Hledá se
// podle obsahu, ne podle jména konstanty, takže přibývající obrázek se
// kontroluje sám od sebe.
const imgRefs = [...component.matchAll(/src="\/img\/([^"]+)"/g)].map((m) => m[1]);
if (imgRefs.length === 0) {
  fail("V komponentě nenacházím <img src=\"/img/…\"> s maskotem");
}
for (const name of new Set(imgRefs)) {
  const onDisk = await readFile(resolve(ROOT, "public/img", name)).catch(() => null);
  if (!onDisk) {
    fail(`Komponenta odkazuje na /img/${name}, ten v public/img/ není`);
  } else if (!preview.includes(onDisk.toString("base64"))) {
    fail(`Náhled nemá zapečený public/img/${name} — přegeneruj jeho data URI`);
  }
}

// Ikony webu: šest souborů z jednoho zdroje. Když se přegeneruje jen část,
// rozlišení se rozejdou a pozná se to až v panelu prohlížeče.
const ICON_FILES = [
  "favicon.ico", "favicon-16x16.png", "favicon-32x32.png",
  "apple-touch-icon.png", "icon-192.png", "icon-512.png", "site.webmanifest",
];
const publicDir = await readdir(resolve(ROOT, "public"));
for (const f of ICON_FILES) {
  if (!publicDir.includes(f)) fail(`Chybí ikona webu public/${f}`);
}

if (publicDir.includes("site.webmanifest")) {
  const mf = JSON.parse(await read("public/site.webmanifest"));
  for (const icon of mf.icons ?? []) {
    const f = icon.src.replace(/^\//, "");
    if (!publicDir.includes(f)) fail(`site.webmanifest odkazuje na /${f}, ten v public/ není`);
  }
}

// Náhled veze faviconu zapečenou; po výměně ikony se musí přegenerovat.
if (publicDir.includes("favicon-32x32.png")) {
  const m = preview.match(/rel="icon"[^>]*href="data:image\/png;base64,([^"]+)"/);
  if (!m) fail("Náhled nemá zapečenou faviconu (<link rel=\"icon\">)");
  else {
    const onDisk = await readFile(resolve(ROOT, "public/favicon-32x32.png"));
    if (sha(Buffer.from(m[1], "base64")) !== sha(onDisk)) {
      fail("Zapečená favicona v náhledu neodpovídá public/favicon-32x32.png — přegeneruj ji");
    }
  }
}

const orphans = logoDir.filter(
  (f) => f !== "README.md" && ![...appOffers, ...appServices].some((o) => o.logo.endsWith("/" + f))
);
if (orphans.length) notes.push(`Loga v public/logos/, na která nic neodkazuje: ${orphans.join(", ")}`);

/* ---- 4. písmenkové zkratky pokryjí nejdelší otázku ------------------ */

const letters = component.match(/const LETTERS = "([A-Z]+)"/)[1].length;
const longest = Math.max(appOffers.length, appServices.length, 3);
if (letters < longest) fail(`LETTERS má ${letters} znaků, ale nejdelší nabídka možností má ${longest}`);

/* ---- 5. náhled se nerozešel s komponentou --------------------------- */

const sameShape = (a, b, fields, kind) => {
  const ka = a.map((x) => x.id).join(",");
  const kb = b.map((x) => x.id).join(",");
  if (ka !== kb) {
    fail(`${kind}: náhled a komponenta mají jiná id nebo pořadí\n    komponenta: ${ka}\n    náhled:     ${kb}`);
    return;
  }
  for (let i = 0; i < a.length; i++) {
    for (const f of fields) {
      if (a[i][f] !== b[i][f]) {
        fail(`${kind} "${a[i].id}": pole ${f} se rozešlo\n    komponenta: ${JSON.stringify(a[i][f])}\n    náhled:     ${JSON.stringify(b[i][f])}`);
      }
    }
  }
};

sameShape(appOffers, pvOffers, ["bank", "amount", "minIncome", "minCards", "note"], "OFFERS");
sameShape(appServices, pvServices, ["name", "tag", "note"], "SERVICES");

const appQuestionKeys = keysInOrder(component, "const QUESTIONS =");
const appKeys = appQuestionKeys.join(",");
const pvKeys = keysInOrder(preview, "const QUESTIONS =").join(",");
if (appKeys !== pvKeys) {
  fail(`Otázky se rozešly\n    komponenta: ${appKeys}\n    náhled:     ${pvKeys}`);
}

// Shodné klíče ještě neznamenají shodné otázky: možnosti, jejich hodnoty
// i popisky se daly změnit v jednom souboru a druhý pak tiše počítal jinak.
// Možnosti generované z OFFERS/SERVICES sem nepatří (nejsou literál) — ty
// hlídá sameShape výš.
const optionsOf = (src, where) =>
  [...blockAfter(src, "const QUESTIONS =", where)
    .matchAll(/value:\s*(?:"([^"]*)"|(-?\d+)),\s*label:\s*"([^"]*)"/g)]
    .map((m) => `${m[1] ?? m[2]}=${m[3]}`);

const appOpts = optionsOf(component, "BonusQuiz.jsx").join(" | ");
const pvOpts = optionsOf(preview, "preview").join(" | ");
if (appOpts !== pvOpts) {
  fail(`Možnosti odpovědí se rozešly\n    komponenta: ${appOpts}\n    náhled:     ${pvOpts}`);
}

// Prahy příjmu rozhodují o tom, která odměna projde. Rozejít se můžou tiše:
// v obou souborech je to jiný literál a výsledek se liší až číslem na konci.
const incomeOf = (src, where) => {
  const m = src.match(/const INCOME = (\{[^}]+\})/);
  if (!m) { fail(`${where}: nenašel jsem INCOME`); return null; }
  const obj = new Function(`return ${m[1]}`)();
  return Object.entries(obj).map(([k, v]) => `${k}=${v}`).sort().join(", ");
};
const appIncome = incomeOf(component, "BonusQuiz.jsx");
const pvIncome = incomeOf(preview, "preview/index.html");
if (appIncome && pvIncome && appIncome !== pvIncome) {
  fail(`INCOME se rozešel\n    komponenta: ${appIncome}\n    náhled:     ${pvIncome}`);
}

// Úvod slibuje počet otázek slovem. Přidaná otázka ten slib tiše zneplatní —
// nic nespadne, jen na první obrazovce stojí lež.
const NUMERALS = { 5: "Pět", 6: "Šest", 7: "Sedm", 8: "Osm", 9: "Devět", 10: "Deset" };
const promised = NUMERALS[appQuestionKeys.length];
for (const [src, where] of [[component, "BonusQuiz.jsx"], [preview, "preview/index.html"]]) {
  const m = src.match(/([A-ZŠČŘŽ][a-zěščřžýáíéúůňť]+) otázek na to/);
  if (!m) {
    fail(`${where}: nenašel jsem v úvodu slib „… otázek na to" — buď zmizel, nebo má kvíz míň než pět otázek a věta potřebuje jiný tvar`);
  } else if (!promised) {
    fail(`${where}: kvíz má ${appQuestionKeys.length} otázek, pro tenhle počet nemám v check.mjs číslovku`);
  } else if (m[1] !== promised) {
    fail(`${where}: úvod slibuje „${m[1]} otázek", ale kvíz jich má ${appQuestionKeys.length} („${promised}")`);
  }
}

/* ---- 5b. popisky v hlavě slibují to samé co kvíz -------------------- */

// Částka na první obrazovce se počítá z OFFERS, ale v <meta> je opsaná ručně —
// jinak to nejde, hlava se vykresluje dřív než skript. Když přibude banka,
// slib v náhledu odkazu tiše zestárne a nikdo si toho nevšimne, protože
// stránka vypadá pořád stejně. Číslo se proto porovnává se součtem.
const POT = appOffers.reduce((s, o) => s + o.amount, 0);
const headEnd = preview.indexOf("<style>");
const head = headEnd === -1 ? "" : preview.slice(0, headEnd);

if (!/<title>[^<]+<\/title>/.test(head)) {
  fail("preview/index.html: v hlavě chybí <title> — bez něj nemá publikovaná stránka jméno");
}
for (const name of ["description", "og:title", "og:description"]) {
  const re = new RegExp(`(?:name|property)="${name}" content="([^"]*)"`);
  const m = head.match(re);
  if (!m) fail(`preview/index.html: v hlavě chybí ${name}`);
  else if (m[1].trim().length < 20) fail(`preview/index.html: ${name} je prázdný nebo příliš krátký`);
}

const amounts = [...head.matchAll(/([\d  ]+)\s*Kč/g)]
  .map((m) => Number(m[1].replace(/[\s ]/g, "")))
  .filter((n) => Number.isFinite(n));
if (amounts.length === 0) {
  notes.push("V popiscích v hlavě není žádná částka — kontrola proti součtu OFFERS nemá co porovnat");
}
for (const n of amounts) {
  if (n !== POT) {
    fail(`Popisky v hlavě slibují ${n} Kč, ale součet OFFERS je ${POT} Kč — přepiš <meta> v preview/index.html (a stejný text v aplikaci)`);
  }
}

/* ---- 6. sada ikon je v obou stejná ---------------------------------- */

const NAME_TO_EXPORT = {
  calendar: "CalendarDays", landmark: "Landmark", wallet: "Wallet", coins: "Coins",
  banknote: "Banknote", card: "CreditCard", trending: "TrendingUp", check: "Check",
  arrow: "ArrowRight", chevron: "ChevronLeft", sparkles: "Sparkles",
  person: "Person", male: "Male", female: "Female",
};
const pvIcons = [...preview.matchAll(/^\s{4}([a-z]+): '</gm)].map((m) => m[1]);
for (const name of pvIcons) {
  const exp = NAME_TO_EXPORT[name];
  if (!exp) { fail(`Ikona "${name}" je v náhledu, ale check.mjs pro ni nezná protějšek`); continue; }
  if (!icons.includes(`export function ${exp}(`)) fail(`Ikona "${name}" je v náhledu, ale ${exp} v icons.jsx chybí`);
}
for (const [name, exp] of Object.entries(NAME_TO_EXPORT)) {
  if (!pvIcons.includes(name)) fail(`${exp} je v icons.jsx, ale "${name}" v náhledu chybí`);
}

/* ---- 7. zapečené soubory v náhledu odpovídají těm na disku ---------- */

// Tohle je ta chyba, před kterou obě README varují: vyměníš logo nebo písmo
// v public/, ale data URI v náhledu zůstane staré. Vizuálně to nikdo nepozná,
// protože obojí vypadá jako logo.
const dataUris = new Map(
  [...preview.matchAll(/^\s{4}([a-z]+): "data:[^;]+;base64,([^"]+)",$/gm)]
    .map((m) => [m[1], Buffer.from(m[2], "base64")])
);

const LOGO_KEY_TO_FILE = Object.fromEntries(
  [...appOffers, ...appServices].map((o) => [
    o.id === "raiffeisen" ? "raiffeisen" : o.id,
    o.logo.replace("/logos/", ""),
  ])
);

for (const [key, buf] of dataUris) {
  const file = LOGO_KEY_TO_FILE[key];
  if (!file) { fail(`Náhled veze zapečené logo "${key}", které v datech není`); continue; }
  // Chybějící soubor už ohlásila kontrola 3; tady se na něm nesmí spadnout,
  // jinak by jedna chyba schovala všechny ostatní.
  if (!logoDir.includes(file)) continue;
  const onDisk = await readFile(resolve(ROOT, "public/logos", file));
  if (sha(onDisk) !== sha(buf)) {
    fail(`Zapečené logo "${key}" v náhledu neodpovídá public/logos/${file} — přegeneruj mapu LOGOS`);
  }
}
for (const key of Object.keys(LOGO_KEY_TO_FILE)) {
  if (!dataUris.has(key)) fail(`V náhledu chybí zapečené logo pro "${key}"`);
}

const pvFonts = [...preview.matchAll(/src: url\(data:font\/woff2;base64,([^)]+)\)/g)]
  .map((m) => Buffer.from(m[1], "base64"));
const diskFonts = await Promise.all(
  fontDir.filter((f) => f.endsWith(".woff2"))
    .map((f) => readFile(resolve(ROOT, "public/fonts", f)))
);
if (pvFonts.length !== diskFonts.length) {
  fail(`Náhled veze ${pvFonts.length} písem, v public/fonts/ jich je ${diskFonts.length}`);
} else {
  const a = pvFonts.map(sha).sort().join();
  const b = diskFonts.map(sha).sort().join();
  if (a !== b) fail("Zapečená písma v náhledu neodpovídají souborům v public/fonts/ — přegeneruj bloky @font-face");
}

/* ---- výsledek ------------------------------------------------------- */

for (const n of notes) console.log(`~ ${n}`);
for (const p of problems) console.log(`✗ ${p}`);

if (problems.length === 0) {
  console.log(`✓ Sedí: ${appOffers.length} bank, ${appServices.length} služeb, ${pvIcons.length} ikon, ${diskFonts.length} písem.`);
}
process.exit(problems.length > 0 ? 1 : 0);
