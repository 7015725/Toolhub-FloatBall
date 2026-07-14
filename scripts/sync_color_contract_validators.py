#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
VISUAL = ROOT / "scripts" / "verify_main_panel_visual_tuning.py"
CLOSE = ROOT / "scripts" / "verify_main_panel_close_lifecycle.py"

visual = VISUAL.read_text(encoding="utf-8")
visual = visual.replace(
    'scroll.setBackgroundColor(this.withAlpha(panelBase, 1.0))',
    'toolhubSafeSetBackgroundColor(scroll, this.withAlpha(panelBase, 1.0))',
    1,
)
VISUAL.write_text(visual, encoding="utf-8")

close = CLOSE.read_text(encoding="utf-8")
close = close.replace(
    'require(MAIN_PANEL, "// @version 1.5.6", "unchanged main panel module version")',
    'require(MAIN_PANEL, "// @version 1.5.7", "current main panel module version")',
    1,
)
close = close.replace(
    'fail("expected th_09_animation.js version 1.0.7")',
    'fail("expected th_09_animation.js version 1.0.8")',
    1,
)
CLOSE.write_text(close, encoding="utf-8")

for script in (
    "scripts/verify_main_panel_visual_tuning.py",
    "scripts/verify_main_panel_close_lifecycle.py",
):
    subprocess.run(["python3", script], cwd=str(ROOT), check=True)
