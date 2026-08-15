# Náhled kvízu

`index.html` je celý kvíz v jednom souboru — bez Reactu, bez buildu, bez závislostí.
Slouží k proklikání návrhu a k ukázce, ne k nasazení.

## Spuštění

```
python3 -m http.server 3000 --directory preview
```

Pak otevři <http://localhost:3000>. Stačí i dvojklik na `index.html`, server je
jen kvůli tomu, aby cesty odpovídaly ostrému běhu.

## Čím se liší od komponenty

`components/BonusQuiz.jsx` zůstává zdroj pravdy. Náhled z něj přebírá otázky,
nabídky i logiku `matchOffers` jedna ku jedné, ale:

- **Ikony** jsou tatáž sada jako `components/icons.jsx`, jen zapsaná jako
  řetězce v konstantě `ICONS` místo React komponent. Když jednu upravíš, uprav
  obě — nic je nedrží v souladu.
- **Písma** jsou stejné soubory jako v `public/fonts/`, zapečené do stránky jako
  data URI. Kvůli nim má náhled skoro 300 kB; v aplikaci se stahují normálně.
- **Loga** jsou stejné soubory jako v `public/logos/`, ale zapečené do stránky
  jako data URI v konstantě `LOGOS`, ne načtené z `/logos/`. Když logo v
  `public/logos/` vyměníš, tuhle mapu je potřeba přegenerovat ručně.
- **Tlačítka „Získat odměnu" a „Vyzkoušet"** nikam nevedou. V aplikaci míří na
  `/go/<id>` s `rel="sponsored nofollow"`.
- **Tlačítko „Účty od 15 let"** na obrazovce pro nezletilé taky nikam nevede.
  V aplikaci je to odkaz na `/ucty-pro-mladsi-18`. Obě cesty musí na webu
  existovat, jinak končí kvíz čtyřstovkou přesně na tom kliku, který vydělává —
  `check.mjs` je ověřit neumí, jsou mimo tuhle repo.
- **Ovládání klávesnicí** (A–C, Enter) i chování pro nezletilé fungují stejně.
  Na úvodní obrazovce písmena nic nevybírají, Enter spouští kvíz.

Když upravíš otázky nebo nabídky v komponentě, náhled se sám neaktualizuje —
je to samostatná kopie. Že se rozešla, pozná `node scripts/check.mjs`:
porovnává data, otázky, ikony i otisky zapečených log a písem.
