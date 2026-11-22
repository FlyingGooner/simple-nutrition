// Startskydd (2026-11-22): startar inte app.js inom 4 s (t.ex. en trasig version i cachen) ber vi service workern
// om en ny version (den hämtar alla filer förbi webbläsarens cache) och laddar om när den är klar. Data rörs aldrig.
(function () {
  setTimeout(function () {
    var v = document.getElementById('version');
    if (!v || v.textContent) return;   // app.js har startat
    var main = document.querySelector('main') || document.body, p = document.createElement('p');
    p.className = 'card'; main.appendChild(p);
    var once = false; try { once = sessionStorage.getItem('sn.bootfix') === '1'; sessionStorage.setItem('sn.bootfix', '1'); } catch (e) { /* ok */ }
    if (once || location.protocol === 'file:' || !navigator.serviceWorker) {
      p.textContent = 'Appen kunde inte starta. ';
      var b = document.createElement('button'); b.className = 'link'; b.textContent = 'Försök igen';
      b.addEventListener('click', function () { b.disabled = true; fix(); });
      p.appendChild(b); return;
    }
    fix();
    function fix() {
      p.firstChild ? (p.firstChild.textContent = 'Hämtar senaste versionen … ') : (p.textContent = 'Hämtar senaste versionen …');
      var done = false, go = function () { if (!done) { done = true; location.reload(); } };
      setTimeout(go, 15000);
      navigator.serviceWorker.getRegistration().then(function (r) {
        if (!r) return go();
        return r.update().then(function () {
          var w = r.installing || r.waiting;
          if (!w) return go();   // ingen ny version: ladda bara om
          w.addEventListener('statechange', function () { if (w.state === 'activated' || w.state === 'redundant') go(); });
        });
      }).catch(go);
    }
  }, 4000);
})();
