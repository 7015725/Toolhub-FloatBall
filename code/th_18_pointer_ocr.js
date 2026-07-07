// @version 1.0.3
// =======================【指针：框选截图后文本识别扩展】======================
// 正式模块，必须在 th_17_pointer.js 后加载。
// OCR 方法：按 ShortX 实测可用方式，使用 OcrDetect + RectSourceRect 识别框选屏幕区域。
// 性能补丁：节流拖动更新、框选绘制、拖动检索，并复用框选绘制 Paint。
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
    try {
      if (typeof th17Int === "function") return th17Int(v);
    } catch(e0) {}
    var n = parseInt(String(v), 10);
    if (isNaN(n)) return 0;
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
    try {
      var h = new android.os.Handler(android.os.Looper.getMainLooper());
      h.post(new java.lang.Runnable({ run: function() {
        try { box.value = fn(); box.ok = true; } catch(eRun) { box.error = eRun; }
        try { latch.countDown(); } catch(eCount) {}
      }}));
      var done = latch["await"](timeoutMs || 1500, java.util.concurrent.TimeUnit.MILLISECONDS);
      if (!done) throw new Error("main thread timeout");
      if (!box.ok) throw box.error;
      return box.value;
    } catch(ePost) {
      throw ePost;
    }
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
        st.__th18FrameKey = "";
        st.__th18FrameTs = 0;
        st.__th18FrameRect = null;
        st.__th18LastDragInspectCall = 0;
        st.__th18LastMoveApply = 0;
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
          var key = rectKey18(norm);
          if (st.frameAdded && st.frame && st.__th18FrameRect && sameRect18(st.__th18FrameRect, norm, 1) && now - Number(st.__th18FrameTs || 0) < 80) {
            return;
          }
          if (st.frameAdded && st.frame && st.__th18FrameRect && sameRect18(st.__th18FrameRect, norm, 2) && now - Number(st.__th18FrameTs || 0) < Number(st.__th18FrameMinInterval || 28)) {
            return;
          }
          st.__th18FrameKey = key;
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

      var oldScheduleMove = proto.schedulePointerMove;
      proto.schedulePointerMove = function(x, y) {
        var st = applyPerfDefaults18(this);
        if (!st) return oldScheduleMove.call(this, x, y);
        if (!st.active || st.closed) return;
        if (!st.root || !st.lp) {
          if (!this.showPointerWindow(st)) return;
        }
        var pos = this.pointerPositionFromBall(x, y);
        var pendingDx = Math.abs(Number(pos.x || 0) - Number(st.pendingPointerX || 0));
        var pendingDy = Math.abs(Number(pos.y || 0) - Number(st.pendingPointerY || 0));
        if (pendingDx <= 0 && pendingDy <= 0 && st.dragUpdatePosted) return;
        st.pendingPointerX = pos.x;
        st.pendingPointerY = pos.y;
        st.pointerX = pos.x;
        st.pointerY = pos.y;
        if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
        if (st.dragUpdatePosted) return;
        st.dragUpdatePosted = true;
        var self = this;
        var delay = st.mode === "area_capture" ? Number(st.__th18MoveMinIntervalArea || 18) : Number(st.__th18MoveMinIntervalText || 24);
        if (isNaN(delay) || delay < 12) delay = 16;
        st.moveRunnable = new java.lang.Runnable({ run: function() {
          try {
            st.dragUpdatePosted = false;
            if (!st.active || st.closed || !st.root || !st.lp) return;
            var dx = Math.abs(Number(st.pendingPointerX || 0) - Number(st.lp.x || 0));
            var dy = Math.abs(Number(st.pendingPointerY || 0) - Number(st.lp.y || 0));
            if (dx <= 0 && dy <= 0) return;
            st.lp.x = st.pendingPointerX;
            st.lp.y = st.pendingPointerY;
            st.pointerX = st.lp.x;
            st.pointerY = st.lp.y;
            st.__th18LastMoveApply = now18();
            try { st.wm.updateViewLayout(st.root, st.lp); } catch(eU) { safeLog(self.L, 'e', "pointer update fail: " + String(eU)); }
            if (st.mode === "area_capture") self.updatePointerAreaSelection();
            else {
              self.updatePointerAreaHoldCandidate();
              self.scheduleDraggingInspect();
            }
          } catch(eRun) { safeLog(self.L, 'e', "th18 schedulePointerMove run fail: " + String(eRun)); }
        }});
        try { st.handler.postDelayed(st.moveRunnable, delay); } catch(ePost) { st.dragUpdatePosted = false; }
      };

      proto.__toolHubPointerPerfPatchInstalled = true;
      log18('i', "pointer performance patch installed");
      return true;
    } catch(ePerf) {
      log18('e', "pointer performance patch install fail: " + String(ePerf));
    }
    return false;
  }

  function install18() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubPointerTextPatchInstalled === true) {
        installPointerPerf18(proto);
        return true;
      }
      if (typeof proto.startPointerTool !== "function") return false;
      if (typeof proto.finishPointerAreaCapture !== "function") return false;
      if (typeof proto.execPointerAction !== "function") return false;

      installPointerPerf18(proto);

      proto.runPointerAreaTextByRect = function(rect) {
        return runShortxRectOcr18(rect);
      };

      proto.copyPointerAreaTextToClipboard = function(text) {
        return copyClipboard18(text);
      };

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
            try {
              textValue = this.runPointerAreaTextByRect(rect);
              textOk = true;
            } catch(eText) {
              textError = String(eText);
            }
          } else {
            textError = "OCR区域为空";
          }

          if (textOk && textValue) {
            try {
              clipboardOk = this.copyPointerAreaTextToClipboard(textValue) === true;
            } catch(eClip) {
              clipboardError = String(eClip);
            }
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
    } catch(eInstall) {
      log18('e', "pointer area_ocr patch install fail: " + String(eInstall));
    }
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