#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
BASE = (CODE / "th_01_base.js").read_text(encoding="utf-8")
THEME = (CODE / "th_04_theme.js").read_text(encoding="utf-8")
MAIN = (CODE / "th_15_main_panel.js").read_text(encoding="utf-8")
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
for token in ("CONST_BALL_PRESS_ALPHA_LIGHT", "CONST_BALL_PRESS_ALPHA_DARK"):
    if token not in BASE:
        errors.append("pressed-state constant missing: %s" % token)
if "var rippleColor" in THEME:
    errors.append("legacy ripple runtime variable remains in theme")
if "var alpha01 = dark ? this.config.BALL_RIPPLE_ALPHA_DARK" in THEME:
    errors.append("ball pressed alpha still reads legacy keys directly")
if "var alpha01 = this.getBallPressedOverlayAlpha(dark);" not in THEME:
    errors.append("ball background does not use pressed alpha resolver")
if "createTransparentPressedStateDrawable(pressedColor" not in THEME:
    errors.append("flat button does not use pressed-state helper")
if "createPressedStateDrawable(bgColor, pressedColor" not in THEME:
    errors.append("solid button does not use pressed-state helper")
if "StateListDrawable" not in MAIN or "createMainPanelRippleBackground" not in MAIN:
    errors.append("main panel card background is not protected by StateListDrawable")

argb = re.search(r"function _th_argb\(c\) \{.*?\n\}", THEME, re.S)
if not argb:
    errors.append("_th_argb missing")
else:
    block = argb.group(0)
    for token in ("Color.alpha", "Color.red", "Color.green", "Color.blue"):
        if token in block:
            errors.append("unsafe overloaded color channel call remains in _th_argb: %s" % token)

if module_version(BASE, "th_01_base.js") < (1, 1, 11):
    errors.append("th_01_base.js version below pressed feedback baseline 1.1.11")
if module_version(THEME, "th_04_theme.js") < (1, 0, 6):
    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.6")
if module_version(MAIN, "th_15_main_panel.js") < (1, 5, 7):
    errors.append("th_15_main_panel.js version below ColorOS safety baseline 1.5.7")

if errors:
    for item in errors:
        print("FAIL", item)
    raise SystemExit(1)

print("OK coloros_rhino_color_safety framework_ripple=0 safe_helpers=8")
