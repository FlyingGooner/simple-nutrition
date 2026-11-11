// Handlers: Idag – dagbyte, poster, vanor, träning, vikt. Each returns true when the view should be redrawn.
import { addDays, uid, cleanText } from '../store.js';
import { today, S, dateTitle, parseNum, wType, isCardio, parseDur } from '../ui.js';
import { dayPosts } from './today.js';

const cleanupDay = () => { if (!dayPosts().length) delete S.state.log[S.current]; };

export const click = {
  prev: (t, c) => { S.current = addDays(S.current, -1); c.resetDay(); return true; },
  next: (t, c) => { if (S.current < today()) S.current = addDays(S.current, 1); c.resetDay(); return true; },
  today: (t, c) => { S.current = today(); c.resetDay(); return true; },
  popen: (t) => { S.open = S.open === t.dataset.id ? null : t.dataset.id; return true; },
  psave: (t, c) => {
    const p = dayPosts().find((x) => x.id === t.dataset.id);
    if (!p) return;
    const v = parseNum(document.getElementById('p-amount')?.value);
    if (p.q != null) {
      const base = p.u ? p.u[1] : p.q, q = p.q * v / base;
      if (!(v > 0 && q > 0 && q <= 50)) { c.errText('p-error', 'Ange en mängd större än 0.'); return; }
      p.n = p.n.map((x) => Math.round(x * q / p.q * 1000) / 1000); p.q = Math.round(q * 10000) / 10000;
      if (p.u) p.u = [p.u[0], Math.round(v * 100) / 100];
    } else {
      const g = p.u ? v * p.g / p.u[1] : v;   // measured posts (2 dl) keep their unit
      if (!(v > 0 && g > 0 && g <= 10000)) { c.errText('p-error', p.u ? 'Ange en mängd större än 0.' : 'Ange gram, t.ex. 150.'); return; }
      p.g = Math.round(g * 10) / 10;
      if (p.u) p.u = [p.u[0], Math.round(v * 100) / 100];
    }
    const m = document.getElementById('p-meal')?.value;
    if (S.state.meals.some((x) => x.id === m)) p.m = m;
    S.open = null; c.buzz(); c.persist(); return true;
  },
  pdel: (t, c) => {
    const id = t.dataset.id, p = dayPosts().find((x) => x.id === id);
    if (!p) return;
    c.withUndo(`${p.name} togs bort`, () => { S.state.log[S.current] = dayPosts().filter((x) => x.id !== id); cleanupDay(); S.open = null; });
  },
  clearday: (t, c) => c.withUndo(`${dateTitle(S.current).replace(/^Igår · /, '')} rensad`, () => {
    for (const k of ['log', 'weights', 'habits', 'workouts']) delete S.state[k][S.current];
    S.open = null; S.wdraft = null;
  }),
  copyprev: (t, c) => {
    const src = S.state.log[addDays(S.current, -1)] || [];
    S.state.log[S.current] = src.slice(0, 100).map((p) => ({ ...p, id: uid() + Math.random().toString(36).slice(2, 5), n: [...p.n], ...(p.u ? { u: [...p.u] } : {}) }));
    c.buzz(); c.persist(); c.render();
    c.snackbar(`${src.length} poster kopierade från igår`, 'Ångra', () => { delete S.state.log[S.current]; c.persist(); c.render(); });
  },
  weightsave: (t, c) => {
    const v = parseNum(document.getElementById('weight')?.value);
    if (v >= 20 && v <= 400) S.state.weights[S.current] = Math.round(v * 10) / 10;
    else delete S.state.weights[S.current];
    c.persist(); return true;
  },
  // Vanor (som i follow-diet-tracker): tryck på valt utfall igen för att ta bort det.
  outcome: (t, c) => {
    const { id, val } = t.dataset, day = (S.state.habits[S.current] ??= {}), prev = day[id];
    if (prev?.outcome === val && !id.startsWith('extra-')) { delete day[id]; if (!Object.keys(day).length) delete S.state.habits[S.current]; }
    else {
      const name = S.state.meals.find((m) => m.id === id)?.name ?? prev?.name;
      day[id] = { ...prev, outcome: val, ...(name ? { name } : {}) };
      if (val !== 'cheat') delete day[id].reason;
    }
    c.buzz(); c.persist(); return true;
  },
  reason: (t, c) => {
    const e = S.state.habits[S.current]?.[t.dataset.id];
    if (!e) return;
    if (e.reason === t.dataset.val) delete e.reason; else e.reason = t.dataset.val;
    c.buzz(); c.persist(); return true;
  },
  remove: (t, c) => {
    const day = S.state.habits[S.current], id = t.dataset.id;
    if (!day?.[id]) return;
    c.withUndo('Extra fusk togs bort', () => { delete day[id]; if (!Object.keys(day).length) delete S.state.habits[S.current]; });
  },
  extra: (t, c) => {
    const day = (S.state.habits[S.current] ??= {});
    if (Object.keys(day).length >= 20) { c.snackbar('Max 20 per dag', null, null, 3000); return; }
    day['extra-' + Date.now()] = { outcome: 'cheat' };
    c.buzz(); c.persist(); return true;
  },
  // Träning (som i follow-diet-tracker)
  wnew: () => { S.wdraft = { types: [] }; return true; },
  wcancel: () => { S.wdraft = null; return true; },
  wtype: (t, c) => {
    if (!S.wdraft) return;
    const val = t.dataset.val, on = S.wdraft.types.includes(val), cardio = wType(val)?.kind === 'cardio';
    if (on) S.wdraft.types = S.wdraft.types.filter((x) => x !== val);
    else S.wdraft.types = cardio ? [val] : [...S.wdraft.types.filter((x) => !isCardio([x])), val];
    c.buzz(); return true;
  },
  wsave: (t, c) => {
    if (!S.wdraft?.types.length) return;
    const w = { types: [...S.wdraft.types] };
    if (isCardio(w.types)) {
      const kmRaw = document.getElementById('w-km')?.value.trim() ?? '', tRaw = document.getElementById('w-time')?.value.trim() ?? '';
      const km = parseNum(kmRaw), sec = tRaw ? parseDur(tRaw) : null;
      const err = (kmRaw && !(km > 0 && km <= 500)) ? 'Ange sträckan i km, t.ex. 5,2.' : (tRaw && sec == null) ? 'Ange tiden som min:sek, t.ex. 28:30.' : '';
      if (err) { c.errText('w-error', err); return; }
      if (kmRaw) w.km = Math.round(km * 100) / 100;
      if (sec != null) w.sec = sec;
    }
    const l = (S.state.workouts[S.current] ??= []);
    if (l.length >= 10) { c.errText('w-error', 'Max 10 pass per dag.'); return; }
    l.push(w); S.wdraft = null; c.buzz(); c.persist(); return true;
  },
  wdel: (t, c) => {
    const i = Number(t.dataset.val);
    c.withUndo('Träningspasset togs bort', () => {
      const l = S.state.workouts[S.current];
      if (!l) return;
      l.splice(i, 1);
      if (!l.length) delete S.state.workouts[S.current];
    });
  },
};

export const change = {
  note: (t, c) => {
    const e = S.state.habits[S.current]?.[t.dataset.id];
    if (!e) return;
    const v = cleanText(t.value, 140);
    if (v) e.note = v; else delete e.note;
    c.persist();
  },
};
