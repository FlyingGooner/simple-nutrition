# Simple nutrition

Mobil-först PWA. Spec: `docs/SPEC.md` (läs bara berört avsnitt). Arbetsflöde, säkerhet och artifact: `../CLAUDE.md`. Standard: `../STANDARD.md`. Stil: `../STIL.md`.

## Projektets regler
- Helt lokalt: inga nätverksanrop, ingen extern data, inga nycklar (`connect-src 'none'`). Data bara i `localStorage`, nycklar `sn.*`; cache-prefix `sn-`.
- Inga beroenden, inget byggsteg; ES-moduler som i follow-diet-tracker (`app.js`, `ui.js`, `views/`; `build-single.ps1` paketerar dem); `data/foods.js` är ett vanligt skript. `CONFIG` överst i `app.js`. Rendering med `textContent`/`el()`, aldrig HTML. Aldrig blank skärm vid fel.
- UI på svenska. Kod och variabelnamn på engelska. Nyckelfärg `#2f7d5b` (som follow-diet-tracker).
- Ny fil som appen behöver → `ASSETS` i `sw.js`. Version bara i `version.js` (sätts av `release.ps1`). Relativa sökvägar.
- Har appen användardata: bygg kortet Data enligt `../STANDARD.md` punkt 5 (undantag U5) – kopiera mönstret från budget-buddy (`packData`/`unpackData`/`exportText`/`importText` i `store.js`, `backup.js`). **Radera all data** (`#reset`) flyttas då sist i kortet Data. Ritar appen om vid `visibilitychange`: hoppa över den omritningen efter tryck på filfältet (se `follow-diet-tracker/app.js`, `filePick`).
- Manualen: skriv bara i `docs/MANUAL.md`; Hjälp i `index.html` byggs från den med `tools/build-help.ps1`.
