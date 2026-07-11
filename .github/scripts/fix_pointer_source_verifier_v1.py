#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[2] / "scripts" / "verify_ball_position_state.py"
text = path.read_text(encoding="utf-8")
old = '    "// @version 1.0.7",'
new = '    "// @version 1.0.8",'
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit("position verifier version marker missing")
path.write_text(text, encoding="utf-8")
print("pointer position verifier version updated")
