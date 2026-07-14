// @version 1.0.7
// =======================【设置面板：UI（右上角确认）】======================
FloatBallAppWM.prototype.createSectionHeader = function(item, parent) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  var color = T ? T.onSurface : (isDark ? C.textPriDark : C.textPriLight);

  var h = new android.widget.TextView(context);
  h.setText(String(item.name || ""));
  toolhubSafeSetTextColor(h, color);
  h.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  h.setTypeface(null, android.graphics.Typeface.BOLD);
  h.setPadding(this.dp(14), this.dp(16), this.dp(14), this.dp(6));
  try { h.setIncludeFontPadding(false); } catch(eFontPad) {}
  parent.addView(h);
};


// =======================【设置项：颜色预览】======================
// 这段代码的主要内容/用途：在设置项本身显示颜色预览色块，不修改颜色选择面板。
FloatBallAppWM.prototype.isSettingColorPreviewItem = function(item) {
  var key = String((item && item.key) || "");
  var type = String((item && item.type) || "");

  if (type === "ball_color") return true;


  if (key === "BALL_ICON_TINT_HEX") return true;
  if (key === "BALL_BG_COLOR_HEX") return true;

  if (key.indexOf("POINTER_COLOR_") === 0 && key.indexOf("_HEX") > 0) return true;

  return false;
};

FloatBallAppWM.prototype.parseSettingColorPreview = function(raw) {
  try {
    var s = String(raw == null ? "" : raw).replace(/^\s+|\s+$/g, "");
    if (!s) return null;
    if (s.charAt(0) !== "#") s = "#" + s;

    if (/^#[0-9a-fA-F]{6}$/.test(s)) return android.graphics.Color.parseColor(s);
    if (/^#[0-9a-fA-F]{8}$/.test(s)) return android.graphics.Color.parseColor(s);
  } catch(e) {}
  return null;
};

FloatBallAppWM.prototype.createSettingColorPreviewView = function(hex, strokeColor) {
  var v = new android.view.View(context);
  var size = this.dp(26);
  var lp = new android.widget.LinearLayout.LayoutParams(size, size);
  lp.leftMargin = this.dp(8);
  lp.rightMargin = this.dp(4);
  v.setLayoutParams(lp);
  this.refreshSettingColorPreviewView(v, hex, strokeColor);
  return v;
};

FloatBallAppWM.prototype.refreshSettingColorPreviewView = function(v, hex, strokeColor) {
  try {
    if (!v) return;

    var color = this.parseSettingColorPreview(hex);
    var stroke = strokeColor;

    if (!stroke && this.ui && this.ui.colors) stroke = this.ui.colors.dividerLight;
    if (!stroke) stroke = android.graphics.Color.parseColor("#999999");

    if (color === null) {
      var emptyBg = this.withAlpha ? this.withAlpha(stroke, 0.10) : android.graphics.Color.TRANSPARENT;
      if (this.ui && this.ui.createStrokeDrawable) {
        v.setBackground(this.ui.createStrokeDrawable(emptyBg, stroke, this.dp(1), this.dp(13)));
      }
    } else {
      if (this.ui && this.ui.createStrokeDrawable) {
        v.setBackground(this.ui.createStrokeDrawable(color, stroke, this.dp(1), this.dp(13)));
      }
    }
  } catch(e) {
    safeLog(null, "e", "refreshSettingColorPreviewView fail " + String(e));
  }
};


FloatBallAppWM.prototype.createSettingItemView = function(item, parent, needDivider) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  var textColor = T ? T.onSurface : (isDark ? C.textPriDark : C.textPriLight);
  var secColor = T ? T.onSurface2 : (isDark ? C.textSecDark : C.textSecLight);
  var dividerColor = T ? T.outlineVariant : (isDark ? C.dividerDark : C.dividerLight);
  var primary = T ? T.primary : C.primary;
  var inputBgColor = T ? T.surface2 : (isDark ? C.inputBgDark : C.inputBgLight);
  var switchOff = T ? T.surface2 : (isDark ? (0xFF555555 | 0) : (0xFFCCCCCC | 0));

  // 紧凑但保留足够触控空间
  var padH = this.dp(14);
  var padV = this.dp(12);

  // 分割线 (顶部)
  if (needDivider) {
      var line = new android.view.View(context);
      var lineLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        1 // 1px
      );
      lineLp.setMargins(padH, 0, padH, 0);
      line.setLayoutParams(lineLp);
      toolhubSafeSetBackgroundColor(line, this.withAlpha ? this.withAlpha(dividerColor, isDark ? 0.36 : 0.28) : dividerColor);
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
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

  row.setPadding(padH, padV, padH, padV);
  try { row.setMinimumHeight(this.dp(52)); } catch(eMinRow) {}

  var self = this;

  if (item.type === "bool") {
    // === 开关类型 ===
    row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    row.setGravity(android.view.Gravity.CENTER_VERTICAL);
    row.setClickable(true);

    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    toolhubSafeSetTextColor(tv, textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
    var tvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tvLp.weight = 1;
    tv.setLayoutParams(tvLp);
    row.addView(tv);

    var sw = new android.widget.Switch(context);
    try { sw.setTextOn(""); sw.setTextOff("");  } catch(eT) { safeLog(null, 'e', "catch " + String(eT)); }

    // 优化开关颜色
    try {
        var states = [
            [android.R.attr.state_checked],
            [-android.R.attr.state_checked]
        ];
        var thumbColors = [primary, switchOff];
        var trackColors = [self.withAlpha(primary, 0.5), self.withAlpha(switchOff, 0.5)];

        var thumbList = toolhubSafeColorStateListFromStates(states, thumbColors);
        var trackList = toolhubSafeColorStateListFromStates(states, trackColors);

        toolhubSafeApplyColorStateList(sw, "setThumbTintList", thumbList);
        toolhubSafeApplyColorStateList(sw, "setTrackTintList", trackList);
     } catch(eColor) { safeLog(null, 'e', "catch " + String(eColor)); }

    var cur = !!self.getPendingValue(item.key);
    sw.setChecked(cur);

    // 监听器
    sw.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
      onCheckedChanged: function(btn, checked) {
        try {
          self.touchActivity();
          self.setPendingValue(item.key, !!checked);
          if (self.L) self.L.d("pending " + String(item.key) + "=" + String(!!checked));
         } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }
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
    toolhubSafeSetTextColor(tv, textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
    var tvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tvLp.weight = 1;
    tv.setLayoutParams(tvLp);
    line1.addView(tv);

    var valTv = new android.widget.TextView(context);
    toolhubSafeSetTextColor(valTv, primary);
    valTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    valTv.setTypeface(null, android.graphics.Typeface.BOLD);
    valTv.setGravity(android.view.Gravity.CENTER);
    valTv.setPadding(self.dp(10), self.dp(4), self.dp(10), self.dp(4));
    try { valTv.setIncludeFontPadding(false); } catch(eValPad) {}
    try {
      valTv.setBackground(self.ui.createStrokeDrawable(
        self.withAlpha(primary, isDark ? 0.18 : 0.10),
        self.withAlpha(primary, isDark ? 0.36 : 0.22),
        self.dp(1),
        self.dp(12)
      ));
    } catch(eValBg) {}
    line1.addView(valTv);

    row.addView(line1);

    // 第二行：SeekBar
    var sb = new android.widget.SeekBar(context);
    var sbLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    sbLp.topMargin = self.dp(8); // 紧凑化标题与滑杆距离
    sb.setLayoutParams(sbLp);

    // 优化 SeekBar 颜色
    try {
        toolhubSafeSetTintColor(sb.getThumb(), primary);
        toolhubSafeSetTintColor(sb.getProgressDrawable(), primary);
     } catch(eColor) { safeLog(null, 'e', "catch " + String(eColor)); }

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
         } catch(e1) { safeLog(null, 'e', "catch " + String(e1)); }
      },
      onStartTrackingTouch: function() { try { self.touchActivity();  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); } },
      onStopTrackingTouch: function() { try { self.touchActivity();  } catch(e3) { safeLog(null, 'e', "catch " + String(e3)); } }
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
    toolhubSafeSetTextColor(tv, textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
    var tvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tvLp.weight = 1;
    tv.setLayoutParams(tvLp);
    row.addView(tv);

    // 样式化文本按钮
    var btn = new android.widget.TextView(context);
    btn.setText("打开");
    toolhubSafeSetTextColor(btn, primary);
    btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    btn.setTypeface(null, android.graphics.Typeface.BOLD);
    btn.setGravity(android.view.Gravity.CENTER);
    btn.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
    try { self.ui.applyButtonTouchTarget(self, btn, 48); } catch(eBtnTouch) {}
    try { btn.setContentDescription("打开" + String(item.name || "")); } catch(eBtnDesc) {}
    // 透明波纹背景
    btn.setBackground(self.ui.createTransparentRippleDrawable(primary, self.dp(14)));

    function runSettingAction() {
      try {
        self.touchActivity();
        var action = String(item.action || "");
        if (action === "open_btn_mgr") {
          self.showPanelAvoidBall("btn_editor");
          return;
        }
        if (action === "open_schema_editor") {
          self.showPanelAvoidBall("schema_editor");
          return;
        }
        if (action === "open_settings") {
          self.showPanelAvoidBall("settings");
          return;
        }
        if (action === "open_manual" || action === "open_doc") {
          var intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
          intent.setData(android.net.Uri.parse("https://xin-blog.com/114.html"));
          intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
          context.startActivity(intent);
          return;
        }
        if (action && (action.indexOf("http://") === 0 || action.indexOf("https://") === 0)) {
          var urlIntent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
          urlIntent.setData(android.net.Uri.parse(action));
          urlIntent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
          context.startActivity(urlIntent);
          return;
        }
        self.toast(action ? ("暂不支持动作: " + action) : "动作未配置");
      } catch(e) {
        try { self.toast("动作执行失败: " + String(e)); } catch(eToast) {}
        safeLog(null, 'e', "setting action fail " + String(e));
      }
    }

    btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            runSettingAction();
        }
    }));
    row.addView(btn);

    // 行点击也触发
    row.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function(v) {
         runSettingAction();
      }
    }));

    parent.addView(row);
  } else if (item.type === "text") {
    // === 文本输入 ===
    var titleLine = new android.widget.LinearLayout(context);
    titleLine.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    titleLine.setGravity(android.view.Gravity.CENTER_VERTICAL);

    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    toolhubSafeSetTextColor(tv, textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
    var titleTvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1);
    tv.setLayoutParams(titleTvLp);
    titleLine.addView(tv);

    var textColorPreviewDot = null;
    if (self.isSettingColorPreviewItem && self.isSettingColorPreviewItem(item)) {
      textColorPreviewDot = self.createSettingColorPreviewView(self.getPendingValue(item.key), dividerColor);
      titleLine.addView(textColorPreviewDot);
    }

    row.addView(titleLine);

    var et = new android.widget.EditText(context);
    var curVal = self.getPendingValue(item.key);
    if (curVal === undefined || curVal === null) curVal = "";
    et.setText(String(curVal));
    toolhubSafeSetTextColor(et, textColor);
    et.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    try { toolhubSafeSetHintTextColor(et, secColor); } catch(eHint) { safeLog(null, 'e', "catch " + String(eHint)); }
    et.setBackground(self.ui.createStrokeDrawable(inputBgColor, self.withAlpha(dividerColor, isDark ? 0.48 : 0.34), self.dp(1), self.dp(12)));
    et.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
    et.setSingleLine(true);

    var etLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    etLp.topMargin = self.dp(6);
    et.setLayoutParams(etLp);

    // Explicitly request keyboard on click
    et.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            try {
                v.requestFocus();
                var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
                imm.showSoftInput(v, 0);
             } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
        }
    }));

    et.addTextChangedListener(new android.text.TextWatcher({
        beforeTextChanged: function(s, start, count, after) {},
        onTextChanged: function(s, start, before, count) {},
        afterTextChanged: function(s) {
            try {
                self.touchActivity();
                var textColorPreviewValue = String(s);
                self.setPendingValue(item.key, textColorPreviewValue);
                if (textColorPreviewDot && self.refreshSettingColorPreviewView) {
                  self.refreshSettingColorPreviewView(textColorPreviewDot, textColorPreviewValue, dividerColor);
                }
             } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
        }
    }));

    row.addView(et);
    parent.addView(row);
  } else if (item.type === "single_choice") {
    // === 单选类型 (RadioGroup) ===
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    toolhubSafeSetTextColor(tv, textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
    row.addView(tv);

    var rg = new android.widget.RadioGroup(context);
    rg.setOrientation(android.widget.RadioGroup.VERTICAL);
    var rgLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    rgLp.topMargin = self.dp(6);
    rg.setLayoutParams(rgLp);

    var curVal = String(self.getPendingValue(item.key) || "");
    if (!curVal) curVal = "auto"; // default

    var options = item.options || [];
    for (var i = 0; i < options.length; i++) {
        (function(opt) {
            var rb = new android.widget.RadioButton(context);
            rb.setText(String(opt.label));
            toolhubSafeSetTextColor(rb, textColor);
            rb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
            try { rb.setMinHeight(self.dp(40)); rb.setMinimumHeight(self.dp(40)); rb.setIncludeFontPadding(false); } catch(eRbSize) {}
            // 颜色优化
            try {
                var states = [[android.R.attr.state_checked], [-android.R.attr.state_checked]];
                var colors = [primary, secColor];
                toolhubSafeApplyColorStateList(rb, "setButtonTintList", toolhubSafeColorStateListFromStates(states, colors));
             } catch(eC) { safeLog(null, 'e', "catch " + String(eC)); }

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
                         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
                    }
                }
            }));
            rg.addView(rb);
        })(options[i]);
    }

    row.addView(rg);
    parent.addView(row);
  } else if (item.type === "ball_shortx_icon") {
    // === 悬浮球 ShortX 图标选择器（复用按钮图标同款弹窗）===
    row.setOrientation(android.widget.LinearLayout.VERTICAL);
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    toolhubSafeSetTextColor(tv, textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
    row.addView(tv);

    var iconRow = new android.widget.LinearLayout(context);
    iconRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    iconRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    iconRow.setPadding(0, self.dp(6), 0, 0);

    var nameTv = new android.widget.TextView(context);
    toolhubSafeSetTextColor(nameTv, secColor);
    nameTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    var nameTvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1);
    nameTv.setLayoutParams(nameTvLp);
    iconRow.addView(nameTv);

    function refreshBallShortXPreview() {
      try {
        var curIconName0 = String(self.getPendingValue(item.key) || "");
        var curTint0 = String(self.getPendingValue("BALL_ICON_TINT_HEX") || "");
        nameTv.setText(curIconName0 || "未选择");
        // 页面顶部已有完整悬浮球预览，这里只显示当前值，避免重复小预览占位。
       } catch(ePreview0) { safeLog(null, 'e', "catch " + String(ePreview0)); }
    }
    refreshBallShortXPreview();

    var btnPick = self.ui.createFlatButton(self, "换一个", primary, function() {
      self.touchActivity();
      self.showShortXIconPickerPopup({
        currentName: String(self.getPendingValue(item.key) || ""),
        currentTint: String(self.getPendingValue("BALL_ICON_TINT_HEX") || ""),
        onSelect: function(name) {
          try {
            var selectedName = String(name || "");
            self.setPendingValue(item.key, selectedName);
            self.setPendingValue("BALL_ICON_TYPE", "shortx");
            refreshBallShortXPreview();
          } catch(ePickBallIcon) {
            safeLog(self.L, 'e', "ball shortx picker err=" + String(ePickBallIcon));
          }
        }
      });
    });
    iconRow.addView(btnPick);

    var gapView = new android.view.View(context);
    gapView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(8), 1));
    iconRow.addView(gapView);

    var btnClear = self.ui.createFlatButton(self, "不用图标", secColor, function() {
      self.touchActivity();
      try {
        self.setPendingValue(item.key, "");
        refreshBallShortXPreview();
       } catch(eClearBallIcon) { safeLog(null, 'e', "catch " + String(eClearBallIcon)); }
    });
    iconRow.addView(btnClear);
    row.addView(iconRow);
    parent.addView(row);

  } else if (item.type === "ball_color") {
    // === 悬浮球图标颜色选择器（复用按钮图标同款弹窗）===
    row.setOrientation(android.widget.LinearLayout.VERTICAL);
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    toolhubSafeSetTextColor(tv, textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
    row.addView(tv);

    var colorRow = new android.widget.LinearLayout(context);
    colorRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    colorRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    colorRow.setPadding(0, self.dp(6), 0, 0);

    var previewDot = self.createSettingColorPreviewView(self.getPendingValue(item.key), dividerColor);
    colorRow.addView(previewDot);

    var colorValueTv = new android.widget.TextView(context);
    toolhubSafeSetTextColor(colorValueTv, secColor);
    colorValueTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    var colorValueLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1);
    colorValueTv.setLayoutParams(colorValueLp);
    colorRow.addView(colorValueTv);

    function refreshBallColorPreview() {
      try {
        var curHex0 = String(self.getPendingValue(item.key) || "");
        colorValueTv.setText(curHex0 || "默认");
        if (previewDot && self.refreshSettingColorPreviewView) {
          self.refreshSettingColorPreviewView(previewDot, curHex0, dividerColor);
        }
      } catch(eDot0) {
        colorValueTv.setText("默认");
        if (previewDot && self.refreshSettingColorPreviewView) {
          self.refreshSettingColorPreviewView(previewDot, "", dividerColor);
        }
      }
    }
    refreshBallColorPreview();

    var btnColor = self.ui.createFlatButton(self, "换颜色", primary, function() {
      self.touchActivity();
      self.showColorPickerPopup({
        currentColor: String(self.getPendingValue(item.key) || ""),
        currentIconName: String(self.getPendingValue("BALL_ICON_RES_NAME") || ""),
        onSelect: function(colorHex) {
          try {
            self.setPendingValue(item.key, String(colorHex || ""));
            refreshBallColorPreview();
          } catch(ePickBallColor) {
            safeLog(self.L, 'e', "ball color picker err=" + String(ePickBallColor));
          }
        }
      });
    });
    colorRow.addView(btnColor);

    var gapColorView = new android.view.View(context);
    gapColorView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(8), 1));
    colorRow.addView(gapColorView);

    var btnClearColor = self.ui.createFlatButton(self, "恢复默认", secColor, function() {
      self.touchActivity();
      try {
        self.setPendingValue(item.key, "");
        refreshBallColorPreview();
       } catch(eClearBallColor) { safeLog(null, 'e', "catch " + String(eClearBallColor)); }
    });
    colorRow.addView(btnClearColor);
    row.addView(colorRow);
    parent.addView(row);

  } else {
     // 兜底文本
     var tv = new android.widget.TextView(context);
     tv.setText(String(item.name));
     toolhubSafeSetTextColor(tv, secColor);
     row.addView(tv);
     parent.addView(row);
  }
};
