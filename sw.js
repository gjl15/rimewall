/* Rimewall service worker — offline + instant repeat loads without ever serving a stale build.
   Strategy: network-FIRST for navigations (a new deploy always wins online; cache is the offline
   fallback), stale-while-revalidate for static assets (fonts, icons, manifest). */
const CACHE = 'rimewall-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isNav = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isNav) {
    // network-first: the freshest deploy wins; fall back to the cached shell only when offline
    e.respondWith(
      fetch(req).then((res) => { const clone = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', clone)); return res; })
        .catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
  } else {
    // stale-while-revalidate: serve cached instantly, refresh in the background
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res && res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(req, clone)); } return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
