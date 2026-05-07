#!/usr/bin/env python3
"""Generate ToolHub signed manifest.

Requires openssl CLI. Private key is kept outside the repo by default:
  ~/.hermes/toolhub_signing/private_key.pem
"""
import base64
import hashlib
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE_DIR = ROOT / "code"
PRIVATE_KEY = Path.home() / ".hermes" / "toolhub_signing" / "private_key.pem"
MANIFEST = ROOT / "manifest.json"
SIG = ROOT / "manifest.sig"

MODULES = [
    "th_01_base.js", "th_02_core.js", "th_03_icon.js", "th_04_theme.js",
    "th_05_persistence.js", "th_06_icon_parser.js", "th_07_shortcut.js",
    "th_08_content.js", "th_09_animation.js", "th_10_shell.js",
    "th_11_action.js", "th_12_rebuild.js", "th_13_panel_ui.js",
    "th_14_panels.js", "th_15_extra.js", "th_16_entry.js",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    if not PRIVATE_KEY.exists():
        raise SystemExit(f"Private key not found: {PRIVATE_KEY}")

    files = {}
    for name in MODULES:
        path = CODE_DIR / name
        if not path.exists():
            raise SystemExit(f"Missing module: {path}")
        files[name] = {
            "sha256": sha256_file(path),
            "size": path.stat().st_size,
        }

    manifest = {
        "schema": 1,
        "version": int(time.strftime("%Y%m%d%H%M%S", time.gmtime())),
        "alg": "SHA256withRSA",
        "files": files,
    }
    data = (json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    MANIFEST.write_bytes(data)

    sig_bin = subprocess.check_output([
        "openssl", "dgst", "-sha256", "-sign", str(PRIVATE_KEY), str(MANIFEST)
    ])
    SIG.write_text(base64.b64encode(sig_bin).decode("ascii") + "\n", encoding="utf-8")
    print(f"manifest_version={manifest['version']}")
    print(f"signed_files={len(files)}")


if __name__ == "__main__":
    main()
