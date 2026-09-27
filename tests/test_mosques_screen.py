"""Exercise mosque loading, stale responses, metadata and actions in the real JS module."""
import subprocess
from pathlib import Path


def test_mosques_screen():
    root = Path(__file__).resolve().parent.parent
    result = subprocess.run(
        ["node", "--test", "tests/mosques.test.cjs"],
        cwd=root, capture_output=True, text=True, encoding="utf-8", timeout=45,
    )
    assert result.returncode == 0, result.stdout + result.stderr
