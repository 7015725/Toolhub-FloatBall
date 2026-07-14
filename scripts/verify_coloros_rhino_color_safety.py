#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
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
for token in ("createPressedStateDrawable", "createTransparentPressedStateDrawable"):
    if token not in THEME:
        errors.append("stable pressed-state helper missing: %s" % token)
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

if module_version(THEME, "th_04_theme.js") < (1, 0, 5):
    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.5")
if module_version(MAIN, "th_15_main_panel.js") < (1, 5, 7):
    errors.append("th_15_main_panel.js version below ColorOS safety baseline 1.5.7")

if errors:
    for item in errors:
        print("FAIL", item)
    raise SystemExit(1)

print("OK coloros_rhino_color_safety framework_ripple=0 safe_helpers=8")
