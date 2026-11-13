// Simple nutrition – export/import, backup-fil och backup-påminnelse (U5). ES-modul. app.js anropar initData() med sina
// hjälpfunktioner så att modulen aldrig importerar app.js (bygget stöder inte cirkulära importer).
import { defaults, save, addDays, exportText, importText, MAX_IMPORT_CHARS, mergeFdt } from '../store.js';
import { today, S, shortDate } from '../ui.js';

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
export async function saveBackup() {
  const r = await Backup.saveWithPassword({ slug: 'simple-nutrition', today: today(), text: exportText(S.state, today()) });
  if (r === 'saved' || r === 'fallback') {   // v0.7.0: kom ihåg senaste backup för påminnelsen
    S.state.backup.last = today(); S.state.backup.asked = null; persist();
    if (currentView() === 'settings') render();
  }
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
  const r = await Backup.openText(text, 'simple-nutrition', MAX_IMPORT_CHARS);
  if (r.cancelled) return;
  if (r.error) { importError(r.error); return; }
  startImport(r.text);
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
    snackbar('Data importerad', 'Ångra', () => { S.state = before; persist(); render(); });
  });
  document.getElementById('cd-ok').addEventListener('click', () => {
    S.state = defaults(); persist(); S.current = today(); resetDay(); S.dish = null; render();
    snackbar('All data är raderad', null, null, 3000);
  });
}
