# ShortX ToolHub

ShortX ToolHub 是一个面向 **ShortX / Rhino ES5 JS** 的模块化悬浮工具框架。

入口文件 `ToolHub.js` 负责拉取、校验、更新并加载子模块；悬浮球、工具面板、设置页、按钮管理、主题、持久化、图标选择器、颜色选择器、屏幕指针、取字与框选 OCR 等能力拆分在 `code/th_*.js` 中维护，避免单个 JS 文件过大。

## 仓库地址

主仓库：

```text
https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub
```

GitHub 镜像：

```text
https://github.com/7015725/Toolhub-FloatBall
```

维护要求：

```text
每次修改或调整 ToolHub 后，必须同步推送到 GitHub 和 Gitea 两个仓库。
```

结构文档：

```text
STRUCTURE.md
ARCHITECTURE.md
```

---

## 核心特性

- **模块化加载**：入口文件只做启动、同步、校验与汇总返回；当前 `manifest.json` 实际包含 23 个子模块。
- **安全更新模式**：默认使用 `UPDATE_SECURITY_MODE = 2`，启用 manifest 哈希校验、`manifest.sig` RSA 验签、keyId 校验和防回滚。
- **SHA256 文件校验**：每个子模块按清单中的 `sha256` 和 `size` 校验，通过后才覆盖本地文件。
- **本地可信回退**：网络或远端清单异常时，已验证过的本地模块可继续使用。
- **App 化设置页**：设置主页、按钮管理、按钮编辑、设置结构编辑等页面运行在统一 ToolApp Shell 与页面栈中。
- **响应式布局**：支持手机竖屏、横屏和平板宽屏；宽屏可使用 master-detail 双栏结构。
- **设置页子块化**：指针分类按“基础 / 悬停 / 取字保护 / 框选 OCR / 指针颜色 / 框选 OCR 颜色”分块显示。
- **按钮管理紧凑列表**：支持统计、搜索、筛选、状态 chip、更多菜单和排序模式，整理工具时统一通过“保存布置”生效。
- **更新状态可视化**：设置页显示更新状态胶囊，可展开查看 release notes、更新源、校验模式和同步模块。
- **设置页内重启**：更新下载完成后可在设置页直接重启；重启前会广播关闭旧实例并等待旧悬浮窗释放。
- **系统返回适配**：支持返回键、Android 13+ 返回回调、Android 14+ 预测性返回，以及 ToolApp 内部左右滑返回。
- **Surface 滑动返回**：可在 ToolApp 页面任意位置横滑返回，减少全面屏系统手势抢占极窄边缘的问题。
- **ShortX 图标选择器**：支持图标点选、搜索、分页、收藏、最近、过滤，不再依赖手填图标名。
- **颜色选择器**：支持常用色、最近色、RGB、透明度和实时预览。
- **屏幕指针**：支持从悬浮球向屏幕内拖动唤出指针、悬停取字、取字就绪变色、框选截图 OCR、小框回退取字和多状态颜色。
- **固定位置预设**：悬浮球通过设置选择左/右边缘和统一高度百分比；其他方向拖动不再改变位置。
- **日志记录**：启动、更新、验签、加载异常写入 `ToolHub/logs/init.log`，运行日志按日期保存。

---

## 快速部署

### 1. 安装入口文件

复制仓库中的 `ToolHub.js`，粘贴到 ShortX 的 JS 任务中运行。

> `ToolHub.js` 是信任根，内置 RSA 公钥和最低可信清单版本。入口文件本身不能安全地自我更新；入口升级时需要手动替换一次。

### 2. 首次运行

入口会自动完成：

1. 创建 `shortx.getShortXDir()/ToolHub/code/`
2. 下载或读取 `manifest.json`
3. 完整验签模式下下载并校验 `manifest.sig`
4. 按安全模式记录清单版本与校验状态
5. 按清单下载 23 个子模块到临时文件
6. 校验模块 `size` 与 `sha256`
7. 校验通过后覆盖本地模块
8. `eval` 加载模块
9. 创建 `FloatBallAppWM` 并启动悬浮球

---

## 入口配置

`ToolHub.js` 顶部可配置：

```javascript
var UPDATE_SOURCE = 1;          // 0: Gitea, 1: GitHub
var UPDATE_SECURITY_MODE = 2;   // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新
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
    │   ├── th_17_pointer.js
    │   ├── th_18_pointer_ocr.js
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
├── ARCHITECTURE.md
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
│   ├── th_16_entry.js
│   ├── th_17_pointer.js
│   └── th_18_pointer_ocr.js
└── scripts/
    ├── generate_signed_manifest.py
    ├── verify_manifest.py
    ├── verify_button_editor_layout.py
    ├── verify_schema_validator.py
    ├── verify_toolapp_adaptive_size.py
    └── verify_toolapp_single_root.py
```

---

## 模块职责

| 文件 | 职责 |
|---|---|
| `th_01_base.js` | 基础工具、配置校验、路径常量、文件 IO、原子写、防抖写、日志基础、默认配置与设置 schema |
| `th_02_core.js` | `FloatBallAppWM` 构造、核心 state 初始化、基础方法、UI 工具对象初始化 |
| `th_03_icon.js` | 图标加载、图标缓存、Drawable / Bitmap 处理、悬浮球图标解析 |
| `th_04_theme.js` | 屏幕尺寸、旋转、Toast、振动、动物岛主题、Monet 颜色、Drawable 工具 |
| `th_05_persistence.js` | 悬浮球位置保存、设置保存、临时编辑缓存、实时预览刷新 |
| `th_06_icon_parser.js` | ShortX 图标解析、图标目录扫描、图标名回退 |
| `th_08_content.js` | ContentProvider 查询、Content 类型按钮读取 |
| `th_09_animation.js` | 悬浮球动画、吸边、面板显示隐藏、Mask、系统返回、预测性返回、缓存清理 |
| `th_10_shell.js` | Shell 广播桥执行层 |
| `th_11_action.js` | 按钮动作分发：设置、日志、Toast、App、Shell、Broadcast、Shortcut、Content、Pointer |
| `th_12_rebuild.js` | 悬浮球重建、尺寸 / 图标 / 配置变化刷新 |
| `th_13_panel_ui.js` | 设置项基础 UI：section、bool、int、float、action、文本输入等 |
| `th_14_panels.js` | 设置主页、设置分组、指针设置子块、弹窗基础、主题适配、更新状态展示 |
| `th_14_button_shortcut.js` | 内联快捷方式选择、快捷方式图标异步加载与回填 |
| `th_14_button_icon_editor.js` | 按钮图标来源、ShortX 图标预览、图标调色内联编辑与颜色联动 |
| `th_14_button_editor.js` | 按钮管理紧凑列表、搜索筛选、状态 chip、更多菜单、排序模式、按钮编辑页、动作参数、保存校验与页面内反馈 |
| `th_14_color_picker.js` | 颜色选择器：最近色、常用色、RGB、透明度、实时预览 |
| `th_14_icon_picker.js` | ShortX 图标选择器：搜索、分页、收藏、最近、过滤、Overlay |
| `th_14_schema_editor.js` | 设置结构编辑器 |
| `th_15_extra.js` | 主面板构建、ToolApp Shell、页面栈、响应式布局、左右滑返回预览 |
| `th_16_entry.js` | 主线程同步、广播注册、`startAsync`、`close`、`dispose`、生命周期管理 |
| `th_17_pointer.js` | 屏幕指针、悬停取字、框选区域、小框回退取字、OCR rect 输出 |
| `th_18_pointer_ocr.js` | 框选截图 OCR 处理、截图区域覆盖层、OCR 任务衔接与颜色状态补充 |

---

## 设置页结构

设置页按功能分组展示。当前主要入口包括：

```text
工具入口 / 悬浮球 / 指针 / 工具面板 / 外观 / 动作与手势 / 运行记录 / 设置结构
```

### 指针分类子块

「指针」分类已按用途拆成子块，手机竖屏普通设置面板和宽屏分栏详情页都使用同一套分组逻辑。

```text
指针
├─ 基础
│  ├─ 指针大小(%)
│  ├─ 横向贴边范围(dp)
│  └─ 纵向贴边范围(dp)
│
├─ 悬停
│  ├─ 悬停取字时间(ms)
│  └─ 悬停框选时间(ms)
│
├─ 取字保护
│  └─ 小框回退取字
│
├─ 框选 OCR
│  ├─ OCR最小宽度(dp)
│  ├─ OCR最小高度(dp)
│  ├─ OCR最小面积(dp²)
│  └─ OCR最小拖动距离(dp)
│
├─ 指针颜色
│  ├─ 指针普通颜色
│  ├─ 指针悬停颜色
│  ├─ 指针命中颜色
│  ├─ 取字就绪指针颜色
│  └─ 取字就绪边框颜色
│
└─ 框选 OCR 颜色
   ├─ 框选区域颜色
   └─ 截图识别颜色
```

### 指针取字与框选逻辑

指针用于减少主面板按钮入口，核心手势如下：

```text
单击悬浮球       打开 / 关闭主面板
长按悬浮球       打开设置面板
按住并拖动悬浮球 出现屏幕指针
拖到文字后松手   悬停时间满足后取字复制
满足悬停时间     指针切换为取字就绪颜色
继续悬停         进入框选 OCR 预备
拖出有效大框     松手截图 OCR 并复制
小框误触         回退复制原文字，不截图
```

### 小框回退 / 大框 OCR

识别到文字并绘制文字布局边框后，如果继续悬停进入框选：

1. 框选区域小于阈值时，不执行截图 OCR。
2. 如果来自已识别文字状态，则回退复制原文字。
3. 手指还未松开且小框未达阈值时，会继续显示原文字布局边框。
4. 框选区域超过阈值后，才切换为 OCR 框选框。

有效 OCR 框选由以下 DIY 阈值共同决定：

| 设置项 | 默认值 | 说明 |
|---|---:|---|
| 小框回退取字 | 开启 | 小框误触时回退原文字 |
| OCR最小宽度(dp) | 56 | 宽度低于该值不执行 OCR |
| OCR最小高度(dp) | 20 | 高度低于该值不执行 OCR |
| OCR最小面积(dp²) | 1200 | 面积低于该值不执行 OCR |
| OCR最小拖动距离(dp) | 24 | 拖动距离低于该值不执行 OCR |

### 指针颜色状态

指针颜色用于表达状态：

| 设置项 | 用途 |
|---|---|
| 指针普通颜色 | 默认拖动 / 未命中状态 |
| 指针悬停颜色 | 停到文字上但未达到悬停取字时间 |
| 指针命中颜色 | 兼容旧命中 / fallback 状态 |
| 取字就绪指针颜色 | 已满足 `POINTER_TEXT_HOVER_MS`，此时松手可取字 |
| 取字就绪边框颜色 | 已满足悬停取字时间时，文字目标框边框颜色 |
| 框选区域颜色 | 进入框选 OCR 后的区域框 |
| 截图识别颜色 | 截图 / OCR / 复制处理中 |

### 旧 schema 缓存刷新

`schema.json` 是实机本地缓存。新增或调整指针设置项后，`th_01_base.js` 会检查旧 schema 是否缺少或残留旧字段。命中以下情况时会自动重置为最新默认 schema：

- 缺少指针大小、贴边范围、悬停时间、OCR 阈值或颜色项。
- 指针设置项的名称、类型、范围或步进与当前默认 schema 不一致。
- 旧设置页返回手势字段仍残留在 schema 中。

这样可以避免升级后设置 UI 不显示新指针选项。

---

## UI 与交互结构

### ToolApp 设置页

- 设置、按钮管理、按钮编辑、设置结构编辑统一运行在 ToolApp Shell 内。
- 顶部栏提供返回与关闭，子页面优先通过页面栈返回。
- 页面栈保存完整页面快照，支持多级页面继续返回。
- 系统返回键会优先回到上一页；没有上一页时关闭 ToolApp。
- 面板尺寸按屏幕自适应，减少小屏溢出与大屏空白。
- 横屏 / 平板宽屏下可进入 master-detail 双栏布局。
- 欢迎卡内置更新状态胶囊，显示最新 / 已同步 / 普通更新 / 更新异常等状态。
- 点击更新胶囊可展开详情，展示 release notes、更新源、校验模式、安全状态和本次同步模块。

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

相关配置：

| 配置项 | 作用 |
|---|---|
| `TOOLAPP_BACK_GESTURE_MODE` | 返回模式：edge / surface / off |
| `TOOLAPP_BACK_EDGE_WIDTH_DP` | edge 模式边缘宽度 |
| `TOOLAPP_BACK_COMMIT_DISTANCE_DP` | 松手完成返回距离 |
| `TOOLAPP_BACK_SURFACE_SLOP_DP` | surface 模式起判阈值 |
| `TOOLAPP_BACK_PROGRESS_DISTANCE_DP` | 预览动画进度距离 |

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
| `pointer` | 启动屏幕指针，支持取字、框选区域、OCR rect 输出 |

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

## 安全更新机制

当前更新链路：

1. `ToolHub.js` 内置可信 RSA 公钥。
2. 远端仓库分发 `manifest.json`、`manifest.sig`、`code/*.js`。
3. 入口下载 `manifest.json`。
4. `UPDATE_SECURITY_MODE = 1` 时按 manifest 校验模块 `size` 和 `sha256`。
5. `UPDATE_SECURITY_MODE = 2` 时额外下载 `manifest.sig` 并使用 `SHA256withRSA` 验签。
6. 完整验签模式会检查 `manifest.keyId`、最低可信版本和本地已信任版本。
7. 每个模块下载到 `.tmp`。
8. 校验通过才覆盖本地模块。
9. 启动阶段发现可信本地模块落后于远端清单时，保留当前模块并标记“可更新”。
10. 设置页点击“立即更新”后下载覆盖模块，再点击“重启 ToolHub”让新模块生效。
11. 所有模块加载正常后，保存本地可信清单版本。

当前 keyId：

```text
toolhub-targets-20260703-rsa3072
```

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
- ToolApp 返回调试记录
- 指针取字、框选 OCR、回退取字异常
- 模块体积告警

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

### 修改 README / STRUCTURE / ARCHITECTURE

只改以下文档不需要重新签名，因为它们不参与手机端模块校验：

```text
README.md
STRUCTURE.md
ARCHITECTURE.md
```

### 注意事项

- Rhino / ShortX JS 中统一使用 `var`，避免 `let` / `const`。
- 顶层不要使用 `return`。
- 入口文件是信任根，改动后需要用户手动替换 ShortX 任务中的入口。
- 不要把私钥提交到仓库。
- 不建议把调试细节塞进启动返回 JSON，优先写日志。
- 模块加载顺序不要随意改，尤其是 `th_14_*`、`th_15_extra.js`、`th_16_entry.js`、`th_17_pointer.js`、`th_18_pointer_ocr.js`。

---

## 模块加载顺序

当前顺序大致是：

```text
base → core → icon / theme / persistence / parser / content
→ animation / shell / action / rebuild
→ panel_ui → panels → button_shortcut / button_icon_editor / button_editor
→ color_picker / icon_picker / schema_editor
→ extra → entry → pointer → pointer_ocr
```

注意：

- `th_14_color_picker.js` 依赖 `th_14_panels.js` 的弹窗基础能力。
- `th_14_button_shortcut.js`、`th_14_button_icon_editor.js`、`th_14_button_editor.js` 位于 `th_14_panels.js` 之后。
- `th_14_icon_picker.js` 应位于 `th_14_panels.js` 之后、`th_15_extra.js` 之前。
- `th_15_extra.js` 依赖前面 UI、主题、设置、页面构建能力。
- `th_16_entry.js` 负责真正启动实例。
- `th_17_pointer.js` 接入按钮动作分发和悬浮球拖动路径。
- `th_18_pointer_ocr.js` 补充框选截图 OCR 和覆盖层处理。

---

## 后续拆分建议

当前仍偏大的模块：

```text
th_15_extra.js
th_14_panels.js
th_14_button_editor.js
th_17_pointer.js
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
├── PointerSettingsBlocks
├── UpdateStatusCard
└── CommonPopupOverlay

th_17_pointer.js
├── PointerWindow
├── PointerTextPick
├── PointerAreaSelect
├── PointerSmallAreaFallback
└── PointerStateColor
```

短期不建议大规模重构。更稳的做法是每次只拆一个页面或一个手势模块，并同步更新 `manifest.json` 与签名。

---

## 更新记录

### 2026-07-07

**指针设置与取字 / OCR 体验更新**

- 新增指针设置分组，接入指针大小、横向贴边范围、纵向贴边范围、悬停取字时间、悬停框选时间等可调项。
- 接入指针普通、悬停、命中、框选区域、截图识别等状态颜色。
- 修复指针大小设置、悬停取字时间、颜色状态可见性和文字边框悬停 / 命中颜色。
- 新增“小框回退取字 / 大框执行 OCR”策略，减少识别到文字后误触发截图 OCR。
- 新增 OCR 最小宽度、高度、面积和拖动距离阈值，用户可在设置页快速调整。
- 优化小框回退取字预览：手指未松开且框选区域仍小于阈值时，继续显示原文字布局边框。
- 设置页「指针」分类按基础、悬停、取字保护、框选 OCR、指针颜色、框选 OCR 颜色分块展示，并修复手机竖屏普通设置面板未分块的问题。

### 2026-07-04

**设置页按钮管理布局优化**

- 按钮管理页改为紧凑列表，支持启用 / 暂停统计、搜索筛选、状态 chip 和更多菜单。
- 新增排序模式，列表常态保留浏览信息，排序时集中显示上移和下移。
- 修复了因启停动作绕过底部保存导致撤销语义失效的问题，按钮管理改动统一通过“保存布置”生效。

### 2026-07-03

**修复旧 UI 残留与安全更新增强**

- 修复了因更新重启关闭未等待完成导致旧 UI 残留的问题。
- 更新重启前会广播关闭并清扫已注册实例，等待旧悬浮窗释放后再启动新实例。
- 关闭流程取消 View 动画并使用 `removeViewImmediate`，完成后标记 `state.closed` 并从实例注册表移除。
- 统一设置页文案，把“气球 / 小屋 / 蓝图 / 岛屿”等拟物名称调整为“悬浮球 / 工具面板 / 设置结构 / 设置”。
- 新增 `scripts/verify_schema_validator.py`，用于校验设置结构、ConfigValidator 和关键文案。
- 默认启用完整安全更新链路：manifest 验签 + SHA256/size + 防回滚。

### 2026-05-23

**模块化与结构整理**

- 新增 `STRUCTURE.md`，整理整体结构、启动链路、模块职责、ToolApp 页面栈和返回手势结构。
- 拆分 ShortX 图标选择器到 `th_14_icon_picker.js`。
- 拆分颜色面板到 `th_14_color_picker.js`。
- 拆分设置结构编辑器到 `th_14_schema_editor.js`。
- README 补充 surface 滑动返回、子控件冲突处理、按钮动作类型、持久化结构和后续拆分建议。

### 2026-05-22

**设置页响应式与横屏适配**

- 优化 ToolHub 设置页响应式布局。
- 新增横屏 master-detail 双栏布局，平板 / 横屏下可保留设置详情。
- 改进 ToolApp 横屏边缘返回处理，减少横屏状态下返回手势异常。

---

## 兼容约束

- 运行环境：ShortX JS / Rhino ES5。
- 语法要求：统一使用 `var` 和 ES5 写法。
- Android UI：优先使用 WindowManager、FrameLayout、Canvas、自绘或原生 View 组合。
- 不依赖 WebView。
- 涉及 root / shell 的能力应通过配置、日志和用户明确动作触发，避免静默执行高风险命令。
