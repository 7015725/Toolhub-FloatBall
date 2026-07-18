#!/usr/bin/env python3
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / "scripts" / ("stage3_patch_%02d.part" % i) for i in range(1, 5)]
EXPECTED_SIZE = 64273
EXPECTED_SHA256 = "d55aeecf457c08cef935a659a981036b4888fccc5f995c0e845d6790dfa34c12"
PART_SHA256 = ['9a56c1fb36c1e5de0f62d9bfb7aca9be8b2657642eb55f4b3f93e5ffd337d9d7', 'e610decb15ca167932fd506e3c4a281884ba9774ea4d60379944a0b60bcbc90f', 'c3b268c9770649f84dc03717602d864793ec9d5a50f1b40bb9fd6b0200c97d73', 'eb9a93ef425d4ca7abefacec7536bbed39b6be4af57b2f6ad04760058657cc37']
PATCH = ROOT / "scripts" / "stage3_screenshot_manager.patch"


def run(args, check=True):
    proc = subprocess.run(args, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if check and proc.returncode != 0:
        raise SystemExit("command failed: %s\n%s" % (" ".join(args), str(proc.stdout or "")))
    return proc


def main():
    chunks = []
    for index, path in enumerate(PARTS):
        if not path.exists():
            raise SystemExit("missing patch part: %s" % path.name)
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        if digest != PART_SHA256[index]:
            raise SystemExit("patch part digest mismatch: %s" % path.name)
        chunks.append(data)
    payload = b"".join(chunks)
    if len(payload) != EXPECTED_SIZE or hashlib.sha256(payload).hexdigest() != EXPECTED_SHA256:
        raise SystemExit("stage3 patch digest mismatch")

    run(["git", "checkout", "origin/main", "--", "manifest.sig", "scripts/generate_signed_manifest.py"])
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
    run(["git", "commit", "-m", "接入截图管理器第三阶段源码"])
    print("stage3 patch applied sha256=%s" % EXPECTED_SHA256)


if __name__ == "__main__":
    main()
