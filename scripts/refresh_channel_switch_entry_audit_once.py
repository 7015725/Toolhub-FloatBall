#!/usr/bin/env python3
"""Refresh the entry symbol audit after adding post-switch update checks."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELF = ROOT / "scripts/refresh_channel_switch_entry_audit_once.py"
subprocess.run([
    "python3", str(ROOT / "scripts/report_entry_symbols.py"),
    "--write", "docs/audits/ENTRY_SYMBOL_AUDIT.md"
], cwd=str(ROOT), check=True)
subprocess.run([
    "python3", str(ROOT / "scripts/report_entry_symbols.py"),
    "--check", "docs/audits/ENTRY_SYMBOL_AUDIT.md"
], cwd=str(ROOT), check=True)
if SELF.exists():
    SELF.unlink()
print("Refreshed entry symbol audit")
