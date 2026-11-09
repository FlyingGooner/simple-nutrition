// View: Historik – månadskalender färgad efter följsamhet (vanor, som i follow-diet-tracker), streaks, träning och kcal som stöd.
import { addDays, dateKey, parseKey, sumN, habitDay, habitStreak, habitRange, habitLongest } from '../store.js';
import { today, S, el, stepper, stat, kcal, pct } from '../ui.js';

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
    el('section', { class: 'card' },
      el('div', { class: 'cal-head' }, ['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d) => el('span', { text: d }))),
      el('div', { class: 'cal' }, cells),
      el('p', { class: 'legend' },
        el('span', { class: 'lg good' }), ` ≥ ${pct(S.state.settings.successThreshold)}`, el('span', { class: 'lg mid' }), ' 50 %+', el('span', { class: 'lg low' }), ' < 50 %',
        el('span', { class: 'lg lg-weigh' }), ' Vägning', el('span', { class: 'lg lg-train' }), ' Träning')),
    el('section', { class: 'card' }, el('div', { class: 'stats' },
      stat(pct(habitRange(S.state, today(), 7)), 'följsamhet 7 dagar'),
      stat(pct(habitRange(S.state, today(), 30)), 'följsamhet 30 dagar'),
      stat(`🔥 ${habitStreak(S.state, today())}`, 'lyckade dagar i rad'),
      stat(String(habitLongest(S.state)), 'längsta streak'))),
    el('section', { class: 'card' }, el('div', { class: 'stats' },
      stat(String(sessions), 'träningspass totalt', km ? ` · ${Math.round(km * 10) / 10} km` : ''),
      stat(a7 == null ? '–' : kcal(a7), 'kcal/dag, 7 dagar'))),
  ];
}
