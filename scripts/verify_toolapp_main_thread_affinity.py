#!/usr/bin/env python3
"""Verify ToolApp ViewRoot and IME operations stay on Android main."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


def version_at_least(text, expected):
    match = re.search(r"^// @version\s+(\d+)\.(\d+)\.(\d+)", text)
    return bool(match) and tuple(map(int, match.groups())) >= expected


def main():
    theme = read("code/th_04_theme.js")
    animation = read("code/th_09_animation.js")
    extra = read("code/th_15_extra.js")
    entry = read("code/th_16_entry.js")
    checks = [
        ("theme version", version_at_least(theme, (1, 0, 11))),
        ("animation version", version_at_least(animation, (1, 0, 10))),
        ("extra version", version_at_least(extra, (1, 1, 18))),
        ("entry version", version_at_least(entry, (1, 0, 15))),
        ("late monkey patch removed", "__toolAppMainOwnerInstalled" not in entry),
        ("main looper dispatcher exists", "Looper.getMainLooper()" in entry and "postToAndroidMain" in entry),
        ("ToolApp build main assertion", 'throw "showToolAppOnMain requires android main"' in entry),
        ("ToolApp remove main assertion", 'throw "removeToolAppOnMain requires android main"' in entry),
        ("IME hidden before remove", "hideSoftInputFromWindow(token, 0)" in entry),
        ("ToolApp add main guard", 'throw "tool_app addPanel requires android main"' in extra),
        ("ToolApp IME initial state hidden", "SOFT_INPUT_STATE_ALWAYS_HIDDEN" in extra),
        ("show dispatcher uses Android main", "self.showToolAppOnMain(r, reset, generation)" in extra and "postToAndroidMain" in extra),
        ("stale ToolApp builds are dropped", "TOOLAPP_BUILD_DROPPED" in entry and "toolAppUiGeneration" in extra),
        ("panel close invalidates pending build", "eGeneration" in animation and "toolAppUiGeneration" in animation),
        ("inactive editor route intercepted", "this.isToolAppRoute(__route)" in extra),
        ("viewer removal enters main", "removeToolAppOnMain(\"hideViewerPanel\"" in animation),
        ("residual removal enters main", "toolapp safeRemoveView dispatch fail" in animation),
        ("inline notice uses owner view", "ownerView.post" in theme),
        ("theme receiver protects ToolApp", "viewerRef" in entry and "eViewerTheme" in entry),
        ("add completion logging", "TOOLAPP_WM_ADD_DONE" in extra),
        ("remove completion logging", "TOOLAPP_REMOVE_DONE" in entry),
    ]
    failed = [name for name, ok in checks if not ok]
    if failed:
        print("ToolApp main-thread affinity verification FAILED:")
        for name in failed:
            print(" - " + name)
        return 1
    print("ToolApp main-thread affinity verification OK checks=%d" % len(checks))
    return 0


if __name__ == "__main__":
    sys.exit(main())
