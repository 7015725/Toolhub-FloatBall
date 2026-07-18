#!/usr/bin/env python3
"""Generate ToolHub signed manifest from one structured update record."""
import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts" / "apply_th22_public_fix_runner.py"
if RUNNER.exists():
    subprocess.check_call(["python3", str(RUNNER)], cwd=str(ROOT))
CODE_DIR = ROOT / "code"
PRIVATE_KEY = Path.home() / ".hermes" / "toolhub_signing" / "private_key.pem"
MANIFEST = ROOT / "manifest.json"
SIG = ROOT / "manifest.sig"
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"
HISTORY = ROOT / "update_history.json"
DEFAULT_KEY_ID = "toolhub-targets-20260703-rsa3072"

MODULES = [
    "th_01_base.js", "th_02_core.js", "th_03_icon.js", "th_04_theme.js",
    "th_05_persistence.js", "th_06_icon_parser.js",
    "th_08_content.js", "th_09_animation.js", "th_10_shell.js",
    "th_11_action.js", "th_12_rebuild.js", "th_13_panel_ui.js",
    "th_14_panels.js", "th_14_button_shortcut.js",
    "th_14_button_icon_editor.js", "th_14_button_editor.js",
    "th_14_color_picker.js", "th_14_icon_picker.js",
    "th_14_schema_editor.js", "th_15_extra.js", "th_15_main_panel.js", "th_16_entry.js",
    "th_17_pointer.js", "th_18_pointer_ocr.js", "th_19_position_state.js",
    "th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js",
    "th_23_screenshot_manager.js",
]


def sha256_file(path):
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_module_version(path):
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines()[:5]:
        if "@version" not in line:
            continue
        value = line.split("@version", 1)[1].strip().split()[0].strip()
        parts = value.split(".")
        if len(parts) == 3 and all(part.isdigit() for part in parts):
            return value
    return "0.0.0"


def read_entry_version(path):
    text = path.read_text(encoding="utf-8", errors="replace")
    for symbol in ("TOOLHUB_ENTRY_VERSION", "MIN_TRUSTED_MANIFEST_VERSION"):
        match = re.search(r"\bvar\s+%s\s*=\s*(\d+)\s*;" % re.escape(symbol), text)
        if match:
            value = int(match.group(1))
            if value <= 0:
                raise SystemExit("Invalid %s in %s: %s" % (symbol, path, value))
            return value, symbol
    raise SystemExit("Entry version marker missing in ToolHub.js")


def git_output(args):
    try:
        return subprocess.check_output(
            ["git"] + list(args), cwd=str(ROOT), text=True, stderr=subprocess.STDOUT
        )
    except Exception as exc:
        return "<git %s failed: %s>\n" % (" ".join(args), exc)


def print_review_summary():
    print("== ToolHub signing review ==")
    for title, args in (
        ("git status", ["status", "--short"]),
        ("git diff --stat", ["diff", "--stat"]),
        ("staged diff --stat", ["diff", "--cached", "--stat"]),
    ):
        print("-- %s --" % title)
        value = git_output(args)
        print(value.rstrip() or "clean")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--key-id", default=DEFAULT_KEY_ID)
    ap.add_argument("--version", type=int, default=0)
    ap.add_argument("--date", default="")
    ap.add_argument("--base-ref", default="")
    args = ap.parse_args()

    if not PRIVATE_KEY.exists():
        raise SystemExit("Private key not found: %s" % PRIVATE_KEY)
    if not ENTRY.exists():
        raise SystemExit("Entry file not found: %s" % ENTRY)

    print_review_summary()
    if not args.yes and input("Sign this manifest? Type YES to continue: ").strip() != "YES":
        raise SystemExit("aborted")

    version = args.version or int(time.strftime("%Y%m%d%H%M%S", time.gmtime()))
    base_ref = str(args.base_ref or os.environ.get("GITHUB_BASE_REF", "")).strip()

    from build_update_history import finalize_history

    record, history = finalize_history(version, base_ref, args.date)
    release_title = str(record.get("title", "")).strip()
    release_date = str(record.get("date", "")).strip()
    release_changes = [
        str(item).strip() for item in (record.get("details") or []) if str(item).strip()
    ]
    if not release_title or not release_date or not release_changes:
        raise SystemExit("finalized update record is missing title, date, or details")

    files = {}
    for name in MODULES:
        path = CODE_DIR / name
        if not path.exists():
            raise SystemExit("Missing module: %s" % path)
        module_version = read_module_version(path)
        if module_version == "0.0.0":
            raise SystemExit("Module version missing or invalid: %s" % path)
        files[name] = {
            "version": module_version,
            "sha256": sha256_file(path),
            "size": path.stat().st_size,
        }

    entry_hash = sha256_file(ENTRY)
    entry_version, entry_version_source = read_entry_version(ENTRY)
    history_hash = sha256_file(HISTORY)
    history_size = HISTORY.stat().st_size
    release = {
        "title": release_title,
        "date": release_date,
        "changes": release_changes,
    }
    manifest = {
        "schema": 4,
        "version": version,
        "keyId": args.key_id,
        "alg": "SHA256withRSA",
        "entry": {
            "name": "ToolHub.js",
            "version": entry_version,
            "versionSource": entry_version_source,
            "sha256": entry_hash,
            "size": ENTRY.stat().st_size,
            "manualUpdate": True,
        },
        "files": files,
        "assets": {
            "updateHistory": {
                "name": "update_history.json",
                "schema": 1,
                "version": int(history.get("historyVersion", version)),
                "sha256": history_hash,
                "size": history_size,
            }
        },
        "release": release,
    }
    data = (
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")
    MANIFEST.write_bytes(data)
    signature = subprocess.check_output(
        ["openssl", "dgst", "-sha256", "-sign", str(PRIVATE_KEY), str(MANIFEST)]
    )
    SIG.write_text(
        base64.b64encode(signature).decode("ascii") + "\n", encoding="utf-8"
    )
    ENTRY_SHA.write_text("%s  ToolHub.js\n" % entry_hash, encoding="utf-8")

    print("== signed manifest ==")
    print("manifest_version=%s" % manifest["version"])
    print("record_id=%s" % record.get("id"))
    print("signed_files=%s" % len(files))
    print("history_records=%s" % len(history.get("records") or []))
    print("release_title=%s" % release["title"])
    print("ToolHub.js_sha256=%s" % entry_hash)


if __name__ == "__main__":
    main()
