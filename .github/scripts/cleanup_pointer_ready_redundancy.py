#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TH17 = ROOT / "code" / "th_17_pointer.js"
TH19 = ROOT / "code" / "th_19_position_state.js"
VERIFY_POSITION = ROOT / "scripts" / "verify_ball_position_state.py"
VERIFY_RELEASE = ROOT / "scripts" / "verify_pointer_text_release.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one occurrence, got %s" % (label, count))
    return text.replace(old, new, 1)


def remove_section(text, start_marker, end_marker, label):
    start = text.find(start_marker)
    end = text.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0 or end <= start:
        raise SystemExit("%s: section not found" % label)
    return text[:start] + text[end:]


def remove_exact_lines(text, lines):
    for line in lines:
        if line not in text:
            raise SystemExit("missing line: %s" % line.strip())
        text = text.replace(line, "", 1)
    return text


# th_17_pointer.js：移除旧 ready-only 候选缓存与未使用的 OCR 悬停复用函数。
th17 = TH17.read_text(encoding="utf-8")
th17 = replace_once(th17, "// @version 1.1.31", "// @version 1.1.32", "th17 version")
th17 = replace_once(
    th17,
    "FloatBallAppWM.prototype.rememberPointerValidPick = function(st, ready) {",
    "FloatBallAppWM.prototype.rememberPointerValidPick = function(st) {",
    "rememberPointerValidPick signature",
)
th17 = remove_exact_lines(th17, [
    '  if (String(pointerState.lastValidPickKey || "") !== key) {\n',
    '    pointerState.lastValidPickReadyAt = 0;\n',
    '  }\n',
    '  if (ready === true) pointerState.lastValidPickReadyAt = now;\n',
])
th17 = remove_section(
    th17,
    "FloatBallAppWM.prototype.getRecentReadyPointerPick = function",
    "FloatBallAppWM.prototype.getRecentPointerPickForRelease = function",
    "old recent ready candidate helpers",
)
th17 = remove_exact_lines(th17, [
    '      lastValidPickReadyAt: 0,\n',
    '  st.lastValidPickReadyAt = 0;\n',
])
th17 = replace_once(
    th17,
    "this.rememberPointerValidPick(st, this.isPointerTextHoverReady(now) === true)",
    "this.rememberPointerValidPick(st)",
    "inspect valid candidate remember",
)
th17 = replace_once(
    th17,
    "this.rememberPointerValidPick(st, true)",
    "this.rememberPointerValidPick(st)",
    "ready visual valid candidate refresh",
)
th17 = remove_section(
    th17,
    "FloatBallAppWM.prototype.syncPointerTextHoverFromStableHold = function",
    "FloatBallAppWM.prototype.isPointerTextHoverReady = function",
    "unused OCR hold to text hover bridge",
)
for forbidden in (
    "getRecentReadyPointerPick",
    "restoreRecentReadyPointerPick",
    "lastValidPickReadyAt",
    "syncPointerTextHoverFromStableHold",
):
    if forbidden in th17:
        raise SystemExit("th17 legacy symbol remains: " + forbidden)
TH17.write_text(th17, encoding="utf-8")

# th_19_position_state.js：移除已不参与松手提交的绿色就绪快照子系统。
th19 = TH19.read_text(encoding="utf-8")
th19 = replace_once(th19, "// @version 1.0.8", "// @version 1.0.9", "th19 version")
th19 = remove_section(
    th19,
    "  proto.storeReadyPointerSnapshot = function",
    "  proto.pointerCandidateMatchesFinalHotspot = function",
    "unused ready visual snapshot subsystem",
)
th19 = remove_exact_lines(th19, [
    '          st.__toolHubReadyTextSnapshot = null;\n',
])
for forbidden in (
    "storeReadyPointerSnapshot",
    "getReadyPointerSnapshotForRelease",
    "finishReadyPointerSnapshot",
    "__toolHubReadyTextSnapshot",
    "__toolHubReadySnapshotVisualWrapped",
    "TEXT_PICK_READY_SNAPSHOT",
    "ready_visual_snapshot",
):
    if forbidden in th19:
        raise SystemExit("th19 legacy symbol remains: " + forbidden)
TH19.write_text(th19, encoding="utf-8")

# 更新既有状态机验证：删除对旧实现的正向要求，改为明确禁止回归。
vp = VERIFY_POSITION.read_text(encoding="utf-8")
vp = replace_once(vp, '    "// @version 1.0.8",', '    "// @version 1.0.9",', "verify th19 version")
vp = replace_once(vp, '        "// @version 1.1.31",', '        "// @version 1.1.32",', "verify th17 version")
vp = remove_exact_lines(vp, [
    '    "proto.storeReadyPointerSnapshot = function",\n',
    '    "proto.getReadyPointerSnapshotForRelease = function",\n',
    '    "proto.finishReadyPointerSnapshot = function",\n',
    '    "TEXT_PICK_READY_SNAPSHOT",\n',
    '    "ready_visual_snapshot",\n',
    '    "return this.completePointerTextCopy(",\n',
    '        "proto.storeReadyPointerSnapshot = function(st)",\n',
    '        "proto.getReadyPointerSnapshotForRelease = function(st)",\n',
    '        "proto.finishReadyPointerSnapshot = function(st, snapshot)",\n',
    '        "__toolHubReadyTextSnapshot",\n',
    '        "st.__toolHubReadyTextSnapshot = null",\n',
    '        "getRecentReadyPointerPick",\n',
    '        "restoreRecentReadyPointerPick",\n',
    '        "lastValidPickReadyAt",\n',
    '        "lastValidPickReadyAt",\n',
    '        "syncPointerTextHoverFromStableHold",\n',
    '        "pointer text hover reuse stable hold",\n',
])
vp = remove_section(
    vp,
    "    stable_hover = section(\n",
    "    ready_section = section(\n",
    "obsolete stable hover verifier",
)
insert_anchor = '    if "areaHoldDelay: 2000" not in pointer_core:\n        fail("pointer state area hover default is not 2000ms")\n'
legacy_guard = '''    for forbidden in (
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
        if forbidden in pointer_core or forbidden in text:
            fail("obsolete pointer ready-chain symbol remains: " + forbidden)

'''
vp = replace_once(vp, insert_anchor, insert_anchor + legacy_guard, "legacy ready-chain guard insertion")
VERIFY_POSITION.write_text(vp, encoding="utf-8")

# 更新专用取字回归验证。
vr = VERIFY_RELEASE.read_text(encoding="utf-8")
vr = replace_once(vr, '    "// @version 1.1.31",', '    "// @version 1.1.32",', "release verify th17 version")
version_anchor = 'p19 = TH19.read_text(encoding="utf-8")\n'
vr = replace_once(
    vr,
    version_anchor,
    version_anchor + 'if "// @version 1.0.9" not in p19:\n    fail("th19 cleanup version missing")\n',
    "release verify th19 version",
)
forbidden_anchor = 'if "getRecentReadyPointerPick" in finalizer or "finishReadyPointerSnapshot" in finalizer:\n    fail("release finalizer still requires a ready-only candidate")\n'
forbidden_block = '''for forbidden in (
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

'''
vr = replace_once(vr, forbidden_anchor, forbidden_anchor + forbidden_block, "release legacy guard")
VERIFY_RELEASE.write_text(vr, encoding="utf-8")

print("pointer ready-chain redundancy cleanup applied")
