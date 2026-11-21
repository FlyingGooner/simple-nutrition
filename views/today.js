// View: Idag – summary, meals with posts, weight. "+ Lägg till" opens views/add.js in place of the day.
import { parseKey, sumN, postN, goalFor, setGoal, addDays, habitDay, habitStreak, dayCheck, energyEstimate, weightPlan, currentWeight } from '../store.js';
import { today, S, setOpen, el, svg, stepper, stat, kcal, fmtNum, pct, dateTitle, wOut, wUnit, amountText, mealName, reasonName, arrange } from '../ui.js';
import { viewAdd } from './add.js';
import { dayHabits, outcomeRow, habitDetails, extraCards, workoutCards, addRow } from './habits.js';
import { OUTCOMES } from '../habit-store.js';

export const dayPosts = () => S.state.log[S.current] || [];

function summaryCard() {
  const posts = dayPosts(), n = sumN(posts), g = goalFor(S.state, S.current);
  const macro = (label, v, goal) => el('span', { class: 'macro' }, `${label} `, el('strong', { text: fmtNum(v, 0) }), goal ? ` / ${goal} g` : ' g');
  const has = g.kcal != null && S.current !== today(), left = has ? g.kcal - n[0] : 0, over = left < 0;   // idag: målet står överst
  // Utan kalorimål (standard): bara dagens summa, ingen stapel eller "kvar".
  // 2026-11-18: tryck på kortet → allt du ätit i dag, samma sak från flera måltider ihopslaget.
  const sec = `daysum-${S.current}`;
  return el('details', { class: 'card sum-card day-sum', 'data-sec': sec, open: setOpen.has(sec) && posts.length > 0, 'aria-label': 'Dagens kalorier' },
    el('summary', {}, headShown ? null : el('div', { class: 'sum-top' },
      el('span', { class: 'sum-big' }, el('strong', { text: kcal(n[0]) }), has ? ` / ${kcal(g.kcal)} kcal` : ' kcal idag'),
      has ? el('span', { class: 'sum-left' + (over ? ' over' : ''), text: over ? `${kcal(-left)} över` : `${kcal(left)} kvar` }) : null),
    has ? svg('svg', { class: 'kbar', viewBox: '0 0 100 6', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      svg('rect', { class: 'kbar-bg', x: 0, y: 0, width: 100, height: 6, rx: 2 }),
      svg('rect', { class: 'kbar-fill' + (over ? ' over' : ''), x: 0, y: 0, width: Math.round(Math.min(1, n[0] / g.kcal) * 1000) / 10, height: 6, rx: 2 })) : null,
    el('p', { class: 'macros' }, macro('Protein', n[1], g.prot), ' · ', macro('Kolh.', n[2], g.kolh), ' · ', macro('Fett', n[3])),
    posts.length ? el('p', { class: 'sum-more', text: 'Allt du ätit i dag ▾' }) : null),
    posts.length ? [dayList(posts), el('button', { class: 'link dl-ai', 'data-act': 'dayai', text: '📋 Kopiera för kontroll med AI' })] : null);
}
// Snabbval av takt (2026-11-21): 0,25 / 0,5 / 1 kg och 1 % per vecka, bara de som är ≤ 1 % av vikten.
function goalChips(e) {
  const cur = currentWeight(S.state);
  if (cur == null) return null;
  const max = Math.floor(cur * 0.01 * 100) / 100, g = S.state.wgoal;
  const opts = [0.25, 0.5, 1].filter((r) => r <= max + 1e-9);
  if (!opts.includes(max)) opts.push(max);
  const r2 = (v) => fmtNum(Math.round(wOut(v) * 100) / 100, 2);
  return el('div', {},
    el('p', { class: 'small', text: 'Mål – gå ner per vecka:' }),
    el('div', { class: 'chips en-chips' }, opts.map((r) => el('button', {
      class: 'chip' + (g && !g.date && (r === max ? g.pct === 1 : g.pct == null && Math.abs(g.rate - r) < 0.005) ? ' on' : ''), 'data-act': 'wgquick', 'data-val': r, 'data-pct': r === max ? '1' : null,
      text: r === max ? `1 % (${r2(r)} ${wUnit()})` : `${r2(r)} ${wUnit()}`,
    }))));
}
// Dagens mål överst (2026-11-21): kalorimålet, annars förbrukning + viktmålets kcal/dag (kvalitet ≥ 25 %).
let headShown = false;   // städning 2026-11-21: visar dagkortet redan dagens kcal, hoppar kortet nedan över summan
function headGoal(posts) {
  const out = headGoalInner(posts);
  headShown = !!out && !!out.querySelector('.hg-row');
  return out;
}
function headGoalInner(posts) {
  // 2026-11-21 (städning): allt om dagens mål samlat här – förbrukningen som en liten rad, inget eget kort när viktmål finns.
  let goal = goalFor(S.state, today()).kcal, from = 'Kalorimål';
  const e = energyEstimate(S.state, today()), p = weightPlan(S.state.wgoal, currentWeight(S.state), today());
  const eOk = e && e.ready && e.quality >= 0.25, r50 = (x) => Math.round(x / 50) * 50;
  const eat = eOk && p && !p.reached ? r50(e.tdee + p.kcalDay) : null;
  if (goal == null) {
    if (!eOk) return null;   // 2026-11-21: prognos och viktmål finns under Trend
    goal = eat ?? r50(e.tdee);
    from = eat != null ? 'För viktmålet' : 'Håller vikten';
  }
  const eaten = Math.round(sumN(posts)[0]), left = goal - eaten;
  return el('div', { class: 'head-goal' },
    el('div', { class: 'hg-row' }, el('span', { class: 'hg-from', text: 'Idag' }),
      el('span', {}, el('strong', { text: kcal(eaten) }), ` / ${kcal(goal)} kcal`),
      el('span', { class: 'hg-left' + (left < 0 ? ' over' : ''), text: left < 0 ? `${kcal(-left)} över` : `${kcal(left)} kvar` })),
  );
}
// Påminnelse om vägning (2026-11-21): bara idag, när senaste vägningen är 4 dagar gammal eller äldre och idag saknar vägning.
function weighNote() {
  if (S.current !== today() || S.state.weights[today()] != null) return null;
  const keys = Object.keys(S.state.weights).sort(), last = keys[keys.length - 1];
  if (!last) return null;
  const days = Math.round((parseKey(today()) - parseKey(last)) / 864e5);
  return days >= 4 ? el('p', { class: 'day-note small', text: `Väg dig idag – senaste vägningen var ${days} dagar sedan. Prognosen och förbrukningen blir säkrare med minst 3 vägningar i veckan.` }) : null;
}
// Komplett dag (2026-11-21): säg vad som saknas för att dagen ska räknas i statistiken.
function dayNote() {
  const d = dayCheck(S.state, S.current, null);
  if (!d.hasFood || d.ok) return null;
  const text = d.reason === 'missing' ? `${d.missing.join(', ')} saknar mat – lägg till eller markera ⏭️, annars räknas dagen inte i statistiken.`
    : `Under 800 kcal – dagen räknas inte i statistiken. Fattas något? Använd snabbvalen.`;
  return el('p', { class: 'day-note small', text });
}
// 2026-11-21: förbrukningen i klartext under dagens kalorier (bara idag, kvalitet ≥ 25 %).
function energyHint() {
  if (S.current !== today()) return null;
  const e = energyEstimate(S.state, today());
  if (!e || !e.ready || e.quality < 0.25) return null;
  const r50 = (x) => Math.round(x / 50) * 50, p = weightPlan(S.state.wgoal, currentWeight(S.state), today());
  const q = el('p', { class: 'muted small', text: `Kvalitet ${Math.round(e.quality * 100)} % – se Trend.` });
  // Med viktmål (städning 2026-11-21): inget kort – siffrorna står överst i dagkortet.
  if (p && !p.reached) return null;
  return el('div', { class: 'card en-hint' },
    el('p', {}, el('span', { text: 'Utifrån din loggning och vikt håller du vikten på' }), ' ', el('strong', { text: `≈ ${kcal(r50(e.tdee))} kcal/dag` }), '.'),
    goalChips(e), q);
}
// Sammanställning: en rad per livsmedel/rätt (samma ref och samma enhet slås ihop), störst kcal först.
// 2026-11-18: dagen som text – för att låta en AI (t.ex. Gemini) räkna på samma dag och jämföra.
export function dayText() {
  const posts = dayPosts(), n = sumN(posts), rows = [];
  const groups = new Map(), mealOf = (id) => (id === '_other' ? 'Övrigt' : mealName(id));
  for (const p of posts) {
    const key = p.ref + '|' + (p.u ? p.u[0] : '');
    const g = groups.get(key) || { p, n: [0, 0, 0, 0], g: 0, q: 0, u: 0, times: 0, meals: [] };
    postN(p).forEach((x, i) => { g.n[i] += x; }); g.g += p.g || 0; g.q += p.q || 0; g.u += p.u ? p.u[1] : 0; g.times++;
    const mn = mealOf(p.m); if (!g.meals.includes(mn)) g.meals.push(mn); groups.set(key, g);
  }
  for (const r of [...groups.values()].sort((a, b) => b.n[0] - a.n[0])) {
    const amt = amountText({ ...r.p, g: r.g || r.p.g, q: r.p.q != null ? r.q : undefined, u: r.p.u ? [r.p.u[0], r.u] : undefined });
    rows.push(`- ${r.p.name}${r.times > 1 ? ` (×${r.times})` : ''}: ${amt} (${r.meals.join(', ').toLowerCase()}) – ${kcal(r.n[0])} kcal, P ${fmtNum(r.n[1], 0)} g, K ${fmtNum(r.n[2], 0)} g, F ${fmtNum(r.n[3], 0)} g`);
    const d = dishOf(r);
    if (d) for (const it of d.items) rows.push(`    · ${it.name}: ${imperialG(it.g * r.q)}`);
  }
  return [`Det här åt jag ${dateTitle(S.current).toLowerCase()}:`, '', ...rows, '',
    `Min app räknade fram totalt ${kcal(n[0])} kcal – protein ${fmtNum(n[1], 0)} g, kolhydrater ${fmtNum(n[2], 0)} g, fett ${fmtNum(n[3], 0)} g.`,
    '', 'Räkna själv ut kcal, protein, kolhydrater och fett för varje rad och för hela dagen, utifrån mängderna ovan (för rätterna: utifrån ingredienserna). Jämför sedan med appens siffror och säg var det skiljer mest och varför. Snabbval som "Frukost – Lätt" eller "Snacks – Lite" är grova uppskattningar.'].join('\n');
}
const dishOf = (r) => (String(r.p.ref).startsWith('r:') && r.q ? S.state.dishes.find((d) => 'r:' + d.id === r.p.ref) : null);
const imperialG = (g) => amountText({ ref: 'x', g });   // gram (eller oz) som i resten av appen
function dayList(posts) {
  const groups = new Map(), mealOf = (id) => (id === '_other' ? 'Övrigt' : mealName(id));
  for (const p of posts) {
    const key = p.ref + '|' + (p.u ? p.u[0] : '');
    const g = groups.get(key) || { p, n: [0, 0, 0, 0], g: 0, q: 0, u: 0, times: 0, meals: [] };
    postN(p).forEach((x, i) => { g.n[i] += x; });
    g.g += p.g || 0; g.q += p.q || 0; g.u += p.u ? p.u[1] : 0; g.times++;
    const mn = mealOf(p.m); if (!g.meals.includes(mn)) g.meals.push(mn);
    groups.set(key, g);
  }
  const rows = [...groups.values()].sort((a, b) => b.n[0] - a.n[0]);
  return el('ul', { class: 'day-list' }, rows.map((r) => {
    const amt = amountText({ ...r.p, g: r.g || r.p.g, q: r.p.q != null ? r.q : undefined, u: r.p.u ? [r.p.u[0], r.u] : undefined });
    const main = [el('span', { class: 'dl-name' }, el('span', { text: (r.times > 1 ? `${r.p.name} ×${r.times}` : r.p.name) + (dishOf(r) ? ' ▾' : '') }),
        el('small', { text: [amt, r.meals.join(', ').toLowerCase()].join(' · ') })),
      el('span', { class: 'dl-n' }, el('strong', { text: kcal(r.n[0]) }), el('small', { text: `P ${fmtNum(r.n[1], 0)} · K ${fmtNum(r.n[2], 0)} · F ${fmtNum(r.n[3], 0)}` }))];
    // 2026-11-18: en rätt fälls ut till sina ingredienser – mängd och kcal för det du ätit (andel av receptet).
    const d = dishOf(r);
    if (!d) return el('li', {}, ...main);
    return el('li', { class: 'dl-dish' }, el('details', {}, el('summary', {}, ...main),
      el('ul', { class: 'dl-ingr' }, d.items.map((it) => el('li', {},
        el('span', { text: it.name }), el('small', { text: `${imperialG(it.g * r.q)} · ${kcal(it.n[0] * it.g / 100 * r.q)} kcal` }))))));
  }));
}

function postRow(p) {
  if (S.sel) {   // markeringsläge: a tap marks, no editor
    const on = S.sel.includes(p.id);
    return el('li', { class: 'post' + (on ? ' marked' : '') },
      el('button', { class: 'post-head', 'data-act': 'psel', 'data-id': p.id, 'aria-pressed': String(on) },
        el('span', { class: 'sel-box', 'aria-hidden': 'true', text: on ? '✓' : '' }),
        el('span', { class: 'post-name' }, p.name, el('small', { text: amountText(p) })),
        el('span', { class: 'post-kcal', text: kcal(postN(p)[0]) })));
  }
  const open = S.open === p.id;
  const row = el('li', { class: 'post' + (open ? ' open' : '') },
    el('button', { class: 'post-head', 'data-act': 'popen', 'data-id': p.id, 'aria-expanded': open ? 'true' : 'false' },
      el('span', { class: 'post-name' }, p.name, el('small', { text: amountText(p) })),
      el('span', { class: 'post-kcal', text: kcal(postN(p)[0]) })));
  if (open) {
    row.append(el('div', { class: 'post-edit' },
      el('label', { class: 'field' }, el('span', { text: p.u ? 'Mängd, ' + p.u[0] : p.q != null ? 'Andel' : 'Gram' }),
        el('input', { type: 'text', inputmode: 'decimal', id: 'p-amount', value: String(p.u ? p.u[1] : p.q != null ? p.q : p.g), 'aria-label': 'Mängd' })),
      el('label', { class: 'field' }, el('span', { text: 'Måltid' }),
        el('select', { id: 'p-meal', 'aria-label': 'Måltid' }, S.state.meals.map((m) => el('option', { value: m.id, selected: m.id === p.m, text: m.name })))),
      el('div', { class: 'row-actions' },
        el('button', { class: 'link danger', 'data-act': 'pdel', 'data-id': p.id, text: 'Ta bort' }),
        el('button', { class: 'weigh-save', 'data-act': 'psave', 'data-id': p.id, text: 'Spara' })),
      el('p', { class: 'import-error small', id: 'p-error', role: 'alert' })));
  }
  return row;
}

function mealCard(m, posts) {
  const total = posts.reduce((a, p) => a + postN(p)[0], 0);
  // Vanor i fokus (beslut 2026-11-09): ✅ 🍰 ⏭️ först, maten och kcal som stöd under.
  // Maten är en hopfälld underdel av måltiden: "🍽 Mat · 420 kcal" (öppen-läget sparas i setOpen via data-sec).
  // v0.6.3: öppet-läget för 🍽 Mat är per dag (förut delat mellan alla dagar och tvingade även det hopfällda måltidskortet att öppnas).
  const other = m.id === '_other', sec = `food-${S.current}-${m.id}`, editing = posts.some((p) => p.id === S.open);
  const open = setOpen.has(sec) || editing || (S.sel && posts.some((p) => S.sel.includes(p.id)));
  const body = [
    other ? null : outcomeRow(m.id),
    other ? null : habitDetails(m.id),
    el('details', { class: 'meal-food' + (posts.length ? ' has-food' : ''), 'data-sec': sec, open },
      el('summary', {},
        el('span', { class: 'food-label', text: posts.length ? '✅ Mat' : '🥗 Mat' }),
        el('span', { class: 'meal-kcal', text: posts.length ? `${kcal(total)} kcal` : 'Inget loggat' })),
      posts.length ? el('ul', { class: 'posts' }, posts.map(postRow)) : null,
      other ? null : el('div', { class: 'meal-foot' },
        el('button', { class: 'link add-btn', 'data-act': 'addopen', 'data-id': m.id, 'aria-label': `Lägg till mat i ${m.name}`, text: '+ Lägg till mat' }),
        posts.some((p) => p.g != null) ? el('button', { class: 'meal-dish', 'data-act': 'mealdish', 'data-id': m.id, 'aria-label': `Spara ${m.name} som rätt`, title: 'Spara som rätt', text: '+🍲 Spara som rätt' }) : null)),
  ];
  const e = other ? null : dayHabits()[m.id];
  // Ifylld måltid fälls ihop till en rad: val + rätt + kcal (fusk utan orsak hålls öppen tills orsaken är vald).
  // Ifyllt eller inte (2026-11-21): krävd måltid utan mat och utan ⏭️ = "○ Fyll i", valfri = "Valfri".
  const need = !other && !posts.length && e?.outcome !== 'skipped';
  const mark = !need ? null : m.opt ? el('span', { class: 'fill-tag opt', text: 'Valfri' })
    : el('span', { class: 'fill-tag', title: 'Lägg till mat eller tryck ⏭️, annars räknas dagen inte i statistiken', text: '○ Fyll i' });
  if (!e || !OUTCOMES[e.outcome] || (e.outcome === 'cheat' && !e.reason)) {
    return el('section', { class: 'card meal' + (need && !m.opt ? ' meal-need' : ''), 'aria-label': m.name },
      el('div', { class: 'meal-head' }, el('span', { class: 'meal-name', text: m.name }), mark), body);
  }
  const o = OUTCOMES[e.outcome], msec = `meal-${S.current}-${m.id}`;
  return el('details', { class: 'card meal meal-done', 'data-sec': msec, open: setOpen.has(msec) || editing || (S.sel && posts.some((p) => S.sel.includes(p.id))), 'aria-label': m.name },
    el('summary', { class: 'meal-head' },
      el('span', { class: 'meal-name' }, m.name,
        posts.length ? el('small', { class: 'meal-what', text: posts.map((p) => p.name).join(', ') }) : null),
      el('span', { class: `tag tag-${e.outcome}`, text: `${o.icon} ${e.reason ? reasonName(e.reason) : o.label}` }),
      posts.length ? el('span', { class: 'meal-kcal', text: `${kcal(total)} kcal` }) : mark),
    body);
}

function weightCard() {
  const w = S.state.weights[S.current];
  return el('details', { class: 'card weigh-extra', 'data-sec': 'weight' },
    el('summary', { text: w != null ? `Vikt ${fmtNum(wOut(w))} ${wUnit()}` : 'Vikt idag (valfritt)' }),
    el('div', { class: 'weigh-row' },
      el('input', { type: 'text', inputmode: 'decimal', id: 'weight', value: w != null ? fmtNum(wOut(w)) : '', placeholder: wUnit(), 'aria-label': `Vikt i ${wUnit()}` }),
      el('button', { class: 'weigh-save', 'data-act': 'weightsave', text: 'Spara' })),
    el('p', { class: 'muted small', text: 'Väg dig gärna på morgonen. Trenden räknas på 7-dagars medel.' }));
}

export function viewToday() {
  if (S.add) return viewAdd();
  const isToday = S.current === today();
  const posts = dayPosts();
  const known = new Set(S.state.meals.map((m) => m.id));
  const other = posts.filter((p) => !known.has(p.m) && !(p.m.startsWith('extra-') && dayHabits()[p.m]));   // extra fuskets kcal visas i nivåraden
  const orphanHabits = Object.keys(dayHabits()).filter((k) => !known.has(k) && !k.startsWith('extra-'));
  const r = habitDay(S.state, S.current), st = habitStreak(S.state, today());
  if (S.sel) S.sel = S.sel.filter((id) => posts.some((p) => p.id === id));
  return [
    S.sel ? selBar() : null,
    el('div', { class: 'card day-head' },
    stepper('Byt dag', ['prev', 'Föregående dag'], 'today', ['next', 'Nästa dag'], isToday,
      isToday ? [el('span', { class: 'today-badge', text: 'IDAG' }), dateTitle(S.current)] : dateTitle(S.current), null, isToday ? '' : 'not-today'),
    el('div', { class: 'streak' }, el('span', { title: 'Lyckade dagar i rad', text: `🔥 ${st} ${st === 1 ? 'dag' : 'dagar'} i rad` }),
      isToday ? null : el('button', { class: 'link back-today', 'data-act': 'today', text: '↩ Till idag' })),
    isToday ? headGoal(posts) : (headShown = false, null)),
    ...arrange('today', {
    plan: () => S.state.settings.planText ? el('p', { class: 'plan', text: S.state.settings.planText }) : null,
    meals: () => el('div', { class: 'meals' },
      S.state.meals.map((m) => mealCard(m, posts.filter((p) => p.m === m.id))),
      orphanHabits.map((k) => el('section', { class: 'card meal', 'aria-label': 'Borttagen måltid' },
        el('div', { class: 'meal-head' }, el('span', { class: 'meal-name', text: dayHabits()[k].name || 'Borttagen måltid' })), outcomeRow(k), habitDetails(k))),
      extraCards(),
      other.length ? mealCard({ id: '_other', name: 'Övrigt' }, other) : null),
    train: () => [el('div', { class: 'workouts' }, workoutCards()), addRow()],
    kcal: () => [summaryCard(), dayNote(), weighNote(), energyHint(),
      !posts.length && (S.state.log[addDays(S.current, -1)] || []).length
        ? el('button', { class: 'extra', 'data-act': 'copyprev', text: 'Kopiera maten från igår' }) : null],
    weight: () => weightCard(),
    }),
    posts.length || S.state.weights[S.current] != null || S.state.habits[S.current] || S.state.workouts[S.current]
      ? el('p', { class: 'clear-day center' }, el('button', { class: 'link danger', 'data-act': 'clearday', text: '🗑 Rensa dagen' })) : null,
  ];
}
// Markeringsläge (håll in en post): Kopiera till en dag eller Radera, på en gång.
function selBar() {
  const n = S.sel.length;
  return el('div', { class: 'sel-bar', role: 'toolbar', 'aria-label': 'Markerade poster' },
    el('div', { class: 'sel-top' },
      el('button', { class: 'sel-x', 'data-act': 'selclose', 'aria-label': 'Avsluta markering', text: '✕' }),
      el('span', { class: 'sel-n', 'aria-live': 'polite', text: `${n} ${n === 1 ? 'vald' : 'valda'}` }),
      el('button', { class: 'sel-btn', 'data-act': 'selcopy', disabled: !n, 'aria-expanded': String(S.selCopy), text: 'Kopiera' }),
      el('button', { class: 'sel-btn danger', 'data-act': 'seldel', disabled: !n, text: 'Radera' })),
    S.selCopy ? el('div', { class: 'sel-copy' },
      el('label', { class: 'field' }, el('span', { text: 'Kopiera till dag' }),
        el('input', { type: 'date', id: 'sel-date', value: today(), max: today(), 'aria-label': 'Dag' })),
      el('button', { class: 'weigh-save', 'data-act': 'selcopyok', disabled: !n, text: 'Kopiera' })) : null);
}
export { mealName };
