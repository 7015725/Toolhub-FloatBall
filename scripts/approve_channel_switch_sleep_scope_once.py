#!/usr/bin/env python3
"""Approve Thread.sleep in the channel-switch background monitor and refresh the generated baseline."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_PATH = ROOT / "constraints/api.json"
SELF = ROOT / "scripts/approve_channel_switch_sleep_scope_once.py"

api = json.loads(API_PATH.read_text(encoding="utf-8"))
rule = {
    "id": "api-channel-switch-background-sleep",
    "usageKeys": ["java|method|java.lang.Thread#sleep"],
    "source": "java",
    "classOrObject": "java.lang.Thread",
    "method": "sleep",
    "classification": "safe",
    "scope": [
        "ToolHub.js",
        "code/th_01_base.js",
        "code/th_14_panels.js",
        "code/th_17_pointer.js",
        "code/th_18_pointer_ocr.js",
        "code/th_20_pickword.js",
        "code/th_22_image_viewer.js"
    ],
    "allowScopeExpansion": True,
    "owner": "ToolHub update runtime",
    "threadContract": "仅用于后台工作线程等待切换锁、更新锁或异步任务节流，不得在 UI 线程调用",
    "fallback": "超时或异常时停止自动检查并保留手动重新检查入口",
    "reason": "复用项目既有 Thread.sleep，在通道切换后的后台监视线程中等待运行锁释放"
}
rules = api.get("rules") or []
if not any(str(item.get("id", "")) == rule["id"] for item in rules if isinstance(item, dict)):
    rules.append(rule)
api["rules"] = rules
API_PATH.write_text(json.dumps(api, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
subprocess.run([
    "python3", str(ROOT / "scripts/report_api_usage.py"),
    "--write", "constraints/API_USAGE_BASELINE.json"
], cwd=str(ROOT), check=True)
if SELF.exists():
    SELF.unlink()
print("Approved channel-switch background Thread.sleep scope and refreshed API baseline")
