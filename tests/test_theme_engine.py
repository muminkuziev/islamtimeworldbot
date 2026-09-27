"""Run the real browser theme engine's solar/lifecycle regressions in Node."""
import subprocess
from pathlib import Path


def test_solar_theme_engine():
    root = Path(__file__).resolve().parent.parent
    result = subprocess.run(
        ["node", "--test", "tests/theme.test.cjs"],
        cwd=root, capture_output=True, text=True, encoding="utf-8", timeout=45,
    )
    assert result.returncode == 0, result.stdout + result.stderr
