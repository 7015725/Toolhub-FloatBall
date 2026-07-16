#!/usr/bin/env python3
"""校验相对基线发生内容变化的签名模块必须提升语义版本，入口变化必须提升入口版本。"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
ENTRY = ROOT / "ToolHub.js"
SIGNER = ROOT / "scripts" / "generate_signed_manifest.py"

def fail(message):
    raise SystemExit("FAIL changed-module-versions: " + message)


def run_git(args, check=True):
    proc = subprocess.run(
        ["git"] + list(args),
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if check and proc.returncode != 0:
        fail(
            "git %s failed: %s"
            % (" ".join(args), (proc.stderr or proc.stdout).strip())
        )
    return proc


def parse_version(text, label):
    first = "\n".join(str(text).splitlines()[:5])
    found = re.search(r"@version\s+(\d+)\.(\d+)\.(\d+)(?:\s|$)", first)
    if not found:
        fail("version header missing or invalid: " + label)
    values = tuple(int(x) for x in found.groups())
    return values, ".".join(found.groups())


def parse_entry_version(text, label):
    for symbol in ("TOOLHUB_ENTRY_VERSION", "MIN_TRUSTED_MANIFEST_VERSION"):
        found = re.search(r"\bvar\s+%s\s*=\s*(\d+)\s*;" % re.escape(symbol), str(text))
        if not found:
            continue
        value = int(found.group(1))
        if value <= 0:
            fail("entry version marker invalid: %s %s" % (label, value))
        return value, symbol
    fail("entry version marker missing: " + label)


def resolve_base(explicit):
    if explicit:
        return explicit

    base_name = os.environ.get("GITHUB_BASE_REF", "").strip()
    if base_name:
        return "origin/" + base_name

    parent = run_git(["rev-parse", "--verify", "HEAD^"], check=False)
    if parent.returncode == 0:
        return "HEAD^"

    fail("cannot resolve comparison base; pass --base-ref")


def signed_modules():
    signer_text = SIGNER.read_text(encoding="utf-8")
    match = re.search(r"MODULES\s*=\s*\[(.*?)\]\s*", signer_text, re.S)
    if not match:
        fail("cannot locate signed module list")

    modules = re.findall(r'["\']([^"\']+\.js)["\']', match.group(1))
    if not modules:
        fail("signed module list is empty")
    return set(modules)


parser = argparse.ArgumentParser()
parser.add_argument("--base-ref", default="")
args = parser.parse_args()

base_ref = resolve_base(args.base_ref)
merge_base = run_git(["merge-base", base_ref, "HEAD"]).stdout.strip()
if not merge_base:
    fail("empty merge base for " + base_ref)

modules = signed_modules()
changed_text = run_git(
    ["diff", "--name-only", merge_base, "HEAD", "--", "code"]
).stdout

changed = []
for raw in changed_text.splitlines():
    rel = raw.strip()
    if not rel.startswith("code/") or not rel.endswith(".js"):
        continue
    name = rel[len("code/"):]
    if name in modules:
        changed.append((rel, name))

checked = 0
for rel, name in sorted(changed):
    current_path = ROOT / rel
    if not current_path.exists():
        fail("changed signed module removed: " + name)

    current_text = current_path.read_text(encoding="utf-8", errors="replace")
    current_tuple, current_version = parse_version(current_text, name)

    base_obj = "%s:%s" % (merge_base, rel)
    exists = run_git(["cat-file", "-e", base_obj], check=False)
    if exists.returncode != 0:
        if current_tuple == (0, 0, 0):
            fail("new module uses reserved version 0.0.0: " + name)
        print(
            "OK changed-module-version new=%s version=%s"
            % (name, current_version)
        )
        checked += 1
        continue

    base_text = run_git(["show", base_obj]).stdout
    if base_text == current_text:
        continue

    base_tuple, base_version = parse_version(base_text, name)
    if current_tuple <= base_tuple:
        fail(
            "%s content changed but version did not increase: %s -> %s"
            % (name, base_version, current_version)
        )

    print(
        "OK changed-module-version module=%s version=%s->%s"
        % (name, base_version, current_version)
    )
    checked += 1

entry_changed = run_git(
    ["diff", "--name-only", merge_base, "HEAD", "--", str(ENTRY.relative_to(ROOT))]
).stdout.strip()
if entry_changed:
    current_text = ENTRY.read_text(encoding="utf-8", errors="replace")
    current_version, current_source = parse_entry_version(current_text, "ToolHub.js")
    base_text = run_git(["show", "%s:ToolHub.js" % merge_base]).stdout
    base_version, base_source = parse_entry_version(base_text, "base ToolHub.js")
    if current_version <= base_version:
        fail(
            "ToolHub.js changed but entry version did not increase: %s(%s) -> %s(%s)"
            % (base_version, base_source, current_version, current_source)
        )
    print(
        "OK changed-entry-version version=%s(%s)->%s(%s)"
        % (base_version, base_source, current_version, current_source)
    )

print(
    "Changed module version verification passed base=%s modules=%d"
    % (base_ref, checked)
)
