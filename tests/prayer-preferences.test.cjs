const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('webapp/js/prayer-preferences.js','utf8');
function prefs(values={}) { const context={window:{},localStorage:{getItem:key=>values[key]??null},URLSearchParams}; vm.runInNewContext(source,context);return context.window.PrayerPreferences; }
test('prayer requests use the same method and school saved by Settings',()=>{const p=prefs({islamtime_method:'4',islamtime_prayer_method:'2',islamtime_madhab:'hanafi'});assert.equal(p.key(),'4:1');assert.equal(p.query(),'method=4&school=1');});
test('the default school agrees with onboarding and Settings',()=>assert.equal(prefs().key(),'3:1'));
test('non-Hanafi school and old method preferences stay supported',()=>assert.equal(prefs({islamtime_prayer_method:'2',islamtime_madhab:'shafii'}).key(),'2:0'));
test('invalid saved methods cannot reach the prayer API',()=>{for(const value of ['NaN','-1','24','1.5'])assert.equal(prefs({islamtime_method:value}).get().method,3);});
