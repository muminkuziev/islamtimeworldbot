/* ================================================================
   IslamTime World — Service Worker
   Strategy:
     - Static assets and app shell     : network-first, current-build offline cache
     - API calls (/api/*)               : network-only
     - External (CDN, Telegram SDK)     : network-only
   ================================================================ */

const CACHE = 'islamtime-v41';

const PRECACHE = [
  '/app',
  '/manifest.json',
  '/css/styles.css',
  '/css/reference-ui.css',
  '/css/reference-pages.css',
  '/css/theme.css',
  '/css/header-media.css',
  '/js/theme.js',
  '/js/prayer-preferences.js',
  '/js/hadith-display.js',
  '/js/verified-content.js',
  '/js/i18n.js',
  '/js/hijri.js',
  '/js/app.js',
  '/js/safe-area.js',
  '/js/lib/three.min.js',
  '/js/screens/splash.js',
  '/js/screens/language.js',
  '/js/screens/mazhab.js',
  '/js/screens/location.js',
  '/js/screens/dashboard.js',
  '/js/screens/prayer.js',
  '/js/screens/qazo.js',
  '/js/screens/monthly-calendar.js',
  '/js/screens/qibla.js',
  '/js/screens/mosques.js',
  '/js/screens/quran.js',
  '/js/screens/hadith.js',
  '/js/screens/duas.js',
  '/js/screens/dhikr.js',
  '/js/screens/calendar.js',
  '/js/screens/names.js',
  '/js/screens/others.js',
  '/js/screens/shahodat.js',
  '/js/screens/haramayn.js',
  '/js/screens/settings.js',
  '/js/native/bridge.js',
  '/js/native/qibla-geo.js',
  '/js/native/earth-globe.js',
  '/js/native/quran-provider.js',
  '/js/native/hadith-provider.js',
  '/data/names_of_allah.js',
  '/data/duas.js',
  '/assets/logo.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/landing/haram-makkah.webp',
  '/assets/landing/haram-madinah.webp',
  '/assets/earth/earth_atmos_2048.jpg',
  '/assets/earth/earth_normal_2048.jpg',
  '/assets/earth/earth_specular_2048.jpg',
  '/assets/reference-ui/makkah-hero.png',
  '/assets/reference-ui/mosque-hero.png',
  '/assets/reference-ui/quran-open.png',
  '/assets/reference-ui/qibla-earth.png',
  '/assets/reference-ui/qibla-calibration.png',
  '/assets/reference-ui/qibla-hero.png',
  '/assets/reference-ui/kaaba-icon.png',
];

const PRECACHE_PATHS = new Set(PRECACHE);

async function offlineResponse(cache, request) {
  const exact = await cache.match(request);
  if (exact) return exact;

  const url = new URL(request.url);
  // The shell uses ?v= URLs, while install stores canonical asset URLs.
  // Only use this build's explicit precache entry; never ignore arbitrary
  // query parameters or borrow a different version from an older cache.
  const versionOnly = url.searchParams.has('v') &&
    Array.from(url.searchParams.keys()).every(key => key === 'v');
  if (versionOnly && PRECACHE_PATHS.has(url.pathname)) {
    const canonical = await cache.match(url.origin + url.pathname);
    if (canonical) return canonical;
  }
  return new Response('', { status: 408, statusText: 'Offline' });
}

/* ── Install: precache static shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(async cache => {
        // addAll is atomic: one unavailable image used to discard the whole
        // app shell. Keep every successful entry when an individual URL fails.
        const results = await Promise.allSettled(PRECACHE.map(async url => {
          const request = new Request(url, { cache: 'reload' });
          const response = await fetch(request);
          if (!response.ok) throw new Error(url + ': HTTP ' + response.status);
          await cache.put(request, response);
        }));
        const failed = results.flatMap((result, index) =>
          result.status === 'rejected' ? [PRECACHE[index]] : []);
        if (failed.length) console.warn('[SW] precache unavailable:', failed);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] precache partial fail:', err))
  );
});

/* ── Activate: delete old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('islamtime-') && k !== CACHE).map(k => caches.delete(k))
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
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/webhook/')) return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      /* Network-first: preserve exact versioned responses. Canonical precache
         entries are an offline fallback within this build only. */
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          try { await cache.put(request, response.clone()); }
          catch (err) { console.warn('[SW] cache write failed:', err); }
        }
        return response;
      } catch (_) {
        return offlineResponse(cache, request);
      }
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
