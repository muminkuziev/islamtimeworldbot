const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'webapp/js/screens/qibla.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'webapp/css/reference-ui.css'), 'utf8');

test('Qibla compass background uses real MapLibre globe with a great-circle route', () => {
  assert.match(js, /_ensureRouteGlobe/);
  assert.match(js, /setProjection\(\{type:'globe'\}\)/);
  assert.match(js, /qb-globe-route/);
  assert.match(js, /_routeGeoJSON\(\)/);
  assert.match(js, /QiblaGeo\.greatCirclePoints/);
  assert.match(js, /qb-globe-you/);
  assert.match(js, /qb-globe-kaaba/);
});

test('approved compass visual uses the rotating Earth artwork', () => {
  assert.match(css, /qb-earth-spin/);
  assert.match(css, /animation:qb-earth-spin 72s/);
  assert.match(css, /qibla-earth\.png/);
});
