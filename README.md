<div align="center">

<img src="icons/icon-192.png" width="88" alt="Simple nutrition-ikon">

# Simple nutrition

**Kalorier och makron från rena råvaror – utan konto, utan märkesdjungel.**

### [▶ Öppna appen](https://flyinggooner.github.io/simple-nutrition/)

[📱 Presentation av appen](https://flyinggooner.github.io/simple-nutrition/docs/presentation.html)

</div>

<!-- Skärmbilder: lägg i docs/ och visa här -->

## Varför?

Kalorappar drunknar i dubbletter och märkesposter. Här finns bara Livsmedelsverkets råvaror, några få tydliga val och dina egna recept.

## Funktioner

| | |
|---|---|
| 🔁 **Vanor** | Bocka av dina vanor varje dag och se hur ofta du lyckas. |
| 🏋️ **Träning** | Logga gympass och kondition mot ett veckomål. |
| 🥕 **Mat och kalorier** | Livsmedelsverkets råvaror med kcal, protein, kolhydrater och fett – i gram eller mått. |
| 🍲 **Rätter** | Bygg egna recept och matlådor av råvarorna. |
| 🏷️ **Egna produkter** | Lägg till egna varor och sökord. |
| ⚖️ **Vikt** | Vikttrend med 7-dagars medel. |
| 📊 **Vecka, Trend, Historik** | Hur veckan och perioden går mot målet. |
| 💾 **Backup** | Lösenordskrypterad backup-fil med påminnelse; flytt från Följ planen. |
| ❓ **Hjälp** | Manual direkt i appen. || 📴 **Offline** | Fungerar utan nät efter första besöket. |
| 🌗 **Tema** | Ljust och mörkt, följer telefonens inställning. |

## Integritet och säkerhet 🔒

- **Inget konto, inga cookies.** Allt sparas bara i din webbläsare (`localStorage`).
- **Inget utifrån.** Ingen analys, inga annonser, inga typsnitt eller skript utifrån – spärras även tekniskt med en Content Security Policy.
- **Krypterad backup.** Backup-filen krypteras alltid med ett lösenord du väljer: AES-GCM 256 bitar, och nyckeln tas fram med PBKDF2-SHA256 och 600 000 iterationer – den nivå OWASP rekommenderar och samma som förvalet i lösenordshanteraren Bitwarden. Nytt salt och ny IV varje gång, och en fil som ändrats går inte att läsa in. Bara webbläsarens inbyggda krypto används, inga bibliotek utifrån.

### Jämfört med vanliga kaloriappar

| | Den här appen | Vanliga kaloriappar |
|---|---|---|
| Konto | Inget | Krävs, ofta med e-post |
| Var datan finns | Bara i din telefon | På företagets servrar |
| Analys, annonser, spårare | Inga – spärrat tekniskt | Vanligt |
| Backup | Krypterad fil som bara ditt lösenord öppnar | I företagets moln |
| Om tjänsten läggs ner | Appen och datan finns kvar | Datan kan försvinna |

> **Ärligt om gränserna:** datan i telefonen skyddas av telefonens eget lås, inte av en egen kryptering – lås telefonen. Ett glömt lösenord går inte att återställa, och ett svagt lösenord kan gissas, så välj ett långt. Rensar du webbplatsdata försvinner allt, så spara en backup-fil då och då (Inställningar → Data).
## Installera på mobilen

**Android (Chrome)**
1. Öppna [appen](https://flyinggooner.github.io/simple-nutrition/) i Chrome.
2. Tryck på menyn **⋮** → **Installera app** (eller *Lägg till på startskärmen*).

**iPhone (Safari)**
1. Öppna [appen](https://flyinggooner.github.io/simple-nutrition/) i Safari.
2. Tryck på **Dela** → **Lägg till på hemskärmen**.

Versionsnumret syns uppe till höger i appen. Nya versioner hämtas automatiskt.

## För utvecklare

Ren HTML, CSS och JavaScript – inga ramverk, inga beroenden, inget byggsteg för appen.

**Köra lokalt:** servera mappen statiskt, t.ex. `python3 -m http.server 8080`, och öppna http://localhost:8080 (service workern kräver `localhost` eller HTTPS).

**Testfil:** `tools\build-single.ps1` bakar ihop appen till en enda fil, `dist/simple-nutrition.html`, som går att öppna direkt i webbläsaren eller skicka till någon.

| Fil | Innehåll |
|---|---|
| `index.html` | Appens markup |
| `styles.css`, `app.js` | Stil och logik |
| `store.js` | Lagring i `localStorage` och validering av sparad data |
| `version.js` | Versionsnummer (enda källan) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation som app (PWA) och offline |
| `docs/SPEC.md` | Specifikation av funktioner och beteende |
| `docs/DATA.md` | Dataformatet i backup-filen (samma som readme/schema/example i filen) |
| `docs/presentation.html` | Fristående mobilpresentation av appen |
| `tools/build-single.ps1` | Bygger testfilen |
| `CLAUDE.md` | Regler för utveckling |

Publiceras till GitHub Pages från `main`.
