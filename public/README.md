# Ikony webu

Maskot ve verzi „hlava v dlaždici" jako favicona. Zdroj je čtvercový obrázek
1024×1024 s průhlednými rohy; všechno ostatní je z něj odvozené.

| Soubor | K čemu |
| --- | --- |
| `favicon.ico` | panel prohlížeče, nese 16, 32 i 48 px v jednom souboru |
| `favicon-16x16.png`, `favicon-32x32.png` | moderní prohlížeče, ostřejší než `.ico` |
| `apple-touch-icon.png` | 180×180, ikona na plochu iOS |
| `icon-192.png`, `icon-512.png` | Android a instalace jako aplikace, odkazuje na ně `site.webmanifest` |

`apple-touch-icon.png` je **podložený bílou**. iOS ani dlaždice ve Windows
průhlednost neřeší a rohy by zčernaly; obrázek stejně bílou dlaždici má, jen
s průhlednými rohy.

## Zapojení

Projekt nemá HTML shell — `components/BonusQuiz.jsx` je samotná komponenta.
Tyhle řádky patří do `<head>` stránky, která ji vykresluje:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#04352A">
```

## Co favicona neovlivní

**Sdílený náhled na claude.ai** ikonu z těchhle souborů nevezme — tam se
ikona panelu zadává jako emoji a obrázek tam nejde podstrčit. Zůstává 💰.
V `preview/index.html` favicona funguje, když si soubor otevřeš lokálně;
do publikované verze se nedostane, protože build odřízne všechno nad `<title>`.

## Když budeš měnit

Přegeneruj **všech šest** souborů ze stejného zdroje, ať se rozlišení nerozejdou.
Že se `favicon-32x32.png` rozešla se zapečenou kopií v náhledu, ohlásí
`node scripts/check.mjs`.
