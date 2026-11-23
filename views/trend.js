// View: Trend – weight (7-day average), the last 4 weeks as a table, weight chart 12 weeks, kcal vs weight.
import { avg7Of, weightPlan, weightForecast, weightTrend, energyEstimate, periodEnergy, currentWeight, addDays, KCAL_PER_KG, parseKey, weekStart, isoWeek, weekStats, habitWeek, habitStreak, habitRange, habitLongest } from '../store.js';
import { today, S, el, svg, kcal, fmtNum, shortDate, pct, goals, weekSessions, arrange, wOut, wUnit, stat } from '../ui.js';

// 7-day average of the weights in [k-6, k], or null.
export const avg7 = (k) => avg7Of(S.state.weights, k);
const r1 = (x) => Math.round(x * 10) / 10;
const signed = (n) => ((n = r1(n)) > 0 ? '+' : n < 0 ? '−' : '±') + fmtNum(Math.abs(n));   // avrunda först: aldrig "−0" (2026-11-23)
const delta = (n) => el('span', { class: 'delta' + (n < 0 ? ' down' : ''), text: `${signed(wOut(n))} ${wUnit()} ${n < 0 ? '▼' : n > 0 ? '▲' : ''}`.trim() });

// Viktförändring som kcal/dag (2026-11-21): dKg mellan två datum, 1 kg ≈ 7 700 kcal. Delas av Vecka, Historik och Trend.
export function kcalDayLine(dKg, fromK, toK) {
  const days = Math.round((parseKey(toK).getTime() - parseKey(fromK).getTime()) / 864e5);
  const n = days > 0 && dKg ? Math.round(Math.abs(dKg) * KCAL_PER_KG / days / 10) * 10 : 0;
  return n ? el('p', { class: 'w-sub' + (dKg < 0 ? ' kd-down' : ''), text: `≈ ${n.toLocaleString('sv-SE')} kcal/dag ${dKg < 0 ? 'underskott' : 'överskott'} · ${days} dagar` }) : null;
}

// Flyttad från Månad (2026-11-21): följsamhet och streaks som en kompakt rad i samma kort som vikten.
export function habitRow() {
  const s = (n, l) => el('div', { class: 'ov-s' }, el('strong', { text: n }), el('span', { text: l }));
  return el('div', { class: 'ov-stats' },
    s(pct(habitRange(S.state, today(), 7)), '7 dagar'),
    s(pct(habitRange(S.state, today(), 30)), '30 dagar'),
    s(`🔥 ${habitStreak(S.state, today())}`, 'i rad'),
    s(String(habitLongest(S.state)), 'längsta'));
}
function summary(t) {
  const keys = Object.keys(S.state.weights).sort();
  if (!keys.length) return el('section', { class: 'card w-sum' }, el('p', { class: 'muted', text: 'Ingen vägning ännu. Fyll i vikt under Idag – trenden räknas på 7-dagars medel.' }));
  const lastK = keys[keys.length - 1], now = avg7(lastK);
  let backK = addDays(lastK, -28), back = avg7(backK);
  if (back == null) { const first = keys.find((k) => k >= addDays(lastK, -28)); backK = first; back = first && first < lastK ? avg7(first) : null; }
  // Kompakt (v0.5.14): siffror på en rad + kurvan i samma kort.
  return el('section', { class: 'card w-card' },
    el('div', { class: 'w-row' },
      el('span', { class: 'w-label', text: 'Vikt' }),
      el('span', { class: 'w-now', text: `${fmtNum(r1(wOut(now)))} ${wUnit()}` }),
      back != null ? el('span', { class: 'w-chg' }, delta(now - back), el('small', { text: ' 4 v' })) : null),
    back != null ? kcalDayLine(now - back, backK, lastK) : null,
    chart(),
    goalLine(now, null),
    aheadTiles(),
    habitRow());   // städning 2026-11-21: "Totalt sedan" bort – kurvan visar hela tiden
}

// Viktmål (2026-11-21): mål, takt som behövs och takten de senaste 4 veckorna.
export function goalLine(cur, actual) {
  const p = weightPlan(S.state.wgoal, cur, today());
  if (!p) return null;
  const kg = (v) => `${fmtNum(r1(wOut(v)))} ${wUnit()}`, rate = (v) => `${signed(wOut(v))} ${wUnit()}/v`;
  const part = (label, value, cls) => el('span', { class: 'wg-part' + (cls ? ' ' + cls : '') }, el('span', { text: label }), ' ', el('strong', { text: value }));
  if (p.open) return [el('p', { class: 'w-sub wg' }, part('Mål', rate(p.rate)), actual != null ? [' · ', part('senaste 4 v', rate(actual))] : null), forecastLine()];
  if (p.auto) return forecastLine();   // målvikt utan datum: prognosraden säger redan målet
  if (p.reached) return el('p', { class: 'w-sub wg' }, part('Mål', kg(p.target)), ' · ', el('span', { class: 'goal-ok', text: 'Nått 🎉' }));
  return [el('p', { class: 'w-sub wg' },
    part('Mål', kg(p.target)),
    p.auto ? null : [' · ', p.tooFast ? part('Hinns inte med högst 1 %/v, tidigast', shortDate(p.earliest)) : part(S.state.wgoal.date ? 'senast' : 'klart ≈', shortDate(p.eta)), ' · ',
    part('takt', rate(p.rate))],
    actual != null ? [' · ', part('senaste 4 v', rate(actual))] : null), forecastLine()];
}
// "Är jag i fas?" (2026-11-21) – prognos från den faktiska trenden.
export function forecastLine() {
  const f = weightForecast(S.state, today());
  if (!f) return null;
  if (!f.ready) return el('p', { class: 'w-sub fc', text: 'Prognos när du vägt dig minst 4 gånger under 10 dagar.' });
  const wk = (d) => Math.max(1, Math.round(Math.abs(d) / 7));
  // Mål och utfall i kg per vecka (2026-11-21), två decimaler så att små skillnader syns.
  const kgw = (v) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmtNum(Math.abs(wOut(v)), 2)} ${wUnit()}/v`;
  const p = weightPlan(S.state.wgoal, currentWeight(S.state), today());
  const outcome = [' · ', el('span', { text: 'utfall' }), ' ', el('strong', { text: kgw(f.week) })];
  const goalRate = p && !p.reached && !p.auto ? [' · ', el('span', { text: 'mål' }), ' ', el('strong', { text: kgw(p.rate) })] : null;
  // Målvikt utan datum (2026-11-21): tydligt när målet nås, med år.
  if (f.status === 'none') return el('p', { class: 'w-sub fc fc-big' },   // en rad (städning 2026-11-21)
    el('span', { text: '🎯' }), ' ', el('strong', { text: `${fmtNum(r1(wOut(S.state.wgoal.target)))} ${wUnit()}` }), ' ≈ ',
    el('strong', { class: 'fc-ok', text: parseKey(f.date).toLocaleDateString(globalThis.I18N?.lang() === 'en' ? 'en-GB' : 'sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }) }),
    outcome);
  if (f.status === 'wrong' && S.state.wgoal && !S.state.wgoal.date && S.state.wgoal.rate == null && S.state.wgoal.pct == null) return el('p', { class: 'w-sub fc' }, el('strong', { class: 'fc-dev', text: '⚠️ Trenden går åt fel håll' }));
  const [cls, label] = { on: ['ok', '✅ I fas'], ahead: ['ok', '🚀 Före'], behind: ['dev', '⚠️ Efter'], wrong: ['dev', '⚠️ Trenden går åt fel håll'] }[f.status];
  return el('p', { class: 'w-sub fc' },
    el('strong', { class: 'fc-' + cls, text: label + (f.gap != null && f.status !== 'on' ? ` ≈ ${wk(f.gap)} v` : '') }),
    f.date ? [' · ', el('span', { text: 'prognos' }), ' ', el('strong', { text: shortDate(f.date) })] : null,
    f.planned ? [' · ', el('span', { text: 'plan' }), ' ', el('strong', { text: shortDate(f.planned) })] : null,
    goalRate, outcome);
}

/* Förbrukning (2026-11-21): räknas från dag ett, med kvalitet som datan själv avgör. */
const r50 = (x) => Math.round(x / 50) * 50;
export const signedK = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + kcal(Math.abs(n));
const WHY = {
  precision: 'Säkrare med fler dagar – väg dig minst 3 gånger i veckan. Full kvalitet efter 2–4 veckor.',
  logging: 'Ofullständiga dagar drar ner – ge varje måltid mat eller markera ⏭️ Hoppade över.',
  low: 'Förbrukningen ser för låg ut – en del mat verkar inte vara loggad.',
  high: 'Förbrukningen ser för hög ut – troligen vätska som försvinner. Det jämnar ut sig.',
  stable: 'Veckorna skiljer sig mycket – logga lika noga varje dag.',
};
export function energyCard() {
  const e = energyEstimate(S.state, today()), h2 = el('h2', { text: 'Total förbrukning' });
  const how = el('details', { class: 'en-how' }, el('summary', { text: 'Så räknas det' }),
    el('p', { class: 'muted small', text: 'Förbrukningen räknas från vad du loggat och hur vikten ändrats de senaste 4 veckorna (1 kg ≈ 7 700 kcal). Vikten svänger av vätska, så den säkras med tiden. Kvaliteten avgörs av datan: hur mycket vikten brusar, hur många dagar du loggat, om resultatet är rimligt och om veckorna stämmer med varandra. Bara kompletta dagar räknas: varje måltid har mat eller är markerad ⏭️ Hoppade över, och minst 800 kcal. Använd snabbvalen när du inte vet exakt. Logga så och väg dig minst 3 gånger i veckan – då når kvaliteten 100 % efter 2–4 veckor. Glömmer du alltid samma saker blir siffran förbrukning enligt din loggning, och den fungerar lika bra för att nå målet.' }));
  if (!e || !e.ready) return el('section', { class: 'card' }, h2,
    el('p', { class: 'muted', text: 'Logga mat och väg dig några dagar, så räknas din förbrukning ut.' }), how);
  const q = Math.round(e.quality * 100), rough = q < 25, lo = r50(Math.max(800, e.tdee - 1.5 * e.se)), hi = r50(e.tdee + 1.5 * e.se);
  const why = q >= 95 ? null : WHY[e.weakest === 'plausible' ? (e.low ? 'low' : 'high') : e.weakest];
  const plan = weightPlan(S.state.wgoal, currentWeight(S.state), today());
  const forGoal = plan && !plan.reached && !rough ? r50(e.tdee + plan.kcalDay) : null;
  // Låg kvalitet (2026-11-21): en kompakt rad i stället för hela kortet; förklaringen under Så räknas det.
  if (q < 50) return el('section', { class: 'card' }, h2,
    el('p', { class: 'en-compact' }, el('strong', { text: rough ? `${kcal(lo)}–${kcal(hi)}` : `≈ ${kcal(r50(e.tdee))}` }), ` kcal/dag · kvalitet ${q} %`),
    why ? el('details', { class: 'en-how' }, el('summary', { text: 'Så räknas det' }), el('p', { class: 'small', text: why }), how.lastChild) : how);
  return el('section', { class: 'card en-card' }, h2,
    el('div', { class: 'en-top' },
      el('p', { class: 'en-val' + (rough ? ' rough' : '') }, el('strong', { text: rough ? `${kcal(lo)}–${kcal(hi)}` : `≈ ${kcal(r50(e.tdee))}` }), ' kcal/dag'),
      forGoal ? el('p', { class: 'en-goal' }, el('strong', { text: `≈ ${kcal(forGoal)}` }), el('span', { text: 'för viktmålet' })) : null),
    el('div', { class: 'en-q' }, el('span', { text: 'Kvalitet' }),
      svg('svg', { class: 'en-bar', viewBox: '0 0 100 8', preserveAspectRatio: 'none', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': q, 'aria-label': 'Kvalitet' },
        svg('rect', { class: 'en-bg', x: 0, y: 0, width: 100, height: 8, rx: 4 }), svg('rect', { class: 'en-fill' + (q >= 75 ? ' ok' : ''), x: 0, y: 0, width: Math.max(q, 2), height: 8, rx: 4 })),
      el('strong', { text: `${q} %` })),
    how);
}
// Kalorisumma för en period (vecka/månad): mot målet, enligt vikten och mot förbrukningen.
export function energyStats(from, to) {
  const pe = periodEnergy(S.state, from, to > today() ? today() : to, today());
  if (!pe.logged) return pe.partial ? el('p', { class: 'muted small', text: 'Inga kompletta dagar – varje måltid behöver mat eller ⏭️, och minst 800 kcal.' }) : null;
  const e = energyEstimate(S.state, today()), useE = e && e.ready && e.quality >= 0.25;
  const row = (label, v) => el('li', {}, el('span', { text: label }), el('strong', { class: v < 0 ? 'neg' : '', text: `${signedK(v)} kcal` }));
  const items = [
    pe.vsGoal != null ? row('Mot kalorimålet', pe.vsGoal) : null,
    useE ? row('Mot förbrukningen', Math.round(pe.kcal - e.tdee * pe.logged)) : null,
  ].filter(Boolean);
  return items.length ? el('ul', { class: 'en-rows' }, items) : null;   // städning 2026-11-21: ingen förklaringsrad
}

// Prognos om 1, 3 och 6 månader (2026-11-21) från utfallet de senaste 4 veckorna.
function aheadTiles() {
  const t = weightTrend(S.state, today());
  if (!t.ready) return null;
  // En rad (städning 2026-11-21): "Om trenden håller: 1 mån 109,9 · 3 mån 105,7 · 6 mån 99,4"
  return el('p', { class: 'w-sub ahead' }, el('span', { text: 'Om trenden håller:' }),
    t.ahead.map(([m, v], i) => [i ? ' ·' : '', ' ', el('span', { text: `${m} mån` }), ' ', el('strong', { text: `${t.target != null && Math.abs(v - t.target) < 0.05 ? '🎯 ' : ''}${fmtNum(r1(wOut(v)))}` })]));
}


// Vecka för vecka (2026-11-21): under Månad, med månadens veckor (wsList = veckostarter, äldst först).
// Motsvarande dag (2026-11-23), i stället för snitt: senaste vägningen i perioden mot vägningen samma dag perioden innan
// (target), eller den närmaste vägningen i perioden innan [from, to]. null utan vägningar i båda.
export function sameDay(lastK, target, from, to) {
  const W = S.state.weights;
  if (!lastK || W[lastK] == null) return null;
  const ks = Object.keys(W).filter((k) => k >= from && k <= to);
  if (!ks.length) return null;
  const dist = (k) => Math.abs(+parseKey(k) - +parseKey(target));
  const bk = ks.reduce((x, k) => (dist(k) < dist(x) || (dist(k) === dist(x) && k < x) ? k : x));
  return { a: W[lastK], b: W[bk], bk, d: Math.round((W[lastK] - W[bk]) * 10) / 10, days: Math.round((+parseKey(lastK) - +parseKey(bk)) / 864e5) };
}
// Vecka: senaste vägningen i veckan mot samma veckodag veckan innan.
export function weekDelta(ws) {
  const t = today(), end = addDays(ws, 6) > t ? t : addDays(ws, 6);
  const ks = Object.keys(S.state.weights).filter((k) => k >= ws && k <= end).sort(), lastK = ks[ks.length - 1];
  return lastK ? sameDay(lastK, addDays(lastK, -7), addDays(ws, -7), addDays(ws, -1)) : null;
}
// Vikt per vecka (2026-11-23): senaste vägningen i veckan, ± mot samma veckodag veckan innan (weekDelta).
const lastIn = (ws) => { const end = addDays(ws, 6) > today() ? today() : addDays(ws, 6);
  const ks = Object.keys(S.state.weights).filter((k) => k >= ws && k <= end).sort(); return ks.length ? S.state.weights[ks[ks.length - 1]] : null; };
export function weekTable(wsList) {
  const rows = wsList.map((ws) => {
    const st = weekStats(S.state, ws);
    return { ws, st, h: habitWeek(S.state, ws), w: lastIn(ws), wd: weekDelta(ws), cur: ws === weekStart(today()) };
  });
  // Senaste veckan överst (2026-11-23).
  const list = rows.filter((r) => r.st.logged || r.h.count || r.w != null || weekSessions(r.ws).all).reverse();
  const kd = (ws) => { const pe = periodEnergy(S.state, ws, addDays(ws, 6), today()); return pe.logged ? pe.kcal / pe.logged : null; };
  if (!list.length) return el('section', { class: 'card' }, el('h2', { text: 'Vecka för vecka' }), el('p', { class: 'muted small', text: 'Inget loggat de här veckorna.' }));
  return el('section', { class: 'card' }, el('h2', { text: 'Vecka för vecka' }),
    el('table', { class: 'wk-table' },
      el('thead', {}, el('tr', {}, [self.I18N?.lang() === 'en' ? 'wk' : 'v', 'Vikt', '±', '✅', '🍰', '🏋️', 'kcal/d'].map((h) => el('th', { scope: 'col', text: h })))),
      el('tbody', {}, list.map((r) => {
        return el('tr', { 'data-act': 'openweek', 'data-val': r.ws, tabindex: '0', role: 'link', 'aria-label': 'Öppna veckan' },
          el('td', {}, el('button', { class: 'link wk-open', 'data-act': 'openweek', 'data-val': r.ws, text: String(isoWeek(r.ws)) }), r.cur ? ' •' : null),
          el('td', { text: r.w != null ? wOut(r.w).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–' }),
          el('td', {}, r.wd ? el('span', { class: 'delta' + (r1(wOut(r.wd.d)) < 0 ? ' down' : r1(wOut(r.wd.d)) > 0 ? ' up' : ''), text: signed(wOut(r.wd.d)) }) : '–'),
          el('td', { class: r.h.ratio == null ? '' : r.h.ratio >= S.state.settings.successThreshold ? 'good-t' : r.h.ratio >= 0.5 ? 'mid-t' : 'low-t', text: pct(r.h.ratio) }),
          el('td', { text: r.h.count || r.h.extraCheat ? String(r.h.cheat + r.h.extraCheat) : '–' }),
          el('td', { text: (() => { const g = goals(r.ws).find((x) => x.key === 'workoutGoal'); const n = weekSessions(r.ws).all; return g ? `${n}/${g.goal}` : n ? String(n) : '–'; })() }),
          // kcal/d mot veckan innan (2026-11-23), som Dag för dag: liten siffra, mer = rött.
          (() => { const a = kd(r.ws), b = kd(addDays(r.ws, -7)), d = a != null && b != null ? Math.round(a) - Math.round(b) : null;
            return el('td', {}, a != null ? kcal(a) : '–', d == null ? null : el('div', { class: 'dt-vs delta' + (d < 0 ? ' down' : d > 0 ? ' up' : ''), text: (d > 0 ? '+' : d < 0 ? '−' : '±') + kcal(Math.abs(d)) })); })());   // kompletta dagar
      }))));
}

// Vikt över hela tiden (beslut 2026-11-10): från första vägningen till idag, minst 4 veckor. Skalar med tiden:
// 7-dagars medel som linje (glesas ut till högst ~180 punkter), vägningar som ringar bara när de får plats (≤ 180 dagar).
function chart() {
  const keys = Object.keys(S.state.weights).sort();
  if (keys.length < 2) return null;
  const end = today(), first = keys[0] < addDays(end, -27) ? keys[0] : addDays(end, -27);
  const days = [];
  for (let k = first; k <= end; k = addDays(k, 1)) days.push(k);
  const n = days.length, step = Math.max(1, Math.ceil(n / 180));
  const line = [], dots = [];
  days.forEach((k, i) => {
    if (i % step === 0 || i === n - 1) { const a = avg7(k); if (a != null) line.push([i, a]); }
    if (n <= 180 && S.state.weights[k] != null) dots.push([i, S.state.weights[k]]);
  });
  const vals = [...line.map((p) => p[1]), ...dots.map((p) => p[1])];
  const lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
  const W = 320, H = 150, pad = 26, bottom = 16;
  const x = (i) => pad + i * (W - pad - 6) / (n - 1), y = (v) => 16 + (hi - v) * (H - 16 - bottom) / (hi - lo);
  const r = (v) => Math.round(v * 10) / 10;
  const d = line.map((p, j) => `${j ? 'L' : 'M'}${r(x(p[0]))},${r(y(p[1]))}`).join(' ');
  const long = n > 365;
  const label = (k) => (long ? parseKey(k).toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' }) : shortDate(k));
  const ticks = [0, Math.round((n - 1) / 2), n - 1];
  const span = n < 70 ? `${Math.round(n / 7)} veckor` : n < 730 ? `${Math.round(n / 30.4)} månader` : `${fmtNum(r(n / 365))} år`;
  return [svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Viktkurva ${span}, 7-dagars medel` },
      [lo, (lo + hi) / 2, hi].map((v) => [svg('line', { class: 'grid', x1: pad, x2: W, y1: y(v), y2: y(v) }), svg('text', { class: 'ax', x: 0, y: y(v) + 3 }, fmtNum(r1(v)))]),
      ticks.map((i, j) => svg('text', { class: 'ax', x: x(i), y: H - 3, 'text-anchor': j === 0 ? 'start' : j === 2 ? 'end' : 'middle' }, label(days[i]))),
      dots.map((p) => svg('circle', { class: 'w-dot-extra', cx: r(x(p[0])), cy: r(y(p[1])), r: 2 })),
      svg('path', { class: 'w-line', d }),
      // Förklaringen i diagrammet (2026-11-21) i stället för en egen rad.
      svg('text', { class: 'ax', x: W, y: 8, 'text-anchor': 'end' }, `7-dagars medel · ${span}`))];
}

export function viewTrend() {
  return arrange('trend', { weight: () => summary(), energy: energyCard });   // fliken Historik och mål
}
