/* Source alignment tests use labeled fixtures, never generated religious text. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const editions = { ar:'quran-uthmani', en:'en.asad', id:'id.indonesian', ur:'ur.jalandhry', bn:'bn.bengali', fr:'fr.hamidullah', hi:'hi.hindi', fa:'fa.makarem', tr:'tr.diyanet', ru:'ru.kuliev', uz:'uz.sodik', de:'de.bubenheim', ms:'ms.basmeih' };
const settle = () => new Promise(resolve => setImmediate(resolve));

class Element {
  constructor(tag = 'div', dataset = {}) {
    this.tagName = tag; this.dataset = dataset; this.children = []; this.attributes = {};
    this.listeners = {}; this.isConnected = true; this.textContent = '';
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
  addEventListener(type, listener) { this.listeners[type] = listener; }
}
function verse(reference, arabic = false) {
  return new Element('div', { quranVerse:reference, verseFeedback:'true', ...(arabic ? { quranLanguage:'ar' } : {}) });
}
function response(url, alter = () => {}) {
  const [, reference, edition] = url.match(/\/ayah\/([^/]+)\/(.+)$/);
  const [surah, ayah] = reference.split(':').map(Number);
  const data = { edition:{ identifier:edition }, surah:{ number:surah }, numberInSurah:ayah, text:`fixture ${edition} ${reference}` };
  alter(data);
  return { ok:true, json:async () => ({ code:200, data }) };
}
function loader(lang, nodes, fetcher = async url => response(url)) {
  const calls = [], listeners = {};
  const context = vm.createContext({
    console, AbortSignal,
    window:{ App:{ state:{ lang } }, addEventListener:(type, callback) => { listeners[type] = callback; } },
    document:{
      documentElement:{ lang }, getElementById:() => ({}), createElement:tag => new Element(tag),
      querySelectorAll:selector => selector.includes(':empty') ? nodes.filter(n => !n.children.length || n.dataset.verseState === 'error') : nodes,
    },
    MutationObserver:class { observe() {} },
    fetch:async url => { calls.push(url); return fetcher(url); },
    t:(key, language) => `${language}:${key}`,
    _resolveT:(uz, cyr, ru, en, language) => `${language}:${en}`,
  });
  vm.runInContext(read('webapp/js/native/quran-provider.js'), context);
  vm.runInContext(read('webapp/js/verified-content.js'), context);
  return { context, calls, listeners };
}

test('All eight calendar events use exact references, with Qadr 97:3 and 97:4 separate', () => {
  const context = vm.createContext({ window:{}, _resolveT:(uz, cyr, ru, en) => en });
  const source = read('webapp/js/screens/calendar.js');
  const point = source.lastIndexOf('  return {');
  assert.ok(point > 0);
  vm.runInContext(source.slice(0, point) +
    'globalThis.fixture = { events: HIJRI_EVENTS, build: (id, lang) => { _lang = lang; return _buildQuran(HIJRI_EVENTS.find(event => event.id === id)); } };\n' + source.slice(point), context);
  const expected = { arafa:['5:3'], qurbon:['108:2'], yangi_yil:['9:36'], ashura:['2:50'], isro_meraj:['17:1'], ramazon:['2:185'], qadr:['97:3','97:4'], iyd_fitr:['2:185'] };
  for (const [eventId, references] of Object.entries(expected)) {
    const html = context.fixture.build(eventId, 'en');
    assert.deepEqual(Array.from(html.matchAll(/data-quran-verse="([^"]+)"/g), match => match[1]), references.flatMap(ref => [ref, ref]));
    assert.equal((html.match(/data-quran-language="ar"/g) || []).length, references.length);
    const arabicOnly = context.fixture.build(eventId, 'ar');
    assert.equal((arabicOnly.match(/data-quran-verse=/g) || []).length, references.length);
    const legacy = context.fixture.events.find(event => event.id === eventId).quran;
    assert.ok(!html.includes(legacy.uz));
  }
  assert.doesNotMatch(context.fixture.build('barat', 'en'), /data-quran-verse/);
});

test('Every canonical language fetches its named edition alongside exact Arabic', async () => {
  for (const [lang, edition] of Object.entries(editions)) {
    const arabic = verse('97:3', true), translated = verse('97:3');
    const harness = loader(lang, [arabic, translated]);
    await settle();
    assert.equal(arabic.children[0].textContent, 'fixture quran-uthmani 97:3');
    assert.equal(translated.children[0].textContent, `fixture ${edition} 97:3`);
    assert.equal(arabic.dataset.verseState, 'ready');
    assert.equal(translated.dataset.verseState, 'ready');
    assert.ok(harness.calls.every(url => url.endsWith('/quran-uthmani') || url.endsWith('/' + edition)));
    assert.match(translated.children[1].textContent, /^97:3 · /);
  }
});

test('Wrong source or verse never replaces a calendar quotation and retry can recover', async () => {
  for (const corrupt of [data => { data.edition.identifier = 'en.other'; }, data => { data.numberInSurah = 3; }]) {
    let healthy = false;
    const node = verse('97:4');
    loader('fr', [node], async url => response(url, healthy ? () => {} : corrupt));
    await settle();
    assert.equal(node.dataset.verseState, 'error');
    assert.equal(node.children[0].textContent, 'fr:Unavailable');
    assert.ok(!node.children.some(child => child.textContent.startsWith('fixture')));
    healthy = true;
    node.children.find(child => child.tagName === 'button').listeners.click();
    await settle();
    assert.equal(node.children[0].textContent, 'fixture fr.hamidullah 97:4');
  }
});

test('Changing UI language during Arabic fetch does not leave the original stuck loading', async () => {
  const deferred = [];
  const arabic = verse('5:3', true), translated = verse('5:3');
  const harness = loader('en', [arabic, translated], url => new Promise(resolve => deferred.push({ url, resolve })));
  harness.context.window.App.state.lang = 'fr';
  harness.listeners.languagechange();
  for (const request of deferred) request.resolve(response(request.url));
  await settle();
  assert.equal(arabic.children[0].textContent, 'fixture quran-uthmani 5:3');
  assert.equal(translated.children[0].textContent, 'fixture fr.hamidullah 5:3');
});
