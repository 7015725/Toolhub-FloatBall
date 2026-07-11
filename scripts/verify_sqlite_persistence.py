#!/usr/bin/env python3
"""静态校验 ToolHub SQLite 持久化适配器及关键异常路径。"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_02_core.js"

REQUIRED = [
    'APP_ROOT_DIR + "/toolhub.db"',
    'APP_ROOT_DIR + "/.sqlite_pending_"',
    "CREATE TABLE IF NOT EXISTS toolhub_documents",
    "CREATE TABLE IF NOT EXISTS toolhub_meta",
    "readState: function(path)",
    'status: "found"',
    'status: "missing"',
    'status: "error"',
    "cursor.moveToFirst()",
    "db.endTransaction()",
    "transactionMarked",
    "committed",
    "writePending: function(path, content)",
    "recoverPendingPath: function(path)",
    "syncBackup: function(path, content)",
    "fallbackPersist: function(path, content)",
    "read-only-fallback",
    "blockedWrites",
    "legacyJsonAvailable",
    "legacyMirrorHealthy",
    "ConfigManager.getStorageInfo",
    "ConfigManager.migrateLegacyJsonToSqlite",
    "FileIO.readText = function(path)",
    "FileIO.writeTextAtomic = function(path, content)",
    "FileIO.writeTextDebounced = function(path, content, delayMs)",
    "FileIO.flushDebouncedWrites = function()",
    '"legacy-json"',
    '"json-fallback-recovery"',
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

    if text.count("__toolHubSqlitePersistenceInstalled") < 2:
        fail("SQLite adapter install guard is incomplete")

    if "simpleQueryForString" in text:
        fail("record-missing detection must not depend on simpleQueryForString exceptions")

    read_state = section(text, "readState: function(path)", "writeRow: function(path")
    for marker in ['status: "found"', 'status: "missing"', 'status: "error"', "cursor.moveToFirst()"]:
        if marker not in read_state:
            fail(f"readState is missing {marker}")

    write_row = section(text, "writeRow: function(path", "mirrorLegacy: function(path")
    if write_row.index("db.endTransaction()") > write_row.index("if (committed)"):
        fail("writeRow reports success before endTransaction")
    if "return true;" in write_row[: write_row.index("db.endTransaction()")]:
        fail("writeRow can return success before transaction completion")

    migrate = section(text, "migrateLegacyPath: function(path)", "migrateLegacyFiles: function()")
    error_pos = migrate.find('state.status === "error"')
    legacy_pos = migrate.find("var legacy = this.readLegacy(path)")
    if error_pos < 0 or legacy_pos < 0 or error_pos > legacy_pos:
        fail("migration must stop on database read errors before reading legacy JSON")
    if "return false;" not in migrate[error_pos:legacy_pos]:
        fail("database read errors must not trigger legacy JSON import")

    read_managed = section(text, "readManagedText: function(path)", "ensureTimer: function()")
    if 'state.status === "missing"' not in read_managed:
        fail("readManagedText must distinguish a missing row")
    error_fallback = read_managed.split("数据库读取异常时只允许读取 JSON 兜底", 1)
    if len(error_fallback) != 2:
        fail("read-only error fallback guard is missing")
    if "writeRow(" in error_fallback[1]:
        fail("database read error fallback must not write legacy JSON back to SQLite")
    if "_blockedWrites[p] = true" not in error_fallback[1]:
        fail("database read errors must block writes for the affected document")

    fallback = section(text, "fallbackPersist: function(path", "persistNow: function(path")
    if fallback.index("writePending(path, content)") > fallback.index("mirrorLegacy(path, content)"):
        fail("fallback journal must be written before the JSON mirror")

    atomic = section(text, "writeLegacyAtomic: function(path", "readPending: function(path")
    if "atomicContext" not in atomic or "oldWriteText.call(FileIO" not in atomic:
        fail("atomic JSON fallback must avoid recursion through wrapped FileIO.writeText")

    schedule = section(text, "scheduleWrite: function(path", "flushWrites: function()")
    if "_blockedWrites[p] === true" not in schedule:
        fail("debounced writes must fail immediately while the document is write-blocked")
    if "live.task = null" not in schedule:
        fail("failed timer writes must remain pending")

    flush = section(text, "flushWrites: function()", "getLegacyAvailability: function()")
    if "var allOk = true" not in flush or "allOk = false" not in flush:
        fail("flushWrites must report partial persistence failures")
    if "job.lastError" not in flush:
        fail("failed flush jobs must be retained with an error")

    print("OK: SQLite three-state reads, transaction commit, pending recovery, atomic mirror and failure retention verified")


if __name__ == "__main__":
    main()
