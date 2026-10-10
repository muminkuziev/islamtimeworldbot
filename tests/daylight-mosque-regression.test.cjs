const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const css=fs.readFileSync('webapp/css/daylight-mosques.css','utf8');
const mosques=fs.readFileSync('webapp/js/screens/mosques.js','utf8');
const idx=fs.readFileSync('webapp/index.html','utf8');
const sw=fs.readFileSync('webapp/sw.js','utf8');
test('day mode light prayer settings and dark mode retained',()=>{
 assert.match(css,/html\[data-theme="light"\] #app #screen-prayer \.pm-toggle-row/);
 assert.match(css,/background:#fff!important/);
 assert.match(css,/html\[data-theme="dark"\] #app #screen-prayer \.pm-toggle-row/);
});
test('day dhikr list and cards use white surfaces and dark mode retained',()=>{
 assert.match(css,/html\[data-theme="light"\] #app #screen-dhikr \.zk-screen/);
 assert.match(css,/html\[data-theme="light"\] #app #screen-dhikr :is\(\.zk-list-tabs,\.zk-row,\.zk-list-search\)/);
});
test('mosque not-found icon is a local vector not the cartoon emoji',()=>{
 assert.match(mosques,/ms-noloc-icon ms-modern-mosque/);
 assert.match(mosques,/assets\/icons\/tabler\/mosque\.svg/);
 assert.doesNotMatch(mosques,/<div class="ms-noloc-icon">🕌<\/div>/);
 assert.match(mosques,/Yaqin atrofda masjid topilmadi/);
});
test('styles loaded and cached for offline use',()=>{
 assert.match(idx,/css\/daylight-mosques\.css\?v=/);
 assert.match(sw,/'\/css\/daylight-mosques\.css'/);
});
