#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts" / "apply_th22_su_path_fix.py"
VERIFIER = ROOT / "scripts" / "verify_changed_module_versions.py"


def main():
    subprocess.check_call([sys.executable, str(RUNNER)], cwd=str(ROOT))
    subprocess.check_call([sys.executable, str(VERIFIER)] + sys.argv[1:], cwd=str(ROOT))


if __name__ == "__main__":
    main()
