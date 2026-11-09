// Shared UI state and helpers for app.js and views/*.js. Rendering only via el()/svg() (Trusted Types).
import { load, dateKey, parseKey, addDays, weekStart } from './store.js';

export const today = () => dateKey(new Date());
// Mutable UI state shared by all views (one object, so modules see changes).
export const S = {
  state: load(),
  current: today(),          // Idag: selected day
  open: null,                // Idag: expanded post id
  add: null,                 // Lägg till: { meal, tab, q, all, pick: { food, vi, unit, amount } } or null
  dish: null,                // Inställningar: dish draft being edited (views/dishes.js) or null
  week: weekStart(today()),  // Vecka: selected week (Monday)
  month: today().slice(0, 7),// Historik: YYYY-MM
  installPrompt: null,
};
export const setOpen = new Set();   // Inställningar: open sections (data-sec), kept across re-renders
export const fmtNum = (n, d = 1) => n.toLocaleString('sv-SE', { maximumFractionDigits: d });
export const kcal = (n) => Math.round(n).toLocaleString('sv-SE');
export const shortDate = (k) => parseKey(k).toLocaleDateString('sv-SE', { day: 'numeric', month: 'numeric' });
export const mealName = (id) => S.state.meals.find((m) => m.id === id)?.name ?? 'Övrigt';
export const parseNum = (t) => { const v = parseFloat(String(t ?? '').replace(',', '.').trim()); return Number.isFinite(v) ? v : NaN; };

/* ---------- DOM helpers (textContent + setAttribute only – Trusted Types, same as the other apps) ---------- */
export function el(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'class') n.className = v;
    else if (k === 'value' && (tag === 'input' || tag === 'textarea')) n.value = v;
    else if (/^(on|style$|href$|src$|srcset$|action$|formaction$|xlink:href$)/i.test(k)) throw new Error('el: unsafe attribute ' + k);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) n.append(c);
  return n;
}
export function svg(tag, attrs = {}, ...children) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (/^(on|style$|href$|src$|xlink:href$)/i.test(k)) throw new Error('svg: unsafe attribute ' + k);
    n.setAttribute(k, String(v));
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) n.append(c);
  return n;
}
export const stepper = (label, prev, mid, next, nextDisabled, title, titleKids, cls) => el('nav', { class: 'stepper' + (cls ? ' ' + cls : ''), 'aria-label': label },
  el('button', { class: 'icon', 'data-act': prev[0], 'aria-label': prev[1], text: '◀' }),
  el('button', { class: 'step-title', 'data-act': mid }, title, titleKids),
  el('button', { class: 'icon', 'data-act': next[0], 'aria-label': next[1], disabled: nextDisabled, text: '▶' }));
export const stat = (value, ...label) => el('div', { class: 'stat' }, el('span', { class: 'stat-n', text: value }), el('span', {}, label));

export function dateTitle(k) {
  const s = parseKey(k).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' });
  const t = s.charAt(0).toUpperCase() + s.slice(1);
  if (k === addDays(today(), -1)) return `Igår · ${t}`;
  return t;
}
// Amount text for a post: "2 dl · 206 g", "120 g", "¼ portion".
export function amountText(p) {
  if (p.q != null) return p.u ? `${fmtNum(p.u[1], 2)} ${p.u[0]}` : `${fmtNum(p.q, 2)} av receptet`;
  const g = fmtNum(p.g, 0) + ' g';
  return p.u ? `${fmtNum(p.u[1], 2)} ${p.u[0]} · ≈ ${g}` : g;
}
