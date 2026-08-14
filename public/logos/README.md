# Loga bank

Komponenta `components/BonusQuiz.jsx` načítá logo každé banky z `/logos/<id>.svg`.
`<id>` odpovídá poli `id` v konstantě `OFFERS`.

| Soubor | Banka | Kde vzít oficiální soubor |
| --- | --- | --- |
| `airbank.svg` | Air Bank | airbank.cz → sekce pro média / press kit |
| `raiffeisenbank.svg` | Raiffeisenbank | rb.cz → sekce pro média / brand manual |
| `moneta.svg` | Moneta Money Bank | moneta.cz → sekce pro média |
| `mbank.svg` | mBank | mbank.cz → sekce pro média |
| `csob.svg` | ČSOB | csob.cz → sekce pro média |
| `fio.svg` | Fio banka | fio.cz → sekce pro média |

## Co je tu teď

Soubory v tomhle adresáři jsou **dočasné monogramy** (zkratka banky v její barvě),
ne oficiální loga. Vznikly proto, aby kvíz nevypadal rozbitě, než doplníš reálné
soubory — síť v prostředí, kde se generovaly, neměla přístup na weby bank.

## Jak je nahradit

1. Stáhni oficiální logo z media kitu banky nebo z kreativ v affiliate programu.
2. Přejmenuj na `<id>.svg` podle tabulky výše a nahraď soubor v tomhle adresáři.
3. Nic víc — komponenta se na cestu odkazuje napevno, žádná změna kódu není potřeba.

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
