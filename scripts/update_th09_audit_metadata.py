#!/usr/bin/env python3
"""重新生成并校验 th_09_animation.js 的确定性审计报告。"""

from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "TH09_ANIMATION_AUDIT.md"
GENERATOR = ROOT / "scripts" / "report_th09_animation_symbols.py"

subprocess.run(
    ["python3", str(GENERATOR), "--write", str(REPORT)],
    cwd=str(ROOT),
    check=True,
)
subprocess.run(
    ["python3", str(GENERATOR), "--check", str(REPORT)],
    cwd=str(ROOT),
    check=True,
)

print("OK th09 audit report regenerated and verified")
