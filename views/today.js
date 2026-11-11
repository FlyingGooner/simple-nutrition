// View: Idag – summary, meals with posts, weight. "+ Lägg till" opens views/add.js in place of the day.
import { sumN, postN, goalFor, addDays, habitDay, habitStreak } from '../store.js';
import { today, S, setOpen, el, svg, stepper, kcal, fmtNum, pct, dateTitle, amountText, mealName, reasonName, arrange } from '../ui.js';
import { viewAdd } from './add.js';
import { dayHabits, outcomeRow, habitDetails, extraCards, workoutCards, addRow } from './habits.js';
import { OUTCOMES } from '../fdt-store.js';

export const dayPosts = () => S.state.log[S.current] || [];

function summaryCard() {
  const posts = dayPosts(), n = sumN(posts), g = goalFor(S.state, S.current);
  const macro = (label, v, goal) => el('span', { class: 'macro' }, `${label} `, el('strong', { text: fmtNum(v, 0) }), goal ? ` / ${goal} g` : ' g');
  const has = g.kcal != null, left = has ? g.kcal - n[0] : 0, over = left < 0;
  // Utan kalorimål (standard): bara dagens summa, ingen stapel eller "kvar".
  return el('section', { class: 'card sum-card', 'aria-label': 'Dagens kalorier' },
    el('div', { class: 'sum-top' },
      el('span', { class: 'sum-big' }, el('strong', { text: kcal(n[0]) }), has ? ` / ${kcal(g.kcal)} kcal` : ' kcal idag'),
      has ? el('span', { class: 'sum-left' + (over ? ' over' : ''), text: over ? `${kcal(-left)} över` : `${kcal(left)} kvar` }) : null),
    has ? svg('svg', { class: 'kbar', viewBox: '0 0 100 6', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      svg('rect', { class: 'kbar-bg', x: 0, y: 0, width: 100, height: 6, rx: 2 }),
      svg('rect', { class: 'kbar-fill' + (over ? ' over' : ''), x: 0, y: 0, width: Math.round(Math.min(1, n[0] / g.kcal) * 1000) / 10, height: 6, rx: 2 })) : null,
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
      el('label', { class: 'field' }, el('span', { text: p.u ? 'Mängd, ' + p.u[0] : p.q != null ? 'Andel' : 'Gram' }),
        el('input', { type: 'text', inputmode: 'decimal', id: 'p-amount', value: String(p.u ? p.u[1] : p.q != null ? p.q : p.g), 'aria-label': 'Mängd' })),
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
  // Vanor i fokus (beslut 2026-11-09): ✅ 🍰 ⏭️ först, maten och kcal som stöd under.
  // Maten är en hopfälld underdel av måltiden: "🍽 Mat · 420 kcal" (öppen-läget sparas i setOpen via data-sec).
  // v0.6.3: öppet-läget för 🍽 Mat är per dag (förut delat mellan alla dagar och tvingade även det hopfällda måltidskortet att öppnas).
  const other = m.id === '_other', sec = `food-${S.current}-${m.id}`, editing = posts.some((p) => p.id === S.open);
  const open = setOpen.has(sec) || editing;
  const body = [
    other ? null : outcomeRow(m.id),
    other ? null : habitDetails(m.id),
    el('details', { class: 'meal-food' + (posts.length ? ' has-food' : ''), 'data-sec': sec, open },
      el('summary', {},
        el('span', { class: 'food-label', text: posts.length ? '✅ Mat' : '🍽 Mat' }),
        el('span', { class: 'meal-kcal', text: posts.length ? `${kcal(total)} kcal` : 'Inget loggat' })),
      posts.length ? el('ul', { class: 'posts' }, posts.map(postRow)) : null,
      other ? null : el('div', { class: 'meal-foot' },
        el('button', { class: 'link add-btn', 'data-act': 'addopen', 'data-id': m.id, 'aria-label': `Lägg till mat i ${m.name}`, text: '+ Lägg till mat' }),
        posts.some((p) => p.g != null) ? el('button', { class: 'meal-dish', 'data-act': 'mealdish', 'data-id': m.id, 'aria-label': `Spara ${m.name} som rätt`, title: 'Spara som rätt', text: '+🍲 Spara som rätt' }) : null)),
  ];
  const e = other ? null : dayHabits()[m.id];
  // Ifylld måltid fälls ihop till en rad: val + rätt + kcal (fusk utan orsak hålls öppen tills orsaken är vald).
  if (!e || !OUTCOMES[e.outcome] || (e.outcome === 'cheat' && !e.reason)) {
    return el('section', { class: 'card meal', 'aria-label': m.name },
      el('div', { class: 'meal-head' }, el('span', { class: 'meal-name', text: m.name })), body);
  }
  const o = OUTCOMES[e.outcome], msec = `meal-${S.current}-${m.id}`;
  return el('details', { class: 'card meal meal-done', 'data-sec': msec, open: setOpen.has(msec) || editing, 'aria-label': m.name },
    el('summary', { class: 'meal-head' },
      el('span', { class: 'meal-name' }, m.name,
        posts.length ? el('small', { class: 'meal-what', text: posts.map((p) => p.name).join(', ') }) : null),
      el('span', { class: `tag tag-${e.outcome}`, text: `${o.icon} ${e.reason ? reasonName(e.reason) : o.label}` }),
      posts.length ? el('span', { class: 'meal-kcal', text: `${kcal(total)} kcal` }) : null),
    body);
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
  const other = posts.filter((p) => !known.has(p.m) && !(p.m.startsWith('extra-') && dayHabits()[p.m]));   // extra fuskets kcal visas i nivåraden
  const orphanHabits = Object.keys(dayHabits()).filter((k) => !known.has(k) && !k.startsWith('extra-'));
  const r = habitDay(S.state, S.current), st = habitStreak(S.state, today());
  return [
    stepper('Byt dag', ['prev', 'Föregående dag'], 'today', ['next', 'Nästa dag'], isToday,
      isToday ? [el('span', { class: 'today-badge', text: 'IDAG' }), dateTitle(S.current)] : dateTitle(S.current), null, isToday ? '' : 'not-today'),
    el('div', { class: 'streak' }, el('span', { title: 'Lyckade dagar i rad', text: `🔥 ${st} ${st === 1 ? 'dag' : 'dagar'} i rad` }),
      isToday ? null : el('button', { class: 'link back-today', 'data-act': 'today', text: '↩ Till idag' })),
    ...arrange('today', {
    plan: () => S.state.settings.planText ? el('p', { class: 'plan', text: S.state.settings.planText }) : null,
    meals: () => el('div', { class: 'meals' },
      S.state.meals.map((m) => mealCard(m, posts.filter((p) => p.m === m.id))),
      orphanHabits.map((k) => el('section', { class: 'card meal', 'aria-label': 'Borttagen måltid' },
        el('div', { class: 'meal-head' }, el('span', { class: 'meal-name', text: dayHabits()[k].name || 'Borttagen måltid' })), outcomeRow(k), habitDetails(k))),
      extraCards(),
      other.length ? mealCard({ id: '_other', name: 'Övrigt' }, other) : null),
    train: () => [el('div', { class: 'workouts' }, workoutCards()), addRow()],
    score: () => el('p', { class: 'summary' }, r.count ? ['Dagens följsamhet: ', el('strong', { text: `${fmtNum(r.score)}/${r.count}` }), ' · ' + pct(r.ratio)] : 'Inget loggat ännu.'),
    kcal: () => [summaryCard(),
      !posts.length && (S.state.log[addDays(S.current, -1)] || []).length
        ? el('button', { class: 'extra', 'data-act': 'copyprev', text: 'Kopiera maten från igår' }) : null],
    weight: () => weightCard(),
    }),
    posts.length || S.state.weights[S.current] != null || S.state.habits[S.current] || S.state.workouts[S.current]
      ? el('p', { class: 'clear-day center' }, el('button', { class: 'link danger', 'data-act': 'clearday', text: '🗑 Rensa dagen' })) : null,
  ];
}
export { mealName };
