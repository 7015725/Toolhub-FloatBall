#!/usr/bin/env python3
"""Verify ToolHub update-and-version page integration contracts."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH03 = (ROOT / "code" / "th_03_icon.js").read_text(encoding="utf-8")
TH14 = (ROOT / "code" / "th_14_panels.js").read_text(encoding="utf-8")
BOUNDARIES = (ROOT / "MODULE_BOUNDARIES.json").read_text(encoding="utf-8")

checks = {
    "旧轮询自动重启已删除": "__toolHubWatchRestartAfterUpdate" not in TH03,
    "更新页路由存在": 'var UPDATE_ROUTE = "update"' in TH14,
    "历史缓存目录存在": 'root + "/cache"' in TH14,
    "入口更新阻止自动重启": "after.entryUpdateAvailable === true" in TH14,
    "确定性事务返回值判断": "numberValue(ret.count) <= 0" in TH14,
    "分页固定十条": "var HISTORY_PAGE_SIZE = 10" in TH14,
    "禁止 Rhino 不兼容 ScrollView.LayoutParams": "android.widget.ScrollView.LayoutParams" not in TH14,
    "ScrollView 子布局使用 FrameLayout.LayoutParams": "scroll.addView(root, new android.widget.FrameLayout.LayoutParams(-1, -2));" in TH14,
    "旧延期包装边界已删除": '"method": "startToolHubModuleUpdateFromSettings"' not in BOUNDARIES,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + ": " + name)
if failed:
    raise SystemExit("update version page verification failed: " + ", ".join(failed))
print("Update version page verification passed.")
