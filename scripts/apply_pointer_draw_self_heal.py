#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
VERIFY = ROOT / "scripts" / "verify_pointer_regressions.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s expected once, found %d" % (label, count))
    return text.replace(old, new, 1)


def replace_section(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit("%s start marker missing" % label)
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        raise SystemExit("%s end marker missing" % label)
    return text[:start] + replacement.rstrip() + "\n\n" + text[end:]


pointer = POINTER.read_text(encoding="utf-8")
pointer = replace_once(pointer, "// @version 1.2.3", "// @version 1.2.4", "pointer version")

pointer = replace_once(
    pointer,
    '      frameKind: "",\n      paint: null',
    '      frameKind: "",\n'
    '      paint: null,\n'
    '      fallbackPaint: null,\n'
    '      drawCount: 0,\n'
    '      drawSuccessCount: 0,\n'
    '      drawFailCount: 0,\n'
    '      lastDrawAt: 0,\n'
    '      lastDrawError: "",\n'
    '      drawErrorLogged: false,\n'
    '      drawFirstSuccessLogged: false,\n'
    '      drawInvalidateErrorLogged: false,\n'
    '      drawHealthFailureLogged: false,\n'
    '      drawRecoveryTried: false,\n'
    '      drawFallbackMode: false,\n'
    '      drawShadowDisabled: false,\n'
    '      drawHealthRunnable: null,\n'
    '      drawHealthToken: 0',
    "pointer draw state",
)

pointer = replace_once(
    pointer,
    '  st.closed = false;\n  st.dragUpdatePosted = false;',
    '  st.closed = false;\n'
    '  try { if (st.handler && st.drawHealthRunnable) st.handler.removeCallbacks(st.drawHealthRunnable); } catch (eRemoveDrawHealthReset) {}\n'
    '  st.drawHealthRunnable = null;\n'
    '  st.drawHealthToken = Number(st.drawHealthToken || 0) + 1;\n'
    '  st.drawCount = 0;\n'
    '  st.drawSuccessCount = 0;\n'
    '  st.drawFailCount = 0;\n'
    '  st.lastDrawAt = 0;\n'
    '  st.lastDrawError = "";\n'
    '  st.drawErrorLogged = false;\n'
    '  st.drawFirstSuccessLogged = false;\n'
    '  st.drawInvalidateErrorLogged = false;\n'
    '  st.drawHealthFailureLogged = false;\n'
    '  st.drawRecoveryTried = false;\n'
    '  st.drawFallbackMode = false;\n'
    '  st.drawShadowDisabled = false;\n'
    '  st.fallbackPaint = null;\n'
    '  st.dragUpdatePosted = false;',
    "reset draw health",
)

pointer = replace_once(
    pointer,
    '  st.dragging = false;\n  st.dragStarted = false;\n  try { this.hidePointerAreaFrame();',
    '  st.dragging = false;\n'
    '  st.dragStarted = false;\n'
    '  try { if (st.handler && st.drawHealthRunnable) st.handler.removeCallbacks(st.drawHealthRunnable); } catch (eRemoveDrawHealthClose) {}\n'
    '  st.drawHealthRunnable = null;\n'
    '  st.drawHealthToken = Number(st.drawHealthToken || 0) + 1;\n'
    '  try { this.hidePointerAreaFrame();',
    "close draw health",
)

pointer = replace_once(
    pointer,
    '  st.added = false;\n  st.paint = null;\n  if (!st.resultJson',
    '  st.added = false;\n'
    '  st.paint = null;\n'
    '  st.fallbackPaint = null;\n'
    '  if (!st.resultJson',
    "close fallback paint",
)

helpers_and_canvas = r'''FloatBallAppWM.prototype.recordPointerDrawFailure = function(st, stage, errorObj) {
  var pointerState = st || this.ensurePointerToolState();
  if (!pointerState) return false;
  pointerState.drawFailCount = Number(pointerState.drawFailCount || 0) + 1;
  pointerState.lastDrawError = String(errorObj || "unknown");
  if (pointerState.drawErrorLogged === true) return false;
  pointerState.drawErrorLogged = true;
  try {
    safeLog(this.L, 'e',
      "pointer draw fail stage=" + String(stage || "unknown") +
      " error=" + String(pointerState.lastDrawError) +
      " size=" + String(pointerState.pointerW || 0) + "x" + String(pointerState.pointerH || 0) +
      " pos=" + String(pointerState.pointerX || 0) + "," + String(pointerState.pointerY || 0) +
      " scale=" + String(pointerState.pointerScale || 1) +
      " mode=" + String(pointerState.mode || "")
    );
  } catch (eLog) {}
  return true;
};

FloatBallAppWM.prototype.requestPointerRedraw = function(st) {
  var pointerState = st || this.ensurePointerToolState();
  if (!pointerState || !pointerState.root) return false;
  try {
    if (pointerState.root.postInvalidateOnAnimation) pointerState.root.postInvalidateOnAnimation();
    else pointerState.root.invalidate();
    return true;
  } catch (eInvalidate) {
    if (pointerState.drawInvalidateErrorLogged !== true) {
      pointerState.drawInvalidateErrorLogged = true;
      try { safeLog(this.L, 'w', "pointer redraw request fail: " + String(eInvalidate)); } catch (eLog) {}
    }
  }
  return false;
};

FloatBallAppWM.prototype.drawPointerFallback = function(canvas, st, path, rgb, dp, tipX, tipY, active) {
  var p = st.fallbackPaint;
  if (!p) {
    p = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    st.fallbackPaint = p;
  }
  try { p.setShader(null); p.clearShadowLayer(); } catch (eClear) {}
  p.setAntiAlias(true);
  p.setStrokeCap(android.graphics.Paint.Cap.ROUND);
  p.setStrokeJoin(android.graphics.Paint.Join.ROUND);
  p.setStyle(android.graphics.Paint.Style.FILL);
  p.setARGB(active ? 238 : 222, 255, 255, 255);
  canvas.drawPath(path, p);
  p.setStyle(android.graphics.Paint.Style.STROKE);
  p.setStrokeWidth(dp(active ? 2.2 : 2.0));
  p.setARGB(255, rgb.r, rgb.g, rgb.b);
  canvas.drawPath(path, p);
  p.setStyle(android.graphics.Paint.Style.FILL);
  p.setARGB(255, rgb.r, rgb.g, rgb.b);
  canvas.drawCircle(tipX, tipY, dp(active ? 2.2 : 1.8), p);
  return true;
};

FloatBallAppWM.prototype.rebuildPointerWindowForDraw = function(st, reason) {
  var pointerState = st || this.ensurePointerToolState();
  if (!pointerState || !pointerState.active || pointerState.closed) return false;
  var oldRoot = pointerState.root;
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
    pointerState.root = this.createPointerCanvasView(pointerState);
    if (!pointerState.lp) pointerState.lp = this.createPointerLayoutParams(pointerState);
    pointerState.wm.addView(pointerState.root, pointerState.lp);
    pointerState.added = true;
    pointerState.root.setVisibility(android.view.View.VISIBLE);
    this.requestPointerRedraw(pointerState);
    try { safeLog(this.L, 'w', "pointer draw window rebuilt reason=" + String(reason || "health_check")); } catch (eLog) {}
    return true;
  } catch (eAdd) {
    pointerState.added = false;
    this.recordPointerDrawFailure(pointerState, "rebuild_add", eAdd);
  }
  return false;
};

FloatBallAppWM.prototype.schedulePointerDrawHealthCheck = function(st, delayMs) {
  var pointerState = st || this.ensurePointerToolState();
  if (!pointerState || !pointerState.active || pointerState.closed) return false;
  if (!pointerState.handler) pointerState.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
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
      if (!pointerState.active || pointerState.closed || !pointerState.added || !pointerState.root) return;
      if (Number(pointerState.drawSuccessCount || 0) > 0) return;
      if (pointerState.drawRecoveryTried !== true) {
        pointerState.drawRecoveryTried = true;
        pointerState.drawFallbackMode = true;
        pointerState.drawShadowDisabled = true;
        try { safeLog(self.L, 'w', "pointer draw first frame missing, rebuild fallback window"); } catch (eLog) {}
        if (self.rebuildPointerWindowForDraw(pointerState, "first_frame_missing")) {
          self.schedulePointerDrawHealthCheck(pointerState, 180);
        }
        return;
      }
      if (pointerState.drawHealthFailureLogged !== true) {
        pointerState.drawHealthFailureLogged = true;
        try {
          safeLog(self.L, 'e',
            "pointer draw unavailable after recovery" +
            " count=" + String(pointerState.drawCount || 0) +
            " failures=" + String(pointerState.drawFailCount || 0) +
            " last=" + String(pointerState.lastDrawError || "")
          );
        } catch (eHealthLog) {}
      }
    } catch (eRun) {
      self.recordPointerDrawFailure(pointerState, "health_check", eRun);
    }
  }});
  try {
    pointerState.handler.postDelayed(pointerState.drawHealthRunnable, waitMs);
    return true;
  } catch (ePost) {
    pointerState.drawHealthRunnable = null;
    this.recordPointerDrawFailure(pointerState, "health_post", ePost);
  }
  return false;
};

FloatBallAppWM.prototype.createPointerCanvasView = function(st) {
  var self = this;
  st.paint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
  var PointerView = new JavaAdapter(android.view.View, {
    onDraw: function(canvas) {
      var stage = "prepare";
      var drawn = false;
      st.drawCount = Number(st.drawCount || 0) + 1;
      try {
        var p = st.paint;
        var pointerScale = Number(st.pointerScale || 1);
        if (isNaN(pointerScale) || pointerScale <= 0) pointerScale = 1;
        var dp = function(v) { return self.dp(Number(v) * pointerScale); };
        var tipX = st.anchorLocalX;
        var tipY = st.anchorLocalY;
        var textReady = false;
        try { textReady = self.isPointerTextHoverReady(th17Now()) === true; } catch(eReadyDraw) { textReady = false; }
        var hoverCandidate = !!(st.currentText && st.currentRect && st.hoverSince && !textReady);
        var processing = !!st.areaProcessing;
        var active = !!(st.hot || hoverCandidate || st.areaSelecting || st.areaReady || processing);
        var dragging = !!st.dragging;
        var rgb = null;
        if (processing) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_CAPTURE_HEX", 168, 85, 247);
        } else if (st.mode === "area_capture" || st.areaSelecting || st.areaReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
        } else if (textReady) {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_COLOR_TEXT_READY_HEX", "POINTER_COLOR_HIT_HEX", 34, 197, 94);
        } else if (st.hot) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_HIT_HEX", 245, 158, 11);
        } else if (hoverCandidate) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_HOVER_HEX", 14, 165, 233);
        } else {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_NORMAL_HEX", 76, 124, 160);
        }

        stage = "path";
        var path = new android.graphics.Path();
        path.moveTo(tipX, tipY);
        path.lineTo(tipX, tipY + dp(27));
        path.lineTo(tipX + dp(7), tipY + dp(21));
        path.lineTo(tipX + dp(12), tipY + dp(32));
        path.lineTo(tipX + dp(19), tipY + dp(29));
        path.lineTo(tipX + dp(14), tipY + dp(19));
        path.lineTo(tipX + dp(24), tipY + dp(19));
        path.close();

        if (st.drawFallbackMode === true) {
          stage = "fallback";
          self.drawPointerFallback(canvas, st, path, rgb, dp, tipX, tipY, active);
          drawn = true;
        } else {
          stage = "paint_setup";
          p.setAntiAlias(true);
          p.setStrokeCap(android.graphics.Paint.Cap.ROUND);
          p.setStrokeJoin(android.graphics.Paint.Join.ROUND);
          try { p.setShader(null); p.clearShadowLayer(); } catch (eClearPaint) {}

          if (st.drawShadowDisabled !== true) {
            try {
              toolhubSafeSetShadowLayer(p, dp(3), dp(1), dp(1.5), th17Color(74, 0, 0, 0));
            } catch (eShadow) {
              st.drawShadowDisabled = true;
              try { p.clearShadowLayer(); } catch (eClearShadow) {}
              self.recordPointerDrawFailure(st, "shadow", eShadow);
            }
          }

          stage = "accent_fill";
          p.setStyle(android.graphics.Paint.Style.FILL);
          p.setARGB(active ? 92 : (dragging ? 76 : 58), rgb.r, rgb.g, rgb.b);
          canvas.drawPath(path, p);

          stage = "white_fill";
          p.setStyle(android.graphics.Paint.Style.FILL);
          p.setARGB(active ? 230 : 210, 255, 255, 255);
          canvas.drawPath(path, p);
          try { p.clearShadowLayer(); } catch (eClearShadow2) {}

          stage = "outline";
          p.setStyle(android.graphics.Paint.Style.STROKE);
          p.setStrokeWidth(dp(active ? 2.2 : 2.0));
          p.setARGB(active ? 255 : 235, rgb.r, rgb.g, rgb.b);
          canvas.drawPath(path, p);

          stage = "detail";
          p.setStrokeWidth(dp(active ? 1.45 : 1.25));
          p.setARGB(active ? 245 : 210, rgb.r, rgb.g, rgb.b);
          canvas.drawLine(tipX + dp(2.5), tipY + dp(7), tipX + dp(2.5), tipY + dp(20), p);
          canvas.drawLine(tipX + dp(3.5), tipY + dp(20), tipX + dp(8.5), tipY + dp(16), p);

          stage = "hotspot";
          p.setStyle(android.graphics.Paint.Style.FILL);
          p.setARGB(255, rgb.r, rgb.g, rgb.b);
          canvas.drawCircle(tipX, tipY, dp(active ? 2.2 : 1.8), p);
          drawn = true;
        }
      } catch (drawError) {
        self.recordPointerDrawFailure(st, stage, drawError);
        st.drawFallbackMode = true;
        st.drawShadowDisabled = true;
        try {
          var fallbackScale = Number(st.pointerScale || 1);
          if (isNaN(fallbackScale) || fallbackScale <= 0) fallbackScale = 1;
          var fallbackDp = function(v) { return self.dp(Number(v) * fallbackScale); };
          var fallbackTipX = st.anchorLocalX;
          var fallbackTipY = st.anchorLocalY;
          var fallbackRgb = th17PointerColorRgb(self, "POINTER_COLOR_NORMAL_HEX", 76, 124, 160);
          var fallbackPath = new android.graphics.Path();
          fallbackPath.moveTo(fallbackTipX, fallbackTipY);
          fallbackPath.lineTo(fallbackTipX, fallbackTipY + fallbackDp(27));
          fallbackPath.lineTo(fallbackTipX + fallbackDp(7), fallbackTipY + fallbackDp(21));
          fallbackPath.lineTo(fallbackTipX + fallbackDp(12), fallbackTipY + fallbackDp(32));
          fallbackPath.lineTo(fallbackTipX + fallbackDp(19), fallbackTipY + fallbackDp(29));
          fallbackPath.lineTo(fallbackTipX + fallbackDp(14), fallbackTipY + fallbackDp(19));
          fallbackPath.lineTo(fallbackTipX + fallbackDp(24), fallbackTipY + fallbackDp(19));
          fallbackPath.close();
          self.drawPointerFallback(canvas, st, fallbackPath, fallbackRgb, fallbackDp, fallbackTipX, fallbackTipY, false);
          drawn = true;
        } catch (fallbackError) {
          self.recordPointerDrawFailure(st, "fallback", fallbackError);
        }
      }

      if (drawn) {
        st.drawSuccessCount = Number(st.drawSuccessCount || 0) + 1;
        st.lastDrawAt = th17Now();
        if (st.drawFirstSuccessLogged !== true) {
          st.drawFirstSuccessLogged = true;
          try {
            safeLog(self.L, 'd',
              "pointer draw first success fallback=" + String(st.drawFallbackMode === true) +
              " recovery=" + String(st.drawRecoveryTried === true)
            );
          } catch (eSuccessLog) {}
        }
      }
    }
  }, context);
  if (st.drawFallbackMode !== true) {
    try { PointerView.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null); } catch (eLayer) {
      st.drawShadowDisabled = true;
      this.recordPointerDrawFailure(st, "software_layer", eLayer);
    }
  }
  return PointerView;
};'''

pointer = replace_section(
    pointer,
    "FloatBallAppWM.prototype.createPointerCanvasView = function(st) {",
    "FloatBallAppWM.prototype.createPointerLayoutParams = function(st) {",
    helpers_and_canvas,
    "pointer canvas",
)

show_window = r'''FloatBallAppWM.prototype.showPointerWindow = function(st) {
  if (!st) st = this.ensurePointerToolState();
  try {
    st.wm = this.state.wm || context.getSystemService(android.content.Context.WINDOW_SERVICE);
    st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
    if (!st.root) st.root = this.createPointerCanvasView(st);
    if (!st.lp) st.lp = this.createPointerLayoutParams(st);
    else {
      try {
        st.lp.width = st.pointerW;
        st.lp.height = st.pointerH;
      } catch (eResizeLp) {}
    }
    if (!st.added) {
      st.wm.addView(st.root, st.lp);
      st.added = true;
    }
    try { st.root.setVisibility(android.view.View.VISIBLE); } catch (eVisible) {}
    this.requestPointerRedraw(st);
    this.schedulePointerDrawHealthCheck(st, 120);
    return true;
  } catch (e0) {
    this.recordPointerDrawFailure(st, "show_window", e0);
    safeLog(this.L, 'e', "showPointerWindow fail: " + String(e0));
    return false;
  }
};'''

pointer = replace_section(
    pointer,
    "FloatBallAppWM.prototype.showPointerWindow = function(st) {",
    "FloatBallAppWM.prototype.getPointerHotspot = function() {",
    show_window,
    "show pointer window",
)

pointer = replace_once(
    pointer,
    '      try { st.wm.updateViewLayout(st.root, st.lp); } catch (eU) { safeLog(self.L, \'e\', "pointer update fail: " + String(eU)); }\n      if (st.mode === "area_capture")',
    '      var pointerLayoutUpdated = true;\n'
    '      try {\n'
    '        st.wm.updateViewLayout(st.root, st.lp);\n'
    '      } catch (eU) {\n'
    '        pointerLayoutUpdated = false;\n'
    '        safeLog(self.L, \'e\', "pointer update fail: " + String(eU));\n'
    '        var updateMessage = String(eU || "");\n'
    '        if (updateMessage.indexOf("not attached") >= 0 ||\n'
    '            updateMessage.indexOf("Invalid display") >= 0 ||\n'
    '            updateMessage.indexOf("BadTokenException") >= 0) {\n'
    '          st.added = false;\n'
    '          st.root = null;\n'
    '          st.lp = null;\n'
    '          st.paint = null;\n'
    '          st.fallbackPaint = null;\n'
    '          st.drawFallbackMode = true;\n'
    '          st.drawShadowDisabled = true;\n'
    '          try { self.showPointerWindow(st); } catch (eRecoverWindow) {\n'
    '            self.recordPointerDrawFailure(st, "move_recover", eRecoverWindow);\n'
    '          }\n'
    '        }\n'
    '      }\n'
    '      if (pointerLayoutUpdated) self.requestPointerRedraw(st);\n'
    '      if (st.mode === "area_capture")',
    "move redraw and detach recovery",
)

pointer = replace_once(
    pointer,
    '  try { if (st.root) st.root.invalidate(); } catch (ePointerInvalidate) {}\n  safeLog(this.L, \'i\',',
    '  try { this.requestPointerRedraw(st); } catch (ePointerInvalidate) {}\n  safeLog(this.L, \'i\',',
    "reflow redraw",
)

POINTER.write_text(pointer, encoding="utf-8")

verify = VERIFY.read_text(encoding="utf-8")
verify_draw = r'''
def verify_pointer_draw_visibility(result, pointer):
    group = "pointer-draw"
    state = section(
        pointer,
        "FloatBallAppWM.prototype.ensurePointerToolState = function()",
        "FloatBallAppWM.prototype.resetPointerToolState = function",
    )
    reset = section(
        pointer,
        "FloatBallAppWM.prototype.resetPointerToolState = function",
        "FloatBallAppWM.prototype.setPointerToolResult = function",
    )
    close = section(
        pointer,
        "FloatBallAppWM.prototype.closePointerTool = function",
        "FloatBallAppWM.prototype.pointerPositionFromBall = function",
    )
    canvas = section(
        pointer,
        "FloatBallAppWM.prototype.recordPointerDrawFailure = function",
        "FloatBallAppWM.prototype.createPointerLayoutParams = function",
    )
    show = section(
        pointer,
        "FloatBallAppWM.prototype.showPointerWindow = function",
        "FloatBallAppWM.prototype.getPointerHotspot = function",
    )
    move = section(
        pointer,
        "FloatBallAppWM.prototype.schedulePointerMove = function",
        "FloatBallAppWM.prototype.resetPointerAreaHold = function",
    )
    reflow = section(
        pointer,
        "FloatBallAppWM.prototype.onPointerScreenChangedReflow = function",
        "FloatBallAppWM.prototype.recordPointerDrawFailure = function",
    )

    result.require(
        group,
        "draw failures are observable",
        "pointer draw fail stage=" in canvas
        and "recordPointerDrawFailure(st, stage, drawError)" in canvas
        and "catch (drawError) {}" not in canvas,
        "pointer onDraw must log one scoped failure instead of swallowing it",
    )
    result.require(
        group,
        "fallback pointer survives rich draw failure",
        "drawPointerFallback" in canvas
        and "st.drawFallbackMode = true;" in canvas
        and 'recordPointerDrawFailure(st, "fallback", fallbackError)' in canvas
        and "if (st.drawFallbackMode !== true)" in canvas,
        "rich rendering must fall back to a shadow-free pointer and skip software layer during recovery",
    )
    result.require(
        group,
        "shadow failure does not abort pointer body",
        'recordPointerDrawFailure(st, "shadow", eShadow)' in canvas
        and "st.drawShadowDisabled = true;" in canvas
        and canvas.find('recordPointerDrawFailure(st, "shadow", eShadow)')
        < canvas.find('stage = "accent_fill"'),
        "shadow setup must be isolated before the pointer body is drawn",
    )
    result.require(
        group,
        "first frame has one-shot self heal",
        "schedulePointerDrawHealthCheck" in canvas
        and "rebuildPointerWindowForDraw" in canvas
        and "drawRecoveryTried" in state
        and "drawHealthRunnable" in state
        and "first frame missing, rebuild fallback window" in canvas,
        "pointer state must track first-frame health and rebuild once in fallback mode",
    )
    result.require(
        group,
        "show move and reflow request redraw",
        "requestPointerRedraw(st);" in show
        and "schedulePointerDrawHealthCheck(st, 120);" in show
        and "self.requestPointerRedraw(st);" in move
        and "this.requestPointerRedraw(st);" in reflow,
        "pointer must request a frame after addView, movement, and screen reflow",
    )
    result.require(
        group,
        "detached pointer window is recreated",
        'updateMessage.indexOf("not attached")' in move
        and 'updateMessage.indexOf("Invalid display")' in move
        and 'updateMessage.indexOf("BadTokenException")' in move
        and "self.showPointerWindow(st)" in move,
        "updateViewLayout attachment failures must recreate the pointer window",
    )
    result.require(
        group,
        "draw health callbacks are session scoped",
        "drawHealthToken" in state
        and "removeCallbacks(st.drawHealthRunnable)" in reset
        and "removeCallbacks(st.drawHealthRunnable)" in close,
        "reset and close must cancel stale draw-health callbacks",
    )
'''

verify = replace_once(verify, "\ndef main():", verify_draw + "\n\ndef main():", "draw verifier function")
verify = replace_once(
    verify,
    "    verify_pointer_core(result, pointer, ocr)\n    verify_manifest(result)",
    "    verify_pointer_core(result, pointer, ocr)\n    verify_pointer_draw_visibility(result, pointer)\n    verify_manifest(result)",
    "draw verifier call",
)
verify = replace_once(
    verify,
    '    core_count = sum(1 for name in result.passed if name.startswith("pointer-core /"))\n    print(\n        "OK pointer_regressions issue85=%d text_release=%d pointer_core=%d total=%d"\n        % (issue_count, release_count, core_count, len(result.passed))\n    )',
    '    core_count = sum(1 for name in result.passed if name.startswith("pointer-core /"))\n'
    '    draw_count = sum(1 for name in result.passed if name.startswith("pointer-draw /"))\n'
    '    print(\n'
    '        "OK pointer_regressions issue85=%d text_release=%d pointer_core=%d pointer_draw=%d total=%d"\n'
    '        % (issue_count, release_count, core_count, draw_count, len(result.passed))\n'
    '    )',
    "draw verifier summary",
)
VERIFY.write_text(verify, encoding="utf-8")

print("OK applied pointer draw self-heal")
