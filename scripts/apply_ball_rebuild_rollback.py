#!/usr/bin/env python3
"""临时应用悬浮球重建事务替换与失败回滚补丁。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "code" / "th_19_position_state.js"
text = path.read_text(encoding="utf-8")

if "// @version 1.0.11" not in text:
    text = text.replace("// @version 1.0.10", "// @version 1.0.11", 1)

start_marker = "  proto.rebuildBallForNewSize = function(keepPanels) {"
end_marker = '\n\n  logPosition(null, "i", "ball position state machine installed");'
start = text.find(start_marker)
end = text.find(end_marker, start + len(start_marker))
if start < 0 or end < 0:
    raise SystemExit("missing rebuildBallForNewSize section markers")

new_section = r'''  proto.rebuildBallForNewSize = function(keepPanels) {
    var st = this.state;
    if (!st || st.closing || !st.wm || !st.addedBall || !st.ballRoot || st.dragging) return false;
    if (st.ballRebuildActive === true) {
      logPosition(this, "w", "rebuild fixed ball skipped: rebuild already active");
      return false;
    }

    var self = this;
    var oldRoot = st.ballRoot;
    var oldContent = st.ballContent;
    var oldLp = st.ballLp;
    var oldAdded = st.addedBall === true;
    var oldUsedIconKind = st.usedIconKind;
    var oldDocked = st.docked;
    var oldDockSide = st.dockSide;

    var nextRoot = null;
    var nextContent = null;
    var nextLp = null;
    var nextUsedIconKind = oldUsedIconKind;
    var nextDocked = oldDocked;
    var nextDockSide = oldDockSide;
    var nextAdded = false;

    function restoreOldState() {
      st.ballRoot = oldRoot;
      st.ballContent = oldContent;
      st.ballLp = oldLp;
      st.addedBall = oldAdded;
      st.usedIconKind = oldUsedIconKind;
      st.docked = oldDocked;
      st.dockSide = oldDockSide;
    }

    function isViewAttached(v) {
      if (!v) return false;
      try {
        if (typeof v.isAttachedToWindow === "function") return v.isAttachedToWindow() === true;
      } catch (eAttached) {}
      try { return v.getWindowToken() !== null; } catch (eToken) {}
      return null;
    }

    function removePreparedBallView(v, label) {
      if (!v) return true;
      var ret = null;
      try { ret = self.safeRemoveView(v, label); } catch (eSafeRemove) { ret = { ok: false, err: String(eSafeRemove) }; }
      if (!ret || ret.ok !== false) return true;
      try {
        if (st.wm) {
          st.wm.removeViewImmediate(v);
          return true;
        }
      } catch (eImmediate) {
        logPosition(self, "w", "prepared ball immediate cleanup fail label=" + String(label || "") + " err=" + String(eImmediate));
      }
      return isViewAttached(v) === false;
    }

    st.ballRebuildActive = true;
    try {
      this.cancelDockTimer();
      this.cancelConfiguredBallPositionApply();
      this.cancelBallLayoutAnimation("rebuild_prepare");

      var built = this.buildBallContentView({ preview: false });
      if (!built || !built.root || !built.content) throw "new ball view build returned empty";
      nextRoot = built.root;
      nextContent = built.content;
      nextUsedIconKind = built.usedIconKind;

      // buildBallContentView 会更新 usedIconKind；正式替换前保持旧状态仍指向旧球。
      st.usedIconKind = oldUsedIconKind;
      st.ballContent = nextContent;
      try {
        nextLp = this.createBallLayoutParams();
        nextDocked = st.docked;
        nextDockSide = st.dockSide;
      } finally {
        st.ballContent = oldContent;
        st.usedIconKind = oldUsedIconKind;
        st.docked = oldDocked;
        st.dockSide = oldDockSide;
      }
      if (!nextLp) throw "new ball layout params missing";

      // 先把候选球加入 WindowManager；addView 失败时旧球始终仍在。
      nextAdded = true;
      st.wm.addView(nextRoot, nextLp);

      if (!keepPanels) {
        try { this.hideAllPanels(); } catch (eHidePanels) {
          logPosition(this, "w", "hide panels during ball rebuild fail: " + String(eHidePanels));
        }
      }

      var removeOld = this.safeRemoveView(oldRoot, "ballRoot-rebuild-replaced");
      var oldRemoved = !removeOld || removeOld.ok !== false;
      if (!oldRemoved && isViewAttached(oldRoot) === false) oldRemoved = true;
      if (!oldRemoved) throw "old ball remove failed: " + String(removeOld && removeOld.err ? removeOld.err : "unknown");

      st.ballRoot = nextRoot;
      st.ballContent = nextContent;
      st.ballLp = nextLp;
      st.addedBall = true;
      st.usedIconKind = nextUsedIconKind;
      st.docked = nextDocked;
      st.dockSide = nextDockSide;
      nextAdded = false;

      try { this.touchActivity(); } catch (eTouch) {}
      logPosition(this, "i", "rebuild fixed ball committed size=" + String(nextLp.height) + " x=" + String(nextLp.x) + " y=" + String(nextLp.y));
      return true;
    } catch (eRebuild) {
      restoreOldState();
      if (nextAdded && nextRoot) {
        var cleaned = removePreparedBallView(nextRoot, "ballRoot-rebuild-rollback");
        if (!cleaned) logPosition(this, "e", "rebuild rollback candidate cleanup incomplete");
      }
      restoreOldState();
      try { this.applyConfiguredBallPosition(false, "rebuild_rollback"); } catch (eRestorePosition) {
        logPosition(this, "w", "rebuild rollback position restore fail: " + String(eRestorePosition));
      }
      logPosition(this, "e", "rebuild fixed ball rolled back: " + String(eRebuild));
      try { this.toast("重建悬浮球失败，已保留原悬浮球"); } catch (eToast) {}
      return false;
    } finally {
      st.ballRebuildActive = false;
    }
  };'''

text = text[:start] + new_section + text[end:]

required = [
    "// @version 1.0.11",
    "ballRebuildActive",
    "var oldRoot = st.ballRoot",
    "buildBallContentView({ preview: false })",
    "st.wm.addView(nextRoot, nextLp)",
    'safeRemoveView(oldRoot, "ballRoot-rebuild-replaced")',
    "restoreOldState()",
    'applyConfiguredBallPosition(false, "rebuild_rollback")',
]
for token in required:
    if token not in text:
        raise SystemExit("generated position module missing token: %s" % token)

path.write_text(text, encoding="utf-8")
print("Ball rebuild rollback patch applied")
