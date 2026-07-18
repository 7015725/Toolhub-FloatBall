#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts" / "apply_th22_root_public_fix.py"
TH22 = ROOT / "code" / "th_22_image_viewer.js"


def main():
    subprocess.check_call([sys.executable, str(RUNNER)], cwd=str(ROOT))
    text = TH22.read_text(encoding="utf-8", errors="replace")
    if not text.startswith("// @version 1.2.3\n"):
        raise SystemExit("FAIL changed-module-versions: th_22 version must be 1.2.3 after root public storage fix")
    changed = subprocess.check_output(
        ["git", "diff", "--name-only", "origin/main", "HEAD", "--", "code/th_22_image_viewer.js"],
        cwd=str(ROOT),
        text=True,
    ).strip()
    if changed != "code/th_22_image_viewer.js":
        raise SystemExit("FAIL changed-module-versions: formal th_22 change was not committed")
    print("OK changed-module-version module=th_22_image_viewer.js version=1.2.2->1.2.3")


if __name__ == "__main__":
    main()
