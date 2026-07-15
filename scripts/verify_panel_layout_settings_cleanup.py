#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = (ROOT / "code/th_01_base.js").read_text(encoding="utf-8")
PERSIST = (ROOT / "code/th_05_persistence.js").read_text(encoding="utf-8")
MAIN = (ROOT / "code/th_15_main_panel.js").read_text(encoding="utf-8")
EXTRA = (ROOT / "code/th_15_extra.js").read_text(encoding="utf-8")
ENTRY = (ROOT / "code/th_16_entry.js").read_text(encoding="utf-8")
WORKFLOW = (ROOT / ".github/workflows/verify.yml").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL panel-layout-settings-cleanup: " + message)


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


version(BASE, "1.1.11", "th_01_base.js")
version(PERSIST, "1.0.6", "th_05_persistence.js")
version(MAIN, "1.5.7", "th_15_main_panel.js")
version(EXTRA, "1.1.16", "th_15_extra.js")

active_base = re.sub(
    r"var REMOVED_SETTINGS_CONFIG_KEYS = \{.*?\};",
    "",
    BASE,
    flags=re.S,
)
for key in ("PANEL_POS_GRAVITY", "PANEL_CUSTOM_OFFSET_Y", "SAVE_THROTTLE_MS", "PANEL_COLS", "PANEL_ITEM_SIZE_DP"):
    require(BASE, key + ": true", "legacy cleanup marker " + key)
    if re.search(r"(?m)^\s*%s\s*:" % re.escape(key), active_base):
        fail("removed setting remains active: " + key)
    if re.search(r'\{\s*key:\s*"%s"' % re.escape(key), BASE):
        fail("removed schema item remains: " + key)
    forbid(PERSIST, key, "persistence effect key")
    forbid(MAIN, key, "main position key")
    forbid(EXTRA, key, "extra position key")
    forbid(ENTRY, key, "entry legacy layout key")

for marker, label in (
    ('PANEL_WIDTH_PERCENT: { type: "int", min: 35, max: 100', "width validator"),
    ('PANEL_AUTO_MAX_COLS: { type: "int", min: 1, max: 10', "column validator"),
    ('PANEL_MIN_CARD_WIDTH_DP: { type: "int", min: 48, max: 200', "card width validator"),
    ('PANEL_CARD_HEIGHT_DP: { type: "int", min: 48, max: 160', "card height validator"),
    ('name: "主面板宽度占比(%)"', "width schema"),
    ('min: 35,\n            max: 100', "width schema range"),
    ('name: "自动最大列数"', "column schema"),
    ('min: 1,\n            max: 10', "column schema range"),
    ('name: "按钮最小宽度(dp)"', "card width schema"),
    ('min: 48,\n            max: 200', "card width schema range"),
    ('name: "按钮高度(dp)"', "card height schema"),
    ('min: 48,\n            max: 160', "card height schema range"),
    ('{ type: "section", name: "吸边" }', "dock section"),
    ('name: "启用空闲自动回边"', "snap label"),
    ('name: "无面板时回边延迟(ms)"', "idle label"),
    ('name: "面板显示时回边延迟(ms)"', "panel idle label"),
    ('BALL_PANEL_GAP_DP: { type: "int", min: 0, max: 50, default: 10', "gap default"),
    ('isRemovedSettingsConfigKey(k)', "settings sanitizer"),
    ('settingsSanitizedDirty', "settings writeback"),
):
    require(BASE, marker, label)

for marker, label in (
    ("this.config.PANEL_WIDTH_PERCENT", "runtime width"),
    ("this.config.PANEL_AUTO_MAX_COLS", "runtime columns"),
    ("this.config.PANEL_MIN_CARD_WIDTH_DP", "runtime card width"),
    ("this.config.PANEL_CARD_HEIGHT_DP", "runtime card height"),
    ("    35,\n    100,", "runtime width range"),
    ("    1,\n    10,\n    true\n  );\n  var minCardWidthDp", "runtime column range"),
    ("    48,\n    200,\n    true\n  );\n  var cardHeightDp", "runtime card width range"),
    ("    48,\n    160,\n    true\n  );\n  var gapDp", "runtime card height range"),
    ("var minimumPanelWidth = Math.min(safe.width, this.dp(160));", "minimum panel budget"),
    ("var minX = Number(safe.left);", "main safe left anchor"),
    ("Number(safe.right) - Number(pw)", "main safe right anchor"),
    ("x = minX", "main left-side alignment"),
    ("x = maxX", "main right-side alignment"),
):
    require(MAIN, marker, label)
forbid(MAIN, "var gapDp = Number(this.config.BALL_PANEL_GAP_DP);", "main generic gap dependency")
forbid(MAIN, "BALL_PANEL_GAP_DP || 10", "truthy gap fallback")

extra_start = EXTRA.find("FloatBallAppWM.prototype.getBestPanelPosition = function")
extra_end = EXTRA.find("FloatBallAppWM.prototype.addPanel", extra_start)
if extra_start < 0 or extra_end <= extra_start:
    fail("cannot isolate generic position")
generic_position = EXTRA[extra_start:extra_end]
require(generic_position, "var gapDp = Number(this.config.BALL_PANEL_GAP_DP);", "generic zero-safe gap")
require(generic_position, 'candidates.push(makeCand("bottom"))', "generic auto position")
forbid(generic_position, "PANEL_POS_GRAVITY", "generic removed gravity")
forbid(generic_position, "PANEL_CUSTOM_OFFSET_Y", "generic removed offset")

preview_start = PERSIST.find("FloatBallAppWM.prototype._refreshPreviewInternal = function")
preview_end = PERSIST.find("FloatBallAppWM.prototype.persistUserCfgFromObject", preview_start)
if preview_start < 0 or preview_end <= preview_start:
    fail("cannot isolate preview")
preview = PERSIST[preview_start:preview_end]
for marker, label in (
    ('changedKey === "BALL_PANEL_GAP_DP"', "gap preview refresh"),
    ("var requestedWidth =", "preview requested width"),
    ("var requestedHeight =", "preview requested height"),
    ("android.view.View.MeasureSpec.EXACTLY", "preview exact measure"),
    ("this.getConfiguredBallPosition(this.config)", "configured ball position"),
    ("this.getMainPanelPosition(pw, ph, bx, by, ballSize)", "shared main position"),
):
    require(preview, marker, label)
forbid(preview, "this.computePanelX(", "legacy preview x")
forbid(preview, "this.tryAdjustPanelY(", "legacy preview y")

forbid(EXTRA, "FloatBallAppWM.prototype.computePanelX = function", "legacy computePanelX definition")
forbid(EXTRA, "FloatBallAppWM.prototype.tryAdjustPanelY = function", "legacy tryAdjustPanelY definition")
forbid(EXTRA, "self.computePanelX(", "legacy viewer computePanelX call")
forbid(EXTRA, "self.tryAdjustPanelY(", "legacy viewer tryAdjustPanelY call")
require(EXTRA, "var viewerPos = self.getBestPanelPosition(", "viewer generic position")
require(ENTRY, "app.getMainPanelResponsiveSpec", "entry adaptive layout status")

require(WORKFLOW, "python3 scripts/verify_panel_layout_settings_cleanup.py", "workflow")
print("OK panel_layout_settings_cleanup ranges=expanded removed=3 preview=shared gap=generic-only edge=same-side")
