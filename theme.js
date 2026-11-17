// Tema (2026-11-17): 'standard' (förval), 'skeuo' (anteckningsblock) eller 'chalk' (griffeltavla). Vanligt skript, laddas först så att rätt tema syns direkt.
(function () {
  let t = 'standard';
  const ok = (v) => (v === 'skeuo' || v === 'chalk' ? v : 'standard');
  try { t = ok(localStorage.getItem('sn.theme')); } catch (e) { /* privat läge */ }
  document.documentElement.dataset.theme = t;
  self.THEME = {
    get: () => document.documentElement.dataset.theme,
    set(v) {
      v = ok(v);
      try { localStorage.setItem('sn.theme', v); } catch (e) { /* ignoreras */ }
      document.documentElement.dataset.theme = v;
    },
  };
})();
