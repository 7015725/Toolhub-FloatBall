#!/usr/bin/env python3
from pathlib import Path
import runpy

HERE = Path(__file__).resolve().parent
CORE = HERE / "apply_screenshot_manager_saved_fix_core.py"
SYNC = HERE / "sync_pickword_viewer_verifier.py"

try:
    runpy.run_path(str(CORE), run_name="__main__")
    runpy.run_path(str(SYNC), run_name="__main__")
finally:
    for path in (CORE, SYNC):
        try:
            path.unlink()
        except FileNotFoundError:
            pass

print("OK screenshot-manager-saved-fix wrapper completed")
