// Handlers: Lägg till – sök, välj vara/rätt, mängd, sökord. Each returns true when the view should be redrawn.
import { findRef, cleanText, uid, dishTotal } from '../store.js';
import { S, kcal, parseNum } from '../ui.js';
import { resultsList, pickGrams } from './add.js';
import { dishQ, dishUnit } from './dishes.js';

export function openAdd(target, meal, c) {
  const tab = target === 'dish' ? 'foods' : S.lastTab || (Object.keys(S.state.log).length ? 'recent' : 'foods');
  S.add = { target, meal, tab, q: '', all: false, pick: null, dpick: null, alias: false };
  c.render(); scrollTo(0, 0);
  document.getElementById('add-q')?.focus();
}
function openPick(food) {
  const u = food.v[0].u;
  S.add.pick = { food, vi: 0, unit: u ? u[0] : 'g', amount: u ? '1' : '100' };
}
function pickSumText() {
  const a = S.add;
  if (a.dpick) { const q = dishQ(a.dpick); return Number.isFinite(q) ? `${kcal(dishTotal(a.dpick.dish)[0] * q)} kcal` : 'Ange mängd'; }
  const p = a.pick, v = p.food.v[p.vi], g = pickGrams(p);
  return Number.isFinite(g) ? `${kcal(v.n[0] * g / 100)} kcal${p.unit !== 'g' && v.u ? ` · ≈ ${Math.round(g)} g` : ''}` : 'Ange mängd';
}
function redrawResults() {
  const box = document.getElementById('add-results');
  if (box) box.replaceChildren(...resultsList().filter(Boolean));
}
function addPost(p, c) {
  const l = (S.state.log[S.current] ??= []);
  if (l.length >= 100) { c.snackbar('Max 100 poster per dag', null, null, 3000); return false; }
  l.push(p); return true;
}
function logged(name, c) { S.add = null; c.buzz(); c.persist(); c.render(); c.snackbar(`${name} lades till`, null, null, 2500); }

export const click = {
  addopen: (t, c) => { S.open = null; openAdd('meal', t.dataset.id, c); },
  addclose: () => { S.add = null; return true; },
  addtab: (t, c) => { S.add.tab = S.lastTab = t.dataset.val; S.add.q = ''; S.add.pick = S.add.dpick = null; c.render(); document.getElementById('add-q')?.focus(); },
  showall: () => { S.add.all = true; redrawResults(); },
  pick: (t, c) => { const f = findRef(S.state, t.dataset.ref); if (!f) return; openPick(f); c.render(); document.getElementById('amount')?.select(); },
  variant: (t) => { S.add.pick.vi = Number(t.dataset.val); if (!S.add.pick.food.v[S.add.pick.vi].u && S.add.pick.unit !== 'g') { S.add.pick.unit = 'g'; S.add.pick.amount = '100'; } return true; },
  unit: (t) => { const p = S.add.pick, val = t.dataset.val; if (p.unit !== val) { p.unit = val; p.amount = val === 'g' ? '100' : '1'; } return true; },
  unpick: () => { S.add.pick = S.add.dpick = null; S.add.alias = false; return true; },
  addsave: (t, c) => {
    const p = S.add.pick, v = p.food.v[p.vi], g = pickGrams(p);
    if (!(g > 0 && g <= 10000)) { c.errText('add-error', 'Ange en mängd, t.ex. 150 g eller 2 dl.'); return; }
    const name = cleanText(v.label ? `${p.food.name}, ${v.label}` : p.food.name);
    if (S.add.target === 'dish') {
      if (S.dish.items.length >= 50) { c.errText('add-error', 'Max 50 ingredienser.'); return; }
      S.dish.items.push({ ref: v.ref, name, g: Math.round(g * 10) / 10, n: [...v.n] });
      S.add = null; return true;
    }
    const post = { id: uid(), m: S.add.meal, ref: v.ref, name, g: Math.round(g * 10) / 10, n: [...v.n] };
    if (p.unit !== 'g' && v.u) post.u = [v.u[0], Math.round(parseNum(p.amount) * 100) / 100];
    if (addPost(post, c)) logged(name, c);
  },
  relog: (t, c) => {
    const src = Object.values(S.state.log).flat().find((x) => x.id === t.dataset.id);
    if (!src) return;
    const post = { ...src, id: uid(), m: S.add.meal, n: [...src.n], ...(src.u ? { u: [...src.u] } : {}) };
    if (addPost(post, c)) logged(post.name, c);
  },
  aliasopen: (t, c) => { S.add.alias = !S.add.alias; c.render(); document.getElementById('alias-word')?.focus(); },
  aliassave: (t, c) => {
    const w = cleanText(document.getElementById('alias-word')?.value, 40).toLowerCase();
    if (!w || ['__proto__', 'constructor', 'prototype'].includes(w)) { c.errText('add-error', 'Skriv ett sökord.'); return; }
    if (Object.keys(S.state.aliases).length >= 1000 && !(w in S.state.aliases)) { c.errText('add-error', 'Max 1 000 sökord.'); return; }
    const p = S.add.pick;
    S.state.aliases[w] = p.food.v[p.vi].ref; S.add.alias = false; c.persist(); c.render();
    c.snackbar(`Sökordet "${w}" sparat`, null, null, 2500);
  },
  // Rätter: logga
  dpick: (t, c) => {
    const d = S.state.dishes.find((x) => x.id === t.dataset.id);
    if (!d) return;
    S.add.dpick = { dish: d, mode: 'port', amount: '1' };
    c.render(); document.getElementById('amount')?.select();
  },
  dmode: (t) => { const p = S.add.dpick, val = t.dataset.val; p.mode = val; p.amount = val === 'andel' ? '1/' + p.dish.portions : val === 'g' ? '300' : '1'; return true; },
  dquick: (t) => { S.add.dpick.amount = t.dataset.val; return true; },
  daddsave: (t, c) => {
    const p = S.add.dpick, q = dishQ(p);
    if (!Number.isFinite(q)) { c.errText('add-error', p.mode === 'andel' ? 'Ange en andel, t.ex. 1/5 eller 0,2.' : 'Ange en mängd större än 0.'); return; }
    const amount = p.mode === 'andel' ? q : parseNum(p.amount);
    const post = { id: uid(), m: S.add.meal, ref: 'r:' + p.dish.id, name: p.dish.name, q: Math.round(q * 10000) / 10000,
      n: dishTotal(p.dish).map((x) => Math.round(x * q * 1000) / 1000), u: [dishUnit(p), Math.round(amount * 100) / 100] };
    if (addPost(post, c)) logged(p.dish.name, c);
  },
};

export function onInput(t) {
  if (t.id === 'add-q' && S.add) { S.add.q = t.value; S.add.all = false; redrawResults(); }
  if (t.id === 'amount' && (S.add?.pick || S.add?.dpick)) {
    (S.add.pick || S.add.dpick).amount = t.value;
    document.getElementById('pick-sum').textContent = pickSumText();
  }
}
export function onEnter(ev, app) {
  if (ev.target.id === 'amount') { ev.preventDefault(); app.querySelector('[data-act="addsave"], [data-act="daddsave"]')?.click(); }
  if (ev.target.id === 'add-q') { ev.preventDefault(); app.querySelector('#add-results [data-act="pick"], #add-results [data-act="dpick"]')?.click(); }
}
