const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../webapp/js/screens/mosques.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const mosque = (name = 'Test mosque', lat = 52.23, lon = 21.02, tags = {}) => ({
  lat, lon, tags: { name, ...tags }
});

function harness(values = {}) {
  const storage = new Map(Object.entries({
    islamtime_last_lat: '52.2297',
    islamtime_last_lon: '21.0122',
    ...values,
  }));
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id)) {
      nodes.set(id, {
        innerHTML: '',
        textContent: '',
        listeners: {},
        classList: { contains: () => false, add() {}, remove() {} },
        addEventListener(type, fn) { this.listeners[type] = fn; },
        querySelector: node,
        querySelectorAll: () => [],
      });
    }
    return nodes.get(id);
  }

  const requests = [];
  const context = {
    console,
    AbortController,
    AbortSignal,
    URLSearchParams,
    DOMException,
    setTimeout,
    clearTimeout,
    Date,
    localStorage: {
      getItem: k => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k),
    },
    document: { getElementById: node },
    navigator: {},
    normalizeLanguage: x => x,
    _resolveT: (_uz, _cyr, _ru, en) => en,
    t: key => key,
    window: {
      App: { state: { lang: 'en' }, navigate() {} },
      ThemeEngine: { refresh() {}, setLocation() {} },
    },
    fetch: (url, options = {}) => {
      if (String(url).includes('/api/mosques/nearby')) {
        // Simulate a reachable backend with an unusable response so the
        // direct-from-device fallback is exercised.
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (String(url).includes('overpass')) {
        return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
      }
      return Promise.resolve({ ok: true, json: async () => ({ address: { city: 'Test city' } }) });
    },
  };

  vm.createContext(context);
  vm.runInContext(source + '\nglobalThis.screen = MosquesScreen;', context);

  return {
    screen: context.screen,
    storage,
    requests,
    body: () => node('#ms-body').innerHTML,
    respond: async (index, elements, extra = {}) => {
      requests[index].resolve({ ok: true, json: async () => ({ elements, ...extra }) });
      await tick();
      await tick();
    },
    reject: async index => {
      requests[index].reject(new Error('network'));
      await tick();
    },
    click: (selector, dataset = {}) =>
      node('#ms-body').listeners.click({ target: { closest: key => key === selector ? { dataset } : null } }),
  };
}

test('hidden render stays idle; direct fallback renders three results', async () => {
  const h = harness();
  h.screen.render();
  assert.equal(h.requests.length, 0);

  h.screen.load('en');
  await tick();
  assert.match(h.body(), /mosques_loading/);
  assert.equal(h.requests.length, 3);

  await h.respond(0, [mosque(), mosque('Second', 52.24), mosque('Third', 52.25)]);
  assert.equal((h.body().match(/class="ms-card"/g) || []).length, 3);
  assert.match(h.body(), /destination=52.23,21.02/);
});

test('all providers failing shows Retry; retry can recover', async () => {
  const h = harness();
  h.screen.load('en');
  await tick();
  assert.equal(h.requests.length, 3);

  await h.reject(0);
  await h.reject(1);
  await h.reject(2);
  await tick();
  assert.match(h.body(), /mosques_load_error/);

  h.click('#ms-retry');
  await tick();
  assert.equal(h.requests.length, 6);
  await h.respond(3, [mosque()]);
  assert.match(h.body(), /Test mosque/);
  assert.doesNotMatch(h.body(), /mosques_load_error/);
});

test('empty successful search offers explicit radius widening', async () => {
  const h = harness();
  h.screen.load('en');
  await tick();
  await h.respond(0, []);
  assert.match(h.body(), /No mosques found/);
  assert.match(h.body(), /10 km radius/);

  h.click('.ms-radius-btn', { radius: '25000' });
  await tick();
  assert.equal(h.requests.length, 6);
  assert.match(decodeURIComponent(h.requests[3].options.body), /around:25000/);
  await h.respond(3, []);
  assert.match(h.body(), /No mosques found/);
});

test('old provider response cannot overwrite a newer language reload', async () => {
  const h = harness();
  h.screen.load('en');
  await tick();
  assert.equal(h.requests.length, 3);

  h.screen.load('uz');
  await tick();
  assert.equal(h.requests.length, 6);
  assert.equal(h.requests[0].options.signal.aborted, true);

  await h.respond(3, [mosque('Current')]);
  await h.respond(0, [mosque('Obsolete')]);
  assert.match(h.body(), /Current/);
  assert.doesNotMatch(h.body(), /Obsolete/);
});

test('zero coordinates are valid and saved mosque toggle persists', async () => {
  const h = harness({ islamtime_last_lat: '0', islamtime_last_lon: '0' });
  h.screen.load('en');
  await tick();
  assert.equal(h.requests.length, 3);
  assert.match(decodeURIComponent(h.requests[0].options.body), /around:10000,0,0/);

  await h.respond(0, [mosque('Equator mosque', 0, 0.001, { 'prayer:friday': '12:30' })]);
  assert.match(h.body(), /12:30/);
  h.click('.ms-save-btn', { saveIdx: '0' });
  assert.match(h.body(), /aria-pressed="true"/);

  h.screen.load('en');
  assert.match(h.body(), /aria-pressed="true"/);
});

test('cached results from another location are ignored', async () => {
  const h = harness({
    islamtime_mosques_en_v2: JSON.stringify({
      lat: 41,
      lon: 69,
      savedAt: Date.now(),
      mosques: [{ lat: 41, lon: 69, name: 'Wrong city' }],
    }),
  });
  h.screen.load('en');
  await tick();
  assert.doesNotMatch(h.body(), /Wrong city/);
  await h.respond(0, [mosque('Current city')]);
  assert.match(h.body(), /Current city/);
});
