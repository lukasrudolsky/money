# Texty Bonusrádce

Soupis veškeré kopie, kterou na webu uvidí člověk. Pořadí sedí s tím, jak na
text narazí: napřed úvodní stránka odshora dolů, pak kvíz obrazovku po
obrazovce, nakonec data, ze kterých se skládají názvy a podmínky nabídek.

**Kde se co mění.** Texty nežijí tady, tenhle soubor je jen přehled. Zdroje:

| Kus webu | Soubor |
| --- | --- |
| Úvodní stránka | `scripts/build-home.mjs`, pak přegenerovat |
| Kvíz | `components/BonusQuiz.jsx` **a** `preview/index.html` (obojí, jsou to dvě kopie) |
| Nabídky a služby | `OFFERS` a `SERVICES`, taktéž v obou souborech |

Po každé změně `node scripts/check.mjs`, jinak se kopie rozejdou.

---

## 1. Úvodní stránka

### 1.1 Hlava dokumentu

Není vidět na stránce, ale je v liště prohlížeče, v záložkách a v náhledu
odkazu na sítích.

| Co | Text |
| --- | --- |
| `<title>` | Bonusrádce: bonusy za registraci |
| `description` | Bonusrádce spočítá, na které bonusy za registraci dosáhneš právě ty. Banky teď za samotné založení účtu rozdávají 11 500 Kč a uvítací kredit k tomu dávají další služby. Odpověz na 7 otázek, bez jména a bez e-mailu, do minuty. |

> **Pozor:** částka 11 500 Kč je tu opsaná ručně, protože hlava se vykresluje
> dřív než skript. `check.mjs` ji porovnává se součtem `OFFERS`, takže přidaná
> banka shodí kontrolu.

### 1.2 Lišta

Značka: **Bonusrádce**

Odkazy: Bonusy · Jak to funguje · Služby · FAQ · Blog · O nás · Kontakt

Tlačítko: **Zjistit moje bonusy**

### 1.3 Hero

Částka: **11 500 Kč** (počítá se z `OFFERS`, nadojede jako odometr)

Nadpis: **Kolik z toho je pro tebe?**

Odstavec:

> Tolik je k mání jen na bonusech za založení účtu, uvítací kredity u služeb se
> počítají zvlášť. Odpověz na 7 otázek a poskládáme ti z toho nejvyšší částku,
> na kterou dosáhneš, i s tím, co si kde pohlídat, aby ti nic neuteklo.

Tlačítka: **Zjistit moje bonusy** · **Všechny bonusy**

Pod tlačítky: Necelá minuta. Bez jména, bez e-mailu.

Na displeji telefonu: jméno banky, čas **teď**, částka **+1 500 Kč**

### 1.4 Sekce: bonusy

Nadpis: **Top 10 bonusů** (číslo se počítá z dat)

Podtitul:

> Nejvyšší bonusy mají nejvíc podmínek, ty nejnižší nechtějí skoro nic. Kvíz
> z toho vybere, co sedí na tebe.

Na kartě: odznak **Nejvyšší bonus** (jen u první), tlačítko **Získat bonus**,
přepínač **Zobrazit podmínky** / **Skrýt podmínky**

Pod mřížkou: **Zobrazit dalších 7 nabídek** / **Skrýt**

### 1.5 Sekce: jak to funguje

Nadpis: **Jak to funguje**

Podtitul:

> Kvíz nesbírá kontakty. Ptá se jen na to, co rozhoduje o tom, jestli ti bonus
> někdo vyplatí.

| # | Nadpis | Text |
| --- | --- | --- |
| 1 | Odpovíš na 7 otázek | Věk, kde už účet máš, kolik zvládneš plateb kartou. Nic víc. |
| 2 | Ukážeme, na co dosáhneš | Jen bonusy, jejichž podmínky splníš. Seřazené od nejvyššího. |
| 3 | Vezmeš si svůj bonus | U každého bonusu píšeme, co je pro vyplacení potřeba udělat. |

Tlačítko: **Zjistit moje bonusy**

### 1.6 Sekce: služby

Nadpis: **Kde ještě dostaneš uvítací kredit**

Podtitul:

> Výši kreditu určuje aktuální akce, uvidíš ji při registraci. Proto tady
> žádnou částku netipujeme.

### 1.7 Časté dotazy

Nadpis: **Časté dotazy**

Podtitul:

> Šest věcí, na které se lidi ptají nejčastěji. Zbytek najdeš v podmínkách
> u konkrétní nabídky.

**Kolik bonusů si můžu vzít najednou?**
Tolik, kolik zvládneš podmínek. Nejsou proti sobě: účet u jedné banky nebrání
bonusu u druhé. Kvíz se přímo ptá, kolik účtů chceš založit, a podle toho ti
výběr zúží.

**Musím kvůli tomu rušit svůj současný účet?**
Ne. Bonus se váže na to, že jsi u dané banky nový, ne na to, kde jsi teď. Účty
můžou běžet vedle sebe a starý si necháš, jak byl.

**Kdy peníze dorazí?**
Až po splnění podmínek, a každý poskytovatel má jinou lhůtu. U každého bonusu
píšeme, co je pro vyplacení potřeba udělat; přesný termín si ověř v podmínkách
akce, protože se mění s každou kampaní.

**Proč jsou bonusy jen pro nové klienty?**
Je to náborová akce. Banka i služba tím platí za získání zákazníka, takže na ni
dosáhne ten, kdo u nich zatím účet nemá. Kvíz se proto ptá, kde už klient jsi,
a takové nabídky ti rovnou odečte.

**Sbíráte o mně nějaké údaje?**
Ne. Kvíz nechce jméno ani e-mail a odpovědi nikam neodesílá, počítají se rovnou
v prohlížeči.

**Jak na tom vyděláváte vy?**
Odkazy na banky a služby jsou partnerské, takže za založený účet dostaneme
provizi. Ty platíš stejně jako jinde a pořadí v přehledu určuje výše bonusu, ne
to, kolik nám kdo dá.

### 1.8 Závěrečná výzva

Nadpis: **Tak co, kolik to bude?**

Odstavec:

> Odpověz na 7 otázek a poskládáme ti z bonusů nejvyšší částku, na kterou
> dosáhneš.

Tlačítko: **Zjistit moje bonusy**

Pod ním: Necelá minuta. Bez jména, bez e-mailu.

### 1.9 Patička

O projektu:

> Bonusrádce srovnává bonusy za registraci a počítá, na které z nich dosáhneš
> právě ty.

| Sloupec | Odkazy |
| --- | --- |
| Na stránce | Bonusy za registraci · Jak to funguje · Služby s kreditem · Časté dotazy |
| Web | Blog · O nás · Kontakt |
| Spočítat | Zjistit moje bonusy |

Právní řádek:

> Odkazy jsou partnerské, pořadí ale určuje výše bonusu, ne provize. Podmínky
> ověř u poskytovatele, nejsme banka ani poradce.

Podpis: © 2026 bonusradce.cz · Web vytvořil profiweb.cz

---

## 2. Kvíz

### 2.1 Hlava dokumentu

| Co | Text |
| --- | --- |
| `<title>` | Bonusrádce: bonusy za registraci |
| `description` | Bonusrádce spočítá, na které bonusy za registraci dosáhneš právě ty. Banky teď za samotné založení účtu rozdávají 11 500 Kč a uvítací kredit k tomu dávají další služby. Odpověz na 7 otázek, bez jména a bez e-mailu, do minuty. |
| `og:title` | Bonusrádce: bonusy za registraci |
| `og:description` | Bonusrádce spočítá, na které bonusy za registraci dosáhneš právě ty. Banky teď za samotné založení účtu rozdávají 11 500 Kč. Odpověz na 7 otázek, bez jména a bez e-mailu. |

### 2.2 Úvodní obrazovka

Štítek: **Kalkulačka bonusů**

Nadpis: **Na které bonusy dosáhneš?**

Odstavec:

> Odpověz na 7 otázek. Nabídky, na jejichž podmínky nedosáhneš, ti odečteme.

Tlačítko: **Zjistit, na co dosáhnu** · vedle něj: nebo stiskni **Enter ↵**

Pod tlačítkem: Necelá minuta. Bez jména, bez e-mailu.

### 2.3 Lišta nad otázkami

Popisek: **ještě ve hře** · vedle něj běžící částka

Tlačítko zpět: **Zpět** (na první otázce vede na úvod)

U otázek s víc možnostmi: **Nemám ani jednu** · potvrzení **OK** · nápověda
nebo stiskni **Enter ↵**

Pro čtečky: „Otázka 3 z 7"

### 2.4 Otázky

**1. Kolik ti je?**
Bonus za účet vyplácí banky až od osmnácti.
Možnosti: Pod 18 · 18-25 · 26 a víc

**2. Jsi muž, nebo žena?**
Na výběr bonusů to nemá vliv.
Možnosti: Muž · Žena

**3. Kde už máš účet?**
Bonus dostaneš jen tam, kde ještě klient nejsi.
Možnosti: názvy bank z `OFFERS` (viz oddíl 3)

**4. Které z těchhle služeb už používáš?**
Uvítací kredit dávají jen novým uživatelům. Na zbytek ti ho ukážeme.
Možnosti: názvy služeb ze `SERVICES` (viz oddíl 3)

**5. Kolik účtů si chceš založit?**
Bonusy jde posbírat i u víc bank najednou.

| Možnost | Doplněk |
| --- | --- |
| Jeden | Chci jeden a mít klid |
| Dva až tři | Zvládnu si pohlídat víc podmínek |
| Kolik to jde | Jde mi hlavně o peníze |

**6. Můžeš si nechat posílat výplatu na nový účet?**
Na příchozí platbě stojí ty nejvyšší bonusy.

| Možnost | Doplněk |
| --- | --- |
| Ano | Výplatu tam přesměruju |
| Výplatu ne | Ale 10 000 Kč měsíčně tam pošlu |
| Ne | Nový účet nechci nikam napojovat |

**7. Kolik plateb kartou zvládneš měsíčně?**
U většiny bonusů musíš kartou párkrát zaplatit. Poslední otázka.
Možnosti: Čtyři a míň · Pět až devět · Deset a víc

### 2.5 Obrazovka pro nezletilé

Ukáže se hned po odpovědi „Pod 18" a kvíz tam končí.

Nadpis: **Odměny za účet jsou až od 18 let**

> Banky platí jen lidem, kteří můžou smlouvu podepsat sami. Do osmnácti si účet
> založit můžeš, ale potřebuješ k tomu rodiče. Takový účet bonus nenese.

> Sepsali jsme, které účty od 15 let stojí za to a co k založení potřebuješ.

Tlačítka: **Účty od 15 let** · **Zpátky**

> **Pozor:** „Účty od 15 let" míří na `/ucty-pro-mladsi-18`. Ta stránka zatím
> neexistuje, takže kvíz na tom kliku končí čtyřstovkou. `check.mjs` to ověřit
> neumí, je to mimo repo.

### 2.6 Výsledek

Štítek: **Tvůj výsledek** · pod ním částka, která nadojede

Podtitul: „Tolik můžeš získat u 3 bank." (číslo a pád podle počtu)

Na kartě nabídky: odznak **Nejvyšší bonus** (jen když je opravdu vyšší než
druhá), **Splňuješ podmínky**, tlačítko **Získat bonus**

Blok služeb: **Kde ještě dostaneš uvítací kredit**

> Výši kreditu určuje aktuální akce, uvidíš ji při registraci.

Tlačítko u služby: **Vyzkoušet**

Dole: Odkazy jsou partnerské. Pořadí určuje výše bonusu, ne provize.
Tlačítko **Projít znovu**

### 2.7 Prázdný výsledek

Štítek a částka zůstávají, podtitul se mění na:

> Na tvoje odpovědi zatím nesedí žádný bonus.

Důvod se řekne adresně, podle toho, co odpovědi opravdu blokuje. Jedna ze tří
vět:

1. Účet máš už u všech bank, které teď bonus dávají.
2. Nejvíc bonusů ti bere počet plateb kartou: 4 nabídky jich chtějí víc, než
   jsi zadal.
3. Nejvíc bonusů stojí na příchozí platbě: 3 nabídky ji vyžadují vyšší, než
   kterou zvládneš.

Tlačítka: **Upravit odpovědi** · **Projít znovu**

---

## 3. Nabídky a služby

Tyhle texty se propisují do kvízu, do karet na úvodní stránce i do notifikací
v hero. Mění se v `OFFERS` a `SERVICES`, v obou souborech naráz.

### 3.1 Banky a brokeři

| Nabídka | Odměna | Podmínka |
| --- | --- | --- |
| Raiffeisenbank | 3 000 Kč | Výplata na účet, 10 plateb kartou |
| Air Bank | 1 500 Kč | Příchozí platba od 15 000 Kč, 5 plateb kartou |
| Moneta | 1 200 Kč | Příchozí platba od 10 000 Kč |
| mBank | 1 000 Kč | 5 plateb kartou po dobu 2 měsíců |
| Bondster | 1 000 Kč | Registrace a investice od 5 000 Kč |
| Portu | 1 000 Kč | Tři měsíce investování bez poplatku, vklad od 1 000 Kč |
| Fondee | 1 000 Kč | Tři měsíce správy zdarma po registraci s kódem |
| ČSOB | 800 Kč | 10 plateb kartou v prvním měsíci |
| Fio banka | 500 Kč | Bez podmínek, stačí aktivovat účet |
| XTB | 500 Kč | Akcie zdarma k novému účtu v akčním období |

> **Pozor:** Portu, Fondee a XTB mají částku jen dosazenou, aby se daly zařadit
> do pořadí. Portu a Fondee dávají měsíce správy zdarma, XTB akcii v hodnotě
> zhruba 15 až 30 dolarů. Před ostrým během to musí nahradit skutečná čísla,
> nebo ty tři řádky pryč. Součet 11 500 Kč je proto dnes nadsazený.

### 3.2 Služby s uvítacím kreditem

| Služba | Štítek | Text |
| --- | --- | --- |
| Wolt | Jídlo domů | Kredit na první objednávku. Nejširší nabídka restaurací mimo Prahu. |
| Bolt Food | Jídlo domů | Sleva na první objednávky. Bývá levnější na doručení než konkurence. |
| Rohlík.cz | Potraviny | Kredit za první nákupy. Doveze do dvou hodin, včetně čerstvého. |
| Liftago | Odvoz | Sleva na první jízdu. Česká alternativa k Uberu a Boltu. |
| Revolut | Platební karta | Uvítací bonus po první platbě. Kurzy bez příplatku na cesty. |

U služeb se schválně neuvádí částka: Wolt, Bolt Food, Rohlík ani Revolut výši
kreditu veřejně nefixují.

---

## 4. Čeho si při přepisu všimnout

Věci, které jsou v textech napříč webem drženy záměrně. Když se mění kopie,
tohle je to, co se poruší nejsnáz.

- **Žádné pomlčky.** Ve viditelné kopii nejsou. Kde by stála pomlčka, je tečka
  nebo dvojtečka. Je to vědomé rozhodnutí, ne náhoda.
- **Bonus, ne odměna.** Slovo „odměna" zbylo jen na obrazovce pro nezletilé
  („Odměny za účet jsou až od 18 let") a v datech u služeb.
- **Čísla se počítají, neopisují.** Počet otázek, počet nabídek i součet se
  berou z dat. Jediná výjimka je hlava dokumentu, kde to nejde, a proto ji
  hlídá `check.mjs`.
- **Lhůty výplaty se neslibují.** Všude, kde by se hodilo číslo, stojí odkaz na
  podmínky poskytovatele. Totéž u výše kreditu služeb.
- **Tykání** napříč celým webem.
