const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const geography = fs.readFileSync('webapp/js/native/qibla-geo.js', 'utf8');
const screenSource = fs.readFileSync('webapp/js/screens/qibla.js', 'utf8');
const appSource = fs.readFileSync('webapp/js/app.js', 'utf8');

function setup({ native = false, available = true, ios = false, deferredListener = false, integrated = false } = {}) {
  const nodes = new Map();
  const windowEvents = new Map();
  const documentEvents = new Map();
  const timers = new Map();
  const locations = [];
  const stored = new Map();
  const calls = { starts: 0, stops: 0, removes: 0 };
  let now = 10000;
  let timerId = 0;
  let nativeHeading;
  let resolveListener;
  let permission;
  const classes = () => {
    const values = new Set();
    return {
      add: value => values.add(value), remove: value => values.delete(value),
      contains: value => values.has(value),
      toggle: (value, enabled) => enabled ? values.add(value) : values.delete(value),
    };
  };
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
      style: {}, dataset: {}, attributes: {}, events: {}, textContent: '', innerHTML: '', classList: classes(),
      querySelectorAll: () => [],
      setAttribute(k, v) { this.attributes[k] = v; },
      addEventListener(k, cb) { this.events[k] = cb; },
    });
    return nodes.get(id);
  };
  const root = node('#screen-qibla');
  root.querySelector = node;
  const plugin = {
    addListener: async (_, callback) => {
      nativeHeading = callback;
      if (deferredListener) await new Promise(resolve => { resolveListener = resolve; });
      return { remove: async () => { calls.removes++; } };
    },
    start: async () => { calls.starts++; return { available }; },
    stop: async () => { calls.stops++; },
    setLocation: async () => {},
  };
  const document = {
    hidden: false,
    getElementById: id => integrated ? node('#' + id) : root,
    querySelector: () => Array.from(nodes.values()).find(el => el.classList.contains('active')) || null,
    body: { classList: classes() },
    addEventListener: (event, cb) => documentEvents.set(event, cb),
    removeEventListener: event => documentEvents.delete(event),
  };
  const window = {
    App: { state: { lang: 'en' } }, screen: { orientation: { angle: 0 } },
    addEventListener: (event, cb) => windowEvents.set(event, cb),
    removeEventListener: event => windowEvents.delete(event),
    Capacitor: native ? {
      isNativePlatform: () => true, getPlatform: () => 'android',
      isPluginAvailable: name => name === 'Compass', Plugins: { Compass: plugin },
    } : undefined,
  };
  const context = {
    window, document,
    navigator: { geolocation: { getCurrentPosition: (success, error) => locations.push({ success, error }) } },
    localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, String(v)) },
    _resolveT: (_uz, _cy, _ru, en) => en,
    setInterval: cb => { timers.set(++timerId, cb); return timerId; },
    clearInterval: id => timers.delete(id),
    Date: { now: () => now }, console,
  };
  if (ios) context.DeviceOrientationEvent = { requestPermission: () => new Promise(resolve => { permission = resolve; }) };
  vm.createContext(context);
  vm.runInContext(geography + '\n' + screenSource + '\nglobalThis.screen = QiblaScreen; globalThis.geo = QiblaGeo;', context);
  if (integrated) {
    window.location = { search: '' };
    for (const name of ['SplashScreen','LanguageScreen','MazhabScreen','LocationScreen','PrayerScreen',
      'QazoScreen','MonthlyCalendarScreen','MosquesScreen','QuranScreen','HadithScreen','DuasScreen',
      'DhikrScreen','CalendarScreen','NamesScreen','OthersScreen','ShahodatScreen','HaramaynScreen',
      'SettingsScreen','DashboardScreen']) context[name] = { render() {}, update() {} };
    Object.assign(context, {
      URLSearchParams, normalizeLanguage: lang => lang || 'en', t: key => key,
      applyLangDir() {}, setTimeout() {}, requestAnimationFrame: callback => callback(),
    });
    vm.runInContext(appSource, context);
  }
  const fix = (index = locations.length - 1, lat = 52.2297, lon = 21.0122) => locations[index].success({ coords: { latitude: lat, longitude: lon, accuracy: 8 } });
  return {
    context, node, calls, locations, timers, stored, root, windowEvents,
    fix, load: () => context.screen.load('en'), unload: () => context.screen.unload(),
    web: event => windowEvents.get(event.type)?.(event),
    native: reading => nativeHeading(reading),
    advance: ms => { now += ms; for (const cb of timers.values()) cb(); },
    hide: hidden => { document.hidden = hidden; documentEvents.get('visibilitychange')?.(); },
    resolveListener: () => resolveListener(),
    resolvePermission: result => permission(result),
  };
}

async function settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); }

test('app boot leaves Qibla inactive; route entry, exit and back entry own the native sensor lifecycle', async () => {
  const app = setup({ native: true, integrated: true });
  await settle();
  assert.match(app.root.innerHTML, /qb-compass-svg/);
  assert.equal(app.calls.starts, 0);
  assert.equal(app.locations.length, 0);
  assert.equal(app.timers.size, 0);
  assert.equal(app.windowEvents.size, 0);

  app.context.window.App.navigate('screen-qibla');
  app.fix(); await settle();
  assert.equal(app.calls.starts, 1);
  app.native({ absolute: true, heading: 20 });
  assert.equal(app.node('#qb-compass-svg').dataset.heading, '20.0');
  app.context.window.App.navigate('screen-qibla');
  await settle();
  assert.equal(app.calls.starts, 1, 'repeated activation must not register another sensor');

  app.context.window.App.navigate('screen-dashboard');
  await settle();
  assert.equal(app.calls.stops, 1);
  assert.equal(app.calls.removes, 1);
  assert.equal(app.windowEvents.size, 0);
  assert.equal(app.timers.size, 0);

  // Simulate a back/deep-link route with no QiblaScreen.load call.
  app.context.window.App.navigate('screen-qibla');
  app.fix(); await settle();
  assert.equal(app.calls.starts, 2);
  app.native({ absolute: true, heading: 90 });
  assert.equal(app.node('#qb-compass-svg').dataset.heading, '90.0');
  assert.equal(app.node('#qb-live-heading').style.display, 'flex');
});

test('route activation does not reload a Qibla screen already loaded by a Home tile', async () => {
  const app = setup({ native: true, integrated: true });
  app.load(); await settle();
  app.context.window.App.navigate('screen-qibla');
  await settle();
  assert.equal(app.calls.starts, 1);
  assert.equal(app.calls.stops, 0);
  assert.equal(app.locations.length, 1);
});

test('native Android compass does not wait for modern browser sensor permission', async () => {
  const app = setup({ native: true, ios: true });
  app.load(); app.fix(); await settle();
  assert.equal(app.calls.starts, 1);
  app.native({ absolute: true, heading: 148 });
  assert.equal(app.node('#qb-compass-svg').dataset.heading, '148.0');
  assert.notEqual(app.node('#qb-ios-permission-badge').style.display, 'flex');
});

test('absolute heading conversion rejects relative, null, infinite and invalid iOS readings', () => {
  const { geo } = setup().context;
  for (const event of [{ alpha: 0 }, { alpha: 90, absolute: false }, { alpha: null, absolute: true },
    { alpha: Infinity, absolute: true }, { webkitCompassHeading: -1 }, { webkitCompassHeading: 25, webkitCompassAccuracy: -1 }]) {
    assert.equal(geo.absoluteHeadingFromEvent(event), null);
  }
  assert.equal(geo.absoluteHeadingFromEvent({ alpha: 90, absolute: true }), 270);
  assert.equal(geo.absoluteHeadingFromEvent({ alpha: 270, type: 'deviceorientationabsolute' }, 90), 180);
  assert.equal(geo.absoluteHeadingFromEvent({ webkitCompassHeading: 355, webkitCompassAccuracy: 3 }, 90), 85);
});

test('no sensor yields explicit fallback and no frozen Qibla arrow or calibration claim', () => {
  const app = setup(); app.load(); app.fix(); app.advance(7000);
  assert.match(app.node('#qb-sensor-status').textContent, /sensor unavailable/);
  assert.equal(app.node('#qb-needle').attributes.visibility, 'hidden');
  assert.equal(app.node('#qb-calibrate-badge').style.display, 'none');
  assert.match(app.node('#qb-ig-angle').textContent, /148/);
});

test('relative browser yaw never overwrites a real absolute compass heading', () => {
  const app = setup(); app.load(); app.fix();
  app.web({ type: 'deviceorientationabsolute', alpha: 20, absolute: true });
  const heading = app.node('#qb-needle').attributes.transform;
  app.web({ type: 'deviceorientation', alpha: 140, absolute: false });
  assert.equal(app.node('#qb-needle').attributes.transform, heading);
  assert.equal(app.node('#qb-needle').attributes.visibility, 'visible');
});

test('native heading events move the needle without any browser orientation events', async () => {
  const app = setup({ native: true }); app.load(); app.fix(); await settle();
  assert.equal(app.calls.starts, 1);
  app.native({ absolute: true, heading: 0, reference: 'true', accuracyDegrees: 4 });
  const first = app.node('#qb-needle').attributes.transform;
  app.native({ absolute: true, heading: 90, reference: 'true', accuracyDegrees: 4 });
  assert.notEqual(app.node('#qb-needle').attributes.transform, first);
  assert.equal(app.node('#qb-compass-dial').attributes.transform, 'rotate(-31.5, 125, 125)');
  assert.equal(app.node('#qb-ig-accuracy').textContent, '±4°');
  const nativeValue = app.node('#qb-needle').attributes.transform;
  app.web({ type: 'deviceorientationabsolute', alpha: 10, absolute: true });
  assert.equal(app.node('#qb-needle').attributes.transform, nativeValue);
});

test('native missing-hardware result produces a usable bearing fallback', async () => {
  const app = setup({ native: true, available: false }); app.load(); app.fix(); await settle();
  assert.match(app.node('#qb-sensor-status').textContent, /sensor unavailable/);
  assert.equal(app.node('#qb-needle').attributes.visibility, 'hidden');
});

test('background and stale sensors hide old headings until a fresh reading arrives', async () => {
  const app = setup({ native: true }); app.load(); app.fix(); await settle();
  app.native({ absolute: true, heading: 10 });
  app.hide(true); app.native({ absolute: true, heading: 70 });
  assert.equal(app.node('#qb-needle').attributes.visibility, 'hidden');
  app.hide(false); app.native({ absolute: true, heading: 80 });
  assert.equal(app.node('#qb-needle').attributes.visibility, 'visible');
  app.advance(7000);
  assert.equal(app.node('#qb-needle').attributes.visibility, 'hidden');
  assert.equal(app.node('#qb-calibrate-badge').style.display, 'none');
});

test('unload removes listeners, stops native sensors and rejects late location callbacks', async () => {
  const app = setup({ native: true }); app.load(); await settle(); app.unload();
  app.fix(); app.native({ absolute: true, heading: 20 }); await settle();
  assert.equal(app.calls.stops, 1);
  assert.equal(app.calls.removes, 1);
  assert.equal(app.timers.size, 0);
  assert.equal(app.windowEvents.size, 0);
  assert.equal(app.stored.has('islamtime_last_lat'), false);
});

test('leaving before native listener registration resolves never starts sensors afterward', async () => {
  const app = setup({ native: true, deferredListener: true }); app.load(); app.unload();
  app.resolveListener(); await settle();
  assert.equal(app.calls.starts, 0);
  assert.equal(app.calls.removes, 1);
});

test('reloading does not let an old GPS response replace the new location', () => {
  const app = setup(); app.load(); app.load(); app.fix(1, -6.2088, 106.8456); app.fix(0);
  assert.equal(app.stored.get('islamtime_last_lat'), '-6.2088');
  assert.equal(app.node('#qb-coord-lat').textContent, '6.21° S');
});

test('iOS permission is requested by a tap and a late grant cannot restart an unloaded screen', async () => {
  const app = setup({ ios: true }); app.load();
  assert.equal(app.windowEvents.size, 0);
  assert.equal(app.node('#qb-ios-permission-badge').style.display, 'flex');
  app.node('#qb-ios-permission-btn').events.click(); app.unload();
  app.resolvePermission('granted'); await settle();
  assert.equal(app.windowEvents.size, 0);
});

test('GPS validation accepts equator and rejects impossible coordinates', () => {
  const app = setup(); app.load(); app.fix(0, 0, 0);
  assert.equal(app.node('#qb-coord-lat').textContent, '0.00° N');
  assert.equal(app.node('#qb-coord-lon').textContent, '0.00° E');
  assert.equal(app.context.geo.validCoordinates(91, 0), false);
  assert.equal(app.context.geo.validCoordinates(1, Infinity), false);
});
