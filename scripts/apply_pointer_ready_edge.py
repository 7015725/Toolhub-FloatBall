#!/usr/bin/env python3
"""修复可取字状态松手失败与指针无法抵达屏幕边缘。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSITION = ROOT / "code" / "th_19_position_state.js"
VERIFY = ROOT / "scripts" / "verify_ball_position_state.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, got %d" % (label, count))
    return text.replace(old, new, 1)


def patch_position():
    text = POSITION.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.0.1", "// @version 1.0.2", "position version")

    insert_marker = '''  proto.cancelPointerSemanticUpdate = function(st, reason) {'''
    insert_code = r'''  proto.configurePointerEdgeLayoutParams = function(lp) {
    if (!lp) return false;
    var changed = false;
    try {
      var noLimits = android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
      var flags = Number(lp.flags || 0);
      if ((flags & noLimits) === 0) {
        lp.flags = flags | noLimits;
        changed = true;
      }
    } catch (eFlags) {}

    try {
      var sdk = Number(android.os.Build.VERSION.SDK_INT || 0);
      if (sdk >= 28) {
        var cutoutMode = null;
        try { cutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS; } catch (eAlways) {}
        if (cutoutMode === null || cutoutMode === undefined) {
          try { cutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES; } catch (eShort) {}
        }
        if (cutoutMode !== null && cutoutMode !== undefined && Number(lp.layoutInDisplayCutoutMode) !== Number(cutoutMode)) {
          lp.layoutInDisplayCutoutMode = cutoutMode;
          changed = true;
        }
      }
    } catch (eCutout) {}
    return changed;
  };

  if (typeof proto.createPointerLayoutParams === "function" && proto.__toolHubPointerEdgeLayoutWrapped !== true) {
    var oldCreatePointerLayoutParamsPosition = proto.createPointerLayoutParams;
    proto.createPointerLayoutParams = function(st) {
      var lp = oldCreatePointerLayoutParamsPosition.call(this, st);
      try { this.configurePointerEdgeLayoutParams(lp); } catch (eEdgeFlags) {}
      return lp;
    };
    proto.__toolHubPointerEdgeLayoutWrapped = true;
  }

  proto.pointerCandidateMatchesFinalHotspot = function(st) {
    var pointerState = st || null;
    try {
      if (!pointerState && this.ensurePointerToolState) pointerState = this.ensurePointerToolState();
    } catch (eState) { pointerState = null; }
    if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;

    try {
      var hp = this.getPointerHotspot();
      if (!hp) return false;
      if (typeof this.pointerRectHitScore === "function") {
        return Number(this.pointerRectHitScore(hp.x, hp.y, pointerState.currentRect)) >= 0;
      }
      var rect = pointerState.currentRect;
      return hp.x >= Number(rect.left) && hp.x <= Number(rect.right) &&
        hp.y >= Number(rect.top) && hp.y <= Number(rect.bottom);
    } catch (eHit) {}
    return false;
  };

'''
    text = replace_once(text, insert_marker, insert_code + insert_marker, "insert edge/candidate helpers")

    old_text_branch = '''    if (st.mode === "text_pick") {
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
'''
    new_text_branch = '''    if (st.mode === "text_pick") {
      st.dragging = false;

      // 指针和边框已经进入候选/可取字状态，并且最终热点仍在该文本范围内时，
      // 直接按现有候选完成取字。不要再次隐藏 overlay 后强制重扫，避免部分页面
      // UiAutomation 在松手瞬间返回 nodes=0，反而清掉已确认的可取字候选。
      var candidateAtFinalHotspot = false;
      try { candidateAtFinalHotspot = this.pointerCandidateMatchesFinalHotspot(st) === true; }
      catch (eCandidate) { candidateAtFinalHotspot = false; }
      if (candidateAtFinalHotspot) {
        try {
          logPosition(this, "i",
            "pointer release use confirmed candidate ready=" +
            String(this.isPointerTextHoverReady ? this.isPointerTextHoverReady(st.releaseTs) === true : false)
          );
        } catch (eCandidateLog) {}
        try { this.extractCurrentPointerText(true, st.releaseTs); }
        catch (eExtract) {
          logPosition(this, "e", "confirmed pointer candidate extract fail: " + String(eExtract));
          return false;
        }
        return true;
      }

      // 最终热点已经离开旧候选时才执行补扫，避免复制上一个位置的文字。
      try {
        st.inspectMaxFinalMs = Math.max(Number(st.inspectMaxFinalMs || 180), 220);
        st.inspectMaxFinalNodes = Math.max(Number(st.inspectMaxFinalNodes || 720), 900);
      } catch (eBudget) {
        st.inspectMaxFinalMs = 220;
        st.inspectMaxFinalNodes = 900;
      }
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
'''
    text = replace_once(text, old_text_branch, new_text_branch, "replace text release branch")

    old_edge_block = '''      var zoneX = this.dp(zoneXdp);
      var zoneY = this.dp(zoneYdp);

      function ease(t) {'''
    new_edge_block = '''      var zoneX = this.dp(zoneXdp);
      var zoneY = this.dp(zoneYdp);
      var snapX = Math.max(1, Math.min(zoneX, this.dp(10)));
      var snapY = Math.max(1, Math.min(zoneY, this.dp(10)));

      try {
        var edgeFlagsChanged = this.configurePointerEdgeLayoutParams(st.lp) === true;
        if (edgeFlagsChanged && st.root && st.wm) st.wm.updateViewLayout(st.root, st.lp);
      } catch (eEdgeLayout) {}

      function ease(t) {'''
    text = replace_once(text, old_edge_block, new_edge_block, "insert edge layout flags")

    old_mapping = '''      if (rx <= zoneX) x = mix(xByHandle, leftTarget, (zoneX - rx) / Math.max(1, zoneX));
      else if (rx >= sw - 1 - zoneX) x = mix(xByHandle, rightTarget, (rx - (sw - 1 - zoneX)) / Math.max(1, zoneX));
      if (ry <= zoneY) y = mix(yByHandle, topTarget, (zoneY - ry) / Math.max(1, zoneY));
      else if (ry >= sh - 1 - zoneY) y = mix(yByHandle, bottomTarget, (ry - (sh - 1 - zoneY)) / Math.max(1, zoneY));
'''
    new_mapping = '''      // 手指通常无法进入系统手势保留的最后几个像素，因此在 10dp 内完成平滑贴边，
      // 让指针热点可以精确到达 0 / width-1 / height-1。
      if (rx <= snapX) x = leftTarget;
      else if (rx <= zoneX) x = mix(xByHandle, leftTarget, (zoneX - rx) / Math.max(1, zoneX - snapX));
      else if (rx >= sw - 1 - snapX) x = rightTarget;
      else if (rx >= sw - 1 - zoneX) x = mix(xByHandle, rightTarget, (rx - (sw - 1 - zoneX)) / Math.max(1, zoneX - snapX));

      if (ry <= snapY) y = topTarget;
      else if (ry <= zoneY) y = mix(yByHandle, topTarget, (zoneY - ry) / Math.max(1, zoneY - snapY));
      else if (ry >= sh - 1 - snapY) y = bottomTarget;
      else if (ry >= sh - 1 - zoneY) y = mix(yByHandle, bottomTarget, (ry - (sh - 1 - zoneY)) / Math.max(1, zoneY - snapY));
'''
    text = replace_once(text, old_mapping, new_mapping, "replace edge mapping")

    required = [
        "// @version 1.0.2",
        "FLAG_LAYOUT_NO_LIMITS",
        "LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES",
        "pointerCandidateMatchesFinalHotspot",
        "extractCurrentPointerText(true, st.releaseTs)",
        "if (rx <= snapX) x = leftTarget",
        "if (ry <= snapY) y = topTarget",
    ]
    for marker in required:
        if marker not in text:
            raise SystemExit("position required marker missing: " + marker)

    POSITION.write_text(text, encoding="utf-8")


def patch_verify():
    text = VERIFY.read_text(encoding="utf-8")
    text = replace_once(text, '"// @version 1.0.1",', '"// @version 1.0.2",', "verify version marker")

    old_required = '''    "proto.finishPointerGestureFromRaw = function",
    "movePointerFromRaw(rawX, rawY, true, true)",
    "schedulePointerInspectAsync(true, \\"release_final\\", true)",
'''
    new_required = '''    "proto.finishPointerGestureFromRaw = function",
    "movePointerFromRaw(rawX, rawY, true, true)",
    "pointerCandidateMatchesFinalHotspot",
    "extractCurrentPointerText(true, st.releaseTs)",
    "schedulePointerInspectAsync(true, \\"release_final\\", true)",
    "FLAG_LAYOUT_NO_LIMITS",
    "LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES",
'''
    text = replace_once(text, old_required, new_required, "verify required markers")

    old_final_check = '''    if finalizer.index("cancelPointerSemanticUpdate") > finalizer.index("movePointerFromRaw(rawX, rawY, true, true)"):
        fail("pending semantic task must be cancelled before final raw position")
    if "TEXT_FINAL_SCAN_FAILED" not in finalizer:
        fail("final text scan failure path missing")
'''
    new_final_check = '''    if finalizer.index("cancelPointerSemanticUpdate") > finalizer.index("movePointerFromRaw(rawX, rawY, true, true)"):
        fail("pending semantic task must be cancelled before final raw position")
    candidate_at = finalizer.index("pointerCandidateMatchesFinalHotspot")
    extract_at = finalizer.index("extractCurrentPointerText(true, st.releaseTs)")
    scan_at = finalizer.index('schedulePointerInspectAsync(true, "release_final", true)')
    if not (candidate_at < extract_at < scan_at):
        fail("confirmed final candidate must be extracted before fallback final scan")
    if "TEXT_FINAL_SCAN_FAILED" not in finalizer:
        fail("final text scan failure path missing")
'''
    text = replace_once(text, old_final_check, new_final_check, "verify candidate release order")

    old_mover_markers = '''        "st.__toolHubPointerSemanticRunnable !== semanticRun",
    ):
'''
    new_mover_markers = '''        "st.__toolHubPointerSemanticRunnable !== semanticRun",
        "configurePointerEdgeLayoutParams(st.lp)",
        "if (rx <= snapX) x = leftTarget",
        "else if (rx >= sw - 1 - snapX) x = rightTarget",
        "if (ry <= snapY) y = topTarget",
        "else if (ry >= sh - 1 - snapY) y = bottomTarget",
    ):
'''
    text = replace_once(text, old_mover_markers, new_mover_markers, "verify edge mover markers")

    helper_insert_marker = '''    cleanup = section(
        text,
        "proto.cancelPointerSemanticUpdate = function",
        "proto.finishPointerGestureFromRaw = function",
    )
'''
    helper_check = '''    edge_helper = section(
        text,
        "proto.configurePointerEdgeLayoutParams = function",
        "proto.cancelPointerSemanticUpdate = function",
    )
    for marker in (
        "FLAG_LAYOUT_NO_LIMITS",
        "layoutInDisplayCutoutMode",
        "proto.createPointerLayoutParams = function(st)",
        "proto.pointerCandidateMatchesFinalHotspot = function(st)",
        "pointerRectHitScore(hp.x, hp.y, pointerState.currentRect)",
    ):
        if marker not in edge_helper:
            fail("pointer edge/candidate helper missing: " + marker)

''' + helper_insert_marker
    text = replace_once(text, helper_insert_marker, helper_check, "verify helper section")

    VERIFY.write_text(text, encoding="utf-8")


def main():
    patch_position()
    patch_verify()
    print("pointer ready-release and edge patch applied")


if __name__ == "__main__":
    main()
