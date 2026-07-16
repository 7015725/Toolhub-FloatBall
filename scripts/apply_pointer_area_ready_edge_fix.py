#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re
import time

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return path.read_text(encoding="utf-8")


def write(path, text):
    path.write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s anchor count=%d" % (label, count))
    return text.replace(old, new, 1)

pointer = ROOT / "code" / "th_17_pointer.js"
position = ROOT / "code" / "th_19_position_state.js"
regressions = ROOT / "scripts" / "verify_pointer_regressions.py"

text = read(pointer)
text = replace_once(text, "// @version 1.2.9", "// @version 1.2.10", "pointer version")
old_condition = '''    pointerState.areaOcrRequested === true &&
    pointerState.areaArmReady === true &&'''
new_condition = '''    (
      pointerState.areaOcrRequested === true ||
      String(pointerState.source || "") === "edge_drag"
    ) &&
    pointerState.areaArmReady === true &&'''
text = replace_once(text, old_condition, new_condition, "edge drag ready intent")
write(pointer, text)

text = read(position)
text = replace_once(text, "// @version 1.0.12", "// @version 1.0.13", "position version")
text = replace_once(
    text,
    'var result = self.startPointerTool({ mode: "text_pick", source: "edge_drag" });',
    'var result = self.startPointerTool({ mode: "area_ocr", source: "edge_drag" });',
    "edge drag area ocr start",
)
write(position, text)

text = read(regressions)
text = replace_once(
    text,
    "def verify_pointer_core(result, pointer, ocr):",
    "def verify_pointer_core(result, pointer, ocr, position):",
    "pointer core position parameter",
)
text = replace_once(
    text,
    "    verify_pointer_core(result, pointer, ocr)",
    "    verify_pointer_core(result, pointer, ocr, position)",
    "pointer core position call",
)
anchor = '''    result.require(
        group,
        "th18 OCR extension remains",
        "pointer area_ocr patch installed" in ocr,
        "th_18 OCR extension missing",
    )
'''
addition = anchor + '''    area_ready = section(
        pointer,
        "FloatBallAppWM.prototype.isPointerAreaOcrReady = function",
        "FloatBallAppWM.prototype.createPointerCanvasView = function",
    )
    result.require(
        group,
        "edge drag keeps frame-ready color intent",
        'String(pointerState.source || "") === "edge_drag"' in area_ready
        and 'pointerState.areaArmReady === true' in area_ready
        and 'pointerState.mode === "text_pick"' in area_ready
        and 'pointerState.dragging === true' in area_ready,
        "frame-ready color must accept edge_drag sessions while preserving armed text-pick state",
    )
    result.require(
        group,
        "edge drag starts through area OCR wrapper",
        'startPointerTool({ mode: "area_ocr", source: "edge_drag" })' in position,
        "fixed-ball inward drag must mark the dual text-pick/area-OCR session",
    )
'''
text = replace_once(text, anchor, addition, "pointer regression insertion")
write(regressions, text)

manifest_path = ROOT / "manifest.json"
manifest = json.loads(read(manifest_path))
for name in ("th_17_pointer.js", "th_19_position_state.js"):
    path = ROOT / "code" / name
    data = path.read_bytes()
    head = "\n".join(read(path).splitlines()[:5])
    match = re.search(r"@version\s+(\d+\.\d+\.\d+)", head)
    if not match:
        raise SystemExit("missing version: " + name)
    manifest["files"][name] = {
        "sha256": hashlib.sha256(data).hexdigest(),
        "size": len(data),
        "version": match.group(1),
    }
manifest["version"] = int(time.strftime("%Y%m%d%H%M%S", time.gmtime()))
manifest["release"] = {
    "title": "修复框选就绪指针颜色未生效",
    "changes": ["修正悬浮球内滑框选 OCR 会话标记，使就绪指针颜色按设置生效"],
}
write(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
