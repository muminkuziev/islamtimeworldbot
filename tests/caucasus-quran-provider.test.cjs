const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const code = fs.readFileSync('webapp/js/native/quran-provider.js','utf8');
const counts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const metadata = counts.map((numberOfAyahs,index)=>({number:index+1,numberOfAyahs}));

function context() {
  const calls = [];
  const ctx = vm.createContext({
    window:{}, console,
    fetch: async url => {
      calls.push(String(url));
      if (String(url).endsWith('/surah')) {
        return {ok:true,json:async()=>({code:200,data:metadata})};
      }
      if (String(url).includes('api.quran.com/api/v4/verses/by_chapter/1')) {
        return {ok:true,json:async()=>({verses:Array.from({length:7},(_,i)=>({
          id:i+1, verse_number:i+1, verse_key:`1:${i+1}`,
          text_uthmani:`AR ${i+1}`,
          translations:[{resource_id:106,text:`CE ${i+1}<sup foot_note=1>1</sup>`}]
        }))})};
      }
      const edition = String(url).split('/').pop();
      return {ok:true,json:async()=>({code:200,data:{
        number:1,edition:{identifier:edition},
        ayahs:Array.from({length:7},(_,i)=>({number:i+1,numberInSurah:i+1,text:`fixture ${edition} ${i+1}`}))
      }})};
    }
  });
  vm.runInContext(code,ctx);
  return {provider:ctx.window.QuranProvider,calls};
}

test('Chechen Quran uses verified Quran.com resource 106', async () => {
  const {provider,calls} = context();
  const verses = await provider.getAyahs(1,{lang:'ce'});
  assert.equal(verses.length,7);
  assert.equal(verses[0].arabic,'AR 1');
  assert.equal(verses[0].translation,'CE 1');
  assert.ok(calls.some(url=>url.includes('translations=106')));
  const src=provider.getSourceMeta('ce');
  assert.equal(src.provider,'Quran.com (api.quran.com)');
  assert.equal(src.resource_id,106);
  assert.equal(src.translator,'Magomed Magomedov');
  assert.equal(src.is_fallback,false);
  assert.equal(src.translation_available,true);
});

test('Avar Quran remains Arabic-only and never falls back to another translation', async () => {
  const {provider,calls} = context();
  const verses = await provider.getAyahs(1,{lang:'av'});
  assert.equal(verses.length,7);
  assert.equal(verses[0].arabic,'fixture quran-uthmani 1');
  assert.equal(verses[0].translation,'');
  assert.equal(calls.some(url=>/ru\.|en\.|uz\./.test(url)),false);
  const src=provider.getSourceMeta('av');
  assert.equal(src.provider,'canonical Arabic (Uthmani)');
  assert.equal(src.translation_available,false);
  assert.equal(src.verification,'arabic_only');
  assert.equal(src.is_fallback,false);
});
