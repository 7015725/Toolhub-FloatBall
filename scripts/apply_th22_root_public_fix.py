#!/usr/bin/env python3
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / "scripts" / ("th22_root_fix_%02d.part" % i) for i in range(1, 4)]
PART_SIZES = [10971, 5496, 2616]
PART_SHA256 = [
    "3e51c4c99c476c812ce9f77a066f69465ca884daf858d12bd22a395b669cb77c",
    "9cb898b510af5c93095359bd02a0fc2dfb0bf0bab39c988fcd51d24e15bb90d0",
    "64654fdf809c27c10c38a937e16c12113e0a12b37f97971174ffc0732dfb1393",
]
EXPECTED_SIZE = 19083
EXPECTED_SHA256 = "68b5ae648c57c43dae8597532f726ba2e2118633654d96981f43ae471d1c65de"
PATCH = ROOT / "scripts" / "th22_root_public_fix.patch"


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
        if len(data) != PART_SIZES[index]:
            raise SystemExit("patch part size mismatch: %s" % path.name)
        if hashlib.sha256(data).hexdigest() != PART_SHA256[index]:
            raise SystemExit("patch part digest mismatch: %s" % path.name)
        chunks.append(data)
    payload = b"".join(chunks)
    if len(payload) != EXPECTED_SIZE or hashlib.sha256(payload).hexdigest() != EXPECTED_SHA256:
        raise SystemExit("root public storage patch digest mismatch")

    run(["git", "checkout", "origin/main", "--", "scripts/generate_signed_manifest.py"])
    PATCH.write_bytes(payload)
    run(["git", "apply", "--recount", "--check", str(PATCH)])
    run(["git", "apply", "--recount", str(PATCH)])

    for path in PARTS:
        path.unlink()
    PATCH.unlink()
    Path(__file__).unlink()

    run(["git", "config", "user.name", "github-actions[bot]"])
    run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", "修复 system_server 公共截图 Root 存储回退"])
    print("root public storage patch applied sha256=%s" % EXPECTED_SHA256)


if __name__ == "__main__":
    main()
