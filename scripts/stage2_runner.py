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
PREFIXES = ["STAGE2_PAYLOAD_%02d\n" % index for index in range(1, 5)]
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
    if len(text) > 5000:
        text = text[-5000:]
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
    commit = git_run(["commit", "-m", "记录第二阶段压缩载荷诊断"])
    if commit.returncode != 0:
        raise SystemExit("diagnostic commit failed: " + str(commit.stdout or ""))


def normalized_base64(value):
    return "".join(str(value or "").split())


def decode_payload(parts):
    decoded_parts = []
    for part in parts:
        decoded_parts.append(base64.b64decode(normalized_base64(part)))

    candidates = []
    errors = []
    try:
        candidates.append((
            "joined_base64_gzip",
            gzip.decompress(base64.b64decode(normalized_base64("".join(parts)))),
        ))
    except Exception as exc:
        errors.append("joined_base64_gzip=" + repr(exc))
    try:
        candidates.append((
            "decoded_join_gzip",
            gzip.decompress(b"".join(decoded_parts)),
        ))
    except Exception as exc:
        errors.append("decoded_join_gzip=" + repr(exc))
    try:
        candidates.append((
            "per_part_gzip_join",
            b"".join(gzip.decompress(item) for item in decoded_parts),
        ))
    except Exception as exc:
        errors.append("per_part_gzip_join=" + repr(exc))
    candidates.append(("decoded_join_raw", b"".join(decoded_parts)))

    details = []
    for name, payload in candidates:
        actual_sha256 = hashlib.sha256(payload).hexdigest()
        details.append("%s:size=%d:sha=%s" % (name, len(payload), actual_sha256))
        if len(payload) == EXPECTED_SIZE and actual_sha256 == EXPECTED_SHA256:
            return payload
    raise SystemExit(
        "stage2 payload verification failed candidates=%s errors=%s part_chars=%s part_bytes=%s"
        % (
            ";".join(details),
            ";".join(errors),
            ",".join(str(len(normalized_base64(item))) for item in parts),
            ",".join(str(len(item)) for item in decoded_parts),
        )
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

    found = {}
    for item in comments:
        body = str(item.get("body") or "")
        for index, prefix in enumerate(PREFIXES):
            if body.startswith(prefix):
                found[index] = body[len(prefix):]
    if len(found) != len(PREFIXES):
        raise SystemExit(
            "stage2 payload parts missing: %d/%d found=%s"
            % (len(found), len(PREFIXES), sorted(found.keys()))
        )

    payload = decode_payload([found[index] for index in range(len(PREFIXES))])
    source = patch_bootstrap_cleanup(payload)
    compile(source, str(TARGET), "exec")
    TARGET.write_text(source, encoding="utf-8")
    subprocess.check_call(["python3", str(TARGET)], cwd=str(ROOT))


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        commit_diagnostic(traceback.format_exc())
