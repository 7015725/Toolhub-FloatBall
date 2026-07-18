#!/usr/bin/env python3
import base64
import gzip
import hashlib
import json
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "scripts" / "apply_pickword_image_stage2.py"
SOURCE_PR = 339
PREFIX = "STAGE2_PAYLOAD_01\n"
EXPECTED_SIZE = 91547
EXPECTED_SHA256 = "65e633a51cf5c9e76bfda8bf640be9bc38d1e8524378cc644a6d61e528767116"


def normalized_base64(value):
    normalized = "".join(str(value or "").split())
    return normalized + ("=" * ((-len(normalized)) % 4))


def decode_payload(encoded):
    compressed = base64.b64decode(normalized_base64(encoded))
    payload = gzip.decompress(compressed)
    actual_sha256 = hashlib.sha256(payload).hexdigest()
    if len(payload) != EXPECTED_SIZE or actual_sha256 != EXPECTED_SHA256:
        raise SystemExit(
            "stage2 payload mismatch compressed=%d size=%d sha256=%s"
            % (len(compressed), len(payload), actual_sha256)
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
        snippet = source[max(0, position - 240):position + 700] if position >= 0 else ""
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
    main()
