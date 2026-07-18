// @version 1.0.14
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



FloatBallAppWM.prototype.getSettingsInteractionStressResultFile = function() {
  try {
    var baseDir = String(shortx.getShortXDir());
    if (!baseDir) return null;
    return new java.io.File(baseDir + "/ToolHub/diagnostics/settings-interaction-last.json");
  } catch(ePath) {
    safeLog(this.L, "w", "resolve settings interaction result path fail error=" + String(ePath));
  }
  return null;
};

FloatBallAppWM.prototype.normalizeSettingsInteractionStressResult = function(value) {
  if (!value || typeof value !== "object") return null;
  function numberValue(v, fallback, min, max) {
    var n = Number(v);
    if (isNaN(n)) n = fallback;
    if (min !== null && n < min) n = min;
    if (max !== null && n > max) n = max;
    return n;
  }
  function textValue(v, maxLen) {
    var s = "";
    try { s = String(v === undefined || v === null ? "" : v); } catch(eText) { s = ""; }
    if (s.length > maxLen) s = s.substring(0, maxLen);
    return s;
  }
  var rawRuntime = value.runtime && typeof value.runtime === "object" ? value.runtime : {};
  return {
    schemaVersion: 1,
    ok: value.ok === true,
    loops: Math.floor(numberValue(value.loops, 0, 0, 200)),
    durationMs: Math.floor(numberValue(value.durationMs, 0, 0, 3600000)),
    completedAt: Math.floor(numberValue(value.completedAt, 0, 0, 4102444800000)),
    rows: Math.floor(numberValue(value.rows, 0, 0, 10000)),
    switches: Math.floor(numberValue(value.switches, 0, 0, 10000)),
    seekBars: Math.floor(numberValue(value.seekBars, 0, 0, 10000)),
    buttons: Math.floor(numberValue(value.buttons, 0, 0, 10000)),
    stateTransitions: Math.floor(numberValue(value.stateTransitions, 0, 0, 100000)),
    switchToggles: Math.floor(numberValue(value.switchToggles, 0, 0, 100000)),
    seekUpdates: Math.floor(numberValue(value.seekUpdates, 0, 0, 100000)),
    error: textValue(value.error, 1200),
    runtime: {
      manufacturer: textValue(rawRuntime.manufacturer, 120),
      brand: textValue(rawRuntime.brand, 120),
      model: textValue(rawRuntime.model, 160),
      display: textValue(rawRuntime.display, 240),
      release: textValue(rawRuntime.release, 80),
      sdk: Math.floor(numberValue(rawRuntime.sdk, 0, 0, 1000)),
      dark: rawRuntime.dark === true,
      pressAlpha: numberValue(rawRuntime.pressAlpha, 0, 0, 1),
      process: textValue(rawRuntime.process, 240)
    }
  };
};

FloatBallAppWM.prototype.saveSettingsInteractionStressResult = function(result) {
  var file = null;
  var tmp = null;
  var writer = null;
  try {
    var clean = this.normalizeSettingsInteractionStressResult ? this.normalizeSettingsInteractionStressResult(result) : null;
    if (!clean) return false;
    file = this.getSettingsInteractionStressResultFile ? this.getSettingsInteractionStressResultFile() : null;
    if (!file) return false;
    var parent = file.getParentFile();
    if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) throw "cannot create diagnostic directory";
    tmp = new java.io.File(String(file.getAbsolutePath()) + ".tmp");
    writer = new java.io.OutputStreamWriter(new java.io.FileOutputStream(tmp, false), "UTF-8");
    writer.write(JSON.stringify(clean));
    writer.flush();
    writer.close();
    writer = null;
    if (file.exists() && !file.delete()) throw "cannot replace old settings interaction result";
    if (!tmp.renameTo(file)) throw "cannot publish settings interaction result";
    return true;
  } catch(eSave) {
    safeLog(this.L, "w", "save settings interaction result fail error=" + String(eSave));
  } finally {
    try { if (writer) writer.close(); } catch(eClose) {}
    try { if (tmp && tmp.exists()) tmp.delete(); } catch(eTmp) {}
  }
  return false;
};

FloatBallAppWM.prototype.loadSettingsInteractionStressResult = function() {
  var reader = null;
  try {
    var file = this.getSettingsInteractionStressResultFile ? this.getSettingsInteractionStressResultFile() : null;
    if (!file || !file.exists() || !file.isFile()) return null;
    var length = Number(file.length());
    if (!(length > 0) || length > 65536) throw "invalid settings interaction result size=" + String(length);
    reader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), "UTF-8"));
    var sb = new java.lang.StringBuilder();
    var line = null;
    while ((line = reader.readLine()) !== null) {
      if (sb.length() > 65536) throw "settings interaction result exceeds limit";
      sb.append(line);
    }
    reader.close();
    reader = null;
    var parsed = JSON.parse(String(sb.toString()));
    return this.normalizeSettingsInteractionStressResult ? this.normalizeSettingsInteractionStressResult(parsed) : null;
  } catch(eLoad) {
    safeLog(this.L, "w", "load settings interaction result fail error=" + String(eLoad));
  } finally {
    try { if (reader) reader.close(); } catch(eClose) {}
  }
  return null;
};

FloatBallAppWM.prototype.getLastSettingsInteractionStressResult = function() {
  try {
    if (!this.state) this.state = {};
    if (this.state.settingsInteractionStressResult) return this.state.settingsInteractionStressResult;
    if (this.state.settingsInteractionStressLoaded) return null;
    this.state.settingsInteractionStressLoaded = true;
    var loaded = this.loadSettingsInteractionStressResult ? this.loadSettingsInteractionStressResult() : null;
    if (loaded) this.state.settingsInteractionStressResult = loaded;
    return loaded;
  } catch(eLast) {}
  return null;
};

FloatBallAppWM.prototype.formatSettingsInteractionStressSummary = function(result) {
  var clean = this.normalizeSettingsInteractionStressResult ? this.normalizeSettingsInteractionStressResult(result) : null;
  if (!clean) return "";
  var runtime = clean.runtime || {};
  var completedText = "未知";
  try {
    if (Number(clean.completedAt || 0) > 0) {
      var fmt = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault());
      completedText = String(fmt.format(new java.util.Date(Number(clean.completedAt))));
    }
  } catch(eTime) {}
  var lines = [];
  lines.push("ToolHub 设置页控件压力测试");
  lines.push("状态：" + (clean.ok ? "通过" : "失败"));
  lines.push("时间：" + completedText);
  lines.push("循环：" + String(clean.loops) + " 次");
  lines.push("耗时：" + String(clean.durationMs) + " ms");
  lines.push("控件：Row " + String(clean.rows) + " / Switch " + String(clean.switches) + " / SeekBar " + String(clean.seekBars) + " / Button " + String(clean.buttons));
  lines.push("状态切换：" + String(clean.stateTransitions));
  lines.push("开关切换：" + String(clean.switchToggles));
  lines.push("滑杆更新：" + String(clean.seekUpdates));
  lines.push("设备：" + String(runtime.manufacturer || runtime.brand || "未知") + " " + String(runtime.model || ""));
  lines.push("系统：Android " + String(runtime.release || "") + " / SDK " + String(runtime.sdk || 0));
  lines.push("构建：" + String(runtime.display || ""));
  lines.push("进程：" + String(runtime.process || ""));
  lines.push("主题：" + (runtime.dark ? "暗色" : "亮色"));
  lines.push("按压透明度：" + String(runtime.pressAlpha));
  if (clean.error) lines.push("错误：" + String(clean.error));
  return lines.join("\n");
};

FloatBallAppWM.prototype.runSettingsInteractionStressTest = function(iterations) {
  var loops = parseInt(String(iterations), 10);
  if (isNaN(loops) || loops <= 0) loops = 120;
  loops = Math.max(1, Math.min(200, loops));
  var startedAt = java.lang.System.currentTimeMillis();
  var runtime = this.getColorSafetyRuntimeContext ? this.getColorSafetyRuntimeContext() : {};
  var result = {
    schemaVersion: 1,
    ok: false,
    loops: loops,
    durationMs: 0,
    completedAt: 0,
    rows: 0,
    switches: 0,
    seekBars: 0,
    buttons: 0,
    stateTransitions: 0,
    switchToggles: 0,
    seekUpdates: 0,
    error: "",
    runtime: runtime
  };
  safeLog(this.L, "i", "settings interaction stress start loops=" + String(loops) + " manufacturer=" + String(runtime.manufacturer || "") + " model=" + String(runtime.model || "") + " sdk=" + String(runtime.sdk || 0) + " process=" + String(runtime.process || ""));
  try {
    var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
    var C = this.ui.colors;
    var isDark = this.isDarkTheme ? !!this.isDarkTheme() : false;
    var primary = T ? T.primary : C.primary;
    var onPrimary = T && T.onPrimary ? T.onPrimary : android.graphics.Color.WHITE;
    var switchOff = T && T.surface2 ? T.surface2 : (isDark ? (0xFF555555 | 0) : (0xFFCCCCCC | 0));
    var pressedState = toolhubJintArray([android.R.attr.state_pressed]);
    var defaultState = toolhubJintArray([]);
    var switchStates = [[android.R.attr.state_checked], [-android.R.attr.state_checked]];
    for (var i = 0; i < loops; i++) {
      var row = new android.widget.LinearLayout(context);
      var rowPressedColor = this.withAlpha(primary, isDark ? 0.16 : 0.10);
      var rowBg = this.ui.createTransparentPressedStateDrawable(rowPressedColor, this.dp(12));
      var rowBgClass = toolhubJavaClassName(rowBg);
      if (!rowBg || rowBgClass.indexOf("StateListDrawable") < 0 || rowBgClass.indexOf("RippleDrawable") >= 0) throw "unsafe setting row background at loop " + String(i) + ": " + rowBgClass;
      row.setBackground(rowBg);
      rowBg.setState(pressedState);
      rowBg.setState(defaultState);
      result.rows++;
      result.stateTransitions += 2;

      var sw = new android.widget.Switch(context);
      var thumbColors = [primary, switchOff];
      var trackColors = [this.withAlpha(primary, 0.5), this.withAlpha(switchOff, 0.5)];
      var thumbList = toolhubSafeColorStateListFromStates(switchStates, thumbColors);
      var trackList = toolhubSafeColorStateListFromStates(switchStates, trackColors);
      toolhubSafeApplyColorStateList(sw, "setThumbTintList", thumbList);
      toolhubSafeApplyColorStateList(sw, "setTrackTintList", trackList);
      var appliedThumb = sw.getThumbTintList();
      var appliedTrack = sw.getTrackTintList();
      if (!toolhubIsColorStateList(appliedThumb) || !toolhubIsColorStateList(appliedTrack)) throw "switch tint list missing at loop " + String(i);
      sw.setChecked(true);
      sw.setChecked(false);
      result.switches++;
      result.switchToggles += 2;

      var seek = new android.widget.SeekBar(context);
      seek.setMax(100);
      toolhubSafeSetTintColor(seek.getThumb(), primary);
      toolhubSafeSetTintColor(seek.getProgressDrawable(), primary);
      seek.setProgress(i % 101);
      seek.setProgress(100 - (i % 101));
      result.seekBars++;
      result.seekUpdates += 2;

      var button = this.ui.createSolidButton(this, "压力测试", primary, onPrimary, function() {});
      var buttonBg = button.getBackground();
      var buttonBgClass = toolhubJavaClassName(buttonBg);
      if (!buttonBg || buttonBgClass.indexOf("StateListDrawable") < 0 || buttonBgClass.indexOf("RippleDrawable") >= 0) throw "unsafe settings button background at loop " + String(i) + ": " + buttonBgClass;
      buttonBg.setState(pressedState);
      buttonBg.setState(defaultState);
      result.buttons++;
      result.stateTransitions += 2;
    }
    result.ok = true;
  } catch(eTest) {
    result.ok = false;
    result.error = String(eTest);
  }
  result.durationMs = Math.max(0, Number(java.lang.System.currentTimeMillis() - startedAt));
  result.completedAt = Number(java.lang.System.currentTimeMillis());
  try { if (this.normalizeSettingsInteractionStressResult) result = this.normalizeSettingsInteractionStressResult(result) || result; } catch(eNormalize) {}
  try { if (this.saveSettingsInteractionStressResult) this.saveSettingsInteractionStressResult(result); } catch(ePersist) {}
  try {
    if (!this.state) this.state = {};
    this.state.settingsInteractionStressLoaded = true;
    this.state.settingsInteractionStressResult = result;
  } catch(eState) {}
  if (result.ok) safeLog(this.L, "i", "settings interaction stress pass loops=" + String(result.loops) + " durationMs=" + String(result.durationMs) + " rows=" + String(result.rows) + " switches=" + String(result.switches) + " seekBars=" + String(result.seekBars) + " buttons=" + String(result.buttons));
  else safeLog(this.L, "e", "settings interaction stress fail loops=" + String(result.loops) + " durationMs=" + String(result.durationMs) + " error=" + String(result.error));
  return result;
};


// =======================【设置项：拾字翻译配置】=======================
FloatBallAppWM.prototype.createPickwordTranslateSettingsView = function(item, parent, needDivider) {
  var self = this;
  var isDark = this.isDarkTheme ? !!this.isDarkTheme() : false;
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  var textColor = T ? T.onSurface : (isDark ? C.textPriDark : C.textPriLight);
  var secColor = T ? T.onSurface2 : (isDark ? C.textSecDark : C.textSecLight);
  var dividerColor = T ? T.outlineVariant : (isDark ? C.dividerDark : C.dividerLight);
  var primary = T ? T.primary : C.primary;
  var onPrimary = T && T.onPrimary ? T.onPrimary : android.graphics.Color.WHITE;
  var inputBgColor = T ? T.surface2 : (isDark ? C.inputBgDark : C.inputBgLight);

  if (needDivider) {
    var divider = new android.view.View(context);
    var dividerLp = new android.widget.LinearLayout.LayoutParams(-1, 1);
    dividerLp.setMargins(this.dp(14), 0, this.dp(14), 0);
    divider.setLayoutParams(dividerLp);
    toolhubSafeSetBackgroundColor(divider, this.withAlpha ? this.withAlpha(dividerColor, isDark ? 0.36 : 0.28) : dividerColor);
    parent.addView(divider);
  }

  var root = new android.widget.LinearLayout(context);
  root.setOrientation(android.widget.LinearLayout.VERTICAL);
  root.setPadding(this.dp(14), this.dp(12), this.dp(14), this.dp(14));
  try { root.setMinimumHeight(this.dp(52)); } catch(eMin) {}

  var title = new android.widget.TextView(context);
  title.setText("翻译配置");
  toolhubSafeSetTextColor(title, textColor);
  title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
  title.setTypeface(null, android.graphics.Typeface.BOLD);
  root.addView(title);

  var desc = new android.widget.TextView(context);
  desc.setText("选择翻译引擎后，仅显示对应凭据；两套凭据会分别保存在 ToolHub SQLite 中。");
  toolhubSafeSetTextColor(desc, secColor);
  desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  desc.setPadding(0, self.dp(3), 0, self.dp(8));
  root.addView(desc);

  var engineTitle = new android.widget.TextView(context);
  engineTitle.setText("翻译引擎");
  toolhubSafeSetTextColor(engineTitle, textColor);
  engineTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  engineTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  root.addView(engineTitle);

  var radioGroup = new android.widget.RadioGroup(context);
  radioGroup.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  radioGroup.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var radioLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  radioLp.setMargins(0, self.dp(4), 0, self.dp(8));
  radioGroup.setLayoutParams(radioLp);

  function buildEngineRadio(label, idValue) {
    var rb = new android.widget.RadioButton(context);
    rb.setId(idValue);
    rb.setText(label);
    toolhubSafeSetTextColor(rb, textColor);
    rb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    try {
      var states = [[android.R.attr.state_checked], [-android.R.attr.state_checked]];
      toolhubSafeApplyColorStateList(rb, "setButtonTintList", toolhubSafeColorStateListFromStates(states, [primary, secColor]));
    } catch(eTint) {}
    try { rb.setMinHeight(self.dp(44)); rb.setMinimumHeight(self.dp(44)); rb.setIncludeFontPadding(false); } catch(eSize) {}
    radioGroup.addView(rb, new android.widget.RadioGroup.LayoutParams(0, self.dp(44), 1));
    return rb;
  }

  var baiduId = 210701;
  var youdaoId = 210702;
  try {
    if (android.view.View.generateViewId) {
      baiduId = android.view.View.generateViewId();
      youdaoId = android.view.View.generateViewId();
    }
  } catch(eIds) {}
  var baiduRadio = buildEngineRadio("百度翻译", baiduId);
  var youdaoRadio = buildEngineRadio("有道翻译", youdaoId);
  root.addView(radioGroup);

  var credentialHost = new android.widget.LinearLayout(context);
  credentialHost.setOrientation(android.widget.LinearLayout.VERTICAL);
  credentialHost.setPadding(0, self.dp(2), 0, 0);
  root.addView(credentialHost, new android.widget.LinearLayout.LayoutParams(-1, -2));

  function createCredentialContainer(providerTitle, providerDesc) {
    var box = new android.widget.LinearLayout(context);
    box.setOrientation(android.widget.LinearLayout.VERTICAL);
    box.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(12));
    try {
      box.setBackground(self.ui.createStrokeDrawable(
        inputBgColor,
        self.withAlpha(dividerColor, isDark ? 0.50 : 0.34),
        self.dp(1),
        self.dp(14)
      ));
    } catch(eBg) {}
    var h = new android.widget.TextView(context);
    h.setText(providerTitle);
    toolhubSafeSetTextColor(h, textColor);
    h.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    h.setTypeface(null, android.graphics.Typeface.BOLD);
    box.addView(h);
    var d = new android.widget.TextView(context);
    d.setText(providerDesc);
    toolhubSafeSetTextColor(d, secColor);
    d.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    d.setPadding(0, self.dp(2), 0, self.dp(6));
    box.addView(d);
    return box;
  }

  function createCredentialField(box, labelText, key, secret, hintText) {
    var field = new android.widget.LinearLayout(context);
    field.setOrientation(android.widget.LinearLayout.VERTICAL);
    var fieldLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    fieldLp.setMargins(0, self.dp(6), 0, 0);
    field.setLayoutParams(fieldLp);

    var label = new android.widget.TextView(context);
    label.setText(labelText);
    toolhubSafeSetTextColor(label, textColor);
    label.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    field.addView(label);

    var inputRow = new android.widget.LinearLayout(context);
    inputRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    inputRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    var inputRowLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    inputRowLp.setMargins(0, self.dp(5), 0, 0);
    inputRow.setLayoutParams(inputRowLp);

    var edit = new android.widget.EditText(context);
    var current = self.getPendingValue(key);
    if (current === undefined || current === null) current = "";
    edit.setText(String(current));
    edit.setHint(String(hintText || ""));
    toolhubSafeSetTextColor(edit, textColor);
    toolhubSafeSetHintTextColor(edit, secColor);
    edit.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    edit.setSingleLine(true);
    edit.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
    edit.setBackground(self.ui.createStrokeDrawable(
      T ? T.surface : inputBgColor,
      self.withAlpha(dividerColor, isDark ? 0.52 : 0.36),
      self.dp(1),
      self.dp(12)
    ));
    try {
      edit.setInputType(android.text.InputType.TYPE_CLASS_TEXT | (secret ? android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD : android.text.InputType.TYPE_TEXT_VARIATION_NORMAL));
      if (secret) edit.setTransformationMethod(android.text.method.PasswordTransformationMethod.getInstance());
    } catch(eInputType) {}
    edit.addTextChangedListener(new android.text.TextWatcher({
      beforeTextChanged: function(s, start, count, after) {},
      onTextChanged: function(s, start, before, count) {},
      afterTextChanged: function(s) {
        try {
          self.touchActivity();
          self.setPendingValue(key, String(s));
        } catch(eText) { safeLog(null, "e", "pickword translate setting update failed key=" + String(key)); }
      }
    }));
    edit.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
      try {
        v.requestFocus();
        var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
        imm.showSoftInput(v, 0);
      } catch(eKeyboard) {}
    }}));
    inputRow.addView(edit, new android.widget.LinearLayout.LayoutParams(0, -2, 1));

    if (secret) {
      var visible = false;
      var toggle = new android.widget.TextView(context);
      toggle.setText("显示");
      toggle.setGravity(android.view.Gravity.CENTER);
      toggle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      toggle.setTypeface(null, android.graphics.Typeface.BOLD);
      toolhubSafeSetTextColor(toggle, primary);
      toggle.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
      toggle.setBackground(self.ui.createTransparentPressedStateDrawable(self.withAlpha(primary, isDark ? 0.18 : 0.10), self.dp(12)));
      toggle.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
        try {
          self.touchActivity();
          visible = !visible;
          if (visible) edit.setTransformationMethod(null);
          else edit.setTransformationMethod(android.text.method.PasswordTransformationMethod.getInstance());
          toggle.setText(visible ? "隐藏" : "显示");
          edit.setSelection(edit.getText().length());
        } catch(eToggle) {}
      }}));
      var toggleLp = new android.widget.LinearLayout.LayoutParams(self.dp(56), self.dp(44));
      toggleLp.setMargins(self.dp(6), 0, 0, 0);
      inputRow.addView(toggle, toggleLp);
    }

    field.addView(inputRow);
    box.addView(field);
    return edit;
  }

  var baiduBox = createCredentialContainer("百度翻译", "填写百度翻译开放平台的 APPID 与密钥。");
  createCredentialField(baiduBox, "百度 APPID", "PICKWORD_BAIDU_APP_ID", false, "输入 APPID");
  createCredentialField(baiduBox, "百度密钥", "PICKWORD_BAIDU_APP_SECRET", true, "输入密钥");
  credentialHost.addView(baiduBox, new android.widget.LinearLayout.LayoutParams(-1, -2));

  var youdaoBox = createCredentialContainer("有道翻译", "填写有道智云文本翻译服务的 AppKey 与应用密钥。");
  createCredentialField(youdaoBox, "有道 AppKey", "PICKWORD_YOUDAO_APP_KEY", false, "输入 AppKey");
  createCredentialField(youdaoBox, "有道应用密钥", "PICKWORD_YOUDAO_APP_SECRET", true, "输入应用密钥");
  var youdaoLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  credentialHost.addView(youdaoBox, youdaoLp);

  function refreshProviderVisibility(engineValue) {
    var engine = String(engineValue || "baidu") === "youdao" ? "youdao" : "baidu";
    baiduBox.setVisibility(engine === "baidu" ? android.view.View.VISIBLE : android.view.View.GONE);
    youdaoBox.setVisibility(engine === "youdao" ? android.view.View.VISIBLE : android.view.View.GONE);
  }

  var currentEngine = String(self.getPendingValue("PICKWORD_TRANSLATE_ENGINE") || "baidu");
  if (currentEngine !== "youdao") currentEngine = "baidu";
  baiduRadio.setChecked(currentEngine === "baidu");
  youdaoRadio.setChecked(currentEngine === "youdao");
  refreshProviderVisibility(currentEngine);

  radioGroup.setOnCheckedChangeListener(new android.widget.RadioGroup.OnCheckedChangeListener({
    onCheckedChanged: function(group, checkedId) {
      try {
        var nextEngine = checkedId === youdaoId ? "youdao" : "baidu";
        self.touchActivity();
        self.setPendingValue("PICKWORD_TRANSLATE_ENGINE", nextEngine);
        refreshProviderVisibility(nextEngine);
      } catch(eEngine) { safeLog(null, "e", "pickword translate engine switch failed"); }
    }
  }));

  var testing = false;
  var testButton = null;
  function finishTesting() {
    try {
      testing = false;
      if (testButton) {
        testButton.setEnabled(true);
        testButton.setAlpha(1.0);
        testButton.setText("测试翻译配置");
      }
    } catch(eFinish) {}
  }
  testButton = self.ui.createSolidButton(self, "测试翻译配置", primary, onPrimary, function() {
    if (testing) return;
    testing = true;
    try {
      testButton.setEnabled(false);
      testButton.setAlpha(0.65);
      testButton.setText("正在测试…");
    } catch(eBusy) {}
    var snapshot = {
      PICKWORD_TRANSLATE_ENGINE: String(self.getPendingValue("PICKWORD_TRANSLATE_ENGINE") || "baidu"),
      PICKWORD_BAIDU_APP_ID: String(self.getPendingValue("PICKWORD_BAIDU_APP_ID") || ""),
      PICKWORD_BAIDU_APP_SECRET: String(self.getPendingValue("PICKWORD_BAIDU_APP_SECRET") || ""),
      PICKWORD_YOUDAO_APP_KEY: String(self.getPendingValue("PICKWORD_YOUDAO_APP_KEY") || ""),
      PICKWORD_YOUDAO_APP_SECRET: String(self.getPendingValue("PICKWORD_YOUDAO_APP_SECRET") || "")
    };
    if (typeof self.testPickwordTranslateConfiguration !== "function") {
      if (self.setInlineNotice) self.setInlineNotice("翻译配置测试功能未加载", "error");
      finishTesting();
      return;
    }
    try {
      self.testPickwordTranslateConfiguration(snapshot, function() { finishTesting(); });
    } catch(eTest) {
      if (self.setInlineNotice) self.setInlineNotice("翻译配置测试启动失败", "error");
      finishTesting();
    }
  });
  var testLp = new android.widget.LinearLayout.LayoutParams(-1, self.dp(48));
  testLp.setMargins(0, self.dp(12), 0, 0);
  root.addView(testButton, testLp);

  parent.addView(root, new android.widget.LinearLayout.LayoutParams(-1, -2));
};


// =======================【设置项：拾字截图保存与清理】=======================
FloatBallAppWM.prototype.createPickwordImageSettingsView = function(item, parent, needDivider) {
  var self = this;
  var isDark = this.isDarkTheme ? !!this.isDarkTheme() : false;
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  var textColor = T ? T.onSurface : (isDark ? C.textPriDark : C.textPriLight);
  var secColor = T ? T.onSurface2 : (isDark ? C.textSecDark : C.textSecLight);
  var dividerColor = T ? T.outlineVariant : (isDark ? C.dividerDark : C.dividerLight);
  var primary = T ? T.primary : C.primary;
  var onPrimary = T && T.onPrimary ? T.onPrimary : android.graphics.Color.WHITE;
  var inputBgColor = T ? T.surface2 : (isDark ? C.inputBgDark : C.inputBgLight);

  if (needDivider) {
    var divider = new android.view.View(context);
    var dividerLp = new android.widget.LinearLayout.LayoutParams(-1, 1);
    dividerLp.setMargins(this.dp(14), 0, this.dp(14), 0);
    divider.setLayoutParams(dividerLp);
    toolhubSafeSetBackgroundColor(divider, this.withAlpha ? this.withAlpha(dividerColor, isDark ? 0.36 : 0.28) : dividerColor);
    parent.addView(divider);
  }

  var root = new android.widget.LinearLayout(context);
  root.setOrientation(android.widget.LinearLayout.VERTICAL);
  root.setPadding(this.dp(14), this.dp(12), this.dp(14), this.dp(14));

  var title = new android.widget.TextView(context);
  title.setText("截图保存与清理");
  toolhubSafeSetTextColor(title, textColor);
  title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
  title.setTypeface(null, android.graphics.Typeface.BOLD);
  root.addView(title);

  var desc = new android.widget.TextView(context);
  desc.setText("原始截图保存在 ToolHub 内部目录；可保存公共副本或系统分享。自动清理只删除内部截图和过期分享临时副本。");
  toolhubSafeSetTextColor(desc, secColor);
  desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  desc.setPadding(0, self.dp(3), 0, self.dp(8));
  root.addView(desc);

  var pathTitle = new android.widget.TextView(context);
  pathTitle.setText("公共保存目录");
  toolhubSafeSetTextColor(pathTitle, textColor);
  pathTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  pathTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  root.addView(pathTitle);

  var pathInput = new android.widget.EditText(context);
  var currentPath = self.getPendingValue("PICKWORD_IMAGE_PUBLIC_DIR");
  if (currentPath === undefined || currentPath === null || String(currentPath).length === 0) {
    currentPath = "/storage/emulated/0/Pictures/ToolHub";
  }
  pathInput.setText(String(currentPath));
  pathInput.setHint("/storage/emulated/0/Pictures/ToolHub");
  pathInput.setSingleLine(true);
  pathInput.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
  toolhubSafeSetTextColor(pathInput, textColor);
  toolhubSafeSetHintTextColor(pathInput, secColor);
  pathInput.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
  pathInput.setBackground(self.ui.createStrokeDrawable(
    inputBgColor,
    self.withAlpha(dividerColor, isDark ? 0.52 : 0.36),
    self.dp(1),
    self.dp(12)
  ));
  var pathLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  pathLp.setMargins(0, self.dp(6), 0, self.dp(6));
  root.addView(pathInput, pathLp);
  pathInput.addTextChangedListener(new android.text.TextWatcher({
    beforeTextChanged: function(s, start, count, after) {},
    onTextChanged: function(s, start, before, count) {},
    afterTextChanged: function(s) {
      try {
        self.touchActivity();
        self.setPendingValue("PICKWORD_IMAGE_PUBLIC_DIR", String(s));
      } catch(eText) {}
    }
  }));
  pathInput.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try {
      v.requestFocus();
      var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
      imm.showSoftInput(v, 0);
    } catch(eKeyboard) {}
  }}));

  var status = new android.widget.TextView(context);
  status.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  status.setPadding(0, self.dp(2), 0, self.dp(6));
  toolhubSafeSetTextColor(status, secColor);
  root.addView(status, new android.widget.LinearLayout.LayoutParams(-1, -2));

  function setStatus13(text, errorValue) {
    try {
      status.setText(String(text || ""));
      toolhubSafeSetTextColor(status, errorValue === true && T && T.danger ? T.danger : secColor);
    } catch(eStatus) {}
  }

  function refreshStats13() {
    try {
      if (typeof self.getPickwordImageStorageStats !== "function") {
        setStatus13("截图存储模块尚未加载", true);
        return;
      }
      var info = self.getPickwordImageStorageStats() || {};
      var retention = Number(self.getPendingValue("PICKWORD_IMAGE_RETENTION_DAYS"));
      if (isNaN(retention)) retention = Number(info.retentionDays || 7);
      var retentionText = retention <= 0 ? "永久保留内部截图" : ("内部截图保留 " + String(retention) + " 天");
      setStatus13(
        "已记录 " + String(info.tracked || 0) + " 张 · 已保存 " + String(info.saved || 0) +
        " 张 · " + retentionText,
        false
      );
    } catch(eStats) {
      setStatus13("读取截图状态失败", true);
    }
  }

  var pathTesting = false;
  var pathButton = null;
  var pathHandler = new android.os.Handler(android.os.Looper.getMainLooper());
  function finishPathTest13(result) {
    pathTesting = false;
    try {
      if (pathButton) {
        pathButton.setEnabled(true);
        pathButton.setAlpha(1.0);
        pathButton.setText("测试保存目录");
      }
      if (result && result.ok) {
        self.setPendingValue("PICKWORD_IMAGE_PUBLIC_DIR", String(result.path || ""));
        pathInput.setText(String(result.path || ""));
        pathInput.setSelection(pathInput.getText().length());
        setStatus13("目录可写：" + String(result.path || ""), false);
      } else {
        var errorText = String(result && result.error || "未知错误");
        if (errorText.length > 700) errorText = errorText.substring(0, 700) + "…";
        setStatus13("目录不可用：" + errorText, true);
      }
    } catch(eFinish) {
      setStatus13("目录测试结果更新失败", true);
    }
  }
  pathButton = self.ui.createSolidButton(self, "测试保存目录", primary, onPrimary, function() {
    if (pathTesting) return;
    try {
      if (typeof self.validatePickwordImagePublicDir !== "function") {
        setStatus13("截图存储模块尚未加载", true);
        return;
      }
      self.touchActivity();
      var pathSnapshot = String(pathInput.getText() || "");
      pathTesting = true;
      pathButton.setEnabled(false);
      pathButton.setAlpha(0.65);
      pathButton.setText("正在测试…");
      setStatus13("正在通过 ShortX Shell 桥测试目录…", false);
      var thread = new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var result = null;
        try { result = self.validatePickwordImagePublicDir(pathSnapshot); }
        catch(eTest) { result = { ok: false, path: pathSnapshot, error: String(eTest) }; }
        pathHandler.post(new java.lang.Runnable({ run: function() { finishPathTest13(result); }}));
      }}), "TH-Pickword-Image-Dir-Test");
      thread.start();
    } catch(eStart) {
      finishPathTest13({ ok: false, error: "目录测试启动失败：" + String(eStart) });
    }
  });
  var pathButtonLp = new android.widget.LinearLayout.LayoutParams(-1, self.dp(46));
  pathButtonLp.setMargins(0, 0, 0, self.dp(10));
  root.addView(pathButton, pathButtonLp);

  var retentionTitle = new android.widget.TextView(context);
  retentionTitle.setText("内部截图保留时间");
  toolhubSafeSetTextColor(retentionTitle, textColor);
  retentionTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  retentionTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  root.addView(retentionTitle);

  var retentionGroup = new android.widget.RadioGroup(context);
  retentionGroup.setOrientation(android.widget.RadioGroup.VERTICAL);
  var retentionOptions = [
    { label: "3 天", value: 3 },
    { label: "7 天（默认）", value: 7 },
    { label: "15 天", value: 15 },
    { label: "30 天", value: 30 },
    { label: "永久保留", value: 0 }
  ];
  var retentionIds = {};
  var currentRetention = Number(self.getPendingValue("PICKWORD_IMAGE_RETENTION_DAYS"));
  if (isNaN(currentRetention)) currentRetention = 7;
  for (var i = 0; i < retentionOptions.length; i++) {
    (function(option, index) {
      var rb = new android.widget.RadioButton(context);
      var id = 221000 + index;
      try { if (android.view.View.generateViewId) id = android.view.View.generateViewId(); } catch(eId) {}
      retentionIds[String(id)] = Number(option.value);
      rb.setId(id);
      rb.setText(String(option.label));
      rb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
      toolhubSafeSetTextColor(rb, textColor);
      try {
        toolhubSafeApplyColorStateList(
          rb,
          "setButtonTintList",
          toolhubSafeColorStateListFromStates(
            [[android.R.attr.state_checked], [-android.R.attr.state_checked]],
            [primary, secColor]
          )
        );
      } catch(eTint) {}
      rb.setChecked(Number(option.value) === currentRetention);
      retentionGroup.addView(rb, new android.widget.RadioGroup.LayoutParams(-1, self.dp(40)));
    })(retentionOptions[i], i);
  }
  retentionGroup.setOnCheckedChangeListener(new android.widget.RadioGroup.OnCheckedChangeListener({
    onCheckedChanged: function(group, checkedId) {
      try {
        if (retentionIds.hasOwnProperty(String(checkedId))) {
          self.touchActivity();
          self.setPendingValue("PICKWORD_IMAGE_RETENTION_DAYS", Number(retentionIds[String(checkedId)]));
          refreshStats13();
        }
      } catch(eRetention) {}
    }
  }));
  var retentionLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  retentionLp.setMargins(0, self.dp(4), 0, self.dp(8));
  root.addView(retentionGroup, retentionLp);

  var cleanupButton = self.ui.createSolidButton(self, "立即清理", primary, onPrimary, function() {
    try {
      if (typeof self.runPickwordImageCleanupNow !== "function") {
        setStatus13("截图清理模块尚未加载", true);
        return;
      }
      cleanupButton.setEnabled(false);
      cleanupButton.setAlpha(0.55);
      cleanupButton.setText("正在清理…");
      setStatus13("正在清理内部截图和过期分享临时副本…", false);
      self.runPickwordImageCleanupNow({
        force: true,
        retentionDays: Number(self.getPendingValue("PICKWORD_IMAGE_RETENTION_DAYS"))
      }, function(result) {
        try {
          cleanupButton.setEnabled(true);
          cleanupButton.setAlpha(1.0);
          cleanupButton.setText("立即清理");
          if (result && result.ok) {
            setStatus13(
              "清理完成：内部 " + String(result.internal ? result.internal.deleted : 0) +
              " 张，分享临时副本 " + String(result.exports ? result.exports.deleted : 0) + " 张",
              false
            );
          } else {
            setStatus13("清理失败：" + String(result && result.error || "未知错误"), true);
          }
        } catch(eDone) {}
      });
    } catch(eCleanup) {
      cleanupButton.setEnabled(true);
      cleanupButton.setAlpha(1.0);
      cleanupButton.setText("立即清理");
      setStatus13("清理启动失败：" + String(eCleanup), true);
    }
  });
  var cleanupLp = new android.widget.LinearLayout.LayoutParams(-1, self.dp(48));
  cleanupLp.setMargins(0, self.dp(4), 0, 0);
  root.addView(cleanupButton, cleanupLp);

  refreshStats13();
  parent.addView(root, new android.widget.LinearLayout.LayoutParams(-1, -2));
};

FloatBallAppWM.prototype.createSettingItemView = function(item, parent, needDivider) {
  if (!item || String(item.type || "") === "hidden") return;
  if (String(item.type || "") === "pickword_translate_settings") {
    this.createPickwordTranslateSettingsView(item, parent, needDivider);
    return;
  }
  if (String(item.type || "") === "pickword_image_settings") {
    this.createPickwordImageSettingsView(item, parent, needDivider);
    return;
  }
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
  // 使用项目内稳定按压状态背景，避免主题资源间接加载 framework RippleDrawable。
  try {
      var rowPressedColor = this.withAlpha(primary, isDark ? 0.16 : 0.10);
      row.setBackground(this.ui.createTransparentPressedStateDrawable(rowPressedColor, this.dp(12)));
  } catch(eRowBg) {
      try {
        row.setBackground(this.ui.createRoundDrawable(android.graphics.Color.TRANSPARENT, this.dp(12)));
      } catch(eRowBgFallback) {}
      safeLog(null, 'e', "setting row press background fail " + String(eRowBg));
  }

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
      onStopTrackingTouch: function(seek) {
        try {
          self.touchActivity();
          if (String(item.key || "") === "POINTER_RESULT_PREVIEW_POSITION_PERCENT" &&
              typeof self.onResultPreviewConfigurationChanged === "function") {
            self.onResultPreviewConfigurationChanged({
              positionOnly: true,
              positionPreviewPercent: computeValByProgress(seek.getProgress()),
              reason: "settings_seek_stop"
            });
          }
        } catch(e3) { safeLog(null, 'e', "catch " + String(e3)); }
      }
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
    // 使用低透明度按压色，避免文字与背景同色导致按压期间不可见。
    var actionPressedColor = self.withAlpha(primary, isDark ? 0.18 : 0.10);
    btn.setBackground(self.ui.createTransparentPressedStateDrawable(actionPressedColor, self.dp(14)));

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

    var colorItemDesc = String(item.desc || "");
    if (colorItemDesc) {
      var colorDescTv = new android.widget.TextView(context);
      colorDescTv.setText(colorItemDesc);
      toolhubSafeSetTextColor(colorDescTv, secColor);
      colorDescTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      try { colorDescTv.setIncludeFontPadding(false); } catch(eColorDescPad) {}
      var colorDescLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
      );
      colorDescLp.topMargin = self.dp(3);
      colorDescTv.setLayoutParams(colorDescLp);
      row.addView(colorDescTv);
    }

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
