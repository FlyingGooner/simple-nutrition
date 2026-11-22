// View: Inställningar – grupperna Vanor, Träning, Kalorier och Allmänt, var och en hopfälld för sig (beslut 2026-11-09).
import { goalFor, goalMeaning, findRef, addDays, currentWeight, weightPlan } from '../store.js';
import { today, S, setOpen, el, kcal, pct, shortDate, LAYOUT, LAYOUT_VIEWS, layoutOf, imperial, wOut, wUnit, fmtNum, habitsOnly } from '../ui.js';
import { PLAN_MAX } from '../habit-store.js';
import { savedPassword } from './data.js';
import { forecastLine } from './trend.js';
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
      kind === 'meals' ? el('button', { class: 'chip sm' + (it.opt ? '' : ' on'), 'data-act': 'mealopt', 'data-id': it.id, 'aria-pressed': String(!it.opt), title: 'Krävs för att dagen ska räknas i statistiken', text: it.opt ? 'Valfri' : 'Krävs' }) : null,
      el('button', { class: 'icon sm', 'data-act': 'up', 'data-kind': kind, 'data-id': it.id, 'aria-label': 'Flytta upp', disabled: i === 0, text: '↑' }),
      el('button', { class: 'icon sm danger', 'data-act': 'del', 'data-kind': kind, 'data-id': it.id, 'aria-label': `Ta bort ${it.name}`, disabled: items.length <= min, text: '✕' })))),
    items.length < max ? el('button', { class: 'link', 'data-act': 'add', 'data-kind': kind, text: '+ ' + addLabel }) : null,
  ];
}

// In-app manual: static <template id="help-tpl"> in index.html, cloned (never parsed as HTML text).
// Viktmål (2026-11-21): målvikt och antingen datum eller takt per vecka, högst 1 % av vikten per vecka.
function wgoalSection() {
  const g = S.state.wgoal, cur = currentWeight(S.state), p = weightPlan(g, cur, today());
  const w1 = (v) => fmtNum(Math.round(wOut(v) * 10) / 10), u = wUnit();
  // Ett formulär (2026-11-21): målvikt, takt och datum är alla valfria – takt och datum utesluter varandra.
  const field = (id, label, value, ph, type = 'text') => el('label', { class: 'goal-row' }, el('span', { text: label }),
    el('input', { type, inputmode: type === 'text' ? 'decimal' : undefined, class: type === 'text' ? 'num-in' : 'num-in date-in', value, placeholder: ph, id, 'aria-label': label }));
  const info = !g ? null : cur == null ? 'Väg dig under Idag så räknas takten ut.'
    : p.reached ? 'Målet är nått.'
    : `Takt ${w1(Math.abs(p.rate))} ${u}/v ≈ ${kcal(Math.abs(p.kcalDay))} kcal/dag ${p.kcalDay < 0 ? 'underskott' : 'överskott'}.`;
  // Takt krävs (2026-11-22): äldre mål med datum eller utan takt fylls i med den takt planen räknar med.
  const rateVal = g?.pct != null ? fmtNum(g.pct, 2) : g?.rate ? w1(g.rate) : p && !p.reached && p.rate ? w1(Math.abs(p.rate)) : '';
  return [
    field('wg-target', `Målvikt (${u}, valfritt)`, g?.target != null ? w1(g.target) : '', cur ? w1(cur) : ''),
    el('label', { class: 'goal-row' }, el('span', { text: 'Takt per vecka' }),
      el('input', { type: 'text', inputmode: 'decimal', class: 'num-in', id: 'wg-rate', 'aria-label': 'Takt per vecka', value: rateVal, placeholder: '0,5' }),
      el('select', { id: 'wg-unit', 'aria-label': 'Enhet för takten' }, [[u, u], ['%', '%']].map(([v, t]) => el('option', { value: v, selected: (g?.pct != null) === (v === '%'), text: t })))),
    el('div', { class: 'save-row' },
      g ? el('button', { class: 'link', 'data-act': 'wgoaloff', text: 'Ta bort mål' }) : null,
      el('button', { class: 'weigh-save', 'data-act': 'wgoalsave', text: 'Spara viktmål' })),
    info ? el('p', { class: 'small', text: info }) : null,
    g ? forecastLine() : null,
    el('p', { class: 'muted small', text: 'Takten per vecka krävs, målvikten är valfri. Kalorimålet = det du faktiskt gör av med (räknas fram ur maten du loggar och hur vikten ändras över tid) minus underskottet för takten, så det justeras efter hur det går i praktiken. Högst 1 % av vikten per vecka – snabbare än så är svårt att hålla och tappar mest vätska och muskler.' }),
  ];
}

function helpCard() {
  const frag = document.importNode((document.getElementById(self.I18N.lang() === 'en' ? 'help-tpl-en' : 'help-tpl') || document.getElementById('help-tpl')).content, true);
  const sec = frag.querySelector('.help');
  const wrap = el('details', { class: 'card set-sec help help-wrap', 'data-sec': 'help', open: setOpen.has('help') },
    el('summary', { class: 'help-title' }, el('span', { class: 'set-title', text: 'Hjälp och manual' }), el('span', { class: 'set-hint', text: 'Så funkar appen' })));
  if (sec) { sec.querySelector('h2')?.remove(); wrap.append(...sec.childNodes); }
  return wrap;
}

function foodsSection() {
  const f = S.state.foods;
  const ed = f.find((x) => x.id === S.foodEdit) || null;   // product being edited: the form is filled with its values
  const v = (x) => (x == null ? '' : String(x));
  return [
    f.length ? el('ul', { class: 'posts' }, f.map((x) => el('li', { class: 'own-row' },
      el('span', { class: 'post-name' }, x.name, el('small', { text: `${kcal(x.n[0])} kcal · P ${x.n[1]} · K ${x.n[2]} · F ${x.n[3]} per 100 g` + (x.u ? ` · 1 ${x.u[0]} ≈ ${x.u[1]} g` : '') })),
      el('button', { class: 'icon sm', 'data-act': 'fedit', 'data-id': x.id, 'aria-label': `Ändra ${x.name}`, text: '✎' }),
      el('button', { class: 'icon sm danger', 'data-act': 'fdel', 'data-id': x.id, 'aria-label': `Ta bort ${x.name}`, text: '✕' })))) : null,
    ...(!ed && !S.foodForm ? [f.length < 1000 ? el('button', { class: 'link', 'data-act': 'fnew', text: '+ Lägg till produkt' }) : null] : [
    el('p', { class: 'muted small', text: 'Värden per 100 g från förpackningen. Mått (t.ex. 1 st = 40 g) är valfritt.' }),
    el('div', { class: 'own-form' },
      el('input', { type: 'text', id: 'f-name', maxlength: 60, placeholder: 'Namn', 'aria-label': 'Namn', autocomplete: 'off', value: v(ed?.name) }),
      ...[['f-kcal', 'kcal'], ['f-p', 'Protein'], ['f-k', 'Kolh.'], ['f-f', 'Fett']].map(([id, l], i) =>
        el('input', { type: 'text', inputmode: 'decimal', id, placeholder: l, 'aria-label': l + ' per 100 g', value: v(ed?.n[i]) })),
      el('input', { type: 'text', id: 'f-unit', maxlength: 10, placeholder: 'Mått (st)', 'aria-label': 'Mått, valfritt', value: v(ed?.u?.[0]) }),
      el('input', { type: 'text', inputmode: 'decimal', id: 'f-ug', placeholder: 'g per mått', 'aria-label': 'Gram per mått', value: v(ed?.u?.[1]) })),
    el('p', { class: 'import-error small', id: 'f-error', role: 'alert' }),
    el('div', { class: 'row' },
      el('button', { class: 'link', 'data-act': 'fadd', text: ed ? `Spara ändringar i ${ed.name}` : 'Spara produkt' }),
      el('button', { class: 'link', 'data-act': 'fcancel', text: 'Avbryt' }))]),
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
      sec('track', 'Vad följer du?', habitsOnly() ? 'Bara vanor' : 'Vanor och kalorier',
        el('label', { class: 'goal-row' }, el('span', { text: 'Följ' }),
          el('select', { 'data-act': 'track', 'aria-label': 'Vad följer du?' },
            [['both', 'Vanor och kalorier'], ['habits', 'Bara vanor']].map(([v, l]) => el('option', { value: v, selected: habitsOnly() === (v === 'habits'), text: l })))),
        el('p', { class: 'muted small', text: 'Bara vanor: Idag visar bara ✅ 🍰 ⏭️, utan mat och kalorier. En måltid räknas som ifylld när du valt vana. Maten du redan loggat finns kvar.' })),
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
      sec('wgoal', 'Viktmål', !S.state.wgoal ? 'Inget mål' : S.state.wgoal.pct != null && S.state.wgoal.target == null ? `−${fmtNum(S.state.wgoal.pct, 2)} %/v` : S.state.wgoal.target == null ? `−${fmtNum(Math.round(wOut(S.state.wgoal.rate) * 100) / 100)} ${wUnit()}/v` : `${fmtNum(Math.round(wOut(S.state.wgoal.target) * 10) / 10)} ${wUnit()}`, wgoalSection()),
      sec('goal', 'Kalorimål', g.kcal ? `${kcal(g.kcal)} kcal/dag` : 'Inget mål',
        el('label', { class: 'goal-row' }, el('span', { text: 'kcal per dag' }),
          el('input', { type: 'text', inputmode: 'numeric', class: 'num-in', value: g.kcal ? String(g.kcal) : '', placeholder: 'Inget mål', id: 'g-kcal', 'aria-label': 'Kalorimål per dag' }),
          el('button', { class: 'weigh-save', 'data-act': 'goalsave', text: 'Spara' })),
        (() => { const m = goalMeaning(S.state, g.kcal, today());
          return m ? el('p', { class: 'small goal-why', text: `Du gör av med ungefär ${kcal(m.tdee)} kcal/dag. Med ${kcal(g.kcal)} kcal/dag ${m.kgWeek < -0.02 ? `går du ner ungefär ${fmtNum(Math.round(wOut(-m.kgWeek) * 100) / 100, 2)} ${wUnit()} i veckan` : m.kgWeek > 0.02 ? `går du upp ungefär ${fmtNum(Math.round(wOut(m.kgWeek) * 100) / 100, 2)} ${wUnit()} i veckan` : 'håller du vikten'}.` }) : null; })(),
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
    group('app', 'Allmänt', 'Språk, mått, data, hjälp',
      sec('lang', 'Språk, tema och mått', self.I18N.LANGS[self.I18N.lang()] + (imperial() ? ' · imperial' : ' · metriskt'),
        el('label', { class: 'goal-row' }, el('span', { text: 'Språk' }),
          el('select', { 'data-act': 'lang', 'aria-label': 'Språk' },
            Object.entries(self.I18N.LANGS).map(([v, l]) => el('option', { value: v, selected: self.I18N.lang() === v, text: l, 'data-no-tr': '' })))),
        el('label', { class: 'goal-row' }, el('span', { text: 'Tema' }),
          el('select', { 'data-act': 'theme', 'aria-label': 'Tema' },
            [['standard', 'Standard'], ['chalk', 'Griffeltavla']].map(([v, l]) => el('option', { value: v, selected: self.THEME.get() === v, text: l })))),
        el('label', { class: 'goal-row' }, el('span', { text: 'Måttsystem' }),
          el('select', { 'data-act': 'units', 'aria-label': 'Måttsystem' },
            [['metric', 'Metriskt (g, dl, kg, km)'], ['imperial', 'Imperial (oz, cup, lb, mi)']].map(([v, l]) => el('option', { value: v, selected: imperial() === (v === 'imperial'), text: l })))),
        el('p', { class: 'muted small', text: 'Måtten byts bara i visningen – allt sparas som förut, så du kan byta när du vill.' })),
      sec('data', 'Data', 'Backup, import, radera',
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
        pwdBox(),
        el('p', { class: 'import-error small', id: 'import-error', role: 'alert' }),
        // Städat (2026-11-17): det man sällan behöver ligger under Fler val.
        el('details', { class: 'data-more', 'data-sec': 'data-more', open: setOpen.has('data-more') }, el('summary', { text: 'Fler val' }),
          el('details', { class: 'data-text' }, el('summary', { text: 'Klistra in text' }),
            el('label', { class: 'data-box' }, el('span', { class: 'small', text: 'Importera (ersätter all data – från Följ planen läggs den till)' }),
              el('textarea', { id: 'import-text', rows: 3, autocomplete: 'off', spellcheck: 'false', placeholder: 'Klistra in innehållet i en backup-fil' })),
            el('button', { class: 'link', 'data-act': 'import', text: 'Importera' })),
          el('label', { class: 'goal-row' }, el('span', { text: 'Påminn om backup' }),
            el('select', { 'data-act': 'bkremind', 'aria-label': 'Påminn om backup' },
              [['week', 'Varje vecka'], ['month', 'Varje månad'], ['off', 'Aldrig']].map(([v, l]) =>
                el('option', { value: v, selected: S.state.backup.remind === v, text: l })))),
          el('div', { class: 'csv-row' }, el('button', { class: 'link', 'data-act': 'csv', text: 'Exportera CSV' }),
            el('p', { class: 'muted small', text: 'Ett okrypterat kalkylark, t.ex. för Excel.' })),
          el('p', { class: 'muted small', text: 'All data finns bara i den här webbläsaren. Läs in backup-filen på en annan enhet för att flytta den. Från Följ planen läggs data till – inget tas bort.' }),
          el('button', { class: 'link pwd-own', 'data-act': 'pwdown', text: 'Välj egen kod' }),
          el('button', { class: 'link danger', 'data-act': 'wipe', text: 'Radera all data' }))),
      S.installPrompt ? el('section', { class: 'card' }, el('button', { class: 'primary', 'data-act': 'install', text: 'Installera appen' })) : null,
      // Alla appar (2026-11-15): öppna i webbläsaren eller ladda ner från GitHub. el() släpper inte igenom href, så de fasta adresserna sätts med Object.assign (aldrig data).
      sec('apps', 'Alla mina appar', 'Öppna, ladda ner, GitHub', el('div', { class: 'dl-src' },
        el('div', { class: 'dl-app' }, el('b', { text: 'Fitness buddy' + (" (den här)") }),
          Object.assign(el('a', { class: 'link', target: '_blank', rel: 'noopener', text: 'Öppna' }), { href: 'https://flyinggooner.github.io/simple-nutrition/' }),
          Object.assign(el('a', { class: 'link', download: 'simple-nutrition.html', text: 'Ladda ner (HTML)' }), { href: 'simple-nutrition.html' }),
          Object.assign(el('a', { class: 'link', rel: 'noopener', target: '_blank', text: 'GitHub' }), { href: 'https://github.com/FlyingGooner/simple-nutrition' }))),
        el('div', { class: 'dl-app' }, el('b', { text: 'Budget buddy' + ('') }),
          Object.assign(el('a', { class: 'link', target: '_blank', rel: 'noopener', text: 'Öppna' }), { href: 'https://flyinggooner.github.io/budget-buddy/' }),
          Object.assign(el('a', { class: 'link', download: 'budget-buddy.html', text: 'Ladda ner (HTML)' }), { href: 'https://flyinggooner.github.io/budget-buddy/budget-buddy.html' }),
          Object.assign(el('a', { class: 'link', rel: 'noopener', target: '_blank', text: 'GitHub' }), { href: 'https://github.com/FlyingGooner/budget-buddy' })),
        el('div', { class: 'dl-app' }, el('b', { text: 'Football, not soccer' + ('') }),
          Object.assign(el('a', { class: 'link', target: '_blank', rel: 'noopener', text: 'Öppna' }), { href: 'https://flyinggooner.github.io/Football-not-soccer/' }),
          Object.assign(el('a', { class: 'link', download: 'Football-not-soccer.html', text: 'Ladda ner (HTML)' }), { href: 'https://flyinggooner.github.io/Football-not-soccer/Football-not-soccer.html' }),
          Object.assign(el('a', { class: 'link', rel: 'noopener', target: '_blank', text: 'GitHub' }), { href: 'https://github.com/FlyingGooner/Football-not-soccer' })),
        el('div', { class: 'dl-app' }, el('b', { text: 'Task buddy' + ('') }),
          Object.assign(el('a', { class: 'link', target: '_blank', rel: 'noopener', text: 'Öppna' }), { href: 'https://flyinggooner.github.io/Stress-control/' }),
          Object.assign(el('a', { class: 'link', download: 'Stress-control.html', text: 'Ladda ner (HTML)' }), { href: 'https://flyinggooner.github.io/Stress-control/Stress-control.html' }),
          Object.assign(el('a', { class: 'link', rel: 'noopener', target: '_blank', text: 'GitHub' }), { href: 'https://github.com/FlyingGooner/Stress-control' })),
        el('p', { class: 'small', text: 'Spara som app: Android (Chrome) – tryck ⋮ och välj Installera app. iPhone (Safari) – tryck Dela och välj Lägg till på hemskärmen.' }),
        el('p', { class: 'muted small', text: 'Ladda ner (HTML) ger hela appen i en enda fil som du öppnar i webbläsaren, även utan nät. Den sparar sin data för sig – flytta data dit med en backup-fil.' })),
      helpCard()),
    el('p', { class: 'muted small center', text: `Fitness buddy v${self.APP_VERSION} · inga externa anrop · näringsvärden från Livsmedelsverket` }),
  ];
}

// Din kod (2026-11-15): skapas alltid av appen. Visa, Kopiera, Ny kod.
function pwdBox() {
  const p = savedPassword();
  return el('div', { class: 'pwd-card' },
    el('div', { class: 'pwd-head' }, el('span', { text: '🔑 Din kod' }),
      el('button', { class: 'link', 'data-act': 'pwdshow', 'aria-pressed': S.showPwd ? 'true' : 'false', text: S.showPwd ? 'Dölj' : 'Visa' }),
      el('button', { class: 'link', 'data-act': 'pwdcopy', text: 'Kopiera' }),
      el('button', { class: 'link', 'data-act': 'pwdset', text: 'Ny kod' })),
    S.showPwd && p ? el('p', { class: 'pwd-show', text: p }) : null,
    el('p', { class: 'muted small pwd-note', text: 'Backupen låses med koden. Spara den i din lösenordshanterare.' }));
}
