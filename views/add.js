// View: Lägg till – shown in place of Idag (or of the dish editor when adding an ingredient: S.add.target === 'dish').
// Tabs Senaste, Varor, Rätter. Search results are redrawn into #add-results on input, so the search field keeps focus.
import { searchFoods, recent, findRef, postN, QUICK_ADD } from '../store.js';
import { S, el, kcal, fmtNum, amountText, mealName, parseNum } from '../ui.js';
import { dishResults, dishPickCard } from './dishes.js';

// Steg B: units for a variant as [name, grams per unit], natural unit first.
// Liquids (d = g per ml) get dl and ml instead of g; solids always have g.
export function unitsOf(v) {
  const out = v.u ? [[v.u[0], v.u[1]]] : [];
  if (v.u2) out.push([v.u2[0], v.u2[1]]);   // second natural unit, e.g. Smör: smörgås + msk
  if (v.d) {
    if (!out.some((x) => x[0] === 'dl')) out.push(['dl', Math.round(v.d * 1000) / 10]);
    out.push(['ml', v.d]);
  } else out.push(['g', 1]);
  return out;
}
export const isBulk = (unit) => unit === 'g' || unit === 'ml';   // default amount 100, whole numbers
// Grams for the current pick, or NaN.
export function pickGrams(pick) {
  const a = parseNum(pick.amount);
  if (!(a > 0)) return NaN;
  const x = unitsOf(pick.food.v[pick.vi]).find((u) => u[0] === pick.unit);
  return x ? a * x[1] : NaN;
}
// "2 st (90 g) · 150 kcal", "150 g · 200 kcal", or "Ange mängd".
export function pickSum(pick) {
  const v = pick.food.v[pick.vi], g = pickGrams(pick);
  if (!Number.isFinite(g)) return 'Ange mängd';
  const a = fmtNum(parseNum(pick.amount), 2);
  return `${a} ${pick.unit}${pick.unit === 'g' ? '' : ` (${fmtNum(g, 0)} g)`} · ${kcal(v.n[0] * g / 100)} kcal`;
}

function foodRow(f) {
  const hv = f.hit != null ? f.v[f.hit] : null, v = hv || f.v[0];   // Steg B: träffad variant blir rubrik och förval
  return el('li', {}, el('button', { class: 'food-row', 'data-act': 'pick', 'data-ref': v.ref, ...(hv ? { 'data-vi': f.hit } : {}) },
    el('span', { class: 'post-name' }, hv ? hv.label : f.name, hv ? el('small', { text: f.name }) : f.product ? el('small', { text: f.sub }) : f.v.length > 1 ? el('small', { text: `${f.v.length} varianter` }) : f.more ? el('small', { text: 'Livsmedelsverket' }) : f.own ? el('small', { text: 'Egen produkt' }) : null),
    el('span', { class: 'post-kcal', text: f.product && v.u ? `${kcal(v.n[0] * v.u[1] / 100)} kcal/${v.u[0]}` : `${kcal(v.n[0])} kcal/100 g` })));
}

export function resultsList() {
  const a = S.add;
  if (a.tab === 'dishes') return dishResults(a.q);
  if (a.tab === 'out') {   // Snabbval (v0.9, v0.14): Frukost | Hemmagjort | Utemat, sist Egen uppskattning
    const g = a.qg || 'home', seg = (id, label) => el('button', { class: 'seg' + (g === id ? ' on' : ''), 'data-act': 'quickg', 'data-val': id, 'aria-pressed': String(g === id), text: label });
    return [el('div', { class: 'segs segs3 qsegs', role: 'group', 'aria-label': 'Frukost, hemmagjort eller utemat' }, seg('bf', 'Frukost'), seg('home', 'Hemmagjort'), seg('out', 'Utemat')),
      el('ul', { class: 'posts' }, QUICK_ADD.filter((x) => x.g === g).map((x) => el('li', {}, el('button', { class: 'food-row', 'data-act': 'quick', 'data-id': x.id },
        el('span', { class: 'post-name' }, x.label, el('small', { text: x.ex + (x.id === 'out-light' ? ' · kan vara enligt plan' : '') })),
        el('span', { class: 'post-kcal', text: `≈ ${kcal(x.n[0])} kcal` })))),
        el('li', {}, el('button', { class: 'food-row', 'data-act': 'estopen', 'data-val': g },
          el('span', { class: 'post-name' }, 'Egen uppskattning', el('small', { text: 'Fyll i kcal, och gärna protein, kolhydrater och fett' })))))];
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
  const units = unitsOf(v).map((x) => x[0]);
  const forDish = S.add.target === 'dish';
  return el('section', { class: 'card pick' },
    el('h2', { text: f.name }),
    f.v.length > 1 ? el('div', { class: 'chips', role: 'group', 'aria-label': 'Variant' }, f.v.map((x, i) =>
      el('button', { class: 'chip' + (i === p.vi ? ' on' : ''), 'data-act': 'variant', 'data-val': i, 'aria-pressed': i === p.vi ? 'true' : 'false', text: x.label }))) : null,
    el('div', { class: 'pick-row' },
      el('input', { type: 'text', inputmode: 'decimal', id: 'amount', value: p.amount, 'aria-label': 'Mängd', autocomplete: 'off' }),
      units.length > 1 ? el('div', { class: 'chips unit-chips', role: 'group', 'aria-label': 'Enhet' }, units.map((u) =>
        el('button', { class: 'chip' + (u === p.unit ? ' on' : ''), 'data-act': 'unit', 'data-val': u, 'aria-pressed': u === p.unit ? 'true' : 'false', text: u }))) : el('span', { text: units[0] })),
    el('p', { class: 'pick-sum', id: 'pick-sum', text: pickSum(p) }),
    v.u && p.unit === v.u[0] ? el('p', { class: 'muted small', text: `≈ ${v.u[1]} g per ${v.u[0]} (uppskattning)` }) : null,
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

// v0.14: Egen uppskattning – namn (valfritt), kcal (krävs), makron (valfria). Ett lager: bakåt stänger det.
export const EST_GROUP = { bf: 'Frukost', home: 'Hemmagjort', out: 'Utemat' };
function estCard() {
  const num = (id, label, ph) => el('label', { class: 'est-field' }, label,
    el('input', { type: 'text', inputmode: 'decimal', id, placeholder: ph, autocomplete: 'off' }));
  return el('section', { class: 'card pick' },
    el('h2', { text: `${EST_GROUP[S.add.est.g]} – egen uppskattning` }),
    el('input', { type: 'text', id: 'est-name', class: 'search', maxlength: 60, placeholder: `Namn (valfritt), t.ex. Lax med ris`, 'aria-label': 'Namn', autocomplete: 'off' }),
    el('div', { class: 'est-grid' }, num('est-kcal', 'kcal', 't.ex. 650'), num('est-p', 'Protein (g)', '0'), num('est-k', 'Kolh. (g)', '0'), num('est-f', 'Fett (g)', '0')),
    el('div', { class: 'row-actions' },
      el('button', { class: 'link', 'data-act': 'unpick', text: 'Tillbaka' }),
      el('button', { class: 'weigh-save', 'data-act': 'estsave', text: `Lägg till i ${mealName(S.add.meal)}` })),
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
    a.pick ? pickCard() : a.dpick ? dishPickCard() : a.est ? estCard() : [
      forDish ? null : el('div', { class: 'segs segs4', role: 'group', 'aria-label': 'Välj lista' }, tabBtn('recent', 'Senaste'), tabBtn('foods', 'Varor'), tabBtn('dishes', 'Rätter'), tabBtn('out', 'Snabbval')),
      searchable ? el('input', { type: 'search', id: 'add-q', class: 'search', value: a.q, placeholder: a.tab === 'dishes' ? 'Sök bland dina rätter' : 'Sök livsmedel', 'aria-label': 'Sök', autocomplete: 'off', 'data-act': 'search' }) : null,
      el('div', { id: 'add-results', class: 'card results' }, resultsList()),
    ],
  ];
}
export { findRef };
