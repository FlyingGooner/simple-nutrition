// View: Vecka – vanor först (följsamhet, fusk, orsaker, träning), sedan kalorier som stöd (beslut 2026-11-09).
import { weekStats, weekStart, addDays, isoWeek, habitWeek } from '../store.js';
import { today, S, el, svg, stepper, stat, kcal, shortDate, pct, reasonName, goals, weekSessions, sessionText, fmtNum, arrange } from '../ui.js';

const DAYS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

function kcalBars(st) {
  const max = Math.max(...st.days.map((d) => Math.max(d.kcal, d.goal ?? 0)), 1) * 1.05;
  return el('ul', { class: 'kbars' }, st.days.map((d, i) => {
    const w = Math.round(d.kcal / max * 1000) / 10, gx = d.goal != null ? Math.round(d.goal / max * 1000) / 10 : null;
    const cls = !d.logged ? 'none' : d.goal == null || d.kcal <= d.goal * 1.05 ? 'good' : 'over';
    // Utan kalorimål: bara siffran per dag, ingen stapel (beslut 2026-11-10).
    return el('li', {}, el('button', { class: 'kb-row' + (st.hasGoal ? '' : ' kb-nobar'), 'data-act': 'goto', 'data-val': d.k, 'aria-label': `${shortDate(d.k)}: ${d.logged ? kcal(d.kcal) + ' kcal' : 'ingen mat loggad'}` },
      el('span', { class: 'kb-day', text: DAYS[i] }),
      !st.hasGoal ? null : svg('svg', { class: 'kb', viewBox: '0 0 100 10', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
        svg('rect', { class: 'kb-bg', x: 0, y: 0, width: 100, height: 10, rx: 1 }),
        d.logged ? svg('rect', { class: 'kb-' + cls, x: 0, y: 0, width: w, height: 10, rx: 1 }) : null,
        gx != null ? svg('line', { class: 'kb-goal', x1: gx, x2: gx, y1: 0, y2: 10 }) : null),
      el('span', { class: 'kb-n', text: d.logged ? kcal(d.kcal) : '–' })));
  }));
}

// Dag för dag (v0.5.12): vanor, träning, kcal och vikt per dag i en tabell. Tryck på en rad = öppna dagen.
function dayTable(ws, st) {
  const h = habitWeek(S.state, ws), thr = S.state.settings.successThreshold;
  const cls = (r) => (r == null ? '' : r >= thr ? 'good-t' : r >= 0.5 ? 'mid-t' : 'low-t');
  return el('table', { class: 'wk-table day-table' },
    el('thead', {}, el('tr', {}, ['Dag', 'Vanor', 'Träning', 'kcal', 'Vikt'].map((t) => el('th', { text: t })))),
    el('tbody', {}, st.days.map((d, i) => {
      const r = h.days[i]?.ratio ?? null, w = S.state.workouts[d.k] || [], kg = S.state.weights[d.k];
      return el('tr', { 'data-act': 'goto', 'data-val': d.k, class: d.k === today() ? 'is-today' : '' },
        el('td', { class: 'wk-open', text: DAYS2[i] }),
        el('td', { class: cls(r), text: r == null ? '–' : pct(r) }),
        el('td', { class: 'dt-train', text: w.length ? '🏋️ ' + w.map(sessionText).join(', ') : '–' }),
        el('td', { text: d.logged ? kcal(d.kcal) : '–' }),
        el('td', { text: kg != null ? fmtNum(kg) : '–' }));
    })));
}
const DAYS2 = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

// Vikt (v0.5.13): senaste vägningen i veckan mot den tidigaste vägningen veckan innan.
function weightCard(ws) {
  const inRange = (from) => [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(from, i)).filter((k) => S.state.weights[k] != null);
  const cur = inRange(ws), prev = inRange(addDays(ws, -7));
  if (!cur.length && !prev.length) return null;
  const last = cur.length ? S.state.weights[cur[cur.length - 1]] : null;
  const base = prev.length ? prev[0] : null, bw = base ? S.state.weights[base] : null;
  const d = last != null && bw != null ? Math.round((last - bw) * 10) / 10 : null;
  const dTxt = d == null ? '' : d === 0 ? '±0 kg' : `${d > 0 ? '+' : '−'}${fmtNum(Math.abs(d))} kg`;
  // Kompakt (v0.5.14): en rad – vikt till vänster, förändring till höger, jämförelsen i liten text.
  // v0.5.15: minikurva i mitten över förra + denna vecka (alla vägningar), jämförelse- och senaste punkten markerade.
  const kg1 = (v) => v.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const spark = (() => {
    const ks = [...prev, ...cur];
    if (ks.length < 2) return el('span', { class: 'w-spark' });
    const p0 = addDays(ws, -7), idx = (k) => { let i = 0; while (addDays(p0, i) < k) i++; return i; };
    const vs = ks.map((k) => S.state.weights[k]), lo = Math.min(...vs), hi = Math.max(...vs), rng = hi - lo || 1;
    const X = (k) => Math.round(4 + idx(k) * 92 / 13), Y = (v) => Math.round((22 - (v - lo) / rng * 18) * 10) / 10;
    const pts = ks.map((k) => [X(k), Y(S.state.weights[k])]);
    return svg('svg', { class: 'w-spark', viewBox: '0 0 100 26', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      svg('line', { class: 'sp-wk', x1: 50, x2: 50, y1: 0, y2: 26 }),
      svg('polyline', { class: 'sp-line', points: pts.map((p) => p.join(',')).join(' ') }),
      base ? svg('line', { class: 'sp-base', x1: X(base), x2: X(base), y1: Y(bw), y2: Y(bw) }) : null,
      last != null ? svg('line', { class: 'sp-last', x1: pts[pts.length - 1][0], x2: pts[pts.length - 1][0], y1: pts[pts.length - 1][1], y2: pts[pts.length - 1][1] }) : null);
  })();
  return el('section', { class: 'card w-card' },
    el('div', { class: 'w-row' },
      el('span', { class: 'w-label', text: 'Vikt' }),
      el('span', { class: 'w-now', text: last != null ? `${kg1(last)} kg` : '–' }),
      spark,
      d != null ? el('span', { class: 'w-chg delta' + (d < 0 ? ' down' : ''), text: dTxt }) : null),
    el('p', { class: 'w-sub', text: last == null ? 'Ingen vägning den här veckan än'
      : bw == null ? 'Ingen vägning veckan innan att jämföra med'
      : `mot ${shortDate(base)} (${kg1(bw)} kg) · ${cur.length} vägning${cur.length === 1 ? '' : 'ar'} denna vecka` }));
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
  return el('section', { class: 'card' }, el('h2', { text: 'Träning' }),
    el('div', { class: 'stats' }, gs.length ? gs.map((g) => stat(`${g.n}/${g.goal}`, g.label)) : stat(String(c.all), 'pass')),
    el('p', { class: 'muted small center', text: `Gym ${c.gym} · Kondition ${c.cardio}` }));
}

export function viewWeek(ws = S.week) {
  const st = weekStats(S.state, ws);
  return [
    stepper('Byt vecka', ['wprev', 'Föregående vecka'], 'wnow', ['wnext', 'Nästa vecka'], ws >= weekStart(today()),
      `Vecka ${isoWeek(ws)}`, el('small', { text: `${shortDate(ws)}–${shortDate(addDays(ws, 6))}` })),
    ...arrange('week', {
    weight: () => weightCard(ws),
    habits: () => habitCard(ws),
    days: () => el('section', { class: 'card' }, el('h2', { text: 'Dag för dag' }), dayTable(ws, st)),
    training: () => trainingCard(ws),
    kcal: () => el('section', { class: 'card' }, el('h2', { text: 'Kalorier' }),
      el('div', { class: 'stats' },
        stat(st.avg == null ? '–' : kcal(st.avg), 'kcal per dag i snitt'),
        st.hasGoal ? stat(`${st.within}/${st.logged}`, 'dagar inom mål') : stat(String(st.logged), 'dagar med mat loggad')),
      st.logged && st.hasGoal ? kcalBars(st) : null),
    }),
  ];
}
