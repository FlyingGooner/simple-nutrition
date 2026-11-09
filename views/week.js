// View: Vecka – vanor först (följsamhet, fusk, orsaker, träning), sedan kalorier som stöd (beslut 2026-11-09).
import { weekStats, weekStart, addDays, isoWeek, habitWeek } from '../store.js';
import { today, S, el, svg, stepper, stat, kcal, shortDate, pct, reasonName, goals, weekSessions } from '../ui.js';

const DAYS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

function kcalBars(st) {
  const max = Math.max(...st.days.map((d) => Math.max(d.kcal, d.goal)), 1) * 1.05;
  return el('ul', { class: 'kbars' }, st.days.map((d, i) => {
    const w = Math.round(d.kcal / max * 1000) / 10, gx = Math.round(d.goal / max * 1000) / 10;
    const cls = !d.logged ? 'none' : d.kcal <= d.goal * 1.05 ? 'good' : 'over';
    return el('li', {}, el('button', { class: 'kb-row', 'data-act': 'goto', 'data-val': d.k, 'aria-label': `${shortDate(d.k)}: ${d.logged ? kcal(d.kcal) + ' kcal' : 'ingen mat loggad'}` },
      el('span', { class: 'kb-day', text: DAYS[i] }),
      svg('svg', { class: 'kb', viewBox: '0 0 100 10', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
        svg('rect', { class: 'kb-bg', x: 0, y: 0, width: 100, height: 10, rx: 1 }),
        d.logged ? svg('rect', { class: 'kb-' + cls, x: 0, y: 0, width: w, height: 10, rx: 1 }) : null,
        svg('line', { class: 'kb-goal', x1: gx, x2: gx, y1: 0, y2: 10 })),
      el('span', { class: 'kb-n', text: d.logged ? kcal(d.kcal) : '–' })));
  }));
}

function habitCard(ws) {
  const h = habitWeek(S.state, ws), thr = S.state.settings.successThreshold;
  const reasons = Object.entries(h.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const cls = (r) => (r == null ? 'none' : r >= thr ? 'good' : r >= 0.5 ? 'mid' : 'low');
  return el('section', { class: 'card' },
    el('div', { class: 'stats' },
      stat(pct(h.ratio), 'följsamhet'),
      stat(`${h.cheat + h.extraCheat}`, '🍰 fusk', h.extraCheat ? ` (${h.extraCheat} extra)` : '')),
    el('p', { class: 'muted small center', text: `✅ ${h.followed} följde · ⏭️ ${h.skipped} hoppade över` }),
    el('div', { class: 'week-days' }, h.days.map((d, i) => el('button', { class: 'wd', 'data-act': 'goto', 'data-val': d.k, 'aria-label': `${shortDate(d.k)}: ${pct(d.ratio)}` },
      el('span', { text: DAYS[i] }), el('span', { class: 'dot ' + cls(d.ratio) })))),
    reasons.length ? [el('h2', { class: 'goal-h', text: 'Vanligaste orsak' }),
      el('ul', { class: 'compare' }, reasons.map(([id, n]) => el('li', {}, el('span', { text: reasonName(id) }), el('strong', { text: String(n) }))))] : null);
}

function trainingCard(ws) {
  const c = weekSessions(ws), gs = goals(ws);
  if (!c.all && !gs.length) return null;
  return el('section', { class: 'card' }, el('h2', { text: 'Träning' }),
    el('div', { class: 'stats' }, gs.length ? gs.map((g) => stat(`${g.n}/${g.goal}`, g.label)) : stat(String(c.all), 'pass')),
    el('p', { class: 'muted small center', text: `Gym ${c.gym} · Kondition ${c.cardio}` }));
}

export function viewWeek(ws = S.week) {
  const st = weekStats(S.state, ws);
  return [
    stepper('Byt vecka', ['wprev', 'Föregående vecka'], 'wnow', ['wnext', 'Nästa vecka'], ws >= weekStart(today()),
      `Vecka ${isoWeek(ws)}`, el('small', { text: `${shortDate(ws)}–${shortDate(addDays(ws, 6))}` })),
    habitCard(ws),
    trainingCard(ws),
    el('section', { class: 'card' }, el('h2', { text: 'Kalorier' }),
      el('div', { class: 'stats' },
        stat(st.avg == null ? '–' : kcal(st.avg), 'kcal per dag i snitt'),
        stat(`${st.within}/${st.logged}`, 'dagar inom mål')),
      st.logged ? kcalBars(st) : el('p', { class: 'muted small center', text: 'Ingen mat loggad den här veckan.' })),
  ];
}
