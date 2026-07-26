#!/usr/bin/env python3
"""Idempotently add the beta-only ShortXUI modules to ToolHub.js."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
TARGET_ENTRY_VERSION = 20260727234500
RUNTIME = '"th_24_shortx_ui_runtime.js"'
LAB = '"th_34_shortx_ui_lab.js"'


def insert_after(text, anchor, item):
    if item in text:
        return text
    if anchor not in text:
        raise SystemExit("module anchor missing: %s" % anchor)
    return text.replace(anchor, anchor + ", " + item, 1)


def main():
    text = ENTRY.read_text(encoding="utf-8")
    original = text
    text = insert_after(text, '"th_02_core.js"', RUNTIME)
    text = insert_after(text, '"th_15_extra.js"', LAB)

    pattern = re.compile(r"var TOOLHUB_ENTRY_VERSION = (\d+);")
    match = pattern.search(text)
    if not match:
        raise SystemExit("TOOLHUB_ENTRY_VERSION missing")
    current = int(match.group(1))
    if current < TARGET_ENTRY_VERSION:
        text = pattern.sub(
            "var TOOLHUB_ENTRY_VERSION = %d;" % TARGET_ENTRY_VERSION,
            text,
            count=1,
        )

    if text != original:
        ENTRY.write_text(text, encoding="utf-8")
        print("updated ToolHub.js for beta ShortXUI phase 1")
    else:
        print("ToolHub.js already contains beta ShortXUI phase 1")


if __name__ == "__main__":
    main()
