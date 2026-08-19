#!/usr/bin/env python3
"""Idempotently normalize the permanent Beta QR wiring before signing.

Current fix: th_26 v1.0.5 avoids Context.getCodeCacheDir() in system_server.
Android API 26+ passes no optimized directory because DexClassLoader ignores it;
API 24-25 uses the active ToolHub channel lib/.dexopt directory.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
QR_MODULE = ROOT / "code" / "th_26_qr_runtime.js"
BOUNDARIES = ROOT / "constraints" / "MODULE_BOUNDARIES.json"
VERIFY_MANIFEST = ROOT / "scripts" / "verify_manifest.py"
VERIFY_STORAGE = ROOT / "scripts" / "verify_channel_private_storage_isolation.py"
NEW_ENTRY_VERSION = 20260819231000


def require(condition, message):
    if not condition:
        raise SystemExit("integration contract failed: " + message)


def replace_if_present(text, old, new):
    if old in text and new not in text:
        return text.replace(old, new)
    return text


def patch_entry():
    text = ENTRY.read_text(encoding="utf-8")
    require("var TOOLHUB_ENTRY_VERSION = %d;" % NEW_ENTRY_VERSION in text, "ToolHub entry version")
    require(text.count('"th_26_qr_runtime.js"') == 1, "Beta QR module must appear exactly once")
    stable_start = text.find("var TOOLHUB_STABLE_MODULES")
    stable_end = text.find("var modules =", stable_start)
    require(stable_start >= 0 and stable_end > stable_start, "stable module list")
    require('"th_26_qr_runtime.js"' not in text[stable_start:stable_end], "Stable must remain QR-free")


def patch_qr_module():
    text = QR_MODULE.read_text(encoding="utf-8")
    if text.startswith("// @version 1.0.4\n"):
        text = text.replace("// @version 1.0.4\n", "// @version 1.0.5\n", 1)
    require(text.startswith("// @version 1.0.5\n"), "QR module version 1.0.5")

    old_loader = '''    var codeCache = new java.io.File(context.getCodeCacheDir(), "toolhub_qr");\n    if (!codeCache.exists() && !codeCache.mkdirs() && !codeCache.exists()) throw new Error("二维码运行时优化目录创建失败");\n    var loader = new dalvik.system.DexClassLoader(\n      installed.file.getAbsolutePath(),\n      codeCache.getAbsolutePath(),\n      null,\n      context.getClassLoader()\n    );'''
    new_loader = '''    var optimizedDirectory = getDexOptimizedDirectory26();\n    var loader = new dalvik.system.DexClassLoader(\n      installed.file.getAbsolutePath(),\n      optimizedDirectory,\n      null,\n      context.getClassLoader()\n    );'''
    if old_loader in text:
        helper = '''\n  function getDexOptimizedDirectory26() {\n    var sdk = Number(android.os.Build.VERSION.SDK_INT || 0);\n    if (sdk >= 26) return null;\n    var lib = getLibDir26();\n    var dexopt = new java.io.File(lib, ".dexopt").getCanonicalFile();\n    var libPath = String(lib.getCanonicalPath());\n    var dexoptPath = String(dexopt.getCanonicalPath());\n    if (dexoptPath.indexOf(libPath + java.io.File.separator) !== 0) throw new Error("二维码运行时优化目录越界");\n    if (!dexopt.exists() && !dexopt.mkdirs() && !dexopt.exists()) throw new Error("二维码运行时优化目录创建失败");\n    if (!dexopt.isDirectory()) throw new Error("二维码运行时优化路径不是目录");\n    if (typeof assertWritableDirPath === "function") assertWritableDirPath(dexoptPath, "ToolHub QR dexopt");\n    return dexoptPath;\n  }\n'''
        anchor = "\n  function loadRuntime26(appObj) {"
        require(anchor in text, "loadRuntime26 anchor")
        text = text.replace(anchor, helper + anchor, 1)
        text = text.replace(old_loader, new_loader, 1)

    require("context.getCodeCacheDir()" not in text, "system_server codeCacheDir must not be used")
    require("function getDexOptimizedDirectory26()" in text, "Dex optimized-directory helper")
    require("if (sdk >= 26) return null;" in text, "API 26+ DexClassLoader optimizedDirectory bypass")
    require('new java.io.File(lib, ".dexopt")' in text, "API 24-25 channel-private dexopt")
    require('assertWritableDirPath(dexoptPath, "ToolHub QR dexopt")' in text, "legacy dexopt writable probe")
    require("var optimizedDirectory = getDexOptimizedDirectory26();" in text, "DexClassLoader optimizedDirectory selection")
    require("root.__toolHubQrDecorated26" not in text, "must not attach JS state to Android thumbnail View")
    require("controller.__toolHubQrThumbnailDecorated26 = true" in text, "thumbnail decoration marker owner")
    require("installLock: new java.util.concurrent.locks.ReentrantLock()" in text, "runtime install lock")
    require("function preflightRuntime26(appObj, reason)" in text, "startup preflight worker")
    require('preflightRuntime26(null, "module_startup_or_update")' in text, "startup/update preflight dispatch")
    require('typeof getToolHubRootDir !== "function"' in text, "channel root helper guard")
    require('new java.io.File(root, "lib")' in text, "channel-private lib path")
    require('assertWritableDirPath(libPath, "ToolHub QR lib")' in text, "channel-private lib writable probe")
    require("shortx.getShortXDir" not in text, "QR module must not bypass ToolHub channel root")
    require("function sanitizeError26(error)" in text, "runtime error sanitizer")
    require('var decodeStage = "load_runtime"' in text, "runtime load stage marker")
    require('decodeStage = "invoke_decode"' in text, "runtime decode stage marker")
    QR_MODULE.write_text(text, encoding="utf-8")


def patch_verifiers():
    text = VERIFY_MANIFEST.read_text(encoding="utf-8")
    text = replace_if_present(
        text,
        '("// @version 1.0.1", "// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4")',
        '("// @version 1.0.1", "// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4", "// @version 1.0.5")',
    )
    text = replace_if_present(text, "version 1.0.1/1.0.2/1.0.3/1.0.4", "version 1.0.1/1.0.2/1.0.3/1.0.4/1.0.5")
    text = replace_if_present(
        text,
        '("// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4")',
        '("// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4", "// @version 1.0.5")',
    )
    text = replace_if_present(
        text,
        '("// @version 1.0.3", "// @version 1.0.4")',
        '("// @version 1.0.3", "// @version 1.0.4", "// @version 1.0.5")',
    )
    text = replace_if_present(
        text,
        'if version == "// @version 1.0.4":',
        'if version in ("// @version 1.0.4", "// @version 1.0.5"):',
    )
    require('"// @version 1.0.5"' in text, "verify_manifest 1.0.5 gate")
    VERIFY_MANIFEST.write_text(text, encoding="utf-8")

    text = VERIFY_STORAGE.read_text(encoding="utf-8")
    text = replace_if_present(
        text,
        '("// @version 1.0.1", "// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4")',
        '("// @version 1.0.1", "// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4", "// @version 1.0.5")',
    )
    text = replace_if_present(text, "version must be 1.0.1/1.0.2/1.0.3/1.0.4", "version must be 1.0.1/1.0.2/1.0.3/1.0.4/1.0.5")
    text = replace_if_present(
        text,
        '("// @version 1.0.3", "// @version 1.0.4")',
        '("// @version 1.0.3", "// @version 1.0.4", "// @version 1.0.5")',
    )
    text = replace_if_present(
        text,
        '("// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4")',
        '("// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4", "// @version 1.0.5")',
    )
    text = replace_if_present(
        text,
        'if qr_version == "// @version 1.0.4":',
        'if qr_version in ("// @version 1.0.4", "// @version 1.0.5"):',
    )
    require('"// @version 1.0.5"' in text, "storage verifier 1.0.5 gate")
    VERIFY_STORAGE.write_text(text, encoding="utf-8")


def validate_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    records = data.get("duplicateDefinitions") or []
    by_method = {str(item.get("method", "")): item for item in records if isinstance(item, dict)}
    for method in ("createPickwordImageController", "hidePickwordWindow", "disposePickwordModule"):
        record = by_method.get(method)
        require(record is not None, "QR wrapper boundary missing: " + method)
        require(str(record.get("effectiveOwner", "")) == "th_26_qr_runtime.js", "QR wrapper owner mismatch: " + method)


def main():
    patch_entry()
    patch_qr_module()
    patch_verifiers()
    validate_boundaries()
    print("OK Beta QR wiring idempotent version=1.0.5 system_server_code_cache=avoided api26_no_dexopt=1 legacy_channel_dexopt=1")


if __name__ == "__main__":
    main()
