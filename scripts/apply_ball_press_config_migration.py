#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "code" / "th_01_base.js"
THEME = ROOT / "code" / "th_04_theme.js"
COLOROS = ROOT / "scripts" / "verify_coloros_rhino_color_safety.py"


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL %s expected once, found %d in %s" % (label, count, path))
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


base = BASE.read_text(encoding="utf-8")
base = base.replace("// @version 1.1.11", "// @version 1.1.12", 1)

old_removed = '''  PANEL_COLS: true,
  PANEL_ITEM_SIZE_DP: true
};'''
new_removed = '''  PANEL_COLS: true,
  PANEL_ITEM_SIZE_DP: true,
  BALL_RIPPLE_ALPHA_LIGHT: true,
  BALL_RIPPLE_ALPHA_DARK: true
};'''
if base.count(old_removed) != 1:
    raise SystemExit("FAIL removed key map anchor mismatch")
base = base.replace(old_removed, new_removed, 1)

old_schema = '    BALL_IDLE_ALPHA: { type: "float", min: 0.1, max: 1.0, default: 0.6 },'
new_schema = '''    BALL_IDLE_ALPHA: { type: "float", min: 0.1, max: 1.0, default: 0.6 },
    BALL_PRESS_ALPHA_LIGHT: { type: "float", min: 0, max: 1, default: 0.22 },
    BALL_PRESS_ALPHA_DARK: { type: "float", min: 0, max: 1, default: 0.28 },
    BALL_PRESS_ALPHA_MIGRATION_VERSION: { type: "int", min: 0, max: 9999, default: 1 },'''
if base.count(old_schema) != 1:
    raise SystemExit("FAIL press schema anchor mismatch")
base = base.replace(old_schema, new_schema, 1)

old_defaults = '        BALL_IDLE_ALPHA: 0.6,'
new_defaults = '''        BALL_IDLE_ALPHA: 0.6,
        BALL_PRESS_ALPHA_LIGHT: CONST_BALL_PRESS_ALPHA_LIGHT,
        BALL_PRESS_ALPHA_DARK: CONST_BALL_PRESS_ALPHA_DARK,
        BALL_PRESS_ALPHA_MIGRATION_VERSION: 1,'''
if base.count(old_defaults) != 1:
    raise SystemExit("FAIL press defaults anchor mismatch")
base = base.replace(old_defaults, new_defaults, 1)

old_user_decl = '''        var merged = JSON.parse(JSON.stringify(this.defaultSettings));
        var loaded = false;

        if (txt) {
            try {
                var user = JSON.parse(txt);'''
new_user_decl = '''        var merged = JSON.parse(JSON.stringify(this.defaultSettings));
        var loaded = false;
        var user = null;

        if (txt) {
            try {
                user = JSON.parse(txt);'''
if base.count(old_user_decl) != 1:
    raise SystemExit("FAIL settings user declaration anchor mismatch")
base = base.replace(old_user_decl, new_user_decl, 1)

old_migration_anchor = '''        } catch (ePanelVisualMigration) {}

        // 旧自由坐标或高/低预设一次性迁移为“左/右 + 单一高度百分比”。'''
new_migration_anchor = '''        } catch (ePanelVisualMigration) {}

        // 悬浮球按压透明度配置迁移：
        // 1. 将旧 Ripple 命名键迁移到 Press 命名键；
        // 2. 已存在的新键优先，避免覆盖用户当前配置；
        // 3. 迁移后由清理表移除旧键，不再进入运行时。
        var ballPressAlphaMigrationDirty = false;
        try {
            var ballPressMigrationVersion = 0;
            if (user && typeof user.BALL_PRESS_ALPHA_MIGRATION_VERSION !== "undefined") {
                ballPressMigrationVersion = Number(user.BALL_PRESS_ALPHA_MIGRATION_VERSION);
                if (isNaN(ballPressMigrationVersion)) ballPressMigrationVersion = 0;
            }

            var hasLegacyPressLight = !!(user && typeof user.BALL_RIPPLE_ALPHA_LIGHT !== "undefined");
            var hasLegacyPressDark = !!(user && typeof user.BALL_RIPPLE_ALPHA_DARK !== "undefined");
            var hasCurrentPressLight = !!(user && typeof user.BALL_PRESS_ALPHA_LIGHT !== "undefined");
            var hasCurrentPressDark = !!(user && typeof user.BALL_PRESS_ALPHA_DARK !== "undefined");

            if (!loaded) {
                merged.BALL_PRESS_ALPHA_MIGRATION_VERSION = 1;
            } else if (ballPressMigrationVersion < 1 || hasLegacyPressLight || hasLegacyPressDark) {
                if (!hasCurrentPressLight && hasLegacyPressLight) {
                    var legacyPressLight = Number(user.BALL_RIPPLE_ALPHA_LIGHT);
                    if (!isNaN(legacyPressLight) && legacyPressLight >= 0 && legacyPressLight <= 1) {
                        merged.BALL_PRESS_ALPHA_LIGHT = legacyPressLight;
                    }
                }
                if (!hasCurrentPressDark && hasLegacyPressDark) {
                    var legacyPressDark = Number(user.BALL_RIPPLE_ALPHA_DARK);
                    if (!isNaN(legacyPressDark) && legacyPressDark >= 0 && legacyPressDark <= 1) {
                        merged.BALL_PRESS_ALPHA_DARK = legacyPressDark;
                    }
                }
                try { delete merged.BALL_RIPPLE_ALPHA_LIGHT; } catch (eDeletePressLight) {}
                try { delete merged.BALL_RIPPLE_ALPHA_DARK; } catch (eDeletePressDark) {}
                merged.BALL_PRESS_ALPHA_MIGRATION_VERSION = 1;
                ballPressAlphaMigrationDirty = true;
            }
        } catch (eBallPressAlphaMigration) {}

        // 旧自由坐标或高/低预设一次性迁移为“左/右 + 单一高度百分比”。'''
if base.count(old_migration_anchor) != 1:
    raise SystemExit("FAIL press migration insertion anchor mismatch")
base = base.replace(old_migration_anchor, new_migration_anchor, 1)

old_dirty = '''            positionMigrationDirty ||
            panelVisualTuningDirty ||
            settingsSanitizedDirty'''
new_dirty = '''            positionMigrationDirty ||
            panelVisualTuningDirty ||
            ballPressAlphaMigrationDirty ||
            settingsSanitizedDirty'''
if base.count(old_dirty) != 1:
    raise SystemExit("FAIL settings writeback dirty anchor mismatch")
base = base.replace(old_dirty, new_dirty, 1)
BASE.write_text(base, encoding="utf-8")

theme = THEME.read_text(encoding="utf-8")
theme = theme.replace("// @version 1.0.7", "// @version 1.0.8", 1)
old_helper = '''FloatBallAppWM.prototype.getBallPressedOverlayAlpha = function(isDark) {
  var alpha01 = NaN;
  try {
    alpha01 = Number(isDark ? this.config.BALL_PRESS_ALPHA_DARK : this.config.BALL_PRESS_ALPHA_LIGHT);
  } catch (eCurrent) { alpha01 = NaN; }

  // 兼容旧配置键；新代码不再使用 Ripple 语义命名。
  if (!(alpha01 >= 0 && alpha01 <= 1)) {
    try {
      alpha01 = Number(isDark ? this.config.BALL_RIPPLE_ALPHA_DARK : this.config.BALL_RIPPLE_ALPHA_LIGHT);
    } catch (eLegacy) { alpha01 = NaN; }
  }

  if (!(alpha01 >= 0 && alpha01 <= 1)) {
    alpha01 = isDark ? CONST_BALL_PRESS_ALPHA_DARK : CONST_BALL_PRESS_ALPHA_LIGHT;
  }
  return Math.max(0, Math.min(1, alpha01));
};'''
new_helper = '''FloatBallAppWM.prototype.getBallPressedOverlayAlpha = function(isDark) {
  var fallback = isDark ? CONST_BALL_PRESS_ALPHA_DARK : CONST_BALL_PRESS_ALPHA_LIGHT;
  var alpha01 = fallback;
  try {
    alpha01 = Number(isDark ? this.config.BALL_PRESS_ALPHA_DARK : this.config.BALL_PRESS_ALPHA_LIGHT);
  } catch (eCurrent) { alpha01 = fallback; }
  if (!(alpha01 >= 0 && alpha01 <= 1)) alpha01 = fallback;
  return Math.max(0, Math.min(1, alpha01));
};'''
if theme.count(old_helper) != 1:
    raise SystemExit("FAIL press resolver helper anchor mismatch")
theme = theme.replace(old_helper, new_helper, 1)
THEME.write_text(theme, encoding="utf-8")

# 同步所有绑定 th_01_base.js 精确版本的静态契约。
updated_base_contracts = []
for path in sorted((ROOT / "scripts").glob("verify_*.py")):
    if path == COLOROS:
        continue
    text = path.read_text(encoding="utf-8")
    if "1.1.11" in text:
        path.write_text(text.replace("1.1.11", "1.1.12"), encoding="utf-8")
        updated_base_contracts.append(path.name)

verify = COLOROS.read_text(encoding="utf-8")
verify = verify.replace(
    'if "var alpha01 = dark ? this.config.BALL_RIPPLE_ALPHA_DARK" in THEME:\n    errors.append("ball pressed alpha still reads legacy keys directly")',
    'if "BALL_RIPPLE_ALPHA_" in THEME:\n    errors.append("ball pressed resolver still references legacy Ripple config keys")'
)
verify = verify.replace("< (1, 1, 11)", "< (1, 1, 12)")
verify = verify.replace("baseline 1.1.11", "baseline 1.1.12")
verify = verify.replace("< (1, 0, 7)", "< (1, 0, 8)")
verify = verify.replace("baseline 1.0.7", "baseline 1.0.8")

contract_anchor = '''for token in ("CONST_BALL_PRESS_ALPHA_LIGHT", "CONST_BALL_PRESS_ALPHA_DARK"):
    if token not in BASE:
        errors.append("pressed-state constant missing: %s" % token)
'''
contract_addition = contract_anchor + '''for token in (
    "BALL_PRESS_ALPHA_LIGHT: { type: \\\"float\\\", min: 0, max: 1, default: 0.22 }",
    "BALL_PRESS_ALPHA_DARK: { type: \\\"float\\\", min: 0, max: 1, default: 0.28 }",
    "BALL_PRESS_ALPHA_MIGRATION_VERSION: { type: \\\"int\\\", min: 0, max: 9999, default: 1 }",
    "BALL_RIPPLE_ALPHA_LIGHT: true",
    "BALL_RIPPLE_ALPHA_DARK: true",
    "ballPressAlphaMigrationDirty",
):
    if token not in BASE:
        errors.append("pressed-state config migration contract missing: %s" % token)
'''
if verify.count(contract_anchor) != 1:
    raise SystemExit("FAIL coloros migration contract anchor mismatch")
verify = verify.replace(contract_anchor, contract_addition, 1)
COLOROS.write_text(verify, encoding="utf-8")

print("OK applied ball press config migration")
print("OK updated base contracts:", ", ".join(updated_base_contracts))
