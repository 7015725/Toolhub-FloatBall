#!/usr/bin/env python3
"""冻结绿色可取字状态，并在松手时优先提交该快照。"""

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
    text = replace_once(text, "// @version 1.0.2", "// @version 1.0.3", "position version")

    marker = '''  proto.pointerCandidateMatchesFinalHotspot = function(st) {'''
    helpers = r'''  proto.invalidatePointerInspectForRelease = function(st) {
    var pointerState = st || null;
    try {
      if (!pointerState && this.ensurePointerToolState) pointerState = this.ensurePointerToolState();
    } catch (eState) { pointerState = null; }
    if (!pointerState) return false;

    try {
      if (pointerState.handler && pointerState.inspectRunnable) {
        pointerState.handler.removeCallbacks(pointerState.inspectRunnable);
      }
    } catch (eInspectRunnable) {}
    try {
      if (pointerState.handler && pointerState.stopInspectRunnable) {
        pointerState.handler.removeCallbacks(pointerState.stopInspectRunnable);
      }
    } catch (eStopRunnable) {}

    pointerState.inspectRunnable = null;
    pointerState.stopInspectRunnable = null;
    pointerState.inspectPosted = false;
    pointerState.draggingInspectPosted = false;
    pointerState.inspectPending = false;
    pointerState.inspectFinishAfterResult = false;
    pointerState.inspectLatestSeq = Number(pointerState.inspectSeq || 0) + 1;
    pointerState.inspectSeq = pointerState.inspectLatestSeq;
    return true;
  };

  proto.storeReadyPointerSnapshot = function(st) {
    var pointerState = st || null;
    try {
      if (!pointerState && this.ensurePointerToolState) pointerState = this.ensurePointerToolState();
    } catch (eState) { pointerState = null; }
    if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;

    var ready = false;
    try { ready = this.isPointerTextHoverReady(nowPosition()) === true; } catch (eReady) { ready = pointerState.hot === true; }
    if (!ready) return false;

    var hp = null;
    try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
    pointerState.__toolHubReadyTextSnapshot = {
      text: String(pointerState.currentText),
      rect: {
        left: Number(pointerState.currentRect.left),
        top: Number(pointerState.currentRect.top),
        right: Number(pointerState.currentRect.right),
        bottom: Number(pointerState.currentRect.bottom)
      },
      key: String(pointerState.currentKey || ""),
      hoverSince: Number(pointerState.hoverSince || 0),
      readyAt: nowPosition(),
      session: Number(pointerState.inspectSession || 0),
      hotspotX: hp ? Number(hp.x || 0) : 0,
      hotspotY: hp ? Number(hp.y || 0) : 0
    };
    return true;
  };

  if (typeof proto.refreshPointerTextReadyVisualState === "function" && proto.__toolHubReadySnapshotVisualWrapped !== true) {
    var oldRefreshPointerTextReadyVisualStatePosition = proto.refreshPointerTextReadyVisualState;
    proto.refreshPointerTextReadyVisualState = function() {
      var ready = oldRefreshPointerTextReadyVisualStatePosition.call(this) === true;
      if (ready) {
        try { this.storeReadyPointerSnapshot(this.ensurePointerToolState()); } catch (eSnapshot) {}
      }
      return ready;
    };
    proto.__toolHubReadySnapshotVisualWrapped = true;
  }

  proto.getReadyPointerSnapshotForRelease = function(st) {
    var pointerState = st || null;
    try {
      if (!pointerState && this.ensurePointerToolState) pointerState = this.ensurePointerToolState();
    } catch (eState) { pointerState = null; }
    if (!pointerState) return null;

    var snap = pointerState.__toolHubReadyTextSnapshot || null;
    if (!snap || !snap.text || !snap.rect) return null;
    if (Number(snap.session || 0) !== Number(pointerState.inspectSession || 0)) return null;

    var now = nowPosition();
    var hoverLimit = 800;
    try { hoverLimit = Number(this.getPointerTextHoverLimitMs()); } catch (eLimit) { hoverLimit = 800; }
    if (isNaN(hoverLimit) || hoverLimit < 0) hoverLimit = 800;
    var maxAge = Math.max(1800, Math.min(6000, hoverLimit * 4));
    var age = now - Number(snap.readyAt || 0);
    if (age < 0 || age > maxAge) return null;

    var hp = null;
    try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
    if (!hp) return null;

    var hit = false;
    try {
      if (typeof this.pointerRectHitScore === "function") {
        hit = Number(this.pointerRectHitScore(hp.x, hp.y, snap.rect)) >= 0;
      } else {
        hit = hp.x >= Number(snap.rect.left) && hp.x <= Number(snap.rect.right) &&
          hp.y >= Number(snap.rect.top) && hp.y <= Number(snap.rect.bottom);
      }
    } catch (eHit) { hit = false; }
    if (!hit) return null;

    return {
      text: String(snap.text),
      rect: {
        left: Number(snap.rect.left),
        top: Number(snap.rect.top),
        right: Number(snap.rect.right),
        bottom: Number(snap.rect.bottom)
      },
      key: String(snap.key || ""),
      hoverSince: Number(snap.hoverSince || 0),
      readyAt: Number(snap.readyAt || 0),
      session: Number(snap.session || 0),
      hotspotX: Number(snap.hotspotX || 0),
      hotspotY: Number(snap.hotspotY || 0)
    };
  };

  proto.finishReadyPointerSnapshot = function(st, snapshot) {
    var pointerState = st || null;
    var snap = snapshot || null;
    if (!pointerState || !snap || !snap.text || !snap.rect) return false;

    var textValue = String(snap.text);
    var rect = {
      left: Number(snap.rect.left),
      top: Number(snap.rect.top),
      right: Number(snap.rect.right),
      bottom: Number(snap.rect.bottom)
    };
    var copied = false;
    try { copied = this.copyPointerTextToClipboard(textValue) === true; } catch (eCopy) { copied = false; }

    pointerState.currentText = textValue;
    pointerState.currentRect = rect;
    pointerState.currentKey = String(snap.key || "");
    pointerState.hoverKey = pointerState.currentKey;
    pointerState.hoverSince = Number(snap.hoverSince || snap.readyAt || nowPosition());
    pointerState.releaseTs = nowPosition();

    this.setPointerToolResult({
      ok: true,
      type: "text_pick",
      code: "TEXT_PICK_READY_SNAPSHOT",
      message: "取字成功",
      value: textValue,
      clipboard: copied === true,
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
      },
      data: {
        source: "ready_visual_snapshot",
        readyAt: Number(snap.readyAt || 0),
        session: Number(snap.session || 0)
      }
    });
    try { this.toast(copied ? "已复制: " + textValue : textValue); } catch (eToast) {}
    try { this.closePointerTool(copied ? "已复制到剪贴板" : "取字完成", true); } catch (eClose) {}
    return true;
  };

'''
    text = replace_once(text, marker, helpers + marker, "insert ready snapshot helpers")

    old_reset = '''        try {
          st.__toolHubPointerSemanticSession = Number(st.inspectSession || 0);
          st.__toolHubPointerSemanticToken = Number(st.__toolHubPointerSemanticToken || 0) + 1;
          st.__toolHubPointerSemanticPosted = false;
          st.__toolHubPointerSemanticRunnable = null;
        } catch (eInitSemantic) {}
'''
    new_reset = '''        try {
          st.__toolHubPointerSemanticSession = Number(st.inspectSession || 0);
          st.__toolHubPointerSemanticToken = Number(st.__toolHubPointerSemanticToken || 0) + 1;
          st.__toolHubPointerSemanticPosted = false;
          st.__toolHubPointerSemanticRunnable = null;
          st.__toolHubReadyTextSnapshot = null;
        } catch (eInitSemantic) {}
'''
    text = replace_once(text, old_reset, new_reset, "clear snapshot on reset")

    old_start = '''    this.cancelPointerSemanticUpdate(st, "pointer_release");
    if (!this.movePointerFromRaw(rawX, rawY, true, true)) return false;
    st.releaseTs = nowPosition();

    if (action === android.view.MotionEvent.ACTION_CANCEL) {'''
    new_start = '''    var readySnapshot = null;
    try { readySnapshot = this.getReadyPointerSnapshotForRelease(st); } catch (eReadySnapshot) { readySnapshot = null; }

    this.cancelPointerSemanticUpdate(st, "pointer_release");
    this.invalidatePointerInspectForRelease(st);
    st.releaseTs = nowPosition();

    if (action === android.view.MotionEvent.ACTION_CANCEL) {'''
    text = replace_once(text, old_start, new_start, "capture ready snapshot before final move")

    old_after_cancel = '''      return true;
    }

    if (st.mode === "area_capture") {
      try { this.updatePointerAreaSelection(); } catch (eAreaUpdate) {}'''
    new_after_cancel = '''      return true;
    }

    if (st.mode === "text_pick" && readySnapshot) {
      st.dragging = false;
      try {
        logPosition(this, "i",
          "pointer release commit ready visual snapshot age=" +
          String(nowPosition() - Number(readySnapshot.readyAt || 0))
        );
      } catch (eReadyLog) {}
      return this.finishReadyPointerSnapshot(st, readySnapshot);
    }

    if (!this.movePointerFromRaw(rawX, rawY, true, true)) return false;

    if (st.mode === "area_capture") {
      try { this.updatePointerAreaSelection(); } catch (eAreaUpdate) {}'''
    text = replace_once(text, old_after_cancel, new_after_cancel, "commit ready snapshot before final move")

    required = [
        "// @version 1.0.3",
        "proto.storeReadyPointerSnapshot = function",
        "proto.getReadyPointerSnapshotForRelease = function",
        "proto.finishReadyPointerSnapshot = function",
        "TEXT_PICK_READY_SNAPSHOT",
        "ready_visual_snapshot",
        "this.invalidatePointerInspectForRelease(st)",
        "st.__toolHubReadyTextSnapshot = null",
        "return this.finishReadyPointerSnapshot(st, readySnapshot)",
    ]
    for item in required:
        if item not in text:
            raise SystemExit("missing required marker: " + item)

    finalizer = text[text.index("proto.finishPointerGestureFromRaw = function"):text.index("proto.movePointerFromRaw = function")]
    capture_at = finalizer.index("getReadyPointerSnapshotForRelease")
    invalidate_at = finalizer.index("invalidatePointerInspectForRelease")
    finish_at = finalizer.index("finishReadyPointerSnapshot")
    move_at = finalizer.index("movePointerFromRaw(rawX, rawY, true, true)")
    if not (capture_at < invalidate_at < finish_at < move_at):
        raise SystemExit("ready snapshot release order invalid")

    POSITION.write_text(text, encoding="utf-8")


def patch_verify():
    text = VERIFY.read_text(encoding="utf-8")
    text = replace_once(text, '"// @version 1.0.2",', '"// @version 1.0.3",', "verify version")

    old_required = '''    "pointerCandidateMatchesFinalHotspot",
    "extractCurrentPointerText(true, st.releaseTs)",
    "schedulePointerInspectAsync(true, \\"release_final\\", true)",
'''
    new_required = '''    "pointerCandidateMatchesFinalHotspot",
    "proto.storeReadyPointerSnapshot = function",
    "proto.getReadyPointerSnapshotForRelease = function",
    "proto.finishReadyPointerSnapshot = function",
    "TEXT_PICK_READY_SNAPSHOT",
    "ready_visual_snapshot",
    "extractCurrentPointerText(true, st.releaseTs)",
    "schedulePointerInspectAsync(true, \\"release_final\\", true)",
'''
    text = replace_once(text, old_required, new_required, "verify ready snapshot markers")

    old_final = '''    candidate_at = finalizer.index("pointerCandidateMatchesFinalHotspot")
    extract_at = finalizer.index("extractCurrentPointerText(true, st.releaseTs)")
    scan_at = finalizer.index('schedulePointerInspectAsync(true, "release_final", true)')
    if not (candidate_at < extract_at < scan_at):
        fail("confirmed final candidate must be extracted before fallback final scan")
'''
    new_final = '''    snapshot_at = finalizer.index("getReadyPointerSnapshotForRelease")
    invalidate_at = finalizer.index("invalidatePointerInspectForRelease")
    snapshot_finish_at = finalizer.index("finishReadyPointerSnapshot")
    final_move_at = finalizer.index("movePointerFromRaw(rawX, rawY, true, true)")
    if not (snapshot_at < invalidate_at < snapshot_finish_at < final_move_at):
        fail("ready visual snapshot must be captured and committed before final raw move")
    candidate_at = finalizer.index("pointerCandidateMatchesFinalHotspot")
    extract_at = finalizer.index("extractCurrentPointerText(true, st.releaseTs)")
    scan_at = finalizer.index('schedulePointerInspectAsync(true, "release_final", true)')
    if not (candidate_at < extract_at < scan_at):
        fail("confirmed final candidate must be extracted before fallback final scan")
'''
    text = replace_once(text, old_final, new_final, "verify snapshot release order")

    old_helper = '''        "proto.pointerCandidateMatchesFinalHotspot = function(st)",
        "pointerRectHitScore(hp.x, hp.y, pointerState.currentRect)",
    ):
'''
    new_helper = '''        "proto.pointerCandidateMatchesFinalHotspot = function(st)",
        "pointerRectHitScore(hp.x, hp.y, pointerState.currentRect)",
        "proto.storeReadyPointerSnapshot = function(st)",
        "proto.getReadyPointerSnapshotForRelease = function(st)",
        "proto.finishReadyPointerSnapshot = function(st, snapshot)",
        "__toolHubReadyTextSnapshot",
    ):
'''
    text = replace_once(text, old_helper, new_helper, "verify snapshot helpers")

    cleanup_marker = '''        "proto.resetPointerToolState = function",
    ):
'''
    cleanup_repl = '''        "proto.resetPointerToolState = function",
        "st.__toolHubReadyTextSnapshot = null",
    ):
'''
    text = replace_once(text, cleanup_marker, cleanup_repl, "verify snapshot reset")

    VERIFY.write_text(text, encoding="utf-8")


def main():
    patch_position()
    patch_verify()
    print("pointer ready snapshot patch applied")


if __name__ == "__main__":
    main()
