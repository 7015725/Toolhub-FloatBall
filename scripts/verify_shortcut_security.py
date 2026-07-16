#!/usr/bin/env python3
"""Verify Shortcut intent-only defaults, legacy migration and eval isolation."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def normalize_mode(value):
    mode = str(value or "").strip().lower()
    if mode in ("legacy_js", "legacy", "js"):
        return "legacy_js"
    return "intent"


def migrate_button(button):
    intent_uri = str(button.get("intentUri") or "").strip()
    js_code = str(button.get("shortcutJsCode") or "").strip()
    mode = str(button.get("shortcutExecMode") or "").strip().lower()
    if mode in ("legacy_js", "legacy", "js"):
        return "legacy_js"
    if not intent_uri and js_code:
        return "legacy_js"
    return "intent"


def main():
    base = read("code/th_01_base.js")
    action = read("code/th_11_action.js")
    rebuild = read("code/th_12_rebuild.js")
    editor = read("code/th_14_button_editor.js")
    shortcut = read("code/th_14_button_shortcut.js")

    eval_pos = action.find("eval(jsCode)")
    guard_pos = action.find('if (shortcutMode !== "legacy_js")')
    legacy_pos = action.find('var jsCode = (btn.shortcutJsCode')
    shortcut_version = re.search(r"^// @version\s+(\d+)\.(\d+)\.(\d+)", shortcut)

    checks = [
        ("shortcut schema defaults to intent", 'putSchema("SHORTCUT_EXEC_MODE", { type: "enum", values: ["intent", "legacy_js"], default: "intent" })' in rebuild),
        ("shortcut default setting is intent", 'putDefault("SHORTCUT_EXEC_MODE", "intent")' in rebuild),
        ("compat is not a shortcut default", 'putDefault("SHORTCUT_EXEC_MODE", "compat")' not in rebuild and 'default: "compat"' not in rebuild),
        ("runtime defaults to intent", 'var shortcutMode = "intent";' in action),
        ("unknown and compat modes collapse to intent", 'return "intent";' in action and 'shortcutMode === "compat"' not in action),
        ("eval exists only once", action.count("eval(jsCode)") == 1),
        ("eval is behind explicit legacy guard", guard_pos >= 0 and legacy_pos > guard_pos and eval_pos > legacy_pos),
        ("intent failure returns before legacy code", 'shortcutMode !== "legacy_js"' in action and 'shortcut intent-only fail' in action),
        ("button migration writes explicit mode", 'b.shortcutExecMode = normalizedShortcutMode' in base),
        ("button migration preserves only js-only legacy", '!shortcutIntent && shortcutJs' in base),
        ("obsolete shortcutRunMode is removed", 'delete b.shortcutRunMode' in base),
        ("migration version advanced", 'BUTTONS_MIGRATION_VERSION = 2' in base),
        ("editor saves intent mode", 'newBtn.shortcutExecMode = "intent"' in editor),
        ("editor saves legacy only explicitly", 'newBtn.shortcutExecMode = "legacy_js"' in editor and 'isLegacyJsEnabled' in editor),
        ("editor no longer forces js mode", 'newBtn.shortcutRunMode = "js"' not in editor),
        ("editor requires intent uri outside legacy", '请选择包含 intentUri 的快捷方式' in editor),
        ("new shortcut UI does not generate js", '__scBuildDefaultJsCode' not in shortcut and '__scUpdateJsCodeSafe' not in shortcut),
        ("legacy editor only appears for migrated buttons", 'if (legacyJsEnabled)' in shortcut and 'inputScJsCode = self.ui.createInputGroup' in shortcut),
        ("selecting a shortcut disables legacy", '__scSetLegacyJsEnabled(false)' in shortcut),
        ("shortcut submodule has a real version", bool(shortcut_version) and tuple(map(int, shortcut_version.groups())) >= (1, 0, 2)),
    ]

    model_checks = [
        ("normal compat is safe", normalize_mode("compat") == "intent"),
        ("normal unknown is safe", normalize_mode("something") == "intent"),
        ("normal explicit legacy works", normalize_mode("legacy_js") == "legacy_js"),
        ("old intent plus js migrates safe", migrate_button({"intentUri": "intent:#Intent;end", "shortcutJsCode": "danger()"}) == "intent"),
        ("old js-only button keeps compatibility", migrate_button({"shortcutJsCode": "'ok'"}) == "legacy_js"),
        ("empty shortcut is safe", migrate_button({}) == "intent"),
        ("old compat with intent is safe", migrate_button({"shortcutExecMode": "compat", "intentUri": "intent:#Intent;end", "shortcutJsCode": "x"}) == "intent"),
        ("explicit legacy remains explicit", migrate_button({"shortcutExecMode": "legacy_js", "intentUri": "intent:#Intent;end", "shortcutJsCode": "x"}) == "legacy_js"),
    ]

    failed = [name for name, ok in checks + model_checks if not ok]
    if failed:
        print("Shortcut security verification FAILED:")
        for name in failed:
            print(" - " + name)
        return 1

    print("Shortcut security verification OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
