// Simple nutrition – data model, validation, food search, export/import. ES module; localStorage only (key sn.data).
// Food data comes from data/foods.js (classic script: FOODS_CORE, FOODS_MORE, FOODS_SOURCE), never from the network.
const KEY = 'sn.data';
import { validate as fdtValidate, defaults as fdtDefaults, importText as fdtImportText, OUTCOMES, dayResult, streak as fdtStreak, weekStats as fdtWeekStats, rangeRatio, longestStreak } from './habit-store.js';
export { OUTCOMES };
const FDT_APP = 'follow-diet-tracker';
// Settings for habits and training (same fields as follow-diet-tracker, minus slots = meals and weighDay).
const habitSettings = (x) => ({ reasons: x.reasons, successThreshold: x.successThreshold, planText: x.planText, workoutTypes: x.workoutTypes, workoutGoal: x.workoutGoal, gymGoal: x.gymGoal, cardioGoal: x.cardioGoal });
export const EXPORT_APP = 'simple-nutrition', EXPORT_FORMAT = 1;
export const MAX_IMPORT_CHARS = 2000000;
const LIM = { perDay: 100, days: 3650, dishes: 500, ingr: 50, foods: 1000, aliases: 1000, weights: 3650, meals: 10, goals: 100 };
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/, DATE_RE = /^\d{4}-\d{2}-\d{2}$/, REF_RE = /^[lburqp]:[A-Za-z0-9_.-]{1,40}$/;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
// Text from data or input: trim, strip control and bidi characters, cut to max length.
export function cleanText(v, max = 60) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g, '').trim().slice(0, max);
}
export function validDate(k) {
  if (typeof k !== 'string' || !DATE_RE.test(k) || k < '2000-01-01' || k > '2100-12-31') return false;
  const d = parseKey(k);
  return dateKey(d) === k;
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function defaults() {
  return {
    version: 1,
    goals: [{ from: '2000-01-01' }],                    // inget kalorimål från start (beslut 2026-11-10)
    meals: [{ id: 'm1', name: 'Frukost' }, { id: 'm2', name: 'Lunch' }, { id: 'm3', name: 'Mellanmål' }, { id: 'm4', name: 'Middag' }],
    log: {}, dishes: [], foods: [], aliases: Object.create(null), weights: {}, layout: {},
    backup: { remind: 'month', last: null, asked: null },   // v0.7.0: påminnelse om backup
    habits: {}, workouts: {}, settings: habitSettings(fdtDefaults().settings),
  };
}

// n = [kcal, prot, kolh, fett]. Foods: per 100 g (kcal ≤ 950, g ≤ 105 each and together; own products in the form: 900 and 100). Dish posts: total for the share (kcal ≤ 20000, g ≤ 2000, 3 decimals so edits do not drift).
function cleanN(n, dish = false) {
  if (!Array.isArray(n) || n.length !== 4) return null;
  if (!num(n[0], 0, dish ? 20000 : 950) || !n.slice(1).every((x) => num(x, 0, dish ? 2000 : 105))) return null;
  if (!dish && n[1] + n[2] + n[3] > 105) return null;   // margin: Livsmedelsverket has Matolja 902 kcal, 102 g
  return n.map((x) => Math.round(x * (dish ? 1000 : 10)) / (dish ? 1000 : 10));
}
function cleanUnit(u) {   // [unit name ≤ 10 chars, number]
  if (!Array.isArray(u) || u.length !== 2) return undefined;
  const name = cleanText(u[0], 10);
  return name && num(u[1], 0.01, 10000) ? [name, Math.round(u[1] * 100) / 100] : undefined;
}
function cleanPost(p) {
  if (!isObj(p) || !ID_RE.test(p.id) || !REF_RE.test(p.ref) || !ID_RE.test(p.m)) return null;
  const dish = p.ref.startsWith('r:') || p.ref.startsWith('q:');   // q: = Utemat (F3), n totalt som rätt-post
  const name = cleanText(p.name), n = cleanN(p.n, dish);
  if (!name || !n) return null;
  const out = { id: p.id, m: p.m, ref: p.ref, name, n };
  if (p.ref.startsWith('q:') && !QUICK_ADD.some((x) => 'q:' + x.id === p.ref)) return null;
  if (dish) { if (num(p.q, 0.0001, 50)) out.q = Math.round(p.q * 10000) / 10000; else return null; }
  else if (num(p.g, 0, 10000)) out.g = Math.round(p.g * 10) / 10;
  else return null;
  const u = cleanUnit(p.u);
  if (u) out.u = u;
  return out;
}
function cleanDish(d) {
  if (!isObj(d) || !ID_RE.test(d.id)) return null;
  const name = cleanText(d.name);
  if (!name || !num(d.portions, 1, 50) || !Array.isArray(d.items)) return null;
  const items = d.items.slice(0, LIM.ingr).map((it) => {
    if (!isObj(it) || !REF_RE.test(it.ref) || !num(it.g, 0, 10000)) return null;
    const nm = cleanText(it.name), n = cleanN(it.n);
    return nm && n ? { ref: it.ref, name: nm, g: it.g, n } : null;
  }).filter(Boolean);
  const out = { id: d.id, name, portions: d.portions, items };
  if (num(d.cooked, 1, 20000)) out.cooked = d.cooked;
  return out;
}
function cleanFood(f) {
  if (!isObj(f) || !ID_RE.test(f.id)) return null;
  const name = cleanText(f.name), n = cleanN(f.n);
  if (!name || !n) return null;
  const out = { id: f.id, name, n };
  const u = cleanUnit(f.u);
  if (u) out.u = u;
  return out;
}

// Untrusted object → valid state. Invalid parts are skipped, never thrown.
export function validate(raw) {
  const s = defaults();
  if (!isObj(raw)) return s;
  if (Array.isArray(raw.goals)) {
    // Kalorimålet är valfritt (beslut 2026-11-10): ett mål utan kcal = inget mål från det datumet.
    const g = raw.goals.filter((x) => isObj(x) && validDate(x.from)).slice(0, LIM.goals).map((x) => {
      const o = { from: x.from };
      if (num(x.kcal, 500, 10000)) o.kcal = Math.round(x.kcal);
      if (num(x.prot, 10, 500)) o.prot = Math.round(x.prot);
      if (num(x.kolh, 10, 1000)) o.kolh = Math.round(x.kolh);
      return o;
    }).sort((a, b) => (a.from < b.from ? -1 : 1));
    if (g.length) s.goals = g;
  }
  if (Array.isArray(raw.meals)) {
    const seen = new Set();
    const m = raw.meals.filter((x) => isObj(x) && ID_RE.test(x.id) && !seen.has(x.id) && seen.add(x.id) && cleanText(x.name, 40))
      .slice(0, LIM.meals).map((x) => ({ id: x.id, name: cleanText(x.name, 40) }));
    if (m.length) s.meals = m;
  }
  if (isObj(raw.log)) {
    for (const k of Object.keys(raw.log).filter(validDate).sort().slice(-LIM.days)) {
      if (!Array.isArray(raw.log[k])) continue;
      const day = raw.log[k].map(cleanPost).filter(Boolean).slice(0, LIM.perDay);
      if (day.length) s.log[k] = day;
    }
  }
  if (Array.isArray(raw.dishes)) s.dishes = raw.dishes.map(cleanDish).filter(Boolean).slice(0, LIM.dishes);
  if (Array.isArray(raw.foods)) s.foods = raw.foods.map(cleanFood).filter(Boolean).slice(0, LIM.foods);
  if (isObj(raw.aliases)) {
    let n = 0;
    for (const k of Object.keys(raw.aliases)) {
      const w = cleanText(k, 40).toLowerCase();
      if (!w || BAD_KEYS.has(w) || !REF_RE.test(raw.aliases[k]) || n >= LIM.aliases) continue;
      s.aliases[w] = raw.aliases[k]; n++;
    }
  }
  if (isObj(raw.backup)) {
    if (['week', 'month', 'off'].includes(raw.backup.remind)) s.backup.remind = raw.backup.remind;
    if (validDate(raw.backup.last)) s.backup.last = raw.backup.last;
    if (validDate(raw.backup.asked)) s.backup.asked = raw.backup.asked;
  }
  // Kortordning (v0.6.0): bara struktur valideras här; ui.js layoutOf() filtrerar mot kända kort-id:n.
  if (isObj(raw.layout)) {
    const ids = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && /^[a-z]{1,20}$/.test(x)).slice(0, 20) : []);
    for (const v of ['today', 'week', 'trend', 'history']) {
      if (isObj(raw.layout[v])) s.layout[v] = { order: ids(raw.layout[v].order), hidden: ids(raw.layout[v].hidden) };
    }
  }
  if (isObj(raw.weights)) {
    for (const k of Object.keys(raw.weights).filter(validDate).sort().slice(-LIM.weights)) {
      if (num(raw.weights[k], 20, 400)) s.weights[k] = Math.round(raw.weights[k] * 10) / 10;
    }
  }
  // Vanor, träning och deras inställningar: samma validering som i follow-diet-tracker (habit-store.js).
  const f = fdtValidate({ settings: { ...(isObj(raw.settings) ? raw.settings : {}), slots: s.meals }, days: raw.habits, weighIns: {}, workouts: raw.workouts });
  s.habits = f.days; s.workouts = f.workouts; s.settings = habitSettings(f.settings);
  return s;
}

export function load() {
  try { const t = localStorage.getItem(KEY); return t ? validate(JSON.parse(t)) : defaults(); } catch { return defaults(); }
}
export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

/* ---------- Dates ---------- */
const p2 = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
export function weekStart(k) { const d = parseKey(k); return addDays(k, -((d.getDay() + 6) % 7)); }
export function isoWeek(k) {
  const d = parseKey(k); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const y1 = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d - y1) / 864e5 - 3 + ((y1.getDay() + 6) % 7)) / 7);
}

/* ---------- Nutrition ---------- */
// Nutrients of a post: [kcal, prot, kolh, fett]. Food: n per 100 g × g. Dish share: n is the total for the share.
export function postN(p) {
  const f = p.g != null && !p.ref.startsWith('r:') && !p.ref.startsWith('q:') ? p.g / 100 : 1;
  return p.n.map((x) => x * f);
}
export function sumN(posts) {
  return posts.reduce((a, p) => { const n = postN(p); return a.map((x, i) => x + n[i]); }, [0, 0, 0, 0]);
}
export function goalFor(state, k) {
  let g = state.goals[0];
  for (const x of state.goals) if (x.from <= k) g = x;
  return g;
}
// Goal change from a day: replaces a goal starting the same day, keeps history.
export function setGoal(state, k, patch) {
  const cur = { ...goalFor(state, k) };
  const next = { ...cur, ...patch, from: k };
  for (const f of Object.keys(next)) if (next[f] === undefined) delete next[f];
  state.goals = state.goals.filter((g) => g.from !== k).concat(next).sort((a, b) => (a.from < b.from ? -1 : 1));
}
export function weekStats(state, ws) {
  const days = [];
  let sum = 0, logged = 0, within = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i), posts = state.log[k] || [];
    const kcal = Math.round(sumN(posts)[0]), goal = goalFor(state, k).kcal ?? null;
    days.push({ k, kcal, goal, logged: posts.length > 0 });
    if (posts.length) { sum += kcal; logged++; if (goal != null && kcal <= goal * 1.05) within++; }
  }
  // hasGoal: some day this week has a kcal goal – otherwise no "inom mål" is shown.
  return { days, logged, within, hasGoal: days.some((d) => d.goal != null), avg: logged ? Math.round(sum / logged) : null };
}

/* ---------- Food search (data/foods.js) ---------- */
let INDEX = null;
const refOf = (id) => (id.startsWith('b') ? 'b:' : 'l:') + id;
function index() {
  if (INDEX) return INDEX;
  const core = (typeof FOODS_CORE !== 'undefined' ? FOODS_CORE : []).map((f) => ({
    name: f.name, words: [f.name.toLowerCase(), ...(f.q || [])],
    v: f.v.map((v) => ({ label: v.l, ref: refOf(v.id), n: v.n, u: v.u, d: v.d })),
  }));
  // Schabloner (Del 2): ref p:<id>, undertext sub; visas före LV, ett exakt sökord döljer LV-raderna.
  const products = (typeof FOODS_PRODUCTS !== 'undefined' ? FOODS_PRODUCTS : []).map((f) => ({
    name: f.name, sub: f.sub, words: [f.name.toLowerCase(), ...(f.q || [])],
    v: f.v.map((v) => ({ label: v.l, ref: 'p:' + v.id, n: v.n, u: v.u, d: v.d })), product: true,
  }));
  const more = (typeof FOODS_MORE !== 'undefined' ? FOODS_MORE : []).map((r) => ({ name: r[1], words: [r[1].toLowerCase()], v: [{ label: '', ref: 'l:' + r[0], n: r.slice(2, 6) }], more: true }));
  return (INDEX = { core, products, more });
}
// Own products as foods (ref u:id).
const ownFoods = (state) => state.foods.map((f) => ({ name: f.name, words: [f.name.toLowerCase()], v: [{ label: '', ref: 'u:' + f.id, n: f.n, u: f.u }], own: true }));
function score(f, q) {
  let best = 0;
  for (const w of f.words) {
    if (w === q) return 3;
    if (w.startsWith(q)) best = Math.max(best, 2);
    else if (w.includes(q)) best = Math.max(best, 1);
  }
  return best;
}
// → { hits: [food], more: n } – core and own first; FOODS_MORE only when `all` (or no core hit).
export function searchFoods(state, text, all = false, max = 30) {
  const q = cleanText(text, 40).toLowerCase();
  if (!q) return { hits: [], more: 0 };
  const { core, products, more } = index();
  const rank = (list) => list.map((f) => [score(f, q), f]).filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length).map(([, f]) => f);
  // Ordning: egna sökord och produkter, schablon, LV. Schablon och LV visas båda; schablonen först.
  const first = [...rank(ownFoods(state)), ...rank(products), ...rank(core)];
  const alias = state.aliases[q] ? findRef(state, state.aliases[q]) : null;
  if (alias) { const i = first.indexOf(alias); if (i >= 0) first.splice(i, 1); first.unshift(alias); }
  const rest = rank(more);
  if (all || !first.length) return { hits: [...first, ...rest].slice(0, max), more: 0 };
  return { hits: first.slice(0, max), more: rest.length };
}
export function findRef(state, ref) {
  if (ref.startsWith('u:')) return ownFoods(state).find((f) => f.v[0].ref === ref) || null;
  const { core, products, more } = index();
  if (ref.startsWith('p:')) return products.find((f) => f.v.some((v) => v.ref === ref)) || null;
  return core.find((f) => f.v.some((v) => v.ref === ref)) || more.find((f) => f.v[0].ref === ref) || null;
}
// Recently logged (newest first), unique on ref + amount.
export function recent(state, max = 20) {
  const out = [], seen = new Set();
  for (const k of Object.keys(state.log).sort().reverse()) {
    for (const p of [...state.log[k]].reverse()) {
      const key = p.ref + '|' + (p.g ?? p.q);
      if (seen.has(key)) continue;
      seen.add(key); out.push(p);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/* ---------- Export / import (U5, STANDARD 5) ---------- */
// Text → { data, posts, weights, dishes, first, last, skipped, exported } or { error }. Saves nothing.
export function importText(text) {
  if (typeof text !== 'string' || !text.trim()) return { error: 'Klistra in en exporterad text först.' };
  if (text.length > MAX_IMPORT_CHARS) return { error: 'Texten är för lång (max 2 MB).' };
  let env;
  try { env = JSON.parse(text.replace(/^﻿/, '')); } catch { return { error: 'Texten är inte en giltig export (trasig JSON). Kopiera hela texten igen.' }; }
  if (isObj(env) && env.app === FDT_APP) return importFdt(text);
  if (!isObj(env) || env.app !== EXPORT_APP) return { error: 'Texten kommer inte från Simple nutrition eller Följ planen.' };
  if (env.format !== EXPORT_FORMAT) return { error: 'Okänt exportformat – uppdatera appen och försök igen.' };
  if (!isObj(env.data)) return { error: 'Exporten saknar data.' };
  const data = validate(env.data);
  const rawPosts = isObj(env.data.log) ? Object.values(env.data.log).reduce((n, d) => n + (Array.isArray(d) ? d.length : 0), 0) : 0;
  const posts = Object.values(data.log).reduce((n, d) => n + d.length, 0);
  const keys = [...Object.keys(data.log), ...Object.keys(data.weights)].sort();
  return { data, posts, weights: Object.keys(data.weights).length, dishes: data.dishes.length,
    first: keys[0] ?? null, last: keys[keys.length - 1] ?? null, skipped: Math.max(0, rawPosts - posts),
    exported: typeof env.exported === 'string' && DATE_RE.test(env.exported) ? env.exported : '' };
}

/* ---------- Dishes ---------- */
// Whole recipe: sum of ingredients (n per 100 g × g).
export const dishTotal = (d) => d.items.reduce((a, it) => a.map((x, i) => x + it.n[i] * it.g / 100), [0, 0, 0, 0]);
export function searchDishes(state, text) {
  const q = cleanText(text, 40).toLowerCase();
  return state.dishes.filter((d) => !q || d.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

/* ---------- Vanor (follow-diet-tracker's calculations on a view of this state) ---------- */
// The fdt functions read { settings: { slots, successThreshold, weighDay }, days, weighIns, workouts }.
export const habitView = (s) => ({ settings: { ...s.settings, slots: s.meals, weighDay: 1 }, days: s.habits, weighIns: s.weights, workouts: s.workouts });
export const habitDay = (s, k) => dayResult(habitView(s), k);
export const habitStreak = (s, k) => fdtStreak(habitView(s), k);
export const habitWeek = (s, ws) => fdtWeekStats(habitView(s), ws);
export const habitRange = (s, k, n) => rangeRatio(habitView(s), k, n);
export const habitLongest = (s) => longestStreak(habitView(s));

/* ---------- Import from follow-diet-tracker (Följ planen) ---------- */
// Text → { fdt: validated fdt state, meals, sessions, weighIns, first, last, skipped, exported } or { error }. Saves nothing.
function importFdt(text) {
  const r = fdtImportText(text);
  if (r.error) return r;
  return { ...r, fdt: r.data, data: null };
}
// Merges a validated fdt state into a copy of this app's state. Meals are matched by name (Frukost = Frukost);
// unknown meals are added (max 10). This app's own entries win on the same day; fdt fills the rest.
export function mergeFdt(state, f) {
  const s = validate(JSON.parse(JSON.stringify(state)));
  const map = new Map();
  for (const slot of f.settings.slots) {
    let m = s.meals.find((x) => x.name.toLowerCase() === slot.name.toLowerCase());
    if (!m && s.meals.length < 10 && !s.meals.some((x) => x.id === slot.id)) { m = { id: slot.id, name: cleanText(slot.name, 40) || 'Måltid' }; s.meals.push(m); }
    if (m) map.set(slot.id, m.id);
  }
  for (const [k, day] of Object.entries(f.days)) {
    const out = { ...(s.habits[k] || {}) };
    for (const [id, e] of Object.entries(day)) {
      const key = map.get(id) || id;
      if (!(key in out)) out[key] = e;
    }
    s.habits[k] = out;
  }
  for (const [k, w] of Object.entries(f.weighIns)) if (s.weights[k] == null) s.weights[k] = w;
  for (const [k, l] of Object.entries(f.workouts)) if (!s.workouts[k]) s.workouts[k] = l;
  s.settings = habitSettings(f.settings);
  return validate(s);
}

// Utemat (F3, 2026-11-10): tre snabbval när man äter ute och inte vet exakt. n = [kcal, protein, kolhydrater, fett] totalt (≈).
// v0.9 (2026-11-11): grupper Hemmagjort (home), Utemat (out) och Snacks (snack – bara i fusk). g = grupp, label = nivå.
export const QUICK_ADD = [
  { id: 'home-light', g: 'home', label: 'Lätt', name: 'Hemmagjort – Lätt', n: [450, 35, 35, 18], ex: 'Mager fisk/kyckling med grönt, omelett, tonfisksallad, mager färs' },
  { id: 'home-std', g: 'home', label: 'Standard', name: 'Hemmagjort – Standard', n: [650, 35, 70, 22], ex: 'Köttfärssås med pasta, lax med potatis/sås, kycklinggryta med ris, husman' },
  { id: 'home-heavy', g: 'home', label: 'Tung', name: 'Hemmagjort – Tung', n: [850, 40, 95, 32], ex: 'Stor portion pasta/färs, hemmagjord burgare m. klyftpotatis, lasagne' },
  { id: 'out-light', g: 'out', label: 'Lätt', name: 'Utemat – Lätt', n: [700, 30, 75, 30], ex: 'Halv pizza + sallad, burgare utan strips, sushi 10–12 bitar, matig sallad' },
  { id: 'out-std', g: 'out', label: 'Standard', name: 'Utemat – Standard', n: [1000, 40, 105, 45], ex: 'Hel hamburgermeny, dagens lunch, thaimat med ris, kebab i bröd' },
  { id: 'out-heavy', g: 'out', label: 'Tung', name: 'Utemat – Tung', n: [1400, 55, 140, 65], ex: 'Hel pizzeriapizza, kebabtallrik, dubbelburgare med strips, två rätter' },
  { id: 'snack-s', g: 'snack', label: 'Lite', name: 'Snacks – Lite', n: [250, 3, 27, 14], ex: 'En Magnum, en kanelbulle, Marabou 45 g (en rad), lösgodis 60 g, en näve nötter, två kakor' },
  { id: 'snack-m', g: 'snack', label: 'Mellan', name: 'Snacks – Mellan', n: [500, 6, 50, 30], ex: 'Halv chipspåse (175 g), Marabou 100 g, lösgodis 125 g, wienerbröd + läsk, halv glasskartong' },
  { id: 'snack-l', g: 'snack', label: 'Mycket', name: 'Snacks – Mycket', n: [950, 11, 95, 58], ex: 'Hel chipspåse (175 g), Marabou 175 g, lösgodis 250 g, chips + dipp, hel glasskartong' },
];
export const quickById = (ref) => QUICK_ADD.find((x) => 'q:' + x.id === ref);
// Nivåer i fusk styrs av orsaken: Snacks → snack, Utemat → out; i extra fusk annars home, på en måltid annars ingen.
export function quickGroup(reason, extra) {
  if (extra) return 'snack';   // v0.9.1: extra fusk = alltid snacks
  if (reason === 'snacks') return 'snack';
  if (reason === 'out-lunch') return 'out';
  return extra && reason ? 'home' : null;
}
// Fusknivå (v0.9) på måltid/extra `key`: samma nivå igen = ta bort, annan i gruppen = byt. Returnerar true om posten lades till.
export function setLevel(state, day, key, qid, newId) {
  const x = QUICK_ADD.find((o) => o.id === qid);
  if (!x) return false;
  const list = state.log[day] || [], had = list.some((p) => p.m === key && p.ref === 'q:' + x.id);
  const rest = list.filter((p) => !(p.m === key && quickById(p.ref)?.g === x.g));
  if (!had) {
    if (rest.length >= 100) return false;
    rest.push({ id: newId, m: key, ref: 'q:' + x.id, name: x.name, q: 1, n: [...x.n], u: ['st', 1] });
  }
  if (rest.length) state.log[day] = rest; else delete state.log[day];
  return !had;
}
// Tar bort fusknivåer på `key` som inte längre gäller: snacks på en måltid när orsaken inte är Snacks/fusket är borta;
// i extra fusk allt utom gruppen `keep` (null = allt). Utemat på en måltid tas aldrig bort (kan vara enligt plan).
export function dropLevels(state, day, key, keep) {
  const list = state.log[day];
  if (!list) return;
  const extra = key.startsWith('extra-');
  const rest = list.filter((p) => {
    if (p.m !== key) return true;
    const g = quickById(p.ref)?.g;
    if (!g) return true;
    return extra ? g === keep : g !== 'snack' || keep === 'snack';
  });
  if (rest.length) state.log[day] = rest; else delete state.log[day];
}

// Senast loggade post vars ref matchar (F1: förifyll mängd), eller null.
export function lastPost(state, match) {
  for (const k of Object.keys(state.log).sort().reverse()) {
    const list = state.log[k];
    for (let i = list.length - 1; i >= 0; i--) if (match(list[i].ref)) return list[i];
  }
  return null;
}

// F2 (2026-11-10): varje exportfil beskriver sitt format, så att någon annan (eller en AI) kan ändra filen och läsa in den igen.
// Samma regler som validate() ovan – ändras validate(), ändra här och i docs/DATA.md.
export const EXPORT_README = 'Backup från Simple nutrition. Ändra bara inom "data". Fältbeskrivningar i "schema", ett minimalt giltigt exempel i "example" (går att lägga i "data" och läsa in för sig). Ogiltiga poster hoppas över vid import, inget kraschar. Datum: ÅÅÅÅ-MM-DD. Näringsvärden n = [kcal, protein g, kolhydrater g, fett g]. id: A–Z a–z 0–9 _ -, högst 40 tecken.';
export const EXPORT_SCHEMA = {
  version: 'tal, 1',
  goals: 'lista { from: datum, kcal?: 500–10000, prot?: 10–500, kolh?: 10–1000 }, sorteras på from, mål utan kcal = inget kalorimål från det datumet, max 100',
  meals: 'lista { id, name ≤ 60 tecken }, 1–10 st',
  log: 'objekt datum → lista av poster, max 100 poster per dag och 3650 dagar',
  'post (vara)': '{ id, m: måltids-id, ref: "l:<livsmedel>" | "b:<beräknad>" | "u:<egen produkt-id>" | "p:<schablon-id>", name, g: gram 0–10000, n: per 100 g (kcal ≤ 950, övriga ≤ 105 var och tillsammans), u?: [mått, antal] }',
  'post (rätt)': '{ id, m, ref: "r:<rätt-id>", name, q: andel av satsen 0,0001–50, n: totalt för andelen (kcal ≤ 20000, gram ≤ 2000), u?: ["port." | "av satsen" | "g", mängd] }',
  'post (snabbval)': '{ id, m: måltids-id eller "extra-<n>" (extra fusk), ref: "q:<id i snabbval>", name, q: antal, n: totalt, u?: ["st", antal] }',
  dishes: 'lista { id, name, portions: 1–50, items: [{ ref, name, g, n per 100 g }] (max 50), cooked?: färdig vikt i gram 1–20000 }, max 500',
  foods: 'lista { id, name, n per 100 g, u?: [mått, gram per mått] }, egna produkter, max 1000',
  aliases: 'objekt sökord (gemener, ≤ 40 tecken) → ref, max 1000',
  weights: 'objekt datum → kg 20–400 (en decimal)',
  habits: 'objekt datum → { måltids-id | "extra-<n>": { outcome: "followed" | "cheat" | "skipped", reason?: orsaks-id, note?: ≤ 140 tecken } }',
  workouts: 'objekt datum → lista { types: [passtyp-id], km?, sec? }',
  settings: '{ reasons: [{ id, name }], successThreshold: 0,5–1, planText ≤ 300, workoutTypes: [{ id, name, kind: "gym" | "cardio" }], workoutGoal, gymGoal, cardioGoal }',
  layout: '{ today | week | trend | history: { order: [kort-id], hidden: [kort-id] } }, okända kort-id ignoreras',
  backup: '{ remind: "week" | "month" | "off", last?: datum, asked?: datum }',
  snabbval: QUICK_ADD.map((x) => `${x.id}: ${x.name}, ≈ ${x.n[0]} kcal`).join('; '),
};
export const EXPORT_EXAMPLE = {
  version: 1,
  goals: [{ from: '2026-11-01' }],
  meals: [{ id: 'm1', name: 'Frukost' }, { id: 'm2', name: 'Lunch' }],
  log: { '2026-11-10': [
    { id: 'p1', m: 'm1', ref: 'u:f1', name: 'Proteinbar X', g: 55, n: [380, 30, 35, 12], u: ['st', 1] },
    { id: 'p2', m: 'm2', ref: 'r:d1', name: 'Chili con carne', q: 0.2, n: [410, 32, 30, 16], u: ['av satsen', 0.2] },
    { id: 'p3', m: 'm2', ref: 'q:out-std', name: 'Utemat – Standard', q: 1, n: [1000, 40, 105, 45], u: ['st', 1] },
  ] },
  dishes: [{ id: 'd1', name: 'Chili con carne', portions: 5, items: [{ ref: 'u:f1', name: 'Proteinbar X', g: 500, n: [380, 30, 35, 12] }] }],
  foods: [{ id: 'f1', name: 'Proteinbar X', n: [380, 30, 35, 12], u: ['st', 55] }],
  aliases: { bar: 'u:f1' },
  weights: { '2026-11-10': 113 },
  habits: { '2026-11-10': { m1: { outcome: 'followed' }, m2: { outcome: 'cheat', reason: 'out-lunch', note: 'Jobbmiddag' } } },
  workouts: { '2026-11-10': [{ types: ['push', 'pull'] }] },
  layout: { week: { order: ['weight', 'habits', 'days', 'training', 'kcal'], hidden: [] } },
  backup: { remind: 'month', last: '2026-11-10' },
};
export function exportText(state, today) {
  const J = JSON.stringify;
  return `{\n "app": ${J(EXPORT_APP)},\n "format": ${EXPORT_FORMAT},\n "exported": ${J(today)},\n "appVersion": ${J(globalThis.APP_VERSION ?? null)},\n` +
    ` "readme": ${J(EXPORT_README)},\n "schema": ${J(EXPORT_SCHEMA, null, 1).replace(/\n/g, '\n ')},\n "example": ${J(EXPORT_EXAMPLE)},\n "data": ${J(state)}\n}\n`;
}
