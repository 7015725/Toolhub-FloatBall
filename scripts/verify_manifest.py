#!/usr/bin/env python3
import ast
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE_DIR = ROOT / "code"
MANIFEST = ROOT / "manifest.json"
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"
SIGN_SCRIPT = ROOT / "scripts" / "generate_signed_manifest.py"


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


def sha256_file(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_python_modules():
    try:
        tree = ast.parse(SIGN_SCRIPT.read_text(encoding="utf-8"), filename=str(SIGN_SCRIPT))
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "MODULES":
                        value = ast.literal_eval(node.value)
                        return [str(item) for item in value]
    except Exception as e:
        fail("parse generate_signed_manifest.py MODULES failed: " + str(e))
    fail("MODULES not found in generate_signed_manifest.py")


def parse_entry_modules():
    try:
        text = ENTRY.read_text(encoding="utf-8")
        m = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", text, re.S)
        if not m:
            fail("var modules not found in ToolHub.js")
        return re.findall(r"\"([^\"]+\.js)\"|'([^']+\.js)'", m.group(1))
    except Exception as e:
        fail("parse ToolHub.js modules failed: " + str(e))


def parse_entry_version():
    try:
        text = ENTRY.read_text(encoding="utf-8", errors="replace")
        for symbol in ("TOOLHUB_ENTRY_VERSION", "MIN_TRUSTED_MANIFEST_VERSION"):
            match = re.search(r"\bvar\s+%s\s*=\s*(\d+)\s*;" % re.escape(symbol), text)
            if not match:
                continue
            version = int(match.group(1))
            if version <= 0:
                fail("invalid %s: %s" % (symbol, version))
            return version, symbol
    except Exception as e:
        fail("parse ToolHub.js entry version failed: " + str(e))
    fail("ToolHub.js entry version marker missing")


def flatten_regex_pairs(items):
    out = []
    for a, b in items:
        out.append(a or b)
    return out


def collect_python_files():
    roots = [ROOT / "scripts", ROOT / ".github" / "scripts"]
    return sorted(
        str(path)
        for scan_root in roots
        if scan_root.exists()
        for path in scan_root.rglob("*.py")
    )


def main():
    for path in [CODE_DIR, MANIFEST, ENTRY, ENTRY_SHA, SIGN_SCRIPT]:
        if not path.exists():
            fail(str(path.relative_to(ROOT)) + " missing")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    files = manifest.get("files") or {}
    manifest_names = list(files.keys())
    code_names = sorted(p.name for p in CODE_DIR.glob("*.js"))
    py_modules = parse_python_modules()
    entry_modules = flatten_regex_pairs(parse_entry_modules())

    if entry_modules != py_modules:
        fail("ToolHub.js modules order differs from generate_signed_manifest.py MODULES")
    if sorted(manifest_names) != sorted(code_names):
        fail("manifest files differ from code/*.js")
    if sorted(manifest_names) != sorted(py_modules):
        fail("manifest files differ from MODULES")

    for name in py_modules:
        path = CODE_DIR / name
        if not path.exists():
            fail("module missing: " + name)
        meta = files.get(name)
        if not meta:
            fail("manifest missing module: " + name)
        data_hash = sha256_file(path)
        data_size = path.stat().st_size
        if data_hash != str(meta.get("sha256", "")).lower():
            fail("sha256 mismatch: " + name)
        if data_size != int(meta.get("size", -1)):
            fail("size mismatch: " + name)

    entry_hash = sha256_file(ENTRY)
    entry_size = ENTRY.stat().st_size
    entry_version, entry_version_source = parse_entry_version()
    entry_meta = manifest.get("entry") or {}
    if str(entry_meta.get("name", "")) != "ToolHub.js":
        fail("manifest entry.name must be ToolHub.js")
    if int(entry_meta.get("version", 0) or 0) != entry_version:
        fail("manifest entry.version mismatch")
    if str(entry_meta.get("versionSource", "")) != entry_version_source:
        fail("manifest entry.versionSource mismatch")
    if str(entry_meta.get("sha256", "")).lower() != entry_hash:
        fail("manifest entry.sha256 mismatch")
    if int(entry_meta.get("size", -1)) != entry_size:
        fail("manifest entry.size mismatch")
    if entry_meta.get("manualUpdate") is not True:
        fail("manifest entry.manualUpdate must be true")

    sha_line = ENTRY_SHA.read_text(encoding="utf-8").strip()
    if entry_hash not in sha_line:
        fail("ToolHub.js.sha256 mismatch")

    py_files = collect_python_files()
    if py_files:
        subprocess.check_call([sys.executable, "-m", "py_compile"] + py_files, cwd=str(ROOT))

    print("OK manifest_version=%s files=%s entry_version=%s entry_sha=%s" % (
        manifest.get("version"),
        len(py_modules),
        entry_version,
        entry_hash,
    ))


if __name__ == "__main__":
    main()
