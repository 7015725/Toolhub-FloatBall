// @version 1.0.1
// =======================【指针：框选截图后文本识别扩展】======================
// 正式模块，必须在 th_17_pointer.js 后加载。
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

  function int18(v) {
    try {
      if (typeof th17Int === "function") return th17Int(v);
    } catch(e0) {}
    var n = 0;
    try { n = Math.round(Number(v || 0)); } catch(e1) { n = 0; }
    if (isNaN(n)) n = 0;
    return n;
  }

  function rectKey18(rect) {
    try {
      if (typeof th17RectKey === "function") return th17RectKey(rect);
    } catch(e0) {}
    if (!rect) return "";
    return String(int18(rect.left)) + "," + String(int18(rect.top)) + "," + String(int18(rect.right)) + "," + String(int18(rect.bottom));
  }

  function getContext18() {
    try { if (typeof context !== "undefined" && context) return context; } catch(e0) {}
    try { if (typeof getToolHubAndroidContext === "function") return getToolHubAndroidContext(); } catch(e1) {}
    try {
      var app = Packages.android.app.ActivityThread.currentApplication();
      if (app) return app.getApplicationContext ? app.getApplicationContext() : app;
    } catch(e2) {}
    return null;
  }

  function copyClipboard18(text) {
    var value = String(text == null ? "" : text);
    if (!value) return false;
    var ctx = getContext18();
    if (!ctx) throw new Error("context 不可用");
    var cm = ctx.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
    if (!cm) throw new Error("ClipboardManager 不可用");
    var clip = android.content.ClipData.newPlainText("ToolHub OCR", value);
    cm.setPrimaryClip(clip);
    return true;
  }

  function cleanText18(raw) {
    var text = String(raw == null ? "" : raw);
    if (!text) return "";
    try {
      var t = text.replace(/^\s+|\s+$/g, "");
      if (t.charAt(0) === "{" || t.charAt(0) === "[") {
        var obj = JSON.parse(t);
        if (obj) {
          if (typeof obj.text !== "undefined") return String(obj.text || "");
          if (typeof obj.value !== "undefined") return String(obj.value || "");
          if (obj.data && typeof obj.data.text !== "undefined") return String(obj.data.text || "");
          if (obj.result && typeof obj.result.text !== "undefined") return String(obj.result.text || "");
          if (obj.blocks && obj.blocks.length) {
            var arr = [];
            for (var i = 0; i < obj.blocks.length; i++) {
              var b = obj.blocks[i];
              if (b && typeof b.text !== "undefined") arr.push(String(b.text || ""));
            }
            if (arr.length) return arr.join("\n");
          }
        }
      }
    } catch(e0) {}
    return text;
  }

  function classArray18(types) {
    var arr = java.lang.reflect.Array.newInstance(java.lang.Class.forName("java.lang.Class"), types.length);
    for (var i = 0; i < types.length; i++) java.lang.reflect.Array.set(arr, i, types[i]);
    return arr;
  }

  function objArray18(values) {
    var arr = java.lang.reflect.Array.newInstance(java.lang.Object, values.length);
    for (var i = 0; i < values.length; i++) java.lang.reflect.Array.set(arr, i, values[i]);
    return arr;
  }

  function invokeStaticBitmapOcr18(className, methodName, bitmap) {
    var cls = java.lang.Class.forName(className);
    var m = cls.getDeclaredMethod(methodName, classArray18([android.graphics.Bitmap.class]));
    m.setAccessible(true);
    return String(m.invoke(null, objArray18([bitmap])) || "");
  }

  function runBitmapTextDetect18(path) {
    var p = String(path || "");
    if (!p) throw new Error("截图路径为空");
    var f = new java.io.File(p);
    if (!f.exists()) throw new Error("截图文件不存在: " + p);
    var bitmap = android.graphics.BitmapFactory.decodeFile(p);
    if (!bitmap) throw new Error("截图解码失败");

    var errors = [];
    var classes = [
      "tornaco.apps.shortx.ext.api.ocr.ShortXPaddleApi",
      "tornaco.apps.shortx.ext.api.ocr.ShortXTessApi"
    ];
    var methods = ["recognizeTextJson", "recognizeText"];
    for (var ci = 0; ci < classes.length; ci++) {
      for (var mi = 0; mi < methods.length; mi++) {
        try {
          var raw = invokeStaticBitmapOcr18(classes[ci], methods[mi], bitmap);
          raw = cleanText18(raw);
          if (raw) return raw;
        } catch(e0) {
          errors.push(classes[ci] + "." + methods[mi] + ": " + String(e0));
        }
      }
    }
    throw new Error("截图 OCR 不可用: " + errors.join(" | ").substring(0, 900));
  }

  function runTextDetect18(rect) {
    if (!rect) throw new Error("识别区域为空");
    var l = int18(rect.left);
    var t = int18(rect.top);
    var r = int18(rect.right);
    var b = int18(rect.bottom);
    if (r <= l || b <= t) throw new Error("识别区域无效");
    if (typeof shortx === "undefined" || !shortx || !shortx.executeAction) throw new Error("shortx.executeAction 不可用");

    var OcrDetect = Packages.tornaco.apps.shortx.core.proto.action.OcrDetect;
    var OcrDetectOutputType = Packages.tornaco.apps.shortx.core.proto.action.OcrDetectOutputType;
    var RectSourceRect = Packages.tornaco.apps.shortx.core.proto.common.RectSourceRect;
    var Rect = Packages.tornaco.apps.shortx.core.proto.common.Rect;
    var Any = Packages.com.google.protobuf.Any;

    var action = OcrDetect.newBuilder()
      .setRectSrc(Any.pack(RectSourceRect.newBuilder().setRect(Rect.newBuilder().setLeft(l).setTop(t).setRight(r).setBottom(b).build()).build()))
      .setThreads(4)
      .setUseSlim(false)
      .setSeparator("\n")
      .setOutputType(OcrDetectOutputType.OcrDetectOutputType_Text)
      .build();

    var result = shortx.executeAction(action);
    var ctxData = null;
    try { ctxData = result.contextData; } catch(eCd0) { ctxData = null; }
    if (!ctxData) {
      try { ctxData = result.getContextData(); } catch(eCd1) { ctxData = null; }
    }
    if (!ctxData) return "";
    return cleanText18(String(ctxData.get("ocrResult") || ""));
  }

  function install18() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubPointerTextPatchInstalled === true) return true;
      if (typeof proto.startPointerTool !== "function") return false;
      if (typeof proto.finishPointerAreaCapture !== "function") return false;
      if (typeof proto.execPointerAction !== "function") return false;

      proto.runPointerAreaTextByRect = function(rect) {
        return runTextDetect18(rect);
      };

      proto.runPointerAreaTextByScreenshot = function(path) {
        return runBitmapTextDetect18(path);
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
            }
          } catch(eSt) {}
          try { this.toast("悬停后拖动框选识别"); } catch(eToast) {}
          return { ok: !!(ret && ret.ok), type: "pointer_started", mode: "area_ocr", base: ret || null };
        }
        return oldStartPointerTool.call(this, options);
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
          wantText = !!(st && st.areaOcrRequested === true);
        } catch(eWant) { wantText = false; }

        var ret = oldFinishPointerAreaCapture.call(this);
        if (!wantText) return ret;

        try {
          if (!st && this.ensurePointerToolState) st = this.ensurePointerToolState();
          var obj = st && st.lastResult ? st.lastResult : null;
          if (!obj) obj = {};
          var path = "";
          try { path = String(obj.screenshotFilePath || obj.value || (obj.data && obj.data.path) || ""); } catch(ePath) { path = ""; }
          var rect = obj.captureRect || obj.visualRect || (ret && ret.captureRect) || (ret && ret.visualRect) || null;
          var textValue = "";
          var textError = "";
          var textOk = false;
          var textSource = "";
          var clipboardOk = false;
          var clipboardError = "";

          if (path) {
            try {
              textValue = this.runPointerAreaTextByScreenshot(path);
              textOk = true;
              textSource = "screenshot";
            } catch(eShotText) {
              textError = String(eShotText);
            }
          }
          if (!textOk && rect) {
            try {
              textValue = this.runPointerAreaTextByRect(rect);
              textOk = true;
              textSource = "rect";
            } catch(eText) {
              textError = textError ? (textError + " | rect: " + String(eText)) : String(eText);
            }
          } else if (!path && !rect) {
            textError = "截图文件和识别区域均为空";
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
          obj.ocrText = textValue;
          obj.ocrError = textOk ? "" : textError;
          obj.ocrSource = textSource;
          obj.clipboardOk = clipboardOk;
          obj.clipboardError = clipboardError;
          if (!obj.data) obj.data = {};
          obj.data.ocrText = textValue;
          obj.data.ocrError = textOk ? "" : textError;
          obj.data.ocrSource = textSource;
          obj.data.clipboardOk = clipboardOk;
          obj.data.clipboardError = clipboardError;
          try { if (!obj.data.path) obj.data.path = path; } catch(eDataPath) {}
          this.setPointerToolResult(obj);

          try { safeLog(this.L, textOk ? 'i' : 'w', "pointer area_ocr result ok=" + String(textOk) + " source=" + textSource + " clip=" + String(clipboardOk) + " rect=" + rectKey18(rect) + " path=" + path + " err=" + textError + " clipErr=" + clipboardError); } catch(eLog2) {}
          try {
            if (textOk && clipboardOk) this.toast("识别完成，已复制");
            else if (textOk) this.toast("识别完成");
            else this.toast("截图完成，识别失败");
          } catch(eToast2) {}

          if (ret) {
            ret.type = "area_ocr";
            ret.code = obj.code;
            ret.ocrText = textValue;
            ret.ocrError = obj.ocrError;
            ret.ocrSource = textSource;
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