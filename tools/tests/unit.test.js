// Unit tests for store.js (ES module). Run: tools\test.ps1 simple-nutrition
import { defaults, validate, cleanText, postN, sumN, goalFor, setGoal, weekStats, exportText, importText, addDays, weekStart, isoWeek } from '../../store.js';

const post = (o) => ({ id: 'p1', m: 'm1', ref: 'l:151', name: 'Mjölk', g: 200, n: [39, 3.6, 4.8, 0.5], ...o });

T.test('defaults: fyra måltider och 2000 kcal', () => {
  const d = defaults();
  T.eq(d.meals.map((m) => m.name), ['Frukost', 'Lunch', 'Mellanmål', 'Middag']);
  T.eq(d.goals[0].kcal, 2000);
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
  const s = validate({ weights: { '2026-11-01': 84.25, '2026-11-02': 5 }, goals: [{ from: '2026-01-01', kcal: 100 }, { from: '2026-01-01', kcal: 1800, prot: 120 }] });
  T.eq(s.weights, { '2026-11-01': 84.3 });
  T.eq(s.goals, [{ from: '2026-01-01', kcal: 1800, prot: 120 }]);
});
T.test('mål från datum: gamla dagar behåller gammalt mål', () => {
  const s = defaults();
  setGoal(s, '2026-11-09', { kcal: 1800 });
  T.eq(goalFor(s, '2026-11-08').kcal, 2000);
  T.eq(goalFor(s, '2026-11-09').kcal, 1800);
  setGoal(s, '2026-11-09', { kcal: 1700 });
  T.eq(s.goals.length, 2);
});
T.test('ögonblicksbild: posten behåller sitt n', () => {
  const s = validate({ log: { '2026-11-09': [post({ n: [40, 3, 5, 1] })] } });
  T.eq(s.log['2026-11-09'][0].n, [40, 3, 5, 1]);
});
T.test('vecka: snitt, inom mål (≤ +5 %), datum', () => {
  const s = validate({ log: { '2026-11-03': [post({ g: 5000 })], '2026-11-04': [post({ g: 5500 })] } });
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
