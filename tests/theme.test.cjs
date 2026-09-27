'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const themePath = path.resolve(__dirname, '../webapp/js/theme.js');
const source = fs.readFileSync(themePath, 'utf8');
const solar = require(themePath);

const warsaw = { lat: 52.2297, lon: 21.0122 };
const summer = Date.parse('2026-06-21T12:00:00Z');

function browser({ now = summer, storage = {}, dark = false, blockedStorage = false, permission = 'denied' } = {}) {
  let clock = now, nextId = 0, geoCalls = 0;
  const values = new Map(Object.entries(storage));
  const events = new Map(), windowEvents = new Map(), attrs = {}, timers = new Map();
  const document = {
    hidden: false,
    documentElement: { style: {}, setAttribute: (key, value) => { attrs[key] = value; } },
    querySelector: () => ({ setAttribute() {} }),
    addEventListener: (type, fn) => { events.set(type, fn); },
    dispatchEvent: event => { if (events.has(event.type)) events.get(event.type)(event); },
  };
  const media = { matches: dark, addEventListener(type, fn) { this.change = fn; } };
  const root = {
    document,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options && options.detail; } },
    localStorage: {
      getItem(key) { if (blockedStorage) throw new Error('Storage disabled'); return values.get(key) ?? null; },
      setItem(key, value) { if (blockedStorage) throw new Error('Storage disabled'); values.set(key, value); },
    },
    matchMedia: () => media,
    addEventListener: (type, fn) => windowEvents.set(type, fn),
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    navigator: {
      permissions: { async query() { return { state: permission }; } },
      geolocation: { getCurrentPosition(ok) { geoCalls++; ok({ coords: { latitude: warsaw.lat, longitude: warsaw.lon } }); } },
    },
  };
  class Clock extends Date { static now() { return clock; } }
  vm.runInNewContext(source, { window: root, Date: Clock, setTimeout: root.setTimeout, console });
  return { engine: root.ThemeEngine, values, attrs, timers, media, document,
    geoCalls: () => geoCalls,
    at(instant) { clock = instant; },
    event(type, detail) { const fn = events.get(type) || windowEvents.get(type); if (fn) fn(detail || {}); },
  };
}

test('sunrise switches to day exactly; sunset switches to night exactly', () => {
  const sun = solar.solarTimes(summer, warsaw.lat, warsaw.lon);
  assert.equal(solar.resolveTheme('auto', sun.sunrise - 1, warsaw, false).theme, 'dark');
  assert.equal(solar.resolveTheme('auto', sun.sunrise, warsaw, true).theme, 'light');
  assert.equal(solar.resolveTheme('auto', sun.sunset - 1, warsaw, true).theme, 'light');
  assert.equal(solar.resolveTheme('auto', sun.sunset, warsaw, false).theme, 'dark');
  assert.ok(solar.resolveTheme('auto', sun.sunset, warsaw, false).nextChange > sun.sunset);
});

test('seasonal sunrise and sunset are physically plausible in both hemispheres', () => {
  const june = solar.solarTimes(summer, warsaw.lat, warsaw.lon);
  const december = solar.solarTimes(Date.parse('2026-12-21T12:00:00Z'), warsaw.lat, warsaw.lon);
  // Warsaw's summer day exceeds 16 h and winter day is shorter than 8 h.
  assert.ok((june.sunset - june.sunrise) / 3600000 > 16);
  assert.ok((december.sunset - december.sunrise) / 3600000 < 8);
  // UTC windows deliberately broad enough for real atmospheric uncertainty.
  assert.ok(new Date(june.sunrise).getUTCHours() === 2);
  assert.ok(new Date(december.sunrise).getUTCHours() === 6);
  const sydney = solar.solarTimes(Date.parse('2026-12-21T02:00:00Z'), -33.8688, 151.2093);
  assert.ok((sydney.sunset - sydney.sunrise) / 3600000 > 14);
});

test('UTC day crossing and longitude across the international date line work', () => {
  const ny = { lat: 40.7128, lon: -74.006 };
  assert.equal(solar.resolveTheme('auto', Date.parse('2026-06-22T00:00:00Z'), ny, true).theme, 'light');
  assert.equal(solar.resolveTheme('auto', Date.parse('2026-06-22T01:00:00Z'), ny, false).theme, 'dark');
  for (let hour = 0; hour < 24; hour++) {
    const instant = Date.parse('2026-03-20T00:00:00Z') + hour * 3600000;
    assert.equal(solar.resolveTheme('auto', instant, { lat: 0, lon: 180 }, false).theme,
      solar.resolveTheme('auto', instant, { lat: 0, lon: -180 }, false).theme);
  }
});

test('the same instant has the same solar state in any device timezone, including DST dates', () => {
  const snippet = `const t=require(${JSON.stringify(themePath)}); console.log(JSON.stringify(['2026-03-29T00:30:00Z','2026-03-29T04:30:00Z','2026-10-25T04:30:00Z','2026-10-25T17:30:00Z'].map(d=>t.resolveTheme('auto',Date.parse(d),{lat:52.2297,lon:21.0122},false))));`;
  const output = ['UTC', 'Europe/Warsaw', 'America/New_York', 'Pacific/Auckland'].map(tz => {
    const result = spawnSync(process.execPath, ['-e', snippet], { encoding: 'utf8', env: { ...process.env, TZ: tz } });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  });
  output.forEach(value => assert.equal(value, output[0]));
});

test('polar summer/winter and missing/invalid coordinates use deterministic system fallback', () => {
  for (const date of ['2026-06-21T12:00:00Z', '2026-12-21T12:00:00Z']) {
    for (const lat of [69.6492, 90, -90]) {
      const resolved = solar.resolveTheme('auto', Date.parse(date), { lat, lon: 18.9553 }, true);
      assert.equal(resolved.theme, 'dark');
      assert.equal(resolved.source, 'system');
      assert.equal(resolved.nextChange, null);
    }
  }
  for (const coords of [null, { lat: NaN, lon: 0 }, { lat: 91, lon: 0 }, { lat: 0, lon: Infinity }]) {
    assert.equal(solar.resolveTheme('auto', summer, coords, false).source, 'system');
  }
  assert.equal(solar.validLocation(0, 0), true);
  assert.equal(solar.validLocation('0', '0'), false);
});

test('first launch and legacy forced-light storage default to AUTO', () => {
  for (const storage of [{}, { islamtime_theme: 'light' }, { islamtime_theme_mode: '__proto__' }, { islamtime_last_lat: '', islamtime_last_lon: '' }]) {
    const b = browser({ storage, dark: true });
    assert.equal(b.engine.getMode(), 'auto');
    assert.equal(b.attrs['data-theme'], 'dark');
    assert.equal(b.engine.getState().source, 'system');
  }
});

test('manual day/night persist across relaunch and ignore solar/system changes until AUTO selected', () => {
  const b = browser({ dark: true, storage: { islamtime_last_lat: '52.2297', islamtime_last_lon: '21.0122' } });
  b.engine.setMode('night');
  assert.equal(b.engine.getState().theme, 'dark');
  b.at(summer + 86400000);
  b.event('islamtime:resume');
  assert.equal(b.engine.getState().theme, 'dark');
  const relaunched = browser({ storage: Object.fromEntries(b.values) });
  assert.equal(relaunched.engine.getMode(), 'night');
  relaunched.engine.setMode('day');
  relaunched.media.matches = true;
  relaunched.media.change();
  assert.equal(relaunched.engine.getState().theme, 'light');
  relaunched.engine.setMode('auto');
  assert.equal(relaunched.engine.getState().source, 'cached');
  assert.equal(relaunched.values.get('islamtime_theme_mode'), 'auto');
});

test('app resume after sunset recalculates immediately and schedules one timer', () => {
  const sun = solar.solarTimes(summer, warsaw.lat, warsaw.lon);
  const b = browser({ now: sun.sunset - 2000, storage: { islamtime_last_lat: '52.2297', islamtime_last_lon: '21.0122' } });
  assert.equal(b.engine.getState().theme, 'light');
  assert.equal([...b.timers.values()][0].delay, 2000);
  b.at(sun.sunset + 1000);
  b.event('islamtime:resume');
  assert.equal(b.attrs['data-theme'], 'dark');
  assert.equal(b.timers.size, 1);
  b.at(sun.sunrise + 86400000 + 600000);
  b.event('visibilitychange');
  assert.equal(b.attrs['data-theme'], 'light');
});

test('changed location updates all screens without reload and caches valid zero coordinates', () => {
  const b = browser({ now: Date.parse('2026-06-21T12:00:00Z') });
  b.engine.setLocation(52.2297, 21.0122);
  assert.equal(b.attrs['data-theme'], 'light');
  assert.equal(b.engine.getState().source, 'location');
  b.engine.setLocation(-33.8688, 151.2093);
  assert.equal(b.attrs['data-theme'], 'dark');
  assert.equal(b.engine.setLocation(0, 0), true);
  assert.equal(b.values.get('islamtime_last_lat'), '0');
  assert.equal(b.engine.setLocation(200, 0), false);
});

test('location denial never prompts and cached location still powers AUTO', async () => {
  const b = browser({ permission: 'denied', storage: { islamtime_last_lat: '52.2297', islamtime_last_lon: '21.0122' } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(b.geoCalls(), 0);
  assert.equal(b.engine.getState().source, 'cached');
  assert.equal(b.engine.getState().theme, 'light');
});

test('previously granted location is refreshed without a permission prompt', async () => {
  const b = browser({ permission: 'granted', dark: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(b.geoCalls(), 1);
  assert.equal(b.engine.getState().source, 'location');
  assert.equal(b.attrs['data-theme'], 'light');
});

test('missing storage remains usable and system preference changes propagate', () => {
  const b = browser({ blockedStorage: true });
  assert.equal(b.engine.getMode(), 'auto');
  b.media.matches = true;
  b.media.change();
  assert.equal(b.attrs['data-theme'], 'dark');
  b.engine.setMode('day');
  assert.equal(b.attrs['data-theme'], 'light');
  b.engine.setMode('auto');
  b.engine.setLocation(warsaw.lat, warsaw.lon);
  assert.equal(b.engine.getState().source, 'location');
  assert.equal(b.attrs['data-theme'], 'light');
});
