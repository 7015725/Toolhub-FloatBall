#!/usr/bin/env python3
# One-shot compatibility wrapper; the active workflow calls the core script directly.
from pathlib import Path
import importlib.util

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CORE = HERE / "apply_screenshot_manager_saved_fix_core.py"
SYNC = HERE / "sync_pickword_viewer_verifier.py"

spec = importlib.util.spec_from_file_location("screenshot_manager_saved_fix_core", str(CORE))
if spec is None or spec.loader is None:
    raise SystemExit("FAIL screenshot-manager-saved-fix: core loader unavailable")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.main()

verify_path = ROOT / "scripts" / "verify_pickword_image_viewer.py"
lines = verify_path.read_text(encoding="utf-8").splitlines(True)
guard_count = 0
version_count = 0
out = []
for line in lines:
    if "image viewer install version guard missing" in line:
        replaced = line.replace("1.2.7", "1.2.8")
        if replaced != line:
            guard_count += 1
        line = replaced
    if "image viewer version" in line and "// @version 1.2.7" in line:
        replaced = line.replace("// @version 1.2.7", "// @version 1.2.8")
        if replaced != line:
            version_count += 1
        line = replaced
    out.append(line)
if guard_count != 1 or version_count != 1:
    raise SystemExit("FAIL sync-pickword-viewer-verifier guard=%d version=%d" % (guard_count, version_count))
verify_text = "".join(out)
if '__toolHubPickwordImageViewerVersion = "1.2.8"' not in verify_text or '// @version 1.2.8' not in verify_text:
    raise SystemExit("FAIL sync-pickword-viewer-verifier new assertions missing")
verify_path.write_text(verify_text, encoding="utf-8")

for path in (CORE, SYNC):
    try:
        path.unlink()
    except FileNotFoundError:
        pass

print("OK screenshot-manager-saved-fix wrapper completed")
