#!/usr/bin/env python3
"""Fix nested validator template version checks, then remove this fixer."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "scripts/fix_channel_private_storage_patch_once.py"


def main():
    text = TARGET.read_text(encoding="utf-8")
    replacements = (
        (
            'require(THEME.startswith("// @version 1.0.12\\\\n"), "th_04_theme.js version must be 1.0.12")',
            'require(THEME.splitlines()[0] == "// @version 1.0.12", "th_04_theme.js version must be 1.0.12")',
        ),
        (
            'require(PANEL.startswith("// @version 1.0.16\\\\n"), "th_13_panel_ui.js version must be 1.0.16")',
            'require(PANEL.splitlines()[0] == "// @version 1.0.16", "th_13_panel_ui.js version must be 1.0.16")',
        ),
        (
            'require(PICKWORD.startswith("// @version 1.0.21\\\\n"), "th_20_pickword.js version must be 1.0.21")',
            'require(PICKWORD.splitlines()[0] == "// @version 1.0.21", "th_20_pickword.js version must be 1.0.21")',
        ),
    )
    for old, new in replacements:
        count = text.count(old)
        if count != 1:
            raise SystemExit("validator template replacement count=%d old=%s" % (count, old))
        text = text.replace(old, new, 1)
    TARGET.write_text(text, encoding="utf-8")
    Path(__file__).unlink()
    print("Fixed nested validator template version checks")


if __name__ == "__main__":
    main()
