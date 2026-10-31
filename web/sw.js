// Offline support: serve from cache instantly, refresh the cache in the
// background. Bump CACHE on each release so phones pick up the new version.
const CACHE = 'gymbruh-v3';
const SHELL = [
  '/', '/index.html', '/styles.css', '/plan.json', '/manifest.webmanifest',
  '/js/app.js', '/js/store.js', '/js/util.js', '/js/timer.js', '/js/workout.js', '/js/stats.js', '/js/settings.js', '/js/theme.js', '/js/sample.js',
  '/icons/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? '/' : req;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: true });
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => cached);
      event.waitUntil(fresh.then(() => undefined, () => undefined));
      return cached || fresh;
    }),
  );
});
