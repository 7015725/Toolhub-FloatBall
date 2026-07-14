#!/usr/bin/env python3
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
THEME_PATH = CODE / "th_04_theme.js"
BRIDGE_BEGIN = "// =======================【Rhino / ColorOS 安全颜色桥】======================="
BRIDGE_END = "// =======================【工具：UI样式辅助】======================"
MODULE_FILE = os.environ.get("MODULE_FILE", "").strip()

NON_CODE = re.compile(
    r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|//[^\n]*|/\*.*?\*/',
    re.S,
)


def executable_text(source):
    def blank(match):
        value = match.group(0)
        return "".join("\n" if char == "\n" else " " for char in value)
    return NON_CODE.sub(blank, source)


errors = []
theme = THEME_PATH.read_text(encoding="utf-8")
start = theme.find(BRIDGE_BEGIN)
end = theme.find(BRIDGE_END)
if start < 0 or end <= start:
    errors.append("central safe color bridge missing")
    theme_without_bridge = theme
else:
    theme_without_bridge = theme[:start] + theme[end:]

helpers = (
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
    if "function %s(" % helper not in theme:
        errors.append("missing helper: " + helper)

paths = sorted(CODE.glob("*.js"))
if MODULE_FILE:
    paths = [CODE / MODULE_FILE]
    if not paths[0].exists():
        errors.append("module missing: " + MODULE_FILE)

forbidden_tokens = (
    ".setTextColor(",
    ".setHintTextColor(",
    ".setLinkTextColor(",
    ".setHighlightColor(",
    ".setBackgroundColor(",
    ".setColor(",
    ".setColorFilter(",
    ".setTint(",
    ".setStroke(",
    ".setShadowLayer(",
    "new android.content.res.ColorStateList(",
    "new Packages.android.content.res.ColorStateList(",
    "ColorStateList.valueOf(",
    ".addState([",
)

for path in paths:
    source = theme_without_bridge if path == THEME_PATH else path.read_text(encoding="utf-8")
    text = executable_text(source)
    for token in forbidden_tokens:
        if token in text:
            errors.append("%s direct token: %s" % (path.name, token))

    tint_methods = sorted(set(re.findall(
        r"\.([A-Za-z_$][A-Za-z0-9_$]*TintList)\s*\(",
        text,
    )))
    if tint_methods:
        errors.append("%s direct tint-list methods: %s" % (
            path.name,
            ", ".join(tint_methods),
        ))

if errors:
    for error in errors:
        print("FAIL", error)
    raise SystemExit(1)

print(
    "OK rhino_color_api_safety modules=%d helpers=%d direct_color_calls=0"
    % (len(paths), len(helpers))
)
