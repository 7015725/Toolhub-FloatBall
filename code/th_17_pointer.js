// @version 1.0.2
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

function th17NodeText(node) {
  try {
    var txt = node.getText();
    if (txt !== null && txt !== undefined) return String(txt);
  } catch (e0) {}
  return "";
}

function th17NodeBounds(node) {
  try {
    var rect = new android.graphics.Rect();
    node.getBoundsInScreen(rect);
    return th17RectObj(rect);
  } catch (e0) {}
  return null;
}

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
      pointerW: 0,
      pointerH: 0,
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
      lastInspectTs: 0,
      lastQueryX: -100000,
      lastQueryY: -100000,
      currentText: "",
      currentRect: null,
      currentKey: "",
      hoverSince: 0,
      hoverKey: "",
      hoverX: 0,
      hoverY: 0,
      hoverMinMs: 800,
      hot: false,
      clickCount: 0,
      lastClickTime: 0,
      areaStartX: 0,
      areaStartY: 0,
      areaEndX: 0,
      areaEndY: 0,
      areaSelecting: false,
      areaReady: false,
      captureRect: null,
      visualRect: null,
      paint: null
    };
  }
  var st = this.state.pointerTool;
  var dp = function(v) { return Math.max(1, Math.floor(Number(v) * (Number(this.state.density || 1) || 1))); };
  st.pointerW = dp.call(this, 36);
  st.pointerH = dp.call(this, 48);
  st.anchorLocalX = dp.call(this, 18);
  st.anchorLocalY = dp.call(this, 18);
  st.handleLocalX = st.anchorLocalX;
  st.handleLocalY = st.anchorLocalY;
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
  st.lastInspectTs = 0;
  st.lastQueryX = -100000;
  st.lastQueryY = -100000;
  st.currentText = "";
  st.currentRect = null;
  st.currentKey = "";
  st.hoverSince = 0;
  st.hoverKey = "";
  st.hoverX = 0;
  st.hoverY = 0;
  st.hot = false;
  st.clickCount = 0;
  st.lastClickTime = 0;
  st.areaStartX = 0;
  st.areaStartY = 0;
  st.areaEndX = 0;
  st.areaEndY = 0;
  st.areaSelecting = false;
  st.areaReady = false;
  st.captureRect = null;
  st.visualRect = null;
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

FloatBallAppWM.prototype.isPointerToolActive = function() {
  var st = this.ensurePointerToolState();
  return !!st.active;
};

FloatBallAppWM.prototype.removePointerCallbacks = function(st) {
  try { if (st.handler && st.moveRunnable) st.handler.removeCallbacks(st.moveRunnable); } catch (e0) {}
  try { if (st.handler && st.inspectRunnable) st.handler.removeCallbacks(st.inspectRunnable); } catch (e1) {}
  try { if (st.handler && st.stopInspectRunnable) st.handler.removeCallbacks(st.stopInspectRunnable); } catch (e2) {}
  st.moveRunnable = null;
  st.inspectRunnable = null;
  st.stopInspectRunnable = null;
  st.dragUpdatePosted = false;
  st.inspectPosted = false;
};

FloatBallAppWM.prototype.closePointerTool = function(reason, suppressCancel) {
  var st = this.ensurePointerToolState();
  this.removePointerCallbacks(st);
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
        var dp = function(v) { return self.dp(v); };
        var tipX = st.anchorLocalX;
        var tipY = st.anchorLocalY;
        var active = !!(st.hot || st.areaSelecting || st.areaReady);
        var dragging = !!st.dragging;
        var accentR = st.mode === "area_capture" ? 59 : (st.hot ? 245 : 76);
        var accentG = st.mode === "area_capture" ? 130 : (st.hot ? 158 : 124);
        var accentB = st.mode === "area_capture" ? 246 : (st.hot ? 11 : 160);
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
        p.setARGB(active ? 250 : 248, 255, 255, 255);
        canvas.drawPath(path, p);
        try { p.clearShadowLayer(); } catch (e2) {}

        p.setStyle(android.graphics.Paint.Style.STROKE);
        p.setStrokeWidth(dp(1.7));
        p.setARGB(245, active ? accentR : 20, active ? accentG : 24, active ? accentB : 32);
        canvas.drawPath(path, p);

        if (active || dragging) {
          p.setStrokeWidth(dp(1.2));
          p.setARGB(active ? 225 : 175, accentR, accentG, accentB);
          canvas.drawLine(tipX + dp(2.5), tipY + dp(7), tipX + dp(2.5), tipY + dp(20), p);
          canvas.drawLine(tipX + dp(3.5), tipY + dp(20), tipX + dp(8.5), tipY + dp(16), p);
        }

        p.setStyle(android.graphics.Paint.Style.FILL);
        p.setARGB(active ? 245 : 205, accentR, accentG, accentB);
        canvas.drawCircle(tipX, tipY, dp(1.6), p);

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
      else self.scheduleInspect(false);
      try { st.root.invalidate(); } catch (eInv) {}
    } catch (eRun) { safeLog(self.L, 'e', "schedulePointerMove run fail: " + String(eRun)); }
  }});
  try { st.handler.postDelayed(st.moveRunnable, 16); } catch (ePost) { st.dragUpdatePosted = false; }
};

FloatBallAppWM.prototype.scheduleInspect = function(force) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
  if (force === true) {
    st.inspectPosted = false;
    this.updatePointerInspect(true);
    return;
  }
  var now = th17Now();
  if (now - st.lastInspectTs < 80) return;
  st.lastInspectTs = now;
  if (st.inspectPosted) return;
  st.inspectPosted = true;
  var self = this;
  st.inspectRunnable = new java.lang.Runnable({ run: function() {
    try {
      st.inspectPosted = false;
      if (!st.active || st.closed) return;
      self.updatePointerInspect(false);
    } catch (eRun) { safeLog(self.L, 'e', "scheduleInspect run fail: " + String(eRun)); }
  }});
  try { st.handler.postDelayed(st.inspectRunnable, 0); } catch (ePost) { st.inspectPosted = false; }
};

FloatBallAppWM.prototype.scheduleStopInspect = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
  var self = this;
  st.stopInspectRunnable = new java.lang.Runnable({ run: function() {
    try {
      if (!st.active || st.closed) return;
      self.updatePointerInspect(true);
    } catch (eRun) { safeLog(self.L, 'e', "scheduleStopInspect run fail: " + String(eRun)); }
  }});
  try { st.handler.postDelayed(st.stopInspectRunnable, 40); } catch (ePost) {}
};

FloatBallAppWM.prototype.pointerRectInside = function(x, y, rect) {
  if (!rect) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
};

FloatBallAppWM.prototype.getPointerActiveRoot = function() {
  try {
    if (typeof ui === "undefined" || !ui) return null;
    try { return ui.getRootInActiveWindow(); } catch (e0) {}
  } catch (e1) {}
  return null;
};

FloatBallAppWM.prototype.findPointerTextNodeAt = function(root, x, y) {
  var self = this;
  var best = null;
  function better(item) {
    if (!item || !item.rect || !item.text) return;
    var area = Math.max(1, (item.rect.right - item.rect.left) * (item.rect.bottom - item.rect.top));
    item.area = area;
    if (!best) { best = item; return; }
    if (item.area < best.area) { best = item; return; }
    if (item.area === best.area && item.depth > best.depth) best = item;
  }
  function dfs(node, depth) {
    if (!node || depth > 40) return;
    var rect = th17NodeBounds(node);
    var contains = rect && self.pointerRectInside(x, y, rect);
    if (contains) {
      var txt = th17NodeText(node);
      if (txt && String(txt).replace(/\s+/g, "").length > 0) {
        better({ text: String(txt), rect: rect, depth: depth });
      }
    }
    var childCount = 0;
    try { childCount = node.getChildCount(); } catch (eCount) { childCount = 0; }
    if (!contains && depth > 1) return;
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

FloatBallAppWM.prototype.updatePointerInspect = function(force) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  var hp = this.getPointerHotspot();
  var moved = Math.abs(hp.x - st.lastQueryX) > this.dp(4) || Math.abs(hp.y - st.lastQueryY) > this.dp(4);
  if (force !== true && !moved) return;
  st.lastQueryX = hp.x;
  st.lastQueryY = hp.y;
  var root = this.getPointerActiveRoot();
  var result = null;
  try { if (root) result = this.findPointerTextNodeAt(root, hp.x, hp.y); } catch (eFind) { result = null; }
  try { if (root) root.recycle(); } catch (eRecycleRoot) {}
  var now = th17Now();
  if (result && result.text && result.rect) {
    var key = this.pointerTextKeyOf(result);
    if (key !== st.hoverKey) {
      st.hoverKey = key;
      st.hoverSince = now;
      st.hoverX = hp.x;
      st.hoverY = hp.y;
    }
    st.currentText = String(result.text);
    st.currentRect = result.rect;
    st.currentKey = key;
    var ready = now - st.hoverSince >= st.hoverMinMs;
    this.showPointerAreaFrame(result.rect);
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
};

FloatBallAppWM.prototype.extractCurrentPointerText = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return { ok: false, err: "指针未启动" };
  this.updatePointerInspect(true);
  var now = th17Now();
  var waited = st.hoverSince > 0 ? (now - st.hoverSince) : 0;
  if (!st.currentText || !st.currentRect) {
    this.setPointerToolResult({ ok: false, type: "pointer_error", code: "NO_TEXT", message: "未命中文本" });
    this.toast("未命中文本");
    this.closePointerTool("未命中文本", true);
    return { ok: false, err: "未命中文本" };
  }
  if (waited < 780) {
    this.setPointerToolResult({ ok: false, type: "pointer_error", code: "HOVER_TOO_SHORT", message: "请悬停后松手" });
    this.toast("请悬停后松手");
    this.closePointerTool("悬停过短", true);
    return { ok: false, err: "请悬停后松手" };
  }
  var rect = st.currentRect;
  var textValue = String(st.currentText);
  this.setPointerToolResult({
    ok: true,
    type: "text_pick",
    value: textValue,
    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
  });
  this.toast(textValue);
  this.closePointerTool("取字完成", true);
  return { ok: true, text: textValue };
};

FloatBallAppWM.prototype.normalizePointerCaptureRect = function(rect) {
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
  var minSize = Math.max(1, this.dp(8));
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
  st.areaReady = !!norm;
  if (norm) this.showPointerAreaFrame(norm);
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
        p.setStyle(android.graphics.Paint.Style.FILL);
        p.setARGB(28, 59, 130, 246);
        canvas.drawRoundRect(rf, self.dp(6), self.dp(6), p);
        p.setStyle(android.graphics.Paint.Style.STROKE);
        p.setStrokeWidth(self.dp(2));
        p.setARGB(235, 59, 130, 246);
        canvas.drawRoundRect(rf, self.dp(6), self.dp(6), p);
      } catch (eDraw) {}
    }
  }, context);
  return FrameView;
};

FloatBallAppWM.prototype.showPointerAreaFrame = function(rect) {
  var st = this.ensurePointerToolState();
  if (!rect) return;
  st.frameRect = th17RectObj(rect);
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

FloatBallAppWM.prototype.finishPointerAreaCapture = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return { ok: false, err: "指针未启动" };
  this.updatePointerAreaSelection();
  var captureRect = this.normalizePointerCaptureRect(st.captureRect || st.visualRect);
  if (!captureRect) {
    this.setPointerToolResult({ ok: false, type: "pointer_error", code: "EMPTY_RECT", message: "框选区域为空" });
    this.toast("框选区域为空");
    this.closePointerTool("框选区域为空", true);
    return { ok: false, err: "框选区域为空" };
  }
  var visualRect = st.visualRect || captureRect;
  this.setPointerToolResult({
    ok: true,
    type: "area_capture",
    captureRect: captureRect,
    visualRect: visualRect
  });
  this.toast("框选完成");
  this.closePointerTool("框选完成", true);
  return { ok: true, captureRect: captureRect, visualRect: visualRect };
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
  else this.scheduleInspect(false);
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
    this.scheduleInspect(true);
    this.extractCurrentPointerText();
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
