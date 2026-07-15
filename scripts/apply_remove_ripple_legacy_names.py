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


def replace_all_required(path, old, new, label, minimum=1):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count < minimum:
        raise SystemExit("FAIL %s expected at least %d, found %d in %s" % (label, minimum, count, path))
    path.write_text(text.replace(old, new), encoding="utf-8")
    return count


theme = CODE / "th_04_theme.js"
panels = CODE / "th_14_panels.js"
main = CODE / "th_15_main_panel.js"
coloros_verify = SCRIPTS / "verify_coloros_rhino_color_safety.py"
adaptive_verify = SCRIPTS / "verify_main_panel_adaptive_layout.py"

replace_once(theme, "// @version 1.0.6", "// @version 1.0.7", "theme version")
replace_once(
    theme,
    '''    // 兼容旧调用名称；实际为按压换色反馈，不创建 framework RippleDrawable。\n    createRippleDrawable: function(normalColor, pressedColor, radiusPx) {\n        return this.createPressedStateDrawable(normalColor, pressedColor, radiusPx);\n    },\n\n    // 兼容旧调用名称。\n    createTransparentRippleDrawable: function(pressedColor, radiusPx) {\n        return this.createTransparentPressedStateDrawable(pressedColor, radiusPx);\n    },\n\n''',
    "",
    "legacy pressed helper wrappers",
)

replace_once(panels, "// @version 1.0.19", "// @version 1.0.20", "panels version")
replace_all_required(
    panels,
    ".createRippleDrawable(",
    ".createPressedStateDrawable(",
    "settings panel pressed helper call",
)

replace_once(main, "// @version 1.5.7", "// @version 1.5.8", "main panel version")
replace_all_required(
    main,
    "createMainPanelRippleBackground",
    "createMainPanelPressedBackground",
    "main panel pressed background name",
    minimum=2,
)
replace_all_required(
    main,
    "createTransparentRippleDrawable",
    "createTransparentPressedStateDrawable",
    "main panel transparent pressed helper",
)
replace_all_required(
    main,
    "rippleColor",
    "pressedOverlayColor",
    "main panel pressed overlay variable",
)

# 所有主面板静态契约同步到新模块版本，包括嵌入源码头的完整文本。
updated_contracts = []
for path in sorted(SCRIPTS.glob("verify_*.py")):
    text = path.read_text(encoding="utf-8")
    if "1.5.7" in text:
        path.write_text(text.replace("1.5.7", "1.5.8"), encoding="utf-8")
        updated_contracts.append(path.name)

replace_all_required(
    adaptive_verify,
    "createMainPanelRippleBackground",
    "createMainPanelPressedBackground",
    "adaptive layout method boundary",
)

text = coloros_verify.read_text(encoding="utf-8")
text = text.replace("< (1, 0, 6)", "< (1, 0, 7)")
text = text.replace("baseline 1.0.6", "baseline 1.0.7")
text = text.replace("< (1, 5, 7)", "< (1, 5, 8)")
text = text.replace("baseline 1.5.7", "baseline 1.5.8")
text = text.replace(
    'if "StateListDrawable" not in MAIN or "createMainPanelRippleBackground" not in MAIN:',
    'if "StateListDrawable" not in MAIN or "createMainPanelPressedBackground" not in MAIN:',
)
anchor = '''for token in ("createPressedStateDrawable", "createTransparentPressedStateDrawable", "getBallPressedOverlayAlpha"):\n    if token not in THEME:\n        errors.append("stable pressed-state helper missing: %s" % token)\n'''
addition = anchor + '''for token in ("createRippleDrawable", "createTransparentRippleDrawable", "createMainPanelRippleBackground"):\n    if token in ALL_JS:\n        errors.append("legacy ripple helper name remains: %s" % token)\n'''
if text.count(anchor) != 1:
    raise SystemExit("FAIL coloros verifier helper anchor mismatch")
text = text.replace(anchor, addition, 1)
if "createMainPanelPressedBackground" not in text:
    raise SystemExit("FAIL coloros verifier main pressed helper rename missing")
coloros_verify.write_text(text, encoding="utf-8")

print("OK removed legacy ripple helper names")
print("OK updated main panel contracts:", ", ".join(updated_contracts))
