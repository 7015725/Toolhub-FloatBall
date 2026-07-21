#!/usr/bin/env python3
"""Sync the reviewed post-channel-switch update discovery implementation from main into beta."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ".github/workflows/verify.yml",
    "code/th_14_panels.js",
    "constraints/API_USAGE_BASELINE.json",
    "constraints/api.json",
    "docs/audits/DEAD_CODE_AUDIT.md",
    "docs/audits/ENTRY_SYMBOL_AUDIT.md",
    "scripts/verify_update_version_page.py",
]

for rel in FILES:
    result = subprocess.run(
        ["git", "show", "origin/main:" + rel],
        cwd=str(ROOT), check=True, stdout=subprocess.PIPE
    )
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(result.stdout)

record = {
    "schema": 1,
    "id": "20260721-beta-channel-switch-update-discovery",
    "type": "fix",
    "title": "Beta 增强通道切换后的更新发现提示",
    "details": [
        "切换 Stable/Beta 完成后自动等待新通道启动并执行无缓存更新检查",
        "自动检查结果同步到更新页、设置首页摘要和红点，避免切换后误显示为最新",
        "检查失败或发现更新时给出明确提示，手动重新检查可刷新同一状态"
    ],
    "manifestVersion": 0
}
record_path = ROOT / "updates/records/20260721-beta-channel-switch-update-discovery.json"
record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
self_path = ROOT / "scripts/sync_beta_channel_switch_update_discovery_once.py"
if self_path.exists():
    self_path.unlink()
print("Synced channel switch update discovery implementation into beta")
