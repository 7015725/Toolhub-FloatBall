#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES_FROM_MAIN = [
    ".github/workflows/sign-toolhub.yml",
    ".github/workflows/verify.yml",
    "code/th_17_pointer.js",
    "code/th_20_pickword.js",
    "code/th_22_image_viewer.js",
    "constraints/API_USAGE_BASELINE.json",
    "docs/ARCHITECTURE.md",
    "docs/SQLITE_STORAGE.md",
    "scripts/verify_channel_screenshot_storage_isolation.py",
    "scripts/verify_pickword_emoji_grapheme.py",
    "scripts/verify_pickword_image_meta_handoff.py",
    "scripts/verify_pickword_image_viewer.py",
    "scripts/verify_pickword_long_click_api34.py",
    "scripts/verify_pickword_unified_cleanup.py",
    "scripts/verify_pointer_regressions.py",
    "scripts/verify_screenshot_manager.py",
]


def main():
    subprocess.check_call(["git", "fetch", "--no-tags", "origin", "main"], cwd=str(ROOT))
    subprocess.check_call(["git", "checkout", "origin/main", "--"] + FILES_FROM_MAIN, cwd=str(ROOT))

    record_path = ROOT / "updates/records/20260721-beta-fix-channel-screenshot-storage-isolation.json"
    if record_path.exists():
        raise SystemExit("Beta screenshot isolation record already exists")
    record = {
        "schema": 1,
        "id": "20260721-beta-fix-channel-screenshot-storage-isolation",
        "type": "fix",
        "title": "Beta 修复截图数据通道隔离",
        "details": [
            "Beta 内部截图创建、扫描和拾字路径校验统一使用 ToolHub-Beta 根目录",
            "Beta Shell 桥结果与截图缩略图缓存写入 ToolHub-Beta 私有缓存目录",
            "公共相册目录保持共享，但 Beta 截图管理记录继续使用独立 SQLite"
        ],
        "manifestVersion": 0
    }
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    Path(__file__).unlink()
    print("Synced channel screenshot storage isolation fix from main to Beta")


if __name__ == "__main__":
    main()
