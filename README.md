# ShortX ToolHub

ShortX ToolHub 是一个面向 **ShortX / Rhino ES5 JavaScript** 的模块化 Android 悬浮工具框架。

入口文件 `ToolHub.js` 负责安全更新、模块校验和启动；悬浮球、工具面板、设置页、按钮管理、主题、SQLite 持久化、图标选择器、颜色选择器、屏幕指针、取字与框选 OCR 等能力拆分在 `code/th_*.js` 中维护。

## 仓库地址

主仓库：

```text
https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub
```

GitHub：

```text
https://github.com/7015725/Toolhub-FloatBall
```

相关文档：

```text
README.md
STRUCTURE.md
ARCHITECTURE.md
SQLITE_STORAGE.md
```

> 当前手机端默认更新源为 GitHub。修改后是否同步 Gitea，需要在发布结果中单独确认。

---

## 核心特性

- **模块化加载**：入口只负责拉取、校验、加载和启动，业务能力拆分在 `code/th_*.js`。
- **完整安全更新**：支持 manifest RSA 验签、keyId 校验、防回滚、模块 SHA-256 和文件大小校验。
- **本地可信回退**：网络或远端清单异常时，已验证的本地模块仍可继续使用。
- **SQLite 配置存储**：设置、按钮和 Schema 统一保存到原 ToolHub 目录中的 `toolhub.db`。
- **旧配置自动迁移**：首次运行新版时自动导入已有 `settings.json`、`buttons.json` 和 `schema.json`。
- **JSON 异常回退**：SQLite 无法打开或写入失败时，回退到原 JSON 文件读写。
- **App 化设置页**：设置主页、分组页、按钮管理、按钮编辑和设置结构编辑统一运行在 ToolApp Shell 中。
- **响应式布局**：支持手机竖屏、横屏和平板宽屏；宽屏可使用 master-detail 双栏结构。
- **按钮管理**：支持搜索、筛选、启停状态、更多菜单和排序模式。
- **屏幕指针**：支持拖动唤出指针、悬停取字、取字就绪状态、框选截图 OCR 和小框回退取字。
- **悬浮球固定位置**：设置左侧或右侧边缘，并使用统一高度百分比恢复位置。
- **系统返回适配**：支持返回键、Android 13+ 返回回调、Android 14+ 预测性返回和 ToolApp 横滑返回。
- **运行日志**：启动、更新、验签、模块加载和运行异常写入 `ToolHub/logs/`。

---

## 快速部署

### 1. 安装入口文件

复制仓库中的 `ToolHub.js`，粘贴到 ShortX 的 JS 任务中运行。

> `ToolHub.js` 是信任根，内置 RSA 公钥和最低可信清单版本。入口自身不能通过远端模块安全自更新；入口发生变化时，需要手动替换 ShortX 任务中的代码。

### 2. 首次启动

入口会自动完成：

1. 创建 `shortx.getShortXDir()/ToolHub/code/`。
2. 下载或读取 `manifest.json`。
3. 完整验签模式下下载并校验 `manifest.sig`。
4. 校验清单版本、keyId 和防回滚状态。
5. 下载或复用本地子模块。
6. 校验模块 `size` 与 `sha256`。
7. 校验通过后覆盖本地模块。
8. 按顺序 `eval` 加载模块。
9. 自动迁移旧 JSON 配置到 SQLite。
10. 创建 `FloatBallAppWM` 并启动悬浮球。

---

## 入口配置

`ToolHub.js` 顶部可配置：

```javascript
var UPDATE_SOURCE = 1;          // 0: Gitea, 1: GitHub
var UPDATE_SECURITY_MODE = 2;   // 0: 普通更新, 1: manifest校验, 2: 完整验签
```

更新源：

```text
0: https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub/raw/branch/main/
1: https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/main/
```

安全模式：

| 模式 | 含义 |
|---|---|
| `0` | 普通更新，不启用签名和严格清单校验 |
| `1` | 按 manifest 校验模块 SHA-256 和文件大小 |
| `2` | 校验 manifest 签名、keyId、版本、防回滚、模块 SHA-256 和文件大小 |

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
    │   ├── th_18_pointer_ocr.js
    │   ├── .trusted_manifest_version
    │   └── .trusted_sha_<module>
    ├── logs/
    │   ├── init.log
    │   └── ShortX_ToolHub_yyyyMMdd.log
    ├── toolhub.db
    ├── settings.json    # 旧配置迁移源和 SQLite 异常回退
    ├── buttons.json     # 旧配置迁移源和 SQLite 异常回退
    └── schema.json      # 旧配置迁移源和 SQLite 异常回退
```

SQLite 写入过程中，系统可能在同目录短暂生成 `toolhub.db-journal` 等辅助文件。

---

## 配置与 SQLite 持久化

### 数据库位置

```text
shortx.getShortXDir()/ToolHub/toolhub.db
```

目录位置保持不变，`code/`、`logs/`、图标文件和其他资源路径不受影响。

### 存储内容

SQLite 接管三类原有配置文档：

| 数据键 | 原文件 | 内容 |
|---|---|---|
| `settings` | `settings.json` | 悬浮球、指针、主题、位置、面板等设置 |
| `buttons` | `buttons.json` | 主面板按钮和动作参数 |
| `schema` | `schema.json` | 设置页 Schema |

日志仍保存在 `ToolHub/logs/`，不会写入数据库。

### 数据表

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

`payload` 继续保存原有 JSON 数据结构，因此配置校验、按钮兼容升级和 Schema 刷新逻辑无需重写。

### 首次迁移流程

SQLite 适配器在 `th_02_core.js` 加载阶段安装：

```text
打开或创建 toolhub.db
        │
        ▼
检查 settings / buttons / schema
        │
        ├─ 数据库已有记录 → 直接读取 SQLite
        │
        └─ 数据库无记录
                │
                ▼
        读取同目录旧 JSON
                │
                ├─ JSON 有效 → 写入 SQLite，来源标记 legacy-json
                └─ JSON 不存在或损坏 → 使用默认配置或原有救援逻辑
```

旧 JSON 文件不会在迁移后删除。

### 兼容调用

上层仍使用原接口：

```javascript
ConfigManager.loadSettings();
ConfigManager.saveSettings(config);
ConfigManager.loadButtons();
ConfigManager.saveButtons(buttons);
ConfigManager.loadSchema();
ConfigManager.saveSchema(schema);
```

SQLite 适配器透明接管三个配置路径对应的：

```javascript
FileIO.readText();
FileIO.writeText();
FileIO.writeTextAtomic();
FileIO.writeTextDebounced();
FileIO.flushDebouncedWrites();
```

设置页、按钮编辑、位置保存和关闭前落盘流程不需要修改调用方式。

### 写入策略

- SQLite 写入使用事务。
- 连续保存请求使用去抖合并，只写入最后一次内容。
- `close()` 时执行 `FileIO.flushDebouncedWrites()`，立即提交剩余任务。
- SQLite 无法打开或写入失败时，回退原 JSON 文件写入。
- SQLite 正常可用时，不持续同步更新旧 JSON。

因此旧 JSON 主要承担：

1. 首次迁移源。
2. SQLite 异常时的回退存储。
3. 回滚旧代码版本时的基础恢复数据。

> SQLite 正常运行期间的新修改不会自动同步回旧 JSON。直接回滚到不支持 SQLite 的旧版本，可能只能读取迁移前或最近一次回退写入的 JSON 状态。

### 查看存储状态

```javascript
var info = ConfigManager.getStorageInfo();
```

主要返回：

```text
engine
数据库路径
数据库是否存在
Schema 版本
待写任务数量
迁移记录
最近一次错误
```

运行日志也会出现类似记录：

```text
storage engine=sqlite path=... exists=true pending=0 fallback=true error=
```

### 手动重新导入旧 JSON

```javascript
ConfigManager.migrateLegacyJsonToSqlite();
```

数据库中已经存在对应记录时，不会用旧 JSON 覆盖现有 SQLite 数据。

### 回滚方法

需要临时回到旧 JSON 存储时：

1. 停止 ToolHub。
2. 回滚到不包含 SQLite 适配器的代码版本。
3. 删除或移走 `ToolHub/toolhub.db`。
4. 重新启动 ToolHub。

详细说明见 [`SQLITE_STORAGE.md`](SQLITE_STORAGE.md)。

---

## 配置流

```text
ConfigManager.loadSettings()
        │
        ▼
SQLite / 旧 JSON 回退
        │
        ▼
ConfigValidator.sanitizeConfig()
        │
        ▼
FloatBallAppWM.config
        ├── pendingUserCfg 临时编辑
        ├── previewMode 实时预览
        └── ConfigManager.saveSettings() 保存到 SQLite
```

---

## 设置页与交互

主要设置入口：

```text
工具入口 / 悬浮球 / 指针 / 工具面板 / 外观 / 动作与手势 / 运行记录 / 设置结构
```

### 悬浮球手势

```text
单击悬浮球       打开 / 关闭主面板
长按悬浮球       打开设置面板
按住并拖动悬浮球 出现屏幕指针
拖到文字后松手   满足悬停时间后取字复制
继续悬停并拖框   进入框选 OCR
拖出有效区域松手 截图 OCR 并复制
小框误触         回退复制原文字
```

### 指针设置分组

```text
指针
├─ 基础
├─ 悬停
├─ 取字保护
├─ 框选 OCR
├─ 指针颜色
└─ 框选 OCR 颜色
```

有效 OCR 框选由最小宽度、最小高度、最小面积和最小拖动距离共同决定。

### ToolApp 滑动返回

```text
TOOLAPP_BACK_GESTURE_MODE=edge
TOOLAPP_BACK_GESTURE_MODE=surface
TOOLAPP_BACK_GESTURE_MODE=off
```

当前默认和推荐使用 `surface`，可从页面任意位置横向滑动返回，减少全面屏系统边缘手势抢占。

---

## 按钮动作类型

| type | 行为 |
|---|---|
| `open_settings` | 打开设置页 |
| `open_viewer` | 打开日志查看器 |
| `toast` | 显示 Toast |
| `app` | 通过 PackageManager 启动 App，可指定用户 |
| `shell` | 通过 Shell 广播桥执行 Base64 命令 |
| `broadcast` | 发送自定义广播 |
| `shortcut` | 执行 ShortX 快捷方式代码 |
| `content` | 查询 ContentProvider 内容 |
| `pointer` | 启动屏幕指针、取字和框选 OCR |

按钮统一进入：

```javascript
execButtonAction(btn, idx);
```

---

## 模块职责

| 文件 | 职责 |
|---|---|
| `th_01_base.js` | 基础工具、配置校验、路径常量、文件 IO、默认设置和 Schema |
| `th_02_core.js` | SQLite 透明适配、旧 JSON 迁移、`FloatBallAppWM` 构造和核心状态 |
| `th_03_icon.js` | 图标加载、Drawable / Bitmap 处理和缓存 |
| `th_04_theme.js` | 屏幕信息、主题、颜色、Toast 和振动 |
| `th_05_persistence.js` | 位置保存、设置保存、临时编辑缓存和预览刷新 |
| `th_06_icon_parser.js` | ShortX 图标解析和目录扫描 |
| `th_08_content.js` | ContentProvider 查询 |
| `th_09_animation.js` | 悬浮球动画、吸边、面板显示和返回适配 |
| `th_10_shell.js` | Shell 广播桥执行层 |
| `th_11_action.js` | 按钮动作分发 |
| `th_12_rebuild.js` | 悬浮球和配置变化后的重建刷新 |
| `th_13_panel_ui.js` | 设置项基础 UI |
| `th_14_panels.js` | 设置主页、分组页、弹窗和更新状态 |
| `th_14_button_shortcut.js` | 快捷方式选择 |
| `th_14_button_icon_editor.js` | 按钮图标编辑 |
| `th_14_button_editor.js` | 按钮管理、排序、编辑和保存 |
| `th_14_color_picker.js` | 颜色选择器 |
| `th_14_icon_picker.js` | ShortX 图标选择器 |
| `th_14_schema_editor.js` | 设置结构编辑器 |
| `th_15_extra.js` | 主面板、ToolApp Shell、页面栈和响应式布局 |
| `th_16_entry.js` | 启动、广播注册、关闭和资源释放 |
| `th_17_pointer.js` | 指针窗口、悬停取字、区域框选和状态颜色 |
| `th_18_pointer_ocr.js` | 截图 OCR、覆盖层和 OCR 任务衔接 |

---

## 安全更新机制

当前链路：

1. `ToolHub.js` 内置可信 RSA 公钥。
2. 远端仓库分发 `manifest.json`、`manifest.sig` 和 `code/*.js`。
3. 入口下载清单并校验签名。
4. 检查 `manifest.keyId`、最低可信版本和本地可信版本。
5. 模块先下载到临时文件。
6. 校验 SHA-256 和文件大小。
7. 校验通过后覆盖本地模块。
8. 模块加载成功后保存可信清单版本。

当前 keyId：

```text
toolhub-targets-20260703-rsa3072
```

---

## 日志

启动日志：

```text
shortx.getShortXDir()/ToolHub/logs/init.log
```

运行日志：

```text
shortx.getShortXDir()/ToolHub/logs/ShortX_ToolHub_yyyyMMdd.log
```

常见内容：

- 目录创建和权限处理
- manifest 下载和验签结果
- 模块下载、哈希校验和覆盖更新
- SQLite 初始化、迁移和回退错误
- 模块加载失败
- ToolApp 返回和布局异常
- 指针取字与 OCR 异常

---

## 维护与发布

### 修改 JS 模块或入口

修改 `code/*.js` 或 `ToolHub.js` 时：

1. 保持 Rhino ES5 语法。
2. 修改模块时提升顶部 `@version`。
3. 使用 `fix/*` 分支。
4. 创建中文标题和中文描述的非草稿 PR。
5. 由 `sign-toolhub` 自动更新：

```text
manifest.json
manifest.sig
ToolHub.js.sha256
```

6. 等待 `verify` 与 `sign-toolhub` 全部通过。
7. 通过仓库现有规则合并到 `main`。
8. 确认客户端能够正常检测更新。

### 只修改文档

仅修改以下文档时，不需要生成新的客户端清单版本：

```text
README.md
STRUCTURE.md
ARCHITECTURE.md
SQLITE_STORAGE.md
```

文档 PR 建议使用 `docs/*` 分支，避免触发一次仅包含说明变化的 ToolHub 客户端更新。

### 静态验证

```bash
python3 .github/scripts/es5_scan.py
python3 scripts/verify_sqlite_persistence.py
python3 scripts/verify_manifest.py
python3 scripts/verify_toolapp_single_root.py
python3 scripts/verify_toolapp_adaptive_size.py
python3 scripts/verify_button_editor_layout.py
python3 scripts/verify_schema_validator.py
python3 scripts/verify_pointer_issue_85.py
python3 .github/scripts/verify_manifest_signature.py
```

---

## 更新记录

### 2026-07-11

**配置存储迁移到 SQLite**

- 在原 ToolHub 目录新增 `toolhub.db`。
- `settings`、`buttons` 和 `schema` 统一写入 SQLite。
- 首次启动自动导入已有 JSON 配置。
- 保留原 JSON，SQLite 异常时自动回退读写。
- 保持现有 `ConfigManager`、设置 UI、按钮编辑和位置保存接口不变。
- 增加 SQLite 静态校验和独立说明文档。

### 2026-07-07

**指针设置与取字 / OCR 体验更新**

- 增加指针设置分组、悬停时间、OCR 阈值和状态颜色。
- 增加小框回退取字和大框 OCR 策略。
- 修复取字就绪、文字边框和 OCR 状态显示。

### 2026-07-04

**设置页按钮管理优化**

- 按钮管理改为紧凑列表。
- 增加搜索、筛选、状态和排序模式。
- 按钮管理改动统一通过“保存布置”生效。

### 2026-07-03

**旧 UI 清理与安全更新增强**

- 修复更新重启后的旧悬浮窗残留。
- 默认启用完整 manifest 验签、SHA-256、文件大小和防回滚检查。
- 统一设置页文案和关闭流程。

---

## 兼容约束

- 运行环境：ShortX JS / Rhino ES5。
- JavaScript 统一使用 `var`、普通函数和 ES5 写法。
- 禁止使用 `let/const`、箭头函数、模板字符串、`class`、可选链、空值合并和展开语法。
- Android UI 优先使用 WindowManager、FrameLayout、Canvas 和原生 View。
- 不依赖 WebView。
- 入口顶层不要使用 `return`。
- 不要将签名私钥提交到仓库。
- 涉及 root 或 Shell 的能力必须由配置或用户明确动作触发。
