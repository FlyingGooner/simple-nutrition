// nav.js – pure navigation logic for Bakåt (v0.14.0). No DOM, no storage: tested in Node (tools/tests/*.node.mjs).
// Layers stack: dish editor (Inställningar) → Lägg till → chosen item (pick, dpick or own estimate).

const picked = (a) => !!(a && (a.pick || a.dpick || a.est));

// Topmost open layer: 'pick' | 'add' | 'dish' | null.
export function topLayer(S) {
  if (picked(S.add)) return 'pick';
  if (S.add) return 'add';
  if (S.dish) return 'dish';
  return null;
}
// Number of open layers, each one history step.
export const layerDepth = (S) => (S.dish ? 1 : 0) + (S.add ? 1 : 0) + (picked(S.add) ? 1 : 0);
// Closes the topmost layer. unpick keeps tab, q, all and scroll. Returns true if something closed.
export function closeTop(S) {
  const l = topLayer(S);
  if (l === 'pick') { S.add.pick = S.add.dpick = S.add.est = null; S.add.alias = false; }
  else if (l === 'add') S.add = null;
  else if (l === 'dish') S.dish = null;
  return l !== null;
}
// Unsaved dish: the draft differs from the copy taken when the editor opened.
export const dishDirty = (draft, orig) => !!draft && JSON.stringify(draft) !== orig;
// Snabbval mode when Lägg till opens: Frukost for the meal named Frukost, otherwise the last used mode.
export const defaultQuickG = (mealName, last) => (String(mealName ?? '').trim().toLowerCase() === 'frukost' ? 'bf' : last || 'home');
