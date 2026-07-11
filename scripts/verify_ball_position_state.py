#!/usr/bin/env python3
"""静态校验悬浮球固定位置状态机。"""

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_19_position_state.js"
MANIFEST = ROOT / "manifest.json"
TOOLHUB = ROOT / "ToolHub.js"

REQUIRED = [
    "// @version 1.0.0",
    "__toolHubPositionStateMachineInstalled",
    "__toolHubFixedEdgePointerPatchInstalled = true",
    "BALL_POSITION_SIDE",
    "BALL_POSITION_PERCENT",
    "proto.savePos = function()",
    "proto.cancelBallLayoutAnimation = function",
    "ballAnimationToken",
    "if (cancelled) return",
    "self.state.ballAnimator !== va",
    "proto.movePointerFromRaw = function",
    "var inward = downSide === \"left\" ? dx : -dx",
    "adx >= ady * 1.10",
    "proto.onScreenChangedReflow = function",
    "applyConfiguredBallPosition(false, \"screen_reflow:",
    "proto.rebuildBallForNewSize = function",
    "legacy ball position fields removed",
]

LEGACY_KEYS = [
    "BALL_INIT_X",
    "BALL_INIT_Y_DP",
    "BALL_POS_SCREEN_W",
    "BALL_POS_SCREEN_H",
    "BALL_POS_X_RATIO",
    "BALL_POS_Y_RATIO",
    "BALL_POS_DOCKED",
    "BALL_POS_DOCK_SIDE",
]

FORBIDDEN = {
    "let": r"(^|[^A-Za-z0-9_$])let\s+",
    "const": r"(^|[^A-Za-z0-9_$])const\s+",
    "arrow function": r"=>",
    "class": r"(^|[^A-Za-z0-9_$])class\s+",
    "optional chaining": r"\?\.",
    "nullish coalescing": r"\?\?",
    "template literal": r"`",
}


def fail(message: str) -> None:
    raise SystemExit("FAIL: " + message)


def main() -> None:
    if not TARGET.exists():
        fail("missing code/th_19_position_state.js")

    text = TARGET.read_text(encoding="utf-8")
    for marker in REQUIRED:
        if marker not in text:
            fail("missing marker: " + marker)

    for key in LEGACY_KEYS:
        if f'"{key}"' not in text:
            fail("legacy key is not pruned: " + key)

    for name, pattern in FORBIDDEN.items():
        if re.search(pattern, text, flags=re.MULTILINE):
            fail("Rhino ES5 incompatible syntax: " + name)

    touch = text[
        text.index("proto.setupTouchListener = function"):
        text.index("proto.onScreenChangedReflow = function")
    ]
    if "if (adx > slop || ady > slop)" not in touch:
        fail("touch movement threshold missing")
    inward_at = touch.index("var inward")
    start_at = touch.index("startPointer(rawX, rawY)", inward_at)
    if inward_at > start_at:
        fail("pointer starts before inward-direction validation")
    if "self.state.ballLp.x =" in touch or "self.state.ballLp.y =" in touch:
        fail("fixed-position touch listener must not drag the ball window")

    animation = text[
        text.index("proto.animateBallLayout = function"):
        text.index("proto.applyConfiguredBallPosition = function")
    ]
    if ".savePos(" in animation:
        fail("animation still persists temporary pixel coordinates")
    if animation.count("ballAnimationToken") < 4:
        fail("animation generation guard is incomplete")

    reflow = text[
        text.index("proto.onScreenChangedReflow = function"):
        text.index("proto.scheduleScreenReflow = function")
    ]
    for forbidden in ("xRatio", "yRatio", ".savePos("):
        if forbidden in reflow:
            fail("screen reflow still uses legacy coordinate mapping: " + forbidden)

    if not TOOLHUB.exists():
        fail("missing ToolHub.js")
    loader = TOOLHUB.read_text(encoding="utf-8")
    module_marker = '"th_18_pointer_ocr.js", "th_19_position_state.js"'
    if module_marker not in loader:
        fail("ToolHub module list does not load th_19 after th_18")

    if MANIFEST.exists():
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        files = list((data.get("files") or {}).keys())
        if "th_19_position_state.js" not in files:
            fail("manifest missing th_19_position_state.js")
        if files.index("th_19_position_state.js") <= files.index("th_18_pointer_ocr.js"):
            fail("position state module must load after pointer OCR patch")

    print(
        "OK: fixed ball position, inward pointer gesture, animation generation, "
        "reflow and legacy-coordinate pruning verified"
    )


if __name__ == "__main__":
    main()
