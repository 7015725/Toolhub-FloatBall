# ToolHub 文档索引

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
