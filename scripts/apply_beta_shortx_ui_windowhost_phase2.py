#!/usr/bin/env python3
"""Decode and execute the deterministic ShortXUI WindowHost phase-2 generator."""
from pathlib import Path
import base64

ROOT = Path(__file__).resolve().parents[1]
PARTS = [
    ROOT / "scripts/bootstrap/shortx_ui_windowhost_phase2.part01",
    ROOT / "scripts/bootstrap/shortx_ui_windowhost_phase2.part02",
    ROOT / "scripts/bootstrap/shortx_ui_windowhost_phase2.part04",
    ROOT / "scripts/bootstrap/shortx_ui_windowhost_phase2.part05",
    ROOT / "scripts/bootstrap/shortx_ui_windowhost_phase2.part06",
]

payload = "".join(path.read_text(encoding="utf-8").strip() for path in PARTS)
source = base64.b64decode(payload.encode("ascii")).decode("utf-8")
exec(compile(source, str(ROOT / "scripts/apply_beta_shortx_ui_windowhost_phase2.generated.py"), "exec"))
