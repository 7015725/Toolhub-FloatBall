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
PREFIXES = ["STAGE2_PAYLOAD_%02d\n" % index for index in range(1, 5)]
EXPECTED_SIZE = 91547
EXPECTED_SHA256 = "65e633a51cf5c9e76bfda8bf640be9bc38d1e8524378cc644a6d61e528767116"


def normalized_base64(value):
    return "".join(str(value or "").split())


def decode_payload(parts):
    decoded_parts = []
    for part in parts:
        decoded_parts.append(base64.b64decode(normalized_base64(part)))

    candidates = []
    try:
        candidates.append(gzip.decompress(base64.b64decode(normalized_base64("".join(parts)))))
    except Exception:
        pass
    try:
        candidates.append(gzip.decompress(b"".join(decoded_parts)))
    except Exception:
        pass
    try:
        candidates.append(b"".join(gzip.decompress(item) for item in decoded_parts))
    except Exception:
        pass
    candidates.append(b"".join(decoded_parts))

    for payload in candidates:
        if len(payload) != EXPECTED_SIZE:
            continue
        if hashlib.sha256(payload).hexdigest() == EXPECTED_SHA256:
            return payload
    raise SystemExit(
        "stage2 payload verification failed candidates="
        + ",".join(str(len(item)) for item in candidates)
    )


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
        raise SystemExit("stage2 bootstrap cleanup anchor mismatch")
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

    found = {}
    for item in comments:
        body = str(item.get("body") or "")
        for index, prefix in enumerate(PREFIXES):
            if body.startswith(prefix):
                found[index] = body[len(prefix):]
    if len(found) != len(PREFIXES):
        raise SystemExit("stage2 payload parts missing: %d/%d" % (len(found), len(PREFIXES)))

    payload = decode_payload([found[index] for index in range(len(PREFIXES))])
    source = patch_bootstrap_cleanup(payload)
    compile(source, str(TARGET), "exec")
    TARGET.write_text(source, encoding="utf-8")
    subprocess.check_call(["python3", str(TARGET)], cwd=str(ROOT))


if __name__ == "__main__":
    main()
