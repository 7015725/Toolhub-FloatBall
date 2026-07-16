// @version 1.1.3
// =======================【指针：框选截图后文本识别扩展】======================
// 正式模块，必须在 th_17_pointer.js 后加载。
// OCR 方法：使用 ShortX OcrDetect + RectSourceRect 识别框选屏幕区域。
// 状态职责：本模块只保留 OCR 与指针性能扩展；固定位置和触摸状态由 th_19_position_state.js 统一负责。
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

  function isUsableScreenshotPath18(path) {
    var value = "";
    try { value = String(path || "").replace(/^\s+|\s+$/g, ""); } catch(e0) { value = ""; }
    if (!value || value.charAt(0) !== "/") return false;
    try {
      var file = new java.io.File(value);
      return file.isFile() === true;
    } catch(e1) {}
    return false;
  }

  function pickScreenshotPath18(obj, ret) {
    var path = "";
    try {
      path = String(
        (obj && obj.screenshotFilePath) ||
        (obj && obj.data && obj.data.path) ||
        (ret && ret.screenshotFilePath) ||
        ""
      );
    } catch(e0) { path = ""; }
    path = path.replace(/^\s+|\s+$/g, "");
    return isUsableScreenshotPath18(path) ? path : "";
  }

    function canDispatchAreaOcr18(st, obj, ret) {
    if (!st || !obj) return false;
    if (ret && ret.fallback === true) return false;
    if (String(obj.type || "") !== "area_capture") return false;
    return !!pickOcrRect18(obj, ret);
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
                    rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_READY_HEX", "POINTER_FRAME_TEXT_HOVER_HEX", 34, 197, 94);
                    fillAlpha = 38;
                    strokeAlpha = 248;
                    strokeWidth = self.dp(2.3);
                  } else if (typeof th17PointerColorRgbWithFallback === "function") {
                    if (processing || kind === "capture") {
                      rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                      fillAlpha = 56;
                      strokeAlpha = 245;
                    } else if (kind === "text_hover") {
                      rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_HOVER_HEX", "POINTER_COLOR_NORMAL_HEX", 14, 165, 233);
                      fillAlpha = 26;
                      strokeAlpha = 215;
                      strokeWidth = self.dp(1.8);
                    } else if (kind === "area_armed") {
                      rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                      fillAlpha = 18;
                      strokeAlpha = 150;
                      strokeWidth = self.dp(1.4);
                    } else {
                      rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
                    }
                  }
                } catch(eColor18) {}
                if (!rgb) rgb = { r: 59, g: 130, b: 246 };
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

  function applyAreaOcrResult18(appObj, st, token, obj, path, rect, textOk, textValue, textError, code, message, source) {
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

      var screenshotPath = String(path || obj.screenshotFilePath || "").replace(/^\s+|\s+$/g, "");
      var screenshotOk = isUsableScreenshotPath18(screenshotPath);
      if (!screenshotOk) screenshotPath = "";
      var screenshotError = "";
      try { screenshotError = String(obj.screenshotError || obj.data.error || ""); } catch(eScreenshotError) { screenshotError = ""; }

      var normalizedText = String(textValue || "").replace(/^\s+|\s+$/g, "");
      var hasText = textOk === true && normalizedText.length > 0;
      var resultCode = String(code || "");
      var resultMessage = String(message || "");

      if (textOk === true && !hasText) {
        resultCode = "AREA_OCR_EMPTY";
        resultMessage = screenshotOk ? "框选完成，未识别到文字" : "未识别到文字，截图保存失败";
      } else {
        if (!resultCode) resultCode = hasText ? "AREA_OCR_SUCCESS" : "AREA_OCR_FAILED";
        if (!resultMessage) resultMessage = hasText ? "框选识别完成" : "框选识别失败";
      }

      obj.ok = hasText;
      obj.type = "area_ocr";
      obj.code = resultCode;
      obj.value = normalizedText;
      obj.captureRect = cloneRect18(rect || obj.captureRect || obj.data.captureRect);
      obj.screenshotFilePath = screenshotPath;
      obj.screenshotOk = screenshotOk;
      obj.screenshotError = screenshotError;
      obj.partial = hasText && !screenshotOk;
      obj.ocrText = normalizedText;
      obj.ocrError = textOk === true ? "" : String(textError || "");
      obj.ocrEmpty = textOk === true && !hasText;
      obj.ocrSource = String(source || "rect_async");
      obj.ocrPending = false;
      obj.clipboard = false;
      obj.clipboardOk = false;
      obj.clipboardError = "";

      var previewRet = null;
      if (hasText && typeof appObj.publishResultPreview === "function") {
        try {
          previewRet = appObj.publishResultPreview({
            kind: "text",
            source: "pointer_ocr",
            text: normalizedText,
            previewText: normalizedText,
            screenshotPath: obj.screenshotFilePath,
            rect: obj.captureRect,
            primaryAction: "pickword",
            actions: [],
            createdAt: now18()
          });
        } catch(ePreview) {
          previewRet = { ok: false, code: "RESULT_PREVIEW_FAILED", message: String(ePreview) };
        }
      }

      obj.preview = !!(previewRet && previewRet.ok === true);
      obj.previewId = previewRet && previewRet.previewId ? String(previewRet.previewId) : "";
      if (hasText) {
        if (screenshotOk) resultMessage = obj.preview ? "框选识别完成，已显示预览" : "框选识别完成";
        else resultMessage = obj.preview ? "识别完成，截图保存失败，已显示预览" : "识别完成，截图保存失败";
      } else if (!screenshotOk && resultCode === "AREA_OCR_TIMEOUT") {
        resultMessage = "OCR 超时，截图保存失败";
      } else if (!screenshotOk && resultCode === "AREA_OCR_FAILED") {
        resultMessage = "识别失败，截图保存失败";
      }
      obj.message = resultMessage;

      obj.data.path = obj.screenshotFilePath;
      obj.data.captureRect = obj.captureRect || null;
      obj.data.visualRect = obj.visualRect || obj.data.visualRect || null;
      obj.data.screenshotOk = obj.screenshotOk;
      obj.data.screenshotError = obj.screenshotError;
      obj.data.ocrText = obj.ocrText;
      obj.data.ocrError = obj.ocrError;
      obj.data.ocrEmpty = obj.ocrEmpty;
      obj.data.ocrSource = obj.ocrSource;
      obj.data.ocrPending = false;
      obj.data.clipboardAccepted = false;
      obj.data.clipboardOk = false;
      obj.data.clipboardError = "";
      obj.data.previewQueued = obj.preview;
      obj.data.previewId = obj.previewId;

      appObj.setPointerToolResult(obj);

      try {
        safeLog(appObj.L, hasText ? 'i' : 'w',
          "pointer area_ocr async result token=" + String(token) +
          " ok=" + String(hasText === true) +
          " empty=" + String(obj.ocrEmpty === true) +
          " screenshotOk=" + String(obj.screenshotOk === true) +
          " preview=" + String(obj.preview === true) +
          " rect=" + rectKey18(obj.captureRect) +
          " path=" + String(obj.screenshotFilePath || "") +
          " code=" + String(obj.code || "") +
          " screenshotErr=" + String(obj.screenshotError || "") +
          " err=" + String(obj.ocrError || "")
        );
      } catch(eLog) {}

      try {
        if (hasText && !obj.preview) appObj.toast(screenshotOk ? "识别完成" : "识别完成，截图保存失败");
        else if (resultCode === "AREA_OCR_EMPTY") appObj.toast(screenshotOk ? "未识别到文字，已保留截图" : "未识别到文字，截图保存失败");
        else if (resultCode === "AREA_OCR_TIMEOUT") appObj.toast(screenshotOk ? "OCR 超时，已保留截图" : "OCR 超时，截图保存失败");
        else if (!hasText) appObj.toast(screenshotOk ? "截图完成，识别失败" : "识别失败，截图保存失败");
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
      var rawScreenshotPath = String(path || "").replace(/^\s+|\s+$/g, "");
      var screenshotPath = isUsableScreenshotPath18(rawScreenshotPath) ? rawScreenshotPath : "";
      if (!rr) {
        try {
          safeLog(appObj.L, 'w',
            "pointer area_ocr dispatch skipped reason=invalid_rect" +
            " rect=" + rectKey18(rr) +
            " path=" + screenshotPath);
        } catch(eSkipLog) {}
        return false;
      }

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
      var screenshotError = "";
      try { screenshotError = String(obj.screenshotError || obj.data.error || ""); } catch(eScreenshotError) { screenshotError = ""; }

      obj.ok = false;
      obj.type = "area_ocr";
      obj.code = "AREA_OCR_PENDING";
      obj.message = screenshotPath ? "框选截图完成，正在识别" : "截图保存失败，正在识别";
      obj.value = screenshotPath;
      obj.captureRect = rr || obj.captureRect || null;
      obj.screenshotFilePath = screenshotPath;
      obj.screenshotOk = !!screenshotPath;
      obj.screenshotError = screenshotError;
      obj.ocrText = "";
      obj.ocrError = "";
      obj.ocrSource = "rect_async";
      obj.ocrPending = true;
      obj.clipboardOk = false;
      obj.clipboardError = "";

      obj.data.path = screenshotPath;
      obj.data.screenshotOk = obj.screenshotOk;
      obj.data.screenshotError = obj.screenshotError;
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

      try { appObj.toast(screenshotPath ? "截图完成，正在识别" : "截图保存失败，正在识别"); } catch(eToastStart) {}

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
            "AREA_OCR_TIMEOUT",
            screenshotPath ? "OCR 超时，已保留截图" : "OCR 超时，截图保存失败",
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
            textValue = String(appObj.runPointerAreaTextByRect(rr) || "")
              .replace(/^\s+|\s+$/g, "");
            textOk = true;
          } catch(eOcr) {
            textError = String(eOcr);
          }

          // OCR 执行期间可能已超时或被新会话取消。
          // 必须在回主线程前再次检查，迟到结果不能继续处理。
          if (!isAreaOcrTokenCurrent18(st, token)) return;

          mainH.post(new java.lang.Runnable({ run: function() {
            try {
              // 预览发布必须位于最终 token 校验之后；迟到 OCR 不得覆盖当前结果。
              if (!isAreaOcrTokenCurrent18(st, token)) return;

              var hasText = textOk === true && !!textValue;
              var code = !textOk
                ? "AREA_OCR_FAILED"
                : (hasText ? "AREA_OCR_SUCCESS" : "AREA_OCR_EMPTY");
              var msg = !textOk
                ? (screenshotPath ? "框选截图完成，识别失败" : "识别失败，截图保存失败")
                : (hasText
                  ? (screenshotPath ? "框选识别完成" : "识别完成，截图保存失败")
                  : (screenshotPath ? "框选完成，未识别到文字" : "未识别到文字，截图保存失败"));

              if (!isAreaOcrTokenCurrent18(st, token)) return;

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
          " screenshotOk=" + String(!!screenshotPath) +
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
        return true;
      }
      if (typeof proto.startPointerTool !== "function") return false;
      if (typeof proto.finishPointerAreaCapture !== "function") return false;
      if (typeof proto.execPointerAction !== "function") return false;

      installPointerPerf18(proto);

      proto.runPointerAreaTextByRect = function(rect) { return runShortxRectOcr18(rect); };

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
        try {
          var normalSt = this.ensurePointerToolState ? this.ensurePointerToolState() : null;
          if (normalSt) {
            normalSt.areaOcrRequested = false;
            normalSt.areaOcrSource = "";
          }
          applyPerfDefaults18(this);
        } catch(ePerfStart) {}
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
      var oldOnPointerAreaCaptureCompleted18 =
        proto.onPointerAreaCaptureCompleted;

      proto.onPointerAreaCaptureCompleted = function(st, token, obj, ret) {
        var oldRet = false;
        try {
          if (typeof oldOnPointerAreaCaptureCompleted18 === "function") {
            oldRet = oldOnPointerAreaCaptureCompleted18.call(
              this,
              st,
              token,
              obj,
              ret
            );
          }
        } catch (eOldCompleted) {
          try {
            safeLog(
              this.L,
              'w',
              "old area capture completion hook fail: " +
              String(eOldCompleted)
            );
          } catch (eOldCompletedLog) {}
        }

        try {
          if (!st || !obj) return oldRet;

          var wantText = !!(
            st.areaOcrRequested === true ||
            String(obj.type || "") === "area_capture"
          );
          if (!wantText) return oldRet;
          if (!canDispatchAreaOcr18(st, obj, ret)) return oldRet;

          var path = pickScreenshotPath18(obj, ret);
          var rect = pickOcrRect18(obj, ret);
          if (!rect) {
            try {
              safeLog(this.L, 'w',
                "pointer area_ocr completion skipped reason=invalid_rect" +
                " token=" + String(token) +
                " rect=" + rectKey18(rect) +
                " path=" + path);
            } catch(eSkipCompletedLog) {}
            return oldRet;
          }

          var scheduled = scheduleAreaOcrAsync18(
            this,
            st,
            obj,
            rect,
            path,
            ret
          );

          try {
            safeLog(
              this.L,
              scheduled ? 'i' : 'w',
              "pointer area_ocr dispatch after async capture" +
              " token=" + String(token) +
              " scheduled=" + String(scheduled) +
              " rect=" + rectKey18(rect) +
              " path=" + path
            );
          } catch (eLogCompleted) {}

          return scheduled === true || oldRet === true;
        } catch (eCompleted) {
          try {
            safeLog(
              this.L,
              'e',
              "pointer async capture OCR dispatch fail: " +
              String(eCompleted)
            );
          } catch (eCompletedLog) {}
        }

        return oldRet;
      };

      proto.finishPointerAreaCapture = function() {
        var st = null;
        var wantText = false;
        try {
          st = this.ensurePointerToolState ? this.ensurePointerToolState() : null;
          wantText = !!(st && (st.areaOcrRequested === true || st.mode === "area_capture"));
        } catch(eWant) { wantText = false; }
        var ret = oldFinishPointerAreaCapture.call(this);
        if (
          ret &&
          (
            ret.pending === true ||
            String(ret.code || "") === "TEXT_PICK_FINAL_PENDING" ||
            String(ret.code || "") === "AREA_CAPTURE_PENDING"
          )
        ) {
          try {
            safeLog(
              this.L,
              'i',
              "pointer area_ocr wait pending completion code=" +
              String(ret.code || "")
            );
          } catch (ePendingLog) {}
          return ret;
        }
        if (!wantText) return ret;
        if (ret && ret.fallback === true) return ret;
        try {
          if (!st && this.ensurePointerToolState) st = this.ensurePointerToolState();
          var obj = st && st.lastResult ? st.lastResult : null;
          if (!obj) obj = {};
          if (!canDispatchAreaOcr18(st, obj, ret)) return ret;
          var path = pickScreenshotPath18(obj, ret);
          var rect = pickOcrRect18(obj, ret);
          if (!rect) {
            try {
              safeLog(this.L, 'w',
                "pointer area_ocr sync dispatch skipped reason=invalid_rect" +
                " rect=" + rectKey18(rect) +
                " path=" + path);
            } catch(eSkipSyncLog) {}
            return ret;
          }

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
