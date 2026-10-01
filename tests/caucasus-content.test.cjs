const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function load(){
  const c={}; c.globalThis=c; vm.createContext(c);
  vm.runInContext(fs.readFileSync('webapp/js/caucasus-content.js','utf8')+';globalThis.__C=CAUCASUS_CONTENT;',c);
  return c.__C;
}
const duaSources=JSON.parse(fs.readFileSync('data/caucasus_dua_sources.json','utf8'));

test('Caucasus religious-content overlay has full dua/dhikr/shahada coverage',()=>{
  const c=load();
  assert.ok(c.shahada.ce && c.shahada.av);
  for(const row of duaSources){
    assert.ok(c.duas[row.id]?.ce,'missing ce dua '+row.id);
    assert.ok(c.duas[row.id]?.av,'missing av dua '+row.id);
  }
  for(const id of ['k5','k7','k2','k3','k4']){
    assert.ok(c.dhikr[id]?.ce,'missing ce dhikr '+id);
    assert.ok(c.dhikr[id]?.av,'missing av dhikr '+id);
  }
});

test('99 Names overlay is complete in both languages',()=>{
  const c=load();
  assert.equal(Object.keys(c.names).length,99);
  for(let n=1;n<=99;n++){
    for(const lang of ['ce','av']){
      const row=c.names[n]?.[lang];
      assert.ok(row,'missing '+lang+' name '+n);
      assert.ok(row.meaning?.trim(),'missing meaning '+lang+' '+n);
      assert.ok(row.desc?.trim(),'missing desc '+lang+' '+n);
    }
  }
});
