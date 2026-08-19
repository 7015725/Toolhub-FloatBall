#!/usr/bin/env python3
"""Idempotently validate/normalize the permanent Beta QR wiring before signing.

The one-time QR migration has already landed on Beta. This script now keeps the
current contract stable across signer-generated commits: v1.0.0/v1.0.1 may be
advanced to v1.0.2, while an already generated v1.0.2 tree is a strict no-op.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
QR_MODULE = ROOT / "code" / "th_26_qr_runtime.js"
BOUNDARIES = ROOT / "constraints" / "MODULE_BOUNDARIES.json"
NEW_ENTRY_VERSION = 20260819231000


def require(condition, message):
    if not condition:
        raise SystemExit("integration contract failed: " + message)


def patch_entry():
    text = ENTRY.read_text(encoding="utf-8")
    old = "var TOOLHUB_ENTRY_VERSION = 20260810005000;"
    new = "var TOOLHUB_ENTRY_VERSION = %d;" % NEW_ENTRY_VERSION
    if old in text and new not in text:
        text = text.replace(old, new, 1)
    require(new in text, "ToolHub entry version")

    old_modules = '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js", "th_23_screenshot_manager.js", "th_25_shortx_ui_package.js"]'
    new_modules = '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js", "th_26_qr_runtime.js", "th_23_screenshot_manager.js", "th_25_shortx_ui_package.js"]'
    if old_modules in text and new_modules not in text:
        text = text.replace(old_modules, new_modules, 1)
    require(text.count('"th_26_qr_runtime.js"') == 1, "Beta QR module must appear exactly once")

    stable_start = text.find("var TOOLHUB_STABLE_MODULES")
    stable_end = text.find("var modules =", stable_start)
    require(stable_start >= 0 and stable_end > stable_start, "stable module list")
    require('"th_26_qr_runtime.js"' not in text[stable_start:stable_end], "Stable must remain QR-free")
    ENTRY.write_text(text, encoding="utf-8")


def patch_qr_module():
    text = QR_MODULE.read_text(encoding="utf-8")
    if "// @version 1.0.2" not in text:
        if "// @version 1.0.1" in text:
            text = text.replace("// @version 1.0.1", "// @version 1.0.2", 1)
        elif "// @version 1.0.0" in text:
            text = text.replace("// @version 1.0.0", "// @version 1.0.2", 1)
        else:
            raise SystemExit("integration anchor missing: QR module version")

    require(text.startswith("// @version 1.0.2\n"), "QR module version 1.0.2")
    require("root.__toolHubQrDecorated26" not in text, "must not attach JS state to Android thumbnail View")
    require("controller.__toolHubQrThumbnailDecorated26 = true" in text, "thumbnail decoration marker owner")
    require('log26(appObj, "w", "thumbnail decorate fail-open=" + String(eDecorate))' in text,
            "thumbnail fail-open guard")
    require("installLock: new java.util.concurrent.locks.ReentrantLock()" in text, "runtime install lock")
    require("function preflightRuntime26(appObj, reason)" in text, "startup preflight worker")
    require('preflightRuntime26(null, "module_startup_or_update")' in text, "startup/update preflight dispatch")
    require("return { file: dest, meta: meta, downloaded: false }" in text, "valid runtime skip path")
    require("return { file: downloadRuntime26(meta, dest), meta: meta, downloaded: true }" in text,
            "missing/invalid runtime download path")
    require('"runtime preflight " + (installed.downloaded === true ? "downloaded" : "skip_existing")' in text,
            "preflight result logging")
    QR_MODULE.write_text(text, encoding="utf-8")


def validate_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    records = data.get("duplicateDefinitions") or []
    by_method = {str(item.get("method", "")): item for item in records if isinstance(item, dict)}
    for method in ("createPickwordImageController", "hidePickwordWindow", "disposePickwordModule"):
        record = by_method.get(method)
        require(record is not None, "QR wrapper boundary missing: " + method)
        require(str(record.get("effectiveOwner", "")) == "th_26_qr_runtime.js",
                "QR wrapper owner mismatch: " + method)
    owners = data.get("directOwners") or {}
    for method in ("createPickwordImageController", "hidePickwordWindow", "disposePickwordModule"):
        require(method not in owners, "QR wrapper must not be declared direct owner: " + method)


def main():
    patch_entry()
    patch_qr_module()
    validate_boundaries()
    print("OK Beta QR wiring idempotent version=1.0.2 startup_preflight=enabled stable_intrusion=0")


if __name__ == "__main__":
    main()
