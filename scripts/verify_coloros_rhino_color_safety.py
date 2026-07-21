#!/usr/bin/env python3
"""验证 ColorOS/Rhino 颜色桥、稳定按压反馈及其默认值回退契约。"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
BASE = (CODE / "th_01_base.js").read_text(encoding="utf-8")
THEME = (CODE / "th_04_theme.js").read_text(encoding="utf-8")
MAIN = (CODE / "th_15_main_panel.js").read_text(encoding="utf-8")
PANELS = (CODE / "th_14_panels.js").read_text(encoding="utf-8")
PANEL_UI = (CODE / "th_13_panel_ui.js").read_text(encoding="utf-8")
ALL_JS = "\n".join(p.read_text(encoding="utf-8") for p in sorted(CODE.glob("*.js")))

errors = []


def module_version(text, label):
    match = re.search(r"(?m)^// @version (\d+)\.(\d+)\.(\d+)$", text)
    if not match:
        errors.append(label + " version header missing")
        return (0, 0, 0)
    return tuple(int(value) for value in match.groups())


for token in (
    "new android.graphics.drawable.RippleDrawable",
    "ColorStateList.valueOf(",
    "android.content.res.ColorStateList.valueOf(",
    "android.R.attr.selectableItemBackground",
    "android.R.attr.selectableItemBackgroundBorderless",
):
    if token in ALL_JS:
        errors.append("forbidden framework ripple token remains: %s" % token)

for token in (
    "function toolhubColorInt(",
    "function toolhubJintArray(",
    "function toolhubJint2Array(",
    "function toolhubSafeColorStateList(",
    "function toolhubSafeSetGradientColor(",
    "function toolhubSafeSetGradientStroke(",
    "function toolhubSafeSetPaintColor(",
    "function toolhubCompositeColor(",
):
    if token not in THEME:
        errors.append("missing safe color helper: %s" % token)

if "StateListDrawable" not in THEME or "updateBallContentBackground" not in THEME:
    errors.append("ball background is not protected by StateListDrawable")
for token in ("createPressedStateDrawable", "createTransparentPressedStateDrawable", "getBallPressedOverlayAlpha"):
    if token not in THEME:
        errors.append("stable pressed-state helper missing: %s" % token)
for token in ("createRippleDrawable", "createTransparentRippleDrawable", "createMainPanelRippleBackground"):
    if token in ALL_JS:
        errors.append("legacy ripple helper name remains: %s" % token)
for token in ("CONST_BALL_PRESS_ALPHA_LIGHT", "CONST_BALL_PRESS_ALPHA_DARK"):
    if token not in BASE:
        errors.append("pressed-state constant missing: %s" % token)
for token in (
    "BALL_PRESS_ALPHA_LIGHT: { type: \"float\", min: 0, max: 1, default: 0.22 }",
    "BALL_PRESS_ALPHA_DARK: { type: \"float\", min: 0, max: 1, default: 0.28 }",
    "BALL_PRESS_ALPHA_MIGRATION_VERSION: { type: \"int\", min: 0, max: 9999, default: 1 }",
    "BALL_RIPPLE_ALPHA_LIGHT: true",
    "BALL_RIPPLE_ALPHA_DARK: true",
    "ballPressAlphaMigrationDirty",
):
    if token not in BASE:
        errors.append("pressed-state config migration contract missing: %s" % token)
if "var rippleColor" in THEME:
    errors.append("legacy ripple runtime variable remains in theme")
if "BALL_RIPPLE_ALPHA_" in THEME:
    errors.append("ball pressed resolver still references legacy Ripple config keys")
if "var alpha01 = this.getBallPressedOverlayAlpha(dark);" not in THEME:
    errors.append("ball background does not use pressed alpha resolver")
if "createTransparentPressedStateDrawable(pressedColor" not in THEME:
    errors.append("flat button does not use pressed-state helper")
if "createPressedStateDrawable(bgColor, pressedColor" not in THEME:
    errors.append("solid button does not use pressed-state helper")
if "StateListDrawable" not in MAIN or "createMainPanelPressedBackground" not in MAIN:
    errors.append("main panel card background is not protected by StateListDrawable")
for token in (
    "FloatBallAppWM.prototype.getColorSafetyRuntimeContext = function",
    "FloatBallAppWM.prototype.runColorSafetyRuntimeSelfTest = function",
    "color safety self-test start",
    "color safety self-test pass",
    "color safety self-test fail",
    "loops = Math.max(1, Math.min(300, loops))",
    "drawableClass.indexOf(\"RippleDrawable\") >= 0",
    "colorState.getColorForState(pressedState, normalColor)",
    "FloatBallAppWM.prototype.getColorSafetyRuntimeResultFile = function",
    "FloatBallAppWM.prototype.saveColorSafetyRuntimeSelfTestResult = function",
    "FloatBallAppWM.prototype.loadColorSafetyRuntimeSelfTestResult = function",
    "FloatBallAppWM.prototype.formatColorSafetyRuntimeSelfTestSummary = function",
    "diagnostics/color-safety-last.json",
    "result.completedAt = Number(java.lang.System.currentTimeMillis())",
):
    if token not in THEME:
        errors.append("runtime color self-test contract missing: %s" % token)
for token in (
    "FloatBallAppWM.prototype.startColorSafetyRuntimeSelfTestFromSettings = function",
    "FloatBallAppWM.prototype.copyColorSafetyRuntimeSelfTestSummaryFromSettings = function",
    "FloatBallAppWM.prototype.startSettingsInteractionStressTestFromSettings = function",
    "FloatBallAppWM.prototype.copySettingsInteractionStressSummaryFromSettings = function",
    "FloatBallAppWM.prototype.createColorSafetyRuntimeDiagnosticCard = function",
    'card.setContentDescription("ToolHub 运行记录")',
    'box.addView(colorSafetyCard, colorSafetyCardLp);',
    'box.addView(colorSafetyCardCompact, colorSafetyCardCompactLp);',
    "create runtime records card fail",
    "create compact runtime records card fail",
):
    if token not in PANELS:
        errors.append("runtime records scroll contract missing: %s" % token)

for forbidden in (
    "self.runColorSafetyRuntimeSelfTest(160)",
    "self.runSettingsInteractionStressTest(120)",
    "运行 160 次自检",
    "运行 120 次设置控件压力测试",
    "复制诊断摘要",
    "复制控件压力摘要",
    "root.addView(colorSafetyCard, colorSafetyCardLp);",
    "panel.addView(colorSafetyCardCompact, colorSafetyCardCompactLp);",
):
    if forbidden in PANELS:
        errors.append("removed runtime diagnostic UI remains: %s" % forbidden)

if ALL_JS.count(".runColorSafetyRuntimeSelfTest(") != 0:
    errors.append("runtime color self-test must not have a settings invocation")
if ALL_JS.count(".runSettingsInteractionStressTest(") != 0:
    errors.append("settings interaction stress test must not have a settings invocation")

for token in (
    "FloatBallAppWM.prototype.runSettingsInteractionStressTest = function",
    "new android.widget.Switch(context)",
    "new android.widget.SeekBar(context)",
    "createTransparentPressedStateDrawable(rowPressedColor",
    'createSolidButton(this, "压力测试"',
    "diagnostics/settings-interaction-last.json",
    "settings interaction stress start",
    "settings interaction stress pass",
    "settings interaction stress fail",
    "loops = Math.max(1, Math.min(200, loops))",
):
    if token not in PANEL_UI:
        errors.append("settings interaction stress implementation missing: %s" % token)

stress_block = re.search(r"FloatBallAppWM.prototype.runSettingsInteractionStressTest = function\(iterations\) \{.*?\n\};", PANEL_UI, re.S)
if not stress_block:
    errors.append("settings interaction stress method missing")
else:
    block = stress_block.group(0)
    for forbidden in ("setPendingValue(", "commitPendingUserCfg(", "state.wm.addView", "setOnCheckedChangeListener("):
        if forbidden in block:
            errors.append("settings interaction stress test mutates live settings or window state: %s" % forbidden)

records_block = re.search(r"FloatBallAppWM.prototype.createColorSafetyRuntimeDiagnosticCard = function\(\) \{.*?\n\};", PANELS, re.S)
if not records_block:
    errors.append("runtime records card method missing")
else:
    block = records_block.group(0)
    for token in ('new android.widget.LinearLayout(context)', 'card.setContentDescription("ToolHub 运行记录")', 'return card;'):
        if token not in block:
            errors.append("runtime records card contract missing: %s" % token)
    for forbidden in ("运行 160 次自检", "运行 120 次设置控件压力测试", "ColorOS 颜色安全自检"):
        if forbidden in block:
            errors.append("runtime records card still exposes diagnostic test: %s" % forbidden)

argb = re.search(r"function _th_argb\(c\) \{.*?\n\}", THEME, re.S)
if not argb:
    errors.append("_th_argb missing")
else:
    block = argb.group(0)
    for token in ("Color.alpha", "Color.red", "Color.green", "Color.blue"):
        if token in block:
            errors.append("unsafe overloaded color channel call remains in _th_argb: %s" % token)

if module_version(BASE, "th_01_base.js") < (1, 1, 12):
    errors.append("th_01_base.js version below pressed feedback baseline 1.1.12")
if module_version(THEME, "th_04_theme.js") < (1, 0, 10):
    errors.append("th_04_theme.js version below ColorOS result persistence baseline 1.0.10")
if module_version(PANEL_UI, "th_13_panel_ui.js") < (1, 0, 9):
    errors.append("th_13_panel_ui.js version below settings interaction stress baseline 1.0.10")
if module_version(PANELS, "th_14_panels.js") < (1, 0, 25):
    errors.append("th_14_panels.js version below runtime records scroll baseline 1.0.25")
if module_version(MAIN, "th_15_main_panel.js") < (1, 5, 8):
    errors.append("th_15_main_panel.js version below ColorOS safety baseline 1.5.8")

if errors:
    for item in errors:
        print("FAIL", item)
    raise SystemExit(1)

print("OK coloros_rhino_color_safety framework_ripple=0 safe_helpers=8 runtime_records_scroll=1 diagnostics_ui=0")
