#!/usr/bin/env python3
"""Verify Stable/Beta private diagnostics and pickword state isolation."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
THEME = (CODE / "th_04_theme.js").read_text(encoding="utf-8")
PANEL = (CODE / "th_13_panel_ui.js").read_text(encoding="utf-8")
PICKWORD = (CODE / "th_20_pickword.js").read_text(encoding="utf-8")
errors = []


def require(condition, message):
    if not condition:
        errors.append(message)


require(THEME.splitlines()[0] == "// @version 1.0.12", "th_04_theme.js version must be 1.0.12")
require(PANEL.splitlines()[0] == "// @version 1.0.16", "th_13_panel_ui.js version must be 1.0.16")
require(PICKWORD.splitlines()[0] == "// @version 1.0.21", "th_20_pickword.js version must be 1.0.21")

for name, source in (("theme", THEME), ("panel_ui", PANEL), ("pickword", PICKWORD)):
    require("shortx.getShortXDir" not in source, name + " must not bypass APP_ROOT_DIR")

require('new java.io.File(rootText + "/diagnostics/color-safety-last.json")' in THEME,
        "theme diagnostic path must use APP_ROOT_DIR")
require('new java.io.File(rootText + "/diagnostics/settings-interaction-last.json")' in PANEL,
        "panel diagnostic path must use APP_ROOT_DIR")

for marker in (
    'function getStorageChannel20()',
    'PREFS_NAME + "_" + getStorageChannel20()',
    'new java.io.File(rootText + "/data/pickword_font_size.txt")',
    'if (getStorageChannel20() !== "stable") return null;',
    'function migrateLegacyFontSize20()',
    'if (savedSize < 0) savedSize = migrateLegacyFontSize20();',
):
    require(marker in PICKWORD, "pickword channel state marker missing: " + marker)

require('new java.io.File(shortx.getShortXDir() + "/data/pickword_font_size.txt")' not in PICKWORD,
        "legacy public font file must not be the active store")
require("legacyPrefs.getInt(KEY_FONT_SIZE, -1)" in PICKWORD,
        "Stable legacy preference migration missing")
legacy_start = PICKWORD.find("function getLegacyFontSizeStoreFile20()")
legacy_end = PICKWORD.find("function readFontSizeFile20", legacy_start + 1)
legacy_block = PICKWORD[legacy_start:legacy_end] if legacy_start >= 0 and legacy_end > legacy_start else ""
require(legacy_block and ".delete()" not in legacy_block,
        "legacy font migration must not delete old data")

allowed_shortx_files = {"th_01_base.js"}
for source_path in sorted(CODE.glob("*.js")):
    source = source_path.read_text(encoding="utf-8")
    if "shortx.getShortXDir" in source and source_path.name not in allowed_shortx_files:
        errors.append("unexpected shortx.getShortXDir bypass: code/" + source_path.name)
    for line_no, line in enumerate(source.splitlines(), 1):
        if re.search(r"ToolHub/(diagnostics|cache|screenshots|data|logs|tmp|temp)/", line):
            errors.append("fixed Stable private path: code/%s:%d" % (source_path.name, line_no))

if errors:
    for item in errors:
        print("FAIL channel-private-storage:", item)
    raise SystemExit(1)

print("OK channel-private-storage diagnostics=APP_ROOT_DIR pickword=file+prefs-per-channel stable_legacy_import=copy-only")
