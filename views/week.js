// View: Vecka – average kcal, days within goal, a bar per day. Also shown beside Idag on wide screens.
import { weekStats, weekStart, addDays, isoWeek } from '../store.js';
import { today, S, el, svg, stepper, stat, kcal, shortDate } from '../ui.js';

const DAYS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

function dayBars(st) {
  const max = Math.max(...st.days.map((d) => Math.max(d.kcal, d.goal)), 1) * 1.05;
  return el('ul', { class: 'kbars' }, st.days.map((d, i) => {
    const w = Math.round(d.kcal / max * 1000) / 10, gx = Math.round(d.goal / max * 1000) / 10;
    const cls = !d.logged ? 'none' : d.kcal <= d.goal * 1.05 ? 'good' : 'over';
    return el('li', {}, el('button', { class: 'kb-row', 'data-act': 'goto', 'data-val': d.k, 'aria-label': `${shortDate(d.k)}: ${d.logged ? kcal(d.kcal) + ' kcal' : 'inte loggad'}` },
      el('span', { class: 'kb-day', text: DAYS[i] }),
      svg('svg', { class: 'kb', viewBox: '0 0 100 10', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
        svg('rect', { class: 'kb-bg', x: 0, y: 0, width: 100, height: 10, rx: 1 }),
        d.logged ? svg('rect', { class: 'kb-' + cls, x: 0, y: 0, width: w, height: 10, rx: 1 }) : null,
        svg('line', { class: 'kb-goal', x1: gx, x2: gx, y1: 0, y2: 10 })),
      el('span', { class: 'kb-n', text: d.logged ? kcal(d.kcal) : '–' })));
  }));
}

export function viewWeek(ws = S.week, side = false) {
  const st = weekStats(S.state, ws);
  const head = side
    ? el('p', { class: 'side-title' }, `Vecka ${isoWeek(ws)}`, el('small', { text: `${shortDate(ws)}–${shortDate(addDays(ws, 6))}` }))
    : stepper('Byt vecka', ['wprev', 'Föregående vecka'], 'wnow', ['wnext', 'Nästa vecka'], ws >= weekStart(today()),
      `Vecka ${isoWeek(ws)}`, el('small', { text: `${shortDate(ws)}–${shortDate(addDays(ws, 6))}` }));
  return [
    head,
    el('section', { class: 'card' },
      el('div', { class: 'stats' },
        stat(st.avg == null ? '–' : kcal(st.avg), 'kcal per dag i snitt'),
        stat(`${st.within}/${st.logged}`, 'dagar inom mål')),
      el('p', { class: 'muted small center', text: st.logged ? `${st.logged} loggade dagar · inom mål = högst 5 % över` : 'Inget loggat den här veckan.' })),
    el('section', { class: 'card' }, el('h2', { text: 'Per dag' }), dayBars(st)),
  ];
}
