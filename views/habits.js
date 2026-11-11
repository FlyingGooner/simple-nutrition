// Vanor och träning i Idag (porterat från follow-diet-tracker/views/today.js). Rendering via el() only.
import { OUTCOMES } from '../fdt-store.js';
import { weekStart, QUICK_ADD, quickGroup } from '../store.js';
import { S, el, kcal, reasonName, isCardio, goals, sessionText } from '../ui.js';

export const dayHabits = () => S.state.habits[S.current] || {};

// ✅ 🍰 ⏭️ for a meal (or an extra). Tapping the chosen one again clears it.
export function outcomeRow(id) {
  const e = dayHabits()[id];
  return el('div', { class: 'hab', role: 'group', 'aria-label': 'Följde du planen?' },
    Object.entries(OUTCOMES).map(([key, o]) =>
      el('button', { class: `hab-b oc-${key}${e?.outcome === key ? ' on' : ''}`, 'data-act': 'outcome', 'data-id': id, 'data-val': key,
        'aria-pressed': String(e?.outcome === key), title: o.label }, el('span', { 'aria-hidden': 'true', text: o.icon }), el('small', { text: o.label }))));
}
// Reason chips for a cheat; the note (from follow-diet-tracker) is shown and can be edited.
export function habitDetails(id) {
  const e = dayHabits()[id];
  if (!e) return null;
  return [
    e.outcome === 'cheat' ? el('div', { class: 'chips hab-chips', role: 'group', 'aria-label': 'Orsak' }, S.state.settings.reasons.map((r) =>
      el('button', { class: 'chip' + (e.reason === r.id ? ' on' : ''), 'data-act': 'reason', 'data-id': id, 'data-val': r.id, 'aria-pressed': String(e.reason === r.id), text: r.name }))) : null,
    e.outcome === 'cheat' ? levelList(id, quickGroup(e.reason, id.startsWith('extra-'))) : null,
    e.outcome === 'cheat' || e.note ? el('input', { type: 'text', class: 'hab-note', maxlength: 140, placeholder: 'Anteckning (valfritt)', value: e.note || '', 'data-act': 'note', 'data-id': id, 'aria-label': 'Anteckning' }) : null,
  ];
}

// v0.9: "Hur mycket?" – kcal-nivå för fusket (tryck igen = ta bort). Vald nivå = q:-post i samma måltid/extra.
function levelList(id, g) {
  if (!g) return null;
  const refs = new Set((S.state.log[S.current] || []).filter((p) => p.m === id).map((p) => p.ref));
  return el('div', { class: 'lvl' }, el('p', { class: 'lvl-h', text: 'Hur mycket? (valfritt)' }),
    el('ul', { class: 'posts' }, QUICK_ADD.filter((x) => x.g === g).map((x) => {
      const on = refs.has('q:' + x.id);
      return el('li', {}, el('button', { class: 'food-row' + (on ? ' on' : ''), 'data-act': 'level', 'data-id': id, 'data-val': x.id, 'aria-pressed': String(on) },
        el('span', { class: 'post-name' }, (on ? '✓ ' : '') + x.label, el('small', { text: x.ex })),
        el('span', { class: 'post-kcal', text: `≈ ${kcal(x.n[0])}` })));
    })));
}

export function extraCards() {
  return Object.keys(dayHabits()).filter((k) => k.startsWith('extra-')).map((k) => {
    const e = dayHabits()[k];
    return el('section', { class: 'card meal extra-card', 'aria-label': 'Extra fusk' },
      el('div', { class: 'meal-head' }, el('span', { class: 'meal-name', text: '🍰 Extra' }),
        e.reason ? el('span', { class: 'muted small', text: reasonName(e.reason) }) : null,
        el('button', { class: 'icon sm danger', 'data-act': 'remove', 'data-id': k, 'aria-label': 'Ta bort extra', text: '✕' })),
      habitDetails(k));
  });
}

// "Vecka 2/3" (reached: ✓ 3/3); without a goal nothing.
function goalBadge() {
  const gs = goals(weekStart(S.current));
  if (!gs.length) return null;
  const one = gs.length === 1;
  return el('span', { class: 'w-goal' }, gs.map((g, i) => [i ? ' · ' : '',
    el('span', { class: g.n >= g.goal ? 'reached' : '', text: `${g.n >= g.goal ? '✓ ' : ''}${one && g.key === 'workoutGoal' ? 'Veckan' : g.short} ${g.n}/${g.goal}` })]));
}

export function workoutCards() {
  const list = S.state.workouts[S.current] || [];
  const done = list.map((w, i) => el('details', { class: 'card weigh-done workout-done' },
    el('summary', {}, el('span', { class: 'check', 'aria-hidden': 'true', text: '🏋️' }), el('span', { class: 'w-text', text: sessionText(w) })),
    el('div', { class: 'row-actions' }, el('button', { class: 'link danger', 'data-act': 'wdel', 'data-val': i, text: 'Ta bort pass' }))));
  if (!S.wdraft) return done;
  const types = S.state.settings.workoutTypes;
  const cardio = isCardio(S.wdraft.types);
  return [done, el('section', { class: 'card workout-new' },
    el('div', { class: 'chips', role: 'group', 'aria-label': 'Typ av pass' }, types.length ? types.map((t) =>
      el('button', { class: 'chip' + (S.wdraft.types.includes(t.id) ? ' on' : ''), 'data-act': 'wtype', 'data-val': t.id,
        'aria-pressed': String(S.wdraft.types.includes(t.id)), text: t.name })) : el('p', { class: 'muted small', text: 'Inga passtyper – lägg till under Inställningar → Träning.' })),
    cardio ? el('div', { class: 'weigh-row w-cardio' },
      el('input', { id: 'w-km', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'km', 'aria-label': 'Sträcka i km' }),
      el('input', { id: 'w-time', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'tid 28:30', 'aria-label': 'Tid, minuter:sekunder' })) : null,
    el('p', { class: 'import-error small', id: 'w-error', role: 'alert' }),
    el('div', { class: 'row-actions' },
      el('button', { class: 'link', 'data-act': 'wcancel', text: 'Avbryt' }),
      el('button', { class: 'link weigh-save', 'data-act': 'wsave', disabled: !S.wdraft.types.length, text: 'Spara pass' })))];
}

export function addRow() {
  return el('div', { class: 'add-row' },
    el('button', { class: 'extra', 'data-act': 'extra', text: '+ Extra fusk' }),
    el('button', { class: 'extra extra-train', 'data-act': 'wnew', disabled: !!S.wdraft }, el('span', { text: '+ Träningspass' }), goalBadge()));
}
