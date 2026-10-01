const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const i18nCode = fs.readFileSync('webapp/js/i18n.js','utf8');
const caucasusCode = fs.readFileSync('webapp/js/caucasus-i18n.js','utf8');
const keyRows = JSON.parse(fs.readFileSync('data/ui_i18n_key_strings.json','utf8'));

function ctx() {
  const context = { console:{ warn(){}, log(){}, error(){} } };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(i18nCode + ';globalThis.__LANG_META=LANG_META;', context);
  vm.runInContext(caucasusCode, context);
  return context;
}

test('Chechen and Avar are recognized product languages', () => {
  const c = ctx();
  assert.equal(c.normalizeLanguage('ce'), 'ce');
  assert.equal(c.normalizeLanguage('av'), 'av');
  const ce = c.__LANG_META.find(x => x.code === 'ce');
  const av = c.__LANG_META.find(x => x.code === 'av');
  assert.equal(ce.product, true);
  assert.equal(av.product, true);
});

test('all extracted core I18N keys have ce and av translations', () => {
  const c = ctx();
  for (const row of keyRows) {
    assert.ok(c.CAUCASUS_I18N.keys.ce[row.key], 'missing ce key: ' + row.key);
    assert.ok(c.CAUCASUS_I18N.keys.av[row.key], 'missing av key: ' + row.key);
    if (row.key !== 'bismillah') {
      assert.notEqual(c.t(row.key,'ce'), row.en, 'ce fallback leaked: ' + row.key);
      assert.notEqual(c.t(row.key,'av'), row.en, 'av fallback leaked: ' + row.key);
    }
  }
});

test('_resolveT uses Caucasus phrase layer and never English fallback', () => {
  const c = ctx();
  c.CAUCASUS_I18N.phrases.ce.Back = 'Юха';
  c.CAUCASUS_I18N.phrases.av.Back = 'Нахъе';
  assert.equal(c._resolveT('Orqaga','Орқага','Назад','Back','ce'),'Юха');
  assert.equal(c._resolveT('Orqaga','Орқага','Назад','Back','av'),'Нахъе');
});
