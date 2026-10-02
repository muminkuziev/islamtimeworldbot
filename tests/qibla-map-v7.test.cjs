const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('Qibla map v7 uses real MapLibre vector map instead of legacy SVG diagram',()=>{
  const code=fs.readFileSync('webapp/js/screens/qibla.js','utf8');
  assert.match(code,/id="qb-map-v7"/);
  assert.match(code,/import\('\/vendor\/maplibre\/maplibre-gl\.mjs'\)/);
  assert.match(code,/https:\/\/tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(code,/QiblaGeo\.greatCirclePoints/);
  assert.match(code,/new maplibregl\.NavigationControl/);
  assert.match(code,/new maplibregl\.GlobeControl/);
  assert.match(code,/setProjection\(\{type:'globe'\}\)/);
  assert.match(code,/pitch:48/);
  assert.doesNotMatch(code,/class="qb-map-svg"/);
});

test('Map v7 local runtime assets and CSS exist',()=>{
  for(const p of [
    'webapp/vendor/maplibre/maplibre-gl.css',
    'webapp/vendor/maplibre/maplibre-gl.mjs',
    'webapp/vendor/maplibre/maplibre-gl-shared.mjs',
    'webapp/vendor/maplibre/maplibre-gl-worker.mjs',
  ]) assert.ok(fs.existsSync(p),p);
  const css=fs.readFileSync('webapp/css/qibla-reference.css','utf8');
  assert.match(css,/\.qb-map-v7-shell/);
  assert.match(css,/\.qb-map-v7-actions/);
});

test('service worker precaches the local map runtime',()=>{
  const sw=fs.readFileSync('webapp/sw.js','utf8');
  assert.match(sw,/maplibre-gl\.mjs/);
  assert.match(sw,/maplibre-gl-worker\.mjs/);
  assert.match(sw,/maplibre-gl-shared\.mjs/);
});
