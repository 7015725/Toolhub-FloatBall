#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
REPORT = ROOT / "RHINO_COLOR_API_MIGRATION_REPORT.txt"
THEME_PATH = CODE / "th_04_theme.js"
BRIDGE_BEGIN = "// =======================【Rhino / ColorOS 安全颜色桥】======================="
BRIDGE_END = "// =======================【工具：UI样式辅助】======================"

errors = []
theme = THEME_PATH.read_text(encoding="utf-8")
start = theme.find(BRIDGE_BEGIN)
end = theme.find(BRIDGE_END)
if start < 0 or end <= start:
    errors.append("central safe color bridge missing")
    bridge = ""
    theme_without_bridge = theme
else:
    bridge = theme[start:end]
    theme_without_bridge = theme[:start] + theme[end:]

helpers = (
    "toolhubJavaClassName",
    "toolhubIsColorStateList",
    "toolhubColorInt",
    "toolhubJintArray",
    "toolhubJint2Array",
    "toolhubSafeColorStateList",
    "toolhubSafeColorStateListFromStates",
    "toolhubSafeSetTextColor",
    "toolhubSafeSetHintTextColor",
    "toolhubSafeSetLinkTextColor",
    "toolhubSafeSetHighlightColor",
    "toolhubSafeSetBackgroundColor",
    "toolhubSafeSetGradientColor",
    "toolhubSafeSetGradientStroke",
    "toolhubSafeSetTintColor",
    "toolhubSafeSetPaintColor",
    "toolhubSafeSetColor",
    "toolhubSafeSetStroke",
    "toolhubSafeApplyColorStateList",
    "toolhubSafeSetColorFilter",
    "toolhubSafeApplyColorFilter",
    "toolhubSafeSetShadowLayer",
)
for helper in helpers:
    if "function %s(" % helper not in bridge:
        errors.append("missing helper: " + helper)

for required in (
    "if (toolhubIsColorStateList(colorValue)) return colorValue;",
    "paintObj.setARGB(",
    "drawableObj.setTintList(toolhubSafeColorStateList(colorValue));",
    "targetObj.setColor(java.lang.Integer.valueOf(",
):
    if required not in bridge:
        errors.append("safe bridge contract missing: " + required)

for forbidden in (
    "targetObj.setColor(color);",
    "paintObj.setColor(",
    "Color.alpha(",
    "Color.red(",
    "Color.green(",
    "Color.blue(",
):
    if forbidden in bridge:
        errors.append("unsafe bridge fallback remains: " + forbidden)

for path in sorted(CODE.glob("*.js")):
    text = theme_without_bridge if path == THEME_PATH else path.read_text(encoding="utf-8")

    methods = sorted(set(re.findall(
        r"\.((?:set|apply)[A-Za-z0-9_$]*Color[A-Za-z0-9_$]*)\s*\(",
        text,
    )))
    if methods:
        errors.append("%s direct color methods: %s" % (path.name, ", ".join(methods)))

    tint_lists = sorted(set(re.findall(
        r"\.((?:set|apply)[A-Za-z0-9_$]*TintList)\s*\(",
        text,
    )))
    if tint_lists:
        errors.append("%s direct tint-list methods: %s" % (path.name, ", ".join(tint_lists)))

    for token in (
        ".setTint(",
        ".setStroke(",
        ".setShadowLayer(",
        "new android.content.res.ColorStateList(",
        "new Packages.android.content.res.ColorStateList(",
        "new ColorStateList(",
        "ColorStateList.valueOf(",
        ".addState([",
        "Color.alpha(",
        "Color.red(",
        "Color.green(",
        "Color.blue(",
    ):
        if token in text:
            errors.append("%s direct token: %s" % (path.name, token))

if errors:
    lines = ["FAIL %s" % error for error in errors]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    for line in lines:
        print(line)
    print("DIAGNOSTIC rhino_color_api_safety errors=%d report=%s" % (len(errors), REPORT.name))
else:
    if REPORT.exists():
        REPORT.unlink()
    print(
        "OK rhino_color_api_safety modules=%d helpers=%d direct_color_calls=0"
        % (len(list(CODE.glob("*.js"))), len(helpers))
    )
