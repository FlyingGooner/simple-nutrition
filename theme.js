// Tema (2026-11-17): 'standard' (förval) eller 'skeuo' (skeuomorfism). Vanligt skript, laddas först så att rätt tema syns direkt.
(function () {
  let t = 'standard';
  try { t = localStorage.getItem('sn.theme') === 'skeuo' ? 'skeuo' : 'standard'; } catch (e) { /* privat läge */ }
  document.documentElement.dataset.theme = t;
  self.THEME = {
    get: () => document.documentElement.dataset.theme,
    set(v) {
      v = v === 'skeuo' ? 'skeuo' : 'standard';
      try { localStorage.setItem('sn.theme', v); } catch (e) { /* ignoreras */ }
      document.documentElement.dataset.theme = v;
    },
  };
})();
