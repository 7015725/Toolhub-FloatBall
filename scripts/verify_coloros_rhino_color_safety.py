#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
THEME = (CODE / "th_04_theme.js").read_text(encoding="utf-8")
MAIN = (CODE / "th_15_main_panel.js").read_text(encoding="utf-8")
ALL_JS = "\n".join(p.read_text(encoding="utf-8") for p in sorted(CODE.glob("*.js")))

errors = []

for token in (
    "new android.graphics.drawable.RippleDrawable",
    "ColorStateList.valueOf(",
    "android.content.res.ColorStateList.valueOf(",
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

if not THEME.startswith("// @version 1.0.3"):
    errors.append("th_04_theme.js version not bumped to 1.0.3")
if not MAIN.startswith("// @version 1.5.6"):
    errors.append("th_15_main_panel.js version not bumped to 1.5.6")

if errors:
    for item in errors:
        print("FAIL", item)
    raise SystemExit(1)

print("OK coloros_rhino_color_safety framework_ripple=0 safe_helpers=8")
