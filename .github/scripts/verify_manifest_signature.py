#!/usr/bin/env python3
import base64
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "manifest.json"
SIG = ROOT / "manifest.sig"
ENTRY = ROOT / "ToolHub.js"


def fail(message):
    print("FAIL:", message)
    return 1


def pem_from_der_b64(pub_b64):
    der = base64.b64decode(pub_b64)
    body = base64.b64encode(der).decode("ascii")
    lines = [body[i:i + 64] for i in range(0, len(body), 64)]
    return "-----BEGIN PUBLIC KEY-----\n" + "\n".join(lines) + "\n-----END PUBLIC KEY-----\n"


def main():
    for path in [MANIFEST, SIG, ENTRY]:
        if not path.exists():
            return fail(str(path.relative_to(ROOT)) + " missing")
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except Exception as exc:
        return fail("manifest json parse failed: " + str(exc))
    key_id = str(manifest.get("keyId") or "")
    if not key_id:
        return fail("manifest keyId missing")
    entry_text = ENTRY.read_text(encoding="utf-8", errors="replace")
    pattern = r"[\"']" + re.escape(key_id) + r"[\"']\s*:\s*[\"']([^\"']+)[\"']"
    match = re.search(pattern, entry_text)
    if not match:
        return fail("public key not found for keyId " + key_id)
    try:
        pub_pem = pem_from_der_b64(match.group(1))
        sig_bin = base64.b64decode(SIG.read_text(encoding="utf-8").strip())
    except Exception as exc:
        return fail("base64 decode failed: " + str(exc))
    with tempfile.TemporaryDirectory() as td:
        pub_path = Path(td) / "public.pem"
        sig_path = Path(td) / "manifest.sig.bin"
        pub_path.write_text(pub_pem, encoding="ascii")
        sig_path.write_bytes(sig_bin)
        proc = subprocess.run([
            "openssl", "dgst", "-sha256", "-verify", str(pub_path),
            "-signature", str(sig_path), str(MANIFEST)
        ], cwd=str(ROOT), text=True, capture_output=True)
    output = (proc.stdout or "") + (proc.stderr or "")
    print(output.strip())
    if proc.returncode != 0:
        return fail("signature verification failed")
    print("PUBLIC_KEY_MATCH True " + key_id)
    print("SIGNATURE_VERIFY_OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
