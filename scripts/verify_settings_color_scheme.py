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

REQUIRED_ALIASES = [
    "bg", "bg2", "leaf", "card", "card2", "cream", "text", "sub",
    "brown", "primaryDeep", "primarySoft", "dangerSoft", "stroke",
]

REMOVED_KEYS = [
    "SETTINGS_THEME",
    "THEME_MODE",
    "THEME_ACCENT_LIGHT",
    "THEME_ACCENT_DARK",
    "THEME_DAY_BG_HEX",
    "THEME_DAY_TEXT_HEX",
    "THEME_NIGHT_BG_HEX",
    "THEME_NIGHT_TEXT_HEX",
]

errors = []
scheme_src = (ROOT / "code/th_12_rebuild.js").read_text(encoding="utf-8")
base = (ROOT / "code/th_01_base.js").read_text(encoding="utf-8")
theme = (ROOT / "code/th_04_theme.js").read_text(encoding="utf-8")
persistence = (ROOT / "code/th_05_persistence.js").read_text(encoding="utf-8")
panels = (ROOT / "code/th_14_panels.js").read_text(encoding="utf-8")

if "proto.getSettingsColorScheme" not in scheme_src:
    errors.append("统一配色 Scheme 未定义")

for key in REQUIRED_ALIASES:
    if not re.search(r"(?m)^\s*%s\s*:" % re.escape(key), scheme_src):
        errors.append("缺少兼容别名：" + key)

scheme_calls = 0
for rel in TARGETS:
    text = (ROOT / rel).read_text(encoding="utf-8")
    count = text.count("getSettingsColorScheme")
    if count <= 0:
        errors.append("未使用统一 Scheme：" + rel)
    scheme_calls += count

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

for key in REMOVED_KEYS:
    if re.search(r"(?m)^\s*%s\s*:" % re.escape(key), base):
        errors.append("旧主题配置仍在 Validator/defaultSettings：" + key)
    if re.search(r'\{\s*key:\s*"%s"' % re.escape(key), base):
        errors.append("旧主题配置仍在默认 Schema：" + key)

for key in REMOVED_KEYS:
    for rel in (
        "code/th_04_theme.js",
        "code/th_05_persistence.js",
        "code/th_13_panel_ui.js",
        "code/th_14_panels.js",
        "code/th_15_extra.js",
    ):
        if key in (ROOT / rel).read_text(encoding="utf-8"):
            errors.append("旧主题运行时引用仍存在：%s -> %s" % (rel, key))

if "deprecatedThemeSchemaKeys" not in base:
    errors.append("旧 schema.json 自动重置迁移缺失")

if "this.config.THEME_MODE" in theme:
    errors.append("isDarkTheme 仍读取手动主题模式")

if "scheme=system-monet" not in theme:
    errors.append("面板背景未切换到统一系统动态配色")

if 'return String(k || "") === "PANEL_BG_ALPHA";' not in persistence:
    errors.append("外观即时生效键未收敛为 PANEL_BG_ALPHA")

if 'title: "外观", desc: "系统动态配色与背景透明度"' not in panels:
    errors.append("外观分组文案未更新")

if errors:
    for item in errors:
        print("FAIL:", item)
    sys.exit(1)

print(
    "OK settings_color_scheme targets=%d calls=%d aliases=%d legacy_runtime_removed=1"
    % (len(TARGETS), scheme_calls, len(REQUIRED_ALIASES))
)
