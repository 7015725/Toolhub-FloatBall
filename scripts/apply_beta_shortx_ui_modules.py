#!/usr/bin/env python3
"""Idempotently prepare the beta-only ShortXUI runtime release."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
GENERATOR = ROOT / "scripts" / "generate_signed_manifest.py"
RUNTIME_FILE = ROOT / "code" / "th_24_shortx_ui_runtime.js"
TARGET_ENTRY_VERSION = 20260727234500
RUNTIME = '"th_24_shortx_ui_runtime.js"'
LAB = '"th_34_shortx_ui_lab.js"'


def insert_after(text, anchor, item):
    if item in text:
        return text
    if anchor not in text:
        raise SystemExit("module anchor missing: %s" % anchor)
    return text.replace(anchor, anchor + ", " + item, 1)


def patch_entry():
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
        return True
    return False


def patch_generator():
    text = GENERATOR.read_text(encoding="utf-8")
    original = text
    text = insert_after(text, '"th_02_core.js"', RUNTIME)
    text = insert_after(text, '"th_15_extra.js"', LAB)
    if text != original:
        GENERATOR.write_text(text, encoding="utf-8")
        return True
    return False


def patch_runtime():
    text = RUNTIME_FILE.read_text(encoding="utf-8")
    original = text
    text = text.replace("// @version 0.1.0", "// @version 0.1.1", 1)
    text = text.replace('VERSION: "0.1.0"', 'VERSION: "0.1.1"', 1)
    text = text.replace(
        "return ColorStateList.valueOf(JInteger.valueOf(sxuiColorInt(value, 0)));",
        "return sxuiStateList([[]], [sxuiColorInt(value, 0)]);",
        1,
    )
    if "ColorStateList.valueOf(" in text:
        raise SystemExit("forbidden ColorStateList.valueOf remains in ShortXUI runtime")
    if "// @version 0.1.1" not in text or 'VERSION: "0.1.1"' not in text:
        raise SystemExit("ShortXUI runtime version patch incomplete")
    if text != original:
        RUNTIME_FILE.write_text(text, encoding="utf-8")
        return True
    return False


def main():
    entry_changed = patch_entry()
    generator_changed = patch_generator()
    runtime_changed = patch_runtime()
    if entry_changed or generator_changed or runtime_changed:
        print(
            "updated beta ShortXUI release entry=%s generator=%s runtime=%s"
            % (entry_changed, generator_changed, runtime_changed)
        )
    else:
        print("beta ShortXUI release already current")


if __name__ == "__main__":
    main()
