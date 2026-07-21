#!/usr/bin/env python3
"""Sync the verified private-storage isolation files from main to Beta once."""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES_FROM_MAIN = [
    ".github/workflows/verify.yml",
    "code/th_04_theme.js",
    "code/th_13_panel_ui.js",
    "code/th_20_pickword.js",
    "constraints/API_USAGE_BASELINE.json",
    "docs/ARCHITECTURE.md",
    "scripts/verify_channel_private_storage_isolation.py",
    "scripts/verify_coloros_rhino_color_safety.py",
    "scripts/verify_pickword_emoji_grapheme.py",
    "scripts/verify_pickword_image_meta_handoff.py",
    "scripts/verify_pickword_image_viewer.py",
    "scripts/verify_pickword_long_click_api34.py",
    "scripts/verify_pickword_unified_cleanup.py",
]


def main():
    subprocess.check_call(["git", "fetch", "--no-tags", "origin", "main"], cwd=str(ROOT))
    subprocess.check_call(["git", "checkout", "origin/main", "--"] + FILES_FROM_MAIN, cwd=str(ROOT))

    record_path = ROOT / "updates/records/20260721-beta-fix-channel-private-storage-isolation.json"
    if record_path.exists():
        raise SystemExit("Beta private storage isolation record already exists")
    record = {
        "schema": 1,
        "id": "20260721-beta-fix-channel-private-storage-isolation",
        "type": "fix",
        "title": "Beta 隔离私有诊断与拾字状态",
        "details": [
            "Beta 颜色安全与设置交互诊断结果改为写入 ToolHub-Beta/diagnostics",
            "Beta 拾字号文件与 SharedPreferences 使用独立通道状态，不继承 Stable 字号",
            "Stable 旧字号迁移逻辑保留为只读复制，Beta 不读取旧公共状态",
        ],
        "manifestVersion": 0,
    }
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    workflow_path = ROOT / ".github/workflows/sign-toolhub.yml"
    workflow = workflow_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"\n      - name: Sync Beta channel private storage isolation\n.*?(?=\n      - name: Verify changed module versions\n)",
        re.S,
    )
    workflow, count = pattern.subn("", workflow)
    if count != 1:
        raise SystemExit("temporary Beta sync hook count=%d" % count)
    workflow_path.write_text(workflow, encoding="utf-8")

    Path(__file__).unlink()
    print("Synced Stable/Beta private storage isolation files from main to Beta")


if __name__ == "__main__":
    main()
