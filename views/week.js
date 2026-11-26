// View: Vecka – vanor först (följsamhet, fusk, orsaker, träning), sedan kalorier som stöd (beslut 2026-11-09).
import { weekStats, weekStart, addDays, isoWeek, habitWeek, currentWeight, dayCheck, energyEstimate, goalFor, goalMeaning, sumN, periodEnergy, weightPlan, avg7Of } from '../store.js';
import { energyStats, kcalDayLine, weekDelta } from './trend.js';
import { today, S, el, svg, stepper, stat, kcal, shortDate, pct, reasonName, goals, weekSessions, sessionText, fmtNum, arrange, wOut, wUnit, dayLetters } from '../ui.js';

const DAYS = dayLetters();

// Dag för dag (v0.5.12): vanor, träning och kcal per dag i en tabell. Tryck på en rad = öppna dagen.
function dayTable(ws, st) {
  const h = habitWeek(S.state, ws), thr = S.state.settings.successThreshold;
  const cls = (r) => (r == null ? '' : r >= thr ? 'good-t' : r >= 0.5 ? 'mid-t' : 'low-t');
  return el('table', { class: 'wk-table day-table' },
    el('thead', {}, el('tr', {}, ['Dag', 'Vanor', 'Träning', 'Vikt', 'kcal'].map((t) => el('th', { text: t })))),
    el('tbody', {}, st.days.map((d, i) => {
      const r = h.days[i]?.ratio ?? null, w = S.state.workouts[d.k] || [];
      return el('tr', { 'data-act': 'goto', 'data-val': d.k, class: d.k === today() ? 'is-today' : '', tabindex: '0', role: 'link', 'aria-label': `Öppna ${shortDate(d.k)}` },
        el('td', { class: 'wk-open', text: DAYS2[i] }),
        el('td', { class: cls(r), text: r == null ? '–' : pct(r) }),
        el('td', { class: 'dt-train', text: w.length ? '🏋️ ' + w.map(sessionText).join(', ') : '–' }),
        el('td', {}, S.state.weights[d.k] != null ? fmtNum(Math.round(wOut(S.state.weights[d.k]) * 10) / 10) : '–', vsLast(d.k)),   // vikten tillbaka (2026-11-21)
        // Vanor men ingen mat (2026-11-21): tydligt att dagen inte räknas.
        // Idag (2026-11-21): pågår, räknas när dagen är slut – markeras med … i stället för ○.
        ...[(() => { const c = dayCheck(S.state, d.k, today()), now = c.reason === 'today';
          return el('td', { class: !now && ((d.logged && !c.ok) || (!d.logged && r != null)) ? 'dt-inc' : '' }, d.logged ? kcal(d.kcal) + (c.ok ? '' : now ? ' ⏳' : ' ○') : r != null && !now ? 'ingen mat ○' : '–', c.ok ? vsLast(d.k, 'k') : null); })()],
      );
    })));
}
// Mot samma dag förra veckan (2026-11-23): liten skillnad under vikt och kcal (2026-11-23; kcal bara när båda dagarna räknas), mer = rött, när båda dagarna har värde.
function vsLast(k, kind = 'w') {
  if (kind === 'k') {
    if (!dayCheck(S.state, addDays(k, -7), today()).ok) return null;
    const d = Math.round(sumN(S.state.log[k] || [])[0]) - Math.round(sumN(S.state.log[addDays(k, -7)] || [])[0]);
    return el('div', { class: 'dt-vs delta' + (d < 0 ? ' down' : d > 0 ? ' up' : ''), text: (d > 0 ? '+' : d < 0 ? '−' : '±') + kcal(Math.abs(d)) });
  }
  const a = S.state.weights[k], b = S.state.weights[addDays(k, -7)];
  if (a == null || b == null) return null;
  const d = Math.round((wOut(a) - wOut(b)) * 10) / 10;
  return el('div', { class: 'dt-vs delta' + (d < 0 ? ' down' : d > 0 ? ' up' : ''), text: (d > 0 ? '+' : d < 0 ? '−' : '±') + fmtNum(Math.abs(d)) });
}
const DAYS2 = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

// Veckodagsmönster (2026-11-26): hur mycket varje veckodag (0 = sön) brukar ligga över/under trenden, ur de senaste 6 veckornas vägningar.
// Trend = snittet av vägningarna ±3 dagar (minst 3). En veckodag behöver minst 3 värden, annars 0. Avvikelserna centreras kring 0.
export function weekdayOffsets(end, w = S.state.weights) {
  const sum = Array(7).fill(0), cnt = Array(7).fill(0);
  for (let j = 0; j < 42; j++) {
    const k = addDays(end, -j); if (w[k] == null) continue;
    const near = [-3, -2, -1, 0, 1, 2, 3].map((d) => w[addDays(k, d)]).filter((v) => v != null);
    if (near.length < 3) continue;
    const d = new Date(k + 'T12:00').getDay();
    sum[d] += w[k] - near.reduce((a, b) => a + b, 0) / near.length; cnt[d]++;
  }
  const off = sum.map((s_, d) => (cnt[d] >= 3 ? s_ / cnt[d] : 0)), m = off.reduce((a, b) => a + b, 0) / 7;
  return off.map((v) => v - m);
}

// Kalorier och vikt i samma diagram (2026-11-21): bara den visade perioden (vecka eller månad, 2026-11-21), staplar = kcal per dag, linje = vikt,
// streckad linje = vad som håller vikten (förbrukningen) eller kalorimålet. Ofullständiga dagar ljusare.
export function kcalWeightChart(from, n = 7) {
  const days = Array.from({ length: n }, (_, i) => addDays(from, i)), t = today();
  const label = (k, i) => (n <= 7 ? DAYS[i] : (i % 5 === 0 || i === n - 1) ? String(Number(k.slice(8))) : '');
  const kc = days.map((k) => (k > t ? null : Math.round(sumN(S.state.log[k] || [])[0]) || null));
  const kg = days.map((k) => S.state.weights[k] ?? null);
  if (kc.filter(Boolean).length + kg.filter((x) => x != null).length < 2) return null;
  const e = energyEstimate(S.state, t), ref = e && e.ready && e.quality >= 0.25 ? Math.round(e.tdee / 50) * 50 : null;
  // Veckomålet i fokus (2026-11-22): med viktmål är målraden förbrukningen + underskottet för veckotakten.
  const plan = ref ? weightPlan(S.state.wgoal, currentWeight(S.state), t) : null, wk = plan && !plan.reached ? plan : null;
  // Sparat kalorimål gäller alltid (2026-11-22), som på Dag; annars det framräknade ur viktmålet.
  const goal = goalFor(S.state, days[n - 1] > t ? t : days[n - 1]).kcal ?? (wk ? Math.round((ref + wk.kcalDay) / 50) * 50 : null);
  const W = 320, H = 120, top = 8, bot = 96, AX = 30, cw = (W - AX) / n;   // AX: plats för viktskalan till höger (2026-11-21)
  const kmax = Math.max(...kc.filter(Boolean), ref ?? 0, goal ?? 0, 1000) * 1.08;
  const Yk = (v) => bot - v / kmax * (bot - top);
  // Prognos (2026-11-26): trenden (minsta kvadrat på de 14 dagarna fram till ankardagen) förlängd med veckodagsmönstret.
  // ai = ankarets index i perioden (kan vara före periodens början), bara vägningar t.o.m. ankardagen används.
  const project = (ai, i0) => {
    const ak = addDays(from, ai), wAll = S.state.weights;
    const w = Object.fromEntries(Object.entries(wAll).filter(([k]) => k <= ak));
    const xs = Array.from({ length: 14 }, (_, j) => [ai - j, w[addDays(ak, -j)]]).filter(([, v]) => v != null);
    if (xs.length < 3) return null;
    const mx = xs.reduce((a, [i]) => a + i, 0) / xs.length, my = xs.reduce((a, [, v]) => a + v, 0) / xs.length;
    const sxx = xs.reduce((a, [i]) => a + (i - mx) ** 2, 0); if (!sxx) return null;
    const k = xs.reduce((a, [i, v]) => a + (i - mx) * (v - my), 0) / sxx;
    const off = weekdayOffsets(ak, w), wd = (i) => new Date(addDays(from, i) + 'T12:00').getDay();
    const base = w[ak] - off[wd(ai)], pts = [];
    for (let i = i0; i < n; i++) pts.push([i, i === ai ? w[ak] : base + k * (i - ai) + off[wd(i)]]);
    return { pts, v1: pts[pts.length - 1][1] };
  };
  const li = kg.reduce((a, v, i) => (v != null ? i : a), -1);
  const proj = li >= 0 && li < n - 1 && days[li] <= t ? project(li, li) : null;
  // Prognosen vid periodens start (2026-11-26): från sista vägningen de 7 dagarna före, över hela perioden – så syns hur det gått mot den.
  const pi = [-1, -2, -3, -4, -5, -6, -7].find((i) => S.state.weights[addDays(from, i)] != null);
  const before = pi != null && li >= 0 ? project(pi, 0) : null;
  const ws_ = kg.filter((x) => x != null).concat(proj ? proj.pts.map((p) => p[1]) : [], before ? before.pts.map((p) => p[1]) : []), lo = Math.min(...ws_) - 0.3, hi = Math.max(...ws_) + 0.3;
  const Yw = (v) => top + 6 + (hi - v) / (hi - lo || 1) * (bot - top - 12);
  const pts = kg.map((v, i) => (v == null ? null : [i * cw + cw / 2, Yw(v)])).filter(Boolean);
  const r1 = (x) => Math.round(x * 10) / 10;
  // Viktskala: lägsta, högsta och (om det finns plats) mitten, med svaga stödlinjer.
  const ticks = !ws_.length ? [] : Math.max(...ws_) - Math.min(...ws_) < 0.2 ? [Math.max(...ws_)]
    : [Math.max(...ws_), (Math.max(...ws_) + Math.min(...ws_)) / 2, Math.min(...ws_)];
  const kgTxt = (v) => (v.length > 1 ? `${fmtNum(r1(wOut(Math.min(...v))))}–${fmtNum(r1(wOut(Math.max(...v))))} ${wUnit()}` : `${fmtNum(r1(wOut(v[0])))} ${wUnit()}`);
  return el('div', { class: 'kw' },
    svg('svg', { class: 'kw-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Kalorier per dag och vikt' },
      kc.map((v, i) => (v ? svg('rect', { class: 'kw-bar' + (dayCheck(S.state, days[i], t).ok ? '' : ' inc'), x: r1(i * cw + cw * 0.18), y: r1(Yk(v)), width: r1(cw * 0.64), height: r1(bot - Yk(v)), rx: 2 }) : null)),
      ticks.map((v) => [svg('line', { class: 'kw-grid', x1: 0, x2: W - AX, y1: r1(Yw(v)), y2: r1(Yw(v)) }),
        svg('text', { class: 'kw-ax', x: W - AX + 4, y: r1(Yw(v) + 3) }, fmtNum(r1(wOut(v))))]),
      ref && !wk ? svg('line', { class: 'kw-ref', x1: 0, x2: W - AX, y1: r1(Yk(ref)), y2: r1(Yk(ref)) }) : null,
      goal ? svg('line', { class: 'kw-goal', x1: 0, x2: W - AX, y1: r1(Yk(goal)), y2: r1(Yk(goal)) }) : null,
      pts.length > 1 ? svg('polyline', { class: 'kw-line', points: pts.map((p) => p.map(r1).join(',')).join(' ') }) : null,
      before ? svg('polyline', { class: 'kw-before', points: before.pts.map(([i, v]) => `${r1(i * cw + cw / 2)},${r1(Yw(v))}`).join(' ') }) : null,
      proj ? svg('polyline', { class: 'kw-proj', points: proj.pts.map(([i, v]) => `${r1(i * cw + cw / 2)},${r1(Yw(v))}`).join(' ') }) : null,
      proj ? svg('circle', { class: 'kw-proj-dot', cx: r1((n - 1) * cw + cw / 2), cy: r1(Yw(proj.v1)), r: n > 7 ? 1.8 : 2.6 }) : null,
      pts.map((p) => svg('circle', { class: 'kw-dot', cx: r1(p[0]), cy: r1(p[1]), r: n > 7 ? 1.8 : 2.6 })),
      days.map((k, i) => svg('text', { class: 'kw-day cur', x: r1(i * cw + cw / 2), y: H - 8, 'text-anchor': 'middle' }, label(k, i)))),
    // Förklaring bara för de streckade linjerna (2026-11-21): staplar och viktlinje förklarar sig själva.
    // Förklaring alltid (2026-11-21): vad staplar och linje är.
    // Förenklad (2026-11-22): bara staplar och målraden; utan viktmål raden för håller vikten.
    el('p', { class: 'kw-legend' },
      el('span', { class: 'lg-bar' }), el('span', { text: ((ok) => ok.length ? `snitt ${kcal(ok.reduce((x, y) => x + y, 0) / ok.length)} kcal/dag` : 'kcal per dag')(kc.filter((v, i) => v && dayCheck(S.state, days[i], t).ok)) }),   // snittet för klara dagar (2026-11-22)
      // Ljus stapel (2026-11-22): idag eller en dag som saknar måltider räknas inte än.
      kc.some((v, i) => v && !dayCheck(S.state, days[i], t).ok) ? el('span', { class: 'lg-item' }, el('span', { class: 'lg-bar inc' }), el('span', { text: 'ej klar dag' })) : null,
      goal ? el('span', { class: 'lg-item' }, el('span', { class: 'lg-goal' }), el('span', { text: `🎯 ≈ ${kcal(goal)} kcal/dag` }))
        : ref ? el('span', { class: 'lg-item' }, el('span', { class: 'lg-ref' }), el('span', { text: `håller vikten ≈ ${kcal(ref)} kcal/dag` })) : null,
      proj ? el('span', { class: 'lg-item' }, el('span', { class: 'lg-proj' }), el('span', { text: `prognos ${fmtNum(r1(wOut(proj.v1)))} ${wUnit()} ${shortDate(days[n - 1])}` })) : null,
      before ? el('span', { class: 'lg-item' }, el('span', { class: 'lg-before' }), el('span', { text: `väntat vid start ${fmtNum(r1(wOut(before.v1)))} ${wUnit()}` })) : null));
}

// Utfall mot veckomålet (2026-11-22): d = ändring i kg per vecka; perWeek = visa som kg/v (Månad).
export function goalRow(d, pre = 'snitt mot förra veckan · ') {   // pre: vad ändringen jämförs med
  const p = weightPlan(S.state.wgoal, currentWeight(S.state), today());
  if (!p || p.reached) return null;
  // Förenklad igen (2026-11-22): bara målet och ✓ när veckans ändring når det – ändringen själv står redan stort bredvid.
  const v = (x) => fmtNum(Math.round(wOut(Math.abs(x)) * 10) / 10), off = d - p.rate, ok = Math.abs(off) < 0.05 || off * Math.sign(p.rate) > 0;
  return el('p', { class: 'w-sub w-goal' }, pre, el('span', { class: 'nowrap' }, `🎯 ${p.rate < 0 ? '−' : '+'}${v(p.rate)} ${wUnit()}/v `,   // bryts som en enhet
    el('span', { class: ok ? 'kd-down' : 'wg-behind', text: ok ? '🟢' : '🟠' })));
}

// Vikt (v0.5.13): senaste vägningen i veckan mot den sista vägningen veckan innan (2026-11-22).
function weightCard(ws) {
  const inRange = (from) => [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(from, i)).filter((k) => S.state.weights[k] != null);
  const cur = inRange(ws), prev = inRange(addDays(ws, -7));
  if (!cur.length && !prev.length) return null;
  const last = cur.length ? S.state.weights[cur[cur.length - 1]] : null;
  // Mot samma veckodag veckan innan (2026-11-23).
  const wd = weekDelta(ws), bw = wd?.b ?? null, d = wd?.d ?? null;
  const dTxt = d == null ? '' : d === 0 ? `±0 ${wUnit()}` : `${d > 0 ? '+' : '−'}${fmtNum(wOut(Math.abs(d)))} ${wUnit()}`;
  const kg1 = (v) => wOut(v).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // Kompakt (v0.5.14): en rad – vikt till vänster, förändring till höger, jämförelsen i liten text.
  return el('section', { class: 'card w-card' },
    el('div', { class: 'w-row' },
      el('span', { class: 'w-label', text: 'Vikt' }),
      el('span', { class: 'w-now', text: last != null ? `${kg1(last)} ${wUnit()}` : '–' }),
      el('span', { class: 'w-flex' }),
      d != null ? el('span', { class: 'w-chg delta' + (d < 0 ? ' down' : d > 0 ? ' up' : ''), title: 'Mot samma dag veckan innan', text: dTxt }) : null),
    // Utfall mot veckomålet (2026-11-22).
    // Snitten utskrivna (2026-11-22), som Månad: den stora siffran är senaste vägningen.
    d != null ? ((ref) => (wd.days >= 3 ? goalRow(d / wd.days * 7, ref + ' · ') : null) || el('p', { class: 'w-sub', text: ref }))(`mot ${kg1(wd.b)} ${wUnit()} ${shortDate(wd.bk)}`) : null,
    last == null || bw == null ? el('p', { class: 'w-sub', text: last == null ? 'Ingen vägning den här veckan än' : 'Ingen vägning veckan innan att jämföra med' }) : null,
    kcalWeightChart(ws, 7));
}

function habitCard(ws) {
  const h = habitWeek(S.state, ws);
  const reasons = Object.entries(h.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return el('section', { class: 'card' },
    el('div', { class: 'stats' },
      stat(pct(h.ratio), 'följsamhet'),
      stat(`${h.cheat + h.extraCheat}`, '🍰 fusk', h.extraCheat ? ` (${h.extraCheat} extra)` : '')),
    el('p', { class: 'muted small center', text: `✅ ${h.followed} följde · ⏭️ ${h.skipped} hoppade över` }),
    // En rad (2026-11-21): vanligaste orsaker i stället för rubrik + lista.
    reasons.length ? el('p', { class: 'muted small center', text: `Vanligaste orsak: ${reasons.map(([id, n]) => `${reasonName(id)} (${n})`).join(', ')}` }) : null);
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
      el('p', { class: 'muted small', text: 'Små tal: mot samma dag förra veckan · ○ räknas inte · ⏳ idag, räknas när dagen är slut' })),
    training: () => trainingCard(ws),
    // Kortet Kalorier borttaget (2026-11-22): snittet står i diagrammet under Vikt.
    }),
  ];
}
