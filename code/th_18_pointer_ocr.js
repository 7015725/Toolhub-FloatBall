// @version 1.0.5
// =======================【指针：框选截图后文本识别扩展】======================
// 正式模块，必须在 th_17_pointer.js 后加载。
// OCR 方法：使用 ShortX OcrDetect + RectSourceRect 识别框选屏幕区域。
// 状态补丁：拖动悬浮球时球体固定边缘，指针跟随手指；识别只使用最终拖动位置。
(function() {
  function log18(level, msg) {
    try { safeLog(null, level || 'i', String(msg)); } catch(eLog) {}
  }

  function copy18(options) {
    var out = {};
    try {
      if (!options) return out;
      for (var k in options) {
        try { out[k] = options[k]; } catch(eK) {}
      }
    } catch(e0) {}
    return out;
  }

  function now18() {
    try { if (typeof th17Now === "function") return th17Now(); } catch(e0) {}
    return (new Date()).getTime();
  }

  function int18(v) {
    try { if (typeof th17Int === "function") return th17Int(v); } catch(e0) {}
    var n = parseInt(String(v), 10);
    if (isNaN(n)) return 0;
    return n;
  }

  function clamp18(appObj, v, min, max) {
    var n = Number(v || 0);
    if (isNaN(n)) n = 0;
    try { if (appObj && typeof appObj.clamp === "function") return appObj.clamp(n, min, max); } catch(e0) {}
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function rectKey18(rect) {
    if (!rect) return "";
    return String(int18(rect.left)) + "," + String(int18(rect.top)) + "," + String(int18(rect.right)) + "," + String(int18(rect.bottom));
  }

  function normalizeRect18(rect) {
    if (!rect) return null;
    var l = int18(rect.left);
    var t = int18(rect.top);
    var r = int18(rect.right);
    var b = int18(rect.bottom);
    try { if (r <= l && rect.width) r = l + int18(rect.width); } catch(e0) {}
    try { if (b <= t && rect.height) b = t + int18(rect.height); } catch(e1) {}
    if (r <= l || b <= t) return null;
    return { left: l, top: t, right: r, bottom: b };
  }

  function sameRect18(a, b, slop) {
    if (!a || !b) return false;
    var s = Math.max(0, Number(slop || 0));
    return Math.abs(int18(a.left) - int18(b.left)) <= s &&
      Math.abs(int18(a.top) - int18(b.top)) <= s &&
      Math.abs(int18(a.right) - int18(b.right)) <= s &&
      Math.abs(int18(a.bottom) - int18(b.bottom)) <= s;
  }

  function getContext18() {
    try { if (typeof context !== "undefined" && context) return context; } catch(e0) {}
    try {
      var app = Packages.android.app.ActivityThread.currentApplication();
      if (app) return app.getApplicationContext ? app.getApplicationContext() : app;
    } catch(e1) {}
    return null;
  }

  function runOnMain18(fn, timeoutMs) {
    try {
      var ml = android.os.Looper.getMainLooper();
      var my = android.os.Looper.myLooper();
      if (ml !== null && my !== null && ml === my) return fn();
    } catch(e0) {}
    var box = { ok: false, value: null, error: null };
    var latch = new java.util.concurrent.CountDownLatch(1);
    var h = new android.os.Handler(android.os.Looper.getMainLooper());
    h.post(new java.lang.Runnable({ run: function() {
      try { box.value = fn(); box.ok = true; } catch(eRun) { box.error = eRun; }
      try { latch.countDown(); } catch(eCount) {}
    }}));
    var done = latch["await"](timeoutMs || 1500, java.util.concurrent.TimeUnit.MILLISECONDS);
    if (!done) throw new Error("main thread timeout");
    if (!box.ok) throw box.error;
    return box.value;
  }

  function copyClipboard18(text) {
    var value = String(text === null || text === undefined ? "" : text);
    if (!value) return false;
    return runOnMain18(function() {
      var ctx = getContext18();
      if (!ctx) throw new Error("context 不可用");
      var cm = ctx.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
      if (!cm) throw new Error("ClipboardManager 不可用");
      var clip = android.content.ClipData.newPlainText("ToolHub OCR", value);
      cm.setPrimaryClip(clip);
      return true;
    }, 2000) === true;
  }

  function runShortxRectOcr18(rect) {
    var rr = normalizeRect18(rect);
    if (!rr) throw new Error("OCR区域无效");
    var l = int18(rr.left);
    var t = int18(rr.top);
    var r = int18(rr.right);
    var b = int18(rr.bottom);

    importClass(Packages.tornaco.apps.shortx.core.proto.action.OcrDetect);
    importClass(Packages.tornaco.apps.shortx.core.proto.action.OcrDetectOutputType);
    importClass(Packages.tornaco.apps.shortx.core.proto.common.RectSourceRect);
    importClass(Packages.tornaco.apps.shortx.core.proto.common.Rect);
    importClass(com.google.protobuf.Any);

    var action = OcrDetect.newBuilder()
      .setRectSrc(
        Any.pack(
          RectSourceRect.newBuilder()
            .setRect(
              Rect.newBuilder()
                .setLeft(l)
                .setTop(t)
                .setRight(r)
                .setBottom(b)
                .build()
            )
            .build()
        )
      )
      .setThreads(4)
      .setUseSlim(false)
      .setSeparator("\n")
      .setOutputType(OcrDetectOutputType.OcrDetectOutputType_Text)
      .build();

    var result = shortx.executeAction(action);
    return String(result.contextData.get("ocrResult") || "");
  }

  function pickOcrRect18(obj, ret) {
    var rect = null;
    try { if (obj && obj.data && obj.data.captureRect) rect = normalizeRect18(obj.data.captureRect); } catch(e0) {}
    try { if (!rect && obj && obj.captureRect) rect = normalizeRect18(obj.captureRect); } catch(e1) {}
    try { if (!rect && obj && obj.data && obj.data.visualRect) rect = normalizeRect18(obj.data.visualRect); } catch(e2) {}
    try { if (!rect && obj && obj.visualRect) rect = normalizeRect18(obj.visualRect); } catch(e3) {}
    try { if (!rect && ret && ret.captureRect) rect = normalizeRect18(ret.captureRect); } catch(e4) {}
    try { if (!rect && ret && ret.visualRect) rect = normalizeRect18(ret.visualRect); } catch(e5) {}
    return rect;
  }

  function applyPerfDefaults18(appObj) {
    try {
      if (!appObj || !appObj.ensurePointerToolState) return null;
      var st = appObj.ensurePointerToolState();
      if (!st) return null;
      if (st.__th18PerfDefaults !== true) {
        st.__th18PerfDefaults = true;
        st.__th18FrameTs = 0;
        st.__th18FrameRect = null;
        st.__th18LastDragInspectCall = 0;
        st.__th18MoveMinIntervalText = 24;
        st.__th18MoveMinIntervalArea = 18;
        st.__th18FrameMinInterval = 28;
        st.__th18DragInspectInterval = 300;
      }
      try { st.inspectMaxDragMs = Math.min(Number(st.inspectMaxDragMs || 60), 36); } catch(e0) { st.inspectMaxDragMs = 36; }
      try { st.inspectMaxDragNodes = Math.min(Number(st.inspectMaxDragNodes || 120), 80); } catch(e1) { st.inspectMaxDragNodes = 80; }
      return st;
    } catch(e2) {}
    return null;
  }

  function pickBallSide18(appObj) {
    try {
      var s = String(appObj.state && appObj.state.dockSide || "");
      if (s === "left" || s === "right") return s;
    } catch(e0) {}
    try {
      var lp = appObj.state.ballLp;
      var di = appObj.getDockInfo ? appObj.getDockInfo() : null;
      var size = di ? Number(di.ballSize || 0) : 0;
      var cx = Number(lp.x || 0) + Math.round(size / 2);
      var sw = Number(appObj.state.screen && appObj.state.screen.w || 0);
      return cx < Math.round(sw / 2) ? "left" : "right";
    } catch(e1) {}
    return "left";
  }

  function fixBallToEdge18(appObj, side, y, updateLayout) {
    try {
      if (!appObj || !appObj.state || !appObj.state.ballLp) return null;
      var st = appObj.state;
      var di = appObj.getDockInfo ? appObj.getDockInfo() : null;
      if (!di) return null;
      var ballSize = Number(di.ballSize || 0);
      var visible = Number(di.visiblePx || ballSize);
      var hidden = Number(di.hiddenPx || 0);
      var sw = Number(st.screen && st.screen.w || 0);
      var sh = Number(st.screen && st.screen.h || 0);
      if (sw <= 0 || sh <= 0) {
        try { var ss = appObj.getScreenSizePx(); sw = ss.w; sh = ss.h; st.screen = ss; } catch(eScreen) {}
      }
      if (side !== "right") side = "left";
      var fy = Math.round(clamp18(appObj, y, 0, Math.max(0, sh - ballSize)));
      st.docked = true;
      st.dockSide = side;
      st.ballLp.width = visible;
      st.ballLp.y = fy;
      if (side === "left") {
        st.ballLp.x = 0;
        try { if (st.ballContent) st.ballContent.setX(-hidden); } catch(eL) {}
      } else {
        st.ballLp.x = Math.max(0, sw - visible);
        try { if (st.ballContent) st.ballContent.setX(0); } catch(eR) {}
      }
      try { if (st.ballContent) st.ballContent.setAlpha(1.0); } catch(eA) {}
      if (updateLayout !== false && st.wm && st.ballRoot) {
        try { st.wm.updateViewLayout(st.ballRoot, st.ballLp); } catch(eU) { log18('e', 'fixed edge ball update fail: ' + String(eU)); }
      }
      return { side: side, y: fy, x: st.ballLp.x };
    } catch(e0) { log18('e', 'fixBallToEdge18 fail: ' + String(e0)); }
    return null;
  }

  function clearPointerTextCandidate18(st) {
    try {
      st.currentText = "";
      st.currentRect = null;
      st.currentKey = "";
      st.hoverKey = "";
      st.hoverSince = 0;
      st.lastQueryX = -100000;
      st.lastQueryY = -100000;
      st.hot = false;
    } catch(e0) {}
  }

  function schedulePointerMoveRaw18(appObj, rawX, rawY, immediate) {
    try {
      if (!appObj || !appObj.ensurePointerToolState) return false;
      var st = appObj.ensurePointerToolState();
      if (!st.active || st.closed) return false;
      if (!st.root || !st.lp) {
        if (!appObj.showPointerWindow(st)) return false;
      }
      var sw = Math.max(1, Number(appObj.state.screen && appObj.state.screen.w || 0));
      var sh = Math.max(1, Number(appObj.state.screen && appObj.state.screen.h || 0));
      var x = int18(rawX) - int18(st.handleLocalX);
      var y = int18(rawY) - int18(st.handleLocalY);
      x = clamp18(appObj, x, 0, Math.max(0, sw - Number(st.pointerW || 0)));
      y = clamp18(appObj, y, 0, Math.max(0, sh - Number(st.pointerH || 0)));
      st.pendingPointerX = Math.round(x);
      st.pendingPointerY = Math.round(y);
      st.pointerX = st.pendingPointerX;
      st.pointerY = st.pendingPointerY;
      if (immediate === true && st.lp) {
        try {
          st.lp.x = st.pendingPointerX;
          st.lp.y = st.pendingPointerY;
          st.pointerX = st.lp.x;
          st.pointerY = st.lp.y;
          if (st.root && st.wm) st.wm.updateViewLayout(st.root, st.lp);
        } catch(eNow) { safeLog(appObj.L, 'e', 'pointer immediate update fail: ' + String(eNow)); }
      }
      if (!st.handler) st.handler = appObj.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
      if (st.dragUpdatePosted) return true;
      st.dragUpdatePosted = true;
      var self = appObj;
      var delay = st.mode === "area_capture" ? Number(st.__th18MoveMinIntervalArea || 18) : Number(st.__th18MoveMinIntervalText || 24);
      if (isNaN(delay) || delay < 12) delay = 16;
      st.moveRunnable = new java.lang.Runnable({ run: function() {
        try {
          st.dragUpdatePosted = false;
          if (!st.active || st.closed || !st.root || !st.lp) return;
          st.lp.x = st.pendingPointerX;
          st.lp.y = st.pendingPointerY;
          st.pointerX = st.lp.x;
          st.pointerY = st.lp.y;
          try { st.wm.updateViewLayout(st.root, st.lp); } catch(eU) { safeLog(self.L, 'e', 'pointer raw update fail: ' + String(eU)); }
          if (st.mode === "area_capture") self.updatePointerAreaSelection();
          else {
            self.updatePointerAreaHoldCandidate();
            self.scheduleDraggingInspect();
          }
        } catch(eRun) { safeLog(self.L, 'e', 'schedulePointerMoveRaw18 run fail: ' + String(eRun)); }
      }});
      try { st.handler.postDelayed(st.moveRunnable, delay); } catch(ePost) { st.dragUpdatePosted = false; }
      return true;
    } catch(e0) { log18('e', 'schedulePointerMoveRaw18 fail: ' + String(e0)); }
    return false;
  }

  function installPointerPerf18(proto) {
    try {
      if (!proto || proto.__toolHubPointerPerfPatchInstalled === true) return true;
      if (typeof proto.schedulePointerMove !== "function") return false;
      if (typeof proto.createPointerFrameView === "function") {
        proto.createPointerFrameView = function(st) {
          var self = this;
          var p = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
          var FrameView = new JavaAdapter(android.view.View, {
            onDraw: function(canvas) {
              try {
                var rect = st.frameRect;
                if (!rect) return;
                var rf = new android.graphics.RectF(rect.left, rect.top, rect.right, rect.bottom);
                p.setAntiAlias(true);
                p.setStyle(android.graphics.Paint.Style.FILL);
                p.setARGB(28, 59, 130, 246);
                canvas.drawRoundRect(rf, self.dp(6), self.dp(6), p);
                p.setStyle(android.graphics.Paint.Style.STROKE);
                p.setStrokeWidth(self.dp(2));
                p.setARGB(235, 59, 130, 246);
                canvas.drawRoundRect(rf, self.dp(6), self.dp(6), p);
              } catch(eDraw) {}
            }
          }, context);
          return FrameView;
        };
      }
      if (typeof proto.showPointerAreaFrame === "function") {
        var oldShowFrame = proto.showPointerAreaFrame;
        proto.showPointerAreaFrame = function(rect) {
          var st = applyPerfDefaults18(this);
          if (!st || !rect) return oldShowFrame.call(this, rect);
          var now = now18();
          var norm = normalizeRect18(rect) || rect;
          if (st.frameAdded && st.frame && st.__th18FrameRect && sameRect18(st.__th18FrameRect, norm, 1) && now - Number(st.__th18FrameTs || 0) < 80) return;
          if (st.frameAdded && st.frame && st.__th18FrameRect && sameRect18(st.__th18FrameRect, norm, 2) && now - Number(st.__th18FrameTs || 0) < Number(st.__th18FrameMinInterval || 28)) return;
          st.__th18FrameRect = { left: int18(norm.left), top: int18(norm.top), right: int18(norm.right), bottom: int18(norm.bottom) };
          st.__th18FrameTs = now;
          return oldShowFrame.call(this, rect);
        };
      }
      if (typeof proto.scheduleDraggingInspect === "function") {
        var oldDraggingInspect = proto.scheduleDraggingInspect;
        proto.scheduleDraggingInspect = function() {
          var st = applyPerfDefaults18(this);
          if (!st) return oldDraggingInspect.call(this);
          var now = now18();
          var interval = Math.max(220, Number(st.__th18DragInspectInterval || 300));
          if (now - Number(st.__th18LastDragInspectCall || 0) < interval) return;
          st.__th18LastDragInspectCall = now;
          return oldDraggingInspect.call(this);
        };
      }
      proto.__toolHubPointerPerfPatchInstalled = true;
      log18('i', "pointer performance patch installed");
      return true;
    } catch(ePerf) { log18('e', "pointer performance patch install fail: " + String(ePerf)); }
    return false;
  }

  function installFixedEdgePointer18(proto) {
    try {
      if (!proto || proto.__toolHubFixedEdgePointerPatchInstalled === true) return true;
      if (typeof proto.setupTouchListener !== "function") return false;
      if (typeof proto.startPointerTool !== "function") return false;
      if (typeof proto.onPointerBallDragEnd !== "function") return false;

      proto.schedulePointerMoveRaw18 = function(rawX, rawY, immediate) { return schedulePointerMoveRaw18(this, rawX, rawY, immediate); };

      var oldPointerDragging = proto.onPointerBallDragging;
      proto.onPointerBallDragging = function(ballX, ballY, rawX, rawY) {
        var st = this.ensurePointerToolState ? this.ensurePointerToolState() : null;
        if (st && st.__th18FixedEdgePointerMode === true && rawX !== undefined && rawY !== undefined) {
          st.dragging = true;
          st.dragStarted = true;
          st.moved = true;
          this.schedulePointerMoveRaw18(rawX, rawY, true);
          if (st.__th18SkipFirstDetect === true) {
            st.__th18SkipFirstDetect = false;
            return true;
          }
          if (st.mode === "area_capture") this.updatePointerAreaSelection();
          else {
            this.updatePointerAreaHoldCandidate();
            this.scheduleDraggingInspect();
          }
          return true;
        }
        return oldPointerDragging.call(this, ballX, ballY, rawX, rawY);
      };

      var oldPointerDragEnd = proto.onPointerBallDragEnd;
      proto.onPointerBallDragEnd = function(rawX, rawY, action) {
        var st = this.ensurePointerToolState ? this.ensurePointerToolState() : null;
        if (st && st.__th18FixedEdgePointerMode === true && rawX !== undefined && rawY !== undefined) {
          this.schedulePointerMoveRaw18(rawX, rawY, true);
          st.dragging = false;
          try { if (st.root) st.root.invalidate(); } catch(eInv) {}
          if (action === android.view.MotionEvent.ACTION_CANCEL) {
            this.setPointerToolResult({ ok: false, type: "cancel", code: "ACTION_CANCEL", message: "指针取消" });
            try { this.toast("指针已取消"); } catch(eToast) {}
            this.closePointerTool("ACTION_CANCEL", true);
            return true;
          }
          if (st.mode === "area_capture") this.finishPointerAreaCapture();
          else if (st.mode === "text_pick") this.scheduleFinishPointerTextPick();
          return true;
        }
        return oldPointerDragEnd.call(this, rawX, rawY, action);
      };

      proto.onPointerBallTap = function(rawX, rawY) {
        try { this.toast("拖动指针取字，悬停后框选识别"); } catch(eToast) {}
        return true;
      };

      proto.setupTouchListener = function() {
        var self = this;
        var slop = this.dp(this.config.CLICK_SLOP_DP);
        var startRawX = 0;
        var startRawY = 0;
        var fixedSide = "left";
        var fixedY = 0;
        var dragging = false;
        var pointerStarted = false;
        var longWasTriggered = false;

        function resetFlags() { dragging = false; pointerStarted = false; longWasTriggered = false; }

        function startPointer(rawX, rawY) {
          if (pointerStarted) return true;
          try {
            self.cancelLongPressTimer();
            self.hideAllPanels();
            fixBallToEdge18(self, fixedSide, fixedY, true);
            var pr = self.startPointerTool({ mode: "text_pick", source: "ball_drag" });
            if (!pr || pr.ok === false) return false;
            var pst = self.ensurePointerToolState ? self.ensurePointerToolState() : null;
            if (pst) {
              pst.__th18FixedEdgePointerMode = true;
              pst.__th18FixedEdgeSide = fixedSide;
              pst.__th18FixedEdgeY = fixedY;
              pst.__th18SkipFirstDetect = true;
              pst.dragging = true;
              pst.dragStarted = true;
              pst.moved = true;
              clearPointerTextCandidate18(pst);
              try { self.resetPointerAreaHold(); } catch(eHold) {}
            }
            pointerStarted = true;
            try { self.schedulePointerMoveRaw18(rawX, rawY, true); } catch(eMoveNow) { safeLog(self.L, 'e', 'fixed pointer first position fail: ' + String(eMoveNow)); }
            try { self.onPointerBallDragging(self.state.ballLp.x, self.state.ballLp.y, rawX, rawY); } catch(eDrag0) { safeLog(self.L, 'e', 'fixed pointer first drag fail: ' + String(eDrag0)); }
            safeLog(self.L, 'i', 'ball drag -> fixed-edge pointer side=' + fixedSide);
            return true;
          } catch(e0) { safeLog(self.L, 'e', 'start fixed-edge pointer fail: ' + String(e0)); }
          return false;
        }

        return new JavaAdapter(android.view.View.OnTouchListener, {
          onTouch: function(v, e) {
            if (self.state.closing) return false;
            var a = e.getAction();
            if (a === android.view.MotionEvent.ACTION_DOWN) {
              resetFlags();
              self.touchActivity();
              startRawX = e.getRawX();
              startRawY = e.getRawY();
              fixedSide = pickBallSide18(self);
              fixedY = self.state && self.state.ballLp ? Number(self.state.ballLp.y || 0) : 0;
              try { v.setPressed(true); v.setAlpha(1.0); } catch(ePress) {}
              try { v.drawableHotspotChanged(e.getX(), e.getY()); } catch(eHotspot) {}
              try { if (self.state.ballContent) { self.state.ballContent.animate().cancel(); self.state.ballContent.setScaleX(1.0); self.state.ballContent.setScaleY(1.0); } } catch(eAnim) {}
              self.state.dragging = false;
              self.armLongPress();
              return true;
            }
            if (a === android.view.MotionEvent.ACTION_MOVE) {
              self.touchActivity();
              var rawX = e.getRawX();
              var rawY = e.getRawY();
              var dx = Math.round(rawX - startRawX);
              var dy = Math.round(rawY - startRawY);
              if (self.state.longPressTriggered) { longWasTriggered = true; return true; }
              if (!dragging && (Math.abs(dx) > slop || Math.abs(dy) > slop)) {
                dragging = true;
                self.state.dragging = true;
                self.cancelLongPressTimer();
                startPointer(rawX, rawY);
              }
              if (dragging) {
                fixBallToEdge18(self, fixedSide, fixedY, false);
                if (pointerStarted) {
                  try { self.onPointerBallDragging(self.state.ballLp.x, self.state.ballLp.y, rawX, rawY); } catch(eMove) { safeLog(self.L, 'e', 'fixed pointer move fail: ' + String(eMove)); }
                }
                return true;
              }
              return true;
            }
            if (a === android.view.MotionEvent.ACTION_UP || a === android.view.MotionEvent.ACTION_CANCEL) {
              self.touchActivity();
              try { v.setPressed(false); } catch(eP) {}
              self.cancelLongPressTimer();
              if (self.state.longPressTriggered || longWasTriggered) {
                self.resetLongPressState();
                self.state.dragging = false;
                fixBallToEdge18(self, fixedSide, fixedY, true);
                return true;
              }
              if (pointerStarted) {
                try {
                  var pst = self.ensurePointerToolState ? self.ensurePointerToolState() : null;
                  if (pst) pst.__th18FixedEdgePointerMode = true;
                  self.onPointerBallDragEnd(e.getRawX(), e.getRawY(), a);
                } catch(eEnd) { safeLog(self.L, 'e', 'fixed pointer end fail: ' + String(eEnd)); }
                try {
                  var pst2 = self.ensurePointerToolState ? self.ensurePointerToolState() : null;
                  if (pst2) pst2.__th18FixedEdgePointerMode = false;
                } catch(eFlag) {}
                self.state.dragging = false;
                fixBallToEdge18(self, fixedSide, fixedY, true);
                self.resetLongPressState();
                return true;
              }
              if (!dragging && a === android.view.MotionEvent.ACTION_UP) {
                fixBallToEdge18(self, fixedSide, fixedY, true);
                try { self.playBounce(v); } catch(eB) {}
                if (self.state.addedPanel) self.hideMainPanel();
                else self.showPanelAvoidBall("main");
                safeLog(self.L, 'i', 'click -> toggle main');
              } else {
                fixBallToEdge18(self, fixedSide, fixedY, true);
              }
              self.state.dragging = false;
              self.resetLongPressState();
              return true;
            }
            return false;
          }
        });
      };

      proto.__toolHubFixedEdgePointerPatchInstalled = true;
      log18('i', 'fixed edge pointer state patch installed');
      return true;
    } catch(e0) { log18('e', 'fixed edge pointer state patch install fail: ' + String(e0)); }
    return false;
  }

  function install18() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubPointerTextPatchInstalled === true) {
        installPointerPerf18(proto);
        installFixedEdgePointer18(proto);
        return true;
      }
      if (typeof proto.startPointerTool !== "function") return false;
      if (typeof proto.finishPointerAreaCapture !== "function") return false;
      if (typeof proto.execPointerAction !== "function") return false;

      installPointerPerf18(proto);
      installFixedEdgePointer18(proto);

      proto.runPointerAreaTextByRect = function(rect) { return runShortxRectOcr18(rect); };
      proto.copyPointerAreaTextToClipboard = function(text) { return copyClipboard18(text); };

      var oldStartPointerTool = proto.startPointerTool;
      proto.startPointerTool = function(options) {
        var rawMode = "";
        try { rawMode = String((options && options.mode) || "text_pick"); } catch(eMode) { rawMode = "text_pick"; }
        if (rawMode === "area_ocr") {
          var opt = copy18(options || {});
          opt.mode = "text_pick";
          var ret = oldStartPointerTool.call(this, opt);
          try {
            var st = this.ensurePointerToolState ? this.ensurePointerToolState() : null;
            if (st) {
              st.areaOcrRequested = true;
              st.areaOcrSource = String((options && options.source) || "");
              applyPerfDefaults18(this);
            }
          } catch(eSt) {}
          try { this.toast("悬停后拖动框选识别"); } catch(eToast) {}
          return { ok: !!(ret && ret.ok), type: "pointer_started", mode: "area_ocr", base: ret || null };
        }
        var normalRet = oldStartPointerTool.call(this, options);
        try { applyPerfDefaults18(this); } catch(ePerfStart) {}
        return normalRet;
      };

      var oldExecPointerAction = proto.execPointerAction;
      proto.execPointerAction = function(btn) {
        try {
          var mode = String((btn && btn.mode) || (btn && btn.pointerMode) || "text_pick");
          if (mode === "area_ocr") return this.startPointerTool({ mode: "area_ocr", source: "button" });
        } catch(eExecMode) {}
        return oldExecPointerAction.call(this, btn);
      };

      var oldFinishPointerAreaCapture = proto.finishPointerAreaCapture;
      proto.finishPointerAreaCapture = function() {
        var st = null;
        var wantText = false;
        try {
          st = this.ensurePointerToolState ? this.ensurePointerToolState() : null;
          wantText = !!(st && (st.areaOcrRequested === true || st.mode === "area_capture"));
        } catch(eWant) { wantText = false; }
        var ret = oldFinishPointerAreaCapture.call(this);
        if (!wantText) return ret;
        try {
          if (!st && this.ensurePointerToolState) st = this.ensurePointerToolState();
          var obj = st && st.lastResult ? st.lastResult : null;
          if (!obj) obj = {};
          var path = "";
          try { path = String(obj.screenshotFilePath || obj.value || (obj.data && obj.data.path) || ""); } catch(ePath) { path = ""; }
          var rect = pickOcrRect18(obj, ret);
          var textValue = "";
          var textError = "";
          var textOk = false;
          var clipboardOk = false;
          var clipboardError = "";
          if (rect) {
            try { textValue = this.runPointerAreaTextByRect(rect); textOk = true; } catch(eText) { textError = String(eText); }
          } else {
            textError = "OCR区域为空";
          }
          if (textOk && textValue) {
            try { clipboardOk = this.copyPointerAreaTextToClipboard(textValue) === true; } catch(eClip) { clipboardError = String(eClip); }
          }
          obj.type = "area_ocr";
          obj.code = path ? (textOk ? "AREA_OCR_SUCCESS" : "AREA_OCR_FAILED") : "AREA_SCREENSHOT_FAILED";
          obj.message = path ? (textOk ? (clipboardOk ? "框选识别完成，已复制" : "框选识别完成") : "框选截图完成，识别失败") : "框选完成，截图失败";
          obj.value = textValue;
          obj.captureRect = rect || obj.captureRect || null;
          obj.screenshotFilePath = path;
          obj.ocrText = textValue;
          obj.ocrError = textOk ? "" : textError;
          obj.ocrSource = "rect";
          obj.clipboardOk = clipboardOk;
          obj.clipboardError = clipboardError;
          if (!obj.data) obj.data = {};
          obj.data.path = path;
          obj.data.ocrText = textValue;
          obj.data.ocrError = textOk ? "" : textError;
          obj.data.ocrSource = "rect";
          obj.data.clipboardOk = clipboardOk;
          obj.data.clipboardError = clipboardError;
          this.setPointerToolResult(obj);
          try { safeLog(this.L, textOk ? 'i' : 'w', "pointer area_ocr result ok=" + String(textOk) + " clip=" + String(clipboardOk) + " rect=" + rectKey18(rect) + " path=" + path + " err=" + textError + " clipErr=" + clipboardError); } catch(eLog2) {}
          try {
            if (textOk && clipboardOk) this.toast("识别完成，已复制");
            else if (textOk) this.toast("识别完成，复制失败");
            else this.toast("截图完成，识别失败");
          } catch(eToast2) {}
          if (ret) {
            ret.type = "area_ocr";
            ret.code = obj.code;
            ret.ocrText = textValue;
            ret.ocrError = obj.ocrError;
            ret.ocrSource = "rect";
            ret.clipboardOk = clipboardOk;
            ret.clipboardError = clipboardError;
          }
        } catch(ePatchFinish) {
          try { safeLog(this.L, 'e', "pointer area_ocr patch finish fail: " + String(ePatchFinish)); } catch(eLogFinish) {}
        }
        return ret;
      };

      proto.__toolHubPointerTextPatchInstalled = true;
      log18('i', "pointer area_ocr patch installed");
      return true;
    } catch(eInstall) { log18('e', "pointer area_ocr patch install fail: " + String(eInstall)); }
    return false;
  }

  try {
    new java.lang.Thread(new java.lang.Runnable({
      run: function() {
        for (var i = 0; i < 50; i++) {
          try { if (install18()) return; } catch(eLoop) {}
          try { java.lang.Thread.sleep(200); } catch(eSleep) {}
        }
        log18('w', "pointer area_ocr patch not installed after retry");
      }
    })).start();
  } catch(eThread) {
    try { install18(); } catch(eDirect) {}
  }
})();
