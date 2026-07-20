# ToolHub 完全结构化 SQLite 存储

## 存储位置

```text
shortx.getShortXDir()/ToolHub/toolhub.db
```

配置只保存在这个 SQLite 数据库中。运行时不再创建或更新：

```text
settings.json
buttons.json
schema.json
.sqlite_pending_settings.json
.sqlite_pending_buttons.json
.sqlite_pending_schema.json
```

SQLite 自己可能短暂生成 `toolhub.db-journal`，这是数据库事务文件，不是 JSON 配置。

## 存储格式

当前存储格式版本：

```text
storage_format_version = 2
```

数据库不再使用一条记录保存一整段 JSON。设置、按钮和 Schema 被拆成原子字段和关系行。

### `toolhub_settings`

每个设置占一行：

```sql
CREATE TABLE toolhub_settings (
  setting_key TEXT PRIMARY KEY NOT NULL,
  value_type TEXT NOT NULL,
  value_integer INTEGER,
  value_real REAL,
  value_text TEXT,
  updated_at INTEGER NOT NULL
);
```

支持的类型：

| `value_type` | 保存位置 | 示例 |
|---|---|---|
| `boolean` | `value_integer` | `0` / `1` |
| `integer` | `value_integer` | `45` |
| `real` | `value_real` | `0.85` |
| `text` | `value_text` | `right` |
| `null` | 不写值字段 | 未设置颜色 |

例如：

```text
BALL_SIZE_DP            integer  45
BALL_POSITION_SIDE      text     right
PANEL_BG_ALPHA          real     0.85
ENABLE_ANIMATIONS       boolean  1
THEME_DAY_BG_HEX        null
```

### `toolhub_buttons`

每个按钮的固定字段占一行：

```sql
CREATE TABLE toolhub_buttons (
  button_row_id INTEGER PRIMARY KEY AUTOINCREMENT,
  button_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  action_type TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

固定字段包括：

```text
id
title
type
enabled
sort_order
```

### `toolhub_button_values`

按钮的其他参数按树形节点存储：

```sql
CREATE TABLE toolhub_button_values (
  node_id INTEGER PRIMARY KEY AUTOINCREMENT,
  button_row_id INTEGER NOT NULL,
  parent_id INTEGER,
  field_name TEXT,
  array_index INTEGER NOT NULL DEFAULT -1,
  value_type TEXT NOT NULL,
  value_integer INTEGER,
  value_real REAL,
  value_text TEXT
);
```

可保存：

```text
iconResName
packageName
userId
cmd
cmd_b64
action
intentUri
shortcutExecMode
shortcutJsCode（仅历史 legacy_js 按钮）
嵌套对象
数组参数
```

对象通过 `parent_id + field_name` 表示，数组通过 `parent_id + array_index` 表示，因此不会把复杂按钮参数重新序列化为 JSON 文本。

### `toolhub_schema_values`

设置页 Schema 使用相同的树形关系结构：

```sql
CREATE TABLE toolhub_schema_values (
  node_id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER,
  field_name TEXT,
  array_index INTEGER NOT NULL DEFAULT -1,
  value_type TEXT NOT NULL,
  value_integer INTEGER,
  value_real REAL,
  value_text TEXT
);
```

它可以结构化保存：

```text
section
key
name
type
min
max
step
options
children
items
```

Schema 根节点是数组，内部对象、选项数组和嵌套分组全部按父子节点恢复。

### `toolhub_button_icons`

按钮本地图片和快捷方式图标按内容 SHA-256 去重后保存为 SQLite BLOB。按钮主表通过 `icon_key` 引用图标记录；ShortX 内置图标和 App 图标不重复写入 BLOB。详细边界见 `BUTTON_ICON_STORAGE.md`。

### `toolhub_pickword_images`

保存 ToolHub 内部拾字截图的路径、来源、尺寸、文件大小、创建时间、访问时间、公共保存副本和逻辑删除状态。内部截图文件仍位于 `ToolHub/screenshots/`，数据库记录不保存图片二进制。

### `toolhub_pickword_image_exports`

记录保存副本和分享临时副本的精确路径、content URI、创建时间、过期时间和删除状态。自动清理只处理 ToolHub 管理的内部截图和分享临时副本，不删除用户选择的其他文件。

### `toolhub_meta`

保存数据库格式和迁移状态：

```sql
CREATE TABLE toolhub_meta (
  meta_key TEXT PRIMARY KEY NOT NULL,
  meta_value TEXT NOT NULL
);
```

主要记录：

```text
storage_format_version
schema_version
settings_initialized
buttons_initialized
schema_initialized
migration_source
migration_completed_at
legacy_payload_purged
settings_updated_at
buttons_updated_at
schema_updated_at
```

## 与现有 ConfigManager 的兼容

上层仍使用：

```javascript
ConfigManager.loadSettings();
ConfigManager.saveSettings(config);
ConfigManager.loadButtons();
ConfigManager.saveButtons(buttons);
ConfigManager.loadSchema();
ConfigManager.saveSchema(schema);
```

现有 `ConfigManager` 仍以 JavaScript 对象工作。适配器只在内存中将对象转换成临时 JSON 字符串，供原接口完成校验和兼容升级；临时字符串不会写入数据库或配置文件。

实际落盘过程：

```text
JavaScript 配置对象
        │
        ▼
现有 ConfigManager 校验
        │
        ▼
结构化 SQLite 适配器
        │
        ├─ settings → 每个键一行
        ├─ buttons  → 按钮主表 + 参数树
        └─ schema   → Schema 节点树
```

## 从旧格式迁移

升级后的首次启动会按以下优先级读取旧数据：

```text
旧 .sqlite_pending_*.json
        ↓
旧 toolhub_documents 表
        ↓
旧 settings.json / buttons.json / schema.json
        ↓
内置默认值
```

这些数据只用于一次性迁移。

迁移事务中会：

1. 创建结构化表。
2. 将设置写入 `toolhub_settings`。
3. 将按钮写入 `toolhub_buttons` 和 `toolhub_button_values`。
4. 将 Schema 写入 `toolhub_schema_values`。
5. 写入 `storage_format_version=2`。
6. 删除旧 `toolhub_documents` 表。
7. 提交事务。
8. 执行 `VACUUM`，清理旧 JSON 文档占用的数据页。
9. 删除外部 JSON 配置、备份和旧待恢复文件。

只有整个迁移事务提交成功后，才会删除旧表和旧文件。迁移失败时旧数据会保留，数据库进入只读救援状态。

## 写入与事务

每次保存一个配置域时都会使用事务：

```text
beginTransaction
        ↓
删除该配置域的旧结构化行
        ↓
写入全部新行
        ↓
更新 updated_at
        ↓
setTransactionSuccessful
        ↓
endTransaction
```

只有 `endTransaction()` 正常结束后才报告成功。

SQLite 写入失败时：

- 不创建 JSON 回退文件。
- 不覆盖数据库中的旧数据。
- 保留内存中的待写任务。
- `flushDebouncedWrites()` 返回失败。
- 日志记录数据库错误。

如果进程被强制终止，尚未成功提交的内存修改无法恢复；已提交的数据由 SQLite 事务和 journal 保证一致性。

## 读取失败保护

数据库打不开、查询失败或结构化数据损坏时：

```text
activeBackend = sqlite-read-only
blockedWrites.<document> = true
```

对应配置域会使用内置默认值或救援按钮临时启动，但当前会话禁止写回，防止默认配置覆盖原数据库。

## 查看状态

```javascript
var info = ConfigManager.getStorageInfo();
```

主要字段：

| 字段 | 含义 |
|---|---|
| `engine` | `sqlite` |
| `storageFormat` | `structured` |
| `storageFormatVersion` | 当前为 `2` |
| `activeBackend` | `sqlite-structured` 或 `sqlite-read-only` |
| `databasePath` | 数据库路径 |
| `databaseExists` | 数据库文件是否存在 |
| `databaseHealthy` | 最近数据库操作是否正常 |
| `pendingWrites` | 内存待写任务数 |
| `blockedWrites` | 设置、按钮、Schema 的写保护状态 |
| `rowCounts` | 各结构化表行数 |
| `migrationSource` | 三类数据的迁移来源 |
| `legacyConfigFileCount` | 残留旧 JSON 配置文件数 |
| `legacyFilesRemoved` | 旧配置文件是否已清理 |
| `jsonConfigEnabled` | 固定为 `false` |
| `lastDbError` | 最近数据库错误 |
| `lastError` | 最近综合错误 |

正常日志示例：

```text
storage engine=sqlite format=structured backend=sqlite-structured path=... exists=true healthy=true pending=0 error=
```

## 手动重新执行迁移检查

```javascript
ConfigManager.migrateLegacyStorageToStructuredSqlite();
```

兼容旧调用名：

```javascript
ConfigManager.migrateLegacyJsonToSqlite();
```

存储格式已经是版本 2 时，只检查数据库和清理残留旧配置文件，不会覆盖现有结构化数据。

## 备份与回滚

### 备份

停止 ToolHub 后复制：

```text
ToolHub/toolhub.db
```

不要在 ToolHub 正在写入时直接复制数据库。

### 回滚到结构化版本内的旧代码

保留 `toolhub.db` 即可。旧代码必须支持 `storage_format_version=2`。

### 回滚到只支持 JSON 文档表的版本

不建议直接回滚。结构化迁移完成后：

- `toolhub_documents` 已删除。
- JSON 配置文件已删除。
- 旧版本无法读取结构化表。

需要先使用新版提供的导出功能生成兼容数据，或者恢复迁移前的完整目录备份。
## 历史主题数据清理

旧主题模式移除后，结构化 SQLite 存储会执行一次带事务的精确清理：

- 从 `toolhub_settings` 删除已废弃的主题键；
- 从 Schema 树删除对应设置项，保留其他自定义 Schema 内容；
- 通过 `deprecated_theme_cleanup_version` 记录迁移版本，避免重复执行；
- 清理失败时事务回滚，按钮和其他设置不受影响。

该清理不提升 `storage_format_version`，不会触发结构化数据库重建。

## 拾字截图第二阶段

- 原图页支持保存到公共目录、通过 content URI 系统分享，以及永久删除 ToolHub 内部截图。
- 默认公共目录为 `/storage/emulated/0/Pictures/ToolHub`，可在“设置 → 拾字”中修改并测试可写性。
- 内部截图默认保留 7 天；分享临时副本保留 24 小时。公共保存副本不参与自动清理。
- 图片状态记录在 `toolhub.db` 的独立关系表中；删除截图后保留拾字文字与当前选择状态。


## 截图管理器读取边界

截图管理器只读取 `toolhub_pickword_images` 与 `toolhub_pickword_image_exports`。内部标签会合并数据库记录和 `ToolHub/screenshots/` 实际文件；已保存标签只使用数据库中由 ToolHub 写入的公共副本记录。删除公共副本时，以数据库中保存的精确 URI/路径为准，并限制在 MediaStore 或主存储范围内。
