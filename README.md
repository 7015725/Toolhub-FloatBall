# ShortX ToolHub

ShortX ToolHub 是一个面向 **ShortX / Rhino ES5 JS** 的模块化悬浮工具框架。

入口文件 `ToolHub.js` 负责拉取、校验、更新并加载子模块；业务 UI、按钮动作、主题、持久化、图标选择器、颜色选择器、ToolApp 页面栈等功能拆分在 `code/th_*.js` 中维护，避免单个 JS 文件过大。

当前仓库地址：

```text
https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub
```

GitHub 镜像地址：

```text
https://github.com/7015725/Toolhub-FloatBall
```

整体结构说明：

```text
STRUCTURE.md
```

技术架构见 ARCHITECTURE.md

---

## 核心特性

- **模块化加载**：入口文件只做启动、同步、校验与汇总返回；当前实际加载 21 个子模块。
- **更新源切换**：入口支持在 Gitea 主源与 GitHub 镜像之间切换。
- **安全更新模式**：`UPDATE_SECURITY_MODE = 1` 使用 manifest 哈希校验；`2` 在此基础上增加 `manifest.sig` RSA 验签、keyId 校验和防回滚。
- **SHA256 文件校验**：每个子模块按清单中的 `sha256` 和 `size` 校验，通过后才覆盖本地文件。
- **防回滚**：入口内置 `MIN_TRUSTED_MANIFEST_VERSION`，并在完整验签模式下记录本地已信任清单版本，拒绝旧版本清单。
- **本地可信回退**：网络或远端清单异常时，已验证过的本地模块可继续使用。
- **App 化设置页**：设置主页、按钮管理、按钮编辑、设置结构编辑等页面使用统一 ToolApp Shell 与页面栈。
- **更新状态可视化**：设置页欢迎卡显示更新状态胶囊，展开后展示 release notes、更新源、校验模式和同步模块，并支持手动检查与立即更新。
- **系统返回适配**：支持返回键、Android 13+ 返回回调、Android 14+ 预测性返回，并内置 ToolApp 左右滑返回。
- **Surface 滑动返回**：可在 ToolApp 页面任意位置横滑返回，避免全面屏系统手势抢占极窄边缘区域。
- **ShortX 图标选择器**：支持图标点选、搜索、分页、收藏、最近、过滤，不再依赖手填图标名。
- **颜色选择器**：支持常用色、最近色、RGB、透明度和实时预览。
- **自适应布局**：ToolApp 根据屏幕尺寸调整宽高，支持手机竖屏、横屏和平板宽屏布局。
- **位置恢复**：悬浮球横竖屏切换后按比例和吸边侧恢复位置，减少横屏跑到屏幕中间的问题。
- **日志记录**：启动、更新、验签、加载异常写入 `ToolHub/logs/init.log`，运行日志按日期保存。

---

## 快速部署

### 1. 安装入口文件

复制仓库中的 `ToolHub.js`，粘贴到 ShortX 的 JS 任务中运行。

> 注意：`ToolHub.js` 是信任根，内置 RSA 公钥和最低可信清单版本。入口文件本身不能安全地自我更新；入口升级时需要手动替换一次。

### 2. 首次运行

入口会自动完成：

1. 创建 `shortx.getShortXDir()/ToolHub/code/`
2. 下载或读取 `manifest.json`
3. 完整验签模式下下载并校验 `manifest.sig`
4. 按安全模式记录清单版本与校验状态
5. 按清单下载 21 个子模块到临时文件
6. 校验模块 `size` 与 `sha256`
7. 校验通过后覆盖本地模块
8. `eval` 加载模块
9. 创建 `FloatBallAppWM` 并启动悬浮球

---

## 入口配置

`ToolHub.js` 顶部可配置：

```javascript
var UPDATE_SOURCE = 1;          // 0: Gitea, 1: GitHub
var UPDATE_SECURITY_MODE = 1;   // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新
```

更新源：

```text
0: https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub/raw/branch/main/
1: https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/main/
```

安全模式说明：

| 模式 | 含义 |
|---|---|
| `0` | 普通更新模式，不启用签名 / manifest 严格校验 |
| `1` | 读取 manifest，并按 manifest 校验模块 hash / size |
| `2` | 完整验签安全更新：manifest 签名、keyId、版本、防回滚、模块 hash / size 全部校验 |

如需严格安全更新，建议使用：

```javascript
var UPDATE_SECURITY_MODE = 2;
```

---

## 目录结构

### 实机目录

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
    │   ├── .trusted_manifest_version
    │   └── .trusted_sha_<module>
    ├── logs/
    │   ├── init.log
    │   └── ShortX_ToolHub_yyyyMMdd.log
    ├── settings.json
    ├── buttons.json
    └── schema.json
```

### 仓库目录

```text
Toolhub-FloatBall/
├── ToolHub.js
├── ToolHub.js.sha256
├── README.md
├── STRUCTURE.md
├── manifest.json
├── manifest.sig
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
│   └── th_16_entry.js
└── scripts/
    └── generate_signed_manifest.py
```

---

## 启动返回示例

### 正常启动，无模块更新

```json
{
  "ok": true,
  "状态": "ToolHub 启动成功",
  "安全": "⚠ manifest哈希校验模式 v20260702094202",
  "同步": "✓ 子模块已是最新",
  "更新状态": "latest",
  "布局": "4×4",
  "关闭广播": "shortx.wm.floatball.CLOSE",
  "更新标题": "设置页文案和更新卡片优化",
  "更新内容": [
    "统一设置页文案和配置范围",
    "优化更新卡片按钮优先级",
    "简化 Toast，错误详情保留在日志和更新卡片"
  ]
}
```

### 正常启动，有模块更新

```json
{
  "ok": true,
  "状态": "ToolHub 启动成功",
  "安全": "⚠ manifest哈希校验模式 v20260702094202",
  "同步": "✓ 已更新 2 个模块：th_14_panels.js、th_16_entry.js",
  "更新状态": "updated",
  "布局": "4×4",
  "关闭广播": "shortx.wm.floatball.CLOSE",
  "更新标题": "设置页文案和更新卡片优化",
  "更新内容": [
    "统一设置页文案和配置范围",
    "优化更新卡片按钮优先级",
    "简化 Toast，错误详情保留在日志和更新卡片"
  ],
  "更新模块": ["th_14_panels.js", "th_16_entry.js"]
}
```

### 启动失败

失败时会返回：

- `ok: false`
- `状态: "ToolHub 启动失败"`
- `安全`: 当前验签 / 清单状态
- `更新状态`: `"error"`
- `错误`: 失败原因
- `加载异常`: 非关键模块加载失败列表（如存在）

---

## 安全更新机制

当前更新链路不是旧版 `Last-Modified` 热更新，而是：

1. `ToolHub.js` 内置可信 RSA 公钥。
2. 远端仓库分发：
   - `manifest.json`
   - `manifest.sig`
   - `code/*.js`
3. 入口下载 `manifest.json`。
4. `UPDATE_SECURITY_MODE = 1` 时按 manifest 校验模块 `size` 和 `sha256`。
5. `UPDATE_SECURITY_MODE = 2` 时额外下载 `manifest.sig` 并使用 `SHA256withRSA` 验签。
6. 完整验签模式会检查 `manifest.keyId`、最低可信版本和本地已信任版本。
7. 每个模块下载到 `.tmp`。
8. 校验通过才覆盖本地模块。
9. 所有模块加载正常后，保存本地可信清单版本。

当前 keyId：

```text
toolhub-targets-2026-rsa3072
```

---

## 模块职责

| 文件 | 职责 |
|------|------|
| `th_01_base.js` | 基础工具、配置校验、路径常量、文件 IO、原子写、防抖写、日志基础 |
| `th_02_core.js` | `FloatBallAppWM` 构造、核心 state 初始化、基础方法、UI 工具对象初始化 |
| `th_03_icon.js` | 图标加载、图标缓存、Drawable / Bitmap 处理、悬浮球图标解析 |
| `th_04_theme.js` | 屏幕尺寸、旋转、Toast、振动、动物岛主题、Monet 颜色、Drawable 工具 |
| `th_05_persistence.js` | 悬浮球位置保存、设置保存、临时编辑缓存、实时预览刷新 |
| `th_06_icon_parser.js` | ShortX 图标解析、图标目录扫描、图标名回退 |
| `th_08_content.js` | ContentProvider 查询、Content 类型按钮读取 |
| `th_09_animation.js` | 悬浮球动画、吸边、面板显示隐藏、Mask、系统返回、预测性返回、缓存清理 |
| `th_10_shell.js` | Shell 广播桥执行层 |
| `th_11_action.js` | 按钮动作分发：设置、日志、Toast、App、Shell、Broadcast、Shortcut |
| `th_12_rebuild.js` | 悬浮球重建、尺寸 / 图标 / 配置变化刷新 |
| `th_13_panel_ui.js` | 设置项基础 UI：section、bool、int、float、action、文本输入等 |
| `th_14_panels.js` | 设置主页、设置分组、按钮管理入口、弹窗基础、主题适配、更新状态展示 |
| `th_14_button_shortcut.js` | 内联快捷方式选择、快捷方式图标异步加载与回填 |
| `th_14_button_icon_editor.js` | 按钮图标编辑、图标来源选择与颜色联动 |
| `th_14_button_editor.js` | 按钮编辑页、动作参数、保存校验与页面内反馈 |
| `th_14_color_picker.js` | 颜色选择器：最近色、常用色、RGB、透明度、实时预览 |
| `th_14_icon_picker.js` | ShortX 图标选择器：搜索、分页、收藏、最近、过滤、Overlay |
| `th_14_schema_editor.js` | 设置结构编辑器 |
| `th_15_extra.js` | 主面板构建、ToolApp Shell、页面栈、响应式布局、左右滑返回预览 |
| `th_16_entry.js` | 主线程同步、广播注册、`startAsync`、`close`、`dispose`、生命周期管理 |

---

## 子模块命名规则

当前 `manifest.json` 实际包含 **21 个子模块**。`th_07_shortcut.js` 已退役，编号从 `th_06` 跳到 `th_08` 是有意保留的历史空洞，不是遗漏。

### 文件名格式

```text
th_<两位编号>_<模块名>.js
```

示例：

```text
th_01_base.js
th_20_panel_ui.js
th_40_color_picker.js
th_50_entry.js
```

### 编号含义

```text
01-09   基础能力层
10-19   执行与动作层
20-29   UI 基础层
30-39   ToolApp 页面层
40-49   弹窗 / 选择器层
50-59   生命周期入口层
```

### 通用规则

- 编号表示加载顺序和依赖层级，不表示功能重要程度。
- 文件名只允许小写英文、数字和下划线。
- 不使用中文、驼峰、横杠。
- 已退役模块的编号可以留空，不强制补位。
- 为降低更新风险，历史文件不为了填补空号而重命名。
- 新增模块优先放入对应编号段。
- 如果未来确实要重命名，必须同步：
  - `ToolHub.js` 模块加载列表
  - `manifest.json`
  - `manifest.sig`
  - `ToolHub.js.sha256`
  - `README.md`
  - `STRUCTURE.md`

### 当前策略

- 保留现有 `th_08`、`th_09`、`th_10` 等历史编号。
- `th_07` 空洞作为退役模块编号保留。
- 子模块命名规则以后按新分段执行。
- 后续新增模块使用新编号段，例如：
  - `th_20_xxx.js` 用于 UI 基础。
  - `th_30_xxx.js` 用于 ToolApp 页面。
  - `th_40_xxx.js` 用于弹窗 / 选择器。
  - `th_50_xxx.js` 用于生命周期入口。

---

## UI 与交互结构

### ToolApp 设置页

- 设置、按钮管理、按钮编辑、设置结构编辑统一运行在 ToolApp Shell 内。
- 顶部栏提供返回与关闭，子页面优先通过页面栈返回。
- 页面栈保存完整页面快照，支持三级、四级、五级页面继续返回。
- 系统返回键会优先回到上一页；没有上一页时关闭 ToolApp。
- 面板尺寸按屏幕自适应，减少小屏溢出与大屏空白。
- 横屏 / 平板宽屏下可进入更适合大屏的布局结构。
- 欢迎卡内置更新状态胶囊，显示最新 / 已同步 / 普通更新 / 更新异常等状态。
- 点击更新胶囊可展开详情，展示 release notes、更新源、校验模式、安全状态和本次同步模块。
- 大屏设置目录同步显示更新状态，用户无需进入日志页即可确认当前版本状态。

### ToolApp 滑动返回

返回模式配置：

```text
TOOLAPP_BACK_GESTURE_MODE=edge      # 左右边缘触发
TOOLAPP_BACK_GESTURE_MODE=surface   # 页面任意位置横滑触发
TOOLAPP_BACK_GESTURE_MODE=off       # 关闭内置滑动返回
```

当前更推荐 `surface`：

- 全面屏系统手势会抢占物理极致边缘。
- `edge` 模式容易出现触发范围过窄。
- `surface` 模式可以从页面任意位置横滑一定距离返回。

手势冲突处理：

- `ACTION_DOWN` 永远放行给子控件。
- `ACTION_MOVE` 达到横滑阈值后再判断是否拦截。
- 只有强横向滑动才接管返回。
- `SeekBar` / `Switch` / `EditText` / `HorizontalScrollView` 做细粒度阻断。
- 普通按钮、卡片、垂直列表项不阻断 surface 返回。

相关配置：

| 配置项 | 作用 |
|---|---|
| `TOOLAPP_BACK_GESTURE_MODE` | 返回模式：edge / surface / off |
| `TOOLAPP_BACK_EDGE_WIDTH_DP` | edge 模式边缘宽度 |
| `TOOLAPP_BACK_COMMIT_DISTANCE_DP` | 松手完成返回距离 |
| `TOOLAPP_BACK_SURFACE_SLOP_DP` | surface 模式起判阈值 |
| `TOOLAPP_BACK_PROGRESS_DISTANCE_DP` | 预览动画进度距离 |

### ShortX 图标选择器

- 支持搜索、分页、过滤。
- 支持收藏、最近、常用分类。
- 根据可用宽高计算网格容量。
- 选中图标后自动回填。
- 优先运行时扫描 ShortX 可用图标，避免维护超大静态图标表。

### 弹出式颜色选择器

- 图标预览实时显示着色效果。
- 最近使用颜色最多保留 8 个。
- 常用颜色使用自适应网格。
- RGB 与透明度滑块实时同步。
- 支持一键清空，恢复跟随主题。

---

## 按钮动作类型

按钮点击统一进入：

```text
execButtonAction(btn, idx)
```

支持类型：

| type | 行为 |
|---|---|
| `open_settings` | 打开设置 / ToolApp |
| `open_viewer` | 打开日志查看器 |
| `toast` | 显示 Toast |
| `app` | 通过 PackageManager 启动 App，支持 `launchUserId` |
| `shell` | 通过 shell 广播桥发送 base64 命令，默认 root |
| `broadcast` | 发送自定义广播，兼容 `extra` / `extras` |
| `shortcut` | 执行 `shortcutJsCode`，用于锁定主 / 分身快捷方式 |

---

## 配置与持久化

主要文件：

```text
settings.json
buttons.json
schema.json
```

配置流：

```text
ConfigManager.loadSettings()
    │
    ▼
ConfigValidator.sanitizeConfig()
    │
    ▼
FloatBallAppWM.config
    ├── pendingUserCfg 临时编辑
    ├── previewMode 实时预览
    └── ConfigManager.saveSettings() 落盘
```

写入策略：

- 使用原子写入：临时文件 → flush / sync → rename。
- 使用去抖合并写入，减少频繁保存导致的卡顿和文件损坏风险。
- `close()` 时调用 `FileIO.flushDebouncedWrites()`，尽量保证最后一次修改落盘。

---

## 悬浮球位置保存

位置保存不只记录 x/y，还记录屏幕元数据：

```text
BALL_INIT_X
BALL_INIT_Y_DP
BALL_POS_SCREEN_W
BALL_POS_SCREEN_H
BALL_POS_X_RATIO
BALL_POS_Y_RATIO
BALL_POS_DOCKED
BALL_POS_DOCK_SIDE
```

作用：

- 横竖屏切换后按比例恢复位置。
- 如果处于吸边状态，优先按 `left/right` 恢复到对应边缘。
- 兼容旧版只保存竖屏像素导致横屏时悬浮球跑到中间的问题。

---

## 日志

启动日志路径：

```text
shortx.getShortXDir() + "/ToolHub/logs/init.log"
```

运行日志路径：

```text
shortx.getShortXDir() + "/ToolHub/logs/ShortX_ToolHub_yyyyMMdd.log"
```

常见记录内容：

- 目录创建与权限处理
- manifest 下载与验签结果
- 模块下载、哈希校验与覆盖更新
- 模块加载失败
- 启动异常
- 预测性返回 / ToolApp 返回调试记录
- 模块体积告警（超过 200KB）

---

## 维护与发布

### 修改子模块后

如果修改了 `code/*.js` 或 `ToolHub.js`，需要重新生成签名清单：

```bash
scripts/generate_signed_manifest.py
```

会更新：

```text
manifest.json
manifest.sig
ToolHub.js.sha256
```

然后再提交并推送。

### 修改 README / STRUCTURE

只改以下文档不需要重新签名，因为它们不参与手机端模块校验：

```text
README.md
STRUCTURE.md
```

### 注意事项

- Rhino / ShortX JS 中统一使用 `var`，避免 `let` / `const`。
- 顶层不要使用 `return`。
- 入口文件是信任根，改动后需要用户手动替换 ShortX 任务中的入口。
- 不要把私钥提交到仓库。
- 不建议把调试细节塞进启动返回 JSON，优先写日志。
- 模块加载顺序不要随意改，尤其是 `th_14_*`、`th_15_extra.js`、`th_16_entry.js`。

---

## 模块加载顺序

当前顺序大致是：

```text
base → core → icon / theme / persistence / parser / content
→ animation / shell / action / rebuild
→ panel_ui → panels → button_shortcut / button_icon_editor / button_editor
→ color_picker / icon_picker / schema_editor → extra → entry
```

注意：

- `th_14_color_picker.js` 依赖 `th_14_panels.js` 的弹窗基础能力。
- `th_14_button_shortcut.js`、`th_14_button_icon_editor.js`、`th_14_button_editor.js` 位于 `th_14_panels.js` 之后。
- `th_14_icon_picker.js` 应位于 `th_14_panels.js` 之后、`th_15_extra.js` 之前。
- `th_15_extra.js` 依赖前面 UI、主题、设置、页面构建能力。
- `th_16_entry.js` 最后加载，负责真正启动实例。

---

## 后续拆分建议

当前仍偏大的模块：

```text
th_15_extra.js
th_14_panels.js
th_09_animation.js
```

建议后续逐步拆分：

```text
th_15_extra.js
├── ToolAppShell
├── ToolAppNavigation
├── ToolAppBackGesture
├── ToolAppResponsiveLayout
└── MainPanelView

th_14_panels.js
├── SettingsHome
├── SettingsGroupPage
├── ButtonManagerPage
├── UpdateStatusCard
└── CommonPopupOverlay

th_09_animation.js
├── BallDockAnimation
├── PanelVisibility
├── PredictiveBack
└── CacheCleanup
```

短期不建议大规模重构。更稳的做法是每次只拆一个页面或一个手势模块，并同步更新 `manifest.json` 与签名。

---

## 更新记录

### 2026-07-03

**设置页文案和更新卡片优化**

- 统一设置页文案，把“气球 / 小屋 / 蓝图 / 岛屿”等拟物名称调整为“悬浮球 / 工具面板 / 设置结构 / 设置”。
- 同步设置结构和 ConfigValidator 的稳定范围，`THEME_MODE` 改为单选项，悬浮球、面板、吸边、点击、震动等字段范围保持一致。
- 新增 `scripts/verify_schema_validator.py`，用于校验设置结构、ConfigValidator 和关键文案。
- 优化更新状态卡片：有可用更新时优先显示“立即更新”，同时保留“重新检查”。
- 简化更新相关 Toast，错误详情保留在更新卡片和日志。

### 2026-07-02

**设置页更新状态优化**

- 设置页欢迎卡增加更新状态胶囊，直接展示最新、已同步、普通更新和更新异常状态。
- 新增展开的更新详情区域，展示 release notes、更新源、校验模式、安全状态和同步模块。
- 大屏设置目录同步显示更新状态，减少进入日志页确认版本的步骤。
- 启动返回 JSON 增加 `更新状态`、`更新标题`、`更新内容` 字段，便于外部规则直接读取。
- 入口默认更新模式调整为 `UPDATE_SECURITY_MODE = 1`，使用 manifest 哈希校验作为默认更新链路。

### 2026-05-23

**模块化与结构整理**

- 新增 `STRUCTURE.md`，整理整体结构、启动链路、模块职责、ToolApp 页面栈和返回手势结构。
- README 同步当前实际 18 个子模块，并补充 `th_14_color_picker.js`、`th_14_icon_picker.js`、`th_14_schema_editor.js` 的职责。
- 退役无入口的 `th_07_shortcut.js`；快捷方式选择逻辑已并入 `th_14_panels.js` 的按钮编辑页。
- 拆分 ShortX 图标选择器到 `th_14_icon_picker.js`，降低 `th_14_panels.js` 体积。
- 拆分颜色面板到 `th_14_color_picker.js`，并保留旧入口兼容路径。
- 拆分高级蓝图 / schema 编辑器到 `th_14_schema_editor.js`，并整理蓝图 UI。

**ToolApp 返回体验**

- 修复 ToolApp 顶部与状态栏对齐，减少顶部空白。
- 保存并恢复 ToolApp 上级页面列表滚动位置；从二级页面返回时，一级列表保持进入前的位置。
- 降低返回预览恢复时的闪烁，保持返回动画过程中的上级页面预览。
- 调整返回预览位移和 shell 布局，使滑动返回更稳定、更接近真实页面。

**颜色面板与通用弹窗**

- 颜色面板底部“恢复默认 / 保存颜色”改为固定 footer，内容滚动时按钮仍保持可见。
- 增加通用 popup 边缘滑动关闭能力。
- 颜色面板接入系统返回、窗口失焦、窗口不可见、detach 等关闭路径。
- 修复 ColorOS overlay 平移时的拖影/重复页面视觉问题；颜色面板滑动只作为关闭触发，不再拖动画面。
- 删除 `th_14_panels.js` 中旧版重复颜色面板实现，颜色面板主体统一维护在 `th_14_color_picker.js`。
- 颜色面板接入统一 `hideAllPanels()` / `handleSystemUiDismiss()` 关闭链路，复用 ToolApp / 设置主页已有的底部上滑关闭机制。
- 优化颜色面板默认一屏展示与布局密度：底部按钮固定，控件尺寸与弹窗空间保持更协调，小屏仍保留滚动兜底。

**日志与更新机制**

- 稳定 ToolHub 日志系统：清理重复 logger 定义、修复即时日志配置、补充隐私脱敏和 `init.log` 体积控制。
- 新增 `UPDATE_SECURITY_MODE`：
  - `0`：普通更新，不验签、不读 manifest、不防回滚。
  - `1`：manifest 哈希校验，不验签。
  - `2`：完整安全更新，验签 + SHA256/size + 防回滚。
- 当前默认改为 `UPDATE_SOURCE = 1`、`UPDATE_SECURITY_MODE = 0`，即 GitHub 普通更新模式，便于快速测试 UI 修改。

**文档更新**

- README 补充 surface 滑动返回、子控件冲突处理、按钮动作类型、持久化结构和后续拆分建议。
- README 同步当前模块化结构和普通更新模式说明。
- README / STRUCTURE 补充子模块命名规则：明确 `th_<两位编号>_<模块名>.js` 格式、新编号分段、`th_07` 退役空洞保留策略，以及未来重命名时需要同步的入口、manifest、签名和文档文件。

### 2026-05-22

**设置页响应式与横屏适配**

- 优化 ToolHub 设置页响应式布局。
- 新增横屏 master-detail 双栏布局，平板/横屏下可保留设置详情。
- 改进 ToolApp 横屏边缘返回处理，减少横屏状态下返回手势异常。

**颜色面板修复与视觉优化**

- 修复颜色面板 overlay 和 ToolApp 返回预览之间的冲突。
- 修复颜色面板打开、顶部栏点击、底部按钮点击等不稳定问题。
- 统一颜色面板底部按钮风格，使其更接近设置页按钮视觉。
- 多轮调整颜色面板按钮大小、颜色、间距、对齐和触摸区域。
- 修复颜色面板弹窗固定尺寸导致按钮被裁切的问题。
- 修复 Rhino/ShortX 下 ScrollView LayoutParams 兼容性问题。
- 调整颜色面板弹窗最大高度，避免弹窗被拉得过长。

**ToolHub UI 点击反馈**

- 修复 ToolHub UI 按钮点击无响应的问题。
- 修复 ToolApp 边缘返回区域覆盖按钮、导致按钮无法点击的问题。
- 修复按钮编辑器校验失败时只有 Toast / 隐藏错误提示、用户看不到反馈的问题。
- 设置页和按钮编辑器增加页面内 inline 反馈，减少 Toast 被 overlay 遮挡的问题。

**ToolApp 滑动返回重构**

- 修复 panel back callback 重复注册和抖动问题。
- 恢复并增强 ToolApp 边缘返回手势开关。
- 修复边缘返回条默认宽度、触摸拦截、拖动进度、返回预览层和跟手动画。
- 增强边缘返回灵敏度和响应速度。
- 新增 / 优化 ToolApp surface 返回模式，使返回手势更多在 ToolApp 页面内部处理，减少全屏透明边缘条对按钮和系统手势的影响。
- 稳定 ToolApp 返回栈，优先使用 surface 返回手势。
- 禁用并清理旧版 ToolApp 全屏返回条，降低 UI 控件被覆盖的风险。

### 2026-05-21

**模块拆分尝试**

- 尝试拆分 picker 模块并增强诊断输出。
- 后续在 2026-05-22 回滚该拆分方案，避免不稳定结构继续影响主线。

### 2026-05-19

**功能改进**

- 新增悬浮球背景色设置。
- 新增 ToolHub 角标和 ToolApp 返回手势相关设置。
- README 补充 GitHub 镜像地址与更新源切换说明。
- ToolHub 入口支持通过 `UPDATE_SOURCE` 在 Gitea 主源与 GitHub 镜像之间切换。
- 主面板动物岛主题继续优化为更轻量的融合色视觉，避免高频主面板出现过重图标气泡。

**设置与手势**

- 扩大 ToolApp 返回手势距离、进度距离、边缘宽度等可调范围。
- 修复 ToolApp 内部返回边界宽度设置不生效的问题，变更后可即时作用于当前页面。
- 修复设置 schema 持久化导致旧用户看不到最新滑块范围或文案的问题。

**稳定性修复**

- 改进悬浮球横竖屏切换后的屏幕尺寸刷新与吸边重排，减少横屏时位置跑到屏幕中间的问题。
- 修复长按打开设置后手指轻微移动导致设置页被普通拖拽逻辑关闭的问题。

### 2026-05-13

**功能改进**

- 新增 ToolApp 式设置主页与页面栈，设置、按钮管理、按钮编辑改为更接近 App 的层级导航。
- 支持系统导航返回；因 ToolHub 是悬浮窗 Overlay，系统级预测性返回动画不稳定，改为内置左右边缘交互式滑动返回。
- 边缘返回拖动时会预渲染上级页面，当前页面随手指横移并露出上级页面，松手后完成返回或回弹。
- ToolApp 尺寸按屏幕自适应，按钮管理页底部操作区保持可见。
- 按钮管理与按钮编辑布局继续轻量化，减少说明文字和视觉负担。
- ShortX 图标选择器风格与设置 UI 对齐。
- 移除重复内联颜色调色板，统一使用折叠式颜色选择器。

**稳定性修复**

- 改进 ToolHub 启动与清理流程。
- 修复设置页返回按钮状态、编辑器返回后页面栈状态、系统手势返回提示等细节问题。

### 2026-05-09

**文档更新**

- README 改为匹配当前签名更新机制。
- 移除旧版 `Last-Modified` 热更新描述。
- 补充 manifest 验签、SHA256 校验、防回滚、本地可信回退说明。
- 更新启动返回示例为当前中文精简字段。

### 2026-05-07

**安全升级**

- 引入 `manifest.json` + `manifest.sig` 签名清单。
- 入口内置 RSA 公钥，使用 `SHA256withRSA` 验签。
- 子模块下载后按 `size` 与 `sha256` 校验。
- 增加最低可信清单版本与本地可信版本，防止回滚。
- 启动返回信息精简为 `状态 / 安全 / 同步 / 布局 / 关闭广播`。

### 2026-04-21

**功能改进**

- 移除 ShortX 图标选择器分类标签，保留搜索和分页。
- 调整图标弹窗自适应布局参数，提高单页容量。
- 清理旧版分类过滤逻辑。

**Bug 修复**

- 修复删除 tabs 代码后遗留重复 `addView(searchEt)` 导致的面板显示崩溃。

### 2026-04-20

**Bug 修复**

- 修复 ShortX 图标调色板确认后未应用颜色。
- 修复颜色弹窗确认时 `recentGrid` 引用异常。
- 图标颜色与悬浮球颜色改为独立维护，避免互相覆盖。

**功能改进**

- 图标库与调色板默认收起。
- 常用颜色改为自适应布局。
- ShortX 图标浮窗选择器改为分页模式。
- 设置面板移除悬浮球文字相关设置项。
- 新增独立颜色选择器，支持最近色、常用色、RGB、透明度和实时预览。

**代码清理**

- 按钮编辑与悬浮球设置复用图标选择器和颜色选择器。
- 清理悬浮球文字相关死代码。
