// Startskydd (2026-11-22): startar inte app.js inom 4 s (t.ex. en trasig version i cachen) rensas appens egna
// cachar ('sn-'), service workern uppdateras och sidan laddas om en gång. Data i localStorage rörs aldrig.
(function () {
  setTimeout(function () {
    var v = document.getElementById('version');
    if (!v || v.textContent) return;   // app.js har startat
    var main = document.querySelector('main') || document.body, p = document.createElement('p');
    p.className = 'card'; p.textContent = 'Appen kunde inte starta. Hämtar senaste versionen …'; main.appendChild(p);
    var once = false; try { once = sessionStorage.getItem('sn.bootfix') === '1'; sessionStorage.setItem('sn.bootfix', '1'); } catch (e) { /* ok */ }
    if (once || location.protocol === 'file:') { p.textContent = 'Appen kunde inte starta. Stäng den helt och öppna igen om en stund.'; return; }
    var clear = self.caches ? caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('sn-') === 0; }).map(function (k) { return caches.delete(k); })); }) : Promise.resolve();
    var upd = navigator.serviceWorker ? navigator.serviceWorker.getRegistration().then(function (r) { return r && r.update(); }) : Promise.resolve();
    Promise.all([clear, upd]).catch(function () {}).then(function () { location.reload(); });
  }, 4000);
})();
