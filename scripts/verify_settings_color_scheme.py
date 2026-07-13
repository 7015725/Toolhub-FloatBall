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

errors = []
theme = (ROOT / "code/th_12_rebuild.js").read_text(encoding="utf-8")

if "proto.getSettingsColorScheme" not in theme:
    errors.append("统一配色 Scheme 未定义")

if "// @version 1.2.0" not in theme:
    errors.append("th_12_rebuild.js 版本不是 1.2.0")

for key in REQUIRED_ALIASES:
    if not re.search(r"(?m)^\s*%s\s*:" % re.escape(key), theme):
        errors.append("缺少兼容别名：" + key)

scheme_calls = 0
for rel in TARGETS:
    text = (ROOT / rel).read_text(encoding="utf-8")
    if "getAnimalIslandTheme" in text:
        errors.append("仍有旧主题调用：" + rel)
    count = text.count("getSettingsColorScheme")
    if count <= 0:
        errors.append("未使用统一 Scheme：" + rel)
    scheme_calls += count

legacy_theme = (ROOT / "code/th_04_theme.js").read_text(encoding="utf-8")
if "FloatBallAppWM.prototype.getAnimalIslandTheme = function" not in legacy_theme:
    errors.append("旧主题兼容接口被提前删除")

persistence = (ROOT / "code/th_05_persistence.js").read_text(encoding="utf-8")
if "SETTINGS_THEME" not in persistence:
    errors.append("SETTINGS_THEME 配置被提前删除")

if errors:
    for item in errors:
        print("FAIL:", item)
    sys.exit(1)

print(
    "OK settings_color_scheme targets=%d calls=%d aliases=%d legacy_preserved=1"
    % (len(TARGETS), scheme_calls, len(REQUIRED_ALIASES))
)
