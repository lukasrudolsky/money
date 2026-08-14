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

- **Ikony** jsou ručně dokreslené inline SVG, ne `lucide-react`.
- **Loga** jsou vložená přímo do stránky, ne načtená z `/logos/`. Pořád jde
  o monogramy z `public/logos/`, ne o oficiální soubory bank.
- **Tlačítka „Získat odměnu"** nikam nevedou. V aplikaci míří na `/go/<id>`
  s `rel="sponsored nofollow"`.
- **Ovládání klávesnicí** (A–C, Enter) i chování pro nezletilé fungují stejně.

Když upravíš otázky nebo nabídky v komponentě, náhled se sám neaktualizuje —
je to samostatná kopie a časem se rozejde.
