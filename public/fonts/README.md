# Písma

| Soubor | Řez | Použití |
| --- | --- | --- |
| `bricolage-grotesque-latin.woff2` | Bricolage Grotesque, variabilní 400–800 | nadpisy, částky |
| `bricolage-grotesque-latin-ext.woff2` | totéž, diakritika | — |
| `schibsted-grotesk-latin.woff2` | Schibsted Grotesk, variabilní 400–700 | text a UI |
| `schibsted-grotesk-latin-ext.woff2` | totéž, diakritika | — |

Obojí je pod **SIL Open Font License 1.1**, tedy volné i pro komerční použití
včetně vložení do webu. Soubory jsou subsety z Google Fonts
([Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque),
[Schibsted Grotesk](https://fonts.google.com/specimen/Schibsted+Grotesk)).

## Proč dva soubory na řez

Subset `latin` nese základní abecedu, `latin-ext` českou diakriku. `@font-face`
v `components/BonusQuiz.jsx` je dělí přes `unicode-range`, takže prohlížeč
stáhne druhý soubor jen tehdy, když se na stránce objeví „ě" nebo „ů" — což
u českého kvízu nastane hned, ale rozdělení nic nestojí a šetří to anglické
mutaci ~50 kB.

Variabilní osa `wght` znamená, že jeden soubor pokrývá všechny tučnosti. Kdyby
někdo přidal statické řezy navíc, přestane to platit a soubory se sečtou.

## Kde jsou zadrátovaná

- **Aplikace** — `@font-face` je v `components/BonusQuiz.jsx` (konstanta
  `FONT_CSS`), protože projekt nemá globální CSS. Cesty míří na `/fonts/`.
- **Náhled** `preview/index.html` — stejné soubory zapečené do data URI, ukázka
  běží bez serveru. Po výměně písma je potřeba blok `@font-face` přegenerovat,
  sám se neaktualizuje. Že se to zapomnělo, ohlásí `node scripts/check.mjs`.

## Když budeš měnit

Bricolage Grotesque je nosič identity: má opsz osu a v nadpisech dělá tu
nesourodost, kvůli které tam je. Schibsted Grotesk je záměrně tišší, aby
odstavce a popisky nebojovaly s nadpisem. Když nahradíš jen jedno z nich,
projdi si nadpis i odstavec vedle sebe — dvojice se snadno rozejde.

Ikony v `components/icons.jsx` jsou kreslené k tomuhle písmu: plochá zakončení
tahů a ostré rohy. Při výměně za měkčí řez přestanou sedět.
