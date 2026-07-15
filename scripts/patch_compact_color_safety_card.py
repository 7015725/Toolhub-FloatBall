#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
panels_path = root / "code" / "th_14_panels.js"
verify_path = root / "scripts" / "verify_coloros_rhino_color_safety.py"

panels = panels_path.read_text(encoding="utf-8")
verify = verify_path.read_text(encoding="utf-8")

old_version = "// @version 1.0.21"
new_version = "// @version 1.0.22"
if old_version not in panels:
    raise SystemExit("th_14 version anchor missing")
panels = panels.replace(old_version, new_version, 1)

anchor = '''  panel.addView(settingsGroupNotice, settingsGroupNoticeLp);\n\n  if (activeGroupKey === "ball" && this.buildBallPreviewView) {'''
insert = '''  panel.addView(settingsGroupNotice, settingsGroupNoticeLp);\n\n  // 手机紧凑布局同样显示 ColorOS 颜色安全诊断卡。\n  if (activeGroupKey === "debug" && this.createColorSafetyRuntimeDiagnosticCard) {\n    try {\n      var colorSafetyCardCompact = this.createColorSafetyRuntimeDiagnosticCard();\n      var colorSafetyCardCompactLp = new android.widget.LinearLayout.LayoutParams(-1, -2);\n      colorSafetyCardCompactLp.setMargins(this.dp(2), this.dp(2), this.dp(2), this.dp(8));\n      panel.addView(colorSafetyCardCompact, colorSafetyCardCompactLp);\n    } catch(eColorSafetyCardCompact) {\n      safeLog(this.L, "e", "create compact color safety diagnostic card fail error=" + String(eColorSafetyCardCompact));\n    }\n  }\n\n  if (activeGroupKey === "ball" && this.buildBallPreviewView) {'''
if anchor not in panels:
    raise SystemExit("compact settings insertion anchor missing")
panels = panels.replace(anchor, insert, 1)

old_verify = '''if module_version(PANELS, "th_14_panels.js") < (1, 0, 21):\n    errors.append("th_14_panels.js version below runtime diagnostic baseline 1.0.21")'''
new_verify = '''if module_version(PANELS, "th_14_panels.js") < (1, 0, 22):\n    errors.append("th_14_panels.js version below runtime diagnostic compact-layout baseline 1.0.22")'''
if old_verify not in verify:
    raise SystemExit("validator version anchor missing")
verify = verify.replace(old_verify, new_verify, 1)

validator_anchor = '''if ALL_JS.count(".runColorSafetyRuntimeSelfTest(") != 1:\n    errors.append("runtime color self-test must have exactly one manual invocation")'''
validator_insert = '''if ALL_JS.count(".runColorSafetyRuntimeSelfTest(") != 1:\n    errors.append("runtime color self-test must have exactly one manual invocation")\nif PANELS.count("createColorSafetyRuntimeDiagnosticCard();") < 2:\n    errors.append("runtime diagnostic card is not wired into both wide and compact settings layouts")\nfor token in (\n    'activeGroupKey === "debug"',\n    "colorSafetyCardCompact",\n    "create compact color safety diagnostic card fail",\n):\n    if token not in PANELS:\n        errors.append("compact runtime diagnostic contract missing: %s" % token)'''
if validator_anchor not in verify:
    raise SystemExit("validator compact contract anchor missing")
verify = verify.replace(validator_anchor, validator_insert, 1)

panels_path.write_text(panels, encoding="utf-8")
verify_path.write_text(verify, encoding="utf-8")
print("patched compact ColorOS diagnostic card")
