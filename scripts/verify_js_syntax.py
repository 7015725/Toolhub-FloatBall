#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which("node")
ERROR_FILE = ROOT / "RUNNER_ERROR.txt"
errors = []
if not NODE:
    errors.append("FAIL: node executable not found; cannot parse JavaScript modules")
else:
    files = sorted((ROOT / "code").glob("*.js"))
    if not files:
        errors.append("FAIL: no JavaScript modules found under code/")
    else:
        for path in files:
            result = subprocess.run(
                [NODE, "--check", str(path)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            if result.returncode != 0:
                errors.append("FAIL: JavaScript syntax invalid: %s\n%s" % (
                    path.relative_to(ROOT), result.stdout.strip()
                ))
if errors:
    report = "\n".join(errors) + "\n"
    ERROR_FILE.write_text(report, encoding="utf-8")
    subprocess.run(["git", "add", "RUNNER_ERROR.txt"], cwd=str(ROOT))
    print(report.rstrip())
    sys.exit(0)
print("OK: JavaScript syntax valid for %d modules" % len(files))
