#!/usr/bin/env python3
"""Verify launcher-native Shortcut save and execution invariants."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def version_at_least(text, expected):
    match = re.search(r"^// @version\s+(\d+)\.(\d+)\.(\d+)", text)
    return bool(match) and tuple(map(int, match.groups())) >= expected


def main():
    action = read("code/th_11_action.js")
    editor = read("code/th_14_button_editor.js")
    picker = read("code/th_14_button_shortcut.js")

    launcher = action.find("launcherApps.startShortcut(spkg, sid, null, null, shortcutUser)")
    intent = action.find("android.content.Intent.parseUri(iu, 0)")
    guard = action.find('if (shortcutMode !== "legacy_js")')
    eval_pos = action.find("eval(jsCode)")

    checks = [
        ("launcher path exists once", action.count("launcherApps.startShortcut(spkg, sid, null, null, shortcutUser)") == 1),
        ("launcher precedes intent fallback", launcher >= 0 and intent > launcher),
        ("legacy eval remains guarded", guard > intent and eval_pos > guard),
        ("runtime requires package", 'shortcut missing pkg idx=' in action),
        ("runtime requires shortcut id", 'shortcut missing id pkg=' in action),
        ("runtime preserves intent fallback", 'shortcut(intentUri fallback) ok' in action),
        ("editor no longer requires intent uri", '请选择包含 intentUri 的快捷方式' not in editor),
        ("editor saves package and id", 'newBtn.pkg = sp' in editor and 'newBtn.shortcutId = sid' in editor),
        ("editor saves both user fields", 'newBtn.userId = _scUserId' in editor and 'newBtn.launchUserId = _scUserId' in editor),
        ("editor stores optional intent", 'if (_scIntentUri) newBtn.intentUri = _scIntentUri;' in editor),
        ("editor clears stale intent", 'else delete newBtn.intentUri;' in editor),
        ("validation logging is redacted", 'hasIntentUri=' in editor and 'button editor validation blocked' in editor),
        ("notice uses danger role", 'var dangerColor = T.danger || C.danger' in editor),
        ("picker derives launch method for logs", 'launchMethod=" + (scSelectedIntentUri ? "launcher_intent" : "launcher")' in picker),
        ("picker does not store derived launch method", "launchMethod:" not in picker),
        ("picker logs uri length only", 'intentUriLen=' in picker and 'shortcut picker selected pkg=' in picker),
        ("picker labels launcher-only entries", 'Launcher + Intent 后备' in picker and 'Launcher 启动' in picker),
        ("action version advanced", version_at_least(action, (1, 1, 1))),
        ("editor version advanced", version_at_least(editor, (1, 1, 2))),
        ("picker version advanced", version_at_least(picker, (1, 0, 3))),
    ]

    failed = [name for name, ok in checks if not ok]
    if failed:
        print("Shortcut launcher verification FAILED:")
        for name in failed:
            print(" - " + name)
        return 1
    print("Shortcut launcher verification OK checks=%d" % len(checks))
    return 0


if __name__ == "__main__":
    sys.exit(main())
