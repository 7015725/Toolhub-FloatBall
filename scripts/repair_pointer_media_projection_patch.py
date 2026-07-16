#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "scripts" / "apply_pointer_media_projection_fix.py"
VERIFY = ROOT / "scripts" / "verify_changed_module_versions.py"
SELF = Path(__file__).resolve()

bad = "    WMS + 'FloatBallAppWM.prototype.capturePointerBitmapByUiAutomation = function(cropRect) {')"
good = "    WMS)"
text = PATCH.read_text(encoding="utf-8")
if bad not in text:
    raise SystemExit("pointer patch duplicate-header marker missing")
PATCH.write_text(text.replace(bad, good, 1), encoding="utf-8")

inject = '''REPAIR_SCRIPT = ROOT / "scripts" / "repair_pointer_media_projection_patch.py"\nif REPAIR_SCRIPT.exists():\n    subprocess.check_call([sys.executable, str(REPAIR_SCRIPT)], cwd=str(ROOT))\n\n'''
verify_text = VERIFY.read_text(encoding="utf-8")
if inject not in verify_text:
    raise SystemExit("repair injection missing")
VERIFY.write_text(verify_text.replace(inject, "", 1), encoding="utf-8")
SELF.unlink()
print("OK repaired pointer screenshot patch boundary")
