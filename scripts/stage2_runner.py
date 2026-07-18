#!/usr/bin/env python3
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PART_DIR = ROOT / "scripts"
TARGET = PART_DIR / "apply_pickword_image_stage2.py"
EXPECTED_COUNT = 16
EXPECTED_SIZE = 91547
EXPECTED_SHA256 = "65e633a51cf5c9e76bfda8bf640be9bc38d1e8524378cc644a6d61e528767116"


def main():
    parts = [
        PART_DIR / ("stage2_source_%02d.part" % index)
        for index in range(1, EXPECTED_COUNT + 1)
    ]
    missing = [path.name for path in parts if not path.exists()]
    if missing:
        raise SystemExit("stage2 source parts missing: " + ", ".join(missing))

    payload = b"".join(path.read_bytes() for path in parts)
    actual_sha256 = hashlib.sha256(payload).hexdigest()
    if len(payload) != EXPECTED_SIZE or actual_sha256 != EXPECTED_SHA256:
        raise SystemExit(
            "stage2 source mismatch size=%d sha256=%s"
            % (len(payload), actual_sha256)
        )

    compile(payload, str(TARGET), "exec")
    TARGET.write_bytes(payload)
    for path in parts:
        path.unlink()

    subprocess.check_call(["python3", str(TARGET)], cwd=str(ROOT))


if __name__ == "__main__":
    main()
