// View: Lägg till – shown in place of Idag (or of the dish editor when adding an ingredient: S.add.target === 'dish').
// Tabs Senaste, Varor, Rätter. Search results are redrawn into #add-results on input, so the search field keeps focus.
import { searchFoods, recent, findRef, postN, QUICK_ADD } from '../store.js';
import { S, el, kcal, fmtNum, amountText, mealName, parseNum } from '../ui.js';
import { dishResults, dishPickCard } from './dishes.js';

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
    el('span', { class: 'post-name' }, f.name, f.product ? el('small', { text: f.sub }) : f.v.length > 1 ? el('small', { text: `${f.v.length} varianter` }) : f.more ? el('small', { text: 'Livsmedelsverket' }) : f.own ? el('small', { text: 'Egen produkt' }) : null),
    el('span', { class: 'post-kcal', text: f.product && v.u ? `${kcal(v.n[0] * v.u[1] / 100)} kcal/${v.u[0]}` : `${kcal(v.n[0])} kcal/100 g` })));
}

export function resultsList() {
  const a = S.add;
  if (a.tab === 'dishes') return dishResults(a.q);
  if (a.tab === 'out') {   // Snabbval (v0.9): Hemmagjort | Utemat
    const g = S.quickG || 'home', seg = (id, label) => el('button', { class: 'seg' + (g === id ? ' on' : ''), 'data-act': 'quickg', 'data-val': id, 'aria-pressed': String(g === id), text: label });
    return [el('div', { class: 'segs qsegs', role: 'group', 'aria-label': 'Hemmagjort eller utemat' }, seg('home', 'Hemmagjort'), seg('out', 'Utemat')),
      el('ul', { class: 'posts' }, QUICK_ADD.filter((x) => x.g === g).map((x) => el('li', {}, el('button', { class: 'food-row', 'data-act': 'quick', 'data-id': x.id },
        el('span', { class: 'post-name' }, x.label, el('small', { text: x.ex + (x.id === 'out-light' ? ' · kan vara enligt plan' : '') })),
        el('span', { class: 'post-kcal', text: `≈ ${kcal(x.n[0])} kcal` })))))];
  }
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
  const forDish = S.add.target === 'dish';
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
    p.last ? el('p', { class: 'muted small', text: `Senast: ${p.last}` }) : null,
    el('div', { class: 'row-actions' },
      el('button', { class: 'link', 'data-act': 'unpick', text: 'Tillbaka' }),
      el('button', { class: 'weigh-save', 'data-act': 'addsave', text: forDish ? 'Lägg till i rätten' : `Lägg till i ${mealName(S.add.meal)}` })),
    forDish ? null : el('button', { class: 'link small-link', 'data-act': 'aliasopen', text: 'Spara eget sökord för den här varan' }),
    S.add.alias ? el('div', { class: 'pick-row' },
      el('input', { type: 'text', id: 'alias-word', maxlength: 40, placeholder: 'T.ex. fil', 'aria-label': 'Eget sökord', autocomplete: 'off' }),
      el('button', { class: 'weigh-save', 'data-act': 'aliassave', text: 'Spara sökord' })) : null,
    el('p', { class: 'import-error small', id: 'add-error', role: 'alert' }));
}

export function viewAdd() {
  const a = S.add, forDish = a.target === 'dish';
  const tabBtn = (id, label) => el('button', { class: 'seg' + (a.tab === id ? ' on' : ''), 'data-act': 'addtab', 'data-val': id, 'aria-pressed': a.tab === id ? 'true' : 'false', text: label });
  const searchable = a.tab === 'foods' || a.tab === 'dishes';
  return [
    el('div', { class: 'add-top' },
      el('button', { class: 'icon', 'data-act': 'addclose', 'aria-label': 'Stäng', text: '✕' }),
      el('h1', { class: 'add-title', text: forDish ? 'Lägg till ingrediens' : `Lägg till i ${mealName(a.meal)}` })),
    a.pick ? pickCard() : a.dpick ? dishPickCard() : [
      forDish ? null : el('div', { class: 'segs segs4', role: 'group', 'aria-label': 'Välj lista' }, tabBtn('recent', 'Senaste'), tabBtn('foods', 'Varor'), tabBtn('dishes', 'Rätter'), tabBtn('out', 'Snabbval')),
      searchable ? el('input', { type: 'search', id: 'add-q', class: 'search', value: a.q, placeholder: a.tab === 'dishes' ? 'Sök bland dina rätter' : 'Sök livsmedel', 'aria-label': 'Sök', autocomplete: 'off', 'data-act': 'search' }) : null,
      el('div', { id: 'add-results', class: 'card results' }, resultsList()),
    ],
  ];
}
export { findRef };
