// Simple nutrition – data model, validation, food search, export/import. ES module; localStorage only (key sn.data).
// Food data comes from data/foods.js (classic script: FOODS_CORE, FOODS_MORE, FOODS_SOURCE), never from the network.
const KEY = 'sn.data';
import { validate as fdtValidate, defaults as fdtDefaults, importText as fdtImportText, OUTCOMES, dayResult, streak as fdtStreak, weekStats as fdtWeekStats, rangeRatio, longestStreak } from './fdt-store.js';
export { OUTCOMES };
const FDT_APP = 'follow-diet-tracker';
// Settings for habits and training (same fields as follow-diet-tracker, minus slots = meals and weighDay).
const habitSettings = (x) => ({ reasons: x.reasons, successThreshold: x.successThreshold, planText: x.planText, workoutTypes: x.workoutTypes, workoutGoal: x.workoutGoal, gymGoal: x.gymGoal, cardioGoal: x.cardioGoal });
export const EXPORT_APP = 'simple-nutrition', EXPORT_FORMAT = 1;
export const MAX_IMPORT_CHARS = 2000000;
const LIM = { perDay: 100, days: 3650, dishes: 500, ingr: 50, foods: 1000, aliases: 1000, weights: 3650, meals: 10, goals: 100 };
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/, DATE_RE = /^\d{4}-\d{2}-\d{2}$/, REF_RE = /^[lbur]:[A-Za-z0-9_.-]{1,40}$/;
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
    goals: [{ from: '2000-01-01', kcal: 2000 }],
    meals: [{ id: 'm1', name: 'Frukost' }, { id: 'm2', name: 'Lunch' }, { id: 'm3', name: 'Mellanmål' }, { id: 'm4', name: 'Middag' }],
    log: {}, dishes: [], foods: [], aliases: Object.create(null), weights: {},
    habits: {}, workouts: {}, settings: habitSettings(fdtDefaults().settings),
  };
}

// n = [kcal, prot, kolh, fett]. Foods: per 100 g (kcal ≤ 9000, g ≤ 100). Dish posts: total for the share (kcal ≤ 20000, g ≤ 2000).
function cleanN(n, dish = false) {
  if (!Array.isArray(n) || n.length !== 4) return null;
  if (!num(n[0], 0, dish ? 20000 : 9000) || !n.slice(1).every((x) => num(x, 0, dish ? 2000 : 100))) return null;
  return n.map((x) => Math.round(x * 10) / 10);
}
function cleanUnit(u) {   // [unit name ≤ 10 chars, number]
  if (!Array.isArray(u) || u.length !== 2) return undefined;
  const name = cleanText(u[0], 10);
  return name && num(u[1], 0.01, 10000) ? [name, Math.round(u[1] * 100) / 100] : undefined;
}
function cleanPost(p) {
  if (!isObj(p) || !ID_RE.test(p.id) || !REF_RE.test(p.ref) || !ID_RE.test(p.m)) return null;
  const dish = p.ref.startsWith('r:');
  const name = cleanText(p.name), n = cleanN(p.n, dish);
  if (!name || !n) return null;
  const out = { id: p.id, m: p.m, ref: p.ref, name, n };
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
    const g = raw.goals.filter((x) => isObj(x) && validDate(x.from) && num(x.kcal, 500, 10000)).slice(0, LIM.goals).map((x) => {
      const o = { from: x.from, kcal: Math.round(x.kcal) };
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
  if (isObj(raw.weights)) {
    for (const k of Object.keys(raw.weights).filter(validDate).sort().slice(-LIM.weights)) {
      if (num(raw.weights[k], 20, 400)) s.weights[k] = Math.round(raw.weights[k] * 10) / 10;
    }
  }
  // Vanor, träning och deras inställningar: samma validering som i follow-diet-tracker (fdt-store.js).
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
  const f = p.g != null && !p.ref.startsWith('r:') ? p.g / 100 : 1;
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
  state.goals = state.goals.filter((g) => g.from !== k).concat(next).sort((a, b) => (a.from < b.from ? -1 : 1));
}
export function weekStats(state, ws) {
  const days = [];
  let sum = 0, logged = 0, within = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i), posts = state.log[k] || [];
    const kcal = Math.round(sumN(posts)[0]), goal = goalFor(state, k).kcal;
    days.push({ k, kcal, goal, logged: posts.length > 0 });
    if (posts.length) { sum += kcal; logged++; if (kcal <= goal * 1.05) within++; }
  }
  return { days, logged, within, avg: logged ? Math.round(sum / logged) : null };
}

/* ---------- Food search (data/foods.js) ---------- */
let INDEX = null;
const refOf = (id) => (id.startsWith('b') ? 'b:' : 'l:') + id;
function index() {
  if (INDEX) return INDEX;
  const core = (typeof FOODS_CORE !== 'undefined' ? FOODS_CORE : []).map((f) => ({
    name: f.name, words: [f.name.toLowerCase(), ...(f.q || [])],
    v: f.v.map((v) => ({ label: v.l, ref: refOf(v.id), n: v.n, u: v.u })),
  }));
  const more = (typeof FOODS_MORE !== 'undefined' ? FOODS_MORE : []).map((r) => ({ name: r[1], words: [r[1].toLowerCase()], v: [{ label: '', ref: 'l:' + r[0], n: r.slice(2, 6) }], more: true }));
  return (INDEX = { core, more });
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
  const { core, more } = index();
  const rank = (list) => list.map((f) => [score(f, q), f]).filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length).map(([, f]) => f);
  const first = rank([...ownFoods(state), ...core]);
  const alias = state.aliases[q] ? findRef(state, state.aliases[q]) : null;
  if (alias && !first.includes(alias)) first.unshift(alias);
  const rest = rank(more);
  if (all || !first.length) return { hits: [...first, ...rest].slice(0, max), more: 0 };
  return { hits: first.slice(0, max), more: rest.length };
}
export function findRef(state, ref) {
  if (ref.startsWith('u:')) return ownFoods(state).find((f) => f.v[0].ref === ref) || null;
  const { core, more } = index();
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
export function exportText(state, today) {
  return JSON.stringify({ app: EXPORT_APP, format: EXPORT_FORMAT, exported: today, data: state });
}
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
