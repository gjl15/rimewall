/* Rimewall service worker — offline + instant repeat loads without ever serving a stale build.
   Strategy: network-FIRST for navigations (a new deploy always wins online; cache is the offline
   fallback), stale-while-revalidate for static assets (fonts, icons, manifest). */
const CACHE = 'rimewall-v2';
const SHELL = ['./', './index.html', './towers.html', './maze-school.html', './manifest.json', './icon-192.png', './icon-512.png'];

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
    /* network-first: the freshest deploy wins; cache is the offline fallback.
       Two bugs lived here. A fetch that RESOLVES with a 404 is not a rejection,
       so a page requested during a Pages deploy window returned 404 and the
       404 body was then stored — making a transient miss permanent. And every
       navigation was written to the './index.html' key regardless of what was
       actually requested, so opening towers.html overwrote the game's offline
       shell with the reference page. Only successful responses are cached now,
       and each URL is cached under itself. */
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(req, clone)); }
        return res;
      }).catch(() => caches.match(req)
        .then((hit) => hit || caches.match('./index.html'))
        .then((hit) => hit || caches.match('./')))
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
