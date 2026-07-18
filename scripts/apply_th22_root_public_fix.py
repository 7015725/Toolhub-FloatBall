#!/usr/bin/env python3
import hashlib
import os
import subprocess
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / "scripts" / ("th22_root_fix_%02d.part" % i) for i in range(1, 4)]
PART_SIZES = [10880, 5496, 2616]
PART_SHA256 = [
    "eb0ebfb3b99c0fd9d680aa2787e8cb69960c0c91431aff47dd85188c449a9659",
    "9cb898b510af5c93095359bd02a0fc2dfb0bf0bab39c988fcd51d24e15bb90d0",
    "64654fdf809c27c10c38a937e16c12113e0a12b37f97971174ffc0732dfb1393",
]
EXPECTED_SIZE = 18992
EXPECTED_SHA256 = "332b1fecd5b85683c51111a0c61b3be7ae1021f66de505be1c0d8280e24a1c76"
PATCH = ROOT / "scripts" / "th22_root_public_fix.patch"
DIAG = ROOT / "scripts" / "th22_root_fix_failure.txt"


def run(args):
    proc = subprocess.run(args, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode != 0:
        raise SystemExit("command failed: %s\n%s" % (" ".join(args), str(proc.stdout or "")))
    return proc


def apply_fix():
    chunks = []
    metrics = []
    for index, path in enumerate(PARTS):
        if not path.exists():
            raise SystemExit("missing patch part: %s" % path.name)
        data = path.read_bytes()
        actual = hashlib.sha256(data).hexdigest()
        metrics.append("%s size=%d sha256=%s" % (path.name, len(data), actual))
        chunks.append(data)
    payload = b"".join(chunks)
    actual_payload = hashlib.sha256(payload).hexdigest()
    metrics.append("payload size=%d sha256=%s" % (len(payload), actual_payload))
    print("\n".join(metrics), flush=True)

    mismatches = []
    for index, data in enumerate(chunks):
        if len(data) != PART_SIZES[index] or hashlib.sha256(data).hexdigest() != PART_SHA256[index]:
            mismatches.append(PARTS[index].name)
    if len(payload) != EXPECTED_SIZE or actual_payload != EXPECTED_SHA256:
        mismatches.append("payload")
    if mismatches:
        raise SystemExit("root public storage patch lock mismatch: " + ",".join(mismatches))

    run([
        "git", "checkout", "origin/main", "--",
        ".github/workflows/sign-toolhub.yml",
        "scripts/generate_signed_manifest.py",
        "scripts/verify_changed_module_versions.py",
    ])
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


def publish_diagnostic(exc):
    if DIAG.exists():
        return
    message = "%s\n\n%s" % (str(exc), traceback.format_exc())
    DIAG.write_text(message[-6000:] + "\n", encoding="utf-8")
    subprocess.run(["git", "config", "user.name", "github-actions[bot]"], cwd=str(ROOT))
    subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], cwd=str(ROOT))
    subprocess.run(["git", "add", "-A"], cwd=str(ROOT))
    subprocess.run(["git", "commit", "-m", "记录 Root 公共存储补丁失败原因"], cwd=str(ROOT))
    branch = str(os.environ.get("TARGET_BRANCH", "")).strip()
    if branch:
        subprocess.run(["git", "push", "origin", "HEAD:" + branch], cwd=str(ROOT))


def main():
    if DIAG.exists():
        raise SystemExit("prior root public storage diagnostic exists")
    try:
        apply_fix()
    except BaseException as exc:
        publish_diagnostic(exc)
        raise


if __name__ == "__main__":
    main()
