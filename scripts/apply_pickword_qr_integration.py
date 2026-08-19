#!/usr/bin/env python3
"""Idempotently wire the Beta QR module into ToolHub before signing."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
QR_MODULE = ROOT / "code" / "th_26_qr_runtime.js"
BOUNDARIES = ROOT / "constraints" / "MODULE_BOUNDARIES.json"
NEW_ENTRY_VERSION = 20260819231000


def patch_entry():
    text = ENTRY.read_text(encoding="utf-8")

    old_version = "var TOOLHUB_ENTRY_VERSION = 20260810005000;"
    new_version = "var TOOLHUB_ENTRY_VERSION = %d;" % NEW_ENTRY_VERSION
    if old_version in text:
        text = text.replace(old_version, new_version, 1)
    elif new_version not in text:
        raise SystemExit("unexpected TOOLHUB_ENTRY_VERSION; refusing broad replacement")

    old_tail = '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js", "th_23_screenshot_manager.js", "th_25_shortx_ui_package.js"]'
    new_tail = '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js", "th_26_qr_runtime.js", "th_23_screenshot_manager.js", "th_25_shortx_ui_package.js"]'
    if old_tail in text:
        text = text.replace(old_tail, new_tail, 1)
    elif new_tail not in text:
        raise SystemExit("Beta module tail not found; refusing broad module-list edit")

    if text.count('"th_26_qr_runtime.js"') != 1:
        raise SystemExit("th_26_qr_runtime.js must appear exactly once in ToolHub.js")
    if 'var TOOLHUB_STABLE_MODULES' not in text:
        raise SystemExit("stable module list missing")
    ENTRY.write_text(text, encoding="utf-8")


def patch_qr_wrapper():
    text = QR_MODULE.read_text(encoding="utf-8")
    old_call = "var controller = originalControllerFactory.call(appObj, opts);"
    new_call = "var controller = originalControllerFactory.call(this, opts);"
    if old_call in text:
        text = text.replace(old_call, new_call, 1)
    elif new_call not in text:
        raise SystemExit("QR controller wrapper call site not found")
    QR_MODULE.write_text(text, encoding="utf-8")


def qr_boundary_records():
    return [
        {
            "method": "createPickwordImageController",
            "definitions": ["th_22_image_viewer.js", "th_26_qr_runtime.js"],
            "effectiveOwner": "th_26_qr_runtime.js",
            "type": "wrapper",
            "reason": "Beta 拾字截图控制器叠加显式二维码解析入口与结果卡，不修改截图查看器内部实现",
            "wrappers": [
                {
                    "module": "th_26_qr_runtime.js",
                    "owner": "th_22_image_viewer.js",
                    "oldVariable": "originalControllerFactory"
                }
            ]
        },
        {
            "method": "hidePickwordWindow",
            "definitions": ["th_20_pickword.js", "th_26_qr_runtime.js"],
            "effectiveOwner": "th_26_qr_runtime.js",
            "type": "wrapper",
            "reason": "关闭拾字窗口前取消二维码 worker、timeout 与迟到结果 token",
            "wrappers": [
                {
                    "module": "th_26_qr_runtime.js",
                    "owner": "th_20_pickword.js",
                    "oldVariable": "originalHide"
                }
            ]
        },
        {
            "method": "disposePickwordModule",
            "definitions": ["th_20_pickword.js", "th_26_qr_runtime.js"],
            "effectiveOwner": "th_26_qr_runtime.js",
            "type": "wrapper",
            "reason": "释放拾字模块前取消二维码解析会话，不改变原拾字清理顺序",
            "wrappers": [
                {
                    "module": "th_26_qr_runtime.js",
                    "owner": "th_20_pickword.js",
                    "oldVariable": "originalDispose"
                }
            ]
        }
    ]


def patch_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    owners = data.get("directOwners") or {}
    for method in ("createPickwordImageController", "hidePickwordWindow", "disposePickwordModule"):
        owners.pop(method, None)
    data["directOwners"] = owners

    records = data.get("duplicateDefinitions") or []
    by_method = {str(item.get("method", "")): item for item in records if isinstance(item, dict)}
    for record in qr_boundary_records():
        method = record["method"]
        if method in by_method:
            if by_method[method] != record:
                raise SystemExit("existing QR boundary record differs: " + method)
        else:
            records.append(record)
    data["duplicateDefinitions"] = records
    BOUNDARIES.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    patch_entry()
    patch_qr_wrapper()
    patch_boundaries()
    print("OK QR wiring entry_version=%d boundaries=3" % NEW_ENTRY_VERSION)


if __name__ == "__main__":
    main()
