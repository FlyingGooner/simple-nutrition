// Prognosen i Vecka och Månad (2026-11-27): lutningen högst 1 % av vikten per vecka. Run: node --test tools/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.self = globalThis;
const { capSlope } = await import('../../views/week.js');

test('prognos: lutningen kapas vid 1 % av vikten per vecka åt båda hållen', () => {
  assert.equal(capSlope(-0.5, 70), -0.1);   // 0,5 kg/dag ner vid 70 kg → 0,7 kg/v = 0,1 kg/dag
  assert.equal(capSlope(0.5, 70), 0.1);
  assert.equal(capSlope(-0.05, 70), -0.05);   // under taket: oförändrad
  assert.equal(capSlope(0, 100), 0);
});
