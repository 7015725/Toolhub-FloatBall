#!/usr/bin/env python3
import ast
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE_DIR = ROOT / "code"
MANIFEST = ROOT / "manifest.json"
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"
HISTORY = ROOT / "update_history.json"
SIGN_SCRIPT = ROOT / "scripts" / "generate_signed_manifest.py"
CHANNEL_BRANCHES = {"stable": "main", "beta": "beta"}


def fail(message):
    print("FAIL:", message)
    raise SystemExit(1)


def sha256_file(path):
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_python_modules():
    tree = ast.parse(SIGN_SCRIPT.read_text(encoding="utf-8"), filename=str(SIGN_SCRIPT))
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "MODULES":
                    return [str(item) for item in ast.literal_eval(node.value)]
    fail("MODULES not found in generate_signed_manifest.py")


def parse_entry_modules():
    text = ENTRY.read_text(encoding="utf-8")
    match = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", text, re.S)
    if not match:
        fail("var modules not found in ToolHub.js")
    pairs = re.findall(r'"([^\"]+\.js)"|\'([^\']+\.js)\'', match.group(1))
    return [a or b for a, b in pairs]


def parse_entry_version():
    text = ENTRY.read_text(encoding="utf-8", errors="replace")
    for symbol in ("TOOLHUB_ENTRY_VERSION", "MIN_TRUSTED_MANIFEST_VERSION"):
        match = re.search(r"\bvar\s+%s\s*=\s*(\d+)\s*;" % re.escape(symbol), text)
        if match:
            value = int(match.group(1))
            if value <= 0:
                fail("invalid %s: %s" % (symbol, value))
            return value, symbol
    fail("ToolHub.js entry version marker missing")


def collect_python_files():
    roots = [ROOT / "scripts", ROOT / ".github" / "scripts"]
    return sorted(
        str(path)
        for scan_root in roots
        if scan_root.exists()
        for path in scan_root.rglob("*.py")
    )


def main():
    for path in (CODE_DIR, MANIFEST, ENTRY, ENTRY_SHA, HISTORY, SIGN_SCRIPT):
        if not path.exists():
            fail(str(path.relative_to(ROOT)) + " missing")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if int(manifest.get("schema", 0) or 0) < 5:
        fail("manifest schema must be at least 5")
    channel = str(manifest.get("channel", "")).strip().lower()
    branch = str(manifest.get("branch", "")).strip()
    if channel not in CHANNEL_BRANCHES:
        fail("manifest channel must be stable or beta")
    if branch != CHANNEL_BRANCHES[channel]:
        fail("manifest branch does not match channel")
    expected_channel = str(os.environ.get("TOOLHUB_UPDATE_CHANNEL", "")).strip().lower()
    if expected_channel and channel != expected_channel:
        fail("manifest channel %s does not match expected %s" % (channel, expected_channel))
    files = manifest.get("files") or {}
    py_modules = parse_python_modules()
    entry_modules = parse_entry_modules()
    code_names = sorted(path.name for path in CODE_DIR.glob("*.js"))
    if entry_modules != py_modules:
        fail("ToolHub.js modules order differs from generate_signed_manifest.py MODULES")
    if sorted(files.keys()) != code_names or sorted(files.keys()) != sorted(py_modules):
        fail("manifest files differ from code/*.js or MODULES")
    for name in py_modules:
        path = CODE_DIR / name
        meta = files.get(name) or {}
        if sha256_file(path) != str(meta.get("sha256", "")).lower():
            fail("sha256 mismatch: " + name)
        if path.stat().st_size != int(meta.get("size", -1)):
            fail("size mismatch: " + name)

    entry_hash = sha256_file(ENTRY)
    entry_version, entry_source = parse_entry_version()
    entry_meta = manifest.get("entry") or {}
    if str(entry_meta.get("name", "")) != "ToolHub.js":
        fail("manifest entry.name must be ToolHub.js")
    if int(entry_meta.get("version", 0) or 0) != entry_version or str(
        entry_meta.get("versionSource", "")
    ) != entry_source:
        fail("manifest entry version mismatch")
    if str(entry_meta.get("sha256", "")).lower() != entry_hash or int(
        entry_meta.get("size", -1)
    ) != ENTRY.stat().st_size:
        fail("manifest entry hash/size mismatch")
    if entry_meta.get("manualUpdate") is not True:
        fail("manifest entry.manualUpdate must be true")
    if entry_hash not in ENTRY_SHA.read_text(encoding="utf-8").strip():
        fail("ToolHub.js.sha256 mismatch")

    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    asset = ((manifest.get("assets") or {}).get("updateHistory") or {})
    if str(asset.get("name", "")) != "update_history.json" or int(
        asset.get("schema", 0) or 0
    ) != 1:
        fail("manifest updateHistory asset missing or invalid")
    if str(asset.get("sha256", "")).lower() != sha256_file(HISTORY):
        fail("update_history sha256 mismatch")
    if int(asset.get("size", -1)) != HISTORY.stat().st_size:
        fail("update_history size mismatch")
    if int(asset.get("version", 0) or 0) != int(
        history.get("historyVersion", 0) or 0
    ):
        fail("update_history version mismatch")

    records = history.get("records") or []
    if not records:
        fail("update history records missing")
    if int(records[0].get("manifestVersion", 0) or 0) != int(
        manifest.get("version", 0) or 0
    ):
        fail("latest update history record must match manifest version")
    current = records[0]
    release = manifest.get("release") or {}
    if str(release.get("title", "")) != str(current.get("title", "")):
        fail("manifest release title differs from current history record")
    if str(release.get("date", "")) != str(current.get("date", "")):
        fail("manifest release date differs from current history record")
    if [str(x) for x in (release.get("changes") or [])] != [
        str(x) for x in (current.get("details") or [])
    ]:
        fail("manifest release changes differ from current history record")

    subprocess.check_call(
        [sys.executable, "scripts/verify_update_history.py"], cwd=str(ROOT)
    )
    subprocess.check_call(
        [sys.executable, "scripts/verify_release_record_flow.py"], cwd=str(ROOT)
    )
    py_files = collect_python_files()
    if py_files:
        subprocess.check_call(
            [sys.executable, "-W", "error::SyntaxWarning", "-m", "py_compile"] + py_files, cwd=str(ROOT)
        )
    print(
        "OK manifest_version=%s channel=%s branch=%s files=%s history=%s entry_version=%s"
        % (manifest.get("version"), channel, branch, len(py_modules), len(records), entry_version)
    )


if __name__ == "__main__":
    main()
