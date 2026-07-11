# ShortX ToolHub

ShortX ToolHub 是面向 **ShortX / Rhino ES5 JavaScript** 的模块化 Android 悬浮工具框架。

`ToolHub.js` 负责安全更新、模块校验和启动；悬浮球、工具面板、设置页、按钮管理、主题、SQLite 持久化、图标与颜色选择器、屏幕取字和框选 OCR 等能力拆分在 `code/th_*.js` 中维护。

## 仓库

```text
GitHub: https://github.com/7015725/Toolhub-FloatBall
Gitea:  https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub
```

相关文档：

```text
STRUCTURE.md
ARCHITECTURE.md
SQLITE_STORAGE.md
```

> 手机端当前默认使用 GitHub 更新源。是否已同步 Gitea，需要在每次发布结果中单独确认。

---

## 核心能力

- 模块化加载，入口负责下载、校验和按顺序加载子模块。
- 默认启用 manifest RSA 验签、keyId、防回滚、SHA-256 和文件大小校验。
- 网络或远端清单异常时，可以继续使用已验证的本地模块。
- 设置、按钮和 Schema 使用 SQLite 主存储。
- SQLite 正常保存后同步原子 JSON 镜像。
- SQLite 写失败时保存待恢复日志，数据库恢复后自动回写。
- 数据库读取异常时进入只读回退，禁止旧 JSON 覆盖较新数据库记录。
- ToolApp 设置页支持手机、横屏和平板宽屏布局。
- 支持按钮搜索、筛选、启停、排序和编辑。
- 支持悬浮球拖动唤出指针、悬停取字、小框回退和框选 OCR。
- 支持 Android 返回键、预测性返回和 ToolApp 横向滑动返回。
- 启动、更新、存储和运行异常写入 `ToolHub/logs/`。

---

## 快速部署

### 1. 安装入口

复制仓库中的 `ToolHub.js`，粘贴到 ShortX 的 JavaScript 任务中运行。

> `ToolHub.js` 是信任根，内置 RSA 公钥和最低可信清单版本。入口自身发生变化时，需要手动替换 ShortX 任务中的代码。

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
9. 迁移已有 JSON，或刷新 JSON 镜像。
10. 启动悬浮球。

---

## 入口配置

```javascript
var UPDATE_SOURCE = 1;          // 0: Gitea, 1: GitHub
var UPDATE_SECURITY_MODE = 2;   // 0: 普通, 1: manifest校验, 2: 完整验签
```

| 模式 | 说明 |
|---|---|
| `0` | 普通更新，不启用严格签名校验 |
| `1` | 按 manifest 校验模块 SHA-256 和文件大小 |
| `2` | 校验签名、keyId、版本、防回滚、SHA-256 和文件大小 |

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
    │   ├── th_16_entry.js
    │   ├── th_17_pointer.js
    │   └── th_18_pointer_ocr.js
    ├── logs/
    │   ├── init.log
    │   └── ShortX_ToolHub_yyyyMMdd.log
    ├── toolhub.db
    ├── settings.json
    ├── buttons.json
    ├── schema.json
    ├── .sqlite_pending_settings.json   # 仅异常恢复期间出现
    ├── .sqlite_pending_buttons.json    # 仅异常恢复期间出现
    └── .sqlite_pending_schema.json     # 仅异常恢复期间出现
```

`settings.json`、`buttons.json` 和 `schema.json` 现在是 SQLite 的原子镜像备份，不再只是迁移前遗留文件。

---

## SQLite 持久化

### 主存储

```text
shortx.getShortXDir()/ToolHub/toolhub.db
```

| 数据键 | JSON 镜像 | 内容 |
|---|---|---|
| `settings` | `settings.json` | 悬浮球、指针、主题、位置等设置 |
| `buttons` | `buttons.json` | 主面板按钮和动作参数 |
| `schema` | `schema.json` | 设置页 Schema |

### 三态读取

数据库读取明确区分：

| 状态 | 处理 |
|---|---|
| `found` | 使用 SQLite，并刷新 JSON 镜像 |
| `missing` | 允许从有效旧 JSON 首次迁移 |
| `error` | 只读 JSON 兜底，禁止反向写回 SQLite |

这样可以避免数据库临时打不开时，用迁移前的旧 JSON 覆盖较新的设置。

### 正常保存

```text
SQLite 事务提交完成
        │
        ▼
原子更新 JSON 镜像
```

只有 `endTransaction()` 正常完成后，保存才返回成功。

### 写失败恢复

SQLite 写失败时，先原子保存完整待恢复内容：

```text
.sqlite_pending_settings.json
.sqlite_pending_buttons.json
.sqlite_pending_schema.json
```

下次启动优先恢复这些内容：

- 数据库恢复：写回 SQLite，更新 JSON 镜像并清理待恢复文件。
- 数据库仍不可用：继续使用待恢复内容。

### 读取错误写保护

没有待恢复文件且数据库读取失败时，对应文档进入：

```text
activeBackend = read-only-fallback
blockedWrites.<document> = true
```

本会话不会保存默认值、Schema 重置或旧 JSON。重新启动并成功读取数据库后才恢复写入。

### 查看状态

```javascript
var info = ConfigManager.getStorageInfo();
```

主要字段：

```text
activeBackend
 databaseExists
 databaseHealthy
 pendingWrites
 pendingRecovery
 blockedWrites
 legacyJsonAvailable
 legacyMirrorHealthy
 lastDbError
 lastMirrorError
 lastError
```

详细设计和回滚方法见 [`SQLITE_STORAGE.md`](SQLITE_STORAGE.md)。

---

## 配置调用链

```text
ConfigManager.loadSettings()
        │
        ▼
SQLite / 待恢复日志 / JSON只读回退
        │
        ▼
ConfigValidator.sanitizeConfig()
        │
        ▼
FloatBallAppWM.config
        │
        └── ConfigManager.saveSettings()
                │
                ▼
        SQLite事务 + JSON原子镜像
```

上层接口保持不变：

```javascript
ConfigManager.loadSettings();
ConfigManager.saveSettings(config);
ConfigManager.loadButtons();
ConfigManager.saveButtons(buttons);
ConfigManager.loadSchema();
ConfigManager.saveSchema(schema);
```

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

指针设置按以下子块组织：

```text
基础 / 悬停 / 取字保护 / 框选 OCR / 指针颜色 / OCR颜色
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
| `shortcut` | 执行 ShortX 快捷方式代码 |
| `content` | 查询 ContentProvider |
| `pointer` | 启动取字和框选 OCR |

---

## 模块职责

| 文件 | 职责 |
|---|---|
| `th_01_base.js` | 路径、文件 IO、配置校验、默认设置和 Schema |
| `th_02_core.js` | SQLite 三态读取、JSON 镜像、异常恢复、核心状态 |
| `th_03_icon.js` | 图标和 Bitmap 处理 |
| `th_04_theme.js` | 屏幕、主题、颜色、Toast 和振动 |
| `th_05_persistence.js` | 位置与设置保存、编辑缓存和预览刷新 |
| `th_06_icon_parser.js` | ShortX 图标解析 |
| `th_08_content.js` | ContentProvider 查询 |
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

---

## 日志

```text
启动日志: ToolHub/logs/init.log
运行日志: ToolHub/logs/ShortX_ToolHub_yyyyMMdd.log
```

SQLite 状态示例：

```text
storage engine=sqlite backend=sqlite path=... exists=true healthy=true pending=0 error=
```

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

只修改文档时使用 `docs/*` 分支，不需要生成客户端更新。

关键校验：

```bash
python3 .github/scripts/es5_scan.py
python3 scripts/verify_sqlite_persistence.py
python3 scripts/verify_manifest.py
python3 .github/scripts/verify_manifest_signature.py
```

---

## 更新记录

### 2026-07-11

**SQLite 异常路径加固**

- 将读取结果拆分为 `found / missing / error`。
- 仅在明确缺少记录时导入旧 JSON。
- 数据库读取错误时禁止反向覆盖。
- SQLite 保存后同步原子 JSON 镜像。
- 增加 `.sqlite_pending_*.json` 待恢复日志。
- 修复事务提交失败仍返回成功的问题。
- 写入和关闭前刷新失败时保留待写任务。
- 扩展存储状态与静态校验。

### 2026-07-11

**配置存储迁移到 SQLite**

- 在原 ToolHub 目录新增 `toolhub.db`。
- 迁移 `settings`、`buttons` 和 `schema`。
- 保持现有 `ConfigManager` 和设置 UI 接口不变。

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