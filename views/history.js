// View: Historik – månadskalender färgad efter följsamhet (vanor, som i follow-diet-tracker), streaks, träning och kcal som stöd.
import { periodEnergy, weekStart, addDays, dateKey, parseKey, sumN, habitDay } from '../store.js';
import { energyStats, kcalDayLine, weekTable, sameDay } from './trend.js';
import { kcalWeightChart, goalRow } from './week.js';
import { today, S, el, svg, stepper, stat, kcal, pct, shortDate, arrange, wOut, wUnit, dOut, dUnit, dayLetters, reasonName, isCardio } from '../ui.js';
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
  // Samma veckodag 4 veckor innan (2026-11-24, som Vecka: samma dag veckan innan): tisdag mot tisdag 28 dagar tidigare,
  // annars närmaste vägningen inom ±3 dagar från den, annars närmaste vägningen förra månaden.
  const pDays = new Date(pm.slice(0, 4), +pm.slice(5), 0).getDate(), t28 = lastK ? addDays(lastK, -28) : null;
  const md = lastK ? sameDay(lastK, t28, addDays(t28, -3), addDays(t28, 3))
    || sameDay(lastK, `${pm}-${String(Math.min(+lastK.slice(8), pDays)).padStart(2, '0')}`, `${pm}-01`, `${pm}-${pDays}`) : null;
  const baseK = md ? md.bk : prevK;
  const d = md ? md.d : null;
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
      d != null ? el('span', { class: 'w-chg delta' + (d < 0 ? ' down' : d > 0 ? ' up' : ''), title: md && md.days === 28 ? 'Mot samma veckodag 4 veckor innan' : `Mot vägningen ${md ? md.days : ''} dagar innan`, text: dTxt }) : null),
    !lastK || d == null ? el('p', { class: 'w-sub', text: !lastK ? 'Ingen vägning den här månaden' : 'Inga vägningar förra månaden att jämföra med' }) : null,
    // Veckomålet: takten räknas per vecka över avståndet mellan de två vägningarna.
    d == null ? null : ((days) => { const ref = `mot ${kg1(md.b)} ${wUnit()} ${shortDate(md.bk)}`;
      return (days >= 3 ? goalRow(d / days * 7, ref + ' · ') : null) || el('p', { class: 'w-sub', text: ref }); })(md.days),
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

// Vanor för månaden (2026-11-24, som Vecka): följsamhet, fusk och vanligaste orsak, dagar till och med idag.
function monthHabits(from, to) {
  const h = { score: 0, count: 0, followed: 0, cheat: 0, extraCheat: 0, skipped: 0, reasons: {} };
  for (let k = from; k <= to && k <= today(); k = addDays(k, 1)) {
    const r = habitDay(S.state, k); h.score += r.score; h.count += r.count;
    for (const [id, e] of Object.entries(S.state.habits[k] || {})) {
      if (!e || typeof e !== 'object') continue;
      if (e.outcome === 'cheat' && id.startsWith('extra-')) h.extraCheat++; else if (h[e.outcome] != null) h[e.outcome]++;
      if (e.reason) h.reasons[e.reason] = (h.reasons[e.reason] || 0) + 1;
    }
  }
  if (!h.count) return null;
  const reasons = Object.entries(h.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return el('section', { class: 'card' },
    el('div', { class: 'stats' },
      stat(pct(h.score / h.count), 'följsamhet'),
      stat(`${h.cheat + h.extraCheat}`, '🍰 fusk', h.extraCheat ? ` (${h.extraCheat} extra)` : '')),
    el('p', { class: 'muted small center', text: `✅ ${h.followed} följde · ⏭️ ${h.skipped} hoppade över` }),
    reasons.length ? el('p', { class: 'muted small center', text: `Vanligaste orsak: ${reasons.map(([id, n]) => `${reasonName(id)} (${n})`).join(', ')}` }) : null);
}
// Träning mot målen för månaden (2026-11-24): veckomålet × månadens dagar / 7, avrundat.
function monthGoals(mw, days) {
  const s = S.state.settings, cardio = mw.filter((w) => isCardio(w.types)).length;
  return [['workoutGoal', 'Träningspass', mw.length], ['gymGoal', 'Gympass', mw.length - cardio], ['cardioGoal', 'Konditionspass', cardio]]
    .filter(([k]) => s[k]).map(([k, label, n]) => stat(`${n}/${Math.round(s[k] * days / 7)}`, label));
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
  const pm = dateKey(new Date(y, m - 2, 1, 12)), pa = avgKcal(pm, dateKey(new Date(y, m - 1, 0, 12)));
  const sessions = mw.length, km = mw.reduce((n, w) => n + (w.km || 0), 0);
  return [
    el('div', { class: 'card day-head' }, stepper('Byt månad', ['mprev', 'Föregående månad'], 'mnow', ['mnext', 'Nästa månad'], S.month >= today().slice(0, 7), title.charAt(0).toUpperCase() + title.slice(1))),
    ...arrange('history', {
    weight: () => monthWeight(kcalWeightChart(`${S.month}-01`, new Date(y, m, 0).getDate())),   // följsamhet över tid flyttad till Historik och mål (2026-11-21)
    calendar: () => el('section', { class: 'card' },
      el('div', { class: 'cal-head' }, dayLetters().map((d) => el('span', { text: d }))),
      el('div', { class: 'cal' }, cells),
      el('p', { class: 'legend' },
        el('span', { class: 'lg good' }), ` ≥ ${pct(S.state.settings.successThreshold)}`, el('span', { class: 'lg mid' }), ' 50 %+', el('span', { class: 'lg low' }), ' < 50 %',
        el('span', { class: 'lg lg-weigh' }), ' Vägning', el('span', { class: 'lg lg-train' }), ' Träning')),
    habits: () => monthHabits(mFrom, mTo),
    more: () => { const gs = monthGoals(mw, days), dk = a7 != null && pa != null ? a7 - pa : null;
      return el('section', { class: 'card' }, el('div', { class: 'stats' },
      ...gs,
      sessions && !gs.length ? stat(String(sessions), 'pass i månaden', km ? ` · ${Math.round(dOut(km) * 10) / 10} ${dUnit()}` : '') : null,   // 0 pass döljs (2026-11-21)
      // kcal/dag mot förra månaden (2026-11-24), som Vecka: mer = rött.
      stat(a7 == null ? '–' : kcal(a7), 'kcal/dag i snitt', dk ? el('span', { class: 'delta' + (dk < 0 ? ' down' : ' up'), title: 'Mot förra månaden', text: ` ${dk > 0 ? '+' : '−'}${kcal(Math.abs(dk))}` }) : null)),
      gs.length && km ? el('p', { class: 'muted small center', text: `${sessions} pass · ${Math.round(dOut(km) * 10) / 10} ${dUnit()}` }) : null,
      energyStats(mFrom, mTo)); },
    weeks: () => { const ws = []; for (let w = weekStart(mFrom); w <= mTo && w <= today(); w = addDays(w, 7)) ws.push(w); return weekTable(ws); },
    }),
  ];
}
