#!/usr/bin/env python3
import base64
import gzip
import hashlib
import json
import subprocess
import traceback
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "scripts" / "apply_pickword_image_stage2.py"
DIAGNOSTIC = ROOT / "stage2_payload_failure.txt"
SOURCE_PR = 339
PREFIX = "STAGE2_PAYLOAD_01\n"
EXPECTED_SIZE = 91547
EXPECTED_SHA256 = "65e633a51cf5c9e76bfda8bf640be9bc38d1e8524378cc644a6d61e528767116"


def git_run(args):
    return subprocess.run(
        ["git"] + list(args),
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def commit_diagnostic(message):
    text = str(message or "unknown stage2 payload failure")
    if len(text) > 6000:
        text = text[-6000:]
    DIAGNOSTIC.write_text(text + "\n", encoding="utf-8")
    git_run(["config", "user.name", "github-actions[bot]"])
    git_run([
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
    ])
    add = git_run(["add", "stage2_payload_failure.txt"])
    if add.returncode != 0:
        raise SystemExit("diagnostic git add failed: " + str(add.stdout or ""))
    commit = git_run(["commit", "-m", "记录补齐载荷后的精确诊断"])
    if commit.returncode != 0:
        raise SystemExit("diagnostic commit failed: " + str(commit.stdout or ""))


def normalized_base64(value):
    raw = "".join(str(value or "").split())
    return raw + ("=" * ((-len(raw)) % 4))


def decode_payload(encoded):
    raw = "".join(str(encoded or "").split())
    normalized = raw + ("=" * ((-len(raw)) % 4))
    compressed = base64.b64decode(normalized)
    try:
        payload = gzip.decompress(compressed)
    except Exception as exc:
        raise SystemExit(
            "stage2 gzip failed chars=%d mod4=%d padded=%d compressed=%d head=%r tail=%r error=%r"
            % (
                len(raw),
                len(raw) % 4,
                len(normalized) - len(raw),
                len(compressed),
                compressed[:40],
                compressed[-40:],
                exc,
            )
        )
    actual_sha256 = hashlib.sha256(payload).hexdigest()
    if len(payload) != EXPECTED_SIZE or actual_sha256 != EXPECTED_SHA256:
        raise SystemExit(
            "stage2 payload mismatch chars=%d compressed=%d size=%d sha256=%s head=%r tail=%r"
            % (
                len(raw),
                len(compressed),
                len(payload),
                actual_sha256,
                payload[:80],
                payload[-80:],
            )
        )
    return payload


def patch_bootstrap_cleanup(payload):
    source = payload.decode("utf-8")
    old = (
        "    temp_module = '    \"th_stage2_bootstrap.js\",\\n'\n"
        "    if temp_module not in gen:\n"
        "        raise SystemExit(\"stage2 temporary module entry missing\")\n"
        "    gen = gen.replace(temp_module, \"\", 1)\n"
        "    write(\"scripts/generate_signed_manifest.py\", gen)\n"
        "    try:\n"
        "        (ROOT / \"code\" / \"th_stage2_bootstrap.js\").unlink()\n"
        "    except FileNotFoundError:\n"
        "        pass\n"
    )
    new = "    write(\"scripts/generate_signed_manifest.py\", gen)\n"
    if source.count(old) != 1:
        position = source.find("temp_module")
        snippet = source[max(0, position - 300):position + 900] if position >= 0 else ""
        raise SystemExit(
            "stage2 bootstrap cleanup anchor mismatch count=%d position=%d snippet=%r"
            % (source.count(old), position, snippet)
        )
    return source.replace(old, new, 1)


def main():
    repo = "7015725/Toolhub-FloatBall"
    url = "https://api.github.com/repos/%s/issues/%d/comments?per_page=100" % (
        repo,
        SOURCE_PR,
    )
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "toolhub-stage2-payload",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        comments = json.loads(response.read().decode("utf-8"))

    payload_text = ""
    for item in comments:
        body = str(item.get("body") or "")
        if body.startswith(PREFIX):
            payload_text = body[len(PREFIX):]
            break
    if not payload_text:
        raise SystemExit("stage2 payload comment missing")

    payload = decode_payload(payload_text)
    source = patch_bootstrap_cleanup(payload)
    compile(source, str(TARGET), "exec")
    TARGET.write_text(source, encoding="utf-8")
    subprocess.check_call(["python3", str(TARGET)], cwd=str(ROOT))


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        commit_diagnostic(traceback.format_exc())
