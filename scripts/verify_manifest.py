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


def flatten_regex_pairs(items):
    out = []
    for a, b in items:
        out.append(a or b)
    return out


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
    sha_line = ENTRY_SHA.read_text(encoding="utf-8").strip()
    if entry_hash not in sha_line:
        fail("ToolHub.js.sha256 mismatch")

    py_files = sorted(str(p) for p in (ROOT / "scripts").glob("*.py"))
    if py_files:
        subprocess.check_call(["python3", "-m", "py_compile"] + py_files, cwd=str(ROOT))

    print("OK manifest_version=%s files=%s entry_sha=%s" % (
        manifest.get("version"),
        len(py_modules),
        entry_hash,
    ))


if __name__ == "__main__":
    main()
