// Unit tests for store.js (ES module). Run: tools\test.ps1 simple-nutrition
import { defaults, validate, cleanText, postN, sumN, goalFor, setGoal, weekStats, exportText, importText, addDays, weekStart, isoWeek, mergeFdt, habitDay } from '../../store.js';
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
T.test('import: fel app, fel format, trasig text, BOM', () => {
  T.ok(importText('{"app":"other","format":1,"data":{}}').error);
  T.ok(importText('{"app":"simple-nutrition","format":9,"data":{}}').error);
  T.ok(importText('{trasig').error);
  T.ok(!importText('﻿' + exportText(defaults(), '2026-11-09')).error, 'BOM');
});

// Import från follow-diet-tracker: exporten görs med appens egen exportText (fdt-store.js = kopia av dess store.js).
import { exportText as fdtExport, validate as fdtValidate } from '../../fdt-store.js';
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
