// View: Idag – summary, meals with posts, weight. "+ Lägg till" opens views/add.js in place of the day.
import { sumN, postN, goalFor, addDays } from '../store.js';
import { today, S, el, svg, stepper, kcal, fmtNum, dateTitle, amountText, mealName } from '../ui.js';
import { viewAdd } from './add.js';

export const dayPosts = () => S.state.log[S.current] || [];

function summaryCard() {
  const posts = dayPosts(), n = sumN(posts), g = goalFor(S.state, S.current);
  const left = g.kcal - n[0], over = left < 0;
  const ratio = Math.min(1, n[0] / g.kcal);
  const macro = (label, v, goal) => el('span', { class: 'macro' }, `${label} `, el('strong', { text: fmtNum(v, 0) }), goal ? ` / ${goal} g` : ' g');
  return el('section', { class: 'card sum-card', 'aria-label': 'Dagens summa' },
    el('div', { class: 'sum-top' },
      el('span', { class: 'sum-big' }, el('strong', { text: kcal(n[0]) }), ` / ${kcal(g.kcal)} kcal`),
      el('span', { class: 'sum-left' + (over ? ' over' : ''), text: over ? `${kcal(-left)} över` : `${kcal(left)} kvar` })),
    svg('svg', { class: 'kbar', viewBox: '0 0 100 6', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      svg('rect', { class: 'kbar-bg', x: 0, y: 0, width: 100, height: 6, rx: 2 }),
      svg('rect', { class: 'kbar-fill' + (over ? ' over' : ''), x: 0, y: 0, width: Math.round(ratio * 1000) / 10, height: 6, rx: 2 })),
    el('p', { class: 'macros' }, macro('Protein', n[1], g.prot), ' · ', macro('Kolh.', n[2], g.kolh), ' · ', macro('Fett', n[3])));
}

function postRow(p) {
  const open = S.open === p.id;
  const row = el('li', { class: 'post' + (open ? ' open' : '') },
    el('button', { class: 'post-head', 'data-act': 'popen', 'data-id': p.id, 'aria-expanded': open ? 'true' : 'false' },
      el('span', { class: 'post-name' }, p.name, el('small', { text: amountText(p) })),
      el('span', { class: 'post-kcal', text: kcal(postN(p)[0]) })));
  if (open) {
    row.append(el('div', { class: 'post-edit' },
      el('label', { class: 'field' }, el('span', { text: p.q != null ? (p.u ? 'Mängd, ' + p.u[0] : 'Andel') : 'Gram' }),
        el('input', { type: 'text', inputmode: 'decimal', id: 'p-amount', value: p.q != null ? String(p.u ? p.u[1] : p.q) : String(p.g), 'aria-label': 'Mängd' })),
      el('label', { class: 'field' }, el('span', { text: 'Måltid' }),
        el('select', { id: 'p-meal', 'aria-label': 'Måltid' }, S.state.meals.map((m) => el('option', { value: m.id, selected: m.id === p.m, text: m.name })))),
      el('div', { class: 'row-actions' },
        el('button', { class: 'link danger', 'data-act': 'pdel', 'data-id': p.id, text: 'Ta bort' }),
        el('button', { class: 'weigh-save', 'data-act': 'psave', 'data-id': p.id, text: 'Spara' })),
      el('p', { class: 'import-error small', id: 'p-error', role: 'alert' })));
  }
  return row;
}

function mealCard(m, posts) {
  const total = posts.reduce((a, p) => a + postN(p)[0], 0);
  return el('section', { class: 'card meal' + (posts.length ? '' : ' empty'), 'aria-label': m.name },
    el('div', { class: 'meal-head' },
      el('span', { class: 'meal-name', text: m.name }),
      el('span', { class: 'meal-kcal', text: posts.length ? kcal(total) : '–' })),
    posts.length ? el('ul', { class: 'posts' }, posts.map(postRow)) : null,
    m.id === '_other' ? null : el('button', { class: 'link add-btn', 'data-act': 'addopen', 'data-id': m.id, 'aria-label': `Lägg till i ${m.name}`, text: '+ Lägg till' }));
}

function weightCard() {
  const w = S.state.weights[S.current];
  return el('details', { class: 'card weigh-extra', 'data-sec': 'weight' },
    el('summary', { text: w != null ? `Vikt ${fmtNum(w)} kg` : 'Vikt idag (valfritt)' }),
    el('div', { class: 'weigh-row' },
      el('input', { type: 'text', inputmode: 'decimal', id: 'weight', value: w != null ? fmtNum(w) : '', placeholder: 'kg', 'aria-label': 'Vikt i kg' }),
      el('button', { class: 'weigh-save', 'data-act': 'weightsave', text: 'Spara' })),
    el('p', { class: 'muted small', text: 'Väg dig gärna på morgonen. Trenden räknas på 7-dagars medel.' }));
}

export function viewToday() {
  if (S.add) return viewAdd();
  const isToday = S.current === today();
  const posts = dayPosts();
  const known = new Set(S.state.meals.map((m) => m.id));
  const other = posts.filter((p) => !known.has(p.m));
  return [
    stepper('Byt dag', ['prev', 'Föregående dag'], 'today', ['next', 'Nästa dag'], isToday,
      isToday ? [el('span', { class: 'today-badge', text: 'IDAG' }), dateTitle(S.current)] : dateTitle(S.current), null, isToday ? '' : 'not-today'),
    isToday ? null : el('p', { class: 'streak' }, el('button', { class: 'back-today', 'data-act': 'today', text: '↩ Till idag' })),
    summaryCard(),
    el('div', { class: 'meals' },
      S.state.meals.map((m) => mealCard(m, posts.filter((p) => p.m === m.id))),
      other.length ? mealCard({ id: '_other', name: 'Övrigt' }, other) : null),
    !posts.length && (S.state.log[addDays(S.current, -1)] || []).length
      ? el('button', { class: 'extra', 'data-act': 'copyprev', text: 'Kopiera från igår' }) : null,
    weightCard(),
    posts.length || S.state.weights[S.current] != null
      ? el('p', { class: 'clear-day center' }, el('button', { class: 'link danger', 'data-act': 'clearday', text: '🗑 Rensa dagen' })) : null,
  ];
}
export { mealName };
