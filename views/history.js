// View: Historik – month calendar coloured by kcal vs goal, averages and streaks.
import { addDays, dateKey, parseKey, sumN, goalFor } from '../store.js';
import { today, S, el, stepper, stat, kcal } from '../ui.js';

const logged = (k) => (S.state.log[k] || []).length > 0;
export function dayClass(k) {
  if (!logged(k)) return 'none';
  const r = sumN(S.state.log[k])[0] / goalFor(S.state, k).kcal;
  return r <= 1.05 ? 'good' : r <= 1.15 ? 'mid' : 'over';
}
function avgKcal(n) {
  let s = 0, c = 0;
  for (let i = 0; i < n; i++) { const k = addDays(today(), -i); if (logged(k)) { s += sumN(S.state.log[k])[0]; c++; } }
  return c ? Math.round(s / c) : null;
}
export function streaks() {
  let cur = 0, k = today();
  if (!logged(k)) k = addDays(k, -1);
  while (logged(k)) { cur++; k = addDays(k, -1); }
  let best = 0, run = 0, prev = null;
  for (const d of Object.keys(S.state.log).sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return { cur, best };
}

export function viewHistory() {
  const [y, m] = S.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12), days = new Date(y, m, 0).getDate();
  const title = first.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  const cells = [];
  for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells.push(el('span'));
  for (let d = 1; d <= days; d++) {
    const k = dateKey(new Date(y, m - 1, d, 12)), fut = k > today();
    cells.push(el('button', { class: `cal-day ${fut ? 'future' : dayClass(k)}${k === today() ? ' is-today' : ''}${S.state.weights[k] != null ? ' weighed' : ''}`,
      'data-act': 'goto', 'data-val': k, disabled: fut, 'aria-label': parseKey(k).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' }), text: String(d) }));
  }
  const st = streaks(), a7 = avgKcal(7), a30 = avgKcal(30);
  return [
    stepper('Byt månad', ['mprev', 'Föregående månad'], 'mnow', ['mnext', 'Nästa månad'], S.month >= today().slice(0, 7), title.charAt(0).toUpperCase() + title.slice(1)),
    el('section', { class: 'card' },
      el('div', { class: 'cal-head' }, ['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d) => el('span', { text: d }))),
      el('div', { class: 'cal' }, cells),
      el('p', { class: 'legend' },
        el('span', { class: 'lg good' }), ' Inom mål', el('span', { class: 'lg mid' }), ' Upp till +15 %', el('span', { class: 'lg over' }), ' Över', el('span', { class: 'lg lg-weigh' }), ' Vägning')),
    el('section', { class: 'card' }, el('div', { class: 'stats' },
      stat(a7 == null ? '–' : kcal(a7), 'kcal/dag, 7 dagar'),
      stat(a30 == null ? '–' : kcal(a30), 'kcal/dag, 30 dagar'),
      stat(String(st.cur), 'loggade dagar i rad'),
      stat(String(st.best), 'längsta streak'))),
  ];
}
