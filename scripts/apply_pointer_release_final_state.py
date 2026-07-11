#!/usr/bin/env python3
"""Apply the reviewed pointer release/final-position fixes."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, got {count}")
    return text.replace(old, new, 1)


def remove_between(text: str, start: str, end: str, label: str) -> str:
    a = text.find(start)
    b = text.find(end, a + len(start)) if a >= 0 else -1
    if a < 0 or b < 0 or b <= a:
        raise SystemExit(f"{label}: markers not found")
    return text[:a] + end + text[b + len(end):]


def patch_th18() -> None:
    path = ROOT / "code" / "th_18_pointer_ocr.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.0.19", "// @version 1.0.20", "th18 version")
    text = replace_once(
        text,
        "// 状态补丁：拖动悬浮球时球体固定边缘，指针跟随手指；识别只使用最终拖动位置；指针热点四边统一渐进贴边；支持设置页调整贴边范围。",
        "// 状态职责：本模块只保留 OCR 与指针性能扩展；固定位置和触摸状态由 th_19_position_state.js 统一负责。",
        "th18 responsibility comment",
    )

    text = remove_between(
        text,
        "  function pickBallSide18(appObj) {",
        "  function installPointerPerf18(proto) {",
        "remove legacy fixed-edge helpers",
    )
    text = remove_between(
        text,
        "  function installFixedEdgePointer18(proto) {",
        "  function getMainHandler18(appObj) {",
        "remove legacy fixed-edge installer",
    )

    text = text.replace("        installPointerPerf18(proto);\n        installFixedEdgePointer18(proto);\n", "        installPointerPerf18(proto);\n")
    text = text.replace("      installPointerPerf18(proto);\n      installFixedEdgePointer18(proto);\n", "      installPointerPerf18(proto);\n")

    notice_marker = "\n// =======================【启动反馈：子模块加载完成】======================="
    notice_at = text.find(notice_marker)
    if notice_at < 0:
        raise SystemExit("th18 startup notice marker not found")
    text = text[:notice_at].rstrip() + "\n"

    forbidden = [
        "installFixedEdgePointer18",
        "schedulePointerMoveRaw18",
        "pickBallSide18",
        "fixBallToEdge18",
        "启动反馈：子模块加载完成",
    ]
    for item in forbidden:
        if item in text:
            raise SystemExit("th18 forbidden residue: " + item)

    path.write_text(text, encoding="utf-8")


def patch_th19() -> None:
    path = ROOT / "code" / "th_19_position_state.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.0.0", "// @version 1.0.1", "th19 version")

    methods = r'''
  proto.cancelPointerSemanticUpdate = function(st, reason) {
    var pointerState = st || null;
    try {
      if (!pointerState && this.ensurePointerToolState) pointerState = this.ensurePointerToolState();
    } catch (eState) { pointerState = null; }
    if (!pointerState) return false;

    pointerState.__toolHubPointerSemanticToken = Number(pointerState.__toolHubPointerSemanticToken || 0) + 1;
    try {
      if (pointerState.handler && pointerState.__toolHubPointerSemanticRunnable) {
        pointerState.handler.removeCallbacks(pointerState.__toolHubPointerSemanticRunnable);
      }
    } catch (eRemove) {}
    pointerState.__toolHubPointerSemanticRunnable = null;
    pointerState.__toolHubPointerSemanticPosted = false;
    try {
      if (reason) logPosition(this, "d", "cancel pointer semantic update reason=" + String(reason));
    } catch (eLog) {}
    return true;
  };

  if (typeof proto.removePointerCallbacks === "function" && proto.__toolHubPointerSemanticCleanupWrapped !== true) {
    var oldRemovePointerCallbacksPosition = proto.removePointerCallbacks;
    proto.removePointerCallbacks = function(st) {
      try { this.cancelPointerSemanticUpdate(st, "pointer_close"); } catch (eCancel) {}
      return oldRemovePointerCallbacksPosition.call(this, st);
    };

    if (typeof proto.resetPointerToolState === "function") {
      var oldResetPointerToolStatePosition = proto.resetPointerToolState;
      proto.resetPointerToolState = function(st, mode, source) {
        try { this.cancelPointerSemanticUpdate(st, "pointer_reset"); } catch (eCancelReset) {}
        var ret = oldResetPointerToolStatePosition.call(this, st, mode, source);
        try {
          st.__toolHubPointerSemanticSession = Number(st.inspectSession || 0);
          st.__toolHubPointerSemanticToken = Number(st.__toolHubPointerSemanticToken || 0) + 1;
          st.__toolHubPointerSemanticPosted = false;
          st.__toolHubPointerSemanticRunnable = null;
        } catch (eInitSemantic) {}
        return ret;
      };
    }
    proto.__toolHubPointerSemanticCleanupWrapped = true;
  }

  proto.finishPointerGestureFromRaw = function(rawX, rawY, action) {
    var st = null;
    try { st = this.ensurePointerToolState ? this.ensurePointerToolState() : null; } catch (eState) { st = null; }
    if (!st || !st.active || st.closed) return false;

    this.cancelPointerSemanticUpdate(st, "pointer_release");
    if (!this.movePointerFromRaw(rawX, rawY, true, true)) return false;
    st.releaseTs = nowPosition();

    if (action === android.view.MotionEvent.ACTION_CANCEL) {
      st.dragging = false;
      try { this.setPointerToolResult({ ok: false, type: "cancel", code: "ACTION_CANCEL", message: "指针取消" }); } catch (eResult) {}
      try { this.toast("指针已取消"); } catch (eToast) {}
      try { this.closePointerTool("ACTION_CANCEL", true); } catch (eClose) {}
      return true;
    }

    if (st.mode === "area_capture") {
      try { this.updatePointerAreaSelection(); } catch (eAreaUpdate) {}
      st.dragging = false;
      try { this.finishPointerAreaCapture(); } catch (eAreaFinish) {
        logPosition(this, "e", "final area capture fail: " + String(eAreaFinish));
        return false;
      }
      return true;
    }

    if (st.mode === "text_pick") {
      st.dragging = false;
      var scheduled = false;
      try { scheduled = this.schedulePointerInspectAsync(true, "release_final", true) === true; }
      catch (eFinalScan) { logPosition(this, "e", "final pointer scan fail: " + String(eFinalScan)); }
      if (!scheduled && st.active && !st.closed) {
        try {
          this.setPointerToolResult({
            ok: false,
            type: "pointer_error",
            code: "TEXT_FINAL_SCAN_FAILED",
            message: "最终取字扫描失败",
            value: ""
          });
          this.toast("最终取字扫描失败");
          this.closePointerTool("最终取字扫描失败", true);
        } catch (eFallback) {}
      }
      return scheduled;
    }

    st.dragging = false;
    return false;
  };

'''
    marker = "  proto.movePointerFromRaw = function(rawX, rawY, immediate) {"
    if marker not in text:
        raise SystemExit("th19 movePointerFromRaw marker missing")
    text = text.replace(marker, methods + "  proto.movePointerFromRaw = function(rawX, rawY, immediate, skipSemantic) {", 1)

    visual_marker = '''      if (immediate === true || now - lastVisual >= 12) {
        st.__toolHubPointerVisualAt = now;
        st.lp.x = st.pendingPointerX;
        st.lp.y = st.pendingPointerY;
        try { if (st.root && st.wm) st.wm.updateViewLayout(st.root, st.lp); } catch (eVisual) {}
      }

'''
    visual_replacement = visual_marker + "      if (skipSemantic === true) return true;\n\n"
    text = replace_once(text, visual_marker, visual_replacement, "th19 skip semantic insertion")

    semantic_start = "      if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());\n"
    semantic_end = "      return true;\n    } catch (eMove) {"
    a = text.find(semantic_start, text.find("proto.movePointerFromRaw"))
    b = text.find(semantic_end, a)
    if a < 0 or b < 0:
        raise SystemExit("th19 semantic scheduling block not found")
    semantic_new = r'''      if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
      if (st.__toolHubPointerSemanticPosted === true) return true;
      st.__toolHubPointerSemanticPosted = true;
      var self = this;
      var delay = st.mode === "area_capture" ? 18 : 24;
      var semanticToken = Number(st.__toolHubPointerSemanticToken || 0) + 1;
      var semanticSession = Number(st.inspectSession || 0);
      st.__toolHubPointerSemanticToken = semanticToken;
      st.__toolHubPointerSemanticSession = semanticSession;
      var semanticRun = new java.lang.Runnable({ run: function() {
        try {
          if (Number(st.__toolHubPointerSemanticToken || 0) !== semanticToken) return;
          if (Number(st.inspectSession || 0) !== semanticSession) return;
          if (st.__toolHubPointerSemanticRunnable !== semanticRun) return;
          st.__toolHubPointerSemanticPosted = false;
          st.__toolHubPointerSemanticRunnable = null;
          if (!st.active || st.closed || !st.root || !st.lp) return;
          if (st.lp.x !== st.pendingPointerX || st.lp.y !== st.pendingPointerY) {
            st.lp.x = st.pendingPointerX;
            st.lp.y = st.pendingPointerY;
            st.pointerX = st.lp.x;
            st.pointerY = st.lp.y;
            try { if (st.wm) st.wm.updateViewLayout(st.root, st.lp); } catch (eLayout) {}
          }
          if (st.mode === "area_capture") {
            if (self.updatePointerAreaSelection) self.updatePointerAreaSelection();
          } else {
            if (self.updatePointerAreaHoldCandidate) self.updatePointerAreaHoldCandidate();
            if (self.scheduleDraggingInspect) self.scheduleDraggingInspect();
          }
        } catch (eSemantic) {
          logPosition(self, "w", "pointer semantic update fail: " + String(eSemantic));
        }
      }});
      st.__toolHubPointerSemanticRunnable = semanticRun;
      try { st.handler.postDelayed(semanticRun, delay); }
      catch (ePost) {
        if (st.__toolHubPointerSemanticRunnable === semanticRun) st.__toolHubPointerSemanticRunnable = null;
        st.__toolHubPointerSemanticPosted = false;
      }
      return true;
    } catch (eMove) {'''
    text = text[:a] + semantic_new + text[b + len(semantic_end):]

    old_release = '''          if (pointerActiveUp) {
            self.movePointerFromRaw(rawX, rawY, true);
            if (!moved && action === android.view.MotionEvent.ACTION_UP) {
              try { self.onPointerBallTap(rawX, rawY); } catch (eTap) {}
            } else {
              try { self.onPointerBallDragEnd(rawX, rawY, action); }
              catch (eEnd) { logPosition(self, "e", "pointer drag end fail: " + String(eEnd)); }
            }
'''
    new_release = '''          if (pointerActiveUp) {
            if (!moved && action === android.view.MotionEvent.ACTION_UP) {
              try { self.onPointerBallTap(rawX, rawY); } catch (eTap) {}
            } else {
              try { self.finishPointerGestureFromRaw(rawX, rawY, action); }
              catch (eEnd) { logPosition(self, "e", "pointer final gesture fail: " + String(eEnd)); }
            }
'''
    text = replace_once(text, old_release, new_release, "th19 final release chain")

    reflow_marker = "    this.state.screen = { w: newW, h: newH };\n\n"
    reflow_new = reflow_marker + "    try { this.cancelPointerSemanticUpdate(null, \"screen_reflow\"); } catch (eSemanticReflow) {}\n\n"
    text = replace_once(text, reflow_marker, reflow_new, "th19 reflow semantic cleanup")

    required = [
        "finishPointerGestureFromRaw",
        "schedulePointerInspectAsync(true, \"release_final\", true)",
        "movePointerFromRaw(rawX, rawY, true, true)",
        "__toolHubPointerSemanticSession",
        "cancelPointerSemanticUpdate",
    ]
    for item in required:
        if item not in text:
            raise SystemExit("th19 required marker missing: " + item)
    touch_start = text.index("proto.setupTouchListener = function")
    touch_end = text.index("proto.onScreenChangedReflow = function")
    touch = text[touch_start:touch_end]
    if "onPointerBallDragEnd(rawX, rawY, action)" in touch:
        raise SystemExit("th19 still calls legacy pointer drag end")

    path.write_text(text, encoding="utf-8")


def patch_toolhub() -> None:
    path = ROOT / "ToolHub.js"
    text = path.read_text(encoding="utf-8")
    old_critical = 'var criticalModules = { "th_01_base.js": true, "th_02_core.js": true, "th_05_persistence.js": true, "th_16_entry.js": true };'
    new_critical = 'var criticalModules = { "th_01_base.js": true, "th_02_core.js": true, "th_05_persistence.js": true, "th_16_entry.js": true, "th_19_position_state.js": true };'
    text = replace_once(text, old_critical, new_critical, "ToolHub critical modules")

    loop_end = '''for (var i = 0; i < modules.length; i++) {
    try {
        loadScript(modules[i]);
    } catch (e) {
        var modErr = "Module load failed: " + modules[i] + " -> " + String(e);
        writeLog(modErr);
        try { android.util.Log.e("ToolHub", modErr); } catch(eLog) {}
        loadErrors.push({ module: modules[i], err: String(e) });
        if (criticalModules[modules[i]]) throw "Critical module failed: " + modules[i] + " (" + String(e) + ")";
    }
}
'''
    notice = loop_end + r'''
function notifyToolHubModulesLoaded() {
    if (loadErrors && loadErrors.length > 0) return false;
    var moduleCount = modules ? Number(modules.length || 0) : 0;
    var text = moduleCount > 0
        ? "ToolHub 子模块加载完成（" + String(moduleCount) + " 个）"
        : "ToolHub 子模块加载完成";
    var task = new java.lang.Runnable({ run: function() {
        try { android.widget.Toast.makeText(context, text, android.widget.Toast.LENGTH_SHORT).show(); }
        catch (eToast) { try { writeLog("Submodules loaded toast failed: " + String(eToast)); } catch (eLog) {} }
    }});
    try { new android.os.Handler(android.os.Looper.getMainLooper()).post(task); }
    catch (ePost) { try { task.run(); } catch (eDirect) {} }
    try { writeLog("All submodules loaded count=" + String(moduleCount)); } catch (eWrite) {}
    return true;
}
notifyToolHubModulesLoaded();
'''
    text = replace_once(text, loop_end, notice, "ToolHub final module notice")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    patch_th18()
    patch_th19()
    patch_toolhub()
    print("pointer release final-state patch applied")


if __name__ == "__main__":
    main()
