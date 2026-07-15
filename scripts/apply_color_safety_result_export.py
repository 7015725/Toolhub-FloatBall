#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
THEME_PATH = ROOT / "code" / "th_04_theme.js"
PANELS_PATH = ROOT / "code" / "th_14_panels.js"
VERIFY_PATH = ROOT / "scripts" / "verify_coloros_rhino_color_safety.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("expected one %s marker, found %d" % (label, count))
    return text.replace(old, new, 1)


theme = THEME_PATH.read_text(encoding="utf-8")
theme = replace_once(theme, "// @version 1.0.9", "// @version 1.0.10", "theme version")

storage_helpers = r'''FloatBallAppWM.prototype.getColorSafetyRuntimeResultFile = function() {
  try {
    var baseDir = String(shortx.getShortXDir());
    if (!baseDir) return null;
    return new java.io.File(baseDir + "/ToolHub/diagnostics/color-safety-last.json");
  } catch(ePath) {
    safeLog(this.L, "w", "resolve color safety result path fail error=" + String(ePath));
  }
  return null;
};

FloatBallAppWM.prototype.normalizeColorSafetyRuntimeResult = function(value) {
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
    loops: Math.floor(numberValue(value.loops, 0, 0, 300)),
    durationMs: Math.floor(numberValue(value.durationMs, 0, 0, 3600000)),
    completedAt: Math.floor(numberValue(value.completedAt, 0, 0, 4102444800000)),
    drawableClass: textValue(value.drawableClass, 240),
    layerClass: textValue(value.layerClass, 240),
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

FloatBallAppWM.prototype.saveColorSafetyRuntimeSelfTestResult = function(result) {
  var file = null;
  var tmp = null;
  var writer = null;
  try {
    var clean = this.normalizeColorSafetyRuntimeResult ? this.normalizeColorSafetyRuntimeResult(result) : null;
    if (!clean) return false;
    file = this.getColorSafetyRuntimeResultFile ? this.getColorSafetyRuntimeResultFile() : null;
    if (!file) return false;
    var parent = file.getParentFile();
    if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) throw "cannot create diagnostic directory";
    tmp = new java.io.File(String(file.getAbsolutePath()) + ".tmp");
    writer = new java.io.OutputStreamWriter(new java.io.FileOutputStream(tmp, false), "UTF-8");
    writer.write(JSON.stringify(clean));
    writer.flush();
    writer.close();
    writer = null;
    if (file.exists() && !file.delete()) throw "cannot replace old diagnostic result";
    if (!tmp.renameTo(file)) throw "cannot publish diagnostic result";
    return true;
  } catch(eSave) {
    safeLog(this.L, "w", "save color safety result fail error=" + String(eSave));
  } finally {
    try { if (writer) writer.close(); } catch(eClose) {}
    try { if (tmp && tmp.exists()) tmp.delete(); } catch(eTmp) {}
  }
  return false;
};

FloatBallAppWM.prototype.loadColorSafetyRuntimeSelfTestResult = function() {
  var reader = null;
  try {
    var file = this.getColorSafetyRuntimeResultFile ? this.getColorSafetyRuntimeResultFile() : null;
    if (!file || !file.exists() || !file.isFile()) return null;
    var length = Number(file.length());
    if (!(length > 0) || length > 65536) throw "invalid diagnostic result size=" + String(length);
    reader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), "UTF-8"));
    var sb = new java.lang.StringBuilder();
    var line = null;
    while ((line = reader.readLine()) !== null) {
      if (sb.length() > 65536) throw "diagnostic result exceeds limit";
      sb.append(line);
    }
    reader.close();
    reader = null;
    var parsed = JSON.parse(String(sb.toString()));
    return this.normalizeColorSafetyRuntimeResult ? this.normalizeColorSafetyRuntimeResult(parsed) : null;
  } catch(eLoad) {
    safeLog(this.L, "w", "load color safety result fail error=" + String(eLoad));
  } finally {
    try { if (reader) reader.close(); } catch(eClose) {}
  }
  return null;
};

FloatBallAppWM.prototype.getLastColorSafetyRuntimeSelfTestResult = function() {
  try {
    if (!this.state) this.state = {};
    if (this.state.colorSafetyRuntimeSelfTest) return this.state.colorSafetyRuntimeSelfTest;
    if (this.state.colorSafetyRuntimeSelfTestLoaded) return null;
    this.state.colorSafetyRuntimeSelfTestLoaded = true;
    var loaded = this.loadColorSafetyRuntimeSelfTestResult ? this.loadColorSafetyRuntimeSelfTestResult() : null;
    if (loaded) this.state.colorSafetyRuntimeSelfTest = loaded;
    return loaded;
  } catch(eLast) {}
  return null;
};

FloatBallAppWM.prototype.formatColorSafetyRuntimeSelfTestSummary = function(result) {
  var clean = this.normalizeColorSafetyRuntimeResult ? this.normalizeColorSafetyRuntimeResult(result) : null;
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
  lines.push("ToolHub ColorOS 颜色安全自检");
  lines.push("状态：" + (clean.ok ? "通过" : "失败"));
  lines.push("时间：" + completedText);
  lines.push("循环：" + String(clean.loops) + " 次");
  lines.push("耗时：" + String(clean.durationMs) + " ms");
  lines.push("设备：" + String(runtime.manufacturer || runtime.brand || "未知") + " " + String(runtime.model || ""));
  lines.push("系统：Android " + String(runtime.release || "") + " / SDK " + String(runtime.sdk || 0));
  lines.push("构建：" + String(runtime.display || ""));
  lines.push("进程：" + String(runtime.process || ""));
  lines.push("主题：" + (runtime.dark ? "暗色" : "亮色"));
  lines.push("按压透明度：" + String(runtime.pressAlpha));
  lines.push("Drawable：" + String(clean.drawableClass || ""));
  lines.push("Layer：" + String(clean.layerClass || ""));
  if (clean.error) lines.push("错误：" + String(clean.error));
  return lines.join("\n");
};

'''
marker = "FloatBallAppWM.prototype.runColorSafetyRuntimeSelfTest = function(iterations) {"
theme = replace_once(theme, marker, storage_helpers + marker, "runtime self-test function")
theme = replace_once(
    theme,
    'var result = { ok: false, loops: loops, durationMs: 0, drawableClass: "", layerClass: "", error: "", runtime: runtime };',
    'var result = { schemaVersion: 1, ok: false, loops: loops, durationMs: 0, completedAt: 0, drawableClass: "", layerClass: "", error: "", runtime: runtime };',
    "runtime result object",
)
theme = replace_once(
    theme,
    'result.durationMs = Math.max(0, Number(java.lang.System.currentTimeMillis() - startedAt));\n  try { if (!this.state) this.state = {}; this.state.colorSafetyRuntimeSelfTest = result; } catch(eState) {}',
    'result.durationMs = Math.max(0, Number(java.lang.System.currentTimeMillis() - startedAt));\n  result.completedAt = Number(java.lang.System.currentTimeMillis());\n  try { if (this.normalizeColorSafetyRuntimeResult) result = this.normalizeColorSafetyRuntimeResult(result) || result; } catch(eNormalize) {}\n  try { if (this.saveColorSafetyRuntimeSelfTestResult) this.saveColorSafetyRuntimeSelfTestResult(result); } catch(ePersist) {}\n  try { if (!this.state) this.state = {}; this.state.colorSafetyRuntimeSelfTestLoaded = true; this.state.colorSafetyRuntimeSelfTest = result; } catch(eState) {}',
    "runtime result completion",
)
THEME_PATH.write_text(theme, encoding="utf-8")

panels = PANELS_PATH.read_text(encoding="utf-8")
panels = replace_once(panels, "// @version 1.0.22", "// @version 1.0.23", "panels version")
copy_method = r'''FloatBallAppWM.prototype.copyColorSafetyRuntimeSelfTestSummaryFromSettings = function() {
  try {
    var last = this.getLastColorSafetyRuntimeSelfTestResult ? this.getLastColorSafetyRuntimeSelfTestResult() : (this.state ? this.state.colorSafetyRuntimeSelfTest : null);
    if (!last) { try { this.toast("请先运行颜色安全自检"); } catch(eToast0) {} return false; }
    var text = this.formatColorSafetyRuntimeSelfTestSummary ? this.formatColorSafetyRuntimeSelfTestSummary(last) : "";
    if (!text) { try { this.toast("诊断摘要生成失败"); } catch(eToast1) {} return false; }
    var clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
    if (!clipboard) throw "clipboard service unavailable";
    var clip = android.content.ClipData.newPlainText("ToolHub 颜色安全自检", text);
    clipboard.setPrimaryClip(clip);
    safeLog(this.L, "i", "color safety diagnostic summary copied length=" + String(text.length));
    try { this.toast("诊断摘要已复制"); } catch(eToast2) {}
    return true;
  } catch(eCopy) {
    safeLog(this.L, "e", "copy color safety diagnostic summary fail error=" + String(eCopy));
    try { this.toast("复制诊断摘要失败"); } catch(eToast3) {}
  }
  return false;
};

'''
card_marker = "FloatBallAppWM.prototype.createColorSafetyRuntimeDiagnosticCard = function() {"
panels = replace_once(panels, card_marker, copy_method + card_marker, "diagnostic card function")
panels = replace_once(
    panels,
    "  var last = this.state ? this.state.colorSafetyRuntimeSelfTest : null;",
    "  var last = this.getLastColorSafetyRuntimeSelfTestResult ? this.getLastColorSafetyRuntimeSelfTestResult() : (this.state ? this.state.colorSafetyRuntimeSelfTest : null);",
    "last diagnostic result",
)
panels = replace_once(
    panels,
    '  desc.setText("手动创建并切换 160 组 StateListDrawable 与 ColorStateList；不附着窗口、不使用 framework RippleDrawable，也不会自动运行。");',
    '  desc.setText("手动创建并切换 160 组 StateListDrawable 与 ColorStateList；不会自动运行。结果保存到 ToolHub/diagnostics/color-safety-last.json，可复制摘要。");',
    "diagnostic description",
)
panels = replace_once(
    panels,
    '  var buttonLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(48));\n  buttonLp.setMargins(0, this.dp(10), 0, 0);\n  card.addView(button, buttonLp);\n  return card;',
    '  var buttonLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(48));\n  buttonLp.setMargins(0, this.dp(10), 0, 0);\n  card.addView(button, buttonLp);\n\n  var hasResult = !!last;\n  var copyButton = this.ui.createSolidButton(this, hasResult ? "复制诊断摘要" : "暂无可复制结果", T.primaryContainer || T.surface2, T.primary, function() { self.copyColorSafetyRuntimeSelfTestSummaryFromSettings(); });\n  try { copyButton.setEnabled(hasResult && !running); if (!hasResult || running) copyButton.setAlpha(0.62); } catch(eCopyEnabled) {}\n  try { copyButton.setContentDescription("复制 ColorOS 颜色安全诊断摘要"); } catch(eCopyDesc) {}\n  var copyButtonLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));\n  copyButtonLp.setMargins(0, this.dp(8), 0, 0);\n  card.addView(copyButton, copyButtonLp);\n  return card;',
    "diagnostic buttons",
)
PANELS_PATH.write_text(panels, encoding="utf-8")

verify = VERIFY_PATH.read_text(encoding="utf-8")
verify = replace_once(
    verify,
    '    "colorState.getColorForState(pressedState, normalColor)",\n):',
    '    "colorState.getColorForState(pressedState, normalColor)",\n    "FloatBallAppWM.prototype.getColorSafetyRuntimeResultFile = function",\n    "FloatBallAppWM.prototype.saveColorSafetyRuntimeSelfTestResult = function",\n    "FloatBallAppWM.prototype.loadColorSafetyRuntimeSelfTestResult = function",\n    "FloatBallAppWM.prototype.formatColorSafetyRuntimeSelfTestSummary = function",\n    "ToolHub/diagnostics/color-safety-last.json",\n    "result.completedAt = Number(java.lang.System.currentTimeMillis())",\n):',
    "theme persistence contracts",
)
verify = replace_once(
    verify,
    '    "不附着窗口、不使用 framework RippleDrawable，也不会自动运行",\n):',
    '    "不会自动运行。结果保存到 ToolHub/diagnostics/color-safety-last.json，可复制摘要",\n    "FloatBallAppWM.prototype.copyColorSafetyRuntimeSelfTestSummaryFromSettings = function",\n    "clipboard.setPrimaryClip(clip)",\n    "复制诊断摘要",\n):',
    "panel export contracts",
)
verify = replace_once(
    verify,
    'if ALL_JS.count(".runColorSafetyRuntimeSelfTest(") != 1:\n    errors.append("runtime color self-test must have exactly one manual invocation")',
    'if ALL_JS.count(".runColorSafetyRuntimeSelfTest(") != 1:\n    errors.append("runtime color self-test must have exactly one manual invocation")\nif ALL_JS.count(".setPrimaryClip(") != 1:\n    errors.append("runtime diagnostic summary must have exactly one clipboard write")',
    "clipboard invocation contract",
)
verify = replace_once(verify, '(1, 0, 9):\n    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.9")', '(1, 0, 10):\n    errors.append("th_04_theme.js version below ColorOS result persistence baseline 1.0.10")', "theme baseline")
verify = replace_once(verify, '(1, 0, 22):\n    errors.append("th_14_panels.js version below runtime diagnostic compact-layout baseline 1.0.22")', '(1, 0, 23):\n    errors.append("th_14_panels.js version below runtime diagnostic export baseline 1.0.23")', "panels baseline")
VERIFY_PATH.write_text(verify, encoding="utf-8")

print("applied color safety result persistence and export")
