#!/usr/bin/env python3
"""Register shell action-first API usage rule in constraints/api.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_PATH = ROOT / "constraints" / "api.json"

rule = {
    "id": "api-shell-action-first",
    "usageKeys": ["shortx|method|shortx#executeAction"],
    "source": "shortx",
    "classOrObject": "ShortX ScriptShortXApi executeAction",
    "method": "executeAction",
    "classification": "guarded",
    "scope": ["code/th_10_shell.js", "code/th_18_pointer_ocr.js"],
    "allowScopeExpansion": True,
    "minApi": 33,
    "guard": "Shell 按钮执行优先 shortx.executeAction(ShellCommand) 同步链；仅由用户点击的 Shell 按钮/拾字 root 兜底触发，system_server 不直接 Runtime.exec",
    "owner": "ToolHub Shell action-first runtime",
    "threadContract": "execShellSmart 在按钮点击调用线程同步执行；广播桥兜底保持原异步语义",
    "fallback": "Action 不可用或异常时回退旧广播桥（compat/explicit/strict 配置不变）",
    "reason": "登记 th_10_shell.js Action 优先路径对 shortx.executeAction 的复用，与 th_18_pointer_ocr.js 既有用法同源",
}

api = json.loads(API_PATH.read_text(encoding="utf-8"))
rules = api.get("rules") or []
if not any(r.get("id") == rule["id"] for r in rules):
    rules.append(rule)
api["rules"] = rules
API_PATH.write_text(json.dumps(api, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("OK api rule api-shell-action-first registered")
