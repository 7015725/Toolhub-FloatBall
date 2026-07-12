#!/usr/bin/env python3
"""临时应用最终复审确认的入口安全回退和文档同步修复。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


def write(name, text):
    (ROOT / name).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("patch anchor %s count=%d" % (label, count))
    return text.replace(old, new, 1)


def replace_section(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise SystemExit("patch section start missing: " + label)
    b = text.find(end, a + len(start))
    if b < 0:
        raise SystemExit("patch section end missing: " + label)
    return text[:a] + replacement + text[b:]


# ToolHub.js：非法或模糊安全模式不得降级到普通更新。
entry = read("ToolHub.js")
entry = replace_once(
    entry,
    'if (UPDATE_SOURCE !== 1) UPDATE_SOURCE = 0;\nUPDATE_SECURITY_MODE = parseInt(String(UPDATE_SECURITY_MODE || 0), 10);\nif (isNaN(UPDATE_SECURITY_MODE) || UPDATE_SECURITY_MODE < 0 || UPDATE_SECURITY_MODE > 2) UPDATE_SECURITY_MODE = 0;',
    'if (UPDATE_SOURCE !== 1) UPDATE_SOURCE = 0;\nvar __updateSecurityModeText = "";\nvar __updateSecurityModeFallback = false;\ntry { __updateSecurityModeText = String(UPDATE_SECURITY_MODE).replace(/^\\s+|\\s+$/g, ""); } catch (eUpdateSecurityModeText) { __updateSecurityModeText = ""; }\nif (/^[012]$/.test(__updateSecurityModeText)) {\n    UPDATE_SECURITY_MODE = parseInt(__updateSecurityModeText, 10);\n} else {\n    UPDATE_SECURITY_MODE = 2;\n    __updateSecurityModeFallback = true;\n}',
    "entry security mode normalization",
)
entry = replace_once(
    entry,
    'var TOOLHUB_BOOT_ROOT_DIR = getToolHubRootDir();',
    'var TOOLHUB_BOOT_ROOT_DIR = getToolHubRootDir();\nif (__updateSecurityModeFallback) {\n    writeLog("WARN invalid UPDATE_SECURITY_MODE, forced to secure mode 2");\n}',
    "entry security fallback warning",
)
write("ToolHub.js", entry)


# README：同步模块、动作、安全模式和结构化存储描述。
readme = read("README.md")
readme = replace_once(
    readme,
    'STRUCTURE.md\nARCHITECTURE.md\nSQLITE_STORAGE.md',
    'STRUCTURE.md\nARCHITECTURE.md\nSQLITE_STORAGE.md\ndocs/security-config-clean.md',
    "README related docs",
)
readme = replace_once(
    readme,
    '| `2` | 校验签名、keyId、版本、防回滚、SHA-256 和文件大小 |\n\n---',
    '| `2` | 校验签名、keyId、版本、防回滚、SHA-256 和文件大小 |\n\n只有明确设置为 `0` 才进入普通更新模式。空值、非法字符、复合字符串和越界值等无效配置会强制回退到 `2`，避免配置错误静默关闭验签。\n\n---',
    "README secure fallback",
)
readme = replace_once(
    readme,
    '    │   ├── th_17_pointer.js\n    │   └── th_18_pointer_ocr.js',
    '    │   ├── th_17_pointer.js\n    │   ├── th_18_pointer_ocr.js\n    │   └── th_19_position_state.js',
    "README module tree",
)
readme = replace_once(
    readme,
    '快捷方式代码\n数组和对象参数',
    '快捷方式 Intent / 执行模式 / 旧版兼容代码\n数组和对象参数',
    "README button fields",
)
readme = replace_once(
    readme,
    '| `shortcut` | 执行 ShortX 快捷方式代码 |\n| `content` | 查询 ContentProvider |',
    '| `shortcut` | 默认启动 `intentUri`；仅显式 `legacy_js` 执行历史兼容代码 |\n| `content` | 按读写白名单访问 ContentProvider |',
    "README action table",
)
readme = replace_once(
    readme,
    '| `th_08_content.js` | ContentProvider 查询 |',
    '| `th_08_content.js` | ContentProvider 受控读取与按写入白名单执行修改 |',
    "README content responsibility",
)
readme = replace_once(
    readme,
    '| `th_18_pointer_ocr.js` | 截图 OCR 与覆盖层处理 |',
    '| `th_18_pointer_ocr.js` | 截图 OCR 与覆盖层处理 |\n| `th_19_position_state.js` | 悬浮球固定位置、指针布局与尺寸重建事务回滚 |',
    "README th19 responsibility",
)
write("README.md", readme)


# ARCHITECTURE：同步 24 模块、关键模块、事务更新和 SQLite。
arch = read("ARCHITECTURE.md")
arch = replace_once(arch, "更新时间：2026-07-09", "更新时间：2026-07-13", "architecture date")
arch = replace_once(
    arch,
    '本文基于当前 `main` 分支整理，只描述仓库中已经存在的代码结构与机制。项目当前实际加载 **23 个子模块**；`th_07_shortcut.js` 已退役，快捷方式选择能力由 `th_14_button_shortcut.js` 承载，指针取字能力由 `th_17_pointer.js` 承载，框选 OCR 与指针边框颜色状态由 `th_18_pointer_ocr.js` 承载。',
    '本文基于当前 `main` 分支整理，只描述仓库中已经存在的代码结构与机制。项目当前实际加载 **24 个子模块**；`th_07_shortcut.js` 已退役，快捷方式选择能力由 `th_14_button_shortcut.js` 承载，指针取字能力由 `th_17_pointer.js` 承载，框选 OCR 由 `th_18_pointer_ocr.js` 承载，固定位置、指针布局和悬浮球重建回滚由 `th_19_position_state.js` 承载。',
    "architecture intro",
)
arch = arch.replace("当前为 23 个。", "当前为 24 个。")
arch = replace_once(
    arch,
    '                 ├─ shortcut      → shortcutJsCode\n                 ├─ content       → ContentProvider 查询 / 展示',
    '                 ├─ shortcut      → 默认启动 intentUri；legacy_js 仅兼容历史按钮\n                 ├─ content       → ContentProvider 受控读写 / 展示',
    "architecture action flow",
)
arch = replace_once(arch, "当前实际加载 23 个子模块，入口 `modules[]` 顺序如下：", "当前实际加载 24 个子模块，入口 `modules[]` 顺序如下：", "architecture module count")
arch = replace_once(
    arch,
    '  th_17_pointer.js\n  th_18_pointer_ocr.js',
    '  th_17_pointer.js\n  th_18_pointer_ocr.js\n  th_19_position_state.js',
    "architecture module list",
)
arch = replace_once(
    arch,
    'th_02_core.js\n  FloatBallAppWM 构造函数、this.state 初始化、dp/sp/now/clamp、runOnUiThreadSafe、UI 工具对象初始化。',
    'th_02_core.js\n  完全结构化 SQLite、旧配置迁移、防抖并发写入，以及 FloatBallAppWM 核心状态和基础方法。',
    "architecture th02 responsibility",
)
arch = replace_once(
    arch,
    'th_08_content.js\n  ContentProvider query/get/view 相关能力，支撑 content 类型按钮。',
    'th_08_content.js\n  ContentProvider query/get/view 与 put/update/insert/delete；读取和写入分别受独立白名单控制。',
    "architecture th08 responsibility",
)
arch = replace_once(
    arch,
    'th_18_pointer_ocr.js\n  框选截图 OCR 处理、截图区域覆盖层、OCR 任务衔接、指针边框颜色状态补充。',
    'th_18_pointer_ocr.js\n  框选截图 OCR 处理、截图区域覆盖层、OCR 任务衔接、指针边框颜色状态补充。\n\nth_19_position_state.js\n  悬浮球固定位置状态机、指针布局适配、语义回调会话隔离和尺寸重建事务回滚。',
    "architecture th19 responsibility",
)
arch = replace_once(
    arch,
    '- `UPDATE_SECURITY_MODE` 当前默认是 `2`，即完整验签安全更新模式。\n- 入口中 `criticalModules` 包含 `th_01_base.js` 和 `th_16_entry.js`，这两个模块加载失败会中断启动。\n- 其他模块加载失败会记录到 `loadErrors`，但不一定立即中断，可能在运行期暴露功能缺失。\n- 入口会在启动返回 JSON 中汇总安全状态、同步状态、布局、关闭广播、更新模块和加载异常。',
    '- `UPDATE_SECURITY_MODE` 当前默认是 `2`，即完整验签安全更新模式；只有明确值 `0` 才进入普通模式，无效值会强制回退到完整验签模式 `2`。\n- 入口中 `criticalModules` 包含 `th_01_base.js`、`th_02_core.js`、`th_05_persistence.js`、`th_16_entry.js` 和 `th_19_position_state.js`，任一加载失败都会中断启动。\n- 其他模块加载失败会记录到 `loadErrors`；悬浮球仍能启动时返回 `degraded`，不会再误报为完整成功。\n- 入口启动结果使用 `healthy / degraded / failed` 三态，并汇总安全状态、同步状态、布局、关闭广播、更新模块和加载异常。',
    "architecture startup key points",
)
security_block = '''安全更新链：

```text
ToolHub.js 内置 RSA 公钥
   │
   ▼
下载 manifest.json / manifest.sig
   │
   ├─ 校验 alg / keyId / SHA256withRSA
   ├─ 校验 manifest version 与本地防回滚版本
   └─ 校验 modules[] 与 manifest.files 一致
   │
   ▼
把全部待更新模块下载到 .txn.tmp
   │
   ├─ 每个文件执行 size / sha256 校验
   └─ 所有文件均完成阶段校验后才进入切换
   │
   ▼
持久化 .module_update_transaction.json
   │
   ├─ 正式文件移动到 .txn.bak
   ├─ 阶段文件切换为正式文件
   └─ 安装清单、可信 SHA 和可信版本纳入同一事务
   │
   ▼
整批哈希复核后写入 .module_update_transaction.committed
   │
   ├─ 任一失败：逆序恢复整批备份
   ├─ 未提交中断：下次启动整批回滚
   └─ 已提交中断：下次启动完成清理
```

清单版本不在文档中固定写死，以仓库当前 `manifest.json` 为准。
'''
arch = replace_section(arch, "安全更新链：\n\n", "涉及文件：", security_block, "architecture security update")
cache_section = '''## 6. 本地缓存机制

实机目录：

```text
shortx.getShortXDir()/ToolHub/
├── code/
│   ├── th_01_base.js ... th_19_position_state.js
│   ├── .installed_manifest.json
│   ├── .trusted_manifest_version
│   ├── .trusted_sha_<module>
│   ├── .module_update_transaction.json          # 事务期间临时存在
│   └── .module_update_transaction.committed     # 提交收尾期间临时存在
├── logs/
│   ├── init.log
│   └── ShortX_ToolHub_yyyyMMdd.log
└── toolhub.db
```

缓存职责：

```text
code/
  本地子模块缓存。入口按安全模式校验、事务更新或复用可信模块。

toolhub.db
  完全结构化 SQLite，保存设置、按钮、Schema 和迁移元数据。

logs/init.log
  入口启动、目录准备、manifest、事务恢复、安全更新和模块加载日志。

logs/ShortX_ToolHub_yyyyMMdd.log
  运行期日志文件。

.installed_manifest.json / .trusted_sha_<module> / .trusted_manifest_version
  保存当前安装状态、可信哈希和防回滚版本。
```

`settings.json`、`buttons.json` 和 `schema.json` 只作为旧版本迁移来源；迁移成功后会删除，不再作为当前持久化后端。

'''
arch = replace_section(arch, "## 6. 本地缓存机制", "注意：", cache_section, "architecture cache section")
arch = replace_once(
    arch,
    '│   ├── docked\n│   └── dockSide',
    '│   ├── docked\n│   ├── dockSide\n│   └── ballRebuildActive',
    "architecture ball state",
)
write("ARCHITECTURE.md", arch)


# STRUCTURE：同步仓库树、SQLite、动作默认值和事务更新。
structure = read("STRUCTURE.md")
structure = replace_once(structure, "更新时间：2026-07-09", "更新时间：2026-07-13", "structure date")
structure = replace_once(
    structure,
    '│   ├── th_17_pointer.js\n│   └── th_18_pointer_ocr.js\n└── scripts/\n    ├── generate_signed_manifest.py\n    ├── verify_manifest.py\n    ├── verify_button_editor_layout.py\n    ├── verify_schema_validator.py\n    ├── verify_toolapp_adaptive_size.py\n    └── verify_toolapp_single_root.py',
    '│   ├── th_17_pointer.js\n│   ├── th_18_pointer_ocr.js\n│   └── th_19_position_state.js\n└── scripts/\n    ├── generate_signed_manifest.py\n    ├── verify_module_versions.py\n    ├── verify_atomic_update.py\n    ├── verify_release_transaction.py\n    ├── verify_sqlite_storage.py\n    └── ... 其他专项回归脚本',
    "structure repository tree",
)
structure = replace_once(
    structure,
    '当前实际加载 **23 个子模块**。`th_14_*` 已拆出按钮快捷方式、按钮图标编辑、按钮管理/编辑、颜色选择器、图标选择器和 schema 编辑器；`th_14_button_editor.js` 承载按钮管理紧凑列表、筛选、状态菜单和排序模式，快捷方式选择能力由 `th_14_button_shortcut.js` 承载，指针取字能力由 `th_17_pointer.js` 承载，框选 OCR 处理与颜色状态补充由 `th_18_pointer_ocr.js` 承载。',
    '当前实际加载 **24 个子模块**。`th_14_*` 已拆出按钮快捷方式、按钮图标编辑、按钮管理/编辑、颜色选择器、图标选择器和 schema 编辑器；快捷方式选择能力由 `th_14_button_shortcut.js` 承载，指针取字由 `th_17_pointer.js` 承载，框选 OCR 由 `th_18_pointer_ocr.js` 承载，固定位置和悬浮球重建回滚由 `th_19_position_state.js` 承载。',
    "structure module count",
)
real_dir = '''## 4. 实机目录

```text
shortx.getShortXDir()/ToolHub/
├── code/                         # 本地缓存子模块
│   ├── th_01_base.js
│   ├── ...
│   ├── th_17_pointer.js
│   ├── th_18_pointer_ocr.js
│   ├── th_19_position_state.js
│   ├── .installed_manifest.json
│   ├── .trusted_manifest_version
│   └── .trusted_sha_<module>
├── logs/
│   ├── init.log
│   └── ShortX_ToolHub_yyyyMMdd.log
└── toolhub.db                    # 设置、按钮和 Schema 的结构化 SQLite
```

旧 `settings.json`、`buttons.json`、`schema.json` 仅在迁移阶段读取；迁移成功后删除。

'''
structure = replace_section(structure, "## 4. 实机目录", "---\n\n## 5. 启动链路", real_dir, "structure runtime directory")
structure = replace_once(
    structure,
    'var UPDATE_SECURITY_MODE = 2;   // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新\n```',
    'var UPDATE_SECURITY_MODE = 2;   // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新\n```\n\n只有精确值 `0 / 1 / 2` 有效；无效值强制回退到 `2`，不会静默进入普通模式。',
    "structure security fallback",
)
structure = replace_once(
    structure,
    '| `th_02_core.js` | `FloatBallAppWM` 构造函数、核心 state 初始化、基础方法、UI 工具对象初始化 |',
    '| `th_02_core.js` | 完全结构化 SQLite、旧配置迁移、防抖并发写入、核心 state 与基础方法 |',
    "structure th02 responsibility",
)
structure = replace_once(
    structure,
    '| `th_08_content.js` | ContentProvider 查询、Content 类型按钮读取 |',
    '| `th_08_content.js` | ContentProvider 受控读写，读取与写入使用独立 URI 白名单 |',
    "structure th08 responsibility",
)
structure = replace_once(
    structure,
    '| `th_18_pointer_ocr.js` | 框选截图 OCR 处理、截图区域覆盖层、OCR 任务衔接、指针边框颜色状态补充 |',
    '| `th_18_pointer_ocr.js` | 框选截图 OCR 处理、截图区域覆盖层、OCR 任务衔接、指针边框颜色状态补充 |\n| `th_19_position_state.js` | 固定位置状态机、指针布局、语义会话隔离和悬浮球尺寸重建回滚 |',
    "structure th19 responsibility",
)
structure = replace_once(
    structure,
    '| `shell` | 通过 shell 广播桥发送 base64 命令，默认 root |\n| `broadcast` | 发送自定义广播，兼容 `extra` / `extras` |\n| `shortcut` | 执行 `shortcutJsCode`，用于锁定主 / 分身快捷方式 |',
    '| `shell` | 通过 Shell 广播桥发送 base64 命令；Root 默认关闭，仅显式 `root:true` 开启 |\n| `broadcast` | 发送自定义广播，兼容 `extra` / `extras` |\n| `shortcut` | 默认启动 `intentUri`；仅显式 `legacy_js` 执行历史 `shortcutJsCode` |\n| `content` | 按独立读写白名单访问 ContentProvider |\n| `pointer` | 启动取字或框选 OCR |',
    "structure action table",
)
persistence_section = '''## 13. 配置与持久化

当前持久化后端：

```text
toolhub.db
├── toolhub_meta
├── toolhub_settings
├── toolhub_buttons
├── toolhub_button_values
└── toolhub_schema_values
```

配置流：

```text
ConfigManager.loadSettings / loadButtons / loadSchema
   │
   ▼
ConfigValidator 与兼容迁移
   │
   ▼
结构化 SQLite 适配器
   │
   ├─ settings → 类型化键值行
   ├─ buttons  → 主表 + 递归参数节点
   └─ schema   → 递归关系节点
```

持久化策略：

- SQLite 事务提交后才报告保存成功。
- 防抖任务由任务锁保护，所有管理写入通过统一写锁串行执行。
- 旧任务在写入前后校验对象身份和代次，不能删除或覆盖新任务。
- 立即保存会取消同路径旧防抖任务。
- `close()` 时刷新待写任务，失败任务保留供后续重试。
- 数据库只读救援模式禁止把默认值写回损坏数据库。

旧 JSON 文件只作为一次性迁移来源，不再作为运行期配置文件。

'''
structure = replace_section(structure, "## 13. 配置与持久化", "---\n\n## 14. 悬浮球位置", persistence_section, "structure persistence section")
security_section = '''## 16. 安全更新机制

```text
ToolHub.js 内置 RSA 公钥
   │
   ▼
下载并验证 manifest.json / manifest.sig
   │
   ├─ alg / keyId / SHA256withRSA
   ├─ manifest version 防回滚
   └─ modules[] / manifest.files 一致性
   │
   ▼
整批模块下载到 .txn.tmp 并校验 size / sha256
   │
   ▼
写入 .module_update_transaction.json
   │
   ├─ 正式文件备份为 .txn.bak
   ├─ 模块和安全元数据在同一事务内切换
   └─ 整批哈希通过后写入 .module_update_transaction.committed
   │
   ▼
失败逆序回滚；中断由下次启动恢复或完成清理
```

当前清单结构：

```text
schema: 3
version: 以当前 manifest.json 为准
alg: SHA256withRSA
keyId: toolhub-targets-20260703-rsa3072
files: 24 个模块
```

'''
structure = replace_section(structure, "## 16. 安全更新机制", "---\n\n## 17. 维护注意事项", security_section, "structure security section")
structure = replace_once(
    structure,
    'scripts/generate_signed_manifest.py',
    'python3 scripts/generate_signed_manifest.py --yes',
    "structure signing command",
)
write("STRUCTURE.md", structure)


# SQLite 文档：快捷方式字段已由 intent 模式取代旧单字段描述。
sqlite = read("SQLITE_STORAGE.md")
sqlite = replace_once(
    sqlite,
    'shortcutCode\n嵌套对象',
    'intentUri\nshortcutExecMode\nshortcutJsCode（仅历史 legacy_js 按钮）\n嵌套对象',
    "SQLite shortcut fields",
)
write("SQLITE_STORAGE.md", sqlite)


# CI 接入两个长期验证。
workflow = read(".github/workflows/verify.yml")
workflow = replace_once(
    workflow,
    '          python3 scripts/verify_startup_status.py\n          python3 scripts/verify_shell_bridge_security.py',
    '          python3 scripts/verify_startup_status.py\n          python3 scripts/verify_update_security_mode.py\n          python3 scripts/verify_shell_bridge_security.py',
    "workflow update security verification",
)
workflow = replace_once(
    workflow,
    '          python3 scripts/verify_module_versions.py\n          python3 scripts/verify_pointer_regressions.py',
    '          python3 scripts/verify_module_versions.py\n          python3 scripts/verify_documentation_consistency.py\n          python3 scripts/verify_pointer_regressions.py',
    "workflow documentation verification",
)
write(".github/workflows/verify.yml", workflow)

print("Final audit security and documentation patch applied")
