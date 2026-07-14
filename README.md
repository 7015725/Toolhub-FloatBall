# ShortX ToolHub

ShortX ToolHub 是面向 **ShortX / Rhino ES5 JavaScript** 的模块化 Android 悬浮工具框架。

`ToolHub.js` 负责安全更新、模块校验和启动；悬浮球、工具面板、设置页、按钮管理、主题、结构化 SQLite、图标与颜色选择器、屏幕取字和框选 OCR 等能力拆分在 `code/th_*.js` 中维护。

## 仓库

```text
GitHub: https://github.com/7015725/Toolhub-FloatBall
```

相关文档：

```text
STRUCTURE.md
ARCHITECTURE.md
SQLITE_STORAGE.md
docs/security-config-clean.md
```


---

## 核心能力

- 模块化加载，入口负责下载、校验和按顺序加载子模块。
- 默认启用 manifest RSA 验签、keyId、防回滚、SHA-256 和文件大小校验。
- 网络或远端清单异常时，可以继续使用已验证的本地模块。
- 设置、按钮和 Schema 使用完全结构化 SQLite 存储。
- 数据库中不保存整段 JSON 文档，不创建 JSON 配置文件。
- 设置按键值和真实类型分行保存。
- 按钮使用主表和递归参数节点表保存。
- Schema 使用递归关系节点保存数组、对象和选项。
- 旧 JSON 文档表和配置文件会在迁移成功后删除。
- ToolApp 设置页支持手机、横屏和平板宽屏布局。
- 主按钮面板采用可配置自适应网格，按安全宽度、面板宽度占比、按钮最小宽度和自动最大列数实时计算布局，并保留实时运行状态、拖动排序和分页吸附；新增和编辑按钮直接保存，关闭时避免关闭闪烁。
- 支持按钮搜索、筛选、启停、排序和编辑。
- 支持悬浮球拖动唤出指针、悬停取字、小框回退和框选 OCR。
- 支持 Android 返回键、预测性返回和 ToolApp 横向滑动返回。
- 启动、更新、存储和运行异常写入 `ToolHub/logs/`。

---

## 快速部署

### 1. 安装入口

复制仓库中的 `ToolHub.js`，粘贴到 ShortX 的 JavaScript 任务中运行。

> `ToolHub.js` 是信任根，内置 RSA 公钥和最低可信清单版本。入口自身发生变化时，需要手动替换 ShortX 任务中的代码。

入口在读取已验签清单后，会比较本地入口版本与 `manifest.entry.version`。远端入口较新时只提示手动替换，不会自动下载、覆盖或重启 `ToolHub.js`。

### 2. 首次启动

入口会自动：

1. 创建 `shortx.getShortXDir()/ToolHub/code/`。
2. 下载或读取 `manifest.json`。
3. 完整模式下校验 `manifest.sig`。
4. 检查 keyId、清单版本和防回滚状态。
5. 下载或复用本地子模块。
6. 校验模块 SHA-256 与文件大小。
7. 加载模块。
8. 创建或打开 `toolhub.db`。
9. 将旧配置迁移到结构化表。
10. 删除旧 JSON 文档表和配置文件。
11. 启动悬浮球。

---

## 入口配置

> 更新源固定为 GitHub，不再提供来源切换配置。

```javascript
var UPDATE_SECURITY_MODE = 2;   // 0: 普通, 1: manifest校验, 2: 完整验签
```

| 模式 | 说明 |
|---|---|
| `0` | 普通更新，不启用严格签名校验 |
| `1` | 按 manifest 校验模块 SHA-256 和文件大小 |
| `2` | 校验签名、keyId、版本、防回滚、SHA-256 和文件大小 |

只有明确设置为 `0` 才进入普通更新模式。空值、非法字符、复合字符串和越界值等无效配置会强制回退到 `2`，避免配置错误静默关闭验签。

---

## 实机目录

```text
shortx.getShortXDir()/
└── ToolHub/
    ├── code/
    │   ├── th_01_base.js
    │   ├── th_02_core.js
    │   ├── th_03_icon.js
    │   ├── th_04_theme.js
    │   ├── th_05_persistence.js
    │   ├── th_06_icon_parser.js
    │   ├── th_08_content.js
    │   ├── th_09_animation.js
    │   ├── th_10_shell.js
    │   ├── th_11_action.js
    │   ├── th_12_rebuild.js
    │   ├── th_13_panel_ui.js
    │   ├── th_14_panels.js
    │   ├── th_14_button_shortcut.js
    │   ├── th_14_button_icon_editor.js
    │   ├── th_14_button_editor.js
    │   ├── th_14_color_picker.js
    │   ├── th_14_icon_picker.js
    │   ├── th_14_schema_editor.js
    │   ├── th_15_extra.js
    │   ├── th_15_main_panel.js
    │   ├── th_16_entry.js
    │   ├── th_17_pointer.js
    │   ├── th_18_pointer_ocr.js
    │   ├── th_19_position_state.js
    │   ├── th_20_pickword.js
    │   └── th_21_result_preview.js
    ├── logs/
    │   ├── init.log
    │   └── ShortX_ToolHub_yyyyMMdd.log
    └── toolhub.db
```

配置目录中不再保留：

```text
settings.json
buttons.json
schema.json
.sqlite_pending_*.json
```

SQLite 可能生成 `toolhub.db-journal`。这是事务辅助文件，可以由 SQLite 自动创建和清理。

---

## 完全结构化 SQLite

### 数据库位置

```text
shortx.getShortXDir()/ToolHub/toolhub.db
```

当前存储格式：

```text
storageFormat = structured
storageFormatVersion = 2
```

### 数据表

```text
toolhub.db
├── toolhub_meta
├── toolhub_settings
├── toolhub_buttons
├── toolhub_button_values
└── toolhub_schema_values
```

### 设置

`toolhub_settings` 每行保存一个设置：

```text
setting_key
value_type
value_integer
value_real
value_text
updated_at
```

示例：

```text
BALL_SIZE_DP          integer  45
PANEL_BG_ALPHA        real     0.85
ENABLE_ANIMATIONS     boolean  1
BALL_POSITION_SIDE    text     right
THEME_DAY_BG_HEX      null
```

### 按钮

`toolhub_buttons` 保存：

```text
按钮 ID
排序
标题
动作类型
启用状态
更新时间
```

`toolhub_button_values` 保存其他参数和嵌套结构，例如：

```text
图标
包名
用户 ID
Shell 命令
广播 Action
快捷方式 Intent / 执行模式 / 旧版兼容代码
数组和对象参数
```

### Schema

`toolhub_schema_values` 使用父子节点关系保存：

```text
section
key
name
type
min / max / step
options
children
items
```

每个值都保存为 `boolean`、`integer`、`real`、`text`、`null`、`object` 或 `array`，不存在 JSON payload 列。

---

## 旧配置迁移

首次升级到结构化版本时，迁移来源优先级为：

```text
旧待恢复 JSON
        ↓
旧 toolhub_documents 表
        ↓
旧 settings.json / buttons.json / schema.json
        ↓
内置默认值
```

旧数据只会读取一次。

迁移成功后：

1. 设置写入 `toolhub_settings`。
2. 按钮写入 `toolhub_buttons` 和 `toolhub_button_values`。
3. Schema 写入 `toolhub_schema_values`。
4. 写入 `storage_format_version=2`。
5. 删除 `toolhub_documents`。
6. 执行 `VACUUM` 清理旧文档数据页。
7. 删除旧 JSON 配置、备份和待恢复文件。

迁移失败时不会删除旧数据，也不会用默认值覆盖数据库。

---

## 保存与故障保护

保存使用 SQLite 事务：

```text
beginTransaction
        ↓
替换对应配置域的结构化行
        ↓
setTransactionSuccessful
        ↓
endTransaction
```

只有事务最终提交成功后才报告保存成功。

数据库写入失败时：

- 不生成 JSON 回退文件。
- 保留内存待写任务。
- 关闭前刷新返回失败。
- 已提交数据保持不变。
- 日志记录具体数据库错误。

数据库读取失败时：

```text
activeBackend = sqlite-read-only
```

当前会话使用默认设置或救援按钮临时启动，并禁止写回，避免覆盖原数据库。

---

## 配置调用链

现有接口保持不变：

```javascript
ConfigManager.loadSettings();
ConfigManager.saveSettings(config);
ConfigManager.loadButtons();
ConfigManager.saveButtons(buttons);
ConfigManager.loadSchema();
ConfigManager.saveSchema(schema);
```

调用链：

```text
ConfigManager
        │
        ▼
配置校验和兼容升级
        │
        ▼
结构化 SQLite 适配器
        │
        ├── settings → typed rows
        ├── buttons  → main rows + value tree
        └── schema   → value tree
```

适配过程中可能在内存中生成临时 JSON 字符串，以兼容现有 `ConfigManager` 接口；这些字符串不会写入数据库或文件。

---

## 查看存储状态

```javascript
var info = ConfigManager.getStorageInfo();
```

主要字段：

```text
engine
storageFormat
storageFormatVersion
activeBackend
databasePath
databaseExists
databaseHealthy
pendingWrites
blockedWrites
rowCounts
migrationSource
legacyConfigFileCount
legacyFilesRemoved
jsonConfigEnabled
lastDbError
lastError
```

正常日志：

```text
storage engine=sqlite format=structured backend=sqlite-structured path=... exists=true healthy=true pending=0 error=
```

详细说明见 [`SQLITE_STORAGE.md`](SQLITE_STORAGE.md)。

---

## 悬浮球与指针

```text
单击悬浮球       打开 / 关闭主面板
长按悬浮球       打开设置页
按住并拖动       唤出屏幕指针
拖到文字后松手   满足悬停时间后取字复制
继续悬停并拖框   进入框选 OCR
拖出有效区域松手 截图 OCR 并复制
小框误触         回退复制原文字
```

---

## 按钮动作

| type | 行为 |
|---|---|
| `open_settings` | 打开设置页 |
| `open_viewer` | 打开日志查看器 |
| `toast` | 显示 Toast |
| `app` | 启动 App，可指定用户 |
| `shell` | 通过 Shell 广播桥执行命令 |
| `broadcast` | 发送广播 |
| `shortcut` | 默认启动 `intentUri`；仅显式 `legacy_js` 执行历史兼容代码 |
| `content` | 按读写白名单访问 ContentProvider |
| `pointer` | 启动取字和框选 OCR |

---

## 模块职责

| 文件 | 职责 |
|---|---|
| `th_01_base.js` | 路径、文件 IO、配置校验、默认设置和 Schema |
| `th_02_core.js` | 完全结构化 SQLite、旧配置迁移、核心状态 |
| `th_03_icon.js` | 图标和 Bitmap 处理 |
| `th_04_theme.js` | 屏幕、主题、颜色、Toast 和振动 |
| `th_05_persistence.js` | 位置与设置保存、编辑缓存和预览刷新 |
| `th_06_icon_parser.js` | ShortX 图标解析 |
| `th_08_content.js` | ContentProvider 受控读取与按写入白名单执行修改 |
| `th_09_animation.js` | 动画、吸边、面板和返回适配 |
| `th_10_shell.js` | Shell 广播桥 |
| `th_11_action.js` | 按钮动作分发 |
| `th_12_rebuild.js` | 配置变化后的重建 |
| `th_13_panel_ui.js` | 设置项基础 UI |
| `th_14_*` | 设置页、按钮编辑、图标、颜色和 Schema 编辑器 |
| `th_15_extra.js` | 主面板、ToolApp Shell、页面栈和响应式布局 |
| `th_16_entry.js` | 启动、广播、关闭和资源释放 |
| `th_17_pointer.js` | 指针、取字、框选和状态颜色 |
| `th_18_pointer_ocr.js` | 截图 OCR 与覆盖层处理 |
| `th_19_position_state.js` | 悬浮球固定位置、指针布局与尺寸重建事务回滚 |
| `th_20_pickword.js` | 拾字文字选择、复制、翻译、钉屏与放大镜 |
| `th_21_result_preview.js` | 取字和 OCR 顶部两行全自绘结果预览 |

---

## 日志

```text
启动日志: ToolHub/logs/init.log
运行日志: ToolHub/logs/ShortX_ToolHub_yyyyMMdd.log
```

普通运行日志仍使用文本文件，便于数据库本身打不开时排查错误。

---

## 维护与发布

修改 `code/*.js` 或 `ToolHub.js` 时：

1. 保持 Rhino ES5 语法。
2. 提升修改模块顶部 `@version`。
3. 使用 `fix/*` 分支。
4. 创建中文标题和描述的非草稿 PR。
5. 由 `sign-toolhub` 自动更新 `manifest.json`、`manifest.sig` 和 `ToolHub.js.sha256`。
6. 等待 `verify` 与 `sign-toolhub` 通过。
7. 合并到 `main` 并确认手机端能正常检测更新。

关键校验：

```bash
python3 .github/scripts/es5_scan.py
python3 scripts/verify_sqlite_persistence.py
python3 scripts/verify_manifest.py
python3 .github/scripts/verify_manifest_signature.py
```

---

## 更新记录

### 2026-07-13

**完善 ToolHub 入口文件更新提醒**

- 签名清单新增 `entry` 元数据，记录 `ToolHub.js` 的入口版本、SHA-256 和文件大小。
- 启动及手动检查更新时比较本地与远端入口版本。
- 入口版本落后时提示手动替换 ShortX 任务中的 `ToolHub.js`。
- 同一远端入口版本只主动提醒一次。
- 入口文件不加入子模块更新列表，不参与自动下载、事务替换或自动重启。
- 修改 `ToolHub.js` 但未提升入口版本时，CI 校验失败。

### 2026-07-11

**配置改为完全结构化 SQLite**

- 设置按键和真实类型逐行保存。
- 按钮拆分为主表和递归参数节点。
- Schema 拆分为递归关系节点。
- 移除 JSON payload 文档存储。
- 迁移成功后删除旧文档表和外部 JSON 配置。
- 执行 `VACUUM` 清理旧文档数据页。
- 数据库异常时只读救援，不再回退 JSON。

---

## 兼容约束

- 运行环境：ShortX JS / Rhino ES5。
- 统一使用 `var` 和普通函数。
- 禁止 `let/const`、箭头函数、模板字符串、`class`、可选链、空值合并和展开语法。
- Android UI 优先使用 WindowManager、FrameLayout、Canvas 和原生 View。
- 不依赖 WebView。
- 入口顶层不要使用 `return`。
- 不提交签名私钥。
- root 和 Shell 能力必须由配置或用户明确操作触发。
