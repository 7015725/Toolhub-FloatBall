#!/usr/bin/env python3
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[1]
extra = (root / "code" / "th_15_extra.js").read_text(encoding="utf-8")

checks = []

def check(name, ok):
    checks.append((name, bool(ok)))

check("has calculateToolAppLayout", "FloatBallAppWM.prototype.calculateToolAppLayout" in extra)
check("layout uses screen orientation", "isLandscape" in extra and "shortSide" in extra and "longSide" in extra)
check("layout has tiny screen branch", "shortSide < this.dp(420)" in extra)
check("layout has tablet/large screen branch", "shortSide >= this.dp(720)" in extra)
check("layout applies margins", "marginX" in extra and "marginTop" in extra and "marginBottom" in extra)

show_match = re.search(r"FloatBallAppWM\.prototype\.showToolApp\s*=\s*function\([^)]*\)\s*\{(?P<body>.*?)\n\};", extra, re.S)
show_body = show_match.group("body") if show_match else ""
check("showToolApp exists", bool(show_match))
check("showToolApp uses calculateToolAppLayout", "this.calculateToolAppLayout" in show_body)
check("showToolApp applies adaptive width", "layout.width" in show_body and "layout.height" in show_body)
check("showToolApp updates x/y when reusing root", "viewerPanelLp.x = layout.x" in show_body and "viewerPanelLp.y = layout.y" in show_body)
check("showToolApp addPanel uses adaptive x/y", "this.addPanel(shell, layout.x, layout.y" in show_body)
check("showToolApp no fixed 0.92/0.82 sizing", "0.92" not in show_body and "0.82" not in show_body)

failed = [name for name, ok in checks if not ok]
if failed:
    print("ToolApp adaptive-size verification FAILED:")
    for name in failed:
        print(" - " + name)
    sys.exit(1)
print("ToolApp adaptive-size verification OK")
