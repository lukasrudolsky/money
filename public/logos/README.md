# Loga bank

Komponenta `components/BonusQuiz.jsx` načítá logo každé banky z `/logos/<id>.svg`.
`<id>` odpovídá poli `id` v konstantě `OFFERS`.

| Soubor | Banka | Oficiální zdroj |
| --- | --- | --- |
| `airbank.svg` | Air Bank | [airbank.cz/pro-novinare](https://www.airbank.cz/pro-novinare/) — logo tam není ke stažení, píše se o něj na novinari@airbank.cz |
| `raiffeisenbank.svg` | Raiffeisenbank | [rb.cz → Pro média → Ke stažení](https://www.rb.cz/informacni-servis/pro-media/ke-stazeni) |
| `moneta.svg` | MONETA Money Bank | [moneta.cz → Loga a fotografie](https://www.moneta.cz/servis-pro-media/loga-a-fotografie) — ZIP balíčky |
| `mbank.svg` | mBank | [media.mbank.pl → mBank's logotypes](https://en.media.mbank.pl/presskits/mbank-s-logotypes) |
| `csob.svg` | ČSOB | [csob.cz → Servis pro média](https://www.csob.cz/csob/servis-pro-media) |
| `fio.svg` | Fio banka | [fio.cz → Média](https://www.fio.cz/o-nas/media) — PDF, PNG, JPG |

Nejrychlejší cesta bývá stejně **affiliate program dané banky** — kreativy tam
mívají logo rovnou ve správných rozměrech a jejich použití je pokryté smlouvou.

## Co je tu teď

Soubory v tomhle adresáři jsou **dočasné monogramy** — zkratka banky v přibližně
její firemní barvě, ne oficiální loga. Vznikly proto, aby kvíz nevypadal rozbitě,
než doplníš reálné soubory: prostředí, kde se generovaly, mělo zablokovaný
přístup na weby bank i na všechny logo agregátory.

## Jak je nahradit

Ručně: stáhni logo ze zdroje v tabulce, přejmenuj na `<id>.svg` a nahraď soubor
v tomhle adresáři. Nic víc — komponenta se na cestu odkazuje napevno.

Nebo skriptem, když nechceš přejmenovávat ručně:

1. Otevři stránku z tabulky, najdi logo a zkopíruj adresu souboru.
2. Vlož ji do `scripts/logo-sources.json` do pole `file` u příslušné banky.
3. Spusť `node scripts/fetch-logos.mjs`.

Skript soubor stáhne, pojmenuje podle `id`, ohlídá typ i velikost a u jiné
přípony než `.svg` připomene, že je potřeba upravit cestu v `OFFERS`. ZIP a PDF
(MONETA, Fio) neumí rozbalit — ty vyřeš ručně.

Pár praktických věcí, které se vyplatí ohlídat:

- **Ber čtvercovou / symbolovou variantu**, ne dlouhý horizontální wordmark.
  Logo se vykresluje do kolečka 44–48 px, takže „Raiffeisenbank“ na šířku bude
  nečitelné, zatímco štítový kříž sedne.
- **Průhledné pozadí.** Komponenta kreslí bílé kolečko pod logem, takže
  varianta pro světlé pozadí je správná volba.
- **PNG jde taky** — přepiš pak příponu v `OFFERS` (`logo: "/logos/mbank.png"`).
  Doporučené rozlišení aspoň 128×128 px kvůli retina displejům.
- Když soubor chybí nebo se nepodaří načíst, komponenta spadne zpátky na
  barevné kolečko se zkratkou z pole `short`. Rozbitý obrázek se nikdy neukáže.

## Licence

Loga jsou ochranné známky příslušných bank a nejsou součástí licence tohohle
repozitáře. Použití se řídí brand manuálem / podmínkami affiliate programu dané
banky — typicky nesmíš logo deformovat, překreslovat, měnit barvy ani ho
kombinovat s vlastními prvky do nové značky.
