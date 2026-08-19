#!/usr/bin/env python3
"""Idempotently validate/normalize the permanent Beta QR wiring before signing.

The one-time QR migration has already landed on Beta. This script keeps the
current contract stable across signer-generated commits and advances the QR
runtime to v1.0.3, where the signed ZXing DEX/JAR is stored under the active
ToolHub channel root: ToolHub/lib for Stable and ToolHub-Beta/lib for Beta.
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
    if "// @version 1.0.3" not in text:
        for old_version in ("// @version 1.0.2", "// @version 1.0.1", "// @version 1.0.0"):
            if old_version in text:
                text = text.replace(old_version, "// @version 1.0.3", 1)
                break
        else:
            raise SystemExit("integration anchor missing: QR module version")

    old_comment = "// Beta only. ZXing DEX/JAR is preflighted asynchronously on module startup/update under shortx.getShortXDir()/lib."
    new_comment = "// Beta only. ZXing DEX/JAR is preflighted asynchronously under the active ToolHub channel root: getToolHubRootDir()/lib."
    if old_comment in text:
        text = text.replace(old_comment, new_comment, 1)

    old_lib = '''  function getLibDir26() {\n    if (typeof shortx === "undefined" || !shortx || typeof shortx.getShortXDir !== "function") throw new Error("ShortX 根目录不可用");\n    var base = new java.io.File(String(shortx.getShortXDir() || "")).getCanonicalFile();\n    var lib = new java.io.File(base, "lib").getCanonicalFile();\n    var basePath = String(base.getCanonicalPath());\n    var libPath = String(lib.getCanonicalPath());\n    if (libPath.indexOf(basePath + java.io.File.separator) !== 0) throw new Error("ShortX lib 目录越界");\n    if (!lib.exists() && !lib.mkdirs() && !lib.exists()) throw new Error("无法创建 ShortX lib 目录");\n    if (!lib.isDirectory()) throw new Error("ShortX lib 路径不是目录");\n    return lib;\n  }'''
    new_lib = '''  function getLibDir26() {\n    if (typeof getToolHubRootDir !== "function") throw new Error("ToolHub 通道根目录不可用");\n    var root = new java.io.File(String(getToolHubRootDir() || "")).getCanonicalFile();\n    var lib = new java.io.File(root, "lib").getCanonicalFile();\n    var rootPath = String(root.getCanonicalPath());\n    var libPath = String(lib.getCanonicalPath());\n    if (libPath.indexOf(rootPath + java.io.File.separator) !== 0) throw new Error("ToolHub lib 目录越界");\n    if (!lib.exists() && !lib.mkdirs() && !lib.exists()) throw new Error("无法创建 ToolHub lib 目录");\n    if (!lib.isDirectory()) throw new Error("ToolHub lib 路径不是目录");\n    if (typeof assertWritableDirPath === "function") assertWritableDirPath(libPath, "ToolHub QR lib");\n    return lib;\n  }'''
    if old_lib in text:
        text = text.replace(old_lib, new_lib, 1)

    require(text.startswith("// @version 1.0.3\n"), "QR module version 1.0.3")
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
    require('typeof getToolHubRootDir !== "function"' in text, "channel root helper guard")
    require('new java.io.File(root, "lib")' in text, "channel-private lib path")
    require('assertWritableDirPath(libPath, "ToolHub QR lib")' in text, "channel-private lib writable probe")
    require("shortx.getShortXDir" not in text, "QR module must not bypass ToolHub channel root")
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
    print("OK Beta QR wiring idempotent version=1.0.3 startup_preflight=enabled channel_lib=1 stable_intrusion=0")


if __name__ == "__main__":
    main()
