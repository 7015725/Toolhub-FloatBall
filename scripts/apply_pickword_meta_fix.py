#!/usr/bin/env python3
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "scripts" / "pickword_meta_fix.patch"
EXPECTED_SIZE = 11828
EXPECTED_SHA256 = "409980b2d899c8b4eb502049cc914a74147e50d99c5c159ff7da75f66ac65a57"


def run(args):
    proc = subprocess.run(args, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode != 0:
        raise SystemExit("command failed: %s\n%s" % (" ".join(args), str(proc.stdout or "")))
    return proc


def main():
    if not PATCH.exists():
        raise SystemExit("pickword meta fix patch missing")
    payload = PATCH.read_bytes()
    digest = hashlib.sha256(payload).hexdigest()
    if len(payload) != EXPECTED_SIZE or digest != EXPECTED_SHA256:
        raise SystemExit("pickword meta fix patch mismatch size=%d sha256=%s" % (len(payload), digest))

    run(["git", "checkout", "origin/main", "--", "scripts/generate_signed_manifest.py"])
    run(["git", "apply", "--check", str(PATCH)])
    run(["git", "apply", str(PATCH)])

    PATCH.unlink()
    Path(__file__).unlink()

    run(["python3", "scripts/verify_pickword_image_meta_handoff.py"])
    run(["python3", "scripts/verify_pickword_image_viewer.py"])
    run(["python3", "scripts/verify_pickword_long_click_api34.py"])
    run(["python3", "scripts/verify_pickword_unified_cleanup.py"])
    run(["python3", ".github/scripts/es5_scan.py"])
    run(["python3", "scripts/verify_js_syntax.py"])

    run(["git", "config", "user.name", "github-actions[bot]"])
    run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", "修复拾字截图元数据二次交接"])
    print("pickword meta fix applied sha256=%s" % digest)


if __name__ == "__main__":
    main()
