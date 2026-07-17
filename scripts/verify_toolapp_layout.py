#!/usr/bin/env python3
"""校验 ToolApp 单根视图、自适应布局与主线程构建契约。"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CORE = ROOT / "code" / "th_02_core.js"
EXTRA = ROOT / "code" / "th_15_extra.js"
ENTRY = ROOT / "code" / "th_16_entry.js"


def method_body(text, method):
    match = re.search(
        r"FloatBallAppWM\.prototype\." + re.escape(method) +
        r"\s*=\s*function\([^)]*\)\s*\{(?P<body>.*?)\n\};",
        text,
        re.S,
    )
    return match, match.group("body") if match else ""


def main():
    core = CORE.read_text(encoding="utf-8")
    extra = EXTRA.read_text(encoding="utf-8")
    entry = ENTRY.read_text(encoding="utf-8")
    checks = []
    add_match, add_body = method_body(extra, "addPanel")

    def check(group, name, ok):
        checks.append((group, name, bool(ok)))

    check("single-root", "state keeps a single ToolApp root view", "toolAppRoot" in core)
    check("single-root", "state keeps ToolApp content host", "toolAppContentHost" in core)
    check("single-root", "state keeps ToolApp title view", "toolAppTitleView" in core)
    check("single-root", "state keeps ToolApp back button", "toolAppBackButton" in core)
    check("single-root", "has ensureToolAppShell", "FloatBallAppWM.prototype.ensureToolAppShell" in extra)
    check("single-root", "has updateToolAppShellChrome", "FloatBallAppWM.prototype.updateToolAppShellChrome" in extra)
    check("single-root", "has setToolAppContent", "FloatBallAppWM.prototype.setToolAppContent" in extra)
    check("visual-stability", "addPanel exists", bool(add_match))
    check(
        "visual-stability",
        "ToolApp overlay enters fully opaque without scale animation",
        "if (__toolAppPanel)" in add_body and
        "panel.setAlpha(1);" in add_body and
        "panel.setScaleX(1);" in add_body and
        "panel.setScaleY(1);" in add_body and
        add_body.find("if (__toolAppPanel)") < add_body.find("else if (this.config.ENABLE_ANIMATIONS)"),
    )

    check("adaptive-size", "has calculateToolAppLayout", "FloatBallAppWM.prototype.calculateToolAppLayout" in extra)
    check("adaptive-size", "layout uses screen orientation", "isLandscape" in extra and "shortSide" in extra and "longSide" in extra)
    check("adaptive-size", "layout has tiny screen branch", "shortSide < this.dp(420)" in extra)
    check("adaptive-size", "layout has tablet/large screen branch", "shortSide >= this.dp(720)" in extra)
    check("adaptive-size", "layout applies margins", "marginX" in extra and "marginTop" in extra and "marginBottom" in extra)

    dispatch_match, dispatch_body = method_body(extra, "showToolApp")
    build_match, build_body = method_body(entry, "showToolAppOnMain")
    check("shared", "showToolApp dispatcher exists", bool(dispatch_match))
    check("main-owner", "showToolAppOnMain builder exists", bool(build_match))
    check(
        "main-owner",
        "showToolApp dispatches build to Android main",
        "postToAndroidMain" in dispatch_body and
        "showToolAppOnMain(r, reset, generation)" in dispatch_body,
    )
    check(
        "main-owner",
        "showToolAppOnMain rejects non-main execution",
        'throw "showToolAppOnMain requires android main"' in build_body,
    )
    check(
        "main-owner",
        "showToolApp drops stale generations",
        "TOOLAPP_BUILD_DROPPED" in build_body and "toolAppUiGeneration" in build_body,
    )

    check("single-root", "ToolApp build does not remove viewer on page switch", "this.hideViewerPanel();" not in build_body)
    check("single-root", "ToolApp build ensures shell once", "this.ensureToolAppShell" in build_body)
    check("single-root", "ToolApp build swaps content host", "this.setToolAppContent" in build_body)
    check("single-root", "ToolApp build only addPanel when shell not added", "!this.state.addedViewer" in build_body and "this.addPanel" in build_body)
    check("adaptive-size", "ToolApp build uses calculateToolAppLayout", "this.calculateToolAppLayout" in build_body)
    check("adaptive-size", "ToolApp build applies adaptive width", "layout.width" in build_body and "layout.height" in build_body)
    check("adaptive-size", "ToolApp build updates x/y when reusing root", "viewerPanelLp.x = layout.x" in build_body and "viewerPanelLp.y = layout.y" in build_body)
    check("adaptive-size", "ToolApp build addPanel uses adaptive x/y", "this.addPanel(shell, layout.x, layout.y" in build_body)
    check("adaptive-size", "ToolApp build has no fixed 0.92/0.82 sizing", "0.92" not in build_body and "0.82" not in build_body)

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
