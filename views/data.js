// Simple nutrition – export/import, backup-fil och backup-påminnelse (U5). ES-modul. app.js anropar initData() med sina
// hjälpfunktioner så att modulen aldrig importerar app.js (bygget stöder inte cirkulära importer).
import { defaults, save, addDays, exportText, importText, MAX_IMPORT_CHARS, mergeFdt } from '../store.js';
import { today, S, shortDate, el, imperial, setUnits } from '../ui.js';
const { lang, setLang, chosen: langChosen, LANGS } = self.I18N;

let persist, render, status, snackbar, resetDay, currentView;
const errText = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };

/* ---------- Export/import (U5) ---------- */
let pendingImport = null;
export function startImport(text) {
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
/* ---------- Remembered backup password (U5) ----------
   On by default: the password typed in the backup dialog (save or read) is kept under sn.pwd, so the next backup is one tap.
   Only on this device – never in sn.data, so never inside a backup file; the data in localStorage is plain anyway and the
   file stays as encrypted as before. Unticked (sn.pwdoff = 1): forgotten, the app asks every time. Radera all data removes both. */
const PWD_KEY = 'sn.pwd', OFF_KEY = 'sn.pwdoff', SLUG = 'simple-nutrition';
// 2026-11-15: koden skapas av appen (generatePassword: 16 tecken, kryptografisk slump) och sparas på enheten. Egen kod går att välja (ownPassword), med samma krav.
export function savedPassword() {
  try { let p = localStorage.getItem(PWD_KEY); if (!p) { p = Backup.generatePassword(); localStorage.setItem(PWD_KEY, p); } return p; } catch { return ''; }
}
export function rememberOn() { return true; }   // koden sparas alltid (2026-11-15)
export function setRemember(on) {
  try { if (on) localStorage.removeItem(OFF_KEY); else { localStorage.setItem(OFF_KEY, '1'); localStorage.removeItem(PWD_KEY); } } catch { /* blocked */ }
  render();
}
// En backup som lästs in med en annan kod: den koden används sedan (en kod att hålla reda på, t.ex. på en ny telefon).
function keep(pwd) {
  if (!pwd || pwd === savedPassword()) return;
  try { localStorage.setItem(PWD_KEY, pwd); } catch { return; }
  render(); snackbar('Koden från filen används nu för nya backuper.', null, null, 4000);
}
// Byta kod (2026-11-15): fråga först – gamla backup-filer öppnas bara med den gamla koden. Efteråt: spara en ny backup.
function sureNewCode() {
  const d = document.getElementById('newcode-dialog');
  if (!d || typeof d.showModal !== 'function') return Promise.resolve('ok');
  return new Promise((res) => { d.addEventListener('close', () => res(d.returnValue === 'ok' || d.returnValue === 'save' ? d.returnValue : ''), { once: true }); d.returnValue = ''; d.showModal(); });
}
const afterNewCode = (msg, how) => how === 'save' ? saveBackup() : snackbar(msg + ' Spara en ny backup nu.', 'Spara backup', () => saveBackup(), 10000);
export async function rememberPassword() {
  const how = await sureNewCode(); if (!how) return;
  const p = Backup.generatePassword();
  try { localStorage.setItem(PWD_KEY, p); } catch { snackbar('Kunde inte spara koden', null, null, 3000); return; }
  S.showPwd = true; render();
  afterNewCode('Ny kod skapad.', how);
}
// Egen kod (2026-11-15): samma krav som den skapade (checkPassword: 16+ tecken, stor och liten bokstav, siffra, specialtecken).
export async function ownPassword() {
  const how = await sureNewCode(); if (!how) return;
  const wait = Backup.askPassword('export');   // sets the dialog texts synchronously; ours replace them
  const set = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t; };
  set('pw-title', 'Välj egen kod'); set('pw-text', 'Koden låser dina backup-filer och sparas på den här enheten.'); set('pw-ok', 'Spara kod');
  const a = await wait; if (!a) return;
  try { localStorage.setItem(PWD_KEY, a.pwd); } catch { snackbar('Kunde inte spara koden', null, null, 3000); return; }
  S.showPwd = false; render();
  afterNewCode('Din egen kod är sparad.', how);
}
export function copyPassword() {
  const p = savedPassword();
  if (!p || !navigator.clipboard) { snackbar('Kunde inte kopiera – tryck Visa och skriv av koden', null, null, 4000); return; }
  navigator.clipboard.writeText(p).then(() => snackbar('Koden är kopierad', null, null, 3000), () => snackbar('Kunde inte kopiera – tryck Visa och skriv av koden', null, null, 4000));
}
let busy = false;
export async function saveBackup() {
  const pwd = savedPassword();
  let r, first = false;
  if (!pwd && !rememberOn()) r = await Backup.saveWithPassword({ slug: SLUG, today: today(), text: exportText(S.state, today()) });
  else {
    if (busy) return;
    busy = true;
    try {
      if (pwd) {   // one tap: encrypt with the remembered password, no dialog
        snackbar('Krypterar backup…', null, null, 2000);
        r = await Backup.save({ slug: SLUG, today: today(), text: await Backup.encrypt(exportText(S.state, today()), pwd, SLUG) });
      } else {     // first time: the usual dialog, then the password is kept
        const a = await Backup.askPassword('export', async (p) => ({ env: await Backup.encrypt(exportText(S.state, today()), p, SLUG) }));
        if (!a) r = 'cancelled';
        else { keep(a.pwd); first = true; r = await Backup.save({ slug: SLUG, today: today(), text: a.value.env }); }
      }
    } catch (e) { r = 'error'; if (!Backup.lastError) Backup.note(e); } finally { busy = false; }
  }
  if (r === 'saved' || r === 'fallback') {   // v0.7.0: kom ihåg senaste backup för påminnelsen
    S.state.backup.last = today(); S.state.backup.asked = null; persist();
    if (currentView() === 'settings') render();
    if (first) { snackbar('Backup sparad. Lösenordet är sparat på enheten – nästa gång räcker ett tryck.', null, null, 5000); return; }
  } else if (first && currentView() === 'settings') render();
  if (BACKUP_MSG[r]) snackbar(BACKUP_MSG[r] + (r === 'error' && Backup.lastError ? ` (${Backup.lastError})` : ''), null, null, r === 'error' ? 8000 : 4000);
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
export function maybeAskBackup() {
  if (backupAsked || S.add || S.dish || document.querySelector('dialog[open]') || !backupDue()) return;
  backupAsked = true;
  const last = S.state.backup.last;
  document.getElementById('bk-sum').textContent = last
    ? `Senaste backup: ${shortDate(last)}. Spara en ny så att du inte tappar din data.`
    : 'Du har inte sparat någon backup än. Spara en så att du inte tappar din data.';
  document.getElementById('backup-dialog').showModal();
}
// 2026-11-12: the error is scrolled into view (in an artifact the page can be taller than the screen).
function importError(msg) {
  errText('import-error', msg);
  try { document.getElementById('import-error')?.scrollIntoView({ block: 'center' }); } catch { /* old browser */ }
}
export async function readBackup(input) {
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
export async function openImport(text) {
  const pwd = savedPassword();   // the remembered password first; another password → the usual question
  if (pwd && Backup.isEncrypted(text)) {
    let t; try { t = await Backup.decrypt(text, pwd, SLUG, MAX_IMPORT_CHARS); } catch { t = null; }
    if (t && typeof t.text === 'string') { startImport(t.text); noteUnlocked(); return; }
  }
  if (rememberOn() && Backup.isEncrypted(text)) {   // ask, and keep the password that opened the file (a new phone)
    const wait = Backup.askPassword('import', (p) => Backup.decrypt(text, p, SLUG, MAX_IMPORT_CHARS));
    if (pwd) noteWrongSaved();
    const a = await wait;
    if (!a) return;
    if (a.value?.error) { importError(a.value.error); return; }
    keep(a.pwd); startImport(a.value.text); return;
  }
  const r = await Backup.openText(text, SLUG, MAX_IMPORT_CHARS);
  if (r.cancelled) return;
  if (r.error) { importError(r.error); return; }
  startImport(r.text);
}

/* ---------- Välkommen: välj språk och lösenord först (2026-11-14, språk 2026-11-15) ----------
   Lösenordet skapas automatiskt (autoPassword); läses en krypterad backup in i rutan
   ersätter dess lösenord det skapade. Lösenordet är bara nyckeln till backup-filerna – det sparas på enheten (sn.pwd), aldrig i
   datan eller i filen. Bockar man ur Kom ihåg visas rutan inte (man har valt att få frågan varje gång). */
let welcomeDlg = null;
const welcomeHasData = () => Object.keys(S.state.log).length || Object.keys(S.state.habits).length || Object.keys(S.state.weights).length;
const needsPassword = () => !savedPassword() && rememberOn();   // låst tills ett lösenord är valt, även med data
const needsWelcome = () => !langChosen() || needsPassword();   // språk först (2026-11-15), i samma ruta
function closeWelcome() { if (welcomeDlg?.open && !needsWelcome()) welcomeDlg.close(); }
// Rutan ritas om när språket byts: språkknappar överst, lösenordet under (döljs om det redan är valt).
function fillWelcome() {
  const err = el('p', { class: 'import-error small', role: 'alert' });
  const file = el('input', { type: 'file', accept: '.txt,.json' });
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0]; if (!f) return;
    let r; try { r = await Backup.read(f, MAX_IMPORT_CHARS); } catch { r = { error: 'Kunde inte läsa filen.' }; }
    file.value = '';
    err.textContent = r.error || '';
    if (!r.error) { setLang(lang(), false); openImport(r.text); }
  });
  const cur = lang();
  const segs = el('div', { class: 'segs', role: 'group', 'aria-label': 'Språk' },
    Object.entries(LANGS).map(([k, name]) => {
      const b = el('button', { type: 'button', class: 'seg' + (k === cur ? ' on' : ''), lang: k, 'aria-pressed': String(k === cur), text: name, 'data-no-tr': '' });
      b.addEventListener('click', () => {
        setLang(k);   // laddar om sidan om språket byts; samma språk → bara sparat
        if (!needsWelcome()) welcomeDlg.close(); else fillWelcome();
      });
      return b;
    }));
  // Måttsystem (2026-11-15): förvalt efter språket, går att byta här och under Inställningar.
  const imp = imperial();
  const units = el('div', { class: 'segs', role: 'group', 'aria-label': 'Måttsystem' },
    [['metric', 'Metriskt (g, dl, kg)', !imp], ['imperial', 'Imperial (oz, cup, lb)', imp]].map(([k, name, on]) => {
      const b = el('button', { type: 'button', class: 'seg' + (on ? ' on' : ''), 'aria-pressed': String(on), text: name });
      b.addEventListener('click', () => { setUnits(k); fillWelcome(); render(); });
      return b;
    }));
  welcomeDlg.replaceChildren(...[   // [].filter: replaceChildren writes false as text
   
    el('h2', { id: 'wl-title', text: 'Välkommen!' }),
    segs, units,
    el('p', { text: 'Är du ny räcker det att välja språk.' }),
    savedPassword() && el('p', { class: 'muted small', text: 'Din personliga kod (lösenordet till dina backup-filer) har skapats åt dig och finns under Inställningar → Allmänt → Data. Spara den på en säker plats, t.ex. i en lösenordshanterare – utan den går en backup inte att öppna på en ny enhet.' }),
    !welcomeHasData() && el('p', { class: 'muted small', text: 'Har du använt appen förut, på den här eller en annan enhet? Läs in din backup-fil för att få tillbaka din data.' }),
    !welcomeHasData() && el('div', { class: 'welcome-actions' }, el('label', { class: 'btn-file' }, 'Jag har en backup-fil', file)),
    err].filter(Boolean));
}
// 2026-11-15: lösenordet skapas och sparas automatiskt – användaren behöver aldrig välja ett. Visa/Byt under Inställningar.
function autoPassword() {
  if (!needsPassword()) return;
  try { localStorage.setItem(PWD_KEY, Backup.generatePassword()); } catch { /* blocked: asks at the first backup */ }
}
export function welcomeCheck() {
  autoPassword();
  return;   // 2026-11-15: ingen välkomstruta – svenska och lösenordet är förvalda, allt ändras under Inställningar
  if (!needsWelcome() || welcomeDlg?.open || typeof HTMLDialogElement !== 'function') return;
  const other = document.querySelector('dialog[open]');   // t.ex. backup-påminnelsen: fråga när den stängs
  if (other) { other.addEventListener('close', () => setTimeout(welcomeCheck, 0), { once: true }); return; }
  if (!welcomeDlg) {
    welcomeDlg = el('dialog', { class: 'welcome', 'aria-labelledby': 'wl-title' });
    welcomeDlg.addEventListener('cancel', (e) => e.preventDefault());   // inte Esc/Bakåt: språk och lösenord först
    document.body.append(welcomeDlg);
  }
  fillWelcome();
  welcomeDlg.showModal();
}
// Point 2: the user is told when the remembered password opened the file, and when it did not fit.
function noteUnlocked() { const s = document.getElementById('imp-sum'); if (s && document.getElementById('import-dialog')?.open) s.textContent += ' Backupen låstes upp med det sparade lösenordet.'; }
function noteWrongSaved() { const n = document.getElementById('pw-text'); if (n) n.textContent = 'Det sparade lösenordet passade inte till den här filen. Skriv lösenordet du valde när du sparade den.'; }

// Visa lösenord: ett fält räcker (som i KeePass) – Upprepa döljs och följer det första. Görs här, backup.js är delad.
function oneFieldWhenShown() {
  const $id = (id) => document.getElementById(id);
  const dlg = $id('pw-dialog'), show = $id('pw-show'), p1 = $id('pw-1'), p2 = $id('pw-2'), row = $id('pw-2-row'), gen = $id('pw-gen');
  if (!dlg || !show || !p1 || !p2 || !row) return;
  let one = false;   // true while Upprepa is hidden by us (only when saving – reading never shows it)
  const apply = () => {
    if (show.checked && !row.hidden) { one = true; row.hidden = true; p2.value = p1.value; }
    else if (!show.checked && one) { one = false; row.hidden = false; }
  };
  // Sparas lösenordet (Kom ihåg på): påminn om att inte återanvända ett lösenord – det ligger i klartext på enheten.
  const warn = () => { const w = $id('pw-warn'); if (w && !row.hidden && rememberOn() && !w.textContent.includes('annanstans')) w.textContent += (w.textContent ? ' ' : '') + 'Använd ett nytt lösenord som du inte har någon annanstans – det sparas på den här enheten.'; };
  new MutationObserver(() => { if (dlg.open) { one = false; warn(); } }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  show.addEventListener('change', apply);
  gen?.addEventListener('click', () => setTimeout(apply, 0));   // the generator ticks Visa itself
  p1.addEventListener('input', () => { if (one) p2.value = p1.value; });
}
export function initData(ctx) {
  ({ persist, render, status, snackbar, resetDay, view: currentView } = ctx);
  document.getElementById('bk-ok').addEventListener('click', () => { saveBackup(); });
  document.getElementById('bk-later').addEventListener('click', () => { S.state.backup.asked = today(); persist(); });
  document.getElementById('imp-ok').addEventListener('click', () => {
    const next = pendingImport;
    pendingImport = null;
    if (!next) return;
    if (!save(next)) { status('Kunde inte spara – lagringen är full eller blockerad. Inget ändrades.', true); return; }
    const before = S.state;
    S.state = next; S.current = today(); resetDay(); S.dish = null;
    render();
    closeWelcome();
    snackbar('Data importerad', 'Ångra', () => { S.state = before; persist(); render(); });
  });
  document.getElementById('cd-ok').addEventListener('click', () => {
    S.state = defaults(); try { localStorage.removeItem(PWD_KEY); localStorage.removeItem(OFF_KEY); } catch { /* blocked */ } persist(); S.current = today(); resetDay(); S.dish = null; render();
    snackbar('All data är raderad', null, null, 3000);
    setTimeout(welcomeCheck, 0);
  });
  oneFieldWhenShown();
  welcomeCheck();
}

/* ---------- CSV (2026-11-15): en rad per loggad post (mat och dryck), näring per post, plus en rad per loggad vikt (kg) och per träningspass. Inte krypterad. ---------- */
export function exportCsv() {
  const st = S.state, tr = Csv.tr, meals = new Map((st.meals || []).map((m) => [m.id, m.name]));
  const rows = [];
  const wt = new Map(((st.settings || {}).workoutTypes || []).map((t) => [t.id, t.name]));
  const days = [...new Set([...Object.keys(st.log || {}), ...Object.keys(st.weights || {}), ...Object.keys(st.workouts || {})])].sort();
  for (const day of days) {
    if (st.weights && st.weights[day] != null) rows.push([day, tr('Vikt'), tr('Vikt'), st.weights[day], 'kg']);   // 2026-11-16: loggad vikt följer med
    for (const w of (st.workouts || {})[day] || []) {   // 2026-11-16: träningspass följer med; km i Mängd, tid i minuter i namnet om km finns
      const name = (w.types || []).map((id) => tr(wt.get(id) || id)).join(' + ') || tr('Träning');
      const min = w.sec ? Math.round(w.sec / 60) : null;
      rows.push(w.km ? [day, tr('Träning'), name + (min ? ` (${min} min)` : ''), w.km, 'km'] : [day, tr('Träning'), name, min, min ? 'min' : '']);
    }
    for (const e of (st.log || {})[day] || []) {
    const total = /^[rq]:/.test(e.ref || '');   // rätter och snabbval: n gäller hela posten; varor: n per 100 g
    const k = total ? 1 : (e.g || 0) / 100, n = e.n || [0, 0, 0, 0];
    const amt = Array.isArray(e.u) ? [e.u[1], e.u[0]] : total ? [e.q, tr('portion')] : [e.g, 'g'];
    const meal = meals.get(e.m) || (String(e.m || '').startsWith('extra') ? tr('Extra') : e.m || '');
    rows.push([day, meal, e.name, amt[0], amt[1], n[0] * k, n[1] * k, n[2] * k, n[3] * k]);
  } }
  const text = Csv.build(['Datum', 'Måltid', 'Namn', 'Mängd', 'Enhet', 'kcal', 'Protein (g)', 'Kolhydrater (g)', 'Fett (g)'], rows);
  snackbar(Csv.download(`simple-nutrition-${today()}.csv`, text) ? 'CSV-filen laddas ner' : 'Kunde inte skapa filen', null, null, 3000);
}
