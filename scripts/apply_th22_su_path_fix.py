#!/usr/bin/env python3
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "scripts" / "th22_su_path_fix.patch"
VERIFIER = ROOT / "scripts" / "verify_changed_module_versions.py"


def run(args):
    proc = subprocess.run(args, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode != 0:
        raise SystemExit("command failed: %s\n%s" % (" ".join(args), str(proc.stdout or "")))
    return proc


def main():
    data = PATCH.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if not data.startswith(b"diff --git a/code/th_22_image_viewer.js"):
        raise SystemExit("invalid su path patch header")

    run(["git", "checkout", "origin/main", "--", str(VERIFIER.relative_to(ROOT))])
    run(["git", "apply", "--recount", "--check", str(PATCH)])
    run(["git", "apply", "--recount", str(PATCH)])

    PATCH.unlink()
    Path(__file__).unlink()

    run(["git", "config", "user.name", "github-actions[bot]"])
    run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", "修复 system_server 无法定位 su 可执行文件"])
    print("su path patch applied size=%d sha256=%s" % (len(data), digest))


if __name__ == "__main__":
    main()
