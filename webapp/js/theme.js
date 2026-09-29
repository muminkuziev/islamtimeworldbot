/* IslamTimeWorld appearance: solar AUTO, persistent DAY / NIGHT.
 * Solar equations: NOAA Global Monitoring Laboratory, General Solar Position
 * Calculations, https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * UTC instants are compared directly; device timezone and DST cannot move the
 * solar boundary. Times are estimates of the solar horizon, not prayer times.
 */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.ThemeEngine = api;
    api.start();
  }
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';
  const DAY = 86400000;
  const MINUTE = 60000;
  const RAD = Math.PI / 180;
  const MODE_KEY = 'islamtime_theme_mode';
  let mode = 'auto', snapshot = null, timer = null, started = false;
  let location = null, source = 'cached', media = null, geoPending = false;
  let lastGeoAttempt = -Infinity;

  function validLocation(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' &&
      Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  }

  function normalizeMode(value) {
    if (value === 'day' || value === 'light') return 'day';
    if (value === 'night' || value === 'dark') return 'night';
    return 'auto';
  }

  function solarTerms(instant) {
    const date = new Date(instant);
    const year = date.getUTCFullYear();
    const start = Date.UTC(year, 0, 1);
    const daysInYear = (Date.UTC(year + 1, 0, 1) - start) / DAY;
    const gamma = 2 * Math.PI / daysInYear * ((instant - start) / DAY - 0.5);
    const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
    const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
    return { eqTime, declination };
  }

  function solarDay(midnight, lat, lon) {
    function crossing(isSunrise) {
      let instant = midnight + (720 - 4 * lon) * MINUTE;
      for (let i = 0; i < 4; i++) {
        const { eqTime, declination } = solarTerms(instant);
        const denominator = Math.cos(lat * RAD) * Math.cos(declination);
        if (Math.abs(denominator) < 1e-12) return null;
        const cosHour = Math.cos(90.833 * RAD) / denominator - Math.tan(lat * RAD) * Math.tan(declination);
        if (cosHour < -1 || cosHour > 1) return null;
        const hourAngle = Math.acos(cosHour) / RAD * (isSunrise ? 1 : -1);
        instant = midnight + (720 - 4 * (lon + hourAngle) - eqTime) * MINUTE;
      }
      return Math.round(instant);
    }
    return { sunrise: crossing(true), sunset: crossing(false) };
  }

  function solarTimes(now, lat, lon) {
    const instant = Number(now);
    if (!Number.isFinite(instant) || !Number.isFinite(new Date(instant).getTime()) || !validLocation(lat, lon)) return null;
    // Longitude selects the local mean solar date, including across the date
    // line; no civil timezone lookup or fixed UTC offset is required.
    const localSolarDay = new Date(instant + lon * 4 * MINUTE);
    const midnight = Date.UTC(localSolarDay.getUTCFullYear(), localSolarDay.getUTCMonth(), localSolarDay.getUTCDate());
    return solarDay(midnight, lat, lon);
  }

  function resolveTheme(selectedMode, now, coordinates, systemDark) {
    const selected = normalizeMode(selectedMode);
    if (selected !== 'auto') return { mode: selected, theme: selected === 'night' ? 'dark' : 'light', source: 'manual', nextChange: null };
    const sun = coordinates && solarTimes(now, coordinates.lat, coordinates.lon);
    if (!sun || sun.sunrise === null || sun.sunset === null) {
      return { mode: 'auto', theme: systemDark ? 'dark' : 'light', source: 'system', nextChange: null };
    }
    const isDay = Number(now) >= sun.sunrise && Number(now) < sun.sunset;
    let nextChange = Number(now) < sun.sunrise ? sun.sunrise : sun.sunset;
    if (nextChange <= Number(now)) {
      const tomorrow = solarTimes(Number(now) + DAY, coordinates.lat, coordinates.lon);
      nextChange = tomorrow && tomorrow.sunrise > Number(now) ? tomorrow.sunrise : null;
    }
    return { mode: 'auto', theme: isDay ? 'light' : 'dark', source: 'solar', sunrise: sun.sunrise, sunset: sun.sunset, nextChange };
  }

  function read(key) { try { return root.localStorage.getItem(key); } catch (_) { return null; } }
  function write(key, value) { try { root.localStorage.setItem(key, String(value)); } catch (_) { /* Storage may be disabled. */ } }

  function readMode() {
    const saved = read(MODE_KEY);
    if (saved) return normalizeMode(saved);
    // Previous releases wrote "light" on every boot, even without a user
    // choice. Do not mistake that implementation detail for a manual override.
    const legacy = read('islamtime_theme');
    return legacy === 'light' ? 'auto' : normalizeMode(legacy);
  }

  function cachedLocation() {
    const lat = read('islamtime_last_lat'), lon = read('islamtime_last_lon');
    if (lat === null || lon === null || !lat.trim() || !lon.trim()) return null;
    return validLocation(Number(lat), Number(lon)) ? { lat: Number(lat), lon: Number(lon) } : null;
  }

  function syncLocation() {
    const cached = cachedLocation();
    // Keep a newly acquired position usable even when WebView storage is
    // unavailable. A cached-only position disappears when its cache is reset.
    if (!cached) { if (source !== 'location') location = null; return; }
    if (!location || location.lat !== cached.lat || location.lon !== cached.lon) {
      location = cached;
      source = 'cached';
    }
  }

  function updateChrome(theme) {
    const color = theme === 'dark' ? '#091714' : '#FFFFFF';
    const meta = root.document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
    const tg = root.Telegram && root.Telegram.WebApp;
    for (const method of ['setHeaderColor', 'setBackgroundColor', 'setBottomBarColor']) {
      try { if (tg && tg[method]) tg[method](color); } catch (_) { /* Older Telegram. */ }
    }
    const bar = root.Capacitor && root.Capacitor.Plugins && root.Capacitor.Plugins.StatusBar;
    if (bar) {
      // Capacitor DARK means a dark background with light system glyphs.
      try { Promise.resolve(bar.setStyle({ style: theme === 'dark' ? 'DARK' : 'LIGHT' })).catch(() => {}); } catch (_) {}
      try { Promise.resolve(bar.setBackgroundColor({ color })).catch(() => {}); } catch (_) {}
    }
    const appearance = root.Capacitor && root.Capacitor.Plugins && root.Capacitor.Plugins.SystemAppearance;
    if (appearance) {
      try { Promise.resolve(appearance.setTheme({ dark: theme === 'dark' })).catch(() => {}); } catch (_) {}
    }
  }

  function refresh() {
    if (!root) return null;
    syncLocation();
    const now = Date.now();
    const next = resolveTheme(mode, now, location, !!(media && media.matches));
    if (next.source === 'solar') next.source = source;
    const changed = !snapshot || JSON.stringify(next) !== JSON.stringify(snapshot);
    const appearanceChanged = !snapshot || snapshot.theme !== next.theme;
    snapshot = next;
    const html = root.document.documentElement;
    html.setAttribute('data-theme', next.theme);
    html.setAttribute('data-theme-mode', next.mode);
    html.style.colorScheme = next.theme;
    if (appearanceChanged) updateChrome(next.theme);
    if (changed) root.document.dispatchEvent(new root.CustomEvent('islamtime:themechange', { detail: getState() }));
    if (timer !== null) root.clearTimeout(timer);
    // Exact boundary timer plus a one-minute check for clock, date or location
    // changes. Resume refreshes immediately after suspended mobile timers.
    const delay = next.nextChange ? Math.max(1, Math.min(MINUTE, next.nextChange - now)) : MINUTE;
    timer = root.setTimeout(refresh, delay);
    return getState();
  }

  function setMode(value) {
    if (!['auto', 'day', 'night', 'light', 'dark'].includes(value)) throw new RangeError('Unknown theme mode');
    mode = normalizeMode(value);
    if (root) {
      write(MODE_KEY, mode);
      write('islamtime_theme', mode);
      refresh();
      if (mode === 'auto') refreshLocation();
    }
    return getState();
  }

  // Rough equirectangular distance; accurate enough to detect "the user moved".
  function distanceKm(a, b) {
    const rad = Math.PI / 180;
    const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
    const y = (b.lat - a.lat) * rad;
    return Math.sqrt(x * x + y * y) * 6371;
  }

  function setLocation(lat, lon) {
    if (!validLocation(lat, lon)) return false;
    const previous = location || cachedLocation();
    location = { lat, lon };
    source = 'location';
    if (root) {
      write('islamtime_last_lat', lat);
      write('islamtime_last_lon', lon);
      if (previous && distanceKm(previous, location) > 1) {
        // City name and nearby mosques are cached per place; drop them so every
        // screen resolves the new city instead of showing the old one.
        try {
          Object.keys(root.localStorage)
            .filter(key => key.startsWith('islamtime_mosques_'))
            .forEach(key => root.localStorage.removeItem(key));
        } catch (_) {}
        root.document.dispatchEvent(new root.CustomEvent('islamtime:locationchange', { detail: { lat, lon } }));
      }
      refresh();
    }
    return true;
  }

  async function refreshLocation() {
    // Location is app-wide (prayer times, city, Qibla), not only for the theme.
    if (!root || geoPending || read('islamtime_gps') === 'false') return;
    if (Date.now() - lastGeoAttempt < MINUTE) return;
    lastGeoAttempt = Date.now();
    geoPending = true;
    try {
      // A theme change never prompts for location. Reuse a prior permission or
      // the app's last-known coordinates; onboarding owns permission requests.
      const nativeGeo = root.Capacitor && root.Capacitor.Plugins && root.Capacitor.Plugins.Geolocation;
      if (nativeGeo && nativeGeo.checkPermissions) {
        const permission = await nativeGeo.checkPermissions();
        if (permission.location === 'granted' || permission.coarseLocation === 'granted') {
          const pos = await nativeGeo.getCurrentPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
          setLocation(pos.coords.latitude, pos.coords.longitude);
        }
        return;
      }
      const nav = root.navigator;
      if (nav && nav.geolocation) {
        // Telegram's WebView often reports "prompt" (or lacks the Permissions
        // API) even after the user allowed location; trust a prior GPS success.
        let state = 'prompt';
        try { if (nav.permissions) state = (await nav.permissions.query({ name: 'geolocation' })).state; } catch (_) {}
        if (state === 'granted' || (state === 'prompt' && read('islamtime_location_asked') === '1')) {
          await new Promise(resolve => nav.geolocation.getCurrentPosition(pos => {
            setLocation(pos.coords.latitude, pos.coords.longitude);
            resolve();
          }, resolve, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }));
        }
      }
    } catch (_) { /* Cached location or system preference remains available. */ }
    finally { geoPending = false; }
  }

  function getState() { return snapshot ? { ...snapshot } : { mode, theme: mode === 'night' ? 'dark' : 'light', source: 'system', nextChange: null }; }
  function getMode() { return mode; }
  function resume() { refresh(); refreshLocation(); }

  function start() {
    if (!root || started) return;
    started = true;
    mode = readMode();
    try { media = root.matchMedia('(prefers-color-scheme: dark)'); } catch (_) {}
    if (media && media.addEventListener) media.addEventListener('change', refresh);
    else if (media && media.addListener) media.addListener(refresh);
    root.document.addEventListener('visibilitychange', () => { if (!root.document.hidden) resume(); });
    root.document.addEventListener('islamtime:resume', resume);
    root.document.addEventListener('DOMContentLoaded', () => { resume(); updateChrome(snapshot.theme); });
    root.addEventListener('pageshow', resume);
    root.addEventListener('focus', resume);
    root.addEventListener('storage', event => {
      if (!event.key || event.key === MODE_KEY) mode = readMode();
      if (!event.key || [MODE_KEY, 'islamtime_last_lat', 'islamtime_last_lon'].includes(event.key)) refresh();
    });
    refresh();
    refreshLocation();
  }

  return { start, getMode, setMode, getState, setLocation, refresh, refreshLocation, solarTimes, resolveTheme, normalizeMode, validLocation };
});
