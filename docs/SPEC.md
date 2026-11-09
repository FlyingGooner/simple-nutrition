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
- **Lägg till** öppnar en egen vy i stället för dagen (✕ stänger) med sökfält överst och flikarna **Senaste · Varor · Rätter**:
  - Senaste: de 20 senast loggade (vara + mängd), ett tryck loggar samma igen.
  - Varor: sök i kärnvaror och egna produkter + sökord; "Visa fler" söker i övriga. Välj vara → välj variant (chips) → mängd i g eller mått (st/dl/msk, visas "≈"). kcal räknas live.
  - Rätter: välj rätt → andel (¼, ⅓, ½, 1 portion, eller gram av färdig vikt om den finns).
  - "Spara" loggar och stänger; bladet kommer ihåg senaste flik.
- Tryck på en post: ändra mängd, flytta till annan måltid, ta bort (snackbar med Ångra).
- **Spara måltid som rätt** (+🍲 i måltidens rubrik, när den har varor i gram): varorna blir ingredienser i en ny rätt "per portion" (namn = måltidens), som öppnas i rätteditorn under Inställningar för namn och sparande. Rätt-poster tas inte med (rätter i rätter stöds inte).
- **Vikt** är ett hopfällt kort längst ner ("Vikt idag (valfritt)"), Spara fäller ihop det. Morgonvikt, en decimal.
- **Kopiera från igår** (knapp när dagen är tom) och **Rensa dagen** längst ner (när något är loggat), med Ångra.
- Svep byter dag; märket "Idag" / "Till idag" som i diet. Fliken Idag hoppar alltid till idag.


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
- Samma upplägg som Trend i diet: vikt överst, de 4 senaste veckorna som tabell (rad öppnar Vecka), viktdiagram över hela tiden (från första vägningen, minst 4 veckor; linjen glesas ut till ~180 punkter, ringar per vägning bara upp till 180 dagar, x-axel med datum eller månad + år) – beslut 2026-11-10, enkel jämförelse från 4 veckor med data. Inga medicinska råd, ingen röd färg.

### 4. Historik
- Kalender per månad: dag färgad efter kcal mot mål (grön inom mål, gul upp till +10 %, dämpad över, grå ej loggad). Tryck → dagen i Idag.
- Under: snitt kcal senaste 7 / 30 dagar, loggade dagar i rad (streak), längsta streak.

### 5. Inställningar
Hopfällbara sektioner som i diet, grupper Mål, Mat och Appen.
- **Mål:** kcal per dag, **valfritt och av från start (beslut 2026-11-10)** – utan mål visas bara summan, inga "kvar", staplar mot mål eller "inom mål" (ändring gäller från idag, historiken behåller gamla mål via `goals[].from`); protein och kolhydrater av/på + gram.
- **Måltider:** lägg till, döp om, sortera, ta bort (slots som i diet).
- **Mina rätter:** lista, ny rätt, redigera, ta bort. Rätteditor: namn, ingredienser (samma sökning som Lägg till), antal portioner, valfri färdig vikt (g). Visar kcal/portion och per 100 g.
- **Egna produkter:** namn + kcal/P/K/F per 100 g, valfritt mått.
- **Egna sökord:** ord → vara (t.ex. "fil" → Filmjölk).
- Borttagning direkt med snackbar Ångra.
- **Data:** backup-fil, läs in, visa som text, Radera all data (identiskt med diet).
- Installera appen, **Hjälp och manual**, snackbar för ny version.

### Layout
Bara mobil (390 px), beslut 2026-11-09. På bredare skärmar samma vy centrerad (max ~640 px), bottenmenyn kvar. Ingen sidomeny eller tvåkolumnsvy – det som kom med från follow-diet-tracker i v0.1 tas bort i v0.2.

## Vanor, träning och flytt från Följ planen (v0.5, beslut 2026-11-09)
Simple nutrition ersätter follow-diet-tracker. **Vanorna är fokus**, kalorierna ett stöd för att räkna på basmåltiderna. Färger och stil som follow-diet-tracker (grön `#2f7d5b`).

- **Idag:** 🔥 streak (lyckade dagar i rad) och Min plan överst. Varje måltid är en vana med ✅ Följde · 🍰 Fusk · ⏭️ Hoppade över (tryck igen = ta bort). Vid 🍰: orsakschips och anteckning (140 tecken). Under varje måltid en hopfälld rad **🍽 Mat · 420 kcal** med posterna, "+ Lägg till mat" och "+🍲 Spara som rätt". Därunder + Extra fusk, + Träningspass (med veckomål), "Dagens följsamhet", kcal-summan (smal), vikt och Rensa dagen (tar bort mat, vanor, vikt och pass).
- **Vecka:** följsamhet, fusk, ✅/⏭️, prickar per dag och vanligaste orsak först; sedan träning mot mål; sist kalorier med stapel per dag.
- **Trend:** tabellen visar v, vikt (7-d), ±, ✅ %, 🍰, 🏋️ pass och kcal/d. "Vad hänger ihop": bra mot sämre veckor, ≥ passmål mot färre, under mot över kalorimålet.
- **Historik:** kalendern färgas efter följsamhet (som i follow-diet-tracker), markering för vägning och träning; följsamhet 7/30 dagar, streak, längsta streak, pass totalt, kcal-snitt 7 dagar.
- **Inställningar:** fyra hopfällbara grupper – **Vanor** (Min plan, Lyckad dag, Måltider, Orsaker), **Träning** (passtyper och mål per vecka), **Kalorier** (kalorimål, protein/kolhydrater, Mina rätter, egna produkter, egna sökord), **Allmänt** (Data, Installera, Hjälp).
- **Beräkningar:** följsamhet, streak, veckostatistik och längsta streak görs av follow-diet-trackers egna funktioner (`fdt-store.js`) på en vy av datan (`habitView`), så siffrorna blir desamma som i den appen. Extra fusk räknas i följsamheten. Vägningsdag finns inte – vikten är 7-dagars medel.

**Datamodell (tillägg i `sn.data`):**
```js
habits:   { "2026-11-09": { m1: { outcome: "cheat", reason: "craving", note: "…", name: "Frukost" }, "extra-1731…": { outcome: "cheat" } } },
workouts: { "2026-11-09": [{ types: ["push", "pull"] }, { types: ["run"], km: 5.2, sec: 1710 }] },
settings: { reasons: [{ id, name }], successThreshold: 0.8, planText: "", workoutTypes: [{ id, name, kind: "gym"|"cardio" }], workoutGoal: 0, gymGoal: 0, cardioGoal: 0 }
```
Nyckeln i `habits` är måltidens id (`meals`) eller `extra-<tid>`. Valideras med follow-diet-trackers `validate()` (samma gränser: 20 per dag, 10 pass per dag, 60 orsaker/passtyper, datum 2000–2100, objekt utan prototyp).

**Flytt från Följ planen:** spara en backup-fil i follow-diet-tracker och läs in den under Data (fil eller text). Känns igen på `app: "follow-diet-tracker"`, läses och valideras av en oförändrad kopia av dess `store.js` (`fdt-store.js`, utan `load()`/`save()` – rör aldrig `fp:v1`) och läggs sedan **till** (ersätter inget):
- Måltider matchas på namn (Frukost = Frukost); okända läggs till (max 10).
- På samma dag vinner det som redan finns i Simple nutrition; Följ planen fyller resten (vanor, vikt, pass).
- Plan, lyckad dag-gräns, orsaker, passtyper och mål tas över från Följ planen.
- Dialog "Lägga till data från Följ planen?" med summering, sedan Ångra.

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
{ id: "x1", m: "m2", ref: "r:a81c", name: "Köttfärssås", q: 0.25, n: [665, 38, 78, 20] }   // rätt: q = andel av hela receptet, n = totalt för andelen
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
- **Inga färdiga rätter i appen** (beslut 2026-11-09). Användaren bygger sina egna rätter.
- **Två sätt att ange en rätt** (beslut 2026-11-09), valda med en växel i rätteditorn:
  - **Per portion:** receptet gäller en portion (`portions: 1`), t.ex. en gröt eller en matlåda som lagas en i taget.
  - **Hel sats:** receptet gäller allt som lagas (`portions: 2–50`), t.ex. köttfärssås på 500 g nötfärs delat på 5.
- **Loggning av rätt:** `q` = andel av hela receptet (0 < q ≤ 50).
  - Hel sats: chips ½ portion, 1 portion, 2 portioner (= q 0,5/N, 1/N, 2/N) och egen andel, t.ex. ⅕ av satsen.
  - Per portion: ½, 1, 1½, 2 portioner (q = 0,5–2).
  - Har rätten färdig vikt (`cooked`) kan man i stället ange gram av den färdiga rätten: q = gram / `cooked`. Det är exaktast, eftersom vatten kokar bort och portionerna blir olika stora.
  - Posten får `n` = summan av rättens ingredienser × q (ögonblicksbild). Senare ändringar av rätten påverkar inte loggade dagar.
- Tillbehör (pasta, ris) loggas helst som egna poster, så att portionen blir flexibel.
- **Guide i rätteditorn:** en hopfälld rad "Så räknar du" med samma text i Hjälp och `MANUAL.md`:
  1. Väg råvarorna okokta innan du lagar maten.
  2. Välj per portion eller hel sats och ange antal portioner.
  3. Väg gärna hela den färdiga rätten (minus kastrullen) och fyll i färdig vikt. Då kan du logga i gram.
  4. Vatten, salt och kryddor behöver inte vägas.

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
- Rådata `data/indata/livsmedelsverket.json` hämtades en gång 2026-11-09. Ny hämtning bara vid ny version; ett permanent hämtverktyg kräver förhandsprövning av `granskning`.
- `tools/build-data.ps1` (inga nätverksanrop) bygger `data/foods.js` från rådatan, `data/indata/varugrupper.csv` (kärnvaror, varianter, sökord) och `data/indata/matt.csv` (mått).
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
  - `n`: exakt 4 ändliga tal. Varor: per 100 g, kcal 0–9000 och gram 0–100. Rätt-poster (`r:`): totalt för andelen, kcal 0–20000 och gram 0–2000
  - `g`: 0–10000
  - `q`: större än 0 och högst 50 (andel av hela receptet)
  - `portions`: 1–50
  - `cooked`: 1–20000
  - mått `u`: `[enhet ≤ 10 tecken, tal 0,01–10000]` eller saknas. Vara: [mått, antal] (t.ex. ["dl", 2]). Egen produkt: [mått, gram per mått]. Rätt-post: ["port." | "av satsen" | "g", mängd]
  - `goals.kcal`: 500–10000 eller saknas (inget mål), `prot`/`kolh` frivilliga och inom rimliga gränser
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
- **Import från Följ planen (v0.5):** samma kontroller som egen import (storlek, BOM, `app`/`format`, allt eller inget, bekräftelse, Ångra). Datan valideras först av follow-diet-trackers egen `validate()` (kopia i `fdt-store.js`, utan lagringsfunktioner) och sedan av `validate()` här. Inga nya lagringsnycklar; `fp:v1` läses eller skrivs aldrig.
- Ny hämtning från Livsmedelsverket görs manuellt. Ett permanent hämtverktyg kräver förhandsprövning och en post i `$toolNet`.

## PWA-krav
- `manifest.webmanifest` med ikoner 192/512 (any + maskable), `display: standalone`.
- `sw.js` cachar appens filer under `sn-<version>` och raderar bara egna cacher.
- Fungerar offline efter första besöket.

## Design
Material Design 3 enligt `../STIL.md`, stil från follow-diet-tracker. Nyckelfärg `#2f7d5b` (som follow-diet-tracker). Bottenmeny, bara mobil (390 px). Inga valstress: högst 5 varianter, "Normal" förvald.

## Byggordning
**Status 2026-11-09:** v0.1–v0.5 byggda (release 0.5.0: vanor, träning, import från Följ planen, gröna färger). v0.6 (manual med bilder) väntar på CSP-beslut: bilderna bäddas in som `data:` i testfilen, vilket kräver `img-src 'self' data:` som i follow-diet-tracker (förhandsprövning + godkännande).

### Första bygget (v0.1.0)
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
- v0.2: Mina rätter: rätteditor i Inställningar (per portion eller hel sats, färdig vikt, guide), fliken Rätter i Lägg till (portioner, andel eller gram). Inga färdiga rätter.
- v0.3: Trend och Historik som i diet, 7-dagars viktmedel.
- v0.4: Mål för protein och kolhydrater, egna produkter, egna sökord, Kopiera från igår.
- v0.5: Manual med bilder.

Uppskattning för v0.1: ~120–160k tokens (Lägg till-bladet är största delen).

## Acceptanskriterier
- [ ] Installerbar som PWA på Android och iPhone.
- [ ] Fungerar offline.
- [ ] Ljust och mörkt tema.
- [ ] Layout fungerar på 390 px (mobil). Surfplatta och dator är inte krav (beslut 2026-11-09).
- [ ] `granskning` utan anmärkning.
- [ ] Datatesterna (`test-maltider.ps1`) godkända.

## Framtida idéer
- Räkna fram faktisk förbrukning ur logg + vikttrend och föreslå kalorimål.
