// Service worker: cache-first for the app's own files (offline + install). Cross-origin requests pass straight through.
// Deletes only its own 'sn-' caches: the apps share an origin on GitHub Pages.
importScripts('version.js');
const CACHE_VERSION = 'sn-' + self.APP_VERSION;
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'store.js', 'ui.js', 'views/today.js', 'views/add.js', 'views/week.js', 'views/settings.js', 'views/dishes.js', 'views/trend.js', 'views/history.js', 'views/habits.js', 'views/act-day.js', 'views/act-add.js', 'views/act-dishes.js', 'views/act-settings.js', 'views/act-data.js', 'fdt-store.js', 'version.js', 'backup.js', 'data/foods.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('sn-') && k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
