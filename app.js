// Simple nutrition – no external calls, localStorage only. See CLAUDE.md. Views in views/*.js, shared state in ui.js.
import { defaults, load, save, validate, addDays, weekStart, setGoal, goalFor, findRef, cleanText, uid, dishTotal, exportText, importText, MAX_IMPORT_CHARS } from './store.js';
import { today, S, setOpen, el, kcal, shortDate, dateTitle, parseNum, wType, isCardio, parseDur, fmtNum, amountText, layoutOf, LAYOUT_VIEWS } from './ui.js';
import { mergeFdt, lastPost, QUICK_ADD, setLevel, dropLevels, quickGroup } from './store.js';
import { viewToday, dayPosts } from './views/today.js';
import { resultsList, pickGrams, pickSum, unitsOf, isBulk } from './views/add.js';
import { viewWeek } from './views/week.js';
import { viewTrend } from './views/trend.js';
import { viewHistory } from './views/history.js';
import { viewSettings } from './views/settings.js';
import { PLAN_MAX } from './fdt-store.js';
import { newDraft, draftFrom, dishQ, dishUnit, isBatch } from './views/dishes.js';

document.getElementById('version').textContent = 'v' + self.APP_VERSION;

let view = 'today';
const app = document.getElementById('app');
const tabbar = document.querySelector('.tabbar');
const buzz = () => navigator.vibrate?.(10);
const errText = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };

const cleanPlan = (v) => v.replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g, '').trim().slice(0, PLAN_MAX);
function persist() {
  if (!save(S.state)) status('Kunde inte spara – lagringen är full eller blockerad.', true);
  else if (saveFailed) updateOnline();
}

/* ---------- Status line (#status) – fixed texts only ---------- */
let saveFailed = false;
function status(text, isError = false) {
  const s = document.getElementById('status');
  s.textContent = text;
  s.classList.toggle('error', isError);
  saveFailed = isError;
}
function updateOnline() { status(navigator.onLine ? '' : 'Offline – allt fungerar ändå, data finns på enheten.'); }
addEventListener('online', updateOnline);
addEventListener('offline', updateOnline);
updateOnline();

/* ---------- Snackbar (undo, update) ---------- */
let snackTimer = null;
function snackbar(text, actionText, action, ms = 5000) {
  const bar = document.getElementById('snackbar'), btn = document.getElementById('snack-action');
  document.getElementById('snack-text').textContent = text;
  btn.hidden = !actionText;
  btn.textContent = actionText || '';
  btn.onclick = () => { bar.hidden = true; if (action) action(); };
  bar.hidden = false;
  clearTimeout(snackTimer);
  if (ms) snackTimer = setTimeout(() => { bar.hidden = true; }, ms);
}
function withUndo(label, change) {
  const before = JSON.stringify(S.state);
  change();
  persist();
  render();
  snackbar(label, 'Ångra', () => { S.state = validate(JSON.parse(before)); persist(); render(); });
}

/* ---------- Router (mobile only, see ../STIL.md) ---------- */
const VIEWS = { today: viewToday, week: () => viewWeek(), trend: viewTrend, history: viewHistory, settings: viewSettings };
function render() {
  app.dataset.view = view;
  const nodes = [view === 'trend' ? el('h1', { class: 'view-title', text: 'Trend' }) : null, VIEWS[view]()];
  app.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  for (const t of tabbar.querySelectorAll('[data-view]')) {
    const on = t.dataset.view === view;
    t.classList.toggle('on', on);
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  }
}
function go(v) {
  if (!VIEWS[v]) v = 'today';
  view = v;
  if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  render();
  scrollTo(0, 0);
}
// v0.6.4: vid dagbyte glöms utfällda måltider och 🍽 Mat – ifyllda måltider visas alltid hopfällda när man kommer till en dag.
const resetDay = () => {
  S.open = null; S.add = null;
  for (const k of [...setOpen]) if (k.startsWith('meal-') || k.startsWith('food-')) setOpen.delete(k);
};
tabbar.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-view]');
  if (!t) return;
  ev.preventDefault();
  if (t.dataset.view === 'today') { S.current = today(); resetDay(); }
  if (S.add?.target === 'dish') S.add = null;
  if (t.dataset.view !== 'settings') S.dish = null;
  go(t.dataset.view);
});

/* ---------- Editable lists in Inställningar ---------- */
const LIST_MAX = { meals: 10, reasons: 60, workoutTypes: 60 };
const listOf = (kind) => (kind === 'meals' ? S.state.meals : kind === 'reasons' || kind === 'workoutTypes' ? S.state.settings[kind] : null);
app.addEventListener('input', (ev) => {
  if (ev.target.dataset.act === 'threshold') { const o = document.getElementById('thr'); if (o) o.textContent = ev.target.value + ' %'; }
});

/* ---------- Posts ---------- */
const dayList = () => (S.state.log[S.current] ??= []);
function cleanupDay() { if (!dayPosts().length) delete S.state.log[S.current]; }
function addPost(p) {
  const l = dayList();
  if (l.length >= 100) { snackbar('Max 100 poster per dag', null, null, 3000); return false; }
  l.push(p); return true;
}
function logged(name) { if (String(S.add?.meal).startsWith('extra-')) S.xopen = null; S.add = null; buzz(); persist(); render(); snackbar(`${name} lades till`, null, null, 2500); }
function openAdd(target, meal) {
  const tab = target === 'dish' ? 'foods' : S.lastTab || (Object.keys(S.state.log).length ? 'recent' : 'foods');
  S.add = { target, meal, tab, q: '', all: false, pick: null, dpick: null, alias: false };
  render(); scrollTo(0, 0);
  document.getElementById('add-q')?.focus();
}
// F1: tal som går att skriva tillbaka i mängdfältet (komma, ingen tusenavgränsare).
const amt = (x) => x.toLocaleString('sv-SE', { maximumFractionDigits: 2, useGrouping: false });
function openPick(food) {
  const u0 = unitsOf(food.v[0])[0][0];
  S.add.pick = { food, vi: 0, unit: u0, amount: isBulk(u0) ? '100' : '1', last: null };
  // F1: förifyll med senast loggade mängd för samma vara (någon av dess varianter).
  const refs = food.v.map((v) => v.ref), lp = lastPost(S.state, (r) => refs.includes(r));
  if (lp && lp.g > 0) {
    const vi = refs.indexOf(lp.ref), us = unitsOf(food.v[vi]), byUnit = lp.u && us.find((x) => x[0] === lp.u[0]);
    const bulk = us[us.length - 1];   // g, or ml for liquids
    Object.assign(S.add.pick, { vi, unit: byUnit ? byUnit[0] : bulk[0], amount: amt(byUnit ? lp.u[1] : Math.round(lp.g / bulk[1])), last: amountText(lp) });
  }
}
// F1: rätt förifylls med senaste sättet den loggades på (portioner, andel eller gram).
function openDishPick(d) {
  S.add.dpick = { dish: d, mode: 'port', amount: '1', last: null };
  const lp = lastPost(S.state, (r) => r === 'r:' + d.id);
  if (!lp) return;
  const mode = { 'port.': 'port', 'av satsen': 'andel', g: 'g' }[lp.u?.[0]] || null;
  const ok = mode === 'port' || (mode === 'andel' && d.portions > 1) || (mode === 'g' && d.cooked);
  if (!ok) return;
  const a = lp.u[1], inv = mode === 'andel' ? Math.round(1 / a) : 0;
  Object.assign(S.add.dpick, { mode, amount: mode === 'andel' && inv > 1 && Math.abs(1 / inv - a) < 0.001 ? '1/' + inv : amt(a), last: amountText(lp) });
}
function pickSumText() {
  const a = S.add;
  if (a.dpick) { const q = dishQ(a.dpick); return Number.isFinite(q) ? `${kcal(dishTotal(a.dpick.dish)[0] * q)} kcal` : 'Ange mängd'; }
  return pickSum(a.pick);
}

/* ---------- Dishes ---------- */
function saveDish() {
  const d = S.dish, name = cleanText(d.name);
  const portions = d.batch ? Math.round(parseNum(d.portions)) : 1, cooked = d.cooked.trim() ? Math.round(parseNum(d.cooked)) : null;
  const err = !name ? 'Ge rätten ett namn.' : !d.items.length ? 'Lägg till minst en ingrediens.'
    : !(portions >= 1 && portions <= 50) ? 'Ange 2–50 portioner.' : cooked != null && !(cooked >= 1 && cooked <= 20000) ? 'Färdig vikt: 1–20 000 g, eller tomt.' : '';
  if (err) { errText('d-error', err); return; }
  const dish = { id: d.id || uid(), name, portions, items: d.items };
  if (cooked) dish.cooked = cooked;
  const i = S.state.dishes.findIndex((x) => x.id === dish.id);
  if (i >= 0) S.state.dishes[i] = dish; else S.state.dishes.push(dish);
  S.dish = null; persist(); render();
  snackbar(`${name} sparad`, null, null, 2500);
}

app.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const { act, id, val } = t.dataset;
  switch (act) {
    case 'prev': S.current = addDays(S.current, -1); resetDay(); break;
    case 'next': if (S.current < today()) S.current = addDays(S.current, 1); resetDay(); break;
    case 'today': S.current = today(); resetDay(); break;
    case 'popen': S.open = S.open === id ? null : id; break;
    case 'psave': {
      const p = dayPosts().find((x) => x.id === id);
      if (!p) return;
      const v = parseNum(document.getElementById('p-amount')?.value);
      if (p.q != null) {
        const base = p.u ? p.u[1] : p.q, q = p.q * v / base;
        if (!(v > 0 && q > 0 && q <= 50)) { errText('p-error', 'Ange en mängd större än 0.'); return; }
        p.n = p.n.map((x) => Math.round(x * q / p.q * 1000) / 1000); p.q = Math.round(q * 10000) / 10000;
        if (p.u) p.u = [p.u[0], Math.round(v * 100) / 100];
      } else {
        const g = p.u ? v * p.g / p.u[1] : v;   // measured posts (2 dl) keep their unit
        if (!(v > 0 && g > 0 && g <= 10000)) { errText('p-error', p.u ? 'Ange en mängd större än 0.' : 'Ange gram, t.ex. 150.'); return; }
        p.g = Math.round(g * 10) / 10;
        if (p.u) p.u = [p.u[0], Math.round(v * 100) / 100];
      }
      const m = document.getElementById('p-meal')?.value;
      if (S.state.meals.some((x) => x.id === m)) p.m = m;
      S.open = null; buzz(); persist(); break;
    }
    case 'pdel': {
      const p = dayPosts().find((x) => x.id === id);
      if (!p) return;
      withUndo(`${p.name} togs bort`, () => { S.state.log[S.current] = dayPosts().filter((x) => x.id !== id); cleanupDay(); S.open = null; });
      return;
    }
    case 'clearday':
      withUndo(`${dateTitle(S.current).replace(/^Igår · /, '')} rensad`, () => {
        for (const k of ['log', 'weights', 'habits', 'workouts']) delete S.state[k][S.current];
        S.open = null; S.wdraft = null;
      });
      return;
    // Vanor (som i follow-diet-tracker): tryck på valt utfall igen för att ta bort det.
    case 'outcome': {
      const day = (S.state.habits[S.current] ??= {}), prev = day[id];
      if (prev?.outcome === val && !id.startsWith('extra-')) { delete day[id]; if (!Object.keys(day).length) delete S.state.habits[S.current]; }
      else {
        const name = S.state.meals.find((m) => m.id === id)?.name ?? prev?.name;
        day[id] = { ...prev, outcome: val, ...(name ? { name } : {}) };
        if (val !== 'cheat') delete day[id].reason;
      }
      const e = S.state.habits[S.current]?.[id];
      dropLevels(S.state, S.current, id, e?.outcome === 'cheat' ? quickGroup(e.reason, id.startsWith('extra-')) : null);
      buzz(); persist(); break;
    }
    case 'reason': {
      const e = S.state.habits[S.current]?.[id];
      if (!e) return;
      if (e.reason === val) delete e.reason; else e.reason = val;
      dropLevels(S.state, S.current, id, quickGroup(e.reason, id.startsWith('extra-')));
      buzz(); persist(); break;
    }
    case 'level': {   // v0.9: kcal-nivå för fusk
      if (!S.state.habits[S.current]?.[id]) return;
      const added = setLevel(S.state, S.current, id, val, uid());
      if (id.startsWith('extra-')) S.xopen = added ? null : id;
      buzz(); persist(); break;
    }
    case 'remove': {
      const day = S.state.habits[S.current];
      if (!day?.[id]) return;
      withUndo('Extra fusk togs bort', () => { delete day[id]; if (!Object.keys(day).length) delete S.state.habits[S.current]; dropLevels(S.state, S.current, id, null); S.state.log[S.current] = dayPosts().filter((p) => p.m !== id); cleanupDay(); });
      return;
    }
    case 'extra': {
      const day = (S.state.habits[S.current] ??= {});
      if (Object.keys(day).length >= 20) { snackbar('Max 20 per dag', null, null, 3000); return; }
      const key = 'extra-' + Date.now();
      day[key] = { outcome: 'cheat', reason: 'snacks' };
      S.xopen = key;
      buzz(); persist(); break;
    }
    case 'xopen': S.xopen = S.xopen === id ? null : id; break;
    // Träning (som i follow-diet-tracker)
    case 'wnew': S.wdraft = { types: [] }; break;
    case 'wcancel': S.wdraft = null; break;
    case 'wtype': {
      if (!S.wdraft) return;
      const on = S.wdraft.types.includes(val), cardio = wType(val)?.kind === 'cardio';
      if (on) S.wdraft.types = S.wdraft.types.filter((x) => x !== val);
      else S.wdraft.types = cardio ? [val] : [...S.wdraft.types.filter((x) => !isCardio([x])), val];
      buzz(); break;
    }
    case 'wsave': {
      if (!S.wdraft?.types.length) return;
      const w = { types: [...S.wdraft.types] };
      if (isCardio(w.types)) {
        const kmRaw = document.getElementById('w-km')?.value.trim() ?? '', tRaw = document.getElementById('w-time')?.value.trim() ?? '';
        const km = parseNum(kmRaw), sec = tRaw ? parseDur(tRaw) : null;
        const err = (kmRaw && !(km > 0 && km <= 500)) ? 'Ange sträckan i km, t.ex. 5,2.' : (tRaw && sec == null) ? 'Ange tiden som min:sek, t.ex. 28:30.' : '';
        if (err) { errText('w-error', err); return; }
        if (kmRaw) w.km = Math.round(km * 100) / 100;
        if (sec != null) w.sec = sec;
      }
      const l = (S.state.workouts[S.current] ??= []);
      if (l.length >= 10) { errText('w-error', 'Max 10 pass per dag.'); return; }
      l.push(w); S.wdraft = null; buzz(); persist(); break;
    }
    case 'wdel': {
      const i = Number(val);
      withUndo('Träningspasset togs bort', () => {
        const l = S.state.workouts[S.current];
        if (!l) return;
        l.splice(i, 1);
        if (!l.length) delete S.state.workouts[S.current];
      });
      return;
    }
    case 'copyprev': {
      const src = S.state.log[addDays(S.current, -1)] || [];
      S.state.log[S.current] = src.slice(0, 100).map((p) => ({ ...p, id: uid() + Math.random().toString(36).slice(2, 5), n: [...p.n], ...(p.u ? { u: [...p.u] } : {}) }));
      buzz(); persist(); render(); snackbar(`${src.length} poster kopierade från igår`, 'Ångra', () => { delete S.state.log[S.current]; persist(); render(); });
      return;
    }
    case 'weightsave': {
      const v = parseNum(document.getElementById('weight')?.value);
      if (v >= 20 && v <= 400) S.state.weights[S.current] = Math.round(v * 10) / 10;
      else delete S.state.weights[S.current];
      persist(); break;
    }
    // Lägg till
    case 'addopen': S.open = null; openAdd('meal', id); return;
    case 'addclose': S.add = null; break;
    case 'addtab': S.add.tab = S.lastTab = val; S.add.q = ''; S.add.pick = S.add.dpick = null; render(); document.getElementById('add-q')?.focus(); return;
    case 'showall': S.add.all = true; redrawResults(); return;
    case 'pick': { const f = findRef(S.state, t.dataset.ref); if (!f) return; openPick(f); render(); return; }   // F1: inget tangentbord
    case 'variant': { const p = S.add.pick; p.vi = Number(val); const us = unitsOf(p.food.v[p.vi]);
      if (!us.some((x) => x[0] === p.unit)) { p.unit = us[0][0]; p.amount = isBulk(p.unit) ? '100' : '1'; } break; }
    case 'unit': {   // Steg B: byte av enhet räknar om talet
      const p = S.add.pick, x = unitsOf(p.food.v[p.vi]).find((u) => u[0] === val);
      if (!x || p.unit === val) break;
      const g = pickGrams(p); p.unit = val;
      p.amount = Number.isFinite(g) ? amt(isBulk(val) ? Math.round(g / x[1]) : Math.round(g / x[1] * 10) / 10) : isBulk(val) ? '100' : '1';
      break; }
    case 'unpick': S.add.pick = S.add.dpick = null; S.add.alias = false; break;
    case 'addsave': {
      const p = S.add.pick, v = p.food.v[p.vi], g = pickGrams(p);
      if (!(g > 0 && g <= 10000)) { errText('add-error', 'Ange en mängd, t.ex. 150 g eller 2 dl.'); return; }
      const name = cleanText(v.label ? `${p.food.name}, ${v.label}` : p.food.name);
      if (S.add.target === 'dish') {
        if (S.dish.items.length >= 50) { errText('add-error', 'Max 50 ingredienser.'); return; }
        S.dish.items.push({ ref: v.ref, name, g: Math.round(g * 10) / 10, n: [...v.n] });
        S.add = null; render(); return;
      }
      const post = { id: uid(), m: S.add.meal, ref: v.ref, name, g: Math.round(g * 10) / 10, n: [...v.n] };
      if (p.unit !== 'g') post.u = [p.unit,Math.round(parseNum(p.amount) * 100) / 100];
      if (addPost(post)) logged(name);
      return;
    }
    case 'quickg': S.quickG = val; redrawResults(); return;
    case 'quick': {   // F3: Utemat loggas direkt, n totalt som en rätt-post
      const x = QUICK_ADD.find((o) => o.id === id);
      if (!x || !S.add) return;
      const post = { id: uid(), m: S.add.meal, ref: 'q:' + x.id, name: x.name, q: 1, n: [...x.n], u: ['st', 1] };
      if (addPost(post)) logged(post.name);
      return;
    }
    case 'relog': {
      const src = Object.values(S.state.log).flat().find((x) => x.id === id);
      if (!src) return;
      const post = { ...src, id: uid(), m: S.add.meal, n: [...src.n], ...(src.u ? { u: [...src.u] } : {}) };
      if (addPost(post)) logged(post.name);
      return;
    }
    case 'aliasopen': S.add.alias = !S.add.alias; render(); document.getElementById('alias-word')?.focus(); return;
    case 'aliassave': {
      const w = cleanText(document.getElementById('alias-word')?.value, 40).toLowerCase();
      if (!w || ['__proto__', 'constructor', 'prototype'].includes(w)) { errText('add-error', 'Skriv ett sökord.'); return; }
      if (Object.keys(S.state.aliases).length >= 1000 && !(w in S.state.aliases)) { errText('add-error', 'Max 1 000 sökord.'); return; }
      const p = S.add.pick;
      S.state.aliases[w] = p.food.v[p.vi].ref; S.add.alias = false; persist(); render();
      snackbar(`Sökordet "${w}" sparat`, null, null, 2500);
      return;
    }
    // Rätter: logga
    case 'dpick': {
      const d = S.state.dishes.find((x) => x.id === id);
      if (!d) return;
      openDishPick(d);
      render(); return;
    }
    case 'dmode': { const p = S.add.dpick; p.mode = val; p.amount = val === 'andel' ? '1/' + p.dish.portions : val === 'g' ? '300' : '1'; break; }
    case 'dquick': S.add.dpick.amount = val; break;
    case 'daddsave': {
      const p = S.add.dpick, q = dishQ(p);
      if (!Number.isFinite(q)) { errText('add-error', p.mode === 'andel' ? 'Ange en andel, t.ex. 1/5 eller 0,2.' : 'Ange en mängd större än 0.'); return; }
      const amount = p.mode === 'andel' ? q : parseNum(p.amount);
      const post = { id: uid(), m: S.add.meal, ref: 'r:' + p.dish.id, name: p.dish.name, q: Math.round(q * 10000) / 10000,
        n: dishTotal(p.dish).map((x) => Math.round(x * q * 1000) / 1000), u: [dishUnit(p), Math.round(amount * 100) / 100] };
      if (addPost(post)) logged(p.dish.name);
      return;
    }
    // Rätter: editor
    case 'dnew': S.dish = newDraft(); render(); scrollTo(0, 0); document.getElementById('d-name')?.focus(); return;
    // Spara en måltid som rätt: varorna (i gram) blir ingredienser i en ny rätt "per portion" som öppnas i editorn.
    case 'mealdish': {
      const posts = dayPosts().filter((p) => p.m === id), foods = posts.filter((p) => p.g != null).slice(0, 50);
      if (!foods.length) return;
      const meal = S.state.meals.find((x) => x.id === id);
      S.dish = { ...newDraft(), batch: false, name: meal ? meal.name : '', items: foods.map((p) => ({ ref: p.ref, name: p.name, g: p.g, n: [...p.n] })) };
      S.open = null; go('settings');
      document.getElementById('d-name')?.select();
      if (foods.length < posts.length) snackbar('Rätter i måltiden kan inte ingå i en ny rätt och togs inte med', null, null, 4000);
      return;
    }
    case 'dedit': { const d = S.state.dishes.find((x) => x.id === id); if (!d) return; S.dish = draftFrom(d); render(); scrollTo(0, 0); return; }
    case 'dcancel': S.dish = null; break;
    case 'dper': S.dish.batch = false; break;
    case 'dbatch': S.dish.batch = true; break;
    case 'diadd': openAdd('dish', null); return;
    case 'didel': S.dish.items.splice(Number(val), 1); break;
    case 'dsave': saveDish(); return;
    case 'ddel': {
      const d = S.state.dishes.find((x) => x.id === S.dish.id);
      if (!d) return;
      withUndo(`${d.name} togs bort – loggade dagar finns kvar`, () => { S.state.dishes = S.state.dishes.filter((x) => x.id !== d.id); S.dish = null; });
      return;
    }
    // Egna produkter och sökord
    case 'fadd': {
      const name = cleanText(document.getElementById('f-name').value);
      const n = ['f-kcal', 'f-p', 'f-k', 'f-f'].map((i) => parseNum(document.getElementById(i).value));
      const unit = cleanText(document.getElementById('f-unit').value, 10), ug = parseNum(document.getElementById('f-ug').value);
      const err = !name ? 'Ange ett namn.' : !(n[0] >= 0 && n[0] <= 900) ? 'kcal per 100 g: 0–900.'
        : n.slice(1).some((x) => !(x >= 0 && x <= 100)) ? 'Protein, kolhydrater och fett: 0–100 g per 100 g.'
        : n[1] + n[2] + n[3] > 100.05 ? 'Protein, kolhydrater och fett får tillsammans vara högst 100 g.'
        : unit && !(ug > 0 && ug <= 10000) ? 'Ange gram per mått, eller lämna måttet tomt.' : '';
      if (err) { errText('f-error', err); return; }
      const f = { id: uid(), name, n: n.map((x) => Math.round(x * 10) / 10) };
      if (unit) f.u = [unit, Math.round(ug * 100) / 100];
      S.state.foods.push(f); persist(); render(); snackbar(`${name} sparad`, null, null, 2500);
      return;
    }
    case 'fdel': {
      const f = S.state.foods.find((x) => x.id === id);
      if (!f) return;
      withUndo(`${f.name} togs bort – loggade dagar finns kvar`, () => { S.state.foods = S.state.foods.filter((x) => x.id !== id); });
      return;
    }
    case 'adel': withUndo(`Sökordet "${val}" togs bort`, () => { delete S.state.aliases[val]; }); return;
    // Vecka, Trend, Historik
    case 'goto': S.current = val; resetDay(); go('today'); return;
    case 'openweek': S.week = val; go('week'); return;
    case 'wprev': S.week = addDays(S.week, -7); break;
    case 'wnext': if (S.week < weekStart(today())) S.week = addDays(S.week, 7); break;
    case 'wnow': S.week = weekStart(today()); break;
    case 'mprev': case 'mnext': {
      const [y, m] = S.month.split('-').map(Number);
      const d = new Date(y, m - 1 + (act === 'mprev' ? -1 : 1), 1, 12);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (k <= today().slice(0, 7)) S.month = k;
      break;
    }
    case 'mnow': S.month = today().slice(0, 7); break;
    // Inställningar: meals
    case 'add': {
      const kind = t.dataset.kind, l = listOf(kind);
      if (!l || l.length >= LIST_MAX[kind]) return;
      l.push(kind === 'workoutTypes' ? { id: 'wt' + uid(), name: 'Nytt pass', kind: 'gym' }
        : kind === 'reasons' ? { id: 'r' + uid(), name: 'Ny orsak' } : { id: 'm' + uid(), name: 'Ny måltid' });
      persist(); render();
      const inputs = app.querySelectorAll(`[data-act="rename"][data-kind="${kind}"]`);
      inputs[inputs.length - 1]?.select();
      return;
    }
    // Kortordning (v0.6.0)
    case 'lup': case 'ldown': {
      const v = t.dataset.kind, L = layoutOf(v), i = L.order.indexOf(id), j = act === 'lup' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= L.order.length) return;
      [L.order[i], L.order[j]] = [L.order[j], L.order[i]];
      (S.state.layout ||= {})[v] = L; persist(); break;
    }
    case 'lhide': {
      const v = t.dataset.kind, L = layoutOf(v), off = L.hidden.includes(id);
      if (!off && L.order.length - L.hidden.length <= 1) return;   // minst ett kort synligt
      L.hidden = off ? L.hidden.filter((x) => x !== id) : [...L.hidden, id];
      (S.state.layout ||= {})[v] = L; persist(); break;
    }
    case 'lresetall':
      withUndo('Standardordning återställd i alla vyer', () => { S.state.layout = {}; });
      return;
    case 'lreset': {
      const v = t.dataset.kind;
      withUndo(`Standardordning för ${LAYOUT_VIEWS[v]} återställd`, () => { if (S.state.layout) delete S.state.layout[v]; });
      return;
    }
    case 'up': {
      const l = listOf(t.dataset.kind), i = l ? l.findIndex((x) => x.id === id) : -1;
      if (i > 0) [l[i - 1], l[i]] = [l[i], l[i - 1]];
      persist(); break;
    }
    case 'del': {
      const kind = t.dataset.kind, l = listOf(kind), it = l?.find((x) => x.id === id);
      if (!it || (kind === 'meals' && l.length <= 1)) return;
      withUndo(`${it.name} togs bort – tidigare loggningar finns kvar`, () => {
        const ll = listOf(kind); ll.splice(ll.findIndex((x) => x.id === id), 1);
      });
      return;
    }
    // Spara-knappar i Inställningar (beslut 2026-11-10): kalorimål, protein/kolhydrater och Min plan sparas bara på knappen.
    case 'goalsave': {
      const raw = document.getElementById('g-kcal')?.value.trim() ?? '';
      if (!raw) { setGoal(S.state, today(), { kcal: undefined }); persist(); render(); snackbar('Inget kalorimål från idag', null, null, 3000); return; }
      const v = Math.round(parseNum(raw));
      if (!(v >= 500 && v <= 10000)) { snackbar('Ange ett mål mellan 500 och 10 000 kcal, eller tomt för inget mål', null, null, 3000); return; }
      setGoal(S.state, today(), { kcal: v }); persist(); render(); snackbar(`Kalorimål ${kcal(v)} kcal sparat från idag`, null, null, 3000);
      return;
    }
    case 'macrosave': {
      const patch = {};
      for (const [k, max] of [['prot', 500], ['kolh', 1000]]) {
        const raw = document.getElementById('g-' + k)?.value.trim() ?? '', v = Math.round(parseNum(raw));
        if (raw && !(v >= 10 && v <= max)) { snackbar(`Ange 10–${max} g, eller tomt för av`, null, null, 3000); return; }
        patch[k] = raw ? v : undefined;
      }
      setGoal(S.state, today(), patch); persist(); render(); snackbar('Målen sparade från idag', null, null, 3000);
      return;
    }
    case 'plansave': {
      S.state.settings.planText = cleanPlan(document.getElementById('plan-text')?.value ?? '');
      persist(); render(); snackbar('Planen sparad', null, null, 2500);
      return;
    }
    case 'install':
      S.installPrompt?.prompt();
      S.installPrompt?.userChoice.finally(() => { S.installPrompt = null; render(); });
      return;
    case 'wipe': document.getElementById('confirm-dialog').showModal(); return;
    case 'import': openImport(document.getElementById('import-text').value); return;
    case 'backupsave': saveBackup(); return;
    default: return;
  }
  render();
});

function redrawResults() {
  const box = document.getElementById('add-results');
  if (box) box.replaceChildren(...resultsList().filter(Boolean));
}
app.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'add-q' && S.add) { S.add.q = t.value; S.add.all = false; redrawResults(); }
  if (t.id === 'amount' && (S.add?.pick || S.add?.dpick)) {
    (S.add.pick || S.add.dpick).amount = t.value;
    document.getElementById('pick-sum').textContent = pickSumText();
  }
  if (t.dataset.act === 'dname' && S.dish) S.dish.name = t.value;
});
// v0.12.0: note and plan also save while typing (500 ms), since change may never fire when the phone is locked.
const typing = new Map();
app.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.act !== 'note' && t.id !== 'plan-text') return;
  clearTimeout(typing.get(t));
  typing.set(t, setTimeout(() => {
    typing.delete(t);
    if (t.id === 'plan-text') { S.state.settings.planText = cleanPlan(t.value); persist(); return; }
    const e = S.state.habits[t.dataset.day || S.current]?.[t.dataset.id];
    if (!e) return;
    const v = cleanText(t.value, 140);
    if (v) e.note = v; else delete e.note;
    persist();
  }, 500));
});
app.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  if (ev.target.id === 'amount') { ev.preventDefault(); app.querySelector('[data-act="addsave"], [data-act="daddsave"]')?.click(); }
  if (ev.target.id === 'add-q') { ev.preventDefault(); app.querySelector('#add-results [data-act="pick"], #add-results [data-act="dpick"]')?.click(); }
});
app.addEventListener('toggle', (ev) => {
  const d = ev.target;
  if (d instanceof HTMLDetailsElement && d.dataset.sec) { if (d.open) setOpen.add(d.dataset.sec); else setOpen.delete(d.dataset.sec); }
}, true);

app.addEventListener('change', (ev) => {
  const t = ev.target;
  switch (t.dataset.act) {
    case 'importfile': readBackup(t); return;
    case 'rename': {
      const it = listOf(t.dataset.kind)?.find((x) => x.id === t.dataset.id);
      const v = cleanText(t.value, 40);
      if (it && v) it.name = v; else t.value = it?.name ?? '';
      persist(); return;
    }
    case 'note': {
      const e = S.state.habits[t.dataset.day || S.current]?.[t.dataset.id];
      if (!e) return;
      const v = cleanText(t.value, 140);
      if (v) e.note = v; else delete e.note;
      persist(); return;
    }
    case 'bkremind': if (['week', 'month', 'off'].includes(t.value)) { S.state.backup.remind = t.value; S.state.backup.asked = null; persist(); } return;
    case 'threshold': S.state.settings.successThreshold = Number(t.value) / 100; persist(); return;
    case 'wgoal': {
      const k = t.dataset.val, v = Number(t.value);
      if (['workoutGoal', 'gymGoal', 'cardioGoal'].includes(k) && Number.isInteger(v) && v >= 0 && v <= 14) S.state.settings[k] = v;
      persist(); return;
    }
    case 'wkind': {
      const it = S.state.settings.workoutTypes.find((x) => x.id === t.dataset.id);
      if (it && (t.value === 'gym' || t.value === 'cardio')) it.kind = t.value;
      persist(); return;
    }
    case 'dname': if (S.dish) S.dish.name = t.value; return;
    case 'dport': if (S.dish) { S.dish.portions = t.value; render(); } return;
    case 'dcooked': if (S.dish) { S.dish.cooked = t.value; render(); } return;
    case 'dig': {
      const it = S.dish?.items[Number(t.dataset.val)], v = parseNum(t.value);
      if (it && v > 0 && v <= 10000) it.g = Math.round(v * 10) / 10;
      render(); return;
    }
  }
});

/* ---------- Export/import (U5) ---------- */
let pendingImport = null;
function startImport(text) {
  const r = importText(text);
  errText('import-error', '');
  if (r.error) { importError(r.error); return; }
  if (r.fdt) {
    // Från Följ planen: läggs ihop med det som redan finns här (inget ersätts), därför egen text.
    pendingImport = mergeFdt(S.state, r.fdt);
    const period = r.first ? `, ${shortDate(r.first)} ${r.first.slice(0, 4)}–${shortDate(r.last)} ${r.last.slice(0, 4)}` : '';
    document.getElementById('imp-title').textContent = 'Lägga till data från Följ planen?';
    document.getElementById('imp-sum').textContent = `${r.meals} måltider, ${r.weighIns} vägningar, ${r.sessions} träningspass${period}.`
      + ' Din plan, orsaker och passtyper tas över. Det du redan loggat här behålls.' + (r.skipped ? ` ${r.skipped} ogiltiga hoppas över.` : '');
    document.getElementById('imp-ok').textContent = 'Lägg till';
    document.getElementById('imp-note').textContent = 'Inget av det du redan har här tas bort. Du kan ångra direkt efteråt.';
    document.getElementById('import-dialog').showModal();
    return;
  }
  document.getElementById('imp-title').textContent = 'Ersätta all data?';
  document.getElementById('imp-ok').textContent = 'Ersätt';
  document.getElementById('imp-note').textContent = 'All nuvarande data i appen ersätts. Du kan ångra direkt efteråt.';
  pendingImport = r.data;
  const period = r.first ? `, ${shortDate(r.first)} ${r.first.slice(0, 4)}–${shortDate(r.last)} ${r.last.slice(0, 4)}` : '';
  document.getElementById('imp-sum').textContent = `${r.posts} poster, ${r.weights} vägningar, ${r.dishes} rätter${period}`
    + (r.exported ? `. Exporterad ${r.exported}.` : '.') + (r.skipped ? ` ${r.skipped} ogiltiga hoppas över.` : '');
  document.getElementById('import-dialog').showModal();
}
const BACKUP_MSG = {
  saved: 'Backup-filen sparades',
  busy: 'Ett sparfönster är redan öppet',
  declined: 'Ingen fil sparades',
  fallback: 'Backup-filen laddas ner',
  error: 'Kunde inte spara filen',
  nocrypto: 'Den här webbläsaren kan inte kryptera – ingen fil sparades',
};
async function saveBackup() {
  const r = await Backup.saveWithPassword({ slug: 'simple-nutrition', today: today(), text: exportText(S.state, today()) });
  if (r === 'saved' || r === 'fallback') {   // v0.7.0: kom ihåg senaste backup för påminnelsen
    S.state.backup.last = today(); S.state.backup.asked = null; persist();
    if (view === 'settings') render();
  }
  if (BACKUP_MSG[r]) snackbar(BACKUP_MSG[r], null, null, 4000);
}
/* ---------- Backup-påminnelse (v0.7.0) ---------- */
// Förfallen när det gått en vecka/månad sedan senaste backup (eller sedan första loggade dagen om ingen backup finns).
// "Inte nu" frågar igen om 3 dagar. Visas högst en gång per session och aldrig utan data.
let backupAsked = false;
function backupDue() {
  const b = S.state.backup, days = b.remind === 'week' ? 7 : b.remind === 'month' ? 30 : 0;
  if (!days) return false;
  const keys = [...Object.keys(S.state.log), ...Object.keys(S.state.habits), ...Object.keys(S.state.weights)].sort();
  if (!keys.length) return false;
  if (addDays(b.last || keys[0], days) > today()) return false;
  return !(b.asked && addDays(b.asked, 3) > today());
}
function maybeAskBackup() {
  if (backupAsked || S.add || S.dish || document.querySelector('dialog[open]') || !backupDue()) return;
  backupAsked = true;
  const last = S.state.backup.last;
  document.getElementById('bk-sum').textContent = last
    ? `Senaste backup: ${shortDate(last)}. Spara en ny så att du inte tappar din data.`
    : 'Du har inte sparat någon backup än. Spara en så att du inte tappar din data.';
  document.getElementById('backup-dialog').showModal();
}
document.getElementById('bk-ok').addEventListener('click', () => { saveBackup(); });
document.getElementById('bk-later').addEventListener('click', () => { S.state.backup.asked = today(); persist(); });
// 2026-11-12: the error is scrolled into view (in an artifact the page can be taller than the screen).
function importError(msg) {
  errText('import-error', msg);
  try { document.getElementById('import-error')?.scrollIntoView({ block: 'center' }); } catch { /* old browser */ }
}
async function readBackup(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  // Read before the field is cleared: some mobile browsers drop access to the chosen file when the input is reset.
  let r;
  try { r = await Backup.read(file, MAX_IMPORT_CHARS); } catch { r = { error: 'Kunde inte läsa filen.' }; }
  input.value = '';
  if (r.error) { importError(r.error); return; }
  openImport(r.text);
}
// Encrypted backup (U5, 2026-11-11): an envelope asks for the password, then the same checks as plain text.
async function openImport(text) {
  const r = await Backup.openText(text, 'simple-nutrition', MAX_IMPORT_CHARS);
  if (r.cancelled) return;
  if (r.error) { importError(r.error); return; }
  startImport(r.text);
}
document.getElementById('imp-ok').addEventListener('click', () => {
  const next = pendingImport;
  pendingImport = null;
  if (!next) return;
  if (!save(next)) { status('Kunde inte spara – lagringen är full eller blockerad. Inget ändrades.', true); return; }
  const before = S.state;
  S.state = next; S.current = today(); resetDay(); S.dish = null;
  render();
  snackbar('Data importerad', 'Ångra', () => { S.state = before; persist(); render(); });
});
document.getElementById('cd-ok').addEventListener('click', () => {
  S.state = defaults(); persist(); S.current = today(); resetDay(); S.dish = null; render();
  snackbar('All data är raderad', null, null, 3000);
});

/* ---------- Swipe, install, refresh, service worker ---------- */
const SWIPE = { today: ['prev', 'next'], week: ['wprev', 'wnext'], history: ['mprev', 'mnext'] };
let touchX = null, touchY = null;
document.addEventListener('touchstart', (e) => {
  const t = e.target.closest('input, textarea, select, .tabbar, dialog');
  touchX = t || e.touches.length > 1 ? null : e.touches[0].clientX;
  touchY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (touchX == null || !SWIPE[view] || S.add) return;
  const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
  touchX = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  app.querySelector(`[data-act="${SWIPE[view][dx < 0 ? 1 : 0]}"]`)?.click();
});
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installPrompt = e; if (view === 'settings') render(); });

// Hidden: blur the text field so change saves it. Visible: move to the new day after midnight, reload (not after the file
// picker, while adding/editing or while a text field still has focus), then ask about backup.
let filePick = false;
app.addEventListener('click', (ev) => { if (ev.target.id === 'import-file') filePick = true; }, true);
const typingField = () => document.activeElement?.matches?.('textarea, input:is([type=text], [type=search], :not([type]))') ? document.activeElement : null;
S.lastToday = today();
// v0.12.0: the open day/week/month follows today past midnight, unless the user has browsed elsewhere.
function rollDay() {
  const now = today(), was = S.lastToday;
  if (now === was) return false;
  if (S.current === was) { S.current = now; resetDay(); }
  if (S.week === weekStart(was)) S.week = weekStart(now);
  if (S.month === was.slice(0, 7)) S.month = now.slice(0, 7);
  S.lastToday = now;
  return true;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') { typingField()?.blur(); return; }
  if (filePick) { filePick = false; return; }
  if (!typingField()) {
    const rolled = rollDay();
    if (!S.add && !S.dish) { S.state = load(); render(); } else if (rolled) render();
  }
  setTimeout(maybeAskBackup, 300);
});
setInterval(() => {
  if (document.visibilityState !== 'visible' || typingField() || today() === S.lastToday) return;
  rollDay(); render();
}, 60000);

go(location.hash.slice(1));
setTimeout(maybeAskBackup, 800);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* app still works */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) snackbar('Ny version finns', 'Ladda om', () => location.reload(), 0);
  });
}
