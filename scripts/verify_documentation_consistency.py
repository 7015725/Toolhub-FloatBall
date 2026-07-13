#!/usr/bin/env python3
"""校验核心文档与当前模块、安全和存储架构保持一致。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = (ROOT / "README.md").read_text(encoding="utf-8")
ARCH = (ROOT / "ARCHITECTURE.md").read_text(encoding="utf-8")
STRUCTURE = (ROOT / "STRUCTURE.md").read_text(encoding="utf-8")
SQLITE = (ROOT / "SQLITE_STORAGE.md").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL documentation-consistency: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("stale %s: %s" % (label, fragment))


for name, text in (("README", README), ("ARCHITECTURE", ARCH), ("STRUCTURE", STRUCTURE)):
    require(text, "th_19_position_state.js", name + " th_19 module")
    require(text, "th_20_pickword.js", name + " th_20 module")
    require(text, "th_21_result_preview.js", name + " th_21 module")

require(ARCH, "26 个子模块", "architecture module count")
require(STRUCTURE, "26 个子模块", "structure module count")
for old_count in ("23 个子模块", "24 个子模块", "25 个子模块"):
    forbid(ARCH, old_count, "architecture old module count")
    forbid(STRUCTURE, old_count, "structure old module count")

require(README, "默认启动 `intentUri`", "README shortcut behavior")
require(ARCH, "intentUri", "architecture shortcut behavior")
require(STRUCTURE, "intentUri", "structure shortcut behavior")
forbid(README, "执行 ShortX 快捷方式代码", "README legacy shortcut default")
forbid(STRUCTURE, "通过 shell 广播桥发送 base64 命令，默认 root", "structure root default")

for text, label in ((ARCH, "architecture"), (STRUCTURE, "structure")):
    require(text, ".module_update_transaction.json", label + " transaction marker")
    require(text, ".module_update_transaction.committed", label + " commit marker")
    require(text, "toolhub.db", label + " structured storage")

critical_modules = (
    "th_01_base.js",
    "th_02_core.js",
    "th_05_persistence.js",
    "th_16_entry.js",
    "th_19_position_state.js",
)
for name in critical_modules:
    require(ARCH, name, "architecture critical module " + name)
    require(STRUCTURE, name, "structure critical module " + name)
forbid(STRUCTURE, "这两个模块失败会导致入口中断", "structure obsolete critical count")
require(STRUCTURE, "任一加载失败都会中断启动", "structure critical failure behavior")
require(STRUCTURE, "healthy / degraded / failed", "structure startup tri-state")

require(ARCH, "ballRebuildActive", "architecture rebuild state")
require(STRUCTURE, "ballRebuildActive", "structure rebuild state")
require(STRUCTURE, "position_state", "structure final load stage")

forbid(ARCH, "manifest.version = 20260703110021", "architecture frozen manifest version")
forbid(STRUCTURE, "version: 20260703110021", "structure frozen manifest version")
for old_files in ("files: 22 个模块", "files: 24 个模块", "files: 25 个模块"):
    forbid(STRUCTURE, old_files, "structure old manifest module count")
require(STRUCTURE, "files: 26 个模块", "structure manifest module count")

require(SQLITE, "intentUri", "SQLite shortcut intent field")
require(SQLITE, "shortcutExecMode", "SQLite shortcut mode field")
forbid(SQLITE, "shortcutCode\n", "SQLite obsolete shortcut field")

require(README, "无效配置会强制回退到 `2`", "README secure fallback")
require(ARCH, "无效值会强制回退到完整验签模式 `2`", "architecture secure fallback")
require(STRUCTURE, "无效值强制回退到 `2`", "structure secure fallback")

print("Documentation consistency verification passed")
