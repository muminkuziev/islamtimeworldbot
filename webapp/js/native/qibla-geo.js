/* ═══════════════════════════════════════════════════════════════
   Qibla geographic calculations — single source of truth.

   Used by both the 2D compass (qibla.js) and the 3D globe
   (earth-globe.js) so the app never has two different Qibla
   calculation implementations disagreeing with each other.
   ═══════════════════════════════════════════════════════════════ */

const QiblaGeo = (function () {
  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;
  const EARTH_RADIUS_KM = 6371;

  function bearingToKaaba(lat, lon) {
    const lat1 = lat * Math.PI / 180, lat2 = KAABA_LAT * Math.PI / 180;
    const dLon = (KAABA_LON - lon) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function distanceToKaabaKm(lat, lon) {
    const lat1 = lat * Math.PI / 180, lat2 = KAABA_LAT * Math.PI / 180;
    const dLat = (KAABA_LAT - lat) * Math.PI / 180, dLon = (KAABA_LON - lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* lat/lon (degrees) -> unit-sphere-relative 3D point, radius r.
     Standard geographic-to-Cartesian conversion (Y up). */
  function latLonToVector3(lat, lon, r) {
    const phi   = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return {
      x: -r * Math.sin(phi) * Math.cos(theta),
      y:  r * Math.cos(phi),
      z:  r * Math.sin(phi) * Math.sin(theta),
    };
  }

  /* Great-circle path between two lat/lon points, sampled into `steps`
     points via spherical linear interpolation (slerp) of their unit
     vectors — a real geodesic, not a straight line pretending to be one. */
  function greatCirclePoints(lat1, lon1, lat2, lon2, steps) {
    const p1 = latLonToVector3(lat1, lon1, 1);
    const p2 = latLonToVector3(lat2, lon2, 1);
    const dot = Math.max(-1, Math.min(1, p1.x * p2.x + p1.y * p2.y + p1.z * p2.z));
    const omega = Math.acos(dot);
    const points = [];
    if (omega < 1e-6) return [p1, p2];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = Math.sin((1 - t) * omega) / Math.sin(omega);
      const b = Math.sin(t * omega) / Math.sin(omega);
      points.push({
        x: a * p1.x + b * p2.x,
        y: a * p1.y + b * p2.y,
        z: a * p1.z + b * p2.z,
      });
    }
    return points;
  }

  /* Shortest signed angular delta from deviceHeading to qiblaBearing,
     normalized to [-180, 180). 0 means the phone is pointed exactly at
     Qibla. Used for both the compass needle rotation and for tests — kept
     separate from the Kaaba-geometry math above since it's about the
     device's heading, not geography. */
  function headingDelta(qiblaBearingDeg, deviceHeadingDeg) {
    return ((qiblaBearingDeg - deviceHeadingDeg + 540) % 360) - 180;
  }

  return {
    KAABA_LAT, KAABA_LON, bearingToKaaba, distanceToKaabaKm,
    latLonToVector3, greatCirclePoints, headingDelta,
  };
})();
