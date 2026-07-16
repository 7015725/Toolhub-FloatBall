#!/usr/bin/env python3
from pathlib import Path


SECURITY_CONTENT = r'''#!/usr/bin/env python3
"""Verify structured Shortcut defaults, Launcher execution, save invariants and eval isolation."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def version_at_least(text, expected):
    match = re.search(r"^// @version\s+(\d+)\.(\d+)\.(\d+)", text)
    return bool(match) and tuple(map(int, match.groups())) >= expected


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

    launcher_pos = action.find("launcherApps.startShortcut(spkg, sid, null, null, shortcutUser)")
    intent_pos = action.find("android.content.Intent.parseUri(iu, 0)")
    guard_pos = action.find('if (shortcutMode !== "legacy_js")')
    legacy_pos = action.find('var jsCode = (btn.shortcutJsCode')
    eval_pos = action.find("eval(jsCode)")

    checks = [
        ("shortcut schema defaults to intent", 'putSchema("SHORTCUT_EXEC_MODE", { type: "enum", values: ["intent", "legacy_js"], default: "intent" })' in rebuild),
        ("shortcut default setting is intent", 'putDefault("SHORTCUT_EXEC_MODE", "intent")' in rebuild),
        ("compat is not a shortcut default", 'putDefault("SHORTCUT_EXEC_MODE", "compat")' not in rebuild and 'default: "compat"' not in rebuild),
        ("runtime defaults to intent", 'var shortcutMode = "intent";' in action),
        ("unknown and compat modes collapse to intent", 'return "intent";' in action and 'shortcutMode === "compat"' not in action),
        ("eval exists only once", action.count("eval(jsCode)") == 1),
        ("launcher start exists once", action.count("launcherApps.startShortcut(spkg, sid, null, null, shortcutUser)") == 1),
        ("launcher runs before intent fallback", launcher_pos >= 0 and intent_pos > launcher_pos),
        ("legacy eval remains behind structured paths", guard_pos > intent_pos and legacy_pos > guard_pos and eval_pos > legacy_pos),
        ("structured failure returns before legacy code", 'shortcutMode !== "legacy_js"' in action and 'shortcut structured fail' in action),
        ("runtime requires package", 'shortcut missing pkg idx=' in action),
        ("runtime requires shortcut id", 'shortcut missing id pkg=' in action),
        ("runtime preserves intent fallback", 'shortcut(intentUri fallback) ok' in action),
        ("button migration writes explicit mode", 'b.shortcutExecMode = normalizedShortcutMode' in base),
        ("button migration preserves only js-only legacy", '!shortcutIntent && shortcutJs' in base),
        ("obsolete shortcutRunMode is removed", 'delete b.shortcutRunMode' in base),
        ("migration version advanced", 'BUTTONS_MIGRATION_VERSION = 2' in base),
        ("editor saves intent mode", 'newBtn.shortcutExecMode = "intent"' in editor),
        ("editor saves legacy only explicitly", 'newBtn.shortcutExecMode = "legacy_js"' in editor and 'isLegacyJsEnabled' in editor),
        ("editor no longer forces js mode", 'newBtn.shortcutRunMode = "js"' not in editor),
        ("editor allows launcher-only shortcuts", '请选择包含 intentUri 的快捷方式' not in editor and 'if (_scIntentUri) newBtn.intentUri = _scIntentUri;' in editor),
        ("editor clears stale optional intent", 'else delete newBtn.intentUri;' in editor),
        ("editor saves package and id", 'newBtn.pkg = sp' in editor and 'newBtn.shortcutId = sid' in editor),
        ("editor saves both user fields", 'newBtn.userId = _scUserId' in editor and 'newBtn.launchUserId = _scUserId' in editor),
        ("validation logging is redacted", 'hasIntentUri=' in editor and 'button editor validation blocked' in editor),
        ("notice uses danger role", 'var dangerColor = T.danger || C.danger' in editor),
        ("new shortcut UI does not generate js", '__scBuildDefaultJsCode' not in shortcut and '__scUpdateJsCodeSafe' not in shortcut),
        ("legacy editor only appears for migrated buttons", 'if (legacyJsEnabled)' in shortcut and 'inputScJsCode = self.ui.createInputGroup' in shortcut),
        ("selecting a shortcut disables legacy", '__scSetLegacyJsEnabled(false)' in shortcut),
        ("picker derives launch method for logs", 'launchMethod=" + (scSelectedIntentUri ? "launcher_intent" : "launcher")' in shortcut),
        ("picker does not store derived launch method", "launchMethod:" not in shortcut),
        ("picker logs uri length only", 'intentUriLen=' in shortcut and 'shortcut picker selected pkg=' in shortcut),
        ("picker labels launcher-only entries", 'Launcher + Intent 后备' in shortcut and 'Launcher 启动' in shortcut),
        ("action module version advanced", version_at_least(action, (1, 1, 1))),
        ("editor module version advanced", version_at_least(editor, (1, 1, 3))),
        ("shortcut module version advanced", version_at_least(shortcut, (1, 0, 5))),
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

    print("Shortcut security verification OK checks=%d model_checks=%d" % (len(checks), len(model_checks)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
'''

security_path = Path("scripts/verify_shortcut_security.py")
security_path.write_text(SECURITY_CONTENT, encoding="utf-8")

launcher_path = Path("scripts/verify_shortcut_launcher_path.py")
if not launcher_path.exists():
    raise SystemExit("launcher verifier missing before consolidation")
launcher_path.unlink()

workflow_path = Path(".github/workflows/verify.yml")
workflow = workflow_path.read_text(encoding="utf-8")
old = "            python3 scripts/verify_shortcut_security.py\n            python3 scripts/verify_shortcut_launcher_path.py\n"
new = "            python3 scripts/verify_shortcut_security.py\n"
if workflow.count(old) != 1:
    raise SystemExit("verify workflow launcher block count=%d" % workflow.count(old))
workflow_path.write_text(workflow.replace(old, new, 1), encoding="utf-8")

print("Consolidated shortcut security and launcher verifiers")
