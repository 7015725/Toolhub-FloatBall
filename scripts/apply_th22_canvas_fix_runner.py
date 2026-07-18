#!/usr/bin/env python3
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / "scripts" / ("th22_canvas_fix_%02d.part" % i) for i in range(1, 4)]
EXPECTED_SIZE = 13005
EXPECTED_SHA256 = "4e6b2db9770dc98b6dd6846176e9bf3f44f03c202dbb96d82115c4f1384aa7a1"
PART_SHA256 = ['77dcf26f1be72303e538fd0a886cbffbcb66901095fbd0f4239fdaeb02fb8032', 'd8e8c4c15c6facfbb014420a1d71fc16ead3ac1a0c7c1c309995044999274808', 'f2901ac60f5d96a84e6289af8bc081a2a5181ef477549f5d4c7cef82d3f25922']
PATCH = ROOT / "scripts" / "th22_canvas_fix.patch"

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
        raise SystemExit("canvas fix patch digest mismatch")
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
    run(["git", "commit", "-m", "修复拾字原图 Canvas 绘制与触摸边界"])
    print("canvas fix source committed sha256=%s" % EXPECTED_SHA256)

if __name__ == "__main__":
    main()
