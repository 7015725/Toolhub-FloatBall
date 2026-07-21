#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "code/th_14_panels.js",
    "scripts/verify_update_version_page.py",
]

for rel in FILES:
    data = subprocess.check_output(["git", "show", "origin/main:" + rel])
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)

record = {
    "schema": 1,
    "id": "20260721-beta-channel-switch-observability",
    "type": "optimize",
    "title": "Beta 补齐通道切换诊断日志",
    "details": [
        "同步 Stable 已验证的 TH_CHANNEL 结构化日志",
        "记录目标通道、实际通道、检查结果、更新数量、错误和耗时",
        "更新页显示最近一次切换后检查耗时",
        "保持 Beta 自己的 Manifest、RSA 签名和更新历史"
    ],
    "manifestVersion": 0
}
record_path = ROOT / "updates/records/20260721-beta-channel-switch-observability.json"
record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
Path(__file__).unlink()
print("OK beta channel switch observability synced")
