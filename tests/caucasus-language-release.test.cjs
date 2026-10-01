const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('Chechen and Avar are enabled in the language picker, not WIP',()=>{
  const language=fs.readFileSync('webapp/js/screens/language.js','utf8');
  assert.match(language,/const WIP_LANGS = new Set\(\);/);
  assert.match(language,/l\.canonical \|\| l\.product/);
});

test('screen phrase coverage is 490 of 490 for both Caucasus languages',()=>{
  const phrases=JSON.parse(fs.readFileSync('data/ui_i18n_phrase_strings.json','utf8'));
  const c={console:{warn(){},log(){},error(){}}}; c.globalThis=c;
  vm.createContext(c);
  vm.runInContext(fs.readFileSync('webapp/js/i18n.js','utf8'),c);
  vm.runInContext(fs.readFileSync('webapp/js/caucasus-i18n.js','utf8'),c);
  for(const lang of ['ce','av']){
    const missing=phrases.filter(x=>!c.CAUCASUS_I18N.phrases[lang][x]);
    assert.equal(missing.length,0,lang+' missing: '+missing.join(', '));
  }
});

test('unknown Caucasus UI keys do not fall back to English',()=>{
  const c={console:{warn(){},log(){},error(){}}}; c.globalThis=c;
  vm.createContext(c);
  vm.runInContext(fs.readFileSync('webapp/js/i18n.js','utf8'),c);
  vm.runInContext(fs.readFileSync('webapp/js/caucasus-i18n.js','utf8'),c);
  assert.equal(c.t('nonexistent_key','ce'),c.CAUCASUS_I18N.keys.ce.translation_unavailable);
  assert.equal(c.t('nonexistent_key','av'),c.CAUCASUS_I18N.keys.av.translation_unavailable);
});
