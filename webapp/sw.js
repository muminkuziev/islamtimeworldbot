/* ================================================================
   IslamTime World — Service Worker
   Strategy:
     - Static assets (JS/CSS/fonts/SVG) : cache-first + background refresh
     - App shell (/app)                  : stale-while-revalidate
     - API calls (/api/*)               : network-only
     - External (CDN, Telegram SDK)     : network-only
   ================================================================ */

const CACHE = 'islamtime-v4';

const PRECACHE = [
  '/app',
  '/manifest.json',
  '/css/styles.css',
  '/js/i18n.js',
  '/js/hijri.js',
  '/js/app.js',
  '/js/screens/splash.js',
  '/js/screens/language.js',
  '/js/screens/mazhab.js',
  '/js/screens/location.js',
  '/js/screens/dashboard.js',
  '/js/screens/prayer.js',
  '/js/screens/qibla.js',
  '/js/screens/mosques.js',
  '/js/screens/quran.js',
  '/js/screens/hadith.js',
  '/js/screens/duas.js',
  '/js/screens/dhikr.js',
  '/js/screens/calendar.js',
  '/js/screens/names.js',
  '/js/screens/settings.js',
  '/js/native/bridge.js',
  '/js/native/quran-provider.js',
  '/js/native/hadith-provider.js',
  '/data/names_of_allah.js',
  '/data/duas.js',
  '/assets/logo.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

/* ── Install: precache static shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] precache partial fail:', err))
  );
});

/* ── Activate: delete old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: routing strategy ── */
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  /* Skip: non-GET, API calls, external (Telegram SDK, Google Fonts, CDN) */
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.hostname !== self.location.hostname) return;
  if (url.pathname.startsWith('/webhook/')) return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request, { ignoreSearch: true });

      /* App shell: serve cached immediately, update in background */
      const networkFetch = fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      return cached || networkFetch;
    })
  );
});

/* ── Push Notifications ── */
self.addEventListener('push', e => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); }
  catch { payload = { title: 'Islam Time World', body: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(payload.title || 'Islam Time World', {
      body:  payload.body  || '',
      icon:  '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      data:  payload.data  || {},
      vibrate: [200, 100, 200],
      tag: payload.tag || 'islamtime',
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const screen = e.notification.data?.screen;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url.includes('/app')) {
            client.focus();
            if (screen) client.postMessage({ type: 'navigate', screen });
            return;
          }
        }
        return clients.openWindow('/app' + (screen ? `#${screen}` : ''));
      })
  );
});
