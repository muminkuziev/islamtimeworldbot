const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const qibla=fs.readFileSync('webapp/js/screens/qibla.js','utf8');
const css=fs.readFileSync('webapp/css/qibla-reference.css','utf8');
const index=fs.readFileSync('webapp/index.html','utf8');

test('Qibla map uses the previous SVG map implementation',()=>{
  assert.match(qibla,/class="qb-map-svg"/);
  assert.match(qibla,/function _updateMap\(/);
  assert.doesNotMatch(qibla,/qb-map-v7/);
  assert.doesNotMatch(qibla,/maplibregl/);
});

test('premium Qibla MapLibre styles are gone',()=>{
  assert.doesNotMatch(css,/qb-map-v7/);
  assert.doesNotMatch(css,/maplibregl-ctrl/);
});

test('MapLibre remains available globally for Nearby Mosques only',()=>{
  assert.match(index,/vendor\/maplibre\/maplibre-gl\.css/);
  assert.match(index,/js\/screens\/mosques\.js/);
  assert.match(index,/js\/screens\/qibla\.js\?v=20261004\.1/);
});
