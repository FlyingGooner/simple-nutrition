// View: Inställningar – grupperna Vanor, Träning, Kalorier och Allmänt, var och en hopfälld för sig (beslut 2026-11-09).
import { goalFor, findRef, addDays } from '../store.js';
import { today, S, setOpen, el, kcal, pct, shortDate, LAYOUT, LAYOUT_VIEWS, layoutOf } from '../ui.js';
import { PLAN_MAX } from '../fdt-store.js';
import { dishEditor, dishList } from './dishes.js';
import { viewAdd } from './add.js';

// Kortordning (v0.6.0): en lista per vy, ↑ ↓ flyttar, ●/○ visar/döljer.
function layoutSection() {
  return Object.entries(LAYOUT_VIEWS).map(([v, name]) => {
    const { order, hidden } = layoutOf(v), label = Object.fromEntries(LAYOUT[v]);
    return [el('h2', { class: 'goal-h lay-h', text: name }),
      el('ul', { class: 'edit-list lay-list' }, order.map((id, i) => {
        const off = hidden.includes(id);
        return el('li', { class: off ? 'l-off' : '' },
          el('span', { class: 'lay-name', text: label[id] }),
          el('button', { class: 'icon sm', 'data-act': 'lup', 'data-kind': v, 'data-id': id, disabled: i === 0, 'aria-label': `Flytta upp ${label[id]}`, text: '↑' }),
          el('button', { class: 'icon sm', 'data-act': 'ldown', 'data-kind': v, 'data-id': id, disabled: i === order.length - 1, 'aria-label': `Flytta ner ${label[id]}`, text: '↓' }),
          el('button', { class: 'icon sm lay-eye', 'data-act': 'lhide', 'data-kind': v, 'data-id': id, 'aria-pressed': String(!off), 'aria-label': `${off ? 'Visa' : 'Dölj'} ${label[id]}`, text: off ? '○' : '●' }));
      })),
      el('button', { class: 'link small-link', 'data-act': 'lreset', 'data-kind': v, text: `Återställ ${name}` })];
  });
}

const LIMITS = { meals: [1, 10, 'Lägg till måltid'], reasons: [0, 60, 'Lägg till orsak'], workoutTypes: [0, 60, 'Lägg till passtyp'] };
function editableList(kind, items) {
  const [min, max, addLabel] = LIMITS[kind];
  return [
    el('ul', { class: 'edit-list' }, items.map((it, i) => el('li', {},
      el('input', { type: 'text', maxlength: 40, value: it.name, 'data-act': 'rename', 'data-kind': kind, 'data-id': it.id, 'aria-label': 'Namn' }),
      kind === 'workoutTypes' ? el('select', { class: 'w-kind', 'data-act': 'wkind', 'data-id': it.id, 'aria-label': `Sort för ${it.name}` },
        el('option', { value: 'gym', selected: it.kind === 'gym', text: 'Gym' }),
        el('option', { value: 'cardio', selected: it.kind === 'cardio', text: 'Kondition' })) : null,
      el('button', { class: 'icon sm', 'data-act': 'up', 'data-kind': kind, 'data-id': it.id, 'aria-label': 'Flytta upp', disabled: i === 0, text: '↑' }),
      el('button', { class: 'icon sm danger', 'data-act': 'del', 'data-kind': kind, 'data-id': it.id, 'aria-label': `Ta bort ${it.name}`, disabled: items.length <= min, text: '✕' })))),
    items.length < max ? el('button', { class: 'link', 'data-act': 'add', 'data-kind': kind, text: '+ ' + addLabel }) : null,
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
  const g = goalFor(S.state, today()), s = S.state.settings;
  const opt = (k, label) => el('label', { class: 'goal-row' }, el('span', { text: label }),
    el('input', { type: 'text', inputmode: 'numeric', class: 'num-in', value: g[k] ? String(g[k]) : '', placeholder: 'Av', id: 'g-' + k, 'aria-label': label }));
  const sec = (id, title, hint, ...kids) => el('details', { class: 'card set-sec', 'data-sec': id, open: setOpen.has(id) },
    el('summary', {}, el('span', { class: 'set-title', text: title }), hint ? el('span', { class: 'set-hint', text: hint }) : null),
    el('div', { class: 'set-body' }, kids));
  // A group (Vanor, Träning, Kalorier, Allmänt) is itself collapsible; its sections fold inside it.
  const group = (id, title, hint, ...kids) => el('details', { class: 'set-group-wrap', 'data-sec': 'g-' + id, open: setOpen.has('g-' + id) },
    el('summary', { class: 'set-group' }, el('span', { class: 'set-gtitle', text: title }), el('span', { class: 'set-hint', text: hint })), kids);
  const goalHint = [['workoutGoal', 'Alla'], ['gymGoal', 'Gym'], ['cardioGoal', 'Kond.']].filter(([k]) => s[k]).map(([k, l]) => `${l} ${s[k]}`).join(' · ');
  return [
    group('habits', 'Vanor', `Minst ${pct(s.successThreshold)}`,
      sec('plan', 'Min plan', s.planText ? s.planText.split('\n')[0].slice(0, 30) + (s.planText.length > 30 ? '…' : '') : 'Ingen plan',
        el('textarea', { rows: 3, maxlength: PLAN_MAX, placeholder: 'T.ex. matlåda till lunch, inget godis på vardagar', id: 'plan-text', 'aria-label': 'Min plan', text: s.planText }),
        el('div', { class: 'save-row' }, el('button', { class: 'weigh-save', 'data-act': 'plansave', text: 'Spara plan' })),
        el('p', { class: 'muted small', text: 'Visas överst i Idag som påminnelse.' })),
      sec('threshold', 'Lyckad dag', `Minst ${pct(s.successThreshold)}`,
        el('label', { class: 'range' }, el('span', {}, 'Minst ', el('strong', { id: 'thr', text: pct(s.successThreshold) }), ' följsamhet'),
          el('input', { type: 'range', min: 50, max: 100, step: 5, value: Math.round(s.successThreshold * 100), 'data-act': 'threshold' })),
        el('p', { class: 'muted small', text: '✅ = 1 poäng, 🍰 = 0, ⏭️ räknas inte. Lyckade dagar i rad = 🔥 streak.' })),
      sec('meals', 'Måltider', S.state.meals.map((x) => x.name).join(', '), editableList('meals', S.state.meals)),
      sec('reasons', 'Orsaker', `${s.reasons.length} st`, editableList('reasons', s.reasons))),
    group('training', 'Träning', goalHint || `${s.workoutTypes.length} passtyper`,
      sec('workouts', 'Passtyper och mål', goalHint ? `Mål: ${goalHint}` : `${s.workoutTypes.length} typer`, editableList('workoutTypes', s.workoutTypes),
        el('p', { class: 'muted small', text: 'Gym-typer kan kombineras till ett pass (Push + Pull = 1 pass). Kondition loggas med sträcka och tid.' }),
        el('h2', { class: 'goal-h', text: 'Mål per vecka' }),
        [['workoutGoal', 'Alla pass'], ['gymGoal', 'Gympass'], ['cardioGoal', 'Konditionspass']].map(([k, label]) =>
          el('label', { class: 'goal-row' }, el('span', { text: label }),
            el('select', { 'data-act': 'wgoal', 'data-val': k, 'aria-label': `Mål per vecka, ${label.toLowerCase()}` },
              Array.from({ length: 15 }, (_, i) => el('option', { value: i, selected: i === s[k], text: i ? `${i} pass` : 'Inget mål' }))))))),
    group('kcal', 'Kalorier', g.kcal ? `${kcal(g.kcal)} kcal/dag` : 'Inget mål',
      sec('goal', 'Kalorimål', g.kcal ? `${kcal(g.kcal)} kcal/dag` : 'Inget mål',
        el('label', { class: 'goal-row' }, el('span', { text: 'kcal per dag' }),
          el('input', { type: 'text', inputmode: 'numeric', class: 'num-in', value: g.kcal ? String(g.kcal) : '', placeholder: 'Inget mål', id: 'g-kcal', 'aria-label': 'Kalorimål per dag' }),
          el('button', { class: 'weigh-save', 'data-act': 'goalsave', text: 'Spara' })),
        el('p', { class: 'muted small', text: 'Valfritt – lämna tomt för inget mål. Ändringen gäller från idag; tidigare dagar jämförs med målet som gällde då.' })),
      sec('macros', 'Protein och kolhydrater', [g.prot ? `P ${g.prot} g` : '', g.kolh ? `K ${g.kolh} g` : ''].filter(Boolean).join(' · ') || 'Av',
        opt('prot', 'Protein, g per dag'), opt('kolh', 'Kolhydrater, g per dag'),
        el('div', { class: 'save-row' }, el('button', { class: 'weigh-save', 'data-act': 'macrosave', text: 'Spara mål' })),
        el('p', { class: 'muted small', text: 'Valfria mål. Lämna tomt för att stänga av. Gäller från idag.' })),
      sec('dishes', 'Mina rätter', `${S.state.dishes.length} st`, dishList()),
      sec('foods', 'Egna produkter', `${S.state.foods.length} st`, foodsSection()),
      sec('aliases', 'Egna sökord', `${Object.keys(S.state.aliases).length} st`, aliasSection())),
    group('layout', 'Utseende', 'Kortordning',
      sec('layout', 'Kortordning', Object.keys(LAYOUT_VIEWS).some((v) => S.state.layout?.[v]) ? 'Egen' : 'Standard',
        el('p', { class: 'muted small', text: 'Välj ordning på korten i varje vy. ↑ ↓ flyttar, ● visas, ○ dolt.' }),
        layoutSection(),
        Object.keys(LAYOUT_VIEWS).some((v) => S.state.layout?.[v])
          ? el('div', { class: 'save-row' }, el('button', { class: 'link', 'data-act': 'lresetall', text: 'Återställ alla vyer' })) : null)),
    group('app', 'Allmänt', 'Data, hjälp',
      sec('data', 'Data', 'Backup, import, radera',
        el('p', { class: 'small', text: 'All data sparas bara i den här webbläsaren (localStorage). Rensar du webbplatsdata eller avinstallerar appen försvinner den – spara en backup-fil då och då.' }),
        el('p', { class: 'muted small', text: 'Backup-filen innehåller all din data och krypteras alltid med ett lösenord du väljer. Du kan också låta appen skapa ett slumpmässigt lösenord. Glömmer du det går filen inte att öppna. Radera gamla filer. Läs in filen på en annan enhet för att flytta din data.' }),
        el('p', { class: 'small', text: 'Flyttar du från Följ planen: spara en backup-fil där och läs in den här. Måltider, orsaker, vägningar och pass läggs till – inget du redan har tas bort.' }),
        (() => {   // v0.7.0: status för senaste backup, direkt ovanför knapparna
          const last = S.state.backup.last, old = !last || addDays(last, 30) <= today();
          const hasData = Object.keys(S.state.log).length || Object.keys(S.state.habits).length || Object.keys(S.state.weights).length;
          return el('p', { class: 'bk-status' + (old && hasData ? ' bk-old' : '') },
            last ? `Senaste backup: ${shortDate(last)}` : 'Ingen backup sparad än',
            old && hasData ? el('small', { text: last ? 'Mer än en månad sedan – bra idé att göra en ny.' : 'Bra idé att göra en nu.' }) : null);
        })(),
        el('div', { class: 'data-actions' },
          el('button', { class: 'btn-file btn-filled', 'data-act': 'backupsave', text: 'Spara backup-fil' }),
          el('label', { class: 'btn-file' }, 'Läs in backup-fil',
            el('input', { type: 'file', id: 'import-file', accept: '.txt,.json', 'data-act': 'importfile' }))),
        el('p', { class: 'import-error small', id: 'import-error', role: 'alert' }),
        el('details', { class: 'data-text' }, el('summary', { text: 'Klistra in text' }),
          el('label', { class: 'data-box' }, el('span', { class: 'small', text: 'Importera (ersätter all data – från Följ planen läggs den till)' }),
            el('textarea', { id: 'import-text', rows: 3, autocomplete: 'off', spellcheck: 'false', placeholder: 'Klistra in innehållet i en backup-fil' })),
          el('button', { class: 'link', 'data-act': 'import', text: 'Importera' })),
        el('label', { class: 'goal-row' }, el('span', { text: 'Påminn om backup' }),
          el('select', { 'data-act': 'bkremind', 'aria-label': 'Påminn om backup' },
            [['week', 'Varje vecka'], ['month', 'Varje månad'], ['off', 'Aldrig']].map(([v, l]) =>
              el('option', { value: v, selected: S.state.backup.remind === v, text: l })))),
        el('button', { class: 'link danger', 'data-act': 'wipe', text: 'Radera all data' })),
      S.installPrompt ? el('section', { class: 'card' }, el('button', { class: 'primary', 'data-act': 'install', text: 'Installera appen' })) : null,
      helpCard()),
    el('p', { class: 'muted small center', text: `Simple nutrition v${self.APP_VERSION} · inga externa anrop · näringsvärden från Livsmedelsverket` }),
  ];
}
