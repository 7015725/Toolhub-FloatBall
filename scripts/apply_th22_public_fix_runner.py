#!/usr/bin/env python3
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / "scripts" / ("th22_public_fix_%02d.part" % i) for i in range(1, 3)]
EXPECTED_SIZE = 9479
EXPECTED_SHA256 = "badd734f90a991142e564479688423e8d1bc35f5ce7b1d64c71895edb03651fc"
PART_SHA256 = ['538b9de8e34d517d17f28ec35755b4ec371a121085624a558bb3f08d997e90e7', 'f783841875aedd652ddf5226ecd4b4534c12e95b9b82fe7635dde4c1f9c4d307']
PATCH = ROOT / "scripts" / "th22_public_fix.patch"

def run(args):
    proc = subprocess.run(args, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode != 0:
        raise SystemExit("command failed: %s\n%s" % (" ".join(args), str(proc.stdout or "")))
    return proc

def main():
    chunks = []
    for index, path in enumerate(PARTS):
        if not path.exists():
            raise SystemExit("missing patch part: %s" % path.name)
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != PART_SHA256[index]:
            raise SystemExit("patch part digest mismatch: %s" % path.name)
        chunks.append(data)
    payload = b"".join(chunks)
    if len(payload) != EXPECTED_SIZE or hashlib.sha256(payload).hexdigest() != EXPECTED_SHA256:
        raise SystemExit("public media store patch digest mismatch")
    run(["git", "checkout", "origin/main", "--", "scripts/generate_signed_manifest.py"])
    PATCH.write_bytes(payload)
    run(["git", "apply", "--check", str(PATCH)])
    run(["git", "apply", str(PATCH)])
    for path in PARTS:
        path.unlink()
    PATCH.unlink()
    Path(__file__).unlink()
    run(["git", "config", "user.name", "github-actions[bot]"])
    run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", "修复截图公共保存与分享目录创建"])
    print("public media store patch applied sha256=%s" % EXPECTED_SHA256)

if __name__ == "__main__":
    main()
