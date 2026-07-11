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
if "// @version 1.0.9" not in p19:
    fail("th19 cleanup version missing")
p14 = TH14.read_text(encoding="utf-8")
entry = ENTRY.read_text(encoding="utf-8")

for marker in (
    "// @version 1.1.33",
    "getRecentPointerPickForRelease = function",
    "var maxAge = 500",
    "restoreRecentPointerPickForRelease = function",
    "completePointerCandidateOnRelease = function",
    "TEXT_PICK_RECENT_CANDIDATE",
    "TEXT_PICK_FINAL_SCAN",
    "accessibility_recent_candidate",
    "accessibility_final_scan",
):
    if marker not in p17:
        fail("th17 marker missing: " + marker)

extract = section(p17, "FloatBallAppWM.prototype.extractCurrentPointerText = function", "FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function")
if "TEXT_HOVER_NOT_READY" in extract or "悬停时间不足" in extract:
    fail("ordinary accessibility extraction is still hover-gated")
if "completePointerCandidateOnRelease" not in extract:
    fail("ordinary extraction bypasses unified release completion")

ready = section(p17, "FloatBallAppWM.prototype.isPointerTextHoverReady = function", "FloatBallAppWM.prototype.getPointerTextHoverRemainMs = function")
if "syncPointerTextHoverFromStableHold" in ready or "areaHoldSince" in ready:
    fail("text ready visual state is still coupled to OCR hold timing")

clock = section(p19, "function nowPosition()", "function numberOr")
if "SystemClock.uptimeMillis" in clock:
    fail("th19 still uses uptimeMillis for pointer release state")
if "th17Now" not in clock and "System.currentTimeMillis" not in clock:
    fail("th19 wall-clock source missing")

finalizer = section(p19, "proto.finishPointerGestureFromRaw = function", "proto.movePointerFromRaw = function")
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
if "getRecentReadyPointerPick" in finalizer or "finishReadyPointerSnapshot" in finalizer:
    fail("release finalizer still requires a ready-only candidate")
for forbidden in (
    "getRecentReadyPointerPick",
    "restoreRecentReadyPointerPick",
    "lastValidPickReadyAt",
    "syncPointerTextHoverFromStableHold",
    "storeReadyPointerSnapshot",
    "getReadyPointerSnapshotForRelease",
    "finishReadyPointerSnapshot",
    "__toolHubReadyTextSnapshot",
    "TEXT_PICK_READY_SNAPSHOT",
    "ready_visual_snapshot",
):
    if forbidden in p17 or forbidden in p19:
        fail("obsolete ready-chain symbol remains: " + forbidden)

if "extractCurrentPointerText(true, st.releaseTs)" not in finalizer:
    fail("confirmed candidate does not use unified extraction")
if "TEXT_PICK_RECENT_CANDIDATE" not in finalizer:
    fail("recent valid candidate commit missing")

if "松手取字不受提示时间限制" not in p14:
    fail("pointer setting description does not match release behavior")
if "指针无障碍取字提交链修复" in entry or "installToolHubPointerAccessibilityTextReleaseFix" in entry:
    fail("entry-level runtime pointer patch still remains")

expected = hashlib.sha256(ENTRY.read_bytes()).hexdigest()
sha_line = ENTRY_SHA.read_text(encoding="utf-8").strip()
if expected not in sha_line:
    fail("ToolHub.js.sha256 mismatch")

print("OK pointer_source_text_release sha256=" + expected)

if "var now = th17Now();\n  }\n  pointerState.lastValidPickText" in p17:
    fail("rememberPointerValidPick contains a stray closing brace")
