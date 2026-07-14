#!/usr/bin/env python3
# 验证主面板使用可配置自适应网格，并通过现有设置链即时生效。

from pathlib import Path
import math
import re

ROOT = Path(__file__).resolve().parents[1]
BASE_PATH = ROOT / "code" / "th_01_base.js"
PERSIST_PATH = ROOT / "code" / "th_05_persistence.js"
MAIN_PATH = ROOT / "code" / "th_15_main_panel.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
ENTRY_PATH = ROOT / "ToolHub.js"
SCHEMA_VERIFY_PATH = ROOT / "scripts" / "verify_schema_validator.py"

BASE = BASE_PATH.read_text(encoding="utf-8")
PERSIST = PERSIST_PATH.read_text(encoding="utf-8")
MAIN = MAIN_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")
ENTRY = ENTRY_PATH.read_text(encoding="utf-8")
SCHEMA_VERIFY = SCHEMA_VERIFY_PATH.read_text(encoding="utf-8")

DOC_PATHS = (
    ROOT / "README.md",
    ROOT / "ARCHITECTURE.md",
    ROOT / "STRUCTURE.md",
)


def fail(message):
    raise SystemExit("FAIL main-panel-adaptive-layout: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


def module_version(text, expected, name):
    match = re.search(
        r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$",
        text,
    )
    if not match or match.group(1) != expected:
        fail("%s expected version %s" % (name, expected))


module_version(BASE, "1.1.7", "th_01_base.js")
module_version(PERSIST, "1.0.4", "th_05_persistence.js")
module_version(MAIN, "1.4.0", "th_15_main_panel.js")

for method in (
    "getMainPanelSafeBounds",
    "getMainPanelResponsiveSpec",
    "createMainPanelFunctionCard",
    "buildMainPanelView",
):
    marker = "FloatBallAppWM.prototype.%s = function" % method
    if MAIN.count(marker) != 1:
        fail("%s must have exactly one definition" % method)

responsive_start = MAIN.find(
    "FloatBallAppWM.prototype.getMainPanelResponsiveSpec = function"
)
responsive_end = MAIN.find(
    "FloatBallAppWM.prototype.createMainPanelRippleBackground",
    responsive_start,
)
if responsive_start < 0 or responsive_end <= responsive_start:
    fail("cannot isolate responsive specification")
responsive = MAIN[responsive_start:responsive_end]

for marker, label in (
    ("this.config.PANEL_WIDTH_PERCENT", "width percentage"),
    ("this.config.PANEL_AUTO_MAX_COLS", "automatic max columns"),
    ("this.config.PANEL_MIN_CARD_WIDTH_DP", "minimum card width"),
    ("this.config.PANEL_CARD_HEIGHT_DP", "card height"),
    ("this.config.PANEL_GAP_DP", "configurable gap"),
    ("this.config.PANEL_PADDING_DP", "configurable padding"),
    ("this.config.PANEL_ROWS", "configurable visible rows"),
    ("Math.floor(safe.width * widthPercent / 100)", "safe-width percentage"),
    ("(innerWidth + gap) / (minCardWidth + gap)", "automatic column formula"),
    ("if (cols > autoMaxCols) cols = autoMaxCols", "max-column clamp"),
    ("while (cols > 1)", "narrow-screen touch-width protection"),
    ("Math.floor(innerWidth / cols)", "equal-width distribution"),
    ("layoutMode: 'adaptive'", "adaptive mode marker"),
    ("gridInset: gridInset", "centered grid remainder"),
    ("safeWidthDp: safe.width / density", "layout diagnostics"),
):
    require(responsive, marker, label)

for fragment, label in (
    ("targetWidthDp", "fixed target width"),
    ("safeWidthDp < 348", "phone breakpoint"),
    ("safeWidthDp >= 600", "tablet breakpoint"),
    ("this.dp(304)", "fixed narrow width"),
    ("this.dp(344)", "fixed regular width"),
    ("this.dp(424)", "fixed wide width"),
):
    forbid(responsive, fragment, label)

require(
    MAIN,
    "grid.setPadding(spec.gridInset, 0, spec.gridInset, 0)",
    "grid centering",
)
require(
    MAIN,
    "main panel adaptive layout cols=",
    "adaptive layout diagnostics",
)

config_keys = (
    "PANEL_WIDTH_PERCENT",
    "PANEL_AUTO_MAX_COLS",
    "PANEL_MIN_CARD_WIDTH_DP",
    "PANEL_CARD_HEIGHT_DP",
)
for key in config_keys:
    require(BASE, key + ":", "validator/default key " + key)
    require(BASE, 'key: "%s"' % key, "schema key " + key)
    require(PERSIST, 'k === "%s"' % key, "immediate effect key " + key)
    require(
        BASE,
        'sStr.indexOf("%s") < 0' % key,
        "schema refresh marker " + key,
    )

for marker, label in (
    ('name: "主面板宽度占比(%)"', "width setting label"),
    ('name: "自动最大列数"', "max column setting label"),
    ('name: "按钮最小宽度(dp)"', "minimum width setting label"),
    ('name: "按钮高度(dp)"', "height setting label"),
    ('sStr.indexOf("\\\"PANEL_COLS\\\"") >= 0', "legacy column schema cleanup"),
    ('sStr.indexOf("\\\"PANEL_ITEM_SIZE_DP\\\"") >= 0', "legacy size schema cleanup"),
    ('changedKey.indexOf("PANEL_") === 0', "settings preview refresh"),
    ("this.scheduleSettingsEffectRefresh(key, themeChanged, panelChanged)", "saved settings refresh"),
):
    require(BASE + "\n" + PERSIST, marker, label)

schema_start = BASE.find("    defaultSchema: [")
schema_end = BASE.find("    _schemaCache:", schema_start)
if schema_start < 0 or schema_end <= schema_start:
    fail("cannot isolate default settings schema")
default_schema = BASE[schema_start:schema_end]
for old_key in ("PANEL_COLS", "PANEL_ITEM_SIZE_DP"):
    forbid(
        default_schema,
        'key: "%s"' % old_key,
        "legacy visible setting " + old_key,
    )

for key in config_keys:
    require(
        SCHEMA_VERIFY,
        '"%s":' % key,
        "schema validator expectation " + key,
    )

for verifier_name in (
    "verify_main_panel_runtime_status.py",
    "verify_main_panel_drag_sort.py",
    "verify_main_panel_paging.py",
    "verify_main_panel_close_lifecycle.py",
):
    verifier = (ROOT / "scripts" / verifier_name).read_text(encoding="utf-8")
    require(verifier, "1.4.0", verifier_name + " current version")
    forbid(verifier, "1.3.0", verifier_name + " stale version")

require(
    WORKFLOW,
    "python3 scripts/verify_main_panel_adaptive_layout.py",
    "workflow adaptive verification",
)
require(
    ENTRY,
    "var TOOLHUB_ENTRY_VERSION = 20260714081104;",
    "unchanged entry version",
)

for path in DOC_PATHS:
    text = path.read_text(encoding="utf-8")
    require(
        text,
        "可配置自适应网格",
        path.name + " adaptive layout documentation",
    )

# 典型安全宽度模型：窄屏、普通手机、宽屏和大屏应自然得到不同列数。
def adaptive_spec(
    safe_width,
    width_percent=90,
    padding=12,
    gap=8,
    minimum_card=92,
    max_columns=6,
):
    panel = max(min(safe_width, 220), math.floor(safe_width * width_percent / 100))
    panel = min(safe_width, panel)
    inner = panel - padding * 2
    columns = math.floor((inner + gap) / (minimum_card + gap))
    columns = max(1, min(max_columns, columns))
    while columns > 1:
        candidate = math.floor(inner / columns) - gap
        if candidate >= 48:
            break
        columns -= 1
    card = max(48, math.floor(inner / columns) - gap)
    used = columns * (card + gap)
    return panel, inner, columns, card, used


expected_columns = {
    320: 2,
    392: 3,
    600: 5,
    800: 6,
}
for safe_width, expected in expected_columns.items():
    panel, inner, columns, card, used = adaptive_spec(safe_width)
    if columns != expected:
        fail(
            "adaptive model width=%d expected cols=%d got=%d"
            % (safe_width, expected, columns)
        )
    if panel > safe_width:
        fail("panel exceeds safe width")
    if used > inner:
        fail("grid exceeds inner width")
    if card < 48:
        fail("card touch width below safety floor")

for path in (BASE_PATH, PERSIST_PATH, MAIN_PATH):
    raw = path.read_bytes()
    if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
        fail(path.name + " EOF must be exactly one LF")

print(
    "OK main_panel_adaptive_layout "
    "model=2/3/5/6 configurable=width,max_cols,min_width,height "
    "preview=immediate legacy_schema=hidden"
)
