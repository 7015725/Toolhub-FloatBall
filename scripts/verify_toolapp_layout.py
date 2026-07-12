#!/usr/bin/env python3
"""校验 ToolApp 单根视图与自适应布局契约。"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CORE = ROOT / "code" / "th_02_core.js"
EXTRA = ROOT / "code" / "th_15_extra.js"


def main():
    core = CORE.read_text(encoding="utf-8")
    extra = EXTRA.read_text(encoding="utf-8")
    checks = []

    def check(group, name, ok):
        checks.append((group, name, bool(ok)))

    check("single-root", "state keeps a single ToolApp root view", "toolAppRoot" in core)
    check("single-root", "state keeps ToolApp content host", "toolAppContentHost" in core)
    check("single-root", "state keeps ToolApp title view", "toolAppTitleView" in core)
    check("single-root", "state keeps ToolApp back button", "toolAppBackButton" in core)
    check("single-root", "has ensureToolAppShell", "FloatBallAppWM.prototype.ensureToolAppShell" in extra)
    check("single-root", "has updateToolAppShellChrome", "FloatBallAppWM.prototype.updateToolAppShellChrome" in extra)
    check("single-root", "has setToolAppContent", "FloatBallAppWM.prototype.setToolAppContent" in extra)

    check("adaptive-size", "has calculateToolAppLayout", "FloatBallAppWM.prototype.calculateToolAppLayout" in extra)
    check("adaptive-size", "layout uses screen orientation", "isLandscape" in extra and "shortSide" in extra and "longSide" in extra)
    check("adaptive-size", "layout has tiny screen branch", "shortSide < this.dp(420)" in extra)
    check("adaptive-size", "layout has tablet/large screen branch", "shortSide >= this.dp(720)" in extra)
    check("adaptive-size", "layout applies margins", "marginX" in extra and "marginTop" in extra and "marginBottom" in extra)

    show_match = re.search(
        r"FloatBallAppWM\.prototype\.showToolApp\s*=\s*function\([^)]*\)\s*\{(?P<body>.*?)\n\};",
        extra,
        re.S,
    )
    show_body = show_match.group("body") if show_match else ""
    check("shared", "showToolApp exists", bool(show_match))
    check("single-root", "showToolApp does not remove viewer on page switch", "this.hideViewerPanel();" not in show_body)
    check("single-root", "showToolApp ensures shell once", "this.ensureToolAppShell" in show_body)
    check("single-root", "showToolApp swaps content host", "this.setToolAppContent" in show_body)
    check("single-root", "showToolApp only addPanel when shell not added", "!this.state.addedViewer" in show_body and "this.addPanel" in show_body)
    check("adaptive-size", "showToolApp uses calculateToolAppLayout", "this.calculateToolAppLayout" in show_body)
    check("adaptive-size", "showToolApp applies adaptive width", "layout.width" in show_body and "layout.height" in show_body)
    check("adaptive-size", "showToolApp updates x/y when reusing root", "viewerPanelLp.x = layout.x" in show_body and "viewerPanelLp.y = layout.y" in show_body)
    check("adaptive-size", "showToolApp addPanel uses adaptive x/y", "this.addPanel(shell, layout.x, layout.y" in show_body)
    check("adaptive-size", "showToolApp no fixed 0.92/0.82 sizing", "0.92" not in show_body and "0.82" not in show_body)

    failed = [(group, name) for group, name, ok in checks if not ok]
    if failed:
        print("ToolApp layout verification FAILED:")
        for group, name in failed:
            print(" - [%s] %s" % (group, name))
        return 1

    groups = sorted(set(group for group, _, _ in checks))
    print("OK toolapp_layout checks=%d groups=%s" % (len(checks), ",".join(groups)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
