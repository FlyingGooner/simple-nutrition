// build-help.mjs – bygger Hjälp i appen (<template id="help-tpl"> och "help-tpl-en" i index.html) från docs/MANUAL.md
// och MANUAL.en.md. Samma regler som build-help.ps1 (2026-11-17, datorn används inte längre):
// "## Rubrik" -> <details><summary>, "- text" och vanliga rader -> <p>, "![alt](manual/x.png)" -> <img class="shot">.
// **fetstil** tas bort. All text HTML-kodas. Ändrar bara mallarna i index.html. Inga nätverksanrop.
//   node tools/build-help.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const enc = (t) => t.replace(/\*\*/g, '').trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const idxPath = join(root, 'index.html');
const raw = readFileSync(idxPath, 'utf8');
let idx = raw;
for (const l of [{ file: 'MANUAL.md', id: 'help-tpl', title: 'Hjälp' }, { file: 'MANUAL.en.md', id: 'help-tpl-en', title: 'Help' }]) {
  const md = readFileSync(join(root, 'docs', l.file), 'utf8').split(/\r?\n/);
  const out = ['    <section class="card help">', `      <h2>${l.title}</h2>`];
  let open = false;
  for (const line of md) {
    const h = line.match(/^## (.+)$/);
    if (h) { if (open) out.push('      </details>'); out.push(`      <details><summary>${enc(h[1])}</summary>`); open = true; continue; }
    if (!open || !line.trim()) continue;
    const img = line.match(/^\s*!\[([^\]]*)\]\((manual\/[a-z0-9-]+\.png)\)\s*$/);
    if (img) { out.push(`        <img class="shot" src="docs/${img[2]}" alt="${enc(img[1])}" width="390" loading="lazy">`); continue; }
    out.push(`        <p>${enc(line.replace(/^\s*-\s+/, ''))}</p>`);
  }
  if (open) out.push('      </details>');
  out.push('    </section>');
  const re = new RegExp(`(<template id="${l.id}">\\r?\\n)[\\s\\S]*?(\\r?\\n\\s*</template>)`);
  if (!re.test(idx)) throw new Error(`Hittar inte <template id="${l.id}"> i index.html`);
  idx = idx.replace(re, (_, a, b) => a + out.join('\n') + b);
}
if (idx !== raw) { writeFileSync(idxPath, idx, 'utf8'); console.log('Hjälp uppdaterad från docs/MANUAL.md och MANUAL.en.md'); } else console.log('Hjälp oförändrad');
