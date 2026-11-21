// View: Vecka – vanor först (följsamhet, fusk, orsaker, träning), sedan kalorier som stöd (beslut 2026-11-09).
import { weekStats, weekStart, addDays, isoWeek, habitWeek, currentWeight, dayCheck, energyEstimate, goalFor, sumN, periodEnergy } from '../store.js';
import { energyStats } from './trend.js';
import { today, S, el, svg, stepper, stat, kcal, shortDate, pct, reasonName, goals, weekSessions, sessionText, fmtNum, arrange, wOut, wUnit } from '../ui.js';

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
        // Vanor men ingen mat (2026-11-21): tydligt att dagen inte räknas.
        // Idag (2026-11-21): pågår, räknas när dagen är slut – markeras med … i stället för ○.
        ...[(() => { const c = dayCheck(S.state, d.k, today()), now = c.reason === 'today';
          return el('td', { class: !now && ((d.logged && !c.ok) || (!d.logged && r != null)) ? 'dt-inc' : '', text: d.logged ? kcal(d.kcal) + (c.ok ? '' : now ? ' …' : ' ○') : r != null && !now ? 'ingen mat ○' : '–' }); })()],
        el('td', { text: kg != null ? fmtNum(kg) : '–' }));
    })));
}
const DAYS2 = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

// Kalorier och vikt i samma diagram (2026-11-21): förra + denna vecka, staplar = kcal per dag, linje = vikt,
// streckad linje = vad som håller vikten (förbrukningen) eller kalorimålet. Ofullständiga dagar ljusare.
function kcalWeightChart(ws) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(ws, i - 7)), t = today();
  const kc = days.map((k) => (k > t ? null : Math.round(sumN(S.state.log[k] || [])[0]) || null));
  const kg = days.map((k) => S.state.weights[k] ?? null);
  if (kc.filter(Boolean).length + kg.filter((x) => x != null).length < 2) return null;
  const e = energyEstimate(S.state, t), ref = e && e.ready && e.quality >= 0.25 ? Math.round(e.tdee / 50) * 50 : null;
  const goal = goalFor(S.state, addDays(ws, 6)).kcal ?? null;
  const W = 320, H = 120, top = 8, bot = 96, cw = W / 14;
  const kmax = Math.max(...kc.filter(Boolean), ref ?? 0, goal ?? 0, 1000) * 1.08;
  const Yk = (v) => bot - v / kmax * (bot - top);
  const ws_ = kg.filter((x) => x != null), lo = Math.min(...ws_) - 0.3, hi = Math.max(...ws_) + 0.3;
  const Yw = (v) => top + 6 + (hi - v) / (hi - lo || 1) * (bot - top - 12);
  const pts = kg.map((v, i) => (v == null ? null : [i * cw + cw / 2, Yw(v)])).filter(Boolean);
  const r1 = (x) => Math.round(x * 10) / 10;
  return el('div', { class: 'kw' },
    svg('svg', { class: 'kw-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Kalorier per dag och vikt, förra och denna vecka' },
      svg('rect', { class: 'kw-cur', x: 7 * cw, y: 0, width: 7 * cw, height: bot + 2, rx: 6 }),
      kc.map((v, i) => (v ? svg('rect', { class: 'kw-bar' + (dayCheck(S.state, days[i], t).ok ? '' : ' inc'), x: r1(i * cw + cw * 0.18), y: r1(Yk(v)), width: r1(cw * 0.64), height: r1(bot - Yk(v)), rx: 2 }) : null)),
      ref ? svg('line', { class: 'kw-ref', x1: 0, x2: W, y1: r1(Yk(ref)), y2: r1(Yk(ref)) }) : null,
      goal ? svg('line', { class: 'kw-goal', x1: 0, x2: W, y1: r1(Yk(goal)), y2: r1(Yk(goal)) }) : null,
      pts.length > 1 ? svg('polyline', { class: 'kw-line', points: pts.map((p) => p.map(r1).join(',')).join(' ') }) : null,
      pts.map((p) => svg('circle', { class: 'kw-dot', cx: r1(p[0]), cy: r1(p[1]), r: 2.6 })),
      days.map((k, i) => svg('text', { class: 'kw-day' + (i >= 7 ? ' cur' : ''), x: r1(i * cw + cw / 2), y: H - 8, 'text-anchor': 'middle' }, DAYS[i % 7]))),
    el('p', { class: 'kw-legend' },
      el('span', { class: 'lg-bar' }), el('span', { text: 'kcal per dag' }),
      el('span', { class: 'lg-line' }), el('span', { text: 'vikt' }),
      ref ? [el('span', { class: 'lg-ref' }), el('span', { text: `håller vikten ≈ ${kcal(ref)}` })] : null,
      goal ? [el('span', { class: 'lg-goal' }), el('span', { text: `kalorimål ${kcal(goal)}` })] : null));
}

// Vikt (v0.5.13): senaste vägningen i veckan mot den tidigaste vägningen veckan innan.
function weightCard(ws) {
  const inRange = (from) => [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(from, i)).filter((k) => S.state.weights[k] != null);
  const cur = inRange(ws), prev = inRange(addDays(ws, -7));
  if (!cur.length && !prev.length) return null;
  const last = cur.length ? S.state.weights[cur[cur.length - 1]] : null;
  const base = prev.length ? prev[0] : null, bw = base ? S.state.weights[base] : null;
  const d = last != null && bw != null ? Math.round((last - bw) * 10) / 10 : null;
  const dTxt = d == null ? '' : d === 0 ? `±0 ${wUnit()}` : `${d > 0 ? '+' : '−'}${fmtNum(wOut(Math.abs(d)))} ${wUnit()}`;
  const kg1 = (v) => wOut(v).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // Kompakt (v0.5.14): en rad – vikt till vänster, förändring till höger, jämförelsen i liten text.
  return el('section', { class: 'card w-card' },
    el('div', { class: 'w-row' },
      el('span', { class: 'w-label', text: 'Vikt' }),
      el('span', { class: 'w-now', text: last != null ? `${kg1(last)} ${wUnit()}` : '–' }),
      el('span', { class: 'w-flex' }),
      d != null ? el('span', { class: 'w-chg delta' + (d < 0 ? ' down' : ''), text: dTxt }) : null),
    el('p', { class: 'w-sub', text: last == null ? 'Ingen vägning den här veckan än'
      : bw == null ? 'Ingen vägning veckan innan att jämföra med'
      : `mot ${shortDate(base)} (${kg1(bw)} ${wUnit()}) · ${cur.length} vägning${cur.length === 1 ? '' : 'ar'} denna vecka` }),
    kcalWeightChart(ws));
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
  if (!c.all && !gs.length) return null;   // städning 2026-11-21: inget att visa
  return el('section', { class: 'card' }, el('h2', { text: 'Träning' }),
    el('div', { class: 'stats' }, gs.length ? gs.map((g) => stat(`${g.n}/${g.goal}`, g.label)) : stat(String(c.all), 'pass')),
    el('p', { class: 'muted small center', text: `Gym ${c.gym} · Kondition ${c.cardio}` }));
}

export function viewWeek(ws = S.week) {
  const st = weekStats(S.state, ws);
  return [
    el('div', { class: 'card day-head' }, stepper('Byt vecka', ['wprev', 'Föregående vecka'], 'wnow', ['wnext', 'Nästa vecka'], ws >= weekStart(today()),
      `Vecka ${isoWeek(ws)}`, el('small', { text: `${shortDate(ws)}–${shortDate(addDays(ws, 6))}` }))),
    ...arrange('week', {
    weight: () => weightCard(ws),
    habits: () => habitCard(ws),
    days: () => el('section', { class: 'card' }, el('h2', { text: 'Dag för dag' }), dayTable(ws, st),
      el('p', { class: 'muted small', text: '○ räknas inte · … idag, räknas när dagen är slut' })),
    training: () => trainingCard(ws),
    kcal: () => el('section', { class: 'card' }, el('h2', { text: 'Kalorier' }),
      // Snittet räknar bara kompletta dagar (2026-11-21), samma regel som förbrukningen.
      (() => { const pe = periodEnergy(S.state, ws, addDays(ws, 6), today()); return el('div', { class: 'stats' },
        stat(pe.logged ? kcal(pe.kcal / pe.logged) : '–', 'kcal per dag i snitt'),
        st.hasGoal ? stat(`${st.within}/${st.logged}`, 'dagar inom mål') : stat(`${pe.logged}/${st.logged}`, 'kompletta dagar')); })(),
      st.logged && st.hasGoal ? kcalBars(st) : null,
      energyStats(ws, addDays(ws, 6))),
    }),
  ];
}
