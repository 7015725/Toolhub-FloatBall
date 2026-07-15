#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
SCRIPTS = ROOT / "scripts"


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL %s expected once, found %d in %s" % (label, count, path))
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


theme = CODE / "th_04_theme.js"
panels = CODE / "th_14_panels.js"
verify = SCRIPTS / "verify_coloros_rhino_color_safety.py"
theme_methods = (SCRIPTS / ".tmp_color_safety_theme.js.txt").read_text(encoding="utf-8")
panel_methods = (SCRIPTS / ".tmp_color_safety_panels.js.txt").read_text(encoding="utf-8")

replace_once(theme, "// @version 1.0.8", "// @version 1.0.9", "theme version")
replace_once(
    theme,
    "FloatBallAppWM.prototype.updateBallContentBackground = function(contentView, usedIconKind) {",
    theme_methods + "FloatBallAppWM.prototype.updateBallContentBackground = function(contentView, usedIconKind) {",
    "theme self-test insertion",
)

replace_once(panels, "// @version 1.0.20", "// @version 1.0.21", "panels version")
replace_once(
    panels,
    "FloatBallAppWM.prototype.buildSettingsGroupDetailPane = function(groupKey, title, desc) {",
    panel_methods + "FloatBallAppWM.prototype.buildSettingsGroupDetailPane = function(groupKey, title, desc) {",
    "settings diagnostic methods",
)
card_anchor = '  if (String(groupKey || "") === "ball" && this.buildBallPreviewView) {\n'
card_block = '''  if (String(groupKey || "") === "debug" && this.createColorSafetyRuntimeDiagnosticCard) {
    try {
      var colorSafetyCard = this.createColorSafetyRuntimeDiagnosticCard();
      var colorSafetyCardLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      colorSafetyCardLp.setMargins(this.dp(2), this.dp(4), this.dp(2), this.dp(8));
      root.addView(colorSafetyCard, colorSafetyCardLp);
    } catch(eColorSafetyCard) { safeLog(this.L, "e", "create color safety diagnostic card fail error=" + String(eColorSafetyCard)); }
  }

'''
replace_once(panels, card_anchor, card_block + card_anchor, "debug diagnostic card")

text = verify.read_text(encoding="utf-8")
replace_map = (
    (
        'MAIN = (CODE / "th_15_main_panel.js").read_text(encoding="utf-8")\n',
        'MAIN = (CODE / "th_15_main_panel.js").read_text(encoding="utf-8")\nPANELS = (CODE / "th_14_panels.js").read_text(encoding="utf-8")\n',
    ),
    (
        'if module_version(THEME, "th_04_theme.js") < (1, 0, 8):\n    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.8")\n',
        'if module_version(THEME, "th_04_theme.js") < (1, 0, 9):\n    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.9")\nif module_version(PANELS, "th_14_panels.js") < (1, 0, 21):\n    errors.append("th_14_panels.js version below runtime diagnostic baseline 1.0.21")\n',
    ),
)
for old, new in replace_map:
    if text.count(old) != 1:
        raise SystemExit("FAIL verifier replacement anchor mismatch: " + old[:60])
    text = text.replace(old, new, 1)

anchor = 'if "StateListDrawable" not in MAIN or "createMainPanelPressedBackground" not in MAIN:\n    errors.append("main panel card background is not protected by StateListDrawable")\n'
addition = anchor + '''for token in (
    "FloatBallAppWM.prototype.getColorSafetyRuntimeContext = function",
    "FloatBallAppWM.prototype.runColorSafetyRuntimeSelfTest = function",
    "color safety self-test start",
    "color safety self-test pass",
    "color safety self-test fail",
    "loops = Math.max(1, Math.min(300, loops))",
    "drawableClass.indexOf(\\\"RippleDrawable\\\") >= 0",
    "colorState.getColorForState(pressedState, normalColor)",
):
    if token not in THEME:
        errors.append("runtime color self-test contract missing: %s" % token)
for token in (
    "FloatBallAppWM.prototype.startColorSafetyRuntimeSelfTestFromSettings = function",
    "FloatBallAppWM.prototype.createColorSafetyRuntimeDiagnosticCard = function",
    "self.runColorSafetyRuntimeSelfTest(160)",
    "String(groupKey || \\\"\\\") === \\\"debug\\\"",
    "不附着窗口、不使用 framework RippleDrawable，也不会自动运行",
):
    if token not in PANELS:
        errors.append("settings runtime diagnostic contract missing: %s" % token)
if ALL_JS.count(".runColorSafetyRuntimeSelfTest(") != 1:
    errors.append("runtime color self-test must have exactly one manual invocation")
'''
if text.count(anchor) != 1:
    raise SystemExit("FAIL verifier diagnostic anchor mismatch")
verify.write_text(text.replace(anchor, addition, 1), encoding="utf-8")

print("OK added manual ColorOS runtime color self-test")
