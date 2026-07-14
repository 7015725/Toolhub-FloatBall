#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
THEME_PATH = CODE / "th_04_theme.js"
BRIDGE_BEGIN = "// =======================【Rhino / ColorOS 安全颜色桥】======================="
BRIDGE_END = "// =======================【工具：UI样式辅助】======================"


def strip_js_comments_and_strings(text):
    result = []
    index = 0
    length = len(text)
    state = "code"
    quote = ""
    while index < length:
        ch = text[index]
        nxt = text[index + 1] if index + 1 < length else ""

        if state == "code":
            if ch == "/" and nxt == "/":
                result.extend((" ", " "))
                index += 2
                state = "line_comment"
                continue
            if ch == "/" and nxt == "*":
                result.extend((" ", " "))
                index += 2
                state = "block_comment"
                continue
            if ch in ('"', "'"):
                result.append(" ")
                quote = ch
                index += 1
                state = "string"
                continue
            result.append(ch)
            index += 1
            continue

        if state == "line_comment":
            if ch == "\n":
                result.append("\n")
                state = "code"
            else:
                result.append(" ")
            index += 1
            continue

        if state == "block_comment":
            if ch == "*" and nxt == "/":
                result.extend((" ", " "))
                index += 2
                state = "code"
            else:
                result.append("\n" if ch == "\n" else " ")
                index += 1
            continue

        if state == "string":
            if ch == "\\" and index + 1 < length:
                result.append(" ")
                result.append("\n" if nxt == "\n" else " ")
                index += 2
                continue
            if ch == quote:
                result.append(" ")
                index += 1
                state = "code"
                continue
            result.append("\n" if ch == "\n" else " ")
            index += 1

    return "".join(result)


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
    "java.lang.Class.forName("android.content.res.ColorStateList")",
    "states.length !== colors.length",
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

risky_methods = (
    "setTextColor",
    "setHintTextColor",
    "setLinkTextColor",
    "setHighlightColor",
    "setBackgroundColor",
    "setColor",
    "setTint",
    "setColorFilter",
    "setShadowLayer",
    "setStroke",
)
risky_pattern = re.compile(
    r"\.((?:%s))\s*\(" % "|".join(re.escape(name) for name in risky_methods)
)
tint_list_pattern = re.compile(r"\.((?:set|apply)[A-Za-z0-9_$]*TintList)\s*\(")

for path in sorted(CODE.glob("*.js")):
    raw = theme_without_bridge if path == THEME_PATH else path.read_text(encoding="utf-8")
    text = strip_js_comments_and_strings(raw)

    methods = sorted(set(risky_pattern.findall(text)))
    if methods:
        errors.append("%s direct color methods: %s" % (path.name, ", ".join(methods)))

    tint_lists = sorted(set(tint_list_pattern.findall(text)))
    if tint_lists:
        errors.append("%s direct tint-list methods: %s" % (path.name, ", ".join(tint_lists)))

    for token in (
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
    for error in errors:
        print("FAIL", error)
    raise SystemExit(1)

print(
    "OK rhino_color_api_safety modules=%d helpers=%d direct_color_calls=0"
    % (len(list(CODE.glob("*.js"))), len(helpers))
)
