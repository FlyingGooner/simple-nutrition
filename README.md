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
| ✨ **Funktion** | Beskrivning. |
| 📴 **Offline** | Fungerar utan nät efter första besöket. |
| 🌗 **Tema** | Ljust och mörkt, följer telefonens inställning. |

## Integritet 🔒

- **Inget konto, inga cookies.** Allt sparas bara i din webbläsare (`localStorage`).
- **Inget utifrån.** Ingen analys, inga annonser, inga typsnitt eller skript utifrån – spärras även tekniskt med en Content Security Policy.

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
