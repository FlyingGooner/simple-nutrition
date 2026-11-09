// @hash today
// UI flow tests in dist/simple-nutrition.html with tools/tests/ui-seed.json (today = 2026-11-09). Run: tools\test.ps1 simple-nutrition
const app = document.getElementById('app');
const q = (s) => app.querySelector(s);
const stored = () => JSON.parse(localStorage.getItem('sn.data'));
const tab = async (v) => { document.querySelector(`.tabbar [data-view="${v}"]`).click(); await T.wait(); };
const type = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
const foods = () => { if (!q('#add-q')) q('[data-act="addtab"][data-val="foods"]').click(); };

T.test('appen startar i Idag med summa och fyra måltider', () => {
  T.ok(q('.sum-card'), 'summa'); T.eq(app.querySelectorAll('.meal').length, 4);
  T.ok(/^v\d/.test(document.getElementById('version').textContent), 'version');
});
T.test('sök vara, välj variant och mått, kcal räknas och sparas', () => {
  q('[data-act="addopen"][data-id="m1"]').click();
  foods();
  type(q('#add-q'), 'mjölk');
  T.ok(q('#add-results [data-act="pick"]'), 'träff');
  T.eq(q('#add-results .food-row .post-name').firstChild.textContent, 'Mjölk');
  q('#add-results [data-act="pick"]').click();
  q('[data-act="variant"][data-val="1"]').click();
  T.eq(q('[data-act="unit"].on').textContent, 'dl');
  type(q('#amount'), '2');
  T.ok(/^97 kcal/.test(q('#pick-sum').textContent), q('#pick-sum').textContent);
  q('[data-act="addsave"]').click();
  const p = stored().log['2026-11-09'][0];
  T.eq([p.m, p.ref, p.g, p.u, p.name], ['m1', 'l:150', 206, ['dl', 2], 'Mjölk, Mellan 1,5 %']);
  T.ok(/97/.test(q('.sum-big strong').textContent), 'summan');
});
T.test('gram i stället för mått', () => {
  q('[data-act="addopen"][data-id="m2"]').click();
  foods();
  type(q('#add-q'), 'havregryn');
  q('#add-results [data-act="pick"]').click();
  if (q('[data-act="unit"][data-val="g"]')) q('[data-act="unit"][data-val="g"]').click();
  type(q('#amount'), '60');
  q('[data-act="addsave"]').click();
  const l = stored().log['2026-11-09'];
  T.eq([l.length, l[1].g, l[1].m, 'u' in l[1]], [2, 60, 'm2', false]);
});
T.test('sökning i övriga när kärnan saknar träff', () => {
  q('[data-act="addopen"][data-id="m3"]').click();
  foods();
  type(q('#add-q'), 'talg');
  T.ok(q('#add-results .food-row'), 'talg finns');
  q('[data-act="addclose"]').click();
});
T.test('Senaste loggar samma igen', () => {
  q('[data-act="addopen"][data-id="m4"]').click();
  q('[data-act="addtab"][data-val="recent"]').click();
  T.ok(app.querySelectorAll('[data-act="relog"]').length >= 2, 'senaste');
  q('[data-act="relog"]').click();
  const l = stored().log['2026-11-09'];
  T.eq([l.length, l[2].m], [3, 'm4']);
});
T.test('ändra mängd och flytta post, sedan ta bort med ångra', () => {
  q('[data-act="popen"]').click();
  const id = q('[data-act="psave"]').dataset.id;
  q('#p-amount').value = '300'; q('#p-meal').value = 'm3';
  q('[data-act="psave"]').click();
  const p = stored().log['2026-11-09'].find((x) => x.id === id);
  T.eq([p.g, p.m, 'u' in p], [300, 'm3', false]);
  app.querySelector(`[data-act="popen"][data-id="${id}"]`).click();
  q('[data-act="pdel"]').click();
  T.eq(stored().log['2026-11-09'].length, 2);
  document.getElementById('snack-action').click();
  T.eq(stored().log['2026-11-09'].length, 3);
});
T.test('vikt sparas', () => {
  q('#weight').value = '83,4';
  q('[data-act="weightsave"]').click();
  T.eq(stored().weights['2026-11-09'], 83.4);
});
T.test('namn från data visas som text', async () => {
  q('[data-act="prev"]').click(); await T.wait();
  T.eq(app.querySelectorAll('img').length, 0);
  T.ok(app.textContent.includes('<img src=x'), 'texten syns');
  q('[data-act="today"]').click();
});
T.test('vecka visar staplar, dag öppnar Idag', async () => {
  await tab('week');
  T.eq(app.querySelectorAll('.kb-row').length, 7);
  app.querySelectorAll('.kb-row')[0].click(); await T.wait();
  T.eq(location.hash, '#today');
  await tab('today');
});
T.test('kalorimål ändras från idag', async () => {
  await tab('settings');
  const inp = q('[data-act="goalkcal"]');
  inp.value = '1800'; inp.dispatchEvent(new Event('change', { bubbles: true }));
  const g = stored().goals;
  T.eq(g.at(-1), { from: '2026-11-09', kcal: 1800 });
  T.eq(g[0].kcal, 2000);
});
T.test('måltid läggs till, döps om och tas bort', () => {
  q('[data-act="add"]').click();
  const inp = [...app.querySelectorAll('[data-act="rename"]')].at(-1);
  inp.value = 'Kvällsmål'; inp.dispatchEvent(new Event('change', { bubbles: true }));
  T.eq(stored().meals.at(-1).name, 'Kvällsmål');
  [...app.querySelectorAll('[data-act="del"]')].at(-1).click();
  T.eq(stored().meals.length, 4);
});
T.test('export → import i Inställningar', () => {
  q('[data-act="export"]').click();
  document.getElementById('import-text').value = document.getElementById('export-text').value;
  q('[data-act="import"]').click();
  T.ok(document.getElementById('import-dialog').open, 'dialog');
  T.ok(/poster/.test(document.getElementById('imp-sum').textContent), 'summering');
  document.getElementById('imp-ok').click();
  document.getElementById('import-dialog').close();
  T.eq(stored().log['2026-11-09'].length, 3);
});
T.test('trend och historik visar kommer snart', async () => {
  await tab('trend'); T.ok(q('.soon'), 'trend');
  await tab('history'); T.ok(q('.soon'), 'historik');
});
