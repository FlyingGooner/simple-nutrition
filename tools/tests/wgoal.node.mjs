// Viktmål (2026-11-21): validering och plan, högst 1 % av vikten per vecka.
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { validate, weightPlan, currentWeight } = await import('../../store.js');

test('validate wgoal', () => {
  assert.deepEqual(validate({ wgoal: { target: 75.04, date: '2027-03-01' } }).wgoal, { target: 75, date: '2027-03-01' });
  assert.deepEqual(validate({ wgoal: { target: 75, rate: 0.5 } }).wgoal, { target: 75, rate: 0.5 });
  assert.deepEqual(validate({ wgoal: { target: 75 } }).wgoal, { target: 75 });   // målvikt utan datum = prognos
  assert.equal(validate({ wgoal: { target: 10, rate: 0.5 } }).wgoal, undefined);
});
test('plan: datum, takt, för snabbt, nått', () => {
  const st = validate({ weights: { '2026-11-20': 80, '2026-11-21': 80.2 } });
  assert.equal(currentWeight(st), 80.1);
  const ok = weightPlan({ target: 75, rate: 0.5 }, 80, '2026-11-21');
  assert.equal(ok.tooFast, false); assert.equal(ok.rate, -0.5); assert.equal(ok.kcalDay, -550); assert.equal(ok.eta, '2027-01-30');
  const fast = weightPlan({ target: 75, date: '2026-12-01' }, 80, '2026-11-21');
  assert.equal(fast.tooFast, true); assert.ok(fast.rate > -0.8 && fast.rate < -0.77); assert.equal(fast.earliest, '2027-01-05');
  assert.equal(weightPlan({ target: 75, date: '2027-01-05' }, 80, '2026-11-21').tooFast, false);   // exakt tidigaste datum går
  assert.equal(weightPlan({ target: 75, date: '2027-01-04' }, 80, '2026-11-21').tooFast, true);
  assert.equal(weightPlan({ target: 85, rate: 0.9 }, 80, '2026-11-21').tooFast, true);   // upp i vikt: samma gräns
  assert.equal(weightPlan({ target: 80.05, rate: 0.5 }, 80, '2026-11-21').reached, true);
  assert.equal(weightPlan({ target: 75, rate: 0.5 }, null, '2026-11-21'), null);
});
test('takt utan målvikt (snabbval)', () => {
  assert.deepEqual(validate({ wgoal: { rate: 0.5 } }).wgoal, { rate: 0.5 });
  const p = weightPlan({ rate: 0.5 }, 112, '2026-11-21');
  assert.equal(p.open, true); assert.equal(p.rate, -0.5); assert.equal(p.kcalDay, -550); assert.equal(p.tooFast, false);
  assert.equal(weightPlan({ rate: 1.2 }, 112, '2026-11-21').tooFast, true);
});
test('takt i procent följer vikten', () => {
  assert.deepEqual(validate({ wgoal: { pct: 0.5 } }).wgoal, { pct: 0.5 });
  assert.deepEqual(validate({ wgoal: { pct: 0.75, target: 100 } }).wgoal, { pct: 0.75, target: 100 });
  assert.equal(validate({ wgoal: { pct: 2 } }).wgoal, undefined);
  assert.equal(weightPlan({ pct: 1 }, 112, '2026-11-21').rate, -1.12);
  assert.equal(weightPlan({ pct: 0.5, target: 100 }, 80, '2026-11-21').rate, 0.4);   // upp mot målet
});
test('prognos: i fas, efter, fel håll', async () => {
  const { weightForecast, addDays } = await import('../../store.js');
  const T = '2026-11-21', w = (perDay) => Object.fromEntries(Array.from({ length: 21 }, (_, i) => [addDays(T, -20 + i), Math.round((100 + (i - 20) * perDay) * 10) / 10]));
  // 100 kg idag, mål 95 kg om 10 veckor (0,5 kg/v)
  const on = weightForecast(validate({ weights: w(-0.5 / 7), wgoal: { target: 95, date: addDays(T, 70) } }), T);
  assert.equal(on.status, 'on');
  assert.equal(weightForecast(validate({ weights: w(-0.25 / 7), wgoal: { target: 95, date: addDays(T, 70) } }), T).status, 'behind');
  assert.equal(weightForecast(validate({ weights: w(0.2 / 7), wgoal: { target: 95, date: addDays(T, 70) } }), T).status, 'wrong');
  assert.equal(weightForecast(validate({ weights: { [T]: 100 }, wgoal: { target: 95, date: addDays(T, 70) } }), T).ready, false);
});
test('målvikt utan datum: prognos utan status, kaloriråd på 0,5 %', async () => {
  const { weightForecast, addDays } = await import('../../store.js');
  const T = '2026-11-21', weights = {};
  for (let i = 0; i <= 20; i++) weights[addDays(T, -20 + i)] = Math.round((100 + (20 - i) * 0.5 / 7) * 10) / 10;   // 102,9 → 100, −0,5 kg/v
  const st = validate({ weights, wgoal: { target: 95 } });
  const p = weightPlan(st.wgoal, 100, T);
  assert.equal(p.auto, true); assert.equal(p.rate, -0.5);
  const f = weightForecast(st, T);
  assert.equal(f.status, 'none'); assert.ok(f.date > addDays(T, 60) && f.date < addDays(T, 90), f.date);
});
