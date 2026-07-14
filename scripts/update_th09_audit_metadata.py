#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "TH09_ANIMATION_AUDIT.md"

text = REPORT.read_text(encoding="utf-8")
text = text.replace("- 版本：`1.0.7`", "- 版本：`1.0.8`", 1)
text = text.replace("- 字节数：`34941`", "- 字节数：`34989`", 1)
REPORT.write_text(text, encoding="utf-8")

subprocess.run(
    ["python3", "scripts/report_th09_animation_symbols.py", "--check", "TH09_ANIMATION_AUDIT.md"],
    cwd=str(ROOT),
    check=True,
)
