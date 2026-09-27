const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../webapp/js/screens/mosques.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const mosque = (name = 'Test mosque', lat = 52.23, lon = 21.02, tags = {}) => ({lat, lon, tags: {name, ...tags}});

function harness(values = {}) {
  const storage = new Map(Object.entries({islamtime_last_lat:'52.2297', islamtime_last_lon:'21.0122', ...values}));
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {innerHTML:'', textContent:'', listeners:{}, classList:{contains:()=>false,add(){},remove(){}}, addEventListener(type,fn){this.listeners[type]=fn;},querySelector:node,querySelectorAll:()=>[]});
    return nodes.get(id);
  }
  const requests = [];
  const context = {console, AbortController, AbortSignal, setTimeout, clearTimeout, Date,
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
    document:{getElementById:node}, navigator:{}, normalizeLanguage:x=>x,
    _resolveT:(_uz,_cyr,_ru,en)=>en, t:key=>key,
    window:{App:{state:{lang:'en'},navigate(){}},ThemeEngine:{refresh(){},setLocation(){}}},
    fetch:(url,options)=>url.includes('overpass') ? new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})) : Promise.resolve({ok:true,json:async()=>({address:{city:'Test city'}})})};
  vm.createContext(context);
  vm.runInContext(source+'\nglobalThis.screen = MosquesScreen;',context);
  return {screen:context.screen,storage,requests,body:()=>node('#ms-body').innerHTML,
    respond:async (index,elements,extra={})=>{requests[index].resolve({ok:true,json:async()=>({elements,...extra})});await tick();},
    click:(selector,dataset={})=>node('#ms-body').listeners.click({target:{closest:key=>key===selector?{dataset}:null}})};
}

test('hidden render does not make a duplicate network request; three results display immediately',async()=>{
  const h=harness();h.screen.render();assert.equal(h.requests.length,0);h.screen.load('en');
  assert.match(h.body(),/mosques_loading/);
  await h.respond(0,[mosque(),mosque('Second',52.24),mosque('Third',52.25)]);
  assert.equal(h.requests.length,1);assert.equal((h.body().match(/class="ms-card"/g)||[]).length,3);
  assert.doesNotMatch(h.body(),/13:15|Congregation|Available/);
  assert.match(h.body(),/destination=52.23,21.02/);
});

test('network error has Retry and never claims a successful empty search',async()=>{
  const h=harness();h.screen.load('en');h.requests[0].reject(new Error('network'));await tick();
  assert.match(h.body(),/mosques_load_error/);assert.doesNotMatch(h.body(),/No mosques found/);
  h.click('#ms-retry');assert.equal(h.requests.length,2);await h.respond(1,[mosque()]);
  assert.match(h.body(),/Test mosque/);assert.doesNotMatch(h.body(),/mosques_load_error/);
});

test('empty successful search offers explicit radius widening; partial server response is error',async()=>{
  const h=harness();h.screen.load('en');await h.respond(0,[]);
  assert.match(h.body(),/No mosques found/);assert.match(h.body(),/10 km radius/);
  h.click('.ms-radius-btn',{radius:'25000'});assert.match(decodeURIComponent(h.requests[1].options.body),/around:25000/);
  await h.respond(1,[],{remark:'runtime timeout'});assert.match(h.body(),/mosques_load_error/);
});

test('old response cannot overwrite results after language or location reload',async()=>{
  const h=harness();h.screen.load('en');h.screen.load('uz');
  assert.equal(h.requests[0].options.signal.aborted,true);
  await h.respond(1,[mosque('Current')]);await h.respond(0,[mosque('Obsolete')]);
  assert.match(h.body(),/Current/);assert.doesNotMatch(h.body(),/Obsolete/);
});

test('zero coordinates are valid and saved mosque toggles persist across reloads',async()=>{
  const h=harness({islamtime_last_lat:'0',islamtime_last_lon:'0'});h.screen.load('en');
  assert.match(decodeURIComponent(h.requests[0].options.body),/around:10000,0,0/);
  await h.respond(0,[mosque('Equator mosque',0,0.001,{'prayer:friday':'12:30'})]);
  assert.match(h.body(),/12:30/);h.click('.ms-save-btn',{saveIdx:'0'});assert.match(h.body(),/aria-pressed="true"/);
  h.screen.load('en');assert.match(h.body(),/aria-pressed="true"/);
  await h.respond(1,[mosque('Equator mosque',0,0.001)]);
  h.click('.ms-save-btn',{saveIdx:'0'});assert.match(h.body(),/aria-pressed="false"/);
});

test('cached results from another location are ignored',async()=>{
  const h=harness({islamtime_mosques_en_v2:JSON.stringify({lat:41,lon:69,savedAt:Date.now(),mosques:[{lat:41,lon:69,name:'Wrong city'}]})});
  h.screen.load('en');assert.doesNotMatch(h.body(),/Wrong city/);await h.respond(0,[mosque('Current city')]);
  assert.match(h.body(),/Current city/);
});
