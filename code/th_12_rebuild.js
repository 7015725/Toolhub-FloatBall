// @version 1.0.3
// =======================【安全兼容配置安装器】======================
// 这段代码的主要内容/用途：在不改变现有执行逻辑的前提下，注入后续 Shell / Shortcut / Content 加固需要的配置项。
// 默认值全部保持兼容：Shell=compat，Shortcut=compat，Content=audit，ToolApp 横滑比例仍为 1.08。
(function() {
  function putSchema(key, schema) {
    try {
      if (typeof ConfigValidator === "undefined" || !ConfigValidator || !ConfigValidator.schemas) return;
      if (typeof ConfigValidator.schemas[key] === "undefined") ConfigValidator.schemas[key] = schema;
    } catch(e) {}
  }

  function putDefault(key, value) {
    try {
      if (typeof ConfigManager === "undefined" || !ConfigManager || !ConfigManager.defaultSettings) return;
      if (typeof ConfigManager.defaultSettings[key] === "undefined") ConfigManager.defaultSettings[key] = value;
    } catch(e) {}
  }

  putSchema("TOOLAPP_BACK_SURFACE_DOMINANCE", { type: "float", min: 1.0, max: 3.0, default: 1.08 });
  putSchema("SHELL_BRIDGE_MODE", { type: "enum", values: ["compat", "explicit", "strict"], default: "compat" });
  putSchema("SHELL_BRIDGE_TARGET_PACKAGE", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_TARGET_CLASS", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_EXTRA_TOKEN", { type: "string", default: "token" });
  putSchema("SHELL_BRIDGE_TOKEN", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_REQUIRE_TOKEN", { type: "bool", default: false });
  putSchema("SHORTCUT_EXEC_MODE", { type: "enum", values: ["compat", "strict"], default: "compat" });
  putSchema("CONTENT_SECURITY_MODE", { type: "enum", values: ["off", "audit", "strict"], default: "audit" });
  putSchema("CONTENT_URI_ALLOWLIST", { type: "string", default: "content://settings/system/|content://settings/secure/|content://settings/global/" });

  putDefault("TOOLAPP_BACK_SURFACE_DOMINANCE", 1.08);
  putDefault("SHELL_BRIDGE_MODE", "compat");
  putDefault("SHELL_BRIDGE_TARGET_PACKAGE", "");
  putDefault("SHELL_BRIDGE_TARGET_CLASS", "");
  putDefault("SHELL_BRIDGE_EXTRA_TOKEN", "token");
  putDefault("SHELL_BRIDGE_TOKEN", "");
  putDefault("SHELL_BRIDGE_REQUIRE_TOKEN", false);
  putDefault("SHORTCUT_EXEC_MODE", "compat");
  putDefault("CONTENT_SECURITY_MODE", "audit");
  putDefault("CONTENT_URI_ALLOWLIST", "content://settings/system/|content://settings/secure/|content://settings/global/");
})();

// =======================【新增：改大小后安全重建悬浮球】======================
FloatBallAppWM.prototype.rebuildBallForNewSize = function(keepPanels) {
  if (this.state.closing) return false;
  if (!this.state.wm) return false;
  if (!this.state.addedBall) return false;
  if (!this.state.ballRoot) return false;
  if (!this.state.ballLp) return false;
  if (this.state.dragging) return false;

  var oldSize = this.state.ballLp.height;
  if (!oldSize || oldSize <= 0) oldSize = this.getDockInfo().ballSize;

  var oldX = this.state.ballLp.x;
  var oldY = this.state.ballLp.y;

  var oldCenterX = oldX + Math.round(oldSize / 2);
  var oldCenterY = oldY + Math.round(oldSize / 2);

  if (!keepPanels) {
    this.hideAllPanels();
  }
  this.cancelDockTimer();

  this.state.docked = false;
  this.state.dockSide = null;

  this.safeRemoveView(this.state.ballRoot, "ballRoot-rebuild");

  this.state.ballRoot = null;
  this.state.ballContent = null;
  this.state.ballLp = null;
  this.state.addedBall = false;

  this.createBallViews();

  var di = this.getDockInfo();
  var newSize = di.ballSize;

  var newX = oldCenterX - Math.round(newSize / 2);
  var newY = oldCenterY - Math.round(newSize / 2);

  var maxX = Math.max(0, this.state.screen.w - newSize);
  var maxY = Math.max(0, this.state.screen.h - newSize);

  newX = this.clamp(newX, 0, maxX);
  newY = this.clamp(newY, 0, maxY);

  var lp = new android.view.WindowManager.LayoutParams(
    newSize,
    newSize,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
    android.graphics.PixelFormat.TRANSLUCENT
  );

  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
  lp.x = newX;
  lp.y = newY;

  try {
    this.state.wm.addView(this.state.ballRoot, lp);
    this.state.ballLp = lp;
    this.state.addedBall = true;
  } catch (eAdd) {
    try { this.toast("重建悬浮球失败: " + String(eAdd));  } catch(eT) { safeLog(null, 'e', "catch " + String(eT)); }
    safeLog(this.L, 'e',  "rebuildBall add fail err=" + String(eAdd));
    return false;
  }

  this.savePos(this.state.ballLp.x, this.state.ballLp.y);
  this.touchActivity();
  safeLog(this.L, 'i',  "rebuildBall ok size=" + String(newSize) + " x=" + String(newX) + " y=" + String(newY));
  return true;
};

// =======================【指针：框选截图后文本识别扩展】======================
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
    return String(ctxData.get("ocrResult") || "");
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
          if (path && rect) {
            try {
              textValue = this.runPointerAreaTextByRect(rect);
              textOk = true;
            } catch(eText) {
              textError = String(eText);
            }
          } else if (!path) {
            textError = "截图文件为空";
          } else {
            textError = "识别区域为空";
          }

          obj.type = "area_ocr";
          obj.code = path ? (textOk ? "AREA_OCR_SUCCESS" : "AREA_OCR_FAILED") : "AREA_SCREENSHOT_FAILED";
          obj.message = path ? (textOk ? "框选截图并识别完成" : "框选截图完成，识别失败") : "框选完成，截图失败";
          obj.value = textValue;
          obj.ocrText = textValue;
          obj.ocrError = textError;
          if (!obj.data) obj.data = {};
          obj.data.ocrText = textValue;
          obj.data.ocrError = textError;
          try { if (!obj.data.path) obj.data.path = path; } catch(eDataPath) {}
          this.setPointerToolResult(obj);

          try { safeLog(this.L, textOk ? 'i' : 'w', "pointer area_ocr result ok=" + String(textOk) + " rect=" + rectKey18(rect) + " path=" + path + " err=" + textError); } catch(eLog2) {}
          try { this.toast(textOk ? "识别完成" : "截图完成，识别失败"); } catch(eToast2) {}

          if (ret) {
            ret.type = "area_ocr";
            ret.code = obj.code;
            ret.ocrText = textValue;
            ret.ocrError = textError;
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
