#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = (ROOT / "code/th_01_base.js").read_text(encoding="utf-8")
CORE = (ROOT / "code/th_02_core.js").read_text(encoding="utf-8")
THEME = (ROOT / "code/th_04_theme.js").read_text(encoding="utf-8")
SCHEME = (ROOT / "code/th_12_rebuild.js").read_text(encoding="utf-8")

KEYS = [
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

active_base = re.sub(
    r"var DEPRECATED_THEME_CONFIG_KEYS = \{.*?\};",
    "",
    BASE,
    flags=re.S,
)

for key in KEYS:
    if not re.search(
        r"(?m)^\s*%s:\s*true"
        % re.escape(key),
        BASE,
    ):
        errors.append("迁移识别表缺少：" + key)

    if re.search(
        r"(?m)^\s*%s\s*:\s*\{\s*type"
        % re.escape(key),
        active_base,
    ):
        errors.append("废弃键仍在 ConfigValidator：" + key)

    if re.search(
        r'\{\s*key:\s*"%s"'
        % re.escape(key),
        BASE,
    ):
        errors.append("废弃键仍在默认 Schema：" + key)

required_base = [
    "function isDeprecatedThemeConfigKey(key)",
    "function stripDeprecatedThemeSchemaItems(value)",
    "if (isDeprecatedThemeConfigKey(k)) continue;",
    "var deprecatedSchemaCleanup = stripDeprecatedThemeSchemaItems(s);",
]
for marker in required_base:
    if marker not in BASE:
        errors.append("配置过滤标记缺失：" + marker)

required_core = [
    "deprecatedThemeCleanupVersion: 1",
    "cleanupDeprecatedThemeData: function(db)",
    '"toolhub_settings"',
    '"setting_key=?"',
    '"deprecated_theme_cleanup_version"',
    '"deprecated_theme_cleanup_at"',
]
for marker in required_core:
    if marker not in CORE:
        errors.append("SQLite 清理标记缺失：" + marker)

if CORE.count(
    "if (!this.cleanupDeprecatedThemeData(db)) return false;"
) < 2:
    errors.append("SQLite 清理未覆盖现有数据库和首次迁移路径")

# 这两个方法已经确认无运行时调用，必须删除。
for stale in (
    "FloatBallAppWM.prototype.safeParseColor = function",
    "FloatBallAppWM.prototype.getPanelBgColorInt = function",
    "var themeBgInt = 0",
    "var themeTextInt = 0",
):
    if stale in THEME:
        errors.append("旧取色兼容代码仍存在：" + stale)

# getPanelTextColorInt 仍是 updatePanelBackground 的无 Scheme 回退，
# 不能作为死代码删除；同时要求定义和调用都存在。
text_fallback_definition = (
    "FloatBallAppWM.prototype.getPanelTextColorInt = function"
)
if text_fallback_definition not in THEME:
    errors.append("文字色回退方法被误删：getPanelTextColorInt")

text_fallback_calls = len(
    re.findall(r"\.getPanelTextColorInt\s*\(", THEME)
)
if text_fallback_calls <= 0:
    errors.append("getPanelTextColorInt 已无调用，应重新审查后再删除")

for alias in (
    "bg", "bg2", "leaf", "card", "card2", "cream", "text", "sub",
    "brown", "primaryDeep", "primarySoft", "dangerSoft", "stroke",
):
    if re.search(
        r"(?m)^\s*%s\s*:"
        % re.escape(alias),
        SCHEME,
    ):
        errors.append("Scheme 兼容别名仍存在：" + alias)

if errors:
    for item in errors:
        print("FAIL:", item)
    sys.exit(1)

print(
    "OK legacy_theme_cleanup keys=%d sqlite_cleanup=1 "
    "schema_filter=1 aliases_removed=1 text_fallback_calls=%d"
    % (len(KEYS), text_fallback_calls)
)
