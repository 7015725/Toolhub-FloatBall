#!/usr/bin/env python3
from pathlib import Path
import importlib.util

here = Path(__file__).resolve().parent
core = here / "apply_screenshot_manager_saved_fix_core.py"
spec = importlib.util.spec_from_file_location("screenshot_manager_saved_fix_core", str(core))
if spec is None or spec.loader is None:
    raise SystemExit("FAIL screenshot-manager-saved-fix: core loader unavailable")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.main()
print("OK screenshot-manager-saved-fix core completed")
