# Simple nutrition – specifikation

## Idé
Minimalistisk kaloriräknare med Livsmedelsverkets data för råvaror (kcal, protein, kolhydrater, fett), receptbyggare för matlådor, egna produkter och vikttrend med 7-dagars medel. Motpol till stora kalorappar: inga konton, ingen reklam, inga märkesdubbletter – användaren lär sig råvaror och fetthalter.

## Mål
- Logga mat snabbt per dag mot ett **kalorimål** (standard och fokus).
- Frivilliga mål för protein och kolhydrater (avstängda från start).
- Bygga egna rätter av basvaror (t.ex. köttfärssås av 500 g nötfärs …) och logga en andel (¼) eller gram av färdig rätt.
- Logga morgonvikt och följa trenden (7-dagars medel).
- Egna produkter och egna sökord vid behov.

## Icke-mål
- Inget konto, ingen server, ingen spårning.
- Inga varumärken i databasen (bara "typ X" som exempeltext), inga färdigrätter i kärnlistan.
- Inga mikronäringsämnen – bara kcal, protein, kolhydrater, fett.

## Begrepp
| Begrepp | Betydelse |
|---|---|
| Kärnvara | En av ~90 vanliga varor med 1–5 butiksvarianter (`FOODS_CORE`) |
| Variant | Butiksalternativ, t.ex. Mjölk "Lätt 0,5 %"; kan vara beräknad (`calc`) |
| Övriga | Resten av Livsmedelsverkets råvaror (`FOODS_MORE`), visas under "Visa fler" |
| Rätt | Användarens recept: ingredienser i gram + antal portioner |
| Post | En rad i dagens logg (vara i gram eller andel av rätt) |
| Mått | Ungefärlig vikt för st/dl/msk, visas "≈" (egna uppskattningar) |

## Skärmar
Samma struktur som follow-diet-tracker (beslut 2026-11-09): bottenmeny med fem flikar **Idag · Vecka · Trend · Historik · Inställningar**, versionsetikett uppe till höger, samma svep, snackbar med Ångra, haptik och hopfällda kort. Skillnaden är innehållet: kalorier och måltider i stället för följde/fusk.

### 1. Idag (startvy)
```
┌──────────────────────────────┐
│  Torsdag 6 nov        Idag   │
│  ◀  ━━━━━━━━━━━━━━━━━━━  ▶   │  (byt dag)
│  1 640 / 2 200 kcal          │
│  ████████████░░░░  560 kvar  │
│  P 92 g · K 180 g · F 55 g   │
│                              │
│  Frukost              420    │
│   Havregryn 60 g      223    │
│   Mjölk lätt 2 dl     78     │
│   + Lägg till                │
│  Lunch                610    │
│   Köttfärssås ¼       610    │
│  Mellanmål            –      │
│  Middag               610    │
│                              │
│  Vikt idag (valfritt)    ›   │
├──────────────────────────────┤
│ Idag Vecka Trend Hist. Inst. │
└──────────────────────────────┘
```
- **Summering överst:** kcal mot dagens mål, stapel och "kvar"/"över" (över visas dämpat, aldrig rött). Protein/kolhydrater visas mot mål bara om de målen är påslagna, annars som rad P · K · F.
- **Måltider** som rubriker med kcal-summa (samma redigerbara lista som slots i diet: Frukost, Lunch, Mellanmål, Middag). Under varje: posterna och "+ Lägg till". Tomma måltider är hopfällda till en rad.
- **Lägg till** öppnar ett blad (dialog) med sökfält överst och flikarna **Senaste · Varor · Rätter**:
  - Senaste: de 20 senast loggade (vara + mängd), ett tryck loggar samma igen.
  - Varor: sök i kärnvaror och egna produkter + sökord; "Visa fler" söker i övriga. Välj vara → välj variant (chips) → mängd i g eller mått (st/dl/msk, visas "≈"). kcal räknas live.
  - Rätter: välj rätt → andel (¼, ⅓, ½, 1 portion, eller gram av färdig vikt om den finns).
  - "Spara" loggar och stänger; bladet kommer ihåg senaste flik.
- Tryck på en post: ändra mängd, flytta till annan måltid, ta bort (snackbar med Ångra).
- **Vikt** är ett hopfällt kort längst ner ("Vikt idag (valfritt)"), Spara fäller ihop det. Morgonvikt, en decimal.
- **Kopiera från igår** (knapp när dagen är tom) och **Rensa dagen** längst ner (när något är loggat), med Ångra.
- Svep byter dag; märket "Idag" / "Till idag" som i diet. Fliken Idag hoppar alltid till idag.

**Bred skärm (≥ 840 px):** Idag till vänster, veckan för vald dag till höger (som Vecka utan bläddring). Lägg till-bladet öppnas som panel i högerkolumnen i stället för dialog.

### 2. Vecka
```
┌──────────────────────────────┐
│  ◀  Vecka 45 (3/11–9/11)  ▶  │
│  Snitt 2 080 kcal/dag        │
│  Mål 2 200 · 5/7 inom mål    │
│  Vikt 84,2 (7-d) −0,4 kg ▼   │
│                              │
│  Per dag                     │
│  M ██████████  2 150         │
│  T ████████    1 890         │
│  O ███████████ 2 400         │
│  …                           │
│  Snitt P 95 g · K 210 · F 70 │
└──────────────────────────────┘
```
- Måndag–söndag. Bara loggade dagar räknas i snittet ("5 loggade dagar").
- "Inom mål" = kcal ≤ mål (+ marginal 5 %). Stapel per dag med mållinje; tryck öppnar dagen i Idag.
- Vikt: 7-dagarsmedel sista dagen i veckan och förändring mot veckan innan.

### 3. Trend
```
┌──────────────────────────────┐
│ 84,2 kg (7-d)       −1,1 kg ▼│  förändring 4 v
│ Totalt −2,3 kg sedan 12 okt  │
│ ── Vecka för vecka ───────── │
│ v   Vikt   ±    kcal/d  mål  │
│ 45  84,2  −0,4  2 080  5/7   │
│ 44  84,6  −0,3  2 150  4/7   │
│ ── Vikt, 12 veckor ───────── │
│  (dagsvikter som prickar,    │
│   7-d medel som linje)       │
│ ── Kcal mot vikt ─────────── │
│ Veckor under mål  −0,5 kg/v  │
│ Veckor över mål   +0,1 kg/v  │
└──────────────────────────────┘
```
- Samma upplägg som Trend i diet: vikt överst, de 4 senaste veckorna som tabell (rad öppnar Vecka), viktdiagram 12 veckor, enkel jämförelse från 4 veckor med data. Inga medicinska råd, ingen röd färg.

### 4. Historik
- Kalender per månad: dag färgad efter kcal mot mål (grön inom mål, gul upp till +10 %, dämpad över, grå ej loggad). Tryck → dagen i Idag.
- Under: snitt kcal senaste 7 / 30 dagar, loggade dagar i rad (streak), längsta streak.

### 5. Inställningar
Hopfällbara sektioner som i diet, grupper Mål, Mat och Appen.
- **Mål:** kcal per dag (ändring gäller från idag, historiken behåller gamla mål via `goals[].from`); protein och kolhydrater av/på + gram.
- **Måltider:** lägg till, döp om, sortera, ta bort (slots som i diet).
- **Mina rätter:** lista, ny rätt, redigera, ta bort. Rätteditor: namn, ingredienser (samma sökning som Lägg till), antal portioner, valfri färdig vikt (g). Visar kcal/portion och per 100 g.
- **Egna produkter:** namn + kcal/P/K/F per 100 g, valfritt mått.
- **Egna sökord:** ord → vara (t.ex. "fil" → Filmjölk).
- Borttagning direkt med snackbar Ångra.
- **Data:** backup-fil, läs in, visa som text, Radera all data (identiskt med diet).
- Installera appen, **Hjälp och manual**, snackbar för ny version.

### Layout: mobil, surfplatta, dator
- **Mobil (< 600 px, test 390 px):** en kolumn, bottenmeny.
- **Surfplatta (600–839 px, test 820 px):** sidomeny, en kolumn max 640 px centrerad.
- **Dator (≥ 840 px, test 1280 px):** Idag + vecka sida vid sida; Lägg till som panel; listor i Inställningar skrollar i sitt kort.

## Datamodell
All användardata i **en** `localStorage`-nyckel, `sn.data` (prefix `sn.` enligt projektets CLAUDE.md). Valideras i `store.js` innan den används; ogiltiga delar hoppas över.

```js
{
  goals:   [{ from: "2026-11-09", kcal: 2200, prot: 120, kolh: 250 }], // prot/kolh frivilliga
  log:     { "2026-11-09": [post, …] },
  dishes:  [rätt, …],
  foods:   [egen produkt, …],
  aliases: { "bregott": "l:1234" },
  weights: { "2026-11-09": 82.4 },
  meals:   [{ id: "m1", name: "Frukost" }, …] // standard Frukost, Lunch, Mellanmål, Middag
}
```

**Referenser** (`ref`) till livsmedel:
| Prefix | Betyder |
|---|---|
| `l:<id>` | Livsmedelsverkets livsmedel |
| `b:<id>` | Beräknad variant (id från `foods.js`) |
| `u:<id>` | Egen produkt |
| `r:<id>` | Egen rätt |

### Mål
- `goals` är en lista med startdatum; en dag jämförs mot det mål som gällde då. Ändrat mål = ny rad.
- `kcal` krävs (standard och fokus). `prot` och `kolh` finns bara om användaren slagit på dem. Fett visas men har inget mål.
- Hjälp att räkna fram ett startvärde (BMR × aktivitet) får finnas men sparas inte.

### Logg
```js
{ id: "x2", m: "m1", ref: "l:151",  name: "Lättmjölk",   g: 206,  n: [39, 3.6, 4.8, 0.5] }  // vara: gram, n per 100 g
{ id: "x1", m: "m2", ref: "r:a81c", name: "Köttfärssås", q: 0.25, n: [665, 38, 78, 20] }   // rätt: andel, n = totalt för andelen
```
- **Ögonblicksbild:** `name` och `n` sparas i posten. Gamla dagar ändras aldrig när databanken uppdateras eller en rätt redigeras (antagande – bekräftas av användaren).
- `m` = måltidens id. Saknas måltiden (borttagen) visas posten under "Övrigt".
- Rätt kan också loggas i gram av färdig rätt (`g`) om rätten har `cooked`.
- Storlek: ~80 byte per post → ~300 KB per år vid 10 poster/dag.

### Rätter
```js
{ id: "a81c", name: "Köttfärssås", portions: 4, cooked: 1650,          // cooked = färdig vikt i g, frivillig
  items: [{ ref: "b:…-12", name: "Nötfärs 12 %", g: 500, n: [188, 20, 0, 12] }, …] }
```
- Ingredienser i gram (mått som st/dl räknas om vid inmatning). Ögonblicksbild `n` per 100 g.
- Andel (¼, ⅕, egen) eller gram av färdig vikt – det senare är exaktare eftersom vatten kokar bort.
- Tillbehör (pasta, ris) loggas helst som egna poster så portionen blir flexibel.

### Egna produkter och sökord
- `foods`: `{ id, name, n: [kcal, prot, kolh, fett] per 100 g, u?: ["st", 60] }`. Ingår i sökningen bredvid basvarorna.
- `aliases`: användarens egna ord → `ref` ("Sök även som …").

### Vikt
- `weights`: datum → kg (en per dag, senaste vinner). 7-dagars medel och trend **räknas fram vid visning**, sparas inte.

### Övriga nycklar
| Nyckel | Innehåll |
|---|---|
| `sn.data` | All användardata (ovan) |
| `sn.tab` | Senast öppnade flik |

### Export och import (STANDARD 5)
- Kuvert `{"app":"simple-nutrition","format":1,"exported":"ÅÅÅÅ-MM-DD","data":{…}}`, kompakt, utan standardvärden och tomma fält.
- Fil `simple-nutrition-ÅÅÅÅ-MM-DD.txt` via gemensamma `backup.js`; text som reserv.
- Import: allt eller inget, samma validering som `store.js`, sammanfattning ("214 loggade dagar, 12 rätter, 5 egna produkter, 98 vägningar, jan–nov 2026") → bekräftelse → ersätter → ångra-snackbar.

## Datakälla och uppdatering
- **Livsmedelsverkets livsmedelsdatabas** (öppna data, källa anges i Hjälp och README med hämtdatum).
- Rådata `data/livsmedelsverket.json` hämtades en gång 2026-11-09. Ny hämtning bara vid ny version; ett permanent hämtverktyg kräver förhandsprövning av `granskning`.
- `tools/build-data.ps1` (inga nätverksanrop) bygger `data/foods.js` från rådatan, `data/varugrupper.csv` (kärnvaror, varianter, sökord) och `data/matt.csv` (mått).
- Varianter = vanliga butiksalternativ, högst 5. Saknas en hos Livsmedelsverket beräknas den (bara kött/mejeri): `=fett|A|B` linjärt, `=fett|A` fettjustering (9 kcal/g). Märks `calc` och visas "beräknad från Livsmedelsverkets data".
- Kvalitet: `tools/test-maltider.ps1` (30 vardagsrätter + en dag, `-Fil`) och `tools/test-data.ps1` (mot Livsmedelsverkets färdigrätter).
- Appen gör inga nätverksanrop; all användardata ligger i `localStorage`.

### Integritet och säkerhet
- CSP: grund-CSP:n, `connect-src 'none'`. Inga undantag utöver U5 (export/import), ingen CSP-ändring. Samma krav som budget-buddy och follow-diet-tracker (förhandsprövning 2026-11-09: tillstyrkt med villkoren nedan).
- `no-referrer`. All extern data och inmatning renderas med `textContent`.
- Inga hemligheter i koden.
- CSP har även `require-trusted-types-for 'script'` – webbläsaren stoppar rå `innerHTML` (Chrome/Edge). Rendera med `textContent`/`el()`.
- `docs/presentation.html` har CSS och JS i egna filer, utan `'unsafe-inline'` och utan `style`-attribut.
- Arbetsytans agent `granskning` bestämmer; nya projekt läggs in i dess undantagstabell.
- Namn i loggen, rätter, egna produkter och sökord är användarinmatning: valideras (längd, styrtecken) och renderas bara med `textContent`.
- **Lagring:** bara `sn.data` och `sn.tab` i `localStorage`, cache `sn-<version>`. `sn.tab` valideras mot listan över flikar.
- **Validering i `store.js`** per del. Ogiltiga poster hoppas över utan krasch.
  - id: `^[A-Za-z0-9_-]{1,40}$`
  - datumnycklar: `^\d{4}-\d{2}-\d{2}$` och giltigt datum
  - `ref`: `^[lbur]:[A-Za-z0-9_.-]{1,40}$`
  - `n`: exakt 4 ändliga tal, kcal 0–9000 och gram per 100 g 0–100
  - `g`: 0–10000
  - `q`: större än 0 och högst 1
  - `portions`: 1–50
  - `cooked`: 1–20000
  - mått `u`: `[enhet ≤ 10 tecken, gram]` eller saknas
  - `goals.kcal`: 500–10000, `prot`/`kolh` frivilliga och inom rimliga gränser
  - `weights`: 20–400 kg
  - `meals`: 1–10 st, och en post vars `m` saknas bland dem visas under Övrigt
- **Text** (namn på post, rätt, produkt, måltid och sökord samt alias-nycklar):
  - trimmas och kortas till högst 60 tecken (sökord högst 40)
  - styr- och riktningstecken tas bort: U+0000–001F, U+007F–009F, U+200E/F, U+202A–202E, U+2066–2069
  - renderas bara med `textContent`/`el()`, aldrig i `href`, `src`, `style` eller som attributnamn
- **Listtak** så att datan håller sig under exportgränsen på 2 MB:
  - 100 poster per dag och 3650 dagar i `log`
  - 500 rätter med högst 50 ingredienser var
  - 1000 egna produkter, 1000 alias och 3650 vikter
- `aliases` är ett objekt utan prototyp (`Object.create(null)`). Nycklarna `__proto__`, `constructor` och `prototype` avvisas.
- Ögonblicksbilden (`name`/`n`) i en post valideras som all annan sparad data.
- **Import enligt U5:**
  - text högst 2 MB och fil högst 8 MB, kontrollerat före läsning
  - filen läses med `arrayBuffer` + `TextDecoder` (fatal), BOM tas bort
  - `app` och `format` kontrolleras
  - utelämnade standardvärden fylls i till nya objekt
  - samma validering som i `store.js`
  - allt eller inget, med bekräftelse före sparning och ångra efteråt
  - misslyckad `save()` behåller den gamla datan och visas i `#status`
  - export bara från validerat state, filnamn bara prefix + datum, varningstext om att filen är okrypterad
  - `backup.js` är en identisk kopia av `template/backup.js`
- `FOODS_SOURCE` har ingen webbadress (bara namn och datum). `data/foods.js` och `backup.js` ingår i service workerns `ASSETS`.
- Ny hämtning från Livsmedelsverket görs manuellt. Ett permanent hämtverktyg kräver förhandsprövning och en post i `$toolNet`.

## PWA-krav
- `manifest.webmanifest` med ikoner 192/512 (any + maskable), `display: standalone`.
- `sw.js` cachar appens filer under `sn-<version>` och raderar bara egna cacher.
- Fungerar offline efter första besöket.

## Design
Material Design 3 enligt `../STIL.md`, stil från follow-diet-tracker. Nyckelfärg `#2f697d`. Bottenmeny < 600 px, navigation rail 600–839 px, två kolumner ≥ 840 px. Inga valstress: högst 5 varianter, "Normal" förvald.

## Första bygget (v0.1.0)
Målet är en app som går att använda varje dag redan i första versionen. Det som kräver mest UI får vänta.

**Ingår**
1. Skal som i diet: fem flikar, svep, snackbar med Ångra, tema, offline, versionsetikett. Trend och Historik visar "Kommer snart".
2. **Idag** fullt: dagbläddring, summering kcal mot mål (+ rad med P · K · F), måltider med poster, ändra/flytta/ta bort post, Rensa dagen, Vikt-kortet.
3. **Lägg till** med flikarna Senaste och Varor (kärnvaror, varianter, gram och mått, "Visa fler"). Fliken Rätter kommer senare.
4. **Inställningar:** kcal-mål, Måltider, Data (backup, läs in, text, radera), Hjälp.
5. **Vecka** enkel: snitt kcal, inom mål x/7, stapel per dag.
6. Datamodellen komplett från start (även `dishes`, `foods`, `aliases`, `goals` med datum), så att inget behöver migreras senare.
7. Tester: logga vara i gram och mått (rätt kcal), ögonblicksbild, mål från datum, flytta post, backup tur och retur, sökningen visar kärnvara före övriga.

**Senare, i ordning**
- v0.2: Rätter (editor i Inställningar + flik i Lägg till, andel eller gram).
- v0.3: Trend och Historik som i diet, 7-dagars viktmedel.
- v0.4: Mål för protein och kolhydrater, egna produkter, egna sökord, Kopiera från igår.
- v0.5: Bred skärm med panel, manual med bilder.

Uppskattning för v0.1: ~120–160k tokens (Lägg till-bladet är största delen).

## Acceptanskriterier
- [ ] Installerbar som PWA på Android och iPhone.
- [ ] Fungerar offline.
- [ ] Ljust och mörkt tema.
- [ ] Layout fungerar på 390 px (mobil), 820 px (iPad stående) och 1280 px (dator).
- [ ] `granskning` utan anmärkning.
- [ ] Datatesterna (`test-maltider.ps1`) godkända.

## Framtida idéer
- Räkna fram faktisk förbrukning ur logg + vikttrend och föreslå kalorimål.
