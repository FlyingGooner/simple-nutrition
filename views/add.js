// View: Lägg till – shown in place of Idag. Tabs Senaste and Varor (Rätter in v0.2).
// Search results are redrawn into #add-results on input, so the search field keeps focus.
import { searchFoods, recent, findRef, postN } from '../store.js';
import { S, el, kcal, fmtNum, amountText, mealName, parseNum } from '../ui.js';

// Grams for the current pick, or NaN.
export function pickGrams(pick) {
  const a = parseNum(pick.amount);
  if (!(a > 0)) return NaN;
  const u = pick.food.v[pick.vi].u;
  return pick.unit === 'g' || !u ? a : a * u[1];
}

function foodRow(f) {
  const v = f.v[0];
  return el('li', {}, el('button', { class: 'food-row', 'data-act': 'pick', 'data-ref': v.ref },
    el('span', { class: 'post-name' }, f.name, f.v.length > 1 ? el('small', { text: `${f.v.length} varianter` }) : f.more ? el('small', { text: 'Livsmedelsverket' }) : f.own ? el('small', { text: 'Egen' }) : null),
    el('span', { class: 'post-kcal', text: `${kcal(v.n[0])} kcal/100 g` })));
}

export function resultsList() {
  const a = S.add;
  if (a.tab === 'recent') {
    const list = recent(S.state);
    if (!list.length) return [el('p', { class: 'muted small', text: 'Inget loggat ännu. Sök under Varor.' })];
    return [el('ul', { class: 'posts' }, list.map((p) => el('li', {}, el('button', { class: 'food-row', 'data-act': 'relog', 'data-id': p.id },
      el('span', { class: 'post-name' }, p.name, el('small', { text: amountText(p) })),
      el('span', { class: 'post-kcal', text: kcal(postN(p)[0]) })))))];
  }
  if (!a.q.trim()) return [el('p', { class: 'muted small', text: 'Skriv t.ex. mjölk, kyckling eller havregryn.' })];
  const r = searchFoods(S.state, a.q, a.all);
  return [
    r.hits.length ? el('ul', { class: 'posts' }, r.hits.map(foodRow)) : el('p', { class: 'muted small', text: 'Ingen träff.' }),
    r.more ? el('button', { class: 'link', 'data-act': 'showall', text: `Visa fler (${r.more})` }) : null,
  ];
}

function pickCard() {
  const p = S.add.pick, f = p.food, v = f.v[p.vi];
  const g = pickGrams(p);
  const n = Number.isFinite(g) ? Math.round(v.n[0] * g / 100) : null;
  const units = ['g', ...(v.u ? [v.u[0]] : [])];
  return el('section', { class: 'card pick' },
    el('h2', { text: f.name }),
    f.v.length > 1 ? el('div', { class: 'chips', role: 'group', 'aria-label': 'Variant' }, f.v.map((x, i) =>
      el('button', { class: 'chip' + (i === p.vi ? ' on' : ''), 'data-act': 'variant', 'data-val': i, 'aria-pressed': i === p.vi ? 'true' : 'false', text: x.label }))) : null,
    el('div', { class: 'pick-row' },
      el('input', { type: 'text', inputmode: 'decimal', id: 'amount', value: p.amount, 'aria-label': 'Mängd', autocomplete: 'off' }),
      units.length > 1 ? el('div', { class: 'chips unit-chips', role: 'group', 'aria-label': 'Enhet' }, units.map((u) =>
        el('button', { class: 'chip' + (u === p.unit ? ' on' : ''), 'data-act': 'unit', 'data-val': u, 'aria-pressed': u === p.unit ? 'true' : 'false', text: u }))) : el('span', { text: 'g' })),
    el('p', { class: 'pick-sum', id: 'pick-sum', text: n == null ? 'Ange mängd' : `${kcal(n)} kcal${p.unit !== 'g' && v.u ? ` · ≈ ${fmtNum(g, 0)} g` : ''}` }),
    v.u && p.unit !== 'g' ? el('p', { class: 'muted small', text: `≈ ${v.u[1]} g per ${v.u[0]} (uppskattning)` }) : null,
    el('div', { class: 'row-actions' },
      el('button', { class: 'link', 'data-act': 'unpick', text: 'Tillbaka' }),
      el('button', { class: 'weigh-save', 'data-act': 'addsave', text: `Lägg till i ${mealName(S.add.meal)}` })),
    el('p', { class: 'import-error small', id: 'add-error', role: 'alert' }));
}

export function viewAdd() {
  const a = S.add;
  const tabBtn = (id, label) => el('button', { class: 'seg' + (a.tab === id ? ' on' : ''), 'data-act': 'addtab', 'data-val': id, 'aria-pressed': a.tab === id ? 'true' : 'false', text: label });
  return [
    el('div', { class: 'add-top' },
      el('button', { class: 'icon', 'data-act': 'addclose', 'aria-label': 'Stäng', text: '✕' }),
      el('h1', { class: 'add-title', text: `Lägg till i ${mealName(a.meal)}` })),
    a.pick ? pickCard() : [
      el('div', { class: 'segs', role: 'group', 'aria-label': 'Välj lista' }, tabBtn('recent', 'Senaste'), tabBtn('foods', 'Varor')),
      a.tab === 'foods' ? el('input', { type: 'search', id: 'add-q', class: 'search', value: a.q, placeholder: 'Sök livsmedel', 'aria-label': 'Sök livsmedel', autocomplete: 'off', 'data-act': 'search' }) : null,
      el('div', { id: 'add-results', class: 'card results' }, resultsList()),
    ],
  ];
}
export { findRef };
