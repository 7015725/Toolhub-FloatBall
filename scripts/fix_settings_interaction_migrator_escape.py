#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parent / "apply_settings_interaction_stress_test.py"
text = path.read_text(encoding="utf-8")

old_regex = r'''stress_block = re.search(r"FloatBallAppWM.prototype.runSettingsInteractionStressTest = function\(iterations\) \{.*?\n\};", PANEL_UI, re.S)'''
new_regex = r'''stress_block = re.search(r"FloatBallAppWM.prototype.runSettingsInteractionStressTest = function\(iterations\) \{.*?\\n\};", PANEL_UI, re.S)'''
if old_regex not in text:
    raise SystemExit("stress regex anchor missing")
text = text.replace(old_regex, new_regex, 1)

old_button = r'''    "createSolidButton(this, \"压力测试\"",'''
new_button = r'''    'createSolidButton(this, "压力测试"','''
if old_button not in text:
    raise SystemExit("stress button token anchor missing")
text = text.replace(old_button, new_button, 1)

path.write_text(text, encoding="utf-8")
print("settings interaction migrator escapes fixed")
