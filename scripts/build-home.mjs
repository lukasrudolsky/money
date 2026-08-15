#!/usr/bin/env node
// Vygeneruje preview/home.html: samostatnou úvodní stránku, která vede na kvíz.
//
//   node scripts/build-home.mjs
//
// Stránka se negeneruje proto, že by bylo těžké ji napsat, ale proto, aby
// nevznikla třetí ručně udržovaná kopie dat a zapečených souborů. Nabídky,
// služby, písma i loga se berou z preview/index.html; tady se skládá jen
// obsah. Když se změní data, přegeneruj a check.mjs ověří, že to sedí.
//
// Vlastní obrázky má úvodní stránka jen tam, kde kvíz nic srovnatelného
// nemá: hero, tlapka v tlačítkách a maskoti u tří kroků. Berou se
// z public/img/ (WebP má přednost před PNG) a zapékají se do data URI.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "preview/index.html");
const OUT = resolve(ROOT, "preview/home.html");

const quiz = await readFile(SRC, "utf8");

function grab(re, what) {
  const m = quiz.match(re);
  if (!m) {
    console.error(`✗ v preview/index.html nenacházím ${what}`);
    process.exit(1);
  }
  return m;
}

function arrayAfter(marker) {
  const open = quiz.indexOf("[", quiz.indexOf(marker));
  let depth = 0;
  for (let i = open; i < quiz.length; i++) {
    if (quiz[i] === "[") depth++;
    else if (quiz[i] === "]" && --depth === 0) {
      return new Function(`return ${quiz.slice(open, i + 1)}`)();
    }
  }
  console.error(`✗ neuzavřené pole u ${marker}`);
  process.exit(1);
}

const faces = quiz.match(/@font-face \{[\s\S]*?\n  \}/g) ?? [];
if (faces.length !== 4) {
  console.error(`✗ čekal jsem 4 bloky @font-face, našel ${faces.length}`);
  process.exit(1);
}
const favicon = grab(/rel="icon"[^>]*href="(data:image\/png;base64,[^"]+)"/, "faviconu")[1];
const logos = Object.fromEntries(
  [...quiz.matchAll(/^    ([a-z]+): "(data:[^"]+)",$/gm)].map((m) => [m[1], m[2]])
);

// Rozměry z hlavičky souboru. Nejsou na ozdobu: tlapka visí v CSS jako
// jediná kopie (viz níž), takže si prohlížeč nemá odkud vzít poměr stran
// a musí se mu předat přes aspect-ratio.
function imageSize(bytes, mime) {
  if (mime === "image/png") return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
  const tag = bytes.toString("ascii", 12, 16); // RIFF kontejner, tři varianty
  if (tag === "VP8X") return { w: bytes.readUIntLE(24, 3) + 1, h: bytes.readUIntLE(27, 3) + 1 };
  if (tag === "VP8 ") return { w: bytes.readUInt16LE(26) & 0x3fff, h: bytes.readUInt16LE(28) & 0x3fff };
  if (tag === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

// Zapeče obrázek do data URI: stránka se otvírá i bez serveru, relativní
// cesta by z ní vedla do prázdna. Přípona se nezadává — WebP má přednost
// před PNG, takže odlehčená verze položená vedle původní se vezme sama.
async function bake(base) {
  for (const [ext, mime] of [[".webp", "image/webp"], [".png", "image/png"]]) {
    const bytes = await readFile(resolve(ROOT, base + ext)).catch(() => null);
    if (!bytes) continue;
    const size = imageSize(bytes, mime);
    if (!size || !size.w || !size.h) {
      console.error(`✗ ${base}${ext}: z hlavičky nejde přečíst rozměr — čekal jsem PNG nebo WebP`);
      process.exit(1);
    }
    console.log(`  ${base}${ext} (${(bytes.length / 1024).toFixed(0)} kB, ${size.w}×${size.h})`);
    return { uri: `data:${mime};base64,${bytes.toString("base64")}`, ...size };
  }
  return null;
}

// Tlapka místo šipky v tlačítkách. Když soubor chybí, tlačítka vezou původní
// šipku a build to nahlas řekne — prázdné tlačítko by se hledalo hůř.
const paw = await bake("public/img/paw");
if (!paw) console.warn("⚠ public/img/paw.webp ani paw.png tam není — tlačítka zatím vezou šipku");

// Obrázek do hero. Na rozdíl od zbytku stránky se nebere z kvízu: ten má
// v úvodu veverku na stromě, tady drží tlapka telefon. Jsou to dvě různé
// role, tak mají dva různé soubory a check.mjs je proti sobě nekontroluje.
const hero = await bake("public/img/hero");
if (!hero) {
  console.error("✗ public/img/hero.webp ani hero.png tam není — hero by zůstalo prázdné");
  process.exit(1);
}

const ARROW =
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true"><path d="M3 12h11"/><path d="M12.5 5.5 20.5 12l-8 6.5Z" fill="currentColor" stroke="none"/></svg>`;

// Ukazovátko na konci tlačítka. Tlapka je prázdný span s pozadím, ne <img>:
// tlačítek je osm a osm kopií zapečeného obrázku by stránku nafouklo osmkrát.
// Takhle data URI leží v CSS jednou a spany na ni jen ukazují.
const cue = () => paw ? `<span class="paw" aria-hidden="true"></span>` : ARROW;

const OFFERS = arrayAfter("const OFFERS =");
const SERVICES = arrayAfter("const SERVICES =");
const QUESTIONS = (quiz.match(/key: "[a-z]+", type: "[a-z]+"/g) ?? []).length;
const POT = OFFERS.reduce((s, o) => s + o.amount, 0);

const czk = (n) => n.toLocaleString("cs-CZ").replace(/ /g, "&nbsp;") + "&nbsp;Kč";
const otazek = (n) => (n === 1 ? "otázku" : n < 5 ? "otázky" : "otázek");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Řazení nabídek na úvodní stránce: od nejvyšší odměny. Kvíz řadí stejně
// (components/BonusQuiz.jsx a preview/index.html, `y.amount - x.amount`),
// takže pořadí, které je tu vidět, sedí s tím, co člověku vyjde ve výsledku.
const SORTED = OFFERS.slice().sort((a, b) => b.amount - a.amount);

// Kolik nabídek je vidět před rozbalením — jedna řada mřížky na desktopu.
// Zbytek zůstává v HTML a jen se schová: hledání ve stránce, čtečka
// i check.mjs (ten vyžaduje každou banku i částku v home.html) tak pořád
// vidí všechno. Když se nabídky vejdou celé, negeneruje se ani přepínač.
const VISIBLE = 3;
const HIDDEN = SORTED.slice(VISIBLE);

// Počet v nadpisu sekce se bere z dat, ne se opisuje: opsané číslo by po
// přidání nabídky tiše zestárlo a nadpis by sliboval jiný počet, než je vidět.
const bonusu = (n) => (n === 1 ? "bonus" : n < 5 ? "bonusy" : "bonusů");

// „Zobrazit dalších X" česky: číslovka mění pád podstatného jména.
const dalsich = (n) =>
  n === 1 ? "další nabídku" : n < 5 ? `další ${n} nabídky` : `dalších ${n} nabídek`;

// Dlaždice je na šířku v poměru 4:3 stejně jako v kvízu: půlka log jsou
// wordmarky a ve čtverci vycházely opticky menší než čtvercové značky.
//
// Značka uvnitř není <img>, ale pozadí z proměnné. Každé logo je na stránce
// nejmíň třikrát (pás ho veze dvakrát, karty potřetí, notifikace počtvrté)
// a se zapečeným data URI v každém <img> se stránka nafoukla o 179 kB
// v samých kopiích. Takhle leží zdroj v :root jednou a dlaždice na něj
// jen ukazují.
const logoVars = Object.entries(logos)
  .map(([id, uri]) => `    --logo-${id}: url("${uri}");`).join("\n");

const logo = (id, h) => {
  const w = Math.round((h * 4) / 3);
  return `<span class="logo" style="width:${w}px;height:${h}px">` +
    `<span class="mark" style="width:${w - 12}px;height:${h - 14}px;background-image:var(--logo-${id})"></span></span>`;
};

// Pořadí nabídky. Stuhy se kříží nad diskem a mizí za ním, takže z medaile
// zbyde nahoře jen véčko — v třiceti pixelech se pozná spíš než detail.
// Od čtvrtého místa zbývá samotný disk v barvách stránky: kdyby medaili
// dostali všichni, přestala by první tři odlišovat.
const RIBBONS =
  `<path class="rib-a" d="M4.5 0H9.5L15 12L10 14Z"/><path class="rib-b" d="M19.5 0H14.5L9 12L14 14Z"/>`;

const rank = (i) => {
  const n = i + 1;
  const medal = n <= 3;
  return `<span class="rank rank-${medal ? n : "plain"}">` +
    `<svg viewBox="0 0 24 28" role="img" aria-label="${n}. místo">` +
    (medal ? RIBBONS : "") +
    `<circle class="disc" cx="12" cy="18" r="9"/>` +
    `<circle class="disc-in" cx="12" cy="18" r="6.6"/>` +
    `<text x="12" y="18" text-anchor="middle" dominant-baseline="central">${n}</text>` +
    `</svg></span>`;
};

// Karta nabídky. Logo a částka jsou nahoře vedle sebe: ve sloupci karet se
// čte napříč mřížkou právě ta částka, takže má zůstat na stejné výšce u všech.
// Pořadové číslo je index v SORTED, ne v dávce, aby se „nejvyšší odměna"
// držela první nabídky i po rozdělení na viditelné a skryté.
const offerRow = (o, i) => `      <div class="offer">
        <span class="head">
          ${rank(i)}
          ${logo(o.id, 44)}
          <span class="amt">${czk(o.amount)}</span>
        </span>
        <span class="txt">
          <span class="bank">${esc(o.bank)}${i === 0 ? '<span class="tag">Nejvyšší bonus</span>' : ""}</span>
        </span>
        <input class="termsbox" type="checkbox" id="terms-${o.id}">
        <span class="cond-panel"><span class="cond">${esc(o.note)}</span></span>
        <span class="actions">
          <a class="pick" href="/go/${o.id}" rel="sponsored nofollow">Získat bonus</a>
          <label class="show-terms" for="terms-${o.id}">
            <span class="t-show">Zobrazit podmínky</span>
            <span class="t-hide">Skrýt podmínky</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true"><path d="M5 9 12 16 19 9"/></svg>
          </label>
        </span>
      </div>`;

// Maskot ke každému kroku: se seznamem otázek, s penězi a s odměnou. Každý
// je na stránce jednou, takže stačí <img> a poměr stran si prohlížeč vezme
// z obrázku samotného.
const stepImg = [];
for (const n of [1, 2, 3]) {
  const img = await bake(`public/img/step-${n}`);
  if (!img) {
    console.error(`✗ public/img/step-${n}.webp ani .png tam není — karta kroku by zela prázdnem`);
    process.exit(1);
  }
  stepImg.push(img);
}

// Částka v hero se nadojede jako odometr. Každá číslice je svislý pás cifer
// v okénku vysokém jeden řádek; pás se posune nahoru tak, aby v okénku
// skončila ta správná. Pásy jsou různě dlouhé — každá číslice zprava má
// o jedno kolo navíc, takže poslední cifra frčí nejrychleji a první dojede
// naposled, přesně jak se chová počítadlo, které se sčítá k výsledku.
// Celé je to v CSS: stránka jinak nemá ani řádek skriptu a kvůli jedné
// animaci ho tam nechci tahat.
const rollingSum = (n) => {
  const text = n.toLocaleString("cs-CZ").replace(/ |\s/g, " ");
  const digits = [...text].filter((c) => /[0-9]/.test(c)).length;
  let seen = 0;
  const cells = [...text].map((ch) => {
    if (!/[0-9]/.test(ch)) return `<span>&nbsp;</span>`;
    const laps = seen++ + 2; // zleva nejmíň kol, doprava přibývají
    const strip = Array.from({ length: laps * 10 }, (_, i) => i % 10).concat(Number(ch));
    return `<span class="roll" style="--end:${laps * 10}em;--i:${seen - 1}">` +
      `<span class="strip">${strip.map((d) => `<span>${d}</span>`).join("")}</span></span>`;
  });
  return `<span aria-hidden="true">${cells.join("")}&nbsp;Kč</span>` +
    `<span class="sr">${text}&nbsp;Kč</span>`;
};

// Pás log v hero: banky i služby, tedy všechno, kde na někoho čeká odměna
// nebo uvítací kredit. Vykresluje se dvakrát za sebou — na tom stojí
// nekonečné rolování, viz .logorow v CSS.
const MARQUEE = [...OFFERS.map((o) => o.id), ...SERVICES.map((s) => s.id)];

// Notifikace na displeji: cinkne každá banka, jedna po druhé, pak se
// obrazovka vyprázdní a jede se znovu.
//
// Každá má vlastní @keyframes. Jedny sdílené a jen posunuté přes
// animation-delay nešly použít: posunutý předpis se i vypíná posunutě,
// takže by karty mizely po jedné a v mřížce by po nich zůstávaly díry.
// Takhle má každá vlastní čas příchodu, ale společný čas odchodu.
// Na displej se vejde šest karet. Nabídek může být víc, tak se bere jen
// špička seznamu — jinak by přebytek přetekl přes spodní hranu telefonu.
const PINGS = SORTED.slice(0, 6);
// Časy jednoho kola. FIRST a rozdíl CYCLE − GONE dávají dohromady prodlevu
// s prázdným displejem; obojí je proto co nejmenší, aby po odchodu zpráv
// nebylo dlouho co koukat.
const CYCLE = 22;      // délka jednoho kola v sekundách
const FIRST = 0.5;     // kdy cinkne první
const STEP = 1.9;      // rozestup mezi nimi
const HOLD = 20.0;     // do kdy zůstanou stát
const GONE = 21.4;     // kdy jsou pryč

const pct = (s) => +((s / CYCLE) * 100).toFixed(2);
const pingFrames = PINGS.map((_, i) => {
  const t = FIRST + i * STEP;
  return `  .ping-${i} { animation-name: ping${i}; }
  @keyframes ping${i} {
    0%, ${pct(t)}% {
      opacity: 0; transform: translateY(-0.7em) scale(0.9);
      animation-timing-function: cubic-bezier(.34, 1.5, .5, 1);
    }
    ${pct(t + 0.55)}%, ${pct(HOLD)}% {
      opacity: 1; transform: translateY(0) scale(1);
      animation-timing-function: cubic-bezier(.4, 0, .2, 1);
    }
    ${pct(GONE)}%, 100% { opacity: 0; transform: translateY(-0.3em) scale(0.98); }
  }`;
}).join("\n");

// Hlavní nabídka. Jeden seznam pro lištu i patičku, aby se nemohly rozejít.
// Kotvy vedou do stránky, zbytek na podstránky, které zatím nestojí —
// až vzniknou, mění se jen tady.
const NAV = [
  { href: "#odmeny", label: "Bonusy za registraci" },
  { href: "#jak", label: "Jak to funguje" },
  { href: "#sluzby", label: "Služby s kreditem" },
  { href: "#faq", label: "Časté dotazy" },
  { href: "/blog", label: "Blog" },
  { href: "/o-nas", label: "O nás" },
  { href: "/kontakt", label: "Kontakt" },
];
// V liště se labely krátí, aby se šest odkazů vešlo vedle loga a tlačítka.
const NAV_SHORT = { "Služby s kreditem": "Služby", "Bonusy za registraci": "Bonusy", "Časté dotazy": "FAQ" };
const anchors = NAV.filter((l) => l.href.startsWith("#"));
const pages = NAV.filter((l) => !l.href.startsWith("#"));
const li = (l) => `          <li><a href="${l.href}">${esc(l.label)}</a></li>`;

// Časté dotazy. Odpovídá se jen na to, co web opravdu ví — u termínů
// výplaty a poplatků se odkazuje na poskytovatele, protože ta čísla nemáme
// v datech a slibovat je od stolu by bylo horší než neodpovědět.
const FAQ = [
  ["Kolik bonusů si můžu vzít najednou?",
   "Tolik, kolik zvládneš podmínek. Nejsou proti sobě: účet u jedné banky nebrání bonusu u druhé. Kvíz se přímo ptá, kolik účtů chceš založit, a podle toho ti výběr zúží."],
  ["Musím kvůli tomu rušit svůj současný účet?",
   "Ne. Bonus se váže na to, že jsi u dané banky nový, ne na to, kde jsi teď. Účty můžou běžet vedle sebe a starý si necháš, jak byl."],
  ["Kdy peníze dorazí?",
   "Až po splnění podmínek, a každý poskytovatel má jinou lhůtu. U každého bonusu píšeme, co je pro vyplacení potřeba udělat; přesný termín si ověř v podmínkách akce, protože se mění s každou kampaní."],
  ["Proč jsou bonusy jen pro nové klienty?",
   "Je to náborová akce. Banka i služba tím platí za získání zákazníka, takže na ni dosáhne ten, kdo u nich zatím účet nemá. Kvíz se proto ptá, kde už klient jsi, a takové nabídky ti rovnou odečte."],
  ["Sbíráte o mně nějaké údaje?",
   "Ne. Kvíz nechce jméno ani e-mail a odpovědi nikam neodesílá, počítají se rovnou v prohlížeči."],
  ["Jak na tom vyděláváte vy?",
   "Odkazy na banky a služby jsou partnerské, takže za založený účet dostaneme provizi. Ty platíš stejně jako jinde a pořadí v přehledu určuje výše bonusu, ne to, kolik nám kdo dá."],
];

const STEPS = [
  ["Odpovíš na " + QUESTIONS + " " + otazek(QUESTIONS),
   "Věk, kde už účet máš, kolik zvládneš plateb kartou. Nic víc."],
  ["Ukážeme, na co dosáhneš",
   "Jen bonusy, jejichž podmínky splníš. Seřazené od nejvyššího."],
  ["Vezmeš si svůj bonus",
   "U každého bonusu píšeme, co je pro vyplacení potřeba udělat."],
];

const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<link rel="icon" type="image/png" sizes="32x32" href="${favicon}">
<meta name="description" content="Bonusrádce spočítá, na které bonusy za registraci dosáhneš právě ty. Banky teď za samotné založení účtu rozdávají ${POT.toLocaleString("cs-CZ")} Kč a uvítací kredit k tomu dávají další služby. Odpověz na ${QUESTIONS} ${otazek(QUESTIONS)}, bez jména a bez e-mailu, do minuty.">
<meta name="theme-color" content="#ffffff">
<title>Bonusrádce: bonusy za registraci</title>
<style>
${faces.join("\n")}

  /* Dvě sady barev. Hero zůstává tmavě zeleny, zbytek stránky je bílý,
     takže tokeny nejde sdílet: uvnitř .hero platí --hero-*, mimo něj ty
     druhé. Mátová se na bílé ztrácí, proto má stránka vlastní sytější
     zelenou pro částky, odkazy i tlačítka. */
  :root {
    --hero-bg: #04352A;
    --hero-lift: #0A4A38;
    --hero-deep: #02241C;
    --hero-fg: #FFFFFF;
    --hero-soft: rgba(255, 255, 255, 0.72);
    --hero-faint: rgba(255, 255, 255, 0.55);
    --mint: #5EEAD4;
    --ink: #022C22;

    --page: #FFFFFF;
    --fg: #0B2620;
    --fg-soft: #46605A;
    --fg-faint: #6B837D;
    --line: #DCE8E3;
    --tint: #F1F7F4;
    --card: #FFFFFF;
    --accent: #0B5F4B;
    --accent-soft: #E7F4EE;
    /* Stín má zelenavý nádech místo šedého: na téhle stránce nikde není
       neutrální šedá a černý stín by mezi zelené tóny nepatřil. */
    --lift: 0 1px 2px rgba(11, 38, 32, 0.05), 0 10px 28px rgba(11, 95, 75, 0.07);

    /* Míra obsahu. Drží ji .wrap a dopočítává se z ní i pravý okraj
       obrázku v hero — ten je mimo .wrap, protože musí sahat pod text,
       ale zarovnaný má být na stejnou linku jako všechno ostatní. */
    --wrap: 1160px;
    --gutter: clamp(20px, 5vw, 48px);
    /* Lišta je plovoucí pilulka: --nav-h je ona sama, --nav-pad vzduch
       kolem ní. Hero se o celek vytahuje nahoru, tak ať jsou obě čísla
       na jednom místě a nemůžou se rozejít. */
    --nav-h: 64px;
    --nav-pad: 12px;
    --nav-total: calc(var(--nav-h) + var(--nav-pad) * 2);
    /* Zaoblení tlačítek. Vzorem je CTA v hero; každé tlačítko na stránce
       čte tuhle proměnnou, ať je hlavní, obtažené nebo textové.
       --r-card je schválně vlastní token, i když má zrovna stejnou
       hodnotu: karty a pilulka lišty jsou plochy, ne ovládací prvky,
       a mají se dát doladit bez toho, aby se hnula tlačítka. */
    --r-btn: 16px;
    --r-card: 16px;

    /* Vrstvy tmavého pozadí, odshora: zrno, záře za telefonem, světlo nad
       textem a pod tím vším diagonální přechod. Drží je proměnná, protože
       je vedle hero nese i sekce „Jak to funguje" — dvě kopie by se dřív
       nebo později rozešly.
       Dvě věci, na kterých ta hladkost stojí:
       — Konce září jsou rgba(mátová, 0), ne transparent. Transparent je
         průhledná ČERNÁ, takže se přechod cestou stáčí do šeda a je z něj
         špinavý prstenec.
       — Základní přechod má pět zastávek místo dvou. Mezi dvěma se na
         ploše přes tisíc pixelů rozjedou pruhy, protože osmibitová barva
         nemá dost mezistupňů; průběžné zastávky je rozdrobí.
       Zrno je poslední pojistka proti pruhům: pár procent šumu rozbije
       hranu mezi odstíny, kterou by oko jinak našlo. */
    --deep:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.045'/%3E%3C/svg%3E"),
      radial-gradient(56% 44% at 79% 27%, rgba(94, 234, 212, 0.17), rgba(94, 234, 212, 0) 70%),
      radial-gradient(72% 52% at 40% -8%, rgba(94, 234, 212, 0.11), rgba(94, 234, 212, 0) 74%),
      linear-gradient(168deg,
        var(--hero-lift) 0%, #073E30 22%, var(--hero-bg) 48%,
        #032B22 76%, var(--hero-deep) 100%);
    --deep-repeat: repeat, no-repeat, no-repeat, no-repeat;

    /* Povoluje animovat rozměr do klíčového slova auto. Potřebuje to
       rozbalování v častých dotazech; prohlížeče, které to neznají,
       vlastnost ignorují. */
    interpolate-size: allow-keywords;

    /* Zapečená loga, každé jednou. Dlaždice na ně ukazují přes background. */
${logoVars}

    --ui: "Schibsted Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    --display: "Bricolage Grotesque", var(--ui);
    /* Obrázek je na výšku, ne na šířku jako veverka na stromě před ním:
       při stejné šířce by byl dvakrát vyšší než hero a telefon by lezl
       do navigace. Proto výrazně užší rozsah. */
    --mascot-w: clamp(240px, 22vw, 360px);
    color-scheme: light;
${paw ? `    --paw: url("${paw.uri}");` : ""}
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--page);
    color: var(--fg);
    font-family: var(--ui);
    -webkit-font-smoothing: antialiased;
  }

  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .hero :focus-visible { outline-color: var(--mint); }

  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  /* Kotva nesmí skončit pod plovoucí lištou, tak se o ni odsadí. */
  section { scroll-margin-top: calc(var(--nav-total) + 12px); }

  .wrap { max-width: var(--wrap); margin: 0 auto; padding-inline: var(--gutter); }

  h1, h2, h3 { font-family: var(--display); letter-spacing: -0.02em; margin: 0; }
  p { margin: 0; }

  /* ---- navigace ---------------------------------------------------- */

  /* Lišta je krytá napevno, ne průsvitná s rozostřením: pod ní projíždí
     tmavé hero i bílé sekce, takže se přes ni obsah propisoval a text
     v ní měnil kontrast podle toho, kde je člověk na stránce. */
  /* Sama lišta nic nekreslí, jen drží odstup od hran okna. Bílá plocha
     je až na pruhu uvnitř, takže kolem něj prosvítá obsah — nahoře hero,
     níž bílé sekce. Stín místo linky: ta by se na bílé sekci ztratila. */
  .nav { position: sticky; top: 0; z-index: 10; padding-block: var(--nav-pad); }
  /* Pilulka sedí uvnitř .wrap, ne místo něj: její hrany tak padnou na
     stejnou linku jako text v hero a karty níž. Vlastní odsazení uvnitř
     drží logo a tlačítko od zaoblených rohů. */
  /* Tři sloupce, ne řada: krajní dva mají stejnou váhu, takže odkazy
     uprostřed stojí na ose lišty bez ohledu na to, jak široká je značka
     nebo tlačítko. Ve flexu je táhla doprava jen mezera za značkou.
     Pod 1080 px se odkazy skryjí a prostřední sloupec se srazí na nulu,
     takže značka zůstane vlevo a tlačítko vpravo. */
  .nav .bar {
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center; gap: 24px; height: var(--nav-h);
    padding-inline: 22px;
    background: var(--page);
    /* Pilulka jde s tlačítky, ne s kartami: je to lišta ovládání a její
       roh leží pár pixelů od rohu tlačítka „Spustit kvíz" uvnitř, takže
       se musí hýbat spolu s ním. */
    border-radius: var(--r-btn);
    box-shadow: var(--lift);
  }
  /* Jméno vedle značky nese displejové písmo a je větší než odkazy v liště:
     je to název webu, ne další položka nabídky, a při shodné velikosti se
     mezi nimi ztrácel. */
  .brand {
    display: inline-flex; align-items: center; gap: 10px;
    text-decoration: none; color: var(--fg);
    font-family: var(--display); font-size: 1.1875rem;
    font-weight: 700; letter-spacing: -0.02em;
    margin-right: auto;
  }
  .brand img { width: 32px; height: 32px; border-radius: 8px; display: block; }
  .navlinks { display: none; gap: 24px; }
  .navlinks a {
    text-decoration: none; font-size: 0.9375rem; color: var(--fg-soft);
    transition: color 140ms cubic-bezier(.4, 0, .2, 1);
  }
  .navlinks a:hover { color: var(--accent); }
  .nav .go { padding: 9px 18px; font-size: 0.9375rem; justify-self: end; }
  /* Šest odkazů vedle loga a tlačítka potřebuje víc místa než tři, proto
     se lišta rozbaluje až o dost později. Pod tím zbývá logo a tlačítko
     do kvízu, tedy to, kvůli čemu na stránce člověk je. */
  @media (min-width: 1080px) { .navlinks { display: flex; } }
  @media (max-width: 420px) { .brand span { display: none; } }

  /* ---- hero -------------------------------------------------------- */

  /* Hero podjíždí pod lištu, aby se zelená ukázala v jejích zaoblených
     rozích. Záporný margin ho o výšku lišty vytáhne nahoru a stejná
     hodnota se přičte k hornímu odsazení, takže obsah zůstane, kde byl. */
  .hero {
    position: relative;
    /* Spodní rohy zaoblené stejnou hodnotou jako pilulka lišty, ať se roh
       nahoře a dole na stránce neliší. Horní rohy ne: hero podjíždí pod
       lištu, tam by zaoblení nebylo vidět a jen by ukouslo zelenou. */
    border-radius: 0 0 var(--r-btn) var(--r-btn);
    margin-top: calc(var(--nav-total) * -1);
    padding: calc(clamp(56px, 9vh, 104px) + var(--nav-total)) 0 clamp(56px, 9vh, 96px);
    background-color: var(--hero-bg);
    /* Vrstvy odshora: zrno, záře za telefonem, světlo nad textem a pod tím
       vším diagonální přechod.
       Dvě věci, na kterých ta hladkost stojí:
       — Konce září jsou rgba(mátová, 0), ne transparent. Transparent je
         průhledná ČERNÁ, takže se přechod cestou stáčí do šeda a je z něj
         špinavý prstenec.
       — Základní přechod má pět zastávek místo dvou. Mezi dvěma se na
         ploše přes tisíc pixelů rozjedou pruhy, protože osmibitová barva
         nemá dost mezistupňů; průběžné zastávky je rozdrobí.
       Zrno je poslední pojistka proti pruhům: pár procent šumu rozbije
       hranu mezi odstíny, kterou by oko jinak našlo. */
    background-image: var(--deep);
    background-repeat: var(--deep-repeat);
    color: var(--hero-fg);
    overflow: hidden;
  }
  /* Nástup hero. Bloky se zvedají po sobě odshora dolů, telefon jde
     naposled a z větší dálky, aby se z něj stal cíl pohledu, ne kulisa,
     která tam byla první. Hýbe se jen opacity a transform, obojí skládá
     grafická karta, takže se kvůli tomu nepřepočítává rozvržení.
     Krok mezi bloky je 90 ms: dost na to, aby bylo pořadí znát, a málo na
     to, aby někdo čekal, než se stránka dopíše. */
  @keyframes rise {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: none; }
  }
  @keyframes rise-far {
    from { opacity: 0; transform: translateY(34px); }
    to { opacity: 1; transform: none; }
  }
  .nav .bar { animation: rise 520ms cubic-bezier(.22, 1, .36, 1) both; }
  .hero .col > * { animation: rise 620ms cubic-bezier(.22, 1, .36, 1) both; }
  .hero .col > *:nth-child(1) { animation-delay: 40ms; }
  .hero .col > *:nth-child(2) { animation-delay: 130ms; }
  .hero .col > *:nth-child(3) { animation-delay: 220ms; }
  .hero .col > *:nth-child(4) { animation-delay: 310ms; }
  .phone { animation: rise-far 760ms cubic-bezier(.22, 1, .36, 1) 260ms both; }
  /* Bez pohybu se všechno rovnou ukáže, ne že se animace jen vypne — s
     fill-mode both by prvky zůstaly viset v počátečním, neviditelném stavu. */
  @media (prefers-reduced-motion: reduce) {
    .nav .bar, .hero .col > *, .phone { animation: none; opacity: 1; transform: none; }
  }

  /* Zbytek stránky se odkrývá při rolování. Řídí to scroll-driven animace
     (animation-timeline: view()), takže na to stránka pořád nepotřebuje
     skript — prohlížeč posouvá animaci podle toho, kde prvek je.
     Tři věci, kvůli kterým to neruší:
     — Blok se zvedá jen o 12 px, ne přes půl obrazovky. Má to potvrdit,
       že obsah dorazil, ne přetahovat pozornost.
     — Rozsah končí na entry 85 %, tedy dřív, než je prvek celý vidět.
       Kdo roluje rychle, uvidí ho hotový a nečeká na dojezd.
     — Prvky nemají zpožděné dávky. Rozestup vzniká sám tím, že vjíždějí
       do obrazu postupně, takže se nic nekupí ani neprobliká.
     Kde prohlížeč scroll-driven animace neumí, @supports blok přeskočí
     a obsah je prostě vidět. */
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      .band .wrap > *, .faq details {
        animation: reveal linear both;
        animation-timeline: view();
        animation-range: entry 10% entry 85%;
      }
    }
  }
  @keyframes reveal {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
  }

  .hero .col { max-width: 640px; display: grid; position: relative; z-index: 1; }
  /* Dva kroky, nic mezi tím: uvnitř skupiny ~12 px, mezi skupinami ~40 px.
     Rozestup pak sám říká, co k sobě patří — nadpis s odstavcem pod ním,
     tlačítko s drobným textem, popisek s částkou. Čísla nejsou stejná
     jako naměřené mezery: písmo si nad verzálkami a pod účařím nese
     vlastní vzduch, takže se k optickému rozestupu dopočítávají. */
  .hero .col > * + * { margin-top: 40px; }
  .hero .sum {
    font-family: var(--display);
    font-size: clamp(3.25rem, 11vw, 4.5rem);
    line-height: 1; font-weight: 700; letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    /* Záporný margin dole ořezává prázdno pod účařím, které by jinak
       mezeru k nadpisu zdvojilo. Číslo je první v pořadí, nahoře tedy
       nic dorovnávat nepotřebuje. */
    margin-bottom: -0.15em;
  }

  /* Okénko na jednu cifru. Řádek má výšku přesně 1em, takže se v pásu
     dá počítat v emech: posun o --end emů nahoru zastaví pás na cifře,
     která má zůstat vidět. */
  .sum .roll {
    display: inline-block; overflow: hidden;
    height: 1em; vertical-align: top;
  }
  /* Doba běhu roste zleva doprava, takže cifry nedosednou naráz, ale
     doklapou po sobě jako u skutečného počítadla. Krátká prodleva na
     začátku nechá stránku vykreslit, aby animace nezačala už rozjetá.
     will-change drží pás na GPU — bez toho se u nejdelšího z nich
     (padesát řádků textu) trhal překreslováním. */
  .sum .strip {
    display: block;
    will-change: transform;
    animation: roll cubic-bezier(.12, .72, .12, 1) 0.2s forwards;
    animation-duration: calc(1.75s + var(--i) * 0.16s);
  }
  .sum .strip > span { display: block; height: 1em; }
  @keyframes roll { to { transform: translateY(calc(var(--end) * -1)); } }
  /* Bez animace by v okénku zůstala nula, se kterou pás začíná — cíl se
     proto nastaví rovnou, ne že se animace jen vypne. */
  @media (prefers-reduced-motion: reduce) {
    .sum .strip { animation: none; transform: translateY(calc(var(--end) * -1)); }
  }

  /* Jen pro čtečky: v pásech je cifer dvacet, nahlas má zaznít částka. */
  .sr {
    position: absolute; width: 1px; height: 1px;
    margin: -1px; padding: 0; border: 0;
    clip-path: inset(50%); overflow: hidden; white-space: nowrap;
  }
  /* Nad otázkou je víc místa než pod ní: částka je o dost větší kus a bez
     odstupu na ni otázka dosedá. Čísla v CSS neodpovídají naměřeným
     mezerám — řádek s částkou má line-height 1 a pod účařím nic, kdežto
     odstavec si nese vlastní proklad, takže z 31 px vyjde optických 38
     a ze 14 px optických 20. */
  .hero .pitch { display: grid; margin-top: 31px; }
  .hero .pitch > * + * { margin-top: 14px; }
  /* Otázka je mátová, ne bílá. Nad ní stojí bílá částka a pod ní bílý
     odstavec, takže ve třech bílých blocích za sebou zanikala. Mátová je
     barva, kterou stránka jinak dává jen tomu, na co se má kliknout, což
     otázce sedí: je to ta věta, kvůli které se kvíz spouští. */
  .hero h1 {
    font-size: clamp(1.875rem, 5.2vw, 2.5rem);
    line-height: 1.1; font-weight: 700; letter-spacing: -0.03em;
    color: var(--mint);
  }
  .hero .sub { font-size: 1.125rem; color: var(--hero-soft); max-width: 60ch; }
  .hero .fine { color: var(--hero-faint); }
  .hero .go { background: var(--mint); color: var(--ink); }

  /* Loga jedou dokola: pás nese seznam dvakrát za sebou a posouvá se
     přesně o jeho půlku, takže skok zpátky na začátek padne do místa,
     kde stejné logo právě bylo, a není ho vidět. */
  /* Pás drží šířku textového sloupce, takže lícuje s odstavcem nad ním
     i s tlačítkem. Nic pod ním není: žádný rám ani odmaskované okraje —
     obojí bylo vidět dřív než loga. Ořez si nese overflow, bez něj by
     se pás rozjel přes celé hero. */
  .logorow { overflow: hidden; }
  .logorow .track {
    display: flex; gap: 12px; width: max-content;
    animation: marquee 34s linear infinite;
  }
  /* Půlka pásu a k tomu půlka mezery: mezera je i ve švu mezi oběma
     sadami, takže bez ní by se pás každé kolo posunul o 6 px. */
  @keyframes marquee { to { transform: translateX(calc(-50% - 6px)); } }
  .logorow:hover .track { animation-play-state: paused; }
  @media (prefers-reduced-motion: reduce) { .logorow .track { animation: none; } }
  .logorow .logo { opacity: 0.9; }

  /* Dvojice tlačítek v hero. Na úzkém sloupci se zalomí pod sebe. */
  .btns { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }

  /* Vedlejší akce. Geometrii si bere z .go, takže má stejnou výšku
     i zaoblení a mění se jen výplň; odsazení je o pixel nižší, protože
     linka po obvodu by ji jinak udělala o dva pixely vyšší než plné
     tlačítko vedle. Stejné řešení jako .ghost v kvízu. */
  .hero .go.ghost {
    padding: 13px 25px;
    background: transparent;
    color: var(--hero-fg);
    border: 1px solid rgba(255, 255, 255, 0.28);
    transition:
      transform 220ms cubic-bezier(.22, 1, .36, 1),
      background 140ms cubic-bezier(.4, 0, .2, 1),
      border-color 140ms cubic-bezier(.4, 0, .2, 1);
  }
  .hero .go.ghost:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.45);
  }
  .close { display: grid; justify-items: start; }
  /* Víc než mezi řádky textu jinde v hero: pod plným tlačítkem vysokým
     padesát pixelů se stejná mezera čte jako přilepený popisek. */
  .close > * + * { margin-top: 14px; }

  /* Strop je odvozený od hero, ne od okna: sekce roste s délkou textu
     a obrázek se od ní musí odrazit, jinak při kratším hero doskočí až
     pod lištu. Těch 88 px je vzduch, který mu nahoře zůstane vždycky.
     Když strop zabere, object-fit obrázek zmenší a object-position ho
     nechá viset v pravém dolním rohu, takže se nikam neposune. */
  /* Pravá hrana obrázku stojí na stejné lince jako obsah v .wrap: nejdřív
     půlka toho, oč je okno širší než míra obsahu, a k tomu okraj. Nad
     mírou obsahu zbyde jen okraj, proto to max(). */
  .phone {
    position: absolute; bottom: 0;
    right: calc(max(0px, (100% - var(--wrap)) / 2) + var(--gutter));
    /* Šířka řídí velikost; strop ve vh je pojistka pro nízká okna, aby
       telefon nenarostl přes celé hero. Písmo notifikací se odvozuje
       z téže šířky, takže se zmenšují s ním. */
    width: min(var(--mascot-w), 44vh);
    font-size: calc(min(var(--mascot-w), 44vh) / 30);
    pointer-events: none; user-select: none;
  }
  .mascot { display: block; width: 100%; height: auto; }
  @media (max-width: 1239px) { .phone { display: none; } }

  /* Notifikace leží na displeji. Rozměry jsou v procentech obrázku, kde
     displej opravdu je (změřeno v hero.webp: 261..640 z 800 na šířku,
     26..826 z 1117 na výšku), takže drží i když se telefon zmenší. */
  .notes {
    /* Rozměry displeje změřené v hero.webp podle rámečku telefonu: 261 až
       646 z 800 na šířku, 27 až 830 z 1117 na výšku. Dřív tu bylo 47.4 %
       místo 48.25 a pás notifikací tak seděl o kousek vlevo od středu. */
    position: absolute; left: 32.63%; top: 2.42%; width: 48.25%; height: 71.98%;
    padding: 2.9em 0.85em 0;
    display: grid; align-content: start; gap: 0.55em;
  }
  /* Třída je „ping", ne „note": tu už nese podtitul sekcí a notifikace by
     mu vzaly rámeček i mizení. */
  .ping {
    display: flex; align-items: center; gap: 0.6em;
    padding: 0.5em 0.7em; border-radius: 1em;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(11, 38, 32, 0.07);
    /* Dva stíny: úzký těsně pod kartou ji odlepí od displeje, široký
       a měkký dělá dojem, že leží nad ním. Na bílém displeji je stín
       jediné, čím se karta pozná. */
    box-shadow: 0 0.12em 0.25em rgba(11, 38, 32, 0.07), 0 0.5em 1.1em rgba(11, 38, 32, 0.10);
    /* Každá cinkne o kousek později a všechny se schovají zase spolu.
       Křivka je v klíčových snímcích, ne tady: příchod má doskok,
       odchod ne. */
    opacity: 0;
    animation-duration: ${CYCLE}s;
    animation-iteration-count: infinite;
  }
  .nlogo {
    flex: none; width: 2.3em; height: 2.3em; border-radius: 0.72em;
    background: #fff; box-shadow: inset 0 0 0 1px rgba(11, 38, 32, 0.06);
    display: inline-flex; align-items: center; justify-content: center;
  }
  .nlogo .mark { width: 1.6em; height: 1.6em; }
  .ntxt { display: grid; gap: 0.05em; min-width: 0; flex: 1; }
  /* Jméno vlevo, čas vpravo: bez něj to byl řádek seznamu, s ním je to
     zpráva, která právě přišla. */
  .nhead { display: flex; align-items: baseline; gap: 0.4em; }
  .nhead b { font-size: 0.8em; font-weight: 500; color: var(--fg); }
  .nhead em {
    margin-left: auto; font-style: normal;
    font-size: 0.7em; color: var(--fg-faint);
  }
  .ntxt i {
    font-style: normal; font-family: var(--display); font-weight: 700;
    font-size: 1.05em; color: var(--accent); font-variant-numeric: tabular-nums;
  }

  /* Předpis pro každou notifikaci zvlášť, generovaný z časů nahoře. */
${pingFrames}
  @media (prefers-reduced-motion: reduce) {
    .ping { animation: none; opacity: 1; }
  }

  /* Dlaždice loga je bílá. V hero ji od tmavého pozadí oddělí sama, na bílé
     stránce by zmizela, proto tam dostane linku. */
  .logo {
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 12px; background: #fff; flex: none; overflow: hidden;
    border: 1px solid var(--line);
  }
  .hero .logo { border-color: transparent; }
  .mark {
    display: block;
    background-position: center; background-size: contain; background-repeat: no-repeat;
  }

  /* ---- tlačítka ---------------------------------------------------- */

  .go {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 26px; border-radius: var(--r-btn);
    font: inherit; font-size: 1.125rem; text-decoration: none;
    background: var(--accent); color: #fff;
    transition: transform 220ms cubic-bezier(.22, 1, .36, 1);
  }
  .go:hover { transform: translateY(-1px); }

  /* Tlapka se řídí výškou, šířku dopočítá aspect-ratio ze skutečných
     rozměrů souboru. Kreslená srst potřebuje víc místa než čárová šipka,
     aby na ní byly vidět prsty, proto je o pár pixelů vyšší než ikona,
     kterou nahradila; záporný margin ten přírůstek tlačítku vrátí. */
${paw ? `  .paw {
    /* Výška se váže na písmo tlačítka, ne na pixely: velké CTA i menší
       tlačítko na kartě tak dostanou tlapku ve stejném poměru k textu
       a stačí na to jedno pravidlo. Tlapka je široká a hustá, takže při
       výšce původní šipky působila větší než ona; na výšku písmene se
       zklidní a v řádku sedí jako interpunkce, ne jako druhý prvek. */
    height: 1em; aspect-ratio: ${paw.w} / ${paw.h}; flex: none;
    background: var(--paw) center / contain no-repeat;
    /* Natažený prst leží zhruba ve dvou pětinách výšky obrázku, tedy nad
       jeho středem. Posun dolů ho položí na osu textu, aby ukazoval tam
       kam čte oko, ne nad to. Záporný margin drží výšku tlačítka. */
    transform: translateY(0.045em);
    margin-block: -0.15em;
  }` : "  /* tlapka chybí, tlačítka vezou šipku */"}
  .fine { font-size: 0.9375rem; color: var(--fg-faint); }

  /* ---- sekce ------------------------------------------------------- */

  /* Tónovaný pruh nese bílé karty. Obráceně to nefungovalo: skoro bílé
     karty na bílé stránce splývaly a sekce vypadala prázdně. */
  .band { padding: clamp(48px, 7vh, 80px) 0; }
  /* Tmavý pruh uprostřed stránky. Nese stejné pozadí jako hero, takže se
     na něm musí obrátit celé schéma: nadpis a text zesvětlit, karty
     z bílých udělat průsvitné a tlačítko z tmavě zeleného na mátové —
     zelená na zelené by zmizela. */
  .band.dark {
    background-color: var(--hero-bg);
    background-image: var(--deep);
    background-repeat: var(--deep-repeat);
    color: var(--hero-fg);
  }
  .band + .band:not(.dark) { border-top: 1px solid var(--line); }
  .band.dark h2 { color: var(--hero-fg); }
  .band.dark .note { color: var(--hero-soft); }
  .band.dark .go { background: var(--mint); color: var(--ink); }
  /* Karta je jen prosvětlené místo v pozadí, ne bílý blok: bílá by na
     tmavém pruhu překřičela i maskoty uvnitř. Stín nahrazuje linka —
     měkký stín se na tmavém podkladu stejně nepozná. */
  .band.dark .card {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: none;
  }
  .band.dark .card h3 { color: var(--hero-fg); }
  .band.dark .card p { color: var(--hero-soft); }
  /* Hlavička sekce stojí na střed nad obsahem, který zůstává zarovnaný
     vlevo. Podtitul si drží míru 62 ch, jen se vystředí sám k sobě. */
  .band h2 {
    font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 600;
    margin-bottom: 8px; text-align: center;
  }
  .band .note {
    color: var(--fg-soft); font-size: 1.0625rem; line-height: 1.5;
    max-width: 62ch; margin-inline: auto; text-align: center;
  }
  .grid { display: grid; gap: 12px; margin-top: 32px; }
  @media (min-width: 760px) { .steps { grid-template-columns: repeat(3, 1fr); } }

  .card {
    padding: 24px; border-radius: var(--r-card);
    background: var(--card); border: 1px solid var(--line);
    box-shadow: var(--lift);
  }
  /* Číslo kroku je plné, ne jen tónované: v pořadí je to ta nejsilnější
     informace a bledý kroužek ji nesl hůř než sám nadpis. */
  .card .chip {
    display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 12px;
    background: var(--accent); color: #fff;
    font-family: var(--display); font-size: 1.0625rem; font-weight: 700;
    margin-bottom: 18px;
  }
  .card h3 { font-size: 1.3125rem; font-weight: 600; margin-bottom: 8px; color: var(--fg); }
  .card p { color: var(--fg-soft); font-size: 1rem; line-height: 1.55; }

  /* Maskot ke kroku stojí v tónované nice, ne přímo na bílé kartě: sám
     o sobě je vystřižený a bez podkladu by se v ploše ztratil. Číslo kroku
     zůstalo, jen se přesunulo do rohu obrázku — jako samostatný řádek nad
     nadpisem by kartu po přidání ilustrace natáhlo o dvě patra. */
  /* Odsazení shora pouští maskota od horní hrany niky; dolů dosedá, aby
     na ní stál. Výška niky ten vzduch dorovnává, takže sám maskot zůstal
     stejně velký, jen se nika o kousek zvedla. */
  .card .pic {
    position: relative; display: block;
    height: 172px; padding-top: 16px; margin-bottom: 18px;
    /* Bílá plocha pod maskotem. Na tmavé kartě je to jediné světlé místo
       v sekci, takže oranžová srst vyskočí dopředu a nika sama funguje
       jako rám obrázku. */
    background: var(--page);
    border-radius: 14px;
    overflow: hidden;
  }
  .card .pic img { display: block; height: 100%; width: auto; margin-inline: auto; }
  /* Číslo kroku je kolečko, ne dlaždice: čtvercový blok v rohu niky vedle
     kulatého maskota působil jako přilepený štítek. Měkký stín ho posadí
     do stejné hloubky jako karty kolem. */
  /* Plná zelená s bílým číslem: na bílé nice by mátové kolečko splynulo. */
  .card .pic .chip {
    position: absolute; left: 14px; top: 14px; margin-bottom: 0;
    width: 34px; height: 34px; border-radius: 50%;
    font-size: 0.9375rem;
    background: var(--accent); color: #fff;
    box-shadow: var(--lift);
  }

  /* ---- řádek nabídky ----------------------------------------------- */

  .offer {
    display: flex; align-items: center; gap: 16px;
    padding: 16px 20px; border-radius: var(--r-card);
    background: #fff; border: 1px solid var(--line);
    box-shadow: var(--lift);
  }
  .offer .txt { flex: 1; min-width: 0; }
  .offer .bank { display: block; font-weight: 500; }
  .offer .cond { display: block; font-size: 0.9375rem; line-height: 1.5; color: var(--fg-soft); }
  .offer .amt {
    font-family: var(--display); font-size: 1.5rem; font-weight: 700;
    letter-spacing: -0.02em; color: var(--accent);
    white-space: nowrap; font-variant-numeric: tabular-nums;
  }
  .offer .tag {
    margin-left: 8px; font-size: 0.6875rem; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--accent); font-weight: 600;
  }
  @media (max-width: 520px) {
    .offer { flex-wrap: wrap; }
    .offer .amt { margin-left: auto; }
  }

  /* ---- karty nabídek ------------------------------------------------ */

  /* Nabídky bank stojí v mřížce karet, tři na šířku. Šest jich tak vyjde
     přesně na dvě řady, což je to, co je vidět před rozbalením. Služby
     zůstávají řádkem: nemají částku a jejich popis je na kartu moc dlouhý. */
  .grid.offers { grid-template-columns: 1fr; }
  @media (min-width: 620px) { .grid.offers { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 940px) { .grid.offers { grid-template-columns: repeat(3, 1fr); } }

  /* Sloupec, ne mřížka: tlačítko se pak dá odsadit přes margin-top: auto
     ke spodní hraně. Karty v řadě se natáhnou na stejnou výšku, takže
     tlačítka drží linku i při různě dlouhé podmínce. */
  .offers .offer {
    display: flex; flex-direction: column; align-items: stretch; gap: 14px;
    padding: 20px;
  }
  /* Pořadí a logo vlevo, částka vpravo na stejné výšce ve všech kartách:
     v mřížce se čte právě sloupec částek a rozházené by se hledaly hůř. */
  .offers .offer .head { display: flex; align-items: center; gap: 10px; }
  .offers .offer .amt { margin-left: auto; }

  /* Medaile. Disk zůstává v kovech, protože zlato, stříbro a bronz řeknou
     pořadí bez čtení čísla. Stuha je proti tomu v zelené stránky, ne ve
     zlaté: drží medaili přivázanou k paletě a nechává teplou barvu jen
     tam, kde nese význam. */
  .rank { flex: none; width: 30px; }
  .rank svg { display: block; width: 100%; height: auto; }
  .rank .rib-a { fill: var(--accent); }
  .rank .rib-b { fill: #083F32; }
  .rank .disc { fill: var(--medal-out); }
  .rank .disc-in { fill: var(--medal-in); }
  .rank text {
    font-family: var(--display); font-weight: 700; font-size: 9px;
    fill: var(--medal-ink);
  }
  .rank-1 { --medal-out: #D9A400; --medal-in: #F6CD48; --medal-ink: #6A4C00; }
  .rank-2 { --medal-out: #9AA6AE; --medal-in: #CBD5DA; --medal-ink: #414B52; }
  .rank-3 { --medal-out: #A9682F; --medal-in: #D08F55; --medal-ink: #4E2D13; }
  /* Bez stuhy zbývá disk na stejném místě viewBoxu, takže čísla od čtyřky
     výš stojí v jedné ose s medailemi nad nimi. Barvy jdou do neutrálních
     tokenů stránky, aby byl mezi třetím a čtvrtým místem vidět předěl. */
  .rank-plain { --medal-out: var(--line); --medal-in: var(--tint); --medal-ink: var(--fg-soft); }
  .offers .offer .txt { display: grid; gap: 4px; }
  .offers .offer .bank { font-size: 1.125rem; }

  /* Podmínky jsou po rozkliknutí, ne rovnou: v mřížce šesti karet se
     porovnávají hlavně částky a šest odstavců drobného textu mezi nimi
     dělalo z přehledu čtení. Text zůstává v HTML, jen sbalený. */
  .offers .offer .cond-panel {
    display: grid; grid-template-rows: 0fr; opacity: 0;
    /* Sbalený panel je sice nulově vysoký, ale pořád je to položka flexu
       a bere si mezeru z obou stran. Záporný margin jednu z nich vrátí,
       aby po zavření nezůstala v kartě díra. */
    margin-top: -14px;
    transition:
      grid-template-rows 280ms cubic-bezier(.22, 1, .36, 1),
      margin-top 280ms cubic-bezier(.22, 1, .36, 1),
      opacity 180ms linear;
  }
  .offers .offer .cond-panel > .cond { overflow: hidden; min-height: 0; }
  .termsbox:checked ~ .cond-panel { grid-template-rows: 1fr; opacity: 1; margin-top: 0; }

  /* Obě tlačítka spolu dole. Vedle sebe se do sloupce karty nevejdou,
     takže pod sebe: napřed to, kvůli kterému karta je. */
  .offers .offer .actions { margin-top: auto; display: grid; gap: 6px; }
  .offers .offer .show-terms {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 9px 14px; border-radius: var(--r-btn);
    font: inherit; font-size: 0.9375rem; cursor: pointer; color: var(--fg-soft);
    transition:
      color 140ms cubic-bezier(.4, 0, .2, 1),
      background 140ms cubic-bezier(.4, 0, .2, 1);
  }
  .offers .offer .show-terms:hover { color: var(--fg); background: var(--tint); }
  .offers .offer .show-terms svg { transition: transform 280ms cubic-bezier(.22, 1, .36, 1); }
  .show-terms .t-hide { display: none; }
  .termsbox:checked ~ .actions .show-terms .t-show { display: none; }
  .termsbox:checked ~ .actions .show-terms .t-hide { display: inline; }
  .termsbox:checked ~ .actions .show-terms svg { transform: rotate(180deg); }
  .termsbox:focus-visible ~ .actions .show-terms {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .offers .offer .cond-panel, .offers .offer .show-terms,
    .offers .offer .show-terms svg { transition: none; }
  }
  /* Odznak zůstává na řádku se jménem. Na vlastním řádku přidal kartě
     s nejvyšší odměnou čtvrtý řádek textu, takže její řada byla vyšší než
     ta rozbalená pod ní a mřížka vypadala rozjetě. Nezalomí se uvnitř,
     jen celý spadne pod jméno, když se za dlouhý název nevejde. */
  .offers .offer .tag { white-space: nowrap; }

  /* Tlačítko na odměnu. margin-top: auto ho drží dole bez ohledu na to,
     kolik řádků zabrala podmínka. Odkaz míří na /go/<id> stejně jako
     ve výsledku kvízu, včetně rel — jsou to partnerské odkazy. */
  .offers .offer .pick {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 11px 18px; border-radius: var(--r-btn);
    font-size: 1rem; text-decoration: none;
    /* Plné na všech kartách. Obtažené tlačítko u nižších nabídek dělalo
       z pořadí i váhu: první karta vypadala jako doporučení a zbytek jako
       druhá liga. Pořadí říká medaile a částka, tlačítko má všude stejně
       zvát ke kliknutí. */
    background: var(--accent); color: #fff;
    border: 1px solid var(--accent);
    transition: background 140ms cubic-bezier(.4, 0, .2, 1);
  }
  .offers .offer .pick:hover { background: #0A5342; }
  @media (prefers-reduced-motion: reduce) { .offers .offer .pick { transition: none; } }

  /* ---- rozbalení zbylých nabídek ------------------------------------ */

  /* Stránka nemá skript, takže stav drží zaškrtávátko: je odsunuté z obrazu,
     ale zůstává ostrůvkem fokusu, takže přepínač jde ovládat klávesnicí.
     Skryté nabídky zůstávají v HTML, jen se sbalí — hledání ve stránce i
     čtečka je najdou. */
  .morebox, .termsbox {
    position: absolute; width: 1px; height: 1px;
    margin: -1px; padding: 0; border: 0;
    clip-path: inset(50%); overflow: hidden; white-space: nowrap;
  }

  /* Výška se animuje přes grid-template-rows 0fr → 1fr: na rozdíl od
     max-height nepotřebuje hádat cílovou výšku, takže přechod trvá stejně
     u dvou i u dvaceti nabídek. */
  .more {
    display: grid; grid-template-rows: 0fr;
    opacity: 0; margin-top: 0;
    transition:
      grid-template-rows 340ms cubic-bezier(.22, 1, .36, 1),
      margin-top 340ms cubic-bezier(.22, 1, .36, 1),
      opacity 200ms linear;
  }
  /* min-height: 0 musí být, jinak řádky sbalení neprojdou. Ořez kvůli
     animaci ale bral kartám stín — vnitřní odsazení mu nechá místo
     a záporný margin vrátí mřížku do zákrytu s tou nad ní. */
  .more > .grid {
    overflow: hidden; min-height: 0;
    margin: 0 -20px -20px; padding: 0 20px 20px;
  }
  .morebox:checked ~ .more { grid-template-rows: 1fr; opacity: 1; margin-top: 12px; }

  .morerow, .ctarow { display: flex; justify-content: center; }
  .morerow { margin-top: 24px; }
  .ctarow { margin-top: 36px; }
  .more-toggle {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 22px; border-radius: var(--r-btn);
    font: inherit; font-size: 1rem; cursor: pointer;
    background: var(--card); color: var(--accent);
    border: 1px solid var(--line); box-shadow: var(--lift);
    transition:
      transform 220ms cubic-bezier(.22, 1, .36, 1),
      border-color 140ms cubic-bezier(.4, 0, .2, 1);
  }
  .more-toggle:hover { transform: translateY(-1px); border-color: var(--accent); }
  .more-toggle svg { transition: transform 340ms cubic-bezier(.22, 1, .36, 1); }
  .morebox:focus-visible ~ .morerow .more-toggle {
    outline: 2px solid var(--accent); outline-offset: 3px;
  }

  .more-toggle .more-hide { display: none; }
  .morebox:checked ~ .morerow .more-toggle .more-show { display: none; }
  .morebox:checked ~ .morerow .more-toggle .more-hide { display: inline; }
  .morebox:checked ~ .morerow .more-toggle svg { transform: rotate(180deg); }

  @media (prefers-reduced-motion: reduce) {
    .more, .more-toggle, .more-toggle svg { transition: none; }
  }

  /* ---- závěr a patička --------------------------------------------- */

  /* Časté dotazy. Rozbaluje je nativní <details>, ne další zaškrtávátko:
     umí to prohlížeč sám, jde to klávesnicí a čtečka to ohlásí jako
     rozbalovací skupinu. Skript na to stránka nepotřebuje. */
  .faq { max-width: 76ch; margin: 32px auto 0; }
  .faq details {
    border-bottom: 1px solid var(--line);
  }
  .faq details:first-of-type { border-top: 1px solid var(--line); }
  /* Řádek se na najetí podbarví celý, ne že jen přeskočí barva písma.
     Odsazení do stran je záporným marginem vytažené zpátky, takže se
     podbarvení rozlije za text, ale otázky zůstanou zarovnané s nadpisem. */
  .faq summary {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 20px 14px; margin-inline: -14px; border-radius: 12px;
    cursor: pointer;
    font-family: var(--display); font-size: 1.0625rem; letter-spacing: -0.01em;
    list-style: none;
    transition:
      background 180ms cubic-bezier(.4, 0, .2, 1),
      color 180ms cubic-bezier(.4, 0, .2, 1);
  }
  /* Safari kreslí vlastní trojúhelník i po list-style: none. */
  .faq summary::-webkit-details-marker { display: none; }
  .faq summary:hover { background: var(--tint); color: var(--accent); }
  .faq summary svg {
    flex: none; color: var(--fg-faint);
    transition:
      transform 260ms cubic-bezier(.22, 1, .36, 1),
      color 180ms cubic-bezier(.4, 0, .2, 1);
  }
  .faq summary:hover svg { color: var(--accent); }
  .faq details[open] summary svg { transform: rotate(180deg); }

  /* Rozbalení se sjíždí, ne skáče. block-size na ::details-content umí
     prohlížeč animovat jen díky interpolate-size výš — bez něj se přechod
     do auto nedá spočítat. Kde to prohlížeč neumí, obě vlastnosti prostě
     ignoruje a panel se otevře naráz jako dřív, nic se nerozbije. */
  .faq details::details-content {
    block-size: 0; overflow: hidden;
    transition: block-size 300ms cubic-bezier(.22, 1, .36, 1),
                content-visibility 300ms allow-discrete;
  }
  .faq details[open]::details-content { block-size: auto; }
  .faq details p {
    padding: 0 4px 22px; margin-top: -4px;
    color: var(--fg-soft); font-size: 1rem; line-height: 1.6; max-width: 66ch;
  }
  @media (prefers-reduced-motion: reduce) {
    .faq summary, .faq summary svg, .faq details::details-content { transition: none; }
  }

  /* Poslední výzva před patičkou. Bílá plocha s nadpisem a tlačítkem tu
     zanikala mezi dvěma dalšími bílými sekcemi, tak dostala vlastní tmavý
     panel — stejný přechod jako niky u kroků, takže si stránka na konci
     zopakuje barvu, kterou začala v hero. */
  .end .endcard {
    display: grid; align-items: center; gap: 24px;
    padding: clamp(32px, 5vw, 52px);
    border-radius: 28px; overflow: hidden;
    /* Přechod jde do strany, ne dolů. Svisle mířil ze tmy do světla, takže
       drobný text u spodní hrany dosedal na nejsvětlejší místo a ztrácel se.
       Takhle drží tmu tam, kde stojí text, a světlo nechává vpravo za
       maskotem, kde nikomu nepřekáží. */
    background: linear-gradient(100deg,
      #0A3830 0%, #0C4437 30%, #0F5645 50%, #147059 68%,
      #178C6E 84%, #1EA181 100%);
    color: var(--hero-fg); text-align: left;
  }
  /* Maskot vedle textu až tam, kde je na dva sloupce místo. */
  @media (min-width: 860px) { .end .endcard { grid-template-columns: 1fr auto; } }
  @media (max-width: 859px) { .end .endmascot { display: none; } }

  /* Přebíjí vystředění, které platí pro nadpisy sekcí: tady stojí nadpis
     v jednom sloupci s odstavcem a tlačítkem, takže musí lícovat s nimi. */
  .end .endcard h2 { margin-bottom: 10px; text-align: left; }
  .end .endlead {
    color: var(--hero-soft); font-size: 1.0625rem; line-height: 1.5;
    max-width: 46ch; margin-bottom: 26px;
  }
  /* Mátové tlačítko jako v hero: na tmavém panelu je zelené neviditelné. */
  .end .endcard .go { background: var(--mint); color: var(--ink); }
  .end .endcard .fine { color: var(--hero-faint); margin-top: 14px; }
  /* Maskot dosedá na spodní hranu panelu: záporný margin sežere spodní
     odsazení karty a overflow: hidden ohlídá, že nepřeteče přes roh. */
  .end .endmascot {
    display: block; align-self: end;
    width: clamp(150px, 18vw, 210px); height: auto;
    margin-bottom: calc(clamp(32px, 5vw, 52px) * -1);
  }

  footer { padding: clamp(40px, 6vh, 64px) 0 48px; border-top: 1px solid var(--line); background: var(--tint); }
  .foot { display: grid; gap: 32px; }
  @media (min-width: 760px) { .foot { grid-template-columns: 1.6fr 1fr 1fr 1fr; } }
  .foot h3 {
    font-family: var(--ui); font-size: 0.8125rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--fg-faint); margin-bottom: 12px;
  }
  .foot ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .foot a { text-decoration: none; font-size: 1rem; color: var(--fg-soft); }
  .foot a:hover { color: var(--fg); }
  .foot .about p { color: var(--fg-soft); font-size: 1rem; line-height: 1.55; max-width: 42ch; }
  .foot .about .brand { margin: 0 0 12px; }
  .legal { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--line); }
  /* Bez míry 76 znaků: ta hlídá čitelnost odstavce, ale tady zbyla
     jediná věta a lomila se na dva řádky, čímž patička vypadala delší,
     než je. Na jednom řádku se přečte jedním pohledem. */
  .legal p { color: var(--fg-faint); font-size: 0.875rem; line-height: 1.5; }

  /* Podpis a autor na jednom řádku, na úzkém okně pod sebou. */
  .colophon {
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px;
    margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line);
    color: var(--fg-faint); font-size: 0.875rem;
  }
  .colophon a { text-decoration: none; color: var(--fg-soft); }
  .colophon a:hover { color: var(--fg); }
</style>
</head>
<body>

<nav class="nav">
  <div class="wrap">
   <div class="bar">
    <a class="brand" href="#top">
      <img src="${favicon}" alt="">
      <span>Bonusrádce</span>
    </a>
    <div class="navlinks">
${NAV.map((l) => `      <a href="${l.href}">${esc(NAV_SHORT[l.label] ?? l.label)}</a>`).join("\n")}
    </div>
    <a class="go" href="__QUIZ__">Zjistit moje bonusy</a>
   </div>
  </div>
</nav>

<header class="hero" id="top">
  <div class="phone" aria-hidden="true">
    <img class="mascot" src="${hero.uri}" width="${hero.w}" height="${hero.h}" alt="">
    <div class="notes">
${PINGS.map((o, i) => `      <div class="ping ping-${i}">
        <span class="nlogo"><span class="mark" style="background-image:var(--logo-${o.id})"></span></span>
        <span class="ntxt">
          <span class="nhead"><b>${esc(o.bank)}</b><em>teď</em></span>
          <i>+${czk(o.amount)}</i>
        </span>
      </div>`).join("\n")}
    </div>
  </div>
  <div class="wrap">
    <div class="col">
      <p class="sum">${rollingSum(POT)}</p>

      <div class="pitch">
        <h1>Kolik z toho je pro tebe?</h1>
        <p class="sub">Tolik je k mání jen na bonusech za založení účtu, uvítací kredity u služeb se počítají zvlášť. Odpověz na ${QUESTIONS} ${otazek(QUESTIONS)} a poskládáme ti z toho nejvyšší částku, na kterou dosáhneš, i s tím, co si kde pohlídat, aby ti nic neuteklo.</p>
      </div>

      <div class="close">
        <div class="btns">
          <a class="go" href="__QUIZ__">Zjistit moje bonusy
            ${cue()}
          </a>
          <a class="go ghost" href="#odmeny">Všechny bonusy</a>
        </div>
        <p class="fine">Necelá minuta. Bez jména, bez e-mailu.</p>
      </div>

      <div class="logorow">
        <div class="track">${[...MARQUEE, ...MARQUEE].map((id) => logo(id, 48)).join("")}</div>
      </div>
    </div>
  </div>
</header>

<main>
  <section class="band" id="odmeny">
    <div class="wrap">
    <h2>Top ${OFFERS.length} ${bonusu(OFFERS.length)}</h2>
    <p class="note">Nejvyšší bonusy mají nejvíc podmínek, ty nejnižší nechtějí skoro nic. Kvíz z toho vybere, co sedí na tebe.</p>
    <div class="grid offers">
${SORTED.slice(0, VISIBLE).map(offerRow).join("\n")}
    </div>
${HIDDEN.length === 0 ? "" : `
    <input class="morebox" type="checkbox" id="more-offers">
    <div class="more">
      <div class="grid offers">
${HIDDEN.map((o, i) => offerRow(o, i + VISIBLE)).join("\n")}
      </div>
    </div>
    <div class="morerow">
      <label class="more-toggle" for="more-offers">
        <span class="more-show">Zobrazit ${dalsich(HIDDEN.length)}</span>
        <span class="more-hide">Skrýt</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true"><path d="M5 9 12 16 19 9"/></svg>
      </label>
    </div>`}
    </div>
  </section>

  <section class="band dark" id="jak">
    <div class="wrap">
    <h2>Jak to funguje</h2>
    <p class="note">Kvíz nesbírá kontakty. Ptá se jen na to, co rozhoduje o tom, jestli ti bonus někdo vyplatí.</p>
    <div class="grid steps">
${STEPS.map(([t, d], i) => `      <div class="card">
        <span class="pic">
          <img src="${stepImg[i].uri}" alt="" width="${stepImg[i].w}" height="${stepImg[i].h}">
          <span class="chip"><strong>${i + 1}</strong></span>
        </span>
        <h3>${esc(t)}</h3>
        <p>${esc(d)}</p>
      </div>`).join("\n")}
    </div>
    <div class="ctarow">
      <a class="go" href="__QUIZ__">Zjistit moje bonusy ${cue()}</a>
    </div>
    </div>
  </section>

  <section class="band" id="sluzby">
    <div class="wrap">
    <h2>Kde ještě dostaneš uvítací kredit</h2>
    <p class="note">Výši kreditu určuje aktuální akce, uvidíš ji při registraci. Proto tady žádnou částku netipujeme.</p>
    <div class="grid">
${SERVICES.map((s) => `      <div class="offer">
        ${logo(s.id, 44)}
        <span class="txt">
          <span class="bank">${esc(s.name)}<span class="tag">${esc(s.tag)}</span></span>
          <span class="cond">${esc(s.note)}</span>
        </span>
      </div>`).join("\n")}
    </div>
    </div>
  </section>

  <section class="band" id="faq">
    <div class="wrap">
    <h2>Časté dotazy</h2>
    <p class="note">Šest věcí, na které se lidi ptají nejčastěji. Zbytek najdeš v podmínkách u konkrétní nabídky.</p>
    <div class="faq">
${FAQ.map(([q, a]) => `      <details>
        <summary>${esc(q)}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true"><path d="M5 9 12 16 19 9"/></svg>
        </summary>
        <p>${esc(a)}</p>
      </details>`).join("\n")}
    </div>
    </div>
  </section>

  <section class="band end">
    <div class="wrap">
      <div class="endcard">
        <div class="endtxt">
          <h2>Tak co, kolik to bude?</h2>
          <p class="endlead">Odpověz na ${QUESTIONS} ${otazek(QUESTIONS)} a poskládáme ti z bonusů nejvyšší částku, na kterou dosáhneš.</p>
          <a class="go" href="__QUIZ__">Zjistit moje bonusy
            ${cue()}
          </a>
          <p class="fine">Necelá minuta. Bez jména, bez e-mailu.</p>
        </div>
        <img class="endmascot" src="${stepImg[2].uri}" width="${stepImg[2].w}" height="${stepImg[2].h}" alt="" aria-hidden="true">
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="foot">
      <div class="about">
        <span class="brand"><img src="${favicon}" alt=""><span>Bonusrádce</span></span>
        <p>Bonusrádce srovnává bonusy za registraci a počítá, na které z nich dosáhneš právě ty.</p>
      </div>
      <div>
        <h3>Na stránce</h3>
        <ul>
${anchors.map(li).join("\n")}
        </ul>
      </div>
      <div>
        <h3>Web</h3>
        <ul>
${pages.map(li).join("\n")}
        </ul>
      </div>
      <div>
        <h3>Spočítat</h3>
        <ul>
          <li><a href="__QUIZ__">Zjistit moje bonusy</a></li>
        </ul>
      </div>
    </div>

    <div class="legal">
      <p>Odkazy jsou partnerské, pořadí ale určuje výše bonusu, ne provize. Podmínky ověř u poskytovatele, nejsme banka ani poradce.</p>
      <div class="colophon">
        <span>© ${new Date().getFullYear()} bonusradce.cz</span>
        <span>Web vytvořil <a href="https://profiweb.cz">profiweb.cz</a></span>
      </div>
    </div>
  </div>
</footer>

</body>
</html>
`;

const quizHref = process.argv.includes("--quiz-url")
  ? process.argv[process.argv.indexOf("--quiz-url") + 1]
  : "index.html";

await writeFile(OUT, html.replaceAll("__QUIZ__", quizHref), "utf8");
console.log(`✓ preview/home.html (${(Buffer.byteLength(html) / 1024).toFixed(0)} kB), odkaz na kvíz: ${quizHref}`);
