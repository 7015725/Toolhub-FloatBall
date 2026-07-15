#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parent / "apply_settings_interaction_stress_test.py"
text = path.read_text(encoding="utf-8")
old = r'''stress_block = re.search(r"FloatBallAppWM.prototype.runSettingsInteractionStressTest = function\(iterations\) \{.*?\n\};", PANEL_UI, re.S)'''
new = r'''stress_block = re.search(r"FloatBallAppWM.prototype.runSettingsInteractionStressTest = function\(iterations\) \{.*?\\n\};", PANEL_UI, re.S)'''
if old not in text:
    raise SystemExit("stress regex anchor missing")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("settings interaction migrator escape fixed")
