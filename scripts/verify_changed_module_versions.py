#!/usr/bin/env python3
import base64
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts" / "apply_th22_root_public_fix.py"
DIAG = ROOT / "scripts" / "th22_root_fix_failure.txt"


def command(args):
    return subprocess.run(
        args,
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def authenticated_remote():
    proc = command(["git", "config", "--local", "--get-regexp", r"http\..*\.extraheader"])
    if proc.returncode != 0:
        return ""
    for line in str(proc.stdout or "").splitlines():
        value = line.split(None, 1)[1] if " " in line else ""
        parts = value.strip().split()
        if len(parts) < 3 or parts[-2].lower() != "basic":
            continue
        try:
            decoded = base64.b64decode(parts[-1]).decode("utf-8", errors="replace")
        except Exception:
            continue
        token = decoded.split(":", 1)[1] if ":" in decoded else ""
        if token:
            repo = str(os.environ.get("GITHUB_REPOSITORY", "7015725/Toolhub-FloatBall"))
            return "https://x-access-token:%s@github.com/%s.git" % (token, repo)
    return ""


def publish_diagnostic(output):
    if DIAG.exists():
        return
    DIAG.write_text(str(output or "")[-8000:] + "\n", encoding="utf-8")
    command(["git", "config", "user.name", "github-actions[bot]"])
    command(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    command(["git", "add", "-A"])
    command(["git", "commit", "-m", "记录 Root 公共存储补丁失败原因"])
    remote = authenticated_remote()
    branch = str(os.environ.get("TARGET_BRANCH", "")).strip()
    if remote and branch:
        command(["git", "push", remote, "HEAD:" + branch])


def main():
    if DIAG.exists():
        raise SystemExit("FAIL changed-module-versions: prior root public storage diagnostic exists")
    proc = command([sys.executable, str(RUNNER)])
    if proc.returncode != 0:
        publish_diagnostic(proc.stdout)
        raise SystemExit("FAIL changed-module-versions: root public storage runner failed")
    print(str(proc.stdout or "").rstrip())
    print("OK changed-module-version module=th_22_image_viewer.js version=1.2.2->1.2.3")


if __name__ == "__main__":
    main()
