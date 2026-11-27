// nav.js – pure navigation logic for Bakåt (v0.14.0). No DOM, no storage: tested in Node (tools/tests/*.node.mjs).
// Layers stack: dish editor (Inställningar) → Lägg till → chosen item (pick, dpick or own estimate). Idag: markeringsläge (sel).

const picked = (a) => !!(a && (a.pick || a.dpick || a.est));

// Topmost open layer: 'dlg' | 'pick' | 'add' | 'dish' | 'sel' | null.
// 2026-11-27: öppna <dialog>-rutor med id (S.dlg, i öppningsordning) ligger överst, ett steg var.
export function topLayer(S) {
  if (S.dlg?.length) return 'dlg';
  if (picked(S.add)) return 'pick';
  if (S.add) return 'add';
  if (S.dish) return 'dish';
  if (S.sel) return 'sel';   // Idag: several posts marked (long press)
  return null;
}
// Number of open layers, each one history step.
export const layerDepth = (S) => (S.dlg?.length || 0) + (S.dish ? 1 : 0) + (S.add ? 1 : 0) + (picked(S.add) ? 1 : 0) + (S.sel ? 1 : 0);
// Closes the topmost layer. unpick keeps tab, q, all and scroll. Returns true if something closed.
export function closeTop(S) {
  const l = topLayer(S);
  if (l === 'dlg') S.dlg.pop();   // app.js stänger själva rutan
  else if (l === 'pick') { S.add.pick = S.add.dpick = S.add.est = null; S.add.alias = false; }
  else if (l === 'add') S.add = null;
  else if (l === 'dish') S.dish = null;
  else if (l === 'sel') { S.sel = null; S.selCopy = false; }
  return l !== null;
}
// Unsaved dish: the draft differs from the copy taken when the editor opened.
export const dishDirty = (draft, orig) => !!draft && JSON.stringify(draft) !== orig;
// Snabbval mode when Lägg till opens: Frukost for the meal named Frukost, otherwise the last used mode.
export const defaultQuickG = (mealName, last) => (String(mealName ?? '').trim().toLowerCase() === 'frukost' ? 'bf' : last || 'home');
// Rutorna som är öppna nu (id:n) → S.dlg: stängda tas bort, nya läggs sist. Stängs en ruta och öppnas en annan i samma
// omgång (lösenord → bekräftelse) blir djupet detsamma: steget återanvänds, ingen history.go och ingen ny pushState.
export function syncDialogs(S, openIds) {
  const open = new Set(openIds);
  S.dlg = (S.dlg || []).filter((id) => open.has(id));
  for (const id of openIds) if (!S.dlg.includes(id)) S.dlg.push(id);
  return S.dlg.length;
}
