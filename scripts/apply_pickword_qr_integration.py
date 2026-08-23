#!/usr/bin/env python3
"""Idempotently normalize the permanent Beta QR wiring before signing.

Current fix: th_26 v1.0.7+ keeps QR "load to pickword" on the current pickword
window instead of issuing async hide followed immediately by show. The old order
could let a late hide cleanup null mainLayout/textView after the new session had
already started, producing setText/setVisibility of null.
"""
import json
import re
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
    if text.startswith("// @version 1.0.6\n"):
        text = text.replace("// @version 1.0.6\n", "// @version 1.0.7\n", 1)
    qr_version = text.splitlines()[0] if text.splitlines() else ""
    require(qr_version in ("// @version 1.0.7", "// @version 1.0.8", "// @version 1.0.9", "// @version 1.0.10", "// @version 1.0.11", "// @version 1.0.12"), "QR module version 1.0.7 to 1.0.10")

    text = text.replace(
        "new dalvik.system.DexClassLoader(",
        "new Packages.dalvik.system.DexClassLoader(",
    )

    old_load = '''        cancelQr26(appObj, "load_qr_text");\n        try { if (typeof appObj.hidePickwordWindow === "function") appObj.hidePickwordWindow("qr_load"); } catch (eHide) {}\n        appObj.showPickwordText(String(cached.result.text == null ? "" : cached.result.text), shallowCopy26(session));'''
    new_load = '''        cancelQr26(appObj, "load_qr_text");\n        var qrTextToLoad26 = String(cached.result.text == null ? "" : cached.result.text);\n        log26(appObj, "i", "load text reuse_window textLen=" + String(qrTextToLoad26.length));\n        appObj.showPickwordText(qrTextToLoad26, shallowCopy26(session));'''
    if old_load in text:
        text = text.replace(old_load, new_load, 1)

    require('hidePickwordWindow("qr_load")' not in text, "QR load-to-pickword must not async hide before show")
    require('var qrTextToLoad26 = String(cached.result.text == null ? "" : cached.result.text);' in text, "QR load text local value")
    require('log26(appObj, "i", "load text reuse_window textLen=" + String(qrTextToLoad26.length));' in text, "QR load text reuse-window log")
    require('appObj.showPickwordText(qrTextToLoad26, shallowCopy26(session));' in text, "QR direct load into current pickword window")
    require("new dalvik.system.DexClassLoader(" not in text, "bare dalvik package must not be used in Rhino")
    require("new Packages.dalvik.system.DexClassLoader(" in text, "Rhino Packages DexClassLoader")
    require("context.getCodeCacheDir()" not in text, "system_server codeCacheDir must not be used")
    require("function getDexOptimizedDirectory26()" in text, "Dex optimized-directory helper")
    require("if (sdk >= 26) return null;" in text, "API 26+ DexClassLoader optimizedDirectory bypass")
    require('new java.io.File(lib, ".dexopt")' in text, "API 24-25 channel-private dexopt")
    require('assertWritableDirPath(dexoptPath, "ToolHub QR dexopt")' in text, "legacy dexopt writable probe")
    require("var optimizedDirectory = getDexOptimizedDirectory26();" in text, "DexClassLoader optimizedDirectory selection")
    if qr_version in ("// @version 1.0.8", "// @version 1.0.9", "// @version 1.0.10", "// @version 1.0.11", "// @version 1.0.12"):
        require("controller.getPickwordQrActionState = function()" in text, "QR action state bridge")
        require("controller.performPickwordQrAction = function(action)" in text, "QR action dispatch bridge")
        require("controller.setPickwordQrActionStateListener = function(listener)" in text, "QR action state listener")
        require("textButton26(" not in text, "legacy QR text button UI must stay removed")
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
    if '"// @version 1.0.7"' not in text:
        text = re.sub(
            r'(?m)^(\s*)"// @version 1\.0\.6",\n(\s*)\)',
            r'\1"// @version 1.0.6",\n\1"// @version 1.0.7",\n\2)',
            text,
        )
        text = text.replace(
            '"// @version 1.0.6")',
            '"// @version 1.0.6", "// @version 1.0.7")',
        )
    text = text.replace(
        "1.0.1/1.0.2/1.0.3/1.0.4/1.0.5/1.0.6",
        "1.0.1/1.0.2/1.0.3/1.0.4/1.0.5/1.0.6/1.0.7",
    )
    path.write_text(text, encoding="utf-8")


def extend_version_lists(text):
    text = text.replace(
        '("// @version 1.0.5", "// @version 1.0.6")',
        '("// @version 1.0.5", "// @version 1.0.6", "// @version 1.0.7")',
    )
    text = text.replace(
        'if version == "// @version 1.0.6":',
        'if version in ("// @version 1.0.6", "// @version 1.0.7"):',
    )
    text = text.replace(
        'if qr_version == "// @version 1.0.6":',
        'if qr_version in ("// @version 1.0.6", "// @version 1.0.7"):',
    )
    return text


def patch_verifiers():
    current_qr_text = QR_MODULE.read_text(encoding="utf-8")
    if current_qr_text.startswith("// @version 1.0.8\n") or current_qr_text.startswith("// @version 1.0.9\n") or current_qr_text.startswith("// @version 1.0.10\n") or current_qr_text.startswith("// @version 1.0.11\n") or current_qr_text.startswith("// @version 1.0.12\n"):
        for path in (VERIFY_MANIFEST, VERIFY_STORAGE, VERIFY_QR):
            verifier_text = path.read_text(encoding="utf-8")
            require('"// @version 1.0.8"' in verifier_text, "QR 1.0.8 verifier support missing: " + str(path.name))
        qr_verify_text = VERIFY_QR.read_text(encoding="utf-8")
        require("controller.performPickwordQrAction = function(action)" in qr_verify_text, "QR 1.0.8 action-bridge verifier missing")
        require('forbid(QR, "textButton26("' in qr_verify_text, "QR 1.0.8 legacy text-button verifier missing")
        return
    for path in (VERIFY_MANIFEST, VERIFY_STORAGE, VERIFY_QR):
        patch_version_verifier(path)

    text = extend_version_lists(VERIFY_MANIFEST.read_text(encoding="utf-8"))
    if 'if version == "// @version 1.0.7":' not in text:
        anchor = '\n\ndef main():'
        guard = '''\n    if version == "// @version 1.0.7":\n        if 'hidePickwordWindow("qr_load")' in text:\n            fail("Beta QR load-to-pickword must not async hide before show")\n        for marker in (\n            'var qrTextToLoad26 = String(cached.result.text == null ? "" : cached.result.text);',\n            'log26(appObj, "i", "load text reuse_window textLen=" + String(qrTextToLoad26.length));',\n            'appObj.showPickwordText(qrTextToLoad26, shallowCopy26(session));',\n        ):\n            if marker not in text:\n                fail("Beta QR load-to-pickword reuse marker missing: " + marker)\n'''
        require(anchor in text, "manifest verifier load-race guard anchor")
        text = text.replace(anchor, guard + anchor, 1)
    VERIFY_MANIFEST.write_text(text, encoding="utf-8")

    text = extend_version_lists(VERIFY_STORAGE.read_text(encoding="utf-8"))
    VERIFY_STORAGE.write_text(text, encoding="utf-8")

    text = extend_version_lists(VERIFY_QR.read_text(encoding="utf-8"))
    text = text.replace('"new dalvik.system.DexClassLoader",', '"new Packages.dalvik.system.DexClassLoader",')
    if 'if qr_version == "// @version 1.0.7":' not in text:
        anchor = 'require(GEN, \'"th_26_qr_runtime.js"\', "signed QR module")'
        guard = '''if qr_version == "// @version 1.0.7":\n    forbid(QR, 'hidePickwordWindow("qr_load")', "QR load-to-pickword hide/show race")\n    require(QR, 'var qrTextToLoad26 = String(cached.result.text == null ? "" : cached.result.text);', "QR load text local value")\n    require(QR, 'log26(appObj, "i", "load text reuse_window textLen=" + String(qrTextToLoad26.length));', "QR load reuse-window log")\n    require(QR, 'appObj.showPickwordText(qrTextToLoad26, shallowCopy26(session));', "QR direct load to existing pickword window")\n\n'''
        require(anchor in text, "QR verifier load-race guard anchor")
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
    print("OK Beta QR wiring idempotent version=1.0.7|1.0.8|1.0.9|1.0.10 load_text_reuse_window=1 rhino_packages_dexloader=1")


if __name__ == "__main__":
    main()
