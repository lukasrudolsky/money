import { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarDays, Landmark, Wallet, Coins, Banknote,
  CreditCard, TrendingUp, Check, ArrowRight, Sparkles, ChevronLeft,
} from "lucide-react";

// Loga žijí v /public/logos/<id>.svg — viz public/logos/README.md, kde je
// popsané, odkud vzít oficiální soubory a čím jsou tam nahrazené teď.
// Když soubor chybí nebo se nenačte, Logo níž zobrazí zkratku z pole short.
// minIncome = kolik musí měsíčně přijít na účet, aby odměna platila. Nahradilo
// to booleovské requiresIncome, které nerozlišovalo 10 000 od 15 000 Kč, takže
// se lidem nabízela odměna, na kterou svým příjmem nedosáhli.
const OFFERS = [
  { id: "airbank", bank: "Air Bank", short: "AB", tint: "#F97316", logo: "/logos/airbank.svg", amount: 1500, minIncome: 15000, minCards: 5, note: "Příchozí platba od 15 000 Kč, 5 plateb kartou" },
  { id: "raiffeisen", bank: "Raiffeisenbank", short: "RB", tint: "#FACC15", logo: "/logos/raiffeisenbank.svg", amount: 2000, minIncome: 15000, minCards: 10, note: "Výplata na účet, 10 plateb kartou" },
  { id: "moneta", bank: "Moneta", short: "MO", tint: "#38BDF8", logo: "/logos/moneta.svg", amount: 1200, minIncome: 10000, minCards: 0, note: "Příchozí platba od 10 000 Kč" },
  { id: "mbank", bank: "mBank", short: "mB", tint: "#FB7185", logo: "/logos/mbank.svg", amount: 1000, minIncome: 0, minCards: 5, note: "5 plateb kartou po dobu 2 měsíců" },
  { id: "csob", bank: "ČSOB", short: "ČS", tint: "#818CF8", logo: "/logos/csob.svg", amount: 800, minIncome: 0, minCards: 10, note: "10 plateb kartou v prvním měsíci" },
  { id: "fio", bank: "Fio banka", short: "Fi", tint: "#4ADE80", logo: "/logos/fio.svg", amount: 500, minIncome: 0, minCards: 0, note: "Bez podmínek, stačí aktivovat účet" },
];

// Kolik na účet reálně dostaneš podle odpovědi na otázku o výplatě.
const INCOME = { yes: Infinity, partial: 10000, no: 0 };

const BG = "#04352A";
const CARD = "rgba(255,255,255,0.06)";
const LINE = "rgba(255,255,255,0.16)";
const MINT = "#5EEAD4";
const INK = "#022C22";
const LETTERS = "ABCDEFGH".split("");

const QUESTIONS = [
  { key: "age", type: "single", icon: CalendarDays, q: "Kolik ti je?", sub: "Odměnu za účet vyplácí banky až od osmnácti.",
    options: [
      { value: "under18", label: "Pod 18" },
      { value: "18-25", label: "18–25" },
      { value: "26+", label: "26 a víc" },
    ] },
  { key: "owned", type: "banks", icon: Landmark, q: "Kde už máš účet?", sub: "Odměnu dostaneš jen tam, kde ještě klient nejsi.",
    options: OFFERS.map((o) => ({ value: o.id, label: o.bank, short: o.short, tint: o.tint, logo: o.logo })) },
  { key: "count", type: "single", icon: Wallet, q: "Kolik účtů si chceš založit?", sub: "Odměny jde posbírat i u víc bank najednou.",
    options: [
      { value: 1, label: "Jeden", hint: "Chci jeden a mít klid", icon: Wallet },
      { value: 3, label: "Dva až tři", hint: "Zvládnu si pohlídat víc podmínek", icon: Coins },
      { value: 99, label: "Kolik to jde", hint: "Jde mi hlavně o peníze", icon: TrendingUp },
    ] },
  // Hodnoty odpovídají klíčům v INCOME. Prostřední možnost říká konkrétní
  // částku schválně — „pár tisíc" dřív pouštělo dál i odměny za 15 000 Kč.
  { key: "income", type: "single", icon: Banknote, q: "Můžeš si nechat posílat výplatu na nový účet?", sub: "Na příchozí platbě stojí ty nejvyšší odměny.",
    options: [
      { value: "yes", label: "Ano", hint: "Výplatu tam přesměruju", icon: Banknote },
      { value: "partial", label: "Výplatu ne", hint: "Ale 10 000 Kč měsíčně tam pošlu", icon: Coins },
      { value: "no", label: "Ne", hint: "Nový účet nechci nikam napojovat", icon: Wallet },
    ] },
  // Hranice musí sedět na minCards v OFFERS: „do pěti" s hodnotou 4 brala
  // lidem, kteří pět plateb zvládnou, odměnu s minCards 5.
  { key: "cards", type: "single", icon: CreditCard, q: "Kolik plateb kartou zvládneš měsíčně?", sub: "U většiny odměn musíš kartou párkrát zaplatit. Poslední otázka.",
    options: [
      { value: 4, label: "Čtyři a míň", icon: CreditCard },
      { value: 9, label: "Pět až devět", icon: CreditCard },
      { value: 99, label: "Deset a víc", icon: CreditCard },
    ] },
];

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

// Název banky stojí vždycky vedle loga, takže alt zůstává prázdný — jinak by
// odečítač předčítal to samé dvakrát.
function Logo({ src, short, tint, size = 44 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  const inner = size - 14;
  return (
    <span className="inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: failed || !src ? tint : "#fff", color: INK }}>
      {failed || !src
        ? <span className="text-sm">{short}</span>
        : <img src={src} alt="" width={inner} height={inner} loading="lazy" decoding="async"
            style={{ width: inner, height: inner, objectFit: "contain" }}
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
    const t = setTimeout(() => setBump(false), 260);
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 700);
      setN(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(t); };
  }, [value]);
  return (
    <span style={{
      display: "inline-block",
      transform: bump ? "scale(1.12)" : "scale(1)",
      transition: "transform 260ms cubic-bezier(.34,1.56,.64,1)",
    }}>
      {n.toLocaleString("cs-CZ")} Kč
    </span>
  );
}

function Shell({ children, progress, total }) {
  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: BG, color: "#fff" }}>
      <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.12)" }}>
        <div className="h-1 rounded-r-full"
          style={{ width: `${progress}%`, background: MINT, transition: "width 450ms cubic-bezier(.4,0,.2,1)" }} />
      </div>
      {total !== null && (
        <div className="flex justify-end px-5 pt-5">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "rgba(94,234,212,0.14)", border: `1px solid ${LINE}`, color: MINT }}>
            <Coins size={16} strokeWidth={2} />
            <span className="text-sm" style={{ opacity: 0.8 }}>zatím</span>
            <span className="text-base"><Ticker value={total} /></span>
          </div>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </div>
  );
}

function Option({ letter, label, hint, Icon, selected, pop, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
      style={{
        border: `1px solid ${selected ? MINT : LINE}`,
        background: selected ? MINT : CARD,
        color: selected ? INK : "#fff",
        transform: pop ? "scale(0.97)" : "scale(1)",
        transition: "background 160ms ease, border-color 160ms ease, transform 220ms cubic-bezier(.34,1.56,.64,1)",
      }}>
      {Icon && (
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
          style={{ background: selected ? "rgba(2,44,34,0.12)" : "rgba(94,234,212,0.12)", color: selected ? INK : MINT }}>
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-lg">{label}</span>
        {hint && <span className="block text-sm truncate" style={{ opacity: 0.65 }}>{hint}</span>}
      </span>
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs shrink-0"
        style={{ border: `1px solid ${selected ? "rgba(2,44,34,0.35)" : "rgba(255,255,255,0.25)"}`, opacity: 0.85 }}>
        {selected ? <Check size={14} strokeWidth={2.5} /> : letter}
      </span>
    </button>
  );
}

function BankTile({ label, short, tint, logo, selected, pop, onClick }) {
  return (
    <button onClick={onClick}
      className="relative flex flex-col items-center gap-2 px-3 py-4 rounded-2xl"
      style={{
        border: `1px solid ${selected ? MINT : LINE}`,
        background: selected ? "rgba(94,234,212,0.14)" : CARD,
        transform: pop ? "scale(0.95)" : "scale(1)",
        transition: "border-color 160ms ease, background 160ms ease, transform 220ms cubic-bezier(.34,1.56,.64,1)",
      }}>
      <Logo src={logo} short={short} tint={tint} size={48} />
      <span className="text-sm text-center leading-tight">{label}</span>
      {selected && (
        <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full"
          style={{ background: MINT, color: INK }}>
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

export default function BonusQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ owned: [] });
  const [visible, setVisible] = useState(true);
  const [pop, setPop] = useState(null);

  const total = QUESTIONS.length;
  const done = step >= total;
  const cur = done ? null : QUESTIONS[step];
  const runningTotal = matchOffers(answers).reduce((s, o) => s + o.amount, 0);

  const go = useCallback((next) => {
    setVisible(false);
    setTimeout(() => { setStep(next); setVisible(true); }, 190);
  }, []);

  const pick = useCallback((q, value) => {
    setPop(String(value));
    setTimeout(() => setPop(null), 220);
    if (navigator.vibrate) navigator.vibrate(8);
    if (q.type === "banks") {
      setAnswers((a) => {
        const list = a[q.key] || [];
        return { ...a, [q.key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
      });
    } else {
      setAnswers((a) => ({ ...a, [q.key]: value }));
      if (value !== "under18") setTimeout(() => go(step + 1), 160);
    }
  }, [go, step]);

  const canAdvance = cur && (cur.type === "banks" || answers[cur.key] !== undefined);

  useEffect(() => {
    if (done || answers.age === "under18") return;
    const onKey = (e) => {
      if (e.key === "Enter") { if (canAdvance) go(step + 1); return; }
      const idx = LETTERS.indexOf(e.key.toUpperCase());
      if (idx >= 0 && idx < cur.options.length) pick(cur, cur.options[idx].value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cur, step, done, canAdvance, pick, go, answers.age]);

  const reset = () => { setStep(0); setAnswers({ owned: [] }); setVisible(true); };

  // Nezletilí: žádné otázky, žádné ukládání, žádný partnerský odkaz.
  if (answers.age === "under18") {
    return (
      <Shell progress={20} total={null}>
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
          style={{ background: "rgba(94,234,212,0.14)", color: MINT }}>
          <CalendarDays size={26} strokeWidth={1.75} />
        </span>
        <h2 className="text-3xl sm:text-4xl mb-4 leading-tight">Odměny za účet jsou až od 18 let</h2>
        <p className="text-lg mb-3" style={{ opacity: 0.75 }}>
          Banky platí jen lidem, kteří můžou smlouvu podepsat sami. Do osmnácti si účet založit můžeš,
          ale potřebuješ k tomu rodiče — a takový účet odměnu nenese.
        </p>
        <p className="text-lg mb-8" style={{ opacity: 0.75 }}>
          Sepsali jsme, které účty od 15 let stojí za to a co k založení potřebuješ.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/ucty-pro-mladsi-18" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-lg"
            style={{ background: MINT, color: INK }}>
            Účty od 15 let <ArrowRight size={18} strokeWidth={2} />
          </a>
          <button onClick={reset} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-lg"
            style={{ border: `1px solid ${LINE}` }}>
            <ChevronLeft size={18} strokeWidth={2} /> Zpátky
          </button>
        </div>
      </Shell>
    );
  }

  if (done) {
    const matched = matchOffers(answers);
    const sum = matched.reduce((s, o) => s + o.amount, 0);
    return (
      <Shell progress={100} total={null}>
        <div className="flex items-center gap-2 mb-3" style={{ color: MINT }}>
          <Sparkles size={16} strokeWidth={2} />
          <span className="text-sm">Tvůj výsledek</span>
        </div>
        <p className="text-6xl sm:text-7xl mb-3 tracking-tight"><Ticker value={sum} /></p>
        <p className="text-lg mb-8" style={{ opacity: 0.75 }}>
          {matched.length === 0
            ? "Na tvoje podmínky zatím nesedí žádná nabídka. Zkus povolit víc plateb kartou."
            : `Tolik můžeš získat u ${matched.length} ${matched.length === 1 ? "banky" : "bank"}.`}
        </p>

        <div className="grid gap-3">
          {matched.map((o, i) => (
            <div key={o.id} className="rounded-2xl p-4"
              style={{
                background: CARD, border: `1px solid ${LINE}`,
                animation: `fadeUp 420ms cubic-bezier(.4,0,.2,1) both`,
                animationDelay: `${i * 90}ms`,
              }}>
              <div className="flex items-center gap-3 mb-3">
                <Logo src={o.logo} short={o.short} tint={o.tint} size={44} />
                <span className="flex-1 text-lg">{o.bank}</span>
                <span className="text-xl whitespace-nowrap" style={{ color: MINT }}>
                  {o.amount.toLocaleString("cs-CZ")} Kč
                </span>
              </div>
              <p className="text-sm mb-4" style={{ opacity: 0.65 }}>{o.note}</p>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: MINT }}>
                  <Check size={15} strokeWidth={2.5} /> Splňuješ podmínky
                </span>
                <a href={`/go/${o.id}`} rel="sponsored nofollow"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl"
                  style={{ background: MINT, color: INK }}>
                  Získat odměnu <ArrowRight size={16} strokeWidth={2} />
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm mt-6" style={{ opacity: 0.55 }}>
          Odkazy na banky jsou partnerské. Pořadí určuje výše odměny, ne provize.
        </p>
        <button onClick={reset} className="mt-4 text-sm underline" style={{ opacity: 0.7 }}>
          Projít znovu
        </button>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
      </Shell>
    );
  }

  const selected = cur.type === "banks" ? answers[cur.key] || [] : [answers[cur.key]];
  const QIcon = cur.icon;

  return (
    <Shell progress={(step / total) * 100} total={step >= 1 ? runningTotal : null}>
      <div style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition: "opacity 190ms ease, transform 190ms ease",
      }}>
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
            style={{ background: "rgba(94,234,212,0.14)", color: MINT }}>
            <QIcon size={20} strokeWidth={1.75} />
          </span>
          <span className="text-sm" style={{ color: MINT }}>{step + 1} → {total}</span>
        </div>

        <h2 className="text-3xl sm:text-4xl leading-tight mb-2">{cur.q}</h2>
        <p className="text-lg mb-8" style={{ opacity: 0.7 }}>{cur.sub}</p>

        {cur.type === "banks" ? (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {cur.options.map((o) => (
              <BankTile key={o.value} {...o} selected={selected.includes(o.value)}
                pop={pop === String(o.value)} onClick={() => pick(cur, o.value)} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 mb-8">
            {cur.options.map((o, i) => (
              <Option key={String(o.value)} letter={LETTERS[i]} label={o.label} hint={o.hint}
                Icon={o.icon} selected={selected.includes(o.value)} pop={pop === String(o.value)}
                onClick={() => pick(cur, o.value)} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          {canAdvance && (
            <button onClick={() => go(step + 1)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-lg"
              style={{ background: MINT, color: INK }}>
              {cur.type === "banks" && selected.length === 0 ? "Nemám ani jeden" : "OK"}
              <ArrowRight size={18} strokeWidth={2} />
            </button>
          )}
          <span className="text-sm hidden sm:inline" style={{ opacity: 0.55 }}>
            nebo stiskni <strong>Enter ↵</strong>
          </span>
          {step > 0 && (
            <button onClick={() => go(step - 1)}
              className="ml-auto inline-flex items-center gap-1 text-sm" style={{ opacity: 0.6 }}>
              <ChevronLeft size={15} strokeWidth={2} /> Zpět
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}
