// @version 1.1.17
// =======================【指针取字 / 框选截图 OCR 子模块】======================

function ToolHubPointerResult(type, ok, code, message) {
  this.type = String(type || "pointer_error");
  this.ok = ok === true;
  this.code = String(code || "");
  this.message = String(message || "");
}

function th17Now() {
  return new Date().getTime();
}

function th17Int(v) {
  var n = 0;
  try { n = Math.round(Number(v || 0)); } catch (e0) { n = 0; }
  if (isNaN(n)) n = 0;
  return n;
}

function th17Color(a, r, g, b) {
  try { return android.graphics.Color.argb(th17Int(a), th17Int(r), th17Int(g), th17Int(b)); } catch (e0) {}
  return 0;
}

function th17ConfigNumber(appObj, key, defVal, minVal, maxVal) {
  var v = defVal;
  try { v = Number(appObj && appObj.config ? appObj.config[key] : defVal); } catch(e0) { v = defVal; }
  if (isNaN(v)) v = defVal;
  if (minVal !== undefined && v < minVal) v = minVal;
  if (maxVal !== undefined && v > maxVal) v = maxVal;
  return v;
}

function th17ConfigBool(appObj, key, defVal) {
  var v = defVal === true;
  try {
    var raw = appObj && appObj.config ? appObj.config[key] : defVal;
    if (raw === true || raw === false) return raw === true;
    var s = String(raw == null ? "" : raw).replace(/^\s+|\s+$/g, "").toLowerCase();
    if (s === "1" || s === "true" || s === "yes" || s === "on") return true;
    if (s === "0" || s === "false" || s === "no" || s === "off" || s === "") return false;
  } catch(e0) {}
  return v;
}

function th17PointerColorRgb(appObj, key, fallbackR, fallbackG, fallbackB) {
  try {
    var h = String(appObj && appObj.config ? (appObj.config[key] || "") : "");
    h = h.replace(/^\s+|\s+$/g, "");
    if (h.charAt(0) === "#") h = h.substring(1);
    if (h.length === 8) h = h.substring(2);
    if (h.length === 6) {
      var r = parseInt(h.substring(0, 2), 16);
      var g = parseInt(h.substring(2, 4), 16);
      var b = parseInt(h.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r: r, g: g, b: b };
    }
  } catch(e0) {}
  return { r: fallbackR, g: fallbackG, b: fallbackB };
}

function th17RectObj(rect) {
  if (!rect) return null;
  return {
    left: th17Int(rect.left),
    top: th17Int(rect.top),
    right: th17Int(rect.right),
    bottom: th17Int(rect.bottom)
  };
}

function th17RectKey(rect) {
  if (!rect) return "";
  return String(th17Int(rect.left)) + "," + String(th17Int(rect.top)) + "," + String(th17Int(rect.right)) + "," + String(th17Int(rect.bottom));
}

function th17CleanNodeText(v) {
  if (v === null || v === undefined) return "";
  var s = "";
  try { s = String(v); } catch (e0) { s = ""; }
  s = s.replace(/^\s+|\s+$/g, "");
  return s;
}

function th17NodeText(node) {
  var txt = "";
  try {
    txt = th17CleanNodeText(node.getText());
    if (txt) return txt;
  } catch (e0) {}

  try {
    txt = th17CleanNodeText(node.getContentDescription());
    if (txt) return txt;
  } catch (e1) {}

  try {
    if (node.getHintText) {
      txt = th17CleanNodeText(node.getHintText());
      if (txt) return txt;
    }
  } catch (e2) {}

  try {
    if (node.getStateDescription) {
      txt = th17CleanNodeText(node.getStateDescription());
      if (txt) return txt;
    }
  } catch (e3) {}

  try {
    if (node.getTooltipText) {
      txt = th17CleanNodeText(node.getTooltipText());
      if (txt) return txt;
    }
  } catch (e4) {}

  try {
    if (node.getPaneTitle) {
      txt = th17CleanNodeText(node.getPaneTitle());
      if (txt) return txt;
    }
  } catch (e5) {}

  try {
    if (node.getContainerTitle) {
      txt = th17CleanNodeText(node.getContainerTitle());
      if (txt) return txt;
    }
  } catch (e6) {}

  return "";
}

function th17RectValid(rect) {
  if (!rect) return false;
  return th17Int(rect.right) > th17Int(rect.left) && th17Int(rect.bottom) > th17Int(rect.top);
}

function th17NodeVisible(node) {
  try {
    if (node && node.isVisibleToUser) return node.isVisibleToUser() === true;
  } catch (e0) {}
  return true;
}

function th17NodeBounds(node) {
  try {
    var rect = new android.graphics.Rect();
    node.getBoundsInScreen(rect);
    return th17RectObj(rect);
  } catch (e0) {}
  return null;
}

function th17NodeClassName(node) {
  try {
    var c = node && node.getClassName ? node.getClassName() : "";
    return String(c || "");
  } catch (e0) {}
  return "";
}

function th17AppendUniqueText(arr, value) {
  var txt = th17CleanNodeText(value);
  if (!txt) return;
  if (String(txt).replace(/\s+/g, "").length <= 0) return;
  for (var i = 0; i < arr.length; i++) {
    if (String(arr[i]) === String(txt)) return;
  }
  arr.push(String(txt));
}

FloatBallAppWM.prototype.pointerNodeLooksLikeTextControl = function(node, rect, depth) {
  if (!node || !th17RectValid(rect)) return false;

  var w = Math.max(1, th17Int(rect.right) - th17Int(rect.left));
  var h = Math.max(1, th17Int(rect.bottom) - th17Int(rect.top));
  var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));

  // 太大的根容器/整屏容器不要收集，避免误把整页文字拼起来。
  if (h > this.dp(180)) return false;
  if (w >= sw - this.dp(8) && h > this.dp(120)) return false;

  try { if (node.isClickable && node.isClickable() === true) return true; } catch (eClick) {}
  try { if (node.isLongClickable && node.isLongClickable() === true) return true; } catch (eLongClick) {}
  try { if (node.isCheckable && node.isCheckable() === true) return true; } catch (eCheck) {}
  try { if (node.isFocusable && node.isFocusable() === true) return true; } catch (eFocus) {}
  try { if (node.isSelected && node.isSelected() === true) return true; } catch (eSelected) {}

  var cls = th17NodeClassName(node);
  if (cls.indexOf("Button") >= 0) return true;
  if (cls.indexOf("CheckBox") >= 0) return true;
  if (cls.indexOf("RadioButton") >= 0) return true;
  if (cls.indexOf("Switch") >= 0) return true;
  if (cls.indexOf("CompoundButton") >= 0) return true;
  if (cls.indexOf("CheckedTextView") >= 0) return true;
  if (cls.indexOf("Tab") >= 0) return true;
  if (cls.indexOf("Chip") >= 0) return true;

  // 常见列表行 / 卡片 / 横向行容器：本体没 text，文字在子 TextView。
  if (depth >= 2 && h <= this.dp(96)) {
    if (cls.indexOf("ViewGroup") >= 0) return true;
    if (cls.indexOf("LinearLayout") >= 0) return true;
    if (cls.indexOf("RelativeLayout") >= 0) return true;
    if (cls.indexOf("FrameLayout") >= 0) return true;
    if (cls.indexOf("ConstraintLayout") >= 0) return true;
  }

  return false;
};

FloatBallAppWM.prototype.collectPointerControlDescendantText = function(node, maxDepth, maxItems) {
  var arr = [];
  var limitDepth = Math.max(1, Number(maxDepth || 4));
  var limitItems = Math.max(1, Number(maxItems || 8));

  function walk(n, depth) {
    if (!n || depth > limitDepth || arr.length >= limitItems) return;

    try {
      var t = th17NodeText(n);
      th17AppendUniqueText(arr, t);
    } catch (eText) {}

    var childCount = 0;
    try { childCount = n.getChildCount(); } catch (eCount) { childCount = 0; }

    for (var i = 0; i < childCount; i++) {
      if (arr.length >= limitItems) break;
      var child = null;
      try { child = n.getChild(i); } catch (eChild) { child = null; }
      if (child) {
        try { walk(child, depth + 1); }
        finally { try { child.recycle(); } catch (eRecycle) {} }
      }
    }
  }

  try { walk(node, 0); } catch (eWalk) {}

  return arr.join(" ").replace(/^\s+|\s+$/g, "");
};


FloatBallAppWM.prototype.copyPointerTextToClipboard = function(textValue) {
  var text = String(textValue || "");
  if (!text) return false;
  try {
    var appCtx = null;
    try {
      if (typeof context !== "undefined" && context) appCtx = context;
    } catch (eCtx0) {}
    if (!appCtx) {
      try { appCtx = android.app.ActivityThread.currentApplication(); } catch (eCtx1) { appCtx = null; }
    }
    if (!appCtx) return false;
    var cm = appCtx.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
    if (!cm) return false;
    var clip = android.content.ClipData.newPlainText("ToolHub指针取字", text);
    cm.setPrimaryClip(clip);
    return true;
  } catch (e0) {
    safeLog(this.L, 'e', "copyPointerTextToClipboard fail: " + String(e0));
  }
  return false;
};

FloatBallAppWM.prototype.ensurePointerToolState = function() {
  if (!this.state.pointerTool) {
    this.state.pointerTool = {
      active: false,
      mode: "text_pick",
      source: "",
      root: null,
      lp: null,
      wm: null,
      added: false,
      frame: null,
      frameLp: null,
      frameAdded: false,
      frameRect: null,
      resultJson: "",
      lastResult: null,
      dragging: false,
      dragStarted: false,
      moved: false,
      closed: false,
      handler: null,
      moveRunnable: null,
      inspectRunnable: null,
      stopInspectRunnable: null,
      inspectHt: null,
      inspectH: null,
      inspectSeq: 0,
      inspectSession: 0,
      inspectRunning: false,
      inspectPending: false,
      inspectClosed: false,
      inspectLatestX: 0,
      inspectLatestY: 0,
      inspectLatestSeq: 0,
      inspectLatestForce: false,
      inspectLatestReason: "",
      inspectFinishAfterResult: false,
      inspectLastResultSeq: 0,
      inspectLastRequestTs: 0,
      inspectLastCostMs: 0,
      inspectLastNodes: 0,
      inspectMaxDragMs: 60,
      inspectMaxFinalMs: 180,
      inspectMaxDragNodes: 120,
      inspectMaxFinalNodes: 420,
      pointerW: 0,
      pointerH: 0,
      pointerScale: 1,
      anchorLocalX: 0,
      anchorLocalY: 0,
      handleLocalX: 0,
      handleLocalY: 0,
      queryOffsetX: 0,
      queryOffsetY: 0,
      pointerX: 0,
      pointerY: 0,
      pendingPointerX: 0,
      pendingPointerY: 0,
      dragUpdatePosted: false,
      inspectPosted: false,
      draggingInspectPosted: false,
      lastInspectTs: 0,
      lastDragInspectTs: 0,
      lastQueryX: -100000,
      lastQueryY: -100000,
      currentText: "",
      currentRect: null,
      currentKey: "",
      boundText: "",
      boundRect: null,
      boundKey: "",
      boundAt: 0,
      hoverSince: 0,
      hoverKey: "",
      hoverX: 0,
      hoverY: 0,
      hoverMinMs: 800,
      releaseTs: 0,
      areaHoldToken: 0,
      areaHoldAnchorX: -100000,
      areaHoldAnchorY: -100000,
      areaHoldSince: 0,
      areaHoldDelay: 1000,
      areaSmallFallbackText: true,
      areaMinWidthPx: 0,
      areaMinHeightPx: 0,
      areaMinAreaPx: 0,
      areaMinMovePx: 0,
      areaHoldStableSlop: 0,
      areaHoldBreakSlop: 0,
      areaCaptureInset: 0,
      areaMinSize: 0,
      hot: false,
      clickCount: 0,
      lastClickTime: 0,
      areaStartX: 0,
      areaStartY: 0,
      areaEndX: 0,
      areaEndY: 0,
      areaSelecting: false,
      areaReady: false,
      areaValid: false,
      areaFromText: false,
      areaFallbackPreview: false,
      areaProcessing: false,
      captureRect: null,
      visualRect: null,
      frameKind: "",
      paint: null
    };
  }
  var st = this.state.pointerTool;
  var dp = function(v) { return Math.max(1, Math.floor(Number(v) * (Number(this.state.density || 1) || 1))); };
  var scalePct = th17ConfigNumber(this, "POINTER_SCALE_PERCENT", 100, 70, 140);
  var scale = scalePct / 100.0;
  st.pointerScale = scale;
  var sdp = function(v) { return Math.max(1, Math.floor(Number(v) * scale * (Number(this.state.density || 1) || 1))); };
  st.pointerW = sdp.call(this, 60);
  st.pointerH = sdp.call(this, 88);
  st.anchorLocalX = sdp.call(this, 17);
  st.anchorLocalY = sdp.call(this, 8);
  st.handleLocalX = sdp.call(this, 30);
  st.handleLocalY = sdp.call(this, 66);
  st.hoverMinMs = th17ConfigNumber(this, "POINTER_TEXT_HOVER_MS", 800, 300, 10000);
  st.areaHoldDelay = th17ConfigNumber(this, "POINTER_AREA_HOVER_MS", 1000, 500, 10000);
  st.areaSmallFallbackText = th17ConfigBool(this, "POINTER_AREA_SMALL_FALLBACK_TEXT", true);
  st.areaMinWidthPx = dp.call(this, th17ConfigNumber(this, "POINTER_AREA_MIN_WIDTH_DP", 56, 20, 240));
  st.areaMinHeightPx = dp.call(this, th17ConfigNumber(this, "POINTER_AREA_MIN_HEIGHT_DP", 20, 8, 160));
  var areaDp2 = th17ConfigNumber(this, "POINTER_AREA_MIN_AREA_DP2", 1200, 200, 30000);
  var oneDp = Math.max(1, dp.call(this, 1));
  st.areaMinAreaPx = Math.max(1, Math.round(areaDp2 * oneDp * oneDp));
  st.areaMinMovePx = dp.call(this, th17ConfigNumber(this, "POINTER_AREA_MIN_MOVE_DP", 24, 0, 160));
  st.areaHoldStableSlop = dp.call(this, 5);
  st.areaHoldBreakSlop = dp.call(this, 14);
  st.areaCaptureInset = dp.call(this, 3);
  st.areaMinSize = dp.call(this, 8);
  return st;
};

FloatBallAppWM.prototype.resetPointerToolState = function(st, mode, source) {
  st.active = true;
  st.mode = String(mode || "text_pick");
  st.source = String(source || "");
  st.resultJson = "";
  st.lastResult = null;
  st.dragging = false;
  st.dragStarted = false;
  st.moved = false;
  st.closed = false;
  st.dragUpdatePosted = false;
  st.inspectPosted = false;
  st.draggingInspectPosted = false;
  st.inspectSeq++;
  st.inspectSession++;
  st.inspectRunning = false;
  st.inspectPending = false;
  st.inspectClosed = false;
  st.inspectLatestX = 0;
  st.inspectLatestY = 0;
  st.inspectLatestSeq = 0;
  st.inspectLatestForce = false;
  st.inspectLatestReason = "";
  st.inspectFinishAfterResult = false;
  st.inspectLastResultSeq = 0;
  st.inspectLastRequestTs = 0;
  st.inspectLastCostMs = 0;
  st.inspectLastNodes = 0;
  st.lastInspectTs = 0;
  st.lastDragInspectTs = 0;
  st.lastQueryX = -100000;
  st.lastQueryY = -100000;
  st.currentText = "";
  st.currentRect = null;
  st.currentKey = "";
  st.boundText = "";
  st.boundRect = null;
  st.boundKey = "";
  st.boundAt = 0;
  st.hoverSince = 0;
  st.hoverKey = "";
  st.hoverX = 0;
  st.hoverY = 0;
  st.releaseTs = 0;
  st.areaHoldToken++;
  st.areaHoldAnchorX = -100000;
  st.areaHoldAnchorY = -100000;
  st.areaHoldSince = 0;
  st.areaArmReady = false;
  st.areaArmToken = 0;
  st.areaArmX = -100000;
  st.areaArmY = -100000;
  st.areaArmSince = 0;
  st.hot = false;
  st.clickCount = 0;
  st.lastClickTime = 0;
  st.areaStartX = 0;
  st.areaStartY = 0;
  st.areaEndX = 0;
  st.areaEndY = 0;
  st.areaSelecting = false;
  st.areaReady = false;
  st.areaValid = false;
  st.areaFromText = false;
  st.areaFallbackPreview = false;
  st.areaProcessing = false;
  st.captureRect = null;
  st.visualRect = null;
  st.frameKind = "";
};

FloatBallAppWM.prototype.setPointerToolResult = function(obj) {
  var st = this.ensurePointerToolState();
  var json = "";
  try { json = JSON.stringify(obj || {}); } catch (e0) { json = ""; }
  st.lastResult = obj || null;
  st.resultJson = json;
  return json;
};

FloatBallAppWM.prototype.getPointerToolResult = function() {
  var st = this.ensurePointerToolState();
  return String(st.resultJson || "");
};

FloatBallAppWM.prototype.getPointerOcrRectJson = function() {
  var st = this.ensurePointerToolState();
  var obj = st.lastResult || null;
  if (!obj || obj.type !== "area_capture") return "{}";
  try {
    var rect = obj.captureRect || obj.visualRect || null;
    if (!rect) return "{}";
    return JSON.stringify({
      left: th17Int(rect.left),
      top: th17Int(rect.top),
      right: th17Int(rect.right),
      bottom: th17Int(rect.bottom)
    });
  } catch (e0) {}
  return "{}";
};

FloatBallAppWM.prototype.getPointerScreenshotDir = function() {
  var base = "";
  try {
    if (typeof shortx !== "undefined" && shortx && shortx.getShortXDir) {
      base = String(shortx.getShortXDir() || "");
    }
  } catch (e0) {}
  if (!base) {
    try {
      var ctx = getToolHubAndroidContext ? getToolHubAndroidContext() : null;
      if (ctx && ctx.getFilesDir) base = String(ctx.getFilesDir().getAbsolutePath());
    } catch (e1) {}
  }
  if (!base) throw new Error("无法获取 ShortX 私有目录");
  var dir = new java.io.File(base + "/data/screenshots");
  if (!dir.exists()) dir.mkdirs();
  return dir;
};

FloatBallAppWM.prototype.createPointerScreenshotFile = function() {
  var d = new Date();
  function z(n) { return n < 10 ? "0" + n : String(n); }
  var ymd = String(d.getFullYear()) + z(d.getMonth() + 1) + z(d.getDate());
  return new java.io.File(this.getPointerScreenshotDir(), "ToolHub_" + ymd + "_" + String(d.getTime()) + ".png");
};

FloatBallAppWM.prototype.savePointerBitmapToFile = function(bitmap, file) {
  if (!bitmap || !file) throw new Error("Bitmap 或文件对象为空");
  var out = null;
  try {
    try { file.getParentFile().mkdirs(); } catch (eMkdir) {}
    out = new java.io.FileOutputStream(file);
    bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out);
    out.flush();
  } finally {
    try { if (out) out.close(); } catch (eClose) {}
  }
};

FloatBallAppWM.prototype.pointerBitmapFromCaptureBuffer = function(buffer) {
  if (!buffer) return null;
  try {
    var b = buffer.asBitmap();
    if (b) return b;
  } catch (e0) {}
  try {
    var hb = buffer.getHardwareBuffer ? buffer.getHardwareBuffer() : null;
    if (hb) {
      return android.graphics.Bitmap.wrapHardwareBuffer(hb, android.graphics.ColorSpace.get(android.graphics.ColorSpace.Named.SRGB));
    }
  } catch (e1) {}
  try {
    var gb = buffer.getGraphicBuffer ? buffer.getGraphicBuffer() : null;
    if (gb) {
      return android.graphics.Bitmap.wrapHardwareBuffer(gb, android.graphics.ColorSpace.get(android.graphics.ColorSpace.Named.SRGB));
    }
  } catch (e2) {}
  return null;
};

FloatBallAppWM.prototype.capturePointerRectToPng = function(rect) {
  if (!rect) throw new Error("截图区域为空");
  var left = th17Int(rect.left);
  var top = th17Int(rect.top);
  var right = th17Int(rect.right);
  var bottom = th17Int(rect.bottom);
  var minSize = Math.max(1, this.dp(8));
  if (right < left) { var tx = left; left = right; right = tx; }
  if (bottom < top) { var ty = top; top = bottom; bottom = ty; }
  if (right - left < minSize || bottom - top < minSize) throw new Error("框选区域太小");
  var cropRect = new android.graphics.Rect(left, top, right, bottom);
  var api = 0;
  try { api = android.os.Build.VERSION.SDK_INT; } catch (eApi) { api = 0; }
  var bitmap = null;
  var lastError = null;

  if (!bitmap && api >= 34) {
    try {
      var surfaceFlingerService = android.os.ServiceManager.getService("SurfaceFlingerAIDL");
      var displayInfo = android.hardware.display.DisplayManagerGlobal.getInstance().getDisplayInfo(0);
      var displayId = displayInfo.address.getPhysicalDisplayId();
      var parcelData = android.os.Parcel.obtain();
      var parcelReply = android.os.Parcel.obtain();
      try {
        parcelData.writeInterfaceToken("android.gui.ISurfaceComposer");
        parcelData.writeLong(displayId);
        surfaceFlingerService.transact(android.os.IBinder.FIRST_CALL_TRANSACTION + 6, parcelData, parcelReply, 0);
        parcelReply.readException();
        var displayToken = parcelReply.readStrongBinder();
        try {
          var builder = new android.window.ScreenCapture.DisplayCaptureArgs.Builder(displayToken);
          builder.setPixelFormat(android.graphics.PixelFormat.RGBA_8888).setSourceCrop(cropRect).setSize(cropRect.width(), cropRect.height()).setFrameScale(1.0).setCaptureSecureLayers(true).setAllowProtected(true).setGrayscale(false).setExcludeLayers(null).setHintForSeamlessTransition(false);
          bitmap = this.pointerBitmapFromCaptureBuffer(android.window.ScreenCapture.captureDisplay(builder.build()));
        } catch (e14a) {
          var builder2 = new android.window.ScreenCaptureInternal.DisplayCaptureArgs.Builder(displayToken);
          builder2.setPixelFormat(android.graphics.PixelFormat.RGBA_8888).setSourceCrop(cropRect).setSize(cropRect.width(), cropRect.height()).setFrameScale(1.0).setSecureContentPolicy(0).setProtectedContentPolicy(0).setGrayscale(false).setExcludeLayers(null);
          bitmap = this.pointerBitmapFromCaptureBuffer(android.window.ScreenCaptureInternal.captureDisplay(builder2.build()));
        }
      } finally {
        try { parcelData.recycle(); } catch (ePd) {}
        try { parcelReply.recycle(); } catch (ePr) {}
      }
    } catch (e14) { lastError = e14; bitmap = null; }
  }

  if (!bitmap && api >= 32) {
    try {
      var displayToken32 = android.view.SurfaceControl.getInternalDisplayToken();
      if (displayToken32 == null) throw new Error("无法获取 displayToken");
      var builder32 = new android.view.SurfaceControl.DisplayCaptureArgs.Builder(displayToken32);
      builder32.setPixelFormat(android.graphics.PixelFormat.RGBA_8888).setSourceCrop(cropRect).setSize(cropRect.width(), cropRect.height()).setFrameScale(1.0).setCaptureSecureLayers(true).setAllowProtected(true).setGrayscale(false);
      bitmap = this.pointerBitmapFromCaptureBuffer(android.view.SurfaceControl.captureDisplay(builder32.build()));
    } catch (e32) { lastError = e32; bitmap = null; }
  }

  if (!bitmap && api >= 29) {
    try {
      var displayToken29 = android.view.SurfaceControl.getInternalDisplayToken();
      if (displayToken29 == null) throw new Error("无法获取 displayToken");
      bitmap = this.pointerBitmapFromCaptureBuffer(android.view.SurfaceControl.screenshotToBufferWithSecureLayersUnsafe(displayToken29, cropRect, cropRect.width(), cropRect.height(), false, 0));
    } catch (e29) { lastError = e29; bitmap = null; }
  }

  if (!bitmap) {
    try {
      bitmap = this.pointerBitmapFromCaptureBuffer(android.view.SurfaceControl.screenshotToBuffer(cropRect, cropRect.width(), cropRect.height(), 0, java.lang.Integer.MAX_VALUE, false, 0));
    } catch (eOld) { lastError = eOld; bitmap = null; }
  }

  if (!bitmap) throw new Error("截图失败" + (lastError ? ": " + String(lastError) : ""));
  var file = this.createPointerScreenshotFile();
  this.savePointerBitmapToFile(bitmap, file);
  return String(file.getAbsolutePath());
};

FloatBallAppWM.prototype.isPointerToolActive = function() {
  var st = this.ensurePointerToolState();
  return !!st.active;
};

FloatBallAppWM.prototype.removePointerCallbacks = function(st) {
  try { if (st.handler && st.moveRunnable) st.handler.removeCallbacks(st.moveRunnable); } catch (e0) {}
  try { if (st.handler && st.inspectRunnable) st.handler.removeCallbacks(st.inspectRunnable); } catch (e1) {}
  try { if (st.handler && st.stopInspectRunnable) st.handler.removeCallbacks(st.stopInspectRunnable); } catch (e2) {}
  try { if (st.inspectH) st.inspectH.removeCallbacksAndMessages(null); } catch (e3) {}
  st.moveRunnable = null;
  st.inspectRunnable = null;
  st.stopInspectRunnable = null;
  st.dragUpdatePosted = false;
  st.inspectPosted = false;
  st.draggingInspectPosted = false;
  st.inspectPending = false;
  st.inspectFinishAfterResult = false;
  st.areaHoldToken++;
  st.inspectSeq++;
};

FloatBallAppWM.prototype.closePointerInspectWorker = function(st) {
  if (!st) return;
  st.inspectClosed = true;
  st.inspectPending = false;
  st.inspectRunning = false;
  st.inspectFinishAfterResult = false;
  st.inspectSeq++;
  st.inspectSession++;
  try { if (st.inspectH) st.inspectH.removeCallbacksAndMessages(null); } catch (e0) {}
  try {
    if (st.inspectHt) {
      if (android.os.Build.VERSION.SDK_INT >= 18) st.inspectHt.quitSafely();
      else st.inspectHt.quit();
    }
  } catch (e1) { safeLog(this.L, 'e', "closePointerInspectWorker fail: " + String(e1)); }
  st.inspectHt = null;
  st.inspectH = null;
};

FloatBallAppWM.prototype.ensurePointerInspectWorker = function(st) {
  if (!st) st = this.ensurePointerToolState();
  if (st.inspectH) return true;
  try {
    st.inspectClosed = false;
    st.inspectHt = new android.os.HandlerThread("toolhub_pointer_inspect");
    st.inspectHt.start();
    st.inspectH = new android.os.Handler(st.inspectHt.getLooper());
    return true;
  } catch (e0) {
    safeLog(this.L, 'e', "ensurePointerInspectWorker fail: " + String(e0));
  }
  st.inspectHt = null;
  st.inspectH = null;
  return false;
};

FloatBallAppWM.prototype.closePointerTool = function(reason, suppressCancel) {
  var st = this.ensurePointerToolState();
  this.removePointerCallbacks(st);
  this.closePointerInspectWorker(st);
  st.active = false;
  st.closed = true;
  st.dragging = false;
  st.dragStarted = false;
  try { this.hidePointerAreaFrame(); } catch (eFrame) { safeLog(this.L, 'e', "closePointerTool frame fail: " + String(eFrame)); }
  try {
    if (st.added && st.root) {
      if (typeof this.safeRemoveView === "function") this.safeRemoveView(st.root, "pointerTool");
      else if (st.wm) st.wm.removeView(st.root);
    }
  } catch (eRemove) { safeLog(this.L, 'e', "closePointerTool remove fail: " + String(eRemove)); }
  st.root = null;
  st.lp = null;
  st.added = false;
  st.paint = null;
  if (!st.resultJson && suppressCancel !== true) {
    this.setPointerToolResult({ ok: false, type: "cancel", code: "USER_CANCEL", message: String(reason || "用户取消") });
  }
};

FloatBallAppWM.prototype.pointerPositionFromBall = function(ballX, ballY) {
  var st = this.ensurePointerToolState();
  var di = null;
  var ballSize = this.dp(45);
  try { di = this.getDockInfo(); ballSize = Number(di.ballSize || ballSize); } catch (e0) {}
  var x = th17Int(Number(ballX || 0) + ballSize / 2 - st.handleLocalX);
  var y = th17Int(Number(ballY || 0) + ballSize / 2 - st.handleLocalY);
  var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));
  var sh = Math.max(1, Number(this.state.screen && this.state.screen.h || 0));
  if (sw <= 1 || sh <= 1) {
    try { var ss = this.getScreenSizePx(); sw = ss.w; sh = ss.h; } catch (e1) {}
  }
  x = this.clamp(x, 0, Math.max(0, sw - st.pointerW));
  y = this.clamp(y, 0, Math.max(0, sh - st.pointerH));
  return { x: x, y: y };
};

FloatBallAppWM.prototype.createPointerCanvasView = function(st) {
  var self = this;
  st.paint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
  var PointerView = new JavaAdapter(android.view.View, {
    onDraw: function(canvas) {
      try {
        var p = st.paint;
        var pointerScale = Number(st.pointerScale || 1);
        if (isNaN(pointerScale) || pointerScale <= 0) pointerScale = 1;
        var dp = function(v) { return self.dp(Number(v) * pointerScale); };
        var tipX = st.anchorLocalX;
        var tipY = st.anchorLocalY;
        var hoverCandidate = !!(st.currentText && st.currentRect && st.hoverSince && !st.hot);
        var processing = !!st.areaProcessing;
        var active = !!(st.hot || hoverCandidate || st.areaSelecting || st.areaReady || processing);
        var dragging = !!st.dragging;
        var rgb = null;
        if (processing) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_CAPTURE_HEX", 168, 85, 247);
        } else if (st.mode === "area_capture" || st.areaSelecting || st.areaReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
        } else if (st.hot) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_HIT_HEX", 245, 158, 11);
        } else if (hoverCandidate) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_HOVER_HEX", 14, 165, 233);
        } else {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_NORMAL_HEX", 76, 124, 160);
        }
        var accentR = rgb.r;
        var accentG = rgb.g;
        var accentB = rgb.b;
        p.setAntiAlias(true);
        p.setStrokeCap(android.graphics.Paint.Cap.ROUND);
        p.setStrokeJoin(android.graphics.Paint.Join.ROUND);
        try { p.setShader(null); p.clearShadowLayer(); } catch (e0) {}

        var path = new android.graphics.Path();
        path.moveTo(tipX, tipY);
        path.lineTo(tipX, tipY + dp(27));
        path.lineTo(tipX + dp(7), tipY + dp(21));
        path.lineTo(tipX + dp(12), tipY + dp(32));
        path.lineTo(tipX + dp(19), tipY + dp(29));
        path.lineTo(tipX + dp(14), tipY + dp(19));
        path.lineTo(tipX + dp(24), tipY + dp(19));
        path.close();

        try { p.setShadowLayer(dp(3), dp(1), dp(1.5), th17Color(74, 0, 0, 0)); } catch (e1) {}
        p.setStyle(android.graphics.Paint.Style.FILL);
        p.setARGB(active ? 92 : (dragging ? 76 : 58), accentR, accentG, accentB);
        canvas.drawPath(path, p);

        p.setStyle(android.graphics.Paint.Style.FILL);
        p.setARGB(active ? 230 : 210, 255, 255, 255);
        canvas.drawPath(path, p);
        try { p.clearShadowLayer(); } catch (e2) {}

        p.setStyle(android.graphics.Paint.Style.STROKE);
        p.setStrokeWidth(dp(active ? 2.2 : 2.0));
        p.setARGB(active ? 255 : 235, accentR, accentG, accentB);
        canvas.drawPath(path, p);

        p.setStrokeWidth(dp(active ? 1.45 : 1.25));
        p.setARGB(active ? 245 : 210, accentR, accentG, accentB);
        canvas.drawLine(tipX + dp(2.5), tipY + dp(7), tipX + dp(2.5), tipY + dp(20), p);
        canvas.drawLine(tipX + dp(3.5), tipY + dp(20), tipX + dp(8.5), tipY + dp(16), p);

        p.setStyle(android.graphics.Paint.Style.FILL);
        p.setARGB(255, accentR, accentG, accentB);
        canvas.drawCircle(tipX, tipY, dp(active ? 2.2 : 1.8), p);

      } catch (drawError) {}
    }
  }, context);
  try { PointerView.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null); } catch (eLayer) {}
  return PointerView;
};

FloatBallAppWM.prototype.createPointerLayoutParams = function(st) {
  var flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
    android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE |
    android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
  var lp = new android.view.WindowManager.LayoutParams(
    st.pointerW,
    st.pointerH,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    flags,
    android.graphics.PixelFormat.TRANSLUCENT
  );
  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
  var pos = { x: 0, y: 0 };
  try {
    if (this.state.ballLp) pos = this.pointerPositionFromBall(this.state.ballLp.x, this.state.ballLp.y);
  } catch (e0) {}
  lp.x = pos.x;
  lp.y = pos.y;
  st.pointerX = lp.x;
  st.pointerY = lp.y;
  st.pendingPointerX = lp.x;
  st.pendingPointerY = lp.y;
  return lp;
};

FloatBallAppWM.prototype.showPointerWindow = function(st) {
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
    return true;
  } catch (e0) {
    safeLog(this.L, 'e', "showPointerWindow fail: " + String(e0));
    return false;
  }
};

FloatBallAppWM.prototype.getPointerHotspot = function() {
  var st = this.ensurePointerToolState();
  var x = th17Int(st.pointerX + st.anchorLocalX + st.queryOffsetX);
  var y = th17Int(st.pointerY + st.anchorLocalY + st.queryOffsetY);
  return { x: x, y: y };
};

FloatBallAppWM.prototype.updatePointerVisualHot = function(isHot) {
  var st = this.ensurePointerToolState();
  if (st.hot === (isHot === true)) return;
  st.hot = isHot === true;
  try { if (st.root) st.root.invalidate(); } catch (e0) {}
};

FloatBallAppWM.prototype.schedulePointerMove = function(x, y) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return;
  if (!st.root || !st.lp) {
    if (!this.showPointerWindow(st)) return;
  }
  var pos = this.pointerPositionFromBall(x, y);
  st.pendingPointerX = pos.x;
  st.pendingPointerY = pos.y;
  st.pointerX = pos.x;
  st.pointerY = pos.y;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
  if (st.dragUpdatePosted) return;
  st.dragUpdatePosted = true;
  var self = this;
  st.moveRunnable = new java.lang.Runnable({ run: function() {
    try {
      st.dragUpdatePosted = false;
      if (!st.active || st.closed || !st.root || !st.lp) return;
      st.lp.x = st.pendingPointerX;
      st.lp.y = st.pendingPointerY;
      st.pointerX = st.lp.x;
      st.pointerY = st.lp.y;
      try { st.wm.updateViewLayout(st.root, st.lp); } catch (eU) { safeLog(self.L, 'e', "pointer update fail: " + String(eU)); }
      if (st.mode === "area_capture") self.updatePointerAreaSelection();
      else {
        self.updatePointerAreaHoldCandidate();
        self.scheduleDraggingInspect();
      }
    } catch (eRun) { safeLog(self.L, 'e', "schedulePointerMove run fail: " + String(eRun)); }
  }});
  try { st.handler.postDelayed(st.moveRunnable, 16); } catch (ePost) { st.dragUpdatePosted = false; }
};


FloatBallAppWM.prototype.resetPointerAreaHold = function() {
  var st = this.ensurePointerToolState();
  st.areaHoldToken++;
  st.areaHoldAnchorX = -100000;
  st.areaHoldAnchorY = -100000;
  st.areaHoldSince = 0;
  st.areaArmReady = false;
  st.areaArmToken = 0;
  st.areaArmX = -100000;
  st.areaArmY = -100000;
  st.areaArmSince = 0;
};

FloatBallAppWM.prototype.updatePointerAreaHoldCandidate = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || !st.dragging || st.mode !== "text_pick") return;
  var hp = this.getPointerHotspot();

  if (st.areaArmReady === true) {
    var ax = Number(st.areaArmX || -100000);
    var ay = Number(st.areaArmY || -100000);
    if (ax > -90000 && ay > -90000) {
      var adx = hp.x - ax;
      var ady = hp.y - ay;
      var armMove = Math.sqrt(adx * adx + ady * ady);
      var armNeedMove = Math.max(this.dp(18), Math.min(Math.max(1, Number(st.areaMinMovePx || this.dp(24))), this.dp(36)));
      if (armMove >= armNeedMove) {
        this.enterPointerAreaMode();
      }
      return;
    }
  }

  if (st.areaHoldAnchorX < -90000 || st.areaHoldAnchorY < -90000) {
    st.areaHoldAnchorX = hp.x;
    st.areaHoldAnchorY = hp.y;
    st.areaHoldSince = th17Now();
    st.areaHoldToken++;
    this.schedulePointerAreaHoldCheck(st.areaHoldToken);
    return;
  }
  var dx = hp.x - st.areaHoldAnchorX;
  var dy = hp.y - st.areaHoldAnchorY;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > Math.max(1, Number(st.areaHoldBreakSlop || this.dp(14)))) {
    st.areaHoldAnchorX = hp.x;
    st.areaHoldAnchorY = hp.y;
    st.areaHoldSince = th17Now();
    st.areaHoldToken++;
    this.schedulePointerAreaHoldCheck(st.areaHoldToken);
    return;
  }
  if (dist > Math.max(1, Number(st.areaHoldStableSlop || this.dp(5)))) {
    st.areaHoldAnchorX = Math.round(st.areaHoldAnchorX * 0.75 + hp.x * 0.25);
    st.areaHoldAnchorY = Math.round(st.areaHoldAnchorY * 0.75 + hp.y * 0.25);
  }
};

FloatBallAppWM.prototype.armPointerAreaMode = function(token) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick" || !st.dragging) return false;
  if (token !== undefined && token !== null && Number(token) !== Number(st.areaHoldToken)) return false;

  var hp = this.getPointerHotspot();
  st.areaArmReady = true;
  st.areaArmToken = Number(st.areaHoldToken || 0);
  st.areaArmX = hp.x;
  st.areaArmY = hp.y;
  st.areaArmSince = th17Now();

  try {
    if (st.currentRect) this.showPointerAreaFrame(st.currentRect, "text_hit");
    else if (st.boundRect) this.showPointerAreaFrame(st.boundRect, "text_hit");
  } catch (eFrame) {}

  try { if (st.root) st.root.invalidate(); } catch (eInv) {}
  try { this.toast("松手取字，继续拖动框选"); } catch (eToast) {}
  safeLog(this.L, 'i', "pointer area armed by hover x=" + String(hp.x) + " y=" + String(hp.y));
  return true;
};

FloatBallAppWM.prototype.schedulePointerAreaHoldCheck = function(token) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick" || !st.dragging) return;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
  var self = this;
  try {
    st.handler.postDelayed(new java.lang.Runnable({ run: function() {
      try {
        var s = self.ensurePointerToolState();
        if (!s.active || s.closed || s.mode !== "text_pick" || !s.dragging) return;
        if (token !== s.areaHoldToken) return;
        var hp = self.getPointerHotspot();
        var dx = hp.x - s.areaHoldAnchorX;
        var dy = hp.y - s.areaHoldAnchorY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= Math.max(1, Number(s.areaHoldBreakSlop || self.dp(14)))) self.armPointerAreaMode(token);
        else self.updatePointerAreaHoldCandidate();
      } catch (eRun) { safeLog(self.L, 'e', "schedulePointerAreaHoldCheck run fail: " + String(eRun)); }
    }}), Math.max(300, Number(st.areaHoldDelay || 1000)));
  } catch (ePost) {}
};

FloatBallAppWM.prototype.enterPointerAreaMode = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick" || !st.dragging) return false;
  var hp = this.getPointerHotspot();
  var startX = hp.x;
  var startY = hp.y;
  if (st.areaArmReady === true && Number(st.areaArmX || -100000) > -90000 && Number(st.areaArmY || -100000) > -90000) {
    startX = th17Int(st.areaArmX);
    startY = th17Int(st.areaArmY);
  }
  st.areaArmReady = false;
  st.areaArmToken = 0;
  st.areaArmX = -100000;
  st.areaArmY = -100000;
  st.areaArmSince = 0;
  st.mode = "area_capture";
  st.areaHoldToken++;
  st.inspectSeq++;
  st.inspectPending = false;
  st.inspectFinishAfterResult = false;
  st.inspectLatestReason = "";
  if (st.currentText && st.currentRect) {
    st.boundText = String(st.currentText);
    st.boundRect = th17RectObj(st.currentRect);
    st.boundKey = String(st.currentKey || "");
    st.boundAt = th17Now();
  }
  st.areaFromText = !!(st.boundText && st.boundRect);
  st.areaValid = false;
  st.areaFallbackPreview = false;
  st.currentText = "";
  st.currentRect = null;
  st.currentKey = "";
  st.hoverKey = "";
  st.hoverSince = 0;
  st.hot = false;
  st.areaStartX = startX;
  st.areaStartY = startY;
  st.areaEndX = hp.x;
  st.areaEndY = hp.y;
  st.areaSelecting = true;
  st.areaReady = false;
  st.areaProcessing = false;
  try { if (st.handler && st.inspectRunnable) st.handler.removeCallbacks(st.inspectRunnable); } catch (eRemoveInspect) {}
  st.inspectPosted = false;
  st.draggingInspectPosted = false;
  this.updatePointerVisualHot(false);
  this.updatePointerAreaSelection(hp.x, hp.y);
  try { if (st.root) st.root.invalidate(); } catch (eInv) {}
  try { this.toast("拖动框选区域"); } catch (eToast) {}
  safeLog(this.L, 'i', "pointer enter area_capture by armed drag start=" + String(startX) + "," + String(startY) + " end=" + String(hp.x) + "," + String(hp.y));
  return true;
};

FloatBallAppWM.prototype.scheduleDraggingInspect = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  if (!st.dragging) return;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
  var now = th17Now();
  if (now - st.lastDragInspectTs < 220) return;
  st.lastDragInspectTs = now;
  if (st.draggingInspectPosted || st.inspectPosted) return;
  st.draggingInspectPosted = true;
  var self = this;
  st.inspectRunnable = new java.lang.Runnable({ run: function() {
    try {
      st.draggingInspectPosted = false;
      if (!st.active || st.closed || !st.dragging) return;
      self.schedulePointerInspectAsync(false, "drag", false);
    } catch (eRun) { safeLog(self.L, 'e', "scheduleDraggingInspect run fail: " + String(eRun)); }
  }});
  try { st.handler.postDelayed(st.inspectRunnable, 80); } catch (ePost) { st.draggingInspectPosted = false; }
};

FloatBallAppWM.prototype.scheduleInspect = function(force) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
  if (force === true) {
    st.inspectPosted = false;
    st.draggingInspectPosted = false;
    var selfForce = this;
    st.inspectPosted = true;
    st.inspectRunnable = new java.lang.Runnable({ run: function() {
      try {
        st.inspectPosted = false;
        if (!st.active || st.closed) return;
        selfForce.schedulePointerInspectAsync(true, "force", false);
      } catch (eRunForce) { safeLog(selfForce.L, 'e', "scheduleInspect force run fail: " + String(eRunForce)); }
    }});
    try { st.handler.postDelayed(st.inspectRunnable, 120); } catch (ePostForce) { st.inspectPosted = false; }
    return;
  }
  var now = th17Now();
  if (st.dragging) {
    this.scheduleDraggingInspect();
    return;
  }
  if (now - st.lastInspectTs < 150) return;
  st.lastInspectTs = now;
  if (st.inspectPosted) return;
  st.inspectPosted = true;
  var self = this;
  st.inspectRunnable = new java.lang.Runnable({ run: function() {
    try {
      st.inspectPosted = false;
      if (!st.active || st.closed) return;
      self.schedulePointerInspectAsync(false, "idle", false);
    } catch (eRun) { safeLog(self.L, 'e', "scheduleInspect run fail: " + String(eRun)); }
  }});
  try { st.handler.postDelayed(st.inspectRunnable, 40); } catch (ePost) { st.inspectPosted = false; }
};

FloatBallAppWM.prototype.scheduleStopInspect = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
  if (st.stopInspectRunnable) {
    try { st.handler.removeCallbacks(st.stopInspectRunnable); } catch (eRemove) {}
  }
  var self = this;
  st.stopInspectRunnable = new java.lang.Runnable({ run: function() {
    try {
      if (!st.active || st.closed) return;
      self.schedulePointerInspectAsync(false, "idle", false);
    } catch (eRun) { safeLog(self.L, 'e', "scheduleStopInspect run fail: " + String(eRun)); }
  }});
  try { st.handler.postDelayed(st.stopInspectRunnable, 160); } catch (ePost) {}
};

FloatBallAppWM.prototype.pointerRectInside = function(x, y, rect) {
  if (!rect) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
};

FloatBallAppWM.prototype.pointerRectHitScore = function(x, y, rect) {
  if (!th17RectValid(rect)) return -1;

  var l = th17Int(rect.left);
  var t = th17Int(rect.top);
  var r = th17Int(rect.right);
  var b = th17Int(rect.bottom);
  var w = Math.max(1, r - l);
  var h = Math.max(1, b - t);

  // 对短文本、小按钮、Tab 文本放宽命中范围，减少指针尖端略偏时无法取字。
  var padX = Math.max(this.dp(8), Math.min(this.dp(32), Math.floor(w * 0.35)));
  var padY = Math.max(this.dp(8), Math.min(this.dp(28), Math.floor(h * 0.45)));

  var dx = 0;
  var dy = 0;
  if (x < l) dx = l - x;
  else if (x > r) dx = x - r;
  if (y < t) dy = t - y;
  else if (y > b) dy = y - b;

  if (dx <= padX && dy <= padY) return dx * dx + dy * dy;
  return -1;
};

FloatBallAppWM.prototype.pointerRectNear = function(x, y, rect) {
  return this.pointerRectHitScore(x, y, rect) >= 0;
};

FloatBallAppWM.prototype.getPointerSdkInt = function() {
  try { return Number(android.os.Build.VERSION.SDK_INT || 0); } catch (e0) {}
  return 0;
};

FloatBallAppWM.prototype.getPointerPrefetchFlags = function() {
  var f = 0;
  try { f = f | android.view.accessibility.AccessibilityNodeInfo.FLAG_PREFETCH_DESCENDANTS_DEPTH_FIRST; } catch (e0) {}
  try { f = f | android.view.accessibility.AccessibilityNodeInfo.FLAG_PREFETCH_SIBLINGS; } catch (e1) {}
  return f;
};

FloatBallAppWM.prototype.ensurePointerUiAutomationReady = function(a, reason) {
  if (!a) return null;

  try {
    if (a.isConnected && !a.isConnected()) a.connect();
  } catch (eConn0) {
    try { if (a.connect) a.connect(); } catch (eConn1) {}
  }

  try {
    if (a.getServiceInfo && a.setServiceInfo) {
      var info = a.getServiceInfo();
      if (info) {
        var flags = 0;
        try { flags = Number(info.flags || 0); } catch (eFlags0) { flags = 0; }
        try { flags = flags | android.accessibilityservice.AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS; } catch (eF1) {}
        try { flags = flags | android.accessibilityservice.AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS; } catch (eF2) {}
        try { flags = flags | android.accessibilityservice.AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS; } catch (eF3) {}
        try { info.flags = flags; } catch (eSetFlags) {}
        try { a.setServiceInfo(info); } catch (eSetInfo) {}
      }
    }
  } catch (eInfo) {}

  if (String(reason || "") === "final") {
    try { if (a.clearCache) a.clearCache(); } catch (eClear) {}
  }

  return a;
};

FloatBallAppWM.prototype.getPointerUiAutomation = function(reason) {
  try {
    if (typeof shortx !== "undefined" && shortx && shortx.getUiAutomation) {
      var a = shortx.getUiAutomation();
      if (a) return this.ensurePointerUiAutomationReady(a, reason);
    }
  } catch (e0) {}
  try {
    if (typeof ui !== "undefined" && ui) return this.ensurePointerUiAutomationReady(ui, reason);
  } catch (e1) {}
  return null;
};

FloatBallAppWM.prototype.getPointerWindowRoot = function(win) {
  if (!win) return null;
  var root = null;
  var flags = this.getPointerPrefetchFlags();
  try {
    if (this.getPointerSdkInt() >= 33 && flags !== 0 && win.getRoot) root = win.getRoot(flags);
  } catch (e0) { root = null; }
  if (!root) {
    try { root = win.getRoot(); } catch (e1) { root = null; }
  }
  return root;
};

FloatBallAppWM.prototype.getPointerActiveRoot = function(reason) {
  var a = this.getPointerUiAutomation(reason);
  if (!a) return null;
  var root = null;
  var flags = this.getPointerPrefetchFlags();
  try {
    if (this.getPointerSdkInt() >= 33 && flags !== 0 && a.getRootInActiveWindow) root = a.getRootInActiveWindow(flags);
  } catch (e0) { root = null; }
  if (!root) {
    try { root = a.getRootInActiveWindow(); } catch (e1) { root = null; }
  }
  return root;
};

FloatBallAppWM.prototype.findPointerTextNodeAt = function(root, x, y) {
  var self = this;
  var best = null;
  function better(item) {
    if (!item || !item.rect || !item.text) return;
    var area = Math.max(1, (item.rect.right - item.rect.left) * (item.rect.bottom - item.rect.top));
    item.area = area;
    if (!best) { best = item; return; }
    if (item.score < best.score) { best = item; return; }
    if (item.score === best.score && item.area < best.area) { best = item; return; }
    if (item.score === best.score && item.area === best.area && item.depth > best.depth) best = item;
  }
  function dfs(node, depth) {
    if (!node || depth > 40) return;
    if (!th17NodeVisible(node)) return;

    var rect = th17NodeBounds(node);
    var rectOk = th17RectValid(rect);
    var score = rectOk ? self.pointerRectHitScore(x, y, rect) : -1;
    var contains = score >= 0;

    if (contains) {
      var txt = th17NodeText(node);
      var fromControl = false;
      if ((!txt || String(txt).replace(/\s+/g, "").length <= 0) && self.pointerNodeLooksLikeTextControl(node, rect, depth)) {
        txt = self.collectPointerControlDescendantText(node, 4, 8);
        fromControl = !!txt;
      }
      if (txt && String(txt).replace(/\s+/g, "").length > 0) {
        better({ text: String(txt), rect: rect, depth: depth, score: score + (fromControl ? 0.35 : 0) });
      }
    }

    var childCount = 0;
    try { childCount = node.getChildCount(); } catch (eCount) { childCount = 0; }

    // 父节点 bounds 异常时继续向下扫；避免自定义布局父节点为 0 或不准时漏掉子 TextView。
    if (!contains && rectOk && depth > 1) return;

    for (var i = 0; i < childCount; i++) {
      var child = null;
      try { child = node.getChild(i); } catch (eChild) { child = null; }
      if (child) {
        try { dfs(child, depth + 1); } finally { try { child.recycle(); } catch (eRecycle) {} }
      }
    }
  }
  try { dfs(root, 0); } catch (eDfs) { safeLog(this.L, 'e', "findPointerTextNodeAt fail: " + String(eDfs)); }
  return best;
};

FloatBallAppWM.prototype.pointerTextKeyOf = function(result) {
  if (!result || !result.rect) return "";
  return String(result.text || "") + "@" + th17RectKey(result.rect);
};

FloatBallAppWM.prototype.findPointerTextNodeAtBudget = function(root, x, y, start, limitMs, maxNodes, count) {
  var self = this;
  var best = null;
  function better(item) {
    if (!item || !item.rect || !item.text) return;
    var area = Math.max(1, (item.rect.right - item.rect.left) * (item.rect.bottom - item.rect.top));
    item.area = area;
    if (!best) { best = item; return; }
    if (item.score < best.score) { best = item; return; }
    if (item.score === best.score && item.area < best.area) { best = item; return; }
    if (item.score === best.score && item.area === best.area && item.depth > best.depth) best = item;
  }
  function overBudget() {
    try { if (th17Now() - start > limitMs) return true; } catch (e0) {}
    return count.n >= maxNodes;
  }
  function dfs(node, depth) {
    if (!node || depth > 40 || overBudget()) return;
    count.n++;
    if (!th17NodeVisible(node)) return;

    var rect = th17NodeBounds(node);
    var rectOk = th17RectValid(rect);
    var score = rectOk ? self.pointerRectHitScore(x, y, rect) : -1;
    var contains = score >= 0;

    if (contains) {
      var textValue = th17NodeText(node);
      var fromControl = false;
      if ((!textValue || String(textValue).replace(/\s+/g, "").length <= 0) && self.pointerNodeLooksLikeTextControl(node, rect, depth)) {
        textValue = self.collectPointerControlDescendantText(node, 4, 8);
        fromControl = !!textValue;
      }
      if (textValue && String(textValue).replace(/\s+/g, "").length > 0) {
        better({ text: String(textValue), rect: rect, depth: depth, score: score + (fromControl ? 0.35 : 0) });
      }
    }

    var childCount = 0;
    try { childCount = node.getChildCount(); } catch (eCount) { childCount = 0; }

    // 父节点 bounds 异常时继续向下扫；父节点 bounds 正常且明显不在指针附近时才剪枝。
    if (!contains && rectOk && depth > 1) return;

    for (var i = 0; i < childCount; i++) {
      if (overBudget()) break;
      var child = null;
      try { child = node.getChild(i); } catch (eChild) { child = null; }
      if (child) {
        try { dfs(child, depth + 1); } finally { try { child.recycle(); } catch (eRecycle) {} }
      }
    }
  }
  try { dfs(root, 0); } catch (eDfs) { safeLog(this.L, 'e', "findPointerTextNodeAtBudget fail: " + String(eDfs)); }
  return best;
};

FloatBallAppWM.prototype.findPointerTextAtSnapshot = function(x, y, force, reason, seq, session) {
  var start = th17Now();
  var isFinal = force === true;
  var limitMs = isFinal ? 180 : 60;
  var maxNodes = isFinal ? 420 : 120;
  var st = this.ensurePointerToolState();
  try { limitMs = isFinal ? Number(st.inspectMaxFinalMs || 120) : Number(st.inspectMaxDragMs || 60); } catch (eLimit) {}
  try { maxNodes = isFinal ? Number(st.inspectMaxFinalNodes || 260) : Number(st.inspectMaxDragNodes || 120); } catch (eNodes) {}
  if (isNaN(limitMs) || limitMs < 20) limitMs = isFinal ? 180 : 60;
  if (isNaN(maxNodes) || maxNodes < 40) maxNodes = isFinal ? 420 : 120;
  var count = { n: 0 };
  var result = null;
  var windowsCount = 0;
  var a = this.getPointerUiAutomation(isFinal ? "final" : "scan");
  try {
    if (a && a.getWindows) {
      var wins = a.getWindows();
      if (wins) {
        try { windowsCount = wins.size(); } catch (eSize) { windowsCount = 0; }
        for (var wi = 0; wi < windowsCount; wi++) {
          if (th17Now() - start > limitMs || count.n >= maxNodes) break;
          var win = null;
          var rootFromWin = null;
          try {
            win = wins.get(wi);
            if (win) rootFromWin = this.getPointerWindowRoot(win);
            if (rootFromWin) result = this.findPointerTextNodeAtBudget(rootFromWin, x, y, start, limitMs, maxNodes, count);
          } catch (eWin) {
            result = null;
          } finally {
            try { if (rootFromWin) rootFromWin.recycle(); } catch (eRootRecycle) {}
          }
          if (result && result.text && result.rect) break;
        }
      }
    }
  } catch (eWindows) {}
  if (!result || !result.text || !result.rect) {
    var root = null;
    try {
      root = this.getPointerActiveRoot(isFinal ? "final" : "scan");
      if (root) result = this.findPointerTextNodeAtBudget(root, x, y, start, limitMs, maxNodes, count);
    } catch (eFind) {
      result = null;
    } finally {
      try { if (root) root.recycle(); } catch (eRecycleRoot) {}
    }
  }
  var cost = th17Now() - start;
  return {
    seq: seq,
    session: session,
    x: x,
    y: y,
    force: isFinal,
    reason: String(reason || ""),
    result: result,
    costMs: cost,
    nodes: count.n,
    windows: windowsCount,
    timedOut: cost >= limitMs || count.n >= maxNodes
  };
};

FloatBallAppWM.prototype.applyPointerInspectResult = function(pack) {
  var st = this.ensurePointerToolState();
  if (!pack) return;
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  if (pack.session !== st.inspectSession) return;
  if (pack.seq !== st.inspectLatestSeq) return;
  if (pack.seq < st.inspectLastResultSeq) return;
  st.inspectLastResultSeq = pack.seq;
  st.inspectLastCostMs = Number(pack.costMs || 0);
  st.inspectLastNodes = Number(pack.nodes || 0);
  st.lastQueryX = pack.x;
  st.lastQueryY = pack.y;
  var result = pack.result;
  var now = th17Now();
  var finishAfterRelease = pack.finishAfterResult === true;
  if (result && result.text && result.rect) {
    var key = this.pointerTextKeyOf(result);
    if (key !== st.hoverKey) {
      st.hoverKey = key;
      var releaseTsForHover = 0;
      var stableSince = 0;
      try { releaseTsForHover = Number(st.releaseTs || 0); } catch (eReleaseTs) { releaseTsForHover = 0; }
      try { stableSince = Number(st.areaHoldSince || 0); } catch (eStableSince) { stableSince = 0; }

      // 松手最终补扫命中新文本时，不能绕过“悬停取字时间”。
      // 如果指针热点已经稳定停留足够久，则用稳定起点计算悬停时间；
      // 否则从松手时间开始计算，后续 extract 会返回 TEXT_HOVER_NOT_READY。
      if (finishAfterRelease && releaseTsForHover > 0 && stableSince > 0 && releaseTsForHover - stableSince >= Number(st.hoverMinMs || 800)) {
        st.hoverSince = stableSince;
      } else if (finishAfterRelease && releaseTsForHover > 0) {
        st.hoverSince = releaseTsForHover;
      } else {
        st.hoverSince = now;
      }
      st.hoverX = pack.x;
      st.hoverY = pack.y;
    }
    st.currentText = String(result.text);
    st.currentRect = result.rect;
    st.currentKey = key;
    st.boundText = st.currentText;
    st.boundRect = th17RectObj(result.rect);
    st.boundKey = key;
    st.boundAt = now;
    var ready = now - st.hoverSince >= st.hoverMinMs;
    this.showPointerAreaFrame(result.rect, ready ? "text_hit" : "text_hover");
    this.updatePointerVisualHot(ready);
  } else {
    st.currentText = "";
    st.currentRect = null;
    st.currentKey = "";
    st.hoverKey = "";
    st.hoverSince = 0;
    this.updatePointerVisualHot(false);
    this.hidePointerAreaFrame();
  }
  try {
    if (Number(pack.costMs || 0) > 80 || pack.timedOut === true) {
      safeLog(this.L, 'i', "pointer inspect cost=" + String(pack.costMs) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " reason=" + String(pack.reason) + " timeout=" + String(pack.timedOut === true));
    }
  } catch (eLog) {}
  if (pack.finishAfterResult === true && st.active && !st.closed) {
    this.finishPointerTextPickAfterRelease();
  }
};

FloatBallAppWM.prototype.runPointerInspectWorker = function(st) {
  var self = this;
  if (!st || !st.inspectH || st.inspectRunning) return;
  st.inspectRunning = true;
  st.inspectH.post(new JavaAdapter(java.lang.Runnable, {
    run: function() {
      var pack = null;
      var seq = 0;
      var session = 0;
      var finishAfter = false;
      try {
        if (!st.active || st.closed || st.inspectClosed) return;
        st.inspectPending = false;
        seq = st.inspectLatestSeq;
        session = st.inspectSession;
        var x = st.inspectLatestX;
        var y = st.inspectLatestY;
        var force = st.inspectLatestForce === true;
        var reason = String(st.inspectLatestReason || "");
        finishAfter = st.inspectFinishAfterResult === true;
        st.inspectFinishAfterResult = false;
        pack = self.findPointerTextAtSnapshot(x, y, force, reason, seq, session);
        pack.finishAfterResult = finishAfter;
      } catch (eRun) {
        safeLog(self.L, 'e', "runPointerInspectWorker fail: " + String(eRun));
      } finally {
        try {
          var h = st.handler || self.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
          h.post(new JavaAdapter(java.lang.Runnable, {
            run: function() {
              try { if (pack) self.applyPointerInspectResult(pack); }
              catch (eApply) { safeLog(self.L, 'e', "applyPointerInspectResult fail: " + String(eApply)); }
              try {
                st.inspectRunning = false;
                if (st.inspectPending && st.active && !st.closed && !st.inspectClosed) self.runPointerInspectWorker(st);
              } catch (eNext) {}
            }
          }));
        } catch (ePost) {
          st.inspectRunning = false;
        }
      }
    }
  }));
};

FloatBallAppWM.prototype.schedulePointerInspectAsync = function(force, reason, finishAfterResult) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return false;
  var hp = this.getPointerHotspot();
  var reasonText = String(reason || "");

  // release_final / area_small_text_final 必须走当前线程同步扫描。
  // 实测后台 inspect worker 可能拿不到 UiAutomation root，表现为 cost 很低但 nodes=0。
  if (force === true && finishAfterResult === true) {
    st.inspectLatestX = hp.x;
    st.inspectLatestY = hp.y;
    st.inspectLatestSeq = ++st.inspectSeq;
    st.inspectLatestForce = true;
    st.inspectLatestReason = reasonText;

    var pack = null;
    try {
      pack = this.findPointerTextAtSnapshot(hp.x, hp.y, true, reasonText + "_sync", st.inspectLatestSeq, st.inspectSession);
      pack.finishAfterResult = true;
      try {
        safeLog(this.L, 'i', "pointer release sync inspect cost=" + String(pack.costMs) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " reason=" + String(pack.reason) + " timeout=" + String(pack.timedOut === true));
      } catch (eLogSync) {}
      this.applyPointerInspectResult(pack);
      return true;
    } catch (eSync) {
      try { safeLog(this.L, 'e', "pointer release sync inspect fail: " + String(eSync)); } catch (eLogFail) {}
      return false;
    }
  }

  var moved = Math.abs(hp.x - st.lastQueryX) > this.dp(4) || Math.abs(hp.y - st.lastQueryY) > this.dp(4);
  if (force !== true && !moved) return false;
  if (force !== true) {
    var now = th17Now();
    if (now - st.inspectLastRequestTs < 80) return false;
    st.inspectLastRequestTs = now;
  }
  if (!this.ensurePointerInspectWorker(st)) return false;
  st.inspectLatestX = hp.x;
  st.inspectLatestY = hp.y;
  st.inspectLatestSeq = ++st.inspectSeq;
  st.inspectLatestForce = force === true;
  st.inspectLatestReason = reasonText;
  if (finishAfterResult === true) st.inspectFinishAfterResult = true;
  st.inspectPending = true;
  if (!st.inspectRunning) this.runPointerInspectWorker(st);
  return true;
};

FloatBallAppWM.prototype.updatePointerInspect = function(force) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  var hp = this.getPointerHotspot();
  var moved = Math.abs(hp.x - st.lastQueryX) > this.dp(4) || Math.abs(hp.y - st.lastQueryY) > this.dp(4);
  if (force !== true && !moved) return;
  st.inspectLatestSeq = ++st.inspectSeq;
  var pack = this.findPointerTextAtSnapshot(hp.x, hp.y, force === true, force === true ? "sync_force" : "sync", st.inspectLatestSeq, st.inspectSession);
  pack.finishAfterResult = false;
  this.applyPointerInspectResult(pack);
};

FloatBallAppWM.prototype.getPointerTextHoverLimitMs = function() {
  var st = this.ensurePointerToolState();
  var limit = 800;
  try { limit = Number(st.hoverMinMs || 800); } catch (e0) { limit = 800; }
  if (isNaN(limit) || limit < 0) limit = 800;
  return limit;
};

FloatBallAppWM.prototype.isPointerTextHoverReady = function(atTs) {
  var st = this.ensurePointerToolState();
  if (!st.currentText || !st.currentRect) return false;
  if (!st.hoverSince || Number(st.hoverSince || 0) <= 0) return false;
  if (st.currentKey && st.hoverKey && String(st.currentKey) !== String(st.hoverKey)) return false;
  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  return ts - Number(st.hoverSince || 0) >= this.getPointerTextHoverLimitMs();
};

FloatBallAppWM.prototype.getPointerTextHoverRemainMs = function(atTs) {
  var st = this.ensurePointerToolState();
  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var elapsed = st.hoverSince ? (ts - Number(st.hoverSince || 0)) : 0;
  var remain = this.getPointerTextHoverLimitMs() - elapsed;
  if (isNaN(remain) || remain < 0) remain = 0;
  return Math.ceil(remain);
};

FloatBallAppWM.prototype.extractCurrentPointerText = function(skipInspect, hoverAtTs) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return { ok: false, err: "指针未启动" };
  if (skipInspect !== true) this.updatePointerInspect(true);
  if (!st.currentText || !st.currentRect) {
    this.setPointerToolResult({ ok: false, type: "pointer_error", code: "NO_TEXT", message: "未命中文本" });
    this.toast("未命中文本");
    this.closePointerTool("未命中文本", true);
    return { ok: false, err: "未命中文本" };
  }
  if (!this.isPointerTextHoverReady(hoverAtTs)) {
    var remainMs = this.getPointerTextHoverRemainMs(hoverAtTs);
    this.setPointerToolResult({
      ok: false,
      type: "cancel",
      code: "TEXT_HOVER_NOT_READY",
      message: "悬停时间不足",
      value: "",
      data: {
        remainMs: remainMs,
        hoverMinMs: this.getPointerTextHoverLimitMs()
      }
    });
    this.toast("悬停时间不足");
    this.closePointerTool("悬停时间不足", true);
    return { ok: false, err: "悬停时间不足", code: "TEXT_HOVER_NOT_READY" };
  }
  var rect = st.currentRect;
  var textValue = String(st.currentText);
  var copied = this.copyPointerTextToClipboard(textValue);
  this.setPointerToolResult({
    ok: true,
    type: "text_pick",
    value: textValue,
    clipboard: copied === true,
    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
  });
  this.toast(copied ? "已复制: " + textValue : textValue);
  this.closePointerTool(copied ? "已复制到剪贴板" : "取字完成", true);
  return { ok: true, text: textValue, clipboard: copied === true };
};

FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  var releaseTs = Number(st.releaseTs || th17Now());
  if (isNaN(releaseTs) || releaseTs <= 0) releaseTs = th17Now();
  if (st.currentText && st.currentRect) {
    this.extractCurrentPointerText(true, releaseTs);
    return;
  }
  try {
    safeLog(this.L, 'i', "pointer release final no accessibility text cost=" + String(st.inspectLastCostMs || 0) + " nodes=" + String(st.inspectLastNodes || 0) + " reason=" + String(st.inspectLatestReason || ""));
  } catch (eNoTextLog) {}

  this.setPointerToolResult({
    ok: false,
    type: "cancel",
    code: "POINTER_RELEASE_EMPTY",
    message: "空白处松手，已关闭指针",
    value: "",
    data: {}
  });
  this.closePointerTool("空白处松手", true);
};

FloatBallAppWM.prototype.finishPointerTextPickOnRelease = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return false;
  st.releaseTs = th17Now();

  // 有明确文字候选：立即判断悬停时间并取字 / 取消。
  if (st.currentText && st.currentRect) {
    this.extractCurrentPointerText(true, st.releaseTs);
    return true;
  }

  // 无文字候选：不要立刻判空。松手时执行一次 release_final 强制补扫。
  // 解决拖动扫描异步返回滞后导致的 POINTER_RELEASE_EMPTY。
  try {
    st.inspectMaxFinalMs = Math.max(Number(st.inspectMaxFinalMs || 120), 180);
    st.inspectMaxFinalNodes = Math.max(Number(st.inspectMaxFinalNodes || 260), 420);
  } catch (eBudget) {
    st.inspectMaxFinalMs = 180;
    st.inspectMaxFinalNodes = 420;
  }
  var scheduled = this.schedulePointerInspectAsync(true, "release_final", true);
  if (scheduled !== true) this.finishPointerTextPickAfterRelease();
  return true;
};

FloatBallAppWM.prototype.scheduleFinishPointerTextPick = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  st.releaseTs = th17Now();
  this.finishPointerTextPickOnRelease();
};

FloatBallAppWM.prototype.normalizePointerCaptureRect = function(rect) {
  var st = this.ensurePointerToolState();
  if (!rect) return null;
  var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));
  var sh = Math.max(1, Number(this.state.screen && this.state.screen.h || 0));
  if (sw <= 1 || sh <= 1) {
    try { var ss = this.getScreenSizePx(); sw = ss.w; sh = ss.h; } catch (e0) {}
  }
  var l = Math.min(th17Int(rect.left), th17Int(rect.right));
  var t = Math.min(th17Int(rect.top), th17Int(rect.bottom));
  var r = Math.max(th17Int(rect.left), th17Int(rect.right));
  var b = Math.max(th17Int(rect.top), th17Int(rect.bottom));
  var minSize = Math.max(1, Number(st.areaMinSize || this.dp(8)));
  if (r - l < minSize) {
    var cx = Math.round((l + r) / 2);
    l = cx - Math.floor(minSize / 2);
    r = l + minSize;
  }
  if (b - t < minSize) {
    var cy = Math.round((t + b) / 2);
    t = cy - Math.floor(minSize / 2);
    b = t + minSize;
  }
  l = this.clamp(l, 0, Math.max(0, sw - 1));
  t = this.clamp(t, 0, Math.max(0, sh - 1));
  r = this.clamp(r, l + 1, sw);
  b = this.clamp(b, t + 1, sh);
  return { left: l, top: t, right: r, bottom: b };
};

FloatBallAppWM.prototype.isPointerOcrRectValid = function(rect, startX, startY, endX, endY) {
  var st = this.ensurePointerToolState();
  if (!rect) return false;
  var w = Math.max(0, th17Int(rect.right) - th17Int(rect.left));
  var h = Math.max(0, th17Int(rect.bottom) - th17Int(rect.top));
  var area = w * h;
  var dx = th17Int(endX) - th17Int(startX);
  var dy = th17Int(endY) - th17Int(startY);
  var move = Math.sqrt(dx * dx + dy * dy);
  if (w < Math.max(1, Number(st.areaMinWidthPx || this.dp(56)))) return false;
  if (h < Math.max(1, Number(st.areaMinHeightPx || this.dp(20)))) return false;
  if (area < Math.max(1, Number(st.areaMinAreaPx || (this.dp(1) * this.dp(1) * 1200)))) return false;
  if (move < Math.max(0, Number(st.areaMinMovePx || this.dp(24)))) return false;
  return true;
};

FloatBallAppWM.prototype.finishPointerFallbackText = function() {
  var st = this.ensurePointerToolState();
  if (!st.boundText || !st.boundRect) {
    this.setPointerToolResult({ ok: false, type: "cancel", code: "AREA_TOO_SMALL", message: "框选区域过小", value: "", data: {} });
    this.toast("框选区域过小");
    this.closePointerTool("框选区域过小", true);
    return { ok: false, err: "框选区域过小", code: "AREA_TOO_SMALL" };
  }
  var rect = th17RectObj(st.boundRect);
  var textValue = String(st.boundText || "");
  st.currentText = textValue;
  st.currentRect = rect;
  st.currentKey = String(st.boundKey || "");
  try { this.showPointerAreaFrame(rect, "text_hit"); } catch (eFrame) {}
  var copied = this.copyPointerTextToClipboard(textValue);
  this.setPointerToolResult({
    ok: true,
    type: "text_pick",
    code: "TEXT_PICK_FALLBACK_FROM_SMALL_AREA",
    message: "框选区域过小，已回退取字",
    value: textValue,
    clipboard: copied === true,
    fallback: true,
    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
  });
  this.toast(copied ? "已回退取字并复制" : "已回退取字");
  this.closePointerTool("已回退取字", true);
  return { ok: true, text: textValue, clipboard: copied === true, fallback: true };
};

FloatBallAppWM.prototype.updatePointerAreaSelection = function(x, y) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "area_capture") return;
  var hp = (x !== undefined && y !== undefined) ? { x: th17Int(x), y: th17Int(y) } : this.getPointerHotspot();
  if (!st.areaSelecting) {
    st.areaSelecting = true;
    if (!st.areaStartX && !st.areaStartY) {
      st.areaStartX = hp.x;
      st.areaStartY = hp.y;
    }
  }
  st.areaEndX = hp.x;
  st.areaEndY = hp.y;
  var raw = { left: st.areaStartX, top: st.areaStartY, right: st.areaEndX, bottom: st.areaEndY };
  var norm = this.normalizePointerCaptureRect(raw);
  st.captureRect = norm;
  st.visualRect = norm;
  st.areaValid = this.isPointerOcrRectValid(norm, st.areaStartX, st.areaStartY, st.areaEndX, st.areaEndY);
  st.areaReady = !!norm && st.areaValid;
  st.areaFallbackPreview = false;
  if (norm) {
    if (st.areaValid) {
      this.showPointerAreaFrame(norm, "area");
    } else if (st.areaFromText === true && st.areaSmallFallbackText === true && st.boundRect) {
      st.areaFallbackPreview = true;
      this.showPointerAreaFrame(st.boundRect, "text_hit");
    } else {
      this.showPointerAreaFrame(norm, "area_armed");
    }
  }
};

FloatBallAppWM.prototype.createPointerFrameView = function(st) {
  var self = this;
  var FrameView = new JavaAdapter(android.view.View, {
    onDraw: function(canvas) {
      try {
        var rect = st.frameRect;
        if (!rect) return;
        var p = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        var rf = new android.graphics.RectF(rect.left, rect.top, rect.right, rect.bottom);
        var kind = "";
        try { kind = String(st.frameKind || ""); } catch(eKind) { kind = ""; }
        var rgb = null;
        var fillAlpha = 42;
        var strokeAlpha = 235;
        var strokeWidth = self.dp(2);
        if (kind === "capture" || st.areaProcessing === true) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_CAPTURE_HEX", 168, 85, 247);
          fillAlpha = 56;
          strokeAlpha = 245;
          strokeWidth = self.dp(2.4);
        } else if (kind === "text_hit") {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_HIT_HEX", 245, 158, 11);
          fillAlpha = 34;
          strokeAlpha = 245;
          strokeWidth = self.dp(2.2);
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
        p.setStyle(android.graphics.Paint.Style.FILL);
        p.setARGB(fillAlpha, rgb.r, rgb.g, rgb.b);
        canvas.drawRoundRect(rf, self.dp(6), self.dp(6), p);
        p.setStyle(android.graphics.Paint.Style.STROKE);
        p.setStrokeWidth(strokeWidth);
        p.setARGB(strokeAlpha, rgb.r, rgb.g, rgb.b);
        canvas.drawRoundRect(rf, self.dp(6), self.dp(6), p);
      } catch (eDraw) {}
    }
  }, context);
  return FrameView;
};

FloatBallAppWM.prototype.showPointerAreaFrame = function(rect, kind) {
  var st = this.ensurePointerToolState();
  if (!rect) return;
  st.frameRect = th17RectObj(rect);
  try { st.frameKind = String(kind || "area"); } catch(eKindSet) { st.frameKind = "area"; }
  try {
    var wm = this.state.wm || st.wm || context.getSystemService(android.content.Context.WINDOW_SERVICE);
    if (!st.frame) st.frame = this.createPointerFrameView(st);
    if (!st.frameLp) {
      var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));
      var sh = Math.max(1, Number(this.state.screen && this.state.screen.h || 0));
      if (sw <= 1 || sh <= 1) {
        try { var ss = this.getScreenSizePx(); sw = ss.w; sh = ss.h; } catch (eScreen) {}
      }
      var flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
        android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE |
        android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
      st.frameLp = new android.view.WindowManager.LayoutParams(sw, sh, android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, flags, android.graphics.PixelFormat.TRANSLUCENT);
      st.frameLp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
      st.frameLp.x = 0;
      st.frameLp.y = 0;
    }
    if (!st.frameAdded) {
      wm.addView(st.frame, st.frameLp);
      st.frameAdded = true;
    }
    try { st.frame.invalidate(); } catch (eInv) {}
  } catch (e0) { safeLog(this.L, 'e', "showPointerAreaFrame fail: " + String(e0)); }
};

FloatBallAppWM.prototype.hidePointerAreaFrame = function() {
  var st = this.ensurePointerToolState();
  try {
    if (st.frameAdded && st.frame) {
      if (typeof this.safeRemoveView === "function") this.safeRemoveView(st.frame, "pointerFrame");
      else if (this.state.wm) this.state.wm.removeView(st.frame);
    }
  } catch (e0) { safeLog(this.L, 'e', "hidePointerAreaFrame fail: " + String(e0)); }
  st.frame = null;
  st.frameLp = null;
  st.frameAdded = false;
  st.frameRect = null;
};

FloatBallAppWM.prototype.finishPointerAreaSmallAsTextPick = function(reason) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "area_capture") return false;

  try {
    safeLog(this.L, 'i', "pointer area small -> accessibility text final reason=" + String(reason || "") + " rect=" + th17RectKey(st.visualRect || st.captureRect));
  } catch (eLog) {}

  try { this.hidePointerAreaFrame(); } catch (eHide) {}
  try { if (st.root) st.root.invalidate(); } catch (eInv) {}

  // 关键：不要走 OCR，不要直接 AREA_TOO_SMALL。
  // 切回 text_pick，在当前指针热点上做一次无障碍最终命中。
  st.mode = "text_pick";
  st.dragging = false;
  st.areaSelecting = false;
  st.areaReady = false;
  st.areaValid = false;
  st.areaProcessing = false;
  st.releaseTs = th17Now();

  st.currentText = "";
  st.currentRect = null;
  st.currentKey = "";

  try {
    st.inspectMaxFinalMs = Math.max(Number(st.inspectMaxFinalMs || 180), 240);
    st.inspectMaxFinalNodes = Math.max(Number(st.inspectMaxFinalNodes || 420), 1200);
  } catch (eBudget) {
    st.inspectMaxFinalMs = 240;
    st.inspectMaxFinalNodes = 1200;
  }

  var scheduled = this.schedulePointerInspectAsync(true, "area_small_text_final", true);
  if (scheduled !== true) this.finishPointerTextPickAfterRelease();
  return true;
};

FloatBallAppWM.prototype.finishPointerAreaCapture = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return { ok: false, err: "指针未启动" };
  this.updatePointerAreaSelection();
  var visualRect = this.normalizePointerCaptureRect(st.visualRect || st.captureRect);
  var captureRect = this.normalizePointerCaptureRect(st.captureRect || st.visualRect);
  if (visualRect) {
    var inset = Math.max(0, Number(st.areaCaptureInset || this.dp(3)));
    var inner = {
      left: visualRect.left + inset,
      top: visualRect.top + inset,
      right: visualRect.right - inset,
      bottom: visualRect.bottom - inset
    };
    captureRect = this.normalizePointerCaptureRect(inner);
  }
  if (!captureRect) {
    this.setPointerToolResult({ ok: false, type: "pointer_error", code: "EMPTY_RECT", message: "框选区域为空" });
    this.toast("框选区域为空");
    this.closePointerTool("框选区域为空", true);
    return { ok: false, err: "框选区域为空" };
  }
  if (!visualRect) visualRect = st.visualRect || captureRect;
  var ocrRectValid = this.isPointerOcrRectValid(visualRect || captureRect, st.areaStartX, st.areaStartY, st.areaEndX, st.areaEndY);
  st.areaValid = ocrRectValid;
  st.areaReady = ocrRectValid;
  if (!ocrRectValid) {
    if (st.areaFromText === true && st.areaSmallFallbackText === true && st.boundText && st.boundRect) {
      return this.finishPointerFallbackText();
    }

    // 自动悬停进入 area_capture 后，如果用户并未真正框选出有效区域，
    // 不直接 AREA_TOO_SMALL；先回到 text_pick 做无障碍控件最终命中。
    if (this.finishPointerAreaSmallAsTextPick("area_too_small")) {
      return { ok: false, pending: true, code: "TEXT_PICK_FINAL_PENDING" };
    }

    this.setPointerToolResult({
      ok: false,
      type: "cancel",
      code: "AREA_TOO_SMALL",
      message: "框选区域过小",
      value: "",
      data: {
        minWidthPx: st.areaMinWidthPx,
        minHeightPx: st.areaMinHeightPx,
        minAreaPx: st.areaMinAreaPx,
        minMovePx: st.areaMinMovePx
      }
    });
    this.toast("框选区域过小");
    this.closePointerTool("框选区域过小", true);
    return { ok: false, err: "框选区域过小", code: "AREA_TOO_SMALL" };
  }
  st.areaProcessing = true;
  try { this.showPointerAreaFrame(visualRect || captureRect, "capture"); } catch (eProcessFrame) {}
  try { if (st.root) st.root.invalidate(); } catch (eProcessInv) {}
  try { java.lang.Thread.sleep(90); } catch (eProcessSleep) {}
  var screenshotPath = "";
  var screenshotError = "";
  try {
    try { this.hidePointerAreaFrame(); } catch (eHideFrame) {}
    try { if (st.root) st.root.setVisibility(android.view.View.GONE); } catch (eHideRoot) {}
    try { java.lang.Thread.sleep(80); } catch (eSleep) {}
    screenshotPath = this.capturePointerRectToPng(captureRect);
  } catch (eShot) {
    screenshotError = String(eShot);
    safeLog(this.L, 'e', "pointer area screenshot fail rect=" + th17RectKey(captureRect) + " err=" + screenshotError);
  }
  this.setPointerToolResult({
    ok: screenshotPath ? true : false,
    type: "area_capture",
    code: screenshotPath ? "AREA_CAPTURE_SUCCESS" : "AREA_SCREENSHOT_FAILED",
    message: screenshotPath ? "框选截图完成" : "框选完成，截图失败",
    value: screenshotPath,
    captureRect: captureRect,
    visualRect: visualRect,
    screenshotFilePath: screenshotPath,
    data: {
      path: screenshotPath,
      error: screenshotError
    }
  });
  safeLog(this.L, 'i', "pointer area_capture result captureRect=" + th17RectKey(captureRect) + " visualRect=" + th17RectKey(visualRect) + " screenshot=" + screenshotPath);
  if (screenshotPath) this.toast("框选截图完成: " + screenshotPath);
  else this.toast("框选完成，截图失败");
  this.closePointerTool("框选完成", true);
  return { ok: screenshotPath ? true : false, captureRect: captureRect, visualRect: visualRect, screenshotFilePath: screenshotPath, err: screenshotError };
};

FloatBallAppWM.prototype.flushPointerPositionFromBall = function() {
  var st = this.ensurePointerToolState();
  if (!this.state.ballLp) return false;
  var pos = this.pointerPositionFromBall(this.state.ballLp.x, this.state.ballLp.y);
  st.pendingPointerX = pos.x;
  st.pendingPointerY = pos.y;
  st.pointerX = pos.x;
  st.pointerY = pos.y;
  if (st.lp) { st.lp.x = pos.x; st.lp.y = pos.y; }
  try { if (st.root && st.wm && st.lp) st.wm.updateViewLayout(st.root, st.lp); } catch (eFlush) {}
  return true;
};

FloatBallAppWM.prototype.onPointerBallDragStart = function(rawX, rawY) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return false;
  if (!st.root || !st.lp) this.showPointerWindow(st);
  this.flushPointerPositionFromBall();
  st.dragging = false;
  st.dragStarted = false;
  st.moved = false;
  st.hot = false;
  this.resetPointerAreaHold();
  if (st.mode === "area_capture") {
    var hp = this.getPointerHotspot();
    st.areaStartX = hp.x;
    st.areaStartY = hp.y;
    st.areaEndX = hp.x;
    st.areaEndY = hp.y;
    st.areaSelecting = false;
    st.areaReady = false;
  } else {
    st.currentText = "";
    st.currentRect = null;
    st.currentKey = "";
    st.hoverKey = "";
    st.hoverSince = 0;
    this.hidePointerAreaFrame();
    this.updatePointerAreaHoldCandidate();
  }
  try { if (st.root) st.root.invalidate(); } catch (eInv) {}
  return true;
};

FloatBallAppWM.prototype.onPointerBallDragging = function(ballX, ballY, rawX, rawY) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return false;
  st.dragging = true;
  st.dragStarted = true;
  st.moved = true;
  this.schedulePointerMove(ballX, ballY);
  if (st.mode === "area_capture") this.updatePointerAreaSelection();
  else {
    this.updatePointerAreaHoldCandidate();
    this.scheduleDraggingInspect();
  }
  return true;
};

FloatBallAppWM.prototype.onPointerBallDragEnd = function(rawX, rawY, action) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return false;
  this.flushPointerPositionFromBall();
  st.dragging = false;
  try { if (st.root) st.root.invalidate(); } catch (eInv) {}
  if (action === android.view.MotionEvent.ACTION_CANCEL) {
    this.setPointerToolResult({ ok: false, type: "cancel", code: "ACTION_CANCEL", message: "指针取消" });
    this.toast("指针已取消");
    this.closePointerTool("ACTION_CANCEL", true);
    return true;
  }
  if (st.mode === "area_capture") {
    this.finishPointerAreaCapture();
  } else if (st.mode === "text_pick") {
    this.finishPointerTextPickOnRelease();
  }
  return true;
};

FloatBallAppWM.prototype.onPointerBallTap = function(rawX, rawY) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return false;
  var now = th17Now();
  if (now - st.lastClickTime > 560) st.clickCount = 0;
  st.lastClickTime = now;
  st.clickCount++;
  st.dragging = false;
  if (st.clickCount >= 3) {
    st.clickCount = 0;
    this.setPointerToolResult({ ok: false, type: "cancel", code: "USER_CANCEL", message: "用户取消" });
    this.toast("指针已取消");
    this.closePointerTool("三连击取消", true);
    return true;
  }
  this.toast("再点" + String(3 - st.clickCount) + "次取消");
  return true;
};

FloatBallAppWM.prototype.startPointerTool = function(options) {
  var st = this.ensurePointerToolState();
  if (st.active) this.closePointerTool("重新启动", true);
  st = this.ensurePointerToolState();
  var mode = String((options && options.mode) || "text_pick");
  if (mode !== "text_pick" && mode !== "area_capture") mode = "text_pick";
  this.resetPointerToolState(st, mode, (options && options.source) || "");
  try { this.hideAllPanels(); } catch (eHide) {}
  var ok = this.showPointerWindow(st);
  if (!ok) {
    st.active = false;
    this.setPointerToolResult({ ok: false, type: "pointer_error", code: "WINDOW_FAILED", message: "指针窗口创建失败" });
    return { ok: false, err: "指针窗口创建失败" };
  }
  if (mode === "area_capture") this.toast("拖动悬浮球框选");
  else this.toast("拖动悬浮球取字");
  safeLog(this.L, 'i', "pointer start mode=" + mode);
  return { ok: true, type: "pointer_started", mode: mode };
};

FloatBallAppWM.prototype.execPointerAction = function(btn) {
  try {
    var mode = String((btn && btn.mode) || (btn && btn.pointerMode) || "text_pick");
    if (mode !== "text_pick" && mode !== "area_capture") mode = "text_pick";
    return this.startPointerTool({ mode: mode, source: "button" });
  } catch (e0) {
    safeLog(this.L, 'e', "execPointerAction crash: " + String(e0));
    return { ok: false, err: String(e0) };
  }
};
