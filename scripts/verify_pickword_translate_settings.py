#!/usr/bin/env python3
"""Verify pickword translation settings, SQLite persistence, secret masking and runtime auth boundaries."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = (ROOT / "code" / "th_01_base.js").read_text(encoding="utf-8")
STORE = (ROOT / "code" / "th_02_core.js").read_text(encoding="utf-8")
UI = (ROOT / "code" / "th_13_panel_ui.js").read_text(encoding="utf-8")
PANELS = (ROOT / "code" / "th_14_panels.js").read_text(encoding="utf-8")
PICKWORD = (ROOT / "code" / "th_20_pickword.js").read_text(encoding="utf-8")

KEYS = [
    "PICKWORD_TRANSLATE_ENGINE",
    "PICKWORD_BAIDU_APP_ID",
    "PICKWORD_BAIDU_APP_SECRET",
    "PICKWORD_YOUDAO_APP_KEY",
    "PICKWORD_YOUDAO_APP_SECRET",
]


def main():
    errors = []
    for key in KEYS:
        if BASE.count(key) < 3:
            errors.append("config/schema key missing or incomplete: " + key)
    required_base = [
        'PICKWORD_TRANSLATE_ENGINE: { type: "enum", values: ["baidu", "youdao"], default: "baidu" }',
        'type: "pickword_translate_settings"',
        'type: "hidden"',
        'PICKWORD_TRANSLATE_ENGINE: "baidu"',
    ]
    for marker in required_base:
        if marker not in BASE:
            errors.append("base marker missing: " + marker)
    required_store = [
        "CREATE TABLE IF NOT EXISTS toolhub_settings",
        "INSERT INTO toolhub_settings(setting_key,value_type,value_integer,value_real,value_text,updated_at)",
        "for (var k in settings)",
    ]
    for marker in required_store:
        if marker not in STORE:
            errors.append("SQLite storage marker missing: " + marker)
    required_ui = [
        "createPickwordTranslateSettingsView",
        "new android.widget.RadioGroup",
        'setPendingValue("PICKWORD_TRANSLATE_ENGINE", nextEngine)',
        "baiduBox.setVisibility",
        "youdaoBox.setVisibility",
        "PasswordTransformationMethod.getInstance()",
        'toggle.setText(visible ? "隐藏" : "显示")',
        'PICKWORD_BAIDU_APP_SECRET',
        'PICKWORD_YOUDAO_APP_SECRET',
        'testPickwordTranslateConfiguration(snapshot',
        'testButton.setText("正在测试…")',
    ]
    for marker in required_ui:
        if marker not in UI:
            errors.append("settings UI marker missing: " + marker)
    if '{ key: "pickword", title: "拾字"' not in PANELS:
        errors.append("pickword settings group missing")
    required_runtime = [
        "getPickwordTranslateConfig20",
        'engine === "youdao"',
        "translateTextSync: function(text, authConfig)",
        "translateTextSyncWithRetry: function(text, authConfig)",
        "translateAuth",
        "testPickwordTranslateConfiguration",
        'var testText = "ToolHub 翻译测试"',
        "setInlineNotice",
        '"ok"',
        '"error"',
    ]
    for marker in required_runtime:
        if marker not in PICKWORD:
            errors.append("runtime marker missing: " + marker)
    forbidden = [
        "localVarOf$翻译引擎",
        "localVarOf$应用ID",
        "localVarOf$应用秘钥",
        "API_APP_ID",
        "API_APP_SECRET",
        "DIY_CONFIG.TRANSLATE_API",
    ]
    for marker in forbidden:
        if marker in PICKWORD:
            errors.append("legacy translate marker remains: " + marker)
    secret_log_patterns = [
        r"safeLog\([^\n]*(PICKWORD_BAIDU_APP_SECRET|PICKWORD_YOUDAO_APP_SECRET)",
        r"setInlineNotice\([^\n]*(\.secret|APP_SECRET)",
        r"showToast\([^\n]*(\.secret|APP_SECRET)",
    ]
    combined = UI + "\n" + PICKWORD
    for pattern in secret_log_patterns:
        if re.search(pattern, combined):
            errors.append("secret exposure pattern found: " + pattern)
    if errors:
        for error in errors:
            print("FAIL: " + error)
        return 1
    print("OK pickword_translate_settings keys=5 engines=2 sqlite=structured secrets=masked legacy_locals=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
