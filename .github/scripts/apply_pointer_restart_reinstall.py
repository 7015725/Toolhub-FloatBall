#!/usr/bin/env python3
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[2]
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"
VERIFY = ROOT / "scripts" / "verify_pointer_text_release.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one occurrence, got %s" % (label, count))
    return text.replace(old, new, 1)


text = ENTRY.read_text(encoding="utf-8")

if "function installToolHubPointerAccessibilityTextReleaseFix(force)" not in text:
    text = replace_once(
        text,
        "(function installPointerAccessibilityTextReleaseFix() {",
        "function installToolHubPointerAccessibilityTextReleaseFix(force) {",
        "installer declaration",
    )
    text = replace_once(
        text,
        '  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;\n'
        '  var proto = FloatBallAppWM.prototype;\n'
        '  if (proto.__toolHubPointerReleaseFixInstalled === true) return;',
        '  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;\n'
        '  var proto = FloatBallAppWM.prototype;\n'
        '  if (proto.__toolHubPointerReleaseFixInstalled === true && force !== true) return true;',
        "installer guard",
    )
    text = replace_once(
        text,
        '  proto.__toolHubPointerReleaseFixInstalled = true;\n'
        '  pointerReleaseLog(null, "i", "pointer accessibility text release fix installed");\n'
        '})();',
        '  proto.__toolHubPointerReleaseFixInstalled = true;\n'
        '  pointerReleaseLog(null, "i", "pointer accessibility text release fix installed force=" + String(force === true));\n'
        '  return true;\n'
        '}\n'
        'installToolHubPointerAccessibilityTextReleaseFix(false);',
        "installer tail",
    )

restart_hook = 'installToolHubPointerAccessibilityTextReleaseFix(true);'
if restart_hook not in text:
    text = replace_once(
        text,
        '    var geval = eval;\n'
        '    geval(String(code));\n'
        '  }\n'
        '}\n\n'
        'function restartToolHubFromSettings() {',
        '    var geval = eval;\n'
        '    geval(String(code));\n'
        '  }\n\n'
        '  // 模块热重载会重新定义指针原型，必须重新安装取字提交修复。\n'
        '  if (typeof installToolHubPointerAccessibilityTextReleaseFix === "function") {\n'
        '    installToolHubPointerAccessibilityTextReleaseFix(true);\n'
        '  }\n'
        '}\n\n'
        'function restartToolHubFromSettings() {',
        "module reload hook",
    )

ENTRY.write_text(text, encoding="utf-8")

verify = VERIFY.read_text(encoding="utf-8")
if '"function installToolHubPointerAccessibilityTextReleaseFix(force)",' not in verify:
    verify = replace_once(
        verify,
        'required = [\n    "java.lang.System.currentTimeMillis()",',
        'required = [\n    "function installToolHubPointerAccessibilityTextReleaseFix(force)",\n'
        '    "java.lang.System.currentTimeMillis()",',
        "verifier installer marker",
    )

initial_check = (
    'if "installToolHubPointerAccessibilityTextReleaseFix(false);" not in text:\n'
    '    fail("initial pointer release fix installation missing")\n'
)
if initial_check not in verify:
    verify = replace_once(
        verify,
        'for marker in required:\n'
        '    if marker not in block:\n'
        '        fail("missing marker: " + marker)\n',
        'for marker in required:\n'
        '    if marker not in block:\n'
        '        fail("missing marker: " + marker)\n\n'
        + initial_check,
        "verifier initial install check",
    )

reload_check = (
    'reload_start = text.find("function reloadLocalToolHubModulesForRestart()")\n'
    'restart_start = text.find("function restartToolHubFromSettings()", reload_start)\n'
    'if reload_start < 0 or restart_start < 0:\n'
    '    fail("settings restart reload chain missing")\n'
    'reload_block = text[reload_start:restart_start]\n'
    'if "installToolHubPointerAccessibilityTextReleaseFix(true);" not in reload_block:\n'
    '    fail("pointer release fix is not reinstalled after module reload")\n'
)
if reload_check not in verify:
    verify = replace_once(
        verify,
        'if "SystemClock.uptimeMillis" in block:\n'
        '    fail("release fix still uses uptimeMillis")\n',
        'if "SystemClock.uptimeMillis" in block:\n'
        '    fail("release fix still uses uptimeMillis")\n\n'
        + reload_check,
        "verifier reload check",
    )

VERIFY.write_text(verify, encoding="utf-8")
entry_hash = hashlib.sha256(ENTRY.read_bytes()).hexdigest()
ENTRY_SHA.write_text(entry_hash + "  ToolHub.js\n", encoding="utf-8")
print("pointer restart reinstall fix applied")
print("ToolHub.js sha256=" + entry_hash)
