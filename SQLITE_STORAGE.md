# ToolHub SQLite 配置存储

## 存储位置

```text
shortx.getShortXDir()/ToolHub/toolhub.db
```

现有 `code/`、`logs/` 和图标目录不变。SQLite 写入时可能短暂生成 `toolhub.db-journal`。

## 存储内容

SQLite 保存三个 JSON 文档结构：

- `settings`：悬浮球、指针、主题和位置设置
- `buttons`：主面板按钮与动作参数
- `schema`：设置页 Schema

数据库表：

```sql
CREATE TABLE toolhub_documents (
  doc_key TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  source TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE toolhub_meta (
  meta_key TEXT PRIMARY KEY NOT NULL,
  meta_value TEXT NOT NULL
);
```

## SQLite 与 JSON 镜像

SQLite 是主存储。以下文件作为原子镜像备份：

```text
settings.json
buttons.json
schema.json
```

SQLite 保存成功后会同步更新对应 JSON。升级后首次读取到已有数据库记录时，也会刷新 JSON 镜像。

## 三态读取

数据库读取区分三种结果：

| 状态 | 含义 | 处理 |
|---|---|---|
| `found` | 存在有效记录 | 读取 SQLite，刷新 JSON 镜像 |
| `missing` | 数据库正常但记录不存在 | 允许导入旧 JSON |
| `error` | 打开、查询或内容校验失败 | 只读 JSON 兜底，禁止反向覆盖 |

只有 `missing` 状态可以导入旧 JSON。一次临时数据库读取错误不会再把较新的 SQLite 配置覆盖成旧 JSON。

## 首次迁移

1. 创建或打开 `toolhub.db`。
2. 检查 `settings`、`buttons` 和 `schema`。
3. 明确为 `missing` 时读取旧 JSON。
4. 有效 JSON 以 `legacy-json` 来源写入 SQLite。
5. 已有 SQLite 记录时，以数据库为准更新 JSON 镜像。
6. 读取异常时停止迁移，不写回数据库。

## 事务提交

写入使用 SQLite 事务。只有 `endTransaction()` 正常完成后，写入才返回成功，避免最终提交失败却被上层误认为已保存。

## 待恢复文件

SQLite 写入失败时，会先原子保存完整待恢复内容：

```text
.sqlite_pending_settings.json
.sqlite_pending_buttons.json
.sqlite_pending_schema.json
```

随后再更新普通 JSON 镜像。下次启动时优先读取待恢复文件：

- SQLite 已恢复：写回数据库并清理待恢复文件。
- SQLite 仍不可用：继续使用待恢复内容。

这样可以防止数据库恢复后重新读到旧记录。

## 读取异常写保护

数据库返回 `error` 且没有待恢复文件时，对应文档进入本会话只读保护：

```text
activeBackend = read-only-fallback
blockedWrites.<document> = true
```

此时可读取有效 JSON，但默认设置、Schema 重置或旧 JSON 不会被写回数据库。应重新启动 ToolHub，待数据库读取恢复后再修改设置。

## 去抖与刷新

- 连续保存只落盘最后一次内容。
- 定时写入失败时保留待写任务。
- 关闭前刷新失败时返回失败，不删除任务。
- SQLite 或待恢复文件成功保存后，任务才视为已持久化。

## 兼容接口

```javascript
ConfigManager.loadSettings();
ConfigManager.saveSettings(config);
ConfigManager.loadButtons();
ConfigManager.saveButtons(buttons);
ConfigManager.loadSchema();
ConfigManager.saveSchema(schema);
```

SQLite 透明接管三个配置路径的 `FileIO.readText`、`writeText`、`writeTextAtomic`、`writeTextDebounced` 和 `flushDebouncedWrites`。

## 查看状态

```javascript
var info = ConfigManager.getStorageInfo();
```

主要字段：

- `activeBackend`
- `databaseExists`
- `databaseHealthy`
- `pendingWrites`
- `pendingRecovery`
- `blockedWrites`
- `legacyJsonAvailable`
- `legacyMirrorHealthy`
- `lastDbError`
- `lastMirrorError`
- `lastError`

日志示例：

```text
storage engine=sqlite backend=sqlite path=... exists=true healthy=true pending=0 error=
```

## 手动迁移

```javascript
ConfigManager.migrateLegacyJsonToSqlite();
```

数据库记录存在时以 SQLite 为准；记录缺失时导入旧 JSON；读取异常时停止迁移；存在待恢复文件时优先恢复。

## 回滚

1. 停止 ToolHub。
2. 确认没有 `.sqlite_pending_*.json`；如有，应先让新版完成恢复。
3. 备份整个 `ToolHub` 目录。
4. 回滚旧代码。
5. 删除或移走 `toolhub.db`。
6. 重新启动 ToolHub。

新版会同步 JSON 镜像，正常状态下旧版本可以读取最近保存的配置。