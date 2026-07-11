# ToolHub SQLite 配置存储

## 存储位置

配置数据库固定放在原 ToolHub 工作目录中：

```text
shortx.getShortXDir()/ToolHub/toolhub.db
```

现有目录位置不变，`code/`、`logs/`、图标文件等路径不变。SQLite 在写入期间可能短暂生成 `toolhub.db-journal` 等同目录辅助文件。

## 存储范围

SQLite 负责保存以下原有 JSON 文档：

- `settings.json`：悬浮球、指针、主题、面板位置等设置
- `buttons.json`：主面板按钮与动作参数
- `schema.json`：设置页 Schema

日志仍保存在 `ToolHub/logs/`，不写入数据库。

数据库包含两张表：

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

`payload` 继续使用原有 JSON 数据结构，因此设置校验、按钮升级和 Schema 兼容逻辑无需改写。

## 首次迁移

SQLite 适配器在 `th_02_core.js` 加载时运行：

1. 创建或打开 `ToolHub/toolhub.db`。
2. 检查 `settings`、`buttons`、`schema` 三条记录。
3. 数据库中没有记录时，读取同目录现有 JSON。
4. JSON 可正常解析时，以 `legacy-json` 来源写入 SQLite。
5. 后续读写由 SQLite 接管。

原 JSON 文件不会删除。SQLite 正常可用时不再同步更新这些旧文件；数据库无法打开或写入失败时，原 JSON 会重新作为回退存储接管本次读写。

## 兼容与回退

上层仍调用原来的：

```javascript
ConfigManager.loadSettings();
ConfigManager.saveSettings(config);
ConfigManager.loadButtons();
ConfigManager.saveButtons(buttons);
ConfigManager.loadSchema();
ConfigManager.saveSchema(schema);
```

SQLite 层透明接管 `FileIO.readText`、`writeText`、`writeTextAtomic`、`writeTextDebounced` 和 `flushDebouncedWrites` 对三个配置路径的操作。数据库不可用或写入失败时，会回退到原 JSON 文件，避免设置完全无法读取或保存。

可通过以下方法查看运行状态：

```javascript
var info = ConfigManager.getStorageInfo();
```

返回字段包括数据库路径、是否存在、待写任务数、迁移记录和最近错误。

可手动再次执行旧配置导入：

```javascript
ConfigManager.migrateLegacyJsonToSqlite();
```

## 回滚

需要临时回到旧 JSON 存储时：

1. 停止 ToolHub。
2. 回滚包含 SQLite 适配器的代码版本。
3. 删除或移走 `ToolHub/toolhub.db`。
4. 重新启动 ToolHub。

回滚后会读取保留的 `settings.json`、`buttons.json` 和 `schema.json`。若 SQLite 一直正常可用，数据库启用期间的新修改不会自动同步回这些旧文件。