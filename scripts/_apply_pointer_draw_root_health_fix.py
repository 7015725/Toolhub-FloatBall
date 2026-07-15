from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
VERIFY = ROOT / "scripts" / "verify_pointer_regressions.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, got {count}")
    return text.replace(old, new, 1)


def replace_section(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"{label}: start marker not found")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"{label}: end marker not found")
    return text[:start] + replacement.rstrip() + "\n\n" + text[end:]


pointer = POINTER.read_text(encoding="utf-8")
verify = VERIFY.read_text(encoding="utf-8")

pointer = replace_once(pointer, "// @version 1.2.6", "// @version 1.2.7", "module version")
pointer = replace_once(
    pointer,
    "      pointerRootToken: 0\n",
    "      pointerRootToken: 0,\n      pointerRootDrawSuccessToken: 0\n",
    "pointer root success state",
)

request_block = r'''FloatBallAppWM.prototype.isCurrentPointerRoot = function(st, rootRef, rootToken, requireAdded) {
  var pointerState = st || this.ensurePointerToolState();
  if (!pointerState || !rootRef) return false;
  if (!pointerState.active || pointerState.closed) return false;
  if (requireAdded !== false && pointerState.added !== true) return false;
  if (pointerState.root !== rootRef) return false;
  return Number(pointerState.pointerRootToken || 0) === Number(rootToken || 0);
};

FloatBallAppWM.prototype.requestPointerRedraw = function(st, expectedRoot, expectedRootToken) {
  var pointerState = st || this.ensurePointerToolState();
  if (!pointerState || !pointerState.root) return false;
  var rootRef = expectedRoot || pointerState.root;
  var rootToken = expectedRootToken;
  if (rootToken === undefined || rootToken === null) {
    rootToken = Number(pointerState.pointerRootToken || 0);
  }
  rootToken = Number(rootToken || 0);
  if (!this.isCurrentPointerRoot(pointerState, rootRef, rootToken, true)) return false;
  try {
    if (rootRef.postInvalidateOnAnimation) rootRef.postInvalidateOnAnimation();
    else rootRef.invalidate();
    return true;
  } catch (eInvalidate) {
    if (
      this.isCurrentPointerRoot(pointerState, rootRef, rootToken, true) &&
      pointerState.drawInvalidateErrorLogged !== true
    ) {
      pointerState.drawInvalidateErrorLogged = true;
      try {
        safeLog(this.L, 'w',
          "pointer redraw request fail rootToken=" + String(rootToken) +
          " error=" + String(eInvalidate)
        );
      } catch (eLog) {}
    }
  }
  return false;
};'''

pointer = replace_section(
    pointer,
    "FloatBallAppWM.prototype.requestPointerRedraw = function(st) {",
    "FloatBallAppWM.prototype.drawPointerFallback = function",
    request_block,
    "request redraw section",
)

rebuild_block = r'''FloatBallAppWM.prototype.rebuildPointerWindowForDraw = function(st, reason, expectedRoot, expectedRootToken) {
  var pointerState = st || this.ensurePointerToolState();
  if (!pointerState || !pointerState.active || pointerState.closed) return false;
  var oldRoot = pointerState.root;
  var oldRootToken = Number(pointerState.pointerRootToken || 0);
  if (expectedRoot) {
    if (oldRoot !== expectedRoot || oldRootToken !== Number(expectedRootToken || 0)) return false;
  }

  // 先使旧 root 失效，再执行 remove；迟到 onDraw、health 和 redraw 回调均不能命中新会话。
  pointerState.pointerRootToken = oldRootToken + 1;
  var removed = !pointerState.added || !oldRoot;
  try {
    if (!removed && pointerState.wm) {
      if (pointerState.wm.removeViewImmediate) pointerState.wm.removeViewImmediate(oldRoot);
      else pointerState.wm.removeView(oldRoot);
      removed = true;
    }
  } catch (eRemove) {
    var removeMessage = String(eRemove || "");
    if (removeMessage.indexOf("not attached") >= 0 || removeMessage.indexOf("not been added") >= 0) {
      removed = true;
    } else {
      this.recordPointerDrawFailure(pointerState, "rebuild_remove", eRemove);
      return false;
    }
  }
  if (!removed) return false;

  pointerState.added = false;
  pointerState.root = null;
  pointerState.paint = null;
  pointerState.fallbackPaint = null;
  pointerState.drawFallbackMode = true;
  pointerState.drawShadowDisabled = true;
  try {
    var newRoot = this.createPointerCanvasView(pointerState);
    var newRootToken = Number(pointerState.pointerRootToken || 0);
    pointerState.root = newRoot;
    if (!pointerState.lp) pointerState.lp = this.createPointerLayoutParams(pointerState);
    pointerState.wm.addView(newRoot, pointerState.lp);
    pointerState.added = true;
    newRoot.setVisibility(android.view.View.VISIBLE);
    this.requestPointerRedraw(pointerState, newRoot, newRootToken);
    try {
      safeLog(this.L, 'w',
        "pointer draw window rebuilt reason=" + String(reason || "health_check") +
        " oldRootToken=" + String(oldRootToken) +
        " newRootToken=" + String(newRootToken)
      );
    } catch (eLog) {}
    return true;
  } catch (eAdd) {
    pointerState.added = false;
    pointerState.pointerRootToken = Number(pointerState.pointerRootToken || 0) + 1;
    pointerState.root = null;
    pointerState.paint = null;
    pointerState.fallbackPaint = null;
    this.recordPointerDrawFailure(pointerState, "rebuild_add", eAdd);
  }
  return false;
};'''

pointer = replace_section(
    pointer,
    "FloatBallAppWM.prototype.rebuildPointerWindowForDraw = function",
    "FloatBallAppWM.prototype.schedulePointerDrawHealthCheck = function",
    rebuild_block,
    "rebuild section",
)

health_block = r'''FloatBallAppWM.prototype.schedulePointerDrawHealthCheck = function(st, delayMs) {
  var pointerState = st || this.ensurePointerToolState();
  if (!pointerState || !pointerState.active || pointerState.closed) return false;
  if (!pointerState.handler) pointerState.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
  var rootRef = pointerState.root;
  var rootToken = Number(pointerState.pointerRootToken || 0);
  if (!this.isCurrentPointerRoot(pointerState, rootRef, rootToken, true)) return false;
  try {
    if (pointerState.drawHealthRunnable) pointerState.handler.removeCallbacks(pointerState.drawHealthRunnable);
  } catch (eRemove) {}
  pointerState.drawHealthToken = Number(pointerState.drawHealthToken || 0) + 1;
  var token = Number(pointerState.drawHealthToken);
  var waitMs = Math.max(80, Math.min(500, Number(delayMs || 120)));
  var self = this;
  pointerState.drawHealthRunnable = new java.lang.Runnable({ run: function() {
    try {
      if (Number(pointerState.drawHealthToken || 0) !== token) return;
      pointerState.drawHealthRunnable = null;
      if (!self.isCurrentPointerRoot(pointerState, rootRef, rootToken, true)) return;
      if (Number(pointerState.pointerRootDrawSuccessToken || 0) === rootToken) return;
      if (pointerState.drawRecoveryTried !== true) {
        pointerState.drawRecoveryTried = true;
        pointerState.drawFallbackMode = true;
        pointerState.drawShadowDisabled = true;
        try {
          safeLog(self.L, 'w',
            "pointer draw first frame missing, rebuild fallback window rootToken=" + String(rootToken)
          );
        } catch (eLog) {}
        if (self.rebuildPointerWindowForDraw(pointerState, "first_frame_missing", rootRef, rootToken)) {
          self.schedulePointerDrawHealthCheck(pointerState, 180);
        }
        return;
      }
      if (pointerState.drawHealthFailureLogged !== true) {
        pointerState.drawHealthFailureLogged = true;
        try {
          safeLog(self.L, 'e',
            "pointer draw unavailable after recovery" +
            " rootToken=" + String(rootToken) +
            " count=" + String(pointerState.drawCount || 0) +
            " failures=" + String(pointerState.drawFailCount || 0) +
            " last=" + String(pointerState.lastDrawError || "")
          );
        } catch (eHealthLog) {}
      }
    } catch (eRun) {
      if (self.isCurrentPointerRoot(pointerState, rootRef, rootToken, true)) {
        self.recordPointerDrawFailure(pointerState, "health_check", eRun);
      }
    }
  }});
  try {
    pointerState.handler.postDelayed(pointerState.drawHealthRunnable, waitMs);
    return true;
  } catch (ePost) {
    pointerState.drawHealthRunnable = null;
    if (this.isCurrentPointerRoot(pointerState, rootRef, rootToken, true)) {
      this.recordPointerDrawFailure(pointerState, "health_post", ePost);
    }
  }
  return false;
};'''

pointer = replace_section(
    pointer,
    "FloatBallAppWM.prototype.schedulePointerDrawHealthCheck = function",
    "FloatBallAppWM.prototype.createPointerCanvasView = function",
    health_block,
    "health section",
)

pointer = replace_once(
    pointer,
    "      if (drawn) {\n        st.drawSuccessCount = Number(st.drawSuccessCount || 0) + 1;\n        st.lastDrawAt = th17Now();\n",
    "      if (drawn) {\n        st.drawSuccessCount = Number(st.drawSuccessCount || 0) + 1;\n        st.pointerRootDrawSuccessToken = rootToken;\n        st.lastDrawAt = th17Now();\n",
    "root success token assignment",
)

needle = '''    result.require(
        group,
        "first frame has one-shot self heal",
        "schedulePointerDrawHealthCheck" in canvas
        and "rebuildPointerWindowForDraw" in canvas
        and "drawRecoveryTried" in state
        and "drawHealthRunnable" in state
        and "first frame missing, rebuild fallback window" in canvas,
        "pointer state must track first-frame health and rebuild once in fallback mode",
    )
'''
addition = needle + '''    result.require(
        group,
        "draw health is bound to one pointer root",
        "pointerRootDrawSuccessToken" in state
        and "isCurrentPointerRoot" in canvas
        and "var rootRef = pointerState.root;" in canvas
        and "var rootToken = Number(pointerState.pointerRootToken || 0);" in canvas
        and "pointerState.pointerRootDrawSuccessToken = rootToken;" in canvas
        and 'rebuildPointerWindowForDraw(pointerState, "first_frame_missing", rootRef, rootToken)' in canvas
        and "requestPointerRedraw(pointerState, newRoot, newRootToken)" in canvas,
        "health, rebuild and redraw callbacks must stay scoped to the root that scheduled them",
    )
'''
verify = replace_once(verify, needle, addition, "draw root health regression")

POINTER.write_text(pointer, encoding="utf-8")
VERIFY.write_text(verify, encoding="utf-8")
print("OK pointer draw root health fix applied")
