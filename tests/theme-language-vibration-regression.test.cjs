const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('product languages expose exactly 15, including Chechen and Avar, preserving 13 core translations',()=>{
 const c={console:{warn(){},log(){},error(){}}}; c.globalThis=c;
 vm.createContext(c);
 vm.runInContext(fs.readFileSync('webapp/js/i18n.js','utf8'),c);
 const data=vm.runInContext('({core:CANONICAL_LANGS.length, product:PRODUCT_LANGS.length, ce:PRODUCT_LANGS.includes("ce"),av:PRODUCT_LANGS.includes("av")})',c);
 assert.equal(data.core,13); // original shared translation source editions still 13
 assert.equal(data.product,15);
 assert.ok(data.ce && data.av);
 const settings=fs.readFileSync('webapp/js/screens/settings.js','utf8');
 assert.doesNotMatch(settings,/CANONICAL_LANGS\.length/);
 assert.match(settings,/PRODUCT_LANGS\.length/);
});

test('all 13 localized landing messages report 15 product languages',()=>{
 const text=fs.readFileSync('webapp/js/landing-i18n.js','utf8');
 const claims=[...text.matchAll(/langs:'([^']+)'/g)].map(x=>x[1]);
 assert.equal(claims.length,13);
 for(const claim of claims) {
   assert.ok(/15|१५|۱۵|١٥|১৫/.test(claim),'not 15: '+claim);
   assert.ok(!/13|१३|۱۳|١٣|১৩/.test(claim),'old 13: '+claim);
 }
});

const dhikr=fs.readFileSync('webapp/js/screens/dhikr.js','utf8').replace(/\r\n/g,'\n');
const start=dhikr.indexOf('  function _vibrate(milestone) {');
const end=dhikr.indexOf('\n  }\n',start)+5;
assert.ok(start>0&&end>start+200);
const fn=dhikr.slice(start,end)+'\n_vibrate';

test('native tasbih vibration delegates to Capacitor instead of navigator',()=>{
 const events=[];
 const context={window:{Capacitor:{isNativePlatform:()=>true},IslamHaptics:{vibrate:(m)=>events.push(m)}},navigator:{vibrate(){throw Error('unexpected fallback')}}};
 const vibrate=vm.runInNewContext(fn,context);
 assert.equal(vibrate(false),true);
 assert.equal(vibrate(true),true);
 assert.deepEqual(events,[false,true]);
});

test('Telegram tasbih uses Telegram haptics, regular web uses navigator fallback',()=>{
 const hits=[];
 const context={window:{Capacitor:{isNativePlatform:()=>false},Telegram:{WebApp:{initData:'signed-fixture',HapticFeedback:{impactOccurred:(s)=>hits.push(s)}}}},navigator:{vibrate:()=>false}};
 const vibrate=vm.runInNewContext(fn,context);
 assert.equal(vibrate(false),true); assert.equal(vibrate(true),true);
 assert.deepEqual(hits,['medium','heavy']);
 context.window.Telegram.WebApp.initData='';
 const durations=[];context.navigator.vibrate=v=>{durations.push(v);return true};
 assert.equal(vibrate(false),true);
 assert.deepEqual(durations,[45]);
});

test('tasbih vibration preference gates tap and persisted switch is accessible',()=>{
 assert.match(dhikr,/if \(_vib\) _vibrate\(isMilestone\)/);
 assert.match(dhikr,/id="zk-vib" role="switch" aria-checked=/);
 assert.match(dhikr,/if \(_vib\) _vibrate\(false\);/);
});

test('theme remediation CSS covers prayer light and dark, names photo hero contrast',()=>{
 const css=fs.readFileSync('webapp/css/readability-fixes.css','utf8');
 assert.match(css,/html\[data-theme="light"\] #app #screen-prayer/);
 assert.match(css,/html\[data-theme="dark"\] #app #screen-prayer/);
 assert.match(css,/#screen-names .nm-header .section-quran-verse/);
 const index=fs.readFileSync('webapp/index.html','utf8');
 assert.match(index,/css\/readability-fixes\.css/);
});
