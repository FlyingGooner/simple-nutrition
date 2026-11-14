// Node tests (node:test, no npm) for v0.14.0. Loads the app's own source files. Run: node --test tools/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topLayer, layerDepth, closeTop, dishDirty, defaultQuickG } from '../../nav.js';
import { QUICK_ADD, validate, exportText, importText, defaults, recent } from '../../store.js';

const add = (o = {}) => ({ target: 'meal', meal: 'm1', tab: 'foods', q: 'bröd', all: true, pick: null, dpick: null, est: null, alias: false, scroll: 420, ...o });

test('bakåt: pick före add, dish för sig, inget öppet = null', () => {
  assert.equal(topLayer({ add: add({ pick: {} }), dish: null }), 'pick');
  assert.equal(topLayer({ add: add({ dpick: {} }) }), 'pick');
  assert.equal(topLayer({ add: add({ est: { g: 'out' } }) }), 'pick');
  assert.equal(topLayer({ add: add() }), 'add');
  assert.equal(topLayer({ add: null, dish: { name: '' } }), 'dish');
  assert.equal(topLayer({ add: null, dish: null }), null);
  assert.equal(layerDepth({ add: add({ pick: {} }), dish: {} }), 3);
});
test('bakåt: unpick behåller tab, q, all och scroll; closeTop stänger ett lager i taget', () => {
  const S = { add: add({ tab: 'recent', pick: {} }), dish: {} };
  assert.equal(closeTop(S), true);
  assert.deepEqual([S.add.tab, S.add.q, S.add.all, S.add.scroll, S.add.pick], ['recent', 'bröd', true, 420, null]);
  assert.equal(closeTop(S), true); assert.equal(S.add, null); assert.ok(S.dish);
  assert.equal(closeTop(S), true); assert.equal(S.dish, null);
  assert.equal(closeTop(S), false);
});
test('bakåt: osparad rätt', () => {
  const d = { id: null, name: 'Chili', portions: 4, batch: true, cooked: '', items: [{ ref: 'l:1', name: 'Färs', g: 500, n: [200, 20, 0, 14] }] };
  const orig = JSON.stringify(d);
  assert.equal(dishDirty(structuredClone(d), orig), false);
  assert.equal(dishDirty({ ...structuredClone(d), name: 'Chili 2' }, orig), true);
  const more = structuredClone(d); more.items.push({ ref: 'l:2', name: 'Lök', g: 100, n: [40, 1, 8, 0] });
  assert.equal(dishDirty(more, orig), true);
  const w = structuredClone(d); w.items[0].g = 400;
  assert.equal(dishDirty(w, orig), true);
  assert.equal(dishDirty(null, orig), false);
});
test('frukost: tre bf-rader, makron inom 10 % av kcal', () => {
  const bf = QUICK_ADD.filter((x) => x.g === 'bf');
  assert.deepEqual(bf.map((x) => x.id), ['bf-light', 'bf-std', 'bf-heavy']);
  assert.deepEqual(bf.map((x) => x.n[0]), [250, 400, 650]);
  for (const x of bf) { const [k, p, c, f] = x.n; assert.ok(Math.abs(p * 4 + c * 4 + f * 9 - k) / k <= 0.1, x.id); }
});
test('frukost: förvalt läge', () => {
  assert.equal(defaultQuickG('Frukost', 'out'), 'bf');
  assert.equal(defaultQuickG(' frukost ', null), 'bf');
  assert.equal(defaultQuickG('Lunch', 'out'), 'out');
  assert.equal(defaultQuickG('Lunch', null), 'home');
  assert.equal(defaultQuickG('Lunch', 'bf'), 'bf');
});

const est = (o) => ({ id: 'e1', m: 'm2', ref: 'q:est-out', name: 'Lax med ris', q: 1, n: [650, 38, 55, 28], u: ['st', 1], ...o });
const day = (posts) => validate({ log: { '2026-11-14': posts } }).log['2026-11-14'] || [];
test('egen uppskattning: cleanPost godtar q:est-* inom gränserna', () => {
  for (const ref of ['q:est-bf', 'q:est-home', 'q:est-out']) assert.equal(day([est({ ref })]).length, 1, ref);
  assert.deepEqual(day([est()])[0].n, [650, 38, 55, 28]);
  assert.equal(day([est({ n: [5000, 500, 500, 500] })]).length, 1);
  assert.equal(day([est({ name: 'x'.repeat(60) })]).length, 1);
});
test('egen uppskattning: avvisar kcal 0 och 5 001, makron över 500, okänt läge, långt namn', () => {
  assert.equal(day([est({ n: [0, 0, 0, 0] })]).length, 0);
  assert.equal(day([est({ n: [5001, 0, 0, 0] })]).length, 0);
  assert.equal(day([est({ n: [650, 501, 0, 0] })]).length, 0);
  assert.equal(day([est({ ref: 'q:est-xyz' })]).length, 0);
  assert.equal(day([est({ name: 'x'.repeat(61) })]).length, 0);
});
test('fasta snabbval slås fortfarande upp i QUICK_ADD', () => {
  assert.equal(day([est({ ref: 'q:bf-std', n: [400, 18, 45, 16] })]).length, 1);
  assert.equal(day([est({ ref: 'q:out-xyz' })]).length, 0);
});
test('senaste: olika uppskattningar slås inte ihop', () => {
  const s = defaults(); s.log['2026-11-14'] = [est(), est({ id: 'e2', name: 'Pizza', n: [900, 30, 100, 40] })];
  assert.equal(recent(s).length, 2);
});
test('backup: export → import behåller q:est-*, gammal backup utan sådana läses som förut', () => {
  const s = defaults(); s.log['2026-11-14'] = [est(), est({ id: 'e2', ref: 'q:est-bf', name: 'Frukost – egen', n: [300, 10, 40, 9] })];
  const r = importText(exportText(s, '2026-11-14'));
  assert.ok(!r.error, r.error);
  assert.deepEqual(r.data.log, validate(s).log);
  const old = defaults(); old.log['2026-11-13'] = [est({ ref: 'q:out-std', name: 'Utemat – Standard', n: [1000, 40, 105, 45] })];
  const r2 = importText(exportText(old, '2026-11-14'));
  assert.deepEqual(r2.data.log, validate(old).log);
});
