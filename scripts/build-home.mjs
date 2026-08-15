#!/usr/bin/env node
// Vygeneruje preview/home.html: samostatnou úvodní stránku, která vede na kvíz.
//
//   node scripts/build-home.mjs
//
// Stránka se negeneruje proto, že by bylo těžké ji napsat, ale proto, aby
// nevznikla třetí ručně udržovaná kopie dat a zapečených souborů. Nabídky,
// služby, písma, loga i maskot se berou z preview/index.html; tady se skládá
// jen obsah. Když se změní data, přegeneruj a check.mjs ověří, že to sedí.

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
const mascot = grab(/const MASCOT = "(data:image\/[a-z]+;base64,[^"]+)"/, "maskota")[1];
const favicon = grab(/rel="icon"[^>]*href="(data:image\/png;base64,[^"]+)"/, "faviconu")[1];
const logos = Object.fromEntries(
  [...quiz.matchAll(/^    ([a-z]+): "(data:[^"]+)",$/gm)].map((m) => [m[1], m[2]])
);

const OFFERS = arrayAfter("const OFFERS =");
const SERVICES = arrayAfter("const SERVICES =");
const QUESTIONS = (quiz.match(/key: "[a-z]+", type: "[a-z]+"/g) ?? []).length;
const POT = OFFERS.reduce((s, o) => s + o.amount, 0);

const czk = (n) => n.toLocaleString("cs-CZ").replace(/ /g, "&nbsp;") + "&nbsp;Kč";
const otazek = (n) => (n === 1 ? "otázku" : n < 5 ? "otázky" : "otázek");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Dlaždice je na šířku v poměru 4:3 stejně jako v kvízu: půlka log jsou
// wordmarky a ve čtverci vycházely opticky menší než čtvercové značky.
const logo = (id, h) => {
  const w = Math.round((h * 4) / 3);
  return `<span class="logo" style="width:${w}px;height:${h}px">` +
    `<img src="${logos[id]}" alt="" width="${w - 12}" height="${h - 14}"></span>`;
};

const STEPS = [
  ["Odpovíš na " + QUESTIONS + " " + otazek(QUESTIONS),
   "Věk, kde už účet máš, kolik zvládneš plateb kartou. Nic víc."],
  ["Ukážeme, na co dosáhneš",
   "Jen odměny, jejichž podmínky splníš. Seřazené od nejvyšší."],
  ["Založíš účet a vezmeš si odměnu",
   "U každé banky píšeme, co je pro vyplacení potřeba udělat."],
];

const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<link rel="icon" type="image/png" sizes="32x32" href="${favicon}">
<meta name="description" content="Banky teď rozdávají dohromady ${POT.toLocaleString("cs-CZ")} Kč za založení účtu. Odpověz na ${QUESTIONS} ${otazek(QUESTIONS)} a poskládáme ti z bonusů nejvyšší možnou částku, na kterou dosáhneš. Bez jména, bez e-mailu, necelá minuta.">
<meta name="theme-color" content="#ffffff">
<title>Kolik ti dají banky za nový účet</title>
<style>
${faces.join("\n")}

  /* Dvě sady barev. Hero zůstává tmavě zeleny, zbytek stránky je bílý,
     takže tokeny nejde sdílet: uvnitř .hero platí --hero-*, mimo něj ty
     druhé. Mátová se na bílé ztrácí, proto má stránka vlastní sytější
     zelenou pro částky, odkazy i tlačítka. */
  :root {
    --hero-bg: #04352A;
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

    --ui: "Schibsted Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    --display: "Bricolage Grotesque", var(--ui);
    --mascot-w: clamp(380px, 40vw, 620px);
    color-scheme: light;
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
  section { scroll-margin-top: 84px; }

  .wrap { max-width: 1160px; margin: 0 auto; padding-inline: clamp(20px, 5vw, 48px); }

  h1, h2, h3 { font-family: var(--display); letter-spacing: -0.02em; margin: 0; }
  p { margin: 0; }

  /* ---- navigace ---------------------------------------------------- */

  .nav {
    position: sticky; top: 0; z-index: 10;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--line);
  }
  .nav .bar { display: flex; align-items: center; gap: 24px; height: 68px; }
  .brand {
    display: inline-flex; align-items: center; gap: 10px;
    text-decoration: none; font-weight: 600; letter-spacing: -0.01em;
    margin-right: auto; color: var(--fg);
  }
  .brand img { width: 32px; height: 32px; border-radius: 8px; display: block; }
  .navlinks { display: none; gap: 24px; }
  .navlinks a {
    text-decoration: none; font-size: 0.9375rem; color: var(--fg-soft);
    transition: color 140ms cubic-bezier(.4, 0, .2, 1);
  }
  .navlinks a:hover { color: var(--fg); }
  .nav .go { padding: 9px 18px; font-size: 0.9375rem; }
  @media (min-width: 860px) { .navlinks { display: flex; } }
  @media (max-width: 420px) { .brand span { display: none; } }

  /* ---- hero -------------------------------------------------------- */

  .hero {
    position: relative;
    padding: clamp(56px, 9vh, 104px) 0 clamp(56px, 9vh, 96px);
    background-color: var(--hero-bg);
    background-image:
      radial-gradient(90% 60% at 50% 0%, rgba(94, 234, 212, 0.14), transparent 62%),
      radial-gradient(70% 45% at 88% 6%, rgba(94, 234, 212, 0.08), transparent 70%);
    background-repeat: no-repeat;
    color: var(--hero-fg);
    overflow: hidden;
  }
  .hero .col { max-width: 640px; display: grid; position: relative; z-index: 1; }
  .hero .col > * + * { margin-top: 32px; }
  .hero .head { display: grid; }
  .hero .head > * + * { margin-top: 8px; }
  .hero .eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    color: var(--mint); font-size: 0.875rem;
  }
  .hero .lead { font-size: 1.125rem; color: var(--hero-soft); }
  .hero .sum {
    font-family: var(--display);
    font-size: clamp(3.25rem, 11vw, 4.5rem);
    line-height: 1; font-weight: 700; letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    margin-top: -4px; margin-bottom: -0.15em;
  }
  .hero .pitch { display: grid; margin-top: 32px; }
  .hero .pitch > * + * { margin-top: 8px; }
  .hero h1 { font-size: clamp(1.75rem, 5vw, 2.25rem); line-height: 1.1; font-weight: 600; }
  .hero .sub { font-size: 1.125rem; color: var(--hero-soft); max-width: 60ch; }
  .hero .fine { color: var(--hero-faint); }
  .hero .go { background: var(--mint); color: var(--ink); }

  .logorow { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
  .logorow .logo { opacity: 0.9; }
  .close { display: grid; justify-items: start; }
  .close > * + * { margin-top: 8px; }

  .mascot {
    position: absolute; right: 0; bottom: 0;
    width: var(--mascot-w); height: auto; max-height: 92vh;
    object-fit: contain; object-position: right bottom;
    pointer-events: none; user-select: none;
  }
  @media (max-width: 1239px) { .mascot { display: none; } }

  /* Dlaždice loga je bílá. V hero ji od tmavého pozadí oddělí sama, na bílé
     stránce by zmizela, proto tam dostane linku. */
  .logo {
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 12px; background: #fff; flex: none; overflow: hidden;
    border: 1px solid var(--line);
  }
  .hero .logo { border-color: transparent; }
  .logo img { display: block; object-fit: contain; }

  /* ---- tlačítka ---------------------------------------------------- */

  .go {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 26px; border-radius: 16px;
    font: inherit; font-size: 1.125rem; text-decoration: none;
    background: var(--accent); color: #fff;
    transition: transform 220ms cubic-bezier(.22, 1, .36, 1);
  }
  .go:hover { transform: translateY(-1px); }
  .fine { font-size: 0.875rem; color: var(--fg-faint); }

  /* ---- sekce ------------------------------------------------------- */

  /* Tónovaný pruh nese bílé karty. Obráceně to nefungovalo: skoro bílé
     karty na bílé stránce splývaly a sekce vypadala prázdně. */
  .band { padding: clamp(48px, 7vh, 80px) 0; }
  .band.tinted { background: var(--tint); }
  .band + .band:not(.tinted) { border-top: 1px solid var(--line); }
  .band h2 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 600; margin-bottom: 8px; }
  .band .note { color: var(--fg-soft); font-size: 0.9375rem; max-width: 62ch; }
  .grid { display: grid; gap: 12px; margin-top: 32px; }
  @media (min-width: 760px) { .steps { grid-template-columns: repeat(3, 1fr); } }

  .card {
    padding: 24px; border-radius: 18px;
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
  .card h3 { font-size: 1.1875rem; font-weight: 600; margin-bottom: 8px; color: var(--fg); }
  .card p { color: var(--fg-soft); font-size: 0.9375rem; line-height: 1.5; }

  /* ---- řádek nabídky ----------------------------------------------- */

  .offer {
    display: flex; align-items: center; gap: 16px;
    padding: 16px 20px; border-radius: 16px;
    background: #fff; border: 1px solid var(--line);
    box-shadow: var(--lift);
  }
  .offer.best {
    border-color: var(--accent); background: var(--accent-soft);
    box-shadow: 0 1px 2px rgba(11, 38, 32, 0.06), 0 12px 32px rgba(11, 95, 75, 0.12);
  }
  .offer .txt { flex: 1; min-width: 0; }
  .offer .bank { display: block; font-weight: 500; }
  .offer .cond { display: block; font-size: 0.875rem; color: var(--fg-soft); }
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

  /* ---- závěr a patička --------------------------------------------- */

  .end { text-align: center; }
  .end h2 { margin-bottom: 24px; }

  footer { padding: clamp(40px, 6vh, 64px) 0 48px; border-top: 1px solid var(--line); background: var(--tint); }
  .foot { display: grid; gap: 32px; }
  @media (min-width: 760px) { .foot { grid-template-columns: 1.6fr 1fr 1fr; } }
  .foot h3 {
    font-family: var(--ui); font-size: 0.8125rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--fg-faint); margin-bottom: 12px;
  }
  .foot ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .foot a { text-decoration: none; font-size: 0.9375rem; color: var(--fg-soft); }
  .foot a:hover { color: var(--fg); }
  .foot .about p { color: var(--fg-soft); font-size: 0.9375rem; max-width: 42ch; }
  .foot .about .brand { margin: 0 0 12px; }
  .legal { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--line); }
  .legal p { color: var(--fg-faint); font-size: 0.8125rem; max-width: 76ch; }
  .legal p + p { margin-top: 8px; }
</style>
</head>
<body>

<nav class="nav">
  <div class="wrap bar">
    <a class="brand" href="#top">
      <img src="${favicon}" alt="">
      <span>Kolik ti dají banky</span>
    </a>
    <div class="navlinks">
      <a href="#jak">Jak to funguje</a>
      <a href="#odmeny">Odměny bank</a>
      <a href="#sluzby">Služby</a>
    </div>
    <a class="go" href="__QUIZ__">Spustit kvíz</a>
  </div>
</nav>

<header class="hero" id="top">
  <img class="mascot" src="${mascot}" alt="" aria-hidden="true">
  <div class="wrap">
    <div class="col">
      <div class="head">
        <span class="eyebrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true"><path d="M10 2 12 8.5 18.5 10.5 12 12.5 10 19 8 12.5 1.5 10.5 8 8.5Z" fill="currentColor" stroke="none"/><path d="M18 14.5 19 18l3.5 1-3.5 1-1 3.5-1-3.5-3.5-1 3.5-1Z" fill="currentColor" stroke="none"/></svg>
          <span>Odměny za založení účtu</span>
        </span>
        <p class="lead">Banky teď rozdávají dohromady</p>
        <p class="sum">${czk(POT)}</p>
      </div>

      <div class="pitch">
        <h1>Kolik z toho je pro tebe?</h1>
        <p class="sub">Ber všechny, na které dosáhneš. Odpověz na ${QUESTIONS} ${otazek(QUESTIONS)} a poskládáme ti z bonusů nejvyšší možnou částku a poradíme, co si u které banky pohlídat, aby ti odměna neutekla.</p>
      </div>

      <div class="logorow">${OFFERS.map((o) => logo(o.id, 48)).join("")}</div>

      <div class="close">
        <a class="go" href="__QUIZ__">Zjistit, na co dosáhnu
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true"><path d="M3 12h11"/><path d="M12.5 5.5 20.5 12l-8 6.5Z" fill="currentColor" stroke="none"/></svg>
        </a>
        <p class="fine">Necelá minuta. Bez jména, bez e-mailu.</p>
      </div>
    </div>
  </div>
</header>

<main>
  <section class="band tinted" id="jak">
    <div class="wrap">
    <h2>Jak to funguje</h2>
    <p class="note">Kvíz nesbírá kontakty. Ptá se jen na to, co rozhoduje o tom, jestli ti banka odměnu vyplatí.</p>
    <div class="grid steps">
${STEPS.map(([t, d], i) => `      <div class="card">
        <span class="chip"><strong>${i + 1}</strong></span>
        <h3>${esc(t)}</h3>
        <p>${esc(d)}</p>
      </div>`).join("\n")}
    </div>
    </div>
  </section>

  <section class="band" id="odmeny">
    <div class="wrap">
    <h2>Co teď banky dávají</h2>
    <p class="note">Nejvyšší odměny stojí na příchozí výplatě, ty nejnižší nechtějí nic. Kvíz z toho vybere, co sedí na tebe.</p>
    <div class="grid">
${OFFERS.slice().sort((a, b) => b.amount - a.amount).map((o, i) => `      <div class="offer${i === 0 ? " best" : ""}">
        ${logo(o.id, 44)}
        <span class="txt">
          <span class="bank">${esc(o.bank)}${i === 0 ? '<span class="tag">Nejvyšší odměna</span>' : ""}</span>
          <span class="cond">${esc(o.note)}</span>
        </span>
        <span class="amt">${czk(o.amount)}</span>
      </div>`).join("\n")}
    </div>
    </div>
  </section>

  <section class="band tinted" id="sluzby">
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

  <section class="band end">
    <div class="wrap">
    <h2>Tak co, kolik to bude?</h2>
    <a class="go" href="__QUIZ__">Zjistit, na co dosáhnu
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true"><path d="M3 12h11"/><path d="M12.5 5.5 20.5 12l-8 6.5Z" fill="currentColor" stroke="none"/></svg>
    </a>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="foot">
      <div class="about">
        <span class="brand"><img src="${favicon}" alt=""><span>Kolik ti dají banky</span></span>
        <p>Srovnáváme odměny, které české banky platí za založení účtu, a počítáme, na které z nich dosáhneš právě ty.</p>
      </div>
      <div>
        <h3>Na stránce</h3>
        <ul>
          <li><a href="#jak">Jak to funguje</a></li>
          <li><a href="#odmeny">Odměny bank</a></li>
          <li><a href="#sluzby">Služby s kreditem</a></li>
        </ul>
      </div>
      <div>
        <h3>Spočítat</h3>
        <ul>
          <li><a href="__QUIZ__">Zjistit, na co dosáhnu</a></li>
        </ul>
      </div>
    </div>

    <div class="legal">
      <p>Odkazy na banky a služby jsou partnerské. Když si přes ně účet založíš, dostaneme provizi od banky. Ty platíš stejně jako kdekoli jinde a pořadí určuje výše odměny, ne provize.</p>
      <p>Podmínky akcí se mění. Než účet založíš, ověř si aktuální znění u banky. Nejsme banka ani finanční poradce a nezprostředkováváme uzavření smlouvy.</p>
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
