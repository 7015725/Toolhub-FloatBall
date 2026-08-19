#!/usr/bin/env python3
"""Preserve later Beta QR integration state and apply ZXing startup preflight.

The ShortXUI finalizer predates th_26. It remains authoritative for the generated
th_25 package, but must not roll back or rewrite later feature-owned entry,
manifest, API-policy, boundary, wrapper-report, or documentation state.

This compatibility transform also upgrades th_26 so the signed ZXing DEX/JAR is
checked asynchronously when the Beta QR module is loaded. A valid existing file
is reused; a missing or invalid file is downloaded, verified and installed before
users enter the QR decode flow. The UI thread is never blocked by this preflight.
"""
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


def patch_qr_integration_version_gate():
    text = QR_INTEGRATION.read_text(encoding="utf-8")
    old = '''    text = replace_once(\n        text,\n        "// @version 1.0.0",\n        "// @version 1.0.1",\n        "QR module version",\n    )'''
    new = '''    if "// @version 1.0.2" not in text:\n        if "// @version 1.0.1" in text:\n            text = text.replace("// @version 1.0.1", "// @version 1.0.2", 1)\n        elif "// @version 1.0.0" in text:\n            text = text.replace("// @version 1.0.0", "// @version 1.0.2", 1)\n        else:\n            raise SystemExit("integration anchor missing: QR module version")'''
    text = replace_once(text, old, new, "QR integration version gate 1.0.2")
    QR_INTEGRATION.write_text(text, encoding="utf-8")


def patch_qr_runtime_preflight():
    text = QR_MODULE.read_text(encoding="utf-8")

    if text.startswith("// @version 1.0.1"):
        text = text.replace("// @version 1.0.1", "// @version 1.0.2", 1)
    elif not text.startswith("// @version 1.0.2"):
        raise SystemExit("ShortXUI QR compat anchor missing: QR runtime version")

    text = replace_once(
        text,
        "// Beta only. ZXing DEX/JAR is downloaded on demand to shortx.getShortXDir()/lib.",
        "// Beta only. ZXing DEX/JAR is preflighted asynchronously on module startup/update under shortx.getShortXDir()/lib.",
        "QR runtime startup-preflight comment",
    )

    text = replace_once(
        text,
        '''    error: "",\n    cache: {},\n    installGeneration: 0''',
        '''    error: "",\n    cache: {},\n    installGeneration: 0,\n    installLock: new java.util.concurrent.locks.ReentrantLock(),\n    preflightThread: null,\n    preflightStatus: "idle",\n    preflightError: "",\n    preflightReason: "",\n    preflightCheckedAt: 0,\n    preflightDownloaded: false''',
        "QR runtime preflight state",
    )

    old_ensure = '''  function ensureRuntimeFile26() {\n    var meta = runtimeMeta26();\n    var lib = getLibDir26();\n    var dest = new java.io.File(lib, meta.fileName).getCanonicalFile();\n    if (String(dest.getCanonicalPath()).indexOf(String(lib.getCanonicalPath()) + java.io.File.separator) !== 0) throw new Error("二维码运行时目标路径越界");\n    if (validRuntimeFile26(dest, meta)) return { file: dest, meta: meta };\n    return { file: downloadRuntime26(meta, dest), meta: meta };\n  }'''
    new_ensure = '''  function ensureRuntimeFile26() {\n    runtime26.installLock.lock();\n    try {\n      var meta = runtimeMeta26();\n      var lib = getLibDir26();\n      var dest = new java.io.File(lib, meta.fileName).getCanonicalFile();\n      if (String(dest.getCanonicalPath()).indexOf(String(lib.getCanonicalPath()) + java.io.File.separator) !== 0) throw new Error("二维码运行时目标路径越界");\n      if (validRuntimeFile26(dest, meta)) return { file: dest, meta: meta, downloaded: false };\n      return { file: downloadRuntime26(meta, dest), meta: meta, downloaded: true };\n    } finally {\n      runtime26.installLock.unlock();\n    }\n  }\n\n  function preflightRuntime26(appObj, reason) {\n    var why = String(reason || "startup");\n    try {\n      if (runtime26.preflightThread && runtime26.preflightThread.isAlive()) {\n        log26(appObj, "d", "runtime preflight skip reason=busy requested=" + why);\n        return true;\n      }\n    } catch (eBusy) {}\n    runtime26.preflightStatus = "checking";\n    runtime26.preflightError = "";\n    runtime26.preflightReason = why;\n    runtime26.preflightDownloaded = false;\n    var worker = new java.lang.Thread(new java.lang.Runnable({ run: function() {\n      try {\n        var installed = ensureRuntimeFile26();\n        runtime26.preflightStatus = "ready";\n        runtime26.preflightError = "";\n        runtime26.preflightCheckedAt = now26();\n        runtime26.preflightDownloaded = installed.downloaded === true;\n        log26(appObj, "i",\n          "runtime preflight " + (installed.downloaded === true ? "downloaded" : "skip_existing") +\n          " reason=" + why +\n          " version=" + String(installed.meta.version || "") +\n          " path=" + String(installed.file.getAbsolutePath()));\n      } catch (ePreflight) {\n        runtime26.preflightStatus = "failed";\n        runtime26.preflightError = String(ePreflight);\n        runtime26.preflightCheckedAt = now26();\n        runtime26.preflightDownloaded = false;\n        log26(appObj, "w", "runtime preflight failed reason=" + why + " error=" + String(ePreflight));\n      } finally {\n        runtime26.preflightThread = null;\n      }\n    }}), "ToolHub-ZXing-Preflight");\n    runtime26.preflightThread = worker;\n    worker.start();\n    return true;\n  }'''
    text = replace_once(text, old_ensure, new_ensure, "QR runtime preflight worker")

    old_status = '''      proto.getPickwordQrRuntimeStatus = function() {\n        return {\n          loaded: !!runtime26.clazz,\n          version: String(runtime26.version || ""),\n          error: String(runtime26.error || ""),\n          libDir: String(getLibDir26().getAbsolutePath())\n        };\n      };'''
    new_status = '''      proto.ensurePickwordQrRuntimeReady = function(reason) {\n        return preflightRuntime26(this, String(reason || "manual"));\n      };\n      proto.getPickwordQrRuntimeStatus = function() {\n        return {\n          loaded: !!runtime26.clazz,\n          version: String(runtime26.version || ""),\n          error: String(runtime26.error || ""),\n          libDir: String(getLibDir26().getAbsolutePath()),\n          preflightStatus: String(runtime26.preflightStatus || "idle"),\n          preflightError: String(runtime26.preflightError || ""),\n          preflightReason: String(runtime26.preflightReason || ""),\n          preflightCheckedAt: Number(runtime26.preflightCheckedAt || 0),\n          preflightDownloaded: runtime26.preflightDownloaded === true\n        };\n      };'''
    text = replace_once(text, old_status, new_status, "QR runtime status/preflight API")

    text = replace_once(
        text,
        '''      runtime26.installGeneration++;\n      log26(null, "i", "installed generation=" + String(runtime26.installGeneration));\n      return true;''',
        '''      runtime26.installGeneration++;\n      log26(null, "i", "installed generation=" + String(runtime26.installGeneration));\n      preflightRuntime26(null, "module_startup_or_update");\n      return true;''',
        "QR runtime startup preflight dispatch",
    )

    for token in (
        "installLock: new java.util.concurrent.locks.ReentrantLock()",
        "function preflightRuntime26(appObj, reason)",
        '"runtime preflight " + (installed.downloaded === true ? "downloaded" : "skip_existing")',
        'preflightRuntime26(null, "module_startup_or_update")',
        "preflightDownloaded: installed.downloaded === true",
    ):
        if token not in text:
            raise SystemExit("ShortXUI QR compat preflight marker missing: " + token)

    QR_MODULE.write_text(text, encoding="utf-8")


def main():
    text = TARGET.read_text(encoding="utf-8")

    text = replace_once(
        text,
        "ENTRY_VERSION = 20260810005000",
        "ENTRY_VERSION = 20260819231000",
        "entry version",
    )

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
    patch_qr_integration_version_gate()
    patch_qr_runtime_preflight()
    print("OK ShortXUI finalizer preserves later Beta QR state; ZXing startup preflight=enabled")


if __name__ == "__main__":
    main()
