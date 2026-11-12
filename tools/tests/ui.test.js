// @hash today
// UI flow tests in dist/simple-nutrition.html with tools/tests/ui-seed.json (today = 2026-11-09). Run: tools\test.ps1 simple-nutrition
const app = document.getElementById('app');
const q = (s) => app.querySelector(s);
const stored = () => JSON.parse(localStorage.getItem('sn.data'));
const tab = async (v) => { document.querySelector(`.tabbar [data-view="${v}"]`).click(); await T.wait(); };
const type = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
const S_TODAY = '2026-11-09';
const foods = () => { if (!q('#add-q')) q('[data-act="addtab"][data-val="foods"]').click(); };

T.test('appen startar i Idag med summa och fyra måltider', () => {
  T.ok(q('.sum-card'), 'summa'); T.eq(app.querySelectorAll('.meal').length, 4);
  T.ok(/^v\d/.test(document.getElementById('version').textContent), 'version');
});
T.test('vanor: följde, fusk med orsak och anteckning, tryck igen tar bort', () => {
  q('[data-act="outcome"][data-id="m1"][data-val="followed"]').click();
  T.eq(stored().habits['2026-11-09'].m1.outcome, 'followed');
  q('[data-act="outcome"][data-id="m2"][data-val="cheat"]').click();
  q('[data-act="reason"][data-id="m2"][data-val="stress"]').click();
  const note = q('.hab-note[data-id="m2"]'); note.value = '<b>jobbet</b>'; note.dispatchEvent(new Event('change', { bubbles: true }));
  T.eq([stored().habits['2026-11-09'].m2.reason, stored().habits['2026-11-09'].m2.note], ['stress', '<b>jobbet</b>']);
  T.eq(app.querySelectorAll('b').length, 0);
  T.ok(/1\/2/.test(q('.summary').textContent), q('.summary').textContent);
  q('[data-act="outcome"][data-id="m1"][data-val="followed"]').click();
  T.ok(!stored().habits['2026-11-09'].m1, 'borttagen');
  q('[data-act="outcome"][data-id="m1"][data-val="followed"]').click();
});
T.test('extra fusk läggs till och tas bort med ångra', () => {
  q('[data-act="extra"]').click();
  const k = Object.keys(stored().habits['2026-11-09']).find((x) => x.startsWith('extra-'));
  T.ok(k, 'extra');
  q(`[data-act="remove"][data-id="${k}"]`).click();
  T.ok(!stored().habits['2026-11-09'][k], 'borta');
  document.getElementById('snack-action').click();
  T.ok(stored().habits['2026-11-09'][k], 'ångrad');
  q(`[data-act="remove"][data-id="${k}"]`).click();
});
T.test('träningspass: gym kombineras, kondition med km och tid', () => {
  q('[data-act="wnew"]').click();
  q('[data-act="wtype"][data-val="push"]').click(); q('[data-act="wtype"][data-val="pull"]').click();
  q('[data-act="wsave"]').click();
  q('[data-act="wnew"]').click();
  q('[data-act="wtype"][data-val="run"]').click();
  q('#w-km').value = '5,2'; q('#w-time').value = '28:30';
  q('[data-act="wsave"]').click();
  T.eq(stored().workouts['2026-11-09'], [{ types: ['push', 'pull'] }, { types: ['run'], km: 5.2, sec: 1710 }]);
});
T.test('maten är hopfälld under måltiden', () => {
  const d = q('.meal-food');
  T.ok(d && !d.open, 'stängd från början');
  T.ok(d.querySelector('[data-act="addopen"]'), '+ Lägg till mat finns i den');
});
T.test('sök vara, välj variant och mått, kcal räknas och sparas', () => {
  q('[data-act="addopen"][data-id="m1"]').click();
  foods();
  type(q('#add-q'), 'mjölk');
  T.ok(q('#add-results [data-act="pick"]'), 'träff');
  T.eq(q('#add-results .food-row .post-name').firstChild.textContent, 'Mjölk');
  q('#add-results [data-act="pick"]').click();
  q('[data-act="variant"][data-val="0"]').click();
  T.eq(q('[data-act="unit"].on').textContent, 'dl');
  type(q('#amount'), '2');
  T.ok(/^2 dl \(206 g\) · 97 kcal$/.test(q('#pick-sum').textContent), q('#pick-sum').textContent);
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
  T.eq([q('#p-amount').value, q('.post-edit .field span').textContent], ['2', 'Mängd, dl']);
  q('#p-amount').value = '3'; q('#p-meal').value = 'm3';
  q('[data-act="psave"]').click();
  const p = stored().log['2026-11-09'].find((x) => x.id === id);
  T.eq([p.g, p.m, p.u], [309, 'm3', ['dl', 3]]);   // måttet behålls (2 dl → 3 dl)
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
  const inp = q('#g-kcal');
  inp.value = '1800'; inp.dispatchEvent(new Event('change', { bubbles: true }));
  T.eq(stored().goals.length, 1, 'inget sparas förrän Spara');
  q('[data-act="goalsave"]').click();
  const g = stored().goals;
  T.eq(g.at(-1), { from: '2026-11-09', kcal: 1800 });
  T.eq(g[0].kcal, 2000);
});
T.test('måltid läggs till, döps om och tas bort', () => {
  q('[data-act="add"][data-kind="meals"]').click();
  const inp = [...app.querySelectorAll('[data-act="rename"][data-kind="meals"]')].at(-1);
  inp.value = 'Kvällsmål'; inp.dispatchEvent(new Event('change', { bubbles: true }));
  T.eq(stored().meals.at(-1).name, 'Kvällsmål');
  [...app.querySelectorAll('[data-act="del"][data-kind="meals"]')].at(-1).click();
  T.eq(stored().meals.length, 4);
});
const plainText = () => JSON.stringify({ app: 'simple-nutrition', format: 1, data: stored() });   // an old unencrypted backup
T.test('ingen okrypterad export, inklistrad text importeras i Inställningar', async () => {
  T.ok(!document.getElementById('export-text') && !q('[data-act="export"]'), 'textexporten finns kvar');
  document.getElementById('import-text').value = plainText();
  q('[data-act="import"]').click();
  await T.until(() => document.getElementById('import-dialog').open, 'dialog');
  T.ok(/poster/.test(document.getElementById('imp-sum').textContent), 'summering');
  document.getElementById('imp-ok').click();
  document.getElementById('import-dialog').close();
  T.eq(stored().log['2026-11-09'].length, 3);
});
// Backup file with password (U5, 2026-11-11). Downloads are caught at <a download> (no host in the test file).
const $id = (i) => document.getElementById(i);
const PW = 'Bollen2026!';
const catchDownload = async (fn) => {
  let saved = null, blob = null;
  const realClick = HTMLAnchorElement.prototype.click, realUrl = URL.createObjectURL;
  HTMLAnchorElement.prototype.click = function () { saved = { href: this.href, name: this.download }; };
  URL.createObjectURL = (b) => { blob = b; return realUrl.call(URL, b); };   // read the Blob itself: fetch(blob:) is blocked by connect-src
  try { await fn(); await T.real(T.until(() => saved, 'ingen nedladdning')); }
  finally { HTMLAnchorElement.prototype.click = realClick; URL.createObjectURL = realUrl; }
  saved.text = blob ? await blob.text() : null;
  return saved;
};
const pickFile = (parts, name = 'x.txt', type = 'text/plain') => {
  const input = $id('import-file');
  const dt = new DataTransfer(); dt.items.add(new File(parts, name, { type }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return input;
};
const closeImport = async () => { $id('import-dialog').querySelector('button[value="cancel"]').click(); await T.until(() => !$id('import-dialog').open, 'importdialogen stängdes inte'); await T.wait(50); };
let encFile = null;
T.test('backup-fil: krypterad som standard, simple-nutrition-datum.txt, senaste backup sparas', async () => {
  await tab('settings');
  const saved = await catchDownload(async () => {
    q('[data-act="backupsave"]').click();
    await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
    T.ok(!$id('pw-enc') && /krypterad/.test($id('pw-ok').textContent), 'inget val att spara okrypterat');
    $id('pw-show').click();
    T.eq([$id('pw-1').type, $id('pw-2').type], ['text', 'text'], 'Visa lösenord');
    $id('pw-1').value = PW; $id('pw-2').value = PW; $id('pw-ok').click();
  });
  T.ok(/^simple-nutrition-\d{4}-\d{2}-\d{2}\.txt$/.test(saved.name), 'filnamn ' + saved.name);
  T.ok(saved.text && Backup.isEncrypted(saved.text) && !saved.text.includes('"log"'), 'filen är krypterad');
  T.eq([$id('pw-1').value, $id('pw-2').value], ['', ''], 'lösenordsfälten töms');
  T.ok($id('pw-1').type === 'password' && !$id('pw-show').checked, 'dolt igen efter stängning');
  await T.until(() => stored().backup.last, 'senaste backup sparades inte');
  encFile = saved.text;
});
T.test('backup-fil: svagt lösenord stoppas, Avbryt sparar inget', async () => {
  const last = stored().backup.last;
  q('[data-act="backupsave"]').click();
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  $id('pw-1').value = 'kort'; $id('pw-2').value = 'kort'; $id('pw-ok').click();
  T.ok($id('pw-dialog').open && /minst 8/.test($id('pw-error').textContent), 'fel visas');
  let clicked = false;
  const realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { clicked = true; };
  try { $id('pw-cancel').click(); await T.wait(50); } finally { HTMLAnchorElement.prototype.click = realClick; }
  T.ok(!$id('pw-dialog').open && !clicked, 'avbrutet utan fil');
  T.eq(stored().backup.last, last);
});
T.test('backup-fil: krypterad fil → lösenord → bekräftelse → ersätter', async () => {
  T.ok(encFile, 'krypterad fil från tidigare test');
  const before = JSON.stringify(stored().log);
  const input = pickFile([encFile], 'vad-som-helst.bin', 'image/png');
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  T.eq(input.value, '', 'filväljaren nollställdes inte');
  T.ok($id('pw-2-row').hidden && !$id('pw-show-row').hidden, 'bara ett fält vid import, Visa lösenord finns');
  $id('pw-1').value = PW; $id('pw-ok').click();
  await T.real(T.until(() => $id('import-dialog').open, 'ingen bekräftelsedialog'));
  $id('imp-ok').click();
  await T.until(() => !$id('import-dialog').open, 'dialogen stängdes inte');
  T.eq(JSON.stringify(stored().log), before, 'importen ändrade loggen');
});
T.test('backup-fil: fel lösenord och Avbryt ändrar inget', async () => {
  await tab('settings');
  const before = localStorage.getItem('sn.data');
  pickFile([encFile]);
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  $id('pw-1').value = 'Fel2026!x'; $id('pw-ok').click();
  await T.real(T.until(() => /Fel lösenord eller skadad fil/.test($id('import-error').textContent), 'felmeddelande saknas'));
  T.ok(!$id('import-dialog').open, 'dialog öppnades: ' + $id('import-dialog').textContent.slice(0, 300) + ' / ' + $id('import-error').textContent);
  pickFile([encFile]);
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  $id('pw-cancel').click();
  await T.wait(50);
  T.ok(!$id('import-dialog').open, 'dialog öppnades efter Avbryt');
  T.eq(localStorage.getItem('sn.data'), before);
});
T.test('import: klistrad krypterad text frågar efter lösenord', async () => {
  $id('import-text').value = encFile;
  q('[data-act="import"]').click();
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  $id('pw-1').value = PW; $id('pw-ok').click();
  await T.real(T.until(() => $id('import-dialog').open, 'ingen bekräftelsedialog'));
  await closeImport();
  $id('import-text').value = '';
});
T.test('backup-fil: okrypterad fil läses in som förut, binärfil avvisas', async () => {
  pickFile([plainText()]);
  await T.real(T.until(() => $id('import-dialog').open, 'ingen bekräftelsedialog'));
  T.ok(!$id('pw-dialog').open, 'lösenord krävdes för okrypterad fil');
  await closeImport();
  const before = localStorage.getItem('sn.data');
  $id('import-error').textContent = '';
  pickFile([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff])]);
  await T.real(T.until(() => /teckenkodning/.test($id('import-error').textContent), 'fel saknas'));
  T.ok(!$id('import-dialog').open, 'dialog öppnades: ' + $id('import-dialog').textContent.slice(0, 300) + ' / ' + $id('import-error').textContent);
  T.eq(localStorage.getItem('sn.data'), before);
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
T.test('rätt redigerad flera gånger driver inte (0,1 → 3 → 1 portion)', () => {
  const p0 = stored().log['2026-11-09'].at(-1);
  for (const v of ['15', '4500', '300']) {
    q(`[data-act="popen"][data-id="${p0.id}"]`).click();
    q('#p-amount').value = v; q('[data-act="psave"]').click();
  }
  const p = stored().log['2026-11-09'].at(-1);
  T.eq(p.q, 0.3);
  T.ok(p.n.every((x, i) => Math.abs(x - p0.n[i] * 2) < 0.01), JSON.stringify([p.n, p0.n]));
});
T.test('ändrad rätt påverkar inte loggad dag', async () => {
  const n0 = stored().log['2026-11-09'].at(-1).n[0];
  await tab('settings');
  q('[data-act="dedit"]').click();
  const g = q('[data-act="dig"]'); g.value = '1000'; g.dispatchEvent(new Event('change', { bubbles: true }));
  q('[data-act="dsave"]').click();
  T.eq(stored().log['2026-11-09'].at(-1).n[0], n0);
});
T.test('spara måltid som rätt (+🍲) öppnar editorn med varorna', async () => {
  await tab('today');
  const btn = q('[data-act="mealdish"]'), mid = btn.dataset.id, mname = stored().meals.find((m) => m.id === mid).name;
  const foods = stored().log['2026-11-09'].filter((p) => p.m === mid && p.g != null);
  btn.click(); await T.wait();
  T.eq(location.hash, '#settings');
  T.eq([q('#d-name').value, app.querySelectorAll('[data-act="dig"]').length], [mname, foods.length]);
  q('#d-name').value = 'Min frukost'; q('#d-name').dispatchEvent(new Event('input', { bubbles: true }));
  q('[data-act="dsave"]').click();
  const d = stored().dishes.find((x) => x.name === 'Min frukost');
  T.eq([d.portions, d.items.map((i) => i.g)], [1, foods.map((p) => p.g)]);
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
  q('#g-prot').value = '120';
  q('[data-act="macrosave"]').click();
  T.eq(stored().goals.at(-1).prot, 120);
  await tab('today');
  T.ok(q('.macros').textContent.includes('/ 120 g'), q('.macros').textContent);
});
T.test('trend: 7-dagars medel, tabell och diagram', async () => {
  await tab('trend');
  T.ok(q('.w-card .w-now'), 'vikt');
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
T.test('import från Följ planen i Inställningar: dialog, lägg till, ångra', async () => {
  await tab('settings');
  const before = JSON.stringify(stored());
  const fdt = JSON.stringify({ app: 'follow-diet-tracker', format: 1, exported: '2026-11-09', data: { days: { '2026-11-01': { breakfast: 'f', dinner: { o: 'c', r: 'social' } } }, weighIns: { '2026-11-01': 85 }, workouts: { '2026-11-01': ['legs'] } } });
  document.getElementById('import-text').value = fdt;
  q('[data-act="import"]').click();
  await T.until(() => document.getElementById('import-dialog').open, 'dialog');
  T.eq(document.getElementById('imp-ok').textContent, 'Lägg till');
  T.ok(/2 måltider, 1 vägningar, 1 träningspass/.test(document.getElementById('imp-sum').textContent), document.getElementById('imp-sum').textContent);
  document.getElementById('imp-ok').click(); document.getElementById('import-dialog').close();
  const s = stored(), mid = s.meals.find((m) => m.name === 'Middag').id;
  T.eq([s.habits['2026-11-01'][mid].reason, s.weights['2026-11-01'], s.workouts['2026-11-01'][0].types], ['social', 85, ['legs']]);
  T.ok(Object.keys(s.log).length > 0, 'maten finns kvar');
  document.getElementById('snack-action').click();
  T.eq(JSON.stringify(stored()), before);
});
T.test('Min plan sparas med Spara plan och visas i Idag', async () => {
  await tab('settings');
  q('#plan-text').value = 'Matlåda till lunch <b>x</b>';
  q('[data-act="plansave"]').click();
  T.eq(stored().settings.planText, 'Matlåda till lunch <b>x</b>');
  await tab('today');
  T.eq(q('.plan').textContent, 'Matlåda till lunch <b>x</b>');
  T.eq(app.querySelectorAll('b').length, 0);
});
T.test('tomt kalorimål + Spara = inget mål, Idag visar bara summan', async () => {
  await tab('settings');
  q('#g-kcal').value = '';
  q('[data-act="goalsave"]').click();
  T.ok(!('kcal' in stored().goals.at(-1)), 'inget mål');
  await tab('today');
  T.ok(!q('.sum-left') && !q('.kbar'), 'ingen kvar-text eller stapel');
});T.test('viktdiagram: hela perioden, skalar över år (ingen ring per vägning, år-etiketter)', async () => {
  await tab('trend');
  T.ok(/veckor/.test(q('.chart')?.closest('.card').querySelector('.legend').textContent), 'kort period i veckor');
  T.ok(app.querySelectorAll('.chart .w-dot-extra').length >= 2, 'ringar vid kort period');
  const weights = {};
  for (let d = new Date(2024, 0, 1, 12); d < new Date(2026, 10, 1, 12); d.setDate(d.getDate() + 7)) {
    const p = (n) => String(n).padStart(2, '0');
    weights[`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`] = 95 - (d - new Date(2024, 0, 1)) / 864e5 / 100;
  }
  await tab('settings');
  document.getElementById('import-text').value = JSON.stringify({ app: 'simple-nutrition', format: 1, exported: '2026-11-09', data: { weights } });
  q('[data-act="import"]').click();
  await T.until(() => document.getElementById('import-dialog').open, 'dialog');
  document.getElementById('imp-ok').click(); document.getElementById('import-dialog').close();
  await tab('trend');
  const h2 = q('.chart').closest('.card').querySelector('.legend').textContent;
  T.ok(/år/.test(h2), h2);
  T.eq(app.querySelectorAll('.chart .w-dot-extra').length, 0);
  const pts = (q('.chart .w-line').getAttribute('d').match(/[ML]/g) || []).length;
  T.ok(pts > 50 && pts <= 200, `${pts} punkter`);
  T.ok([...app.querySelectorAll('.chart .ax')].some((t) => /24/.test(t.textContent)), 'år 2024 på x-axeln');
});
T.test('ifylld måltid är hopfälld efter dagbyte, även om den var utfälld (v0.6.3–0.6.4)', async () => {
  await tab('today');
  if (!q('details.meal-done')) { q('[data-act="outcome"][data-id="m3"][data-val="followed"]').click(); }
  const d = q('details.meal-done'); T.ok(d, 'hopfälld måltid finns'); T.ok(!d.open, 'stängd från start');
  d.open = true; await T.wait();
  const food = q('details.meal-done[open] .meal-food'); if (food) { food.open = true; await T.wait(); }
  q('[data-act="prev"]').click(); await T.wait();
  q('[data-act="next"]').click(); await T.wait();
  T.ok(!q('details.meal-done').open, 'hopfälld igen');
});
T.test('kortordning: dölj, flytta, återställ (v0.6)', async () => {
  await tab('settings');
  q('[data-act="lhide"][data-kind="week"][data-id="kcal"]').click();
  T.eq(stored().layout.week.hidden, ['kcal']);
  q('[data-act="ldown"][data-kind="week"][data-id="weight"]').click();
  T.eq(stored().layout.week.order.slice(0, 2), ['habits', 'weight']);
  q('[data-act="lresetall"]').click();
  T.eq(stored().layout, {});
});
T.test('utemat loggas med ett tryck och syns i dagens kcal (F3)', async () => {
  await tab('today');
  const n0 = (stored().log[S_TODAY] || []).length;
  q('[data-act="addopen"]').click(); await T.wait();
  q('[data-act="addtab"][data-val="out"]').click(); await T.wait();
  q('[data-act="quickg"][data-val="out"]').click(); await T.wait();
  q('[data-act="quick"][data-id="out-std"]').click(); await T.wait();
  const l = stored().log[S_TODAY];
  T.eq(l.length, n0 + 1); T.eq(l.at(-1).ref, 'q:out-std'); T.eq(l.at(-1).n[0], 1000);
});
T.test('Snabbval: Hemmagjort först och loggar med ett tryck (v0.9)', async () => {
  await tab('today');
  q('[data-act="addopen"]').click(); await T.wait();
  q('[data-act="addtab"][data-val="out"]').click(); await T.wait();
  q('[data-act="quickg"][data-val="home"]').click(); await T.wait();
  q('[data-act="quick"][data-id="home-std"]').click(); await T.wait();
  const l = stored().log[S_TODAY];
  T.eq(l.at(-1).ref, 'q:home-std'); T.eq(l.at(-1).n[0], 650);
});
T.test('fusk med Snacks: nivå loggas och tas bort när orsaken byts (v0.9)', async () => {
  await tab('today');
  const id = 'm4', has = (ref) => (stored().log[S_TODAY] || []).some((p) => p.m === id && p.ref === ref);
  const h = stored().habits[S_TODAY]?.[id];
  if (h?.outcome !== 'cheat') { q(`[data-act="outcome"][data-id="${id}"][data-val="cheat"]`).click(); await T.wait(); }
  q(`[data-act="reason"][data-id="${id}"][data-val="snacks"]`).click(); await T.wait();
  q(`[data-act="level"][data-id="${id}"][data-val="snack-s"]`).click(); await T.wait();
  T.ok(has('q:snack-s'), 'Lite loggad');
  q(`[data-act="level"][data-id="${id}"][data-val="snack-l"]`).click(); await T.wait();
  T.ok(has('q:snack-l') && !has('q:snack-s'), 'bytt till Mycket');
  q(`[data-act="reason"][data-id="${id}"][data-val="craving"]`).click(); await T.wait();
  T.ok(!has('q:snack-l'), 'borta vid annan orsak');
});
T.test('extra fusk: snacksnivå direkt utan orsak, fälls ihop, följer med när extra tas bort (v0.9.1)', async () => {
  await tab('today');
  q('[data-act="extra"]').click(); await T.wait();
  const key = Object.keys(stored().habits[S_TODAY]).filter((k) => k.startsWith('extra-')).sort().at(-1);
  T.ok(!q(`[data-act="reason"][data-id="${key}"]`), 'inga orsaker');
  q(`[data-act="level"][data-id="${key}"][data-val="snack-m"]`).click(); await T.wait();
  T.ok(stored().log[S_TODAY].some((p) => p.m === key && p.n[0] === 500), 'Snacks Mellan');
  T.ok(!q(`[data-act="level"][data-id="${key}"]`) && q(`[data-act="xopen"][data-id="${key}"]`), 'ihopfällt');
  q(`[data-act="xopen"][data-id="${key}"]`).click(); await T.wait();
  T.ok(q(`[data-act="level"][data-id="${key}"]`), 'öppnas igen');
  q(`[data-act="remove"][data-id="${key}"]`).click(); await T.wait();
  T.ok(!(stored().log[S_TODAY] || []).some((p) => p.m === key), 'post borta');
});
T.test('extra: välj vara från samma meny som maten, syns i kortet, tas bort med extrat (v0.13.7)', async () => {
  await tab('today');
  q('[data-act="extra"]').click(); await T.wait();
  const key = Object.keys(stored().habits[S_TODAY]).filter((k) => k.startsWith('extra-')).sort().at(-1);
  q(`[data-act="addopen"][data-id="${key}"]`).click(); await T.wait();
  T.eq(q('.add-title').textContent, 'Lägg till i Extra');
  q('[data-act="addtab"][data-val="foods"]').click(); await T.wait();
  type(q('#add-q'), 'kanelbulle'); await T.wait();
  q('#add-results [data-act="pick"]').click(); await T.wait();
  q('[data-act="addsave"]').click(); await T.wait();
  const p = stored().log[S_TODAY].find((x) => x.m === key);
  T.eq([p?.ref, p?.g], ['p:fika', 80]);
  T.ok(/Fika ≈ 280/.test(q(`[data-act="xopen"][data-id="${key}"]`)?.textContent || ''), 'ihopfällt med vara och kcal');
  q(`[data-act="remove"][data-id="${key}"]`).click(); await T.wait();
  T.ok(!(stored().log[S_TODAY] || []).some((x) => x.m === key), 'varan togs bort med extrat');
});
T.test('vald vara förifylls med senaste mängd utan tangentbord (F1)', async () => {
  await tab('today');
  q('[data-act="addopen"]').click(); await T.wait();
  q('[data-act="addtab"][data-val="foods"]').click(); await T.wait();
  type(q('#add-q'), 'mjölk'); await T.wait();
  q('[data-act="pick"]').click(); await T.wait();
  q('[data-act="unit"][data-val="ml"]')?.click(); await T.wait();
  type(document.getElementById('amount'), '330'); q('[data-act="addsave"]').click(); await T.wait();
  q('[data-act="addopen"]').click(); await T.wait();
  q('[data-act="addtab"][data-val="foods"]').click(); await T.wait();
  type(q('#add-q'), 'mjölk'); await T.wait();
  q('[data-act="pick"]').click(); await T.wait();
  T.eq(document.getElementById('amount').value, '330');
  T.ok(document.activeElement !== document.getElementById('amount'), 'ingen fokus');
  T.ok(/Senast: 330 ml/.test(q('.pick').textContent), 'Senast-text');
  q('[data-act="addclose"]').click(); await T.wait();
});

// v0.12.0: password generator, colour preview, password-manager fields.
T.test('backup: slumpat lösenord, förhandsvisning och fält för lösenordshanterare', async () => {
  const $id = (id) => document.getElementById(id);
  for (let i = 0; i < 200; i++) {
    const p = Backup.generatePassword();
    T.ok(/^([A-Za-z2-9]{4}-){3}[A-Za-z2-9]{4}$/.test(p) && !/[0Oo1Il]/.test(p) && !Backup.checkPassword(p), 'ogiltigt: ' + p);
  }
  const done = Backup.askPassword('export');
  T.eq([$id('pw-user').value, $id('pw-1').name, $id('pw-2').autocomplete, $id('pw-ok').type], ['Simple nutrition backup', 'password', 'new-password', 'submit']);
  T.ok($id('pw-preview').hidden, 'ingen förhandsvisning när lösenordet är dolt');
  $id('pw-gen').click();
  const pwd = $id('pw-1').value;
  T.ok(pwd && pwd === $id('pw-2').value && $id('pw-show').checked, 'båda fälten ifyllda och synliga');
  T.eq([$id('pw-preview').textContent, $id('pw-preview').children.length], [pwd, 19]);
  T.eq($id('pw-preview').querySelectorAll('.pw-special').length, 3);
  $id('pw-ok').click();
  T.eq((await done)?.pwd, pwd);
  T.eq([$id('pw-1').value, $id('pw-preview').children.length], ['', 0], 'fält och förhandsvisning töms');
  const imp = Backup.askPassword('import');
  T.ok($id('pw-2-row').hidden && $id('pw-gen').hidden && $id('pw-1').autocomplete === 'current-password', 'importläge');
  $id('pw-cancel').click();
  T.eq(await imp, null);
});
T.test('Min plan sparas medan man skriver, högst 300 tecken', async () => {
  await tab('settings');
  const t = q('#plan-text');
  t.value = 'Autosparad plan';
  t.dispatchEvent(new Event('input', { bubbles: true }));
  await T.until(() => stored().settings.planText === 'Autosparad plan', 'planen sparades inte');
  T.eq(t.maxLength, 300);
});
T.test('schabloner: en rad per livsmedel, först, döljer LV-rader', async () => {
  await tab('today');
  q('[data-act="addopen"][data-id="m1"]').click();
  foods();
  const names = () => [...app.querySelectorAll('#add-results .food-row .post-name')].map((n) => n.firstChild.textContent);
  type(q('#add-q'), 'pannkaka'); T.eq(names(), ['Pannkaka']); T.ok(!q('[data-act="showall"]'), 'ingen Visa fler');
  T.ok(/kcal\/st$/.test(q('#add-results .post-kcal').textContent), q('#add-results .post-kcal').textContent);
  type(q('#add-q'), 'proteinbar'); T.eq(names(), ['Proteinbar']);
  type(q('#add-q'), 'pizza'); T.eq(names(), ['Pizza']); type(q('#add-q'), 'sushi'); T.eq(names(), ['Sushi']);
  type(q('#add-q'), 'ugnspannkaka'); T.ok(names().length >= 1 && !names().includes('Pannkaka'), 'LV-raden: ' + names());
  type(q('#add-q'), 'öl'); T.eq(names(), ['Öl/vin']);
  type(q('#add-q'), 'cola'); T.eq(names(), ['Läsk/energidryck'], 'cola träffar inte gamla Läsk');
  type(q('#add-q'), 'läsk'); T.eq(names(), ['Läsk/energidryck']);
  q('#add-results [data-act="pick"]').click();
  T.eq(app.querySelectorAll('[data-act="variant"]').length, 2, 'Socker/Sockerfri');
  T.eq([q('#amount').value, q('[data-act="unit"].on').textContent], ['1', 'st']);
  T.ok(/^1 st \(330 g\) · 139 kcal$/.test(q('#pick-sum').textContent), q('#pick-sum').textContent);
  q('[data-act="addsave"]').click();
  const p = stored().log['2026-11-09'].at(-1);
  T.eq([p.ref, p.g, p.n[0]], ['p:lask-socker', 330, 42]);
});
T.test('Saft (FOODS_CORE) i glas à 250 g', async () => {
  await tab('today');
  q('[data-act="addopen"][data-id="m2"]').click();
  foods();
  type(q('#add-q'), 'saft');
  q('#add-results [data-act="pick"]').click();
  T.eq(q('[data-act="unit"].on').textContent, 'glas');
  T.ok(/· 90 kcal$/.test(q('#pick-sum').textContent), q('#pick-sum').textContent);
  q('[data-act="addclose"]').click();
});
// Steg B: enheter i Varor-vyn
const units = () => [...app.querySelectorAll('[data-act="unit"]')].map((b) => b.textContent);
const unit = (u) => q(`[data-act="unit"][data-val="${u}"]`).click();
T.test('Steg B: st ↔ g räknas om (2 st pannkaka = 90 g)', () => {
  q('[data-act="addopen"][data-id="m2"]').click();
  foods();
  type(q('#add-q'), 'pannkaka');
  q('#add-results [data-act="pick"]').click();
  T.eq([units(), q('[data-act="unit"].on').textContent, q('#amount').value], [['st', 'g'], 'st', '1'], 'naturlig enhet förvald');
  type(q('#amount'), '2');
  T.ok(/^2 st \(90 g\) · \d+ kcal$/.test(q('#pick-sum').textContent), q('#pick-sum').textContent);
  unit('g'); T.eq(q('#amount').value, '90', 'byte räknar om');
  unit('st'); T.eq(q('#amount').value, '2');
  q('[data-act="addclose"]').click();
});
T.test('Steg B: flytande har dl och ml, inte g (1 dl mjölk = 103 g)', () => {
  q('[data-act="addopen"][data-id="m2"]').click();
  foods();
  type(q('#add-q'), 'mjölk');
  q('#add-results [data-act="pick"]').click();
  T.eq(units(), ['dl', 'ml']); unit('dl'); type(q('#amount'), '1');
  T.ok(/^1 dl \(103 g\)/.test(q('#pick-sum').textContent), q('#pick-sum').textContent);
  unit('ml'); T.eq(q('#amount').value, '100');
  type(q('#amount'), '250'); T.ok(/^250 ml \(258 g\)/.test(q('#pick-sum').textContent), q('#pick-sum').textContent);
  q('[data-act="addsave"]').click();
  const p = stored().log['2026-11-09'].at(-1);
  T.eq([p.g, p.u], [257.5, ['ml', 250]]);
});
T.test('Steg B: läsk st/dl/ml; fast vara utan mått bara g med 100', () => {
  q('[data-act="addopen"][data-id="m2"]').click();
  foods();
  type(q('#add-q'), 'läsk');
  q('#add-results [data-act="pick"]').click();
  T.eq(units(), ['st', 'dl', 'ml']);
  unit('dl'); T.eq(q('#amount').value, '3,2');
  q('[data-act="addclose"]').click(); q('[data-act="addopen"][data-id="m2"]').click(); foods();
  type(q('#add-q'), 'potatismos');
  q('#add-results [data-act="pick"]').click();
  T.eq(units(), ['dl', 'g'], 'potatismos är inte flytande');
  q('[data-act="addclose"]').click();
});
