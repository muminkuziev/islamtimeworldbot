/* ═══════════════════════════════════════════════════════════════
   EarthGlobe — real interactive 3D Earth (Three.js), not an image.

   Two independent instances are used on the Qibla screen:
     - mode 'route':   top of screen — frames user location + Kaaba,
                        draws the real great-circle route between them.
     - mode 'compass':  behind the SVG compass — rotates in sync with the
                        device's real compass heading (smoothed).

   Geography (marker positions, route path) comes from QiblaGeo — the same
   module the 2D compass uses — never a second calculation.
   ═══════════════════════════════════════════════════════════════ */

const EarthGlobe = (function () {

  function isSupported() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (_) { return false; }
  }

  const TEXTURE_BASE = 'assets/earth/';
  let _textureCache = null;
  function _loadTextures(loader) {
    if (_textureCache) return _textureCache;
    _textureCache = {
      map:      loader.load(TEXTURE_BASE + 'earth_atmos_2048.jpg'),
      specular: loader.load(TEXTURE_BASE + 'earth_specular_2048.jpg'),
      normal:   loader.load(TEXTURE_BASE + 'earth_normal_2048.jpg'),
    };
    return _textureCache;
  }

  /**
   * @param {HTMLElement} container
   * @param {'route'|'compass'} mode
   */
  function create(container, mode) {
    if (typeof THREE === 'undefined' || !isSupported()) return null;

    const width  = container.clientWidth  || 300;
    const height = container.clientHeight || 300;
    const RADIUS = 1;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // cap DPR for perf/battery
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const loader = new THREE.TextureLoader();
    const tex = _loadTextures(loader);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const geometry = new THREE.SphereGeometry(RADIUS, 48, 48);
    const material = new THREE.MeshPhongMaterial({
      map: tex.map,
      specularMap: tex.specular,
      normalMap: tex.normal,
      shininess: 6,
    });
    const earthMesh = new THREE.Mesh(geometry, material);
    globeGroup.add(earthMesh);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    let userMarker = null, kaabaMarker = null, routeLine = null;
    const markerGeom = new THREE.SphereGeometry(0.02, 12, 12);

    function _addMarker(lat, lon, color) {
      const p = QiblaGeo.latLonToVector3(lat, lon, RADIUS * 1.01);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(markerGeom, mat);
      mesh.position.set(p.x, p.y, p.z);
      globeGroup.add(mesh);
      return mesh;
    }

    function _drawRoute(lat1, lon1, lat2, lon2) {
      if (routeLine) { globeGroup.remove(routeLine); routeLine.geometry.dispose(); routeLine.material.dispose(); }
      const pts = QiblaGeo.greatCirclePoints(lat1, lon1, lat2, lon2, 96)
        .map(p => new THREE.Vector3(p.x * RADIUS * 1.015, p.y * RADIUS * 1.015, p.z * RADIUS * 1.015));
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0x4fcfa0, linewidth: 2 });
      routeLine = new THREE.Line(geom, mat);
      globeGroup.add(routeLine);
    }

    camera.position.z = mode === 'route' ? 2.6 : 2.2;

    // ── manual pointer-drag rotation (route mode only) — no extra library ──
    let _dragging = false, _lastX = 0, _lastY = 0;
    let _autoRotate = mode === 'route';
    if (mode === 'route') {
      const dom = renderer.domElement;
      dom.style.touchAction = 'none';
      dom.addEventListener('pointerdown', e => { _dragging = true; _autoRotate = false; _lastX = e.clientX; _lastY = e.clientY; });
      window.addEventListener('pointerup', () => { _dragging = false; });
      window.addEventListener('pointermove', e => {
        if (!_dragging) return;
        const dx = e.clientX - _lastX, dy = e.clientY - _lastY;
        _lastX = e.clientX; _lastY = e.clientY;
        globeGroup.rotation.y += dx * 0.005;
        globeGroup.rotation.x = Math.max(-1, Math.min(1, globeGroup.rotation.x + dy * 0.005));
      });
    }

    // ── compass-mode smoothed heading rotation ──
    let _targetHeadingRad = 0;
    let _currentHeadingRad = 0;

    let _visible = true;
    let _rafId = null;
    let _disposed = false;

    function _frame() {
      if (_disposed) return;
      _rafId = requestAnimationFrame(_frame);
      if (!_visible) return;

      if (mode === 'route' && _autoRotate) {
        globeGroup.rotation.y += 0.0018; // slow, calm auto-rotate — not seizure-inducing
      }
      if (mode === 'compass') {
        // Exponential smoothing (damping) so small sensor jitter doesn't
        // whip the globe around — "premium and stable", per spec.
        let delta = _targetHeadingRad - _currentHeadingRad;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // shortest signed path
        _currentHeadingRad += delta * 0.08;
        globeGroup.rotation.y = _currentHeadingRad;
      }

      renderer.render(scene, camera);
    }
    _rafId = requestAnimationFrame(_frame);

    return {
      setRoute(userLat, userLon, kaabaLat, kaabaLon) {
        if (userMarker) globeGroup.remove(userMarker);
        if (kaabaMarker) globeGroup.remove(kaabaMarker);
        userMarker  = _addMarker(userLat, userLon, 0x4fcfa0);
        kaabaMarker = _addMarker(kaabaLat, kaabaLon, 0xE8C15A);
        _drawRoute(userLat, userLon, kaabaLat, kaabaLon);

        // Frame camera so both points are reasonably visible: aim the group
        // so the midpoint of user+Kaaba faces the camera.
        const mid = QiblaGeo.latLonToVector3(
          (userLat + kaabaLat) / 2, (userLon + kaabaLon) / 2, 1
        );
        const targetRotY = Math.atan2(mid.x, mid.z);
        globeGroup.rotation.y = -targetRotY;
      },
      setHeadingDeg(deg) {
        _targetHeadingRad = -deg * Math.PI / 180;
      },
      setVisible(v) { _visible = v; },
      resize() {
        const w = container.clientWidth || width, h = container.clientHeight || height;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      },
      destroy() {
        _disposed = true;
        if (_rafId) cancelAnimationFrame(_rafId);
        geometry.dispose(); material.dispose(); markerGeom.dispose();
        if (routeLine) { routeLine.geometry.dispose(); routeLine.material.dispose(); }
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      },
    };
  }

  return { isSupported, create };
})();
