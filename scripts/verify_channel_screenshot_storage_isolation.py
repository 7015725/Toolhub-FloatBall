#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")
POINTER = (ROOT / "code/th_17_pointer.js").read_text(encoding="utf-8")
PICKWORD = (ROOT / "code/th_20_pickword.js").read_text(encoding="utf-8")
VIEWER = (ROOT / "code/th_22_image_viewer.js").read_text(encoding="utf-8")


def require(value, message):
    if not value:
        raise SystemExit("FAIL channel-screenshot-storage-isolation: " + message)


require('stable: { id: "stable", label: "正式版 Stable", branch: "main", rootName: "ToolHub" }' in ENTRY, "Stable root specification missing")
require('beta: { id: "beta", label: "测试版 Beta", branch: "beta", rootName: "ToolHub-Beta" }' in ENTRY, "Beta root specification missing")
require('APP_ROOT_DIR' in POINTER and 'new java.io.File(root, "screenshots")' in POINTER, "pointer screenshot output is not channel scoped")
require('APP_ROOT_DIR' in PICKWORD and '"screenshots"' in PICKWORD, "pickword metadata boundary is not channel scoped")
require('function appRoot22()' in VIEWER, "image service channel root helper missing")
for marker in ('new java.io.File(base, "screenshots")', 'new java.io.File(base, "cache/shell_bridge")', 'new java.io.File(base, "cache/screenshot_thumbnails")'):
    require(marker in VIEWER, "missing channel path: " + marker)
for text, label in ((POINTER, "pointer"), (PICKWORD, "pickword"), (VIEWER, "viewer")):
    for forbidden in ("ToolHub/screenshots", "ToolHub/cache/shell_bridge", "ToolHub/cache/screenshot_thumbnails"):
        require(forbidden not in text, "%s retains Stable hardcoded path %s" % (label, forbidden))
require('/storage/emulated/0/Pictures/ToolHub' in VIEWER or '/storage/emulated/0/Pictures/ToolHub' in (ROOT / "code/th_01_base.js").read_text(encoding="utf-8"), "public export directory contract changed unexpectedly")
print("OK channel_screenshot_storage_isolation stable=ToolHub beta=ToolHub-Beta internal=isolated public=shared")
