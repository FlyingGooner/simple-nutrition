// Handlers: kortet Data – export/import som text och fil (U5), radera all data.
import { defaults, save, exportText, importText, mergeFdt, MAX_IMPORT_CHARS } from '../store.js';
import { today, S, shortDate } from '../ui.js';

let pendingImport = null;
const txt = (id, t) => { document.getElementById(id).textContent = t; };
const period = (r) => (r.first ? `, ${shortDate(r.first)} ${r.first.slice(0, 4)}–${shortDate(r.last)} ${r.last.slice(0, 4)}` : '');

function startImport(text, c) {
  const r = importText(text);
  c.errText('import-error', r.error || '');
  if (r.error) return;
  if (r.fdt) {
    // Från Följ planen: läggs ihop med det som redan finns här (inget ersätts), därför egen text.
    pendingImport = mergeFdt(S.state, r.fdt);
    txt('imp-title', 'Lägga till data från Följ planen?');
    txt('imp-sum', `${r.meals} måltider, ${r.weighIns} vägningar, ${r.sessions} träningspass${period(r)}.`
      + ' Din plan, orsaker och passtyper tas över. Det du redan loggat här behålls.' + (r.skipped ? ` ${r.skipped} ogiltiga hoppas över.` : ''));
    txt('imp-ok', 'Lägg till');
    txt('imp-note', 'Inget av det du redan har här tas bort. Du kan ångra direkt efteråt.');
  } else {
    pendingImport = r.data;
    txt('imp-title', 'Ersätta all data?');
    txt('imp-ok', 'Ersätt');
    txt('imp-note', 'All nuvarande data i appen ersätts. Du kan ångra direkt efteråt.');
    txt('imp-sum', `${r.posts} poster, ${r.weights} vägningar, ${r.dishes} rätter${period(r)}`
      + (r.exported ? `. Exporterad ${r.exported}.` : '.') + (r.skipped ? ` ${r.skipped} ogiltiga hoppas över.` : ''));
  }
  document.getElementById('import-dialog').showModal();
}
const BACKUP_MSG = {
  saved: 'Backup-filen sparades',
  busy: 'Ett sparfönster är redan öppet',
  fallback: 'Backup-filen laddas ner – syns den inte, använd Visa som text',
  error: 'Kunde inte spara filen – använd Visa som text',
};
async function saveBackup(c) {
  const r = await Backup.save({ slug: 'simple-nutrition', today: today(), text: exportText(S.state, today()) });
  if (BACKUP_MSG[r]) c.snackbar(BACKUP_MSG[r], null, null, 4000);
}
async function readBackup(input, c) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const r = await Backup.read(file, MAX_IMPORT_CHARS);
  if (r.error) { c.errText('import-error', r.error); return; }
  startImport(r.text, c);
}

export const click = {
  wipe: () => { document.getElementById('confirm-dialog').showModal(); },
  export: (t, c) => {
    const box = document.getElementById('export-text');
    box.value = exportText(S.state, today());
    box.focus(); box.select();
    c.snackbar('Markerat – kopiera texten och spara den', null, null, 4000);
  },
  import: (t, c) => startImport(document.getElementById('import-text').value, c),
  backupsave: (t, c) => { saveBackup(c); },
};
export const change = { importfile: (t, c) => { readBackup(t, c); } };

// Dialog buttons (outside #app).
export function initDialogs(c) {
  document.getElementById('imp-ok').addEventListener('click', () => {
    const next = pendingImport;
    pendingImport = null;
    if (!next) return;
    if (!save(next)) { c.status('Kunde inte spara – lagringen är full eller blockerad. Inget ändrades.', true); return; }
    const before = S.state;
    S.state = next; S.current = today(); c.resetDay(); S.dish = null;
    c.render();
    c.snackbar('Data importerad', 'Ångra', () => { S.state = before; c.persist(); c.render(); });
  });
  document.getElementById('cd-ok').addEventListener('click', () => {
    S.state = defaults(); c.persist(); S.current = today(); c.resetDay(); S.dish = null; c.render();
    c.snackbar('All data är raderad', null, null, 3000);
  });
}
