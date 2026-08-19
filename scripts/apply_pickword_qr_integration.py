#!/usr/bin/env python3
"""Idempotently normalize the permanent Beta QR wiring before signing.

Current fix: th_26 v1.0.6 resolves DexClassLoader through Rhino's Packages root.
ShortX/Rhino does not expose `dalvik` as a top-level Java package identifier,
while existing ToolHub integrations already use Packages.* for Java imports.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
QR_MODULE = ROOT / "code" / "th_26_qr_runtime.js"
BOUNDARIES = ROOT / "constraints" / "MODULE_BOUNDARIES.json"
VERIFY_MANIFEST = ROOT / "scripts" / "verify_manifest.py"
VERIFY_STORAGE = ROOT / "scripts" / "verify_channel_private_storage_isolation.py"
VERIFY_QR = ROOT / "scripts" / "verify_pickword_qr.py"
NEW_ENTRY_VERSION = 20260819231000


def require(condition, message):
    if not condition:
        raise SystemExit("integration contract failed: " + message)


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
    if text.startswith("// @version 1.0.5\n"):
        text = text.replace("// @version 1.0.5\n", "// @version 1.0.6\n", 1)
    require(text.startswith("// @version 1.0.6\n"), "QR module version 1.0.6")

    text = text.replace(
        "new dalvik.system.DexClassLoader(",
        "new Packages.dalvik.system.DexClassLoader(",
    )

    require("new dalvik.system.DexClassLoader(" not in text, "bare dalvik package must not be used in Rhino")
    require("new Packages.dalvik.system.DexClassLoader(" in text, "Rhino Packages DexClassLoader")
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


def patch_version_verifier(path):
    text = path.read_text(encoding="utf-8")
    text = text.replace(
        '"// @version 1.0.5",\n)',
        '"// @version 1.0.5",\n    "// @version 1.0.6",\n)',
    )
    text = text.replace(
        '"// @version 1.0.5")',
        '"// @version 1.0.5", "// @version 1.0.6")',
    )
    text = text.replace("1.0.1/1.0.2/1.0.3/1.0.4/1.0.5", "1.0.1/1.0.2/1.0.3/1.0.4/1.0.5/1.0.6")
    path.write_text(text, encoding="utf-8")


def patch_verifiers():
    for path in (VERIFY_MANIFEST, VERIFY_STORAGE, VERIFY_QR):
        patch_version_verifier(path)

    text = VERIFY_MANIFEST.read_text(encoding="utf-8")
    if 'if version == "// @version 1.0.5":' in text:
        text = text.replace(
            'if version == "// @version 1.0.5":',
            'if version in ("// @version 1.0.5", "// @version 1.0.6"):',
        )
    marker = '            \'var optimizedDirectory = getDexOptimizedDirectory26();\','
    if marker in text and 'Packages.dalvik.system.DexClassLoader' not in text:
        text = text.replace(marker, marker + '\n            \'new Packages.dalvik.system.DexClassLoader(\',')
    VERIFY_MANIFEST.write_text(text, encoding="utf-8")

    text = VERIFY_STORAGE.read_text(encoding="utf-8")
    if 'if qr_version == "// @version 1.0.5":' in text:
        text = text.replace(
            'if qr_version == "// @version 1.0.5":',
            'if qr_version in ("// @version 1.0.5", "// @version 1.0.6"):',
        )
    text = text.replace("'new dalvik.system.DexClassLoader',", "'new Packages.dalvik.system.DexClassLoader',")
    if 'qr_version == "// @version 1.0.6"' not in text:
        anchor = 'allowed_shortx_files = {"th_01_base.js"}'
        guard = '''if qr_version == "// @version 1.0.6":\n    require("new dalvik.system.DexClassLoader(" not in QR, "QR runtime must not use bare dalvik package in Rhino")\n    require("new Packages.dalvik.system.DexClassLoader(" in QR, "QR runtime must resolve DexClassLoader through Rhino Packages")\n\n'''
        require(anchor in text, "storage verifier guard anchor")
        text = text.replace(anchor, guard + anchor, 1)
    VERIFY_STORAGE.write_text(text, encoding="utf-8")

    text = VERIFY_QR.read_text(encoding="utf-8")
    text = text.replace('"new dalvik.system.DexClassLoader",', '"new Packages.dalvik.system.DexClassLoader",')
    if 'if qr_version == "// @version 1.0.6":' not in text:
        anchor = 'require(GEN, \'"th_26_qr_runtime.js"\', "signed QR module")'
        guard = '''if qr_version == "// @version 1.0.6":\n    forbid(QR, "new dalvik.system.DexClassLoader(", "bare dalvik package is undefined in ShortX Rhino")\n    require(QR, "new Packages.dalvik.system.DexClassLoader(", "Rhino Packages DexClassLoader")\n\n'''
        require(anchor in text, "QR verifier guard anchor")
        text = text.replace(anchor, guard + anchor, 1)
    VERIFY_QR.write_text(text, encoding="utf-8")


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
    print("OK Beta QR wiring idempotent version=1.0.6 rhino_packages_dexloader=1 system_server_code_cache=avoided")


if __name__ == "__main__":
    main()
