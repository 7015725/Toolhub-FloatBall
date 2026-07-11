#!/usr/bin/env python3
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


text = ENTRY.read_text(encoding="utf-8")
start = text.find("// =======================【指针无障碍取字提交链修复】")
end = text.find("proto.__toolHubPointerReleaseFixInstalled = true;", start)
if start < 0 or end < 0:
    fail("pointer release fix block missing")
block = text[start:end]

required = [
    "java.lang.System.currentTimeMillis()",
    "normalizePointerReleaseTs",
    "getRecentPointerPickForRelease",
    "var graceMs = 500",
    "restorePointerPickForRelease",
    "completePointerCandidateOnRelease",
    "TEXT_PICK_CONFIRMED_CANDIDATE",
    "TEXT_PICK_RECENT_CANDIDATE",
    "TEXT_PICK_FINAL_SCAN",
    "accessibility_confirmed_candidate",
    "accessibility_recent_candidate",
    "accessibility_final_scan",
    "movePointerFromRaw(rawX, rawY, true, true)",
    "schedulePointerInspectAsync(true, \"release_final\", true)",
    "松手取字不受提示时间限制",
]
for marker in required:
    if marker not in block:
        fail("missing marker: " + marker)

if "SystemClock.uptimeMillis" in block:
    fail("release fix still uses uptimeMillis")

extract = block[block.find("proto.extractCurrentPointerText = function"):block.find("var oldFinishPointerTextPickAfterReleaseFix")]
if "TEXT_HOVER_NOT_READY" in extract or "悬停时间不足" in extract:
    fail("ordinary text extraction is still hover-gated")
if "completePointerCandidateOnRelease" not in extract:
    fail("ordinary text extraction does not use unified completion")

finalizer = block[block.find("proto.finishPointerGestureFromRaw = function"):block.find("if (typeof proto.getPointerSettingsBlocks")]
order = [
    finalizer.find("cancelPointerSemanticUpdate"),
    finalizer.find("invalidatePointerInspectForRelease"),
    finalizer.find("movePointerFromRaw(rawX, rawY, true, true)"),
    finalizer.find("pointerCandidateMatchesFinalHotspot"),
    finalizer.find("getRecentPointerPickForRelease"),
    finalizer.find("schedulePointerInspectAsync(true, \"release_final\", true)"),
]
if any(pos < 0 for pos in order) or order != sorted(order):
    fail("release finalizer order is unsafe")

if "isPointerTextHoverReady(st.releaseTs) === true" not in finalizer:
    fail("hover readiness is not retained as diagnostic visual state")

expected = hashlib.sha256(ENTRY.read_bytes()).hexdigest()
sha_line = ENTRY_SHA.read_text(encoding="utf-8").strip()
if expected not in sha_line:
    fail("ToolHub.js.sha256 mismatch after pointer fix")

print("OK pointer_text_release_fix sha256=" + expected)
