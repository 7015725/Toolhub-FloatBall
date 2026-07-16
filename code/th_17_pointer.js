// @version 1.2.13
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

function th17PointerColorRgbWithFallback(appObj, primaryKey, fallbackKey, fallbackR, fallbackG, fallbackB) {
  function parseColorKey(key) {
    try {
      var h = String(appObj && appObj.config ? (appObj.config[key] || "") : "");
      h = h.replace(/^\s+|\s+$/g, "");
      if (!h) return null;
      if (h.charAt(0) === "#") h = h.substring(1);
      if (h.length === 8) h = h.substring(2);
      if (h.length === 6) {
        var r = parseInt(h.substring(0, 2), 16);
        var g = parseInt(h.substring(2, 4), 16);
        var b = parseInt(h.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return { r: r, g: g, b: b };
      }
    } catch(e0) {}
    return null;
  }
  var rgb = parseColorKey(primaryKey);
  if (rgb) return rgb;
  rgb = parseColorKey(fallbackKey);
  if (rgb) return rgb;
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

function th17LogSingleLine(value, maxLen) {
  var s = "";
  try { s = String(value === null || value === undefined ? "" : value); } catch (e0) { s = ""; }
  s = s.replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  var limit = Number(maxLen || 160);
  if (isNaN(limit) || limit < 16) limit = 160;
  if (s.length > limit) s = s.substring(0, limit) + "...";
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
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
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
    try { safeLog(this.L, 'e', "copyPointerTextToClipboard fail: " + String(e0)); } catch (eLog) {}
  }
  return false;
};

FloatBallAppWM.prototype.invalidatePointerTextHoverCredential = function(st, reason, keepRecentReady) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState) return false;

  var hadCredential = !!(
    pointerState.textHoverReadyKey ||
    pointerState.textHoverReadyRect ||
    Number(pointerState.textHoverReadyAt || 0) > 0
  );

  pointerState.textHoverReadyKey = "";
  pointerState.textHoverReadyRect = null;
  pointerState.textHoverReadyAt = 0;
  pointerState.textHoverReadySince = 0;
  pointerState.textHoverReadySession = 0;
  pointerState.textHoverReadyToken = Number(pointerState.textHoverReadyToken || 0) + 1;

  try {
    if (pointerState.handler && pointerState.textReadyRunnable) {
      pointerState.handler.removeCallbacks(pointerState.textReadyRunnable);
    }
  } catch (eRemoveReady) {}
  pointerState.textReadyRunnable = null;
  pointerState.textReadyToken = Number(pointerState.textReadyToken || 0) + 1;

  if (keepRecentReady !== true) {
    pointerState.lastValidPickReadyAt = 0;
    pointerState.lastValidPickHoverSince = 0;
    pointerState.lastValidPickReadySession = 0;
  }

  if (hadCredential && reason) {
    try { safeLog(this.L, 'd', "invalidate pointer text hover credential reason=" + String(reason)); } catch (eLog) {}
  }
  return hadCredential;
};

FloatBallAppWM.prototype.pointerTextHotspotInsideRect = function(rect) {
  if (!rect) return false;
  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
  if (!hp) return false;
  try {
    if (this.pointerRectInside) return this.pointerRectInside(hp.x, hp.y, rect) === true;
  } catch (eInside) {}
  return hp.x >= Number(rect.left) && hp.x <= Number(rect.right) &&
    hp.y >= Number(rect.top) && hp.y <= Number(rect.bottom);
};

FloatBallAppWM.prototype.getPointerTextStableSinceForRect = function(st, rect, atTs) {
  var pointerState = st || null;
  if (!pointerState || !rect) return 0;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();

  var since = Number(pointerState.textStableSince || 0);
  var anchorX = Number(pointerState.textStableAnchorX || -100000);
  var anchorY = Number(pointerState.textStableAnchorY || -100000);
  if (isNaN(since) || since <= 0 || since > ts) return 0;
  if (isNaN(anchorX) || isNaN(anchorY) || anchorX < -90000 || anchorY < -90000) return 0;

  var anchorInside = false;
  try {
    if (this.pointerRectInside) anchorInside = this.pointerRectInside(anchorX, anchorY, rect) === true;
    else {
      anchorInside = anchorX >= Number(rect.left) && anchorX <= Number(rect.right) &&
        anchorY >= Number(rect.top) && anchorY <= Number(rect.bottom);
    }
  } catch (eAnchor) { anchorInside = false; }
  if (!anchorInside || !this.pointerTextHotspotInsideRect(rect)) return 0;
  return since;
};

FloatBallAppWM.prototype.resetPointerTextStableHover = function(st, atTs, hotspot, reason) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var hp = hotspot || null;
  try { if (!hp) hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }

  this.invalidatePointerTextHoverCredential(pointerState, reason || "stable_reset", false);

  pointerState.textStableAnchorX = hp ? Number(hp.x) : -100000;
  pointerState.textStableAnchorY = hp ? Number(hp.y) : -100000;
  pointerState.textStableLastX = hp ? Number(hp.x) : -100000;
  pointerState.textStableLastY = hp ? Number(hp.y) : -100000;
  pointerState.textStableSince = hp ? ts : 0;
  pointerState.textStableTargetKey = String(pointerState.currentKey || "");

  var insideCurrent = false;
  if (hp && pointerState.currentRect) {
    try {
      if (this.pointerRectInside) insideCurrent = this.pointerRectInside(hp.x, hp.y, pointerState.currentRect) === true;
    } catch (eInside) { insideCurrent = false; }
  }

  pointerState.hoverKey = String(pointerState.currentKey || "");
  pointerState.hoverSince = insideCurrent ? ts : 0;
  pointerState.hoverX = hp ? Number(hp.x) : 0;
  pointerState.hoverY = hp ? Number(hp.y) : 0;
  this.updatePointerVisualHot(false);
  try {
    if (pointerState.currentRect) this.showPointerAreaFrame(pointerState.currentRect, "text_hover");
  } catch (eFrame) {}
  return true;
};

FloatBallAppWM.prototype.updatePointerTextStableMotion = function(atTs) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick" || !st.dragging) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
  if (!hp) return false;

  var currentCredentialStillInside = false;
  if (
    st.textHoverReadyKey &&
    st.textHoverReadyRect &&
    String(st.textHoverReadyKey) === String(st.currentKey || "") &&
    Number(st.textHoverReadySession || 0) === Number(st.inspectSession || 0)
  ) {
    try {
      currentCredentialStillInside =
        this.pointerTextHotspotInsideRect(st.currentRect) &&
        this.pointerTextHotspotInsideRect(st.textHoverReadyRect);
    } catch (eReadyInside) { currentCredentialStillInside = false; }
  }

  if (currentCredentialStillInside) {
    st.textStableLastX = hp.x;
    st.textStableLastY = hp.y;
    return true;
  }

  var anchorX = Number(st.textStableAnchorX || -100000);
  var anchorY = Number(st.textStableAnchorY || -100000);
  if (anchorX < -90000 || anchorY < -90000 || Number(st.textStableSince || 0) <= 0) {
    return this.resetPointerTextStableHover(st, ts, hp, "stable_start");
  }

  var dx = hp.x - anchorX;
  var dy = hp.y - anchorY;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var breakSlop = Math.max(1, Number(st.textHoverBreakSlop || this.dp(14)));

  if (dist > breakSlop) {
    return this.resetPointerTextStableHover(st, ts, hp, "stable_move");
  }

  st.textStableLastX = hp.x;
  st.textStableLastY = hp.y;

  if (st.currentText && st.currentRect) {
    var inside = this.pointerTextHotspotInsideRect(st.currentRect);
    if (!inside) {
      // 离开严格文字边框后，旧目标的稳定时间和可提交凭证同时失效。
      return this.resetPointerTextStableHover(st, ts, hp, "leave_text_frame");
    }

    if (String(st.hoverKey || "") !== String(st.currentKey || "")) {
      this.invalidatePointerTextHoverCredential(st, "candidate_key_changed", false);
      st.hoverKey = String(st.currentKey || "");
      st.hoverSince = 0;
    }

    if (!st.hoverSince || Number(st.hoverSince || 0) <= 0) {
      var stableSince = this.getPointerTextStableSinceForRect(st, st.currentRect, ts);
      st.hoverSince = stableSince > 0 ? stableSince : ts;
      st.hoverX = hp.x;
      st.hoverY = hp.y;
      try { this.schedulePointerTextReadyVisualRefresh(); } catch (eSchedule) {}
    }
  }

  return true;
};

FloatBallAppWM.prototype.bindPointerTextHoverCandidate = function(st, key, rect, atTs) {
  var pointerState = st || null;
  if (!pointerState || !key || !rect) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var targetKey = String(key || "");
  var previousHoverKey = String(pointerState.hoverKey || "");
  var stableTargetKey = String(pointerState.textStableTargetKey || "");
  var stableTargetChanged = !!stableTargetKey && stableTargetKey !== targetKey;

  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }

  // 首次异步命中允许复用命中前的物理稳定时间；已经绑定过目标后，
  // 文本或矩形 key 改变必须从新目标出现时重新计时。
  if (stableTargetChanged) {
    this.resetPointerTextStableHover(pointerState, ts, hp, "target_changed");
  } else if (!stableTargetKey) {
    pointerState.textStableTargetKey = targetKey;
  }

  var credentialTargetChanged =
    pointerState.textHoverReadyKey &&
    String(pointerState.textHoverReadyKey) !== targetKey;
  var credentialRectChanged = false;
  try {
    credentialRectChanged =
      pointerState.textHoverReadyRect &&
      th17RectKey(pointerState.textHoverReadyRect) !== th17RectKey(rect);
  } catch (eRectChanged) { credentialRectChanged = true; }

  if (!stableTargetChanged && (credentialTargetChanged || credentialRectChanged)) {
    this.invalidatePointerTextHoverCredential(pointerState, "candidate_changed", false);
  }

  pointerState.textStableTargetKey = targetKey;
  pointerState.hoverKey = targetKey;
  pointerState.hoverX = hp ? hp.x : 0;
  pointerState.hoverY = hp ? hp.y : 0;

  if (!hp || !this.pointerTextHotspotInsideRect(rect)) {
    pointerState.hoverSince = 0;
    this.updatePointerVisualHot(false);
    return false;
  }

  var stableSince = this.getPointerTextStableSinceForRect(pointerState, rect, ts);
  var currentSince = Number(pointerState.hoverSince || 0);
  if (
    stableTargetChanged ||
    isNaN(currentSince) ||
    currentSince <= 0 ||
    currentSince > ts
  ) {
    pointerState.hoverSince = stableSince > 0 ? stableSince : ts;
  } else if (stableSince > 0 && stableSince < currentSince) {
    // 同一目标的无障碍结果可能晚于真实稳定停留返回，允许回溯物理稳定起点。
    pointerState.hoverSince = stableSince;
  }

  // hoverKey 在临时空扫描后可能被清空；同一稳定目标恢复时不应被当作新目标。
  if (!previousHoverKey && stableTargetKey === targetKey && stableSince > 0) {
    pointerState.hoverSince = stableSince;
  }
  return true;
};

FloatBallAppWM.prototype.grantPointerTextHoverCredential = function(st, atTs) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var key = String(pointerState.currentKey || this.pointerTextKeyOf({
    text: pointerState.currentText,
    rect: pointerState.currentRect
  }));
  if (!key || String(pointerState.hoverKey || "") !== key) return false;
  if (!this.pointerTextHotspotInsideRect(pointerState.currentRect)) return false;

  var since = Number(pointerState.hoverSince || 0);
  if (isNaN(since) || since <= 0 || since > ts) return false;
  if (ts - since < this.getPointerTextHoverLimitMs()) return false;

  var session = Number(pointerState.inspectSession || 0);
  if (
    String(pointerState.textHoverReadyKey || "") === key &&
    pointerState.textHoverReadyRect &&
    th17RectKey(pointerState.textHoverReadyRect) === th17RectKey(pointerState.currentRect) &&
    Number(pointerState.textHoverReadySession || 0) === session &&
    Number(pointerState.textHoverReadyAt || 0) > 0 &&
    this.pointerTextHotspotInsideRect(pointerState.textHoverReadyRect)
  ) {
    return true;
  }

  pointerState.textHoverReadyKey = key;
  pointerState.textHoverReadyRect = th17RectObj(pointerState.currentRect);
  pointerState.textHoverReadyAt = ts;
  pointerState.textHoverReadySince = since;
  pointerState.textHoverReadySession = session;
  pointerState.textHoverReadyToken = Number(pointerState.textHoverReadyToken || 0) + 1;

  try { this.rememberPointerValidPick(pointerState); } catch (eRemember) {}
  pointerState.lastValidPickReadyAt = ts;
  pointerState.lastValidPickHoverSince = since;
  pointerState.lastValidPickReadySession = session;

  try {
    safeLog(this.L, 'i',
      "pointer text hover credential granted elapsed=" + String(Math.max(0, ts - since)) +
      " key=" + th17LogSingleLine(key, 180)
    );
  } catch (eLog) {}
  return true;
};

FloatBallAppWM.prototype.hasPointerTextHoverCredential = function(st, atTs, allowGrant) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  if (allowGrant === true) {
    try { this.grantPointerTextHoverCredential(pointerState, ts); } catch (eGrant) {}
  }

  var key = String(pointerState.currentKey || "");
  if (!key || String(pointerState.textHoverReadyKey || "") !== key) return false;
  if (!pointerState.textHoverReadyRect) return false;
  if (th17RectKey(pointerState.textHoverReadyRect) !== th17RectKey(pointerState.currentRect)) return false;
  if (Number(pointerState.textHoverReadySession || 0) !== Number(pointerState.inspectSession || 0)) return false;

  var readyAt = Number(pointerState.textHoverReadyAt || 0);
  var readySince = Number(pointerState.textHoverReadySince || 0);
  if (isNaN(readyAt) || readyAt <= 0 || readyAt > ts) return false;
  if (isNaN(readySince) || readySince <= 0 || readySince > ts) return false;
  if (ts - readySince < this.getPointerTextHoverLimitMs()) return false;

  // 业务门槛使用严格边框命中，不使用带 padding 的无障碍候选命中范围。
  if (!this.pointerTextHotspotInsideRect(pointerState.currentRect)) return false;
  if (!this.pointerTextHotspotInsideRect(pointerState.textHoverReadyRect)) return false;
  return true;
};

FloatBallAppWM.prototype.rememberPointerValidPick = function(st) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;

  var key = String(pointerState.currentKey || this.pointerTextKeyOf({
    text: pointerState.currentText,
    rect: pointerState.currentRect
  }));
  if (!key) return false;

  if (String(pointerState.lastValidPickKey || "") !== key) {
    pointerState.lastValidPickReadyAt = 0;
    pointerState.lastValidPickHoverSince = 0;
    pointerState.lastValidPickReadySession = 0;
  }

  var now = th17Now();
  pointerState.lastValidPickText = String(pointerState.currentText);
  pointerState.lastValidPickRect = th17RectObj(pointerState.currentRect);
  pointerState.lastValidPickKey = key;
  pointerState.lastValidPickAt = now;
  pointerState.lastValidPickSession = Number(pointerState.inspectSession || 0);

  if (
    String(pointerState.textHoverReadyKey || "") === key &&
    pointerState.textHoverReadyRect &&
    th17RectKey(pointerState.textHoverReadyRect) === th17RectKey(pointerState.currentRect) &&
    Number(pointerState.textHoverReadySession || 0) === Number(pointerState.inspectSession || 0) &&
    Number(pointerState.textHoverReadyAt || 0) > 0
  ) {
    pointerState.lastValidPickReadyAt = Number(pointerState.textHoverReadyAt || 0);
    pointerState.lastValidPickHoverSince = Number(pointerState.textHoverReadySince || 0);
    pointerState.lastValidPickReadySession = Number(pointerState.textHoverReadySession || 0);
  }
  return true;
};

FloatBallAppWM.prototype.getRecentPointerPickForRelease = function(st, atTs) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.lastValidPickText || !pointerState.lastValidPickRect) return null;
  if (Number(pointerState.lastValidPickSession || 0) !== Number(pointerState.inspectSession || 0)) return null;
  if (Number(pointerState.lastValidPickReadySession || 0) !== Number(pointerState.inspectSession || 0)) return null;

  var now = Number(atTs || th17Now());
  if (isNaN(now) || now <= 0) now = th17Now();
  var hitAt = Number(pointerState.lastValidPickAt || 0);
  var readyAt = Number(pointerState.lastValidPickReadyAt || 0);
  var hoverSince = Number(pointerState.lastValidPickHoverSince || 0);
  if (isNaN(hitAt) || hitAt <= 0) return null;
  if (isNaN(readyAt) || readyAt <= 0 || readyAt > now) return null;
  if (isNaN(hoverSince) || hoverSince <= 0 || hoverSince > now) return null;
  if (now - hoverSince < this.getPointerTextHoverLimitMs()) return null;

  var age = now - hitAt;
  var maxAge = 500;
  if (age < 0 || age > maxAge) return null;

  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
  if (!hp) return null;
  var hit = false;
  try {
    if (this.pointerRectInside) {
      hit = this.pointerRectInside(hp.x, hp.y, pointerState.lastValidPickRect) === true;
    } else {
      hit = hp.x >= Number(pointerState.lastValidPickRect.left) &&
        hp.x <= Number(pointerState.lastValidPickRect.right) &&
        hp.y >= Number(pointerState.lastValidPickRect.top) &&
        hp.y <= Number(pointerState.lastValidPickRect.bottom);
    }
  } catch (eHit) { hit = false; }
  if (!hit) return null;

  return {
    text: String(pointerState.lastValidPickText),
    rect: th17RectObj(pointerState.lastValidPickRect),
    key: String(pointerState.lastValidPickKey || ""),
    hitAt: hitAt,
    readyAt: readyAt,
    hoverSince: hoverSince,
    ageMs: age,
    session: Number(pointerState.lastValidPickSession || 0)
  };
};

FloatBallAppWM.prototype.restoreRecentPointerPickForRelease = function(st, recent) {
  var pointerState = st || null;
  var item = recent || null;
  if (!pointerState || !item || !item.text || !item.rect) return false;

  pointerState.currentText = String(item.text);
  pointerState.currentRect = th17RectObj(item.rect);
  pointerState.currentKey = String(item.key || "");
  pointerState.hoverKey = pointerState.currentKey;
  pointerState.hoverSince = Number(item.hoverSince || 0);
  pointerState.textHoverReadyKey = pointerState.currentKey;
  pointerState.textHoverReadyRect = th17RectObj(item.rect);
  pointerState.textHoverReadyAt = Number(item.readyAt || 0);
  pointerState.textHoverReadySince = Number(item.hoverSince || 0);
  pointerState.textHoverReadySession = Number(item.session || pointerState.inspectSession || 0);
  pointerState.textHoverReadyToken = Number(pointerState.textHoverReadyToken || 0) + 1;

  if (!this.hasPointerTextHoverCredential(pointerState, Number(pointerState.releaseTs || th17Now()), false)) {
    this.invalidatePointerTextHoverCredential(pointerState, "recent_candidate_invalid", false);
    return false;
  }

  try { this.showPointerAreaFrame(pointerState.currentRect, "text_hit"); } catch (eFrame) {}
  try { this.updatePointerVisualHot(true); } catch (eHot) {}
  return true;
};

FloatBallAppWM.prototype.completePointerCandidateOnRelease = function(st, successCode, source, extraData) {
  var pointerState = st || null;
  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;
  var commitTs = Number(pointerState.releaseTs || th17Now());
  if (isNaN(commitTs) || commitTs <= 0) commitTs = th17Now();
  if (!this.hasPointerTextHoverCredential(pointerState, commitTs, false)) {
    try { safeLog(this.L, 'w', "blocked pointer text release without valid hover credential"); } catch (eCredentialLog) {}
    return false;
  }
  var data = { source: String(source || "accessibility_release") };
  try {
    if (extraData) {
      for (var k in extraData) data[k] = extraData[k];
    }
  } catch (eData) {}
  try {
    safeLog(this.L, 'i',
      "pointer text release commit source=" + data.source +
      " textLen=" + String(String(pointerState.currentText).length));
  } catch (eLog) {}
  return this.completePointerTextResult(
    String(pointerState.currentText),
    th17RectObj(pointerState.currentRect),
    String(successCode || "TEXT_PICK_SUCCESS"),
    data
  ) === true;
};

FloatBallAppWM.prototype.completePointerTextResult = function(textValue, rect, successCode, extraData) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return false;
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
  if (!text || !rect) return false;

  var data = {};
  try {
    if (extraData) {
      for (var k in extraData) data[k] = extraData[k];
    }
  } catch (eData) {}

  var previewRet = null;
  try {
    if (typeof this.publishResultPreview === "function") {
      previewRet = this.publishResultPreview({
        kind: "text",
        source: String(data.source || "pointer_text"),
        text: text,
        previewText: text,
        screenshotPath: "",
        rect: th17RectObj(rect),
        primaryAction: "pickword",
        actions: [],
        createdAt: th17Now()
      });
    }
  } catch (ePreview) {
    previewRet = { ok: false, code: "RESULT_PREVIEW_FAILED", message: String(ePreview) };
  }

  data.clipboardAccepted = false;
  data.previewQueued = !!(previewRet && previewRet.ok === true);
  data.previewId = previewRet && previewRet.previewId ? String(previewRet.previewId) : "";

  this.setPointerToolResult({
    ok: true,
    type: "text_pick",
    code: String(successCode || "TEXT_PICK_SUCCESS"),
    message: data.previewQueued ? "取字成功，已显示预览" : "取字成功",
    value: text,
    clipboard: false,
    preview: data.previewQueued,
    previewId: data.previewId,
    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    data: data
  });

  if (!data.previewQueued) {
    try { this.toast("取字成功"); } catch (eToast) {}
  }
  try { this.closePointerTool("取字完成", true); } catch (eClose) {}
  return true;
};

// 兼容旧调用名：保留方法入口，但不再自动写入剪贴板。
FloatBallAppWM.prototype.completePointerTextCopy = function(textValue, rect, successCode, extraData) {
  return this.completePointerTextResult(textValue, rect, successCode, extraData);
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
      inspectRetryRunnable: null,
      inspectRetryToken: 0,
      inspectRetryCount: 0,
      inspectRetryX: -100000,
      inspectRetryY: -100000,
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
      inspectLastWindows: 0,
      inspectLastTimedOut: false,
      inspectLastReason: "",
      inspectLastResultSeq: 0,
      inspectLastRequestTs: 0,
      inspectLastCostMs: 0,
      inspectLastNodes: 0,
      inspectLastPrepareMs: 0,
      inspectLastAutomationMs: 0,
      inspectLastActiveRootMs: 0,
      inspectLastWindowsQueryMs: 0,
      inspectLastWindowsScanMs: 0,
      inspectLastWindowsScanned: 0,
      inspectMaxDragMs: 90,
      inspectMaxRetryMs: 160,
      inspectMaxFinalMs: 180,
      inspectMaxDragNodes: 240,
      inspectMaxRetryNodes: 600,
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
      lastValidPickText: "",
      lastValidPickRect: null,
      lastValidPickKey: "",
      lastValidPickAt: 0,
      lastValidPickReadyAt: 0,
      lastValidPickHoverSince: 0,
      lastValidPickReadySession: 0,
      lastValidPickSession: 0,
      boundText: "",
      boundRect: null,
      boundKey: "",
      boundAt: 0,
      hoverSince: 0,
      hoverKey: "",
      hoverX: 0,
      hoverY: 0,
      hoverMinMs: 800,
      textStableAnchorX: -100000,
      textStableAnchorY: -100000,
      textStableLastX: -100000,
      textStableLastY: -100000,
      textStableSince: 0,
      textStableTargetKey: "",
      textHoverBreakSlop: 0,
      textHoverReadyKey: "",
      textHoverReadyRect: null,
      textHoverReadyAt: 0,
      textHoverReadySince: 0,
      textHoverReadySession: 0,
      textHoverReadyToken: 0,
      textReadyToken: 0,
      textReadyRunnable: null,
      releaseTs: 0,
      areaHoldToken: 0,
      areaHoldRunnable: null,
      areaHoldAnchorX: -100000,
      areaHoldAnchorY: -100000,
      areaHoldSince: 0,
      areaHoldDelay: 2000,
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
      areaCaptureSeq: 0,
      areaCaptureRunningToken: 0,
      areaCaptureDoneToken: 0,
      areaCaptureThread: null,
      areaCaptureTimeoutRunnable: null,
      captureRect: null,
      visualRect: null,
      frameKind: "",
      paint: null,
      fallbackPaint: null,
      drawCount: 0,
      drawSuccessCount: 0,
      drawFailCount: 0,
      lastDrawAt: 0,
      lastDrawError: "",
      drawErrorLogged: false,
      drawFirstSuccessLogged: false,
      drawInvalidateErrorLogged: false,
      drawHealthFailureLogged: false,
      drawRecoveryTried: false,
      drawFallbackMode: false,
      drawShadowDisabled: false,
      drawHealthRunnable: null,
      drawHealthToken: 0,
      pointerRootToken: 0,
      pointerRootDrawSuccessToken: 0
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
  st.areaHoldDelay = th17ConfigNumber(this, "POINTER_AREA_HOVER_MS", 2000, 500, 10000);
  st.areaSmallFallbackText = th17ConfigBool(this, "POINTER_AREA_SMALL_FALLBACK_TEXT", true);
  st.areaMinWidthPx = dp.call(this, th17ConfigNumber(this, "POINTER_AREA_MIN_WIDTH_DP", 56, 20, 240));
  st.areaMinHeightPx = dp.call(this, th17ConfigNumber(this, "POINTER_AREA_MIN_HEIGHT_DP", 20, 8, 160));
  var areaDp2 = th17ConfigNumber(this, "POINTER_AREA_MIN_AREA_DP2", 1200, 200, 30000);
  var oneDp = Math.max(1, dp.call(this, 1));
  st.areaMinAreaPx = Math.max(1, Math.round(areaDp2 * oneDp * oneDp));
  st.areaMinMovePx = dp.call(this, th17ConfigNumber(this, "POINTER_AREA_MIN_MOVE_DP", 24, 0, 160));
  st.areaHoldStableSlop = dp.call(this, 5);
  st.areaHoldBreakSlop = dp.call(this, 14);
  st.textHoverBreakSlop = dp.call(this, 14);
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
  try { if (st.handler && st.drawHealthRunnable) st.handler.removeCallbacks(st.drawHealthRunnable); } catch (eRemoveDrawHealthReset) {}
  st.drawHealthRunnable = null;
  st.drawHealthToken = Number(st.drawHealthToken || 0) + 1;
  st.pointerRootToken = Number(st.pointerRootToken || 0) + 1;
  st.drawCount = 0;
  st.drawSuccessCount = 0;
  st.drawFailCount = 0;
  st.lastDrawAt = 0;
  st.lastDrawError = "";
  st.drawErrorLogged = false;
  st.drawFirstSuccessLogged = false;
  st.drawInvalidateErrorLogged = false;
  st.drawHealthFailureLogged = false;
  st.drawRecoveryTried = false;
  st.drawFallbackMode = false;
  st.drawShadowDisabled = false;
  st.fallbackPaint = null;
  st.dragUpdatePosted = false;
  st.inspectPosted = false;
  st.draggingInspectPosted = false;
  try {
    if (st.handler && st.inspectRetryRunnable) st.handler.removeCallbacks(st.inspectRetryRunnable);
  } catch (eRemoveInspectRetryReset) {}
  st.inspectRetryRunnable = null;
  st.inspectRetryToken = Number(st.inspectRetryToken || 0) + 1;
  st.inspectRetryCount = 0;
  st.inspectRetryX = -100000;
  st.inspectRetryY = -100000;
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
  st.inspectLastWindows = 0;
  st.inspectLastTimedOut = false;
  st.inspectLastReason = "";
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
  st.lastValidPickText = "";
  st.lastValidPickRect = null;
  st.lastValidPickKey = "";
  st.lastValidPickAt = 0;
  st.lastValidPickReadyAt = 0;
  st.lastValidPickHoverSince = 0;
  st.lastValidPickReadySession = 0;
  st.lastValidPickSession = Number(st.inspectSession || 0);
  st.boundText = "";
  st.boundRect = null;
  st.boundKey = "";
  st.boundAt = 0;
  st.hoverSince = 0;
  st.hoverKey = "";
  st.hoverX = 0;
  st.hoverY = 0;
  try { if (st.handler && st.textReadyRunnable) st.handler.removeCallbacks(st.textReadyRunnable); } catch (eRemoveTextReadyReset) {}
  st.textReadyRunnable = null;
  st.textReadyToken = Number(st.textReadyToken || 0) + 1;
  st.textStableAnchorX = -100000;
  st.textStableAnchorY = -100000;
  st.textStableLastX = -100000;
  st.textStableLastY = -100000;
  st.textStableSince = 0;
  st.textStableTargetKey = "";
  st.textHoverReadyKey = "";
  st.textHoverReadyRect = null;
  st.textHoverReadyAt = 0;
  st.textHoverReadySince = 0;
  st.textHoverReadySession = 0;
  st.textHoverReadyToken = Number(st.textHoverReadyToken || 0) + 1;
  st.releaseTs = 0;
  try { if (st.handler && st.areaHoldRunnable) st.handler.removeCallbacks(st.areaHoldRunnable); } catch (eRemoveAreaHoldReset) {}
  st.areaHoldRunnable = null;
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
  if (!obj || (obj.type !== "area_capture" && obj.type !== "area_ocr")) return "{}";
  try {
    var rect = obj.captureRect || null;
    try { if (!rect && obj.data && obj.data.captureRect) rect = obj.data.captureRect; } catch (eDataRect) {}
    try { if (!rect && obj.visualRect) rect = obj.visualRect; } catch (eVisualRect) {}
    try { if (!rect && obj.data && obj.data.visualRect) rect = obj.data.visualRect; } catch (eDataVisualRect) {}
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
      base = String(shortx.getShortXDir() || "").replace(/\/+$/g, "");
    }
  } catch (e0) {
    base = "";
  }
  if (!base) throw new Error("无法获取 ShortX 根目录");

  var dir = new java.io.File(base, "ToolHub/screenshots");
  if (!dir.exists() && dir.mkdirs() !== true && !dir.exists()) {
    throw new Error("无法创建截图目录：" + String(dir.getAbsolutePath()));
  }
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
    var compressed = bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out);
    if (compressed !== true && String(compressed) !== "true") throw new Error("Bitmap PNG 压缩失败");
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

FloatBallAppWM.prototype.releasePointerCaptureBuffer = function(buffer) {
  if (!buffer) return;
  try { if (buffer.close) buffer.close(); } catch (eClose) {}
  try {
    var hb = buffer.getHardwareBuffer ? buffer.getHardwareBuffer() : null;
    if (hb && hb.close) hb.close();
  } catch (eHbClose) {}
  try {
    var gb = buffer.getGraphicBuffer ? buffer.getGraphicBuffer() : null;
    if (gb && gb.destroy) gb.destroy();
  } catch (eGbDestroy) {}
};

FloatBallAppWM.prototype.recyclePointerBitmap = function(bitmap) {
  try {
    if (bitmap && bitmap.recycle && (!bitmap.isRecycled || bitmap.isRecycled() !== true)) bitmap.recycle();
  } catch (eRecycleBitmap) {}
};

function th17JavaClass(v) {
  try { return String(v.getClass().getName()); } catch (e0) {}
  return "";
}
function th17ObjectArray(values) {
  var c = java.lang.Class.forName("java.lang.Object");
  var a = java.lang.reflect.Array.newInstance(c, values.length);
  for (var i = 0; i < values.length; i++) java.lang.reflect.Array.set(a, i, values[i]);
  return a;
}
function th17FindMethod(clazz, name, count) {
  var groups = [];
  try { groups.push(clazz.getMethods()); } catch (e0) {}
  try { groups.push(clazz.getDeclaredMethods()); } catch (e1) {}
  for (var g = 0; g < groups.length; g++) {
    var ms = groups[g];
    for (var i = 0; ms && i < ms.length; i++) {
      try {
        if (String(ms[i].getName()) !== name || ms[i].getParameterTypes().length !== count) continue;
        try { ms[i].setAccessible(true); } catch (e2) {}
        return ms[i];
      } catch (e3) {}
    }
  }
  return null;
}
function th17Invoke(method, target, values) {
  if (!method) throw new Error("Java 方法不存在");
  return method.invoke(target, th17ObjectArray(values || []));
}
function th17PairValue(pair, fieldName) {
  if (!pair) return null;
  try { return pair.getClass().getField(fieldName).get(pair); } catch (e0) {}
  try {
    var f = pair.getClass().getDeclaredField(fieldName);
    f.setAccessible(true);
    return f.get(pair);
  } catch (e1) {}
  return null;
}

FloatBallAppWM.prototype.getPointerCaptureDisplayId = function() {
  try {
    if (typeof context !== "undefined" && context && context.getDisplay) return Math.max(0, th17Int(context.getDisplay().getDisplayId()));
  } catch (e0) {}
  return 0;
};

FloatBallAppWM.prototype.capturePointerBitmapByWindowManager = function(cropRect) {
  var identity = 0;
  var cleared = false;
  var captureBuffer = null;
  try {
    safeLog(this.L, 'd', "pointer capture attempt method=wm_capture_display_reflect rect=" + th17RectKey(cropRect));
    var builder = new android.window.ScreenCapture.CaptureArgs.Builder();
    builder.setSourceCrop(cropRect);
    try { builder.setPixelFormat(android.graphics.PixelFormat.RGBA_8888); } catch (ePixel) {}
    try { builder.setCaptureSecureLayers(false); } catch (eSecure) {}
    try { builder.setAllowProtected(false); } catch (eProtected) {}
    var pair = android.window.ScreenCapture.createSyncCaptureListener();
    var listener = th17PairValue(pair, "first");
    var waiter = th17PairValue(pair, "second");
    if (!listener || !waiter) throw new Error("同步截图 Pair 字段解析失败 class=" + th17JavaClass(pair));
    var wm = android.view.WindowManagerGlobal.getWindowManagerService();
    var method = th17FindMethod(wm.getClass(), "captureDisplay", 3);
    if (!method) throw new Error("找不到 captureDisplay 三参数方法");
    safeLog(this.L, 'd', "pointer capture wm capability listener=" + th17JavaClass(listener) + " waiter=" + th17JavaClass(waiter) + " method=" + String(method));
    identity = android.os.Binder.clearCallingIdentity();
    cleared = true;
    th17Invoke(method, wm, [java.lang.Integer.valueOf(this.getPointerCaptureDisplayId()), builder.build(), listener]);
    captureBuffer = th17Invoke(th17FindMethod(waiter.getClass(), "get", 0), waiter, []);
    var bitmap = this.pointerBitmapFromCaptureBuffer(captureBuffer);
    if (!bitmap) throw new Error("WindowManager 截图返回空 Bitmap");
    safeLog(this.L, 'i', "pointer capture success method=wm_capture_display_reflect rect=" + th17RectKey(cropRect));
    return { bitmap: bitmap, buffer: captureBuffer, method: "wm_capture_display_reflect" };
  } catch (e0) {
    try { this.releasePointerCaptureBuffer(captureBuffer); } catch (eRelease) {}
    safeLog(this.L, 'w', "pointer capture failed method=wm_capture_display_reflect err=" + th17LogSingleLine(e0, 420));
    throw new Error("wm_capture_display_reflect: " + String(e0));
  } finally {
    if (cleared) try { android.os.Binder.restoreCallingIdentity(identity); } catch (eRestore) {}
  }
};

FloatBallAppWM.prototype.capturePointerBitmapByMediaProjection = function(cropRect) {
  var mp = null, callback = null, ht = null, h = null, reader = null, vd = null, image = null;
  var padded = null, full = null, result = null;
  try {
    safeLog(this.L, 'd', "pointer capture attempt method=shortx_media_projection rect=" + th17RectKey(cropRect));
    var ctx = null;
    try { if (typeof context !== "undefined" && context) ctx = context; } catch (eCtx) {}
    if (!ctx) try { ctx = android.app.ActivityThread.currentApplication(); } catch (eApp) {}
    if (!ctx) throw new Error("截图 Context 不可用");
    try { if (ctx.getApplicationContext()) ctx = ctx.getApplicationContext(); } catch (eAppCtx) {}
    var w = Math.max(1, th17Int(this.state && this.state.screen ? this.state.screen.w : 0));
    var hh = Math.max(1, th17Int(this.state && this.state.screen ? this.state.screen.h : 0));
    var dm = ctx.getResources().getDisplayMetrics();
    if (w <= 1) w = Math.max(1, th17Int(dm.widthPixels));
    if (hh <= 1) hh = Math.max(1, th17Int(dm.heightPixels));
    var dpi = Math.max(1, th17Int(dm.densityDpi || 420));
    try { if (ctx.getResources().getConfiguration().densityDpi > 0) dpi = th17Int(ctx.getResources().getConfiguration().densityDpi); } catch (eDpi) {}
    var uid = th17Int(android.os.Process.myUid());
    var pkg = "";
    try { pkg = String(ctx.getOpPackageName() || ""); } catch (eOp) {}
    if (!pkg) try { pkg = String(ctx.getPackageName() || ""); } catch (ePkg) {}
    try {
      var ps = ctx.getPackageManager().getPackagesForUid(uid);
      var found = false, fallback = "";
      for (var pi = 0; ps && pi < ps.length; pi++) {
        var pn = String(ps[pi] || "");
        if (pn === pkg) found = true;
        if (!fallback || pn === "android") fallback = pn;
      }
      if (!found && fallback) pkg = fallback;
    } catch (ePackages) {}
    if (!pkg) throw new Error("截图 packageName 为空");
    var service = android.os.ServiceManager.getService("media_projection");
    if (!service) throw new Error("media_projection 服务不可用");
    var stub = java.lang.Class.forName("android.media.projection.IMediaProjectionManager$Stub");
    var manager = th17Invoke(th17FindMethod(stub, "asInterface", 1), null, [service]);
    if (!manager) throw new Error("IMediaProjectionManager 不可用");
    var create = th17FindMethod(manager.getClass(), "createProjection", 4);
    var projection = null;
    if (create) projection = th17Invoke(create, manager, [java.lang.Integer.valueOf(uid), pkg, java.lang.Integer.valueOf(0), java.lang.Boolean.valueOf(false)]);
    if (!projection) {
      create = th17FindMethod(manager.getClass(), "createProjection", 5);
      if (create) projection = th17Invoke(create, manager, [java.lang.Integer.valueOf(uid), pkg, java.lang.Integer.valueOf(0), java.lang.Boolean.valueOf(false), java.lang.Integer.valueOf(0)]);
    }
    if (!projection) throw new Error("createProjection 返回空对象");
    var mpClass = java.lang.Class.forName("android.media.projection.MediaProjection");
    var ctor = null, ctors = mpClass.getDeclaredConstructors();
    for (var ci = 0; ci < ctors.length; ci++) if (ctors[ci].getParameterTypes().length === 2) { ctor = ctors[ci]; break; }
    if (!ctor) throw new Error("MediaProjection 构造器不可用");
    try { ctor.setAccessible(true); } catch (eCtor) {}
    mp = ctor.newInstance(th17ObjectArray([ctx, projection]));
    ht = new android.os.HandlerThread("toolhub_media_projection");
    ht.start();
    h = new android.os.Handler(ht.getLooper());
    callback = new JavaAdapter(android.media.projection.MediaProjection.Callback, { onStop: function() {} });
    mp.registerCallback(callback, h);
    reader = android.media.ImageReader.newInstance(w, hh, android.graphics.PixelFormat.RGBA_8888, 2);
    vd = mp.createVirtualDisplay("ToolHub-ScreenCap", w, hh, dpi, 16, reader.getSurface(), null, h);
    if (!vd) throw new Error("VirtualDisplay 创建失败");
    var start = th17Now();
    while (!image && th17Now() - start < 2000) {
      image = reader.acquireLatestImage();
      if (!image) java.lang.Thread.sleep(20);
    }
    if (!image) throw new Error("ScreenCap timeout");
    var plane = image.getPlanes()[0], buffer = plane.getBuffer();
    var pixelStride = Number(plane.getPixelStride()), rowStride = Number(plane.getRowStride());
    var iw = Number(image.getWidth()), ih = Number(image.getHeight());
    var padding = Math.max(0, rowStride - pixelStride * iw);
    var pw = iw + Math.ceil(padding / pixelStride);
    try { buffer.rewind(); } catch (eRewind) {}
    padded = android.graphics.Bitmap.createBitmap(th17Int(pw), th17Int(ih), android.graphics.Bitmap.Config.ARGB_8888);
    padded.copyPixelsFromBuffer(buffer);
    full = pw === iw ? padded : android.graphics.Bitmap.createBitmap(padded, 0, 0, th17Int(iw), th17Int(ih));
    var l = Math.max(0, Math.min(th17Int(cropRect.left), th17Int(iw) - 1));
    var t = Math.max(0, Math.min(th17Int(cropRect.top), th17Int(ih) - 1));
    var r = Math.max(l + 1, Math.min(th17Int(cropRect.right), th17Int(iw)));
    var b = Math.max(t + 1, Math.min(th17Int(cropRect.bottom), th17Int(ih)));
    result = android.graphics.Bitmap.createBitmap(full, l, t, r - l, b - t);
    if (!result) throw new Error("区域裁剪失败");
    safeLog(this.L, 'i', "pointer capture success method=shortx_media_projection rect=" + th17RectKey(cropRect) + " display=" + w + "x" + hh + " rowStride=" + rowStride + " pixelStride=" + pixelStride + " package=" + th17LogSingleLine(pkg, 100));
    return { bitmap: result, buffer: null, method: "shortx_media_projection" };
  } catch (e0) {
    safeLog(this.L, 'w', "pointer capture failed method=shortx_media_projection err=" + th17LogSingleLine(e0, 500));
    throw new Error("shortx_media_projection: " + String(e0));
  } finally {
    try { if (image) image.close(); } catch (eImage) {}
    try { if (vd) vd.release(); } catch (eVd) {}
    try { if (reader) reader.close(); } catch (eReader) {}
    try { if (mp && callback) mp.unregisterCallback(callback); } catch (eCb) {}
    try { if (mp) mp.stop(); } catch (eStop) {}
    try { if (h) h.removeCallbacksAndMessages(null); } catch (eHandler) {}
    try { if (ht) { if (ht.quitSafely) ht.quitSafely(); else ht.quit(); } } catch (eThread) {}
    if (full && full !== result && full !== padded) try { this.recyclePointerBitmap(full); } catch (eFull) {}
    if (padded && padded !== result) try { this.recyclePointerBitmap(padded); } catch (ePadded) {}
  }
};

FloatBallAppWM.prototype.capturePointerBitmapByUiAutomation = function(cropRect) {
  var bitmap = null;
  var fullBitmap = null;
  try {
    safeLog(this.L, 'd', "pointer capture attempt method=ui_automation rect=" + th17RectKey(cropRect));
    var automation = this.getPointerUiAutomation ? this.getPointerUiAutomation("pointer_capture") : null;
    if (!automation || !automation.takeScreenshot) throw new Error("UiAutomation 截图接口不可用");

    try {
      bitmap = automation.takeScreenshot(cropRect);
    } catch (eRectShot) {
      fullBitmap = automation.takeScreenshot();
      if (!fullBitmap) throw eRectShot;

      var left = Math.max(0, Math.min(th17Int(cropRect.left), Math.max(0, fullBitmap.getWidth() - 1)));
      var top = Math.max(0, Math.min(th17Int(cropRect.top), Math.max(0, fullBitmap.getHeight() - 1)));
      var right = Math.max(left + 1, Math.min(th17Int(cropRect.right), fullBitmap.getWidth()));
      var bottom = Math.max(top + 1, Math.min(th17Int(cropRect.bottom), fullBitmap.getHeight()));
      bitmap = android.graphics.Bitmap.createBitmap(fullBitmap, left, top, right - left, bottom - top);
    }

    if (!bitmap) throw new Error("UiAutomation 截图返回空 Bitmap");
    if (fullBitmap && bitmap !== fullBitmap) {
      try { this.recyclePointerBitmap(fullBitmap); } catch (eRecycleFull) {}
      fullBitmap = null;
    }

    safeLog(this.L, 'i', "pointer capture success method=ui_automation rect=" + th17RectKey(cropRect));
    return {
      bitmap: bitmap,
      buffer: null,
      method: "ui_automation"
    };
  } catch (e0) {
    if (fullBitmap && fullBitmap !== bitmap) {
      try { this.recyclePointerBitmap(fullBitmap); } catch (eRecycleFailFull) {}
    }
    if (bitmap) {
      try { this.recyclePointerBitmap(bitmap); } catch (eRecycleFailBitmap) {}
    }
    safeLog(this.L, 'w', "pointer capture failed method=ui_automation err=" + th17LogSingleLine(e0, 300));
    throw new Error("ui_automation: " + String(e0));
  }
};

FloatBallAppWM.prototype.capturePointerBitmapByLegacySurfaceControl = function(cropRect) {
  var captureBuffer = null;
  var api = this.getPointerSdkInt ? this.getPointerSdkInt() : 0;
  try {
    if (api >= 33) throw new Error("Android 13 及以上不使用旧 SurfaceControl 截图接口");
    safeLog(this.L, 'd', "pointer capture attempt method=legacy_surface_control rect=" + th17RectKey(cropRect));

    if (api >= 29) {
      var displayToken = android.view.SurfaceControl.getInternalDisplayToken();
      if (displayToken == null) throw new Error("无法获取旧版 displayToken");
      var builder = new android.window.ScreenCapture.DisplayCaptureArgs.Builder(displayToken);
      builder.setSourceCrop(cropRect);
      try { builder.setSize(cropRect.width(), cropRect.height()); } catch (eSize) {}
      try { builder.setPixelFormat(android.graphics.PixelFormat.RGBA_8888); } catch (ePixel) {}
      try { builder.setCaptureSecureLayers(false); } catch (eSecure) {}
      try { builder.setAllowProtected(false); } catch (eProtected) {}
      captureBuffer = android.window.ScreenCapture.captureDisplay(builder.build());
    } else {
      captureBuffer = android.view.SurfaceControl.screenshotToBuffer(
        cropRect,
        cropRect.width(),
        cropRect.height(),
        0,
        java.lang.Integer.MAX_VALUE,
        false,
        0
      );
    }

    var bitmap = this.pointerBitmapFromCaptureBuffer(captureBuffer);
    if (!bitmap) throw new Error("旧版 SurfaceControl 截图返回空 Bitmap");
    safeLog(this.L, 'i', "pointer capture success method=legacy_surface_control rect=" + th17RectKey(cropRect));
    return {
      bitmap: bitmap,
      buffer: captureBuffer,
      method: "legacy_surface_control"
    };
  } catch (e0) {
    try { this.releasePointerCaptureBuffer(captureBuffer); } catch (eRelease) {}
    safeLog(this.L, 'w', "pointer capture failed method=legacy_surface_control err=" + th17LogSingleLine(e0, 300));
    throw new Error("legacy_surface_control: " + String(e0));
  }
};

FloatBallAppWM.prototype.capturePointerBitmap = function(cropRect) {
  var errors = [];
  var api = this.getPointerSdkInt ? this.getPointerSdkInt() : 0;

  if (api >= 33) {
    try { return this.capturePointerBitmapByWindowManager(cropRect); }
    catch (eWindowManager) { errors.push(String(eWindowManager)); }
  }

  try { return this.capturePointerBitmapByMediaProjection(cropRect); }
  catch (eMediaProjection) { errors.push(String(eMediaProjection)); }

  try { return this.capturePointerBitmapByUiAutomation(cropRect); }
  catch (eUiAutomation) { errors.push(String(eUiAutomation)); }

  if (api < 33) {
    try { return this.capturePointerBitmapByLegacySurfaceControl(cropRect); }
    catch (eLegacy) { errors.push(String(eLegacy)); }
  }

  throw new Error("所有截图方式均失败: " + errors.join(" | "));
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
  var capture = null;
  var bitmap = null;
  var saveBitmap = null;
  var captureBuffer = null;
  var file = null;
  var saved = false;

  try {
    capture = this.capturePointerBitmap(cropRect);
    bitmap = capture && capture.bitmap ? capture.bitmap : null;
    captureBuffer = capture && capture.buffer ? capture.buffer : null;
    if (!bitmap) throw new Error("截图结果 Bitmap 为空");

    saveBitmap = bitmap;
    try {
      if (bitmap.getConfig && bitmap.getConfig() === android.graphics.Bitmap.Config.HARDWARE) {
        var softwareBitmap = bitmap.copy(android.graphics.Bitmap.Config.ARGB_8888, false);
        if (softwareBitmap) saveBitmap = softwareBitmap;
      }
    } catch (eSoftwareCopy) {
      saveBitmap = bitmap;
      safeLog(this.L, 'w', "pointer capture hardware bitmap copy fail: " + th17LogSingleLine(eSoftwareCopy, 220));
    }

    file = this.createPointerScreenshotFile();
    this.savePointerBitmapToFile(saveBitmap, file);
    saved = true;
    safeLog(this.L, 'i',
      "pointer screenshot saved method=" + String(capture && capture.method || "") +
      " rect=" + th17RectKey(cropRect) +
      " path=" + String(file.getAbsolutePath()));
    return String(file.getAbsolutePath());
  } finally {
    if (!saved && file) {
      try { if (file.exists()) file.delete(); } catch (eDeletePartial) {}
    }
    try { this.releasePointerCaptureBuffer(captureBuffer); } catch (eReleaseCap) {}
    if (saveBitmap && saveBitmap !== bitmap) {
      try { this.recyclePointerBitmap(saveBitmap); } catch (eRecycleSaveBitmap) {}
    }
    try { this.recyclePointerBitmap(bitmap); } catch (eRecycleCapBitmap) {}
  }
};

FloatBallAppWM.prototype.isPointerToolActive = function() {
  var st = this.ensurePointerToolState();
  return !!st.active;
};

FloatBallAppWM.prototype.removePointerCallbacks = function(st) {
  try { if (st.handler && st.moveRunnable) st.handler.removeCallbacks(st.moveRunnable); } catch (e0) {}
  try { if (st.handler && st.inspectRunnable) st.handler.removeCallbacks(st.inspectRunnable); } catch (e1) {}
  try { if (st.handler && st.stopInspectRunnable) st.handler.removeCallbacks(st.stopInspectRunnable); } catch (e2) {}
  try { if (st.handler && st.inspectRetryRunnable) st.handler.removeCallbacks(st.inspectRetryRunnable); } catch (eInspectRetryRemove) {}
  try { if (st.handler && st.areaHoldRunnable) st.handler.removeCallbacks(st.areaHoldRunnable); } catch (eAreaHoldRemove) {}
  try { if (st.handler && st.textReadyRunnable) st.handler.removeCallbacks(st.textReadyRunnable); } catch (eTextReadyRemove) {}
  try { if (st.inspectH) st.inspectH.removeCallbacksAndMessages(null); } catch (e3) {}
  st.moveRunnable = null;
  st.inspectRunnable = null;
  st.stopInspectRunnable = null;
  st.inspectRetryRunnable = null;
  st.inspectRetryToken = Number(st.inspectRetryToken || 0) + 1;
  st.inspectRetryCount = 0;
  st.inspectRetryX = -100000;
  st.inspectRetryY = -100000;
  st.areaHoldRunnable = null;
  st.textReadyRunnable = null;
  st.dragUpdatePosted = false;
  st.inspectPosted = false;
  st.draggingInspectPosted = false;
  st.inspectPending = false;
  st.inspectFinishAfterResult = false;
  st.areaHoldToken++;
  st.textReadyToken = Number(st.textReadyToken || 0) + 1;
  st.textHoverReadyToken = Number(st.textHoverReadyToken || 0) + 1;
  try { if (st.handler && st.areaHoldRunnable) st.handler.removeCallbacks(st.areaHoldRunnable); } catch (eRemoveAreaHoldEnter) {}
  st.areaHoldRunnable = null;
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
  try { if (st.handler && st.drawHealthRunnable) st.handler.removeCallbacks(st.drawHealthRunnable); } catch (eRemoveDrawHealthClose) {}
  st.drawHealthRunnable = null;
  st.drawHealthToken = Number(st.drawHealthToken || 0) + 1;
  st.pointerRootToken = Number(st.pointerRootToken || 0) + 1;
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
  st.fallbackPaint = null;
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

FloatBallAppWM.prototype.mapPointerScreenCoord = function(value, oldSize, newSize, includeEdge) {
  var n = Number(value || 0);
  var oldN = Math.max(1, Number(oldSize || 0));
  var newN = Math.max(1, Number(newSize || 0));
  if (isNaN(n)) n = 0;
  if (isNaN(oldN) || oldN <= 0) oldN = newN;
  if (isNaN(newN) || newN <= 0) newN = oldN;
  var oldMax = includeEdge === true ? oldN : Math.max(0, oldN - 1);
  var newMax = includeEdge === true ? newN : Math.max(0, newN - 1);
  if (oldMax <= 0) return 0;
  n = this.clamp(n, 0, oldMax);
  return th17Int(this.clamp(Math.round(n * newMax / oldMax), 0, newMax));
};

FloatBallAppWM.prototype.mapPointerMaybeCoordForReflow = function(value, oldSize, newSize, includeEdge) {
  if (value === null || value === undefined) return value;
  var n = Number(value);
  if (isNaN(n)) return value;
  if (n < -90000) return value;
  return this.mapPointerScreenCoord(n, oldSize, newSize, includeEdge === true);
};

FloatBallAppWM.prototype.mapPointerScreenPointForReflow = function(x, y, oldW, oldH, newW, newH) {
  return {
    x: this.mapPointerScreenCoord(x, oldW, newW, false),
    y: this.mapPointerScreenCoord(y, oldH, newH, false)
  };
};

FloatBallAppWM.prototype.mapPointerWindowPointForReflow = function(x, y, oldW, oldH, newW, newH) {
  var st = this.state && this.state.pointerTool ? this.state.pointerTool : null;
  var pointerW = Math.max(1, Number(st && st.pointerW || 1));
  var pointerH = Math.max(1, Number(st && st.pointerH || 1));
  var oldMaxX = Math.max(0, Number(oldW || 0) - pointerW);
  var oldMaxY = Math.max(0, Number(oldH || 0) - pointerH);
  var newMaxX = Math.max(0, Number(newW || 0) - pointerW);
  var newMaxY = Math.max(0, Number(newH || 0) - pointerH);
  var nx = Number(x || 0);
  var ny = Number(y || 0);
  if (isNaN(nx)) nx = 0;
  if (isNaN(ny)) ny = 0;

  var fixedEdge = !!(st && st.__th18FixedEdgePointerMode === true);
  if (nx < 0 || ny < 0 || nx > oldMaxX || ny > oldMaxY) fixedEdge = true;
  if (fixedEdge) {
    var anchorX = Math.max(0, Number(st && st.anchorLocalX || 0));
    var anchorY = Math.max(0, Number(st && st.anchorLocalY || 0));
    var hotspot = this.mapPointerScreenPointForReflow(nx + anchorX, ny + anchorY, oldW, oldH, newW, newH);
    return {
      x: th17Int(this.clamp(hotspot.x - anchorX, -anchorX, Math.max(-anchorX, Number(newW || 0) - 1 - anchorX))),
      y: th17Int(this.clamp(hotspot.y - anchorY, -anchorY, Math.max(-anchorY, Number(newH || 0) - 1 - anchorY)))
    };
  }

  var mappedX = oldMaxX > 0 ? Math.round(this.clamp(nx, 0, oldMaxX) * newMaxX / oldMaxX) : 0;
  var mappedY = oldMaxY > 0 ? Math.round(this.clamp(ny, 0, oldMaxY) * newMaxY / oldMaxY) : 0;
  return {
    x: th17Int(this.clamp(mappedX, 0, newMaxX)),
    y: th17Int(this.clamp(mappedY, 0, newMaxY))
  };
};

FloatBallAppWM.prototype.mapPointerRectForScreenReflow = function(rect, oldW, oldH, newW, newH) {
  if (!rect) return null;
  var left = this.mapPointerScreenCoord(Math.min(Number(rect.left || 0), Number(rect.right || 0)), oldW, newW, true);
  var top = this.mapPointerScreenCoord(Math.min(Number(rect.top || 0), Number(rect.bottom || 0)), oldH, newH, true);
  var right = this.mapPointerScreenCoord(Math.max(Number(rect.left || 0), Number(rect.right || 0)), oldW, newW, true);
  var bottom = this.mapPointerScreenCoord(Math.max(Number(rect.top || 0), Number(rect.bottom || 0)), oldH, newH, true);
  left = this.clamp(left, 0, Math.max(0, Number(newW || 0) - 1));
  top = this.clamp(top, 0, Math.max(0, Number(newH || 0) - 1));
  right = this.clamp(right, left + 1, Math.max(left + 1, Number(newW || 0)));
  bottom = this.clamp(bottom, top + 1, Math.max(top + 1, Number(newH || 0)));
  return { left: th17Int(left), top: th17Int(top), right: th17Int(right), bottom: th17Int(bottom) };
};

FloatBallAppWM.prototype.onPointerScreenChangedReflow = function(reason, oldW, oldH, newW, newH) {
  var st = this.state && this.state.pointerTool ? this.state.pointerTool : null;
  if (!st || !st.active || st.closed) return false;
  oldW = Math.max(1, Number(oldW || 0));
  oldH = Math.max(1, Number(oldH || 0));
  newW = Math.max(1, Number(newW || 0));
  newH = Math.max(1, Number(newH || 0));
  if (oldW === newW && oldH === newH) return false;

  try {
    if (st.handler && st.moveRunnable) st.handler.removeCallbacks(st.moveRunnable);
  } catch (eRemoveMove) {}
  st.moveRunnable = null;
  st.dragUpdatePosted = false;

  var windowX = st.lp ? Number(st.lp.x || 0) : Number(st.pointerX || 0);
  var windowY = st.lp ? Number(st.lp.y || 0) : Number(st.pointerY || 0);
  var windowPoint = this.mapPointerWindowPointForReflow(windowX, windowY, oldW, oldH, newW, newH);
  st.pointerX = windowPoint.x;
  st.pointerY = windowPoint.y;
  st.pendingPointerX = windowPoint.x;
  st.pendingPointerY = windowPoint.y;
  if (st.lp) {
    st.lp.x = windowPoint.x;
    st.lp.y = windowPoint.y;
    st.lp.width = st.pointerW;
    st.lp.height = st.pointerH;
    try {
      if (st.added && st.root && st.wm) st.wm.updateViewLayout(st.root, st.lp);
    } catch (ePointerLayout) {
      safeLog(this.L, 'w', "pointer window reflow update fail: " + String(ePointerLayout));
    }
  }

  st.areaStartX = this.mapPointerMaybeCoordForReflow(st.areaStartX, oldW, newW, false);
  st.areaStartY = this.mapPointerMaybeCoordForReflow(st.areaStartY, oldH, newH, false);
  st.areaEndX = this.mapPointerMaybeCoordForReflow(st.areaEndX, oldW, newW, false);
  st.areaEndY = this.mapPointerMaybeCoordForReflow(st.areaEndY, oldH, newH, false);
  st.hoverX = this.mapPointerMaybeCoordForReflow(st.hoverX, oldW, newW, false);
  st.hoverY = this.mapPointerMaybeCoordForReflow(st.hoverY, oldH, newH, false);
  st.areaHoldAnchorX = this.mapPointerMaybeCoordForReflow(st.areaHoldAnchorX, oldW, newW, false);
  st.areaHoldAnchorY = this.mapPointerMaybeCoordForReflow(st.areaHoldAnchorY, oldH, newH, false);
  st.areaArmX = this.mapPointerMaybeCoordForReflow(st.areaArmX, oldW, newW, false);
  st.areaArmY = this.mapPointerMaybeCoordForReflow(st.areaArmY, oldH, newH, false);
  st.inspectLatestX = this.mapPointerMaybeCoordForReflow(st.inspectLatestX, oldW, newW, false);
  st.inspectLatestY = this.mapPointerMaybeCoordForReflow(st.inspectLatestY, oldH, newH, false);
  st.lastQueryX = this.mapPointerMaybeCoordForReflow(st.lastQueryX, oldW, newW, false);
  st.lastQueryY = this.mapPointerMaybeCoordForReflow(st.lastQueryY, oldH, newH, false);
  if (st.__th18FixedEdgeY !== undefined) st.__th18FixedEdgeY = this.mapPointerMaybeCoordForReflow(st.__th18FixedEdgeY, oldH, newH, false);

  st.currentRect = this.mapPointerRectForScreenReflow(st.currentRect, oldW, oldH, newW, newH);
  st.boundRect = this.mapPointerRectForScreenReflow(st.boundRect, oldW, oldH, newW, newH);
  st.captureRect = this.mapPointerRectForScreenReflow(st.captureRect, oldW, oldH, newW, newH);
  st.visualRect = this.mapPointerRectForScreenReflow(st.visualRect, oldW, oldH, newW, newH);
  st.frameRect = this.mapPointerRectForScreenReflow(st.frameRect, oldW, oldH, newW, newH);
  if (st.__th18FrameRect) st.__th18FrameRect = this.mapPointerRectForScreenReflow(st.__th18FrameRect, oldW, oldH, newW, newH);

  if (st.frameLp) {
    st.frameLp.width = th17Int(newW);
    st.frameLp.height = th17Int(newH);
    st.frameLp.x = 0;
    st.frameLp.y = 0;
    try {
      if (st.frameAdded && st.frame) {
        var frameWm = this.state.wm || st.wm;
        if (frameWm) frameWm.updateViewLayout(st.frame, st.frameLp);
      }
    } catch (eFrameLayout) {
      safeLog(this.L, 'w', "pointer frame reflow update fail: " + String(eFrameLayout));
    }
  }

  if (st.mode === "area_capture" && (st.areaSelecting || st.captureRect || st.visualRect)) {
    var rawRect = { left: st.areaStartX, top: st.areaStartY, right: st.areaEndX, bottom: st.areaEndY };
    var areaRect = this.normalizePointerCaptureRect(rawRect);
    st.captureRect = areaRect;
    st.visualRect = areaRect;
    st.areaValid = this.isPointerOcrRectValid(areaRect, st.areaStartX, st.areaStartY, st.areaEndX, st.areaEndY);
    st.areaReady = !!areaRect && st.areaValid;
    st.areaFallbackPreview = false;
    if (areaRect) {
      if (st.areaProcessing === true) {
        this.showPointerAreaFrame(areaRect, "capture");
      } else if (st.areaValid) {
        this.showPointerAreaFrame(areaRect, "area");
      } else if (st.areaFromText === true && st.areaSmallFallbackText === true && st.boundRect) {
        st.areaFallbackPreview = true;
        this.showPointerAreaFrame(st.boundRect, "text_hit");
      } else {
        this.showPointerAreaFrame(areaRect, "area_armed");
      }
    }
  } else {
    try { if (st.frame) st.frame.invalidate(); } catch (eFrameInvalidate) {}
  }

  if (st.mode === "text_pick") {
    // 旋转后 Accessibility 节点布局可能完全变化。
    // 映射旧矩形不能证明旧文本仍位于指针热点下，因此必须废弃旧候选。
    try {
      st.textReadyToken = Number(st.textReadyToken || 0) + 1;
      if (st.handler && st.textReadyRunnable) {
        st.handler.removeCallbacks(st.textReadyRunnable);
      }
    } catch(eClearReadyReflow) {}
    st.textReadyRunnable = null;
    try {
      this.invalidatePointerTextHoverCredential(st, "screen_reflow", false);
    } catch(eCredentialReflow) {}
    st.textStableAnchorX = -100000;
    st.textStableAnchorY = -100000;
    st.textStableLastX = -100000;
    st.textStableLastY = -100000;
    st.textStableSince = 0;
    st.textStableTargetKey = "";

    st.currentText = "";
    st.currentRect = null;
    st.currentKey = "";

    st.boundText = "";
    st.boundRect = null;
    st.boundKey = "";
    st.boundAt = 0;

    st.hoverKey = "";
    st.hoverSince = 0;
    st.hoverX = 0;
    st.hoverY = 0;

    st.lastQueryX = -100000;
    st.lastQueryY = -100000;
    st.inspectLastTimedOut = false;
    st.inspectLastCostMs = 0;
    st.inspectLastNodes = 0;
    st.inspectLastWindows = 0;
    st.inspectLastReason = "";

    try { this.updatePointerVisualHot(false); } catch(eClearHotReflow) {}
    try { this.hidePointerAreaFrame(); } catch(eHideFrameReflow) {}
    try { this.resetPointerAreaHold(); } catch(eResetHoldReflow) {}

    try {
      this.schedulePointerInspectAsync(
        true,
        "screen_reflow:" + String(reason || ""),
        false
      );
    } catch(eRescan) {
      safeLog(
        this.L,
        'w',
        "pointer screen reflow rescan fail: " + String(eRescan)
      );
    }

    // 仍处于拖动状态时，以旋转后的热点重新开始独立取字悬停和框选计时。
    try {
      if (st.dragging) {
        this.resetPointerTextStableHover(
          st,
          th17Now(),
          this.getPointerHotspot(),
          "screen_reflow"
        );
        this.updatePointerAreaHoldCandidate();
      }
    } catch(eRestartHoldReflow) {}
  }

  try { this.requestPointerRedraw(st); } catch (ePointerInvalidate) {}
  safeLog(this.L, 'i',
    "pointer screen reflow reason=" + String(reason || "") +
    " old=" + String(oldW) + "x" + String(oldH) +
    " new=" + String(newW) + "x" + String(newH) +
    " mode=" + String(st.mode || "") +
    " pointer=" + String(st.pointerX) + "," + String(st.pointerY)
  );
  return true;
};

FloatBallAppWM.prototype.recordPointerDrawFailure = function(st, stage, errorObj) {
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

FloatBallAppWM.prototype.isCurrentPointerRoot = function(st, rootRef, rootToken, requireAdded) {
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

FloatBallAppWM.prototype.rebuildPointerWindowForDraw = function(st, reason, expectedRoot, expectedRootToken) {
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
};

FloatBallAppWM.prototype.schedulePointerDrawHealthCheck = function(st, delayMs) {
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
};

FloatBallAppWM.prototype.isPointerAreaOcrReady = function(st) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  return !!(
    pointerState &&
    pointerState.active === true &&
    pointerState.closed !== true &&
    (
      pointerState.areaOcrRequested === true ||
      String(pointerState.source || "") === "edge_drag"
    ) &&
    pointerState.areaArmReady === true &&
    pointerState.mode === "text_pick" &&
    pointerState.dragging === true
  );
};

FloatBallAppWM.prototype.createPointerCanvasView = function(st) {
  var self = this;
  st.pointerRootToken = Number(st.pointerRootToken || 0) + 1;
  var rootToken = Number(st.pointerRootToken || 0);
  var pointerPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
  st.paint = pointerPaint;
  var PointerView = new JavaAdapter(android.view.View, {
    onDraw: function(canvas) {
      if (!st.active || st.closed || st.root !== this ||
          Number(st.pointerRootToken || 0) !== rootToken) return;
      var stage = "prepare";
      var drawn = false;
      st.drawCount = Number(st.drawCount || 0) + 1;
      try {
        var p = pointerPaint;
        var pointerScale = Number(st.pointerScale || 1);
        if (isNaN(pointerScale) || pointerScale <= 0) pointerScale = 1;
        var dp = function(v) { return self.dp(Number(v) * pointerScale); };
        var tipX = st.anchorLocalX;
        var tipY = st.anchorLocalY;
        var textReady = false;
        try { textReady = self.isPointerTextHoverReady(th17Now()) === true; } catch(eReadyDraw) { textReady = false; }
        var areaOcrReady = false;
        try { areaOcrReady = self.isPointerAreaOcrReady(st) === true; } catch(eAreaReadyDraw) { areaOcrReady = false; }
        var hoverCandidate = !!(st.currentText && st.currentRect && st.hoverSince && !textReady);
        var processing = !!st.areaProcessing;
        var active = !!(st.hot || hoverCandidate || areaOcrReady || st.areaSelecting || st.areaReady || processing);
        var dragging = !!st.dragging;
        var rgb = null;
        if (processing || st.mode === "area_capture" || st.areaSelecting || st.areaReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_HEX", 59, 130, 246);
        } else if (areaOcrReady) {
          rgb = th17PointerColorRgb(self, "POINTER_COLOR_AREA_READY_HEX", 245, 158, 11);
        } else if (textReady) {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_COLOR_TEXT_READY_HEX", "POINTER_COLOR_NORMAL_HEX", 34, 197, 94);
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
        st.pointerRootDrawSuccessToken = rootToken;
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
    this.requestPointerRedraw(st);
    this.schedulePointerDrawHealthCheck(st, 120);
    return true;
  } catch (e0) {
    this.recordPointerDrawFailure(st, "show_window", e0);
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
      var pointerLayoutUpdated = true;
      try {
        st.wm.updateViewLayout(st.root, st.lp);
      } catch (eU) {
        pointerLayoutUpdated = false;
        safeLog(self.L, 'e', "pointer update fail: " + String(eU));
        var updateMessage = String(eU || "");
        if (updateMessage.indexOf("not attached") >= 0 ||
            updateMessage.indexOf("Invalid display") >= 0 ||
            updateMessage.indexOf("BadTokenException") >= 0) {
          st.added = false;
          st.root = null;
          st.lp = null;
          st.paint = null;
          st.fallbackPaint = null;
          st.drawFallbackMode = true;
          st.drawShadowDisabled = true;
          try { self.showPointerWindow(st); } catch (eRecoverWindow) {
            self.recordPointerDrawFailure(st, "move_recover", eRecoverWindow);
          }
        }
      }
      if (pointerLayoutUpdated) self.requestPointerRedraw(st);
      if (st.mode === "area_capture") self.updatePointerAreaSelection();
      else {
        try { self.updatePointerTextStableMotion(th17Now()); } catch (eTextStable) {}
        self.updatePointerAreaHoldCandidate();
        self.scheduleDraggingInspect();
      }
    } catch (eRun) { safeLog(self.L, 'e', "schedulePointerMove run fail: " + String(eRun)); }
  }});
  try { st.handler.postDelayed(st.moveRunnable, 16); } catch (ePost) { st.dragUpdatePosted = false; }
};


FloatBallAppWM.prototype.resetPointerAreaHold = function() {
  var st = this.ensurePointerToolState();
  try { if (st.handler && st.areaHoldRunnable) st.handler.removeCallbacks(st.areaHoldRunnable); } catch (eRemoveAreaHold) {}
  st.areaHoldRunnable = null;
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
  try {
    if (st.areaHoldRunnable) st.handler.removeCallbacks(st.areaHoldRunnable);
  } catch (eRemoveOldHold) {}
  var self = this;
  st.areaHoldRunnable = new java.lang.Runnable({ run: function() {
    try {
      var s = self.ensurePointerToolState();
      if (!s.active || s.closed || s.mode !== "text_pick" || !s.dragging) return;
      if (token !== s.areaHoldToken) return;
      s.areaHoldRunnable = null;
      var hp = self.getPointerHotspot();
      var dx = hp.x - s.areaHoldAnchorX;
      var dy = hp.y - s.areaHoldAnchorY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= Math.max(1, Number(s.areaHoldBreakSlop || self.dp(14)))) self.armPointerAreaMode(token);
      else self.updatePointerAreaHoldCandidate();
    } catch (eRun) { safeLog(self.L, 'e', "schedulePointerAreaHoldCheck run fail: " + String(eRun)); }
  }});
  try {
    st.handler.postDelayed(st.areaHoldRunnable, Math.max(300, Number(st.areaHoldDelay || 1000)));
  } catch (ePost) {
    st.areaHoldRunnable = null;
  }
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

  // final scan 的缓存清理只允许在 overlay 隐藏后的 prepare 阶段执行一次。
  // 扫描阶段复用同一个 UiAutomation，避免重复 clearCache/getServiceInfo Binder 调用。
  if (String(reason || "") === "final_prepare") {
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

FloatBallAppWM.prototype.getPointerActiveRoot = function(reason, automation) {
  var a = automation || this.getPointerUiAutomation(reason);
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

FloatBallAppWM.prototype.findPointerTextAtSnapshot = function(x, y, force, reason, seq, session, preparedAutomation) {
  var start = th17Now();
  var reasonText = String(reason || "");
  var isFinal = force === true;
  var isRetry = !isFinal && reasonText.indexOf("drag_retry") === 0;
  var limitMs = isFinal ? 180 : (isRetry ? 160 : 90);
  var maxNodes = isFinal ? 420 : (isRetry ? 600 : 240);
  var st = this.ensurePointerToolState();
  try {
    if (isFinal) limitMs = Number(st.inspectMaxFinalMs || 180);
    else if (isRetry) limitMs = Number(st.inspectMaxRetryMs || 160);
    else limitMs = Number(st.inspectMaxDragMs || 90);
  } catch (eLimit) {}
  try {
    if (isFinal) maxNodes = Number(st.inspectMaxFinalNodes || 420);
    else if (isRetry) maxNodes = Number(st.inspectMaxRetryNodes || 600);
    else maxNodes = Number(st.inspectMaxDragNodes || 240);
  } catch (eNodes) {}
  if (isNaN(limitMs) || limitMs < 20) limitMs = isFinal ? 180 : (isRetry ? 160 : 90);
  if (isNaN(maxNodes) || maxNodes < 40) maxNodes = isFinal ? 420 : (isRetry ? 600 : 240);

  var count = { n: 0 };
  var result = null;
  var windowsCount = 0;
  var windowsScanned = 0;
  var activeWindowId = -1;
  var automationMs = 0;
  var activeRootMs = 0;
  var windowsQueryMs = 0;
  var windowsScanMs = 0;
  var fallbackPartial = false;
  var fallbackSkipReason = "";

  var automationStart = th17Now();
  var a = preparedAutomation || this.getPointerUiAutomation(isFinal ? "final_prepare" : "scan");
  automationMs = th17Now() - automationStart;

  // 优先扫描活动应用根节点，并复用同一个 UiAutomation。
  // final scan 已在 prepare 阶段完成 clearCache，不再重复获取和清理。
  var activeRoot = null;
  var activeRootStart = th17Now();
  try {
    activeRoot = this.getPointerActiveRoot(isFinal ? "final_scan" : "scan", a);
    if (activeRoot) {
      try { if (activeRoot.getWindowId) activeWindowId = Number(activeRoot.getWindowId()); } catch (eWindowId) { activeWindowId = -1; }
      result = this.findPointerTextNodeAtBudget(
        activeRoot,
        x,
        y,
        start,
        limitMs,
        maxNodes,
        count
      );
    }
  } catch (eActive) {
    result = null;
  } finally {
    activeRootMs = th17Now() - activeRootStart;
    try { if (activeRoot) activeRoot.recycle(); } catch (eRecycleActive) {}
  }

  // 活动根节点未命中时，只在仍有可用时间时补扫其他窗口。
  // final scan 最多补扫两个非活动窗口，避免 getRoot() Binder 调用把 220ms 预算拖穿。
  if (!result || !result.text || !result.rect) {
    var minFallbackBudgetMs = isFinal ? 35 : 20;
    var maxExtraWindows = isFinal ? 2 : 1;
    var remainingBeforeWindows = limitMs - (th17Now() - start);
    if (remainingBeforeWindows <= minFallbackBudgetMs) {
      fallbackPartial = true;
      fallbackSkipReason = "low_budget";
    } else {
      try {
        if (a && a.getWindows) {
          var windowsQueryStart = th17Now();
          var wins = a.getWindows();
          windowsQueryMs = th17Now() - windowsQueryStart;
          if (wins) {
            try { windowsCount = wins.size(); } catch (eSize) { windowsCount = 0; }
            var windowsScanStart = th17Now();
            for (var wi = 0; wi < windowsCount; wi++) {
              var elapsedBeforeWindow = th17Now() - start;
              if (elapsedBeforeWindow >= limitMs) {
                fallbackPartial = true;
                fallbackSkipReason = "time_budget";
                break;
              }
              if (count.n >= maxNodes) {
                fallbackPartial = true;
                fallbackSkipReason = "node_budget";
                break;
              }
              if (windowsScanned >= maxExtraWindows) {
                fallbackPartial = true;
                fallbackSkipReason = "window_cap";
                break;
              }

              var win = null;
              var rootFromWin = null;
              try {
                win = wins.get(wi);
                var winId = -1;
                try { if (win && win.getId) winId = Number(win.getId()); } catch (eWinId) { winId = -1; }
                if (activeWindowId >= 0 && winId === activeWindowId) continue;

                var remainingForRoot = limitMs - (th17Now() - start);
                if (remainingForRoot <= 15) {
                  fallbackPartial = true;
                  fallbackSkipReason = "low_budget";
                  break;
                }

                windowsScanned++;
                if (win) rootFromWin = this.getPointerWindowRoot(win);
                if (rootFromWin) {
                  result = this.findPointerTextNodeAtBudget(
                    rootFromWin,
                    x,
                    y,
                    start,
                    limitMs,
                    maxNodes,
                    count
                  );
                }
              } catch (eWin) {
                result = null;
              } finally {
                try { if (rootFromWin) rootFromWin.recycle(); } catch (eRootRecycle) {}
              }
              if (result && result.text && result.rect) break;
            }
            windowsScanMs = th17Now() - windowsScanStart;
          }
        }
      } catch (eWindows) {}
    }
  }

  var cost = th17Now() - start;
  var budgetTimedOut =
    cost >= limitMs ||
    count.n >= maxNodes ||
    fallbackSkipReason === "time_budget" ||
    fallbackSkipReason === "node_budget" ||
    fallbackSkipReason === "low_budget";
  // 普通 drag/retry 达到主动窗口上限只表示部分扫描，不属于预算超时。
  // final scan 仍把任何未扫描窗口视为不完整，保留 TEXT_SCAN_TIMEOUT 语义。
  var timedOut = budgetTimedOut || (isFinal && fallbackPartial);
  return {
    seq: seq,
    session: session,
    x: x,
    y: y,
    force: isFinal,
    reason: reasonText,
    result: result,
    costMs: cost,
    budgetMs: limitMs,
    nodes: count.n,
    windows: windowsCount,
    windowsScanned: windowsScanned,
    automationMs: automationMs,
    activeRootMs: activeRootMs,
    windowsQueryMs: windowsQueryMs,
    windowsScanMs: windowsScanMs,
    partialWindows: fallbackPartial,
    skipReason: fallbackSkipReason,
    timedOut: timedOut
  };
};

FloatBallAppWM.prototype.cancelPointerInspectRetry = function(st, reason) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState) return false;

  var hadRetry = !!pointerState.inspectRetryRunnable;
  pointerState.inspectRetryToken = Number(pointerState.inspectRetryToken || 0) + 1;
  try {
    if (pointerState.handler && pointerState.inspectRetryRunnable) {
      pointerState.handler.removeCallbacks(pointerState.inspectRetryRunnable);
    }
  } catch (eRemove) {}
  pointerState.inspectRetryRunnable = null;

  if (reason === "hit" || reason === "reset" || reason === "close") {
    pointerState.inspectRetryCount = 0;
    pointerState.inspectRetryX = -100000;
    pointerState.inspectRetryY = -100000;
  }
  return hadRetry;
};

FloatBallAppWM.prototype.schedulePointerInspectRetry = function(pack) {
  var st = this.ensurePointerToolState();
  if (!pack || !st.active || st.closed || !st.dragging || st.mode !== "text_pick") return false;

  var reasonText = String(pack.reason || "");
  if (reasonText !== "drag" && reasonText.indexOf("drag_retry") !== 0) return false;
  if (
    pack.partialWindows === true &&
    String(pack.skipReason || "") === "window_cap" &&
    pack.timedOut !== true
  ) return false;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());

  if (reasonText === "drag") {
    st.inspectRetryCount = 0;
    st.inspectRetryX = Number(pack.x);
    st.inspectRetryY = Number(pack.y);
  }

  var maxRetry = 3;
  if (Number(st.inspectRetryCount || 0) >= maxRetry) {
    this.cancelPointerInspectRetry(st, "exhausted");
    return false;
  }

  this.cancelPointerInspectRetry(st, "replace");
  st.inspectRetryCount = Number(st.inspectRetryCount || 0) + 1;
  st.inspectRetryX = Number(pack.x);
  st.inspectRetryY = Number(pack.y);
  st.inspectRetryToken = Number(st.inspectRetryToken || 0) + 1;

  var token = Number(st.inspectRetryToken);
  var session = Number(st.inspectSession || 0);
  var retryNo = Number(st.inspectRetryCount || 0);
  var delayMs = pack.timedOut === true ? 120 : 180;
  var self = this;

  st.inspectRetryRunnable = new java.lang.Runnable({ run: function() {
    try {
      if (Number(st.inspectRetryToken || 0) !== token) return;
      st.inspectRetryRunnable = null;
      if (!st.active || st.closed || !st.dragging || st.mode !== "text_pick") return;
      if (Number(st.inspectSession || 0) !== session) return;

      var hp = self.getPointerHotspot();
      var dx = Number(hp.x) - Number(st.inspectRetryX);
      var dy = Number(hp.y) - Number(st.inspectRetryY);
      var retrySlop = Math.max(1, self.dp(4));
      if (Math.sqrt(dx * dx + dy * dy) > retrySlop) {
        st.inspectRetryCount = 0;
        return;
      }

      try {
        safeLog(
          self.L,
          'd',
          "pointer stationary inspect retry=" + String(retryNo) +
          " reason=" + reasonText +
          " timeout=" + String(pack.timedOut === true)
        );
      } catch (eLog) {}

      self.schedulePointerInspectAsync(
        false,
        "drag_retry_" + String(retryNo),
        false,
        true
      );
    } catch (eRun) {
      try { safeLog(self.L, 'e', "pointer stationary inspect retry fail: " + String(eRun)); } catch (eLogFail) {}
    }
  }});

  try {
    st.handler.postDelayed(st.inspectRetryRunnable, delayMs);
    return true;
  } catch (ePost) {
    st.inspectRetryRunnable = null;
    return false;
  }
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
  st.inspectLastWindows = Number(pack.windows || 0);
  st.inspectLastPrepareMs = Number(pack.prepareMs || 0);
  st.inspectLastAutomationMs = Number(pack.automationMs || 0);
  st.inspectLastActiveRootMs = Number(pack.activeRootMs || 0);
  st.inspectLastWindowsQueryMs = Number(pack.windowsQueryMs || 0);
  st.inspectLastWindowsScanMs = Number(pack.windowsScanMs || 0);
  st.inspectLastWindowsScanned = Number(pack.windowsScanned || 0);
  st.inspectLastTimedOut = pack.timedOut === true;
  st.inspectLastReason = String(pack.reason || "");
  st.lastQueryX = pack.x;
  st.lastQueryY = pack.y;
  var result = pack.result;
  var now = th17Now();
  var finishAfterRelease = pack.finishAfterResult === true;
  var stationaryRetryScheduled = false;
  if (result && result.text && result.rect) {
    try { this.cancelPointerInspectRetry(st, "hit"); } catch (eCancelRetryHit) {}
    var key = this.pointerTextKeyOf(result);
    st.currentText = String(result.text);
    st.currentRect = th17RectObj(result.rect);
    st.currentKey = key;
    st.boundText = st.currentText;
    st.boundRect = th17RectObj(result.rect);
    st.boundKey = key;
    st.boundAt = now;

    var hoverAt = now;
    if (finishAfterRelease && Number(st.releaseTs || 0) > 0) hoverAt = Number(st.releaseTs);
    try { this.bindPointerTextHoverCandidate(st, key, st.currentRect, hoverAt); } catch (eBindHover) {}
    try { this.rememberPointerValidPick(st); } catch (eRemember) {}
    this.refreshPointerTextReadyVisualState(hoverAt);
    this.schedulePointerTextReadyVisualRefresh();
  } else {
    var recoveredByLastCandidate = false;
    var timeoutReason = String(pack.reason || "");
    var finalTimeoutReason =
      timeoutReason.indexOf("release_final") === 0 ||
      timeoutReason.indexOf("area_small_text_final") === 0;
    var finalTimeout =
      pack.timedOut === true &&
      finishAfterRelease === true &&
      finalTimeoutReason;

    try {
      stationaryRetryScheduled = this.schedulePointerInspectRetry(pack) === true;
    } catch (eRetrySchedule) {
      stationaryRetryScheduled = false;
    }

    var keepCurrentOnDragTimeout = false;
    try {
      var dragTimeoutReason =
        timeoutReason === "drag" ||
        timeoutReason.indexOf("drag_retry") === 0;
      keepCurrentOnDragTimeout =
        pack.timedOut === true &&
        finishAfterRelease !== true &&
        dragTimeoutReason &&
        stationaryRetryScheduled === true &&
        !!st.currentText &&
        !!st.currentRect &&
        this.pointerRectInside(pack.x, pack.y, st.currentRect) === true;
    } catch (eKeepCurrent) {
      keepCurrentOnDragTimeout = false;
    }

    if (keepCurrentOnDragTimeout) {
      // 超时不能证明目标已经离开。原地重试完成前保留严格命中的当前候选和悬停计时，
      // 避免一次 80~90ms 的预算耗尽把即将满足 800ms 的有效候选清空。
      try { this.refreshPointerTextReadyVisualState(now); } catch (eRefreshKeep) {}
      try { this.schedulePointerTextReadyVisualRefresh(); } catch (eScheduleKeep) {}
      try {
        safeLog(
          this.L,
          'd',
          "pointer drag timeout keep current candidate textLen=" +
          String(String(st.currentText || "").length) +
          " reason=" + timeoutReason
        );
      } catch (eKeepLog) {}
    }

    var candidateStillHit = false;
    try {
      candidateStillHit =
        !!st.boundRect &&
        this.pointerRectInside(pack.x, pack.y, st.boundRect) === true;
    } catch(eCandidateHit) {
      candidateStillHit = false;
    }

    var hoverLimitForReuse = Number(st.hoverMinMs || 800);
    if (isNaN(hoverLimitForReuse) || hoverLimitForReuse < 0) hoverLimitForReuse = 800;
    var candidateReuseMaxMs = Math.max(
      2000,
      Math.min(10000, hoverLimitForReuse * 4)
    );
    var candidateBoundAt = Number(st.boundAt || 0);
    var candidateAgeMs = candidateBoundAt > 0 ? now - candidateBoundAt : -1;
    var candidateFresh =
      candidateAgeMs >= 0 &&
      candidateAgeMs <= candidateReuseMaxMs;

    // 仅允许松手最终补扫在预算耗尽时复用仍位于当前热点下的近期候选。
    // drag、idle、screen_reflow 等扫描超时不能提升旧候选为 currentText。
    if (
      finalTimeout &&
      candidateStillHit &&
      candidateFresh &&
      st.boundText &&
      st.boundRect
    ) {
      try {
        st.currentText = String(st.boundText);
        st.currentRect = th17RectObj(st.boundRect);
        st.currentKey = st.boundKey || this.pointerTextKeyOf({ text: st.currentText, rect: st.currentRect });
        var recoveredHoverAt = finishAfterRelease && Number(st.releaseTs || 0) > 0 ?
          Number(st.releaseTs) : now;
        try {
          this.bindPointerTextHoverCandidate(
            st,
            st.currentKey,
            st.currentRect,
            recoveredHoverAt
          );
        } catch (eBindRecovered) {}
        recoveredByLastCandidate = true;
        this.refreshPointerTextReadyVisualState(recoveredHoverAt);
        this.schedulePointerTextReadyVisualRefresh();
        try {
          safeLog(this.L, 'w',
            "pointer inspect timeout reuse last candidate textLen=" + String(st.currentText.length) +
            " cost=" + String(pack.costMs) +
            " nodes=" + String(pack.nodes) +
            " windows=" + String(pack.windows) +
            " reason=" + String(pack.reason || "") +
            " ageMs=" + String(candidateAgeMs) +
            " maxAgeMs=" + String(candidateReuseMaxMs)
          );
        } catch(eReuseLog) {}
      } catch(eReuse) {
        recoveredByLastCandidate = false;
      }
    }

    if (!recoveredByLastCandidate && !keepCurrentOnDragTimeout) {
      try { this.invalidatePointerTextHoverCredential(st, "inspect_empty", true); } catch (eClearReadyTimer) {}
      st.currentText = "";
      st.currentRect = null;
      st.currentKey = "";
      st.hoverKey = "";
      st.hoverSince = 0;
      this.updatePointerVisualHot(false);
      this.hidePointerAreaFrame();
    }
  }
  try {
    if (Number(pack.costMs || 0) > 80 || pack.timedOut === true) {
      safeLog(this.L, 'i', "pointer inspect cost=" + String(pack.costMs) + " budget=" + String(pack.budgetMs || 0) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " scanned=" + String(pack.windowsScanned || 0) + " automation=" + String(pack.automationMs || 0) + " active=" + String(pack.activeRootMs || 0) + " windowsQuery=" + String(pack.windowsQueryMs || 0) + " windowsScan=" + String(pack.windowsScanMs || 0) + " reason=" + th17LogSingleLine(pack.reason, 80) + " partial=" + String(pack.partialWindows === true) + " skipReason=" + th17LogSingleLine(pack.skipReason, 40) + " timeout=" + String(pack.timedOut === true));
    }
  } catch (eLog) {}
  if (pack.finishAfterResult === true && st.active && !st.closed) {
    this.finishPointerTextPickAfterRelease();
  }
};

FloatBallAppWM.prototype.runPointerInspectWorker = function(st) {
  var self = this;
  if (!st || !st.inspectH || st.inspectRunning) return;
  var workerH = st.inspectH;
  var workerHt = st.inspectHt;
  var workerSession = st.inspectSession;
  st.inspectRunning = true;
  workerH.post(new JavaAdapter(java.lang.Runnable, {
    run: function() {
      var pack = null;
      var seq = 0;
      var session = workerSession;
      var finishAfter = false;
      try {
        if (workerSession !== st.inspectSession || workerH !== st.inspectH || workerHt !== st.inspectHt) return;
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
              try {
                if (workerSession !== st.inspectSession || workerH !== st.inspectH || workerHt !== st.inspectHt) return;
                if (pack) self.applyPointerInspectResult(pack);
              } catch (eApply) { safeLog(self.L, 'e', "applyPointerInspectResult fail: " + String(eApply)); }
              try {
                if (workerSession !== st.inspectSession || workerH !== st.inspectH || workerHt !== st.inspectHt) return;
                st.inspectRunning = false;
                if (st.inspectPending && st.active && !st.closed && !st.inspectClosed) self.runPointerInspectWorker(st);
              } catch (eNext) {}
            }
          }));
        } catch (ePost) {
          try {
            if (workerSession === st.inspectSession && workerH === st.inspectH && workerHt === st.inspectHt) st.inspectRunning = false;
          } catch (ePostReset) {}
        }
      }
    }
  }));
};

FloatBallAppWM.prototype.preparePointerAccessibilityFinalScan = function(reason) {
  var st = this.ensurePointerToolState();
  var automation = null;

  // 无障碍 final scan 前隐藏自身 overlay。
  // 否则部分 ROM / ShortX UiAutomation 在 overlay 可见时会返回 windows=0 / nodes=0。
  try { this.hidePointerAreaFrame(); } catch (eFrame) {}

  try {
    if (st.root) {
      st.root.setVisibility(android.view.View.GONE);
      safeLog(this.L, 'i', "pointer accessibility final scan hide overlay reason=" + String(reason || ""));
    }
  } catch (eHide) {
    try { safeLog(this.L, 'w', "pointer accessibility final scan hide overlay fail: " + String(eHide)); } catch (eLogHide) {}
  }

  try { java.lang.Thread.sleep(90); } catch (eSleep) {}

  try {
    // final_prepare 只清理一次缓存，随后把同一 automation 直接交给扫描阶段复用。
    automation = this.getPointerUiAutomation("final_prepare");
    if (automation) {
      try { if (automation.waitForIdle) automation.waitForIdle(50, 350); } catch (eIdle) {}
    }
  } catch (eUi) {
    automation = null;
    try { safeLog(this.L, 'w', "pointer accessibility final scan ui prepare fail: " + String(eUi)); } catch (eLogUi) {}
  }

  return automation;
};

FloatBallAppWM.prototype.schedulePointerInspectAsync = function(force, reason, finishAfterResult, allowStationary) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return false;
  var hp = this.getPointerHotspot();
  var reasonText = String(reason || "");

  // release_final / area_small_text_final 必须走当前线程同步扫描。
  // 实测后台 inspect worker 可能拿不到 UiAutomation root，表现为 cost 很低但 nodes=0。
  if (force === true && finishAfterResult === true) {
    var prepareStartedAt = th17Now();
    var finalAutomation = this.preparePointerAccessibilityFinalScan(reasonText);
    var finalPrepareMs = th17Now() - prepareStartedAt;
    st.inspectLatestX = hp.x;
    st.inspectLatestY = hp.y;
    st.inspectLatestSeq = ++st.inspectSeq;
    st.inspectLatestForce = true;
    st.inspectLatestReason = reasonText;

    var pack = null;
    try {
      pack = this.findPointerTextAtSnapshot(hp.x, hp.y, true, reasonText + "_sync", st.inspectLatestSeq, st.inspectSession, finalAutomation);
      pack.prepareMs = finalPrepareMs;
      pack.finishAfterResult = true;
      try {
        safeLog(this.L, 'i', "pointer release sync inspect prepare=" + String(pack.prepareMs || 0) + " cost=" + String(pack.costMs) + " budget=" + String(pack.budgetMs || 0) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " scanned=" + String(pack.windowsScanned || 0) + " automation=" + String(pack.automationMs || 0) + " active=" + String(pack.activeRootMs || 0) + " windowsQuery=" + String(pack.windowsQueryMs || 0) + " windowsScan=" + String(pack.windowsScanMs || 0) + " reason=" + String(pack.reason) + " timeout=" + String(pack.timedOut === true));
      } catch (eLogSync) {}
      this.applyPointerInspectResult(pack);
      return true;
    } catch (eSync) {
      try { safeLog(this.L, 'e', "pointer release sync inspect fail: " + String(eSync)); } catch (eLogFail) {}
      return false;
    }
  }

  var moved = Math.abs(hp.x - st.lastQueryX) > this.dp(4) || Math.abs(hp.y - st.lastQueryY) > this.dp(4);
  if (force !== true && !moved && allowStationary !== true) return false;
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
  return this.hasPointerTextHoverCredential(st, atTs, true) === true;
};

FloatBallAppWM.prototype.getPointerTextHoverRemainMs = function(atTs) {
  var st = this.ensurePointerToolState();
  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var elapsed = st.hoverSince ? (ts - Number(st.hoverSince || 0)) : 0;
  if (isNaN(elapsed) || elapsed < 0) elapsed = 0;
  var remain = this.getPointerTextHoverLimitMs() - elapsed;
  if (isNaN(remain) || remain < 0) remain = 0;
  return Math.ceil(remain);
};

FloatBallAppWM.prototype.refreshPointerTextReadyVisualState = function(atTs) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return false;
  if (!st.currentText || !st.currentRect) {
    this.updatePointerVisualHot(false);
    return false;
  }

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var ready = this.hasPointerTextHoverCredential(st, ts, true) === true;
  try { this.showPointerAreaFrame(st.currentRect, ready ? "text_hit" : "text_hover"); } catch(eFrameReady) {}
  this.updatePointerVisualHot(ready);
  try { if (st.root) st.root.invalidate(); } catch(eInvReady) {}
  return ready;
};

FloatBallAppWM.prototype.schedulePointerTextReadyVisualRefresh = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return false;
  if (!st.currentText || !st.currentRect || !st.hoverSince) return false;
  if (!this.pointerTextHotspotInsideRect(st.currentRect)) return false;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());

  try {
    if (st.textReadyRunnable) st.handler.removeCallbacks(st.textReadyRunnable);
  } catch(eRemoveReady) {}

  st.textReadyToken = Number(st.textReadyToken || 0) + 1;
  var token = st.textReadyToken;
  var session = Number(st.inspectSession || 0);
  var key = String(st.currentKey || "");
  var rectKey = th17RectKey(st.currentRect);
  var delay = this.getPointerTextHoverRemainMs(th17Now());
  if (delay <= 0) {
    this.refreshPointerTextReadyVisualState();
    return true;
  }

  var self = this;
  st.textReadyRunnable = new java.lang.Runnable({ run: function() {
    try {
      if (!st.active || st.closed || st.mode !== "text_pick") return;
      if (Number(st.textReadyToken || 0) !== token) return;
      if (Number(st.inspectSession || 0) !== session) return;
      if (String(st.currentKey || "") !== key) return;
      if (!st.currentRect || th17RectKey(st.currentRect) !== rectKey) return;
      self.refreshPointerTextReadyVisualState();
    } catch(eRunReady) {
      safeLog(self.L, 'e', "pointer text ready visual refresh fail: " + String(eRunReady));
    }
  }});

  try {
    st.handler.postDelayed(st.textReadyRunnable, Math.max(20, Number(delay || 0) + 10));
    return true;
  } catch(ePostReady) {
    return false;
  }
};

FloatBallAppWM.prototype.extractCurrentPointerText = function(skipInspect, releaseAtTs) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return { ok: false, err: "指针未启动" };
  if (skipInspect !== true) this.updatePointerInspect(true);

  var releaseTs = Number(releaseAtTs || th17Now());
  if (isNaN(releaseTs) || releaseTs <= 0) releaseTs = th17Now();
  var recent = null;
  if (!st.currentText || !st.currentRect) {
    try { recent = this.getRecentPointerPickForRelease(st, releaseTs); } catch (eRecent) { recent = null; }
    if (recent) {
      try { this.restoreRecentPointerPickForRelease(st, recent); } catch (eRestoreRecent) {}
    }
  }
  if (!st.currentText || !st.currentRect) {
    this.setPointerToolResult({ ok: false, type: "pointer_error", code: "NO_TEXT", message: "未命中文本" });
    this.toast("未命中文本");
    this.closePointerTool("未命中文本", true);
    return { ok: false, err: "未命中文本", code: "NO_TEXT" };
  }

  var insideFrame = false;
  try { insideFrame = this.pointerTextHotspotInsideRect(st.currentRect) === true; } catch (eInside) { insideFrame = false; }
  var credentialReady = false;
  try { credentialReady = this.hasPointerTextHoverCredential(st, releaseTs, true) === true; }
  catch (eCredential) { credentialReady = false; }

  if (!insideFrame || !credentialReady) {
    var hoverSince = Number(st.hoverSince || 0);
    var elapsedMs = hoverSince > 0 ? Math.max(0, releaseTs - hoverSince) : 0;
    var remainMs = Math.max(0, this.getPointerTextHoverLimitMs() - elapsedMs);
    var code = insideFrame ? "TEXT_HOVER_NOT_READY" : "TEXT_POINTER_OUTSIDE_FRAME";
    var message = insideFrame ? "悬停时间不足" : "指针不在文字边框内";
    this.setPointerToolResult({
      ok: false,
      type: "cancel",
      code: code,
      message: message,
      value: "",
      data: {
        elapsedMs: elapsedMs,
        remainMs: remainMs,
        hoverMinMs: this.getPointerTextHoverLimitMs(),
        insideFrame: insideFrame,
        currentKey: String(st.currentKey || "")
      }
    });
    this.toast(message);
    this.closePointerTool(message, true);
    return { ok: false, err: message, code: code };
  }

  var reason = String(st.inspectLastReason || st.inspectLatestReason || "");
  var successCode = "TEXT_PICK_SUCCESS";
  var source = "accessibility_current";
  var extra = {
    releaseTs: releaseTs,
    hoverSince: Number(st.textHoverReadySince || st.hoverSince || 0),
    readyAt: Number(st.textHoverReadyAt || 0),
    insideFrame: true
  };
  if (recent) {
    successCode = "TEXT_PICK_RECENT_CANDIDATE";
    source = "accessibility_recent_candidate";
    extra.ageMs = Number(recent.ageMs || 0);
  } else if (reason.indexOf("release_final") === 0 || reason.indexOf("area_small_text_final") === 0) {
    successCode = "TEXT_PICK_FINAL_SCAN";
    source = "accessibility_final_scan";
    extra.costMs = Number(st.inspectLastCostMs || 0);
    extra.prepareMs = Number(st.inspectLastPrepareMs || 0);
    extra.nodes = Number(st.inspectLastNodes || 0);
    extra.windows = Number(st.inspectLastWindows || 0);
    extra.windowsScanned = Number(st.inspectLastWindowsScanned || 0);
    extra.automationMs = Number(st.inspectLastAutomationMs || 0);
    extra.activeRootMs = Number(st.inspectLastActiveRootMs || 0);
    extra.windowsQueryMs = Number(st.inspectLastWindowsQueryMs || 0);
    extra.windowsScanMs = Number(st.inspectLastWindowsScanMs || 0);
  }

  var textValue = String(st.currentText);
  var completed = this.completePointerCandidateOnRelease(st, successCode, source, extra);
  var previewQueued = false;
  try { previewQueued = !!(st.lastResult && st.lastResult.preview === true); } catch (ePreviewState) { previewQueued = false; }
  return {
    ok: completed === true,
    pending: false,
    text: textValue,
    preview: previewQueued,
    clipboard: false
  };
};

FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return;
  var releaseTs = Number(st.releaseTs || th17Now());
  if (isNaN(releaseTs) || releaseTs <= 0) releaseTs = th17Now();

  if (!st.currentText || !st.currentRect) {
    try {
      var recentRelease = this.getRecentPointerPickForRelease(st, releaseTs);
      if (recentRelease) this.restoreRecentPointerPickForRelease(st, recentRelease);
    } catch (eRestoreRelease) {}
  }
  if (st.currentText && st.currentRect) {
    this.extractCurrentPointerText(true, releaseTs);
    return;
  }

  // W5：如果 final scan 是预算耗尽，不再报告为空白处松手。
  // 没有可复用候选时返回专用错误码，方便 ShortX 后续区分“没文本”和“扫描没扫完”。
  if (st.inspectLastTimedOut === true) {
    try {
      safeLog(this.L, 'w',
        "pointer release final scan timeout prepare=" + String(st.inspectLastPrepareMs || 0) +
        " cost=" + String(st.inspectLastCostMs || 0) +
        " nodes=" + String(st.inspectLastNodes || 0) +
        " windows=" + String(st.inspectLastWindows || 0) +
        " scanned=" + String(st.inspectLastWindowsScanned || 0) +
        " automation=" + String(st.inspectLastAutomationMs || 0) +
        " active=" + String(st.inspectLastActiveRootMs || 0) +
        " windowsQuery=" + String(st.inspectLastWindowsQueryMs || 0) +
        " windowsScan=" + String(st.inspectLastWindowsScanMs || 0) +
        " reason=" + String(st.inspectLastReason || st.inspectLatestReason || "")
      );
    } catch (eTimeoutLog) {}

    this.setPointerToolResult({
      ok: false,
      type: "pointer_error",
      code: "TEXT_SCAN_TIMEOUT",
      message: "取字扫描超时，未确认是否为空白",
      value: "",
      data: {
        prepareMs: Number(st.inspectLastPrepareMs || 0),
        costMs: Number(st.inspectLastCostMs || 0),
        nodes: Number(st.inspectLastNodes || 0),
        windows: Number(st.inspectLastWindows || 0),
        windowsScanned: Number(st.inspectLastWindowsScanned || 0),
        automationMs: Number(st.inspectLastAutomationMs || 0),
        activeRootMs: Number(st.inspectLastActiveRootMs || 0),
        windowsQueryMs: Number(st.inspectLastWindowsQueryMs || 0),
        windowsScanMs: Number(st.inspectLastWindowsScanMs || 0),
        reason: String(st.inspectLastReason || st.inspectLatestReason || ""),
        hint: "扫描预算耗尽，不等同于无文本"
      }
    });
    this.toast("取字扫描超时");
    this.closePointerTool("取字扫描超时", true);
    return;
  }

  try {
    safeLog(this.L, 'i',
      "pointer release final no accessibility text cost=" + String(st.inspectLastCostMs || 0) +
      " nodes=" + String(st.inspectLastNodes || 0) +
      " windows=" + String(st.inspectLastWindows || 0) +
      " reason=" + String(st.inspectLastReason || st.inspectLatestReason || "")
    );
  } catch (eNoTextLog) {}

  this.setPointerToolResult({
    ok: false,
    type: "cancel",
    code: "POINTER_RELEASE_EMPTY",
    message: "空白处松手，已关闭指针",
    value: "",
    data: {
      costMs: Number(st.inspectLastCostMs || 0),
      nodes: Number(st.inspectLastNodes || 0),
      windows: Number(st.inspectLastWindows || 0),
      reason: String(st.inspectLastReason || st.inspectLatestReason || "")
    }
  });
  this.closePointerTool("空白处松手", true);
};

FloatBallAppWM.prototype.finishPointerTextPickOnRelease = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return false;
  st.releaseTs = th17Now();

  // 有明确文字候选：在最终热点上统一校验 800ms 可提交凭证和严格边框命中。
  if (st.currentText && st.currentRect) {
    this.extractCurrentPointerText(true, st.releaseTs);
    return true;
  }

  // 无文字候选：不要立刻判空。松手时执行一次 release_final 强制补扫。
  // 解决拖动扫描异步返回滞后导致的 POINTER_RELEASE_EMPTY。
  try {
    st.inspectMaxFinalMs = Math.max(Number(st.inspectMaxFinalMs || 120), 220);
    st.inspectMaxFinalNodes = Math.max(Number(st.inspectMaxFinalNodes || 260), 900);
  } catch (eBudget) {
    st.inspectMaxFinalMs = 220;
    st.inspectMaxFinalNodes = 900;
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
  var completed = this.completePointerTextResult(
    textValue,
    rect,
    "TEXT_PICK_FALLBACK_FROM_SMALL_AREA",
    { source: "small_area_fallback", fallback: true }
  );
  var previewQueued = false;
  try { previewQueued = !!(st.lastResult && st.lastResult.preview === true); } catch (ePreviewState) { previewQueued = false; }
  return {
    ok: completed === true,
    text: textValue,
    preview: previewQueued,
    clipboard: false,
    fallback: true
  };
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
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_AREA_HEX", "POINTER_COLOR_AREA_HEX", 59, 130, 246);
          fillAlpha = 56;
          strokeAlpha = 245;
          strokeWidth = self.dp(2.4);
        } else if (kind === "text_hit") {
          rgb = th17PointerColorRgbWithFallback(self, "POINTER_FRAME_TEXT_READY_HEX", "POINTER_FRAME_TEXT_HOVER_HEX", 34, 197, 94);
          fillAlpha = 38;
          strokeAlpha = 248;
          strokeWidth = self.dp(2.3);
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

FloatBallAppWM.prototype.isPointerAreaCaptureTokenCurrent = function(st, token) {
  if (!st) return false;
  if (Number(st.areaCaptureSeq || 0) !== Number(token)) return false;
  if (Number(st.areaCaptureRunningToken || 0) !== Number(token)) return false;
  if (Number(st.areaCaptureDoneToken || 0) === Number(token)) return false;
  return true;
};

FloatBallAppWM.prototype.clearPointerAreaCaptureJobRefs = function(st, token, threadRef, timeoutRunnable) {
  if (!st) return;
  try {
    if (st.areaCaptureThread === threadRef) st.areaCaptureThread = null;
  } catch (eThreadRef) {}
  try {
    if (st.areaCaptureTimeoutRunnable === timeoutRunnable) {
      st.areaCaptureTimeoutRunnable = null;
    }
  } catch (eTimeoutRef) {}
  try {
    if (Number(st.areaCaptureRunningToken || 0) === Number(token)) {
      st.areaCaptureRunningToken = 0;
    }
  } catch (eRunningRef) {}
};

FloatBallAppWM.prototype.cancelPointerAreaCaptureJob = function(st, reason) {
  if (!st) st = this.ensurePointerToolState();

  var mainH = null;
  var timeoutRunnable = null;
  var threadRef = null;

  try {
    mainH = st.handler || this.state.h ||
      new android.os.Handler(android.os.Looper.getMainLooper());
  } catch (eMain) {
    mainH = null;
  }

  try { timeoutRunnable = st.areaCaptureTimeoutRunnable || null; }
  catch (eTimeoutGet) { timeoutRunnable = null; }

  try { threadRef = st.areaCaptureThread || null; }
  catch (eThreadGet) { threadRef = null; }

  st.areaCaptureSeq = Number(st.areaCaptureSeq || 0) + 1;
  st.areaCaptureRunningToken = 0;
  st.areaCaptureDoneToken = 0;

  try {
    if (mainH && timeoutRunnable) mainH.removeCallbacks(timeoutRunnable);
  } catch (eRemoveTimeout) {}

  try {
    if (threadRef && threadRef.interrupt) threadRef.interrupt();
  } catch (eInterrupt) {}

  st.areaCaptureTimeoutRunnable = null;
  st.areaCaptureThread = null;

  try {
    if (timeoutRunnable || threadRef) {
      safeLog(
        this.L,
        'i',
        "pointer area capture cancelled reason=" + String(reason || "")
      );
    }
  } catch (eLogCancel) {}

  return Number(st.areaCaptureSeq || 0);
};

FloatBallAppWM.prototype.getPointerAreaCaptureTimeoutMs = function() {
  var timeoutMs = 10000;
  try {
    timeoutMs = Number(
      this.config && this.config.POINTER_AREA_CAPTURE_TIMEOUT_MS
        ? this.config.POINTER_AREA_CAPTURE_TIMEOUT_MS
        : 10000
    );
  } catch (e0) {
    timeoutMs = 10000;
  }
  if (isNaN(timeoutMs)) timeoutMs = 10000;
  return Math.max(2000, Math.min(30000, timeoutMs));
};

FloatBallAppWM.prototype.deletePointerScreenshotPath = function(path) {
  var value = String(path || "");
  if (!value) return false;
  try {
    var file = new java.io.File(value);
    if (!file.exists()) return true;
    return file.delete() === true;
  } catch (e0) {
    return false;
  }
};

FloatBallAppWM.prototype.applyPointerAreaCaptureResult = function(
  st,
  token,
  threadRef,
  timeoutRunnable,
  captureRect,
  visualRect,
  screenshotPath,
  screenshotError
) {
  if (!this.isPointerAreaCaptureTokenCurrent(st, token)) {
    if (screenshotPath) this.deletePointerScreenshotPath(screenshotPath);
    return false;
  }

  st.areaCaptureDoneToken = Number(token);
  st.areaCaptureRunningToken = 0;
  st.areaProcessing = false;

  try {
    var mainH = st.handler || this.state.h ||
      new android.os.Handler(android.os.Looper.getMainLooper());
    if (mainH && timeoutRunnable) mainH.removeCallbacks(timeoutRunnable);
  } catch (eRemoveTimeout) {}

  var obj = {
    ok: screenshotPath ? true : false,
    type: "area_capture",
    code: screenshotPath
      ? "AREA_CAPTURE_SUCCESS"
      : "AREA_SCREENSHOT_FAILED",
    message: screenshotPath
      ? "框选截图完成"
      : "框选完成，截图失败",
    value: String(screenshotPath || ""),
    captureRect: captureRect,
    visualRect: visualRect,
    screenshotFilePath: String(screenshotPath || ""),
    data: {
      path: String(screenshotPath || ""),
      error: String(screenshotError || ""),
      async: true,
      token: Number(token)
    }
  };

  this.setPointerToolResult(obj);

  try {
    safeLog(
      this.L,
      screenshotPath ? 'i' : 'w',
      "pointer area_capture async result token=" + String(token) +
      " captureRect=" + th17RectKey(captureRect) +
      " visualRect=" + th17RectKey(visualRect) +
      " screenshot=" + String(screenshotPath || "") +
      " err=" + String(screenshotError || "")
    );
  } catch (eLog) {}

  try {
    if (screenshotPath) this.toast("框选截图完成: " + screenshotPath);
    else if (st && st.areaOcrRequested === true) this.toast("截图保存失败，继续识别");
    else this.toast("框选完成，截图失败");
  } catch (eToast) {}

  var ret = {
    ok: screenshotPath ? true : false,
    pending: false,
    type: "area_capture",
    code: obj.code,
    captureRect: captureRect,
    visualRect: visualRect,
    screenshotFilePath: String(screenshotPath || ""),
    err: String(screenshotError || "")
  };

  try {
    if (typeof this.onPointerAreaCaptureCompleted === "function") {
      this.onPointerAreaCaptureCompleted(st, token, obj, ret);
    }
  } catch (eCompleted) {
    try {
      safeLog(
        this.L,
        'e',
        "pointer area capture completion hook fail: " + String(eCompleted)
      );
    } catch (eCompletedLog) {}
  }

  this.clearPointerAreaCaptureJobRefs(
    st,
    token,
    threadRef,
    timeoutRunnable
  );
  return true;
};

FloatBallAppWM.prototype.schedulePointerAreaCaptureAsync = function(
  captureRect,
  visualRect
) {
  var st = this.ensurePointerToolState();
  var self = this;
  var threadRef = null;
  var timeoutRunnable = null;

  var token = this.cancelPointerAreaCaptureJob(
    st,
    "replace_area_capture"
  );

  st.areaCaptureRunningToken = Number(token);
  st.areaCaptureDoneToken = 0;
  st.areaProcessing = true;

  var pending = {
    ok: false,
    pending: true,
    type: "area_capture",
    code: "AREA_CAPTURE_PENDING",
    message: "框选完成，正在保存截图",
    value: "",
    captureRect: captureRect,
    visualRect: visualRect,
    screenshotFilePath: "",
    data: {
      path: "",
      error: "",
      async: true,
      token: Number(token)
    }
  };

  this.setPointerToolResult(pending);

  try {
    this.toast("框选完成，正在保存截图");
  } catch (eToastPending) {}

  // 立即关闭指针和框选 overlay，触摸结束回调不等待截图及 PNG 写盘。
  this.closePointerTool("框选截图处理中", true);

  var mainH = null;
  try {
    mainH = st.handler || this.state.h ||
      new android.os.Handler(android.os.Looper.getMainLooper());
  } catch (eMainHandler) {
    mainH = new android.os.Handler(android.os.Looper.getMainLooper());
  }

  var timeoutMs = this.getPointerAreaCaptureTimeoutMs();

  timeoutRunnable = new java.lang.Runnable({ run: function() {
    try {
      if (!self.isPointerAreaCaptureTokenCurrent(st, token)) return;

      st.areaCaptureDoneToken = Number(token);
      st.areaCaptureRunningToken = 0;
      st.areaProcessing = false;

      try {
        if (threadRef && threadRef.interrupt) threadRef.interrupt();
      } catch (eInterruptTimeout) {}

      var timeoutObj = {
        ok: false,
        pending: false,
        type: "area_capture",
        code: "AREA_CAPTURE_TIMEOUT",
        message: "框选截图超时",
        value: "",
        captureRect: captureRect,
        visualRect: visualRect,
        screenshotFilePath: "",
        data: {
          path: "",
          error: "截图超时 " + String(timeoutMs) + "ms",
          async: true,
          token: Number(token)
        }
      };
      self.setPointerToolResult(timeoutObj);

      try {
        if (typeof self.onPointerAreaCaptureCompleted === "function") {
          self.onPointerAreaCaptureCompleted(st, token, timeoutObj, {
            ok: false,
            pending: false,
            type: "area_capture",
            code: "AREA_CAPTURE_TIMEOUT",
            captureRect: captureRect,
            visualRect: visualRect,
            screenshotFilePath: "",
            err: timeoutObj.data.error
          });
        }
      } catch (eTimeoutCompleted) {
        try { safeLog(self.L, 'e', "pointer area capture timeout completion hook fail: " + String(eTimeoutCompleted)); } catch (eTimeoutCompletedLog) {}
      }

      try { self.toast("框选截图超时"); } catch (eToastTimeout) {}
      try {
        safeLog(
          self.L,
          'w',
          "pointer area capture timeout token=" + String(token) +
          " timeoutMs=" + String(timeoutMs) +
          " rect=" + th17RectKey(captureRect)
        );
      } catch (eLogTimeout) {}
    } catch (eTimeout) {
      try {
        safeLog(
          self.L,
          'e',
          "pointer area capture timeout runnable fail: " +
          String(eTimeout)
        );
      } catch (eLogTimeoutFail) {}
    } finally {
      self.clearPointerAreaCaptureJobRefs(
        st,
        token,
        threadRef,
        timeoutRunnable
      );
    }
  }});

  st.areaCaptureTimeoutRunnable = timeoutRunnable;

  try {
    mainH.postDelayed(timeoutRunnable, timeoutMs);
  } catch (ePostTimeout) {
    st.areaCaptureTimeoutRunnable = null;
  }

  threadRef = new java.lang.Thread(new java.lang.Runnable({
    run: function() {
      var screenshotPath = "";
      var screenshotError = "";

      try {
        // overlay 已在主线程移除；后台等待短暂稳定后再截图。
        try { java.lang.Thread.sleep(100); }
        catch (eSleep) {}

        if (!self.isPointerAreaCaptureTokenCurrent(st, token)) return;

        try {
          screenshotPath = self.capturePointerRectToPng(captureRect);
        } catch (eShot) {
          screenshotError = String(eShot);
        }

        try {
          mainH.post(new java.lang.Runnable({ run: function() {
            try {
              self.applyPointerAreaCaptureResult(
                st,
                token,
                threadRef,
                timeoutRunnable,
                captureRect,
                visualRect,
                screenshotPath,
                screenshotError
              );
            } catch (eApply) {
              try {
                safeLog(
                  self.L,
                  'e',
                  "pointer area capture async apply fail: " +
                  String(eApply)
                );
              } catch (eLogApply) {}
            }
          }}));
        } catch (ePostResult) {
          if (screenshotPath) {
            self.deletePointerScreenshotPath(screenshotPath);
          }
          self.clearPointerAreaCaptureJobRefs(
            st,
            token,
            threadRef,
            timeoutRunnable
          );
          try {
            safeLog(
              self.L,
              'e',
              "pointer area capture post result fail: " +
              String(ePostResult)
            );
          } catch (eLogPost) {}
        }
      } catch (eWorker) {
        screenshotError = String(eWorker);
        try {
          mainH.post(new java.lang.Runnable({ run: function() {
            self.applyPointerAreaCaptureResult(
              st,
              token,
              threadRef,
              timeoutRunnable,
              captureRect,
              visualRect,
              "",
              screenshotError
            );
          }}));
        } catch (ePostWorkerFail) {
          self.clearPointerAreaCaptureJobRefs(
            st,
            token,
            threadRef,
            timeoutRunnable
          );
        }
      }
    }
  }), "toolhub_area_capture_" + String(token));

  st.areaCaptureThread = threadRef;

  try {
    threadRef.start();
  } catch (eStartThread) {
    try {
      if (mainH && timeoutRunnable) mainH.removeCallbacks(timeoutRunnable);
    } catch (eRemoveStartTimeout) {}

    st.areaCaptureDoneToken = Number(token);
    st.areaCaptureRunningToken = 0;
    st.areaProcessing = false;

    this.setPointerToolResult({
      ok: false,
      pending: false,
      type: "area_capture",
      code: "AREA_CAPTURE_WORKER_FAILED",
      message: "截图任务启动失败",
      value: "",
      captureRect: captureRect,
      visualRect: visualRect,
      screenshotFilePath: "",
      data: {
        path: "",
        error: String(eStartThread),
        async: true,
        token: Number(token)
      }
    });

    this.clearPointerAreaCaptureJobRefs(
      st,
      token,
      threadRef,
      timeoutRunnable
    );

    try { this.toast("截图任务启动失败"); } catch (eToastStartFail) {}
    return {
      ok: false,
      pending: false,
      type: "area_capture",
      code: "AREA_CAPTURE_WORKER_FAILED",
      err: String(eStartThread)
    };
  }

  try {
    safeLog(
      this.L,
      'i',
      "pointer area capture async scheduled token=" + String(token) +
      " timeoutMs=" + String(timeoutMs) +
      " rect=" + th17RectKey(captureRect)
    );
  } catch (eLogSchedule) {}

  return pending;
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
  try {
    this.showPointerAreaFrame(
      visualRect || captureRect,
      "capture"
    );
  } catch (eProcessFrame) {}
  try { if (st.root) st.root.invalidate(); } catch (eProcessInv) {}

  // N4：截图、PNG 压缩和文件写入全部移到后台线程。
  // 当前触摸结束调用链只负责冻结矩形、写入 pending 状态和关闭 overlay。
  return this.schedulePointerAreaCaptureAsync(
    captureRect,
    visualRect
  );
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
  try { this.resetPointerTextStableHover(st, th17Now(), this.getPointerHotspot(), "drag_start"); } catch (eTextStableStart) {}
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
  try {
    this.cancelPointerAreaCaptureJob(
      st,
      "start_pointer_tool"
    );
  } catch (eCancelCaptureStart) {
    try {
      safeLog(
        this.L,
        'w',
        "cancel previous area capture fail: " +
        String(eCancelCaptureStart)
      );
    } catch (eCancelCaptureLog) {}
  }
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
