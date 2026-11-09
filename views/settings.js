// View: Inställningar (Mål, Måltider, Data, Hjälp) and the placeholders for Trend and Historik (v0.3).
import { goalFor, findRef } from '../store.js';
import { today, S, setOpen, el, kcal } from '../ui.js';
import { dishEditor, dishList } from './dishes.js';
import { viewAdd } from './add.js';

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

function foodsSection() {
  const f = S.state.foods;
  return [
    f.length ? el('ul', { class: 'posts' }, f.map((x) => el('li', { class: 'own-row' },
      el('span', { class: 'post-name' }, x.name, el('small', { text: `${kcal(x.n[0])} kcal · P ${x.n[1]} · K ${x.n[2]} · F ${x.n[3]} per 100 g` + (x.u ? ` · 1 ${x.u[0]} ≈ ${x.u[1]} g` : '') })),
      el('button', { class: 'icon sm danger', 'data-act': 'fdel', 'data-id': x.id, 'aria-label': `Ta bort ${x.name}`, text: '✕' })))) : null,
    el('p', { class: 'muted small', text: 'Värden per 100 g från förpackningen. Mått (t.ex. 1 st = 40 g) är valfritt.' }),
    el('div', { class: 'own-form' },
      el('input', { type: 'text', id: 'f-name', maxlength: 60, placeholder: 'Namn', 'aria-label': 'Namn', autocomplete: 'off' }),
      ...[['f-kcal', 'kcal'], ['f-p', 'Protein'], ['f-k', 'Kolh.'], ['f-f', 'Fett']].map(([id, l]) =>
        el('input', { type: 'text', inputmode: 'decimal', id, placeholder: l, 'aria-label': l + ' per 100 g' })),
      el('input', { type: 'text', id: 'f-unit', maxlength: 10, placeholder: 'Mått (st)', 'aria-label': 'Mått, valfritt' }),
      el('input', { type: 'text', inputmode: 'decimal', id: 'f-ug', placeholder: 'g per mått', 'aria-label': 'Gram per mått' })),
    el('p', { class: 'import-error small', id: 'f-error', role: 'alert' }),
    f.length < 1000 ? el('button', { class: 'link', 'data-act': 'fadd', text: '+ Spara produkt' }) : null,
  ];
}

function aliasSection() {
  const words = Object.keys(S.state.aliases).sort();
  return [
    words.length ? el('ul', { class: 'posts' }, words.map((w) => {
      const f = findRef(S.state, S.state.aliases[w]);
      return el('li', { class: 'own-row' }, el('span', { class: 'post-name' }, w, el('small', { text: '→ ' + (f ? f.name : 'okänd vara') })),
        el('button', { class: 'icon sm danger', 'data-act': 'adel', 'data-val': w, 'aria-label': `Ta bort sökordet ${w}`, text: '✕' }));
    })) : null,
    el('p', { class: 'muted small', text: 'Spara ett sökord från en vara i Lägg till ("Spara eget sökord"). Ordet visar då varan först.' }),
  ];
}

export function viewSettings() {
  if (S.add?.target === 'dish') return viewAdd();
  if (S.dish) return dishEditor();
  const g = goalFor(S.state, today());
  const opt = (k, label) => el('label', { class: 'goal-row' }, el('span', { text: label }),
    el('input', { type: 'text', inputmode: 'numeric', class: 'num-in', value: g[k] ? String(g[k]) : '', placeholder: 'Av', 'data-act': 'goalmacro', 'data-val': k, 'aria-label': label }));
  const sec = (id, title, hint, ...kids) => el('details', { class: 'card set-sec', 'data-sec': id, open: setOpen.has(id) },
    el('summary', {}, el('span', { class: 'set-title', text: title }), hint ? el('span', { class: 'set-hint', text: hint }) : null),
    el('div', { class: 'set-body' }, kids));
  return [
    el('h2', { class: 'set-group', text: 'Mål' }),
    sec('goal', 'Kalorimål', `${kcal(g.kcal)} kcal/dag`,
      el('label', { class: 'goal-row' }, el('span', { text: 'kcal per dag' }),
        el('input', { type: 'text', inputmode: 'numeric', class: 'num-in', value: String(g.kcal), 'data-act': 'goalkcal', 'aria-label': 'Kalorimål per dag' })),
      el('p', { class: 'muted small', text: 'Ändringen gäller från idag. Tidigare dagar jämförs med målet som gällde då.' })),
    sec('macros', 'Protein och kolhydrater', [g.prot ? `P ${g.prot} g` : '', g.kolh ? `K ${g.kolh} g` : ''].filter(Boolean).join(' · ') || 'Av',
      opt('prot', 'Protein, g per dag'), opt('kolh', 'Kolhydrater, g per dag'),
      el('p', { class: 'muted small', text: 'Valfria mål. Lämna tomt för att stänga av. Gäller från idag.' })),
    el('h2', { class: 'set-group', text: 'Mat' }),
    sec('dishes', 'Mina rätter', `${S.state.dishes.length} st`, dishList()),
    sec('meals', 'Måltider', S.state.meals.map((x) => x.name).join(', '), editableList(S.state.meals)),
    sec('foods', 'Egna produkter', `${S.state.foods.length} st`, foodsSection()),
    sec('aliases', 'Egna sökord', `${Object.keys(S.state.aliases).length} st`, aliasSection()),
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
