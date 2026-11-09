// Simple nutrition – no external calls, localStorage only. See CLAUDE.md. Views in views/*.js, shared state in ui.js.
import { defaults, load, save, validate, addDays, weekStart, setGoal, findRef, cleanText, uid, exportText, importText, MAX_IMPORT_CHARS } from './store.js';
import { today, S, setOpen, el, kcal, shortDate, dateTitle, parseNum } from './ui.js';
import { viewToday, dayPosts } from './views/today.js';
import { resultsList, pickGrams } from './views/add.js';
import { viewWeek } from './views/week.js';
import { viewSettings, viewSoon } from './views/settings.js';

document.getElementById('version').textContent = 'v' + self.APP_VERSION;

let view = 'today';
const app = document.getElementById('app');
const tabbar = document.querySelector('.tabbar');
const buzz = () => navigator.vibrate?.(10);

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

/* ---------- Router ---------- */
const VIEWS = { today: viewToday, week: () => viewWeek(), trend: viewSoon('Trend'), history: viewSoon('Historik'), settings: viewSettings };
const TITLES = { trend: 'Trend', history: 'Historik' };
const wide = matchMedia('(min-width: 840px)');
wide.addEventListener('change', () => render());

function render() {
  app.dataset.view = view;
  const nodes = view === 'today' && wide.matches
    ? el('div', { class: 'split' }, el('div', { class: 'pane' }, viewToday()),
      el('aside', { class: 'pane side', 'aria-label': 'Veckan' }, viewWeek(weekStart(S.current), true)))
    : [TITLES[view] ? el('h1', { class: 'view-title', text: TITLES[view] }) : null, VIEWS[view]()];
  app.replaceChildren(...[nodes].flat(Infinity).filter(Boolean));
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
const resetDay = () => { S.open = null; S.add = null; };
tabbar.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-view]');
  if (!t) return;
  ev.preventDefault();
  if (t.dataset.view === 'today') { S.current = today(); resetDay(); }
  go(t.dataset.view);
});

/* ---------- Posts ---------- */
const dayList = () => (S.state.log[S.current] ??= []);
function cleanupDay() { if (!dayPosts().length) delete S.state.log[S.current]; }
function addPost(p) {
  const l = dayList();
  if (l.length >= 100) { snackbar('Max 100 poster per dag', null, null, 3000); return false; }
  l.push(p); return true;
}
function openPick(food) {
  const u = food.v[0].u;
  S.add.pick = { food, vi: 0, unit: u ? u[0] : 'g', amount: u ? '1' : '100' };
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
      const ok = p.q != null ? v > 0 && v <= 1 : v > 0 && v <= 10000;
      if (!ok) { document.getElementById('p-error').textContent = p.q != null ? 'Ange en andel mellan 0 och 1, t.ex. 0,25.' : 'Ange gram, t.ex. 150.'; return; }
      if (p.q != null) p.q = v; else { p.g = Math.round(v * 10) / 10; delete p.u; }
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
      withUndo(`${dateTitle(S.current).replace(/^Igår · /, '')} rensad`, () => { delete S.state.log[S.current]; delete S.state.weights[S.current]; S.open = null; });
      return;
    case 'weightsave': {
      const v = parseNum(document.getElementById('weight')?.value);
      if (v >= 20 && v <= 400) S.state.weights[S.current] = Math.round(v * 10) / 10;
      else delete S.state.weights[S.current];
      persist(); break;
    }
    // Lägg till
    case 'addopen': S.add = { meal: id, tab: S.lastTab || (dayPosts().length || Object.keys(S.state.log).length ? 'recent' : 'foods'), q: '', all: false, pick: null }; S.open = null; render(); scrollTo(0, 0); document.getElementById('add-q')?.focus(); return;
    case 'addclose': S.add = null; break;
    case 'addtab': S.add.tab = S.lastTab = val; S.add.pick = null; render(); document.getElementById('add-q')?.focus(); return;
    case 'showall': S.add.all = true; redrawResults(); return;
    case 'pick': { const f = findRef(S.state, t.dataset.ref); if (!f) return; openPick(f); render(); document.getElementById('amount')?.select(); return; }
    case 'variant': S.add.pick.vi = Number(val); if (!S.add.pick.food.v[S.add.pick.vi].u && S.add.pick.unit !== 'g') { S.add.pick.unit = 'g'; S.add.pick.amount = '100'; } break;
    case 'unit': {
      const p = S.add.pick;
      if (p.unit !== val) { p.unit = val; p.amount = val === 'g' ? '100' : '1'; }
      break;
    }
    case 'unpick': S.add.pick = null; break;
    case 'addsave': {
      const p = S.add.pick, v = p.food.v[p.vi], g = pickGrams(p);
      if (!(g > 0 && g <= 10000)) { document.getElementById('add-error').textContent = 'Ange en mängd, t.ex. 150 g eller 2 dl.'; return; }
      const name = cleanText(v.label ? `${p.food.name}, ${v.label}` : p.food.name);
      const post = { id: uid(), m: S.add.meal, ref: v.ref, name, g: Math.round(g * 10) / 10, n: [...v.n] };
      if (p.unit !== 'g' && v.u) post.u = [v.u[0], Math.round(parseNum(p.amount) * 100) / 100];
      if (!addPost(post)) return;
      S.add = null; buzz(); persist(); render();
      snackbar(`${name} lades till`, null, null, 2500);
      return;
    }
    case 'relog': {
      const src = Object.values(S.state.log).flat().find((x) => x.id === id);
      if (!src) return;
      const post = { ...src, id: uid(), m: S.add.meal, n: [...src.n] };
      if (!addPost(post)) return;
      S.add = null; buzz(); persist(); render();
      snackbar(`${post.name} lades till`, null, null, 2500);
      return;
    }
    // Vecka
    case 'goto': S.current = val; resetDay(); go('today'); return;
    case 'wprev': S.week = addDays(S.week, -7); break;
    case 'wnext': if (S.week < weekStart(today())) S.week = addDays(S.week, 7); break;
    case 'wnow': S.week = weekStart(today()); break;
    // Inställningar: meals
    case 'add': {
      if (S.state.meals.length >= 10) return;
      S.state.meals.push({ id: 'm' + uid(), name: 'Ny måltid' });
      persist(); render();
      const inputs = app.querySelectorAll('[data-act="rename"]');
      inputs[inputs.length - 1]?.select();
      return;
    }
    case 'up': {
      const l = S.state.meals, i = l.findIndex((x) => x.id === id);
      if (i > 0) [l[i - 1], l[i]] = [l[i], l[i - 1]];
      persist(); break;
    }
    case 'del': {
      const it = S.state.meals.find((x) => x.id === id);
      if (!it || S.state.meals.length <= 1) return;
      withUndo(`${it.name} togs bort – loggade poster visas under Övrigt`, () => { S.state.meals = S.state.meals.filter((x) => x.id !== id); });
      return;
    }
    case 'install':
      S.installPrompt?.prompt();
      S.installPrompt?.userChoice.finally(() => { S.installPrompt = null; render(); });
      return;
    case 'wipe': document.getElementById('confirm-dialog').showModal(); return;
    case 'export': {
      const box = document.getElementById('export-text');
      box.value = exportText(S.state, today());
      box.focus(); box.select();
      snackbar('Markerat – kopiera texten och spara den', null, null, 4000);
      return;
    }
    case 'import': startImport(document.getElementById('import-text').value); return;
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
  if (t.id === 'amount' && S.add?.pick) {
    S.add.pick.amount = t.value;
    const p = S.add.pick, v = p.food.v[p.vi], g = pickGrams(p);
    document.getElementById('pick-sum').textContent = Number.isFinite(g)
      ? `${kcal(v.n[0] * g / 100)} kcal${p.unit !== 'g' && v.u ? ` · ≈ ${Math.round(g)} g` : ''}` : 'Ange mängd';
  }
});
app.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.id === 'amount') { ev.preventDefault(); app.querySelector('[data-act="addsave"]')?.click(); }
  if (ev.key === 'Enter' && ev.target.id === 'add-q') { ev.preventDefault(); app.querySelector('#add-results [data-act="pick"]')?.click(); }
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
      const it = S.state.meals.find((x) => x.id === t.dataset.id);
      const v = cleanText(t.value, 40);
      if (it && v) it.name = v; else t.value = it?.name ?? '';
      persist(); return;
    }
    case 'goalkcal': {
      const v = Math.round(parseNum(t.value));
      if (v >= 500 && v <= 10000) { setGoal(S.state, today(), { kcal: v }); persist(); render(); snackbar(`Kalorimål ${kcal(v)} kcal från idag`, null, null, 3000); }
      else { t.value = String(S.state.goals.at(-1).kcal); snackbar('Ange ett mål mellan 500 och 10 000 kcal', null, null, 3000); }
      return;
    }
  }
});

/* ---------- Export/import (U5) ---------- */
let pendingImport = null;
function startImport(text) {
  const r = importText(text);
  document.getElementById('import-error').textContent = r.error || '';
  if (r.error) return;
  pendingImport = r.data;
  const period = r.first ? `, ${shortDate(r.first)} ${r.first.slice(0, 4)}–${shortDate(r.last)} ${r.last.slice(0, 4)}` : '';
  document.getElementById('imp-sum').textContent = `${r.posts} poster, ${r.weights} vägningar, ${r.dishes} rätter${period}`
    + (r.exported ? `. Exporterad ${r.exported}.` : '.') + (r.skipped ? ` ${r.skipped} ogiltiga hoppas över.` : '');
  document.getElementById('import-dialog').showModal();
}
const BACKUP_MSG = {
  saved: 'Backup-filen sparades',
  busy: 'Ett sparfönster är redan öppet',
  fallback: 'Backup-filen laddas ner – syns den inte, använd Visa som text',
  error: 'Kunde inte spara filen – använd Visa som text',
};
async function saveBackup() {
  const r = await Backup.save({ slug: 'simple-nutrition', today: today(), text: exportText(S.state, today()) });
  if (BACKUP_MSG[r]) snackbar(BACKUP_MSG[r], null, null, 4000);
}
async function readBackup(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const r = await Backup.read(file, MAX_IMPORT_CHARS);
  if (r.error) { document.getElementById('import-error').textContent = r.error; return; }
  startImport(r.text);
}
document.getElementById('imp-ok').addEventListener('click', () => {
  const next = pendingImport;
  pendingImport = null;
  if (!next) return;
  if (!save(next)) { status('Kunde inte spara – lagringen är full eller blockerad. Inget ändrades.', true); return; }
  const before = S.state;
  S.state = next; S.current = today(); resetDay();
  render();
  snackbar('Data importerad', 'Ångra', () => { S.state = before; persist(); render(); });
});
document.getElementById('cd-ok').addEventListener('click', () => {
  S.state = defaults(); persist(); S.current = today(); resetDay(); render();
  snackbar('All data är raderad', null, null, 3000);
});

/* ---------- Swipe, install, refresh, service worker ---------- */
const SWIPE = { today: ['prev', 'next'], week: ['wprev', 'wnext'] };
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

// Refresh when returning to the app (e.g. after midnight) – but not after the file picker (filePick) or while adding.
let filePick = false;
app.addEventListener('click', (ev) => { if (ev.target.id === 'import-file') filePick = true; }, true);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (filePick) { filePick = false; return; }
  S.state = load();
  if (!S.add) render();
});

go(location.hash.slice(1));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* app still works */ });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) snackbar('Ny version finns', 'Ladda om', () => location.reload(), 0);
  });
}
