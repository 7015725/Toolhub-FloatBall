// @version 1.0.0
// =======================【工具：屏幕/旋转】======================
FloatBallAppWM.prototype.getScreenSizePx = function() {
  var m = new android.util.DisplayMetrics();
  try { this.state.wm.getDefaultDisplay().getRealMetrics(m); } catch (e) { this.state.wm.getDefaultDisplay().getMetrics(m); }
  return { w: m.widthPixels, h: m.heightPixels };
};
FloatBallAppWM.prototype.getRotation = function() { try { return this.state.wm.getDefaultDisplay().getRotation();  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } return -1; };

// =======================【工具：alpha/toast/vibrate】======================
FloatBallAppWM.prototype.withAlpha = function(colorInt, alpha01) { var a = Math.floor(Number(alpha01) * 255); return (colorInt & 0x00FFFFFF) | (a << 24); };

// Animal Island Lite：ToolApp 专用视觉主题。只供设置/按钮管理/编辑页调用，避免覆盖悬浮球 Monet 取色。
FloatBallAppWM.prototype.getAnimalIslandTheme = function() {
  var isDark = false;
  try { isDark = this.isDarkTheme(); } catch(eDark) { isDark = false; }
  var Color = android.graphics.Color;
  if (isDark) {
    return {
      bg: Color.parseColor("#2F4034"),
      bg2: Color.parseColor("#3C5142"),
      leaf: Color.parseColor("#4E6F5B"),
      card: Color.parseColor("#405243"),
      card2: Color.parseColor("#4A5D4E"),
      cream: Color.parseColor("#FFF1D2"),
      text: Color.parseColor("#FFF1D2"),
      sub: Color.parseColor("#E3CFA8"),
      brown: Color.parseColor("#D0AE7A"),
      primary: Color.parseColor("#8BD7A8"),
      primaryDeep: Color.parseColor("#5FB980"),
      primarySoft: Color.parseColor("#3F684F"),
      danger: Color.parseColor("#F0A08F"),
      dangerSoft: Color.parseColor("#68453C"),
      stroke: Color.parseColor("#8B754E"),
      onPrimary: Color.parseColor("#173524")
    };
  }
  return {
    bg: Color.parseColor("#A8DDB4"),
    bg2: Color.parseColor("#DDF3D8"),
    leaf: Color.parseColor("#7DC395"),
    card: Color.parseColor("#FFF9E6"),
    card2: Color.parseColor("#FFFFFF"),
    cream: Color.parseColor("#FFF9E6"),
    text: Color.parseColor("#5E472D"),
    sub: Color.parseColor("#7C5734"),
    brown: Color.parseColor("#8B643D"),
    primary: Color.parseColor("#19C8B9"),
    primaryDeep: Color.parseColor("#0E9E91"),
    primarySoft: Color.parseColor("#DDF7F2"),
    danger: Color.parseColor("#D86962"),
    dangerSoft: Color.parseColor("#FFE7E2"),
    stroke: Color.parseColor("#E0C79E"),
    onPrimary: Color.parseColor("#FFFFFF")
  };
};

FloatBallAppWM.prototype.createAnimalCardDrawable = function(fillColor, radiusDp) {
  var T = this.getAnimalIslandTheme();
  return this.ui.createStrokeDrawable(fillColor || T.card, this.withAlpha(T.stroke, this.isDarkTheme() ? 0.36 : 0.55), this.dp(1), this.dp(radiusDp || 18));
};

FloatBallAppWM.prototype.createAnimalButtonDrawable = function(normalColor, pressedColor, radiusDp) {
  return this.ui.createRippleDrawable(normalColor, pressedColor, this.dp(radiusDp || 18));
};

FloatBallAppWM.prototype.toast = function(msg) { try { android.widget.Toast.makeText(context, String(msg), 0).show();  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } };
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
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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
        _monetSurfaceVariant: android.graphics.Color.parseColor("#E1E3E1"),
        _monetSurfaceContainerLow: android.graphics.Color.parseColor("#F1F3F4"),
        _monetSurfaceContainer: android.graphics.Color.parseColor("#ECEEEF"),
        _monetSurfaceContainerHigh: android.graphics.Color.parseColor("#E6E8EA"),
        _monetOutline: android.graphics.Color.parseColor("#747775"),
        _monetOutlineVariant: android.graphics.Color.parseColor("#C4C7C5"),
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
        try { btn.setElevation(app.dp(2));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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
        try { if (app.isDarkTheme && app.isDarkTheme()) lb.setTextColor(this.colors.textSecDark);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
        lb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        var lpLb = new android.widget.LinearLayout.LayoutParams(0, -2);
        lpLb.weight = 1;
        topLine.addView(lb, lpLb);

        var et = new android.widget.EditText(context);
        et.setText(initVal ? String(initVal) : "");
        et.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        et.setTextColor(this.colors.textPriLight);
        try { if (app.isDarkTheme && app.isDarkTheme()) et.setTextColor(this.colors.textPriDark);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

        // 输入框背景优化
        var strokeColor = this.colors.dividerLight;
        try { if (app.isDarkTheme && app.isDarkTheme()) strokeColor = this.colors.dividerDark;  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

        var bg = this.createStrokeDrawable(this.colors.inputBgLight, strokeColor, app.dp(1), app.dp(8));
        try { if (app.isDarkTheme && app.isDarkTheme()) bg = this.createStrokeDrawable(this.colors.inputBgDark, strokeColor, app.dp(1), app.dp(8));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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
                    try { if (app.isDarkTheme && app.isDarkTheme()) strokeColor = self.colors.dividerDark;  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

                    var normalBg = self.createStrokeDrawable(self.colors.inputBgLight, strokeColor, app.dp(1), app.dp(8));
                    try { if (app.isDarkTheme && app.isDarkTheme()) normalBg = self.createStrokeDrawable(self.colors.inputBgDark, strokeColor, app.dp(1), app.dp(8));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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
        try { panel.setElevation(app.dp(8));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

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
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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
      surfaceContainerLow: android.graphics.Color.parseColor("#F1F3F4"),
      surfaceContainer: android.graphics.Color.parseColor("#ECEEEF"),
      surfaceContainerHigh: android.graphics.Color.parseColor("#E6E8EA"),
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
      surfaceContainerLow: android.graphics.Color.parseColor("#1B1B1F"),
      surfaceContainer: android.graphics.Color.parseColor("#202124"),
      surfaceContainerHigh: android.graphics.Color.parseColor("#2B2C30"),
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
        surfaceContainerLow: "system_neutral1_800",
        surfaceContainer: "system_neutral1_800",
        surfaceContainerHigh: "system_neutral1_700",
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
        surfaceContainerLow: "system_neutral1_50",
        surfaceContainer: "system_neutral1_100",
        surfaceContainerHigh: "system_neutral1_200",
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
         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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
     } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
  }
}

FloatBallAppWM.prototype.isDarkTheme = function() {
  // 0) 优先检查用户强制设置 (0=跟随系统, 1=白天, 2=黑夜)
  var mode = 0;
  try { mode = Math.floor(Number(this.config.THEME_MODE || 0));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

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
   } catch(e1) { safeLog(null, 'e', "catch " + String(e1)); }

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
     } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
  }

  // # 3) 实在判断不了，就按"非暗色"处理，避免自动主题背景黑成一片
  if (from === "unknown") { result = false; from = "fallback(false)"; }

  // 仅在状态改变时打印日志，避免刷屏
  var logKey = String(result) + "|" + from + "|" + mode;
  if (this._lastDarkThemeLog !== logKey) {
      this._lastDarkThemeLog = logKey;
      try { _th_log(this.L, "d", "[theme] isDarkTheme=" + String(result) + " via=" + from + " mode=" + mode);  } catch(e3) { safeLog(null, 'e', "catch " + String(e3)); }
  }

  // # 主题切换时刷新莫奈配色（传入 result 避免递归）
  // 注：构造函数中会初始化，这里只在构造完成后的切换时触发
  if (this._lastDarkResult !== undefined && this._lastDarkResult !== result) {
    this._lastDarkResult = result;
    try { this.refreshMonetColors(result);  } catch(eM) { safeLog(null, 'e', "catch " + String(eM)); }
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
    c.cardLight = ml.surfaceContainerLow || ml.surfaceVariant;
    c.textPriLight = ml.onSurface;
    c.textSecLight = ml.onSurfaceVariant;
    c.dividerLight = ml.outlineVariant || ml.outline;
    c.inputBgLight = ml.surfaceContainerHigh || ml.surface;

    // 深色配色
    c.bgDark = md.surface;
    c.cardDark = md.surfaceContainerLow || md.surfaceVariant;
    c.textPriDark = md.onSurface;
    c.textSecDark = md.onSurfaceVariant;
    c.dividerDark = md.outlineVariant || md.outline;
    c.inputBgDark = md.surfaceContainerHigh || md.surface;

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
    c._monetSurfaceVariant = m.surfaceVariant;
    c._monetSurfaceContainerLow = m.surfaceContainerLow || m.surfaceVariant;
    c._monetSurfaceContainer = m.surfaceContainer || m.surfaceVariant;
    c._monetSurfaceContainerHigh = m.surfaceContainerHigh || m.surfaceVariant;
    c._monetOutline = m.outline;
    c._monetOutlineVariant = m.outlineVariant || m.outline;
    c._monetOnPrimary = m.onPrimary;
    c._monetPrimaryContainer = m.primaryContainer;
    c._monetOnPrimaryContainer = m.onPrimaryContainer;
    c._monetSecondary = m.secondary;
    c._monetTertiary = m.tertiary;

    try { _th_log(this.L, "d", "[monet] refreshed isDark=" + isDark + " primary=" + _th_hex(c.primary) + " primaryDark=" + _th_hex(c.primaryDark) + " accent=" + _th_hex(c.accent));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  } catch (e) {
    try { _th_log(this.L, "e", "[monet] refresh err=" + String(e));  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
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
            try { _th_log(this.L, "d", "[theme] hit accent=" + names[i] + " id=" + String(id) + " c=" + _th_hex(c) + " " + _th_argb(c));  } catch(eL0) { safeLog(null, 'e', "catch " + String(eL0)); }
        }
        return c;
      }
    } catch (e) {
      try { _th_log(this.L, "w", "[theme] err accent=" + names[i] + " e=" + String(e));  } catch(eL2) { safeLog(null, 'e', "catch " + String(eL2)); }
    }
  }

  var fbHex = dark
    ? (this.config.BALL_FALLBACK_DARK || CONST_BALL_FALLBACK_DARK)
    : (this.config.BALL_FALLBACK_LIGHT || CONST_BALL_FALLBACK_LIGHT);
  var fb = android.graphics.Color.parseColor(fbHex);
  var logKeyFb = "miss_all|" + fb;
  if (this._lastAccentLog !== logKeyFb) {
      this._lastAccentLog = logKeyFb;
      try { _th_log(this.L, "w", "[theme] accent miss all, fallback=" + _th_hex(fb) + " " + _th_argb(fb));  } catch(eL3) { safeLog(null, 'e', "catch " + String(eL3)); }
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
    try { _usedKind = this.state.usedIconKind || "none";  } catch(eK) { safeLog(null, 'e', "catch " + String(eK)); }

    try {
      var _pngModeBg = Number(this.config.BALL_PNG_MODE || 0);
      if ((_pngModeBg === 1 && _usedKind === "file") || _usedKind === "app") {
        fillColor = android.graphics.Color.TRANSPARENT;
      }
     } catch(eBg) { safeLog(null, 'e', "catch " + String(eBg)); }

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
       } catch(eS) { safeLog(null, 'e', "catch " + String(eS)); }
    }

    var mask = new android.graphics.drawable.GradientDrawable();
    mask.setShape(android.graphics.drawable.GradientDrawable.OVAL);
    mask.setColor(android.graphics.Color.WHITE);

    contentView.setBackground(new android.graphics.drawable.RippleDrawable(
      android.content.res.ColorStateList.valueOf(rippleColor),
      content,
      mask
    ));
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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

  try { _th_log(this.L, "d", "[t]bg isDark=" + isDark + " o=" + _th_hex(out));  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }

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
   } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }
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
    try { bg.setStroke(sw, stroke);  } catch(eS) { safeLog(null, 'e', "catch " + String(eS)); }

    panelView.setBackground(bg);

    var tc = this.getPanelTextColorInt(bgInt);
    try { themeBgInt = bgInt; themeTextInt = tc;  } catch(eT) { safeLog(null, 'e', "catch " + String(eT)); }
    this.applyTextColorRecursive(panelView, tc);

    try { _th_log(this.L, "d", "[t]apply bg=" + _th_hex(bgInt) + " tx=" + _th_hex(tc));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }


    try {
      _th_log(this.L, "d",
        "[theme:apply] isDark=" + isDark +
        " bg=" + _th_hex(bgInt) + " " + _th_argb(bgInt) +
        " text=" + _th_hex(tc) + " " + _th_argb(tc) +
        " stroke=" + _th_hex(stroke)
      );
     } catch(eL0) { safeLog(null, 'e', "catch " + String(eL0)); }
  } catch (e) {
    try { _th_log(this.L, "e", "[theme:apply] err=" + String(e));  } catch(eL1) { safeLog(null, 'e', "catch " + String(eL1)); }
  }
};

