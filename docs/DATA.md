# Simple nutrition – dataformat

Varje backup-fil (`simple-nutrition-ÅÅÅÅ-MM-DD.txt`) är JSON:

```
{ "app": "simple-nutrition", "format": 1, "exported": "ÅÅÅÅ-MM-DD", "appVersion": "…",
  "readme": "…", "schema": { … }, "example": { … }, "data": { … } }
```

Importen läser bara `app`, `format` och `data`. `readme`, `schema` och `example` beskriver formatet så att filen kan ändras för hand (eller av en AI) och läsas in igen. `example` är ett litet giltigt dataset som går att lägga i `data`. Ogiltiga poster hoppas över, inget kraschar.

Källan för beskrivningen är `EXPORT_SCHEMA` och `EXPORT_EXAMPLE` i `store.js`. Reglerna följer `validate()` där. Datum skrivs `ÅÅÅÅ-MM-DD`, näringsvärden `n = [kcal, protein g, kolhydrater g, fett g]`, id:n `A–Z a–z 0–9 _ -` (högst 40 tecken).

| Nyckel | Innehåll |
|---|---|
| `goals` | lista `{ from, kcal?, prot?, kolh? }`, mål utan `kcal` = inget kalorimål |
| `meals` | 1–10 `{ id, name }` |
| `log` | datum → poster. Vara `{ id, m, ref: l:/b:/u:/p: (p: = schablon), name, g, n per 100 g, u? }`, rätt `{ …, ref: r:, q, n totalt }`, snabbval `{ …, ref: q:bf-*/home-*/out-*/snack-* (se `QUICK_ADD`), q, n totalt }, egen uppskattning `{ …, ref: q:est-bf/est-home/est-out, name ≤ 60, q: 1, n totalt: kcal 1–5000, makron 0–500 g }``; `m` kan vara `extra-<n>` (kcal för extra fusk) |
| `dishes` | `{ id, name, portions, items: [{ ref, name, g, n }], cooked? }` |
| `foods` | egna produkter `{ id, name, n, u? }` |
| `aliases` | sökord → ref |
| `weights` | datum → kg (20–400) |
| `habits` | datum → { måltids-id \| `extra-n`: { outcome: followed/cheat/skipped, reason?, note? } } |
| `workouts` | datum → [{ types, km?, sec? }] |
| `settings` | orsaker, gräns för lyckad dag, plan, passtyper och mål |
| `layout` | kortordning per vy `{ order, hidden }` |
| `backup` | `{ remind: week/month/off, last?, asked? }` |
