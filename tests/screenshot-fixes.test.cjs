const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('dashboard has no section Quran verse',()=>{
  const code=fs.readFileSync('webapp/js/screens/dashboard.js','utf8');
  assert.doesNotMatch(code,/db-section-quran-verse/);
  assert.doesNotMatch(code,/data-quran-verse="94:5"/);
});

test('qazo layout keeps list before notes and full verse in lower header copy',()=>{
  const code=fs.readFileSync('webapp/js/screens/qazo.js','utf8');
  assert.match(code,/qz-header-copy/);
  assert.match(code,/qz-header-verse/);
  const list=code.indexOf('<div class="qz-list">');
  const hint=code.indexOf('<div class="qz-hint">');
  const fiqh=code.indexOf('<div class="qz-fiqh-note"');
  assert.ok(list>-1 && hint>list && fiqh>hint);
});

test('section Quran verses are not line-clamped',()=>{
  const css=fs.readFileSync('webapp/css/reference-ui.css','utf8');
  assert.match(css,/\.section-quran-verse \.verified-verse-copy[\s\S]*?-webkit-line-clamp:unset!important/);
  assert.match(css,/\.section-quran-verse \.verified-verse-copy[\s\S]*?max-height:none!important/);
});

test('prayer screen renders cached prayer times immediately before background refresh',()=>{
  const code=fs.readFileSync('webapp/js/screens/prayer.js','utf8');
  assert.match(code,/function _tryRenderPrayerCache/);
  assert.match(code,/islamtime_prayer_pt_v1/);
  assert.match(code,/islamtime_dash_pt/);
  assert.match(code,/const renderedFromCache = _tryRenderPrayerCache/);
  assert.match(code,/_fetchPrayerTimes\(lat, lon, renderedFromCache\)/);
});

test('qibla uses the shorter direction-specific verse',()=>{
  const code=fs.readFileSync('webapp/js/screens/qibla.js','utf8');
  assert.match(code,/data-quran-verse="2:149"/);
  assert.doesNotMatch(code,/data-quran-verse="2:115"/);
});

test('hadith verse is anchored low in the hero above tabs',()=>{
  const css=fs.readFileSync('webapp/css/reference-ui.css','utf8');
  assert.match(css,/#screen-hadith \.hd-hdr \.section-quran-verse[\s\S]*?position:absolute!important/);
  assert.match(css,/#screen-hadith \.hd-hdr \.section-quran-verse[\s\S]*?bottom:54px!important/);
});

test('nearby mosques uses Capacitor geolocation first and fresh v3 cache',()=>{
  const code=fs.readFileSync('webapp/js/screens/mosques.js','utf8');
  assert.match(code,/Capacitor\?\.Plugins\?\.Geolocation/);
  assert.match(code,/Capacitor\?\.isNativePlatform/);
  assert.match(code,/Geo\.getCurrentPosition/);
  assert.match(code,/navigator\.geolocation\.getCurrentPosition/);
  assert.match(code,/islamtime_mosques_' \+ _lang \+ '_v3/);
  assert.match(code,/GEO_TIMEOUT\s*=\s*15000/);
});
