# Loga bank

Komponenta `components/BonusQuiz.jsx` načítá logo každé banky z cesty v poli
`logo` v konstantě `OFFERS`. Přípona se liší podle toho, co banka vydává, takže
cesta je tam napsaná celá — z `id` se odvodit nedá.

| Soubor | Banka | Odkud je |
| --- | --- | --- |
| `airbank.png` | Air Bank | čtvercová ikona 310×310 ze zdrojáku [airbank.cz](https://www.airbank.cz/) |
| `raiffeisenbank.svg` | Raiffeisenbank | štítový kříž vyříznutý z loga v HTML [rb.cz](https://www.rb.cz/) |
| `moneta.png` | MONETA Money Bank | značka „M" 180×180 z [moneta.cz](https://www.moneta.cz/servis-pro-media/loga-a-fotografie) |
| `mbank.png` | mBank | ikona „m" 120×120 z [mbank.cz](https://www.mbank.cz/) |
| `csob.svg` | ČSOB | vektor, který používá web [csob.cz](https://www.csob.cz/csob/servis-pro-media) |
| `fio.png` | Fio banka | čtvercová varianta 180×180 z [fio.cz](https://www.fio.cz/o-nas/media) |
| `wolt.png` | Wolt | apple-touch-icon 180×180 z [wolt.com](https://wolt.com/cs) |
| `bolt.svg` | Bolt Food | ikona značky Bolt z [bolt.eu](https://bolt.eu/cs-cz/food/) |
| `rohlik.png` | Rohlík.cz | apple-touch-icon 180×180 z [rohlik.cz](https://www.rohlik.cz/) |
| `liftago.jpg` | Liftago | webclip z [liftago.com](https://www.liftago.com/) |
| `revolut.png` | Revolut | apple-touch-icon 180×180 z [revolut.com](https://www.revolut.com/cs-CZ/) |

**Bolt Food nemá vlastní odlišené logo** na webu Boltu — používá se značka Bolt,
proto `bolt.svg` a ne `boltfood.svg`. Zelená ikona z app storu oficiálně ke
stažení není. **Foodora** v seznamu chybí schválně: foodora.cz vrací na
stahování 403 a bez oficiálního souboru tam službu nedávám.

Přesné adresy jsou v `scripts/logo-sources.json`. Spuštěním
`node scripts/fetch-logos.mjs` se soubory stáhnou znovu — hodí se, když banka
logo změní. Raiffeisenbank skript přeskočí: přímý odkaz neexistuje, logo je
vložené rovnou do HTML a `raiffeisenbank.svg` je z něj oříznutý čtverec
(zúžený `viewBox`, cesty beze změny).

## Proč zrovna tyhle varianty

Logo se kreslí do dlaždice 44–48 px, takže rozhoduje čtvercový formát, ne to,
jestli je soubor vektor. Proto jsou tu čtvercové ikony z webů bank a ne
horizontální logotypy z tiskových kitů — „MONETA BANK" nebo „Raiffeisen Bank"
na šířku je v téhle velikosti nečitelné. Kdyby se logo někdy vykreslovalo větší,
vektorové logotypy jsou v poznámkách u jednotlivých bank v `logo-sources.json`.

Dlaždice pod logem je zaoblený čtverec s bílým pozadím, ne kolečko: mBank
a Moneta mají ikonu barevnou až do rohů a kolečko by je odřízlo.

## Co ohlídat při výměně

- **Průhledné pozadí a čtvercový ořez.** Komponenta kreslí bílou dlaždici pod
  logem, takže varianta pro světlé pozadí je správná volba.
- **PNG jde taky** — přepiš pak příponu v `OFFERS` (`logo: "/logos/mbank.png"`).
  Doporučené rozlišení aspoň 128×128 px kvůli retina displejům.
- Když soubor chybí nebo se nepodaří načíst, komponenta spadne zpátky na
  barevnou dlaždici se zkratkou z pole `short`. Rozbitý obrázek se nikdy neukáže.
- **Náhled `preview/index.html` se sám neaktualizuje.** Loga tam jsou zapečená
  do data URI, protože ukázka běží bez serveru. Po výměně souboru je potřeba
  přegenerovat mapu `LOGOS` v `preview/index.html`. Že se to zapomnělo, ohlásí
  `node scripts/check.mjs` — porovnává otisk obsahu, ne jméno souboru.

## Licence

Loga jsou ochranné známky příslušných bank a nejsou součástí licence tohohle
repozitáře. Použití se řídí brand manuálem / podmínkami affiliate programu dané
banky — typicky nesmíš logo deformovat, překreslovat, měnit barvy ani ho
kombinovat s vlastními prvky do nové značky. Než web pustíš ven, projdi si to
s každou bankou zvlášť; u Air Bank a ČSOB tiskové oddělení posílá soubory
i podmínky na vyžádání.
