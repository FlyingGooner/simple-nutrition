// Handlers: Inställningar – listor, mål, plan, egna produkter, sökord, installera. Each returns true when the view should be redrawn.
import { setGoal, cleanText, uid } from '../store.js';
import { today, S, kcal, parseNum } from '../ui.js';

const LIST_MAX = { meals: 10, reasons: 60, workoutTypes: 60 };
const listOf = (kind) => (kind === 'meals' ? S.state.meals : kind === 'reasons' || kind === 'workoutTypes' ? S.state.settings[kind] : null);
const val = (id) => document.getElementById(id)?.value ?? '';

export const click = {
  add: (t, c) => {
    const kind = t.dataset.kind, l = listOf(kind);
    if (!l || l.length >= LIST_MAX[kind]) return;
    l.push(kind === 'workoutTypes' ? { id: 'wt' + uid(), name: 'Nytt pass', kind: 'gym' }
      : kind === 'reasons' ? { id: 'r' + uid(), name: 'Ny orsak' } : { id: 'm' + uid(), name: 'Ny måltid' });
    c.persist(); c.render();
    const inputs = c.app.querySelectorAll(`[data-act="rename"][data-kind="${kind}"]`);
    inputs[inputs.length - 1]?.select();
  },
  up: (t, c) => {
    const l = listOf(t.dataset.kind), i = l ? l.findIndex((x) => x.id === t.dataset.id) : -1;
    if (i > 0) [l[i - 1], l[i]] = [l[i], l[i - 1]];
    c.persist(); return true;
  },
  del: (t, c) => {
    const { kind, id } = t.dataset, l = listOf(kind), it = l?.find((x) => x.id === id);
    if (!it || (kind === 'meals' && l.length <= 1)) return;
    c.withUndo(`${it.name} togs bort – tidigare loggningar finns kvar`, () => {
      const ll = listOf(kind); ll.splice(ll.findIndex((x) => x.id === id), 1);
    });
  },
  // Spara-knappar (beslut 2026-11-10): kalorimål, protein/kolhydrater och Min plan sparas bara på knappen.
  goalsave: (t, c) => {
    const raw = val('g-kcal').trim();
    if (!raw) { setGoal(S.state, today(), { kcal: undefined }); c.persist(); c.render(); c.snackbar('Inget kalorimål från idag', null, null, 3000); return; }
    const v = Math.round(parseNum(raw));
    if (!(v >= 500 && v <= 10000)) { c.snackbar('Ange ett mål mellan 500 och 10 000 kcal, eller tomt för inget mål', null, null, 3000); return; }
    setGoal(S.state, today(), { kcal: v }); c.persist(); c.render(); c.snackbar(`Kalorimål ${kcal(v)} kcal sparat från idag`, null, null, 3000);
  },
  macrosave: (t, c) => {
    const patch = {};
    for (const [k, max] of [['prot', 500], ['kolh', 1000]]) {
      const raw = val('g-' + k).trim(), v = Math.round(parseNum(raw));
      if (raw && !(v >= 10 && v <= max)) { c.snackbar(`Ange 10–${max} g, eller tomt för av`, null, null, 3000); return; }
      patch[k] = raw ? v : undefined;
    }
    setGoal(S.state, today(), patch); c.persist(); c.render(); c.snackbar('Målen sparade från idag', null, null, 3000);
  },
  plansave: (t, c) => {
    S.state.settings.planText = val('plan-text').replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g, '').trim().slice(0, 300);
    c.persist(); c.render(); c.snackbar('Planen sparad', null, null, 2500);
  },
  // Egna produkter och sökord
  fadd: (t, c) => {
    const name = cleanText(val('f-name'));
    const n = ['f-kcal', 'f-p', 'f-k', 'f-f'].map((i) => parseNum(val(i)));
    const unit = cleanText(val('f-unit'), 10), ug = parseNum(val('f-ug'));
    const err = !name ? 'Ange ett namn.' : !(n[0] >= 0 && n[0] <= 900) ? 'kcal per 100 g: 0–900.'
      : n.slice(1).some((x) => !(x >= 0 && x <= 100)) ? 'Protein, kolhydrater och fett: 0–100 g per 100 g.'
        : n[1] + n[2] + n[3] > 100.05 ? 'Protein, kolhydrater och fett får tillsammans vara högst 100 g.'
      : unit && !(ug > 0 && ug <= 10000) ? 'Ange gram per mått, eller lämna måttet tomt.' : '';
    if (err) { c.errText('f-error', err); return; }
    const f = { id: uid(), name, n: n.map((x) => Math.round(x * 10) / 10) };
    if (unit) f.u = [unit, Math.round(ug * 100) / 100];
    S.state.foods.push(f); c.persist(); c.render(); c.snackbar(`${name} sparad`, null, null, 2500);
  },
  fdel: (t, c) => {
    const id = t.dataset.id, f = S.state.foods.find((x) => x.id === id);
    if (!f) return;
    c.withUndo(`${f.name} togs bort – loggade dagar finns kvar`, () => { S.state.foods = S.state.foods.filter((x) => x.id !== id); });
  },
  adel: (t, c) => c.withUndo(`Sökordet "${t.dataset.val}" togs bort`, () => { delete S.state.aliases[t.dataset.val]; }),
  install: (t, c) => {
    S.installPrompt?.prompt();
    S.installPrompt?.userChoice.finally(() => { S.installPrompt = null; c.render(); });
  },
};

export const change = {
  rename: (t, c) => {
    const it = listOf(t.dataset.kind)?.find((x) => x.id === t.dataset.id);
    const v = cleanText(t.value, 40);
    if (it && v) it.name = v; else t.value = it?.name ?? '';
    c.persist();
  },
  threshold: (t, c) => { S.state.settings.successThreshold = Number(t.value) / 100; c.persist(); },
  wgoal: (t, c) => {
    const k = t.dataset.val, v = Number(t.value);
    if (['workoutGoal', 'gymGoal', 'cardioGoal'].includes(k) && Number.isInteger(v) && v >= 0 && v <= 14) S.state.settings[k] = v;
    c.persist();
  },
  wkind: (t, c) => {
    const it = S.state.settings.workoutTypes.find((x) => x.id === t.dataset.id);
    if (it && (t.value === 'gym' || t.value === 'cardio')) it.kind = t.value;
    c.persist();
  },
};

export function onInput(t) {
  if (t.dataset.act === 'threshold') { const o = document.getElementById('thr'); if (o) o.textContent = t.value + ' %'; }
}
