#!/usr/bin/env python3
"""Generate ToolHub signed manifest and entry checksum.

Security notes:
- Private key stays outside the repo by default: ~/.hermes/toolhub_signing/private_key.pem
- The script prints git status/diff summary before signing. Use --yes in automation.
"""
import argparse
import base64
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE_DIR = ROOT / "code"
PRIVATE_KEY = Path.home() / ".hermes" / "toolhub_signing" / "private_key.pem"
MANIFEST = ROOT / "manifest.json"
SIG = ROOT / "manifest.sig"
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"
DEFAULT_KEY_ID = "toolhub-targets-20260703-rsa3072"

MODULES = [
    "th_01_base.js", "th_02_core.js", "th_03_icon.js", "th_04_theme.js",
    "th_05_persistence.js", "th_06_icon_parser.js",
    "th_08_content.js", "th_09_animation.js", "th_10_shell.js",
    "th_11_action.js", "th_12_rebuild.js", "th_13_panel_ui.js",
    "th_14_panels.js", "th_14_button_shortcut.js",
    "th_14_button_icon_editor.js", "th_14_button_editor.js",
    "th_14_color_picker.js", "th_14_icon_picker.js",
    "th_14_schema_editor.js", "th_15_extra.js", "th_16_entry.js",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_module_version(path: Path) -> str:
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines()[:5]:
            line = line.strip()
            if "@version" not in line:
                continue
            version_text = line.split("@version", 1)[1].strip().split()[0].strip()
            parts = version_text.split(".")
            if len(parts) == 3 and all(part.isdigit() for part in parts):
                return version_text
    except Exception:
        pass
    return "0.0.0"


def git_output(args):
    try:
        return subprocess.check_output(["git", *args], cwd=ROOT, text=True, stderr=subprocess.STDOUT)
    except Exception as e:
        return f"<git {' '.join(args)} failed: {e}>\n"


def print_review_summary() -> None:
    print("== ToolHub signing review ==")
    print("-- git status --")
    status = git_output(["status", "--short"])
    print(status.rstrip() or "clean")
    print("-- git diff --stat --")
    diff_stat = git_output(["diff", "--stat"])
    print(diff_stat.rstrip() or "no unstaged diff")
    print("-- staged diff --stat --")
    staged = git_output(["diff", "--cached", "--stat"])
    print(staged.rstrip() or "no staged diff")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--yes", action="store_true", help="skip interactive confirmation after review summary")
    ap.add_argument("--key-id", default=DEFAULT_KEY_ID)
    ap.add_argument("--version", type=int, default=0, help="manifest version; default UTC yyyyMMddHHmmss")
    ap.add_argument("--title", default="", help="optional release title written to manifest.release.title")
    ap.add_argument("--date", default="", help="optional release date written to manifest.release.date")
    ap.add_argument("--change", action="append", default=[], help="optional release note item; repeat for multiple changes")
    args = ap.parse_args()

    if not PRIVATE_KEY.exists():
        raise SystemExit(f"Private key not found: {PRIVATE_KEY}")
    if not ENTRY.exists():
        raise SystemExit(f"Entry file not found: {ENTRY}")

    print_review_summary()
    if not args.yes:
        ans = input("Sign this manifest? Type YES to continue: ").strip()
        if ans != "YES":
            raise SystemExit("aborted")

    files = {}
    for name in MODULES:
        path = CODE_DIR / name
        if not path.exists():
            raise SystemExit(f"Missing module: {path}")
        files[name] = {
            "version": read_module_version(path),
            "sha256": sha256_file(path),
            "size": path.stat().st_size,
        }

    version = args.version or int(time.strftime("%Y%m%d%H%M%S", time.gmtime()))
    manifest = {
        "schema": 3,
        "version": version,
        "keyId": args.key_id,
        "alg": "SHA256withRSA",
        "files": files,
    }
    release = {}
    title = str(args.title or "").strip()
    date = str(args.date or "").strip()
    changes = [str(item).strip() for item in (args.change or []) if str(item).strip()]
    if title:
        release["title"] = title
    if date:
        release["date"] = date
    if changes:
        release["changes"] = changes
    if release:
        manifest["release"] = release
    data = (json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
    MANIFEST.write_bytes(data)

    sig_bin = subprocess.check_output([
        "openssl", "dgst", "-sha256", "-sign", str(PRIVATE_KEY), str(MANIFEST)
    ])
    SIG.write_text(base64.b64encode(sig_bin).decode("ascii") + "\n", encoding="utf-8")

    entry_hash = sha256_file(ENTRY)
    ENTRY_SHA.write_text(f"{entry_hash}  ToolHub.js\n", encoding="utf-8")

    print("== signed manifest ==")
    print(f"manifest_version={manifest['version']}")
    print(f"key_id={manifest['keyId']}")
    print(f"signed_files={len(files)}")
    if manifest.get("release"):
        rel = manifest["release"]
        print(f"release_title={rel.get('title', '')}")
        print(f"release_changes={len(rel.get('changes', []))}")
    print(f"ToolHub.js_sha256={entry_hash}")


if __name__ == "__main__":
    main()
