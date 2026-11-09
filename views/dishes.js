// Mina rätter: editor (in Inställningar) and dish picking (Lägg till → Rätter). Rendering via el() only.
import { dishTotal, searchDishes } from '../store.js';
import { S, el, kcal, fmtNum, parseNum } from '../ui.js';

export const isBatch = (d) => d.portions > 1;
export const newDraft = () => ({ id: null, name: '', portions: 4, batch: true, cooked: '', items: [] });
export const draftFrom = (d) => ({ id: d.id, name: d.name, portions: d.portions > 1 ? d.portions : 4, batch: d.portions > 1, cooked: d.cooked ? String(d.cooked) : '', items: d.items.map((x) => ({ ...x, n: [...x.n] })) });

/* ---------- Editor ---------- */
export function dishEditor() {
  const d = S.dish, tot = dishTotal(d), port = d.batch ? d.portions : 1;
  const cooked = parseNum(d.cooked);
  const seg = (on, act, label) => el('button', { class: 'seg' + (on ? ' on' : ''), 'data-act': act, 'aria-pressed': on ? 'true' : 'false', text: label });
  return [
    el('div', { class: 'add-top' },
      el('button', { class: 'icon', 'data-act': 'dcancel', 'aria-label': 'Avbryt', text: '✕' }),
      el('h1', { class: 'add-title', text: d.id ? 'Ändra rätt' : 'Ny rätt' })),
    el('section', { class: 'card dish-ed' },
      el('label', { class: 'field' }, el('span', { text: 'Namn' }),
        el('input', { type: 'text', id: 'd-name', maxlength: 60, value: d.name, placeholder: 'T.ex. Köttfärssås', 'data-act': 'dname', autocomplete: 'off' })),
      el('div', { class: 'segs', role: 'group', 'aria-label': 'Receptet gäller' }, seg(!d.batch, 'dper', 'Per portion'), seg(d.batch, 'dbatch', 'Hel sats')),
      el('div', { class: 'dish-nums' },
        d.batch ? el('label', { class: 'field' }, el('span', { text: 'Portioner' }),
          el('input', { type: 'text', inputmode: 'numeric', value: String(d.portions), 'data-act': 'dport', 'aria-label': 'Antal portioner' })) : null,
        el('label', { class: 'field' }, el('span', { text: 'Färdig vikt, g (valfritt)' }),
          el('input', { type: 'text', inputmode: 'numeric', value: d.cooked, 'data-act': 'dcooked', 'aria-label': 'Färdig vikt i gram' }))),
      el('h2', { class: 'dish-h', text: 'Ingredienser (råvikt)' }),
      d.items.length ? el('ul', { class: 'edit-list' }, d.items.map((it, i) => el('li', {},
        el('span', { class: 'ing-name', text: it.name }),
        el('input', { type: 'text', inputmode: 'decimal', class: 'ing-g', value: fmtNum(it.g), 'data-act': 'dig', 'data-val': i, 'aria-label': `Gram ${it.name}` }),
        el('span', { class: 'muted small', text: 'g' }),
        el('button', { class: 'icon sm danger', 'data-act': 'didel', 'data-val': i, 'aria-label': `Ta bort ${it.name}`, text: '✕' }))))
        : el('p', { class: 'muted small', text: 'Inga ingredienser ännu.' }),
      el('button', { class: 'link', 'data-act': 'diadd', text: '+ Lägg till ingrediens' }),
      el('p', { class: 'dish-sum' }, el('strong', { text: `${kcal(tot[0] / port)} kcal` }), d.batch ? ' per portion' : ' per portion',
        el('small', { text: ` · P ${fmtNum(tot[1] / port, 0)} · K ${fmtNum(tot[2] / port, 0)} · F ${fmtNum(tot[3] / port, 0)} g` + (cooked > 0 ? ` · ${kcal(tot[0] / cooked * 100)} kcal/100 g färdig` : '') })),
      el('details', { class: 'guide' }, el('summary', { text: 'Så räknar du' }),
        el('ol', {},
          el('li', { text: 'Väg råvarorna okokta innan du lagar maten.' }),
          el('li', { text: 'Välj Per portion (lagas en åt gången) eller Hel sats och ange antal portioner.' }),
          el('li', { text: 'Väg gärna hela den färdiga rätten (minus kastrullen) och fyll i färdig vikt – då kan du logga i gram, det blir exaktast.' }),
          el('li', { text: 'Vatten, salt och kryddor behöver inte vägas.' }))),
      el('p', { class: 'import-error small', id: 'd-error', role: 'alert' }),
      el('div', { class: 'row-actions' },
        d.id ? el('button', { class: 'link danger', 'data-act': 'ddel', text: 'Ta bort rätten' }) : el('span'),
        el('button', { class: 'weigh-save', 'data-act': 'dsave', text: 'Spara rätt' }))),
  ];
}

export function dishList() {
  const list = S.state.dishes;
  return [
    list.length ? el('ul', { class: 'posts' }, list.map((d) => {
      const t = dishTotal(d);
      return el('li', {}, el('button', { class: 'food-row', 'data-act': 'dedit', 'data-id': d.id },
        el('span', { class: 'post-name' }, d.name, el('small', { text: isBatch(d) ? `Hel sats · ${d.portions} portioner` : 'Per portion' })),
        el('span', { class: 'post-kcal', text: `${kcal(t[0] / d.portions)} kcal/port.` })));
    })) : el('p', { class: 'muted small', text: 'Inga rätter ännu. Bygg en av dina vanliga rätter av råvaror.' }),
    list.length < 500 ? el('button', { class: 'link', 'data-act': 'dnew', text: '+ Ny rätt' }) : null,
  ];
}

/* ---------- Picking a dish to log ---------- */
export function dishResults(q) {
  const list = searchDishes(S.state, q);
  if (!S.state.dishes.length) return [el('p', { class: 'muted small', text: 'Inga rätter ännu. Skapa dem under Inställningar → Mina rätter.' })];
  if (!list.length) return [el('p', { class: 'muted small', text: 'Ingen träff.' })];
  return [el('ul', { class: 'posts' }, list.map((d) => el('li', {}, el('button', { class: 'food-row', 'data-act': 'dpick', 'data-id': d.id },
    el('span', { class: 'post-name' }, d.name, el('small', { text: isBatch(d) ? `${d.portions} portioner` : 'Per portion' })),
    el('span', { class: 'post-kcal', text: `${kcal(dishTotal(d)[0] / d.portions)} kcal/port.` })))))];
}

// Share of the whole recipe for the current pick, or NaN.
export function dishQ(p) {
  const d = p.dish, raw = String(p.amount).trim();
  if (p.mode === 'andel') {
    const m = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
    const v = m ? Number(m[1]) / Number(m[2]) : parseNum(raw);
    return v > 0 && v <= 1 ? v : NaN;
  }
  const a = parseNum(raw);
  if (!(a > 0)) return NaN;
  const q = p.mode === 'g' ? a / d.cooked : a / d.portions;
  return q > 0 && q <= 50 ? q : NaN;
}
export const dishUnit = (p) => (p.mode === 'g' ? 'g' : p.mode === 'andel' ? 'av satsen' : 'port.');

export function dishPickCard() {
  const p = S.add.dpick, d = p.dish, q = dishQ(p), t = dishTotal(d);
  const modes = [['port', 'Portioner'], ...(isBatch(d) ? [['andel', 'Andel']] : []), ...(d.cooked ? [['g', 'Gram']] : [])];
  const quick = p.mode === 'port' ? ['0,5', '1', '1,5', '2'] : p.mode === 'andel' ? ['1/2', '1/3', '1/4', '1/5'] : [];
  return el('section', { class: 'card pick' },
    el('h2', { text: d.name }),
    el('p', { class: 'muted small', text: isBatch(d) ? `Hel sats, ${d.portions} portioner${d.cooked ? `, färdig vikt ${kcal(d.cooked)} g` : ''}` : 'Per portion' }),
    modes.length > 1 ? el('div', { class: 'segs', role: 'group', 'aria-label': 'Ange som' }, modes.map(([m, l]) =>
      el('button', { class: 'seg' + (p.mode === m ? ' on' : ''), 'data-act': 'dmode', 'data-val': m, 'aria-pressed': p.mode === m ? 'true' : 'false', text: l }))) : null,
    el('div', { class: 'pick-row' },
      el('input', { type: 'text', inputmode: p.mode === 'andel' ? 'text' : 'decimal', id: 'amount', value: p.amount, 'aria-label': 'Mängd', autocomplete: 'off' }),
      el('span', { text: dishUnit(p) })),
    quick.length ? el('div', { class: 'chips' }, quick.map((v) => el('button', { class: 'chip' + (p.amount === v ? ' on' : ''), 'data-act': 'dquick', 'data-val': v, text: v }))) : null,
    el('p', { class: 'pick-sum', id: 'pick-sum', text: Number.isFinite(q) ? `${kcal(t[0] * q)} kcal` : 'Ange mängd' }),
    el('div', { class: 'row-actions' },
      el('button', { class: 'link', 'data-act': 'unpick', text: 'Tillbaka' }),
      el('button', { class: 'weigh-save', 'data-act': 'daddsave', text: 'Lägg till' })),
    el('p', { class: 'import-error small', id: 'add-error', role: 'alert' }));
}
