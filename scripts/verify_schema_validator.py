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

EXPECTED = {
    "THEME_MODE": {"type": "single_choice", "name": "主题模式", "options": [0, 1, 2], "validator_type": "enum"},
    "BALL_SIZE_DP": {"type": "int", "name": "悬浮球大小", "min": 20, "max": 200},
    "BALL_PANEL_GAP_DP": {"type": "int", "name": "球与面板距离", "min": 0, "max": 50},
    "BALL_ICON_TYPE": {"type": "single_choice", "validator_type": "enum", "name": "悬浮球图标来源", "labels": ["应用图标", "本地文件", "内置图标库"]},
    "BALL_ICON_RES_NAME": {"type": "ball_shortx_icon", "validator_type": "string", "name": "内置图标"},
    "BALL_ICON_TINT_HEX": {"type": "ball_color", "validator_type": "string", "name": "图标颜色"},
    "BALL_ICON_SIZE_DP": {"type": "int", "name": "图标大小", "min": 12, "max": 80},
    "PANEL_ROWS": {"type": "int", "name": "面板可视行数", "min": 1, "max": 10},
    "PANEL_GAP_DP": {"type": "int", "name": "按钮间距(dp)", "min": 4, "max": 24},
    "PANEL_PADDING_DP": {"type": "int", "name": "面板内边距(dp)", "min": 8, "max": 32},
    "PANEL_ICON_SIZE_DP": {"type": "int", "name": "面板图标大小(dp)", "min": 16, "max": 64},
    "EDGE_VISIBLE_RATIO": {"type": "float", "name": "吸边露出比例", "min": 0.30, "max": 1.00},
    "CLICK_SLOP_DP": {"type": "int", "name": "点击位移阈值(dp)", "min": 2, "max": 20},
    "LONG_PRESS_VIBRATE_MS": {"type": "int", "name": "长按震动时长(ms)", "min": 10, "max": 100},
}

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
    errors = []
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
    if errors:
        for e in errors:
            print("FAIL: " + e)
        return 1
    print("schema_validator_ok keys=" + str(len(EXPECTED)))
    return 0

if __name__ == "__main__":
    sys.exit(main())
