#!/usr/bin/env python3
"""Preserve later Beta QR integration state after the ShortXUI finalizer."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "scripts" / "finalize_shortx_ui_runtime.py"
QR_MODULE = ROOT / "code" / "th_26_qr_runtime.js"
QR_INTEGRATION = ROOT / "scripts" / "apply_pickword_qr_integration.py"


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit("ShortXUI QR compat anchor missing: " + label)
    return text.replace(old, new, 1)


def validate_qr_integration_version_gate():
    text = QR_INTEGRATION.read_text(encoding="utf-8")
    for token in (
        '"// @version 1.0.7"',
        'new Packages.dalvik.system.DexClassLoader(',
        'new java.io.File(root, "lib")',
        'require("shortx.getShortXDir" not in text',
        'function sanitizeError26(error)',
        'function getDexOptimizedDirectory26()',
        'context.getCodeCacheDir()" not in text',
        'if (sdk >= 26) return null;',
        'new java.io.File(lib, ".dexopt")',
        'QR load-to-pickword must not async hide before show',
        'appObj.showPickwordText(qrTextToLoad26, shallowCopy26(session));',
    ):
        if token not in text:
            raise SystemExit("ShortXUI QR compat integration marker missing: " + token)


def validate_qr_runtime():
    text = QR_MODULE.read_text(encoding="utf-8")
    if not (text.startswith("// @version 1.0.7") or text.startswith("// @version 1.0.8") or text.startswith("// @version 1.0.9") or text.startswith("// @version 1.0.10")):
        raise SystemExit("ShortXUI QR compat requires QR runtime version 1.0.7 to 1.0.10")
    for token in (
        "installLock: new java.util.concurrent.locks.ReentrantLock()",
        "function preflightRuntime26(appObj, reason)",
        'preflightRuntime26(null, "module_startup_or_update")',
        'typeof getToolHubRootDir !== "function"',
        'new java.io.File(root, "lib")',
        'assertWritableDirPath(libPath, "ToolHub QR lib")',
        'function sanitizeError26(error)',
        'var decodeStage = "load_runtime"',
        'decodeStage = "invoke_decode"',
        'function getDexOptimizedDirectory26()',
        'if (sdk >= 26) return null;',
        'new java.io.File(lib, ".dexopt")',
        'assertWritableDirPath(dexoptPath, "ToolHub QR dexopt")',
        'var optimizedDirectory = getDexOptimizedDirectory26();',
        'new Packages.dalvik.system.DexClassLoader(',
        'var qrTextToLoad26 = String(cached.result.text == null ? "" : cached.result.text);',
        'log26(appObj, "i", "load text reuse_window textLen=" + String(qrTextToLoad26.length));',
        'appObj.showPickwordText(qrTextToLoad26, shallowCopy26(session));',
    ):
        if token not in text:
            raise SystemExit("ShortXUI QR compat runtime marker missing: " + token)
    if 'hidePickwordWindow("qr_load")' in text:
        raise SystemExit("ShortXUI QR compat forbids QR load hide/show race")
    if "new dalvik.system.DexClassLoader(" in text:
        raise SystemExit("ShortXUI QR compat forbids bare dalvik package in Rhino")
    if "context.getCodeCacheDir()" in text:
        raise SystemExit("ShortXUI QR compat forbids system_server Context.getCodeCacheDir")
    if "shortx.getShortXDir" in text:
        raise SystemExit("ShortXUI QR compat forbids shared ShortX root lib bypass")
    if text.startswith("// @version 1.0.8") or text.startswith("// @version 1.0.9") or text.startswith("// @version 1.0.10"):
        for token in (
            "controller.getPickwordQrActionState = function()",
            "controller.performPickwordQrAction = function(action)",
            "controller.setPickwordQrActionStateListener = function(listener)",
        ):
            if token not in text:
                raise SystemExit("ShortXUI QR compat 1.0.8 bridge marker missing: " + token)
        if "textButton26(" in text:
            raise SystemExit("ShortXUI QR compat 1.0.8 forbids legacy QR text buttons")


def main():
    text = TARGET.read_text(encoding="utf-8")
    text = replace_once(text, "ENTRY_VERSION = 20260810005000", "ENTRY_VERSION = 20260819231000", "entry version")
    text = replace_once(
        text,
        "def patch_manifest_generator(text: str) -> str:\n    source = '    \"th_23_screenshot_manager.js\",\\n]'",
        "def patch_manifest_generator(text: str) -> str:\n    if '\"th_26_qr_runtime.js\"' in text and '\"th_25_shortx_ui_package.js\"' in text:\n        return text\n    source = '    \"th_23_screenshot_manager.js\",\\n]'",
        "manifest generator preservation",
    )
    text = replace_once(
        text,
        "def patch_api_rules(text: str) -> str:\n    from report_api_usage import scan_repository",
        "def patch_api_rules(text: str) -> str:\n    if '\"api-pickword-qr-runtime\"' in text:\n        return text\n    from report_api_usage import scan_repository",
        "API policy preservation",
    )
    text = replace_once(
        text,
        "def patch_boundaries(text: str) -> str:\n    data = json.loads(text)",
        "def patch_boundaries(text: str) -> str:\n    if '\"th_26_qr_runtime.js\"' in text:\n        return text\n    data = json.loads(text)",
        "module boundary preservation",
    )
    text = replace_once(
        text,
        "def patch_protected_reporter(text: str) -> str:\n    if '    \"ShortXUI 最终封装\": 6,' not in text:",
        "def patch_protected_reporter(text: str) -> str:\n    if '\"拾字二维码扩展\"' in text:\n        return text\n    if '    \"ShortXUI 最终封装\": 6,' not in text:",
        "protected wrapper preservation",
    )
    text = replace_once(
        text,
        "def patch_architecture(text: str) -> str:\n    text = text.replace(\"更新时间：2026-07-27\", \"更新时间：2026-07-28\", 1)",
        "def patch_architecture(text: str) -> str:\n    if \"th_26_qr_runtime.js\" in text:\n        return text\n    text = text.replace(\"更新时间：2026-07-27\", \"更新时间：2026-07-28\", 1)",
        "architecture preservation",
    )
    text = replace_once(
        text,
        "def patch_structure(text: str) -> str:\n    text = text.replace(\"更新时间：2026-07-27\", \"更新时间：2026-07-28\", 1)",
        "def patch_structure(text: str) -> str:\n    if \"th_26_qr_runtime.js\" in text:\n        return text\n    text = text.replace(\"更新时间：2026-07-27\", \"更新时间：2026-07-28\", 1)",
        "structure preservation",
    )
    TARGET.write_text(text, encoding="utf-8")
    validate_qr_integration_version_gate()
    validate_qr_runtime()
    print("OK ShortXUI finalizer preserves Beta QR 1.0.7..1.0.10 load-text reuse-window fix")


if __name__ == "__main__":
    main()
