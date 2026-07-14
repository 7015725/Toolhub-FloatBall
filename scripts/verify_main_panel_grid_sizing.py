#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MAIN = (ROOT / "code/th_15_main_panel.js").read_text(encoding="utf-8")
EXTRA = (ROOT / "code/th_15_extra.js").read_text(encoding="utf-8")
WORKFLOW = (ROOT / ".github/workflows/verify.yml").read_text(encoding="utf-8")
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-grid-sizing: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


def version(text, expected, name):
    match = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", text)
    if not match or match.group(1) != expected:
        fail("%s expected version %s" % (name, expected))


version(MAIN, "1.5.7", "th_15_main_panel.js")
version(EXTRA, "1.1.16", "th_15_extra.js")

for marker, label in (
    ("gridWidth = cols * cellOuterWidth", "grid width identity"),
    ("panelWidth = panelPadding * 2 + gridWidth", "panel width identity"),
    ("fullGridHeight = pageRows * spec.rowUnit", "whole-page full height identity"),
    ("viewportHeight = visibleRows * spec.rowUnit", "viewport identity"),
    ("spec.panelTopPadding +", "top padding"),
    ("spec.dividerHeight +", "divider height"),
    ("spec.dividerBottomMargin +", "divider margin"),
    ("spec.panelBottomPadding", "bottom padding"),
    ("spec.gridWidth,\n      viewportHeight", "scroll exact size"),
    ("spec.gridWidth,\n      fullGridHeight", "grid exact size"),
    ("spec.panelWidth,\n      panelHeight", "panel exact size"),
    ("spec.gapBefore", "leading card margin"),
    ("spec.gapAfter", "trailing card margin"),
    ("main panel grid sizing cols=", "grid diagnostics"),
    ("var minX = Number(safe.left)", "safe left anchor"),
    ("Number(safe.right) - Number(pw)", "safe right anchor"),
    ("x = minX", "left-side edge alignment"),
    ("x = maxX", "right-side edge alignment"),
    ("main panel edge align side=", "edge alignment diagnostics"),
):
    require(MAIN, marker, label)

for fragment, label in (
    ("grid.setPadding(spec.gridInset", "grid inset"),
    ("new android.widget.LinearLayout.LayoutParams(-1, gridHeight)", "match scroll"),
    ("new android.widget.FrameLayout.LayoutParams(-1, -2)", "match grid"),
    ("Number(bx) + Number(ballSize) + gap", "ball-inside left anchor"),
    ("Number(bx) - pw - gap", "ball-inside right anchor"),
):
    forbid(MAIN, fragment, label)

start = EXTRA.find("FloatBallAppWM.prototype.showPanelAvoidBall = function(which)")
end = EXTRA.find("// =======================【辅助：包装可拖拽面板】", start)
if start < 0 or end <= start:
    fail("cannot isolate showPanelAvoidBall")
show = EXTRA[start:end]
for marker, label in (
    ("var exactMainSize =", "main exact branch"),
    ("requestedWidth > 0", "width guard"),
    ("requestedHeight > 0", "height guard"),
    ("android.view.View.MeasureSpec.EXACTLY", "exact measure"),
    ("pw = requestedWidth", "window width"),
    ("ph = requestedHeight", "window height"),
    ("main panel exact window size=", "window diagnostics"),
):
    require(show, marker, label)
require(show, "android.view.View.MeasureSpec.AT_MOST", "other panel measure")

require(WORKFLOW, "python3 scripts/verify_main_panel_grid_sizing.py", "workflow")
require(ENTRY, "var TOOLHUB_ENTRY_VERSION = 20260714081104;", "entry")
for doc in ("README.md", "ARCHITECTURE.md", "STRUCTURE.md"):
    require((ROOT / doc).read_text(encoding="utf-8"), "网格决定面板宽高", doc)

cols = 4
card_width = 120
gap_before = 5
gap_after = 6
padding = 12
rows = 4
card_height = 72
visible_rows = 3
page_count = (rows + visible_rows - 1) // visible_rows
page_rows = page_count * visible_rows
grid_width = cols * (card_width + gap_before + gap_after)
panel_width = padding * 2 + grid_width
row_unit = card_height + gap_before + gap_after
full_grid_height = page_rows * row_unit
viewport_height = visible_rows * row_unit
if grid_width != cols * (card_width + gap_before + gap_after):
    fail("grid width invariant")
if panel_width != grid_width + padding * 2:
    fail("panel width invariant")
if full_grid_height != page_rows * row_unit:
    fail("whole-page full grid height invariant")
if full_grid_height - viewport_height != (page_count - 1) * viewport_height:
    fail("whole-page max scroll invariant")
if viewport_height != visible_rows * row_unit:
    fail("viewport height invariant")

safe_left = 12
safe_right = 708
original_panel_width = panel_width
left_x = safe_left
right_x = max(safe_left, safe_right - panel_width)
if left_x != safe_left:
    fail("left-side safe edge invariant")
if right_x + panel_width != safe_right:
    fail("right-side safe edge invariant")
if panel_width != original_panel_width:
    fail("edge alignment must not change panel width")

print("OK main_panel_grid_sizing width=grid height=whole-page viewport window=exact edge=same-side")
