// Förbrukning och kvalitet (2026-11-21): datan avgör själv hur säker uträkningen är.
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { validate, energyEstimate, periodEnergy, addDays } = await import('../../store.js');
const T = '2026-11-21';
// Deterministiskt "brus" ±0,3 kg.
function mk(days, eat, burn, { logEvery = 1, weighEvery = 1 } = {}) {
  const log = {}, weights = {};
  let w = 85;
  for (let i = 0; i < days; i++) {
    const k = addDays(T, -days + i);
    if (i % logEvery === 0) log[k] = [{ id: 'p' + i, m: 'm1', ref: 'q:est-home', name: 'x', q: 1, n: [eat, 0, 0, 0] }];
    w += (eat - burn) / 7700;
    if (i % weighEvery === 0) weights[k] = Math.round((w + 0.3 * Math.sin(i * 2.3)) * 10) / 10;
  }
  return validate({ log, weights });
}
test('profil sparas inte', () => { assert.equal(validate({ profile: { height: 180 } }).profile, undefined); });
test('få data: låg kvalitet; 4 veckor noggrant: hög och nära sann förbrukning', () => {
  assert.equal(energyEstimate(validate({}), T), null);
  const early = energyEstimate(mk(5, 2000, 2600), T);
  assert.ok(early.ready && early.quality < 0.25);
  const good = energyEstimate(mk(28, 2000, 2600), T);
  assert.ok(good.quality > 0.9, `kvalitet ${good.quality}`);
  assert.ok(Math.abs(good.tdee - 2600) < 150, `tdee ${good.tdee}`);
});
test('slarv sänker kvaliteten', () => {
  const e = energyEstimate(mk(28, 2000, 2600, { logEvery: 2 }), T);
  assert.equal(e.weakest, 'logging'); assert.ok(e.quality < 0.3);
});
test('orimligt låg förbrukning = mat saknas i loggen', () => {
  const e = energyEstimate(mk(28, 1000, 1000), T);
  assert.equal(e.weakest, 'plausible'); assert.equal(e.low, true); assert.ok(e.quality < 0.3);
});
test('periodEnergy: mot mål och enligt vikten', () => {
  const st = mk(14, 2000, 2600); st.goals = [{ from: '2000-01-01', kcal: 2200 }];
  const pe = periodEnergy(st, addDays(T, -7), addDays(T, -1));
  assert.equal(pe.logged, 7); assert.equal(pe.vsGoal, -1400); assert.ok(pe.wKcal < 0);
});
test('vägningar innan loggningen började sänker inte loggningen', () => {
  const st = mk(12, 2000, 2600);
  for (let i = 13; i < 40; i++) st.weights[addDays(T, -i)] = 86;
  const e = energyEstimate(st, T);
  assert.equal(e.f.logging, 1); assert.equal(e.span, 12);
});
