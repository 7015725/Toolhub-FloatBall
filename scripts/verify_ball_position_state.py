#!/usr/bin/env python3
"""静态校验悬浮球固定位置、最终原始坐标和屏幕重排状态。"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_19_position_state.js"
MANIFEST = ROOT / "manifest.json"
TOOLHUB = ROOT / "ToolHub.js"

REQUIRED = [
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
    "FLAG_LAYOUT_NO_LIMITS",
    "LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES",
    "cancelPointerSemanticUpdate",
    "__toolHubPointerSemanticSession",
    'var inward = downSide === "left" ? dx : -dx',
    "adx >= ady * 1.10",
    "proto.onScreenChangedReflow = function",
    'applyConfiguredBallPosition(false, "screen_reflow:',
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


def fail(message):
    raise SystemExit("FAIL: " + message)


def section(text, start, end):
    a = text.find(start)
    b = text.find(end, a + len(start)) if a >= 0 else -1
    if a < 0 or b < 0:
        fail("section markers missing: " + start + " -> " + end)
    return text[a:b]


def verify_touch_and_final_coordinates(text):
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
    cancel_at = finalizer.find("cancelPointerSemanticUpdate")
    invalidate_at = finalizer.find("invalidatePointerInspectForRelease")
    final_move_at = finalizer.find("movePointerFromRaw(rawX, rawY, true, true)")
    if min(cancel_at, invalidate_at, final_move_at) < 0:
        fail("final raw-coordinate preparation chain is incomplete")
    if not (cancel_at < invalidate_at < final_move_at):
        fail("release preparation must be cancel -> invalidate -> final raw position")


def verify_pointer_layout_and_cleanup(text):
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
        "configurePointerEdgeLayoutParams(st.lp)",
        "if (rx <= snapX) x = leftTarget",
        "else if (rx >= sw - 1 - snapX) x = rightTarget",
        "if (ry <= snapY) y = topTarget",
        "else if (ry >= sh - 1 - snapY) y = bottomTarget",
    ):
        if marker not in mover:
            fail("pointer coordinate scheduling guard missing: " + marker)

    edge_helper = section(
        text,
        "proto.configurePointerEdgeLayoutParams = function",
        "proto.cancelPointerSemanticUpdate = function",
    )
    for marker in (
        "FLAG_LAYOUT_NO_LIMITS",
        "layoutInDisplayCutoutMode",
        "proto.createPointerLayoutParams = function(st)",
    ):
        if marker not in edge_helper:
            fail("pointer edge layout helper missing: " + marker)

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
            fail("pointer coordinate cleanup hook missing: " + marker)


def verify_animation_and_reflow(text):
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
    if 'cancelPointerSemanticUpdate(null, "screen_reflow")' not in reflow:
        fail("screen reflow does not cancel pending pointer coordinate work")
    if 'applyConfiguredBallPosition(false, "screen_reflow:' not in reflow:
        fail("screen reflow does not restore the configured ball position")


def verify_module_order(loader):
    module_marker = '"th_18_pointer_ocr.js", "th_19_position_state.js"'
    if module_marker not in loader:
        fail("ToolHub module list does not load th_19 after th_18")
    if '"th_19_position_state.js": true' not in loader:
        fail("th_19 is not a critical module")

    if "function notifyToolHubModulesLoaded()" not in loader:
        fail("final module completion notifier missing")
    notifier_at = loader.index("function notifyToolHubModulesLoaded()")
    module_list_at = loader.index("var modules =")
    if notifier_at <= module_list_at:
        fail("module completion notifier is not after module loading")
    if loader.index("notifyToolHubModulesLoaded();") <= notifier_at:
        fail("module completion notifier is not invoked after definition")


def verify_manifest_order():
    if not MANIFEST.exists():
        return
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    files = list((data.get("files") or {}).keys())
    if "th_19_position_state.js" not in files:
        fail("manifest missing th_19_position_state.js")
    if "th_18_pointer_ocr.js" not in files:
        fail("manifest missing th_18_pointer_ocr.js")
    if files.index("th_19_position_state.js") <= files.index("th_18_pointer_ocr.js"):
        fail("position state module must load after pointer OCR patch")


def main():
    for path in (TARGET, TOOLHUB):
        if not path.exists():
            fail("missing " + str(path.relative_to(ROOT)))

    text = TARGET.read_text(encoding="utf-8")
    loader = TOOLHUB.read_text(encoding="utf-8")

    for marker in REQUIRED:
        if marker not in text:
            fail("missing marker: " + marker)
    for key in LEGACY_KEYS:
        if '"' + key + '"' not in text:
            fail("legacy key is not pruned: " + key)

    verify_touch_and_final_coordinates(text)
    verify_pointer_layout_and_cleanup(text)
    verify_animation_and_reflow(text)
    verify_module_order(loader)
    verify_manifest_order()

    print(
        "OK ball_position_state fixed_edge=1 final_raw=1 edge_layout=1 "
        "animation=1 reflow=1 module_order=1"
    )
    return 0


if __name__ == "__main__":
    main()
