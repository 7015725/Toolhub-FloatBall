# 按钮图标 SQLite BLOB 存储

## 当前方案

按钮图标与按钮配置统一保存在：

```text
shortx.getShortXDir()/ToolHub/toolhub.db
```

本地 PNG、JPG 和 WebP 图片不再作为按钮运行时依赖。保存按钮布置时，图片会被读取、校验、计算 SHA-256，然后写入 SQLite BLOB。

## 数据表

```sql
CREATE TABLE toolhub_button_icons (
  icon_key TEXT PRIMARY KEY NOT NULL,
  mime_type TEXT NOT NULL,
  image_data BLOB NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  original_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

`toolhub_buttons` 增加以下结构化字段：

```text
icon_source_type
icon_key
icon_res_name
icon_tint
```

## 图标来源

| 来源 | SQLite 保存内容 |
|---|---|
| 本地图片 | 图片 BLOB、MIME、尺寸、大小、SHA-256、原文件名 |
| ShortX 内置图标 | 图标资源名称和颜色，不复制图片 |
| App 图标 | 继续按包名实时读取，不保存重复 BLOB |
| 快捷方式图标 | 选择器生成的图片在保存布置时导入 BLOB |

## 导入限制

```text
最大文件大小：1 MiB
最大宽度：1024 px
最大高度：1024 px
允许类型：Android BitmapFactory 可识别的 image/*
```

不满足限制、文件不存在或读取失败时，按钮保存事务失败，不会删除数据库中的旧按钮和旧图标。

## 去重

`icon_key` 使用图片内容的 SHA-256。

相同图片被多个按钮使用时：

```text
多个按钮引用同一个 icon_key
数据库只保存一份 image_data
```

复制按钮不会复制 BLOB。

删除或替换按钮后，保存事务会执行孤立图标清理：

```sql
DELETE FROM toolhub_button_icons
WHERE icon_key NOT IN (
  SELECT icon_key
  FROM toolhub_buttons
  WHERE icon_key IS NOT NULL AND icon_key <> ''
);
```

## 旧图标迁移

首次加载图标存储版本 1 时：

1. 读取结构化按钮中的旧 `iconPath`。
2. 校验图片大小、尺寸和 MIME。
3. 写入 `toolhub_button_icons`。
4. 在按钮行保存 `icon_key`。
5. 清除按钮参数树中的 `iconPath`、`iconResName` 和 `iconTint` 副本。
6. 写入 `button_icon_storage_version=1`。
7. 事务提交成功后，删除已导入的 `shortcut_icons/` 内部源文件。

用户手动选择的 ToolHub 目录之外的原图片不会自动删除。

## 运行时加载

数据库图标在内存对象中使用兼容 URI：

```text
sqlite-icon:<SHA-256>
```

该 URI 不对应真实文件。原有按钮图标解析链路调用 `loadBallIconDrawableFromFile()` 时，会识别此前缀并改为：

```text
SQLite 查询 BLOB
        ↓
校验大小和图片尺寸
        ↓
按目标尺寸计算 inSampleSize
        ↓
BitmapFactory.decodeByteArray
        ↓
BitmapDrawable
        ↓
LRU 缓存
```

不会把 BLOB重新写成临时 PNG。

## 状态检查

```javascript
var info = ConfigManager.getStorageInfo();
```

新增字段：

```text
buttonIconStorageVersion
buttonIconCount
buttonIconBytes
shortcutIconDirectoryExists
buttonIconStorageError
```

直接读取某个图标记录：

```javascript
var icon = ConfigManager.getButtonIconBlob(iconKey);
```

主要字段：

```text
iconKey
mimeType
data
byteSize
width
height
sha256
originalName
updatedAt
```

`data` 是 Java `byte[]`，只用于内部解码，不应转成 Base64 后重复保存。

## 清理规则

自动清理范围仅包括：

```text
ToolHub/shortcut_icons/
```

而且只删除已经成功导入、并且按钮事务已经提交的源文件。不会删除用户选择的外部 PNG、JPG 或 WebP。

`ball.png` 是悬浮球图片，不属于按钮图标表，不会被本功能处理。
