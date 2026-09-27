const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function dhikr(initial) {
  let saved = JSON.stringify(initial), writes = 0;
  const context = vm.createContext({
    window:{ App:{ state:{ lang:'en' } } },
    localStorage:{ getItem:() => saved, setItem:(key, value) => { saved = value; writes++; } },
    _resolveT:(uz, cyr, ru, en) => en,
    t:key => key,
  });
  const source = fs.readFileSync(path.join(root, 'webapp/js/screens/dhikr.js'), 'utf8');
  vm.runInContext(source.replace('return { render, load };',
    'return { rows: ZIKIRLAR, counts: _counts, add: _addCnt, list: _listHTML, meaning: (lang, row) => { _lang = lang; return _zUz(row); } };'), context);
  return { api:vm.runInContext('DhikrScreen', context), saved:() => JSON.parse(saved), writes:() => writes };
}

test('Dhikr record IDs remain canonical while Indonesian meaning uses its own field', () => {
  const { api } = dhikr({});
  assert.deepEqual(Array.from(api.rows, row => row.id), ['k5','k7','k2','k3','k4']);
  for (const row of api.rows) {
    assert.equal(api.meaning('id', row), row.idMeaning);
    assert.notEqual(row.idMeaning, row.id);
    assert.equal(api.meaning('tr', row), 'translation_unavailable');
    assert.equal(api.meaning('ms', row), 'translation_unavailable');
  }
});

test('Legacy meaning-keyed counts migrate without deleting history or double-counting', () => {
  const initialRows = dhikr({}).api.rows;
  const legacyKey = initialRows[0].idMeaning;
  const r = dhikr({ [legacyKey]:17, unrelated_history:9 });
  assert.equal(r.api.counts().k5, 17);
  assert.equal(r.saved()[legacyKey], 17);
  assert.equal(r.saved().unrelated_history, 9);
  assert.equal(r.writes(), 1);
  r.api.counts();
  assert.equal(r.writes(), 1, 'reading again must not repeat the migration');
  const html = r.api.list();
  assert.match(html, /class="zk-today-num">17<\/span>/);
  r.api.add('k5');
  assert.equal(r.saved().k5, 18);
  assert.equal(r.saved()[legacyKey], 17);
});

test('An existing canonical count including zero is never overwritten', () => {
  const legacyKey = dhikr({}).api.rows[0].idMeaning;
  for (const count of [0, 6]) {
    const r = dhikr({ [legacyKey]:40, k5:count });
    assert.equal(r.api.counts().k5, count);
    assert.equal(r.saved()[legacyKey], 40);
    assert.equal(r.writes(), 0);
  }
});

test('Turkish Names of Allah meaning cannot display transliteration as a translation', () => {
  const context = vm.createContext({ window:{}, t:key => key });
  const source = fs.readFileSync(path.join(root, 'webapp/js/screens/names.js'), 'utf8');
  vm.runInContext(source.replace('return { render, load };',
    'return { meaning: (language, name) => { _lang = language; return _shortMean(name); } };'), context);
  const api = vm.runInContext('NamesScreen', context);
  assert.equal(api.meaning('tr', { tr:'fixture transliteration', en:'fixture meaning' }), 'translation_unavailable');
  assert.equal(api.meaning('en', { tr:'fixture transliteration', en:'fixture meaning' }), 'fixture meaning');
});
