const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ORIGIN = 'http://127.0.0.1:8099';
const source = fs.readFileSync(path.join(__dirname, '../webapp/sw.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, '../webapp/index.html'), 'utf8');

function worker() {
  const events = new Map();
  const stores = new Map();
  const state = { offline: false, unavailable: new Set(), rejectWrites: false, skipped: 0, claimed: 0 };
  const key = value => new URL(typeof value === 'string' ? value : value.url, ORIGIN).href;
  class LocalRequest extends Request {
    constructor(value, init) { super(typeof value === 'string' ? key(value) : value, init); }
  }
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async match(request) { return entries.get(key(request))?.clone(); },
        async put(request, response) {
          if (state.rejectWrites) throw new Error('Quota exceeded');
          entries.set(key(request), response.clone());
        },
      };
    },
    async keys() { return Array.from(stores.keys()); },
    async delete(name) { return stores.delete(name); },
  };
  const context = vm.createContext({
    URL, Request: LocalRequest, Response, caches,
    console: { warn() {} },
    fetch: async request => {
      if (state.offline) throw new TypeError('Network unavailable');
      const url = new URL(key(request));
      if (state.unavailable.has(url.pathname)) return new Response('Unavailable', { status: 503 });
      return new Response('asset:' + url.pathname + url.search);
    },
    self: {
      location: new URL(ORIGIN),
      addEventListener(type, handler) { events.set(type, handler); },
      skipWaiting: async () => { state.skipped++; },
      clients: { claim: async () => { state.claimed++; } },
    },
  });
  vm.runInContext(source + '\nglobalThis.buildCache = CACHE; globalThis.precache = PRECACHE;', context);
  return {
    state, stores, caches, name: context.buildCache, precache: Array.from(context.precache),
    async dispatch(type) {
      let completion;
      events.get(type)({ waitUntil(value) { completion = value; } });
      await completion;
    },
    async get(url, init) {
      let response;
      events.get('fetch')({ request: new LocalRequest(url, init), respondWith(value) { response = value; } });
      return response;
    },
  };
}

test('A fresh install serves every versioned local boot asset from its canonical precache offline', async () => {
  const sw = worker();
  await sw.dispatch('install');
  assert.equal(sw.state.skipped, 1);
  assert.equal(sw.stores.get(sw.name).size, sw.precache.length);
  const assets = Array.from(index.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)=["']([^"']+)["']/g), match => new URL(match[1], ORIGIN + '/app'))
    .filter(url => url.origin === ORIGIN && !url.pathname.startsWith('/api/'));
  assert.ok(assets.length > 30, 'Exercise the actual index boot asset list');
  sw.state.offline = true;
  assert.equal((await sw.get('/app')).status, 200);
  for (const url of assets) {
    const response = await sw.get(url.href);
    assert.equal(response.status, 200, url.pathname + url.search);
    assert.equal(await response.text(), 'asset:' + url.pathname, url.pathname + url.search);
  }
});

test('One unavailable precache image does not discard successful app shell and script entries', async () => {
  const sw = worker();
  sw.state.unavailable.add('/assets/reference-ui/qibla-earth.png');
  await sw.dispatch('install');
  assert.equal(sw.state.skipped, 1);
  assert.equal(sw.stores.get(sw.name).size, sw.precache.length - 1);
  sw.state.offline = true;
  assert.equal((await sw.get('/app')).status, 200);
  assert.equal((await sw.get('/js/app.js?v=124')).status, 200);
  assert.equal((await sw.get('/assets/reference-ui/qibla-earth.png')).status, 408);
});

test('An exact versioned response takes precedence over its canonical precache entry', async () => {
  const sw = worker();
  await sw.dispatch('install');
  await sw.get('/js/app.js?v=new');
  sw.state.offline = true;
  assert.equal(await (await sw.get('/js/app.js?v=new')).text(), 'asset:/js/app.js?v=new');
  assert.equal(await (await sw.get('/js/app.js?v=first-load')).text(), 'asset:/js/app.js');
});

test('Offline fallback never crosses cache builds or ignores functional query parameters', async () => {
  const sw = worker();
  const old = await sw.caches.open('islamtime-old-build');
  await old.put('/js/app.js', new Response('old-build'));
  sw.state.offline = true;
  assert.equal((await sw.get('/js/app.js?v=124')).status, 408);
  sw.state.offline = false;
  await sw.dispatch('install');
  sw.state.offline = true;
  assert.equal((await sw.get('/js/app.js?v=124&lang=de')).status, 408);
  assert.equal((await sw.get('/unknown.js?v=124')).status, 408);
});

test('Cache write failure still returns the successful network response', async () => {
  const sw = worker();
  sw.state.rejectWrites = true;
  const response = await sw.get('/js/app.js?v=latest');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'asset:/js/app.js?v=latest');
});

test('API, non-GET and cross-origin requests remain outside the service-worker cache', async () => {
  const sw = worker();
  assert.equal(await sw.get('/api/hadeethenc/daily?lang=de'), undefined);
  assert.equal(await sw.get('/js/app.js', { method: 'POST' }), undefined);
  assert.equal(await sw.get('http://127.0.0.1:9000/js/app.js'), undefined);
  assert.equal(await sw.get('https://example.org/js/app.js'), undefined);
});

test('Activation removes only older IslamTime caches and keeps the current build', async () => {
  const sw = worker();
  await sw.caches.open(sw.name);
  await sw.caches.open('islamtime-old-build');
  await sw.caches.open('unrelated-cache');
  await sw.dispatch('activate');
  assert.deepEqual(await sw.caches.keys(), [sw.name, 'unrelated-cache']);
  assert.equal(sw.state.claimed, 1);
});
