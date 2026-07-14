#!/usr/bin/env python3
"""Verify ToolHub settings schema stays aligned with ConfigValidator.

The ShortX runtime is Rhino ES5, so this script intentionally does text-level
checks against the source file instead of executing the Android/Rhino code.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "code" / "th_01_base.js"
PERSISTENCE = ROOT / "code" / "th_05_persistence.js"
REBUILD = ROOT / "code" / "th_12_rebuild.js"
EXTRA = ROOT / "code" / "th_15_extra.js"

EXPECTED = {
    "BALL_SIZE_DP": {"type": "int", "name": "悬浮球大小", "min": 20, "max": 200},
    "BALL_PANEL_GAP_DP": {"type": "int", "name": "球与面板距离", "min": 0, "max": 50},
    "BALL_ICON_TYPE": {"type": "single_choice", "validator_type": "enum", "name": "悬浮球图标来源", "labels": ["应用图标", "本地文件", "内置图标库"]},
    "BALL_ICON_RES_NAME": {"type": "ball_shortx_icon", "validator_type": "string", "name": "内置图标"},
    "BALL_ICON_TINT_HEX": {"type": "ball_color", "validator_type": "string", "name": "图标颜色"},
    "BALL_ICON_SIZE_DP": {"type": "int", "name": "图标大小", "min": 12, "max": 80},
    "PANEL_WIDTH_PERCENT": {"type": "int", "name": "主面板宽度占比(%)", "min": 35, "max": 100},
    "PANEL_AUTO_MAX_COLS": {"type": "int", "name": "自动最大列数", "min": 1, "max": 10},
    "PANEL_MIN_CARD_WIDTH_DP": {"type": "int", "name": "按钮最小宽度(dp)", "min": 48, "max": 200},
    "PANEL_CARD_HEIGHT_DP": {"type": "int", "name": "按钮高度(dp)", "min": 48, "max": 160},
    "PANEL_ROWS": {"type": "int", "name": "面板可视行数", "min": 1, "max": 10},
    "PANEL_GAP_DP": {"type": "int", "name": "按钮间距(dp)", "min": 4, "max": 24},
    "PANEL_PADDING_DP": {"type": "int", "name": "面板内边距(dp)", "min": 8, "max": 32},
    "PANEL_ICON_SIZE_DP": {"type": "int", "name": "面板图标大小(dp)", "min": 16, "max": 64},
    "EDGE_VISIBLE_RATIO": {"type": "float", "name": "吸边露出比例", "min": 0.30, "max": 1.00},
    "CLICK_SLOP_DP": {"type": "int", "name": "点击位移阈值(dp)", "min": 2, "max": 20},
    "BALL_POSITION_SIDE": {"type": "single_choice", "validator_type": "enum", "name": "停靠边缘", "labels": ["左侧", "右侧"]},
    "BALL_POSITION_PERCENT": {"type": "int", "name": "高度位置(%)", "min": 0, "max": 100},
}

REMOVED_SETTINGS_KEYS = [
    "PANEL_POS_GRAVITY",
    "PANEL_CUSTOM_OFFSET_Y",
    "SAVE_THROTTLE_MS",
    "PANEL_COLS",
    "PANEL_ITEM_SIZE_DP",
]

REMOVED_THEME_KEYS = [
    "SETTINGS_THEME",
    "THEME_MODE",
    "THEME_ACCENT_LIGHT",
    "THEME_ACCENT_DARK",
    "THEME_DAY_BG_HEX",
    "THEME_DAY_TEXT_HEX",
    "THEME_NIGHT_BG_HEX",
    "THEME_NIGHT_TEXT_HEX",
]

LEGACY_TEXT = [
    "气球",
    "小屋",
    "伙伴",
    "岛屿",
    "蓝图",
    "岛务",
    "趣味元素",
    "更新子模块",
    "启动检查失败：",
    "启动更新失败：",
    "安全状态",
]


def fail(msg):
    print("FAIL: " + msg)
    return 1


def find_schema_item(src, key):
    pat = re.compile(r"\{\s*key:\s*\"" + re.escape(key) + r"\"(?P<body>.*?)\n\s*\}\s*,?", re.S)
    m = pat.search(src)
    return m.group(0) if m else ""


def find_validator_item(src, key):
    pat = re.compile(r"\b" + re.escape(key) + r"\s*:\s*\{(?P<body>.*?)\}\s*,", re.S)
    m = pat.search(src)
    return "{" + m.group("body") + "}" if m else ""


def get_str(block, field):
    m = re.search(r"\b" + re.escape(field) + r"\s*:\s*\"([^\"]*)\"", block)
    return m.group(1) if m else None


def get_num(block, field):
    m = re.search(r"\b" + re.escape(field) + r"\s*:\s*(-?\d+(?:\.\d+)?)", block)
    return float(m.group(1)) if m else None


def main():
    src = BASE.read_text(encoding="utf-8")
    persistence = PERSISTENCE.read_text(encoding="utf-8")
    rebuild = REBUILD.read_text(encoding="utf-8")
    extra = EXTRA.read_text(encoding="utf-8")
    errors = []
    active_config_src = re.sub(
        r"var DEPRECATED_THEME_CONFIG_KEYS = \{.*?\};",
        "",
        src,
        flags=re.S,
    )
    active_config_src = re.sub(
        r"var REMOVED_SETTINGS_CONFIG_KEYS = \{.*?\};",
        "",
        active_config_src,
        flags=re.S,
    )
    for removed_key in REMOVED_SETTINGS_KEYS:
        if re.search(r"(?m)^\s*%s\s*:" % re.escape(removed_key), active_config_src):
            errors.append("removed setting validator/default remains: " + removed_key)
        if re.search(r'\{\s*key:\s*"%s"' % re.escape(removed_key), src):
            errors.append("removed setting schema remains: " + removed_key)
        if removed_key in persistence:
            errors.append("removed setting effect remains: " + removed_key)
        if removed_key not in src:
            errors.append("removed setting cleanup marker missing: " + removed_key)
    for removed_key in REMOVED_THEME_KEYS:
        if re.search(r"(?m)^\s*%s\s*:" % re.escape(removed_key), active_config_src):
            errors.append("removed theme validator/default remains: " + removed_key)
        if re.search(r'\{\s*key:\s*"%s"' % re.escape(removed_key), src):
            errors.append("removed theme schema remains: " + removed_key)
    for key, exp in EXPECTED.items():
        schema = find_schema_item(src, key)
        validator = find_validator_item(src, key)
        if not schema:
            errors.append(key + ": schema item missing")
            continue
        if not validator:
            errors.append(key + ": validator item missing")
            continue
        if get_str(schema, "name") != exp.get("name"):
            errors.append(key + ": schema name mismatch")
        if get_str(schema, "type") != exp.get("type"):
            errors.append(key + ": schema type mismatch")
        vtype = exp.get("validator_type", exp.get("type"))
        if get_str(validator, "type") != vtype:
            errors.append(key + ": validator type mismatch")
        for f in ("min", "max"):
            if f in exp:
                sv = get_num(schema, f)
                vv = get_num(validator, f)
                ev = float(exp[f])
                if sv != ev:
                    errors.append(key + ": schema " + f + " mismatch")
                if vv != ev:
                    errors.append(key + ": validator " + f + " mismatch")
        for label in exp.get("labels", []):
            if label not in schema:
                errors.append(key + ": option label missing " + label)
        for value in exp.get("options", []):
            if ("value: " + str(value)) not in schema:
                errors.append(key + ": option value missing " + str(value))
    for text in LEGACY_TEXT:
        if text in src:
            errors.append("legacy wording remains: " + text)
    required_persistence = [
        "function normalizeToolHubEnumValueBySchema(key, value)",
        "this.state.pendingUserCfg[k] = normalizeToolHubEnumValueBySchema(k, v)",
        "FloatBallAppWM.prototype.isThemeEffectKey = function(k)",
        "FloatBallAppWM.prototype.isPanelLayoutEffectKey = function(k)",
        "FloatBallAppWM.prototype.isPointerEffectKey = function(k)",
        "FloatBallAppWM.prototype.isBallVisualEffectKey = function(k)",
        "FloatBallAppWM.prototype.refreshPointerAfterSettingsChanged = function()",
        "FloatBallAppWM.prototype.refreshVisiblePanelsAfterSettingsChanged = function(reason)",
        "FloatBallAppWM.prototype.scheduleSettingsEffectRefresh = function(reason, themeChanged, panelChanged)",
        "this.isBallPositionEffectKey && this.isBallPositionEffectKey(key)",
        "this.scheduleConfiguredBallPositionApply(\"settings:\" + key, true)",
        "this.refreshPointerAfterSettingsChanged()",
        "this.scheduleSettingsEffectRefresh(key, themeChanged, panelChanged)",
        "BALL_IDLE_ALPHA",
    ]
    for marker in required_persistence:
        if marker not in persistence:
            errors.append("settings effect marker missing: " + marker)

    required_rebuild = [
        "ConfigValidator.validate = function(key, value)",
        "normalizeToolHubEnumValueBySchema(key, value)",
        "ConfigValidator.__toolHubEnumNormalizePatchInstalled = true",
    ]
    for marker in required_rebuild:
        if marker not in rebuild:
            errors.append("enum validator marker missing: " + marker)

    forbidden = {
        "th_12_rebuild.js": [
            "proto.setPendingValue = function(k, v)",
            "proto.applyImmediateEffectsForKey = function(k)",
            "__toolHubSetPendingValuePatched",
            "__toolHubApplyImmediateEffectsPatched",
            "__toolHubSettingsEffectPatchInstalled",
            "installSettingsEffectPatch()",
        ],
        "th_15_extra.js": [
            "proto.applyImmediateEffectsForKey = function(k)",
            "install fixed ball position patch fail",
        ],
    }
    for name, markers in forbidden.items():
        body = rebuild if name == "th_12_rebuild.js" else extra
        for marker in markers:
            if marker in body:
                errors.append(name + ": stale wrapper remains " + marker)

    combined = persistence + "\n" + rebuild + "\n" + extra
    pending_defs = len(re.findall(r"(?:FloatBallAppWM\.prototype|proto)\.setPendingValue\s*=\s*function\s*\(", combined))
    apply_defs = len(re.findall(r"(?:FloatBallAppWM\.prototype|proto)\.applyImmediateEffectsForKey\s*=\s*function\s*\(", combined))
    if pending_defs != 1:
        errors.append("setPendingValue definition count=" + str(pending_defs))
    if apply_defs != 1:
        errors.append("applyImmediateEffectsForKey definition count=" + str(apply_defs))
    if errors:
        for e in errors:
            print("FAIL: " + e)
        return 1
    print("schema_validator_ok keys=" + str(len(EXPECTED)) + " settings_effects=1")
    return 0

if __name__ == "__main__":
    sys.exit(main())
