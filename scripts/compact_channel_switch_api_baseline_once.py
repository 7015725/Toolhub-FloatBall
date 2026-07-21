#!/usr/bin/env python3
"""Regenerate the compact API baseline after the channel-switch scope review."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELF = ROOT / "scripts/compact_channel_switch_api_baseline_once.py"
subprocess.run([
    "python3", str(ROOT / "scripts/generate_api_usage_baseline.py"),
    "--baseline", "constraints/API_USAGE_BASELINE.json"
], cwd=str(ROOT), check=True)
if SELF.exists():
    SELF.unlink()
print("Regenerated compact API usage baseline")
