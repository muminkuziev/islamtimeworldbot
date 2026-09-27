/* Offline provenance, language, and request-race tests. No religious text is generated. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const languages = ['ar','en','id','ur','bn','fr','hi','fa','tr','ru','uz','de','ms'];
const editions = {
  ar:null, en:'en.asad', id:'id.indonesian', ur:'ur.jalandhry', bn:'bn.bengali',
  fr:'fr.hamidullah', hi:'hi.hindi', fa:'fa.makarem', tr:'tr.diyanet',
  ru:'ru.kuliev', uz:'uz.sodik', de:'de.bubenheim', ms:'ms.basmeih',
};
const counts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const metadata = counts.map((numberOfAyahs, index) => ({ number:index + 1, numberOfAyahs }));
function quranContext(change = () => {}) {
  const context = vm.createContext({ window:{}, console, fetch:async url => {
    if (url.endsWith('/surah')) return { ok:true, json:async () => ({ code:200, data:metadata }) };
    const edition = url.split('/').pop();
    const data = {
      number:1, edition:{ identifier:edition },
      ayahs:Array.from({ length:7 }, (_, i) => ({ number:i+1, numberInSurah:i+1, text:`fixture ${edition} ${i+1}` })),
    };
    change(data, edition);
    return { ok:true, json:async () => ({ code:200, data }) };
  } });
  vm.runInContext(read('webapp/js/native/quran-provider.js'), context);
  return context.window.QuranProvider;
}

test('Quran has every required named edition without canonical-language fallback', async () => {
  const provider = quranContext();
  for (const lang of languages) {
    const source = provider.getSourceMeta(lang);
    assert.equal(source.edition, editions[lang]);
    assert.equal(source.is_fallback, false);
    assert.equal(source.legal_clearance, false);
    const verses = await provider.getAyahs(1, { lang });
    assert.equal(verses.length, 7);
    assert.equal(verses[0].arabic, 'fixture quran-uthmani 1');
    assert.equal(verses[0].translation, lang === 'ar' ? '' : `fixture ${editions[lang]} 1`);
  }
  await assert.rejects(provider.getAyahs(1, { lang:'missing' }), /Unsupported/);
  assert.equal(provider.getSourceMeta('id').translator, null);
  assert.equal(provider.getSourceMeta('id').translator_verification, 'unconfirmed_project_attribution');
});

test('Quran rejects wrong editions, incomplete and misaligned translation verses', async () => {
  for (const corrupt of [
    data => { data.edition.identifier = 'en.other'; },
    data => { data.ayahs.pop(); },
    data => { data.ayahs[0].number = 20; },
    data => { data.ayahs[0].text = ''; },
  ]) {
    const provider = quranContext((data, edition) => { if (edition === 'en.asad') corrupt(data); });
    await assert.rejects(provider.getAyahs(1, { lang:'en' }), /Quran/);
  }
});

test('Quran audio refuses an uninitialized or invalid verse and calculates the global ayah', async () => {
  const provider = quranContext();
  assert.throws(() => provider.getAudio(2, 1, 'mishary'), /metadata/);
  await provider.listSurahs();
  assert.match(provider.getAudio(2, 1, 'mishary'), /ar\.alafasy\/8\.mp3$/);
  assert.throws(() => provider.getAudio(2, 287, 'mishary'), /Invalid/);
});

test('Hadith provider rejects cross-language and unverified responses', async () => {
  let payload;
  const context = vm.createContext({ window:{}, URLSearchParams, fetch:async () => ({ ok:true, json:async () => payload }) });
  vm.runInContext(read('webapp/js/native/hadith-provider.js'), context);
  const provider = context.window.HadithRegistry.get('hadeethenc');
  payload = { language:'en', verified:true, hadiths:[] };
  await assert.rejects(provider.list(1, 12, 'fr'), /mismatch/);
  payload = { language:'fr', verified:false, hadiths:[] };
  await assert.rejects(provider.list(1, 12, 'fr'), /mismatch/);
  payload = { language:'fr', verified:true, hadiths:[{ language:'en', source:'hadeethenc.com', text:'fixture' }] };
  await assert.rejects(provider.list(1, 12, 'fr'), /mismatch/);
  for (const language of languages) {
    payload = { language, verified:true, hadiths:[{ language, source:'hadeethenc.com', text:'fixture' }] };
    assert.equal((await provider.list(1, 12, language)).language, language);
  }
});

function reader() {
  const pending = [], body = { innerHTML:'' }, input = { value:'' };
  const element = { innerHTML:'', querySelector:key => key === '#hd-search' ? input : body, querySelectorAll:() => [] };
  const context = vm.createContext({
    window:{ App:{ state:{ lang:'en' } }, HadithRegistry:{ get:() => ({
      list:(...args) => new Promise(resolve => pending.push({ args, resolve })),
      books:async () => ({ books:[] }),
    }) } },
    document:{ getElementById:() => element }, AbortController,
    _resolveT:(uz, cyr, ru, en) => en, t:() => 'Loading',
  });
  vm.runInContext(read('webapp/js/screens/hadith.js'), context);
  return { screen:vm.runInContext('HadithScreen', context), pending, body, input, element };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const fixture = language => ({
  hadiths:[{ id:'123', language, text:`fixture ${language}`, arabic:'fixture original', title:'fixture title',
    grade:'fixture provider grade', attribution:'fixture attribution', source:'hadeethenc.com' }], total:1, pages:1,
});
const click = (reader, props) => reader.element.onclick({ target:{ closest:() => ({ dataset:{}, ...props }) } });

test('Hadith reader keeps new language when an old response arrives later', async () => {
  const r = reader();
  r.screen.load('en'); r.screen.load('fr');
  r.pending[1].resolve(fixture('fr')); await settle();
  r.pending[0].resolve(fixture('en')); await settle();
  assert.match(r.body.innerHTML, /fixture fr/);
  assert.doesNotMatch(r.body.innerHTML, /fixture en/);
});

test('Hadith detail preserves provided grade, attribution and safe text; no invented grade', async () => {
  const r = reader(); r.screen.load('en');
  const data = fixture('en'); data.hadiths[0].text = '<fixture & text>'; data.hadiths[0].grade = '';
  r.pending[0].resolve(data); await settle();
  click(r, { dataset:{ idx:'0' } });
  assert.match(r.body.innerHTML, /&lt;fixture &amp; text&gt;/);
  assert.match(r.body.innerHTML, /fixture attribution/);
  assert.match(r.body.innerHTML, /https:\/\/hadeethenc\.com\/en\/browse\/hadith\/123/);
  assert.doesNotMatch(r.body.innerHTML, /SAHIH|Muslim|Bukhari/);
});

test('Hadith empty search leaves loading state and clearing search refetches the full collection', async () => {
  const r = reader(); r.screen.load('en'); r.pending[0].resolve(fixture('en')); await settle();
  click(r, { dataset:{ tab:'search' } }); r.input.value = 'missing';
  r.element.onsubmit({ target:{ id:'hd-search-form' }, preventDefault() {} });
  assert.equal(r.pending[1].args[3].q, 'missing');
  r.pending[1].resolve({ hadiths:[], total:0, pages:0 }); await settle();
  assert.match(r.body.innerHTML, /Hadith not found/);
  assert.doesNotMatch(r.body.innerHTML, /hd-spinner/);
  click(r, { id:'hd-search-clr' });
  assert.equal(r.pending[2].args[3].q, '');
});

test('Haramayn links never become LIVE claims from legacy API data or offline fallbacks', async () => {
  for (const offline of [false, true]) {
    const body = { innerHTML:'' };
    const element = { innerHTML:'', querySelector:key => key === '#hl-body' ? body : null, querySelectorAll:() => [] };
    const sites = ['makkah','madinah'].map((site_id, index) => ({
      site_id, status:'LIVE_EXTERNAL_ACTIVE', official_authority:'fixture authority',
      official_external_url:index ? 'https://www.youtube.com/@SaudiSunnahTv/live' : 'https://www.youtube.com/@SaudiQuranTv/live',
    }));
    const context = vm.createContext({
      window:{ App:{ state:{ lang:'en' } } }, AbortSignal,
      document:{
        getElementById:() => element,
        createElement:() => ({ textContent:'', get innerHTML() { return this.textContent; } }),
      },
      _resolveT:(uz, cyr, ru, en) => en,
      localizeRecord:record => record.en,
      fetch:async () => {
        if (offline) throw new Error('offline');
        return { ok:true, json:async () => ({ sites }) };
      },
    });
    vm.runInContext(read('webapp/js/screens/haramayn.js'), context);
    vm.runInContext('HaramaynScreen.render()', context);
    await settle();
    assert.match(body.innerHTML, /Official source available/);
    assert.match(body.innerHTML, /Live status has not been verified/);
    assert.match(body.innerHTML, /Open official source/);
    assert.doesNotMatch(body.innerHTML, /\bLIVE\b|24\/7|hl-card-badge--live/);
    assert.match(body.innerHTML, /@SaudiQuranTv\/live/);
    assert.match(body.innerHTML, /@SaudiSunnahTv\/live/);
  }
});
