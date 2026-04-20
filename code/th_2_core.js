// @version 1.0.0
function FloatBallAppWM(logger) {
  this.L = logger || null;

  // # 加载配置
  this.config = ConfigManager.loadSettings();
  this.currentPanelKey = "main";
  this.panels = { main: ConfigManager.loadButtons() };

  // # 更新 Logger 配置（因为 Logger 初始化时是默认值）
  if (this.L) this.L.updateConfig(this.config);

  this.state = {
    receivers: [], // 存储广播接收器引用，用于 close 时注销
    wm: null,
    dm: null,
    density: 1.0,

    screen: { w: 0, h: 0 },
    lastRotation: -1,
    lastMonitorTs: 0,

    ht: null,
    h: null,

    addedBall: false,
    addedPanel: false,
    addedSettings: false,
    addedViewer: false,
    addedMask: false,

    ballRoot: null,
    ballContent: null,
    ballLp: null,

    panel: null,
    panelLp: null,

    settingsPanel: null,
    settingsPanelLp: null,

    viewerPanel: null,
    viewerPanelLp: null,

    mask: null,
    maskLp: null,

    loadedPos: null,
    lastSaveTs: 0,

    dragging: false,
    rawX: 0,
    rawY: 0,
    downX: 0,
    downY: 0,

    docked: false,
    dockSide: null,

    lastMotionTs: 0,
    idleDockRunnable: null,

    longPressArmed: false,
    longPressTriggered: false,
    longPressRunnable: null,

    displayListener: null,

    // # 设置面板：临时编辑缓存
    pendingUserCfg: null,
    pendingDirty: false,

    closing: false
  };

  // # 创建实例独立的 UI 工具对象，避免多实例共享颜色状态
  this.ui = {};
  var protoUi = FloatBallAppWM.prototype.ui;
  for (var _uiKey in protoUi) {
    this.ui[_uiKey] = protoUi[_uiKey];
  }
  this.ui.colors = {};

  // # 初始化莫奈动态配色（传入当前主题避免重复检测）
  try { this.refreshMonetColors(this.isDarkTheme()); } catch (eM) {}
}

// =======================【工具：dp/now/clamp】======================
FloatBallAppWM.prototype.dp = function(v) { return Math.floor(Number(v) * this.state.density); };
FloatBallAppWM.prototype.sp = function(v) { try { return Math.floor(Number(v) * context.getResources().getDisplayMetrics().scaledDensity); } catch (e) { return Math.floor(Number(v) * this.state.density); } };
FloatBallAppWM.prototype.now = function() { return new Date().getTime(); };
FloatBallAppWM.prototype.clamp = function(v, min, max) { if (v < min) return min; if (v > max) return max; return v; };
FloatBallAppWM.prototype.rectIntersect = function(ax, ay, aw, ah, bx, by, bw, bh) {
  return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay);
};

// # 这段代码的主要内容/用途：安全地在 UI 线程执行代码（用于后台线程回调更新 UI）
FloatBallAppWM.prototype.runOnUiThreadSafe = function(fn) {
  try {
    if (!fn) return;
    var self = this;
    // 优先使用 Activity 的 runOnUiThread，否则使用 View.post
    if (this.state && this.state.ballRoot) {
      this.state.ballRoot.post(new java.lang.Runnable({
        run: function() { try { fn.call(self); } catch(e) {} }
      }));
    } else {
      // 兜底：直接执行（如果已经在 UI 线程）或尝试使用 Handler
      try {
        var h = new android.os.Handler(android.os.Looper.getMainLooper());
        h.post(new java.lang.Runnable({
          run: function() { try { fn.call(self); } catch(e) {} }
        }));
      } catch(e) {
        // 最后兜底：直接执行
        try { fn.call(self); } catch(e2) {}
      }
    }
  } catch(e) {}
};

// # 这段代码的主要内容/用途：统一图标缓存（LRU），减少反复解码/反复走 PackageManager，降低卡顿与内存波动（不改变 UI 与功能）
// 优化后的图标缓存（带 Bitmap 回收，防止内存泄漏）
FloatBallAppWM.prototype._iconCache = {
  map: {},
  keys: [],
  max: 80,  // 减少缓存数量，降低内存压力

  get: function(key) {
    var item = this.map[key];
    if (!item) return null;
    // 移动到末尾（最近使用）
    var idx = this.keys.indexOf(key);
    if (idx > -1) {
      this.keys.splice(idx, 1);
      this.keys.push(key);
    }
    return item.dr;
  },

  put: function(key, drawable) {
    // 清理旧的
    if (this.map[key]) {
      this._remove(key);
    }

    // 空间检查：超过 80% 时批量清理 20%
    if (this.keys.length >= this.max * 0.8) {
      var removeCount = Math.floor(this.max * 0.2);
      for (var i = 0; i < removeCount && this.keys.length > 0; i++) {
        var oldKey = this.keys.shift();
        this._remove(oldKey);
      }
    }

    this.keys.push(key);
    this.map[key] = {dr: drawable, ts: Date.now()};
  },

  _remove: function(key) {
    var item = this.map[key];
    if (item && item.dr) {
      // 关键：回收 Bitmap，防止内存泄漏
      try {
        if (item.dr instanceof android.graphics.drawable.BitmapDrawable) {
          var bmp = item.dr.getBitmap();
          if (bmp && !bmp.isRecycled()) bmp.recycle();
        }
      } catch(e) {}
      delete this.map[key];
    }
  },

  clear: function() {
    for (var i = 0; i < this.keys.length; i++) {
      this._remove(this.keys[i]);
    }
    this.keys = [];
  }
};

// 兼容性封装（保持原有调用方式不变）
FloatBallAppWM.prototype._iconLruEnsure = function() {};
FloatBallAppWM.prototype._iconLruGet = function(key) {
  return this._iconCache.get(key);
};

FloatBallAppWM.prototype._iconLruPut = function(key, val) {
  try {
    this._iconLruEnsure(120);
    var k = String(key || "");
    if (!k) return;
    if (val == null) return;

    // # 若已存在，先移除旧顺序位置
    try {
      var ord = this._iconLru.order;
      for (var i = ord.length - 1; i >= 0; i--) {
        if (ord[i] === k) { ord.splice(i, 1); break; }
      }
      ord.push(k);
    } catch (eLru3) {}

    this._iconLru.map[k] = val;

    // # 超限清理：按最久未使用淘汰
    try {
      var maxN = Math.max(20, Math.floor(Number(this._iconLru.max || 120)));
      var ord2 = this._iconLru.order;
      while (ord2.length > maxN) {
        var oldK = ord2.shift();
        if (oldK != null) {
          try { delete this._iconLru.map[oldK]; } catch (eDel) {}
        }
      }
    } catch (eLru4) {}
  } catch (eLru5) {}
};


// =======================【工具：悬浮球图标（PNG 文件）】======================
// # 这段代码的主要内容/用途：从指定路径加载透明 PNG 作为悬浮球图标；带"文件大小/像素上限"保护；按目标尺寸采样解码，避免 system_server OOM。
FloatBallAppWM.prototype.loadBallIconDrawableFromFile = function(path, targetPx, maxBytes, maxPx) {
  try {
    var p = String(path || "");
    if (!p) return null;

    // # 统一 LRU 缓存：文件图标（按 path + targetPx + mtime + size 复用 Drawable，避免反复解码）
    var f = new java.io.File(p);
    if (!f.exists() || !f.isFile()) return null;

    var ckLru = null;
    try {
      ckLru = "file|" + p + "@" + String(targetPx == null ? "" : targetPx) + "@" + String(f.lastModified()) + "@" + String(f.length());
      var hitLru = this._iconLruGet(ckLru);
      if (hitLru) return hitLru;
    } catch (eLruF0) {}

    // # 文件大小限制（字节）
    var limitBytes = Math.max(0, Math.floor(Number(maxBytes || 0)));
    if (limitBytes > 0) {
      try {
        var sz = Number(f.length());
        if (sz > limitBytes) return null;
      } catch (eSz) { return null; }
    }

    // # 先只读尺寸（不解码）
    var opt = new android.graphics.BitmapFactory.Options();
    opt.inJustDecodeBounds = true;
    try { android.graphics.BitmapFactory.decodeFile(p, opt); } catch (eB0) { return null; }

    var w = Number(opt.outWidth || 0);
    var h = Number(opt.outHeight || 0);
    if (w <= 0 || h <= 0) return null;

    // # 像素边长上限（宽/高任意一边超限则拒绝）
    var limitPx = Math.max(0, Math.floor(Number(maxPx || 0)));
    if (limitPx > 0) {
      if (w > limitPx || h > limitPx) return null;
    }

    // # 计算采样倍率：按目标尺寸（一般为 iconSizePx）采样
    var tp = Math.max(1, Math.floor(Number(targetPx || 1)));
    // # 允许解码到目标的 2 倍以内，减少锯齿又不浪费内存
    var desired = Math.max(tp * 2, tp);

    var sample = 1;
    while ((w / sample) > desired || (h / sample) > desired) sample = sample * 2;
    if (sample < 1) sample = 1;

    var opt2 = new android.graphics.BitmapFactory.Options();
    opt2.inJustDecodeBounds = false;
    opt2.inSampleSize = sample;
    opt2.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;

    var bmp = null;
    try { bmp = android.graphics.BitmapFactory.decodeFile(p, opt2); } catch (eB1) { bmp = null; }
    if (bmp == null) return null;

    var d = new android.graphics.drawable.BitmapDrawable(context.getResources(), bmp);

    // # 写入统一 LRU 缓存
    try {
      if (ckLru) this._iconLruPut(ckLru, d);
    } catch (eLruF1) {}
    return d;
  } catch (e0) {
    return null;
  }
};

// =======================【工具：屏幕/旋转】======================
FloatBallAppWM.prototype.getScreenSizePx = function() {
  var m = new android.util.DisplayMetrics();
  try { this.state.wm.getDefaultDisplay().getRealMetrics(m); } catch (e) { this.state.wm.getDefaultDisplay().getMetrics(m); }
  return { w: m.widthPixels, h: m.heightPixels };
};
FloatBallAppWM.prototype.getRotation = function() { try { return this.state.wm.getDefaultDisplay().getRotation(); } catch (e) {} return -1; };

// =======================【工具：alpha/toast/vibrate】======================
FloatBallAppWM.prototype.withAlpha = function(colorInt, alpha01) { var a = Math.floor(Number(alpha01) * 255); return (colorInt & 0x00FFFFFF) | (a << 24); };
FloatBallAppWM.prototype.toast = function(msg) { try { android.widget.Toast.makeText(context, String(msg), 0).show(); } catch (e) {} };
FloatBallAppWM.prototype.vibrateOnce = function(ms) {
  if (!this.config.LONG_PRESS_HAPTIC_ENABLE) return;
  try {
    var vib = context.getSystemService(android.content.Context.VIBRATOR_SERVICE);
    if (!vib) return;
    var dur = Math.max(1, Math.floor(ms));
    if (android.os.Build.VERSION.SDK_INT >= 26) {
      var ve = android.os.VibrationEffect.createOneShot(dur, android.os.VibrationEffect.DEFAULT_AMPLITUDE);
      vib.vibrate(ve);
    } else {
      vib.vibrate(dur);
    }
  } catch (e) {}
};

// =======================【工具：UI样式辅助】======================
FloatBallAppWM.prototype.ui = {
    // 基础颜色
    colors: {
        // 以下为默认回退值，实例化时会被 refreshMonetColors() 覆盖为系统莫奈色
        primary: android.graphics.Color.parseColor("#005BC0"),
        primaryDark: android.graphics.Color.parseColor("#041E49"),
        accent: android.graphics.Color.parseColor("#00639B"),
        danger: android.graphics.Color.parseColor("#BA1A1A"),
        success: android.graphics.Color.parseColor("#15803d"),
        warning: android.graphics.Color.parseColor("#b45309"),

        bgLight: android.graphics.Color.parseColor("#F8F9FA"),
        bgDark: android.graphics.Color.parseColor("#131314"),

        cardLight: android.graphics.Color.parseColor("#E1E3E1"),
        cardDark: android.graphics.Color.parseColor("#49454F"),

        textPriLight: android.graphics.Color.parseColor("#1F1F1F"),
        textPriDark: android.graphics.Color.parseColor("#E3E3E3"),

        textSecLight: android.graphics.Color.parseColor("#5F6368"),
        textSecDark: android.graphics.Color.parseColor("#C4C7C5"),

        dividerLight: android.graphics.Color.parseColor("#747775"),
        dividerDark: android.graphics.Color.parseColor("#8E918F"),

        inputBgLight: android.graphics.Color.parseColor("#F8F9FA"),
        inputBgDark: android.graphics.Color.parseColor("#131314"),

        // Monet 扩展字段（供面板直接使用）
        _monetSurface: android.graphics.Color.parseColor("#F8F9FA"),
        _monetOnSurface: android.graphics.Color.parseColor("#1F1F1F"),
        _monetOutline: android.graphics.Color.parseColor("#747775"),
        _monetOnPrimary: android.graphics.Color.parseColor("#FFFFFF"),
        _monetPrimaryContainer: android.graphics.Color.parseColor("#D3E3FD"),
        _monetOnPrimaryContainer: android.graphics.Color.parseColor("#041E49"),
        _monetSecondary: android.graphics.Color.parseColor("#00639B"),
        _monetTertiary: android.graphics.Color.parseColor("#5C5891")
    },

    // 创建圆角背景 (Solid)
    createRoundDrawable: function(color, radiusPx) {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        d.setColor(color);
        d.setCornerRadius(radiusPx);
        return d;
    },

    // 创建圆角描边背景 (Stroke)
    createStrokeDrawable: function(fillColor, strokeColor, strokeWidthPx, radiusPx) {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        if (fillColor) d.setColor(fillColor);
        d.setCornerRadius(radiusPx);
        d.setStroke(strokeWidthPx, strokeColor);
        return d;
    },

    // 创建按压反馈背景 (StateList)
    createRippleDrawable: function(normalColor, pressedColor, radiusPx) {
        var sd = new android.graphics.drawable.StateListDrawable();
        var p = this.createRoundDrawable(pressedColor, radiusPx);
        var n = this.createRoundDrawable(normalColor, radiusPx);
        sd.addState([android.R.attr.state_pressed], p);
        sd.addState([], n);
        return sd;
    },

    // 创建纯色按压反馈 (StateList) - 用于透明背景按钮
    createTransparentRippleDrawable: function(pressedColor, radiusPx) {
        var sd = new android.graphics.drawable.StateListDrawable();
        var p = this.createRoundDrawable(pressedColor, radiusPx);
        var n = new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT);
        sd.addState([android.R.attr.state_pressed], p);
        sd.addState([], n);
        return sd;
    },

    // 辅助：创建扁平按钮
    createFlatButton: function(app, txt, txtColor, onClick) {
        var btn = new android.widget.TextView(context);
        btn.setText(txt);
        btn.setTextColor(txtColor);
        btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        btn.setPadding(app.dp(12), app.dp(6), app.dp(12), app.dp(6));
        btn.setGravity(android.view.Gravity.CENTER);
        // use divider color or just low alpha text color for ripple
        var rippleColor = app.withAlpha ? app.withAlpha(txtColor, 0.1) : 0x22888888;
        btn.setBackground(this.createTransparentRippleDrawable(rippleColor, app.dp(8)));
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) { app.touchActivity(); app.guardClick("ui_btn", INTERACTION_CONSTANTS.CLICK_COOLDOWN_MS, function(){ if(onClick) onClick(v); }); }
        }));
        return btn;
    },

    // 辅助：创建实心按钮
    createSolidButton: function(app, txt, bgColor, txtColor, onClick) {
        var btn = new android.widget.TextView(context);
        btn.setText(txt);
        btn.setTextColor(txtColor);
        btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        btn.setTypeface(null, android.graphics.Typeface.BOLD);
        btn.setPadding(app.dp(16), app.dp(8), app.dp(16), app.dp(8));
        btn.setGravity(android.view.Gravity.CENTER);
        var pressedColor = app.withAlpha ? app.withAlpha(bgColor, 0.8) : bgColor;
        btn.setBackground(this.createRippleDrawable(bgColor, pressedColor, app.dp(24)));
        try { btn.setElevation(app.dp(2)); } catch(e){}
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) { app.touchActivity(); app.guardClick("ui_btn", INTERACTION_CONSTANTS.CLICK_COOLDOWN_MS, function(){ if(onClick) onClick(v); }); }
        }));
        return btn;
    },

    // 辅助：创建带标签的输入组（支持粘贴）
    createInputGroup: function(app, label, initVal, isMultiLine, hint) {
        var box = new android.widget.LinearLayout(context);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        box.setPadding(0, 0, 0, app.dp(12));

        var topLine = new android.widget.LinearLayout(context);
        topLine.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        topLine.setGravity(android.view.Gravity.CENTER_VERTICAL);
        box.addView(topLine);

        var lb = new android.widget.TextView(context);
        lb.setText(label);
        lb.setTextColor(this.colors.textSecLight); // 默认用浅色主题副文本色，外部可覆盖
        try { if (app.isDarkTheme && app.isDarkTheme()) lb.setTextColor(this.colors.textSecDark); } catch(e){}
        lb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        var lpLb = new android.widget.LinearLayout.LayoutParams(0, -2);
        lpLb.weight = 1;
        topLine.addView(lb, lpLb);

        var et = new android.widget.EditText(context);
        et.setText(initVal ? String(initVal) : "");
        et.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        et.setTextColor(this.colors.textPriLight);
        try { if (app.isDarkTheme && app.isDarkTheme()) et.setTextColor(this.colors.textPriDark); } catch(e){}

        // 输入框背景优化
        var strokeColor = this.colors.dividerLight;
        try { if (app.isDarkTheme && app.isDarkTheme()) strokeColor = this.colors.dividerDark; } catch(e){}

        var bg = this.createStrokeDrawable(this.colors.inputBgLight, strokeColor, app.dp(1), app.dp(8));
        try { if (app.isDarkTheme && app.isDarkTheme()) bg = this.createStrokeDrawable(this.colors.inputBgDark, strokeColor, app.dp(1), app.dp(8)); } catch(e){}
        et.setBackground(bg);

        et.setPadding(app.dp(8), app.dp(8), app.dp(8), app.dp(8));
        if (hint) et.setHint(hint);

        if (isMultiLine) {
            et.setSingleLine(false);
            et.setMaxLines(4);
        } else {
            et.setSingleLine(true);
        }

        // 粘贴功能
        var pasteBtn = this.createFlatButton(app, "粘贴", this.colors.accent, function() {
            try {
                var cb = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
                if (cb.hasPrimaryClip()) {
                    var item = cb.getPrimaryClip().getItemAt(0);
                    if (item) {
                        var txt = item.getText();
                        if (txt) {
                            var st = String(txt);
                            var old = String(et.getText());
                            if (old.length > 0) et.setText(old + st);
                            else et.setText(st);
                            et.setSelection(et.getText().length());
                        }
                    }
                } else {
                    app.toast("剪贴板为空");
                }
            } catch (eP) {
                app.toast("粘贴失败: " + eP);
            }
        });
        // 调整粘贴按钮样式使其更紧凑
        pasteBtn.setPadding(app.dp(8), app.dp(2), app.dp(8), app.dp(2));
        pasteBtn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        topLine.addView(pasteBtn);

        box.addView(et);

        // 错误提示
        var errTv = new android.widget.TextView(context);
        errTv.setTextColor(this.colors.danger);
        errTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
        errTv.setVisibility(android.view.View.GONE);
        box.addView(errTv);

        var self = this;
        return {
            view: box,
            input: et,
            getValue: function() { return String(et.getText()); },
            setError: function(msg) {
                if (msg) {
                    errTv.setText(msg);
                    errTv.setVisibility(android.view.View.VISIBLE);
                    et.setBackground(self.createRoundDrawable(app.withAlpha(self.colors.danger, 0.2), app.dp(4)));
                } else {
                    errTv.setVisibility(android.view.View.GONE);
                    var strokeColor = self.colors.dividerLight;
                    try { if (app.isDarkTheme && app.isDarkTheme()) strokeColor = self.colors.dividerDark; } catch(e){}

                    var normalBg = self.createStrokeDrawable(self.colors.inputBgLight, strokeColor, app.dp(1), app.dp(8));
                    try { if (app.isDarkTheme && app.isDarkTheme()) normalBg = self.createStrokeDrawable(self.colors.inputBgDark, strokeColor, app.dp(1), app.dp(8)); } catch(e){}
                    et.setBackground(normalBg);
                }
            }
        };
    },

    // 辅助：创建标准面板容器
    createStyledPanel: function(app, paddingDp) {
        var isDark = app.isDarkTheme();
        var bgColor = isDark ? this.colors.bgDark : this.colors.bgLight;

        var panel = new android.widget.LinearLayout(context);
        panel.setOrientation(android.widget.LinearLayout.VERTICAL);

        var bgDr = new android.graphics.drawable.GradientDrawable();
        bgDr.setColor(bgColor);
        bgDr.setCornerRadius(app.dp(16));
        panel.setBackground(bgDr);
        try { panel.setElevation(app.dp(8)); } catch(e){}

        var p = (paddingDp !== undefined) ? app.dp(paddingDp) : app.dp(16);
        panel.setPadding(p, p, p, p);

        return panel;
    },

    // 辅助：创建标准标题栏容器
    createStyledHeader: function(app, paddingBottomDp) {
        var header = new android.widget.LinearLayout(context);
        header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        header.setGravity(android.view.Gravity.CENTER_VERTICAL);
        var pb = (paddingBottomDp !== undefined) ? app.dp(paddingBottomDp) : app.dp(8);
        header.setPadding(0, 0, 0, pb);
        return header;
    },

    // 辅助：创建占位符（撑开空间）
    createSpacer: function(app) {
        var dummy = new android.view.View(context);
        var dummyLp = new android.widget.LinearLayout.LayoutParams(0, 1);
        dummyLp.weight = 1;
        dummy.setLayoutParams(dummyLp);
        return dummy;
    }
};

// =======================【工具：主题/类莫奈颜色】======================
// # 主题调试日志工具（仅打印，不改变逻辑）
function _th_hex(c) {
  try {
    var Integer = Packages.java.lang.Integer;
    var s = Integer.toHexString(c);
    while (s.length < 8) s = "0" + s;
    return "0x" + s;
  } catch (e) {
    try { return String(c); } catch (e2) { return "<?>"; }
  }
}

function _th_argb(c) {
  try {
    var Color = Packages.android.graphics.Color;
    var ci = Math.floor(Number(c));
    if (isNaN(ci)) return "NaN";
    return "a=" + Color.alpha(ci) + " r=" + Color.red(ci) + " g=" + Color.green(ci) + " b=" + Color.blue(ci);
  } catch (e) {
    return "argb_err";
  }
}

function _th_log(L, level, msg) {
  try {
    if (!L) return;
    if (level === "e" && L.e) { L.e(msg); return; }
    if (level === "w" && L.w) { L.w(msg); return; }
    if (level === "i" && L.i) { L.i(msg); return; }
    if (L.d) { L.d(msg); return; }
  } catch (e) {}
}

// =======================【莫奈动态取色工具】======================
var MonetColorProvider = {
  _cacheLight: null,
  _cacheDark: null,

  _getResColor: function(resName, fallbackHex) {
    try {
      var res = android.content.res.Resources.getSystem();
      var id = res.getIdentifier(resName, "color", "android");
      if (id > 0) return res.getColor(id, null);
    } catch (e) {}
    try { return android.graphics.Color.parseColor(fallbackHex); } catch (e) { return 0; }
  },

  _getFallbackLight: function() {
    return {
      // 使用更接近 AOSP Monet 标准值的 fallback，日间 primary 更饱和、对比度更高
      primary: android.graphics.Color.parseColor("#005BC0"),
      onPrimary: android.graphics.Color.parseColor("#FFFFFF"),
      primaryContainer: android.graphics.Color.parseColor("#D3E3FD"),
      onPrimaryContainer: android.graphics.Color.parseColor("#041E49"),
      secondary: android.graphics.Color.parseColor("#00639B"),
      secondaryContainer: android.graphics.Color.parseColor("#C2E4FF"),
      tertiary: android.graphics.Color.parseColor("#5C5891"),
      surface: android.graphics.Color.parseColor("#F8F9FA"),
      onSurface: android.graphics.Color.parseColor("#1F1F1F"),
      surfaceVariant: android.graphics.Color.parseColor("#E1E3E1"),
      onSurfaceVariant: android.graphics.Color.parseColor("#5F6368"),
      outline: android.graphics.Color.parseColor("#747775"),
      outlineVariant: android.graphics.Color.parseColor("#C4C7C5"),
      error: android.graphics.Color.parseColor("#BA1A1A"),
      errorContainer: android.graphics.Color.parseColor("#F9DEDC"),
      onErrorContainer: android.graphics.Color.parseColor("#410E0B")
    };
  },

  _getFallbackDark: function() {
    return {
      primary: android.graphics.Color.parseColor("#A8C7FA"),
      onPrimary: android.graphics.Color.parseColor("#062E6F"),
      primaryContainer: android.graphics.Color.parseColor("#0842A0"),
      onPrimaryContainer: android.graphics.Color.parseColor("#D3E3FD"),
      secondary: android.graphics.Color.parseColor("#7FCFFF"),
      secondaryContainer: android.graphics.Color.parseColor("#004A77"),
      tertiary: android.graphics.Color.parseColor("#C2C5DD"),
      surface: android.graphics.Color.parseColor("#131314"),
      onSurface: android.graphics.Color.parseColor("#E3E3E3"),
      surfaceVariant: android.graphics.Color.parseColor("#49454F"),
      onSurfaceVariant: android.graphics.Color.parseColor("#C4C7C5"),
      outline: android.graphics.Color.parseColor("#8E918F"),
      outlineVariant: android.graphics.Color.parseColor("#49454F"),
      error: android.graphics.Color.parseColor("#F2B8B5"),
      errorContainer: android.graphics.Color.parseColor("#8C1D18"),
      onErrorContainer: android.graphics.Color.parseColor("#F9DEDC")
    };
  },

  _loadMonet: function(isDark) {
    var c = isDark ? this._getFallbackDark() : this._getFallbackLight();
    try {
      var res = android.content.res.Resources.getSystem();
      var map = isDark ? {
        primary: "system_accent1_200",
        onPrimary: "system_accent1_800",
        primaryContainer: "system_accent1_700",
        onPrimaryContainer: "system_accent1_100",
        secondary: "system_accent2_200",
        secondaryContainer: "system_accent2_700",
        tertiary: "system_accent3_200",
        surface: "system_neutral1_900",
        onSurface: "system_neutral1_100",
        surfaceVariant: "system_neutral2_700",
        onSurfaceVariant: "system_neutral2_200",
        outline: "system_neutral2_400",
        outlineVariant: "system_neutral2_700",
        error: "system_accent3_200",
        errorContainer: "system_accent3_800",
        onErrorContainer: "system_accent3_100"
      } : {
        primary: "system_accent1_600",
        onPrimary: "system_accent1_0",
        primaryContainer: "system_accent1_100",
        onPrimaryContainer: "system_accent1_900",
        secondary: "system_accent2_600",
        secondaryContainer: "system_accent2_100",
        tertiary: "system_accent3_600",
        surface: "system_neutral1_10",
        onSurface: "system_neutral1_900",
        surfaceVariant: "system_neutral2_100",
        onSurfaceVariant: "system_neutral2_700",
        outline: "system_neutral2_500",
        outlineVariant: "system_neutral2_200",
        error: "system_accent3_600",
        errorContainer: "system_accent3_100",
        onErrorContainer: "system_accent3_900"
      };
      for (var name in map) {
        try {
          var id = res.getIdentifier(map[name], "color", "android");
          if (id > 0) c[name] = res.getColor(id, null);
        } catch (e) {}
      }
    } catch (e) {}
    return c;
  },

  getColors: function(isDark) {
    if (isDark) {
      if (!this._cacheDark) this._cacheDark = this._loadMonet(true);
      return this._cacheDark;
    } else {
      if (!this._cacheLight) this._cacheLight = this._loadMonet(false);
      return this._cacheLight;
    }
  },

  invalidate: function() {
    this._cacheLight = null;
    this._cacheDark = null;
  }
};

// =======================【兼容兜底：themeTextInt/themeBgInt】======================
// 这段代码的主要内容/用途：兼容旧代码或异步回调里误引用 themeTextInt/themeBgInt 导致 ReferenceError 崩溃。
// 说明：当前版本文字色应通过 getPanelTextColorInt(bgInt) 获取；这里仅作为"兜底全局变量"，避免回调炸线程。

// 声明全局变量（避免 ReferenceError）
var themeBgInt = 0;
var themeTextInt = 0;

// =======================【API 兼容性辅助函数】======================
// 这段代码的主要内容/用途：处理 Android API 级别差异，避免在旧版本上崩溃

/**
 * 安全创建 UserHandle（兼容 API 17 以下）
 * @param {number} userId - 用户 ID
 * @returns {android.os.UserHandle} UserHandle 对象或 null
 */
function createUserHandle(userId) {
  try {
    // UserHandle.of 在 API 17+ 可用
    if (android.os.Build.VERSION.SDK_INT >= 17) {
      return android.os.UserHandle.of(userId);
    }
    // API 17 以下返回当前用户句柄
    return android.os.Process.myUserHandle();
  } catch (e) {
    return null;
  }
}

/**
 * 安全启动 Activity 跨用户（兼容 API 17 以下）
 * @param {Context} ctx - Context
 * @param {Intent} intent - Intent
 * @param {number} userId - 用户 ID（API 17+ 有效）
 */
function startActivityAsUserSafe(ctx, intent, userId) {
  try {
    if (android.os.Build.VERSION.SDK_INT >= 17 && userId !== 0) {
      var uh = android.os.UserHandle.of(userId);
      ctx.startActivityAsUser(intent, uh);
    } else {
      ctx.startActivity(intent);
    }
  } catch (e) {
    // 降级到普通启动
    try {
      ctx.startActivity(intent);
    } catch (e2) {}
  }
}

FloatBallAppWM.prototype.isDarkTheme = function() {
  // 0) 优先检查用户强制设置 (0=跟随系统, 1=白天, 2=黑夜)
  var mode = 0;
  try { mode = Math.floor(Number(this.config.THEME_MODE || 0)); } catch(e){}

  if (mode === 2) return true;
  if (mode === 1) return false;

  // mode === 0 (or others) -> Fallback to system detection
  // 这段代码的主要内容/用途：更稳健地判断当前是否处于"夜间/暗色"模式（并打印调试日志）。
  // 说明：system_server 场景下 Configuration.uiMode 偶发不一致，因此再用 UiModeManager 兜底交叉验证。
  var result = false;
  var from = "unknown";

  try {
    // # 1) 优先用 Configuration（最快）
    var uiMode = context.getResources().getConfiguration().uiMode;
    var nightMask = (uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK);
    if (nightMask === android.content.res.Configuration.UI_MODE_NIGHT_YES) { result = true; from = "Configuration(UI_MODE_NIGHT_YES)"; }
    else if (nightMask === android.content.res.Configuration.UI_MODE_NIGHT_NO) { result = false; from = "Configuration(UI_MODE_NIGHT_NO)"; }
  } catch (e1) {}

  if (from === "unknown") {
    try {
      // # 2) 再用 UiModeManager（更"系统态"）
      var um = context.getSystemService(android.content.Context.UI_MODE_SERVICE);
      if (um) {
        var nm = um.getNightMode();
        if (nm === android.app.UiModeManager.MODE_NIGHT_YES) { result = true; from = "UiModeManager(MODE_NIGHT_YES)"; }
        else if (nm === android.app.UiModeManager.MODE_NIGHT_NO) { result = false; from = "UiModeManager(MODE_NIGHT_NO)"; }
        else { from = "UiModeManager(mode=" + String(nm) + ")"; }
      }
    } catch (e2) {}
  }

  // # 3) 实在判断不了，就按"非暗色"处理，避免自动主题背景黑成一片
  if (from === "unknown") { result = false; from = "fallback(false)"; }

  // 仅在状态改变时打印日志，避免刷屏
  var logKey = String(result) + "|" + from + "|" + mode;
  if (this._lastDarkThemeLog !== logKey) {
      this._lastDarkThemeLog = logKey;
      try { _th_log(this.L, "d", "[theme] isDarkTheme=" + String(result) + " via=" + from + " mode=" + mode); } catch (e3) {}
  }

  // # 主题切换时刷新莫奈配色（传入 result 避免递归）
  // 注：构造函数中会初始化，这里只在构造完成后的切换时触发
  if (this._lastDarkResult !== undefined && this._lastDarkResult !== result) {
    this._lastDarkResult = result;
    try { this.refreshMonetColors(result); } catch (eM) {}
  } else if (this._lastDarkResult === undefined) {
    this._lastDarkResult = result;
  }

  return result;
};

FloatBallAppWM.prototype.refreshMonetColors = function(forceDark) {
  try {
    var isDark = (forceDark !== undefined) ? forceDark : this.isDarkTheme();
    var m = MonetColorProvider.getColors(isDark);
    var ml = MonetColorProvider.getColors(false);
    var md = MonetColorProvider.getColors(true);
    var c = this.ui.colors;

    // 浅色配色
    c.bgLight = ml.surface;
    c.cardLight = ml.surfaceVariant;
    c.textPriLight = ml.onSurface;
    c.textSecLight = ml.onSurfaceVariant;
    c.dividerLight = ml.outline;
    c.inputBgLight = ml.surface;

    // 深色配色
    c.bgDark = md.surface;
    c.cardDark = md.surfaceVariant;
    c.textPriDark = md.onSurface;
    c.textSecDark = md.onSurfaceVariant;
    c.dividerDark = md.outline;
    c.inputBgDark = md.surface;

    // 当前主题配色（随主题切换）
    c.primary = m.primary;
    // primaryDark 修正为 onPrimaryContainer：日间为深蓝(#041E49)，夜间为浅蓝(#D3E3FD)，符合"深色变体"语义
    c.primaryDark = m.onPrimaryContainer;
    c.accent = m.secondary;
    c.danger = m.error;
    // success/warning 优化对比度：日间更深确保可见，夜间保持适度亮度不刺眼
    c.success = isDark ? android.graphics.Color.parseColor("#4ade80") : android.graphics.Color.parseColor("#15803d");
    c.warning = isDark ? android.graphics.Color.parseColor("#fbbf24") : android.graphics.Color.parseColor("#b45309");

    // 扩展：完整 Monet 语义字段（供面板方法直接使用）
    c._monetSurface = m.surface;
    c._monetOnSurface = m.onSurface;
    c._monetOutline = m.outline;
    c._monetOnPrimary = m.onPrimary;
    c._monetPrimaryContainer = m.primaryContainer;
    c._monetOnPrimaryContainer = m.onPrimaryContainer;
    c._monetSecondary = m.secondary;
    c._monetTertiary = m.tertiary;

    try { _th_log(this.L, "d", "[monet] refreshed isDark=" + isDark + " primary=" + _th_hex(c.primary) + " primaryDark=" + _th_hex(c.primaryDark) + " accent=" + _th_hex(c.accent)); } catch (e) {}
  } catch (e) {
    try { _th_log(this.L, "e", "[monet] refresh err=" + String(e)); } catch (e2) {}
  }
};

FloatBallAppWM.prototype.getMonetAccentForBall = function() {
  // 这段代码的主要内容/用途：尝试读取系统动态强调色（Monet/accent）；失败则使用兜底颜色；并打印命中信息。
  // 优化点：
  //   1) 日间使用 500/600 档（更深、对比度更高），夜间使用 400/300 档（柔和、不刺眼）
  //   2) 移除 system_neutral1_* 中性灰色（不是强调色）
  var res = context.getResources();
  var dark = this.isDarkTheme();
  var names = dark
    ? ["system_accent1_400", "system_accent1_300", "system_accent2_400"]
    : ["system_accent1_500", "system_accent1_600", "system_accent2_500"];

  var i;
  for (i = 0; i < names.length; i++) {
    try {
      var id = res.getIdentifier(names[i], "color", "android");
      if (id > 0) {
        var c = res.getColor(id, null);
        var logKey = "hit|" + names[i] + "|" + c;
        if (this._lastAccentLog !== logKey) {
            this._lastAccentLog = logKey;
            try { _th_log(this.L, "d", "[theme] hit accent=" + names[i] + " id=" + String(id) + " c=" + _th_hex(c) + " " + _th_argb(c)); } catch (eL0) {}
        }
        return c;
      }
    } catch (e) {
      try { _th_log(this.L, "w", "[theme] err accent=" + names[i] + " e=" + String(e)); } catch (eL2) {}
    }
  }

  var fbHex = dark
    ? (this.config.BALL_FALLBACK_DARK || CONST_BALL_FALLBACK_DARK)
    : (this.config.BALL_FALLBACK_LIGHT || CONST_BALL_FALLBACK_LIGHT);
  var fb = android.graphics.Color.parseColor(fbHex);
  var logKeyFb = "miss_all|" + fb;
  if (this._lastAccentLog !== logKeyFb) {
      this._lastAccentLog = logKeyFb;
      try { _th_log(this.L, "w", "[theme] accent miss all, fallback=" + _th_hex(fb) + " " + _th_argb(fb)); } catch (eL3) {}
  }
  return fb;
};

FloatBallAppWM.prototype.updateBallContentBackground = function(contentView) {
  try {
    var ballColor = this.getMonetAccentForBall();
    var dark = this.isDarkTheme();
    var alpha01 = dark ? this.config.BALL_RIPPLE_ALPHA_DARK : this.config.BALL_RIPPLE_ALPHA_LIGHT;
    var rippleColor = this.withAlpha(ballColor, alpha01);

    // # 自定义 PNG/APP 模式下：背景透明
    var fillColor = ballColor;
    var _usedKind = "none";
    try { _usedKind = this.state.usedIconKind || "none"; } catch(eK){}

    try {
      var _pngModeBg = Number(this.config.BALL_PNG_MODE || 0);
      if ((_pngModeBg === 1 && _usedKind === "file") || _usedKind === "app") {
        fillColor = android.graphics.Color.TRANSPARENT;
      }
    } catch (eBg) {}

    var content = new android.graphics.drawable.GradientDrawable();
    content.setShape(android.graphics.drawable.GradientDrawable.OVAL);
    content.setColor(fillColor);

    // # 描边：根据球体颜色亮度自动选择白/黑描边，确保任何背景下都可见
    if (_usedKind !== "file" && _usedKind !== "app") {
      try {
        var Color = android.graphics.Color;
        var lum = (Color.red(fillColor)*0.299 + Color.green(fillColor)*0.587 + Color.blue(fillColor)*0.114) / 255.0;
        var strokeInt = lum > 0.55
          ? Color.parseColor("#33000000")   // 浅球用半透明黑边
          : Color.parseColor("#55FFFFFF");  // 深球用半透明白边
        content.setStroke(this.dp(1), strokeInt);
      } catch(eS){}
    }

    var mask = new android.graphics.drawable.GradientDrawable();
    mask.setShape(android.graphics.drawable.GradientDrawable.OVAL);
    mask.setColor(android.graphics.Color.WHITE);

    contentView.setBackground(new android.graphics.drawable.RippleDrawable(
      android.content.res.ColorStateList.valueOf(rippleColor),
      content,
      mask
    ));
  } catch (e) {}
};


FloatBallAppWM.prototype.safeParseColor = function(hex, fallbackInt) {
  // 这段代码的主要内容/用途：安全解析 #RRGGBB/#AARRGGBB，解析失败直接回退，避免 system_server 抛异常。
  try { return android.graphics.Color.parseColor(String(hex)); } catch (e) { return fallbackInt; }
};



FloatBallAppWM.prototype.getPanelBgColorInt = function() {
  // 这段代码的主要内容/用途：配合"白天/夜晚"两档主题，返回统一的背景颜色（不再依赖自动亮度推断）。
  var isDark = this.isDarkTheme();

  var dayBgHex = (this.config.THEME_DAY_BG_HEX != null) ? String(this.config.THEME_DAY_BG_HEX) : null;
  var nightBgHex = (this.config.THEME_NIGHT_BG_HEX != null) ? String(this.config.THEME_NIGHT_BG_HEX) : null;

  // # 兼容旧版默认配色：若仍为旧默认值，自动回退到莫奈色
  if (dayBgHex === "#FAF4E3") dayBgHex = null;
  if (nightBgHex === "#191928") nightBgHex = null;

  // # 未配置时使用莫奈 surface 色作为回退
  var dayFallback = this.ui.colors.bgLight || android.graphics.Color.parseColor("#F8F9FA");
  var nightFallback = this.ui.colors.bgDark || android.graphics.Color.parseColor("#131314");

  var base = isDark
    ? (nightBgHex ? this.safeParseColor(nightBgHex, nightFallback) : nightFallback)
    : (dayBgHex ? this.safeParseColor(dayBgHex, dayFallback) : dayFallback);

  // # 继承原配置：面板背景透明度（0~1）
  var a = 1.0;
  try { a = Number(this.config.PANEL_BG_ALPHA); } catch (e1) { a = 0.85; }
  if (!(a >= 0.0 && a <= 1.0)) a = 0.85;

  var out = this.withAlpha(base, a);

  try { _th_log(this.L, "d", "[t]bg isDark=" + isDark + " o=" + _th_hex(out)); } catch (e2) {}

  return out;
};

FloatBallAppWM.prototype.getPanelTextColorInt = function(bgInt) {
  // 这段代码的主要内容/用途：配合"白天/夜晚"两档主题，返回统一的文字颜色（不再依赖自动亮度推断）。
  var isDark = this.isDarkTheme();

  var dayTextHex = (this.config.THEME_DAY_TEXT_HEX != null) ? String(this.config.THEME_DAY_TEXT_HEX) : null;
  var nightTextHex = (this.config.THEME_NIGHT_TEXT_HEX != null) ? String(this.config.THEME_NIGHT_TEXT_HEX) : null;

  // # 兼容旧版默认配色：若仍为旧默认值，自动回退到莫奈色
  if (dayTextHex === "#333333") dayTextHex = null;
  if (nightTextHex === "#E6E6F0") nightTextHex = null;

  // # 未配置时使用莫奈 onSurface 色作为回退
  var dayFallback = this.ui.colors.textPriLight || android.graphics.Color.parseColor("#1F1F1F");
  var nightFallback = this.ui.colors.textPriDark || android.graphics.Color.parseColor("#E3E3E3");

  if (!isDark) return dayTextHex ? this.safeParseColor(dayTextHex, dayFallback) : dayFallback;
  return nightTextHex ? this.safeParseColor(nightTextHex, nightFallback) : nightFallback;
};

FloatBallAppWM.prototype.applyTextColorRecursive = function(v, colorInt) {
  // 这段代码的主要内容/用途：递归设置面板内所有 TextView 的文字颜色（标题/按钮文字/描述/设置项等）。
  try {
    if (!v) return;
    if (v instanceof android.widget.TextView) {
      v.setTextColor(colorInt);
    }
    if (v instanceof android.view.ViewGroup) {
      var i, n = v.getChildCount();
      for (i = 0; i < n; i++) {
        this.applyTextColorRecursive(v.getChildAt(i), colorInt);
      }
    }
  } catch (e0) {}
};

FloatBallAppWM.prototype.updatePanelBackground = function(panelView) {
  // 这段代码的主要内容/用途：统一为"主面板/设置面板/查看器面板"应用背景与文字颜色（自动/亮/暗三档），并输出调试日志（命中哪个颜色）。
  try {
    var bg = new android.graphics.drawable.GradientDrawable();
    bg.setCornerRadius(this.dp(22));

    var bgInt = this.getPanelBgColorInt();
    bg.setColor(bgInt);

    // 轻量描边：亮色时更明显，暗色时也保留一点边界（不提供自定义输入，避免设置页复杂化）
    var sw = this.dp(1);
    var isDark = this.isDarkTheme();
    var outlineColor = this.ui.colors._monetOutline || (isDark ? android.graphics.Color.parseColor("#8E918F") : android.graphics.Color.parseColor("#747775"));
    var stroke = this.withAlpha(outlineColor, isDark ? 0.26 : 0.20);
    try { bg.setStroke(sw, stroke); } catch (eS) {}

    panelView.setBackground(bg);

    var tc = this.getPanelTextColorInt(bgInt);
    try { themeBgInt = bgInt; themeTextInt = tc; } catch (eT) {}
    this.applyTextColorRecursive(panelView, tc);

    try { _th_log(this.L, "d", "[t]apply bg=" + _th_hex(bgInt) + " tx=" + _th_hex(tc)); } catch (e) {}


    try {
      _th_log(this.L, "d",
        "[theme:apply] isDark=" + isDark +
        " bg=" + _th_hex(bgInt) + " " + _th_argb(bgInt) +
        " text=" + _th_hex(tc) + " " + _th_argb(tc) +
        " stroke=" + _th_hex(stroke)
      );
    } catch (eL0) {}
  } catch (e) {
    try { _th_log(this.L, "e", "[theme:apply] err=" + String(e)); } catch (eL1) {}
  }
};

// =======================【工具：面板位置持久化】======================
FloatBallAppWM.prototype.savePanelState = function(key, state) {
  if (!key || !state) return;
  try {
    if (!this.config.PANEL_STATES) this.config.PANEL_STATES = {};
    this.config.PANEL_STATES[key] = state;
    // 节流或立即保存? 面板拖动结束通常不频繁，立即保存即可
    // 但为了避免连续事件，还是可以复用 savePos 的节流逻辑，或者直接保存
    ConfigManager.saveSettings(this.config);
  } catch (e) {}
};

FloatBallAppWM.prototype.loadPanelState = function(key) {
  if (!key || !this.config.PANEL_STATES) return null;
  return this.config.PANEL_STATES[key];
};

// =======================【工具：位置持久化】======================
FloatBallAppWM.prototype.savePos = function(x, y) {
  try {
    this.config.BALL_INIT_X = Math.floor(x);
    this.config.BALL_INIT_Y_DP = Math.floor(y / this.state.density);
    // # 节流保存
    return ConfigManager.saveSettings(this.config);
  } catch (e) { return false; }
};

FloatBallAppWM.prototype.loadSavedPos = function() {
  // # 直接从 config 返回，因为 config 已经是持久化的
  var x = Number(this.config.BALL_INIT_X || 0);
  var y = this.dp(Number(this.config.BALL_INIT_Y_DP || 100));
  return { x: x, y: y };
};

FloatBallAppWM.prototype.trySavePosThrottled = function(x, y) {
  var t = this.now();
  if (t - this.state.lastSaveTs < this.config.SAVE_THROTTLE_MS) return false;
  this.state.lastSaveTs = t;
  return this.savePos(x, y);
};

// =======================【工具：配置持久化】======================
FloatBallAppWM.prototype.saveConfig = function(obj) {
  try {
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        this.config[k] = obj[k];
      }
    }
    if (this.L) this.L.updateConfig(this.config);
    return ConfigManager.saveSettings(this.config);
  } catch (e) { return false; }
};

// =======================【设置面板：schema】======================
FloatBallAppWM.prototype.getConfigSchema = function() {
  return ConfigManager.loadSchema();
};

// =======================【设置面板：临时编辑缓存】======================
FloatBallAppWM.prototype.beginEditConfig = function() {
  try {
    var schema = this.getConfigSchema();
    var p = {};
    var i;
    for (i = 0; i < schema.length; i++) {
      if (!schema[i] || !schema[i].key) continue;
      var k = String(schema[i].key);
      p[k] = this.config[k];
    }
    this.state.pendingUserCfg = p;
    this.state.pendingDirty = false;
    return true;
  } catch (e0) {
    this.state.pendingUserCfg = null;
    this.state.pendingDirty = false;
    return false;
  }
};
FloatBallAppWM.prototype.getPendingValue = function(k) {
  if (this.state.pendingUserCfg && this.state.pendingUserCfg.hasOwnProperty(k)) return this.state.pendingUserCfg[k];
  return this.config[k];
};
FloatBallAppWM.prototype.setPendingValue = function(k, v) {
  if (!this.state.pendingUserCfg) this.beginEditConfig();
  this.state.pendingUserCfg[k] = v;
  this.state.pendingDirty = true;
  if (this.state.previewMode) {
      this.refreshPreview(k);
  }
};

FloatBallAppWM.prototype.getEffectiveConfig = function() {
    if (!this.state.previewMode || !this.state.pendingUserCfg) return this.config;
    var cfg = {};
    for (var k in this.config) { cfg[k] = this.config[k]; }
    for (var k in this.state.pendingUserCfg) { cfg[k] = this.state.pendingUserCfg[k]; }
    return cfg;
};

FloatBallAppWM.prototype.refreshPreview = function(changedKey) {
    if (this.state.closing) return;
    var self = this;
    // Post to next tick to avoid destroying view during event dispatch (fixes crash on switch toggle)
    if (this.state.h) {
        this.state.h.post(new JavaAdapter(java.lang.Runnable, {
            run: function() { self._refreshPreviewInternal(changedKey); }
        }));
    } else {
        self._refreshPreviewInternal(changedKey);
    }
};

FloatBallAppWM.prototype._refreshPreviewInternal = function(changedKey) {
    if (this.state.closing) return;
    var originalConfig = this.config;
    try {
        // 使用临时配置
        this.config = this.getEffectiveConfig();

        var needBall = false;
        var needPanel = false;

        if (!changedKey) {
            needBall = true;
            needPanel = true;
        } else {
            // 根据修改的 key 判断需要刷新什么，避免全量刷新导致闪烁
            if (changedKey.indexOf("BALL_") === 0) needBall = true;
            if (changedKey.indexOf("PANEL_") === 0) needPanel = true;
            // 球大小改变会影响面板位置
            if (changedKey === "BALL_SIZE_DP") needPanel = true;
        }

        // 1. 刷新悬浮球 (保持面板不关闭)
        if (needBall) {
            this.rebuildBallForNewSize(true);
        }

        // 2. 刷新主面板预览
        if (needPanel) {
            // 如果当前没有显示主面板，则创建并显示；如果已显示，则替换

            var panel = this.buildPanelView("main");

            // 计算位置 (使用当前球的位置)
            var maxH = Math.floor(this.state.screen.h * 0.75);
            panel.measure(
                android.view.View.MeasureSpec.makeMeasureSpec(this.state.screen.w, android.view.View.MeasureSpec.AT_MOST),
                android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
            );
            var pw = panel.getMeasuredWidth();
            var ph = panel.getMeasuredHeight();
            if (ph > maxH) ph = maxH;

            var bx = this.state.ballLp.x;
            var by = this.state.ballLp.y;
            var px = this.computePanelX(bx, pw);
            var py = by;

            // 尝试调整 Y
            var r = this.tryAdjustPanelY(px, py, pw, ph, bx, by);
            var finalX = r.ok ? r.x : px;
            var finalY = r.ok ? r.y : this.clamp(py, 0, this.state.screen.h - ph);

            // 优化闪烁：先添加新面板，再移除旧面板 (这样新面板会在最上层，符合预览需求)
            var oldPanel = this.state.panel;
            var oldAdded = this.state.addedPanel;

            // 添加新面板 (addPanel 会更新 this.state.panel)
            // 注意：addPanel 中已为 main 添加 FLAG_NOT_FOCUSABLE，所以即使在最上层也不会抢走 Settings 的输入焦点
            this.addPanel(panel, finalX, finalY, "main");

            // 移除旧面板
            if (oldAdded && oldPanel) {
                try { this.state.wm.removeView(oldPanel); } catch(e) {}
            }
        }

    } catch(e) {
        safeLog(this.L, 'e',  "refreshPreview err=" + e);
    } finally {
        this.config = originalConfig;
    }
};
FloatBallAppWM.prototype.persistUserCfgFromObject = function(obj) {
  // # 这段代码的主要内容/用途：从临时编辑对象里按 schema 白名单抽取并保存（跳过 section 标题等无 key 项）
  try {
    var schema = this.getConfigSchema();
    var out = {};
    var i;
    for (i = 0; i < schema.length; i++) {
      if (!schema[i] || !schema[i].key) continue;
      var k = String(schema[i].key);
      out[k] = obj[k];
    }
    return this.saveConfig(out);
  } catch (e0) { return false; }
};

FloatBallAppWM.prototype.applyImmediateEffectsForKey = function(k) {
  try {
    if (k === "LOG_ENABLE") {
      try {
        if (this.L) {
          this.L.enable = !!this.config.LOG_ENABLE;
          this.L.cfg.LOG_ENABLE = !!this.config.LOG_ENABLE;
          this.L.i("apply LOG_ENABLE=" + String(this.config.LOG_ENABLE));
        }
      } catch (eLE) {}
      return;
    }
    if (k === "LOG_DEBUG") {
      try {
        if (this.L) {
          this.L.debug = !!this.config.LOG_DEBUG;
          this.L.cfg.LOG_DEBUG = !!this.config.LOG_DEBUG;
          this.L.i("apply LOG_DEBUG=" + String(this.config.LOG_DEBUG));
        }
      } catch (eLD) {}
      return;
    }
    if (k === "LOG_KEEP_DAYS") {
      try {
        var n = Math.max(1, Math.floor(Number(this.config.LOG_KEEP_DAYS || 3)));
        this.config.LOG_KEEP_DAYS = n;
        if (this.L) {
          this.L.keepDays = n;
          this.L.cfg.LOG_KEEP_DAYS = n;
          this.L.i("apply LOG_KEEP_DAYS=" + String(n));
          this.L.cleanupOldFiles();
        }
      } catch (eLK) {}
      return;
    }
    if (k === "BALL_SIZE_DP" || k === "BALL_PNG_MODE" || k === "BALL_ICON_TYPE" || k === "BALL_ICON_PKG" || k === "BALL_ICON_FILE_PATH" || k === "BALL_ICON_RES_ID" || k === "BALL_ICON_RES_NAME" || k === "BALL_ICON_SIZE_DP" || k === "BALL_ICON_TINT_HEX" || k === "BALL_TEXT" || k === "BALL_TEXT_SIZE_SP" || k === "BALL_TEXT_COLOR_HEX" || k === "BALL_ICON_TEXT_GAP_DP") { this.rebuildBallForNewSize(); return; }

    if (k === "PANEL_ROWS" || k === "PANEL_COLS" ||
        k === "PANEL_ITEM_SIZE_DP" || k === "PANEL_GAP_DP" ||
        k === "PANEL_PADDING_DP" || k === "PANEL_ICON_SIZE_DP" ||
        k === "PANEL_LABEL_ENABLED" || k === "PANEL_LABEL_TEXT_SIZE_SP" ||
        k === "PANEL_LABEL_TOP_MARGIN_DP") {

      if (this.state.addedPanel) this.hideMainPanel();
      if (this.state.addedSettings) this.hideSettingsPanel();
      if (this.state.addedViewer) this.hideViewerPanel();
      return;
    }

    if (k === "EDGE_VISIBLE_RATIO") {
      if (this.state.addedBall && this.state.docked) {
        this.state.docked = false;
        this.snapToEdgeDocked(false);
      }
      return;
    }
  } catch (e0) {}
};

FloatBallAppWM.prototype.commitPendingUserCfg = function() {
  try {
    if (!this.state.pendingUserCfg) return { ok: false, reason: "no_pending" };

    var schema = this.getConfigSchema();
    var changedKeys = [];
    var i;

    for (i = 0; i < schema.length; i++) {
      if (!schema[i] || !schema[i].key) continue;
      var k = String(schema[i].key);
      var oldV = this.config[k];
      var newV = this.state.pendingUserCfg[k];
      if (String(oldV) !== String(newV)) {
        this.config[k] = newV;
        changedKeys.push(k);
      }
    }

    this.persistUserCfgFromObject(this.state.pendingUserCfg);

    var j;
    for (j = 0; j < changedKeys.length; j++) {
      if (changedKeys[j] === "BALL_SIZE_DP") { this.applyImmediateEffectsForKey("BALL_SIZE_DP"); break; }
    }
    for (j = 0; j < changedKeys.length; j++) {
      if (changedKeys[j] !== "BALL_SIZE_DP") this.applyImmediateEffectsForKey(changedKeys[j]);
    }

    this.state.pendingDirty = false;
    safeLog(this.L, 'i',  "commit settings changed=" + JSON.stringify(changedKeys));
    return { ok: true, changed: changedKeys };
  } catch (e0) {
    safeLog(this.L, 'e',  "commitPendingUserCfg err=" + String(e0));
    return { ok: false, err: String(e0) };
  }
};

// =======================【工具：吸边数据】======================
FloatBallAppWM.prototype.getDockInfo = function() {
  var ballSize = this.dp(this.config.BALL_SIZE_DP);
  var visible = Math.max(1, Math.round(ballSize * this.config.EDGE_VISIBLE_RATIO));
  var hidden = ballSize - visible;
  return { ballSize: ballSize, visiblePx: visible, hiddenPx: hidden };
};

// =======================【工具：图标解析】======================

// =======================【工具：快捷方式图标文件路径】======================
FloatBallAppWM.prototype.getShortcutIconFilePath = function(pkg, shortcutId, userId) {
  // # 主要用途：把快捷方式图标持久化到 shortcut_icons 目录，供按钮页/按钮管理页稳定显示（桌面移除后仍可显示）
  try {
    var p = (pkg == null) ? "" : String(pkg);
    var s = (shortcutId == null) ? "" : String(shortcutId);
    var u = (userId == null) ? "0" : String(userId);

    // # 文件名去非法字符，避免路径注入或创建失败
    function _sn(v) {
      try {
        var t = String(v == null ? "" : v);
        t = t.replace(/[^a-zA-Z0-9._-]+/g, "_");
        if (t.length > 120) t = t.substring(0, 120);
        return t;
      } catch(e) { return ""; }
    }

    var dir = String(APP_ROOT_DIR) + "/shortcut_icons";
    var fn = _sn(p) + "__" + _sn(s) + "__u" + _sn(u) + ".png";
    return dir + "/" + fn;
  } catch (e0) {
    return "";
  }
};

FloatBallAppWM.prototype.resolveIconDrawable = function(btn) {
  // # 主要用途：解析面板按钮图标（优先 app 包名图标，其次自定义 resId，最后兜底）
  try {
    if (!btn) return context.getResources().getDrawable(android.R.drawable.ic_menu_help, null);

    // # 0) 优先检查 iconPath (绝对路径)
    // # 引用优化：复用 loadBallIconDrawableFromFile 安全加载逻辑
    if (btn.iconPath) {
        try {
             var path = String(btn.iconPath);
             if (path) {
                 // targetPx: 面板图标大小; Limit: 1MB, 1024px
                 var sizeDp = this.config.PANEL_ICON_SIZE_DP || 32;
                 var dr = this.loadBallIconDrawableFromFile(path, this.dp(sizeDp), 1048576, 1024);
                 if (dr) return dr;
             }
        } catch (ePath) {}
    }


// # 1) type=app 且配置了 pkg：自动取应用图标
try {
  var t = (btn.type == null) ? "" : String(btn.type);
  if (t === "app") {
    var pkg = (btn.pkg == null) ? "" : String(btn.pkg);
    if (pkg.length > 0) {
      // # 统一 LRU 缓存：避免频繁走 PackageManager（Drawable 可复用）；并带容量上限，防止无限增长
      var kApp = "app|" + pkg;
      var hitApp = this._iconLruGet(kApp);
      if (hitApp) return hitApp;

      var pm = context.getPackageManager();
      var drApp = pm.getApplicationIcon(pkg);
      if (drApp != null) {
        this._iconLruPut(kApp, drApp);
        return drApp;
      }
    }
  }
} catch (eApp) {}


    // # 1.5) type=shortcut：尝试取 Shortcuts 快捷方式图标（显示与 shortcuts.js 页面一致）
    // # 说明：btn 需要包含 pkg + shortcutId；图标获取可能较重，因此做简单缓存，失败则回退到应用图标。
    try {
      var t2 = (btn.type == null) ? "" : String(btn.type);
      if (t2 === "shortcut") {
        var pkg2 = (btn.pkg == null) ? "" : String(btn.pkg);
        var sid2 = (btn.shortcutId == null) ? "" : String(btn.shortcutId);
        if (pkg2.length > 0 && sid2.length > 0) {
          // # 1.5.1) 优先从 shortcut_icons 持久化目录读取（桌面移除后仍可显示正确图标）
          try {
            var iconFilePath0 = this.getShortcutIconFilePath(pkg2, sid2, (btn.userId != null ? String(btn.userId) : "0"));
            if (iconFilePath0) {
              try {
                var f0 = new java.io.File(iconFilePath0);
                if (f0.exists() && f0.isFile()) {
                  var sizeDp0 = this.config.PANEL_ICON_SIZE_DP || 32;
                  var iconSizePx0 = this.dp(sizeDp0);
                  var dr0 = this.loadBallIconDrawableFromFile(iconFilePath0, iconSizePx0, 1048576, 1024);
                  if (dr0) {
                    // # 写入统一 LRU 缓存：同一个 shortcut 复用 Drawable，避免反复解码 PNG
                    try {
                      var sk0 = pkg2 + "@" + sid2 + "@" + (btn.userId != null ? String(btn.userId) : "");
                      this._iconLruPut("sc|" + sk0, dr0);
                    } catch (eSc0) {}
                    return dr0;
                  }
                }
              } catch(eF0) {}
            }
          } catch(eFile0) {}
var skey = pkg2 + "@" + sid2 + "@" + (btn.userId != null ? String(btn.userId) : "");
          var kSc = "sc|" + skey;
          var hitSc = this._iconLruGet(kSc);
          if (hitSc) return hitSc;
          // # 失败冷却：某些 ROM/桌面在短时间内反复查询 Shortcuts 会很慢或直接抛异常。
          // # 这里对同一个 shortcut key 做短暂冷却（默认 10 秒），避免面板频繁刷新导致卡顿/ANR 风险。
          if (!this._shortcutIconFailTs) this._shortcutIconFailTs = {};
          var nowTs = 0;
          try { nowTs = new Date().getTime(); } catch(eNow) { nowTs = 0; }
          var lastFailTs = this._shortcutIconFailTs[skey];
          if (lastFailTs && nowTs > 0 && (nowTs - lastFailTs) < 10000) {
            // # 冷却期内直接跳过 shortcut icon 查询，走回退逻辑（应用图标）
          } else {

          var la = context.getSystemService(android.content.Context.LAUNCHER_APPS_SERVICE);
          if (la) {

            // # 修复：按钮管理页/按钮面板中，微信小程序等 shortcut 图标显示成宿主 App 图标
            // # 根因（工作假设）：用 setShortcutIds() 精确查询时，部分 ROM 的实现会返回"退化"的 ShortcutInfo，
            // # getShortcutIconDrawable 结果被降级为宿主 App 图标。
            // # 方案：完全复用 shortcuts.js 的做法--先按 package + flags 拉取该包的 shortcuts 列表，再在列表里按 id 过滤命中项取图标。
            // # 注意：不依赖外部 buildShortcutItemsIndex()，避免主程序环境下未加载 shortcuts.js 导致直接回退。
                        // # 方案：完全复用"选择快捷方式列表"的取数路径，确保微信小程序等 pinned shortcut 能拿到正确的 ShortcutInfo
            // # 1) 优先直连 shortcut service（选择器同款：信息更完整）
            // # 2) 失败再回退 LauncherApps.getShortcuts
            var list = null;

            // # 1) shortcut service 直连（与选择器保持一致）
            try {
              var userIdIntForSvc = 0;
              try {
                var buid2 = null;
                if (btn.userId != null) buid2 = btn.userId;
                if (buid2 == null && btn.user != null) buid2 = btn.user;
                if (buid2 != null) {
                  var tmpUid2 = parseInt(String(buid2), 10);
                  if (!isNaN(tmpUid2)) userIdIntForSvc = tmpUid2;
                }
              } catch(eUidSvc) {}

              var sm2 = android.os.ServiceManager;
              var shortcutSvc = null;
              try { shortcutSvc = sm2.getService("shortcut"); } catch(eSm2) { shortcutSvc = null; }
              if (shortcutSvc) {
                var CFG_MATCH_ALL2 = 0x0000000F;
                var slice2 = null;
                try { slice2 = shortcutSvc.getShortcuts(String(pkg2), CFG_MATCH_ALL2, userIdIntForSvc); } catch(eS0b) { slice2 = null; }
                if (slice2) {
                  var listObj2 = null;
                  try { listObj2 = slice2.getList(); } catch(eS1b) { listObj2 = null; }
                  if (listObj2) list = listObj2;
                }
              }
            } catch(eSvc2) {}

            // # 2) LauncherApps 回退（当 shortcut service 不可用或返回空时）
            if (list == null) {
              var q = new android.content.pm.LauncherApps.ShortcutQuery();
              try { q.setPackage(pkg2); } catch(eSP) {}

              // # 重要：必须设置 QueryFlags，否则 getShortcuts 可能返回空（默认 flags=0）
              // # 兼容性：不同 Android/ROM 可能缺少部分 FLAG，逐个 try 叠加
              try {
                var qFlags = 0;
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_DYNAMIC; } catch(eF1) {}
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_PINNED; } catch(eF2) {}
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_MANIFEST; } catch(eF3) {}
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_CACHED; } catch(eF4) {}
                try { q.setQueryFlags(qFlags); } catch(eSF) {}
              } catch(eQF) {}

              // # 重要：用户句柄优先用按钮携带的 userId（如有），否则使用当前用户
              var uh = android.os.Process.myUserHandle();
              try {
                var buid = null;
                if (btn.userId != null) buid = btn.userId;
                if (buid == null && btn.user != null) buid = btn.user;
                if (buid != null) {
                  var uidInt = parseInt(String(buid), 10);
                  if (!isNaN(uidInt)) {
                    uh = android.os.UserHandle.of(uidInt);
                  }
                }
              } catch(eUH) {}

              try { list = la.getShortcuts(q, uh); } catch(eGS) { list = null; }
            }

if (list && list.size && list.size() > 0) {
              // # 在返回列表中按 shortcutId 精确命中
              var si = null;
              try {
                for (var kk = 0; kk < list.size(); kk++) {
                  var s0 = list.get(kk);
                  if (s0 != null) {
                    var id0 = "";
                    try { id0 = String(s0.getId()); } catch(eId0) { id0 = ""; }
                    if (id0 === sid2) { si = s0; break; }
                  }
                }
              } catch(eFind) { si = null; }
if (si != null) {
                // # 与 shortcuts.js 一致：优先 la.getShortcutIconDrawable(shortcutInfo, 0)，再兜底 Icon.loadDrawable
                var drSc = null;
                try { drSc = la.getShortcutIconDrawable(si, 0); } catch(eIcon0) { drSc = null; }
                if (drSc == null) {
                  try {
                    var ic = si.getIcon();
                    if (ic != null) {
                      var d2 = ic.loadDrawable(context);
                      if (d2 != null) drSc = d2;
                    }
                  } catch(eIcon1) {}
                }
                if (drSc != null) {
                  try { this._iconLruPut("sc|" + skey, drSc); } catch (eSc1) {}
                  return drSc;
                }
              }
            }
          }



// # 如果没拿到 shortcut 图标，记录一次失败时间，触发冷却
            try {
              if (nowTs > 0) this._shortcutIconFailTs[skey] = nowTs;
              else this._shortcutIconFailTs[skey] = new Date().getTime();
            } catch(eFT) {}
          }


          // # 回退：取应用图标，至少保证按钮有图标可见
          try {
            var pm2 = context.getPackageManager();
            var drApp2 = pm2.getApplicationIcon(pkg2);
            if (drApp2 != null) return drApp2;
          } catch(eFall) {}
        }
      }
    } catch (eSc) {}
    // # 2) 显式指定 iconResName (String) 或 iconResId (int)
    try {
      if (btn.iconResName) {
        var drShortx = this.resolveShortXDrawable(btn.iconResName, btn && btn.iconTint ? String(btn.iconTint) : "");
        if (drShortx != null) return drShortx;
        var name = this.normalizeShortXIconName(btn.iconResName, true);
        // # 回退到 android 系统图标
        var id = context.getResources().getIdentifier(name, "drawable", "android");
        if (id > 0) return context.getResources().getDrawable(id, null);
      }
      if (btn.iconResId) return context.getResources().getDrawable(btn.iconResId, null);
    } catch (e1) {}

    // # 3) 兜底
    return context.getResources().getDrawable(android.R.drawable.ic_menu_help, null);
  } catch (e2) {}
  return null;
};

FloatBallAppWM.prototype.getShortXResHandle = function() {
  if (this._shortxResHandle) return this._shortxResHandle;
  try {
    var flags = 0;
    try { flags = android.content.Context.CONTEXT_INCLUDE_CODE | android.content.Context.CONTEXT_IGNORE_SECURITY; } catch (eF) { flags = android.content.Context.CONTEXT_RESTRICTED; }
    var sxCtx = context.createPackageContext(CONST_SHORTX_PACKAGE, flags);
    this._shortxResHandle = {
      ctx: sxCtx,
      res: sxCtx.getResources(),
      cl: sxCtx.getClassLoader(),
      pkg: CONST_SHORTX_PACKAGE
    };
    return this._shortxResHandle;
  } catch (e) {
    safeLog(this.L, 'w', "getShortXResHandle failed: " + String(e));
    return null;
  }
};

FloatBallAppWM.prototype.normalizeShortXIconName = function(name, keepPrefix) {
  try {
    var s = String(name == null ? "" : name).replace(/^\s+|\s+$/g, "");
    if (!s) return "";
    if (s.indexOf("@drawable/") === 0) s = s.substring(10);
    if (s.indexOf(".") > 0) {
      var parts = s.split(".");
      s = parts[parts.length - 1];
    }
    if (s.indexOf("ic_remix_") === 0) {
      return keepPrefix ? s : s.substring("ic_remix_".length);
    }
    if (s.indexOf("ic_") === 0) {
      return s;
    }
    return keepPrefix ? ("ic_remix_" + s) : s;
  } catch (e) {}
  return "";
};

FloatBallAppWM.prototype.getShortXApkPaths = function() {
  var out = [];
  try {
    var handle = this.getShortXResHandle();
    var ai = null;
    try { if (handle && handle.ctx) ai = handle.ctx.getApplicationInfo(); } catch (eAi0) { ai = null; }
    if (ai == null) {
      try { ai = context.getPackageManager().getApplicationInfo(CONST_SHORTX_PACKAGE, 0); } catch (eAi1) { ai = null; }
    }
    function pushPath(p) {
      try {
        p = String(p || "");
        if (!p) return;
        if (out.indexOf(p) < 0) out.push(p);
      } catch (eP) {}
    }
    if (ai) {
      try { pushPath(ai.sourceDir); } catch (e0) {}
      try { pushPath(ai.publicSourceDir); } catch (e1) {}
      try {
        var ss = ai.splitSourceDirs;
        if (ss) {
          var i;
          for (i = 0; i < ss.length; i++) pushPath(ss[i]);
        }
      } catch (e2) {}
    }
  } catch (e) {}
  return out;
};

FloatBallAppWM.prototype.scanShortXIconsFromApk = function() {
  var out = [];
  var seen = {};
  var paths = this.getShortXApkPaths();
  var regex = /^res\/drawable[^\/]*\/(ic_remix_[a-z0-9_]+|ic_shortx|ic_launcher|ic_menu_preferences)\.(xml|png|webp|jpg|jpeg)$/;
  var lastErr = "";
  var pi;
  for (pi = 0; pi < paths.length; pi++) {
    var zip = null;
    try {
      zip = new java.util.zip.ZipFile(String(paths[pi]));
      var en = zip.entries();
      while (en.hasMoreElements()) {
        var ze = en.nextElement();
        var name = String(ze.getName());
        var m = regex.exec(name);
        if (!m) continue;
        var fullName = String(m[1]);
        if (seen[fullName]) continue;
        seen[fullName] = true;
        out.push({
          name: fullName,
          shortName: this.normalizeShortXIconName(fullName, false),
          id: 0
        });
      }
    } catch (eZip) {
      lastErr = String(eZip);
    } finally {
      try { if (zip) zip.close(); } catch (eClose) {}
    }
  }
  if ((!out || out.length === 0) && lastErr) this._shortxIconCatalogError = lastErr;
  return out;
};

FloatBallAppWM.prototype.getShortXIconLookupNames = function(name) {
  var out = [];
  try {
    var s = String(name == null ? "" : name).replace(/^\s+|\s+$/g, "");
    if (!s) return out;
    if (s.indexOf("@drawable/") === 0) s = s.substring(10);
    if (s.indexOf(".") > 0) {
      var parts = s.split(".");
      s = parts[parts.length - 1];
    }
    function add(v) {
      if (!v) return;
      if (out.indexOf(v) < 0) out.push(v);
    }
    add(s);
    if (s.indexOf("ic_remix_") === 0) {
      add(s.substring("ic_remix_".length));
    } else if (s.indexOf("ic_") !== 0) {
      add("ic_remix_" + s);
      add("ic_" + s);
    }
  } catch (e) {}
  return out;
};

FloatBallAppWM.prototype.resolveShortXDrawableResId = function(name) {
  try {
    var handle = this.getShortXResHandle();
    if (!handle || !handle.res) return 0;
    var cands = this.getShortXIconLookupNames(name);
    var i;
    for (i = 0; i < cands.length; i++) {
      var resId = 0;
      try { resId = handle.res.getIdentifier(String(cands[i]), "drawable", handle.pkg); } catch (e1) { resId = 0; }
      if (resId > 0) return resId;
    }
  } catch (e) {}
  return 0;
};

FloatBallAppWM.prototype.resolveShortXDrawable = function(name, tintHex) {
  try {
    var handle = this.getShortXResHandle();
    if (!handle || !handle.res) return null;
    var resId = this.resolveShortXDrawableResId(name);
    if (resId <= 0) return null;
    var dr = handle.res.getDrawable(resId, null);
    if (dr && tintHex) {
      try {
        dr = dr.mutate();
        dr.setColorFilter(android.graphics.Color.parseColor(String(tintHex)), android.graphics.PorterDuff.Mode.SRC_IN);
      } catch (eTint) {}
    }
    return dr;
  } catch (e) {}
  return null;
};

FloatBallAppWM.prototype.getShortXIconCatalog = function(forceReload) {
  if (!forceReload && this._shortxIconCatalog) return this._shortxIconCatalog;
  var out = [];
  this._shortxIconCatalogError = "";
  try {
    var handle = this.getShortXResHandle();
    if (handle && handle.cl) {
      try {
        var clz = handle.cl.loadClass(CONST_SHORTX_PACKAGE + ".R$drawable");
        var fields = clz.getFields();
        var i;
        for (i = 0; i < fields.length; i++) {
          try {
            var f = fields[i];
            var fname = String(f.getName());
            if (fname.indexOf("ic_remix_") !== 0 && fname !== "ic_shortx" && fname !== "ic_launcher" && fname !== "ic_menu_preferences") continue;
            out.push({
              name: fname,
              shortName: (fname.indexOf("ic_remix_") === 0) ? fname.substring("ic_remix_".length) : fname,
              id: f.getInt(null)
            });
          } catch (eField) {}
        }
      } catch (eClz) {
        this._shortxIconCatalogError = String(eClz);
        safeLog(this.L, 'w', "getShortXIconCatalog reflect failed: " + String(eClz));
      }
    }
    if (!out || out.length === 0) {
      out = this.scanShortXIconsFromApk();
    }
    out.sort(function(a, b) {
      var aw = a.name.indexOf("ic_remix_") === 0 ? 1 : 0;
      var bw = b.name.indexOf("ic_remix_") === 0 ? 1 : 0;
      if (aw !== bw) return aw - bw;
      var as = String(a.shortName || a.name);
      var bs = String(b.shortName || b.name);
      return as < bs ? -1 : (as > bs ? 1 : 0);
    });
    if (!out || out.length === 0) {
      if (!this._shortxIconCatalogError) this._shortxIconCatalogError = "反射与 APK 扫描均未获取到图标";
    } else {
      this._shortxIconCatalogError = "";
    }
  } catch (e) {
    this._shortxIconCatalogError = String(e);
    safeLog(this.L, 'w', "getShortXIconCatalog failed: " + String(e));
  }
  this._shortxIconCatalog = out;
  return out;
};

// =======================【工具：快捷方式选择器（内置，合并 shortcuts.js）】======================
// 这段代码的主要内容/用途：在 toolhub.js 内部提供与 shortcuts.js 等价的"快捷方式浏览/选择"页面（仅在点击"选择快捷方式"时触发）。
// 设计要点：
// 1) 双线程流水线：UI 线程专管 WM/View；BG 线程专管 icon 加载，避免卡顿/ANR 风险。
// 2) 稳定性：失败 TTL 熔断 + 限次重试 + icon LRU 上限；滚动触底用轮询，避免 interface listener 的 JavaAdapter 风险。
// 3) UI 风格：复用 ToolHub 主题（白天/夜晚），避免与主面板割裂；支持关闭与安全销毁。
// 4) 日志：复用 ToolHubLogger（self.L / _th_log）记录关键步骤与异常。
FloatBallAppWM.prototype.showShortcutPicker = function(opts) {
  var self = this;
  var opt = opts || {};
  var mode = (opt.mode != null) ? String(opt.mode) : "browse"; // "pick" | "browse"
  var onPick = (typeof opt.onPick === "function") ? opt.onPick : null;

  // # 会话隔离：生成唯一会话 ID，防止状态污染
  var sessionId = String(new Date().getTime()) + "_" + Math.random().toString(36).substr(2, 9);
  var currentSession = sessionId;

  // 保存当前会话 ID 到实例（用于新选择器）
  this.__currentShortcutSession = sessionId;

  // 会话检查函数：所有异步回调都必须检查
  function checkSession() {
    if (self.__currentShortcutSession !== currentSession) {
      safeLog(self.L, 'w', "Shortcut picker session expired, dropping callback");
      return false;
    }
    return true;
  }

  // 清理函数
  function destroySession() {
    if (self.__currentShortcutSession === currentSession) {
      self.__currentShortcutSession = null;
    }
  }

  // # 稳定性：复用单例选择器，避免频繁 add/remove View 与线程创建销毁导致 system_server 概率性崩溃
  try {
    if (self.__shortcutPickerSingleton && typeof self.__shortcutPickerSingleton.show === "function") {
      // # 新会话覆盖旧会话
      self.__shortcutPickerSingleton.show(opts);
      return;
    }
  } catch(eSingle) {}


  // # 兼容：toolhub.js 全局未必定义 Context 别名，这里显式绑定，避免 ReferenceError。
  var Context = android.content.Context;

  // # 常量：可按需调小以降低 system_server 内存峰值
  var CFG_PAGE_BATCH = 40;
  var CFG_ICON_CACHE_MAX = 120;
  var CFG_ICON_FAIL_TTL_MS = 15000;
  var CFG_ICON_FAIL_MAX_RETRY = 2;
  var CFG_ICON_LOAD_CONCURRENCY = 2;
  // # 这段代码的主要内容/用途：ShortcutService.getShortcuts 的匹配 flags（与 shortcuts.js 保持一致）
  // # 说明：使用 0x0000000F 可尽量覆盖 Dynamic / Manifest / Pinned / Cached 等类型
  var CFG_MATCH_ALL = 0x0000000F;

  function now() { try { return new Date().getTime(); } catch(e) { return 0; } }
  function lower(s) { try { return String(s || "").toLowerCase(); } catch(e) { return ""; } }
  function safeStr(s) { try { return String(s == null ? "" : s); } catch(e) { return ""; } }

  // # 增强版：动态获取系统用户目录（适配不同 ROM）
  function getSystemUserDir() {
    var candidates = [
      "/data/system_ce",           // 标准 AOSP
      "/data/system/users",      // 部分 MIUI/HyperOS
      "/data/data/system_ce"     // 极少数定制系统
    ];

    for (var i = 0; i < candidates.length; i++) {
      try {
        var f = new java.io.File(candidates[i]);
        if (f.exists() && f.isDirectory() && f.canRead()) {
          return candidates[i];
        }
      } catch(e) {}
    }

    // 反射获取环境变量（最可靠但较慢）
    try {
      var env = java.lang.System.getenv("ANDROID_DATA");
      if (env) {
        var envPath = String(env) + "/system_ce";
        var envDir = new java.io.File(envPath);
        if (envDir.exists() && envDir.isDirectory()) {
          return envPath;
        }
      }
    } catch(e) {}

    // 最终兜底
    return "/data/system_ce";
  }

  // ==================== Shortcut 枚举（system_ce + shortcut service） ====================
  function listUserIdsFromSystemCE() {
    // # 这段代码的主要内容/用途：扫描 /data/system_ce 下的用户目录，得到可用 userId 列表。
    var out = [];
    try {
      var basePath = getSystemUserDir();
      var base = new java.io.File(basePath);
      if (!base.exists() || !base.isDirectory()) return out;
      var arr = base.listFiles();
      if (!arr) return out;
      for (var i = 0; i < arr.length; i++) {
        var f = arr[i];
        if (!f || !f.isDirectory()) continue;
        var name = safeStr(f.getName());
        if (!name) continue;
        // 只收数字目录
        var ok = true;
        for (var j = 0; j < name.length; j++) {
          var c = name.charCodeAt(j);
          if (c < 48 || c > 57) { ok = false; break; }
        }
        if (!ok) continue;
        out.push(parseInt(name, 10));
      }
    } catch(e) {}
    // 默认兜底：至少有 user 0
    if (out.length === 0) out.push(0);
    return out;
  }

  function listPackagesHavingShortcuts(userId) {
    // # 这段代码的主要内容/用途：从 shortcut_service 的持久化目录推断哪些包存在快捷方式记录（快速筛选）。
    var out = [];
    try {
      // # 使用动态获取的系统用户目录
      var basePath = "/data/system_ce";
      try {
        if (typeof getSystemUserDir === "function") {
          basePath = getSystemUserDir();
        }
      } catch(eGSD2) {}

      var dir = new java.io.File(basePath + "/" + String(userId) + "/shortcut_service/packages");
      if (!dir.exists() || !dir.isDirectory()) return out;
      var fs = dir.listFiles();
      if (!fs) return out;
      for (var i = 0; i < fs.length; i++) {
        var f = fs[i];
        if (!f || !f.isFile()) continue;
        var name = safeStr(f.getName());
        if (!name) continue;
        if (name.indexOf(".xml") > 0) {
          var pkg = name.substring(0, name.length - 4);
          if (pkg && pkg.length > 0) out.push(pkg);
        }
      }
    } catch(e) {}
    return out;
  }

  function getShortcutServiceBinder() {
    // # 这段代码的主要内容/用途：获取 "shortcut" service 的 Binder（不同 ROM 上可能失败，失败则回退到 LauncherApps API 取 icon）。
    try {
      var sm = android.os.ServiceManager;
      return sm.getService("shortcut");
    } catch(e) {
      return null;
    }
  }

  function getShortcutsForPackage(pkg, userId) {
    // # 这段代码的主要内容/用途：尝试从 shortcut service 拉取指定包的 ShortcutInfo 列表。
    // 说明：此处采用"尽力而为"，因为 ROM 兼容性差；失败时返回空数组即可。
    var out = [];
    try {
      // # 修复：与 shortcuts.js 行为一致，优先走 shortcut 服务直连（可拿到"添加到桌面"的微信小程序这类入口）
      // # 说明：LauncherApps.getShortcuts 在部分 ROM/桌面上对非 Launcher 调用者可见性不足，导致列表缺项。
      try {
        var svc = getShortcutServiceBinder();
        if (svc) {
          var slice = null;
          try { slice = svc.getShortcuts(String(pkg), CFG_MATCH_ALL, parseInt(String(userId), 10)); } catch(eS0) { slice = null; }
          if (slice) {
            var listObj = null;
            try { listObj = slice.getList(); } catch(eS1) { listObj = null; }
            if (listObj) {
              try {
                var sz = listObj.size();
                for (var si0 = 0; si0 < sz; si0++) {
                  try {
                    var s0 = listObj.get(si0);
                    if (s0) out.push(s0);
                  } catch(eS2) {}
                }
              } catch(eS3) {}
              if (out.length > 0) return out;
            }
          }
        }
      } catch(eSvc) {
        // ignore and fallback
      }

      // # 兜底：走 LauncherApps.getShortcuts（某些 ROM 上 shortcut 服务直连可能不可用）
      var la = context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
      if (!la) return out;

      var LauncherApps = android.content.pm.LauncherApps;
      var LauncherAppsShortcutQuery = android.content.pm.LauncherApps.ShortcutQuery;

      var q = new LauncherAppsShortcutQuery();
      // FLAG_MATCH_*：尽量全拿（动态/固定/清单）
      try {
        q.setQueryFlags(
          LauncherAppsShortcutQuery.FLAG_MATCH_DYNAMIC |
          LauncherAppsShortcutQuery.FLAG_MATCH_PINNED |
          LauncherAppsShortcutQuery.FLAG_MATCH_MANIFEST |
          LauncherAppsShortcutQuery.FLAG_MATCH_CACHED
        );
      } catch(eF) {
        // 某些 ROM 没有 FLAG_MATCH_CACHED
        try {
          q.setQueryFlags(
            LauncherAppsShortcutQuery.FLAG_MATCH_DYNAMIC |
            LauncherAppsShortcutQuery.FLAG_MATCH_PINNED |
            LauncherAppsShortcutQuery.FLAG_MATCH_MANIFEST
          );
        } catch(eF2) {}
      }
      try { q.setPackage(safeStr(pkg)); } catch(eP) {}

      // user 处理：尽量兼容多用户
      var userHandle = null;
      try {
        if (userId != null) {
          var UserHandle = android.os.UserHandle;
          userHandle = UserHandle.of(parseInt(String(userId), 10));
        }
      } catch(eU) { userHandle = null; }

      var list = null;
      try {
        if (userHandle) list = la.getShortcuts(q, userHandle);
        else list = la.getShortcuts(q, android.os.Process.myUserHandle());
      } catch(eQ) {
        list = null;
      }

      if (!list) return out;
      for (var i = 0; i < list.size(); i++) {
        try {
          var si = list.get(i);
          if (si) out.push(si);
        } catch(eI) {}
      }
    } catch(e) {}
    return out;
  }

  function getAppLabelAsUser(pkg, userId) {
    // # 这段代码的主要内容/用途：获取应用名称（用于分组/搜索显示），失败则返回包名。
    try {
      var pm = context.getPackageManager();
      var ai = pm.getApplicationInfo(String(pkg), 0);
      var lb = pm.getApplicationLabel(ai);
      if (lb != null) return String(lb);
    } catch(e) {}
    return String(pkg);
  }

  function buildShortcutItemsIndex() {
    // # 这段代码的主要内容/用途：汇总所有 userId 下的快捷方式为统一列表，结构与 shortcuts.js 保持一致。
    var items = [];
    var users = listUserIdsFromSystemCE();
    for (var ui = 0; ui < users.length; ui++) {
      var uid = users[ui];
      var pkgs = listPackagesHavingShortcuts(uid);
      for (var pi = 0; pi < pkgs.length; pi++) {
        var pkg = pkgs[pi];
        if (!pkg) continue;
        var sis = getShortcutsForPackage(pkg, uid);
        if (!sis || sis.length === 0) continue;
        for (var si = 0; si < sis.length; si++) {
          var sInfo = sis[si];
          if (!sInfo) continue;
          var id = "";
          var label = "";
          var intentUri = "";
          try { id = safeStr(sInfo.getId()); } catch(eId) { id = ""; }
          try { label = safeStr(sInfo.getShortLabel()); } catch(eLb) { label = ""; }
          try {
            var it = sInfo.getIntent();
            if (it) intentUri = safeStr(it.toUri(0));
          } catch(eIt) { intentUri = ""; }

          items.push({
            userId: uid,
            pkg: safeStr(pkg),
            id: id,
            label: label,
            intentUri: intentUri,
            shortcutInfo: sInfo
          });
        }
      }
    }
    return items;
  }

  // ==================== icon 加载（与 resolveIconDrawable 回退策略一致） ====================
  function loadShortcutIconDrawable(item) {
    // # 这段代码的主要内容/用途：尽力加载 shortcut icon；失败时回退到 app icon。
    try {
      if (!item) return null;
      var la = context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
      if (la && item.shortcutInfo) {
        try {
          // density: 0 让系统自适应（部分 ROM 更稳）
          var dr = la.getShortcutIconDrawable(item.shortcutInfo, 0);
          if (dr) return dr;
        } catch(eLa) {}
      }
    } catch(e0) {}
    // fallback: app icon
    try {
      var pm = context.getPackageManager();
      return pm.getApplicationIcon(String(item.pkg));
    } catch(e1) {}
    return null;
  }

  // ==================== 分组/过滤 ====================
  function groupItems(items) {
    // # 这段代码的主要内容/用途：按应用分组，tab 显示用；同时保留 "__ALL__"。
    var groups = {};
    var order = [];
    function ensure(key, title) {
      if (groups[key]) return;
      groups[key] = { key: key, title: title, items: [] };
      order.push(key);
    }
    ensure("__ALL__", "全部");
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      groups["__ALL__"].items.push(it);
      var k = safeStr(it.pkg);
      if (!groups[k]) {
        ensure(k, getAppLabelAsUser(k, it.userId));
      }
      groups[k].items.push(it);
    }
    // 让 "__ALL__" 固定在第一位，其余按 title 排序（中文/英文混排就随缘）
    try {
      var rest = [];
      for (var j = 0; j < order.length; j++) if (order[j] !== "__ALL__") rest.push(order[j]);
      rest.sort(function(a, b) {
        var ta = safeStr(groups[a].title);
        var tb = safeStr(groups[b].title);
        return ta.localeCompare(tb);
      });
      order = ["__ALL__"].concat(rest);
    } catch(eS) {}
    return { groups: groups, order: order };
  }

  function filterItems(items, q) {
    var qLower = lower(q || "");
    if (!qLower) return items;
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      var hit = false;
      if (lower(it.label).indexOf(qLower) > -1) hit = true;
      else if (lower(it.pkg).indexOf(qLower) > -1) hit = true;
      else if (lower(it.id).indexOf(qLower) > -1) hit = true;
      else if (lower(it.intentUri).indexOf(qLower) > -1) hit = true;
      if (hit) out.push(it);
    }
    return out;
  }

  // ==================== 主 UI（WM 双线程 + 轮询触底） ====================
  var HandlerThread = android.os.HandlerThread;
  var Handler = android.os.Handler;
  var Runnable = java.lang.Runnable;
  var Thread = java.lang.Thread;

  var ht = new HandlerThread("sx-toolhub-shortcut-ui");
  ht.start();
  var h = new Handler(ht.getLooper());

  var bgHt = new HandlerThread("sx-toolhub-shortcut-bg");
  bgHt.start();
  var bgH = new Handler(bgHt.getLooper());

  var wm = context.getSystemService(Context.WINDOW_SERVICE);

  var state = {
    destroyed: false,
    hidden: false,
    // # 单例标识：用于避免旧实例的异步回调误操作新实例
    instanceId: String(now()) + "_" + String(Math.random()),
    root: null,
    params: null,
    isAdded: false,

    allItems: [],
    groups: null,
    groupOrder: [],
    currentGroupKey: "__ALL__",

    query: "",
    lastFilterToken: 0,

    iconCache: {},
    iconCacheOrder: [],
    iconCacheMax: CFG_ICON_CACHE_MAX,

    iconFail: {},

    iconQ: [],
    iconInFlight: 0,
    iconConc: CFG_ICON_LOAD_CONCURRENCY,

    grid: null,
    tvStat: null,
    etSearch: null,
    tabRow: null,
    scrollView: null,

    renderList: [],
    renderCursor: 0,
    isAppending: false,
    lastAppendTryTs: 0,

    scrollPollRunning: false,

    // # 回调：关闭/隐藏后通知外层恢复上层 UI（避免被新增按钮页遮挡）
    onDismiss: (opt && typeof opt.onDismiss === "function") ? opt.onDismiss : null,
    onDismissCalled: false
  };


  function Ld(msg) { try { if (self.L) self.L.d("[shortcut] " + msg); } catch(e) {} }
  function Li(msg) { try { if (self.L) self.L.i("[shortcut] " + msg); } catch(e) {} }
  function Le(msg) { try { if (self.L) self.L.e("[shortcut] " + msg); } catch(e) {} }

  function runOn(handler, fn) {
    try {
      handler.post(new JavaAdapter(Runnable, { run: function() { try { fn(); } catch(e) {} } }));
      return true;
    } catch(e) { return false; }
  }
  function hide() {
    // # 这段代码的主要内容/用途：隐藏"选择快捷方式"窗口（不 removeView、不销毁线程），显著降低 system_server 概率性崩溃
    runOn(h, function() {
      // # 会话检查：过期会话直接丢弃
      if (!checkSession()) return;

      if (state.destroyed) return;
      if (state.hidden) return;
      state.hidden = true;
      state.scrollPollRunning = false;

      // # 停止队列与异步：隐藏后不再触发 UI/图标加载逻辑
      try { h.removeCallbacksAndMessages(null); } catch(eCB0) {}
      try { bgH.removeCallbacksAndMessages(null); } catch(eCB1) {}

      // # 输入法/焦点：无论是否弹出输入法，都先退焦点并尝试隐藏软键盘
      try {
        if (state.etSearch) {
          try { state.etSearch.clearFocus(); } catch(eK0) {}
          try {
            var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            if (imm) imm.hideSoftInputFromWindow(state.etSearch.getWindowToken(), 0);
          } catch(eK1) {}
        }
      } catch(eK2) {}

      // # 仅隐藏 View：不触碰 WM removeView，避免 WM/IME token 状态机被打乱
      try {
        if (state.root) {
          state.root.setVisibility(android.view.View.GONE);
        }
      } catch(eV0) {}

      // # 退出线程：hide 时也释放线程，避免反复打开/隐藏导致线程堆积
      try {
        var killer = new Thread(new JavaAdapter(Runnable, {
          run: function() {
            try { bgHt.quitSafely(); } catch(e2) {}
            try { ht.quitSafely(); } catch(e3) {}
          }
        }));
        killer.start();
      } catch(eQuit) {}

      // # 通知外层：选择器已隐藏，可恢复上层面板显示
      try {
        if (state.onDismiss && !state.onDismissCalled) {
          state.onDismissCalled = true;
          try { state.onDismiss(); } catch(eOD0) {}
        }
      } catch(eOD1) {}
    });
  }

  function destroy() {
    // # 会话清理：标记当前会话已结束
    destroySession();

    // # 这段代码的主要内容/用途：彻底销毁选择器（仅在 wm_add_failed 等失败场景使用）
    runOn(h, function() {
      if (state.destroyed) return;
      state.destroyed = true;
      state.hidden = true;
      state.scrollPollRunning = false;

      // # 清理消息队列
      try { h.removeCallbacksAndMessages(null); } catch(eCB0) {}
      try { bgH.removeCallbacksAndMessages(null); } catch(eCB1) {}

      try { state.iconQ = []; } catch(e0) {}
      state.iconInFlight = 0;

      // # 通知外层：选择器即将销毁，可恢复上层面板显示
      try {
        if (state.onDismiss && !state.onDismissCalled) {
          state.onDismissCalled = true;
          try { state.onDismiss(); } catch(eOD0) {}
        }
      } catch(eOD1) {}

      // # 输入法/焦点清理
      try {
        if (state.etSearch) {
          try { state.etSearch.clearFocus(); } catch(eK0) {}
          try {
            var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            if (imm) imm.hideSoftInputFromWindow(state.etSearch.getWindowToken(), 0);
          } catch(eK1) {}
        }
      } catch(eK2) {}

      // # 尝试移除 View（失败也吞掉，避免把 system_server 再次打穿）
      var rootRef = state.root;
      var wasAdded = state.isAdded;
      try {
        if (rootRef && wasAdded) {
          try { wm.removeViewImmediate(rootRef); } catch(eR0) { try { wm.removeView(rootRef); } catch(eR1) {} }
        }
      } catch(eR2) {}

      state.isAdded = false;
      state.root = null;

      // # 单例清理
      try { if (self.__shortcutPickerSingleton && self.__shortcutPickerSingleton.instanceId === state.instanceId) self.__shortcutPickerSingleton = null; } catch(eS0) {}

      // # 退出线程
      var killer = new Thread(new JavaAdapter(Runnable, {
        run: function() {
          try { bgHt.quitSafely(); } catch(e2) {}
          try { ht.quitSafely(); } catch(e3) {}
        }
      }));
      killer.start();
    });
  }

function cacheGet(key) {
    if (state.iconCache.hasOwnProperty(key)) return state.iconCache[key];
    return null;
  }

  function cachePut(key, drawable) {
    state.iconCache[key] = drawable;
    var seen = false;
    for (var i = state.iconCacheOrder.length - 1; i >= 0; i--) {
      if (state.iconCacheOrder[i] === key) { seen = true; break; }
    }
    if (!seen) state.iconCacheOrder.push(key);

    while (state.iconCacheOrder.length > state.iconCacheMax) {
      var oldKey = state.iconCacheOrder.shift();
      if (oldKey == null) continue;
      if (oldKey === key) continue;
      try { delete state.iconCache[oldKey]; } catch(e1) { state.iconCache[oldKey] = null; }
      try { delete state.iconFail[oldKey]; } catch(e2) { state.iconFail[oldKey] = null; }
    }
  }

  function canTryLoadIcon(key) {
    var rec = state.iconFail[key];
    if (!rec) return true;
    var t = now();
    if (rec.count >= CFG_ICON_FAIL_MAX_RETRY) {
      if (t - rec.ts < 300000) return false;
      return true;
    }
    if (t - rec.ts < CFG_ICON_FAIL_TTL_MS) return false;
    return true;
  }

  function markIconFail(key) {
    var t = now();
    var rec = state.iconFail[key];
    if (!rec) rec = { ts: t, count: 1 };
    else { rec.ts = t; rec.count = (rec.count || 0) + 1; }
    state.iconFail[key] = rec;
  }

  function enqueueIconLoad(item, iv, key) {
    if (!item || !iv || !key) return;
    if (!canTryLoadIcon(key)) return;

    state.iconQ.push({ item: item, iv: iv, key: key });
    pumpIconQ();
  }

  function pumpIconQ() {
    if (state.destroyed) return;
    while (state.iconInFlight < state.iconConc && state.iconQ.length > 0) {
      var job = state.iconQ.shift();
      if (!job) continue;
      state.iconInFlight++;

      (function(j) {
        runOn(bgH, function() {
          var dr = null;
          try { dr = loadShortcutIconDrawable(j.item); } catch(e0) { dr = null; }
          runOn(h, function() {
            state.iconInFlight--;
            if (state.destroyed) return;

            if (dr) {
              try { j.iv.setImageDrawable(dr); } catch(e1) {}
              cachePut(j.key, dr);
            } else {
              markIconFail(j.key);
            }
            pumpIconQ();
          });
        });
      })(job);
    }
  }

  function setStat(text) { try { if (state.tvStat) state.tvStat.setText(String(text)); } catch(e) {} }

  function rebuildRenderList() {
    var g = state.groups ? state.groups[state.currentGroupKey] : null;
    var base = (g && g.items) ? g.items : state.allItems;
    var filtered = filterItems(base, state.query);

    state.renderList = filtered;
    state.renderCursor = 0;
    state.isAppending = false;
    state.lastAppendTryTs = 0;
  }

  function clearGrid() {
    try {
      if (state.grid) state.grid.removeAllViews();
    } catch(e) {}
  }

  function appendBatch() {
    if (state.destroyed) return;
    if (!state.grid) return;

    if (state.isAppending) return;
    state.isAppending = true;

    var start = state.renderCursor;
    var end = Math.min(state.renderCursor + CFG_PAGE_BATCH, state.renderList.length);

    for (var i = start; i < end; i++) {
      (function(idx) {
        var it = state.renderList[idx];

        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);

        // # 条目间距：卡片式列表，每条之间留 8dp 间隔
        try {
          var lpRow = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
          lpRow.setMargins(0, 0, 0, self.dp(8));
          row.setLayoutParams(lpRow);
        } catch(eLpR) {}

        row.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));

        // # 行背景：与 ToolHub 卡片色一致，并加轻微描边增强层次
        try {
          var isDark = self.isDarkTheme();
          var bgColor = isDark ? self.ui.colors.cardDark : self.ui.colors.cardLight;
          var stroke = isDark ? self.ui.colors.dividerDark : self.ui.colors.dividerLight;
          row.setBackground(self.ui.createStrokeDrawable(bgColor, stroke, self.dp(1), self.dp(12)));
        } catch(eBg) {}

        var iv = new android.widget.ImageView(context);
        var lpI = new android.widget.LinearLayout.LayoutParams(self.dp(40), self.dp(40));
        lpI.setMargins(0, 0, self.dp(12), 0);
        iv.setLayoutParams(lpI);
        try { iv.setImageResource(android.R.drawable.sym_def_app_icon); } catch(eI0) {}

        var key = safeStr(it.pkg) + "@" + safeStr(it.id) + "@" + safeStr(it.userId);
        var cached = cacheGet(key);
        if (cached) {
          try { iv.setImageDrawable(cached); } catch(eIC) {}
        } else {
          enqueueIconLoad(it, iv, key);
        }

        var col = new android.widget.LinearLayout(context);
        col.setOrientation(android.widget.LinearLayout.VERTICAL);
        var lpC = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        lpC.weight = 1;
        col.setLayoutParams(lpC);

        var tv1 = new android.widget.TextView(context);
        tv1.setText(safeStr(it.label || it.id || it.pkg));
        tv1.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        try { tv1.setTypeface(null, android.graphics.Typeface.BOLD); } catch(eB) {}
        try { tv1.setTextColor(self.isDarkTheme() ? self.ui.colors.textPriDark : self.ui.colors.textPriLight); } catch(eC1) {}
        tv1.setSingleLine(true);
        tv1.setEllipsize(android.text.TextUtils.TruncateAt.END);
        col.addView(tv1);

        var tv2 = new android.widget.TextView(context);
        tv2.setText(safeStr(it.pkg) + " / " + safeStr(it.id));
        tv2.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        tv2.setSingleLine(true);
        tv2.setEllipsize(android.text.TextUtils.TruncateAt.END);
        try { tv2.setTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight); } catch(eC2) {}
        col.addView(tv2);

        // # pick 模式：额外显示 userId，避免多用户/工作资料混淆
        if (mode === "pick") {
          var tv3 = new android.widget.TextView(context);
          tv3.setText("userId: " + safeStr(it.userId));
          tv3.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
          tv3.setSingleLine(true);
          try { tv3.setTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight); } catch(eC3) {}
          col.addView(tv3);
        }

        row.addView(iv);
        row.addView(col);

        // 点击：pick 模式回传；browse 模式尝试启动
        row.setOnClickListener(new android.view.View.OnClickListener({
          onClick: function() {
            try {
              if (mode === "pick") {
                if (onPick) onPick({ pkg: it.pkg, shortcutId: it.id, label: it.label, userId: it.userId, intentUri: it.intentUri });
                hide();
                return;
              }
              // browse：尽力启动（用 LauncherApps.startShortcut）
              try {
                var la = context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
                if (la) {
                  var uh = android.os.UserHandle.of(parseInt(String(it.userId), 10));
                  la.startShortcut(String(it.pkg), String(it.id), null, null, uh);
                  self.toast("已尝试启动: " + safeStr(it.label || it.id));
                } else {
                  self.toast("LauncherApps 不可用");
                }
              } catch(eStart) {
                self.toast("启动失败: " + eStart);
              }
            } catch(eClick) {}
          }
        }));

        state.grid.addView(row);

      })(i);
    }

    state.renderCursor = end;
    state.isAppending = false;

    // 统计
    setStat("快捷方式: " + String(state.renderList.length) + "  已渲染: " + String(state.renderCursor));
  }

  function setupTabs() {
    try {
      if (!state.tabRow) return;
      state.tabRow.removeAllViews();
      var order = state.groupOrder || [];
      for (var i = 0; i < order.length; i++) {
        (function(key) {
          var g = state.groups[key];
          var tv = new android.widget.TextView(context);
          tv.setText(safeStr(g ? g.title : key));
          tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
          tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
          tv.setSingleLine(true);
          tv.setEllipsize(android.text.TextUtils.TruncateAt.END);

          var isSel = (key === state.currentGroupKey);
          var isDark = self.isDarkTheme();

          // # Tabs 选中态：用 accent 低透明底 + 更醒目的文字；未选中态：轻描边
          try {
            var tPri = isDark ? self.ui.colors.textPriDark : self.ui.colors.textPriLight;
            var tSec = isDark ? self.ui.colors.textSecDark : self.ui.colors.textSecLight;

            var bgColor = isSel ? self.withAlpha(self.ui.colors.accent, isDark ? 0.22 : 0.14)
                                : (isDark ? self.withAlpha(android.graphics.Color.BLACK, 0.10)
                                          : self.withAlpha(android.graphics.Color.BLACK, 0.04));
            var stroke = isDark ? self.ui.colors.dividerDark : self.ui.colors.dividerLight;

            tv.setTextColor(isSel ? tPri : tSec);
            tv.setBackground(self.ui.createStrokeDrawable(bgColor, stroke, self.dp(1), self.dp(16)));
          } catch(eBg) {}

          tv.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
              state.currentGroupKey = key;
              rebuildRenderList();
              clearGrid();
              appendBatch();
              setupTabs();
            }
          }));

          var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
          lp.setMargins(0, 0, self.dp(8), 0);
          tv.setLayoutParams(lp);
          state.tabRow.addView(tv);
        })(order[i]);
      }
    } catch(e) {}
  }

  function startScrollPoll() {
    if (state.scrollPollRunning) return;
    state.scrollPollRunning = true;

    function tick() {
      if (!state.scrollPollRunning || state.destroyed) return;
      runOn(h, function() {
        try {
          if (!state.scrollView) { schedule(); return; }
          var sv = state.scrollView;
          var child = sv.getChildAt(0);
          if (!child) { schedule(); return; }

          var dy = sv.getScrollY();
          var vh = sv.getHeight();
          var ch = child.getHeight();

          // 触底阈值：80dp
          var near = (dy + vh) >= (ch - self.dp(80));
          if (near) {
            if (state.renderCursor < state.renderList.length) {
              appendBatch();
            }
          }
        } catch(e) {}
        schedule();
      });
    }

    function schedule() {
      try {
        h.postDelayed(new JavaAdapter(Runnable, { run: tick }), 180);
      } catch(e) {}
    }

    schedule();
  }

  function buildUI() {
    // # 这段代码的主要内容/用途：构建"选择快捷方式"页面 UI（颜色/间距/字体与 ToolHub 面板统一）。
    // 说明：尽量复用 ToolHub 的 UI helper 色板（light/dark），避免出现"黑底黑字/黄底刺眼"等问题。

    // # root（标准面板容器：圆角 + 轻阴影 + 统一 padding）
    var root = self.ui.createStyledPanel(self, 12);

    // # 顶栏（标题 + 右侧关闭）
    var top = self.ui.createStyledHeader(self, 10);

    var title = new android.widget.TextView(context);
    title.setText(mode === "pick" ? "选择快捷方式" : "快捷方式浏览器");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    try { title.setTypeface(null, android.graphics.Typeface.BOLD); } catch(e) {}
    try { title.setTextColor(self.isDarkTheme() ? self.ui.colors.textPriDark : self.ui.colors.textPriLight); } catch(e) {}

    var lpT = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    lpT.weight = 1;
    title.setLayoutParams(lpT);

    // 关闭按钮：用 flat 风格，颜色与危险色一致（更像"工具面板"的关闭）
    var btnClose = self.ui.createFlatButton(self, (mode === "pick" ? "取消" : "关闭"), self.ui.colors.danger, function() {
      hide();
    });
    try {
      btnClose.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
      btnClose.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    } catch(e) {}

    top.addView(title);
    top.addView(btnClose);

    // # 搜索框（可聚焦 + 统一输入背景）
    var et = new android.widget.EditText(context);
    et.setHint("搜索：名称 / 包名 / ID");
    et.setSingleLine(true);
    et.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));
    try {
      et.setTextColor(self.isDarkTheme() ? self.ui.colors.textPriDark : self.ui.colors.textPriLight);
      et.setHintTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight);
    } catch(e) {}

    try {
      var inBg = self.ui.createRoundDrawable(self.isDarkTheme() ? self.ui.colors.inputBgDark : self.ui.colors.inputBgLight, self.dp(12));
      et.setBackground(inBg);
    } catch(eBg) {}

    // # Tabs（横向滚动：统一为"胶囊按钮"风格，选中态更明确）
    var tabSv = new android.widget.HorizontalScrollView(context);
    tabSv.setHorizontalScrollBarEnabled(false);
    tabSv.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);

    var tabRow = new android.widget.LinearLayout(context);
    tabRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    try { tabRow.setPadding(0, self.dp(8), 0, self.dp(6)); } catch(e) {}
    tabSv.addView(tabRow);

    // # 状态栏（数量/渲染进度）
    var tvStat = new android.widget.TextView(context);
    tvStat.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    try { tvStat.setTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight); } catch(e) {}
    tvStat.setPadding(0, self.dp(6), 0, self.dp(6));

    // # 列表（卡片式条目列表）
    var sv = new android.widget.ScrollView(context);
    sv.setFillViewport(true);
    sv.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);

    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    try { list.setPadding(0, self.dp(2), 0, self.dp(2)); } catch(e) {}
    sv.addView(list);

    // bind
    state.root = root;
    state.etSearch = et;
    state.tabRow = tabRow;
    state.tvStat = tvStat;
    state.grid = list;
    state.scrollView = sv;

    // listeners：实时过滤（TextWatcher）
    try {
      var TextWatcher = android.text.TextWatcher;
      et.addTextChangedListener(new JavaAdapter(TextWatcher, {
        beforeTextChanged: function() {},
        onTextChanged: function() {},
        afterTextChanged: function(s) {
          try {
            if (state.destroyed) return;
            state.query = safeStr(s);
            rebuildRenderList();
            clearGrid();
            appendBatch();
          } catch(e) {}
        }
      }));
    } catch(eTw) {}

    // layout
    root.addView(top);

    // 搜索框与 tabs 之间留一点呼吸空间
    try {
      var lpEt = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
      lpEt.setMargins(0, 0, 0, self.dp(8));
      et.setLayoutParams(lpEt);
    } catch(eLpEt) {}
    root.addView(et);

    root.addView(tabSv);
    root.addView(tvStat);

    var lpSv = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0);
    lpSv.weight = 1;
    sv.setLayoutParams(lpSv);
    root.addView(sv);

    // 主题：用 ToolHub 现有的背景更新逻辑兜底（防止外部主题配置影响）
    try { self.updatePanelBackground(root); } catch(eTheme) {}

    return root;
  }

  function show() {
    runOn(h, function() {
      // # 会话检查：过期会话直接丢弃
      if (!checkSession()) return;

      // # 稳定性：复用已添加的 root，避免频繁 add/removeView 触发 system_server WM 状态机崩溃
      if (state.root && state.isAdded) {
        state.hidden = false;
        // # 每次显示前允许再次触发 onDismiss（用于外层恢复）
        state.onDismissCalled = false;
        // # UI 修复：每次重新显示时都重新把窗口定位到屏幕顶部（横向居中 + y=0），避免被其它面板遮挡或位置漂移
        try {
          if (state.params) {
            state.params.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
            // # UI 修复：复用显示时也强制关闭 IME 调整，避免上次输入导致位置被系统推下去
            try {
              state.params.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
                | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;
            } catch(eSIM1) {}
            try {
              state.params.flags = state.params.flags
                | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
            } catch(eTop1) {}
            var sw2 = (self.state && self.state.screen && self.state.screen.w) ? self.state.screen.w : 0;
            if (sw2 > 0) state.params.x = Math.max(0, Math.round((sw2 - state.params.width) / 2));
            else state.params.x = 0;
            state.params.y = 0;
            wm.updateViewLayout(state.root, state.params);
          }
        } catch(ePos2) {}

        // # 层级修复：同类型(TYPE_APPLICATION_OVERLAY)窗口之间的上下层由 addView 顺序决定
        // # 说明：当"新增按钮页/主面板"在本窗口之后 addView 时，会把本窗口盖住；复用 show 仅 setVisibility 无法提升层级
        // # 处理：在 WM 线程内对本窗口做一次 removeViewImmediate + addView 以"提到最上层"（不在关闭时 remove，避免旧崩溃路径）
        try {
          var tsNow = now();
          if (!state.lastRaiseTs || (tsNow - state.lastRaiseTs) > 300) {
            state.lastRaiseTs = tsNow;
            try { wm.removeViewImmediate(state.root); } catch(eZ0) {}
            try { wm.addView(state.root, state.params); } catch(eZ1) {}
            state.isAdded = true;
          }
        } catch(eZ2) {}
try { state.root.setVisibility(android.view.View.VISIBLE); } catch(eVis) {}
        try {
          setStat("正在加载快捷方式...");
          Li("reloading shortcuts index...");
        } catch(e0) {}
        try {
          state.allItems = buildShortcutItemsIndex();
          var gg = groupItems(state.allItems);
          state.groups = gg.groups;
          state.groupOrder = gg.order;
        } catch(e1) {
          state.allItems = [];
          state.groups = groupItems([]).groups;
          state.groupOrder = ["__ALL__"];
          Le("build index err=" + String(e1));
        }
        try { setupTabs(); } catch(eT0) {}
        try { rebuildRenderList(); } catch(eT1) {}
        try { clearGrid(); } catch(eT2) {}
        try { appendBatch(); } catch(eT3) {}
        try { startScrollPoll(); } catch(eT4) {}
        Li("shortcut picker reused items=" + String(state.allItems.length));
        return;
      }

      try {
        // build data
        setStat("正在加载快捷方式...");
        Li("loading shortcuts index...");
      } catch(e0) {}

      try {
        state.allItems = buildShortcutItemsIndex();
        var gg = groupItems(state.allItems);
        state.groups = gg.groups;
        state.groupOrder = gg.order;
      } catch(e1) {
        state.allItems = [];
        state.groups = groupItems([]).groups;
        state.groupOrder = ["__ALL__"];
        Le("build index err=" + String(e1));
      }

      // build UI
      var root = buildUI();

      // wm params
      var p = new android.view.WindowManager.LayoutParams();
      p.type = android.view.WindowManager.LayoutParams.TYPE_SYSTEM_DIALOG; // 修改：提升窗口层级，确保多次打开后仍在最顶层
      // # 说明：TYPE_APPLICATION_OVERLAY 与其他面板同层时会按 add 顺序叠放，频繁开关后容易被后开的面板盖住。
      // #       TYPE_SYSTEM_DIALOG 层级更高，可稳定压过 ToolHub 其他面板（仍不频繁 add/remove，避免崩溃）。
      p.flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
      p.format = android.graphics.PixelFormat.TRANSLUCENT;
      // # UI 修复：固定在顶部显示时，避免被输入法/系统 inset 影响导致二次打开位置下移
      // # 说明：不使用 ADJUST_RESIZE/ADJUST_PAN，让窗口位置不被 IME 推动；同时默认隐藏软键盘状态
      try {
        p.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
          | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;
      } catch(eSIM0) {}
      // # 允许窗口覆盖到屏幕顶部区域（含状态栏区域），避免视觉上"不是贴顶"
      try {
        p.flags = p.flags
          | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
          | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
      } catch(eTop0) {}
      p.width = self.dp(340);
      p.height = self.dp(520);
      // # UI 修复：选择快捷方式页应贴近屏幕顶部显示（与"新增按钮页"的顶部布局一致），而不是居中
      // # 说明：居中会让用户感觉"弹窗不是在顶部"，也更容易被其它面板遮挡。
      p.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
      try {
        var sw = (self.state && self.state.screen && self.state.screen.w) ? self.state.screen.w : 0;
        // 顶部显示：水平居中 + y=0
        if (sw > 0) p.x = Math.max(0, Math.round((sw - p.width) / 2));
        else p.x = 0;
        p.y = 0;
      } catch(ePos) {
        p.x = 0;
        p.y = 0;
      }

      // 允许输入法：搜索框要能聚焦
      try {
        p.flags = p.flags & (~android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE);
      } catch(eF) {}

      state.params = p;

      try {
        wm.addView(root, p);
        state.isAdded = true;
      } catch(eAdd) {
        Le("wm addView err=" + String(eAdd));
        destroy();
        self.toast("快捷方式选择器打开失败: wm_add_failed");
        return;
      }

      // tabs + first render
      setupTabs();
      rebuildRenderList();
      appendBatch();
      startScrollPoll();

      Li("shortcut picker shown items=" + String(state.allItems.length));
    });
  }

  // 入口
  // # 创建单例 API：后续再次打开直接复用已添加的 root 与线程，只做"显示/刷新"，不做 removeView
  var api = {
    instanceId: state.instanceId,
    show: function(newOpts) {
      try {
        var o = newOpts || {};
        mode = (o.mode != null) ? String(o.mode) : mode;
        onPick = (typeof o.onPick === "function") ? o.onPick : onPick;
      } catch(eOpt) {}
      // # 显示前先把隐藏标记清掉
      try { state.hidden = false; } catch(eH0) {}
      show();
    },
    hide: hide,
    destroy: destroy
  };
  try { self.__shortcutPickerSingleton = api; } catch(eSet) {}
  api.show(opts);
};

// =======================【Content：解析 settings URI】======================
// 这段代码的主要内容/用途：识别 content://settings/(system|secure|global)/KEY 并用 Settings.* get/put 更稳
FloatBallAppWM.prototype.parseSettingsUri = function(uriStr) {
  try {
    var s = String(uriStr || "");
    if (s.indexOf("content://settings/") !== 0) return null;

    // content://settings/system/accelerometer_rotation
    var rest = s.substring("content://settings/".length);
    var parts = rest.split("/");
    if (!parts || parts.length < 1) return null;

    var table = String(parts[0] || "");
    var key = "";
    if (parts.length >= 2) key = String(parts[1] || "");

    if (table !== "system" && table !== "secure" && table !== "global") return null;
    return { table: table, key: key };
  } catch (e) { return null; }
};

FloatBallAppWM.prototype.settingsGetStringByTable = function(table, key) {
  try {
    var cr = context.getContentResolver();
    if (table === "system") return android.provider.Settings.System.getString(cr, String(key));
    if (table === "secure") return android.provider.Settings.Secure.getString(cr, String(key));
    if (table === "global") return android.provider.Settings.Global.getString(cr, String(key));
    return null;
  } catch (e) { return null; }
};

FloatBallAppWM.prototype.settingsPutStringByTable = function(table, key, value) {
  try {
    var cr = context.getContentResolver();
    if (table === "system") return android.provider.Settings.System.putString(cr, String(key), String(value));
    if (table === "secure") return android.provider.Settings.Secure.putString(cr, String(key), String(value));
    if (table === "global") return android.provider.Settings.Global.putString(cr, String(key), String(value));
    return false;
  } catch (e) { return false; }
};

// =======================【Content：通用 query】======================
// 这段代码的主要内容/用途：ContentResolver.query 并把 Cursor 转成文本（用于查看器面板）
FloatBallAppWM.prototype.contentQueryToText = function(uriStr, projection, selection, selectionArgs, sortOrder, maxRows) {
  var out = { ok: false, uri: String(uriStr || ""), rows: 0, text: "", err: "" };
  var cr = null;
  var cur = null;

  try {
    cr = context.getContentResolver();
    var uri = android.net.Uri.parse(String(uriStr));

    var projArr = null;
    if (projection && projection.length) {
      projArr = java.lang.reflect.Array.newInstance(java.lang.String, projection.length);
      var i0;
      for (i0 = 0; i0 < projection.length; i0++) projArr[i0] = String(projection[i0]);
    }

    var sel = (selection === undefined || selection === null) ? null : String(selection);

    var selArgsArr = null;
    if (selectionArgs && selectionArgs.length) {
      selArgsArr = java.lang.reflect.Array.newInstance(java.lang.String, selectionArgs.length);
      var i1;
      for (i1 = 0; i1 < selectionArgs.length; i1++) selArgsArr[i1] = String(selectionArgs[i1]);
    }

    var so = (sortOrder === undefined || sortOrder === null) ? null : String(sortOrder);

    cur = cr.query(uri, projArr, sel, selArgsArr, so);
    if (!cur) {
      out.err = "query return null cursor";
      return out;
    }

    var colCount = cur.getColumnCount();
    var cols = [];
    var ci;
    for (ci = 0; ci < colCount; ci++) cols.push(String(cur.getColumnName(ci)));

    var sb = [];
    sb.push("URI: " + String(uriStr));
    sb.push("Columns(" + String(colCount) + "): " + cols.join(", "));
    sb.push("");

    var limit = Math.max(1, Math.floor(Number(maxRows || this.config.CONTENT_MAX_ROWS || 20)));
    var row = 0;

    while (cur.moveToNext()) {
      row++;
      sb.push("#" + String(row));
      var cj;
      for (cj = 0; cj < colCount; cj++) {
        var v = "";
        try {
          if (cur.isNull(cj)) v = "null";
          else v = String(cur.getString(cj));
        } catch (eV) {
          try { v = String(cur.getLong(cj)); } catch (eV2) { v = "<??>"; }
        }
        sb.push("  " + cols[cj] + " = " + v);
      }
      sb.push("");
      if (row >= limit) break;
    }

    out.ok = true;
    out.rows = row;
    out.text = sb.join("\n");
    return out;
  } catch (e) {
    out.err = String(e);
    return out;
  } finally {
    try { if (cur) cur.close(); } catch (eC) {}
  }
};

// =======================【Content：统一入口】======================
// 这段代码的主要内容/用途：处理按钮里的 type:"content"
FloatBallAppWM.prototype.execContentAction = function(btn) {
  var mode = btn.mode ? String(btn.mode) : ((btn.value !== undefined && btn.value !== null) ? "put" : "get");
  var uri = btn.uri ? String(btn.uri) : "";
  if (!uri) return { ok: false, err: "missing uri" };

  // settings uri 优先走 Settings API
  var su = this.parseSettingsUri(uri);

  if (mode === "get") {
    if (su && su.key) {
      var v = this.settingsGetStringByTable(su.table, su.key);
      return { ok: true, mode: "get", kind: "settings", table: su.table, key: su.key, value: (v === null ? "null" : String(v)) };
    }

    // 非 settings：尝试 query 一行
    var q1 = this.contentQueryToText(uri, btn.projection, btn.selection, btn.selectionArgs, btn.sortOrder, 1);
    if (!q1.ok) return { ok: false, mode: "get", kind: "query", err: q1.err };
    return { ok: true, mode: "get", kind: "query", text: q1.text, rows: q1.rows };
  }

  if (mode === "put") {
    var val = (btn.value === undefined || btn.value === null) ? "" : String(btn.value);

    if (su && su.key) {
      var ok = this.settingsPutStringByTable(su.table, su.key, val);
      return { ok: !!ok, mode: "put", kind: "settings", table: su.table, key: su.key, value: val };
    }

    // 非 settings：尽力走 update(ContentValues)
    try {
      var cr = context.getContentResolver();
      var u = android.net.Uri.parse(uri);
      var cv = new android.content.ContentValues();

      // 支持 btn.values = {col1: "...", col2: "..."}；否则写 value 列
      if (btn.values) {
        var k;
        for (k in btn.values) {
          if (!btn.values.hasOwnProperty(k)) continue;
          cv.put(String(k), String(btn.values[k]));
        }
      } else {
        cv.put("value", val);
      }

      var where = (btn.selection === undefined || btn.selection === null) ? null : String(btn.selection);

      var whereArgs = null;
      if (btn.selectionArgs && btn.selectionArgs.length) {
        whereArgs = java.lang.reflect.Array.newInstance(java.lang.String, btn.selectionArgs.length);
        var i2;
        for (i2 = 0; i2 < btn.selectionArgs.length; i2++) whereArgs[i2] = String(btn.selectionArgs[i2]);
      }

      var n = cr.update(u, cv, where, whereArgs);
      return { ok: true, mode: "put", kind: "update", updated: Number(n) };
    } catch (eU) {
      return { ok: false, mode: "put", kind: "update", err: String(eU) };
    }
  }

  if (mode === "query") {
    var maxRows = (btn.maxRows === undefined || btn.maxRows === null) ? this.config.CONTENT_MAX_ROWS : Number(btn.maxRows);
    var q = this.contentQueryToText(uri, btn.projection, btn.selection, btn.selectionArgs, btn.sortOrder, maxRows);
    if (!q.ok) return { ok: false, mode: "query", err: q.err };
    return { ok: true, mode: "query", rows: q.rows, text: q.text };
  }

  if (mode === "view") {
    try {
      var it = new android.content.Intent(android.content.Intent.ACTION_VIEW);
      it.setData(android.net.Uri.parse(uri));
      it.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
      context.startActivity(it);
      return { ok: true, mode: "view" };
    } catch (eV) {
      return { ok: false, mode: "view", err: String(eV) };
    }
  }

  return { ok: false, err: "unknown mode=" + mode };
};

/* =======================
   下面开始：WM 动画、面板、触摸、启动、输出
   ======================= */

FloatBallAppWM.prototype.animateBallLayout = function(toX, toY, toW, durMs, endCb) {
  var st = this.state;
  if (!st.addedBall || !st.ballRoot || !st.ballLp) { if (endCb) endCb(); return; }

  var fromX = st.ballLp.x;
  var fromY = st.ballLp.y;
  var fromW = st.ballLp.width;

  try {
    var va = android.animation.ValueAnimator.ofFloat(0.0, 1.0);
    va.setDuration(durMs);
    try {
        // 使用 OvershootInterpolator 产生轻微的回弹效果，更加生动
        // 0.7 的张力适中，不会过于夸张
        va.setInterpolator(new android.view.animation.OvershootInterpolator(0.7));
    } catch (eI) {
        try { va.setInterpolator(new android.view.animation.DecelerateInterpolator()); } catch (eI2) {}
    }

    var self = this;

    va.addUpdateListener(new android.animation.ValueAnimator.AnimatorUpdateListener({
      onAnimationUpdate: function(anim) {
        try {
          if (self.state.closing) return;
          if (!self.state.addedBall) return;

          var f = anim.getAnimatedValue();
          var nx = Math.round(fromX + (toX - fromX) * f);
          var ny = Math.round(fromY + (toY - fromY) * f);
          var nw = Math.round(fromW + (toW - fromW) * f);

          // 性能优化：只有坐标真正变化时才请求 WindowManager 更新
          if (nx !== self.state.ballLp.x || ny !== self.state.ballLp.y || nw !== self.state.ballLp.width) {
              self.state.ballLp.x = nx;
              self.state.ballLp.y = ny;
              self.state.ballLp.width = nw;
              // # 关键操作使用 safeOperation 封装
              safeOperation("dockAnimation.updateViewLayout", function() {
                self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp);
              }, true, self.L);
          }
        } catch (e) {}
      }
    }));

    va.addListener(new android.animation.Animator.AnimatorListener({
      onAnimationStart: function() {},
      onAnimationRepeat: function() {},
      onAnimationCancel: function() {},
      onAnimationEnd: function() {
        try {
          if (!self.state.closing && self.state.addedBall) {
            self.state.ballLp.x = toX;
            self.state.ballLp.y = toY;
            self.state.ballLp.width = toW;
            self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp);
            self.savePos(self.state.ballLp.x, self.state.ballLp.y);
          }
        } catch (e2) {}
        try { if (endCb) endCb(); } catch (eCb) { try { if (self && self.L && self.L.e) self.L.e("animateBallLayout endCb err=" + String(eCb)); } catch (eLog) {} }
      }
    }));

    va.start();
  } catch (e0) {
    try {
      st.ballLp.x = toX;
      st.ballLp.y = toY;
      st.ballLp.width = toW;
      st.wm.updateViewLayout(st.ballRoot, st.ballLp);
      this.savePos(st.ballLp.x, st.ballLp.y);
    } catch (e1) {}
    try { if (endCb) endCb(); } catch (eCb2) { try { if (this && this.L && this.L.e) this.L.e("animateBallLayout endCb err=" + String(eCb2)); } catch (eLog2) {} }
  }
};

FloatBallAppWM.prototype.playBounce = function(v) {
  if (!this.config.ENABLE_BOUNCE) return;
  if (!this.config.ENABLE_ANIMATIONS) return;

  try { v.animate().cancel(); } catch (e0) {}

  var self = this;
  var i = 0;

  function step() {
    if (self.state.closing) return;

    if (i >= self.config.BOUNCE_TIMES) {
      try { v.setScaleX(1); v.setScaleY(1); } catch (e2) {}
      return;
    }

    var amp = (self.config.BOUNCE_MAX_SCALE - 1) * Math.pow(self.config.BOUNCE_DECAY, i);
    var s = 1 + amp;

    v.animate()
      .scaleX(s)
      .scaleY(s)
      .setDuration(self.config.BOUNCE_STEP_MS)
      .setInterpolator(new android.view.animation.OvershootInterpolator())
      .withEndAction(new JavaAdapter(java.lang.Runnable, {
        run: function() {
          v.animate()
            .scaleX(1)
            .scaleY(1)
            .setDuration(self.config.BOUNCE_STEP_MS)
            .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator())
            .withEndAction(new JavaAdapter(java.lang.Runnable, {
              run: function() { i++; step(); }
            }))
            .start();
        }
      }))
      .start();
  }

  step();
};

FloatBallAppWM.prototype.safeRemoveView = function(v, whichName) {
  try {
    if (!v) return { ok: true, skipped: true };
    this.state.wm.removeView(v);
    return { ok: true };
  } catch (e) {
    safeLog(this.L, 'w',  "removeView fail which=" + String(whichName || "") + " err=" + String(e));
    return { ok: false, err: String(e), where: whichName || "" };
  }
};

FloatBallAppWM.prototype.hideMask = function() {
  if (!this.state.addedMask) return;
  if (!this.state.mask) return;

  this.safeRemoveView(this.state.mask, "mask");
  this.state.mask = null;
  this.state.maskLp = null;
  this.state.addedMask = false;
};

FloatBallAppWM.prototype.hideMainPanel = function() {
  if (!this.state.addedPanel) return;
  if (!this.state.panel) return;

  this.safeRemoveView(this.state.panel, "panel");
  this.state.panel = null;
  this.state.panelLp = null;
  this.state.addedPanel = false;

  this.hideMask();
  this.touchActivity();

  this._clearHeavyCachesIfAllHidden("hideMainPanel");
};

FloatBallAppWM.prototype.hideSettingsPanel = function() {
  if (!this.state.addedSettings) return;
  if (!this.state.settingsPanel) return;

  this.safeRemoveView(this.state.settingsPanel, "settingsPanel");
  this.state.settingsPanel = null;
  this.state.settingsPanelLp = null;
  this.state.addedSettings = false;

  this.state.pendingUserCfg = null;
  this.state.pendingDirty = false;

  this.hideMask();
  this.touchActivity();

  this._clearHeavyCachesIfAllHidden("hideSettingsPanel");
};

FloatBallAppWM.prototype.hideViewerPanel = function() {
  if (!this.state.addedViewer) return;
  if (!this.state.viewerPanel) return;

  this.safeRemoveView(this.state.viewerPanel, "viewerPanel");
  this.state.viewerPanel = null;
  this.state.viewerPanelLp = null;
  this.state.addedViewer = false;

  this.hideMask();
  this.touchActivity();

  this._clearHeavyCachesIfAllHidden("hideViewerPanel");
};

FloatBallAppWM.prototype.clearHeavyCaches = function(reason) {
  // 这段代码的主要内容/用途：在所有面板都关闭后，主动清理"图标/快捷方式"等重缓存，降低 system_server 常驻内存。
  // 说明：仅清理缓存引用，不强行 recycle Bitmap，避免误伤仍被使用的 Drawable。
  
  // # 防抖：5秒内相同 reason 不重复清理
  var now = Date.now();
  var cacheKey = "_lastClear_" + (reason || "default");
  var lastClear = this.state[cacheKey] || 0;
  if (now - lastClear < 5000) {
    return; // 5秒内已清理过，跳过
  }
  this.state[cacheKey] = now;
  
  try { this._iconLru = null; } catch (eLruClr) {}
  try { this._shortcutIconFailTs = {}; } catch (e2) {}

  // # Shortcuts 相关全局缓存（按钮编辑页/快捷方式选择器可能会创建）
  try { if (typeof __scIconCache !== "undefined") __scIconCache = {}; } catch (e3) {}
  try { if (typeof __scAppLabelCache !== "undefined") __scAppLabelCache = {}; } catch (e4) {}

  // # 记录一次清理日志（精简：只记录关键 reason，且 5秒防抖）
  var keyReasons = ["memory_pressure", "screen_changed", "close"];
  var isKeyReason = keyReasons.indexOf(reason) >= 0;
  try { 
    if (isKeyReason && this.L && this.L.i) {
      this.L.i("clearHeavyCaches reason=" + String(reason));
    }
  } catch (e5) {}
};

FloatBallAppWM.prototype._clearHeavyCachesIfAllHidden = function(reason) {
  // 这段代码的主要内容/用途：只在"主面板/设置/查看器"全部关闭后清理缓存，避免页面切换时反复重建导致卡顿。
  try {
    if (!this.state.addedPanel && !this.state.addedSettings && !this.state.addedViewer) {
      this.clearHeavyCaches(reason || "all_hidden");
    }
  } catch (e) {}
};

FloatBallAppWM.prototype.hideAllPanels = function() {
  this.hideMainPanel();
  this.hideSettingsPanel();
  this.hideViewerPanel();
  this.hideMask();

  this._clearHeavyCachesIfAllHidden("hideAllPanels");
};

FloatBallAppWM.prototype.showMask = function() {
  if (this.state.addedMask) return;
  if (this.state.closing) return;

  var self = this;
  var mask = new android.widget.FrameLayout(context);

  // 遮罩层背景：轻微的黑色半透明，提升层次感
  try { mask.setBackgroundColor(android.graphics.Color.parseColor("#33000000")); } catch (e0) {
      mask.setBackgroundColor(0x33000000);
  }

  mask.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) {
      var a = e.getAction();
      if (a === android.view.MotionEvent.ACTION_DOWN) {
        self.touchActivity();
        self.hideAllPanels();
        return true;
      }
      return true;
    }
  }));

  var lp = new android.view.WindowManager.LayoutParams(
    android.view.WindowManager.LayoutParams.MATCH_PARENT,
    android.view.WindowManager.LayoutParams.MATCH_PARENT,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
    android.graphics.PixelFormat.TRANSLUCENT
  );

  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
  lp.x = 0;
  lp.y = 0;

  try {
    this.state.wm.addView(mask, lp);
    this.state.mask = mask;
    this.state.maskLp = lp;
    this.state.addedMask = true;

    // 简单的淡入动画
    try {
        if (this.config.ENABLE_ANIMATIONS) {
            mask.setAlpha(0);
            mask.animate().alpha(1).setDuration(200).start();
        } else {
            mask.setAlpha(1);
        }
    } catch(eAnim){}

  } catch (e1) {
    safeLog(this.L, 'e',  "add mask fail err=" + String(e1));
    this.state.addedMask = false;
  }
};

FloatBallAppWM.prototype.snapToEdgeDocked = function(withAnim, forceSide) {
  if (this.state.closing) return;
  // 移除对面板/Mask的检查，允许在任何情况下强制吸边（如果调用方逻辑正确）
  // 如果需要保护，调用方自己判断
  if (this.state.dragging) return;

  var di = this.getDockInfo();
  var ballSize = di.ballSize;
  var visible = di.visiblePx;
  var hidden = di.hiddenPx;

  var snapLeft;
  if (forceSide === "left") snapLeft = true;
  else if (forceSide === "right") snapLeft = false;
  else {
      // 默认根据中心点判断
      var centerX = this.state.ballLp.x + Math.round(ballSize / 2);
      snapLeft = centerX < Math.round(this.state.screen.w / 2);
  }

  var targetW = visible;
  var targetY = this.clamp(this.state.ballLp.y, 0, this.state.screen.h - ballSize);

  if (snapLeft) {
    this.state.dockSide = "left";
    this.state.docked = true;

    try { this.state.ballContent.setX(-hidden); } catch (eL) {}

    if (withAnim) {
      this.animateBallLayout(0, targetY, targetW, this.config.DOCK_ANIM_MS, null);
    } else {
      this.state.ballLp.x = 0;
      this.state.ballLp.y = targetY;
      this.state.ballLp.width = targetW;
      try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU1) {}
      this.savePos(this.state.ballLp.x, this.state.ballLp.y);
    }

    safeLog(this.L, 'd',  "dock left x=0 y=" + String(targetY) + " w=" + String(targetW));

    // 闲置变暗
    try {
         if (this.config.ENABLE_ANIMATIONS) {
             this.state.ballContent.animate().alpha(this.config.BALL_IDLE_ALPHA).setDuration(300).start();
         } else {
             this.state.ballContent.setAlpha(this.config.BALL_IDLE_ALPHA);
         }
    } catch(eA) {}

    return;
  }

  this.state.dockSide = "right";
  this.state.docked = true;

  try { this.state.ballContent.setX(0); } catch (eR) {}

  var x2 = this.state.screen.w - visible;

  if (withAnim) {
    this.animateBallLayout(x2, targetY, targetW, this.config.DOCK_ANIM_MS, null);
  } else {
    this.state.ballLp.x = x2;
    this.state.ballLp.y = targetY;
    this.state.ballLp.width = targetW;
    try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU2) {}
    this.savePos(this.state.ballLp.x, this.state.ballLp.y);
  }

  // # 日志精简：dock 事件添加防抖（10秒内不重复记录相同边）
  var dockNow = Date.now();
  var lastDock = this.state._lastDockLog || 0;
  if (dockNow - lastDock > 10000) {
    safeLog(this.L, 'i', "dock right x=" + String(x2) + " y=" + String(targetY));
    this.state._lastDockLog = dockNow;
  }

  // 闲置变暗
  try {
     if (this.config.ENABLE_ANIMATIONS) {
         this.state.ballContent.animate().alpha(this.config.BALL_IDLE_ALPHA).setDuration(300).start();
     } else {
         this.state.ballContent.setAlpha(this.config.BALL_IDLE_ALPHA);
     }
  } catch(eA) {}
};

FloatBallAppWM.prototype.undockToFull = function(withAnim, endCb) {
  if (this.state.closing) { if (endCb) endCb(); return; }
  if (!this.state.docked) { if (endCb) endCb(); return; }
  if (!this.state.addedBall) { if (endCb) endCb(); return; }

  var di = this.getDockInfo();
  var ballSize = di.ballSize;
  var targetW = ballSize;
  var targetY = this.clamp(this.state.ballLp.y, 0, this.state.screen.h - ballSize);

  try { this.state.ballContent.setX(0); } catch (e0) {}

  if (this.state.dockSide === "left") {
    this.state.docked = false;
    this.state.dockSide = null;

    if (withAnim) this.animateBallLayout(0, targetY, targetW, this.config.UNDOCK_ANIM_MS, endCb);
    else {
      this.state.ballLp.x = 0;
      this.state.ballLp.y = targetY;
      this.state.ballLp.width = targetW;
      try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU1) {}
      this.savePos(this.state.ballLp.x, this.state.ballLp.y);
      if (endCb) endCb();
    }

    // 恢复不透明度
    try {
         if (withAnim && this.config.ENABLE_ANIMATIONS) {
             this.state.ballContent.animate().alpha(1.0).setDuration(150).start();
         } else {
             this.state.ballContent.setAlpha(1.0);
         }
    } catch(eA) {}

    safeLog(this.L, 'i', "undock from left");
    return;
  }

  var x = this.state.screen.w - ballSize;

  this.state.docked = false;
  this.state.dockSide = null;

  if (withAnim) this.animateBallLayout(x, targetY, targetW, this.config.UNDOCK_ANIM_MS, endCb);
  else {
    this.state.ballLp.x = x;
    this.state.ballLp.y = targetY;
    this.state.ballLp.width = targetW;
    try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU2) {}
    this.savePos(this.state.ballLp.x, this.state.ballLp.y);
    if (endCb) endCb();
  }

  // 恢复不透明度
  try {
     if (withAnim && this.config.ENABLE_ANIMATIONS) {
         this.state.ballContent.animate().alpha(1.0).setDuration(150).start();
     } else {
         this.state.ballContent.setAlpha(1.0);
     }
  } catch(eA) {}

  // # 日志精简：undock 事件改为 INFO 级别，且记录方向
  var undockSide = this.state.dockSide || "right";
  safeLog(this.L, 'i', "undock from " + undockSide);
};

FloatBallAppWM.prototype.cancelDockTimer = function() {
  try { if (this.state.idleDockRunnable && this.state.h) this.state.h.removeCallbacks(this.state.idleDockRunnable); } catch (e) {}
  this.state.idleDockRunnable = null;
};

FloatBallAppWM.prototype.armDockTimer = function() {
  if (this.state.closing) return;
  if (!this.state.h) return;
  if (!this.state.addedBall) return;
  if (this.state.docked) return;

  this.cancelDockTimer();

  var hasPanel = (this.state.addedPanel || this.state.addedSettings || this.state.addedViewer || this.state.addedMask);
  var targetMs = hasPanel ? this.config.PANEL_IDLE_CLOSE_AND_DOCK_MS : this.config.DOCK_AFTER_IDLE_MS;

  var self = this;

  this.state.idleDockRunnable = new java.lang.Runnable({
    run: function() {
      try {
        if (self.state.closing) return;
        if (self.state.docked) return;
        if (self.state.dragging) return;

        var hasPanel2 = (self.state.addedPanel || self.state.addedSettings || self.state.addedViewer || self.state.addedMask);
        var needMs = hasPanel2 ? self.config.PANEL_IDLE_CLOSE_AND_DOCK_MS : self.config.DOCK_AFTER_IDLE_MS;

        var idle = self.now() - self.state.lastMotionTs;
        if (idle < needMs) { self.armDockTimer(); return; }

        // if (hasPanel2) self.hideAllPanels(); // 用户要求不再自动关闭面板
        if (self.config.ENABLE_SNAP_TO_EDGE) {
            self.snapToEdgeDocked(true);
        }
      } catch (e0) {
        if (self.L) self.L.e("dockTimer run err=" + String(e0));
      }
    }
  });

  this.state.h.postDelayed(this.state.idleDockRunnable, targetMs);
};

FloatBallAppWM.prototype.touchActivity = function() {
  this.state.lastMotionTs = this.now();
  this.armDockTimer();
}

// # 点击防抖与安全执行
// 这段代码的主要内容/用途：防止在悬浮面板上快速/乱点导致重复 add/remove、状态机被打穿，从而引发 system_server 异常重启。
FloatBallAppWM.prototype.guardClick = function(key, cooldownMs, fn) {
  try {
    var now = android.os.SystemClock.uptimeMillis();
    if (!this.state._clickGuards) this.state._clickGuards = {};
    var last = this.state._clickGuards[key] || 0;
    var cd = (cooldownMs != null ? cooldownMs : INTERACTION_CONSTANTS.CLICK_COOLDOWN_MS);
    if (now - last < cd) return false;
    this.state._clickGuards[key] = now;
    try {
      fn && fn();
    } catch (e1) {
      safeLog(this.L, 'e',  "guardClick err key=" + String(key) + " err=" + String(e1));
    }
    return true;
  } catch (e0) {
    // 兜底：绝不让点击回调异常冒泡到 system_server
    try { fn && fn(); } catch (e2) {}
    return true;
  }
};

FloatBallAppWM.prototype.safeUiCall = function(tag, fn) {
  try {
    fn && fn();
  } catch (e) {
    safeLog(this.L, 'e',  "safeUiCall err tag=" + String(tag || "") + " err=" + String(e));
  }
};

;

FloatBallAppWM.prototype.onScreenChangedReflow = function() {
  if (this.state.closing) return;
  if (!this.state.addedBall) return;

  var di = this.getDockInfo();

  var oldW = this.state.screen.w;
  var oldH = this.state.screen.h;

  var newScreen = this.getScreenSizePx();
  var newW = newScreen.w;
  var newH = newScreen.h;

  if (newW <= 0 || newH <= 0) return;
  if (oldW <= 0) oldW = newW;
  if (oldH <= 0) oldH = newH;

  this.state.screen = { w: newW, h: newH };

  var ballSize = di.ballSize;
  var visible = di.visiblePx;
  var hidden = di.hiddenPx;

  var oldMaxX = Math.max(1, oldW - ballSize);
  var oldMaxY = Math.max(1, oldH - ballSize);
  var newMaxX = Math.max(1, newW - ballSize);
  var newMaxY = Math.max(1, newH - ballSize);

  var xRatio = this.state.ballLp.x / oldMaxX;
  var yRatio = this.state.ballLp.y / oldMaxY;

  var mappedX = Math.round(xRatio * newMaxX);
  var mappedY = Math.round(yRatio * newMaxY);

  mappedX = this.clamp(mappedX, 0, newMaxX);
  mappedY = this.clamp(mappedY, 0, newMaxY);

  if (this.state.docked) {
    this.state.ballLp.y = mappedY;
    this.state.ballLp.width = visible;

    if (this.state.dockSide === "left") {
      this.state.ballLp.x = 0;
      try { this.state.ballContent.setX(-hidden); } catch (eL) {}
    } else {
      this.state.ballLp.x = newW - visible;
      try { this.state.ballContent.setX(0); } catch (eR) {}
    }
    // 重新进入闲置变暗逻辑（如果需要）
    try { this.state.ballContent.setAlpha(this.config.BALL_IDLE_ALPHA); } catch(eA) {}
  } else {
    this.state.ballLp.x = mappedX;
    this.state.ballLp.y = mappedY;
    this.state.ballLp.width = ballSize;
    try { this.state.ballContent.setX(0); } catch (e0) {}
    try { this.state.ballContent.setAlpha(1.0); } catch(eA) {}
  }

  try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU) {}
  this.savePos(this.state.ballLp.x, this.state.ballLp.y);

  safeLog(this.L, 'i',  "screen reflow w=" + String(newW) + " h=" + String(newH) + " x=" + String(this.state.ballLp.x) + " y=" + String(this.state.ballLp.y));
};

FloatBallAppWM.prototype.setupDisplayMonitor = function() {
  if (this.state.closing) return;

  try {
    var dm = context.getSystemService(android.content.Context.DISPLAY_SERVICE);
    if (!dm) return;

    this.state.dm = dm;
    this.state.lastRotation = this.getRotation();

    var self = this;

    var listener = new JavaAdapter(android.hardware.display.DisplayManager.DisplayListener, {
      onDisplayAdded: function(displayId) {},
      onDisplayRemoved: function(displayId) {},
      onDisplayChanged: function(displayId) {
        try {
          if (self.state.closing) return;
          var nowTs = self.now();
          if (nowTs - self.state.lastMonitorTs < self.config.SCREEN_MONITOR_THROTTLE_MS) return;
          self.state.lastMonitorTs = nowTs;

          self.state.h.post(new JavaAdapter(java.lang.Runnable, {
            run: function() {
              try {
                if (self.state.closing) return;
                if (!self.state.addedBall) return;

                var rot = self.getRotation();
                var sz = self.getScreenSizePx();

                var changed = false;
                if (rot !== self.state.lastRotation) { self.state.lastRotation = rot; changed = true; }
                if (sz.w !== self.state.screen.w || sz.h !== self.state.screen.h) changed = true;

                if (changed) {
                  self.cancelDockTimer();
                  self.onScreenChangedReflow();
                  self.touchActivity();
                }
              } catch (e1) {
                if (self.L) self.L.e("displayChanged run err=" + String(e1));
              }
            }
          }));
        } catch (e0) {}
      }
    });

    this.state.displayListener = listener;
    dm.registerDisplayListener(listener, this.state.h);
    safeLog(this.L, 'i',  "display monitor registered");
  } catch (e2) {
    safeLog(this.L, 'e',  "setupDisplayMonitor err=" + String(e2));
  }
};

FloatBallAppWM.prototype.stopDisplayMonitor = function() {
  try { if (this.state.dm && this.state.displayListener) this.state.dm.unregisterDisplayListener(this.state.displayListener); } catch (e) {}
  this.state.displayListener = null;
  this.state.dm = null;
};

// =======================【Shell：智能执行（Action优先 + 广播桥兜底）】======================
// 这段代码的主要内容/用途：执行 Shell 按钮动作时，优先尝试 ShortX 的 ShellCommand Action（如可用）；失败则走自定义广播桥（由外部接收器实际执行）。
// 注意：system_server 进程本身不直接执行 shell；这里只负责"触发执行"。
// 这段代码的主要内容/用途：通过广播桥触发 Shell 执行（仅广播桥，不再使用 ShellCommand Action）。
// 注意：system_server 进程本身不直接执行 shell；外部接收器负责实际执行。
FloatBallAppWM.prototype.execShellSmart = function(cmdB64, needRoot) {
  var ret = { ok: false, via: "", err: "" };

  try {
    var action = String(this.config.SHELL_BRIDGE_ACTION || CONST_SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
    var it = new android.content.Intent(action);

    // # 固定广播协议：cmd_b64 + root + from（不再发送明文 cmd，避免协议漂移）
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_CMD, String(cmdB64));
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_ROOT, !!needRoot);
    // # from：来源标记，仅用于接收端识别/日志，不参与权限判断
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_FROM, "ToolHub");

    context.sendBroadcast(it);

    ret.ok = true;
    ret.via = "BroadcastBridge";
    safeLog(this.L, 'i',  "shell via broadcast ok action=" + action + " root=" + String(!!needRoot));
  } catch (eB) {
    ret.err = "Broadcast err=" + String(eB);
    safeLog(this.L, 'e',  "shell via broadcast fail err=" + String(eB));
  }

  return ret;
};


// =======================【WM 线程：按钮动作执行】======================
FloatBallAppWM.prototype.execButtonAction = function(btn, idx) {
  // # 点击防抖
  // 这段代码的主要内容/用途：防止在按钮面板上连续/乱点导致重复执行与 UI 状态机冲突（可能触发 system_server 异常重启）。
  if (!this.guardClick("btn_exec_" + String(idx), 380, null)) return;

  try {
  if (!btn || !btn.type) {
    this.toast("按钮#" + idx + " 未配置");
    safeLog(this.L, 'w',  "btn#" + String(idx) + " no type");
    return;
  }

  var t = String(btn.type);
  safeLog(this.L, 'i',  "btn click idx=" + String(idx) + " type=" + t + " title=" + String(btn.title || ""));

  if (t === "open_settings") {
    this.showPanelAvoidBall("settings");
    return;
  }

  if (t === "open_viewer") {
    var logPath = (this.L && this.L._filePathForToday) ? this.L._filePathForToday() : "";
    if (!logPath) logPath = PATH_LOG_DIR + "/ShortX_ToolHub_" + (new java.text.SimpleDateFormat("yyyyMMdd").format(new java.util.Date())) + ".log";

    var content = FileIO.readText(logPath);
    if (!content) content = "(日志文件不存在或为空: " + logPath + ")";

    if (content.length > 30000) {
        content = "[...前略...]\n" + content.substring(content.length - 30000);
    }

    // 简单的按行倒序，方便查看最新日志
    try {
        var lines = content.split("\n");
        if (lines.length > 1) {
             content = lines.reverse().join("\n");
        }
    } catch(eRev) {}

    this.showViewerPanel("今日日志 (倒序)", content);
    return;
  }

  if (t === "toast") {
    var msg = "";
    if (btn.text !== undefined && btn.text !== null) msg = String(btn.text);
    else if (btn.title) msg = String(btn.title);
    else msg = "按钮#" + idx;
    this.toast(msg);
    return;
  }

  if (t === "app") {
    var pkg = btn.pkg ? String(btn.pkg) : "";
    if (!pkg) { this.toast("按钮#" + idx + " 缺少 pkg"); return; }

    var it = context.getPackageManager().getLaunchIntentForPackage(pkg);
    if (!it) { this.toast("无法启动 " + pkg); return; }

    it.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);

// # 系统级跨用户启动：Context.startActivityAsUser
// 这段代码的主要内容/用途：支持"主应用/分身应用"选择，避免弹出选择器或误启动到另一用户。
// 说明：当未配置 launchUserId 时，默认使用 0（主用户）；失败则回退 startActivity。
var launchUid = 0;
try {
  if (btn.launchUserId != null && String(btn.launchUserId).length > 0) launchUid = parseInt(String(btn.launchUserId), 10);
} catch(eLU0) { launchUid = 0; }
if (isNaN(launchUid)) launchUid = 0;

try {
  // 运行日志：记录跨用户启动参数（便于定位分身启动失败原因）
  safeLog(this.L, 'i',  "startAsUser(app) idx=" + idx + " pkg=" + pkg + " launchUserId=" + launchUid);
  if (launchUid !== 0) {
    context.startActivityAsUser(it, android.os.UserHandle.of(launchUid));
  } else {
    context.startActivity(it);
  }
} catch (eA) {
  // # 兜底：某些 ROM/权限限制下 startActivityAsUser 可能抛异常，回退普通启动
  try { context.startActivity(it); } catch (eA2) {}
  this.toast("启动失败");
  safeLog(this.L, 'e',  "start app fail pkg=" + pkg + " uid=" + String(launchUid) + " err=" + String(eA));
}
return;
  }

  if (t === "shell") {
    // # 这段代码的主要内容/用途：执行 shell（支持 cmd 明文 与 cmd_b64；最终会确保发送/执行的是"真正的 base64"）
    // # 修复点：历史配置里有些按钮把"明文命令"误存进 cmd_b64（或 b64 被破坏），会导致广播接收端解码失败→看起来"没效果"。
    var cmdB64 = (btn.cmd_b64 !== undefined && btn.cmd_b64 !== null) ? String(btn.cmd_b64) : "";
    var cmdPlain = (btn.cmd !== undefined && btn.cmd !== null) ? String(btn.cmd) : "";

    // # 1) 只有明文但没有 b64：自动补齐 b64（避免特殊字符在多层字符串传递中被破坏）
    if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
      try {
        var b64x = encodeBase64Utf8(cmdPlain);
        if (b64x && b64x.length > 0) cmdB64 = String(b64x);
      } catch (eB64a) {}
    }

    // # 2) cmd_b64 非空但无法解码：把它当作"明文命令"重新编码（保证广播桥/Action 都能吃到正确命令）
    // # 说明：decodeBase64Utf8 返回空串通常意味着 b64 非法或被破坏；而真实命令不太可能是空串。
    if (cmdB64 && cmdB64.length > 0) {
      try {
        var testPlain = decodeBase64Utf8(cmdB64);
        if ((!testPlain || testPlain.length === 0) && (!cmdPlain || cmdPlain.length === 0)) {
          cmdPlain = String(cmdB64);
          cmdB64 = "";
        }
      } catch (eB64b) {}
    }
    if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
      try {
        var b64y = encodeBase64Utf8(cmdPlain);
        if (b64y && b64y.length > 0) cmdB64 = String(b64y);
      } catch (eB64c) {}
    }

    if (!cmdB64 || cmdB64.length === 0) {
      this.toast("按钮#" + idx + " 缺少 cmd/cmd_b64");
      safeLog(this.L, 'e',  "shell missing cmd idx=" + String(idx));
      return;
    }

    // # 广播桥接收端默认以 root 执行，强制使用 root
    var needRoot = true;

    var r = this.execShellSmart(cmdB64, needRoot);
    if (r && r.ok) return;

    this.toast("shell 失败（Action + 广播桥均失败）");
    safeLog(this.L, 'e',  "shell all failed cmd_b64=" + cmdB64 + " ret=" + JSON.stringify(r || {}));
    return;
  }

  if (t === "broadcast") {
    // 这段代码的主要内容/用途：发送自定义广播（兼容 btn.extra / btn.extras），并对 Shell 广播桥（shortx.toolhub.SHELL）做额外兼容（cmd/cmd_b64/root）。
    var action = btn.action ? String(btn.action) : "";
    if (!action) { this.toast("按钮#" + idx + " 缺少 action"); return; }

    var it2 = new android.content.Intent(action);

    // # 1) 兼容字段：extra / extras（两种都认）
    var ex = null;
    try {
      if (btn.extras) ex = btn.extras;
      else if (btn.extra) ex = btn.extra;
    } catch (eEx0) { ex = null; }

    // # 2) 写入 extras（支持 number / boolean / string；其他类型一律转字符串）
    if (ex) {
      try {
        var k;
        for (k in ex) {
          if (!ex.hasOwnProperty(k)) continue;
          var v = ex[k];

          if (typeof v === "number") it2.putExtra(String(k), Number(v));
          else if (typeof v === "boolean") it2.putExtra(String(k), !!v);
          else it2.putExtra(String(k), String(v));
        }
      } catch (eE) {}
    }

    // # 3) 对"Shell 广播桥"做额外兼容：
    //    - 你可以在 cfg 里写 extra.cmd（明文）或 extra.cmd_b64（Base64）
    //    - 同时会补齐 root/from，并且把 cmd 明文也塞一份，方便外部 MVEL 直接读取 cmd 进行验证
    try {
      var bridgeAction = String(this.config.SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
      if (action === bridgeAction) {
        var kCmdB64 = String(this.config.SHELL_BRIDGE_EXTRA_CMD || "cmd_b64");
        var kFrom = String(this.config.SHELL_BRIDGE_EXTRA_FROM || "from");
        var kRoot = String(this.config.SHELL_BRIDGE_EXTRA_ROOT || "root");

        var cmdPlain = "";
        var cmdB64 = "";

        try { cmdB64 = String(it2.getStringExtra(kCmdB64) || ""); } catch (eC0) { cmdB64 = ""; }
        try { cmdPlain = String(it2.getStringExtra("cmd") || ""); } catch (eC1) { cmdPlain = ""; }

        // # 有明文但没 b64：自动补 b64
        if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
          try {
            var b64x = encodeBase64Utf8(cmdPlain);
            if (b64x && b64x.length > 0) {
              cmdB64 = b64x;
              it2.putExtra(kCmdB64, String(cmdB64));
            }
          } catch (eC2) {}
        }

        // # 有 b64 但没明文：也补一份明文（便于外部规则验证；真正执行仍建议用 cmd_b64）
        if ((!cmdPlain || cmdPlain.length === 0) && cmdB64 && cmdB64.length > 0) {
          try {
            var decoded = decodeBase64Utf8(cmdB64);
            if (decoded && decoded.length > 0) {
              cmdPlain = decoded;
              it2.putExtra("cmd", String(cmdPlain));
            }
          } catch (eC3) {}
        }

        // # root：广播桥接收端默认以 root 执行，强制传递 true
        try {
          if (!it2.hasExtra(kRoot)) {
            it2.putExtra(kRoot, true);
          }
        } catch (eR0) {
          try {
            it2.putExtra(kRoot, true);
          } catch (eR1) {}
        }


        // # root 类型纠正：如果外部 cfg 用了字符串 "true"/"false"，这里纠正为 boolean，避免外部 getBooleanExtra 读不到
        try {
          if (it2.hasExtra(kRoot)) {
            var bdl = it2.getExtras();
            if (bdl) {
              var raw = bdl.get(kRoot);
              if (raw != null) {
                var rawStr = String(raw);
                if (rawStr === "true" || rawStr === "false") {
                  it2.removeExtra(kRoot);
                  it2.putExtra(kRoot, rawStr === "true");
                }
              }
            }
          }
        } catch (eRB) {}

        // # from：标识来源（便于外部执行器做白名单/审计）
        try {
          if (!it2.hasExtra(kFrom)) it2.putExtra(kFrom, "ToolHub@system_server");
        } catch (eF0) { try { it2.putExtra(kFrom, "ToolHub@system_server"); } catch (eF1) {} }

        if (this.L) {
          try {
            this.L.i("broadcast(shell_bridge) action=" + action + " cmd_len=" + String(cmdPlain ? cmdPlain.length : 0) +
              " cmd_b64_len=" + String(cmdB64 ? cmdB64.length : 0) + " root=" + String(it2.getBooleanExtra(kRoot, false)));
          } catch (eLg) {}
        }
      }
    } catch (eSB) {}

    try { context.sendBroadcast(it2); } catch (eB) { this.toast("广播失败"); safeLog(this.L, 'e',  "broadcast fail action=" + action + " err=" + String(eB)); }
    return;
  }

  if (t === "shortcut") {
  // 这段代码的主要内容/用途：仅使用 JavaScript(startActivityAsUser) 执行快捷方式，取消 Shell 与所有兜底，避免弹出主/分身选择器。
  // 说明：
  // 1) 运行时只执行按钮字段 shortcutJsCode（由"选择快捷方式列表"点选自动生成，可手动微调）
  // 2) 不再调用 am start，不再回退 LauncherApps.startShortcut（用户要求：取消 shell、取消兜底）
  // 3) 目标 userId：launchUserId > userId（用于锁定主/分身）

  var spkg = btn.pkg ? String(btn.pkg) : "";
  var sid = btn.shortcutId ? String(btn.shortcutId) : "";
  var iu = (btn.intentUri != null) ? String(btn.intentUri) : "";

  var uid = 0;
  try { uid = (btn.userId != null) ? parseInt(String(btn.userId), 10) : 0; } catch(eUid0) { uid = 0; }
  if (isNaN(uid)) uid = 0;

  // # 启动 userId 优先级：launchUserId > userId
  try {
    if (btn.launchUserId != null && String(btn.launchUserId).length > 0) {
      var lu0 = parseInt(String(btn.launchUserId), 10);
      if (!isNaN(lu0)) uid = lu0;
    }
  } catch(eLu0) {}

  if (!spkg) { this.toast("按钮#" + idx + " 缺少 pkg"); return; }
  if (!sid) { this.toast("按钮#" + idx + " 缺少 shortcutId"); return; }

  // # JavaScript 执行：只执行 shortcutJsCode
  var jsCode = (btn.shortcutJsCode != null) ? String(btn.shortcutJsCode) : "";
  if (!jsCode || jsCode.length === 0) {
    this.toast("按钮#" + idx + " 未配置 JS 启动代码");
    return;
  }

  try {
    // # 提供少量上下文变量给脚本使用（可选）
    // - __sc_intentUri: 当前按钮 intentUri
    // - __sc_userId: 当前目标 userId（已合并 launchUserId）
    var __sc_intentUri = iu;
    var __sc_userId = uid;

    var rjs = eval(jsCode);

    // # 约定：返回值以 ok 开头视为成功；以 err 开头视为失败（失败也不兜底）
    var sret = (rjs == null) ? "" : String(rjs);
    if (sret.indexOf("ok") === 0) {
      safeLog(this.L, 'i',  "shortcut(js-only) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
      return;
    }

    safeLog(this.L, 'e',  "shortcut(js-only) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " ret=" + sret);
    this.toast("快捷方式 JS 启动失败: " + sret);
    return;
  } catch (eJsSc) {
    safeLog(this.L, 'e',  "shortcut(js-only) exception pkg=" + spkg + " id=" + sid + " err=" + eJsSc);
    this.toast("快捷方式 JS 异常: " + String(eJsSc));
    return;
  }
}

  this.toast("未知 type=" + t);
  safeLog(this.L, 'w',  "unknown btn type=" + t);
  } catch (eBtn) {
    try { this.toast("按钮执行异常"); } catch (e0) {}
    safeLog(this.L, 'e',  "execButtonAction crash idx=" + String(idx) + " err=" + String(eBtn));
  }

};

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
    try { this.toast("重建悬浮球失败: " + String(eAdd)); } catch (eT) {}
    safeLog(this.L, 'e',  "rebuildBall add fail err=" + String(eAdd));
    return false;
  }

  this.savePos(this.state.ballLp.x, this.state.ballLp.y);
  this.touchActivity();
  safeLog(this.L, 'i',  "rebuildBall ok size=" + String(newSize) + " x=" + String(newX) + " y=" + String(newY));
  return true;
};

// =======================【设置面板：UI（右上角确认）】======================
FloatBallAppWM.prototype.createSectionHeader = function(item, parent) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var color = C.primary;

  var h = new android.widget.TextView(context);
  h.setText(String(item.name || ""));
  h.setTextColor(color);
  h.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
  h.setTypeface(null, android.graphics.Typeface.BOLD);
  h.setPadding(this.dp(16), this.dp(24), this.dp(16), this.dp(8));
  parent.addView(h);
};

FloatBallAppWM.prototype.createSettingItemView = function(item, parent, needDivider) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var textColor = isDark ? C.textPriDark : C.textPriLight;
  var secColor = isDark ? C.textSecDark : C.textSecLight;
  var dividerColor = isDark ? C.dividerDark : C.dividerLight;
  var primary = C.primary;
  var switchOff = isDark ? (0xFF555555 | 0) : (0xFFCCCCCC | 0);

  // 增加内边距
  var padH = this.dp(16);
  var padV = this.dp(16);

  // 分割线 (顶部)
  if (needDivider) {
      var line = new android.view.View(context);
      var lineLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        1 // 1px
      );
      lineLp.setMargins(padH, 0, padH, 0);
      line.setLayoutParams(lineLp);
      line.setBackgroundColor(dividerColor);
      parent.addView(line);
  }

  // 容器
  var row = new android.widget.LinearLayout(context);
  row.setOrientation(android.widget.LinearLayout.VERTICAL);
  // 增加点击波纹反馈
  try {
      var outValue = new android.util.TypedValue();
      context.getTheme().resolveAttribute(android.R.attr.selectableItemBackground, outValue, true);
      row.setBackgroundResource(outValue.resourceId);
  } catch(e) {}

  row.setPadding(padH, padV, padH, padV);

  var self = this;

  if (item.type === "bool") {
    // === 开关类型 ===
    row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    row.setGravity(android.view.Gravity.CENTER_VERTICAL);
    row.setClickable(true);

    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    var tvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tvLp.weight = 1;
    tv.setLayoutParams(tvLp);
    row.addView(tv);

    var sw = new android.widget.Switch(context);
    try { sw.setTextOn(""); sw.setTextOff(""); } catch (eT) {}

    // 优化开关颜色
    try {
        var states = [
            [android.R.attr.state_checked],
            [-android.R.attr.state_checked]
        ];
        var thumbColors = [primary, switchOff];
        var trackColors = [self.withAlpha(primary, 0.5), self.withAlpha(switchOff, 0.5)];

        var thumbList = new android.content.res.ColorStateList(states, thumbColors);
        var trackList = new android.content.res.ColorStateList(states, trackColors);

        sw.setThumbTintList(thumbList);
        sw.setTrackTintList(trackList);
    } catch(eColor) {}

    var cur = !!self.getPendingValue(item.key);
    sw.setChecked(cur);

    // 监听器
    sw.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
      onCheckedChanged: function(btn, checked) {
        try {
          self.touchActivity();
          self.setPendingValue(item.key, !!checked);
          if (self.L) self.L.d("pending " + String(item.key) + "=" + String(!!checked));
        } catch (e0) {}
      }
    }));

    // 点击行也触发开关
    row.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function(v) {
        sw.setChecked(!sw.isChecked());
      }
    }));

    row.addView(sw);
    parent.addView(row);

  } else if (item.type === "int" || item.type === "float") {
    // === 数值类型 (SeekBar) ===
    // 垂直布局：上面是 标题+数值，下面是 SeekBar

    // 第一行：标题 + 数值
    var line1 = new android.widget.LinearLayout(context);
    line1.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    line1.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    ));

    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    var tvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tvLp.weight = 1;
    tv.setLayoutParams(tvLp);
    line1.addView(tv);

    var valTv = new android.widget.TextView(context);
    valTv.setTextColor(primary);
    valTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    valTv.setTypeface(null, android.graphics.Typeface.BOLD);
    line1.addView(valTv);

    row.addView(line1);

    // 第二行：SeekBar
    var sb = new android.widget.SeekBar(context);
    var sbLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    sbLp.topMargin = self.dp(16); // 增加间距
    sb.setLayoutParams(sbLp);

    // 优化 SeekBar 颜色
    try {
        sb.getThumb().setTint(primary);
        sb.getProgressDrawable().setTint(primary);
    } catch(eColor) {}

    // 配置 SeekBar
    var min = (item.min !== undefined) ? Number(item.min) : 0;
    var max = (item.max !== undefined) ? Number(item.max) : 100;
    var step = (item.step !== undefined) ? Number(item.step) : 1;

    var curV = Number(self.getPendingValue(item.key));
    if (isNaN(curV)) curV = min;
    curV = self.clamp(curV, min, max);

    var maxP = Math.floor((max - min) / step);
    if (maxP < 1) maxP = 1;
    sb.setMax(maxP);

    var curP = Math.floor((curV - min) / step);
    if (curP < 0) curP = 0;
    if (curP > maxP) curP = maxP;
    sb.setProgress(curP);

    function formatVal(v) {
        if (item.type === "float") return String(Math.round(v * 1000) / 1000);
        return String(Math.round(v));
    }
    function computeValByProgress(p) {
      var v = min + p * step;
      v = self.clamp(v, min, max);
      if (item.type === "int") v = Math.round(v);
      if (item.type === "float") v = Math.round(v * 1000) / 1000;
      return v;
    }

    valTv.setText(formatVal(curV));

    sb.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener({
      onProgressChanged: function(seek, progress, fromUser) {
        try {
          self.touchActivity();
          var v = computeValByProgress(progress);
          valTv.setText(formatVal(v));
          if (fromUser) {
            self.setPendingValue(item.key, v);
          }
        } catch (e1) {}
      },
      onStartTrackingTouch: function() { try { self.touchActivity(); } catch (e2) {} },
      onStopTrackingTouch: function() { try { self.touchActivity(); } catch (e3) {} }
    }));

    row.addView(sb);
    parent.addView(row);

  } else if (item.type === "action") {
    // === 动作按钮 ===
    row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    row.setGravity(android.view.Gravity.CENTER_VERTICAL);
    row.setClickable(true);

    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    var tvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tvLp.weight = 1;
    tv.setLayoutParams(tvLp);
    row.addView(tv);

    // 样式化文本按钮
    var btn = new android.widget.TextView(context);
    btn.setText("打开");
    btn.setTextColor(primary);
    btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    btn.setTypeface(null, android.graphics.Typeface.BOLD);
    btn.setGravity(android.view.Gravity.CENTER);
    btn.setPadding(self.dp(16), self.dp(8), self.dp(16), self.dp(8));
    // 透明波纹背景
    btn.setBackground(self.ui.createTransparentRippleDrawable(primary, self.dp(16)));

    btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            try {
              self.touchActivity();
              if (item.action === "open_btn_mgr") {
                self.showPanelAvoidBall("btn_editor");
              }
            } catch(e) {}
        }
    }));
    row.addView(btn);

    // 行点击也触发
    row.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function(v) {
         try {
          self.touchActivity();
          if (item.action === "open_btn_mgr") {
            self.showPanelAvoidBall("btn_editor");
          }
        } catch(e) {}
      }
    }));

    parent.addView(row);
  } else if (item.type === "text") {
    // === 文本输入 ===
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    row.addView(tv);

    var et = new android.widget.EditText(context);
    var curVal = self.getPendingValue(item.key);
    if (curVal === undefined || curVal === null) curVal = "";
    et.setText(String(curVal));
    et.setTextColor(textColor);
    et.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    et.setBackground(self.ui.createRoundDrawable(isDark ? C.inputBgDark : C.inputBgLight, self.dp(6)));
    et.setPadding(self.dp(8), self.dp(8), self.dp(8), self.dp(8));
    et.setSingleLine(true);

    var etLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    etLp.topMargin = self.dp(8);
    et.setLayoutParams(etLp);

    // Explicitly request keyboard on click
    et.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            try {
                v.requestFocus();
                var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
                imm.showSoftInput(v, 0);
            } catch(e) {}
        }
    }));

    et.addTextChangedListener(new android.text.TextWatcher({
        beforeTextChanged: function(s, start, count, after) {},
        onTextChanged: function(s, start, before, count) {},
        afterTextChanged: function(s) {
            try {
                self.touchActivity();
                self.setPendingValue(item.key, String(s));
            } catch (e) {}
        }
    }));

    row.addView(et);
    parent.addView(row);
  } else if (item.type === "single_choice") {
    // === 单选类型 (RadioGroup) ===
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    row.addView(tv);

    var rg = new android.widget.RadioGroup(context);
    rg.setOrientation(android.widget.RadioGroup.VERTICAL);
    var rgLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    rgLp.topMargin = self.dp(8);
    rg.setLayoutParams(rgLp);

    var curVal = String(self.getPendingValue(item.key) || "");
    if (!curVal) curVal = "auto"; // default

    var options = item.options || [];
    for (var i = 0; i < options.length; i++) {
        (function(opt) {
            var rb = new android.widget.RadioButton(context);
            rb.setText(String(opt.label));
            rb.setTextColor(textColor);
            rb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
            // 颜色优化
            try {
                var states = [[android.R.attr.state_checked], [-android.R.attr.state_checked]];
                var colors = [primary, secColor];
                rb.setButtonTintList(new android.content.res.ColorStateList(states, colors));
            } catch(eC){}

            rb.setId(android.view.View.generateViewId ? android.view.View.generateViewId() : i);

            // Check state
            if (String(opt.value) === curVal) {
                rb.setChecked(true);
            }

            rb.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
                onCheckedChanged: function(btn, checked) {
                    if (checked) {
                        try {
                            self.touchActivity();
                            self.setPendingValue(item.key, String(opt.value));
                        } catch(e){}
                    }
                }
            }));
            rg.addView(rb);
        })(options[i]);
    }

    row.addView(rg);
    parent.addView(row);
  } else {
     // 兜底文本
     var tv = new android.widget.TextView(context);
     tv.setText(String(item.name));
     tv.setTextColor(secColor);
     row.addView(tv);
     parent.addView(row);
  }
};

