#!/usr/bin/env python3
import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH17 = ROOT / "code" / "th_17_pointer.js"
TH19 = ROOT / "code" / "th_19_position_state.js"
TH14 = ROOT / "code" / "th_14_panels.js"
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


def section(text, start, end):
    a = text.find(start)
    b = text.find(end, a + len(start))
    if a < 0 or b < 0:
        fail("section missing: " + start)
    return text[a:b]


p17 = TH17.read_text(encoding="utf-8")
p19 = TH19.read_text(encoding="utf-8")
p14 = TH14.read_text(encoding="utf-8")
entry = ENTRY.read_text(encoding="utf-8")

for marker in (
    "// @version 1.1.35",
    "updatePointerTextStableMotion = function",
    "bindPointerTextHoverCandidate = function",
    "grantPointerTextHoverCredential = function",
    "hasPointerTextHoverCredential = function",
    "textHoverReadyKey",
    "textHoverReadyRect",
    "textHoverReadyAt",
    "lastValidPickReadyAt",
    "var maxAge = 500",
    "TEXT_HOVER_NOT_READY",
    "TEXT_POINTER_OUTSIDE_FRAME",
    "TEXT_PICK_RECENT_CANDIDATE",
    "TEXT_PICK_FINAL_SCAN",
):
    if marker not in p17:
        fail("th17 marker missing: " + marker)

extract = section(
    p17,
    "FloatBallAppWM.prototype.extractCurrentPointerText = function",
    "FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function",
)
for marker in (
    "pointerTextHotspotInsideRect",
    "hasPointerTextHoverCredential",
    "TEXT_HOVER_NOT_READY",
    "TEXT_POINTER_OUTSIDE_FRAME",
    "completePointerCandidateOnRelease",
):
    if marker not in extract:
        fail("extract gate missing: " + marker)

completion = section(
    p17,
    "FloatBallAppWM.prototype.completePointerCandidateOnRelease = function",
    "FloatBallAppWM.prototype.completePointerTextCopy = function",
)
if "hasPointerTextHoverCredential" not in completion:
    fail("unified release completion can bypass hover credential")

stable = section(
    p17,
    "FloatBallAppWM.prototype.updatePointerTextStableMotion = function",
    "FloatBallAppWM.prototype.bindPointerTextHoverCandidate = function",
)
if "areaHoldSince" in stable or "areaHoldAnchor" in stable:
    fail("text stable hover is coupled to OCR hold state")
if "textHoverReadyRect" not in stable or "leave_text_frame" not in stable:
    fail("text credential does not require staying inside the drawn frame")
if 'resetPointerTextStableHover(st, ts, hp, "leave_text_frame")' not in stable:
    fail("leaving the drawn text frame does not reset the stable timer")

binding = section(
    p17,
    "FloatBallAppWM.prototype.bindPointerTextHoverCandidate = function",
    "FloatBallAppWM.prototype.grantPointerTextHoverCredential = function",
)
for marker in (
    "textStableTargetKey",
    "stableTargetChanged",
    'resetPointerTextStableHover(pointerState, ts, hp, "target_changed")',
):
    if marker not in binding:
        fail("target-level hover identity guard missing: " + marker)

ready = section(
    p17,
    "FloatBallAppWM.prototype.isPointerTextHoverReady = function",
    "FloatBallAppWM.prototype.getPointerTextHoverRemainMs = function",
)
if "hasPointerTextHoverCredential" not in ready:
    fail("visual ready state is not backed by the business credential")
if "areaHoldSince" in ready:
    fail("text ready state is coupled to OCR timing")

recent = section(
    p17,
    "FloatBallAppWM.prototype.getRecentPointerPickForRelease = function",
    "FloatBallAppWM.prototype.restoreRecentPointerPickForRelease = function",
)
for marker in ("lastValidPickReadyAt", "lastValidPickHoverSince", "pointerRectInside"):
    if marker not in recent:
        fail("recent candidate readiness guard missing: " + marker)
if "pointerRectHitScore" in recent:
    fail("recent candidate still uses padded hit testing")

clock = section(p19, "function nowPosition()", "function numberOr")
if "SystemClock.uptimeMillis" in clock:
    fail("th19 still uses uptimeMillis for pointer release state")
if "th17Now" not in clock and "System.currentTimeMillis" not in clock:
    fail("th19 wall-clock source missing")

candidate = section(
    p19,
    "proto.pointerCandidateMatchesFinalHotspot = function",
    "proto.cancelPointerSemanticUpdate = function",
)
if "pointerRectInside" not in candidate or "pointerRectHitScore" in candidate:
    fail("final candidate is not strictly inside the drawn text frame")

move = section(
    p19,
    "proto.movePointerFromRaw = function",
    "proto.setupTouchListener = function",
)
if "updatePointerTextStableMotion(now)" not in move:
    fail("raw pointer movement does not update independent stable hover")

finalizer = section(
    p19,
    "proto.finishPointerGestureFromRaw = function",
    "proto.movePointerFromRaw = function",
)
positions = [
    finalizer.find("cancelPointerSemanticUpdate"),
    finalizer.find("invalidatePointerInspectForRelease"),
    finalizer.find("movePointerFromRaw(rawX, rawY, true, true)"),
    finalizer.find("pointerCandidateMatchesFinalHotspot"),
    finalizer.find("getRecentPointerPickForRelease"),
    finalizer.find('schedulePointerInspectAsync(true, "release_final", true)'),
]
if any(pos < 0 for pos in positions) or positions != sorted(positions):
    fail("unsafe release ordering")
if "extractCurrentPointerText(true, st.releaseTs)" not in finalizer:
    fail("confirmed candidate does not use unified credential extraction")
if "completePointerCandidateOnRelease" not in finalizer:
    fail("recent candidate does not use unified release completion")

for forbidden in (
    "getRecentReadyPointerPick",
    "restoreRecentReadyPointerPick",
    "syncPointerTextHoverFromStableHold",
    "storeReadyPointerSnapshot",
    "getReadyPointerSnapshotForRelease",
    "finishReadyPointerSnapshot",
    "__toolHubReadyTextSnapshot",
    "TEXT_PICK_READY_SNAPSHOT",
    "ready_visual_snapshot",
):
    if forbidden in p17 or forbidden in p19:
        fail("obsolete ready snapshot chain remains: " + forbidden)

if "同一文字边框内稳定悬停达到设定时间后，松手才能取字" not in p14:
    fail("pointer setting description does not match hover credential behavior")
if "指针无障碍取字提交链修复" in entry or "installToolHubPointerAccessibilityTextReleaseFix" in entry:
    fail("entry-level runtime pointer patch still remains")

expected = hashlib.sha256(ENTRY.read_bytes()).hexdigest()
sha_line = ENTRY_SHA.read_text(encoding="utf-8").strip()
if expected not in sha_line:
    fail("ToolHub.js.sha256 mismatch")

print("OK pointer_text_hover_credential sha256=" + expected)
