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
):
    if token not in THEME:
        errors.append("runtime color self-test contract missing: %s" % token)
for token in (
    "FloatBallAppWM.prototype.startColorSafetyRuntimeSelfTestFromSettings = function",
    "FloatBallAppWM.prototype.createColorSafetyRuntimeDiagnosticCard = function",
    "self.runColorSafetyRuntimeSelfTest(160)",
    "String(groupKey || \"\") === \"debug\"",
    "不附着窗口、不使用 framework RippleDrawable，也不会自动运行",
):
    if token not in PANELS:
        errors.append("settings runtime diagnostic contract missing: %s" % token)
if ALL_JS.count(".runColorSafetyRuntimeSelfTest(") != 1:
    errors.append("runtime color self-test must have exactly one manual invocation")

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
if module_version(THEME, "th_04_theme.js") < (1, 0, 9):
    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.9")
if module_version(PANELS, "th_14_panels.js") < (1, 0, 21):
    errors.append("th_14_panels.js version below runtime diagnostic baseline 1.0.21")
if module_version(MAIN, "th_15_main_panel.js") < (1, 5, 8):
    errors.append("th_15_main_panel.js version below ColorOS safety baseline 1.5.8")

if errors:
    for item in errors:
        print("FAIL", item)
    raise SystemExit(1)

print("OK coloros_rhino_color_safety framework_ripple=0 safe_helpers=8")
