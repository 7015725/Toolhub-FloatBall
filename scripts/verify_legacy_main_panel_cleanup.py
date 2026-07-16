#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = (ROOT / "code/th_01_base.js").read_text(encoding="utf-8")
PERSIST = (ROOT / "code/th_05_persistence.js").read_text(encoding="utf-8")
EXTRA = (ROOT / "code/th_15_extra.js").read_text(encoding="utf-8")
MAIN = (ROOT / "code/th_15_main_panel.js").read_text(encoding="utf-8")
ENTRY = (ROOT / "code/th_16_entry.js").read_text(encoding="utf-8")
WORKFLOW = (ROOT / ".github/workflows/verify.yml").read_text(encoding="utf-8")
README = (ROOT / "README.md").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL legacy-main-panel-cleanup: " + message)


def require(text, marker, label):
    if marker not in text:
        fail("missing %s: %s" % (label, marker))


def forbid(text, marker, label):
    if marker in text:
        fail("forbidden %s: %s" % (label, marker))


def version_at_least(text, expected, name):
    match = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", text)
    if not match:
        fail("%s version marker missing" % name)
    actual_tuple = tuple(int(part) for part in match.group(1).split("."))
    expected_tuple = tuple(int(part) for part in expected.split("."))
    if actual_tuple < expected_tuple:
        fail("%s expected version >= %s, actual %s" % (name, expected, match.group(1)))


version_at_least(BASE, "1.1.15", "th_01_base.js")
version_at_least(PERSIST, "1.0.6", "th_05_persistence.js")
version_at_least(EXTRA, "1.1.17", "th_15_extra.js")
version_at_least(MAIN, "1.5.8", "th_15_main_panel.js")
version_at_least(ENTRY, "1.0.13", "th_16_entry.js")

removed_map = re.search(r"var REMOVED_SETTINGS_CONFIG_KEYS = \{(.*?)\};", BASE, re.S)
if not removed_map:
    fail("removed settings map missing")
for key in ("PANEL_COLS", "PANEL_ITEM_SIZE_DP"):
    require(removed_map.group(1), key + ": true", "cleanup marker " + key)

active_base = re.sub(r"var REMOVED_SETTINGS_CONFIG_KEYS = \{.*?\};", "", BASE, flags=re.S)
for key in ("PANEL_COLS", "PANEL_ITEM_SIZE_DP"):
    forbid(active_base, key, "active base key")
    forbid(PERSIST, key, "persistence key")
    forbid(EXTRA, key, "extra key")
    forbid(ENTRY, key, "entry key")

builder_start = EXTRA.find("FloatBallAppWM.prototype.buildPanelView = function")
builder_end = EXTRA.find("FloatBallAppWM.prototype.getBestPanelPosition", builder_start)
if builder_start < 0 or builder_end <= builder_start:
    fail("cannot isolate buildPanelView")
builder = EXTRA[builder_start:builder_end]
require(builder, 'if (type === "main")', "explicit main route")
require(builder, 'typeof this.buildMainPanelView !== "function"', "module guard")
require(builder, 'throw new Error("主面板模块未加载：th_15_main_panel.js")', "module error")
require(builder, "return this.buildMainPanelView();", "dedicated builder")
for marker in ("GridLayout", "cols2", "itemPx", "totalCells", "makePanelCellDrawable"):
    forbid(builder, marker, "legacy fixed-grid builder")

require(MAIN, "FloatBallAppWM.prototype.buildMainPanelView = function()", "modern builder")
require(MAIN, "layoutMode: 'adaptive_grid_sized'", "adaptive grid model")
forbid(EXTRA, "FloatBallAppWM.prototype.computePanelX = function", "computePanelX definition")
forbid(EXTRA, "FloatBallAppWM.prototype.tryAdjustPanelY = function", "tryAdjustPanelY definition")
forbid(EXTRA, "self.computePanelX(", "computePanelX call")
forbid(EXTRA, "self.tryAdjustPanelY(", "tryAdjustPanelY call")
require(EXTRA, "var viewerPos = self.getBestPanelPosition(", "viewer generic positioning")
require(ENTRY, "app.getMainPanelResponsiveSpec", "adaptive startup layout")
require(ENTRY, 'mode: "adaptive_grid_sized"', "startup layout fallback mode")
forbid(active_base, 'sStr.indexOf("PANEL_POS_GRAVITY") < 0', "removed schema reset requirement")
require(WORKFLOW, "python3 scripts/verify_legacy_main_panel_cleanup.py", "workflow entry")
require(README, "旧固定网格回退构建器已删除", "README cleanup note")

print("OK legacy_main_panel_cleanup fallback=removed old_keys=2 viewer=generic entry=adaptive")
