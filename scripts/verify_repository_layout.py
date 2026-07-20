#!/usr/bin/env python3
"""Verify the repository's top-level documentation and constraint layout."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = (
    "docs/ARCHITECTURE.md",
    "docs/STRUCTURE.md",
    "docs/SQLITE_STORAGE.md",
    "docs/audits/DEAD_CODE_AUDIT.md",
    "docs/audits/ENTRY_SYMBOL_AUDIT.md",
    "docs/audits/MODULE_SYMBOL_AUDIT.md",
    "docs/audits/PROTECTED_WRAPPER_AUDIT.md",
    "constraints/MODULE_BOUNDARIES.json",
)

FORBIDDEN_ROOT_FILES = (
    "docs/ARCHITECTURE.md",
    "docs/STRUCTURE.md",
    "docs/SQLITE_STORAGE.md",
    "docs/audits/DEAD_CODE_AUDIT.md",
    "docs/audits/ENTRY_SYMBOL_AUDIT.md",
    "docs/audits/MODULE_SYMBOL_AUDIT.md",
    "docs/audits/PROTECTED_WRAPPER_AUDIT.md",
    "constraints/MODULE_BOUNDARIES.json",
)

ALLOWED_ROOT_JSON = {"manifest.json", "update_history.json"}


def fail(message):
    raise SystemExit("FAIL repository-layout: " + message)


for relative in REQUIRED_FILES:
    if not (ROOT / relative).is_file():
        fail("missing required file: " + relative)

for name in FORBIDDEN_ROOT_FILES:
    if (ROOT / name).exists():
        fail("obsolete root path remains: " + name)

root_markdown = sorted(path.name for path in ROOT.glob("*.md"))
if root_markdown != ["README.md"]:
    fail("root Markdown must contain only README.md: " + ", ".join(root_markdown))

root_audits = sorted(path.name for path in ROOT.glob("*_AUDIT.md"))
if root_audits:
    fail("audit reports must stay in docs/audits: " + ", ".join(root_audits))

root_json = sorted(path.name for path in ROOT.glob("*.json"))
unexpected_json = sorted(set(root_json) - ALLOWED_ROOT_JSON)
if unexpected_json:
    fail("unexpected root JSON files: " + ", ".join(unexpected_json))

methods_path = ROOT / "constraints" / "methods.json"
try:
    methods = json.loads(methods_path.read_text(encoding="utf-8"))
except (OSError, ValueError) as exc:
    fail("cannot read constraints/methods.json: %s" % exc)
if methods.get("source") != "constraints/MODULE_BOUNDARIES.json":
    fail("constraints/methods.json source must be constraints/MODULE_BOUNDARIES.json")

audit_dir = ROOT / "docs" / "audits"
unexpected_audit_dirs = [path for path in audit_dir.iterdir() if path.is_dir()]
if unexpected_audit_dirs:
    fail("docs/audits must stay flat")

print(
    "OK repository-layout root_markdown=%d root_json=%d core_docs=3 audits=4 constraints=1"
    % (len(root_markdown), len(root_json))
)
