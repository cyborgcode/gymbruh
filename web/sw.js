// Offline support. Each release is cached as one complete, versioned set and
// served cache-first, so the app never mixes files from two versions (which
// breaks layouts after an update on a patchy connection). A new release
// installs all files at once in the background; the page then reloads once.
// Bump CACHE on every release so phones pick up the new version.
const CACHE = 'gymbruh-v17';
const SHELL = [
  '/', '/index.html', '/styles.css', '/plan.json', '/manifest.webmanifest',
  '/js/app.js', '/js/store.js', '/js/util.js', '/js/timer.js', '/js/workout.js', '/js/stats.js', '/js/settings.js', '/js/theme.js',
  '/icons/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  // addAll is all-or-nothing: a half-downloaded release is never used.
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
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch (e) {
        if (req.mode === 'navigate') return (await cache.match('/')) || Response.error();
        return Response.error();
      }
    }),
  );
});
