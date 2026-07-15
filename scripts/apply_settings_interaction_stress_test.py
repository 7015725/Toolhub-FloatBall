#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL_UI = ROOT / "code" / "th_13_panel_ui.js"
PANELS = ROOT / "code" / "th_14_panels.js"
VERIFY = ROOT / "scripts" / "verify_coloros_rhino_color_safety.py"


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit("missing anchor: " + label)
    if text.count(old) != 1:
        raise SystemExit("ambiguous anchor: " + label + " count=" + str(text.count(old)))
    return text.replace(old, new, 1)

panel_ui = PANEL_UI.read_text(encoding="utf-8")
panel_ui = replace_once(panel_ui, "// @version 1.0.8", "// @version 1.0.9", "panel ui version")

stress_methods = r'''
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

'''
panel_ui = replace_once(panel_ui, "FloatBallAppWM.prototype.createSettingItemView = function(item, parent, needDivider) {", stress_methods + "FloatBallAppWM.prototype.createSettingItemView = function(item, parent, needDivider) {", "insert stress methods")
PANEL_UI.write_text(panel_ui, encoding="utf-8")

panels = PANELS.read_text(encoding="utf-8")
panels = replace_once(panels, "// @version 1.0.23", "// @version 1.0.24", "panels version")

panel_methods = r'''
FloatBallAppWM.prototype.startSettingsInteractionStressTestFromSettings = function(anchorView) {
  var self = this;
  try {
    if (!this.state) return;
    if (this.state.settingsInteractionStressRunning) { try { this.toast("设置页控件压力测试正在进行"); } catch(eToast0) {} return; }
    if (!this.runSettingsInteractionStressTest) { try { this.toast("设置页控件压力测试模块未加载"); } catch(eToast1) {} return; }
    this.state.settingsInteractionStressRunning = true;
    safeLog(this.L, "i", "settings interaction stress requested from settings loops=120");
    try { this.toast("正在运行设置页控件压力测试"); } catch(eToast2) {}
    var task = new java.lang.Runnable({
      run: function() {
        var ret = null;
        try { ret = self.runSettingsInteractionStressTest(120); }
        catch(eRun) { ret = { ok: false, loops: 120, durationMs: 0, error: String(eRun) }; safeLog(self.L, "e", "settings interaction stress run fail error=" + String(eRun)); }
        try { self.state.settingsInteractionStressRunning = false; self.state.settingsInteractionStressResult = ret; } catch(eState) {}
        try {
          var msg = ret && ret.ok ? ("设置页控件压力测试通过：" + String(ret.loops || 0) + " 次，" + String(ret.durationMs || 0) + "ms") : ("设置页控件压力测试失败：" + String(ret && ret.error ? ret.error : "unknown"));
          if (self.setInlineNotice) self.setInlineNotice(msg, ret && ret.ok ? "ok" : "error"); else self.toast(msg);
        } catch(eNotice) {}
        try {
          var route = self.state && self.state.toolAppRoute ? String(self.state.toolAppRoute) : "";
          if (self.state && self.state.toolAppActive && route === "settings_group" && self.replaceToolAppPage) self.replaceToolAppPage("settings_group");
        } catch(eRefresh) {}
      }
    });
    if (anchorView && anchorView.post) anchorView.post(task);
    else new android.os.Handler(android.os.Looper.getMainLooper()).post(task);
  } catch(eStart) {
    try { this.state.settingsInteractionStressRunning = false; } catch(eFlag) {}
    safeLog(this.L, "e", "start settings interaction stress fail error=" + String(eStart));
    try { this.toast("启动设置页控件压力测试失败"); } catch(eToast3) {}
  }
};

FloatBallAppWM.prototype.copySettingsInteractionStressSummaryFromSettings = function() {
  try {
    var last = this.getLastSettingsInteractionStressResult ? this.getLastSettingsInteractionStressResult() : (this.state ? this.state.settingsInteractionStressResult : null);
    if (!last) { try { this.toast("请先运行设置页控件压力测试"); } catch(eToast0) {} return false; }
    var text = this.formatSettingsInteractionStressSummary ? this.formatSettingsInteractionStressSummary(last) : "";
    if (!text) { try { this.toast("控件压力摘要生成失败"); } catch(eToast1) {} return false; }
    var clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
    if (!clipboard) throw "clipboard service unavailable";
    var clip = android.content.ClipData.newPlainText("ToolHub 设置页控件压力测试", text);
    clipboard.setPrimaryClip(clip);
    safeLog(this.L, "i", "settings interaction stress summary copied length=" + String(text.length));
    try { this.toast("控件压力摘要已复制"); } catch(eToast2) {}
    return true;
  } catch(eCopy) {
    safeLog(this.L, "e", "copy settings interaction stress summary fail error=" + String(eCopy));
    try { this.toast("复制控件压力摘要失败"); } catch(eToast3) {}
  }
  return false;
};

'''
panels = replace_once(panels, "FloatBallAppWM.prototype.createColorSafetyRuntimeDiagnosticCard = function() {", panel_methods + "FloatBallAppWM.prototype.createColorSafetyRuntimeDiagnosticCard = function() {", "insert panel methods")
panels = replace_once(panels,
'''  var running = !!(this.state && this.state.colorSafetyRuntimeSelfTestRunning);
  var last = this.getLastColorSafetyRuntimeSelfTestResult ? this.getLastColorSafetyRuntimeSelfTestResult() : (this.state ? this.state.colorSafetyRuntimeSelfTest : null);
  var runtime = this.getColorSafetyRuntimeContext ? this.getColorSafetyRuntimeContext() : {};''',
'''  var running = !!(this.state && this.state.colorSafetyRuntimeSelfTestRunning);
  var last = this.getLastColorSafetyRuntimeSelfTestResult ? this.getLastColorSafetyRuntimeSelfTestResult() : (this.state ? this.state.colorSafetyRuntimeSelfTest : null);
  var interactionRunning = !!(this.state && this.state.settingsInteractionStressRunning);
  var interactionLast = this.getLastSettingsInteractionStressResult ? this.getLastSettingsInteractionStressResult() : (this.state ? this.state.settingsInteractionStressResult : null);
  var runtime = this.getColorSafetyRuntimeContext ? this.getColorSafetyRuntimeContext() : {};''', "card state vars")
panels = replace_once(panels,
'''  desc.setText("手动创建并切换 160 组 StateListDrawable 与 ColorStateList；不会自动运行。结果保存到 ToolHub/diagnostics/color-safety-last.json，可复制摘要。");''',
'''  desc.setText("颜色底层自检验证 Drawable/ColorStateList；控件压力测试验证实际 Row、Switch、SeekBar 与按钮。两项都只手动运行，不保存设置、不附着新窗口。");''', "card description")

interaction_ui = r'''

  var interactionStatus = new android.widget.TextView(context);
  var interactionStatusText = "控件压力：尚未运行";
  var interactionStatusColor = T.onSurface2;
  if (interactionRunning) { interactionStatusText = "控件压力：正在执行"; interactionStatusColor = T.primary; }
  else if (interactionLast && interactionLast.ok) { interactionStatusText = "控件压力：通过 · " + String(interactionLast.loops || 0) + " 次 · " + String(interactionLast.durationMs || 0) + "ms"; interactionStatusColor = T.success || T.primary; }
  else if (interactionLast && interactionLast.error) { interactionStatusText = "控件压力：失败 · " + String(interactionLast.error); interactionStatusColor = T.danger || C.error || T.primary; }
  interactionStatus.setText(interactionStatusText);
  toolhubSafeSetTextColor(interactionStatus, interactionStatusColor);
  interactionStatus.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  interactionStatus.setPadding(0, this.dp(12), 0, 0);
  try { interactionStatus.setMaxLines(3); interactionStatus.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eInteractionStatus) {}
  card.addView(interactionStatus, new android.widget.LinearLayout.LayoutParams(-1, -2));

  var interactionButton = this.ui.createSolidButton(this, interactionRunning ? "控件压力测试进行中" : "运行 120 次设置控件压力测试", T.primary, T.onPrimary, function(v) { self.startSettingsInteractionStressTestFromSettings(v); });
  try { interactionButton.setEnabled(!interactionRunning && !running); if (interactionRunning || running) interactionButton.setAlpha(0.62); } catch(eInteractionEnabled) {}
  try { interactionButton.setContentDescription("运行设置页真实控件压力测试"); } catch(eInteractionDesc) {}
  var interactionButtonLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(48));
  interactionButtonLp.setMargins(0, this.dp(8), 0, 0);
  card.addView(interactionButton, interactionButtonLp);

  var hasInteractionResult = !!interactionLast;
  var interactionCopyButton = this.ui.createSolidButton(this, hasInteractionResult ? "复制控件压力摘要" : "暂无控件压力结果", T.primaryContainer || T.surface2, T.primary, function() { self.copySettingsInteractionStressSummaryFromSettings(); });
  try { interactionCopyButton.setEnabled(hasInteractionResult && !interactionRunning && !running); if (!hasInteractionResult || interactionRunning || running) interactionCopyButton.setAlpha(0.62); } catch(eInteractionCopyEnabled) {}
  try { interactionCopyButton.setContentDescription("复制设置页控件压力测试摘要"); } catch(eInteractionCopyDesc) {}
  var interactionCopyButtonLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
  interactionCopyButtonLp.setMargins(0, this.dp(8), 0, 0);
  card.addView(interactionCopyButton, interactionCopyButtonLp);
'''
panels = replace_once(panels, "  card.addView(copyButton, copyButtonLp);\n  return card;", "  card.addView(copyButton, copyButtonLp);" + interaction_ui + "  return card;", "insert interaction ui")
PANELS.write_text(panels, encoding="utf-8")

verify = VERIFY.read_text(encoding="utf-8")
verify = replace_once(verify,
'''PANELS = (CODE / "th_14_panels.js").read_text(encoding="utf-8")''',
'''PANELS = (CODE / "th_14_panels.js").read_text(encoding="utf-8")
PANEL_UI = (CODE / "th_13_panel_ui.js").read_text(encoding="utf-8")''', "load panel ui")
verify = replace_once(verify,
'''if ALL_JS.count(".runColorSafetyRuntimeSelfTest(") != 1:
    errors.append("runtime color self-test must have exactly one manual invocation")''',
'''if ALL_JS.count(".runColorSafetyRuntimeSelfTest(") != 1:
    errors.append("runtime color self-test must have exactly one manual invocation")
for token in (
    "FloatBallAppWM.prototype.runSettingsInteractionStressTest = function",
    "new android.widget.Switch(context)",
    "new android.widget.SeekBar(context)",
    "createTransparentPressedStateDrawable(rowPressedColor",
    "createSolidButton(this, \"压力测试\"",
    "ToolHub/diagnostics/settings-interaction-last.json",
    "settings interaction stress start",
    "settings interaction stress pass",
    "settings interaction stress fail",
    "loops = Math.max(1, Math.min(200, loops))",
):
    if token not in PANEL_UI:
        errors.append("settings interaction stress contract missing: %s" % token)
if ALL_JS.count(".runSettingsInteractionStressTest(") != 1:
    errors.append("settings interaction stress test must have exactly one manual invocation")
stress_block = re.search(r"FloatBallAppWM.prototype.runSettingsInteractionStressTest = function\(iterations\) \{.*?\n\};", PANEL_UI, re.S)
if not stress_block:
    errors.append("settings interaction stress method missing")
else:
    block = stress_block.group(0)
    for forbidden in ("setPendingValue(", "commitPendingUserCfg(", "state.wm.addView", "setOnCheckedChangeListener("):
        if forbidden in block:
            errors.append("settings interaction stress test mutates live settings or window state: %s" % forbidden)
for token in (
    "FloatBallAppWM.prototype.startSettingsInteractionStressTestFromSettings = function",
    "self.runSettingsInteractionStressTest(120)",
    "FloatBallAppWM.prototype.copySettingsInteractionStressSummaryFromSettings = function",
    "运行 120 次设置控件压力测试",
    "复制控件压力摘要",
):
    if token not in PANELS:
        errors.append("settings interaction stress settings entry missing: %s" % token)''', "stress contracts")
verify = replace_once(verify,
'''if module_version(PANELS, "th_14_panels.js") < (1, 0, 23):
    errors.append("th_14_panels.js version below runtime diagnostic export baseline 1.0.23")''',
'''if module_version(PANEL_UI, "th_13_panel_ui.js") < (1, 0, 9):
    errors.append("th_13_panel_ui.js version below settings interaction stress baseline 1.0.9")
if module_version(PANELS, "th_14_panels.js") < (1, 0, 24):
    errors.append("th_14_panels.js version below settings interaction stress entry baseline 1.0.24")''', "version baselines")
VERIFY.write_text(verify, encoding="utf-8")

print("settings interaction stress migration applied")
