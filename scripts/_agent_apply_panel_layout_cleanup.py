#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8", newline="\n")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("PATCH FAIL %s count=%d" % (label, count))
    return text.replace(old, new, 1)


def replace_regex_once(text, pattern, repl, label, flags=0):
    new_text, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit("PATCH FAIL %s count=%d" % (label, count))
    return new_text


# ---------------------------------------------------------------------------
# th_01_base.js: ranges, removed settings, schema cleanup, labels
# ---------------------------------------------------------------------------
path = "code/th_01_base.js"
text = read(path)
text = replace_once(text, "// @version 1.1.8", "// @version 1.1.9", "base version")

old = '''function isDeprecatedThemeConfigKey(key) {
  return DEPRECATED_THEME_CONFIG_KEYS[String(key || "")] === true;
}

function stripDeprecatedThemeSchemaItems(value) {'''
new = '''function isDeprecatedThemeConfigKey(key) {
  return DEPRECATED_THEME_CONFIG_KEYS[String(key || "")] === true;
}

// 已从设置页和运行时语义中移除；保留识别表仅用于清理旧 SQLite / Schema 数据。
var REMOVED_SETTINGS_CONFIG_KEYS = {
  PANEL_POS_GRAVITY: true,
  PANEL_CUSTOM_OFFSET_Y: true,
  SAVE_THROTTLE_MS: true
};

function isRemovedSettingsConfigKey(key) {
  return REMOVED_SETTINGS_CONFIG_KEYS[String(key || "")] === true;
}

function stripDeprecatedThemeSchemaItems(value) {'''
text = replace_once(text, old, new, "removed settings map")
text = replace_once(
    text,
    "            isDeprecatedThemeConfigKey(item.key)) {",
    "            (isDeprecatedThemeConfigKey(item.key) || isRemovedSettingsConfigKey(item.key))) {",
    "schema removed-key cleanup",
)
text = replace_once(
    text,
    "      if (isDeprecatedThemeConfigKey(k)) continue;",
    "      if (isDeprecatedThemeConfigKey(k) || isRemovedSettingsConfigKey(k)) continue;",
    "settings removed-key cleanup",
)

for old_line, new_line, label in (
    ('    PANEL_WIDTH_PERCENT: { type: "int", min: 60, max: 100, default: 90 },',
     '    PANEL_WIDTH_PERCENT: { type: "int", min: 35, max: 100, default: 90 },',
     "width validator"),
    ('    PANEL_AUTO_MAX_COLS: { type: "int", min: 1, max: 6, default: 6 },',
     '    PANEL_AUTO_MAX_COLS: { type: "int", min: 1, max: 10, default: 6 },',
     "columns validator"),
    ('    PANEL_MIN_CARD_WIDTH_DP: { type: "int", min: 72, max: 160, default: 92 },',
     '    PANEL_MIN_CARD_WIDTH_DP: { type: "int", min: 48, max: 200, default: 92 },',
     "card width validator"),
    ('    PANEL_CARD_HEIGHT_DP: { type: "int", min: 56, max: 120, default: 78 },',
     '    PANEL_CARD_HEIGHT_DP: { type: "int", min: 48, max: 160, default: 78 },',
     "card height validator"),
    ('    BALL_PANEL_GAP_DP: { type: "int", min: 0, max: 50, default: 8 },',
     '    BALL_PANEL_GAP_DP: { type: "int", min: 0, max: 50, default: 10 },',
     "gap validator default"),
):
    text = replace_once(text, old_line, new_line, label)

for old_line, label in (
    ('    PANEL_POS_GRAVITY: { type: "enum", values: ["top", "bottom", "left", "right", "auto"], default: "bottom" },\n', "position validator"),
    ('    PANEL_CUSTOM_OFFSET_Y: { type: "int", min: -500, max: 500, default: 0 },\n', "offset validator"),
    ('    SAVE_THROTTLE_MS: { type: "int", min: 0, max: 5000, default: 220 },\n', "save throttle validator"),
    ('  SAVE_THROTTLE_MS: 250,\n', "save throttle internal constant"),
    ('        SAVE_THROTTLE_MS: 220,\n', "save throttle default"),
    ('        PANEL_POS_GRAVITY: "bottom",\n', "position default"),
    ('        PANEL_CUSTOM_OFFSET_Y: 0,\n', "offset default"),
):
    text = replace_once(text, old_line, "", label)

# Update the four schema ranges.
for old_block, new_block, label in (
    ('''            min: 60,
            max: 100,
            step: 1
        },
        {
            key: "PANEL_AUTO_MAX_COLS",''',
     '''            min: 35,
            max: 100,
            step: 1
        },
        {
            key: "PANEL_AUTO_MAX_COLS",''',
     "width schema range"),
    ('''            min: 1,
            max: 6,
            step: 1
        },
        {
            key: "PANEL_MIN_CARD_WIDTH_DP",''',
     '''            min: 1,
            max: 10,
            step: 1
        },
        {
            key: "PANEL_MIN_CARD_WIDTH_DP",''',
     "columns schema range"),
    ('''            min: 72,
            max: 160,
            step: 2
        },
        {
            key: "PANEL_CARD_HEIGHT_DP",''',
     '''            min: 48,
            max: 200,
            step: 2
        },
        {
            key: "PANEL_CARD_HEIGHT_DP",''',
     "card width schema range"),
    ('''            min: 56,
            max: 120,
            step: 2
        },
        { key: "PANEL_ROWS",''',
     '''            min: 48,
            max: 160,
            step: 2
        },
        { key: "PANEL_ROWS",''',
     "card height schema range"),
):
    text = replace_once(text, old_block, new_block, label)

text = replace_once(
    text,
    '        { type: "section", name: "吸边与位置" },',
    '        { type: "section", name: "吸边" },',
    "dock section title",
)
text = replace_regex_once(
    text,
    r'''\n        \{ key: "PANEL_POS_GRAVITY", name: "面板默认位置", type: "single_choice", options: \[
            \{ label: "自动 \(Auto\)", value: "auto" \},
            \{ label: "下方 \(Bottom\)", value: "bottom" \},
            \{ label: "上方 \(Top\)", value: "top" \}
        \]\},
        \{ key: "PANEL_CUSTOM_OFFSET_Y", name: "手动垂直偏移\(dp\)", type: "int", min: -500, max: 500, step: 1 \},''',
    "",
    "remove position schema items",
)
text = replace_once(
    text,
    '        { key: "SAVE_THROTTLE_MS", name: "保存位置节流(ms)", type: "int", min: 0, max: 5000, step: 10 },\n',
    "",
    "remove save throttle schema item",
)
text = replace_once(
    text,
    '{ key: "ENABLE_SNAP_TO_EDGE", name: "启用自动吸边", type: "bool" }',
    '{ key: "ENABLE_SNAP_TO_EDGE", name: "启用空闲自动回边", type: "bool" }',
    "snap label",
)
text = replace_once(
    text,
    '{ key: "DOCK_AFTER_IDLE_MS", name: "无操作吸边延迟(ms)", type: "int", min: 200, max: 8000, step: 100 }',
    '{ key: "DOCK_AFTER_IDLE_MS", name: "无面板时回边延迟(ms)", type: "int", min: 200, max: 8000, step: 100 }',
    "idle dock label",
)
text = replace_once(
    text,
    '{ key: "PANEL_IDLE_CLOSE_AND_DOCK_MS", name: "面板无操作：关面板再吸边(ms)", type: "int", min: 200, max: 12000, step: 100 }',
    '{ key: "PANEL_IDLE_CLOSE_AND_DOCK_MS", name: "面板显示时回边延迟(ms)", type: "int", min: 200, max: 12000, step: 100 }',
    "panel dock label",
)

text = replace_once(
    text,
    '''                schemaItemDiffers("PANEL_CARD_HEIGHT_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("TOOLAPP_BACK_GESTURE_MODE", ["name", "type"]) ||''',
    '''                schemaItemDiffers("PANEL_CARD_HEIGHT_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("ENABLE_SNAP_TO_EDGE", ["name", "type"]) ||
                schemaItemDiffers("DOCK_AFTER_IDLE_MS", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("PANEL_IDLE_CLOSE_AND_DOCK_MS", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("TOOLAPP_BACK_GESTURE_MODE", ["name", "type"]) ||''',
    "schema renamed label refresh",
)
write(path, text)


# ---------------------------------------------------------------------------
# th_15_main_panel.js: expanded runtime ranges and zero-safe gap
# ---------------------------------------------------------------------------
path = "code/th_15_main_panel.js"
text = read(path)
text = replace_once(text, "// @version 1.5.0", "// @version 1.5.1", "main version")
for old, new, label in (
    ('''    60,
    100,''', '''    35,
    100,''', "main width range"),
    ('''    1,
    6,
    true
  );
  var minCardWidthDp''', '''    1,
    10,
    true
  );
  var minCardWidthDp''', "main column range"),
    ('''    72,
    160,
    true
  );
  var cardHeightDp''', '''    48,
    200,
    true
  );
  var cardHeightDp''', "main card width range"),
    ('''    56,
    120,
    true
  );
  var gapDp''', '''    48,
    160,
    true
  );
  var gapDp''', "main card height range"),
):
    text = replace_once(text, old, new, label)
text = replace_once(
    text,
    "  var minimumPanelWidth = Math.min(safe.width, this.dp(220));",
    "  var minimumPanelWidth = Math.min(safe.width, this.dp(160));",
    "minimum panel budget",
)
text = replace_once(
    text,
    "  var gap = this.dp(this.config.BALL_PANEL_GAP_DP || 10);",
    '''  var gapDp = Number(this.config.BALL_PANEL_GAP_DP);
  if (isNaN(gapDp)) gapDp = 10;
  gapDp = this.clamp(gapDp, 0, 50);
  var gap = this.dp(gapDp);''',
    "main zero-safe gap",
)
write(path, text)


# ---------------------------------------------------------------------------
# th_15_extra.js: remove stale position settings and preserve zero gap
# ---------------------------------------------------------------------------
path = "code/th_15_extra.js"
text = read(path)
text = replace_once(text, "// @version 1.1.13", "// @version 1.1.14", "extra version")
start = text.index("FloatBallAppWM.prototype.getBestPanelPosition = function")
end = text.index("FloatBallAppWM.prototype.computePanelX", start)
replacement = '''FloatBallAppWM.prototype.getBestPanelPosition = function(pw, ph, bx, by, ballSize) {
  var gapDp = Number(this.config.BALL_PANEL_GAP_DP);
  if (isNaN(gapDp)) gapDp = 10;
  gapDp = this.clamp(gapDp, 0, 50);
  var gap = this.dp(gapDp);
  var sw = this.state.screen.w;
  var sh = this.state.screen.h;
  var candidates = [];

  function makeCand(type) {
    if (type === "bottom") {
      return {
        x: Math.max(0, Math.min(sw - pw, bx + (ballSize - pw) / 2)),
        y: by + ballSize + gap,
        type: "bottom"
      };
    }
    if (type === "top") {
      return {
        x: Math.max(0, Math.min(sw - pw, bx + (ballSize - pw) / 2)),
        y: by - ph - gap,
        type: "top"
      };
    }
    if (type === "right") {
      return { x: bx + ballSize + gap, y: by, type: "right" };
    }
    if (type === "left") {
      return { x: bx - pw - gap, y: by, type: "left" };
    }
    return null;
  }

  // 通用旧面板固定采用自动候选顺序；主面板使用 getMainPanelPosition()。
  candidates.push(makeCand("bottom"));
  candidates.push(makeCand("top"));
  candidates.push(makeCand("right"));
  candidates.push(makeCand("left"));

  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (c && c.x >= 0 && c.x + pw <= sw && c.y >= 0 && c.y + ph <= sh) {
      return c;
    }
  }

  var best = candidates[0] || { x: 0, y: 0, type: "bottom" };
  best.x = Math.max(0, Math.min(sw - pw, best.x));
  best.y = Math.max(0, Math.min(sh - ph, best.y));
  return best;
};

'''
text = text[:start] + replacement + text[end:]
write(path, text)


# ---------------------------------------------------------------------------
# th_05_persistence.js: exact preview positioning and cleaned effect keys
# ---------------------------------------------------------------------------
path = "code/th_05_persistence.js"
text = read(path)
text = replace_once(text, "// @version 1.0.4", "// @version 1.0.5", "persistence version")
text = replace_once(
    text,
    '''         k === "PANEL_LABEL_TOP_MARGIN_DP" ||
         k === "PANEL_POS_GRAVITY" ||
         k === "PANEL_CUSTOM_OFFSET_Y" ||
         k === "BALL_PANEL_GAP_DP";''',
    '''         k === "PANEL_LABEL_TOP_MARGIN_DP" ||
         k === "BALL_PANEL_GAP_DP";''',
    "cleaned panel effect keys",
)
text = replace_once(
    text,
    '            if (changedKey === "BALL_SIZE_DP") needPanel = true;',
    '            if (changedKey === "BALL_SIZE_DP" || changedKey === "BALL_PANEL_GAP_DP") needPanel = true;',
    "gap preview refresh",
)

fn_start = text.index("FloatBallAppWM.prototype._refreshPreviewInternal = function")
block_start = text.index("        if (needPanel) {", fn_start)
block_end_marker = "\n        }\n\n    } catch(e)"
block_end = text.index(block_end_marker, block_start) + len("\n        }")
new_block = '''        if (needPanel) {
            var panel = this.buildPanelView("main");
            var requestedLp = panel.getLayoutParams();
            var requestedWidth = Number(requestedLp && requestedLp.width || 0);
            var requestedHeight = Number(requestedLp && requestedLp.height || 0);
            var exactPreviewSize = requestedWidth > 0 && requestedHeight > 0;
            var pw;
            var ph;

            if (exactPreviewSize) {
                panel.measure(
                    android.view.View.MeasureSpec.makeMeasureSpec(
                        requestedWidth,
                        android.view.View.MeasureSpec.EXACTLY
                    ),
                    android.view.View.MeasureSpec.makeMeasureSpec(
                        requestedHeight,
                        android.view.View.MeasureSpec.EXACTLY
                    )
                );
                pw = requestedWidth;
                ph = requestedHeight;
            } else {
                var maxH = Math.floor(this.state.screen.h * 0.75);
                panel.measure(
                    android.view.View.MeasureSpec.makeMeasureSpec(
                        this.state.screen.w,
                        android.view.View.MeasureSpec.AT_MOST
                    ),
                    android.view.View.MeasureSpec.makeMeasureSpec(
                        maxH,
                        android.view.View.MeasureSpec.AT_MOST
                    )
                );
                pw = panel.getMeasuredWidth();
                ph = Math.min(panel.getMeasuredHeight(), maxH);
            }

            var di = this.getDockInfo();
            var configuredPos = null;
            try {
                if (this.getConfiguredBallPosition) {
                    configuredPos = this.getConfiguredBallPosition(this.config);
                }
            } catch (eConfiguredPos) {
                configuredPos = null;
            }
            var bx = configuredPos
                ? Number(configuredPos.logicalX)
                : Number(this.state.ballLp && this.state.ballLp.x || 0);
            var by = configuredPos
                ? Number(configuredPos.y)
                : Number(this.state.ballLp && this.state.ballLp.y || 0);
            var ballSize = configuredPos
                ? Number(configuredPos.ballSize)
                : Number(di.ballSize);
            var pos = this.getMainPanelPosition
                ? this.getMainPanelPosition(pw, ph, bx, by, ballSize)
                : { x: 0, y: 0 };

            var oldPanel = this.state.panel;
            var oldAdded = this.state.addedPanel;
            this.addPanel(panel, pos.x, pos.y, "main");

            if (oldAdded && oldPanel && oldPanel !== panel) {
                try {
                    if (this.safeRemoveView) {
                        this.safeRemoveView(oldPanel, "panel-preview-replaced", {
                            immediate: true,
                            resetVisual: false,
                            keepInvisible: true
                        });
                    } else {
                        this.state.wm.removeView(oldPanel);
                    }
                } catch(eRemovePreview) {
                    safeLog(this.L, "w", "remove old preview panel fail: " + String(eRemovePreview));
                }
            }
        }'''
text = text[:block_start] + new_block + text[block_end:]
write(path, text)


# ---------------------------------------------------------------------------
# Existing verification contracts: synchronize module versions and model floor
# ---------------------------------------------------------------------------
for verify_path in sorted((ROOT / "scripts").glob("verify_main_panel_*.py")):
    body = verify_path.read_text(encoding="utf-8")
    body = body.replace('"1.1.8"', '"1.1.9"')
    body = body.replace('"1.0.4"', '"1.0.5"')
    body = body.replace('"1.5.0"', '"1.5.1"')
    body = body.replace('"1.1.13"', '"1.1.14"')
    verify_path.write_text(body, encoding="utf-8", newline="\n")

path = "scripts/verify_main_panel_adaptive_layout.py"
text = read(path)
text = replace_once(
    text,
    "max(min(safe_width, 220), math.floor(safe_width * width_percent / 100))",
    "max(min(safe_width, 160), math.floor(safe_width * width_percent / 100))",
    "adaptive model minimum budget",
)
write(path, text)


# ---------------------------------------------------------------------------
# Schema verifier: new ranges and removed setting contract
# ---------------------------------------------------------------------------
path = "scripts/verify_schema_validator.py"
text = read(path)
for old, new, label in (
    ('"PANEL_WIDTH_PERCENT": {"type": "int", "name": "主面板宽度占比(%)", "min": 60, "max": 100}',
     '"PANEL_WIDTH_PERCENT": {"type": "int", "name": "主面板宽度占比(%)", "min": 35, "max": 100}',
     "schema verify width"),
    ('"PANEL_AUTO_MAX_COLS": {"type": "int", "name": "自动最大列数", "min": 1, "max": 6}',
     '"PANEL_AUTO_MAX_COLS": {"type": "int", "name": "自动最大列数", "min": 1, "max": 10}',
     "schema verify columns"),
    ('"PANEL_MIN_CARD_WIDTH_DP": {"type": "int", "name": "按钮最小宽度(dp)", "min": 72, "max": 160}',
     '"PANEL_MIN_CARD_WIDTH_DP": {"type": "int", "name": "按钮最小宽度(dp)", "min": 48, "max": 200}',
     "schema verify card width"),
    ('"PANEL_CARD_HEIGHT_DP": {"type": "int", "name": "按钮高度(dp)", "min": 56, "max": 120}',
     '"PANEL_CARD_HEIGHT_DP": {"type": "int", "name": "按钮高度(dp)", "min": 48, "max": 160}',
     "schema verify card height"),
):
    text = replace_once(text, old, new, label)

text = replace_once(
    text,
    '''REMOVED_THEME_KEYS = [
    "SETTINGS_THEME",''',
    '''REMOVED_SETTINGS_KEYS = [
    "PANEL_POS_GRAVITY",
    "PANEL_CUSTOM_OFFSET_Y",
    "SAVE_THROTTLE_MS",
]

REMOVED_THEME_KEYS = [
    "SETTINGS_THEME",''',
    "removed settings verifier list",
)
text = replace_once(
    text,
    '''    active_config_src = re.sub(
        r"var DEPRECATED_THEME_CONFIG_KEYS = \\{.*?\\};",
        "",
        src,
        flags=re.S,
    )
    for removed_key in REMOVED_THEME_KEYS:''',
    '''    active_config_src = re.sub(
        r"var DEPRECATED_THEME_CONFIG_KEYS = \\{.*?\\};",
        "",
        src,
        flags=re.S,
    )
    active_config_src = re.sub(
        r"var REMOVED_SETTINGS_CONFIG_KEYS = \\{.*?\\};",
        "",
        active_config_src,
        flags=re.S,
    )
    for removed_key in REMOVED_SETTINGS_KEYS:
        if re.search(r"(?m)^\\s*%s\\s*:" % re.escape(removed_key), active_config_src):
            errors.append("removed setting validator/default remains: " + removed_key)
        if re.search(r'\\{\\s*key:\\s*"%s"' % re.escape(removed_key), src):
            errors.append("removed setting schema remains: " + removed_key)
        if removed_key in persistence:
            errors.append("removed setting effect remains: " + removed_key)
        if removed_key not in src:
            errors.append("removed setting cleanup marker missing: " + removed_key)
    for removed_key in REMOVED_THEME_KEYS:''',
    "removed settings verifier checks",
)
write(path, text)


# ---------------------------------------------------------------------------
# Dedicated settings cleanup verifier
# ---------------------------------------------------------------------------
verifier = r'''#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = (ROOT / "code/th_01_base.js").read_text(encoding="utf-8")
PERSIST = (ROOT / "code/th_05_persistence.js").read_text(encoding="utf-8")
MAIN = (ROOT / "code/th_15_main_panel.js").read_text(encoding="utf-8")
EXTRA = (ROOT / "code/th_15_extra.js").read_text(encoding="utf-8")
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


version(BASE, "1.1.9", "th_01_base.js")
version(PERSIST, "1.0.5", "th_05_persistence.js")
version(MAIN, "1.5.1", "th_15_main_panel.js")
version(EXTRA, "1.1.14", "th_15_extra.js")

active_base = re.sub(
    r"var REMOVED_SETTINGS_CONFIG_KEYS = \{.*?\};",
    "",
    BASE,
    flags=re.S,
)
for key in ("PANEL_POS_GRAVITY", "PANEL_CUSTOM_OFFSET_Y", "SAVE_THROTTLE_MS"):
    require(BASE, key + ": true", "legacy cleanup marker " + key)
    if re.search(r"(?m)^\s*%s\s*:" % re.escape(key), active_base):
        fail("removed setting remains active: " + key)
    if re.search(r'\{\s*key:\s*"%s"' % re.escape(key), BASE):
        fail("removed schema item remains: " + key)
    forbid(PERSIST, key, "persistence effect key")
    forbid(MAIN, key, "main position key")
    forbid(EXTRA, key, "extra position key")

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
    ("var gapDp = Number(this.config.BALL_PANEL_GAP_DP);", "main zero-safe gap"),
    ("gapDp = this.clamp(gapDp, 0, 50);", "main gap clamp"),
):
    require(MAIN, marker, label)
forbid(MAIN, "BALL_PANEL_GAP_DP || 10", "truthy gap fallback")

extra_start = EXTRA.find("FloatBallAppWM.prototype.getBestPanelPosition = function")
extra_end = EXTRA.find("FloatBallAppWM.prototype.computePanelX", extra_start)
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

require(WORKFLOW, "python3 scripts/verify_panel_layout_settings_cleanup.py", "workflow")
print("OK panel_layout_settings_cleanup ranges=expanded removed=3 preview=shared gap=zero-safe")
'''
write("scripts/verify_panel_layout_settings_cleanup.py", verifier)


# Add verifier to CI.
path = ".github/workflows/verify.yml"
text = read(path)
text = replace_once(
    text,
    "          python3 scripts/verify_main_panel_adaptive_layout.py\n",
    "          python3 scripts/verify_main_panel_adaptive_layout.py\n"
    "          python3 scripts/verify_panel_layout_settings_cleanup.py\n",
    "verify workflow insertion",
)
write(path, text)


# Documentation: keep existing contract phrases and add the new settings semantics.
path = "README.md"
text = read(path)
text = replace_once(
    text,
    "- 主按钮面板采用可配置自适应网格，宽度占比只用于确定列数预算，由卡片、精确间距和可视行数计算网格，再由网格决定面板宽高；WindowManager 使用同一精确尺寸，避免右侧额外空白；默认背景透明度为 0.92，并继续支持实时运行状态、拖动排序、分页吸附、新增和编辑按钮直接保存、单页隐藏分页圆点和关闭闪烁。",
    "- 主按钮面板采用可配置自适应网格，宽度占比只用于确定列数预算，由卡片、精确间距和可视行数计算网格，再由网格决定面板宽高；WindowManager 使用同一精确尺寸，避免右侧额外空白；布局支持 35%～100% 宽度预算、最多 10 列、48～200dp 分列参考宽度和 48～160dp 按钮高度；主面板按悬浮球停靠边缘自动展开，球与面板距离支持 0dp；默认背景透明度为 0.92，并继续支持实时运行状态、拖动排序、分页吸附、新增和编辑按钮直接保存、单页隐藏分页圆点和关闭闪烁。",
    "README main panel capability",
)
write(path, text)

for path in ("ARCHITECTURE.md", "STRUCTURE.md"):
    text = read(path)
    marker = "网格决定面板宽高"
    if marker not in text:
        raise SystemExit("PATCH FAIL %s missing grid marker" % path)
    note = (
        "\n\n主面板布局参数范围为：宽度预算 35%～100%、自动最大列数 1～10、"
        "分列参考宽度 48～200dp、按钮高度 48～160dp。主面板位置统一根据悬浮球"
        "停靠边缘自动计算，球与面板距离允许设为 0dp；已移除不进入当前运行链的"
        "面板默认位置、手动垂直偏移和保存位置节流设置。\n"
    )
    if "宽度预算 35%～100%" not in text:
        text = text.rstrip() + note
    write(path, text)

print("OK applied panel layout settings cleanup")
