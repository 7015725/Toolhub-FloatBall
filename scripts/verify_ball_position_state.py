#!/usr/bin/env python3
"""静态校验悬浮球固定位置、指针最终坐标和模块加载状态。"""

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_19_position_state.js"
OCR_MODULE = ROOT / "code" / "th_18_pointer_ocr.js"
MANIFEST = ROOT / "manifest.json"
TOOLHUB = ROOT / "ToolHub.js"

REQUIRED = [
    "// @version 1.0.1",
    "__toolHubPositionStateMachineInstalled",
    "__toolHubFixedEdgePointerPatchInstalled = true",
    "BALL_POSITION_SIDE",
    "BALL_POSITION_PERCENT",
    "proto.savePos = function()",
    "proto.cancelBallLayoutAnimation = function",
    "ballAnimationToken",
    "if (cancelled) return",
    "self.state.ballAnimator !== va",
    "proto.movePointerFromRaw = function(rawX, rawY, immediate, skipSemantic)",
    "proto.finishPointerGestureFromRaw = function",
    "movePointerFromRaw(rawX, rawY, true, true)",
    "schedulePointerInspectAsync(true, \"release_final\", true)",
    "cancelPointerSemanticUpdate",
    "__toolHubPointerSemanticSession",
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

FORBIDDEN_ES5 = {
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


def section(text: str, start: str, end: str) -> str:
    a = text.find(start)
    b = text.find(end, a + len(start)) if a >= 0 else -1
    if a < 0 or b < 0:
        fail("section markers missing: " + start + " -> " + end)
    return text[a:b]


def main() -> None:
    if not TARGET.exists():
        fail("missing code/th_19_position_state.js")
    if not OCR_MODULE.exists():
        fail("missing code/th_18_pointer_ocr.js")
    if not TOOLHUB.exists():
        fail("missing ToolHub.js")

    text = TARGET.read_text(encoding="utf-8")
    ocr = OCR_MODULE.read_text(encoding="utf-8")
    loader = TOOLHUB.read_text(encoding="utf-8")

    for marker in REQUIRED:
        if marker not in text:
            fail("missing marker: " + marker)

    for key in LEGACY_KEYS:
        if f'"{key}"' not in text:
            fail("legacy key is not pruned: " + key)

    for name, pattern in FORBIDDEN_ES5.items():
        if re.search(pattern, text, flags=re.MULTILINE):
            fail("Rhino ES5 incompatible syntax in th_19: " + name)
        if re.search(pattern, ocr, flags=re.MULTILINE):
            fail("Rhino ES5 incompatible syntax in th_18: " + name)

    touch = section(
        text,
        "proto.setupTouchListener = function",
        "proto.onScreenChangedReflow = function",
    )
    if "if (adx > slop || ady > slop)" not in touch:
        fail("touch movement threshold missing")
    inward_condition = "if (inward >= trigger && adx >= ady * 1.10)"
    if inward_condition not in touch:
        fail("inward horizontal pointer condition missing")
    condition_at = touch.index(inward_condition)
    start_at = touch.index("startPointer(rawX, rawY)", condition_at)
    condition_close_at = touch.index("}", start_at)
    if not (condition_at < start_at < condition_close_at):
        fail("pointer start is not inside inward-direction condition")
    if "self.state.ballLp.x =" in touch or "self.state.ballLp.y =" in touch:
        fail("fixed-position touch listener must not drag the ball window")
    if "onPointerBallDragEnd(rawX, rawY, action)" in touch:
        fail("touch listener still calls legacy drag-end chain")
    if "finishPointerGestureFromRaw(rawX, rawY, action)" not in touch:
        fail("touch listener does not use final raw-coordinate chain")

    finalizer = section(
        text,
        "proto.finishPointerGestureFromRaw = function",
        "proto.movePointerFromRaw = function",
    )
    if "flushPointerPositionFromBall" in finalizer:
        fail("finalizer must not derive pointer position from fixed ball")
    if finalizer.index("cancelPointerSemanticUpdate") > finalizer.index("movePointerFromRaw(rawX, rawY, true, true)"):
        fail("pending semantic task must be cancelled before final raw position")
    if "TEXT_FINAL_SCAN_FAILED" not in finalizer:
        fail("final text scan failure path missing")

    mover = section(
        text,
        "proto.movePointerFromRaw = function",
        "proto.setupTouchListener = function",
    )
    for marker in (
        "if (skipSemantic === true) return true",
        "__toolHubPointerSemanticToken",
        "__toolHubPointerSemanticSession",
        "st.inspectSession",
        "st.__toolHubPointerSemanticRunnable !== semanticRun",
    ):
        if marker not in mover:
            fail("semantic scheduling guard missing: " + marker)

    cleanup = section(
        text,
        "proto.cancelPointerSemanticUpdate = function",
        "proto.finishPointerGestureFromRaw = function",
    )
    for marker in (
        "removeCallbacks(pointerState.__toolHubPointerSemanticRunnable)",
        "__toolHubPointerSemanticPosted = false",
        "proto.removePointerCallbacks = function",
        "proto.resetPointerToolState = function",
    ):
        if marker not in cleanup:
            fail("semantic cleanup hook missing: " + marker)

    animation = section(
        text,
        "proto.animateBallLayout = function",
        "proto.applyConfiguredBallPosition = function",
    )
    if ".savePos(" in animation:
        fail("animation still persists temporary pixel coordinates")
    if animation.count("ballAnimationToken") < 4:
        fail("animation generation guard is incomplete")

    reflow = section(
        text,
        "proto.onScreenChangedReflow = function",
        "proto.scheduleScreenReflow = function",
    )
    for forbidden in ("xRatio", "yRatio", ".savePos("):
        if forbidden in reflow:
            fail("screen reflow still uses legacy coordinate mapping: " + forbidden)
    if "cancelPointerSemanticUpdate(null, \"screen_reflow\")" not in reflow:
        fail("screen reflow does not cancel pending semantic task")

    if "// @version 1.0.20" not in ocr:
        fail("th_18 version was not bumped")
    for forbidden in (
        "installFixedEdgePointer18",
        "schedulePointerMoveRaw18",
        "fixBallToEdge18",
        "pickBallSide18",
        "启动反馈：子模块加载完成",
    ):
        if forbidden in ocr:
            fail("th_18 still contains fixed-edge/timing residue: " + forbidden)
    if "installPointerPerf18(proto);" not in ocr:
        fail("th_18 performance extension missing")
    if "pointer area_ocr patch installed" not in ocr:
        fail("th_18 OCR extension missing")

    module_marker = '"th_18_pointer_ocr.js", "th_19_position_state.js"'
    if module_marker not in loader:
        fail("ToolHub module list does not load th_19 after th_18")
    if '"th_19_position_state.js": true' not in loader:
        fail("th_19 is not a critical module")
    if "function notifyToolHubModulesLoaded()" not in loader:
        fail("final module completion notifier missing")
    loop_end = loader.index("function notifyToolHubModulesLoaded()")
    module_list_at = loader.index("var modules =")
    if loop_end <= module_list_at:
        fail("module completion notifier is not after module loading")
    if loader.index("notifyToolHubModulesLoaded();") <= loop_end:
        fail("module completion notifier is not invoked after definition")

    if MANIFEST.exists():
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        files = list((data.get("files") or {}).keys())
        if "th_19_position_state.js" not in files:
            fail("manifest missing th_19_position_state.js")
        if files.index("th_19_position_state.js") <= files.index("th_18_pointer_ocr.js"):
            fail("position state module must load after pointer OCR patch")

    print(
        "OK: fixed position, final raw pointer coordinates, synchronous release scan, "
        "semantic cleanup, OCR-only th_18 and final module notification verified"
    )


if __name__ == "__main__":
    main()
