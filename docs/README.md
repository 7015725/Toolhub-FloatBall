# ToolHub 文档索引

本目录只保存专题文档。仓库根目录保留最常用的入口、架构、结构与存储说明，避免核心链接层级过深。

## 核心文档

| 文档 | 用途 |
|---|---|
| [`../README.md`](../README.md) | 项目入口、部署方式和核心能力 |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | 技术架构、启动链和安全更新模型 |
| [`../STRUCTURE.md`](../STRUCTURE.md) | 仓库结构、模块职责和状态流 |
| [`../SQLITE_STORAGE.md`](../SQLITE_STORAGE.md) | SQLite 表结构、迁移、事务、按钮图标 BLOB 与截图记录 |

## 功能专题

| 文档 | 用途 |
|---|---|
| [`features/button-types.md`](features/button-types.md) | 可创建按钮类型、App 选择器及已移除类型 |

## 安全专题

| 文档 | 用途 |
|---|---|
| [`security/security-config-clean.md`](security/security-config-clean.md) | Shell 广播桥、快捷方式、Content 动作及默认安全参数 |

## 自动生成审计

以下报告位于仓库根目录，并由 Python 脚本确定性生成和 CI 校验：

- [`../DEAD_CODE_AUDIT.md`](../DEAD_CODE_AUDIT.md)
- [`../ENTRY_SYMBOL_AUDIT.md`](../ENTRY_SYMBOL_AUDIT.md)
- [`../PROTECTED_WRAPPER_AUDIT.md`](../PROTECTED_WRAPPER_AUDIT.md)
- [`../MODULE_SYMBOL_AUDIT.md`](../MODULE_SYMBOL_AUDIT.md)

`ci-python-execution-inventory.md` 不再提交到仓库。该清单随相关工作流变化自动生成，并以 GitHub Actions Artifact 形式保存，避免静态副本过期。
