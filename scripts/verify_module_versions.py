#!/usr/bin/env python3
"""校验所有签名模块具有正式版本，且源码头与清单完全一致。"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
SIGNER = ROOT / "scripts" / "generate_signed_manifest.py"
MANIFEST = ROOT / "manifest.json"


def fail(message):
    raise SystemExit("FAIL module-versions: " + message)


signer_text = SIGNER.read_text(encoding="utf-8")
match = re.search(r"MODULES\s*=\s*\[(.*?)\]\s*", signer_text, re.S)
if not match:
    fail("cannot locate signed module list")
modules = re.findall(r'["\']([^"\']+\.js)["\']', match.group(1))
if not modules:
    fail("signed module list is empty")
if len(modules) != len(set(modules)):
    fail("signed module list contains duplicates")

if 'if module_version == "0.0.0":' not in signer_text:
    fail("signer does not reject reserved 0.0.0")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
manifest_files = manifest.get("files") or {}

versions = {}
for name in modules:
    path = CODE / name
    if not path.exists():
        fail("module missing: " + name)
    first = "\n".join(path.read_text(encoding="utf-8", errors="replace").splitlines()[:5])
    found = re.search(r"@version\s+(\d+)\.(\d+)\.(\d+)(?:\s|$)", first)
    if not found:
        fail("version header missing or invalid: " + name)
    version = ".".join(found.groups())
    if version == "0.0.0":
        fail("reserved version 0.0.0: " + name)
    versions[name] = version

    entry = manifest_files.get(name)
    if not isinstance(entry, dict):
        fail("manifest entry missing: " + name)
    manifest_version = str(entry.get("version") or "")
    if manifest_version != version:
        fail("manifest/source version mismatch %s: %s != %s" % (name, manifest_version, version))

extra = sorted(set(manifest_files) - set(modules))
missing = sorted(set(modules) - set(manifest_files))
if extra:
    fail("manifest contains unsigned-list extras: " + ", ".join(extra))
if missing:
    fail("manifest missing modules: " + ", ".join(missing))

print("Module version verification passed modules=%d" % len(versions))
