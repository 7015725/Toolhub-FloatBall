#!/usr/bin/env python3
"""One-time repository layout migration used only by the maintenance PR."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

MOVES = {
    "ARCHITECTURE.md": "docs/ARCHITECTURE.md",
    "STRUCTURE.md": "docs/STRUCTURE.md",
    "SQLITE_STORAGE.md": "docs/SQLITE_STORAGE.md",
    "DEAD_CODE_AUDIT.md": "docs/audits/DEAD_CODE_AUDIT.md",
    "ENTRY_SYMBOL_AUDIT.md": "docs/audits/ENTRY_SYMBOL_AUDIT.md",
    "MODULE_SYMBOL_AUDIT.md": "docs/audits/MODULE_SYMBOL_AUDIT.md",
    "PROTECTED_WRAPPER_AUDIT.md": "docs/audits/PROTECTED_WRAPPER_AUDIT.md",
    "MODULE_BOUNDARIES.json": "constraints/MODULE_BOUNDARIES.json",
}

DOCS_INDEX = """# ToolHub 文档索引

本目录集中保存架构、结构、存储、功能和安全文档。仓库根目录只保留项目入口、发布资产和总说明。

## 核心文档

| 文档 | 用途 |
|---|---|
| [`../README.md`](../README.md) | 项目入口、部署方式和核心能力 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | 技术架构、启动链和安全更新模型 |
| [`STRUCTURE.md`](STRUCTURE.md) | 仓库结构、模块职责和状态流 |
| [`SQLITE_STORAGE.md`](SQLITE_STORAGE.md) | SQLite 表结构、迁移、事务、按钮图标 BLOB 与截图记录 |

## 功能专题

| 文档 | 用途 |
|---|---|
| [`features/button-types.md`](features/button-types.md) | 可创建按钮类型、App 选择器及已移除类型 |

## 安全专题

| 文档 | 用途 |
|---|---|
| [`security/security-config-clean.md`](security/security-config-clean.md) | Shell 广播桥、快捷方式、Content 动作及默认安全参数 |

## 自动生成审计

`audits/` 内的报告由 Python 脚本确定性生成并由 CI 校验，不应手工修改：

- [`audits/DEAD_CODE_AUDIT.md`](audits/DEAD_CODE_AUDIT.md)
- [`audits/ENTRY_SYMBOL_AUDIT.md`](audits/ENTRY_SYMBOL_AUDIT.md)
- [`audits/MODULE_SYMBOL_AUDIT.md`](audits/MODULE_SYMBOL_AUDIT.md)
- [`audits/PROTECTED_WRAPPER_AUDIT.md`](audits/PROTECTED_WRAPPER_AUDIT.md)

`ci-python-execution-inventory.md` 不提交到仓库。该清单随工作流变化生成并以 GitHub Actions Artifact 保存，避免静态副本过期。
"""


def write_if_changed(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    old = path.read_text(encoding="utf-8") if path.exists() else None
    if old != text:
        path.write_text(text, encoding="utf-8")


def replace_file(path, replacements):
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    updated = text
    for old, new in replacements:
        updated = updated.replace(old, new)
    if updated != text:
        path.write_text(updated, encoding="utf-8")


def move_files():
    for old_name, new_name in MOVES.items():
        old_path = ROOT / old_name
        new_path = ROOT / new_name
        if new_path.exists():
            if old_path.exists():
                raise SystemExit("both old and new paths exist: %s" % old_name)
            continue
        if not old_path.exists():
            raise SystemExit("missing migration source: %s" % old_name)
        new_path.parent.mkdir(parents=True, exist_ok=True)
        old_path.rename(new_path)


def update_python_paths():
    replacements = (
        ('ROOT / "ARCHITECTURE.md"', 'ROOT / "docs" / "ARCHITECTURE.md"'),
        ('ROOT / "STRUCTURE.md"', 'ROOT / "docs" / "STRUCTURE.md"'),
        ('ROOT / "SQLITE_STORAGE.md"', 'ROOT / "docs" / "SQLITE_STORAGE.md"'),
        ('ROOT / "MODULE_BOUNDARIES.json"', 'ROOT / "constraints" / "MODULE_BOUNDARIES.json"'),
        ('ROOT / "DEAD_CODE_AUDIT.md"', 'ROOT / "docs" / "audits" / "DEAD_CODE_AUDIT.md"'),
        ('ROOT / "ENTRY_SYMBOL_AUDIT.md"', 'ROOT / "docs" / "audits" / "ENTRY_SYMBOL_AUDIT.md"'),
        ('ROOT / "MODULE_SYMBOL_AUDIT.md"', 'ROOT / "docs" / "audits" / "MODULE_SYMBOL_AUDIT.md"'),
        ('ROOT / "PROTECTED_WRAPPER_AUDIT.md"', 'ROOT / "docs" / "audits" / "PROTECTED_WRAPPER_AUDIT.md"'),
        ('"MODULE_BOUNDARIES.json"', '"constraints/MODULE_BOUNDARIES.json"'),
        ("'MODULE_BOUNDARIES.json'", "'constraints/MODULE_BOUNDARIES.json'"),
        ('"DEAD_CODE_AUDIT.md"', '"docs/audits/DEAD_CODE_AUDIT.md"'),
        ('"ENTRY_SYMBOL_AUDIT.md"', '"docs/audits/ENTRY_SYMBOL_AUDIT.md"'),
        ('"MODULE_SYMBOL_AUDIT.md"', '"docs/audits/MODULE_SYMBOL_AUDIT.md"'),
        ('"PROTECTED_WRAPPER_AUDIT.md"', '"docs/audits/PROTECTED_WRAPPER_AUDIT.md"'),
        ('"ARCHITECTURE.md"', '"docs/ARCHITECTURE.md"'),
        ('"STRUCTURE.md"', '"docs/STRUCTURE.md"'),
        ('"SQLITE_STORAGE.md"', '"docs/SQLITE_STORAGE.md"'),
    )
    for path in sorted((ROOT / "scripts").glob("*.py")):
        if path.name == "migrate_repository_layout.py":
            continue
        replace_file(path, replacements)


def update_root_readme():
    replacements = (
        ("STRUCTURE.md", "docs/STRUCTURE.md"),
        ("ARCHITECTURE.md", "docs/ARCHITECTURE.md"),
        ("SQLITE_STORAGE.md", "docs/SQLITE_STORAGE.md"),
        ("DEAD_CODE_AUDIT.md", "docs/audits/DEAD_CODE_AUDIT.md"),
        ("ENTRY_SYMBOL_AUDIT.md", "docs/audits/ENTRY_SYMBOL_AUDIT.md"),
        ("MODULE_SYMBOL_AUDIT.md", "docs/audits/MODULE_SYMBOL_AUDIT.md"),
        ("PROTECTED_WRAPPER_AUDIT.md", "docs/audits/PROTECTED_WRAPPER_AUDIT.md"),
        ("MODULE_BOUNDARIES.json", "constraints/MODULE_BOUNDARIES.json"),
    )
    replace_file(ROOT / "README.md", replacements)


def update_constraints():
    methods_path = ROOT / "constraints" / "methods.json"
    methods = json.loads(methods_path.read_text(encoding="utf-8"))
    methods["source"] = "constraints/MODULE_BOUNDARIES.json"
    methods["description"] = "统一注册入口；实际方法归属、重复定义和最终所有者以 constraints/MODULE_BOUNDARIES.json 为真实约束源。"
    methods_path.write_text(json.dumps(methods, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    readme_path = ROOT / "constraints" / "README.md"
    text = readme_path.read_text(encoding="utf-8")
    text = text.replace(
        "方法归属继续由仓库根目录的 `MODULE_BOUNDARIES.json` 维护。",
        "方法归属由同目录的 `MODULE_BOUNDARIES.json` 维护。",
    )
    if "- `methods.json`" not in text:
        text = text.replace(
            "- `syntax.json`：Rhino ES5 语法契约。\n",
            "- `syntax.json`：Rhino ES5 语法契约。\n"
            "- `methods.json`：方法约束注册入口。\n"
            "- `MODULE_BOUNDARIES.json`：方法直接所有者、覆盖链和最终有效实现的真实约束源。\n",
        )
    readme_path.write_text(text, encoding="utf-8")


def update_scripts_index():
    path = ROOT / "scripts" / "README.md"
    text = path.read_text(encoding="utf-8")
    text = text.replace(
        "方法归属继续由 `MODULE_BOUNDARIES.json` 提供真实约束",
        "方法归属由 `constraints/MODULE_BOUNDARIES.json` 提供真实约束",
    )
    if "`verify_repository_layout.py`" not in text:
        text = text.replace(
            "- `verify_workflow_script_references.py`\n",
            "- `verify_workflow_script_references.py`\n"
            "- `verify_repository_layout.py`：约束根目录只保留项目入口、发布资产和总说明，防止文档、审计报告与方法基线回流。\n",
        )
    if "`docs/audits/`" not in text:
        text = text.replace(
            "## 资产与审计报告\n",
            "## 资产与审计报告\n\n自动生成 Markdown 报告统一保存到 `docs/audits/`。\n",
        )
    path.write_text(text, encoding="utf-8")


def update_constraint_registry_validator():
    path = ROOT / "scripts" / "verify_constraint_registry.py"
    text = path.read_text(encoding="utf-8")
    old = 'for name in ("registry.json", "syntax.json", "api.json", "threading.json", "lifecycle.json", "exceptions.json"):'
    new = 'for name in ("registry.json", "syntax.json", "methods.json", "MODULE_BOUNDARIES.json", "api.json", "threading.json", "lifecycle.json", "exceptions.json"):'
    text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def update_workflow():
    path = ROOT / ".github" / "workflows" / "verify.yml"
    text = path.read_text(encoding="utf-8")
    replacements = (
        ("--check DEAD_CODE_AUDIT.md", "--check docs/audits/DEAD_CODE_AUDIT.md"),
        ("--check ENTRY_SYMBOL_AUDIT.md", "--check docs/audits/ENTRY_SYMBOL_AUDIT.md"),
        ("--check MODULE_SYMBOL_AUDIT.md", "--check docs/audits/MODULE_SYMBOL_AUDIT.md"),
        ("--check PROTECTED_WRAPPER_AUDIT.md", "--check docs/audits/PROTECTED_WRAPPER_AUDIT.md"),
        ("            DEAD_CODE_AUDIT.md\n", "            docs/audits/DEAD_CODE_AUDIT.md\n"),
        ("            ENTRY_SYMBOL_AUDIT.md\n", "            docs/audits/ENTRY_SYMBOL_AUDIT.md\n"),
        ("            MODULE_SYMBOL_AUDIT.md\n", "            docs/audits/MODULE_SYMBOL_AUDIT.md\n"),
        ("            PROTECTED_WRAPPER_AUDIT.md\n", "            docs/audits/PROTECTED_WRAPPER_AUDIT.md\n"),
    )
    for old, new in replacements:
        text = text.replace(old, new)
    layout_step = (
        "      - name: Verify repository layout\n"
        "        shell: bash\n"
        "        run: python3 scripts/verify_repository_layout.py\n\n"
    )
    marker = "      - name: Verify code constraint registry\n"
    if layout_step not in text:
        text = text.replace(marker, layout_step + marker)
    path.write_text(text, encoding="utf-8")


def update_structure_document():
    path = ROOT / "docs" / "STRUCTURE.md"
    text = path.read_text(encoding="utf-8")
    old_lines = (
        "├── ARCHITECTURE.md\n",
        "├── STRUCTURE.md\n",
        "├── SQLITE_STORAGE.md\n",
        "├── DEAD_CODE_AUDIT.md\n",
        "├── ENTRY_SYMBOL_AUDIT.md\n",
        "├── MODULE_SYMBOL_AUDIT.md\n",
        "├── PROTECTED_WRAPPER_AUDIT.md\n",
        "├── MODULE_BOUNDARIES.json\n",
    )
    for line in old_lines:
        text = text.replace(line, "")
    if "docs/audits/" not in text:
        text += (
            "\n## 维护文件布局\n\n"
            "仓库根目录只保留 `README.md`、`ToolHub.js`、入口摘要、Manifest、签名和更新历史。"
            "核心文档位于 `docs/`，自动审计位于 `docs/audits/`，机器约束位于 `constraints/`。\n"
        )
    path.write_text(text, encoding="utf-8")


def main():
    move_files()
    update_python_paths()
    update_root_readme()
    write_if_changed(ROOT / "docs" / "README.md", DOCS_INDEX)
    update_constraints()
    update_scripts_index()
    update_constraint_registry_validator()
    update_workflow()
    update_structure_document()
    print("repository layout migration completed")


if __name__ == "__main__":
    main()
