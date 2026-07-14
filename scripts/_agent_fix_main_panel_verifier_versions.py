#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for path in sorted((ROOT / "scripts").glob("verify_main_panel_*.py")):
    text = path.read_text(encoding="utf-8")
    text = text.replace("1.1.8", "1.1.9")
    text = text.replace("1.0.4", "1.0.5")
    text = text.replace("1.5.0", "1.5.1")
    text = text.replace("1.1.13", "1.1.14")
    path.write_text(text, encoding="utf-8", newline="\n")
print("OK synchronized all main-panel verifier versions")
