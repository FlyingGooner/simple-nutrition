// View: Historik – månadskalender färgad efter följsamhet (vanor, som i follow-diet-tracker), streaks, träning och kcal som stöd.
import { periodEnergy, weekStart, addDays, dateKey, parseKey, sumN, habitDay } from '../store.js';
import { energyStats, kcalDayLine, weekTable } from './trend.js';
import { kcalWeightChart } from './week.js';
import { today, S, el, svg, stepper, stat, kcal, pct, shortDate, arrange, wOut, wUnit, dOut, dUnit } from '../ui.js';
// (dateKey/parseKey används även av monthWeight)

// Vikt (v0.5.16): senaste vägningen i månaden mot senaste vägningen månaden innan, med minikurva över båda månaderna.
function monthWeight(extra = null) {
  const [y, m] = S.month.split('-').map(Number);
  const pm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const all = Object.keys(S.state.weights).sort();
  const cur = all.filter((k) => k.startsWith(S.month)), prev = all.filter((k) => k.startsWith(pm));
  if (!cur.length && !prev.length) return extra ? el('section', { class: 'card w-card' }, extra) : null;
  const W = (k) => S.state.weights[k], kg1 = (v) => wOut(v).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const lastK = cur[cur.length - 1], prevK = prev[prev.length - 1];
  // Jämför mot sista vägningen månaden innan; finns ingen, mot månadens första vägning (v0.5.17).
  const baseK = prevK || (cur.length >= 2 ? cur[0] : null);
  const d = lastK && baseK ? Math.round((W(lastK) - W(baseK)) * 10) / 10 : null;
  const dTxt = d == null ? '' : d === 0 ? `±0 ${wUnit()}` : `${d > 0 ? '+' : '−'}${kg1(Math.abs(d))} ${wUnit()}`;
  const ks = [...prev, ...cur];
  let spark = el('span', { class: 'w-spark' });
  if (ks.length >= 2) {
    // Tidsaxeln: från förra månaden bara om den har vägningar, till idag (pågående månad) eller månadens slut.
    const mEnd = dateKey(new Date(y, m, 0, 12)), end = mEnd > today() ? today() : mEnd;
    const t0 = parseKey(prev.length ? prev[0] : cur[0]).getTime(), t1 = Math.max(parseKey(end).getTime(), t0 + 864e5);
    const X = (k) => Math.round((4 + (parseKey(k).getTime() - t0) / (t1 - t0) * 92) * 10) / 10;
    const vs = ks.map(W), lo = Math.min(...vs), rng = Math.max(...vs) - lo || 1, Y = (v) => Math.round((22 - (v - lo) / rng * 18) * 10) / 10;
    const mx = X(`${S.month}-01`);
    const dot = (cls, k) => svg('line', { class: cls, x1: X(k), x2: X(k), y1: Y(W(k)), y2: Y(W(k)) });
    spark = svg('svg', { class: 'w-spark', viewBox: '0 0 100 26', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      prev.length ? svg('line', { class: 'sp-wk', x1: mx, x2: mx, y1: 0, y2: 26 }) : null,
      svg('polyline', { class: 'sp-line', points: ks.map((k) => `${X(k)},${Y(W(k))}`).join(' ') }),
      baseK ? dot('sp-base', baseK) : null,
      lastK ? dot('sp-last', lastK) : null);
  }
  return el('section', { class: 'card w-card' },
    el('div', { class: 'w-row' },
      el('span', { class: 'w-label', text: 'Vikt' }),
      el('span', { class: 'w-now', text: lastK ? `${kg1(W(lastK))} ${wUnit()}` : '–' }),
      extra ? el('span', { class: 'w-flex' }) : spark,   // med stapeldiagram behövs ingen minikurva (2026-11-21)
      d != null ? el('span', { class: 'w-chg delta' + (d < 0 ? ' down' : ''), text: dTxt }) : null),
    el('p', { class: 'w-sub', text: !lastK ? 'Ingen vägning den här månaden'
      : !baseK ? 'Första vägningen – inget att jämföra med än'
      : `${prevK ? 'mot' : 'sedan'} ${shortDate(baseK)} (${kg1(W(baseK))} ${wUnit()}) · ${cur.length} vägning${cur.length === 1 ? '' : 'ar'}` }),
    d ? kcalDayLine(W(lastK) - W(baseK), baseK, lastK) : null,
    extra);
}

export function dayClass(k) {
  const r = habitDay(S.state, k).ratio;
  return r == null ? 'none' : r >= S.state.settings.successThreshold ? 'good' : r >= 0.5 ? 'mid' : 'low';
}
// Månadens kcal-snitt, bara kompletta dagar (städning 2026-11-21: månaden i stället för 7 dagar, som Vecka redan visar).
function avgKcal(from, to) {
  const pe = periodEnergy(S.state, from, to > today() ? today() : to, today());
  return pe.logged ? Math.round(pe.kcal / pe.logged) : null;
}

export function viewHistory() {
  const [y, m] = S.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12), days = new Date(y, m, 0).getDate();
  const title = first.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  const cells = [];
  for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells.push(el('span'));
  for (let d = 1; d <= days; d++) {
    const k = dateKey(new Date(y, m - 1, d, 12)), fut = k > today();
    cells.push(el('button', { class: `cal-day ${fut ? 'future' : dayClass(k)}${k === today() ? ' is-today' : ''}${S.state.weights[k] != null ? ' weighed' : ''}${S.state.workouts[k] ? ' trained' : ''}`,
      'data-act': 'goto', 'data-val': k, disabled: fut, 'aria-label': parseKey(k).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' }), text: String(d) }));
  }
  // Månaden (städning 2026-11-21): pass och kcal-snitt för den visade månaden, inte totalt/7 dagar.
  const mFrom = `${S.month}-01`, mTo = dateKey(new Date(y, m, 0, 12)), a7 = avgKcal(mFrom, mTo);
  const mw = Object.keys(S.state.workouts).filter((k) => k.startsWith(S.month)).flatMap((k) => S.state.workouts[k]);
  const sessions = mw.length, km = mw.reduce((n, w) => n + (w.km || 0), 0);
  return [
    el('div', { class: 'card day-head' }, stepper('Byt månad', ['mprev', 'Föregående månad'], 'mnow', ['mnext', 'Nästa månad'], S.month >= today().slice(0, 7), title.charAt(0).toUpperCase() + title.slice(1))),
    ...arrange('history', {
    weight: () => monthWeight(kcalWeightChart(`${S.month}-01`, new Date(y, m, 0).getDate())),   // följsamhet över tid flyttad till Historik och mål (2026-11-21)
    calendar: () => el('section', { class: 'card' },
      el('div', { class: 'cal-head' }, ['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d) => el('span', { text: d }))),
      el('div', { class: 'cal' }, cells),
      el('p', { class: 'legend' },
        el('span', { class: 'lg good' }), ` ≥ ${pct(S.state.settings.successThreshold)}`, el('span', { class: 'lg mid' }), ' 50 %+', el('span', { class: 'lg low' }), ' < 50 %',
        el('span', { class: 'lg lg-weigh' }), ' Vägning', el('span', { class: 'lg lg-train' }), ' Träning')),
    more: () => el('section', { class: 'card' }, el('div', { class: 'stats' },
      sessions ? stat(String(sessions), 'pass i månaden', km ? ` · ${Math.round(dOut(km) * 10) / 10} ${dUnit()}` : '') : null,   // 0 pass döljs (2026-11-21)
      stat(a7 == null ? '–' : kcal(a7), 'kcal/dag i snitt')),
      energyStats(mFrom, mTo)),
    weeks: () => { const ws = []; for (let w = weekStart(mFrom); w <= mTo && w <= today(); w = addDays(w, 7)) ws.push(w); return weekTable(ws); },
    }),
  ];
}
