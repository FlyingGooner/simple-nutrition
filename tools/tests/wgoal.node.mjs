// Viktmål (2026-11-21): validering och plan, högst 1 % av vikten per vecka.
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { validate, weightPlan, currentWeight } = await import('../../store.js');

test('validate wgoal', () => {
  assert.deepEqual(validate({ wgoal: { target: 75.04, date: '2027-03-01' } }).wgoal, { target: 75, date: '2027-03-01' });
  assert.deepEqual(validate({ wgoal: { target: 75, rate: 0.5 } }).wgoal, { target: 75, rate: 0.5 });
  assert.equal(validate({ wgoal: { target: 75 } }).wgoal, undefined);
  assert.equal(validate({ wgoal: { target: 10, rate: 0.5 } }).wgoal, undefined);
});
test('plan: datum, takt, för snabbt, nått', () => {
  const st = validate({ weights: { '2026-11-20': 80, '2026-11-21': 80.2 } });
  assert.equal(currentWeight(st), 80.1);
  const ok = weightPlan({ target: 75, rate: 0.5 }, 80, '2026-11-21');
  assert.equal(ok.tooFast, false); assert.equal(ok.rate, -0.5); assert.equal(ok.kcalDay, -550); assert.equal(ok.eta, '2027-01-30');
  const fast = weightPlan({ target: 75, date: '2026-12-01' }, 80, '2026-11-21');
  assert.equal(fast.tooFast, true); assert.equal(fast.rate, -0.8); assert.equal(fast.earliest, '2027-01-04');
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
