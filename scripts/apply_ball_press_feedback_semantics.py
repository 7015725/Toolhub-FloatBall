#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "code" / "th_01_base.js"
THEME = ROOT / "code" / "th_04_theme.js"
VERIFY = ROOT / "scripts" / "verify_coloros_rhino_color_safety.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL %s expected once, found %d" % (label, count))
    return text.replace(old, new, 1)


base = BASE.read_text(encoding="utf-8")
base = replace_once(base, "// @version 1.1.10", "// @version 1.1.11", "base version")
base = replace_once(
    base,
    'var CONST_BALL_RIPPLE_ALPHA_LIGHT = 0.22;\nvar CONST_BALL_RIPPLE_ALPHA_DARK = 0.28;',
    'var CONST_BALL_PRESS_ALPHA_LIGHT = 0.22;\nvar CONST_BALL_PRESS_ALPHA_DARK = 0.28;',
    "press alpha constants",
)
BASE.write_text(base, encoding="utf-8")

theme = THEME.read_text(encoding="utf-8")
theme = replace_once(theme, "// @version 1.0.5", "// @version 1.0.6", "theme version")
old_block = '''FloatBallAppWM.prototype.updateBallContentBackground = function(contentView, usedIconKind) {
  try {
    var ballColor = this.getMonetAccentForBall();'''
new_block = '''FloatBallAppWM.prototype.getBallPressedOverlayAlpha = function(isDark) {
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
};

FloatBallAppWM.prototype.updateBallContentBackground = function(contentView, usedIconKind) {
  try {
    var ballColor = this.getMonetAccentForBall();'''
theme = replace_once(theme, old_block, new_block, "pressed alpha helper insertion")
theme = replace_once(
    theme,
    '''    var dark = this.isDarkTheme();
    var alpha01 = dark ? this.config.BALL_RIPPLE_ALPHA_DARK : this.config.BALL_RIPPLE_ALPHA_LIGHT;
    var rippleColor = this.withAlpha(ballColor, alpha01);''',
    '''    var dark = this.isDarkTheme();
    var alpha01 = this.getBallPressedOverlayAlpha(dark);
    var pressedOverlayColor = this.withAlpha(ballColor, alpha01);''',
    "pressed overlay alpha usage",
)
theme = replace_once(
    theme,
    "    var pressed = makeBallLayer(toolhubCompositeColor(rippleColor, fillColor));",
    "    var pressed = makeBallLayer(toolhubCompositeColor(pressedOverlayColor, fillColor));",
    "pressed overlay composition",
)
THEME.write_text(theme, encoding="utf-8")

verify = VERIFY.read_text(encoding="utf-8")
verify = replace_once(
    verify,
    'THEME = (CODE / "th_04_theme.js").read_text(encoding="utf-8")\nMAIN = (CODE / "th_15_main_panel.js").read_text(encoding="utf-8")',
    'BASE = (CODE / "th_01_base.js").read_text(encoding="utf-8")\nTHEME = (CODE / "th_04_theme.js").read_text(encoding="utf-8")\nMAIN = (CODE / "th_15_main_panel.js").read_text(encoding="utf-8")',
    "load base module",
)
verify = replace_once(
    verify,
    '''for token in ("createPressedStateDrawable", "createTransparentPressedStateDrawable"):
    if token not in THEME:
        errors.append("stable pressed-state helper missing: %s" % token)''',
    '''for token in ("createPressedStateDrawable", "createTransparentPressedStateDrawable", "getBallPressedOverlayAlpha"):
    if token not in THEME:
        errors.append("stable pressed-state helper missing: %s" % token)
for token in ("CONST_BALL_PRESS_ALPHA_LIGHT", "CONST_BALL_PRESS_ALPHA_DARK"):
    if token not in BASE:
        errors.append("pressed-state constant missing: %s" % token)
if "var rippleColor" in THEME:
    errors.append("legacy ripple runtime variable remains in theme")
if "var alpha01 = dark ? this.config.BALL_RIPPLE_ALPHA_DARK" in THEME:
    errors.append("ball pressed alpha still reads legacy keys directly")
if "var alpha01 = this.getBallPressedOverlayAlpha(dark);" not in THEME:
    errors.append("ball background does not use pressed alpha resolver")''',
    "pressed semantics checks",
)
verify = replace_once(
    verify,
    '''if module_version(THEME, "th_04_theme.js") < (1, 0, 5):
    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.5")''',
    '''if module_version(BASE, "th_01_base.js") < (1, 1, 11):
    errors.append("th_01_base.js version below pressed feedback baseline 1.1.11")
if module_version(THEME, "th_04_theme.js") < (1, 0, 6):
    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.6")''',
    "version baselines",
)
VERIFY.write_text(verify, encoding="utf-8")

print("OK applied ball press feedback semantics")
