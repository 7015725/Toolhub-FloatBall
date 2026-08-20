#!/usr/bin/env python3
"""Verify Stable/Beta private storage isolation, including the QR runtime lib."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
THEME = (CODE / "th_04_theme.js").read_text(encoding="utf-8")
PANEL = (CODE / "th_13_panel_ui.js").read_text(encoding="utf-8")
PICKWORD = (CODE / "th_20_pickword.js").read_text(encoding="utf-8")
QR = (CODE / "th_26_qr_runtime.js").read_text(encoding="utf-8")
errors = []


def require(condition, message):
    if not condition:
        errors.append(message)


require(THEME.splitlines()[0] == "// @version 1.0.12", "th_04_theme.js version must be 1.0.12")
require(PANEL.splitlines()[0] == "// @version 1.0.16", "th_13_panel_ui.js version must be 1.0.16")
require(PICKWORD.splitlines()[0] in ("// @version 1.0.21", "// @version 1.0.22"), "th_20_pickword.js version must be 1.0.21 or 1.0.22")
SUPPORTED_QR_VERSIONS = (
    "// @version 1.0.1",
    "// @version 1.0.2",
    "// @version 1.0.3",
    "// @version 1.0.4",
    "// @version 1.0.5",
    "// @version 1.0.6",
    "// @version 1.0.7",
)
require(
    QR.splitlines()[0] in SUPPORTED_QR_VERSIONS,
    "th_26_qr_runtime.js version must be 1.0.1/1.0.2/1.0.3/1.0.4/1.0.5/1.0.6/1.0.7 during generation",
)

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

qr_version = QR.splitlines()[0] if QR.splitlines() else ""
if qr_version in (
    "// @version 1.0.3",
    "// @version 1.0.4",
    "// @version 1.0.5",
    "// @version 1.0.6",
    "// @version 1.0.7",
):
    for marker in (
        'typeof getToolHubRootDir !== "function"',
        'var root = new java.io.File(String(getToolHubRootDir() || "")).getCanonicalFile();',
        'var lib = new java.io.File(root, "lib").getCanonicalFile();',
        'if (libPath.indexOf(rootPath + java.io.File.separator) !== 0)',
        'assertWritableDirPath(libPath, "ToolHub QR lib")',
        'manifest.runtimeFiles',
    ):
        require(marker in QR, "QR channel-lib safety marker missing: " + marker)
    if qr_version in ("// @version 1.0.6", "// @version 1.0.7"):
        require('new Packages.dalvik.system.DexClassLoader' in QR,
                "QR Rhino DexClassLoader marker missing")
    else:
        require('new dalvik.system.DexClassLoader' in QR,
                "QR legacy DexClassLoader marker missing")
    require("shortx.getShortXDir" not in QR, "QR runtime must not bypass ToolHub channel root")
    for forbidden in (
        'shortx.getShortXDir() + "/ToolHub',
        'shortx.getShortXDir() + "/ToolHub-Beta',
        'new java.io.File(root, "diagnostics")',
        'new java.io.File(root, "data")',
        'new java.io.File(root, "cache")',
        'new java.io.File(root, "screenshots")',
        'new java.io.File(root, "logs")',
    ):
        require(forbidden not in QR, "QR channel-lib scope widened: " + forbidden)

if qr_version in (
    "// @version 1.0.2",
    "// @version 1.0.3",
    "// @version 1.0.4",
    "// @version 1.0.5",
    "// @version 1.0.6",
    "// @version 1.0.7",
):
    for marker in (
        'installLock: new java.util.concurrent.locks.ReentrantLock()',
        'function preflightRuntime26(appObj, reason)',
        'preflightRuntime26(null, "module_startup_or_update")',
        'downloaded: false',
        'downloaded: true',
    ):
        require(marker in QR, "QR startup-preflight marker missing: " + marker)

if qr_version in (
    "// @version 1.0.4",
    "// @version 1.0.5",
    "// @version 1.0.6",
    "// @version 1.0.7",
):
    for marker in (
        'function sanitizeError26(error)',
        'typeof writeLog === "function"',
        'runtime failure stage=',
    ):
        require(marker in QR, "QR runtime diagnostics marker missing: " + marker)

if qr_version in ("// @version 1.0.5", "// @version 1.0.6", "// @version 1.0.7"):
    require("context.getCodeCacheDir()" not in QR,
            "QR runtime must not call app code cache from system_server")
    for marker in (
        'function getDexOptimizedDirectory26()',
        'if (sdk >= 26) return null;',
        'new java.io.File(lib, ".dexopt")',
        'assertWritableDirPath(dexoptPath, "ToolHub QR dexopt")',
    ):
        require(marker in QR, "QR system_server DexClassLoader marker missing: " + marker)

if qr_version in ("// @version 1.0.6", "// @version 1.0.7"):
    require("new dalvik.system.DexClassLoader(" not in QR,
            "QR runtime must not use bare dalvik package in Rhino")
    require("new Packages.dalvik.system.DexClassLoader(" in QR,
            "QR runtime must resolve DexClassLoader through Rhino Packages")

# No feature module other than the base bootstrap may read the raw ShortX root.
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

print("OK channel-private-storage private=APP_ROOT_DIR qr_lib=channel_root/lib preflight=guarded diagnostics=guarded system_server_dexloader=guarded rhino_packages=guarded stable_legacy_import=copy-only")
