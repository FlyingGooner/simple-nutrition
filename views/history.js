// View: Historik – månadskalender färgad efter följsamhet (vanor, som i follow-diet-tracker), streaks, träning och kcal som stöd.
import { addDays, dateKey, parseKey, sumN, habitDay, habitStreak, habitRange, habitLongest } from '../store.js';
import { today, S, el, svg, stepper, stat, kcal, pct, shortDate, arrange } from '../ui.js';
// (dateKey/parseKey används även av monthWeight)

// Vikt (v0.5.16): senaste vägningen i månaden mot senaste vägningen månaden innan, med minikurva över båda månaderna.
// v0.6.2: följsamhet och streaks som en kompakt rad i samma kort som vikten.
function habitRow() {
  const s = (n, l) => el('div', { class: 'ov-s' }, el('strong', { text: n }), el('span', { text: l }));
  return el('div', { class: 'ov-stats' },
    s(pct(habitRange(S.state, today(), 7)), '7 dagar'),
    s(pct(habitRange(S.state, today(), 30)), '30 dagar'),
    s(`🔥 ${habitStreak(S.state, today())}`, 'i rad'),
    s(String(habitLongest(S.state)), 'längsta'));
}
function monthWeight(extra = null) {
  const [y, m] = S.month.split('-').map(Number);
  const pm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const all = Object.keys(S.state.weights).sort();
  const cur = all.filter((k) => k.startsWith(S.month)), prev = all.filter((k) => k.startsWith(pm));
  if (!cur.length && !prev.length) return extra ? el('section', { class: 'card w-card' }, extra) : null;
  const W = (k) => S.state.weights[k], kg1 = (v) => v.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const lastK = cur[cur.length - 1], prevK = prev[prev.length - 1];
  // Jämför mot sista vägningen månaden innan; finns ingen, mot månadens första vägning (v0.5.17).
  const baseK = prevK || (cur.length >= 2 ? cur[0] : null);
  const d = lastK && baseK ? Math.round((W(lastK) - W(baseK)) * 10) / 10 : null;
  const dTxt = d == null ? '' : d === 0 ? '±0 kg' : `${d > 0 ? '+' : '−'}${kg1(Math.abs(d))} kg`;
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
      el('span', { class: 'w-now', text: lastK ? `${kg1(W(lastK))} kg` : '–' }),
      spark,
      d != null ? el('span', { class: 'w-chg delta' + (d < 0 ? ' down' : ''), text: dTxt }) : null),
    el('p', { class: 'w-sub', text: !lastK ? 'Ingen vägning den här månaden'
      : !baseK ? 'Första vägningen – inget att jämföra med än'
      : `${prevK ? 'mot' : 'sedan'} ${shortDate(baseK)} (${kg1(W(baseK))} kg) · ${cur.length} vägning${cur.length === 1 ? '' : 'ar'}` }),
    extra);
}

export function dayClass(k) {
  const r = habitDay(S.state, k).ratio;
  return r == null ? 'none' : r >= S.state.settings.successThreshold ? 'good' : r >= 0.5 ? 'mid' : 'low';
}
function avgKcal(n) {
  let s = 0, c = 0;
  for (let i = 0; i < n; i++) { const l = S.state.log[addDays(today(), -i)]; if (l?.length) { s += sumN(l)[0]; c++; } }
  return c ? Math.round(s / c) : null;
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
  const a7 = avgKcal(7), sessions = Object.values(S.state.workouts).reduce((n, l) => n + l.length, 0);
  const km = Object.values(S.state.workouts).flat().reduce((n, w) => n + (w.km || 0), 0);
  return [
    stepper('Byt månad', ['mprev', 'Föregående månad'], 'mnow', ['mnext', 'Nästa månad'], S.month >= today().slice(0, 7), title.charAt(0).toUpperCase() + title.slice(1)),
    ...arrange('history', {
    weight: () => monthWeight(habitRow()),
    calendar: () => el('section', { class: 'card' },
      el('div', { class: 'cal-head' }, ['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d) => el('span', { text: d }))),
      el('div', { class: 'cal' }, cells),
      el('p', { class: 'legend' },
        el('span', { class: 'lg good' }), ` ≥ ${pct(S.state.settings.successThreshold)}`, el('span', { class: 'lg mid' }), ' 50 %+', el('span', { class: 'lg low' }), ' < 50 %',
        el('span', { class: 'lg lg-weigh' }), ' Vägning', el('span', { class: 'lg lg-train' }), ' Träning')),
    more: () => el('section', { class: 'card' }, el('div', { class: 'stats' },
      stat(String(sessions), 'träningspass totalt', km ? ` · ${Math.round(km * 10) / 10} km` : ''),
      stat(a7 == null ? '–' : kcal(a7), 'kcal/dag, 7 dagar'))),
    }),
  ];
}
