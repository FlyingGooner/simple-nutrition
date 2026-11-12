// Shared UI state and helpers for app.js and views/*.js. Rendering only via el()/svg() (Trusted Types).
import { load, dateKey, parseKey, addDays, weekStart } from './store.js';

export const today = () => dateKey(new Date());
// Mutable UI state shared by all views (one object, so modules see changes).
export const S = {
  state: load(),
  current: today(),          // Idag: selected day
  open: null,                // Idag: expanded post id
  add: null,                 // Lägg till: { meal, tab, q, all, pick: { food, vi, unit, amount } } or null
  xopen: null,               // Idag: extra fusk som visas öppet (nivåval)
  wdraft: null,              // Idag: workout being added { types: [] } or null
  dish: null,                // Inställningar: dish draft being edited (views/dishes.js) or null
  week: weekStart(today()),  // Vecka: selected week (Monday)
  month: today().slice(0, 7),// Historik: YYYY-MM
  installPrompt: null,
};
export const setOpen = new Set();   // Inställningar: open sections (data-sec), kept across re-renders
export const fmtNum = (n, d = 1) => n.toLocaleString('sv-SE', { maximumFractionDigits: d });
export const kcal = (n) => Math.round(n).toLocaleString('sv-SE');
export const shortDate = (k) => parseKey(k).toLocaleDateString('sv-SE', { day: 'numeric', month: 'numeric' });
export const mealName = (id) => S.state.meals.find((m) => m.id === id)?.name ?? (String(id).startsWith('extra-') ? 'Extra' : 'Övrigt');
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

/* ---------- Vanor och träning (from follow-diet-tracker/ui.js) ---------- */
export const pct = (r) => (r == null ? '–' : Math.round(r * 100) + ' %');
export const reasonName = (id) => S.state.settings.reasons.find((r) => r.id === id)?.name ?? 'Borttagen orsak';
export const wType = (id) => S.state.settings.workoutTypes.find((t) => t.id === id);
export const wName = (id) => wType(id)?.name ?? 'Borttaget pass';
export const isCardio = (types) => types.some((id) => wType(id)?.kind === 'cardio');
export function fmtDur(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), ss = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
// "28:30" → 1710, "1:05:00" → 3900, "28" → 1680 (minutes). Invalid → null.
export function parseDur(t) {
  const parts = String(t).trim().split(/[:.]/).map((x) => x.trim());
  if (!parts[0] || parts.some((x) => !/^\d{1,3}$/.test(x)) || parts.length > 3) return null;
  const n = parts.map(Number);
  const sec = n.length === 1 ? n[0] * 60 : n.length === 2 ? n[0] * 60 + n[1] : n[0] * 3600 + n[1] * 60 + n[2];
  return sec > 0 && sec <= 86400 ? sec : null;
}
// { all, gym, cardio } sessions Mon–Sun. A session is cardio if it has a cardio type, otherwise gym.
export function weekSessions(ws) {
  const c = { all: 0, gym: 0, cardio: 0 };
  for (let i = 0; i < 7; i++) {
    for (const w of S.state.workouts[addDays(ws, i)] || []) { c.all++; c[isCardio(w.types) ? 'cardio' : 'gym']++; }
  }
  return c;
}
// Active goals: [{ key, label, short, goal, n }]
export function goals(ws) {
  const s = S.state.settings, c = weekSessions(ws);
  return [['workoutGoal', 'Träningspass', 'Pass', c.all], ['gymGoal', 'Gympass', 'Gym', c.gym], ['cardioGoal', 'Konditionspass', 'Kond.', c.cardio]]
    .filter(([k]) => s[k]).map(([key, label, short, n]) => ({ key, label, short, goal: s[key], n }));
}
export function sessionText(w) {
  const parts = [w.types.map(wName).join(' + ')];
  if (w.km != null) parts.push(fmtNum(w.km) + ' km');
  if (w.sec != null) parts.push(fmtDur(w.sec));
  return parts.join(' · ');
}

// Egen kortordning per vy (v0.6.0). Id:n är fasta; S.state.layout[vy] = { order, hidden }.
// Okända id:n ignoreras, nya kort (senare versioner) läggs sist, så sparad ordning går aldrig sönder.
export const LAYOUT = {
  today: [['plan', 'Min plan'], ['meals', 'Måltider'], ['train', 'Träning och extra fusk'], ['score', 'Dagens följsamhet'], ['kcal', 'Kalorier'], ['weight', 'Vikt']],
  week: [['weight', 'Vikt'], ['habits', 'Vanor'], ['days', 'Dag för dag'], ['training', 'Träning'], ['kcal', 'Kalorier']],
  trend: [['weight', 'Vikt och kurva'], ['weeks', 'Vecka för vecka'], ['compare', 'Vad hänger ihop']],
  history: [['weight', 'Vikt och följsamhet'], ['calendar', 'Kalender'], ['more', 'Träning och kcal']],
};
export const LAYOUT_VIEWS = { today: 'Idag', week: 'Vecka', trend: 'Trend', history: 'Historik' };
export function layoutOf(v) {
  const def = LAYOUT[v].map(([id]) => id), L = S.state.layout?.[v] || {};
  const order = (L.order || []).filter((id, i, a) => def.includes(id) && a.indexOf(id) === i);
  def.forEach((id) => { if (!order.includes(id)) order.push(id); });
  return { order, hidden: (L.hidden || []).filter((id) => def.includes(id)) };
}
// map: { id: () => node } – bara synliga kort byggs.
export function arrange(v, map) {
  const { order, hidden } = layoutOf(v);
  return order.filter((id) => !hidden.includes(id) && map[id]).map((id) => map[id]());
}
