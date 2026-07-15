#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parent / "verify_coloros_rhino_color_safety.py"
text = path.read_text(encoding="utf-8")
old = '    "不会自动运行。结果保存到 ToolHub/diagnostics/color-safety-last.json，可复制摘要",'
new = '    "两项都只手动运行，不保存设置、不附着新窗口",'
if old not in text:
    raise SystemExit("old diagnostic description contract missing")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("settings interaction diagnostic description contract updated")
