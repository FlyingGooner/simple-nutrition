// Simple nutrition – export/import, backup-fil och backup-påminnelse (U5). ES-modul. app.js anropar initData() med sina
// hjälpfunktioner så att modulen aldrig importerar app.js (bygget stöder inte cirkulära importer).
import { defaults, save, addDays, exportText, importText, MAX_IMPORT_CHARS, mergeFdt } from '../store.js';
import { today, S, shortDate, el } from '../ui.js';
import { t, lang, setLang, langChosen, LANGS } from '../i18n.js';

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
export function savedPassword() { try { const p = localStorage.getItem(PWD_KEY); return p && !Backup.checkPassword(p) ? p : ''; } catch { return ''; } }
export function rememberOn() { try { return localStorage.getItem(OFF_KEY) !== '1'; } catch { return false; } }
export function setRemember(on) {
  try { if (on) localStorage.removeItem(OFF_KEY); else { localStorage.setItem(OFF_KEY, '1'); localStorage.removeItem(PWD_KEY); } } catch { /* blocked */ }
  render();
}
function keep(pwd) {
  if (!rememberOn() || Backup.checkPassword(pwd) || savedPassword()) return;   // a password from another file never replaces the saved one
  try { localStorage.setItem(PWD_KEY, pwd); } catch { /* no room: asks next time */ }
  closeWelcome();
}
export async function rememberPassword() {
  const a = await Backup.askPassword('export'); if (!a) return;
  try { localStorage.setItem(PWD_KEY, a.pwd); } catch { snackbar('Kunde inte spara lösenordet', null, null, 3000); return; }
  render(); snackbar('Lösenordet sparas på den här enheten. Ha det kvar i din lösenordshanterare också.', null, null, 6000);
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
    } catch { r = 'error'; } finally { busy = false; }
  }
  if (r === 'saved' || r === 'fallback') {   // v0.7.0: kom ihåg senaste backup för påminnelsen
    S.state.backup.last = today(); S.state.backup.asked = null; persist();
    if (currentView() === 'settings') render();
    if (first) { snackbar('Backup sparad. Lösenordet är sparat på enheten – nästa gång räcker ett tryck.', null, null, 5000); return; }
  } else if (first && currentView() === 'settings') render();
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
   Utan sparat lösenord är appen låst bakom en ruta tills ett lösenord är valt (eller en krypterad backup är inläst,
   vars lösenord sparas), som att registrera sig. Lösenordet är bara nyckeln till backup-filerna – det sparas på enheten (sn.pwd), aldrig i
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
    let r; try { r = await Backup.read(f, MAX_IMPORT_CHARS); } catch { r = { error: t('wl.readErr') }; }
    file.value = '';
    err.textContent = r.error || '';
    if (!r.error) { setLang(lang()); openImport(r.text); }
  });
  const cur = lang();
  const segs = el('div', { class: 'segs', role: 'group', 'aria-label': t('wl.lang') },
    Object.entries(LANGS).map(([k, name]) => {
      const b = el('button', { type: 'button', class: 'seg' + (k === cur ? ' on' : ''), lang: k, 'aria-pressed': String(k === cur), text: name });
      b.addEventListener('click', () => {
        setLang(k);
        if (!needsWelcome()) { welcomeDlg.close(); render(); } else { fillWelcome(); render(); }
      });
      return b;
    }));
  const pick = el('button', { type: 'button', class: 'btn-file btn-filled', text: t('wl.pick') });
  pick.addEventListener('click', () => { setLang(lang()); choosePassword(); });
  const pw = needsPassword();
  welcomeDlg.replaceChildren(
    el('h2', { id: 'wl-title', text: t('wl.title') }),
    segs,
    pw && el('p', { text: t('wl.text') }),
    pw && el('p', { class: 'muted small', text: t('wl.small') }),
    pw && el('div', { class: 'welcome-actions' }, pick,
      !welcomeHasData() && el('label', { class: 'btn-file' }, t('wl.import'), file)),
    err);
}
export function welcomeCheck() {
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
async function choosePassword() {
  const wait = Backup.askPassword('export');   // sets the dialog texts synchronously; ours replace them
  const set = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t; };
  set('pw-title', 'Välj lösenord'); set('pw-text', 'Lösenordet krypterar dina backup-filer och sparas på den här enheten.'); set('pw-ok', 'Spara lösenord');
  const a = await wait; if (!a) return;
  keep(a.pwd); render();
  snackbar('Lösenordet är sparat. Backup sparas med ett tryck.', null, null, 4000);
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
