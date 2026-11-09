// Import from follow-diet-tracker (Följ planen): an unchanged copy of its store.js validation and unpacking, so a backup from
// that app is read exactly as the app itself reads it. load()/save() are removed – this file never touches localStorage.
// Used only by importText() in store.js. Source: archive/follow-diet-tracker/store.js (v1.6.3, arkiverad 2026-11-10).

export const OUTCOMES = {
  followed: { icon: '✅', label: 'Följde', score: 1 },
  cheat: { icon: '🍰', label: 'Fusk', score: 0 },
  skipped: { icon: '⏭️', label: 'Hoppade över', score: null },
};

export function defaults() {
  return {
    version: 1,
    settings: {
      slots: [
        { id: 'breakfast', name: 'Frukost' },
        { id: 'lunch', name: 'Lunch' },
        { id: 'snack', name: 'Mellanmål' },
        { id: 'dinner', name: 'Middag' },
      ],
      successThreshold: 0.8,
      planText: '',
      weighDay: 1,
      reasons: [
        { id: 'out-lunch', name: 'Utemat' },
        { id: 'invited', name: 'Bortbjuden' },
        { id: 'stress', name: 'Stress/tidsbrist' },
        { id: 'craving', name: 'Sug' },
        { id: 'social', name: 'Socialt' },
        { id: 'snacks', name: 'Snacks' },
        { id: 'other', name: 'Annat' },
      ],
      reasonsV: 3,
      workoutTypes: [
        { id: 'push', name: 'Push', kind: 'gym' },
        { id: 'pull', name: 'Pull', kind: 'gym' },
        { id: 'legs', name: 'Ben', kind: 'gym' },
        { id: 'intervals', name: 'Intervaller', kind: 'cardio' },
        { id: 'run', name: 'Löpning', kind: 'cardio' },
      ],
      workoutGoal: 0,                              // sessions per week, 0 = no goal
      gymGoal: 0,                                  // gym sessions per week, 0 = no goal
      cardioGoal: 0,                               // cardio sessions per week, 0 = no goal
    },
    days: {},
    weighIns: {},
    workouts: {},
  };
}

// Validation: saved data is untrusted. Wrong types fall back to defaults, invalid entries are dropped.
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// Control and text-direction characters are dropped from all strings (misleading display, U5). Line breaks stay.
const CTRL_RE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u061C\u200E\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g;
const str = (v, max) => (typeof v === 'string' ? v.replace(CTRL_RE, '').slice(0, max) : '');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;          // slot/reason/entry ids – same rule as budget-buddy
const validId = (id) => typeof id === 'string' && ID_RE.test(id) && id !== '__proto__';
const MAX_LIST = 60;                             // slots, reasons
const MAX_PER_DAY = 20;                          // entries per day
const dict = () => Object.create(null);          // maps keyed by data (days, entries, weigh-ins): no prototype
// Dates outside 2000–2100 are dropped: day-by-day loops (longestStreak, allWeeks) would otherwise freeze the app
// on a crafted import such as "0100-01-01" + "9999-12-31" – and the bad data would be saved and freeze every load.
const MIN_DATE = '2000-01-01', MAX_DATE = '2100-12-31';
function validDate(k) {
  if (!DATE_RE.test(k) || k < MIN_DATE || k > MAX_DATE) return false;
  const d = parseKey(k);
  return !Number.isNaN(d.getTime()) && dateKey(d) === k;
}

function cleanList(v, fallback) {
  if (!Array.isArray(v)) return fallback;
  const out = v.filter(isObj)
    .map((x) => ({ id: str(x.id, 40), name: str(x.name, 60) }))
    .filter((x, i, a) => validId(x.id) && a.findIndex((y) => y.id === x.id) === i)
    .slice(0, MAX_LIST);
  return out.length ? out : fallback;
}

// Workout types: { id, name, kind: 'gym' | 'cardio' }. Gym types can be combined in one session; cardio has km + time.
const KINDS = ['gym', 'cardio'];
function cleanTypes(v, fallback) {
  if (!Array.isArray(v)) return fallback;
  const out = v.filter(isObj)
    .map((x) => ({ id: str(x.id, 40), name: str(x.name, 60), kind: KINDS.includes(x.kind) ? x.kind : 'gym' }))
    .filter((x, i, a) => validId(x.id) && a.findIndex((y) => y.id === x.id) === i)
    .slice(0, MAX_LIST);
  return out;
}
const goalNum = (v) => (Number.isInteger(v) && v >= 0 && v <= 14 ? v : 0);
const MAX_SESSIONS = 10;                         // workout sessions per day
function cleanSession(w) {
  if (!isObj(w) || !Array.isArray(w.types)) return null;
  const types = [...new Set(w.types.filter(validId))].slice(0, 10);
  if (!types.length) return null;
  const out = { types };
  if (Number.isFinite(w.km) && w.km > 0 && w.km <= 500) out.km = Math.round(w.km * 100) / 100;
  if (Number.isInteger(w.sec) && w.sec > 0 && w.sec <= 86400) out.sec = w.sec;
  return out;
}

function cleanEntry(e) {
  if (!isObj(e) || typeof e.outcome !== 'string') return null;
  const outcome = e.outcome === 'deviated' ? 'cheat' : e.outcome;   // v1.0: "Avvek" removed, old entries become "Fusk"
  if (!Object.hasOwn(OUTCOMES, outcome)) return null;
  const out = { outcome };
  // v1.1: "at" (time stamp) is no longer kept – it was never read.
  for (const [f, max] of [['reason', 40], ['note', 140], ['name', 60], ['label', 60]]) {
    if (typeof e[f] === 'string') out[f] = str(e[f], max);
  }
  return out;
}

export function validate(data) {
  const d = defaults();
  if (!isObj(data)) return d;
  const s = isObj(data.settings) ? data.settings : {};
  const t = s.successThreshold;
  const settings = {
    slots: cleanList(s.slots, d.settings.slots),
    reasons: cleanList(s.reasons, d.settings.reasons),
    successThreshold: Number.isFinite(t) && t >= 0 && t <= 1 ? t : d.settings.successThreshold,
    planText: str(s.planText, 2000),
    weighDay: Number.isInteger(s.weighDay) && s.weighDay >= 0 && s.weighDay <= 6 ? s.weighDay : d.settings.weighDay,
    reasonsV: 3,
    workoutTypes: cleanTypes(s.workoutTypes, d.settings.workoutTypes),
    workoutGoal: goalNum(s.workoutGoal),
    gymGoal: goalNum(s.gymGoal),
    cardioGoal: goalNum(s.cardioGoal),
  };
  // One-time updates of older saved reason lists (settings.reasonsV). User removals/renames are kept.
  const rv = Number.isInteger(s.reasonsV) ? s.reasonsV : 1;
  if (rv < 2 && !settings.reasons.some((r) => r.id === 'snacks')) {   // v2: add "Snacks" before "Annat"
    const i = settings.reasons.findIndex((r) => r.id === 'other');
    settings.reasons.splice(i < 0 ? settings.reasons.length : i, 0, { id: 'snacks', name: 'Snacks' });
  }
  if (rv < 3) {                                                         // v3: default "Utelunch" → "Utemat"
    const r = settings.reasons.find((x) => x.id === 'out-lunch' && x.name === 'Utelunch');
    if (r) r.name = 'Utemat';
  }
  settings.reasons = settings.reasons.slice(0, MAX_LIST);               // the migration above may add one
  const days = dict();
  if (isObj(data.days)) {
    for (const [k, entries] of Object.entries(data.days)) {
      if (!validDate(k) || !isObj(entries)) continue;
      const day = dict();
      for (const [id, e] of Object.entries(entries)) {
        if (Object.keys(day).length >= MAX_PER_DAY) break;
        const c = cleanEntry(e);
        if (c && validId(id)) day[id] = c;
      }
      if (Object.keys(day).length) days[k] = day;
    }
  }
  const weighIns = dict();
  if (isObj(data.weighIns)) {
    for (const [k, w] of Object.entries(data.weighIns)) {
      if (validDate(k) && Number.isFinite(w) && w >= 20 && w <= 400) weighIns[k] = w;
    }
  }
  const workouts = dict();
  if (isObj(data.workouts)) {
    for (const [k, list] of Object.entries(data.workouts)) {
      if (!validDate(k) || !Array.isArray(list)) continue;
      const day = list.map(cleanSession).filter(Boolean).slice(0, MAX_SESSIONS);
      if (day.length) workouts[k] = day;
    }
  }
  return { version: 1, settings, days, weighIns, workouts };
}

// ---------- Export/import as text (U5, shared standard: format level 1 = slim JSON in an envelope) ----------
const EXPORT_APP = 'follow-diet-tracker';
const EXPORT_FORMAT = 1;
export const MAX_IMPORT_CHARS = 2000000;
const CODE = { followed: 'f', cheat: 'c', skipped: 's' };
const UNCODE = { f: 'followed', c: 'cheat', s: 'skipped' };

// Validated state → slim: no defaults, outcome as one letter, an entry with only an outcome becomes "f"/"c"/"s",
// and the saved slot name is left out when it equals the current slot's name.
function packData(state) {
  const d = defaults().settings, s = state.settings, out = {}, set = {};
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(s.slots, d.slots)) set.slots = s.slots;
  if (!same(s.reasons, d.reasons)) set.reasons = s.reasons;
  if (s.successThreshold !== d.successThreshold) set.successThreshold = s.successThreshold;
  if (s.planText) set.planText = s.planText;
  if (s.weighDay !== d.weighDay) set.weighDay = s.weighDay;
  if (!same(s.workoutTypes, d.workoutTypes)) set.workoutTypes = s.workoutTypes;
  for (const g of ['workoutGoal', 'gymGoal', 'cardioGoal']) if (s[g]) set[g] = s[g];
  if (Object.keys(set).length) out.settings = set;
  const slotName = new Map(s.slots.map((x) => [x.id, x.name]));
  const days = {};
  for (const k of Object.keys(state.days).sort()) {
    const day = {};
    for (const [id, e] of Object.entries(state.days[k])) {
      const o = { o: CODE[e.outcome] };
      if (e.reason) o.r = e.reason;
      if (e.note) o.n = e.note;
      if (e.label) o.l = e.label;
      if (e.name && e.name !== slotName.get(id)) o.name = e.name;
      day[id] = Object.keys(o).length === 1 ? o.o : o;
    }
    days[k] = day;
  }
  if (Object.keys(days).length) out.days = days;
  if (Object.keys(state.weighIns).length) out.weighIns = Object.fromEntries(Object.entries(state.weighIns).sort());
  // Workouts: a session with only types becomes "push,pull"; otherwise { t, k (km), s (seconds) }.
  const w = {};
  for (const k of Object.keys(state.workouts || {}).sort()) {
    w[k] = state.workouts[k].map((x) => {
      const o = { t: x.types.join(',') };
      if (x.km != null) o.k = x.km;
      if (x.sec != null) o.s = x.sec;
      return Object.keys(o).length === 1 ? o.t : o;
    });
  }
  if (Object.keys(w).length) out.workouts = w;
  return out;
}

// Slim → full shape. New objects from known keys only; validate() then checks everything.
function unpackData(p) {
  if (!isObj(p)) return null;
  const s = isObj(p.settings) ? p.settings : {};
  const settings = { slots: s.slots, reasons: s.reasons, successThreshold: s.successThreshold, planText: s.planText, weighDay: s.weighDay, reasonsV: 3, workoutTypes: s.workoutTypes, workoutGoal: s.workoutGoal, gymGoal: s.gymGoal, cardioGoal: s.cardioGoal };
  const slots = Array.isArray(s.slots) ? s.slots : defaults().settings.slots;
  const slotName = new Map(slots.filter(isObj).map((x) => [x.id, x.name]));
  const days = {};
  let count = 0;
  if (isObj(p.days)) {
    for (const [k, entries] of Object.entries(p.days)) {
      if (!isObj(entries)) continue;
      const day = {};
      for (const [id, v] of Object.entries(entries)) {
        count++;
        const o = typeof v === 'string' ? { o: v } : isObj(v) ? v : {};
        const e = { outcome: Object.hasOwn(UNCODE, o.o) ? UNCODE[o.o] : null, reason: o.r, note: o.n, label: o.l, name: o.name ?? slotName.get(id) };
        if (Object.hasOwn(day, id) || id === '__proto__') continue;
        day[id] = e;
      }
      if (k !== '__proto__') days[k] = day;
    }
  }
  const workouts = {};
  if (isObj(p.workouts)) {
    for (const [k, list] of Object.entries(p.workouts)) {
      if (k === '__proto__' || !Array.isArray(list)) continue;
      workouts[k] = list.map((v) => {
        const o = typeof v === 'string' ? { t: v } : isObj(v) ? v : {};
        return { types: typeof o.t === 'string' ? o.t.split(',') : [], km: o.k, sec: o.s };
      });
    }
  }
  return { raw: { version: 1, settings, days, weighIns: isObj(p.weighIns) ? p.weighIns : {}, workouts }, count };
}

export function exportText(state, today) {
  return JSON.stringify({ app: EXPORT_APP, format: EXPORT_FORMAT, exported: today, data: packData(state) });   // compact: the file and the text box hold the same text
}

// Text → { data, meals, weighIns, first, last, skipped, exported } or { error }. Saves nothing.
export function importText(text) {
  if (typeof text !== 'string' || !text.trim()) return { error: 'Klistra in en exporterad text först.' };
  if (text.length > MAX_IMPORT_CHARS) return { error: 'Texten är för lång (max 2 MB).' };
  let env;
  try { env = JSON.parse(text); } catch { return { error: 'Texten är inte en giltig export (trasig JSON). Kopiera hela texten igen.' }; }
  if (!isObj(env) || env.app !== EXPORT_APP) return { error: 'Texten kommer inte från Följ planen.' };
  if (env.format !== EXPORT_FORMAT) return { error: 'Okänt exportformat – uppdatera appen och försök igen.' };
  const u = unpackData(env.data);
  if (!u) return { error: 'Exporten saknar data.' };
  const data = validate(u.raw);
  const keys = [...Object.keys(data.days), ...Object.keys(data.weighIns)].sort();
  const meals = Object.values(data.days).reduce((n, d) => n + Object.keys(d).length, 0);
  const sessions = Object.values(data.workouts).reduce((n, d) => n + d.length, 0);
  return { data, meals, sessions, weighIns: Object.keys(data.weighIns).length, first: keys[0] ?? null, last: keys[keys.length - 1] ?? null,
    skipped: Math.max(0, u.count - meals), exported: typeof env.exported === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(env.exported) ? env.exported : '' };
}

export function dateKey(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Returns { score, count, ratio } for a day; ratio is null when nothing counted. */
export function dayResult(state, k) {
  let score = 0, count = 0;
  for (const e of Object.values(state.days[k] || {})) {
    const s = OUTCOMES[e.outcome]?.score;
    if (s == null) continue;
    score += s;
    count++;
  }
  return { score, count, ratio: count ? score / count : null };
}

export function isSuccess(state, k) {
  const { ratio } = dayResult(state, k);
  return ratio != null && ratio >= state.settings.successThreshold;
}

/** Consecutive successful days ending today (today only counts if already successful). */
export function streak(state, today) {
  let n = 0;
  let k = isSuccess(state, today) ? today : addDays(today, -1);
  while (isSuccess(state, k)) { n++; k = addDays(k, -1); }
  return n;
}

export const WEEKDAYS = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

/** Monday of the ISO week containing k. */
export function weekStart(k) {
  const d = parseKey(k);
  return addDays(k, -((d.getDay() + 6) % 7));
}

export function isoWeek(k) {
  const d = parseKey(k);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

/** The weigh-in date that closes the week starting ws (first weigh day after Sunday). */
export function weighDateFor(state, ws) {
  return addDays(ws, 7 + ((state.settings.weighDay + 6) % 7));
}

export function weekStats(state, ws) {
  const s = { ws, followed: 0, cheat: 0, extraCheat: 0, skipped: 0, score: 0, count: 0, reasons: {}, days: [] };
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i);
    for (const [id, e] of Object.entries(state.days[k] || {})) {
      if (e.outcome === 'cheat' && id.startsWith('extra-')) s.extraCheat++;
      else if (s[e.outcome] != null) s[e.outcome]++;
      if (e.reason) s.reasons[e.reason] = (s.reasons[e.reason] || 0) + 1;
    }
    const r = dayResult(state, k);
    s.score += r.score; s.count += r.count;
    s.days.push({ k, ratio: r.ratio });
  }
  s.ratio = s.count ? s.score / s.count : null;
  s.sessions = 0;
  for (let i = 0; i < 7; i++) s.sessions += (state.workouts?.[addDays(ws, i)] || []).length;
  s.weighDate = weighDateFor(state, ws);
  s.extraWeights = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i), v = state.weighIns[k];
    if (v != null && k !== s.weighDate && k !== addDays(s.weighDate, -7)) s.extraWeights.push([k, v]);
  }
  s.weight = state.weighIns[s.weighDate] ?? null;
  const prev = state.weighIns[addDays(s.weighDate, -7)];
  s.change = s.weight != null && prev != null ? Math.round((s.weight - prev) * 10) / 10 : null;
  return s;
}

/** Adherence over the n days ending at k. */
export function rangeRatio(state, k, n) {
  let score = 0, count = 0;
  for (let i = 0; i < n; i++) {
    const r = dayResult(state, addDays(k, -i));
    score += r.score; count += r.count;
  }
  return count ? score / count : null;
}

export function longestStreak(state) {
  const keys = Object.keys(state.days).sort();
  if (!keys.length) return 0;
  let best = 0, run = 0;
  for (let k = keys[0], end = keys[keys.length - 1]; k <= end; k = addDays(k, 1)) {
    run = isSuccess(state, k) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function firstDataKey(state) {
  const all = [...Object.keys(state.days), ...Object.keys(state.weighIns), ...Object.keys(state.workouts || {})].sort();
  return all[0] ?? null;
}
