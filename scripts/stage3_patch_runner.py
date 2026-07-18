#!/usr/bin/env python3
import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / "scripts" / ("stage3_patch_%02d.part" % i) for i in range(1, 14)]
EXPECTED_SIZE = 64273
EXPECTED_SHA256 = "d55aeecf457c08cef935a659a981036b4888fccc5f995c0e845d6790dfa34c12"
PART_SHA256 = [
    "1eabd600273911e3bb5d0b6462107607713de9ad8934bd49df3150e98d42ff9c",
    "1d36fbfecfb888048282c0558340d4d5704f73bf100c95b10eeab4a1b3750eb3",
    "86cc8c85ac2bb210d95b4a21c4bdb6105cf2fa457132450ed9b47d96828d990e",
    "9a2852799226daa46c26a7a8ef395ef95ccbeedaf17d5c91f38a72ec8411501b",
    "ffabf53dc88db1a5d4b15dcb7a58b1d6c9291fa8890f459c5f2773e7128e6fe1",
    "6a2eaa35d2711234cd4dd193c68f158af46e26d94fcfb068ab73bb59e8444056",
    "8ce551099c7777b7bd37fb7f7a901494de6891b853361c0e3028ac39c5364174",
    "3618b43191c84119aa988afcddd9be7a48ac24cd5943966c1b7d3ad74ad96624",
    "ef5e4e8ce2ea3c16653b45d7be4f0fe1369afd62c4e640ce1a7aeb2eef6f94ab",
    "18e011e9b607efe7bf80c3a9137dd0c0a5f17ded356d25fc55af0ce55dfd96d0",
    "cf9185f0a8997af9fd3d546edf6abb522e63bdb4a794941e1c98d31374aee252",
    "e04a0827dbfbde7eb44a63cf4b917fe865004eb5dfc9b5eb6ae047747d092467",
    "96fe3b3f5c09a35e137d4bd7ce1b2632065fce66578710d2e7f0d6cbbc5e36c2"
]
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
