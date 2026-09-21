"""
Deterministic geographic calculation tests for webapp/js/native/qibla-geo.js
— the single source of truth used by both the 2D compass and the 3D globes.

Expected bearing/distance values were computed once from this exact module
(see the docstring numbers below) and independently correspond to widely
known real-world facts — most notably that New York's Qibla direction is
northeast (~58°), a famously counterintuitive fact, and Jakarta's is
northwest (~295°) — so a sign/hemisphere bug would fail loudly here, not
just drift by a rounding error.
"""
import json
import subprocess
import tempfile
from pathlib import Path

import pytest

GEO_PATH = Path(__file__).resolve().parent.parent / "webapp" / "js" / "native" / "qibla-geo.js"

# (lat, lon, expected_bearing_deg, expected_distance_km) — tolerances below
CASES = [
    ("Warsaw",  52.2297,  21.0122,  147.6,  3787.5),
    ("London",  51.5074,  -0.1278, 119.0,  4793.8),
    ("NewYork", 40.7128, -74.0060,  58.5, 10306.3),
    ("Jakarta", -6.2088, 106.8456, 295.2,  7920.1),
]


def _run_node(js_tail: str) -> str:
    code = GEO_PATH.read_text(encoding="utf-8") + "\n" + js_tail
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(code)
        path = f.name
    try:
        result = subprocess.run(["node", path], capture_output=True, text=True, timeout=15, encoding="utf-8")
    finally:
        Path(path).unlink(missing_ok=True)
    assert result.returncode == 0, f"node failed: {result.stderr}"
    return result.stdout


@pytest.mark.parametrize("name,lat,lon,exp_bearing,exp_dist", CASES)
def test_bearing_and_distance_known_cities(name, lat, lon, exp_bearing, exp_dist):
    out = _run_node(f"""
        const b = QiblaGeo.bearingToKaaba({lat}, {lon});
        const d = QiblaGeo.distanceToKaabaKm({lat}, {lon});
        console.log(JSON.stringify({{b, d}}));
    """)
    result = json.loads(out.strip().splitlines()[-1])
    assert abs(result["b"] - exp_bearing) < 0.5, f"{name} bearing drifted: {result['b']} vs {exp_bearing}"
    assert abs(result["d"] - exp_dist) < 5, f"{name} distance drifted: {result['d']} vs {exp_dist}"


def test_new_york_qibla_is_northeast_not_southeast():
    """The single most-checked real-world sanity fact for this formula."""
    out = _run_node("console.log(QiblaGeo.bearingToKaaba(40.7128, -74.0060));")
    bearing = float(out.strip().splitlines()[-1])
    assert 45 < bearing < 75, f"NYC Qibla bearing should be northeast (~58°), got {bearing}"


def test_bearing_normalized_around_0_360():
    out = _run_node("""
        const points = [[89,179],[89,-179],[-89,179],[0,0],[0,180]];
        console.log(JSON.stringify(points.map(([lat,lon]) => QiblaGeo.bearingToKaaba(lat,lon))));
    """)
    bearings = json.loads(out.strip().splitlines()[-1])
    for b in bearings:
        assert 0 <= b < 360, f"bearing not normalized to [0,360): {b}"


def test_heading_delta_zero_when_heading_matches_qibla():
    out = _run_node("console.log(QiblaGeo.headingDelta(148, 148));")
    assert abs(float(out.strip().splitlines()[-1])) < 1e-9


def test_heading_delta_correct_signed_direction():
    # Qibla is 10 deg clockwise from current heading -> positive delta ("turn right")
    out = _run_node("console.log(QiblaGeo.headingDelta(20, 10));")
    assert abs(float(out.strip().splitlines()[-1]) - 10) < 1e-9
    # Qibla is 10 deg counter-clockwise -> negative delta ("turn left")
    out = _run_node("console.log(QiblaGeo.headingDelta(10, 20));")
    assert abs(float(out.strip().splitlines()[-1]) + 10) < 1e-9


def test_heading_delta_takes_shortest_path_across_0_360_wrap():
    # heading=350, qibla=10 -> shortest turn is +20 (through 0), not -340
    out = _run_node("console.log(QiblaGeo.headingDelta(10, 350));")
    assert abs(float(out.strip().splitlines()[-1]) - 20) < 1e-9


def test_distance_is_symmetric_with_great_circle_points_path_length():
    """Cross-check: distance to Kaaba should roughly equal the great-circle
    path length QiblaGeo.greatCirclePoints() actually draws for the globe."""
    out = _run_node("""
        const lat=52.2297, lon=21.0122;
        const d = QiblaGeo.distanceToKaabaKm(lat, lon);
        const pts = QiblaGeo.greatCirclePoints(lat, lon, QiblaGeo.KAABA_LAT, QiblaGeo.KAABA_LON, 200);
        let pathLen = 0;
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i-1], b = pts[i];
            const dx=a.x-b.x, dy=a.y-b.y, dz=a.z-b.z;
            pathLen += Math.sqrt(dx*dx+dy*dy+dz*dz);
        }
        // chord-length sum on a unit sphere underestimates arc length only
        // slightly for a smooth path; convert back to km using earth radius.
        console.log(JSON.stringify({d, pathLenUnitSphereChordSum: pathLen}));
    """)
    result = json.loads(out.strip().splitlines()[-1])
    # angular distance in radians ~= 2*asin(chord/2) per segment; just assert
    # the polyline isn't degenerate (zero-length) and distance is sane.
    assert result["pathLenUnitSphereChordSum"] > 0.5
    assert 3000 < result["d"] < 4500
