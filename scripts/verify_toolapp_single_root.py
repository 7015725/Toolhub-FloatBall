#!/usr/bin/env python3
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[1]
core = (root / "code" / "th_02_core.js").read_text(encoding="utf-8")
extra = (root / "code" / "th_15_extra.js").read_text(encoding="utf-8")

checks = []

def check(name, ok):
    checks.append((name, bool(ok)))

check("state keeps a single ToolApp root view", "toolAppRoot" in core)
check("state keeps ToolApp content host", "toolAppContentHost" in core)
check("state keeps ToolApp title view", "toolAppTitleView" in core)
check("state keeps ToolApp back button", "toolAppBackButton" in core)
check("has ensureToolAppShell", "FloatBallAppWM.prototype.ensureToolAppShell" in extra)
check("has updateToolAppShellChrome", "FloatBallAppWM.prototype.updateToolAppShellChrome" in extra)
check("has setToolAppContent", "FloatBallAppWM.prototype.setToolAppContent" in extra)

show_match = re.search(r"FloatBallAppWM\.prototype\.showToolApp\s*=\s*function\([^)]*\)\s*\{(?P<body>.*?)\n\};", extra, re.S)
show_body = show_match.group("body") if show_match else ""
check("showToolApp exists", bool(show_match))
check("showToolApp does not remove viewer on page switch", "this.hideViewerPanel();" not in show_body)
check("showToolApp ensures shell once", "this.ensureToolAppShell" in show_body)
check("showToolApp swaps content host", "this.setToolAppContent" in show_body)
check("showToolApp only addPanel when shell not added", "!this.state.addedViewer" in show_body and "this.addPanel" in show_body)

failed = [name for name, ok in checks if not ok]
if failed:
    print("ToolApp single-root verification FAILED:")
    for name in failed:
        print(" - " + name)
    sys.exit(1)
print("ToolApp single-root verification OK")
