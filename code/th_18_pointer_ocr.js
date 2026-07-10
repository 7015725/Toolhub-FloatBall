// @version 1.0.16
// =======================【指针：框选截图后文本识别扩展】======================
// 正式模块，必须在 th_17_pointer.js 后加载。
// OCR 方法：使用 ShortX OcrDetect + RectSourceRect 识别框选屏幕区域。
// 状态补丁：拖动悬浮球时球体固定边缘，指针跟随手指；识别只使用最终拖动位置；指针热点四边统一渐进贴边；支持设置页调整贴边范围。
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
      // 不再把无障碍取字扫描压到 36ms / 80 nodes。
      // 复杂页面中，控件文本常在较深的子 TextView，预算过低会导致 text_pick 无法命中。
      try {
        var dragMs = Number(st.inspectMaxDragMs || 60);
        if (isNaN(dragMs) || dragMs < 80) dragMs = 80;
        st.inspectMaxDragMs = dragMs;
      } catch(e0) { st.inspectMaxDragMs = 80; }
      try {
        var dragNodes = Number(st.inspectMaxDragNodes || 120);
        if (isNaN(dragNodes) || dragNodes < 360) dragNodes = 360;
        st.inspectMaxDragNodes = dragNodes;
      } catch(e1) { st.inspectMaxDragNodes = 360; }
      try {
        var finalMs = Number(st.inspectMaxFinalMs || 180);
        if (isNaN(finalMs) || finalMs < 180) finalMs = 180;
        st.inspectMaxFinalMs = finalMs;
      } catch(e2) { st.inspectMaxFinalMs = 180; }
      try {
        var finalNodes = Number(st.inspectMaxFinalNodes || 420);
        if (isNaN(finalNodes) || finalNodes < 720) finalNodes = 720;
        st.inspectMaxFinalNodes = finalNodes;
      } catch(e3) { st.inspectMaxFinalNodes = 720; }
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
      var hx = int18(st.handleLocalX);
      var hy = int18(st.handleLocalY);
      var ax = int18(st.anchorLocalX);
      var ay = int18(st.anchorLocalY);

      var rx = clamp18(appObj, int18(rawX), 0, Math.max(0, sw - 1));
      var ry = clamp18(appObj, int18(rawY), 0, Math.max(0, sh - 1));

      var xByHandle = int18(rawX) - hx;
      var yByHandle = int18(rawY) - hy;
      var x = xByHandle;
      var y = yByHandle;

      var leftTarget = -ax;
      var rightTarget = sw - 1 - ax;
      var topTarget = -ay;
      var bottomTarget = sh - 1 - ay;

      var zoneXdp = 48;
      var zoneYdp = 72;
      try { zoneXdp = Number(appObj.config && appObj.config.POINTER_EDGE_ZONE_X_DP || 48); } catch(eCfgX) { zoneXdp = 48; }
      try { zoneYdp = Number(appObj.config && appObj.config.POINTER_EDGE_ZONE_Y_DP || 72); } catch(eCfgY) { zoneYdp = 72; }
      if (isNaN(zoneXdp)) zoneXdp = 48;
      if (isNaN(zoneYdp)) zoneYdp = 72;
      zoneXdp = clamp18(appObj, zoneXdp, 16, 96);
      zoneYdp = clamp18(appObj, zoneYdp, 24, 128);
      var zoneX = 48;
      var zoneY = 72;
      try { zoneX = appObj.dp ? appObj.dp(zoneXdp) : zoneXdp; } catch(eZoneX) { zoneX = zoneXdp; }
      try { zoneY = appObj.dp ? appObj.dp(zoneYdp) : zoneYdp; } catch(eZoneY) { zoneY = zoneYdp; }

      function ease18(t) {
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        return t * t * (3 - 2 * t);
      }

      function mix18(a, b, t) {
        var e = ease18(t);
        return a + (b - a) * e;
      }

      if (rx <= zoneX) {
        x = mix18(xByHandle, leftTarget, (zoneX - rx) / zoneX);
      } else if (rx >= sw - 1 - zoneX) {
        x = mix18(xByHandle, rightTarget, (rx - (sw - 1 - zoneX)) / zoneX);
      }

      if (ry <= zoneY) {
        y = mix18(yByHandle, topTarget, (zoneY - ry) / zoneY);
      } else if (ry >= sh - 1 - zoneY) {
        y = mix18(yByHandle, bottomTarget, (ry - (sh - 1 - zoneY)) / zoneY);
      }

      x = clamp18(appObj, x, leftTarget, rightTarget);
      y = clamp18(appObj, y, topTarget, bottomTarget);
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
                var rgb = null;
                var processing = false;
                var kind = "";
                var fillAlpha = 42;
                var strokeAlpha = 235;
                var strokeWidth = self.dp(2);
                try { processing = st && st.areaProcessing === true; } catch(eProcessing18) { processing = false; }
                try { kind = String(st && st.frameKind || ""); } catch(eKind18) { kind = ""; }

                try {
                  if (typeof th17PointerColorRgbWithFallback === "function" && kind === "text_hit") {
                    rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_READY_HEX", "POINTER_COLOR_TEXT_READY_HEX", 34, 197, 94);
                    fillAlpha = 38;
                    strokeAlpha = 248;
                    strokeWidth = self.dp(2.3);
                  } else if (typeof th17PointerColorRgb === "function") {
                    if (processing || kind === "capture") {
                      rgb = th17PointerColorRgb(self, "POINTER_COLOR_CAPTURE_HEX", 168, 85, 247);
                      fillAlpha = 56;
                      strokeAlpha = 245;
                    } else if (kind === "text_hover") {
                      rgb = th17PointerColorRgb(self, "POINTER_COLOR_HOVER_HEX", 14, 165, 233);
                      fillAlpha = 26;
                      strokeAlpha = 215;
                      strokeWidth = self.dp(1.8);
                    } else if (kind === "area_armed") {
                      rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                      fillAlpha = 18;
                      strokeAlpha = 150;
                      strokeWidth = self.dp(1.4);
                    } else {
                      rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                    }
                  }
                } catch(eColor18) {}
                if (!rgb) rgb = processing ? { r: 168, g: 85, b: 247 } : { r: 59, g: 130, b: 246 };
                p.setAntiAlias(true);
                p.setStyle(android.graphics.Paint.Style.FILL);
                p.setARGB(fillAlpha, rgb.r, rgb.g, rgb.b);
                canvas.drawRoundRect(rf, self.dp(6), self.dp(6), p);
                p.setStyle(android.graphics.Paint.Style.STROKE);
                p.setStrokeWidth(strokeWidth);
                p.setARGB(strokeAlpha, rgb.r, rgb.g, rgb.b);
                canvas.drawRoundRect(rf, self.dp(6), self.dp(6), p);
              } catch(eDraw) {}
            }
          }, context);
          return FrameView;
        };
      }
      if (typeof proto.showPointerAreaFrame === "function") {
        var oldShowFrame = proto.showPointerAreaFrame;
        proto.showPointerAreaFrame = function(rect, kind) {
          var st = applyPerfDefaults18(this);
          if (!st || !rect) return oldShowFrame.call(this, rect, kind);
          var now = now18();
          var norm = normalizeRect18(rect) || rect;
          var nextKind = String(kind || "area");
          var oldKind = "";
          try { oldKind = String(st.frameKind || ""); } catch(eOldKind18) { oldKind = ""; }
          if (st.frameAdded && st.frame && oldKind === nextKind && st.__th18FrameRect && sameRect18(st.__th18FrameRect, norm, 1) && now - Number(st.__th18FrameTs || 0) < 80) return;
          if (st.frameAdded && st.frame && oldKind === nextKind && st.__th18FrameRect && sameRect18(st.__th18FrameRect, norm, 2) && now - Number(st.__th18FrameTs || 0) < Number(st.__th18FrameMinInterval || 28)) return;
          st.__th18FrameRect = { left: int18(norm.left), top: int18(norm.top), right: int18(norm.right), bottom: int18(norm.bottom) };
          st.__th18FrameTs = now;
          try { st.frameKind = nextKind; } catch(eSetKind18) {}
          return oldShowFrame.call(this, rect, nextKind);
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

      if (typeof proto.createPointerLayoutParams === "function") {
        var oldCreatePointerLayoutParams18 = proto.createPointerLayoutParams;
        proto.createPointerLayoutParams = function(st) {
          var lp = oldCreatePointerLayoutParams18.call(this, st);
          try {
            lp.flags = lp.flags | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
          } catch(eNoLimits) {}
          return lp;
        };
      }

      if (typeof proto.getPointerHotspot === "function") {
        var oldGetPointerHotspot18 = proto.getPointerHotspot;
        proto.getPointerHotspot = function() {
          var st = this.ensurePointerToolState ? this.ensurePointerToolState() : null;
          if (st && st.__th18FixedEdgePointerMode === true) {
            var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));
            var sh = Math.max(1, Number(this.state.screen && this.state.screen.h || 0));
            var x = int18(st.pointerX + st.anchorLocalX + st.queryOffsetX);
            var y = int18(st.pointerY + st.anchorLocalY + st.queryOffsetY);
            x = clamp18(this, x, 0, Math.max(0, sw - 1));
            y = clamp18(this, y, 0, Math.max(0, sh - 1));
            return { x: x, y: y };
          }
          return oldGetPointerHotspot18.call(this);
        };
      }

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
      var oldPointerBallTap18 = proto.onPointerBallTap;
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
        var st = null;
        try { st = this.ensurePointerToolState ? this.ensurePointerToolState() : null; } catch(eStTap) { st = null; }
        if (st && st.active && !st.closed && typeof oldPointerBallTap18 === "function") {
          try { return oldPointerBallTap18.call(this, rawX, rawY); }
          catch(eOldTap) { try { safeLog(this.L, 'e', 'fixed pointer tap fallback fail: ' + String(eOldTap)); } catch(eLogTap) {} }
        }
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

  function getMainHandler18(appObj) {
    try {
      if (appObj && appObj.state && appObj.state.h) return appObj.state.h;
    } catch(e0) {}
    return new android.os.Handler(android.os.Looper.getMainLooper());
  }

  function quitHandlerThread18(ht) {
    try {
      if (!ht) return;
      if (android.os.Build.VERSION.SDK_INT >= 18 && ht.quitSafely) ht.quitSafely();
      else if (ht.quit) ht.quit();
    } catch(e0) {}
  }

  function cloneRect18(rect) {
    var rr = normalizeRect18(rect);
    if (!rr) return null;
    return {
      left: int18(rr.left),
      top: int18(rr.top),
      right: int18(rr.right),
      bottom: int18(rr.bottom)
    };
  }

  function getOcrTimeoutMs18(appObj) {
    var timeoutMs = 5000;
    try {
      timeoutMs = Number(appObj && appObj.config ? (appObj.config.POINTER_AREA_OCR_TIMEOUT_MS || 5000) : 5000);
    } catch(e0) { timeoutMs = 5000; }
    if (isNaN(timeoutMs)) timeoutMs = 5000;
    timeoutMs = Math.max(1000, Math.min(30000, timeoutMs));
    return timeoutMs;
  }

  function applyAreaOcrResult18(appObj, st, token, obj, path, rect, textOk, textValue, textError, clipboardOk, clipboardError, code, message, source) {
    try {
      if (!st) return false;
      if (Number(st.areaOcrSeq || 0) !== Number(token)) return false;
      if (Number(st.areaOcrDoneToken || 0) === Number(token)) return false;

      st.areaOcrDoneToken = Number(token);
      st.areaOcrRunningToken = 0;

      try {
        if (st.areaOcrTimeoutRunnable && st.handler) st.handler.removeCallbacks(st.areaOcrTimeoutRunnable);
      } catch(eRemoveTimeout) {}
      st.areaOcrTimeoutRunnable = null;

      if (!obj) obj = {};
      if (!obj.data) obj.data = {};

      obj.ok = textOk === true && !!textValue;
      obj.type = "area_ocr";
      obj.code = String(code || (textOk ? "AREA_OCR_SUCCESS" : "AREA_OCR_FAILED"));
      obj.message = String(message || (textOk ? "框选识别完成" : "框选识别失败"));
      obj.value = String(textValue || "");
      obj.captureRect = cloneRect18(rect || obj.captureRect || obj.data.captureRect);
      obj.screenshotFilePath = String(path || obj.screenshotFilePath || obj.value || "");
      obj.ocrText = String(textValue || "");
      obj.ocrError = textOk ? "" : String(textError || "");
      obj.ocrSource = String(source || "rect_async");
      obj.ocrPending = false;
      obj.clipboardOk = clipboardOk === true;
      obj.clipboardError = String(clipboardError || "");

      obj.data.path = obj.screenshotFilePath;
      obj.data.captureRect = obj.captureRect || null;
      obj.data.visualRect = obj.visualRect || obj.data.visualRect || null;
      obj.data.ocrText = obj.ocrText;
      obj.data.ocrError = obj.ocrError;
      obj.data.ocrSource = obj.ocrSource;
      obj.data.ocrPending = false;
      obj.data.clipboardOk = obj.clipboardOk;
      obj.data.clipboardError = obj.clipboardError;

      appObj.setPointerToolResult(obj);

      try {
        safeLog(appObj.L, textOk ? 'i' : 'w',
          "pointer area_ocr async result token=" + String(token) +
          " ok=" + String(textOk === true) +
          " clip=" + String(clipboardOk === true) +
          " rect=" + rectKey18(obj.captureRect) +
          " path=" + String(obj.screenshotFilePath || "") +
          " code=" + String(obj.code || "") +
          " err=" + String(obj.ocrError || "") +
          " clipErr=" + String(obj.clipboardError || "")
        );
      } catch(eLog) {}

      try {
        if (textOk && clipboardOk) appObj.toast("识别完成，已复制");
        else if (textOk) appObj.toast("识别完成，复制失败");
        else if (String(code || "") === "AREA_OCR_TIMEOUT") appObj.toast("OCR 超时，已保留截图");
        else appObj.toast("截图完成，识别失败");
      } catch(eToast) {}

      return true;
    } catch(e0) {
      try { safeLog(appObj.L, 'e', "applyAreaOcrResult18 fail: " + String(e0)); } catch(eLog2) {}
    }
    return false;
  }

  function isAreaOcrTokenCurrent18(st, token) {
    if (!st) return false;
    if (Number(st.areaOcrSeq || 0) !== Number(token)) return false;
    if (Number(st.areaOcrDoneToken || 0) === Number(token)) return false;
    return true;
  }

  function clearAreaOcrWorkerRefs18(st, ht, workerH, timeoutRunnable, token) {
    if (!st) return;
    try {
      if (st.areaOcrThread === ht) st.areaOcrThread = null;
    } catch(eThreadRef) {}
    try {
      if (st.areaOcrHandler === workerH) st.areaOcrHandler = null;
    } catch(eHandlerRef) {}
    try {
      if (st.areaOcrTimeoutRunnable === timeoutRunnable) st.areaOcrTimeoutRunnable = null;
    } catch(eTimeoutRef) {}
    try {
      if (Number(st.areaOcrRunningToken || 0) === Number(token)) st.areaOcrRunningToken = 0;
    } catch(eRunningRef) {}
  }

  function stopAreaOcrWorker18(appObj, st, reason) {
    if (!st) return false;

    var mainH = null;
    var timeoutRunnable = null;
    var workerH = null;
    var ht = null;

    try { mainH = st.handler || getMainHandler18(appObj); } catch(eMain) { mainH = null; }
    try { timeoutRunnable = st.areaOcrTimeoutRunnable || null; } catch(eTimeoutGet) { timeoutRunnable = null; }
    try { workerH = st.areaOcrHandler || null; } catch(eHandlerGet) { workerH = null; }
    try { ht = st.areaOcrThread || null; } catch(eThreadGet) { ht = null; }

    try {
      if (mainH && timeoutRunnable) mainH.removeCallbacks(timeoutRunnable);
    } catch(eRemoveTimeout) {}

    try {
      if (workerH) workerH.removeCallbacksAndMessages(null);
    } catch(eRemoveWorker) {}

    try { quitHandlerThread18(ht); } catch(eQuitWorker) {}

    try { st.areaOcrTimeoutRunnable = null; } catch(eClearTimeout) {}
    try { st.areaOcrHandler = null; } catch(eClearHandler) {}
    try { st.areaOcrThread = null; } catch(eClearThread) {}
    try { st.areaOcrRunningToken = 0; } catch(eClearRunning) {}

    try {
      if (timeoutRunnable || workerH || ht) {
        safeLog(
          appObj && appObj.L,
          'i',
          "pointer area_ocr worker stopped reason=" + String(reason || "")
        );
      }
    } catch(eLogStop) {}

    return true;
  }

  function scheduleAreaOcrAsync18(appObj, st, obj, rect, path, ret) {
    var ht = null;
    var workerH = null;
    var timeoutRunnable = null;

    try {
      if (!appObj || !st) return false;

      var rr = cloneRect18(rect);
      var screenshotPath = String(path || "");

      // 新 token 先使旧任务失效，再清理旧 worker 和 timeout。
      var token = Number(st.areaOcrSeq || 0) + 1;
      st.areaOcrSeq = token;
      stopAreaOcrWorker18(appObj, st, "replace_with_token_" + String(token));

      st.areaOcrRunningToken = token;
      st.areaOcrDoneToken = 0;

      if (!st.handler) st.handler = getMainHandler18(appObj);
      var mainH = st.handler || getMainHandler18(appObj);

      if (!obj) obj = {};
      if (!obj.data) obj.data = {};

      obj.ok = false;
      obj.type = "area_ocr";
      obj.code = "AREA_OCR_PENDING";
      obj.message = screenshotPath ? "框选截图完成，正在识别" : "框选完成，截图失败";
      obj.value = screenshotPath;
      obj.captureRect = rr || obj.captureRect || null;
      obj.screenshotFilePath = screenshotPath;
      obj.ocrText = "";
      obj.ocrError = "";
      obj.ocrSource = "rect_async";
      obj.ocrPending = true;
      obj.clipboardOk = false;
      obj.clipboardError = "";

      obj.data.path = screenshotPath;
      obj.data.captureRect = obj.captureRect || null;
      obj.data.visualRect = obj.visualRect || obj.data.visualRect || null;
      obj.data.ocrText = "";
      obj.data.ocrError = "";
      obj.data.ocrSource = "rect_async";
      obj.data.ocrPending = true;
      obj.data.clipboardOk = false;
      obj.data.clipboardError = "";

      appObj.setPointerToolResult(obj);

      if (ret) {
        ret.type = "area_ocr";
        ret.code = obj.code;
        ret.ocrPending = true;
        ret.ocrText = "";
        ret.ocrError = "";
        ret.ocrSource = "rect_async";
        ret.clipboardOk = false;
        ret.clipboardError = "";
      }

      if (!screenshotPath || !rr) {
        applyAreaOcrResult18(
          appObj,
          st,
          token,
          obj,
          screenshotPath,
          rr,
          false,
          "",
          rr ? "截图路径为空" : "OCR区域为空",
          false,
          "",
          screenshotPath ? "AREA_OCR_FAILED" : "AREA_SCREENSHOT_FAILED",
          screenshotPath ? "框选截图完成，识别失败" : "框选完成，截图失败",
          "rect_async"
        );
        return false;
      }

      try { appObj.toast("截图完成，正在识别"); } catch(eToastStart) {}

      var timeoutMs = getOcrTimeoutMs18(appObj);
      var workerName = "toolhub_area_ocr_" + String(token);

      ht = new android.os.HandlerThread(workerName);
      ht.start();
      workerH = new android.os.Handler(ht.getLooper());

      st.areaOcrThread = ht;
      st.areaOcrHandler = workerH;

      timeoutRunnable = new java.lang.Runnable({ run: function() {
        try {
          if (!isAreaOcrTokenCurrent18(st, token)) return;

          applyAreaOcrResult18(
            appObj,
            st,
            token,
            obj,
            screenshotPath,
            rr,
            false,
            "",
            "OCR超时 " + String(timeoutMs) + "ms",
            false,
            "",
            "AREA_OCR_TIMEOUT",
            "OCR 超时，已保留截图",
            "rect_async_timeout"
          );
        } catch(eTimeout) {
          try {
            safeLog(
              appObj.L,
              'e',
              "pointer area_ocr timeout runnable fail: " + String(eTimeout)
            );
          } catch(eLogTimeout) {}
        } finally {
          // token 已失效时同样必须清理旧 worker，不能直接泄漏 Looper。
          try {
            if (workerH) workerH.removeCallbacksAndMessages(null);
          } catch(eRemoveTimeoutWorker) {}
          try { quitHandlerThread18(ht); } catch(eQuitTimeout) {}
          clearAreaOcrWorkerRefs18(st, ht, workerH, timeoutRunnable, token);
        }
      }});

      st.areaOcrTimeoutRunnable = timeoutRunnable;

      try {
        mainH.postDelayed(timeoutRunnable, timeoutMs);
      } catch(ePostTimeout) {
        try { if (workerH) workerH.removeCallbacksAndMessages(null); } catch(eRemovePostTimeout) {}
        try { quitHandlerThread18(ht); } catch(eQuitPostTimeout) {}
        clearAreaOcrWorkerRefs18(st, ht, workerH, timeoutRunnable, token);
        throw ePostTimeout;
      }

      workerH.post(new java.lang.Runnable({ run: function() {
        var textValue = "";
        var textError = "";
        var textOk = false;
        var postedToMain = false;

        try {
          if (!isAreaOcrTokenCurrent18(st, token)) return;

          try {
            textValue = appObj.runPointerAreaTextByRect(rr);
            textOk = true;
          } catch(eOcr) {
            textError = String(eOcr);
          }

          // OCR 执行期间可能已超时或被新会话取消。
          // 必须在回主线程前再次检查，迟到结果不能继续处理。
          if (!isAreaOcrTokenCurrent18(st, token)) return;

          mainH.post(new java.lang.Runnable({ run: function() {
            var clipboardOk = false;
            var clipboardError = "";

            try {
              // 剪贴板写入必须位于最终 token 校验之后。
              if (!isAreaOcrTokenCurrent18(st, token)) return;

              if (textOk && textValue) {
                try {
                  clipboardOk = appObj.copyPointerAreaTextToClipboard(textValue) === true;
                } catch(eClip) {
                  clipboardError = String(eClip);
                }
              }

              // 防止复制过程中发生重入或新会话切换。
              if (!isAreaOcrTokenCurrent18(st, token)) return;

              var code = textOk ? "AREA_OCR_SUCCESS" : "AREA_OCR_FAILED";
              var msg = textOk
                ? (clipboardOk ? "框选识别完成，已复制" : "框选识别完成")
                : "框选截图完成，识别失败";

              applyAreaOcrResult18(
                appObj,
                st,
                token,
                obj,
                screenshotPath,
                rr,
                textOk,
                textValue,
                textError,
                clipboardOk,
                clipboardError,
                code,
                msg,
                "rect_async"
              );
            } catch(eApply) {
              try {
                safeLog(
                  appObj.L,
                  'e',
                  "pointer area_ocr async apply fail: " + String(eApply)
                );
              } catch(eLogApply) {}
            } finally {
              clearAreaOcrWorkerRefs18(st, ht, workerH, timeoutRunnable, token);
            }
          }}));

          postedToMain = true;
        } catch(eWorker) {
          try {
            safeLog(
              appObj.L,
              'e',
              "pointer area_ocr worker fail: " + String(eWorker)
            );
          } catch(eLogWorker) {}
        } finally {
          // 无论正常、失效、异常还是尚未执行 OCR，都必须退出 Looper。
          try { quitHandlerThread18(ht); } catch(eQuitWorker) {}

          if (!postedToMain) {
            try {
              if (st.areaOcrTimeoutRunnable === timeoutRunnable && st.handler) {
                st.handler.removeCallbacks(timeoutRunnable);
              }
            } catch(eRemoveStaleTimeout) {}

            clearAreaOcrWorkerRefs18(st, ht, workerH, timeoutRunnable, token);
          }
        }
      }}));

      try {
        safeLog(
          appObj.L,
          'i',
          "pointer area_ocr async scheduled token=" + String(token) +
          " timeoutMs=" + String(timeoutMs) +
          " rect=" + rectKey18(rr) +
          " path=" + screenshotPath
        );
      } catch(eLogSchedule) {}

      return true;
    } catch(e0) {
      try {
        if (workerH) workerH.removeCallbacksAndMessages(null);
      } catch(eRemoveFail) {}
      try { quitHandlerThread18(ht); } catch(eQuitFail) {}
      clearAreaOcrWorkerRefs18(st, ht, workerH, timeoutRunnable, Number(st && st.areaOcrRunningToken || 0));

      try {
        safeLog(
          appObj && appObj.L,
          'e',
          "scheduleAreaOcrAsync18 fail: " + String(e0)
        );
      } catch(eLog) {}
    }

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
        try {
          var stCancelOcr = this.ensurePointerToolState ? this.ensurePointerToolState() : null;
          if (stCancelOcr) {
            // 先递增 token，使正在运行的旧 OCR 结果立即失效；
            // 再移除 timeout、worker 队列并关闭旧 HandlerThread。
            stCancelOcr.areaOcrSeq = Number(stCancelOcr.areaOcrSeq || 0) + 1;
            stopAreaOcrWorker18(this, stCancelOcr, "start_pointer_tool");
          }
        } catch(eCancelOcrStart) {
          try {
            safeLog(this.L, 'w', "cancel previous area_ocr fail: " + String(eCancelOcrStart));
          } catch(eCancelOcrLog) {}
        }
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
        if (ret && (ret.pending === true || String(ret.code || "") === "TEXT_PICK_FINAL_PENDING")) {
          try { safeLog(this.L, 'i', "pointer area_ocr skip pending fallback code=" + String(ret.code || "")); } catch(ePendingLog) {}
          return ret;
        }
        if (!wantText) return ret;
        try {
          if (!st && this.ensurePointerToolState) st = this.ensurePointerToolState();
          var obj = st && st.lastResult ? st.lastResult : null;
          if (!obj) obj = {};
          var path = "";
          try { path = String(obj.screenshotFilePath || obj.value || (obj.data && obj.data.path) || ""); } catch(ePath) { path = ""; }
          var rect = pickOcrRect18(obj, ret);

          // W3：截图完成后立即返回触摸结束链路，OCR 放入独立 HandlerThread。
          // timeout 到期只更新当前 OCR token 的结果，旧 token 不允许覆盖新会话。
          var scheduled = scheduleAreaOcrAsync18(this, st, obj, rect, path, ret);
          try { safeLog(this.L, scheduled ? 'i' : 'w', "pointer area_ocr async dispatch scheduled=" + String(scheduled) + " rect=" + rectKey18(rect) + " path=" + path); } catch(eLogDispatch) {}
        } catch(ePatchFinish) {
          try { safeLog(this.L, 'e', "pointer area_ocr async dispatch fail: " + String(ePatchFinish)); } catch(eLogFinish) {}
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
