#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which("node")
if not NODE:
    print("FAIL: node executable not found; cannot parse JavaScript modules")
    sys.exit(1)

files = sorted((ROOT / "code").glob("*.js"))
if not files:
    print("FAIL: no JavaScript modules found under code/")
    sys.exit(1)

failed = []
for path in files:
    result = subprocess.run(
        [NODE, "--check", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if result.returncode != 0:
        failed.append((path.relative_to(ROOT), result.stdout.strip()))

if failed:
    for path, output in failed:
        print("FAIL: JavaScript syntax invalid: %s" % path)
        if output:
            print(output)
    sys.exit(1)

print("OK: JavaScript syntax valid for %d modules" % len(files))
