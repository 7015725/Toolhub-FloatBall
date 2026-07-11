#!/usr/bin/env python3
"""按正常参考实现恢复最近有效候选提交，并简化剪贴板完成链。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
POSITION = ROOT / "code" / "th_19_position_state.js"
VERIFY = ROOT / "scripts" / "verify_ball_position_state.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, got %d" % (label, count))
    return text.replace(old, new, 1)


def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    b = text.find(end, a + len(start)) if a >= 0 else -1
    if a < 0 or b < 0 or b <= a:
        raise SystemExit(label + ": section markers not found")
    return text[:a] + replacement + text[b:]


def patch_pointer():
    text = POINTER.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.1.27", "// @version 1.1.28", "pointer version")

    stable_clipboard = r'''FloatBallAppWM.prototype.copyPointerTextToClipboard = function(textValue) {
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
  if (!text) return false;
  try {
    var appCtx = null;
    try {
      if (typeof context !== "undefined" && context) appCtx = context;
    } catch (eCtx0) {}
    if (!appCtx) {
      try { appCtx = android.app.ActivityThread.currentApplication(); } catch (eCtx1) { appCtx = null; }
    }
    if (!appCtx) return false;
    var cm = appCtx.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
    if (!cm) return false;
    var clip = android.content.ClipData.newPlainText("ToolHub指针取字", text);
    cm.setPrimaryClip(clip);
    return true;
  } catch (e0) {
    try { safeLog(this.L, 'e', "copyPointerTextToClipboard fail: " + String(e0)); } catch (eLog) {}
  }
  return false;
};

FloatBallAppWM.prototype.rememberPointerValidPick = function(st, ready) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;

  var key = String(pointerState.currentKey || this.pointerTextKeyOf({
    text: pointerState.currentText,
    rect: pointerState.currentRect
  }));
  if (!key) return false;
  var now = th17Now();
  if (String(pointerState.lastValidPickKey || "") !== key) {
    pointerState.lastValidPickReadyAt = 0;
  }
  pointerState.lastValidPickText = String(pointerState.currentText);
  pointerState.lastValidPickRect = th17RectObj(pointerState.currentRect);
  pointerState.lastValidPickKey = key;
  pointerState.lastValidPickAt = now;
  pointerState.lastValidPickSession = Number(pointerState.inspectSession || 0);
  if (ready === true) pointerState.lastValidPickReadyAt = now;
  return true;
};

FloatBallAppWM.prototype.getRecentReadyPointerPick = function(st, atTs) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.lastValidPickText || !pointerState.lastValidPickRect) return null;
  if (Number(pointerState.lastValidPickSession || 0) !== Number(pointerState.inspectSession || 0)) return null;
  if (!pointerState.lastValidPickReadyAt || Number(pointerState.lastValidPickReadyAt || 0) <= 0) return null;

  var now = Number(atTs || th17Now());
  if (isNaN(now) || now <= 0) now = th17Now();
  var hoverLimit = 800;
  try { hoverLimit = Number(this.getPointerTextHoverLimitMs()); } catch (eLimit) { hoverLimit = 800; }
  if (isNaN(hoverLimit) || hoverLimit < 0) hoverLimit = 800;
  var maxAge = Math.max(1800, Math.min(6000, hoverLimit * 4));
  var age = now - Number(pointerState.lastValidPickAt || 0);
  if (age < 0 || age > maxAge) return null;

  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
  if (!hp) return null;
  var hit = false;
  try { hit = this.pointerRectHitScore(hp.x, hp.y, pointerState.lastValidPickRect) >= 0; }
  catch (eHit) { hit = false; }
  if (!hit) return null;

  return {
    text: String(pointerState.lastValidPickText),
    rect: th17RectObj(pointerState.lastValidPickRect),
    key: String(pointerState.lastValidPickKey || ""),
    hitAt: Number(pointerState.lastValidPickAt || 0),
    readyAt: Number(pointerState.lastValidPickReadyAt || 0),
    session: Number(pointerState.lastValidPickSession || 0)
  };
};

FloatBallAppWM.prototype.restoreRecentReadyPointerPick = function(st, atTs) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState) return false;
  var recent = this.getRecentReadyPointerPick(pointerState, atTs);
  if (!recent) return false;

  pointerState.currentText = String(recent.text);
  pointerState.currentRect = th17RectObj(recent.rect);
  pointerState.currentKey = String(recent.key || "");
  pointerState.hoverKey = pointerState.currentKey;
  var hoverLimit = 800;
  try { hoverLimit = Number(this.getPointerTextHoverLimitMs()); } catch (eLimit) { hoverLimit = 800; }
  if (isNaN(hoverLimit) || hoverLimit < 0) hoverLimit = 800;
  pointerState.hoverSince = Math.max(1, Number(recent.readyAt || th17Now()) - hoverLimit);
  try { this.showPointerAreaFrame(pointerState.currentRect, "text_hit"); } catch (eFrame) {}
  try { this.updatePointerVisualHot(true); } catch (eHot) {}
  return true;
};

FloatBallAppWM.prototype.completePointerTextCopy = function(textValue, rect, successCode, extraData) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return false;
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
  if (!text || !rect) return false;

  // 参考正常实现：无障碍取到文字即代表 text_pick 成功。
  // 剪贴板只是附加动作，不能反过来把已识别文字判为失败。
  var copied = this.copyPointerTextToClipboard(text) === true;
  var data = {};
  try {
    if (extraData) {
      for (var k in extraData) data[k] = extraData[k];
    }
  } catch (eData) {}
  data.clipboardAccepted = copied === true;

  this.setPointerToolResult({
    ok: true,
    type: "text_pick",
    code: String(successCode || "TEXT_PICK_SUCCESS"),
    message: copied ? "取字并复制成功" : "取字成功，但复制到剪贴板失败",
    value: text,
    clipboard: copied === true,
    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    data: data
  });
  try { this.toast(copied ? "已复制: " + text : "已取字，但复制失败"); } catch (eToast) {}
  try { this.closePointerTool(copied ? "已复制到剪贴板" : "取字完成", true); } catch (eClose) {}
  return true;
};

'''
    text = replace_between(
        text,
        "FloatBallAppWM.prototype.getPointerClipboardContexts = function() {",
        "FloatBallAppWM.prototype.ensurePointerToolState = function() {",
        stable_clipboard,
        "clipboard and recent-pick block",
    )

    text = replace_once(
        text,
        '''      currentText: "",\n      currentRect: null,\n      currentKey: "",\n      boundText: "",\n''',
        '''      currentText: "",\n      currentRect: null,\n      currentKey: "",\n      lastValidPickText: "",\n      lastValidPickRect: null,\n      lastValidPickKey: "",\n      lastValidPickAt: 0,\n      lastValidPickReadyAt: 0,\n      lastValidPickSession: 0,\n      boundText: "",\n''',
        "pointer state recent fields",
    )

    text = replace_once(
        text,
        '''  st.currentText = "";\n  st.currentRect = null;\n  st.currentKey = "";\n  st.boundText = "";\n''',
        '''  st.currentText = "";\n  st.currentRect = null;\n  st.currentKey = "";\n  st.lastValidPickText = "";\n  st.lastValidPickRect = null;\n  st.lastValidPickKey = "";\n  st.lastValidPickAt = 0;\n  st.lastValidPickReadyAt = 0;\n  st.lastValidPickSession = Number(st.inspectSession || 0);\n  st.boundText = "";\n''',
        "reset recent fields",
    )

    text = replace_once(
        text,
        '''    st.boundKey = key;\n    st.boundAt = now;\n    this.refreshPointerTextReadyVisualState();\n''',
        '''    st.boundKey = key;\n    st.boundAt = now;\n    try { this.rememberPointerValidPick(st, this.isPointerTextHoverReady(now) === true); } catch (eRemember) {}\n    this.refreshPointerTextReadyVisualState();\n''',
        "remember valid accessibility hit",
    )

    text = replace_once(
        text,
        '''  var ready = this.isPointerTextHoverReady(th17Now()) === true;\n  try { this.showPointerAreaFrame(st.currentRect, ready ? "text_hit" : "text_hover"); } catch(eFrameReady) {}\n''',
        '''  var ready = this.isPointerTextHoverReady(th17Now()) === true;\n  if (ready) {\n    try { this.rememberPointerValidPick(st, true); } catch (eRememberReady) {}\n  }\n  try { this.showPointerAreaFrame(st.currentRect, ready ? "text_hit" : "text_hover"); } catch(eFrameReady) {}\n''',
        "remember ready visual hit",
    )

    text = replace_once(
        text,
        '''  if (skipInspect !== true) this.updatePointerInspect(true);\n  if (!st.currentText || !st.currentRect) {\n''',
        '''  if (skipInspect !== true) this.updatePointerInspect(true);\n  if (!st.currentText || !st.currentRect) {\n    try { this.restoreRecentReadyPointerPick(st, hoverAtTs); } catch (eRestoreRecent) {}\n  }\n  if (!st.currentText || !st.currentRect) {\n''',
        "extract recent fallback",
    )

    text = replace_once(
        text,
        '''  if (st.currentText && st.currentRect) {\n    this.extractCurrentPointerText(true, releaseTs);\n    return;\n  }\n\n  // W5：如果 final scan 是预算耗尽，不再报告为空白处松手。\n''',
        '''  if (!st.currentText || !st.currentRect) {\n    try { this.restoreRecentReadyPointerPick(st, releaseTs); } catch (eRestoreRelease) {}\n  }\n  if (st.currentText && st.currentRect) {\n    this.extractCurrentPointerText(true, releaseTs);\n    return;\n  }\n\n  // W5：如果 final scan 是预算耗尽，不再报告为空白处松手。\n''',
        "release recent fallback",
    )

    required = (
        "// @version 1.1.28",
        "copyPointerTextToClipboard = function",
        "cm.setPrimaryClip(clip)",
        "rememberPointerValidPick",
        "getRecentReadyPointerPick",
        "restoreRecentReadyPointerPick",
        "lastValidPickReadyAt",
        "取字成功，但复制到剪贴板失败",
        "data.clipboardAccepted = copied === true",
    )
    for marker in required:
        if marker not in text:
            raise SystemExit("pointer required marker missing: " + marker)
    for forbidden in (
        "runPointerClipboardOnMain",
        "writePointerClipboardMainSync",
        "copyPointerTextToClipboardVerified",
        "clipboardCopyToken",
        "clipboardCopyPending",
        "clipboardReadbackMatched",
    ):
        if forbidden in text:
            raise SystemExit("obsolete clipboard marker remains: " + forbidden)

    POINTER.write_text(text, encoding="utf-8")


def patch_position():
    text = POSITION.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.0.4", "// @version 1.0.5", "position version")

    text = replace_once(
        text,
        '''    var readySnapshot = null;\n    try { readySnapshot = this.getReadyPointerSnapshotForRelease(st); } catch (eReadySnapshot) { readySnapshot = null; }\n\n    this.cancelPointerSemanticUpdate(st, "pointer_release");\n''',
        '''    var readySnapshot = null;\n    try { readySnapshot = this.getReadyPointerSnapshotForRelease(st); } catch (eReadySnapshot) { readySnapshot = null; }\n    var recentReadyPick = null;\n    try {\n      if (this.getRecentReadyPointerPick) recentReadyPick = this.getRecentReadyPointerPick(st, nowPosition());\n    } catch (eRecentPick) { recentReadyPick = null; }\n\n    this.cancelPointerSemanticUpdate(st, "pointer_release");\n''',
        "capture recent ready pick",
    )

    text = replace_once(
        text,
        '''    if (st.mode === "text_pick" && readySnapshot) {\n      st.dragging = false;\n      try {\n        logPosition(this, "i",\n          "pointer release commit ready visual snapshot age=" +\n          String(nowPosition() - Number(readySnapshot.readyAt || 0))\n        );\n      } catch (eReadyLog) {}\n      return this.finishReadyPointerSnapshot(st, readySnapshot);\n    }\n\n    if (!this.movePointerFromRaw(rawX, rawY, true, true)) return false;\n''',
        '''    if (st.mode === "text_pick" && readySnapshot) {\n      st.dragging = false;\n      try {\n        logPosition(this, "i",\n          "pointer release commit ready visual snapshot age=" +\n          String(nowPosition() - Number(readySnapshot.readyAt || 0))\n        );\n      } catch (eReadyLog) {}\n      return this.finishReadyPointerSnapshot(st, readySnapshot);\n    }\n\n    // 参考正常独立实现的 commitRecentPick：松手时优先提交最近一次已进入\n    // 可取字状态的有效候选，不让一次空扫描或状态清理推翻已显示的绿色结果。\n    if (st.mode === "text_pick" && recentReadyPick) {\n      st.dragging = false;\n      try {\n        if (this.restoreRecentReadyPointerPick(st, st.releaseTs)) {\n          logPosition(this, "i",\n            "pointer release commit recent ready pick age=" +\n            String(nowPosition() - Number(recentReadyPick.hitAt || 0))\n          );\n          return this.extractCurrentPointerText(true, st.releaseTs).ok === true;\n        }\n      } catch (eRecentCommit) {\n        logPosition(this, "e", "recent ready pointer commit fail: " + String(eRecentCommit));\n      }\n    }\n\n    if (!this.movePointerFromRaw(rawX, rawY, true, true)) return false;\n''',
        "commit recent ready pick",
    )

    for marker in (
        "// @version 1.0.5",
        "var recentReadyPick = null",
        "getRecentReadyPointerPick(st, nowPosition())",
        "restoreRecentReadyPointerPick(st, st.releaseTs)",
        "pointer release commit recent ready pick age=",
    ):
        if marker not in text:
            raise SystemExit("position required marker missing: " + marker)

    POSITION.write_text(text, encoding="utf-8")


def patch_verify():
    text = VERIFY.read_text(encoding="utf-8")
    text = replace_once(text, '"// @version 1.0.4",', '"// @version 1.0.5",', "verify position version")

    text = replace_once(
        text,
        '''    snapshot_at = finalizer.index("getReadyPointerSnapshotForRelease")\n    invalidate_at = finalizer.index("invalidatePointerInspectForRelease")\n    snapshot_finish_at = finalizer.index("finishReadyPointerSnapshot")\n    final_move_at = finalizer.index("movePointerFromRaw(rawX, rawY, true, true)")\n    if not (snapshot_at < invalidate_at < snapshot_finish_at < final_move_at):\n        fail("ready visual snapshot must be captured and committed before final raw move")\n''',
        '''    snapshot_at = finalizer.index("getReadyPointerSnapshotForRelease")\n    recent_at = finalizer.index("getRecentReadyPointerPick")\n    invalidate_at = finalizer.index("invalidatePointerInspectForRelease")\n    snapshot_finish_at = finalizer.index("finishReadyPointerSnapshot")\n    recent_finish_at = finalizer.index("restoreRecentReadyPointerPick")\n    final_move_at = finalizer.index("movePointerFromRaw(rawX, rawY, true, true)")\n    if not (snapshot_at < recent_at < invalidate_at < snapshot_finish_at < recent_finish_at < final_move_at):\n        fail("ready snapshot and recent valid pick must be committed before final raw move")\n''',
        "verify recent release order",
    )

    old_clipboard_checks = '''    for marker in (\n        "// @version 1.1.27",\n        "runPointerClipboardOnMain",\n        "android.os.Looper.getMainLooper()",\n        "java.util.concurrent.CountDownLatch",\n        "writePointerClipboardMainSync",\n        "completePointerTextCopy",\n        "clipboardAccepted: true",\n        "clipboardReadbackMatched",\n        "CLIPBOARD_WRITE_FAILED",\n        "accessibility_current",\n        "small_area_fallback",\n    ):\n        if marker not in pointer_core:\n            fail("main-thread clipboard flow missing: " + marker)\n'''
    new_clipboard_checks = '''    for marker in (\n        "// @version 1.1.28",\n        "copyPointerTextToClipboard = function",\n        "cm.setPrimaryClip(clip)",\n        "rememberPointerValidPick",\n        "getRecentReadyPointerPick",\n        "restoreRecentReadyPointerPick",\n        "lastValidPickReadyAt",\n        "completePointerTextCopy",\n        "data.clipboardAccepted = copied === true",\n        "accessibility_current",\n        "small_area_fallback",\n    ):\n        if marker not in pointer_core:\n            fail("reference-compatible text-pick flow missing: " + marker)\n'''
    text = replace_once(text, old_clipboard_checks, new_clipboard_checks, "verify reference clipboard markers")

    start = text.find('    clipboard_section = section(\n')
    end_marker = '    fallback = section(\n'
    end = text.find(end_marker, start)
    if start < 0 or end < 0:
        raise SystemExit("verify clipboard behavior section not found")
    new_behavior = '''    clipboard_section = section(\n        pointer_core,\n        "FloatBallAppWM.prototype.copyPointerTextToClipboard = function",\n        "FloatBallAppWM.prototype.ensurePointerToolState = function",\n    )\n    for forbidden in (\n        "runPointerClipboardOnMain",\n        "writePointerClipboardMainSync",\n        "copyPointerTextToClipboardVerified",\n        "clipboardCopyToken",\n        "clipboardCopyPending",\n        "clipboardReadbackMatched",\n        "java.util.concurrent.CountDownLatch",\n    ):\n        if forbidden in clipboard_section:\n            fail("obsolete clipboard completion gate remains: " + forbidden)\n    if "cm.setPrimaryClip(clip)" not in clipboard_section:\n        fail("stable direct clipboard write is missing")\n    complete = section(\n        pointer_core,\n        "FloatBallAppWM.prototype.completePointerTextCopy = function",\n        "FloatBallAppWM.prototype.ensurePointerToolState = function",\n    )\n    if "ok: true" not in complete or "clipboard: copied === true" not in complete:\n        fail("accessibility success is still incorrectly gated by clipboard result")\n    recent = section(\n        pointer_core,\n        "FloatBallAppWM.prototype.rememberPointerValidPick = function",\n        "FloatBallAppWM.prototype.completePointerTextCopy = function",\n    )\n    for marker in (\n        "lastValidPickText",\n        "lastValidPickRect",\n        "lastValidPickReadyAt",\n        "lastValidPickSession",\n        "pointerRectHitScore",\n    ):\n        if marker not in recent:\n            fail("recent valid-pick cache is incomplete: " + marker)\n'''
    text = text[:start] + new_behavior + text[end:]

    text = replace_once(
        text,
        '''    if "completePointerTextCopy(" not in extract_section:\n        fail("extractCurrentPointerText does not use verified clipboard completion")\n''',
        '''    if "restoreRecentReadyPointerPick" not in extract_section:\n        fail("extractCurrentPointerText does not restore the recent ready candidate")\n    if "completePointerTextCopy(" not in extract_section:\n        fail("extractCurrentPointerText does not use the unified text completion path")\n''',
        "verify extract recent fallback",
    )

    VERIFY.write_text(text, encoding="utf-8")


def main():
    patch_pointer()
    patch_position()
    patch_verify()
    print("pointer reference release patch applied")


if __name__ == "__main__":
    main()
