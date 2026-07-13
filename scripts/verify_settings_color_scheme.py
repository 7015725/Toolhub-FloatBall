#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

TARGETS = [
    "code/th_13_panel_ui.js",
    "code/th_14_panels.js",
    "code/th_14_button_editor.js",
    "code/th_14_button_icon_editor.js",
    "code/th_14_color_picker.js",
    "code/th_14_icon_picker.js",
    "code/th_14_schema_editor.js",
    "code/th_15_extra.js",
]

REQUIRED_FIELDS = [
    "background", "onBackground", "surface", "onSurface", "surface2",
    "onSurface2", "primary", "onPrimary", "primaryContainer",
    "onPrimaryContainer", "outline", "outlineVariant", "secondary",
    "tertiary", "success", "warning", "danger", "onDanger",
    "dangerContainer", "onDangerContainer",
]

REMOVED_ALIASES = [
    "bg", "bg2", "leaf", "card", "card2", "cream", "text", "sub",
    "brown", "primaryDeep", "primarySoft", "dangerSoft", "stroke",
]

errors = []
scheme_src = (ROOT / "code/th_12_rebuild.js").read_text(encoding="utf-8")
theme = (ROOT / "code/th_04_theme.js").read_text(encoding="utf-8")
persistence = (ROOT / "code/th_05_persistence.js").read_text(encoding="utf-8")
panels = (ROOT / "code/th_14_panels.js").read_text(encoding="utf-8")

if "proto.getSettingsColorScheme" not in scheme_src:
    errors.append("统一配色 Scheme 未定义")

for key in REQUIRED_FIELDS:
    if not re.search(r"(?m)^\s*%s\s*:" % re.escape(key), scheme_src):
        errors.append("缺少语义字段：" + key)

for alias in REMOVED_ALIASES:
    if re.search(r"(?m)^\s*%s\s*:" % re.escape(alias), scheme_src):
        errors.append("兼容别名仍在 Scheme：" + alias)

assignment_pattern = re.compile(
    r"\b(?:var\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*="
    r"\s*[^;\n]*getSettingsColorScheme[^;\n]*;",
    re.M,
)

scheme_calls = 0
for rel in TARGETS:
    text = (ROOT / rel).read_text(encoding="utf-8")
    count = text.count("getSettingsColorScheme")
    if count <= 0:
        errors.append("未使用统一 Scheme：" + rel)
    scheme_calls += count

    names = set(assignment_pattern.findall(text))
    if not names:
        for line in text.splitlines():
            if "getSettingsColorScheme" not in line or "=" not in line:
                continue
            match = re.search(
                r"\b(?:var\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*=",
                line,
            )
            if match:
                names.add(match.group(1))

    if not names:
        errors.append("无法识别 Scheme 变量：" + rel)

    for name in names:
        for alias in REMOVED_ALIASES:
            if re.search(
                r"\b%s\.%s\b"
                % (re.escape(name), re.escape(alias)),
                text,
            ):
                errors.append(
                    "仍使用兼容字段：%s -> %s.%s"
                    % (rel, name, alias)
                )

combined_runtime = "\n".join(
    p.read_text(encoding="utf-8")
    for p in sorted((ROOT / "code").glob("th_*.js"))
)

for marker in (
    "getAnimalIslandTheme",
    "applySettingsTheme",
    "isSettingsMonetTheme",
):
    if marker in combined_runtime:
        errors.append("旧主题接口仍存在：" + marker)

if "this.config.THEME_MODE" in theme:
    errors.append("isDarkTheme 仍读取手动主题模式")

if "scheme=system-monet" not in theme:
    errors.append("面板背景未使用系统动态配色")

if 'return String(k || "") === "PANEL_BG_ALPHA";' not in persistence:
    errors.append("外观即时生效键不是 PANEL_BG_ALPHA")

if 'title: "外观", desc: "系统动态配色与背景透明度"' not in panels:
    errors.append("外观分组文案异常")

if errors:
    for item in errors:
        print("FAIL:", item)
    sys.exit(1)

print(
    "OK settings_color_scheme targets=%d calls=%d semantic_fields=%d aliases_removed=1"
    % (len(TARGETS), scheme_calls, len(REQUIRED_FIELDS))
)
