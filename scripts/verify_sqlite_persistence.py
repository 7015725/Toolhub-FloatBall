#!/usr/bin/env python3
"""静态校验 ToolHub SQLite 持久化适配器。"""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_02_core.js"

REQUIRED = [
    'APP_ROOT_DIR + "/toolhub.db"',
    "CREATE TABLE IF NOT EXISTS toolhub_documents",
    "CREATE TABLE IF NOT EXISTS toolhub_meta",
    "ConfigManager.getStorageInfo",
    "ConfigManager.migrateLegacyJsonToSqlite",
    "FileIO.readText = function(path)",
    "FileIO.writeTextAtomic = function(path, content)",
    "FileIO.writeTextDebounced = function(path, content, delayMs)",
    "FileIO.flushDebouncedWrites = function()",
    'source || "runtime"',
    '"legacy-json"',
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
    print(f"FAIL: {message}")
    raise SystemExit(1)


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

    if "return oldReadText.call(FileIO, path);" not in text:
        fail("non-config read fallback is missing")

    if "ToolHubSqliteStore.fallbackWrite(path, content)" not in text:
        fail("JSON write fallback is missing")

    print("OK: SQLite persistence adapter markers and Rhino ES5 syntax verified")


if __name__ == "__main__":
    main()
