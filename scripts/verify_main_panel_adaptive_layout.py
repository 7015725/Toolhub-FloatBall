#!/usr/bin/env python3
from pathlib import Path
import math
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = (ROOT / "code/th_01_base.js").read_text(encoding="utf-8")
PERSIST = (ROOT / "code/th_05_persistence.js").read_text(encoding="utf-8")
MAIN = (ROOT / "code/th_15_main_panel.js").read_text(encoding="utf-8")
WORKFLOW = (ROOT / ".github/workflows/verify.yml").read_text(encoding="utf-8")
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-adaptive-layout: " + message)


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


version(BASE, "1.1.17", "th_01_base.js")
version(PERSIST, "1.0.7", "th_05_persistence.js")
version(MAIN, "1.5.8", "th_15_main_panel.js")

start = MAIN.find("FloatBallAppWM.prototype.getMainPanelResponsiveSpec = function")
end = MAIN.find("FloatBallAppWM.prototype.createMainPanelPressedBackground", start)
if start < 0 or end <= start:
    fail("cannot isolate responsive spec")
responsive = MAIN[start:end]

for marker, label in (
    ("this.config.PANEL_WIDTH_PERCENT", "width percentage"),
    ("this.config.PANEL_AUTO_MAX_COLS", "automatic max columns"),
    ("this.config.PANEL_MIN_CARD_WIDTH_DP", "minimum card width"),
    ("this.config.PANEL_CARD_HEIGHT_DP", "card height"),
    ("panelWidthBudget", "panel width budget"),
    ("gridWidthBudget", "grid width budget"),
    ("gapBefore", "leading gap"),
    ("gapAfter = gap - gapBefore", "trailing gap"),
    ("Math.floor((gridWidthBudget - cols * gap) / cols)", "card distribution"),
    ("cellOuterWidth = cardWidth + gapBefore + gapAfter", "outer width"),
    ("gridWidth = cols * cellOuterWidth", "grid identity"),
    ("panelWidth = panelPadding * 2 + gridWidth", "panel identity"),
    ("layoutMode: 'adaptive_grid_sized'", "layout mode"),
):
    require(responsive, marker, label)

for fragment, label in (
    ("gridInset", "grid inset"),
    ("targetWidthDp", "fixed target width"),
    ("this.dp(304)", "fixed narrow width"),
    ("this.dp(344)", "fixed regular width"),
    ("this.dp(424)", "fixed wide width"),
):
    forbid(responsive, fragment, label)

for key in (
    "PANEL_WIDTH_PERCENT",
    "PANEL_AUTO_MAX_COLS",
    "PANEL_MIN_CARD_WIDTH_DP",
    "PANEL_CARD_HEIGHT_DP",
):
    require(BASE, key + ":", "base key " + key)
    require(PERSIST, 'k === "%s"' % key, "effect key " + key)

for name in (
    "verify_main_panel_runtime_status.py",
    "verify_main_panel_drag_sort.py",
    "verify_main_panel_paging.py",
    "verify_main_panel_close_lifecycle.py",
    "verify_main_panel_visual_tuning.py",
):
    require((ROOT / "scripts" / name).read_text(encoding="utf-8"), "1.5.8", name)

require(WORKFLOW, "python3 scripts/verify_main_panel_adaptive_layout.py", "workflow")
require(ENTRY, "var TOOLHUB_ENTRY_VERSION = 20260718213000;", "entry")
for doc in ("README.md", "ARCHITECTURE.md", "STRUCTURE.md"):
    require((ROOT / doc).read_text(encoding="utf-8"), "可配置自适应网格", doc)


def model(safe_width, width_percent=90, padding=12, gap=8, minimum_card=92, max_columns=6):
    budget = min(
        safe_width,
        max(min(safe_width, 160), math.floor(safe_width * width_percent / 100)),
    )
    grid_budget = budget - padding * 2
    columns = max(
        1,
        min(max_columns, math.floor((grid_budget + gap) / (minimum_card + gap))),
    )
    card = math.floor((grid_budget - columns * gap) / columns)
    while columns > 1 and card < 48:
        columns -= 1
        card = math.floor((grid_budget - columns * gap) / columns)
    card = max(48, card)
    grid = columns * (card + gap)
    panel = padding * 2 + grid
    return columns, card, grid, panel, budget


for width, expected in {320: 2, 392: 3, 600: 5, 800: 6}.items():
    columns, card, grid, panel, budget = model(width)
    if columns != expected:
        fail("width=%d expected=%d got=%d" % (width, expected, columns))
    if panel > budget or panel != grid + 24 or card < 48:
        fail("invalid grid-sized model width=%d" % width)

print("OK main_panel_adaptive_layout model=2/3/5/6 width=grid-derived gap=exact")
