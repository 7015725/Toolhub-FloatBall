// @version 1.0.1
// =======================【工具：屏幕/旋转】======================
FloatBallAppWM.prototype.getScreenSizePx = function() {
  var m = new android.util.DisplayMetrics();
  var w = 0;
  var h = 0;

  try {
    this.state.wm.getDefaultDisplay().getRealMetrics(m);
    w = Number(m.widthPixels || 0);
    h = Number(m.heightPixels || 0);
  } catch (e0) {
    try {
      this.state.wm.getDefaultDisplay().getMetrics(m);
      w = Number(m.widthPixels || 0);
      h = Number(m.heightPixels || 0);
    } catch (e1) {}
  }

  try {
    var rot = this.getRotation ? this.getRotation() : -1;
    var isLandscape = (rot === android.view.Surface.ROTATION_90 || rot === android.view.Surface.ROTATION_270);
    var isPortrait = (rot === android.view.Surface.ROTATION_0 || rot === android.view.Surface.ROTATION_180);
    if (isLandscape && w > 0 && h > 0 && w < h) {
      var t = w; w = h; h = t;
    } else if (isPortrait && w > 0 && h > 0 && w > h) {
      var t2 = w; w = h; h = t2;
    }
  } catch (eRot) {}

  if (w <= 0 || h <= 0) {
    try {
      var dm = context.getResources().getDisplayMetrics();
      if (w <= 0) w = Number(dm.widthPixels || 0);
      if (h <= 0) h = Number(dm.heightPixels || 0);
    } catch (eRes) {}
  }

  return { w: Math.max(1, Math.floor(w)), h: Math.max(1, Math.floor(h)) };
};
FloatBallAppWM.prototype.getRotation = function() { try { return this.state.wm.getDefaultDisplay().getRotation();  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } return -1; };

// =======================【工具：alpha/toast/vibrate】======================
FloatBallAppWM.prototype.withAlpha = function(colorInt, alpha01) { var a = Math.floor(Number(alpha01) * 255); return (colorInt & 0x00FFFFFF) | (a << 24); };


FloatBallAppWM.prototype.toast = function(msg) {
  try {
    if (this.setInlineNotice) this.setInlineNotice(String(msg || ""), "info");
    else safeLog(this.L, "i", "toast suppressed: " + String(msg || ""));
  } catch(e) {
    safeLog(null, "e", "toast suppress catch " + String(e));
  }
};
FloatBallAppWM.prototype.setInlineNotice = function(msg, kind) {
  try {
    if (!this.state) return;
    this.state.inlineNoticeMsg = String(msg || "");
    this.state.inlineNoticeKind = String(kind || "info");
    this.state.inlineNoticeAt = java.lang.System.currentTimeMillis();
    safeLog(this.L, kind === "error" ? "e" : "i", "inline notice: " + this.state.inlineNoticeMsg);
    if (this.renderInlineNoticeNow) this.renderInlineNoticeNow();
  } catch(e) {
    safeLog(null, "e", "setInlineNotice catch " + String(e));
  }
};
FloatBallAppWM.prototype.consumeInlineNotice = function(maxAgeMs) {
  try {
    if (!this.state || !this.state.inlineNoticeMsg) return null;
    var now = java.lang.System.currentTimeMillis();
    var at = Number(this.state.inlineNoticeAt || 0);
    if (maxAgeMs && at > 0 && now - at > maxAgeMs) {
      this.state.inlineNoticeMsg = "";
      this.state.inlineNoticeKind = "";
      this.state.inlineNoticeAt = 0;
      return null;
    }
    var ret = { msg: String(this.state.inlineNoticeMsg || ""), kind: String(this.state.inlineNoticeKind || "info"), at: at };
    this.state.inlineNoticeMsg = "";
    this.state.inlineNoticeKind = "";
    this.state.inlineNoticeAt = 0;
    return ret;
  } catch(e) {
    return null;
  }
};
FloatBallAppWM.prototype.renderInlineNoticeNow = function() {
  var self = this;
  try {
    if (!this.state || !this.state.settingsNoticeContainerRef) return;
    var msg = String(this.state.inlineNoticeMsg || "");
    var kind = String(this.state.inlineNoticeKind || "info");
    var fn = function() {
      try {
        var box = self.state.settingsNoticeContainerRef;
        if (!box) return;
        box.removeAllViews();
        if (!msg) { box.setVisibility(android.view.View.GONE); return; }
        var isDark = self.isDarkTheme ? self.isDarkTheme() : false;
        var C = self.ui && self.ui.colors ? self.ui.colors : {};
        var T = self.getSettingsColorScheme ? self.getSettingsColorScheme() : null;
        var primary = T && T.primary ? T.primary : (C.primary || android.graphics.Color.parseColor("#005BC0"));
        var error = T && T.danger ? T.danger : (C.danger || android.graphics.Color.parseColor("#BA1A1A"));
        var okColor = T && T.success ? T.success : (C.success || primary);
        var color = kind === "error" ? error : (kind === "ok" ? okColor : primary);
        var bg = self.withAlpha ? self.withAlpha(color, isDark ? 0.20 : 0.10) : color;
        var stroke = self.withAlpha ? self.withAlpha(color, isDark ? 0.44 : 0.28) : color;
        var tv = new android.widget.TextView(context);
        tv.setText(msg);
        tv.setTextColor(color);
        tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
        tv.setGravity(android.view.Gravity.CENTER_VERTICAL);
        if (self.ui && self.ui.createStrokeDrawable) tv.setBackground(self.ui.createStrokeDrawable(bg, stroke, self.dp(1), self.dp(14)));
        box.addView(tv, new android.widget.LinearLayout.LayoutParams(-1, -2));
        box.setVisibility(android.view.View.VISIBLE);
      } catch(eRun) { safeLog(null, "e", "renderInlineNoticeNow run catch " + String(eRun)); }
    };
    if (this.runOnUiThreadSafe) this.runOnUiThreadSafe(fn);
    else fn();
  } catch(e) {
    safeLog(null, "e", "renderInlineNoticeNow catch " + String(e));
  }
};
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

    // 辅助：把符号按钮转换成可读语义，供 TalkBack 和自动化识别。
    buttonTextToContentDescription: function(txt) {
        var s = String(txt || "");
        if (s === "‹" || s === "←") return "返回";
        if (s === "×" || s === "✕") return "关闭";
        if (s === "?") return "帮助";
        if (s === "+") return "添加";
        if (s === "✓" || s === "✔") return "确认";
        if (s === "⋮") return "更多";
        return s;
    },

    setButtonContentDescription: function(btn, desc) {
        try {
            var d = String(desc || "");
            if (!d && btn && btn.getText) d = this.buttonTextToContentDescription(btn.getText());
            if (btn && btn.setContentDescription) btn.setContentDescription(d);
        } catch(eDesc) {}
        return btn;
    },

    // 辅助：标准触控区。视觉可紧凑，真实命中区保持 48dp。
    applyButtonTouchTarget: function(app, btn, minDp) {
        var m = Number(minDp || 48);
        if (isNaN(m) || m < 48) m = 48;
        try { btn.setMinHeight(app.dp(m)); } catch(eMinH) {}
        try { btn.setMinimumHeight(app.dp(m)); } catch(eMinH2) {}
        try { btn.setMinWidth(app.dp(48)); } catch(eMinW) {}
        try { btn.setMinimumWidth(app.dp(48)); } catch(eMinW2) {}
        try { btn.setIncludeFontPadding(false); } catch(eFontPad) {}
        return this.setButtonContentDescription(btn, "");
    },

    // 辅助：紧凑按钮。用于顶栏、chip、工具栏按钮；触控区仍保持 48dp。
    applyCompactButtonStyle: function(app, btn) {
        try { btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12); } catch(eSize) {}
        try { btn.setPadding(app.dp(12), 0, app.dp(12), 0); } catch(ePad) {}
        return this.applyButtonTouchTarget(app, btn, 48);
    },

    // 辅助：创建扁平按钮
    createFlatButton: function(app, txt, txtColor, onClick) {
        var btn = new android.widget.TextView(context);
        btn.setText(txt);
        btn.setTextColor(txtColor);
        btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        btn.setPadding(app.dp(12), app.dp(6), app.dp(12), app.dp(6));
        btn.setGravity(android.view.Gravity.CENTER);
        this.applyButtonTouchTarget(app, btn, 48);
        // use divider color or just low alpha text color for ripple
        var rippleColor = app.withAlpha ? app.withAlpha(txtColor, 0.1) : 0x22888888;
        btn.setBackground(this.createTransparentRippleDrawable(rippleColor, app.dp(8)));
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                app.touchActivity();
                var guardKey = "ui_btn";
                try { guardKey = "ui_btn_" + String(java.lang.System.identityHashCode(v || btn)); } catch(eKey) {}
                app.guardClick(guardKey, INTERACTION_CONSTANTS.CLICK_COOLDOWN_MS, function(){ if(onClick) onClick(v); });
            }
        }));
        return btn;
    },

    // 辅助：创建紧凑扁平按钮
    createCompactFlatButton: function(app, txt, txtColor, onClick) {
        var btn = this.createFlatButton(app, txt, txtColor, onClick);
        return this.applyCompactButtonStyle(app, btn);
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
        this.applyButtonTouchTarget(app, btn, 48);
        var pressedColor = app.withAlpha ? app.withAlpha(bgColor, 0.8) : bgColor;
        btn.setBackground(this.createRippleDrawable(bgColor, pressedColor, app.dp(24)));
        try { btn.setElevation(app.dp(2));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                app.touchActivity();
                var guardKey = "ui_btn";
                try { guardKey = "ui_btn_" + String(java.lang.System.identityHashCode(v || btn)); } catch(eKey) {}
                app.guardClick(guardKey, INTERACTION_CONSTANTS.CLICK_COOLDOWN_MS, function(){ if(onClick) onClick(v); });
            }
        }));
        return btn;
    },

    // 辅助：创建紧凑实心按钮
    createCompactSolidButton: function(app, txt, bgColor, txtColor, onClick) {
        var btn = this.createSolidButton(app, txt, bgColor, txtColor, onClick);
        return this.applyCompactButtonStyle(app, btn);
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
                if (!cb || !cb.hasPrimaryClip()) {
                    app.toast("剪贴板为空");
                    return;
                }
                var clip = cb.getPrimaryClip();
                if (!clip || clip.getItemCount() <= 0) {
                    app.toast("剪贴板为空");
                    return;
                }
                var item = clip.getItemAt(0);
                if (!item) {
                    app.toast("剪贴板为空");
                    return;
                }
                var txt = item.getText();
                if (txt === null || txt === undefined || String(txt).length === 0) {
                    app.toast("剪贴板不是文本内容");
                    return;
                }
                var st = String(txt);
                var old = String(et.getText());
                if (old.length > 0) et.setText(old + st);
                else et.setText(st);
                et.setSelection(et.getText().length());
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
  // 设置页与面板统一跟随系统明暗；不再提供手动浅色/深色模式。
  var result = false;
  var from = "unknown";

  try {
    var uiMode = context.getResources().getConfiguration().uiMode;
    var nightMask = (uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK);
    if (nightMask === android.content.res.Configuration.UI_MODE_NIGHT_YES) {
      result = true;
      from = "Configuration(UI_MODE_NIGHT_YES)";
    } else if (nightMask === android.content.res.Configuration.UI_MODE_NIGHT_NO) {
      result = false;
      from = "Configuration(UI_MODE_NIGHT_NO)";
    }
  } catch(e1) { safeLog(null, 'e', "catch " + String(e1)); }

  if (from === "unknown") {
    try {
      var um = context.getSystemService(android.content.Context.UI_MODE_SERVICE);
      if (um) {
        var nm = um.getNightMode();
        if (nm === android.app.UiModeManager.MODE_NIGHT_YES) {
          result = true;
          from = "UiModeManager(MODE_NIGHT_YES)";
        } else if (nm === android.app.UiModeManager.MODE_NIGHT_NO) {
          result = false;
          from = "UiModeManager(MODE_NIGHT_NO)";
        } else {
          from = "UiModeManager(mode=" + String(nm) + ")";
        }
      }
    } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
  }

  if (from === "unknown") {
    result = false;
    from = "fallback(false)";
  }

  var logKey = String(result) + "|" + from;
  if (this._lastDarkThemeLog !== logKey) {
    this._lastDarkThemeLog = logKey;
    try {
      _th_log(this.L, "d", "[theme] isDarkTheme=" + String(result) + " via=" + from);
    } catch(e3) { safeLog(null, 'e', "catch " + String(e3)); }
  }

  if (this._lastDarkResult !== undefined && this._lastDarkResult !== result) {
    this._lastDarkResult = result;
    try { this.refreshMonetColors(result); } catch(eM) { safeLog(null, 'e', "catch " + String(eM)); }
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

FloatBallAppWM.prototype.updateBallContentBackground = function(contentView, usedIconKind) {
  try {
    var ballColor = this.getMonetAccentForBall();
    try {
      var bgHex = String(this.config.BALL_BG_COLOR_HEX || "").trim();
      if (bgHex.length > 0) {
        ballColor = android.graphics.Color.parseColor(bgHex);
      }
    } catch(eCustomBg) {
      safeLog(this.L, 'e', "BALL_BG_COLOR_HEX parse failed, fallback Monet accent: " + String(eCustomBg));
    }
    var dark = this.isDarkTheme();
    var alpha01 = dark ? this.config.BALL_RIPPLE_ALPHA_DARK : this.config.BALL_RIPPLE_ALPHA_LIGHT;
    var rippleColor = this.withAlpha(ballColor, alpha01);

    // # 自定义 PNG/APP 模式下：背景透明
    var fillColor = ballColor;
    var _usedKind = "none";
    try { _usedKind = usedIconKind || this.state.usedIconKind || "none";  } catch(eK) { safeLog(null, 'e', "catch " + String(eK)); }

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
  var scheme = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  var base = scheme && scheme.background
    ? scheme.background
    : (this.isDarkTheme()
        ? (this.ui.colors.bgDark || android.graphics.Color.parseColor("#131314"))
        : (this.ui.colors.bgLight || android.graphics.Color.parseColor("#F8F9FA")));

  var alpha = 1.0;
  try { alpha = Number(this.config.PANEL_BG_ALPHA); } catch(eAlpha) { alpha = 0.85; }
  if (!(alpha >= 0.1 && alpha <= 1.0)) alpha = 0.85;

  return this.withAlpha(base, alpha);
};

FloatBallAppWM.prototype.getPanelTextColorInt = function(bgInt) {
  var scheme = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  if (scheme && scheme.onBackground) return scheme.onBackground;
  if (this.getSettingsBestTextColor && bgInt) return this.getSettingsBestTextColor(bgInt);
  return this.isDarkTheme()
    ? (this.ui.colors.textPriDark || android.graphics.Color.parseColor("#E3E3E3"))
    : (this.ui.colors.textPriLight || android.graphics.Color.parseColor("#1F1F1F"));
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
  try {
    var scheme = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
    var isDark = this.isDarkTheme();
    var bgInt = scheme && scheme.background
      ? scheme.background
      : (isDark ? this.ui.colors.bgDark : this.ui.colors.bgLight);
    var textInt = scheme && scheme.onBackground
      ? scheme.onBackground
      : this.getPanelTextColorInt(bgInt);
    var strokeBase = scheme && scheme.outlineVariant
      ? scheme.outlineVariant
      : (isDark ? this.ui.colors.dividerDark : this.ui.colors.dividerLight);

    var alpha = 1.0;
    try { alpha = Number(this.config.PANEL_BG_ALPHA); } catch(eAlpha) { alpha = 0.85; }
    if (!(alpha >= 0.1 && alpha <= 1.0)) alpha = 0.85;
    bgInt = this.withAlpha(bgInt, alpha);

    var bg = new android.graphics.drawable.GradientDrawable();
    bg.setCornerRadius(this.dp(24));
    bg.setColor(bgInt);
    try {
      bg.setStroke(this.dp(1), this.withAlpha(strokeBase, isDark ? 0.28 : 0.22));
    } catch(eStroke) { safeLog(null, 'e', "catch " + String(eStroke)); }
    panelView.setBackground(bg);

    try { themeBgInt = bgInt; themeTextInt = textInt; } catch(eCompat) {}

    // 设置页子控件已使用语义色，不再递归覆盖状态色；旧主面板/查看器保留兼容兜底。
    var preserveSemanticColors = false;
    try {
      var route = String(this.state && this.state.toolAppRoute || "");
      preserveSemanticColors =
        route === "settings" ||
        route.indexOf("settings_") === 0 ||
        route.indexOf("settings/") === 0 ||
        (this.state && this.state.addedSettings && panelView === this.state.settingsPanel);
    } catch(eRoute) { preserveSemanticColors = false; }

    if (!preserveSemanticColors && this.applyTextColorRecursive) {
      this.applyTextColorRecursive(panelView, textInt);
    }

    try {
      _th_log(this.L, "d",
        "[theme:apply] scheme=system-monet" +
        " isDark=" + isDark +
        " bg=" + _th_hex(bgInt) +
        " text=" + _th_hex(textInt) +
        " semantic=" + preserveSemanticColors
      );
    } catch(eLog) { safeLog(null, 'e', "catch " + String(eLog)); }
  } catch(e) {
    try { _th_log(this.L, "e", "[theme:apply] err=" + String(e)); }
    catch(eLog2) { safeLog(null, 'e', "catch " + String(eLog2)); }
  }
};
