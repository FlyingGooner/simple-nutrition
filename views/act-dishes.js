// Handlers: Rätter – editorn och "spara måltid som rätt". Each returns true when the view should be redrawn.
import { cleanText, uid } from '../store.js';
import { S, parseNum } from '../ui.js';
import { dayPosts } from './today.js';
import { newDraft, draftFrom } from './dishes.js';
import { openAdd } from './act-add.js';

function saveDish(c) {
  const d = S.dish, name = cleanText(d.name);
  const portions = d.batch ? Math.round(parseNum(d.portions)) : 1, cooked = d.cooked.trim() ? Math.round(parseNum(d.cooked)) : null;
  const err = !name ? 'Ge rätten ett namn.' : !d.items.length ? 'Lägg till minst en ingrediens.'
    : !(portions >= 1 && portions <= 50) ? 'Ange 2–50 portioner.' : cooked != null && !(cooked >= 1 && cooked <= 20000) ? 'Färdig vikt: 1–20 000 g, eller tomt.' : '';
  if (err) { c.errText('d-error', err); return; }
  const dish = { id: d.id || uid(), name, portions, items: d.items };
  if (cooked) dish.cooked = cooked;
  const i = S.state.dishes.findIndex((x) => x.id === dish.id);
  if (i >= 0) S.state.dishes[i] = dish; else S.state.dishes.push(dish);
  S.dish = null; c.persist(); c.render();
  c.snackbar(`${name} sparad`, null, null, 2500);
}

export const click = {
  dnew: (t, c) => { S.dish = newDraft(); c.render(); scrollTo(0, 0); document.getElementById('d-name')?.focus(); },
  // Spara en måltid som rätt: varorna (i gram) blir ingredienser i en ny rätt "per portion" som öppnas i editorn.
  mealdish: (t, c) => {
    const id = t.dataset.id, posts = dayPosts().filter((p) => p.m === id), foods = posts.filter((p) => p.g != null).slice(0, 50);
    if (!foods.length) return;
    const meal = S.state.meals.find((x) => x.id === id);
    S.dish = { ...newDraft(), batch: false, name: meal ? meal.name : '', items: foods.map((p) => ({ ref: p.ref, name: p.name, g: p.g, n: [...p.n] })) };
    S.open = null; c.go('settings');
    document.getElementById('d-name')?.select();
    if (foods.length < posts.length) c.snackbar('Rätter i måltiden kan inte ingå i en ny rätt och togs inte med', null, null, 4000);
  },
  dedit: (t, c) => { const d = S.state.dishes.find((x) => x.id === t.dataset.id); if (!d) return; S.dish = draftFrom(d); c.render(); scrollTo(0, 0); },
  dcancel: () => { S.dish = null; return true; },
  dper: () => { S.dish.batch = false; return true; },
  dbatch: () => { S.dish.batch = true; return true; },
  diadd: (t, c) => openAdd('dish', null, c),
  didel: (t) => { S.dish.items.splice(Number(t.dataset.val), 1); return true; },
  dsave: (t, c) => saveDish(c),
  ddel: (t, c) => {
    const d = S.state.dishes.find((x) => x.id === S.dish.id);
    if (!d) return;
    c.withUndo(`${d.name} togs bort – loggade dagar finns kvar`, () => { S.state.dishes = S.state.dishes.filter((x) => x.id !== d.id); S.dish = null; });
  },
};

export const change = {
  dname: (t) => { if (S.dish) S.dish.name = t.value; },
  dport: (t, c) => { if (S.dish) { S.dish.portions = t.value; c.render(); } },
  dcooked: (t, c) => { if (S.dish) { S.dish.cooked = t.value; c.render(); } },
  dig: (t, c) => {
    const it = S.dish?.items[Number(t.dataset.val)], v = parseNum(t.value);
    if (it && v > 0 && v <= 10000) it.g = Math.round(v * 10) / 10;
    c.render();
  },
};
