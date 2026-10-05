const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const code=fs.readFileSync('webapp/js/screens/qibla.js','utf8');
const css=fs.readFileSync('webapp/css/qibla-reference.css','utf8');

test('premium Qibla map has loading state and source disclosure',()=>{
  assert.match(code,/data-map-state="loading"/);
  assert.match(code,/qb-map-v7-loading/);
  assert.match(code,/OpenFreeMap · MapLibre/);
  assert.match(code,/dataset\.mapState = 'ready'/);
  assert.match(code,/dataset\.mapState = 'error'/);
});

test('premium Qibla map uses HTML user and Kaaba markers',()=>{
  assert.match(code,/function _mapMarkerElement/);
  assert.match(code,/new _mapV7Module\.Marker/);
  assert.match(code,/qb-map-marker--/);
  assert.match(css,/\.qb-map-marker--you/);
  assert.match(css,/\.qb-map-marker--kaaba/);
  assert.match(css,/qbMapPulse/);
});

test('route is emphasized and fit uses mobile-aware padding',()=>{
  assert.match(code,/qibla-route-glow/);
  assert.match(code,/'line-width':7\.5/);
  assert.match(code,/padding:\{top:54,right:42,bottom:66,left:42\}/);
  assert.match(code,/maxZoom:4\.8/);
});

test('map remains a real MapLibre vector globe',()=>{
  assert.match(code,/tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(code,/setProjection\(\{type:'globe'\}\)/);
  assert.match(code,/NavigationControl/);
});
