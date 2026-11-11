# Simple nutrition – så använder du appen

Samma text finns i appen under **Inställningar → Allmänt → Hjälp och manual**. Hjälp byggs från den här filen med `tools/build-help.ps1` – ändra bara här.

## Kom igång
- Vanorna är huvudsaken: tryck ✅ Enligt plan, 🍰 Fusk eller ⏭️ Hoppade över på varje måltid i Idag. Kalorierna är ett stöd när du vill räkna på dina basmåltider.
- Under **Inställningar → Vanor** skriver du din plan (visas överst i Idag), sätter gränsen för en lyckad dag och ändrar måltider och orsaker.
- Flyttar du från Följ planen: se **Flytta från Följ planen** nedan.

## Vanor
- Tryck på utfallet för måltiden. Tryck igen på samma för att ta bort det.
- Vid 🍰 Fusk: välj en orsak (t.ex. Utemat eller Sug) och skriv gärna en kort anteckning. Vid Snacks eller Utemat kan du välja hur mycket (t.ex. Lite ≈ 250, en Magnum) – då loggas kcal i måltiden. Tryck igen för att ta bort.
- Ifyllda måltider visas hopfällda som en rad (val, rätt och kcal) – tryck på raden för att ändra. 🍰 Fusk utan orsak hålls öppen tills orsaken är vald.
- **+ Extra fusk** loggar fusk mellan måltiderna. Välj orsak och, om du vill, hur mycket: Snacks (Lite ≈ 250 · Mellan ≈ 500 · Mycket ≈ 950), Utemat eller annars Hemmagjort.
- Följsamhet = följda måltider delat med följda + fusk. Hoppade över räknas inte. En dag är lyckad när den når din gräns (80 % från start). 🔥 visar lyckade dagar i rad.

## Träning
- Tryck **+ Träningspass** och välj typ. Push, Pull och Ben kan kombineras – Push + Pull räknas som ett pass. Löpning och Intervaller loggas med sträcka (km) och tid (t.ex. 28:30).
- Ett sparat pass visas som en rad. Tryck på den för att ta bort passet.
- Under **Inställningar → Träning** ändrar du passtyperna och sätter mål per vecka. Målen syns på knappen i Idag och i Vecka.

## Mat och kalorier
- Under varje måltid finns en hopfälld rad **🍽 Mat**. Fäll ut den och tryck **+ Lägg till mat**. När mat är loggad visar raden **✅ Mat** och dagens kcal för måltiden.
- Under **Varor** söker du, t.ex. mjölk. Välj variant (Lätt, Mellan …) och mängd i gram eller i mått som dl eller st. Mått är ungefärliga (≈). Visa fler söker i hela Livsmedelsverkets lista.
- Har du ätit varan eller rätten förut är mängden redan ifylld med det du valde senast (står under Senast) – oftast räcker det att trycka Lägg till.
- **Snabbval:** när du inte vet exakt. Hemmagjort: Lätt ≈ 450, Standard ≈ 650, Tung ≈ 850 kcal. Utemat: Lätt ≈ 700, Standard ≈ 1 000, Tung ≈ 1 400 kcal. Ett tryck loggar. Tar du Lätt när du äter ute kan måltiden ändå vara ✅ enligt plan – du väljer själv.
- **burk avr.** betyder avrunnen vikt: en burk kidneybönor är 400 g med spad men ca 230 g bönor – det är bönorna som räknas.
- Under **Senaste** loggar du något du ätit förut med ett tryck. **Kopiera maten från igår** fyller en tom dag med gårdagens mat.
- Tryck på en post för att ändra mängd, flytta den till en annan måltid eller ta bort den.
- Det finns inget kalorimål från start – appen visar bara dagens summa. Vill du ha ett mål sätter du det under **Inställningar → Kalorier → Kalorimål** (tomt = inget mål), och likaså valfria mål för protein och kolhydrater.

## Rätter
- Bygg dina egna rätter under **Inställningar → Kalorier → Mina rätter → + Ny rätt**. Lägg till ingredienserna i gram (råvikt).
- Välj **Per portion** om receptet gäller en portion, eller **Hel sats** och antal portioner, t.ex. köttfärssås på 500 g nötfärs delat på 5.
- Väg gärna hela den färdiga rätten och fyll i **färdig vikt** – då kan du logga i gram, det blir exaktast.
- Logga under **Lägg till mat → Rätter**: portioner (½, 1, 2 …), andel av satsen (t.ex. 1/5) eller gram av färdig rätt.
- **Spara en måltid som rätt:** fäll ut 🍽 Mat och tryck **+🍲 Spara som rätt**, t.ex. frukost med 100 g yoghurt och 100 g granola. Ge rätten ett namn och spara.
- Ändrar du en rätt senare påverkas inte dagar som redan är loggade.

## Egna produkter och sökord
- Saknas en vara: lägg in den under **Egna produkter** med kcal, protein, kolhydrater och fett per 100 g från förpackningen, och gärna ett mått (t.ex. 1 st = 40 g).
- Hittar sökningen inte det du menar: välj varan och tryck **Spara eget sökord**. Ordet visar sedan varan först.

## Byta dag
- Använd ◀ ▶ eller svep åt vänster/höger. Tryck på datumet, ↩ Till idag eller fliken Idag för att gå tillbaka till idag.
- 🗑 Rensa dagen tar bort dagens vanor, mat, pass och vikt. Ångra finns några sekunder efteråt.

## Vikt
- Fyll i vikten under **Vikt idag**, gärna på morgonen. Trenden räknas på 7-dagars medel, så enskilda dagar spelar liten roll.

## Vecka, Trend och Historik
- **Vecka:** vikten (senaste vägningen mot första vägningen veckan innan, med minikurva), följsamhet, fusk och vanligaste orsak, dag för dag (vanor, pass, kcal, vikt – tryck för att öppna dagen), träning mot målen och kalorisnitt. Staplar per dag visas bara när ett kalorimål är satt.
- **Trend:** vikten (7-dagars medel), förändringen senaste 4 veckorna och viktkurvan i samma kort, en tabell vecka för vecka (vikt, följsamhet, fusk, pass, kcal – tryck för att öppna veckan) och vad som hänger ihop: bra mot sämre veckor, träning och kalorier (efter 4 veckor).
- **Historik:** vikten i månaden mot senaste vägningen månaden innan (med minikurva) och följsamhet 7 och 30 dagar och streaks i samma kort, sedan månadskalendern färgad efter följsamhet med markering för vägning och träning, och sist pass totalt och kcal-snitt.
- Vecka jämför enskilda vägningar, Trend 7-dagars medel.

## Kortordning
- Under **Inställningar → Utseende → Kortordning** väljer du ordningen på korten i Idag, Vecka, Trend och Historik. ↑ ↓ flyttar, ● visas, ○ döljer. **Återställ** ger standardordningen tillbaka, för en vy eller för alla vyer längst ner.

## Flytta från Följ planen
- Öppna Följ planen → Inställningar → Data → **Spara backup-fil**.
- Öppna Simple nutrition → Inställningar → Allmänt → Data → **Läs in backup-fil** och välj filen (eller klistra in texten under Visa som text).
- Kontrollera sammanfattningen och tryck **Lägg till**. Vanor, orsaker, anteckningar, vägningar, träningspass, plan och mål följer med. Måltider med samma namn slås ihop. Inget du redan har i Simple nutrition tas bort – Ångra finns direkt efteråt.

## Backup och flytt
- Under **Data**: tryck **Spara backup-fil**. Filen heter t.ex. simple-nutrition-2026-11-09.txt och hamnar bland hämtade filer.
- Appen påminner om backup varje månad (eller vecka). Ändra under **Data → Påminn om backup**.
- För att läsa tillbaka: tryck **Läs in backup-fil**, kontrollera sammanfattningen och tryck **Ersätt**. All nuvarande data ersätts – Ångra finns direkt efteråt.
- Går det inte att spara eller välja filen: öppna **Visa som text** och kopiera eller klistra in.
- Filen innehåller all din data och är okrypterad. Dela den bara med den du litar på.
- Filen beskriver sitt eget format och har ett exempel, så den går att ändra för hand och läsa in igen.

## Installera och offline
- **Android (Chrome):** menyn ⋮ → Installera app. **iPhone (Safari):** Dela → Lägg till på hemskärmen. Installerad fungerar appen helt utan nät.

## Integritet och källa
- Appen gör inga anrop – ingen server, ingen analys, inget konto. All data finns bara i den här webbläsaren.
- Näringsvärdena kommer från Livsmedelsverkets livsmedelsdatabas och finns inbyggda i appen.
