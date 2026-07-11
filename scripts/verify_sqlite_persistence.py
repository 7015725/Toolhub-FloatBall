#!/usr/bin/env python3
"""静态校验 ToolHub 完全结构化 SQLite 配置存储。"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_02_core.js"

REQUIRED = [
    "// @version 2.0.0",
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
    raise SystemExit(f"FAIL: {message}")


def section(text: str, start: str, end: str) -> str:
    try:
        a = text.index(start)
        b = text.index(end, a + len(start))
    except ValueError as exc:
        fail(f"cannot locate section {start!r} -> {end!r}: {exc}")
    return text[a:b]


def main() -> None:
    if not TARGET.exists():
        fail(f"missing {TARGET.relative_to(ROOT)}")

    text = TARGET.read_text(encoding="utf-8")

    for marker in REQUIRED:
        if marker not in text:
            fail(f"missing marker: {marker}")

    for name, pattern in FORBIDDEN_PATTERNS.items():
        if re.search(pattern, text, flags=re.MULTILINE):
            fail(f"Rhino ES5 incompatible syntax: {name}")

    if "CREATE TABLE IF NOT EXISTS toolhub_documents" in text:
        fail("legacy JSON document table must not be created")

    create_sql = "\n".join(
        line for line in text.splitlines()
        if "CREATE TABLE IF NOT EXISTS toolhub_" in line
    )
    if "payload TEXT" in create_sql:
        fail("structured tables must not contain JSON payload columns")

    if "mirrorLegacy:" in text or "fallbackPersist:" in text or "writePending:" in text:
        fail("runtime JSON mirror or pending-file fallback remains enabled")

    settings = section(text, "replaceSettingsInDb: function", "readSettingsInDb: function")
    if "toolhub_settings" not in settings or "bindTypedValue" not in settings:
        fail("settings are not stored as typed rows")

    buttons = section(text, "replaceButtonsInDb: function", "readButtonsInDb: function")
    for marker in ["toolhub_buttons", "toolhub_button_values", "insertTreeNode"]:
        if marker not in buttons:
            fail(f"button structured storage is missing {marker}")

    schema = section(text, "replaceSchemaInDb: function", "readSchemaInDb: function")
    if "toolhub_schema_values" not in schema or "insertTreeNode" not in schema:
        fail("schema is not stored as structured tree nodes")

    migration = section(text, "migrateIfNeeded: function", "ensureReady: function")
    for marker in [
        "chooseLegacyValue",
        "DROP TABLE IF EXISTS toolhub_documents",
        "storage_format_version",
        'db.execSQL("VACUUM")',
        "cleanupLegacyFiles",
    ]:
        if marker not in migration:
            fail(f"migration is missing {marker}")

    cleanup = section(text, "cleanupLegacyFiles: function", "migrateIfNeeded: function")
    for marker in [
        "PATH_SETTINGS",
        "PATH_BUTTONS",
        "PATH_SCHEMA",
        ".sqlite_pending_settings.json",
        ".sqlite_pending_buttons.json",
        ".sqlite_pending_schema.json",
    ]:
        if marker not in cleanup:
            fail(f"legacy file cleanup is missing {marker}")

    write_now = section(text, "writeManagedNow: function", "ensureTimer: function")
    if write_now.index("db.endTransaction()") > write_now.index("if (committed)"):
        fail("structured write reports success before transaction completion")
    if "return true;" in write_now[: write_now.index("db.endTransaction()")]:
        fail("structured write can return success before endTransaction")

    schedule = section(text, "scheduleWrite: function", "flushWrites: function")
    if "live.task = null" not in schedule:
        fail("failed debounced writes must remain pending")

    flush = section(text, "flushWrites: function", "queryCount: function")
    if "allOk = false" not in flush or "job.lastError" not in flush:
        fail("failed flush jobs are not retained")

    managed_read = section(text, "readManagedText: function", "writeManagedNow: function")
    if "oldReadText" in managed_read:
        fail("runtime managed reads must not fall back to JSON files")

    managed_write = section(text, "writeManagedNow: function", "ensureTimer: function")
    if "oldWriteText" in managed_write or "oldWriteTextAtomic" in managed_write:
        fail("runtime managed writes must not create JSON files")

    print("OK: fully structured SQLite settings, buttons, tree values, migration cleanup and ES5 syntax verified")


if __name__ == "__main__":
    main()
