#!/usr/bin/env python3
"""Verify core documents against the current module, security, and storage model."""
import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = (ROOT / "README.md").read_text(encoding="utf-8")
ARCH = (ROOT / "docs/ARCHITECTURE.md").read_text(encoding="utf-8")
STRUCTURE = (ROOT / "docs/STRUCTURE.md").read_text(encoding="utf-8")
SQLITE = (ROOT / "docs/SQLITE_STORAGE.md").read_text(encoding="utf-8")
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")
SIGN_SCRIPT = ROOT / "scripts" / "generate_signed_manifest.py"


def fail(message):
    raise SystemExit("FAIL documentation-consistency: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("stale %s: %s" % (label, fragment))


def parse_signing_modules():
    tree = ast.parse(SIGN_SCRIPT.read_text(encoding="utf-8"), filename=str(SIGN_SCRIPT))
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if any(
            isinstance(target, ast.Name) and target.id == "MODULES"
            for target in node.targets
        ):
            return [str(item) for item in ast.literal_eval(node.value)]
    fail("generate_signed_manifest.py MODULES missing")


def parse_entry_modules():
    match = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", ENTRY, re.S)
    if not match:
        fail("ToolHub.js modules list missing")
    pairs = re.findall(r'"([^\"]+\.js)"|\'([^\']+\.js)\'', match.group(1))
    return [left or right for left, right in pairs]


modules = parse_signing_modules()
entry_modules = parse_entry_modules()
if modules != entry_modules:
    fail("ToolHub.js and signing MODULES differ")
module_count = len(modules)
expected_count = "%d 个子模块" % module_count

for document_name, document_text in (
    ("README", README),
    ("ARCHITECTURE", ARCH),
    ("STRUCTURE", STRUCTURE),
):
    for module in modules:
        require(document_text, module, document_name + " module " + module)

require(ARCH, expected_count, "architecture module count")
require(STRUCTURE, expected_count, "structure module count")
require(
    STRUCTURE,
    "files: %d 个模块" % module_count,
    "structure manifest module count",
)
for document_name, document_text in (
    ("ARCHITECTURE", ARCH),
    ("STRUCTURE", STRUCTURE),
):
    for match in re.finditer(r"(\d+) 个子模块", document_text):
        if int(match.group(1)) != module_count:
            fail("%s stale module count: %s" % (document_name, match.group(0)))

require(README, "docs/SQLITE_STORAGE.md", "README SQLite document")
require(README, "docs/README.md", "README documentation index")
require(README, "scripts/README.md", "README Python index")
require(README, "docs/features/button-types.md", "README button type document")
require(README, "docs/security/security-config-clean.md", "README security document")
require(README, "docs/audits/MODULE_SYMBOL_AUDIT.md", "README module audit")
forbid(README, "BUTTON_ICON_STORAGE.md", "README split button icon document")
forbid(README, "docs/button-types.md", "README old button type path")
forbid(README, "docs/security-config-clean.md", "README old security path")
require(SQLITE, "按钮图标 BLOB 存储细则", "SQLite integrated button icon details")
require(SQLITE, "sqlite-icon:<SHA-256>", "SQLite icon runtime URI")
require(SQLITE, "button_icon_storage_version=1", "SQLite icon migration version")

for table_name in (
    "toolhub_button_icons",
    "toolhub_pickword_images",
    "toolhub_pickword_image_exports",
):
    require(README, table_name, "README table " + table_name)
    require(SQLITE, table_name, "SQLite table " + table_name)

require(README, "默认启动 `intentUri`", "README shortcut behavior")
require(ARCH, "intentUri", "architecture shortcut behavior")
require(STRUCTURE, "intentUri", "structure shortcut behavior")
forbid(README, "执行 ShortX 快捷方式代码", "README legacy shortcut default")
forbid(
    STRUCTURE,
    "通过 shell 广播桥发送 base64 命令，默认 root",
    "structure root default",
)

for document_text, label in ((ARCH, "architecture"), (STRUCTURE, "structure")):
    require(
        document_text,
        ".module_update_transaction.json",
        label + " transaction marker",
    )
    require(
        document_text,
        ".module_update_transaction.committed",
        label + " commit marker",
    )
    require(document_text, "toolhub.db", label + " structured storage")

critical_modules = (
    "th_01_base.js",
    "th_02_core.js",
    "th_05_persistence.js",
    "th_16_entry.js",
    "th_19_position_state.js",
)
for module_name in critical_modules:
    require(ARCH, module_name, "architecture critical module " + module_name)
    require(STRUCTURE, module_name, "structure critical module " + module_name)
forbid(
    STRUCTURE,
    "这两个模块失败会导致入口中断",
    "structure obsolete critical count",
)
require(STRUCTURE, "任一加载失败都会中断启动", "structure critical failure behavior")
require(STRUCTURE, "healthy / degraded / failed", "structure startup tri-state")

require(ARCH, "ballRebuildActive", "architecture rebuild state")
require(STRUCTURE, "ballRebuildActive", "structure rebuild state")
require(STRUCTURE, "position_state", "structure final load stage")
forbid(ARCH, "manifest.version = 20260703110021", "architecture frozen manifest version")
forbid(STRUCTURE, "version: 20260703110021", "structure frozen manifest version")

require(SQLITE, "intentUri", "SQLite shortcut intent field")
require(SQLITE, "shortcutExecMode", "SQLite shortcut mode field")
forbid(SQLITE, "shortcutCode\n", "SQLite obsolete shortcut field")

require(README, "无效配置会强制回退到 `2`", "README secure fallback")
require(ARCH, "无效值会强制回退到完整验签模式 `2`", "architecture secure fallback")
require(STRUCTURE, "无效值强制回退到 `2`", "structure secure fallback")

print("Documentation consistency verification passed modules=%d" % module_count)
