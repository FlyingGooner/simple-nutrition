// View: Trend – weight (7-day average), the last 4 weeks as a table, weight chart 12 weeks, kcal vs weight.
import { avg7Of, weightPlan, energyEstimate, periodEnergy, currentWeight, addDays, parseKey, weekStart, isoWeek, weekStats, habitWeek } from '../store.js';
import { today, S, el, svg, kcal, fmtNum, shortDate, pct, goals, weekSessions, arrange, wOut, wUnit, stat } from '../ui.js';

// 7-day average of the weights in [k-6, k], or null.
export const avg7 = (k) => avg7Of(S.state.weights, k);
const r1 = (x) => Math.round(x * 10) / 10;
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmtNum(Math.abs(r1(n)));
const delta = (n) => el('span', { class: 'delta' + (n < 0 ? ' down' : ''), text: `${signed(wOut(n))} ${wUnit()} ${n < 0 ? '▼' : n > 0 ? '▲' : ''}`.trim() });

function summary(t) {
  const keys = Object.keys(S.state.weights).sort();
  if (!keys.length) return el('section', { class: 'card w-sum' }, el('p', { class: 'muted', text: 'Ingen vägning ännu. Fyll i vikt under Idag – trenden räknas på 7-dagars medel.' }));
  const lastK = keys[keys.length - 1], now = avg7(lastK);
  let back = avg7(addDays(lastK, -28));
  if (back == null) { const first = keys.find((k) => k >= addDays(lastK, -28)); back = first && first < lastK ? avg7(first) : null; }
  const first = S.state.weights[keys[0]];
  // Kompakt (v0.5.14): siffror på en rad + kurvan i samma kort.
  return el('section', { class: 'card w-card' },
    el('div', { class: 'w-row' },
      el('span', { class: 'w-label', text: 'Vikt' }),
      el('span', { class: 'w-now', text: `${fmtNum(r1(wOut(now)))} ${wUnit()}` }),
      back != null ? el('span', { class: 'w-chg' }, delta(now - back), el('small', { text: ' 4 v' })) : null),
    goalLine(now, back != null ? (now - back) / 4 : null),
    el('p', { class: 'w-sub', text: ['7-dagars medel', keys.length > 1 ? `totalt ${signed(wOut(now - first))} ${wUnit()} sedan ${shortDate(keys[0])}` : null].filter(Boolean).join(' · ') }),
    chart());
}

// Viktmål (2026-11-21): mål, takt som behövs och takten de senaste 4 veckorna.
export function goalLine(cur, actual) {
  const p = weightPlan(S.state.wgoal, cur, today());
  if (!p) return null;
  const kg = (v) => `${fmtNum(r1(wOut(v)))} ${wUnit()}`, rate = (v) => `${signed(wOut(v))} ${wUnit()}/v`;
  const part = (label, value, cls) => el('span', { class: 'wg-part' + (cls ? ' ' + cls : '') }, el('span', { text: label }), ' ', el('strong', { text: value }));
  if (p.open) return el('p', { class: 'w-sub wg' }, part('Mål', rate(p.rate)), actual != null ? [' · ', part('senaste 4 v', rate(actual))] : null);
  if (p.reached) return el('p', { class: 'w-sub wg' }, part('Mål', kg(p.target)), ' · ', el('span', { class: 'goal-ok', text: 'Nått 🎉' }));
  return el('p', { class: 'w-sub wg' },
    part('Mål', kg(p.target)), ' · ',
    p.tooFast ? part('Hinns inte med högst 1 %/v, tidigast', shortDate(p.earliest)) : part(S.state.wgoal.date ? 'senast' : 'klart ≈', shortDate(p.eta)), ' · ',
    part('takt', rate(p.rate)),
    actual != null ? [' · ', part('senaste 4 v', rate(actual))] : null);
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
  return el('section', { class: 'card' }, h2,
    el('p', { class: 'en-val' + (rough ? ' rough' : '') }, el('strong', { text: rough ? `${kcal(lo)}–${kcal(hi)}` : `≈ ${kcal(r50(e.tdee))}` }), ' kcal/dag'),
    el('div', { class: 'en-q' }, el('span', { text: 'Kvalitet' }),
      svg('svg', { class: 'en-bar', viewBox: '0 0 100 8', preserveAspectRatio: 'none', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': q, 'aria-label': 'Kvalitet' },
        svg('rect', { class: 'en-bg', x: 0, y: 0, width: 100, height: 8, rx: 4 }), svg('rect', { class: 'en-fill' + (q >= 75 ? ' ok' : ''), x: 0, y: 0, width: Math.max(q, 2), height: 8, rx: 4 })),
      el('strong', { text: `${q} %` })),
    rough ? el('p', { class: 'muted small', text: 'Grov uppskattning ännu.' }) : null,
    why ? el('p', { class: 'small', text: why }) : null,
    plan && !plan.reached && !rough ? el('p', { class: 'small' }, el('span', { text: 'För takten i ditt viktmål: ät ungefär' }), ' ', el('strong', { text: `${kcal(r50(e.tdee + plan.kcalDay))} kcal/dag` })) : null,
    how);
}
// Kalorisumma för en period (vecka/månad): mot målet, enligt vikten och mot förbrukningen.
export function energyStats(from, to) {
  const pe = periodEnergy(S.state, from, to > today() ? today() : to, today());
  if (!pe.logged) return pe.partial ? el('p', { class: 'muted small', text: 'Inga kompletta dagar – varje måltid behöver mat eller ⏭️, och minst 800 kcal.' }) : null;
  const e = energyEstimate(S.state, today()), useE = e && e.ready && e.quality >= 0.25;
  const items = [
    pe.vsGoal != null ? stat(signedK(pe.vsGoal), 'kcal mot kalorimålet') : null,
    useE ? stat(signedK(Math.round(pe.kcal - e.tdee * pe.logged)), 'kcal mot förbrukningen') : null,
    pe.wKcal != null ? stat(signedK(pe.wKcal), 'kcal enligt vikten') : null,
  ].filter(Boolean);
  return items.length ? el('div', {}, el('div', { class: 'stats' }, items),
    el('p', { class: 'muted small', text: `Summa för ${pe.logged} kompletta dagar${pe.partial ? ` (${pe.partial} ofullständiga räknas inte)` : ''}. Minus = underskott. Vikten räknas på 7-dagars medel (1 kg ≈ 7 700 kcal).` })) : null;
}

function weeks(n) {
  const out = [];
  let ws = weekStart(today());
  for (let i = 0; i < n; i++, ws = addDays(ws, -7)) out.push(ws);
  return out;
}

function table() {
  const rows = weeks(5).map((ws) => {
    const st = weekStats(S.state, ws), end = addDays(ws, 6) > today() ? today() : addDays(ws, 6);
    return { ws, st, h: habitWeek(S.state, ws), w: avg7(end), cur: ws === weekStart(today()) };
  });
  const list = rows.slice(0, 4).filter((r) => r.st.logged || r.h.count || r.w != null || weekSessions(r.ws).all);
  if (!list.length) return el('section', { class: 'card' }, el('h2', { text: 'Vecka för vecka' }), el('p', { class: 'muted small', text: 'Inget loggat de senaste veckorna.' }));
  return el('section', { class: 'card' }, el('h2', { text: 'Vecka för vecka' }),
    el('table', { class: 'wk-table' },
      el('thead', {}, el('tr', {}, ['v', 'Vikt', '±', '✅', '🍰', '🏋️', 'kcal/d'].map((h) => el('th', { scope: 'col', text: h })))),
      el('tbody', {}, list.map((r) => {
        const prev = avg7(addDays(r.ws, -1));
        return el('tr', { 'data-act': 'openweek', 'data-val': r.ws },
          el('td', {}, el('button', { class: 'link wk-open', 'data-act': 'openweek', 'data-val': r.ws, text: String(isoWeek(r.ws)) }), r.cur ? el('small', { class: 'wk-cur', text: 'pågår' }) : null),
          el('td', { text: r.w != null ? fmtNum(r1(r.w)) : '–' }),
          el('td', {}, r.w != null && prev != null ? el('span', { class: 'delta' + (r.w - prev < 0 ? ' down' : ''), text: signed(r.w - prev) }) : '–'),
          el('td', { class: r.h.ratio == null ? '' : r.h.ratio >= S.state.settings.successThreshold ? 'good-t' : r.h.ratio >= 0.5 ? 'mid-t' : 'low-t', text: pct(r.h.ratio) }),
          el('td', { text: r.h.count || r.h.extraCheat ? String(r.h.cheat + r.h.extraCheat) : '–' }),
          el('td', { text: (() => { const g = goals(r.ws).find((x) => x.key === 'workoutGoal'); const n = weekSessions(r.ws).all; return g ? `${n}/${g.goal}` : n ? String(n) : '–'; })() }),
          el('td', { text: r.st.avg != null ? kcal(r.st.avg) : '–' }));
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
  const W = 320, H = 110, pad = 26, bottom = 16;
  const x = (i) => pad + i * (W - pad - 6) / (n - 1), y = (v) => 8 + (hi - v) * (H - 8 - bottom) / (hi - lo);
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
      svg('path', { class: 'w-line', d })),
    el('p', { class: 'legend' }, el('span', { class: 'lg lg-w' }), ' 7-dagars medel', dots.length ? [el('span', { class: 'lg lg-wx' }), ' vägning'] : null, ` · ${span}`)];
}

function compare() {
  // Veckor med vikt före och efter: följsamhet (vanor), träning och – när maten loggats minst 4 dagar – kcal mot mål.
  const rows = [], thr = S.state.settings.successThreshold, wg = S.state.settings.workoutGoal || 3;
  for (const ws of weeks(52).slice(1)) {
    const st = weekStats(S.state, ws), h = habitWeek(S.state, ws), a = avg7(addDays(ws, 6)), b = avg7(addDays(ws, -1));
    if (a == null || b == null || (!h.count && st.logged < 4)) continue;
    rows.push({ good: h.ratio != null ? h.ratio >= thr : null, trained: weekSessions(ws).all >= wg, under: st.logged >= 4 && st.days[6].goal != null ? st.avg <= st.days[6].goal : null, d: a - b });
  }
  const body = rows.length < 4 ? [el('p', { class: 'muted small', text: `Fler veckor behövs (${rows.length}/4) – veckor med loggning och vikt före och efter.` })] : (() => {
    const mean = (l) => l.reduce((s, r) => s + r.d, 0) / l.length;
    const row = (label, l) => el('li', {}, el('span', { text: `${label} (${l.length})` }), el('strong', { text: l.length ? `${signed(wOut(mean(l)))} ${wUnit()}/v` : '–' }));
    const pair = (k, yes, no) => (rows.some((r) => r[k] != null) ? [row(yes, rows.filter((r) => r[k] === true)), row(no, rows.filter((r) => r[k] === false))] : []);
    return [el('ul', { class: 'compare' },
      pair('good', `Bra veckor (≥ ${pct(thr)})`, 'Sämre veckor'),
      pair('trained', `Med ≥ ${wg} pass`, 'Färre pass'),
      pair('under', 'Under kalorimålet', 'Över kalorimålet'))];
  })();
  return el('section', { class: 'card' }, el('h2', { text: 'Vad hänger ihop' }), body);
}

export function viewTrend() {
  return arrange('trend', { weight: () => summary(), energy: energyCard, weeks: table, compare });
}
