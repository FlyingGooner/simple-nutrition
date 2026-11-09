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
T.test('ny rätt: hel sats med ingrediens, portioner och färdig vikt', async () => {
  await tab('settings');
  q('[data-act="dnew"]').click();
  const nm = q('#d-name'); nm.value = 'Köttfärssås <b>'; nm.dispatchEvent(new Event('input', { bubbles: true }));
  q('[data-act="diadd"]').click();
  type(q('#add-q'), 'nötfärs');
  q('#add-results [data-act="pick"]').click();
  type(q('#amount'), '500');
  q('[data-act="addsave"]').click();
  T.ok(q('#d-name'), 'tillbaka i editorn');
  T.eq(q('#d-name').value, 'Köttfärssås <b>');
  const port = q('[data-act="dport"]'); port.value = '5'; port.dispatchEvent(new Event('change', { bubbles: true }));
  const ck = q('[data-act="dcooked"]'); ck.value = '1000'; ck.dispatchEvent(new Event('change', { bubbles: true }));
  q('[data-act="dsave"]').click();
  const d = stored().dishes[0];
  T.eq([d.name, d.portions, d.cooked, d.items.length, d.items[0].g], ['Köttfärssås <b>', 5, 1000, 1, 500]);
  T.eq(app.querySelectorAll('b').length, 0);
});
T.test('rätt per portion sparas med portions 1', () => {
  q('[data-act="dnew"]').click();
  q('#d-name').value = 'Gröt'; q('#d-name').dispatchEvent(new Event('input', { bubbles: true }));
  q('[data-act="dper"]').click();
  q('[data-act="diadd"]').click();
  type(q('#add-q'), 'havregryn');
  q('#add-results [data-act="pick"]').click();
  if (q('[data-act="unit"][data-val="g"]')) q('[data-act="unit"][data-val="g"]').click();
  type(q('#amount'), '60');
  q('[data-act="addsave"]').click();
  q('[data-act="dsave"]').click();
  T.eq(stored().dishes.find((x) => x.name === 'Gröt').portions, 1);
});
T.test('logga rätt: portion, andel 1/5 och gram ger rätt q och kcal', async () => {
  await tab('today');
  const d = stored().dishes.find((x) => x.portions === 5), tot = d.items[0].n[0] * 5;
  const logDish = (mode, amount) => {
    q('[data-act="addopen"][data-id="m4"]').click();
    q('[data-act="addtab"][data-val="dishes"]').click();
    q(`[data-act="dpick"][data-id="${d.id}"]`).click();
    if (mode !== 'port') q(`[data-act="dmode"][data-val="${mode}"]`).click();
    type(q('#amount'), amount);
    q('[data-act="daddsave"]').click();
    return stored().log['2026-11-09'].at(-1);
  };
  let p = logDish('port', '1'); T.eq([p.q, p.u, Math.round(p.n[0])], [0.2, ['port.', 1], Math.round(tot / 5)]);
  p = logDish('andel', '1/4'); T.eq([p.q, p.u[0]], [0.25, 'av satsen']);
  p = logDish('g', '300'); T.eq([p.q, p.u], [0.3, ['g', 300]]);
});
T.test('ändra mängd på loggad rätt skalar kcal', () => {
  const before = stored().log['2026-11-09'].at(-1);
  q(`[data-act="popen"][data-id="${before.id}"]`).click();
  q('#p-amount').value = '150';
  q('[data-act="psave"]').click();
  const p = stored().log['2026-11-09'].at(-1);
  T.eq([p.q, p.u], [0.15, ['g', 150]]);
  T.eq(Math.round(p.n[0]), Math.round(before.n[0] / 2));
});
T.test('ändrad rätt påverkar inte loggad dag', async () => {
  const n0 = stored().log['2026-11-09'].at(-1).n[0];
  await tab('settings');
  q('[data-act="dedit"]').click();
  const g = q('[data-act="dig"]'); g.value = '1000'; g.dispatchEvent(new Event('change', { bubbles: true }));
  q('[data-act="dsave"]').click();
  T.eq(stored().log['2026-11-09'].at(-1).n[0], n0);
});
T.test('egen produkt sparas och hittas i sökningen', async () => {
  const set = (i, v) => { q('#' + i).value = v; };
  set('f-name', 'Proteinbar typ X'); set('f-kcal', '360'); set('f-p', '33'); set('f-k', '30'); set('f-f', '12'); set('f-unit', 'st'); set('f-ug', '55');
  q('[data-act="fadd"]').click();
  T.eq(stored().foods[0].u, ['st', 55]);
  await tab('today');
  q('[data-act="addopen"][data-id="m3"]').click();
  q('[data-act="addtab"][data-val="foods"]').click();
  type(q('#add-q'), 'proteinbar');
  T.ok(q('#add-results .food-row').textContent.includes('Proteinbar'), 'hittades');
  q('#add-results [data-act="pick"]').click();
  T.eq(q('[data-act="unit"].on').textContent, 'st');
});
T.test('eget sökord visar varan först', () => {
  q('[data-act="aliasopen"]').click();
  q('#alias-word').value = 'bar';
  q('[data-act="aliassave"]').click();
  T.ok(stored().aliases.bar.startsWith('u:'), 'sparat');
  q('[data-act="addclose"]').click();
  q('[data-act="addopen"][data-id="m3"]').click();
  q('[data-act="addtab"][data-val="foods"]').click();
  type(q('#add-q'), 'bar');
  T.ok(q('#add-results .food-row').textContent.includes('Proteinbar'), 'först');
  q('[data-act="addclose"]').click();
});
T.test('kopiera från igår på tom dag', () => {
  T.ok(!q('[data-act="copyprev"]'), 'dagen har poster – ingen knapp');
  q('[data-act="clearday"]').click();
  q('[data-act="copyprev"]').click();
  const l = stored().log['2026-11-09'];
  T.eq([l.length, l[0].name], [1, '<img src=x onerror=alert(1)>']);
  T.ok(l[0].id !== 'a2', 'nytt id');
});
T.test('proteinmål visas i summan', async () => {
  await tab('settings');
  const inp = q('[data-act="goalmacro"][data-val="prot"]');
  inp.value = '120'; inp.dispatchEvent(new Event('change', { bubbles: true }));
  T.eq(stored().goals.at(-1).prot, 120);
  await tab('today');
  T.ok(q('.macros').textContent.includes('/ 120 g'), q('.macros').textContent);
});
T.test('trend: 7-dagars medel, tabell och diagram', async () => {
  await tab('trend');
  T.ok(q('.w-big'), 'vikt');
  T.ok(app.querySelectorAll('.wk-table tbody tr').length >= 2, 'tabell');
  T.ok(q('.chart .w-line'), 'diagram');
  q('.wk-table [data-act="openweek"]').click(); await T.wait();
  T.eq(location.hash, '#week');
});
T.test('historik: kalender, färg och streak', async () => {
  await tab('history');
  T.ok(app.querySelectorAll('.cal-day').length >= 28, 'dagar');
  T.ok(q('.cal-day.is-today'), 'idag');
  q('[data-act="mprev"]').click();
  T.ok(q('.cal-day.good, .cal-day.over, .cal-day.mid'), 'färgad dag');
});
