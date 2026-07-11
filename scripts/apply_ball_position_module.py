#!/usr/bin/env python3
"""将固定位置状态模块加入 ToolHub 子模块加载顺序。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ToolHub.js"
OLD = '"th_15_extra.js", "th_16_entry.js", "th_17_pointer.js", "th_18_pointer_ocr.js"];'
NEW = '"th_15_extra.js", "th_16_entry.js", "th_17_pointer.js", "th_18_pointer_ocr.js", "th_19_position_state.js"];'

text = TARGET.read_text(encoding="utf-8")
if NEW in text:
    print("ToolHub module list already updated")
elif text.count(OLD) == 1:
    TARGET.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")
    print("ToolHub module list updated")
else:
    raise SystemExit("unexpected ToolHub module list")
