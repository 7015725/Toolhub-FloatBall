#!/usr/bin/env python3
"""静态校验 ToolHub 结构化 SQLite 与按钮图标 BLOB 存储。"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
CORE_TARGET = ROOT / "code" / "th_02_core.js"
ICON_TARGET = ROOT / "code" / "th_03_icon.js"

CORE_REQUIRED = [
    'APP_ROOT_DIR + "/toolhub.db"',
    "CREATE TABLE IF NOT EXISTS toolhub_settings",
    "CREATE TABLE IF NOT EXISTS toolhub_buttons",
    "CREATE TABLE IF NOT EXISTS toolhub_button_values",
    "CREATE TABLE IF NOT EXISTS toolhub_schema_values",
    "value_type TEXT NOT NULL",
    "value_integer INTEGER",
    "value_real REAL",
    "value_text TEXT",
    "replaceSettingsInDb: function(db, settings)",
    "replaceButtonsInDb: function(db, buttons)",
    "replaceSchemaInDb: function(db, schema)",
    "insertTreeNode: function(",
    "readTree: function(",
    "DROP TABLE IF EXISTS toolhub_documents",
    'db.execSQL("VACUUM")',
    "cleanupLegacyFiles: function()",
    "migrateLegacyStorageToStructuredSqlite",
    'storageFormat: "structured"',
    "jsonConfigEnabled: false",
    "FileIO.readText = function(path)",
    "FileIO.writeText = function(path, content)",
    "FileIO.writeTextAtomic = function(path, content)",
    "FileIO.writeTextDebounced = function(path, content, delayMs)",
    "FileIO.flushDebouncedWrites = function()",
    "__toolHubStructuredSqlitePersistenceInstalled",
]

ICON_REQUIRED = [
    "CREATE TABLE IF NOT EXISTS toolhub_button_icons",
    "image_data BLOB NOT NULL",
    "icon_source_type",
    "icon_key",
    "icon_res_name",
    "icon_tint",
    "bindBlob(3, iconInfo.data)",
    'MessageDigest.getInstance("SHA-256")',
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


def fail(group, message):
    raise SystemExit("FAIL [%s]: %s" % (group, message))


def section(group, text, start, end):
    try:
        a = text.index(start)
        b = text.index(end, a + len(start))
    except ValueError as exc:
        fail(group, "cannot locate section %r -> %r: %s" % (start, end, exc))
    return text[a:b]


def require_markers(group, text, markers):
    for marker in markers:
        if marker not in text:
            fail(group, "missing marker: " + marker)


def verify_core_storage():
    group = "storage-core"
    if not CORE_TARGET.exists():
        fail(group, "missing code/th_02_core.js")
    text = CORE_TARGET.read_text(encoding="utf-8")
    require_markers(group, text, CORE_REQUIRED)

    if "CREATE TABLE IF NOT EXISTS toolhub_documents" in text:
        fail(group, "legacy JSON document table must not be created")

    create_sql = "\n".join(
        line for line in text.splitlines()
        if "CREATE TABLE IF NOT EXISTS toolhub_" in line
    )
    if "payload TEXT" in create_sql:
        fail(group, "structured tables must not contain JSON payload columns")
    if "mirrorLegacy:" in text or "fallbackPersist:" in text or "writePending:" in text:
        fail(group, "runtime JSON mirror or pending-file fallback remains enabled")

    settings = section(group, text, "replaceSettingsInDb: function", "readSettingsInDb: function")
    if "toolhub_settings" not in settings or "bindTypedValue" not in settings:
        fail(group, "settings are not stored as typed rows")

    buttons = section(group, text, "replaceButtonsInDb: function", "readButtonsInDb: function")
    for marker in ["toolhub_buttons", "toolhub_button_values", "insertTreeNode"]:
        if marker not in buttons:
            fail(group, "button structured storage is missing " + marker)

    schema = section(group, text, "replaceSchemaInDb: function", "readSchemaInDb: function")
    if "toolhub_schema_values" not in schema or "insertTreeNode" not in schema:
        fail(group, "schema is not stored as structured tree nodes")

    migration = section(group, text, "migrateIfNeeded: function", "ensureReady: function")
    for marker in [
        "chooseLegacyValue",
        "DROP TABLE IF EXISTS toolhub_documents",
        "storage_format_version",
        'db.execSQL("VACUUM")',
        "cleanupLegacyFiles",
    ]:
        if marker not in migration:
            fail(group, "migration is missing " + marker)

    cleanup = section(group, text, "cleanupLegacyFiles: function", "migrateIfNeeded: function")
    for marker in [
        "PATH_SETTINGS",
        "PATH_BUTTONS",
        "PATH_SCHEMA",
        ".sqlite_pending_settings.json",
        ".sqlite_pending_buttons.json",
        ".sqlite_pending_schema.json",
    ]:
        if marker not in cleanup:
            fail(group, "legacy file cleanup is missing " + marker)

    write_now = section(group, text, "writeManagedNow: function", "ensureTimer: function")
    if write_now.index("db.endTransaction()") > write_now.index("if (committed)"):
        fail(group, "structured write reports success before transaction completion")
    if "return true;" in write_now[: write_now.index("db.endTransaction()")]:
        fail(group, "structured write can return success before endTransaction")

    schedule = section(group, text, "scheduleWrite: function", "flushWrites: function")
    for marker in [
        "self.runScheduledJob(job)",
        "this._jobSequence = Number(this._jobSequence || 0) + 1",
        "this._jobs[p] = job",
    ]:
        if marker not in schedule:
            fail(group, "debounced scheduling is missing " + marker)

    runner = section(group, text, "runScheduledJob: function", "scheduleWrite: function")
    for marker in [
        "live === job",
        "current === job",
        "current.lastError",
    ]:
        if marker not in runner:
            fail(group, "debounced job identity handling is missing " + marker)

    flush = section(group, text, "flushWrites: function", "queryCount: function")
    for marker in ["allOk = false", "item.lastError", "failed.push(item)"]:
        if marker not in flush:
            fail(group, "failed flush jobs are not retained: " + marker)

    managed_read = section(group, text, "readManagedText: function", "writeManagedNow: function")
    if "oldReadText" in managed_read:
        fail(group, "runtime managed reads must not fall back to JSON files")

    managed_write = section(group, text, "writeManagedNow: function", "ensureTimer: function")
    if "oldWriteText" in managed_write or "oldWriteTextAtomic" in managed_write:
        fail(group, "runtime managed writes must not create JSON files")


def verify_icon_storage():
    group = "storage-icons"
    if not ICON_TARGET.exists():
        fail(group, "missing code/th_03_icon.js")
    text = ICON_TARGET.read_text(encoding="utf-8")
    require_markers(group, text, ICON_REQUIRED)

    if (ROOT / "code" / "th_02_button_icons.js").exists():
        fail(group, "button icon storage must stay in a loaded module")

    prepare = section(group, text, "store.prepareButtonIcon = function", "store.cleanButtonIconFields")
    if prepare.index("ICON_DB_URI_PREFIX") > prepare.index("this.readIconFile(path)"):
        fail(group, "SQLite icon URI must be handled before file import")
    if prepare.index("this.readIconFile(path)") > prepare.index("var resName"):
        fail(group, "new local image must replace an old ShortX icon")
    if prepare.index("var resName") > prepare.index("var oldKey"):
        fail(group, "new ShortX selection must replace an old BLOB icon")

    replace = section(group, text, "store.replaceButtonsInDb = function", "store.readButtonsInDb")
    for marker in [
        "prepareButtonIcon",
        "cleanButtonIconFields",
        "oldReplaceButtonsInDb",
        "updateButtonIconColumns",
        "deleteOrphanButtonIcons",
    ]:
        if marker not in replace:
            fail(group, "structured button save is missing " + marker)

    read = section(group, text, "store.readButtonsInDb = function", "store.cleanupImportedShortcutIcons")
    if "b.iconPath = ICON_DB_URI_PREFIX + key" not in read:
        fail(group, "BLOB icon is not exposed through the in-memory compatibility URI")
    if "LEFT JOIN toolhub_button_icons" not in read:
        fail(group, "button icon metadata is not read with buttons")

    loader = section(
        group,
        text,
        "FloatBallAppWM.prototype.loadButtonIconDrawableFromDb",
        "FloatBallAppWM.prototype.loadBallIconDrawableFromFile",
    )
    for marker in ["ConfigManager.getButtonIconBlob", "decodeByteArray", "inSampleSize", "_iconLruPut"]:
        if marker not in loader:
            fail(group, "database icon loader is missing " + marker)

    file_loader = section(
        group,
        text,
        "FloatBallAppWM.prototype.loadBallIconDrawableFromFile",
        "// =======================【更新完成后自动重启生效】",
    )
    if 'p.indexOf("sqlite-icon:") === 0' not in file_loader:
        fail(group, "existing icon resolver cannot route SQLite icon URIs")
    if file_loader.index('p.indexOf("sqlite-icon:")') > file_loader.index("new java.io.File(p)"):
        fail(group, "SQLite icon URI must be resolved before java.io.File")

    cleanup = section(group, text, "store.cleanupImportedShortcutIcons", "store.consumeButtonIconCleanup")
    if 'this.isInternalShortcutIconPath(p)' not in cleanup:
        fail(group, "cleanup may delete external user images")


def main():
    verify_core_storage()
    print("PASS storage-core")
    verify_icon_storage()
    print("PASS storage-icons")
    print("OK sqlite_storage groups=2")
    return 0


if __name__ == "__main__":
    sys.exit(main())
