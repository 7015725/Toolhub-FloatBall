#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts" / "apply_th22_root_public_fix.py"


def main():
    subprocess.check_call([sys.executable, str(RUNNER)], cwd=str(ROOT))
    subprocess.check_call(
        [sys.executable, str(ROOT / "scripts" / "generate_signed_manifest.py")] + sys.argv[1:],
        cwd=str(ROOT),
    )


if __name__ == "__main__":
    main()
