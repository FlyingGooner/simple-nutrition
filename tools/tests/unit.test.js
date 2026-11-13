// Unit tests for store.js (ES module). Run: tools\test.ps1 simple-nutrition
import { defaults, validate, cleanText, postN, sumN, goalFor, setGoal, weekStats, exportText, importText, addDays, weekStart, isoWeek, mergeFdt, habitDay, setLevel, dropLevels, quickGroup, searchFoods, findRef } from '../../store.js';
const FDT = JSON.stringify({ app: 'follow-diet-tracker', format: 1, exported: '2026-11-09', data: { settings: { planText: 'Plan' }, days: { '2026-11-02': { breakfast: 'f', lunch: { o: 'c', r: 'craving', n: 'jobbet' }, 'extra-1': 'c' } }, weighIns: { '2026-11-02': 84.6, '2026-11-03': 999 }, workouts: { '2026-11-02': ['push,pull', { t: 'run', k: 5, s: 1500 }] } } });

const post = (o) => ({ id: 'p1', m: 'm1', ref: 'l:151', name: 'Mjölk', g: 200, n: [39, 3.6, 4.8, 0.5], ...o });

T.test('defaults: fyra måltider och inget kalorimål', () => {
  const d = defaults();
  T.eq(d.meals.map((m) => m.name), ['Frukost', 'Lunch', 'Mellanmål', 'Middag']);
  T.ok(!('kcal' in d.goals[0]), 'inget kcal-mål från start');
});
T.test('kcal per post: gram × n/100, summa per dag', () => {
  T.eq(Math.round(postN(post())[0]), 78);
  T.eq(sumN([post(), post({ id: 'p2', g: 100 })]).map(Math.round), [117, 11, 14, 2]);
});
T.test('validering hoppar över ogiltiga poster', () => {
  const s = validate({ log: { '2026-11-09': [post(), post({ id: 'bad id!' }), post({ ref: 'x:1' }), post({ n: [1, 2, 3] }), post({ g: -5 }), post({ n: [99999, 0, 0, 0] })],
    'inte-datum': [post()], '2026-02-30': [post()] } });
  T.eq(Object.keys(s.log), ['2026-11-09']);
  T.eq(s.log['2026-11-09'].length, 1);
});
T.test('text: styr- och riktningstecken tas bort, max 60', () => {
  T.eq(cleanText(' a‮b\u0007c '), 'abc');
  T.eq(cleanText('x'.repeat(80)).length, 60);
  const s = validate({ log: { '2026-11-09': [post({ name: '⁦Mjölk⁩' })] } });
  T.eq(s.log['2026-11-09'][0].name, 'Mjölk');
});
T.test('alias: __proto__ avvisas, objekt utan prototyp', () => {
  const s = validate(JSON.parse('{"aliases":{"__proto__":"l:1","fil":"l:120","x":"bad"}}'));
  T.eq(Object.keys(s.aliases), ['fil']);
  T.eq(Object.getPrototypeOf(s.aliases), null);
});
T.test('vikt och mål valideras', () => {
  const s = validate({ weights: { '2026-11-01': 84.25, '2026-11-02': 5 }, goals: [{ from: '2026-01-01', kcal: 100, prot: 120 }, { from: '2026-02-01', kcal: 1800 }, { from: 'x', kcal: 1800 }] });
  T.eq(s.weights, { '2026-11-01': 84.3 });
  T.eq(s.goals, [{ from: '2026-01-01', prot: 120 }, { from: '2026-02-01', kcal: 1800 }]);
});
T.test('mål från datum: gamla dagar behåller gammalt mål', () => {
  const s = defaults();
  setGoal(s, '2026-11-09', { kcal: 1800 });
  T.eq(goalFor(s, '2026-11-08').kcal, undefined);
  T.eq(goalFor(s, '2026-11-09').kcal, 1800);
  setGoal(s, '2026-11-09', { kcal: 1700 });
  T.eq(s.goals.length, 2);
});
T.test('import: kcal och makron per 100 g som i formuläret, med marginal för Matolja', () => {
  const s = validate({ log: { '2026-11-09': [post({ n: [9000, 0, 0, 0] }), post({ n: [400, 100, 100, 100] }), post({ id: 'p2', n: [902, 0, 0, 102] })] } });
  T.eq(s.log['2026-11-09'].map((x) => x.id), ['p2']);
});
T.test('ögonblicksbild: posten behåller sitt n', () => {
  const s = validate({ log: { '2026-11-09': [post({ n: [40, 3, 5, 1] })] } });
  T.eq(s.log['2026-11-09'][0].n, [40, 3, 5, 1]);
});
T.test('vecka: snitt, inom mål (≤ +5 %), datum', () => {
  const s = validate({ goals: [{ from: '2000-01-01', kcal: 2000 }], log: { '2026-11-03': [post({ g: 5000 })], '2026-11-04': [post({ g: 5500 })] } });
  const st = weekStats(s, '2026-11-03');
  T.eq([st.logged, st.within, st.avg], [2, 1, 2048]);
  T.eq(weekStart('2026-11-12'), '2026-11-09'); T.eq(isoWeek('2026-11-09'), 46); T.eq(addDays('2026-11-30', 1), '2026-12-01');
});
T.test('export → import tur och retur', () => {
  const s = validate({ log: { '2026-11-09': [post()] }, weights: { '2026-11-09': 80 } });
  const r = importText(exportText(s, '2026-11-09'));
  T.eq([r.posts, r.weights, r.exported], [1, 1, '2026-11-09']);
  T.eq(r.data.log, s.log);
});
T.test('schablon (p:): giltig ref godtas med sina värden, skräp avvisas', () => {
  const ok = post({ ref: 'p:pannkaka', name: 'Pannkaka', g: 90, n: [165, 6.7, 17.9, 7], u: ['st', 2] });
  const s = validate({ log: { '2026-11-09': [ok, post({ id: 'p2', ref: 'p:' }), post({ id: 'p3', ref: 'p:a b' }), post({ id: 'p4', ref: 'pp:x' })] } });
  T.eq(s.log['2026-11-09'], [ok], 'loggad post behåller sina värden');
});
T.test('schablon (p:): export → import ger samma data', () => {
  const s = validate({ log: { '2026-11-09': [post({ ref: 'p:lask-socker', name: 'Läsk/energidryck, Socker', g: 330, n: [42, 0, 10.5, 0], u: ['st', 1] })] } });
  const r = importText(exportText(s, '2026-11-09'));
  T.eq([r.posts, r.skipped], [1, 0]); T.eq(r.data.log, s.log);
});
T.test('import: fel app, fel format, trasig text, BOM', () => {
  T.ok(importText('{"app":"other","format":1,"data":{}}').error);
  T.ok(importText('{"app":"simple-nutrition","format":9,"data":{}}').error);
  T.ok(importText('{trasig').error);
  T.ok(!importText('﻿' + exportText(defaults(), '2026-11-09')).error, 'BOM');
});

// Import från follow-diet-tracker: exporten görs med appens egen exportText (habit-store.js = kopia av dess store.js).
import { exportText as fdtExport, validate as fdtValidate } from '../../habit-store.js';
T.test('import från Följ planen: riktig export → måltider matchas på namn, orsak, anteckning, vikt, pass, plan', () => {
  const r = importText(FDT);
  T.ok(r.fdt && !r.error, r.error || 'fdt');
  T.eq([r.meals, r.weighIns, r.sessions], [3, 1, 2]);
  const s = mergeFdt(defaults(), r.fdt);
  const day = s.habits['2026-11-02'];
  T.eq([day.m1.outcome, day.m2.outcome, day.m2.reason, day.m2.note, day['extra-1'].outcome], ['followed', 'cheat', 'craving', 'jobbet', 'cheat']);
  T.eq(s.meals.length, 4);
  T.eq(s.weights, { '2026-11-02': 84.6 });
  T.eq(s.workouts['2026-11-02'], [{ types: ['push', 'pull'] }, { types: ['run'], km: 5, sec: 1500 }]);
  T.eq(s.settings.planText, 'Plan');
  T.eq(Math.round(habitDay(s, '2026-11-02').ratio * 100), 33);   // 1 följde av 3 (extra fusk räknas, som i Följ planen)
});
T.test('import från Följ planen: egna måltider läggs till, det som finns här vinner', () => {
  const f = fdtValidate({ settings: { slots: [{ id: 'breakfast', name: 'Frukost' }, { id: 'night', name: 'Kvällsmål' }] },
    days: { '2026-11-02': { breakfast: { outcome: 'cheat' }, night: { outcome: 'followed' } } }, weighIns: { '2026-11-02': 80 } });
  const text = fdtExport(f, '2026-11-09');
  const mine = validate({ habits: { '2026-11-02': { m1: { outcome: 'followed' } } }, weights: { '2026-11-02': 82 } });
  const s = mergeFdt(mine, importText(text).fdt);
  T.eq(s.meals.map((m) => m.name), ['Frukost', 'Lunch', 'Mellanmål', 'Middag', 'Kvällsmål']);
  T.eq([s.habits['2026-11-02'].m1.outcome, s.habits['2026-11-02'].night.outcome, s.weights['2026-11-02']], ['followed', 'followed', 82]);
});
T.test('import från Följ planen: trasig eller fel export avvisas utan att något ändras', () => {
  T.ok(importText('{"app":"follow-diet-tracker","format":2,"data":{}}').error, 'format');
  T.ok(importText('{"app":"follow-diet-tracker","format":1}').error, 'data saknas');
  const r = importText(JSON.stringify({ app: 'follow-diet-tracker', format: 1, data: { days: { '__proto__': { x: 'f' }, '9999-01-01': { a: 'f' }, '2026-11-02': { 'bad id!': 'f', ok: 'z' } } } }));
  T.eq(Object.keys(mergeFdt(defaults(), r.fdt).habits), []);
});
T.test('inget kalorimål: veckan räknar inte "inom mål", tomt mål tas bort från ett datum', () => {
  const s = validate({ log: { '2026-11-03': [post({ g: 5000 })] } });
  const st = weekStats(s, '2026-11-03');
  T.eq([st.hasGoal, st.within, st.avg], [false, 0, 1950]);
  setGoal(s, '2026-11-01', { kcal: 1800 });
  setGoal(s, '2026-11-05', { kcal: undefined });
  T.eq([goalFor(s, '2026-11-03').kcal, goalFor(s, '2026-11-06').kcal], [1800, undefined]);
  T.ok(!('kcal' in s.goals.at(-1)), 'kcal borttaget');
});
T.test('layout och backup valideras (v0.6–0.7)', () => {
  const s = validate({ layout: { week: { order: ['kcal', 'BAD!', 7, 'weight'], hidden: 'x' }, evil: { order: ['a'] }, trend: 5 },
    backup: { remind: 'hourly', last: '2026-11-01', asked: 'igår' } });
  T.eq(s.layout, { week: { order: ['kcal', 'weight'], hidden: [] } });
  T.eq(s.backup, { remind: 'month', last: '2026-11-01', asked: null });
  T.eq(validate({ layout: [1, 2] }).layout, {});
});
T.test('export har readme, schema och exempel; exemplet går att läsa in (F2)', () => {
  const env = JSON.parse(exportText(defaults(), '2026-11-10'));
  T.ok(env.readme && env.schema.log && env.example.log, 'beskrivning');
  const ex = importText(JSON.stringify({ app: 'simple-nutrition', format: 1, exported: '2026-11-10', data: env.example }));
  T.ok(!ex.error, ex.error); T.eq(ex.posts, 3); T.eq(ex.skipped, 0);
  T.ok(importText(JSON.stringify({ app: 'simple-nutrition', format: 1, schema: {}, example: {} })).error, 'utan data = fel');
});
T.test('utemat: q:-post valideras och räknas som totalt (F3)', () => {
  const q = { id: 'p9', m: 'm1', ref: 'q:out-light', name: 'Utemat – Lätt', q: 1, n: [700, 30, 75, 30], u: ['st', 1] };
  const s = validate({ log: { '2026-11-10': [q, { ...q, id: 'p8', ref: 'q:okand' }] } });
  T.eq(s.log['2026-11-10'].length, 1);
  T.eq(postN(s.log['2026-11-10'][0])[0], 700);
});
T.test('fusknivåer: orsak styr grupp (v0.9)', () => {
  T.eq([quickGroup('snacks', false), quickGroup('out-lunch', false), quickGroup('craving', false)], ['snack', 'out', null]);
  T.eq([quickGroup('snacks', true), quickGroup('out-lunch', true), quickGroup('craving', true), quickGroup(undefined, true)], ['snack', 'snack', 'snack', 'snack']);   // v0.9.1: extra = alltid snacks
});
T.test('fusknivåer: sätt, byt, ta bort med samma, och städa vid byte av orsak (v0.9)', () => {
  const s = defaults(), d = '2026-11-11';
  s.log[d] = [post({ id: 'a' }), { id: 'u', m: 'm2', ref: 'q:out-light', name: 'Utemat – Lätt', q: 1, n: [700, 30, 75, 30], u: ['st', 1] }];
  T.ok(setLevel(s, d, 'm2', 'snack-s', 'x1'), 'lagd');
  T.ok(setLevel(s, d, 'm2', 'snack-m', 'x2'), 'bytt');
  T.eq(s.log[d].filter((p) => p.ref.startsWith('q:snack')).map((p) => p.ref), ['q:snack-m']);
  T.ok(!setLevel(s, d, 'm2', 'snack-m', 'x3'), 'samma igen = bort');
  T.eq(s.log[d].length, 2);
  setLevel(s, d, 'm2', 'snack-l', 'x4');
  dropLevels(s, d, 'm2', 'out');   // orsak bytt från Snacks: snacks bort, utemat kvar
  T.eq(s.log[d].map((p) => p.id), ['a', 'u']);
  setLevel(s, d, 'extra-1', 'home-std', 'e1');
  T.eq(postN(s.log[d].find((p) => p.id === 'e1'))[0], 650);
  dropLevels(s, d, 'extra-1', null);   // extra fusk borttaget
  T.eq(s.log[d].map((p) => p.id), ['a', 'u']);
  T.eq(validate({ log: { [d]: [{ id: 'e2', m: 'extra-1731', ref: 'q:snack-l', name: 'Snacks – Mycket', q: 1, n: [950, 11, 95, 58] }] } }).log[d].length, 1);
});
T.test('plan: högst 300 tecken även vid import', () => {
  T.eq(validate({ ...defaults(), settings: { ...defaults().settings, planText: 'x'.repeat(2000) } }).settings.planText.length, 300);
});

// Livsmedelsdatan (klassiskt skript) laddas för söktesterna nedan.
await new Promise((ok, fel) => { const s = document.createElement('script'); s.src = new URL('../../data/foods.js', import.meta.url).href; s.onload = ok; s.onerror = fel; document.head.appendChild(s); });
const ST = () => ({ ...defaults(), foods: [], aliases: {} });
T.test('nya namn: smör, skinka, torsk, vegofärs och kaffe ger en post med nytt namn, dolda varianter syns inte', () => {
  const core = (q) => searchFoods(ST(), q).hits.filter((f) => !f.product);
  for (const [q, name] of [['smör', 'Smör'], ['skinka', 'Skinka'], ['torsk', 'Torsk'], ['vegofärs', 'Vegofärs'], ['kaffe', 'Kaffe']]) {
    const h = core(q); T.eq(h[0] && h[0].name, name, q);
  }
  const smor = core('smör')[0];
  T.eq(smor.v.length, 1); T.eq(smor.v[0].u, ['smörgås', 5]);
  T.eq(core('skinka')[0].v.map((v) => v.label), ['Skinka']);
  T.eq(core('torsk')[0].v.map((v) => v.label), ['Torsk']);
  T.eq(core('kaffe')[0].v.map((v) => v.label), ['Bryggkaffe']);
  T.ok(!core('sej')[0].v.some((v) => v.label === 'Sej'), 'Sej dold');
});
T.test('dolda varianter hittas för gamla loggar (Sej, Kalkon, Latte, Lätt 40 %)', () => {
  for (const [ref, name] of [['l:1202', 'Torsk'], ['l:1191', 'Skinka'], ['l:2816', 'Kaffe'], ['l:4663', 'Smör']]) {
    const f = findRef(ST(), ref); T.eq(f && f.name, name, ref); T.ok(f.v.some((v) => v.ref === ref), ref + ' variant');
  }
});
T.test('inget sökord på mer än en post i FOODS_CORE och FOODS_PRODUCTS', () => {
  const seen = new Map(), dup = [];
  for (const f of [...FOODS_CORE, ...FOODS_PRODUCTS]) for (const w of new Set(f.q || [])) { if (seen.has(w) && seen.get(w) !== f.name) dup.push(`${w}: ${seen.get(w)} / ${f.name}`); else seen.set(w, f.name); }
  T.eq(dup, []);
});
