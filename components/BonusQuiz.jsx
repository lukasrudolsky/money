import { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarDays, Landmark, Wallet, Coins, Banknote,
  CreditCard, TrendingUp, Check, ArrowRight, Sparkles, ChevronLeft,
  Person, Male, Female,
} from "./icons";

// Loga žijí v /public/logos/ — oficiální soubory bank, viz public/logos/README.md
// s odkazem na zdroj u každé z nich. Přípona se liší podle toho, co banka vydává,
// takže cesta je tady napsaná celá a nedá se odvodit z id.
// Když soubor chybí nebo se nenačte, Logo níž zobrazí zkratku z pole short.
// minIncome = kolik musí měsíčně přijít na účet, aby odměna platila. Nahradilo
// to booleovské requiresIncome, které nerozlišovalo 10 000 od 15 000 Kč, takže
// se lidem nabízela odměna, na kterou svým příjmem nedosáhli.
const OFFERS = [
  { id: "airbank", bank: "Air Bank", short: "AB", tint: "#F97316", logo: "/logos/airbank.png", amount: 1500, minIncome: 15000, minCards: 5, note: "Příchozí platba od 15 000 Kč, 5 plateb kartou" },
  { id: "raiffeisen", bank: "Raiffeisenbank", short: "RB", tint: "#FACC15", logo: "/logos/raiffeisenbank.svg", amount: 3000, minIncome: 15000, minCards: 10, note: "Výplata na účet, 10 plateb kartou" },
  { id: "moneta", bank: "Moneta", short: "MO", tint: "#38BDF8", logo: "/logos/moneta.png", amount: 1200, minIncome: 10000, minCards: 0, note: "Příchozí platba od 10 000 Kč" },
  { id: "mbank", bank: "mBank", short: "mB", tint: "#FB7185", logo: "/logos/mbank.png", amount: 1000, minIncome: 0, minCards: 5, note: "5 plateb kartou po dobu 2 měsíců" },
  { id: "csob", bank: "ČSOB", short: "ČS", tint: "#818CF8", logo: "/logos/csob.svg", amount: 800, minIncome: 0, minCards: 10, note: "10 plateb kartou v prvním měsíci" },
  { id: "fio", bank: "Fio banka", short: "Fi", tint: "#4ADE80", logo: "/logos/fio.png", amount: 500, minIncome: 0, minCards: 0, note: "Bez podmínek, stačí aktivovat účet" },
  { id: "bondster", bank: "Bondster", short: "Bo", tint: "#12A66E", logo: "/logos/bondster.svg", amount: 1000, minIncome: 0, minCards: 0, note: "Registrace a investice od 5 000 Kč" },
  // Tři níž mají DEMO částku. Portu a Fondee dávají tři měsíce správy zdarma,
  // XTB akcii v hodnotě zhruba 15 až 30 dolarů — ani jedno není pevná koruna,
  // takže je tu jen dosazený odhad, aby se nabídka dala zařadit a spočítat.
  // Před ostrým během to musí nahradit skutečná čísla, nebo tyhle řádky pryč.
  { id: "portu", bank: "Portu", short: "Po", tint: "#1B4DFF", logo: "/logos/portu.png", amount: 1000, minIncome: 0, minCards: 0, demo: true, note: "Tři měsíce investování bez poplatku, vklad od 1 000 Kč" },
  { id: "fondee", bank: "Fondee", short: "Fo", tint: "#00C2A8", logo: "/logos/fondee.svg", amount: 1000, minIncome: 0, minCards: 0, demo: true, note: "Tři měsíce správy zdarma po registraci s kódem" },
  { id: "xtb", bank: "XTB", short: "XT", tint: "#E30613", logo: "/logos/xtb.png", amount: 500, minIncome: 0, minCards: 0, demo: true, note: "Akcie zdarma k novému účtu v akčním období" },
];

// Služby, které platí novým uživatelům uvítací kredit. Schválně tu NENÍ pole
// s částkou: Wolt, Bolt Food, Rohlík ani Revolut výši kreditu veřejně nefixují
// — mění se po kampaních a u Rohlíku dokonce podle počtu prvních nákupů
// (viz jejich podmínky programu). Číslo by tady tedy bylo vymyšlené a sečetlo
// by se do slibu na první obrazovce, který by neplatil. Proto se u služeb
// ukazuje, k čemu jsou, a výše kreditu se přiznaně nechává na registraci.
const SERVICES = [
  { id: "wolt", name: "Wolt", short: "Wo", tint: "#00C2E8", logo: "/logos/wolt.png",
    tag: "Jídlo domů", note: "Kredit na první objednávku. Nejširší nabídka restaurací mimo Prahu." },
  { id: "boltfood", name: "Bolt Food", short: "BF", tint: "#34D186", logo: "/logos/bolt.svg",
    tag: "Jídlo domů", note: "Sleva na první objednávky. Bývá levnější na doručení než konkurence." },
  { id: "rohlik", name: "Rohlík.cz", short: "Ro", tint: "#F3BC51", logo: "/logos/rohlik.png",
    tag: "Potraviny", note: "Kredit za první nákupy. Doveze do dvou hodin, včetně čerstvého." },
  { id: "liftago", name: "Liftago", short: "Li", tint: "#00A3E0", logo: "/logos/liftago.jpg",
    tag: "Odvoz", note: "Sleva na první jízdu. Česká alternativa k Uberu a Boltu." },
  { id: "revolut", name: "Revolut", short: "Re", tint: "#191C1F", logo: "/logos/revolut.png",
    tag: "Platební karta", note: "Uvítací bonus po první platbě. Kurzy bez příplatku na cesty." },
];

// Kolik na účet reálně dostaneš podle odpovědi na otázku o výplatě.
const INCOME = { yes: Infinity, partial: 10000, no: 0 };

const otazek = (n) => (n === 1 ? "otázku" : n < 5 ? "otázky" : "otázek");

const BG = "#04352A";
const CARD = "rgba(255,255,255,0.06)";
const LINE = "rgba(255,255,255,0.16)";
const MINT = "#5EEAD4";
const INK = "#022C22";
const LETTERS = "ABCDEFGHIJKLMN".split("");

// step === INTRO je úvodní obrazovka. Otázky začínají nulou, aby zbytek
// (ukazatel průběhu, „Zpět", počítání) zůstal na indexech beze změny.
const INTRO = -1;

/* ---- co si kvíz pamatuje mezi návštěvami --------------------------------
   Kdo projde sedm otázek a pak si nic nevezme, je dnes ztracený: po návratu
   na něj čeká prázdný formulář, ne částka, kterou si spočítal. Tohle je
   jediné, co s tím jde udělat bez e-mailu a bez serveru.

   Drží se to v prohlížeči a nikam to neodchází. Ukládají se odpovědi, ne
   výsledek — nabídky se mění a přepočítat je z odpovědí je vždycky
   správnější než vytáhnout ze šuplíku částku, která už neplatí.

   `pocet`, `castka` a `nabidky` jsou navíc pro úvodní stránku. Ta nezná
   nabídky ani pravidla kvízu a nemá je znát, jinak by tatáž logika žila na
   dvou místech. Dostane proto rovnou to, co má vypsat.

   Verze je v klíči schválně: až se tvar dat změní, starý záznam se zahodí
   místo toho, aby se z něj četla pole, která v něm nejsou. */
const STORE = "bonusradce.odpovedi.v1";

// Všechno v try: v anonymním okně a při zakázaných úložištích localStorage
// vyhodí výjimku už při čtení. Kvíz kvůli tomu nesmí spadnout, jen si
// nebude nic pamatovat.
function loadSaved() {
  try {
    const r = JSON.parse(localStorage.getItem(STORE) || "null");
    if (!r || !r.answers) return null;
    // Nabídka mohla mezitím z přehledu zmizet.
    r.vzato = (r.vzato || []).filter((id) => OFFERS.some((o) => o.id === id));
    return r;
  } catch (e) { return null; }
}

function writeSaved(answers, vzato, kdy) {
  try {
    const zbyva = matchOffers(answers).filter((o) => !vzato.includes(o.id));
    localStorage.setItem(STORE, JSON.stringify({
      kdy: kdy ?? new Date().toISOString().slice(0, 10),
      answers,
      vzato,
      pocet: zbyva.length,
      castka: zbyva.reduce((s, o) => s + o.amount, 0),
      nabidky: zbyva.map((o) => ({ id: o.id, bank: o.bank, amount: o.amount })),
    }));
  } catch (e) {}
}

const saveAnswers = (answers) => writeSaved(answers, loadSaved()?.vzato ?? []);

// Klik na „Získat bonus". Nabídka tím z nedokončených zmizí, takže zvonek
// na úvodní stránce nepřipomíná něco, co si člověk už vzal.
function markTaken(id) {
  const r = loadSaved();
  if (!r) return;
  if (!r.vzato.includes(id)) r.vzato.push(id);
  writeSaved(r.answers, r.vzato, r.kdy);
}

// Banky i služby se vybírají po víc kusech; zbytek otázek je jedna možnost.
const isMulti = (q) => q.type === "banks" || q.type === "services";
// Továrnička, ne sdílený objekt: jedna instance na úrovni modulu by půjčovala
// stejná pole každému průchodu i každé instanci kvízu a první mutace
// (answers.owned.push(…)) by otrávila i ten další.
const BLANK = () => ({ owned: [], apps: [] });

// Bricolage Grotesque nese nadpisy a částky, Schibsted Grotesk zbytek. Obojí
// SIL OFL 1.1, soubory jsou v public/fonts/ — viz tamní README. Subsety latin
// a latin-ext se dělí přes unicode-range, takže bez diakritiky se druhý soubor
// vůbec nestáhne. @font-face žije tady, protože projekt nemá globální CSS.
const UI = '"Schibsted Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const DISPLAY = `"Bricolage Grotesque", ${UI}`;
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

const face = (family, slug, weight, sub, range) => `
@font-face {
  font-family: "${family}";
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url("/fonts/${slug}-${sub}.woff2") format("woff2");
  unicode-range: ${range};
}`;

const FONT_CSS = [
  face("Bricolage Grotesque", "bricolage-grotesque", "400 800", "latin", LATIN),
  face("Bricolage Grotesque", "bricolage-grotesque", "400 800", "latin-ext", LATIN_EXT),
  face("Schibsted Grotesk", "schibsted-grotesk", "400 700", "latin", LATIN),
  face("Schibsted Grotesk", "schibsted-grotesk", "400 700", "latin-ext", LATIN_EXT),
].join("");

// Nabíhání: nabídky ve výsledku dostávají delay inline, bloky úvodu přes
// nth-child — je jich pevný počet a nemá smysl je kvůli tomu obalovat.
//
// Focus je tady schválně bez border-radius: ta vlastnost by měnila poloměr
// rohů samotného prvku, ne obrysu, a karta by při zaostření skočila z 16 px
// na 4. Obrys sleduje vlastní zaoblení prvku sám.
// Pohyb má jednu rodinu křivek a tři délky. Dojem plynulosti nedělá delší
// animace, ale to, že všechno dojíždí stejným způsobem, že se hýbou jen
// transform a opacity (prohlížeč je skládá na GPU a nepřepočítává kvůli nim
// rozvržení) a že odchod je vždycky kratší než příchod.
//   EASE     rychlý rozjezd, dlouhé měkké dojetí — pro příchody
//   EASE_IO  symetrická, pro překreslení na místě (barvy, šířky)
//   EASE_POP lehké přejetí přes cíl, jen pro stisk a potvrzení výběru
// Kvůli inline stylům v JSX to musí být konstanty, ne jen CSS proměnné.
const EASE = "cubic-bezier(.22,1,.36,1)";
const EASE_IO = "cubic-bezier(.4,0,.2,1)";
const EASE_POP = "cubic-bezier(.34,1.4,.64,1)";
const T_FAST = 140;
const T_BASE = 260;
const T_SLOW = 420;

const BASE_CSS = `
:focus-visible { outline: 2px solid ${MINT}; outline-offset: 3px; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
:root { --ease: ${EASE}; --ease-io: ${EASE_IO}; --ease-pop: ${EASE_POP}; }
@keyframes pop { 0% { transform: scale(1); } 45% { transform: scale(0.96); } 100% { transform: scale(1); } }

/* Odezva na stisk musí být v CSS, ne v inline stylu: :active se z Reactu
   nedá zapsat a inline transform by pravidlo stejně přebil. Proto tudy jde
   i potvrzení výběru (.pop) — jinak by se ty dva transformy přetahovaly. */
.press {
  transition: background ${T_FAST}ms ${EASE_IO},
              border-color ${T_FAST}ms ${EASE_IO},
              transform ${T_FAST}ms ${EASE_POP};
}
.press:active { transform: scale(0.985); }
.press.pop { animation: pop 220ms ${EASE_POP}; }

/* Odpovědi se rozjíždějí po řadě, ne najednou — oko pak stihne přečíst
   pořadí. Výplň je backwards, ne both: kdyby po doběhnutí zůstal koncový
   snímek, přebil by transform stisku. */
.enter { animation: fadeUp ${T_SLOW}ms ${EASE} backwards; }
@media (prefers-reduced-motion: reduce) {
  .enter, .press.pop { animation: none; }
}
/* Vertikální rytmus úvodu drží výhradně margin-bottom, jedna hodnota
   u jednoho elementu:
     eyebrow                16
     „Banky teď rozdávají"   8
     částka                 24
     nadpis                 16
     popis                  32
     řada log               32  (mezera mezi logy 12 = Tailwind gap-3 v JSX)
     řádek s tlačítkem      12  (pod ním footnote)
   Obaly proto nemají gap — o mezeru se stará vždycky element nad ní a nic
   se nesčítá.

   Selektory jdou přes strukturu, protože značka tady nemá třídy .lead/.sub/.row:
   .hero > div je eyebrow, .hero p nadhoz, .close > div řádek s tlačítkem.
   Reset stojí před hodnotami, takže ho stejně specifická pravidla níž přebijí
   pořadím; odstavce si jinak nesou výchozí margin prohlížeče. */
.intro { display: grid; padding-bottom: 32px; }
.intro > *,
.intro .pitch > *,
.intro .close > * { margin: 0; }

.intro .pitch, .intro .close { display: grid; }

.intro .eyebrow { margin-bottom: 16px; }
.intro .pitch h2 { margin-bottom: 16px; }
.intro .pitch p { margin-bottom: 32px; }
.intro .close > div { margin-bottom: 12px; }
.intro .close { justify-items: start; }

/* Maskot je dekorace: sedí ve volném pruhu vpravo, nereaguje na myš a pro
   odečítače neexistuje. Jedna hodnota drží jeho šířku i pruh, který mu obsah
   rezervuje — jinak se ty dvě míry rozejdou a veverka vleze do textu. Proto
   velikost podle šířky, ne podle výšky: při jiném poměru stran obrázku by
   výška dala jinou šířku, než kolik je rezervováno. */
.quiz-root { --mascot-w: clamp(380px, 40vw, 620px); }
.mascot {
  position: fixed;
  right: 0;
  bottom: 0;
  width: var(--mascot-w);
  height: auto;
  max-height: 96vh;
  object-fit: contain;
  object-position: right bottom;
  pointer-events: none;
  user-select: none;
  animation: mascotIn 700ms ${EASE} 260ms both;
}
@keyframes mascotIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .mascot { animation: none; } }
@media (max-width: 1239px) { .mascot { display: none; } }
/* Nad prahem se úvod chová jako dva sloupce: text vlevo, strom vpravo.
   Vlevo stejný vzduch jako uvnitř bloku, ne zbytek po odsazení vpravo.
   Pruh se rezervuje jen tam, kde maskot opravdu stojí — jinak by otázky
   i výsledek byly natlačené doleva kvůli obrázku, který na nich není. */
@media (min-width: 1240px) {
  .quiz-main.with-mascot { padding-left: clamp(48px, 6vw, 96px); padding-right: var(--mascot-w); }
}

/* Ve výsledku maskot nemůže být fixed jako v úvodu: výsledek se roluje a
   přišpendlená veverka by přejížděla přes nabídky. Stojí tedy vedle částky,
   v toku — a jen když nějaká odměna vyšla; nad prázdným výsledkem by jásala
   nad ničím.
   Poměr stran drží aspect-ratio, takže si místo zabere hned a částka pod
   ním neposkočí, až se obrázek načte. */
.win { display: grid; gap: 16px; justify-items: center; }
.win .cheer {
  display: block;
  width: clamp(150px, 22vw, 280px);
  aspect-ratio: 719 / 760;
  animation: cheerIn 620ms ${EASE_POP} 420ms both;
}
.win .cheer img { display: block; width: 100%; height: 100%; object-fit: contain; }
@keyframes cheerIn { from { opacity: 0; transform: scale(0.84) translateY(12px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .win .cheer { animation: none; } }
/* Vedle sebe až tam, kde na částku i veverku zbude šířka. Pod prahem jde
   veverka pod text, ne vedle něj zmenšená na nečitelno.
   Sloupce jsou auto, ne 1fr: veverka má stát hned vedle částky. Přes celou
   šířku by ji od textu odtrhla prázdná plocha a hlavička by se rozpadla na
   dva nesouvisející rohy. */
@media (min-width: 560px) {
  .win {
    grid-template-columns: auto auto;
    justify-content: start;
    justify-items: start;
    align-items: center;
    gap: clamp(24px, 4vw, 56px);
  }
}

/* Výsledek je seznam karet, ne text: v úzkém sloupci nechává půlku obrazovky
   prázdnou a nutí rolovat přes všechny nabídky. Otázky naopak zůstávají úzké,
   viz Shell — dlouhé řádky se čtou hůř.
   V mřížce jsou karty v řadě stejně vysoké, ale poznámky různě dlouhé. Bez
   flexu a margin-top: auto by tlačítka v jedné řadě skákala podle délky textu
   nad nimi. */
.wide .offers { grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); }
.wide .svcs { grid-template-columns: repeat(auto-fill, minmax(440px, 1fr)); }
.wide .offers .offer { display: flex; flex-direction: column; }
.wide .offers .offer .foot { margin-top: auto; }
/* Nejvyšší bonus drží celou šířku: je to ta jediná, kterou většina lidí
   vezme, a v mřížce by zapadla mezi ostatní jako kterákoli jiná karta. */
.wide .offers .offer.best { grid-column: 1 / -1; }

.intro > * { animation: fadeUp 520ms ${EASE} both; }
.intro > :nth-child(1) { animation-delay: 60ms; }
.intro > :nth-child(2) { animation-delay: 140ms; }
.intro > :nth-child(3) { animation-delay: 220ms; }
@media (prefers-reduced-motion: reduce) { .intro > * { animation: none; } }
`;

const QUESTIONS = [
  { key: "age", type: "single", icon: CalendarDays, q: "Kolik ti je?", sub: "Bonus za účet vyplácí banky až od osmnácti.",
    options: [
      { value: "under18", label: "Pod 18" },
      { value: "18-25", label: "18-25" },
      { value: "26+", label: "26 a víc" },
    ] },
  { key: "gender", type: "single", icon: Person, q: "Jsi muž, nebo žena?", sub: "Na výběr bonusů to nemá vliv.",
    options: [
      { value: "male", label: "Muž", icon: Male },
      { value: "female", label: "Žena", icon: Female },
    ] },
  { key: "owned", type: "banks", icon: Landmark, q: "Kde už máš účet?", sub: "Bonus dostaneš jen tam, kde ještě klient nejsi.",
    options: OFFERS.map((o) => ({ value: o.id, label: o.bank, short: o.short, tint: o.tint, logo: o.logo })) },
  { key: "apps", type: "services", icon: Sparkles, q: "Které z těchhle služeb už používáš?", sub: "Uvítací kredit dávají jen novým uživatelům. Na zbytek ti ho ukážeme.",
    options: SERVICES.map((s) => ({ value: s.id, label: s.name, short: s.short, tint: s.tint, logo: s.logo })) },
  { key: "count", type: "single", icon: Wallet, q: "Kolik účtů si chceš založit?", sub: "Bonusy jde posbírat i u víc bank najednou.",
    options: [
      { value: 1, label: "Jeden", hint: "Chci jeden a mít klid", icon: Wallet },
      { value: 3, label: "Dva až tři", hint: "Zvládnu si pohlídat víc podmínek", icon: Coins },
      { value: 99, label: "Kolik to jde", hint: "Jde mi hlavně o peníze", icon: TrendingUp },
    ] },
  // Hodnoty odpovídají klíčům v INCOME. Prostřední možnost říká konkrétní
  // částku schválně — „pár tisíc" dřív pouštělo dál i odměny za 15 000 Kč.
  { key: "income", type: "single", icon: Banknote, q: "Můžeš si nechat posílat výplatu na nový účet?", sub: "Na příchozí platbě stojí ty nejvyšší bonusy.",
    options: [
      { value: "yes", label: "Ano", hint: "Výplatu tam přesměruju", icon: Banknote },
      { value: "partial", label: "Výplatu ne", hint: "Ale 10 000 Kč měsíčně tam pošlu", icon: Coins },
      { value: "no", label: "Ne", hint: "Nový účet nechci nikam napojovat", icon: Wallet },
    ] },
  // Hranice musí sedět na minCards v OFFERS: „do pěti" s hodnotou 4 brala
  // lidem, kteří pět plateb zvládnou, odměnu s minCards 5.
  { key: "cards", type: "single", icon: CreditCard, q: "Kolik plateb kartou zvládneš měsíčně?", sub: "U většiny bonusů musíš kartou párkrát zaplatit. Poslední otázka.",
    options: [
      { value: 4, label: "Čtyři a míň", icon: CreditCard },
      { value: 9, label: "Pět až devět", icon: CreditCard },
      { value: 99, label: "Deset a víc", icon: CreditCard },
    ] },
];

// Čeština má tři tvary: 1 / 2–4 / 5 a víc. Dvě větve („jedna" a „ostatní")
// nestačí — dvojka i trojka vyjdou v prázdném výsledku úplně běžně.
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

// Součet se ukazuje teprve od otázky, která s ním hýbe. Napevno napsaná
// jednička ukazovala celý bank i nad otázkami, které do výsledku nevstupují.
const FIRST_SCORING = QUESTIONS.findIndex((q) => q.key === "owned");

function matchOffers(a) {
  const owned = a.owned || [];
  const income = INCOME[a.income ?? "yes"] ?? Infinity;
  return OFFERS
    .filter((o) => !owned.includes(o.id))
    .filter((o) => o.minIncome <= income)
    .filter((o) => o.minCards <= (a.cards ?? 99))
    .sort((x, y) => y.amount - x.amount)
    .slice(0, (a.count ?? 99) === 99 ? 99 : a.count);
}

// Co konkrétně odpověď blokuje, ví jen tenhle výpočet — proto se to prázdnému
// výsledku říká adresně místo obecného „zkus něco změnit".
function blocker(a) {
  const free = OFFERS.filter((o) => !(a.owned || []).includes(o.id));
  if (free.length === 0) return "Účet máš už u všech bank, které teď bonus dávají.";

  const byCards = free.filter((o) => o.minCards > (a.cards ?? 99)).length;
  const byIncome = free.filter((o) => o.minIncome > (INCOME[a.income ?? "yes"] ?? Infinity)).length;

  return byCards >= byIncome
    ? `Nejvíc bonusů ti bere počet plateb kartou: ${byCards} ${plural(byCards, "nabídka jich chce", "nabídky jich chtějí", "nabídek jich chce")} víc, než jsi zadal.`
    : `Nejvíc bonusů stojí na příchozí platbě: ${byIncome} ${plural(byIncome, "nabídka ji vyžaduje", "nabídky ji vyžadují", "nabídek ji vyžaduje")} vyšší, než kterou zvládneš.`;
}

// Název banky stojí vždycky vedle loga, takže alt zůstává prázdný — jinak by
// odečítač předčítal to samé dvakrát.
// Dlaždice je zaoblený čtverec, ne kolečko: loga bank jsou čtvercové ikony
// a mBank s Monetou mají barvu až do rohů, které by kolečko odřízlo.
function Logo({ src, short, tint, size = 44 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  // Dlaždice je na šířku v poměru 4:3, ne čtverec. Loga bank jsou z půlky
  // wordmarky (Air Bank 2,5:1, Fio 1,4:1) a ve čtverci vycházela opticky
  // o dost menší než čtvercové značky, které ho vyplní celý.
  const w = Math.round(size * 4 / 3);
  const iw = w - 12;
  const ih = size - 14;
  return (
    <span className="inline-flex items-center justify-center rounded-xl shrink-0 overflow-hidden"
      style={{ width: w, height: size, background: failed || !src ? tint : "#fff", color: INK }}>
      {failed || !src
        ? <span className="text-sm">{short}</span>
        : <img src={src} alt="" width={iw} height={ih} loading="lazy" decoding="async"
            style={{ width: iw, height: ih, objectFit: "contain" }}
            onError={() => setFailed(true)} />}
    </span>
  );
}

function Ticker({ value }) {
  const [n, setN] = useState(0);
  const [bump, setBump] = useState(false);
  const raf = useRef(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    const t0 = performance.now();
    setBump(true);
    const t = setTimeout(() => setBump(false), T_BASE);
    // Čtvrtá mocnina místo třetí a o něco delší doba: číslo vyletí a poslední
    // stovky dopadají pomalu, takže se dají přečíst. Krátký lineárnější dojezd
    // vypadá jako přeblikávání číslic.
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 820);
      setN(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(t); };
  }, [value]);
  return (
    <span style={{
      display: "inline-block",
      fontFamily: DISPLAY,
      fontVariantNumeric: "tabular-nums",
      transform: bump ? "scale(1.12)" : "scale(1)",
      transition: `transform ${T_BASE}ms ${EASE_POP}`,
    }}>
      {n.toLocaleString("cs-CZ")} Kč
    </span>
  );
}

// mascot = úvod, kde ve volném pruhu vpravo stojí veverka a obsah mu musí
// nechat místo. wide = výsledek, kde se místo textu skládají karty.
function Shell({ children, progress, total, mascot = false, wide = false }) {
  return (
    <div className="quiz-root w-full min-h-screen flex flex-col"
      style={{
        backgroundColor: BG,
        // Plochá zeleň působila jako papír. Jemné světlo shora dá stránce
        // hloubku a drží pozornost tam, kde je částka.
        backgroundImage:
          "radial-gradient(90% 55% at 50% 0%, rgba(94,234,212,0.13), transparent 62%),"
          + "radial-gradient(70% 45% at 88% 8%, rgba(94,234,212,0.07), transparent 70%)",
        backgroundRepeat: "no-repeat",
        color: "#fff",
        fontFamily: UI,
      }}>
      <style>{FONT_CSS + BASE_CSS}</style>
      {/* Pruh roste přes scaleX, ne přes width: šířka je rozvržení, které se
          musí přepočítat každý snímek, kdežto transform jede na GPU. Na čtyřech
          pixelech výšky se zploštění zaobleného konce nepozná. */}
      <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.12)" }}>
        <div className="h-1 w-full rounded-r-full"
          style={{
            background: MINT,
            transform: `scaleX(${progress / 100})`,
            transformOrigin: "left center",
            transition: `transform 520ms ${EASE}`,
          }} />
      </div>
      {total !== null && (
        <div className="flex justify-end px-5 pt-5">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "rgba(94,234,212,0.14)", border: `1px solid ${LINE}`, color: MINT }}>
            <Coins size={16} />
            <span className="text-sm" style={{ opacity: 0.8 }}>ještě ve hře</span>
            <span className="text-base"><Ticker value={total} /></span>
          </div>
        </div>
      )}
      {/* Svisle víc vzduchu než po stranách: kvíz pak stojí uprostřed plochy,
          ne nalepený mezi horní a dolní hranu. */}
      <div className={`quiz-main relative flex-1 flex items-center justify-center px-5 py-20${mascot ? " with-mascot" : ""}`}>
        <div className={`w-full${wide ? " wide" : ""}`} style={{ maxWidth: wide ? 1180 : 672 }}>{children}</div>
      </div>
    </div>
  );
}

function Option({ letter, label, hint, Icon, selected, pop, index = 0, onClick }) {
  return (
    <button onClick={onClick}
      className={`press enter w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left${pop ? " pop" : ""}`}
      style={{
        border: `1px solid ${selected ? MINT : LINE}`,
        background: selected ? MINT : CARD,
        color: selected ? INK : "#fff",
        animationDelay: `${index * 45}ms`,
      }}>
      {Icon && (
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
          style={{ background: selected ? "rgba(2,44,34,0.12)" : "rgba(94,234,212,0.12)", color: selected ? INK : MINT }}>
          <Icon size={20} />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-lg">{label}</span>
        {hint && <span className="block text-sm truncate" style={{ opacity: 0.65 }}>{hint}</span>}
      </span>
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs shrink-0"
        style={{ border: `1px solid ${selected ? "rgba(2,44,34,0.35)" : "rgba(255,255,255,0.25)"}`, opacity: 0.85 }}>
        {selected ? <Check size={14} /> : letter}
      </span>
    </button>
  );
}

function BankTile({ label, short, tint, logo, selected, pop, index = 0, onClick }) {
  return (
    <button onClick={onClick}
      className={`press enter relative min-w-0 flex flex-col items-center gap-2 px-3 py-4 rounded-2xl${pop ? " pop" : ""}`}
      style={{
        border: `1px solid ${selected ? MINT : LINE}`,
        background: selected ? "rgba(94,234,212,0.14)" : CARD,
        animationDelay: `${index * 45}ms`,
      }}>
      <Logo src={logo} short={short} tint={tint} size={48} />
      {/* min-w-0 + lámání: „Raiffeisenbank" se nezalomí a jako grid item
          s výchozím min-width:auto by roztlačil sloupec. */}
      <span className="text-sm text-center leading-tight min-w-0" style={{ overflowWrap: "anywhere" }}>{label}</span>
      {selected && (
        <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full"
          style={{ background: MINT, color: INK }}>
          <Check size={12} />
        </span>
      )}
    </button>
  );
}

export default function BonusQuiz() {
  const [step, setStep] = useState(INTRO);
  const [answers, setAnswers] = useState(BLANK);
  // Výměna obrazovky má tři stavy, ne dva. Odcházející obsah stoupá a mizí
  // rychle, nový se posadí dolů („enter", bez přechodu) a teprve pak vyjede
  // nahoru. S jedním přepínačem by nový dojel z pozice starého, tedy shora,
  // a celý kvíz by se posouval jedním směrem jako pás.
  const [phase, setPhase] = useState("in");
  const [pop, setPop] = useState(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const total = QUESTIONS.length;
  const intro = step === INTRO;
  const done = step >= total;

  // Uloží se ve chvíli, kdy je výsledek na obrazovce. Dřív by to znamenalo
  // pamatovat si rozdělaný kvíz, což nikomu nepomůže.
  useEffect(() => {
    if (done && answers.age !== "under18") saveAnswers(answers);
  }, [done, answers]);
  const cur = intro || done ? null : QUESTIONS[step];
  const runningTotal = matchOffers(answers).reduce((s, o) => s + o.amount, 0);

  // Posun po výběru odpovědi se plánuje dopředu, takže do toho okna uživatel
  // stihne kliknout sám — Enter, „OK" i „Zpět". Bez zrušení dojede časovač na
  // cíl spočítaný z jiného kroku a návrat zpátky přebije skokem dopředu.
  const advance = useRef(0);
  const popTimer = useRef(0);

  const clearPending = useCallback(() => {
    clearTimeout(advance.current);
    clearTimeout(popTimer.current);
    advance.current = 0;
    popTimer.current = 0;
  }, []);

  // Odchod ze stránky uprostřed naplánovaného posunu nemá nic dobíhat.
  useEffect(() => clearPending, [clearPending]);

  const go = useCallback((next) => {
    clearPending();
    setPop(null);
    setPhase("out");
    setTimeout(() => {
      setStep(next);
      setPhase("enter");
      // Dvě snímková okna: prohlížeč musí startovní pozici opravdu vykreslit,
      // jinak obě změny sloučí do jedné a přechod se nepustí.
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase("in")));
    }, reduced ? 0 : T_FAST);
  }, [clearPending, reduced]);

  const pick = useCallback((q, value) => {
    clearPending();
    setPop(String(value));
    popTimer.current = setTimeout(() => setPop(null), 220);
    if (navigator.vibrate) navigator.vibrate(8);
    if (isMulti(q)) {
      setAnswers((a) => {
        const list = a[q.key] || [];
        return { ...a, [q.key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
      });
    } else {
      setAnswers((a) => ({ ...a, [q.key]: value }));
      // Než otázka odejde, ať je zaškrtnutí vidět celé: pop trvá 220 ms.
      if (value !== "under18") advance.current = setTimeout(() => go(step + 1), 320);
    }
  }, [go, step, clearPending]);

  const canAdvance = cur && (isMulti(cur) || answers[cur.key] !== undefined);

  useEffect(() => {
    if (done || answers.age === "under18") return;
    const onKey = (e) => {
      // V úvodu písmena nic nevybírají, takže si je nechává prohlížeč.
      if (intro) { if (e.key === "Enter") go(0); return; }
      if (e.key === "Enter") { if (canAdvance) go(step + 1); return; }
      const idx = LETTERS.indexOf(e.key.toUpperCase());
      if (idx >= 0 && idx < cur.options.length) pick(cur, cur.options[idx].value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cur, step, intro, done, canAdvance, pick, go, answers.age]);

  // BLANK() se volá, ne předává: setAnswers(BLANK) by React vzal jako
  // aktualizační funkci a uložil by do stavu její návratovou hodnotu jen náhodou.
  const reset = () => { clearPending(); setStep(INTRO); setAnswers(BLANK()); setPhase("in"); };

  // Úvodní obrazovka popisuje kvíz, ne nabídky. Částku ani loga banky tu
  // schválně nemá: to obojí odvypráví úvodní stránka, ze které sem člověk
  // přišel, a zopakovat jí to znamená připsat mu jednu obrazovku navíc,
  // na které se nic nedozví. Sem patří, na co se ptáme a co z toho vyjde.
  if (intro) {
    return (
      <Shell progress={0} total={null} mascot>
        <img className="mascot" src="/img/mascot.webp" alt="" aria-hidden="true"
          width={1200} height={1489} decoding="async" />
        <div className="intro">
          {/* Čtyři skupiny, ne osm samostatných prvků: rytmus pak dělá gap,
              ne marginy, které se sčítají i ruší. */}
          <div className="eyebrow flex items-center gap-2" style={{ color: MINT }}>
            <Sparkles size={16} />
            <span className="text-sm">Kalkulačka bonusů</span>
          </div>

          <div className="pitch">
            <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: DISPLAY, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Na které bonusy dosáhneš?
            </h2>
            {/* Počet otázek se počítá, ne opisuje — už se posunul z pěti na sedm. */}
            <p className="text-lg" style={{ opacity: 0.75, maxWidth: "60ch" }}>
              Odpověz na {total} {otazek(total)}. Nabídky, na jejichž podmínky nedosáhneš,
              ti odečteme.
            </p>
          </div>

          <div className="close">
            <div className="flex items-center gap-4">
              <button onClick={() => go(0)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-lg"
                style={{ background: MINT, color: INK }}>
                Zjistit, na co dosáhnu <ArrowRight size={18} />
              </button>
              <span className="text-sm hidden sm:inline" style={{ opacity: 0.55 }}>
                nebo stiskni <strong>Enter ↵</strong>
              </span>
            </div>
            <p className="text-sm" style={{ opacity: 0.55 }}>
              Necelá minuta. Bez jména, bez e-mailu.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  // Nezletilí: žádné otázky, žádné ukládání, žádný partnerský odkaz.
  if (answers.age === "under18") {
    return (
      <Shell progress={20} total={null}>
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
          style={{ background: "rgba(94,234,212,0.14)", color: MINT }}>
          <CalendarDays size={26} />
        </span>
        <h2 className="text-3xl sm:text-4xl mb-4" style={{ fontFamily: DISPLAY, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          Odměny za účet jsou až od 18 let
        </h2>
        <p className="text-lg mb-3" style={{ opacity: 0.75 }}>
          Banky platí jen lidem, kteří můžou smlouvu podepsat sami. Do osmnácti si účet založit můžeš,
          ale potřebuješ k tomu rodiče. Takový účet bonus nenese.
        </p>
        <p className="text-lg mb-8" style={{ opacity: 0.75 }}>
          Sepsali jsme, které účty od 15 let stojí za to a co k založení potřebuješ.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/ucty-pro-mladsi-18" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-lg"
            style={{ background: MINT, color: INK }}>
            Účty od 15 let <ArrowRight size={18} />
          </a>
          <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-lg"
            style={{ border: `1px solid ${LINE}` }}>
            <ChevronLeft size={18} /> Zpátky
          </button>
        </div>
      </Shell>
    );
  }

  if (done) {
    const matched = matchOffers(answers);
    const sum = matched.reduce((s, o) => s + o.amount, 0);
    const services = SERVICES.filter((s) => !(answers.apps || []).includes(s.id));
    return (
      <Shell progress={100} total={null} wide={matched.length > 0}>
        <div className={`mb-8${matched.length > 0 ? " win" : ""}`}>
          <div>
            <div className="flex items-center gap-2 mb-3" style={{ color: MINT }}>
              <Sparkles size={16} />
              <span className="text-sm">Tvůj výsledek</span>
            </div>
            {/* Bílá je celý bank na úvodu, mátová je to, co je tvoje. Stejnou
                barvou svítí i částky u nabídek, takže to drží pohromadě. */}
            <p className="text-6xl sm:text-7xl mb-3 tracking-tight" style={{ color: MINT }}>
              <Ticker value={sum} />
            </p>
            <p className="text-lg" style={{ opacity: 0.75 }}>
              {matched.length === 0
                ? "Na tvoje odpovědi zatím nesedí žádný bonus."
                : `Tolik můžeš získat u ${matched.length} ${matched.length === 1 ? "banky" : "bank"}.`}
            </p>
          </div>
          {matched.length > 0 && (
            <span className="cheer">
              <img src="/img/mascot-cheer.webp" alt="" aria-hidden="true"
                width={719} height={760} decoding="async" />
            </span>
          )}
        </div>

        {matched.length === 0 && (
          <div className="rounded-2xl p-6 mb-8" style={{ border: `1px dashed ${LINE}` }}>
            <p className="mb-5" style={{ opacity: 0.75 }}>{blocker(answers)}</p>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => go(total - 1)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-lg"
                style={{ background: MINT, color: INK }}>
                <ChevronLeft size={18} /> Upravit odpovědi
              </button>
              <button onClick={reset}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-lg"
                style={{ border: `1px solid ${LINE}` }}>
                Projít znovu
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 offers">
          {matched.map((o, i) => {
            // Nejvyšší bonus je jediná, kterou většina lidí vezme. Když je
            // nabídka jen jedna, není co odlišovat — a při shodě částek by
            // odznak dostala první v pořadí, aniž by byla vyšší.
            const best = i === 0 && matched.length > 1 && o.amount > matched[1].amount;
            return (
            <div key={o.id} className={`offer rounded-2xl p-4${best ? " best" : ""}`}
              style={{
                background: best ? "rgba(94,234,212,0.14)" : CARD,
                border: `1px solid ${best ? MINT : LINE}`,
                animation: `fadeUp ${T_SLOW}ms ${EASE} both`,
                animationDelay: `${i * 70}ms`,
              }}>
              {best && (
                <span className="inline-flex items-center gap-1.5 mb-3 uppercase"
                  style={{ color: MINT, fontSize: "0.6875rem", letterSpacing: "0.12em" }}>
                  <TrendingUp size={13} /> Nejvyšší bonus
                </span>
              )}
              <div className="flex items-center gap-3 mb-3">
                <Logo src={o.logo} short={o.short} tint={o.tint} size={44} />
                <span className="flex-1">{o.bank}</span>
                <span className="text-2xl whitespace-nowrap"
                  style={{ color: MINT, fontFamily: DISPLAY, fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                  {o.amount.toLocaleString("cs-CZ")} Kč
                </span>
              </div>
              <p className="text-sm mb-4" style={{ opacity: 0.65 }}>{o.note}</p>
              <div className="foot flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: MINT }}>
                  <Check size={15} /> Splňuješ podmínky
                </span>
                <a href={`/go/${o.id}`} rel="sponsored nofollow" onClick={() => markTaken(o.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl"
                  style={{ background: MINT, color: INK }}>
                  Získat bonus <ArrowRight size={16} />
                </a>
              </div>
            </div>
            );
          })}
        </div>

        {services.length > 0 && (
          <div className="mt-10 pt-8" style={{ borderTop: `1px solid ${LINE}` }}>
            <h3 className="text-2xl mb-2" style={{ fontFamily: DISPLAY, letterSpacing: "-0.02em" }}>
              Kde ještě dostaneš uvítací kredit
            </h3>
            {/* Částka tu chybí schválně — viz komentář u SERVICES. Radši to
                přiznat než tipovat číslo, které se do dvou týdnů rozejde. */}
            <p className="text-sm mb-5" style={{ opacity: 0.65 }}>
              Výši kreditu určuje aktuální akce, uvidíš ji při registraci.
            </p>
            <div className="grid gap-3 svcs">
              {services.map((s) => (
                <div key={s.id} className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: CARD, border: `1px solid ${LINE}` }}>
                  <Logo src={s.logo} short={s.short} tint={s.tint} size={44} />
                  <span className="flex-1 min-w-0">
                    <span className="block">
                      {s.name}
                      <span className="ml-2 text-xs uppercase" style={{ color: MINT, letterSpacing: "0.1em" }}>{s.tag}</span>
                    </span>
                    <span className="block text-sm" style={{ opacity: 0.65 }}>{s.note}</span>
                  </span>
                  <a href={`/go/${s.id}`} rel="sponsored nofollow"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm shrink-0"
                    style={{ border: `1px solid ${LINE}`, color: MINT }}>
                    Vyzkoušet <ArrowRight size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {(matched.length > 0 || services.length > 0) && (
          <>
            <p className="text-sm mt-6" style={{ opacity: 0.55 }}>
              Odkazy jsou partnerské. Pořadí určuje výše bonusu, ne provize.
            </p>
            <button onClick={reset} className="mt-4 text-sm underline" style={{ opacity: 0.7 }}>
              Projít znovu
            </button>
          </>
        )}
      </Shell>
    );
  }

  const selected = isMulti(cur) ? answers[cur.key] || [] : [answers[cur.key]];
  const QIcon = cur.icon;

  return (
    <Shell progress={(step / total) * 100} total={step >= FIRST_SCORING ? runningTotal : null}>
      <div style={{
        out: {
          opacity: 0,
          transform: "translateY(-10px) scale(0.99)",
          transition: reduced ? "none" : `opacity ${T_FAST}ms ${EASE}, transform ${T_FAST}ms ${EASE}`,
        },
        enter: { opacity: 0, transform: "translateY(12px)", transition: "none" },
        in: {
          opacity: 1,
          transform: "translateY(0)",
          transition: reduced ? "none" : `opacity ${T_BASE}ms ${EASE}, transform ${T_BASE}ms ${EASE}`,
        },
      }[phase]}>
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
            style={{ background: "rgba(94,234,212,0.14)", color: MINT }}>
            <QIcon size={20} />
          </span>
          {/* Čárka za každou otázku místo „3 → 6". Otázky jsou posloupnost pevné
              délky, takže se dá ukázat i kolik ještě zbývá — číslo to neřeklo. */}
          <span className="flex items-center gap-1.5" role="img" aria-label={`Otázka ${step + 1} z ${total}`}>
            {QUESTIONS.map((q, i) => (
              <i key={q.key} className="block h-1 rounded-full"
                style={{
                  width: i === step ? 30 : 18,
                  background: i < step ? "rgba(94,234,212,0.45)" : i === step ? MINT : "rgba(255,255,255,0.2)",
                  transition: `background ${T_BASE}ms ${EASE_IO}, width ${T_BASE}ms ${EASE}`,
                }} />
            ))}
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl mb-2" style={{ fontFamily: DISPLAY, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{cur.q}</h2>
        <p className="text-lg mb-8" style={{ opacity: 0.7 }}>{cur.sub}</p>

        {/* key na obalu je klíč otázky, ne pořadí: hodnoty se mezi otázkami
            opakují (99 je „kolik to jde" i „deset a víc plateb") a React by
            takový uzel recykloval — část odpovědí by se rozjela a část ne. */}
        {isMulti(cur) ? (
          <div key={cur.key} className="grid grid-cols-2 min-[460px]:grid-cols-3 gap-3 mb-8">
            {cur.options.map((o, i) => (
              <BankTile key={o.value} {...o} index={i} selected={selected.includes(o.value)}
                pop={pop === String(o.value)} onClick={() => pick(cur, o.value)} />
            ))}
          </div>
        ) : (
          <div key={cur.key} className="grid gap-3 mb-8">
            {cur.options.map((o, i) => (
              <Option key={String(o.value)} letter={LETTERS[i]} label={o.label} hint={o.hint}
                Icon={o.icon} index={i} selected={selected.includes(o.value)} pop={pop === String(o.value)}
                onClick={() => pick(cur, o.value)} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          {canAdvance && (
            <button onClick={() => go(step + 1)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-lg"
              style={{ background: MINT, color: INK }}>
              {isMulti(cur) && selected.length === 0 ? "Nemám ani jednu" : "OK"}
              <ArrowRight size={18} />
            </button>
          )}
          <span className="text-sm hidden sm:inline" style={{ opacity: 0.55 }}>
            nebo stiskni <strong>Enter ↵</strong>
          </span>
          {/* Zpět z první otázky vede na úvod, takže tlačítko je i tam. */}
          <button onClick={() => go(step - 1)}
            className="ml-auto inline-flex items-center gap-1 text-sm" style={{ opacity: 0.6 }}>
            <ChevronLeft size={15} /> Zpět
          </button>
        </div>
      </div>
    </Shell>
  );
}
