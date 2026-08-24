#!/usr/bin/env python3
"""Replace stale exact ToolHub entry-version assertions with monotonic baselines."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BASELINE = 20260721201500
TARGETS = (
    "scripts/verify_main_panel_drag_sort.py",
    "scripts/verify_main_panel_paging.py",
    "scripts/verify_main_panel_adaptive_layout.py",
    "scripts/verify_main_panel_grid_sizing.py",
    "scripts/verify_main_panel_close_lifecycle.py",
    "scripts/verify_main_panel_visual_tuning.py",
)

EXACT_RE = re.compile(
    r'(?m)^(?P<indent>[ \t]*)require\(ENTRY, '
    r'"var TOOLHUB_ENTRY_VERSION = 20260721201500;", '
    r'"(?P<label>[^"]+)"\)$'
)


def patch(path):
    text = path.read_text(encoding="utf-8")
    original = text

    def replacement(match):
        indent = match.group("indent")
        label = match.group("label").replace(" entry version", "").replace("entry", "").strip()
        if not label:
            label = path.stem.replace("verify_", "").replace("_", "-")
        return "\n".join((
            indent + "entry_version = re.search(",
            indent + '    r"(?m)^var TOOLHUB_ENTRY_VERSION = ([0-9]+);",',
            indent + "    ENTRY,",
            indent + ")",
            indent + "if not entry_version:",
            indent + '    fail("TOOLHUB_ENTRY_VERSION declaration missing")',
            indent + "if int(entry_version.group(1)) < %d:" % BASELINE,
            indent + '    fail("entry version regressed below %s baseline")' % label,
        ))

    text, count = EXACT_RE.subn(replacement, text)
    if count > 1:
        raise SystemExit("multiple entry-version assertions in %s" % path.relative_to(ROOT))
    if count == 0 and "var TOOLHUB_ENTRY_VERSION = 20260721201500;" in text:
        raise SystemExit("unrecognized stale entry-version assertion in %s" % path.relative_to(ROOT))
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main():
    changed = []
    for relative in TARGETS:
        path = ROOT / relative
        if not path.exists():
            raise SystemExit("missing verifier: " + relative)
        if patch(path):
            changed.append(relative)
    print("entry-version verifier migration changed=%d files=%s" % (
        len(changed), ",".join(changed) if changed else "none"
    ))


if __name__ == "__main__":
    main()
