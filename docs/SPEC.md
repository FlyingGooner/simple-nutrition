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
| Mått | Ungefärlig vikt för st/dl/msk, visas "≈" (egna uppskattningar, `data/indata/matt.csv`). Konserver anges avrunna: "burk avr." (bönor, kikärtor 230 g, tonfisk 120 g) |

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
- **Data:** backup-fil, läs in, klistra in text (import), Radera all data (identiskt med diet).
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
- **Beräkningar:** följsamhet, streak, veckostatistik och längsta streak görs av follow-diet-trackers egna funktioner (`habit-store.js`) på en vy av datan (`habitView`), så siffrorna blir desamma som i den appen. Extra fusk räknas i följsamheten. Vägningsdag finns inte – vikten är 7-dagars medel.

**Datamodell (tillägg i `sn.data`):**
```js
habits:   { "2026-11-09": { m1: { outcome: "cheat", reason: "craving", note: "…", name: "Frukost" }, "extra-1731…": { outcome: "cheat" } } },
workouts: { "2026-11-09": [{ types: ["push", "pull"] }, { types: ["run"], km: 5.2, sec: 1710 }] },
settings: { reasons: [{ id, name }], successThreshold: 0.8, planText: "", workoutTypes: [{ id, name, kind: "gym"|"cardio" }], workoutGoal: 0, gymGoal: 0, cardioGoal: 0 }
```
Nyckeln i `habits` är måltidens id (`meals`) eller `extra-<tid>`. Valideras med follow-diet-trackers `validate()` (samma gränser: 20 per dag, 10 pass per dag, 60 orsaker/passtyper, datum 2000–2100, objekt utan prototyp).

**Flytt från Följ planen:** spara en backup-fil i follow-diet-tracker och läs in den under Data (fil eller text). Känns igen på `app: "follow-diet-tracker"`, läses och valideras av en oförändrad kopia av dess `store.js` (`habit-store.js`, utan `load()`/`save()` – rör aldrig `fp:v1`) och läggs sedan **till** (ersätter inget):
- Måltider matchas på namn (Frukost = Frukost); okända läggs till (max 10).
- På samma dag vinner det som redan finns i Simple nutrition; Följ planen fyller resten (vanor, vikt, pass).
- Plan, lyckad dag-gräns, orsaker, passtyper och mål tas över från Följ planen.
- Dialog "Lägga till data från Följ planen?" med summering, sedan Ångra.

## Snabbval och fusk i kcal (v0.9, beslut 2026-11-11)
- v0.13.7: Extra fusk kan också få vara/rätt från samma Lägg till-meny som måltiderna (`+ Välj vara eller rätt`, post med `m: extra-<n>`). Kortet visar nivå och varor med kcal; tas extrat bort följer alla dess poster med.
Snabba uppskattningar när man inte vet exakt – samma idé som Utemat (F3), utökad.

**1. Lägg till → fliken Snabbval** (ersätter fliken Utemat): flikarna blir **Senaste · Varor · Rätter · Snabbval**. Överst en växel **Hemmagjort | Utemat** (kommer ihåg senaste val). Varje rad: nivå, exempel och ≈ kcal; ett tryck loggar (som i dag).

| Grupp | Nivå | ≈ kcal | n [kcal, P, K, F] | Exempel |
|---|---|---|---|---|
| Hemmagjort | Lätt | 450 | [450, 35, 35, 18] | Mager fisk/kyckling med grönt, omelett, tonfisksallad, mager färs, soppa, wok med grönsaker |
| Hemmagjort | Standard | 650 | [650, 35, 70, 22] | Köttfärssås med pasta, lax med potatis/sås, kycklinggryta med ris, köttbullar med potatis, fiskgratäng, kalops, curry med ris, thaiwok, pokebowl |
| Hemmagjort | Tung | 850 | [850, 40, 95, 32] | Stor portion pasta/färs, hemmagjord burgare m. klyftpotatis, lasagne, carbonara, makaronilåda, fläskpannkaka, schnitzel med pommes |
| Utemat | Lätt / Standard / Tung | 700 / 1 000 / 1 400 | oförändrat | oförändrat (F3) |
| Snacks | Lite | 250 | [250, 3, 27, 14] | En Magnum, en kanelbulle, Marabou 45 g (en rad), lösgodis 60 g (en liten skopa), en näve nötter, två kakor |
| Snacks | Mellan | 500 | [500, 6, 50, 30] | Halv chipspåse (175 g), Marabou 100 g (en hel liten kaka), lösgodis 125 g, en wienerbröd + läsk, halv glasskartong |
| Snacks | Mycket | 950 | [950, 11, 95, 58] | Hel chipspåse (175 g), Marabou 175 g (nästan en 200 g-kaka), lösgodis 250 g, chips + dipp, hel glasskartong |

Snacks visas inte i Lägg till – bara i fusk (punkt 2–3). Siffrorna är antaganden; justeras av användaren.

**2. 🍰 Fusk på en måltid, orsak Snacks:** under orsakschipsen visas en rad **Lite ≈ 250 · Mellan ≈ 500 · Mycket ≈ 950** (med exemplen under, som i Snabbval). Ett tryck loggar posten i måltidens mat (`m` = måltidens id); tryck igen på samma = ta bort, annan nivå = byt. Byts orsaken från Snacks, eller tas 🍰 bort, tas posten bort.

**3. + Extra fusk (v0.9.1):** kortet har inga orsaker – bara **Hur mycket?** med Snacks-nivåerna (Lite ≈ 250 · Mellan ≈ 500 · Mycket ≈ 950) och anteckning. Orsaken sparas som Snacks. Ett tryck på en nivå sparar och fäller ihop kortet till en rad (nivå ≈ kcal); tryck på raden för att ändra, samma nivå igen = ta bort. Posten sparas med `m` = extra-nyckeln (`extra-<tid>`); tas extra fusket bort följer posten med.

**4. Utemat styrs inte av utfallet:** äter man ute och tar det bästa valet (t.ex. Lätt) kan måltiden vara ✅ enligt plan. Alla tre Utemat-nivåerna går därför att logga på en måltid oavsett utfall (✅, 🍰 eller inget) – i Snabbval som i dag, och vid 🍰 med orsak Utemat visas de också under orsakschipsen som för Snacks i punkt 2. Kcal-nivåer sätter aldrig utfall automatiskt; användaren väljer ✅ eller 🍰 själv.

**Data:** inga nya nycklar. Nya id i `QUICK_ADD`: `home-light`, `home-std`, `home-heavy`, `snack-s`, `snack-m`, `snack-l` (ref `q:<id>`, valideras som i dag). Logg-poster får `m` = `extra-<tid>` (valideras: måste finnas i `habits` samma dag, annars visas posten under Övrigt). Följsamheten ändras inte – kcal är bara stöd.

**Test:** Snabbval-fliken loggar Hemmagjort-nivå; Snacks-nivå på måltidsfusk loggas, byts och tas bort med orsaken; extra fusk med nivå loggar post och tar bort den med fusket; export/import behåller posterna.

## Bakåt, frukost och egen uppskattning (v0.14.0, beslut 2026-11-14)
- **Bakåt** (Androids knapp, svep i Safari) stänger det översta: dialog → vald vara/rätt/egen uppskattning (tillbaka till samma flik, sökord, Visa fler och scroll) → Lägg till → rätt-editor (osparat: dialogen "Släng ändringarna?") → föregående flik → appen stängs vid startvyn. Flikbyte och `goto` = `pushState`, lager = `pushState` med samma hash, knappar som stänger lager går tillbaka med `history.go()`. Dagbyte, flikar i Lägg till och snackbar ger inga steg. Ren logik i `nav.js` (`topLayer`, `closeTop`, `layerDepth`, `dishDirty`, `defaultQuickG`).
- **Frukost i Snabbval:** läget Frukost | Hemmagjort | Utemat. `bf-light` 250/12/32/8, `bf-std` 400/18/45/16, `bf-heavy` 650/28/70/28. Förvalt Frukost i måltiden som heter Frukost, annars senast använda läget.
- **Egen uppskattning:** sista raden i varje läge. Namn ≤ 60 (tomt = "<Läge> – egen"), kcal 1–5 000, makron 0–500 g (tomt = 0). Post `q:est-bf|est-home|est-out`, egna värden i `n`, visas med "≈ uppskattning" och under Senaste (inte sammanslagen med andra uppskattningar).
- **Tester:** Node (`tools/tests/*.node.mjs`, `node:test`, laddar källfilerna) för `nav.js`, frukostraderna, `cleanPost` för `q:est-*` och export/import.

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
- Plantext högst 300 tecken överallt (`PLAN_MAX`). Anteckning och plan sparas även medan man skriver (500 ms) och när sidan göms; anteckningen sparas till dagen den visades för (`data-day`). Idag, Vecka och Historik följer med till nästa dag efter midnatt om man inte bläddrat bort (v0.12.0).
| Nyckel | Innehåll |
|---|---|
| `sn.data` | All användardata (ovan) |
| `sn.tab` | Senast öppnade flik |

### Export och import (STANDARD 5)
- Kuvert `{"app","format":1,"exported","appVersion","readme","schema","example","data"}` (F2, v0.8): `readme`/`schema`/`example` beskriver formatet (se `docs/DATA.md`), `data` kompakt. Importen läser bara `app`, `format` och `data`; övriga nycklar ignoreras.
- Fil `simple-nutrition-ÅÅÅÅ-MM-DD.txt` via gemensamma `backup.js`, lösenordskrypterad (se Integritet och säkerhet), alltid lösenordskrypterad sedan 2026-11-11; inklistrad text kan importeras, ingen textexport.
- Lösenord (v0.12.0): knapp **Skapa slumpmässigt lösenord** (16 tecken `xxxx-xxxx-xxxx-xxxx`, `crypto.getRandomValues` med rejection sampling, inga `0 O o 1 I l`, sparas aldrig), **Kopiera** (bara genererat lösenord efter tryck, `navigator.clipboard.writeText`, annars markering; varning om att det ligger kvar i urklipp; U5 2026-11-13), färgkodad förhandsvisning (`textContent`, `aria-hidden`). Formuläret har dolt användarnamn ”Simple nutrition backup”, `name`/`autocomplete` och submit så att lösenordshanterare kan spara och fylla i.
- Import: allt eller inget, samma validering som `store.js`, sammanfattning ("214 loggade dagar, 12 rätter, 5 egna produkter, 98 vägningar, jan–nov 2026") → bekräftelse → ersätter → ångra-snackbar.

## Datakälla och uppdatering
- **Livsmedelsverkets livsmedelsdatabas** (öppna data, källa anges i Hjälp och README med hämtdatum).
- Rådata `data/indata/livsmedelsverket.json` hämtades en gång 2026-11-09. Ny hämtning bara vid ny version; ett permanent hämtverktyg kräver förhandsprövning av `granskning`.
- `tools/build-data.ps1` (inga nätverksanrop) bygger `data/foods.js` från rådatan, `data/indata/varugrupper.csv` (kärnvaror, varianter, sökord) och `data/indata/matt.csv` (mått).
- Varianter = vanliga butiksalternativ, högst 5. Saknas en hos Livsmedelsverket beräknas den (bara kött/mejeri): `=fett|A|B` linjärt, `=fett|A` fettjustering (9 kcal/g). Märks `calc` och visas "beräknad från Livsmedelsverkets data".
- Förvald variant = det vanligaste alternativet (beslut 2026-11-12): t.ex. Mellanmjölk, Normal 75 % (Bregott), ost 28 %, kokt potatis/ris/pasta. Ordningen styrs av `varugrupper.csv` (första raden per vara bär sökorden); scenarier i `app-data.ps1` låser förvalen.
- Kvalitet: `tools/test-maltider.ps1` (30 vardagsrätter + en dag, `-Fil`) och `tools/test-data.ps1` (mot Livsmedelsverkets färdigrätter).
- Appen gör inga nätverksanrop; all användardata ligger i `localStorage`.

### Schabloner (v0.13)
- **Nya namn och dolda varianter (beslut 2026-11-13):** Smörgåsfett → **Smör** (en variant, Normal 75 %, enheter smörgås 10 g (förvald, höjd från 5 g 2026-11-13) och msk 14 g; en andra rad i matt.csv blir `u2`), Pålägg kött → **Skinka**, Vit fisk → **Torsk**, Vegoprotein → **Vegofärs**, Kaffe och te → **Kaffe**. Kolumnen `dold` i `varugrupper.csv` ger `hide:1`: varianten syns inte i sökning/chips men `findRef()` hittar den, så gamla loggar och backuper visas som förut. Inget sökord på mer än en post (test).
- **Rubrik efter träff (Steg B, beslut 2026-11-13):** träffar sökordet början av en variants namn i en samlingspost (t.ex. ”zucchini” i Zucchini och aubergine) visas variantens namn som rubrik med postens namn under, och varianten är förvald när raden väljs. Inte för generiska grader (lätt, normal, rå …) eller sökord under 3 tecken.
- `FOODS_PRODUCTS` i `data/foods.js`, skriven av `tools/build-data.ps1` från `tools/data/schabloner.csv` (37 rader, 35 livsmedel; testade mot 131 referenser i `referens.csv`, 107 bekräftade (LV eller förpackningsvärde från webben 2026-11-12, källa i kolumnen), rätter med upp till 4 LV-varianter). Handändras aldrig.
- Densitet (flytande i `schabloner.csv` och `matt.csv`) testas mot `tools/data/densitet.csv` (standardvärden, `säker=nej`), max 3 % ifrån.
- Kvalitet på appens data som användaren möter den (`tools/tests/app-data.ps1`, körs av `data.ps1`): ~50 loggningar (`tools/data/scenarier.csv`: sökord ger väntad vara, mängd + enhet ger kcal inom tolerans mot förpackning/LV) och rätter byggda av ingredienser (`tools/data/recept.csv`: kcal/100 g tillagat mot LV-rätt och schablon). Tillagad vikt är antagen och står i filen.- Rätter från restaurang/snabbmat (v0.13.4): Pizza, Kebab med bröd/tallrik, Hamburgare med bröd, Korv med bröd, Sushi – LV filtrerar bort dessa grupper, så de fanns inte i appen innan.
- En rad per livsmedel med undertext och kcal per enhet; val bara för Läsk/energidryck (Socker/Sockerfri) och Öl/vin. Förifyllt 1 st (enhet g i CSV visas som portion).
- Sökordning: egna sökord och produkter, schablon, Livsmedelsverket. Schablon och LV-rader visas båda (schablonen först); specifik sökning utan schablon (ugnspannkaka) ger LV.
- Sökord som krockade flyttades från kärnan (läsk, cola, öl, vin, cider, latte, cappuccino, baguette, fiskpinnar, laxfilé, falukorv, potatismos, gröt). Kärnans Läsk blev Saft (utspädd, glas 250 g).
- Loggade poster sparar sina värden; ändrade schabloner påverkar inte gamla poster.
### Enheter i Varor-vyn (v0.13.1)- Fasta varor: naturlig enhet (st, skiva, bit, dl) + g. Flytande (`d` = g per ml, från `densitet` i `matt.csv`/`schabloner.csv`): naturlig enhet + dl + ml, inte g.- Naturlig enhet förvald (1); g/ml förvalt 100. Byte av enhet räknar om talet via gram. Summa: "2 st (90 g) · 150 kcal".- Posten sparar `g` och `u: [enhet, antal]` (även ml); gamla poster och backuper oförändrade.

### Integritet och säkerhet
- **Schabloner (v0.13):** ny ref-typ `p:<id>` i ref-regexet (samma teckenregler). Posten bär egna värden som valideras som en vara; id:t slås inte upp vid import. Inga nya lagringsnycklar.
- CSP: grund-CSP:n, `connect-src 'none'`. Inga undantag utöver U5 (export/import), ingen CSP-ändring. Samma krav som budget-buddy och follow-diet-tracker (förhandsprövning 2026-11-09: tillstyrkt med villkoren nedan).
- `no-referrer`. All extern data och inmatning renderas med `textContent`.
- Inga hemligheter i koden.
- CSP har även `require-trusted-types-for 'script'` – webbläsaren stoppar rå `innerHTML` (Chrome/Edge). Rendera med `textContent`/`el()`.
- `docs/presentation.html` har CSS och JS i egna filer, utan `'unsafe-inline'` och utan `style`-attribut.
- Arbetsytans agent `granskning` bestämmer; nya projekt läggs in i dess undantagstabell.
- Namn i loggen, rätter, egna produkter och sökord är användarinmatning: valideras (längd, styrtecken) och renderas bara med `textContent`.
- **Lagring:** bara `sn.data` och `sn.tab` i `localStorage`, cache `sn-<version>`. `sn.tab` valideras mot listan över flikar.
- **Kortordning (v0.6):** `layout.<today|week|trend|history> = { order, hidden }`, bara id:n `^[a-z]{1,20}$`, högst 20 per lista. `ui.js` `layoutOf()` filtrerar mot kända kort-id:n. Id:n renderas aldrig – bara de fasta namnen i `LAYOUT`.
- **Utemat (v0.8):** `q:`-ref bara för id:n i `QUICK_ADD` (store.js), annars hoppas posten över. Valideras som rätt-post (`q`, `n` totalt).
- **Backup-påminnelse (v0.7):** `backup = { remind: week|month|off, last?, asked? }` (datum valideras som datumnycklar). Ingen ny lagringsnyckel; dialogtexten sätts med `textContent`.
- **Krypterad backup-fil (U5 utökad 2026-11-11).** **Spara backup-fil** (även från påminnelsen) öppnar lösenordsdialogen `#pw-dialog` (i `index.html`, ingen inline-kod). **Kryptering är tvingande sedan 2026-11-11** (hälso- och ekonomidata): det finns inget val att spara okrypterat, och utan `crypto.subtle` sparas ingen fil (`nocrypto`, snackbar). Lösenordet skrivs två gånger (minst 8 tecken, stor och liten bokstav, siffra och specialtecken, högst 200). **Visa lösenord** (`#pw-show`, kryssruta, avbockad från start) växlar fälten mellan `password` och `text`; fälten har `autocapitalize="none"`, `autocorrect="off"`, `spellcheck="false"` så att mobiltangentbord inte lär sig lösenordet, och döljs igen vid varje stängning. Kryptografin påverkas inte. Kryptering i gemensamma `backup.js` med inbyggda `crypto.subtle`: AES-GCM 256, PBKDF2-SHA256 600 000 iterationer, nytt salt (16 byte) och IV (12 byte) per export, AAD `app|format|iter`, icke-extraherbar nyckel. Kuvert `{app,format:1,encrypted:true,kdf,iter,salt,iv,data}`, ingen klartext. Import (fil eller klistrad text): kuvertet känns igen → lösenord (bara längdkrav) → strikt kuvertkontroll (exakta nycklar, slug, format, kdf, iter 100 000–2 000 000, base64 med längdtak, salt/IV-längd) → dekryptering → samma `importText()`, sammanfattning, bekräftelse och ångra. Alla fel ger "Fel lösenord eller skadad fil." och ändrar inget. Lösenordet sparas och loggas aldrig; fälten töms vid varje stängning. `backup.last` sätts bara när en fil sparats, inte vid Avbryt. Den okrypterade textexporten (Visa som text) är borttagen; kvar finns bara inklistring (**Klistra in text**) för import. Okrypterade filer läses in som förut. Ingen ny lagringsnyckel, ingen CSP-ändring. Kontrolleras av `check.ps1` (S4c) och de gemensamma testerna i `tools/backup.test.js`.
- **Validering i `store.js`** per del. Ogiltiga poster hoppas över utan krasch.
  - id: `^[A-Za-z0-9_-]{1,40}$`
  - datumnycklar: `^\d{4}-\d{2}-\d{2}$` och giltigt datum
  - `ref`: `^[lburq]:[A-Za-z0-9_.-]{1,40}$`
  - `n`: exakt 4 ändliga tal. Varor: per 100 g, kcal 0–950 och gram 0–105 var för sig och tillsammans (marginal för Livsmedelsverkets Matolja 902 kcal; formuläret för egna produkter: 900 kcal, makron högst 100 g tillsammans). Rätt-poster (`r:`): totalt för andelen, kcal 0–20000 och gram 0–2000, tre decimaler så att upprepad redigering inte driver
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
  - export bara från validerat state, filnamn bara prefix + datum, filen alltid krypterad med användarens lösenord (sedan v0.11.0)
  - `backup.js` är en identisk kopia av `template/backup.js`
- `FOODS_SOURCE` har ingen webbadress (bara namn och datum). `data/foods.js` och `backup.js` ingår i service workerns `ASSETS`.
- **Import från Följ planen (v0.5):** samma kontroller som egen import (storlek, BOM, `app`/`format`, allt eller inget, bekräftelse, Ångra). Datan valideras först av follow-diet-trackers egen `validate()` (kopia i `habit-store.js`, utan lagringsfunktioner) och sedan av `validate()` här. Inga nya lagringsnycklar; `fp:v1` läses eller skrivs aldrig.
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
