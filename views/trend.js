// View: Trend – weight (7-day average), the last 4 weeks as a table, weight chart 12 weeks, kcal vs weight.
import { addDays, weekStart, isoWeek, weekStats, habitWeek } from '../store.js';
import { today, S, el, svg, kcal, fmtNum, shortDate, pct, goals, weekSessions } from '../ui.js';

// 7-day average of the weights in [k-6, k], or null.
export function avg7(k) {
  const v = [];
  for (let i = 0; i < 7; i++) { const w = S.state.weights[addDays(k, -i)]; if (w != null) v.push(w); }
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
const r1 = (x) => Math.round(x * 10) / 10;
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmtNum(Math.abs(r1(n)));
const delta = (n) => el('span', { class: 'delta' + (n < 0 ? ' down' : ''), text: `${signed(n)} kg ${n < 0 ? '▼' : n > 0 ? '▲' : ''}`.trim() });

function summary(t) {
  const keys = Object.keys(S.state.weights).sort();
  if (!keys.length) return el('section', { class: 'card w-sum' }, el('p', { class: 'muted', text: 'Ingen vägning ännu. Fyll i vikt under Idag – trenden räknas på 7-dagars medel.' }));
  const lastK = keys[keys.length - 1], now = avg7(lastK);
  let back = avg7(addDays(lastK, -28));
  if (back == null) { const first = keys.find((k) => k >= addDays(lastK, -28)); back = first && first < lastK ? avg7(first) : null; }
  const first = S.state.weights[keys[0]];
  return el('section', { class: 'card w-sum' },
    el('div', { class: 'w-sum-top' },
      el('span', { class: 'w-big', text: `${fmtNum(r1(now))} kg` }),
      back != null ? el('span', { class: 'w-d' }, delta(now - back)) : null),
    el('p', { class: 'muted small', text: `7-dagars medel · förändring 4 veckor` }),
    keys.length > 1 ? el('p', { class: 'small' }, `Totalt ${signed(now - first)} kg sedan ${shortDate(keys[0])}`) : null);
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
  const list = rows.filter((r, i) => i < 4 || false).filter((r) => !r.cur || r.st.logged || r.h.count || r.w != null);
  return el('section', { class: 'card' }, el('h2', { text: 'Vecka för vecka' }),
    el('table', { class: 'wk-table' },
      el('thead', {}, el('tr', {}, ['v', 'Vikt', '±', '✅', '🍰', '🏋️', 'kcal/d'].map((h) => el('th', { scope: 'col', text: h })))),
      el('tbody', {}, list.map((r) => {
        const prev = avg7(addDays(r.ws, -1));
        return el('tr', { 'data-act': 'openweek', 'data-val': r.ws },
          el('td', {}, el('button', { class: 'link wk-open', 'data-act': 'openweek', 'data-val': r.ws, text: String(isoWeek(r.ws)) }), r.cur ? el('small', { text: ' pågår' }) : null),
          el('td', { text: r.w != null ? fmtNum(r1(r.w)) : '–' }),
          el('td', {}, r.w != null && prev != null ? delta(r.w - prev) : '–'),
          el('td', { class: r.h.ratio == null ? '' : r.h.ratio >= S.state.settings.successThreshold ? 'good-t' : r.h.ratio >= 0.5 ? 'mid-t' : 'low-t', text: pct(r.h.ratio) }),
          el('td', { text: r.h.count || r.h.extraCheat ? String(r.h.cheat + r.h.extraCheat) : '–' }),
          el('td', { text: (() => { const g = goals(r.ws).find((x) => x.key === 'workoutGoal'); const n = weekSessions(r.ws).all; return g ? `${n}/${g.goal}` : n ? String(n) : '–'; })() }),
          el('td', { text: r.st.avg != null ? kcal(r.st.avg) : '–' }));
      }))));
}

function chart() {
  const start = addDays(weekStart(today()), -77), days = [];
  for (let k = start; k <= today(); k = addDays(k, 1)) days.push(k);
  const pts = days.map((k, i) => ({ i, w: S.state.weights[k], a: avg7(k) })).filter((p) => p.w != null || p.a != null);
  if (Object.keys(S.state.weights).filter((k) => k >= start).length < 2) return null;
  const vals = pts.flatMap((p) => [p.w, p.a]).filter((x) => x != null);
  const lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
  const W = 320, H = 140, pad = 24, x = (i) => pad + i * (W - pad - 4) / (days.length - 1), y = (v) => 8 + (hi - v) * (H - 24) / (hi - lo);
  const line = pts.filter((p) => p.a != null).map((p, j) => `${j ? 'L' : 'M'}${Math.round(x(p.i) * 10) / 10},${Math.round(y(p.a) * 10) / 10}`).join(' ');
  return el('section', { class: 'card' }, el('h2', { text: 'Vikt, 12 veckor' }),
    svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Viktkurva 12 veckor, 7-dagars medel' },
      [lo, (lo + hi) / 2, hi].map((v) => [svg('line', { class: 'grid', x1: pad, x2: W, y1: y(v), y2: y(v) }), svg('text', { class: 'ax', x: 0, y: y(v) + 3 }, fmtNum(r1(v)))]),
      pts.filter((p) => p.w != null).map((p) => svg('circle', { class: 'w-dot-extra', cx: x(p.i), cy: y(p.w), r: 2 })),
      svg('path', { class: 'w-line', d: line })),
    el('p', { class: 'legend' }, el('span', { class: 'lg lg-w' }), ' 7-dagars medel', el('span', { class: 'lg lg-wx' }), ' vägning'));
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
    const row = (label, l) => el('li', {}, el('span', { text: `${label} (${l.length})` }), el('strong', { text: l.length ? `${signed(mean(l))} kg/v` : '–' }));
    const pair = (k, yes, no) => (rows.some((r) => r[k] != null) ? [row(yes, rows.filter((r) => r[k] === true)), row(no, rows.filter((r) => r[k] === false))] : []);
    return [el('ul', { class: 'compare' },
      pair('good', `Bra veckor (≥ ${pct(thr)})`, 'Sämre veckor'),
      pair('trained', `Med ≥ ${wg} pass`, 'Färre pass'),
      pair('under', 'Under kalorimålet', 'Över kalorimålet'))];
  })();
  return el('section', { class: 'card' }, el('h2', { text: 'Vad hänger ihop' }), body);
}

export function viewTrend() {
  return [summary(), table(), chart(), compare()];
}
