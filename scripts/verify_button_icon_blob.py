#!/usr/bin/env python3
"""静态校验按钮图标 SQLite BLOB 存储。"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_03_icon.js"

REQUIRED = [
    "// @version 2.0.0",
    "CREATE TABLE IF NOT EXISTS toolhub_button_icons",
    "image_data BLOB NOT NULL",
    "icon_source_type",
    "icon_key",
    "icon_res_name",
    "icon_tint",
    "bindBlob(3, iconInfo.data)",
    "MessageDigest.getInstance(\"SHA-256\")",
    "INSERT OR IGNORE INTO toolhub_button_icons",
    "DELETE FROM toolhub_button_icons WHERE icon_key NOT IN",
    "button_icon_storage_version",
    "ConfigManager.getButtonIconBlob",
    "loadButtonIconDrawableFromDb",
    "BitmapFactory.decodeByteArray",
    'ICON_DB_URI_PREFIX = "sqlite-icon:"',
    "cleanupImportedShortcutIcons",
    'String(APP_ROOT_DIR) + "/shortcut_icons/"',
    "ICON_MAX_BYTES = 1048576",
    "ICON_MAX_PX = 1024",
]

FORBIDDEN_PATTERNS = {
    "let": r"(^|[^A-Za-z0-9_$])let\s+",
    "const": r"(^|[^A-Za-z0-9_$])const\s+",
    "arrow function": r"=>",
    "class": r"(^|[^A-Za-z0-9_$])class\s+",
    "optional chaining": r"\?\.",
    "nullish coalescing": r"\?\?",
    "template literal": r"`",
}


def fail(message: str) -> None:
    raise SystemExit("FAIL: " + message)


def section(text: str, start: str, end: str) -> str:
    try:
        a = text.index(start)
        b = text.index(end, a + len(start))
    except ValueError as exc:
        fail(f"cannot locate section {start!r} -> {end!r}: {exc}")
    return text[a:b]


def main() -> None:
    if not TARGET.exists():
        fail("missing code/th_03_icon.js")

    text = TARGET.read_text(encoding="utf-8")
    for marker in REQUIRED:
        if marker not in text:
            fail("missing marker: " + marker)

    for name, pattern in FORBIDDEN_PATTERNS.items():
        if re.search(pattern, text, flags=re.MULTILINE):
            fail("Rhino ES5 incompatible syntax: " + name)

    if (ROOT / "code" / "th_02_button_icons.js").exists():
        fail("button icon storage must stay in a loaded module")

    prepare = section(text, "store.prepareButtonIcon = function", "store.cleanButtonIconFields")
    if prepare.index("ICON_DB_URI_PREFIX") > prepare.index("this.readIconFile(path)"):
        fail("SQLite icon URI must be handled before file import")
    if prepare.index("this.readIconFile(path)") > prepare.index("var resName"):
        fail("new local image must replace an old ShortX icon")
    if prepare.index("var resName") > prepare.index("var oldKey"):
        fail("new ShortX selection must replace an old BLOB icon")

    replace = section(text, "store.replaceButtonsInDb = function", "store.readButtonsInDb")
    for marker in [
        "prepareButtonIcon",
        "cleanButtonIconFields",
        "oldReplaceButtonsInDb",
        "updateButtonIconColumns",
        "deleteOrphanButtonIcons",
    ]:
        if marker not in replace:
            fail("structured button save is missing " + marker)

    read = section(text, "store.readButtonsInDb = function", "store.cleanupImportedShortcutIcons")
    if "b.iconPath = ICON_DB_URI_PREFIX + key" not in read:
        fail("BLOB icon is not exposed through the in-memory compatibility URI")
    if "LEFT JOIN toolhub_button_icons" not in read:
        fail("button icon metadata is not read with buttons")

    loader = section(
        text,
        "FloatBallAppWM.prototype.loadButtonIconDrawableFromDb",
        "FloatBallAppWM.prototype.loadBallIconDrawableFromFile",
    )
    for marker in ["ConfigManager.getButtonIconBlob", "decodeByteArray", "inSampleSize", "_iconLruPut"]:
        if marker not in loader:
            fail("database icon loader is missing " + marker)

    file_loader = section(
        text,
        "FloatBallAppWM.prototype.loadBallIconDrawableFromFile",
        "// =======================【更新完成后自动重启生效】",
    )
    if 'p.indexOf("sqlite-icon:") === 0' not in file_loader:
        fail("existing icon resolver cannot route SQLite icon URIs")
    if file_loader.index('p.indexOf("sqlite-icon:")') > file_loader.index("new java.io.File(p)"):
        fail("SQLite icon URI must be resolved before java.io.File")

    cleanup = section(text, "store.cleanupImportedShortcutIcons", "store.consumeButtonIconCleanup")
    if 'this.isInternalShortcutIconPath(p)' not in cleanup:
        fail("cleanup may delete external user images")

    print("OK: SQLite BLOB button icons, deduplication, database decode, safe cleanup and ES5 syntax verified")


if __name__ == "__main__":
    main()
