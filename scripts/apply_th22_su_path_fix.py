#!/usr/bin/env python3
import hashlib
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "scripts" / "th22_su_path_fix.patch"
EXPECTED_SIZE = 9583
EXPECTED_SHA256 = "d25b7c49e4733d936564167c1b30d3650bd32f1f184dd13eb80c96765d01e809"
VERIFIER = ROOT / "scripts" / "verify_changed_module_versions.py"


def run(args):
    proc = subprocess.run(args, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode != 0:
        raise SystemExit("command failed: %s\n%s" % (" ".join(args), str(proc.stdout or "")))
    return proc


def main():
    data = PATCH.read_bytes()
    if len(data) != EXPECTED_SIZE:
        raise SystemExit("su path patch size mismatch: actual=%d expected=%d" % (len(data), EXPECTED_SIZE))
    actual = hashlib.sha256(data).hexdigest()
    if actual != EXPECTED_SHA256:
        raise SystemExit("su path patch digest mismatch: actual=%s expected=%s" % (actual, EXPECTED_SHA256))

    run(["git", "checkout", "origin/main", "--", str(VERIFIER.relative_to(ROOT))])
    run(["git", "apply", "--recount", "--check", str(PATCH)])
    run(["git", "apply", "--recount", str(PATCH)])

    PATCH.unlink()
    Path(__file__).unlink()

    run(["git", "config", "user.name", "github-actions[bot]"])
    run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", "修复 system_server 无法定位 su 可执行文件"])
    print("su path patch applied sha256=%s" % EXPECTED_SHA256)


if __name__ == "__main__":
    main()
