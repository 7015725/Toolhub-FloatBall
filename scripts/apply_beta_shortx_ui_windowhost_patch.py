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
PART_NAMES = [
    "windowhost_phase2_patch.part01",
    "windowhost_phase2_patch.part02",
    "windowhost_phase2_patch.part03",
    "windowhost_phase2_patch.part04",
    "windowhost_phase2_patch.part05",
    "windowhost_phase2_patch.part06a",
    "windowhost_phase2_patch.part06b1",
    "windowhost_phase2_patch.part06b2",
    "windowhost_phase2_patch.part07",
    "windowhost_phase2_patch.part08",
    "windowhost_phase2_patch.part09",
    "windowhost_phase2_patch.part10",
]
PARTS = [PART_DIR / name for name in PART_NAMES]
EXPECTED_SHA256 = "25408356a38754c9f85810307c345773cbb45f697259c9eebd909220e7acac6d"
EXPECTED_LENGTHS = [1800, 1800, 1800, 1800, 1800, 900, 450, 450, 1800, 1800, 1800, 64]

values = [path.read_text(encoding="utf-8").strip() for path in PARTS]
lengths = [len(value) for value in values]
print("WindowHost patch part lengths=" + ",".join(str(value) for value in lengths))
if lengths != EXPECTED_LENGTHS:
    raise SystemExit("WindowHost patch part length mismatch expected=%s actual=%s" % (EXPECTED_LENGTHS, lengths))
encoded = "".join(values)
print("WindowHost patch encoded length=%d modulo4=%d" % (len(encoded), len(encoded) % 4))
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
