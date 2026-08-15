# Bonusový kvíz

Kvíz, který spočítá, kolik člověk dostane na odměnách za založení účtu u českých
bank, a k tomu ukáže služby s uvítacím kreditem.

## Dva příkazy

```
node scripts/check.mjs          # zkontroluje, že se nic nerozešlo
node scripts/build-preview.mjs  # vyrobí dist/bonus-quiz.html k publikaci
```

**`check.mjs` pusť po každé změně dat, log nebo písem.** Chytá věci, které se
vizuálně nepoznají — hlavně to, že se aplikace a náhled rozešly.

## Co kde je

| Cesta | Co to je |
| --- | --- |
| `components/BonusQuiz.jsx` | Zdroj pravdy: data, otázky, logika, `@font-face`. |
| `components/icons.jsx` | Ikony kreslené k písmu, náhrada za `lucide-react`. |
| `preview/index.html` | **Samostatná kopie** celého kvízu v jednom souboru. |
| `public/logos/`, `public/fonts/` | Oficiální loga a písma, každé s vlastním README. |
| `public/img/` | Maskot: `mascot.webp` stojí u úvodu, `mascot-cheer.webp` jásá u výsledku. |
| `scripts/` | Kontrola, build a stahovač log. |

## Proč to existuje dvakrát

`preview/index.html` je celý kvíz bez Reactu, bez buildu a bez závislostí —
otevře se dvojklikem a jde z něj vyrobit sdílitelná stránka. Za to se platí tím,
že data, ikony, loga i písma jsou tam znovu: loga a písma dokonce zapečená do
data URI, protože ukázka běží bez serveru.

Nic ty dvě kopie nedrží v souladu automaticky. Proto `check.mjs`, který ověří:

- **nabídky a služby** — stejná id, pořadí, částky, podmínky i texty,
- **otázky** — stejné klíče ve stejném pořadí,
- **ikony** — každá je v obou sadách,
- **zapečená loga, písma a maskoti** — porovnává se otisk obsahu, ne jméno
  souboru, takže vyměněný soubor bez přegenerování náhledu neprojde,
- **dosažitelnost nabídek** — každá podmínka musí být „obkročená": nějaká
  odpověď ji splní a nějaká ne. Jinak je nabídka mrtvá, nebo naopak nefiltruje.
  (Přesně tohle byla dřívější chyba: „do pěti" s hodnotou 4 brala odměnu lidem,
  kteří pět plateb kartou zvládnou.)
- **odkazy na soubory** — každá cesta v `logo:` a v `@font-face` někam vede,
- **jedinečnost id** — banky i služby míří na `/go/<id>`, takže sdílí jmenný
  prostor a dvě stejná id by znamenala tiše přebitý partnerský odkaz.

Když `check.mjs` spadne na něčem nečekaném, skončí nenulově a řekne to — tichý
stack trace v CI vypadá skoro jako „prošlo".

## Popisky stránky

Texty do hlavy dokumentu — to, co je vidět v liště prohlížeče, v záložkách,
ve vyhledávání a v náhledu odkazu na sítích:

| Co | Text |
| --- | --- |
| `<title>` | Kolik ti dají banky za nový účet |
| `description` | Banky teď rozdávají dohromady 7 000 Kč za založení účtu. Sedm otázek a uvidíš, na které odměny dosáhneš právě ty. Neptáme se na jméno ani e-mail, zabere to necelou minutu. |
| `og:title` | Kolik ti dají banky za nový účet |
| `og:description` | Banky teď rozdávají dohromady 7 000 Kč za založení účtu. Sedm otázek a uvidíš, na které odměny dosáhneš právě ty. |
| `theme-color` | `#022c22` (stejná zelená jako pozadí kvízu) |
| `og:locale` | `cs_CZ`, `twitter:card` je `summary` |

V `preview/index.html` jsou zapsané přímo v hlavě. Do aplikace se musí doplnit
zvlášť — komponenta hlavu dokumentu nenastavuje, v Next.js na to je `export
const metadata`.

Dvě věci, na které pozor:

- **Částka 7 000 Kč je v popiscích opsaná ručně**, protože hlava se vykresluje
  dřív než skript. Ve zbytku kvízu se počítá z `OFFERS`. `check.mjs` porovnává
  každou částku v hlavě se součtem, takže přidaná banka shodí kontrolu, ne až
  náhled odkazu.
- **`og:image` schválně chybí.** Obrázek potřebuje absolutní URL, kterou
  samostatná stránka nemá. Až se kvíz nasadí na doménu, patří sem `og:image`
  i `twitter:card: summary_large_image` — bez obrázku by karta vykreslila
  prázdné místo.

## Čísla, která tu nejsou

Služby (`SERVICES`) **nemají pole s částkou** a do součtu nevstupují. Wolt, Bolt
Food, Rohlík ani Revolut výši uvítacího kreditu veřejně nefixují — mění se po
kampaních a u Rohlíku i podle počtu prvních nákupů. Vymyšlené číslo by se
sečetlo do slibu na úvodní obrazovce, který by pak neplatil. Až budou částky
z affiliate rozhraní, stačí do `SERVICES` doplnit `amount` a napojit ho do
součtu.

Částky u bank v `OFFERS` je potřeba před ostrým během ověřit u zdroje — nejsou
napojené na žádný feed.
