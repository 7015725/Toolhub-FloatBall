#!/usr/bin/env python3
"""Apply the reviewed ShortXUI WindowHost phase-2 unified patch."""
from pathlib import Path
import base64
import hashlib
import subprocess
import sys
import zlib

ROOT = Path(__file__).resolve().parents[1]
PART_DIR = ROOT / "scripts" / "bootstrap"
PARTS = [PART_DIR / ("windowhost_phase2_patch.part%02d" % i) for i in range(1, 11)]
EXPECTED_SHA256 = "25408356a38754c9f85810307c345773cbb45f697259c9eebd909220e7acac6d"

encoded = "".join(path.read_text(encoding="utf-8").strip() for path in PARTS)
patch_bytes = zlib.decompress(base64.b64decode(encoded.encode("ascii")))
actual = hashlib.sha256(patch_bytes).hexdigest()
if actual != EXPECTED_SHA256:
    raise SystemExit("WindowHost patch digest mismatch expected=%s actual=%s" % (EXPECTED_SHA256, actual))

proc = subprocess.run(
    ["patch", "--forward", "--batch", "-p1"],
    cwd=str(ROOT),
    input=patch_bytes,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
)
sys.stdout.buffer.write(proc.stdout)
if proc.returncode != 0:
    raise SystemExit(proc.returncode)
print("WindowHost phase-2 patch applied sha256=" + actual)
