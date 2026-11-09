// View: Inställningar (Mål, Måltider, Data, Hjälp) and the placeholders for Trend and Historik (v0.3).
import { goalFor } from '../store.js';
import { today, S, setOpen, el, kcal } from '../ui.js';

function editableList(items) {
  return [
    el('ul', { class: 'edit-list' }, items.map((it, i) => el('li', {},
      el('input', { type: 'text', maxlength: 40, value: it.name, 'data-act': 'rename', 'data-id': it.id, 'aria-label': 'Namn' }),
      el('button', { class: 'icon sm', 'data-act': 'up', 'data-id': it.id, 'aria-label': 'Flytta upp', disabled: i === 0, text: '↑' }),
      el('button', { class: 'icon sm danger', 'data-act': 'del', 'data-id': it.id, 'aria-label': `Ta bort ${it.name}`, disabled: items.length <= 1, text: '✕' })))),
    items.length < 10 ? el('button', { class: 'link', 'data-act': 'add', text: '+ Lägg till måltid' }) : null,
  ];
}

// In-app manual: static <template id="help-tpl"> in index.html, cloned (never parsed as HTML text).
function helpCard() {
  const frag = document.importNode(document.getElementById('help-tpl').content, true);
  const sec = frag.querySelector('.help');
  const wrap = el('details', { class: 'card set-sec help help-wrap', 'data-sec': 'help', open: setOpen.has('help') },
    el('summary', { class: 'help-title' }, el('span', { class: 'set-title', text: 'Hjälp och manual' }), el('span', { class: 'set-hint', text: 'Så funkar appen' })));
  if (sec) { sec.querySelector('h2')?.remove(); wrap.append(...sec.childNodes); }
  return wrap;
}

export function viewSettings() {
  const g = goalFor(S.state, today());
  const sec = (id, title, hint, ...kids) => el('details', { class: 'card set-sec', 'data-sec': id, open: setOpen.has(id) },
    el('summary', {}, el('span', { class: 'set-title', text: title }), hint ? el('span', { class: 'set-hint', text: hint }) : null),
    el('div', { class: 'set-body' }, kids));
  return [
    el('h2', { class: 'set-group', text: 'Mål' }),
    sec('goal', 'Kalorimål', `${kcal(g.kcal)} kcal/dag`,
      el('label', { class: 'goal-row' }, el('span', { text: 'kcal per dag' }),
        el('input', { type: 'text', inputmode: 'numeric', class: 'num-in', value: String(g.kcal), 'data-act': 'goalkcal', 'aria-label': 'Kalorimål per dag' })),
      el('p', { class: 'muted small', text: 'Ändringen gäller från idag. Tidigare dagar jämförs med målet som gällde då.' })),
    el('h2', { class: 'set-group', text: 'Mat' }),
    sec('meals', 'Måltider', S.state.meals.map((x) => x.name).join(', '), editableList(S.state.meals)),
    el('h2', { class: 'set-group', text: 'Appen' }),
    sec('data', 'Data', 'Backup, import, radera',
      el('p', { class: 'small', text: 'All data sparas bara i den här webbläsaren (localStorage). Rensar du webbplatsdata eller avinstallerar appen försvinner den – spara en backup-fil då och då.' }),
      el('p', { class: 'muted small', text: 'Backup-filen innehåller all din data och ligger okrypterad bland hämtade filer, där den kan synkas till molnet. Dela den bara med den du litar på och radera gamla filer. Läs in filen på en annan enhet för att flytta din data.' }),
      el('div', { class: 'data-actions' },
        el('button', { class: 'btn-file btn-filled', 'data-act': 'backupsave', text: 'Spara backup-fil' }),
        el('label', { class: 'btn-file' }, 'Läs in backup-fil',
          el('input', { type: 'file', id: 'import-file', accept: '.txt,.json', 'data-act': 'importfile' }))),
      el('p', { class: 'import-error small', id: 'import-error', role: 'alert' }),
      el('details', { class: 'data-text' }, el('summary', { text: 'Visa som text' }),
        el('label', { class: 'data-box' }, el('span', { class: 'small', text: 'Export' }),
          el('textarea', { id: 'export-text', rows: 4, readonly: true, placeholder: 'Tryck Exportera' })),
        el('button', { class: 'link', 'data-act': 'export', text: 'Exportera och markera' }),
        el('label', { class: 'data-box' }, el('span', { class: 'small', text: 'Importera (ersätter all data)' }),
          el('textarea', { id: 'import-text', rows: 3, autocomplete: 'off', spellcheck: 'false', placeholder: 'Klistra in en exporterad text' })),
        el('button', { class: 'link', 'data-act': 'import', text: 'Importera' })),
      el('button', { class: 'link danger', 'data-act': 'wipe', text: 'Radera all data' })),
    S.installPrompt ? el('section', { class: 'card' }, el('button', { class: 'primary', 'data-act': 'install', text: 'Installera appen' })) : null,
    helpCard(),
    el('p', { class: 'muted small center', text: `Simple nutrition v${self.APP_VERSION} · inga externa anrop · näringsvärden från Livsmedelsverket` }),
  ];
}

export const viewSoon = (what) => () => [
  el('section', { class: 'card center soon' },
    el('p', { class: 'small', text: `${what} kommer i en senare version.` }),
    el('p', { class: 'muted small', text: 'Logga i Idag så finns datan med när vyn kommer.' })),
];
