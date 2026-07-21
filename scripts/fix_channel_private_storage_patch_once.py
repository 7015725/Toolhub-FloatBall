#!/usr/bin/env python3
"""Tighten the one-time private storage patch, then remove this fixer."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "scripts/apply_channel_private_storage_isolation_once.py"


def replace_regex(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return updated


def main():
    text = PATCH.read_text(encoding="utf-8")

    theme_template = '''new = \'\'\'FloatBallAppWM.prototype.getColorSafetyRuntimeResultFile = function() {
  try {
    var rootText = "";
    try { rootText = String(APP_ROOT_DIR || "").replace(/\\/+$/g, ""); } catch(eRoot) { rootText = ""; }
    if (!rootText) return null;
    return new java.io.File(rootText + "/diagnostics/color-safety-last.json");
  } catch(ePath) {
    safeLog(this.L, "w", "resolve color safety result path fail error=" + String(ePath));
  }
  return null;
};\'\'\'
    replace_once(path, old, new, "theme diagnostic path")'''
    text = replace_regex(
        text,
        r'''new = \'\'\'FloatBallAppWM\.prototype\.getColorSafetyRuntimeResultFile = function\(\) \{.*?\n\};\'\'\'\n    replace_once\(path, old, new, "theme diagnostic path"\)''',
        lambda _m: theme_template,
        "theme template",
    )

    panel_template = '''new = \'\'\'FloatBallAppWM.prototype.getSettingsInteractionStressResultFile = function() {
  try {
    var rootText = "";
    try { rootText = String(APP_ROOT_DIR || "").replace(/\\/+$/g, ""); } catch(eRoot) { rootText = ""; }
    if (!rootText) return null;
    return new java.io.File(rootText + "/diagnostics/settings-interaction-last.json");
  } catch(ePath) {
    safeLog(this.L, "w", "resolve settings interaction result path fail error=" + String(ePath));
  }
  return null;
};\'\'\'
    replace_once(path, old, new, "panel diagnostic path")'''
    text = replace_regex(
        text,
        r'''new = \'\'\'FloatBallAppWM\.prototype\.getSettingsInteractionStressResultFile = function\(\) \{.*?\n\};\'\'\'\n    replace_once\(path, old, new, "panel diagnostic path"\)''',
        lambda _m: panel_template,
        "panel template",
    )

    pickword_template = '''new = \'\'\'    function getStorageChannel20() {
        var channel = "";
        try { channel = String(TOOLHUB_UPDATE_CHANNEL || "").toLowerCase(); } catch (e0) { channel = ""; }
        if (channel !== "beta") channel = "stable";
        return channel;
    }

    function getSharedPrefs() {
        return appContext.getSharedPreferences(PREFS_NAME + "_" + getStorageChannel20(), appContext.MODE_PRIVATE);
    }

    function getLegacySharedPrefs20() {
        if (getStorageChannel20() !== "stable") return null;
        try { return appContext.getSharedPreferences(PREFS_NAME, appContext.MODE_PRIVATE); } catch (e0) {}
        return null;
    }

    function getToolHubRootText20() {
        var rootText = "";
        try { rootText = String(APP_ROOT_DIR || "").replace(/\\/+$/g, ""); } catch (e0) { rootText = ""; }
        return rootText;
    }

    function getFontSizeStoreFile() {
        var rootText = getToolHubRootText20();
        if (!rootText) return null;
        try { return new java.io.File(rootText + "/data/pickword_font_size.txt"); } catch (e0) {}
        return null;
    }

    function getLegacyFontSizeStoreFile20() {
        if (getStorageChannel20() !== "stable") return null;
        var rootText = getToolHubRootText20();
        var stableSuffix = "/ToolHub";
        if (!rootText || rootText.length <= stableSuffix.length) return null;
        if (rootText.substring(rootText.length - stableSuffix.length) !== stableSuffix) return null;
        var baseText = rootText.substring(0, rootText.length - stableSuffix.length);
        if (!baseText) return null;
        try { return new java.io.File(baseText + "/data/pickword_font_size.txt"); } catch (e0) {}
        return null;
    }

    function readFontSizeFile20(file) {
        if (!file || !file.exists() || !file.isFile()) return -1;
        var reader = null;
        try {
            reader = new java.io.BufferedReader(new java.io.FileReader(file));
            var line = reader.readLine();
            reader.close();
            reader = null;
            if (!line) return -1;
            var size = parseInt(String(line).replace(/\\s+/g, ""), 10);
            return isNaN(size) ? -1 : size;
        } catch (e) {
            return -1;
        } finally {
            try { if (reader) reader.close(); } catch (eClose) {}
        }
    }

    function readFontSizeFromFile() {
        return readFontSizeFile20(getFontSizeStoreFile());
    }

    function writeFontSizeToFile(size) {
        var file = getFontSizeStoreFile();
        if (!file) return false;
        var writer = null;
        try {
            var parent = file.getParentFile();
            if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) return false;
            writer = new java.io.FileWriter(file, false);
            writer.write(String(size));
            writer.flush();
            writer.close();
            writer = null;
            return true;
        } catch (e) {
            return false;
        } finally {
            try { if (writer) writer.close(); } catch (eClose) {}
        }
    }

    function migrateLegacyFontSize20() {
        if (getStorageChannel20() !== "stable") return -1;
        var current = getFontSizeStoreFile();
        if (current && current.exists()) return readFontSizeFile20(current);
        var size = readFontSizeFile20(getLegacyFontSizeStoreFile20());
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) {
            try {
                var legacyPrefs = getLegacySharedPrefs20();
                if (legacyPrefs) size = legacyPrefs.getInt(KEY_FONT_SIZE, -1);
            } catch (ePrefs) { size = -1; }
        }
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) return -1;
        writeFontSizeToFile(size);
        try {
            var prefs = getSharedPrefs();
            var editor = prefs.edit();
            editor.putInt(KEY_FONT_SIZE, size);
            editor.apply();
        } catch (eWritePrefs) {}
        return size;
    }\'\'\'
    replace_once(path, old, new, "pickword font storage")'''
    text = replace_regex(
        text,
        r'''new = \'\'\'    function getStorageChannel20\(\) \{.*?\n    \}\'\'\'\n    replace_once\(path, old, new, "pickword font storage"\)''',
        lambda _m: pickword_template,
        "pickword template",
    )

    validator_template = '''content = \'\'\'#!/usr/bin/env python3
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


require(THEME.startswith("// @version 1.0.12\\n"), "th_04_theme.js version must be 1.0.12")
require(PANEL.startswith("// @version 1.0.16\\n"), "th_13_panel_ui.js version must be 1.0.16")
require(PICKWORD.startswith("// @version 1.0.21\\n"), "th_20_pickword.js version must be 1.0.21")

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
\'\'\'
    path.write_text(content, encoding="utf-8")'''
    text = replace_regex(
        text,
        r'''content = \'\'\'#!/usr/bin/env python3\n"""Verify Stable/Beta private diagnostics and pickword state isolation\.""".*?\n\'\'\'\n    path\.write_text\(content, encoding="utf-8"\)''',
        lambda _m: validator_template,
        "validator template",
    )

    text = text.replace(
        '        ".github/workflows/channel-storage-audit.yml",\n        "scripts/report_channel_storage_paths.py",',
        '        ".github/workflows/channel-storage-audit.yml",\n        ".github/workflows/apply-channel-private-storage-isolation.yml",\n        "scripts/report_channel_storage_paths.py",',
        1,
    )

    PATCH.write_text(text, encoding="utf-8")
    Path(__file__).unlink()
    print("Tightened private storage patch without expanding File API usage")


if __name__ == "__main__":
    main()
