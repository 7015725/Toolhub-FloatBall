# ToolHub-FloatBall 整体结构说明

更新时间：2026-07-03

本文档用于整理 `7015725/Toolhub-FloatBall` 当前代码结构、启动链路、模块职责和主要状态流。项目运行环境为 **ShortX / Rhino ES5 JavaScript**，入口文件负责安全更新和模块加载，核心业务集中挂载到 `FloatBallAppWM.prototype`。

维护要求：每次修改或调整 ToolHub 后，必须同步推送到 GitHub 和 Gitea 两个仓库。

---

## 1. 总体架构

```text
ShortX JS 任务
   │
   ▼
ToolHub.js
   ├─ 选择更新源：Gitea / GitHub
   ├─ 拉取 manifest.json / manifest.sig
   ├─ 校验版本 / 签名 / sha256 / size
   ├─ 下载或复用本地 code/th_*.js
   ├─ eval 加载子模块
   ▼
FloatBallAppWM
   ├─ 悬浮球 WindowManager View
   ├─ 主按钮面板
   ├─ ToolApp 设置页 / 页面栈
   ├─ 按钮动作分发
   ├─ 返回手势 / 预测性返回
   └─ 配置与按钮持久化
```

核心对象：`FloatBallAppWM`。

---

## 2. 仓库结构

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
│   └── th_16_entry.js
└── scripts/
    ├── generate_signed_manifest.py
    ├── verify_manifest.py
    ├── verify_button_editor_layout.py
    ├── verify_schema_validator.py
    ├── verify_toolapp_adaptive_size.py
    └── verify_toolapp_single_root.py
```

当前实际加载 **21 个子模块**。`th_14_*` 已拆出按钮快捷方式、按钮图标编辑、按钮编辑、颜色选择器、图标选择器和 schema 编辑器；`th_07_shortcut.js` 已退役，快捷方式选择能力由 `th_14_button_shortcut.js` 承载。

当前编号存在历史空洞：`th_06` 后直接到 `th_08`。这是为降低更新风险而有意保留，不是遗漏；本仓库不会为了填补空号重命名历史文件，避免影响 `ToolHub.js`、`manifest.json`、旧缓存和实机稳定性。

---

## 3. 子模块命名规则

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

## 4. 实机目录

```text
shortx.getShortXDir()/ToolHub/
├── code/                         # 本地缓存子模块
│   ├── th_01_base.js
│   ├── ...
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

---

## 5. 启动链路

入口文件 `ToolHub.js` 主要流程：

```text
1. ensureCodeDir()
2. fetchTrustedManifest()
3. 遍历 modules[]
4. loadScript(relPath)
5. 根据安全模式下载 / 校验 / 复用本地模块
6. eval(code)
7. 检查 getProcessInfo / ToolHubLogger / FloatBallAppWM
8. new ToolHubLogger(entryInfo)
9. installCrashHandler(logger)
10. new FloatBallAppWM(logger)
11. app.startAsync(entryInfo, closeRule)
```

当前入口配置：

```javascript
var UPDATE_SOURCE = 1;          // 0: Gitea, 1: GitHub
var UPDATE_SECURITY_MODE = 2;   // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新
```

关键模块：

```text
th_01_base.js
th_16_entry.js
```

这两个模块失败会导致入口中断。其他模块失败会进入 `loadErrors`，但不一定立刻中断，可能在运行期暴露功能缺失。

---

## 6. 模块职责

| 模块 | 职责 |
|---|---|
| `th_01_base.js` | 基础工具、配置校验、路径常量、文件 IO、原子写、防抖写、日志基础 |
| `th_02_core.js` | `FloatBallAppWM` 构造函数、核心 state 初始化、基础方法、UI 工具对象初始化 |
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
| `th_16_entry.js` | 主线程同步、广播注册、实例注册、`startAsync`、`close`、`dispose`、设置页重启 |

---

## 7. FloatBallAppWM 状态结构

```text
state
├── WindowManager / 线程
│   ├── wm
│   ├── ht
│   ├── h
│   ├── receivers
│   └── displayListener
├── 屏幕状态
│   ├── screen
│   ├── lastRotation
│   └── lastMonitorTs
├── 悬浮球
│   ├── ballRoot
│   ├── ballContent
│   ├── ballLp
│   ├── addedBall
│   ├── dragging
│   ├── docked
│   └── dockSide
├── 面板
│   ├── panel / panelLp / addedPanel
│   ├── settingsPanel / settingsPanelLp / addedSettings
│   ├── viewerPanel / viewerPanelLp / addedViewer
│   └── viewerPanelType
├── ToolApp
│   ├── toolAppActive
│   ├── toolAppNavStack
│   ├── toolAppRoute
│   ├── toolAppRoot
│   ├── toolAppBody
│   ├── toolAppContentHost
│   ├── toolAppBackPreviewView
│   └── toolAppBackPreviewReady
├── 配置编辑
│   ├── pendingUserCfg
│   ├── pendingDirty
│   └── previewMode
├── closing
└── closed
```

---

## 8. UI 层级

```text
悬浮球 ballRoot
└── ballContent

主面板 panel
└── GridLayout 按钮网格

遮罩 mask
└── 点击空白关闭所有面板

viewerPanel
├── 普通日志 / 内容查看器
└── ToolApp Shell
    ├── 顶部栏：返回 / 关闭 / 手册
    └── 内容区：设置主页 / 设置分组 / 按钮管理 / 按钮编辑 / schema 编辑
```

设置类 UI 当前主要走 ToolApp Shell，而不是旧式单层设置面板。

---

## 9. ToolApp 页面栈

典型页面路径：

```text
settings
├── settings_group
├── button_manager
│   └── btn_editor
└── schema_editor
```

设计重点：

- `toolAppNavStack` 保存完整页面快照。
- 返回优先 `popToolAppPage()`。
- 无上一级时关闭 ToolApp。
- 返回预览读取上一页快照，支持三级、四级、五级页面继续返回。
- 横屏 / 平板通过响应式布局支持更大宽度和双栏结构。

---

## 10. 返回手势结构

返回体系分三层：

```text
1. 系统返回键 / ESC
   └─ attachPanelSystemKeyHandler()
      └─ handlePanelBack()

2. Android 13+ / 14+ 预测性返回
   └─ registerPanelPredictiveBack()
      ├─ OnBackAnimationCallback
      ├─ OnBackInvokedCallback
      └─ applyPanelPredictiveBackProgress()

3. ToolApp 内置左右滑返回
   └─ buildToolAppShell() 自定义 FrameLayout
      ├─ onInterceptTouchEvent()
      ├─ onTouchEvent()
      ├─ prepareToolAppBackPreview()
      ├─ applyToolAppBackPreviewProgress()
      └─ finishToolAppBackPreview()
```

返回模式：

```text
edge      左右边缘触发
surface   页面任意位置横滑触发
off       关闭内置滑动返回
```

当前 surface 模式更适合全面屏手势环境。edge 模式容易被系统手势抢占，触发范围会显得很窄。

---

## 11. 子控件冲突处理

ToolApp 内置返回手势策略：

```text
ACTION_DOWN 永远放行给子控件
ACTION_MOVE 达到横滑阈值后再判断是否拦截
强横向滑动才接管返回
SeekBar / Switch / EditText / HorizontalScrollView 做细粒度阻断
普通按钮 / 卡片 / 垂直列表项不阻断 surface 返回
```

相关配置：

| 配置项 | 作用 |
|---|---|
| `TOOLAPP_BACK_GESTURE_MODE` | 返回模式：edge / surface / off |
| `TOOLAPP_BACK_EDGE_WIDTH_DP` | edge 模式边缘宽度 |
| `TOOLAPP_BACK_COMMIT_DISTANCE_DP` | 松手完成返回距离 |
| `TOOLAPP_BACK_SURFACE_SLOP_DP` | surface 模式起判阈值 |
| `TOOLAPP_BACK_PROGRESS_DISTANCE_DP` | 预览动画进度距离 |

---

## 12. 按钮动作分发

统一入口：

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

## 13. 配置与持久化

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
   ├─ pendingUserCfg 临时编辑
   ├─ previewMode 实时预览
   └─ ConfigManager.saveSettings() 落盘
```

持久化策略：

- 原子写：临时文件 → flush / sync → rename。
- 防抖写：连续修改合并保存。
- `close()` 时执行 `FileIO.flushDebouncedWrites()`。

---

## 14. 悬浮球位置与横竖屏适配

位置相关配置：

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
- 吸边状态优先按 `left/right` 恢复到对应边缘。
- 兼容旧版只保存竖屏像素导致横屏跑到屏幕中间的问题。

---

## 15. 生命周期

### startAsync

```text
1. 生成关闭广播 action
2. 创建 HandlerThread
3. 注册关闭广播 / 配置变化广播 / 系统对话框关闭广播
4. 创建悬浮球 View
5. addView 到 WindowManager
6. 启动屏幕旋转监控
7. 返回启动结果 JSON
```

入口在创建新实例前会检查 `TOOLHUB_ACTIVE_APP`，并通过 `closeToolHubAppsForRestart()` 先关闭旧实例。

### close

```text
1. 标记 closing
2. 取消吸边定时器与未完成动画
3. 停止屏幕监听
4. 保存悬浮球位置
5. flush 待写配置
6. 使用 removeViewImmediate 移除所有面板和悬浮球
7. 注销广播接收器
8. 退出 HandlerThread
9. 标记 state.closed 并从实例注册表移除
10. 清理图标 / shortcut 缓存
```

### restartToolHubFromSettings

```text
1. 设置页点击“重启 ToolHub”
2. 设置 TOOLHUB_UPDATE_STATE.status = restarting
3. 广播关闭 action 清理旧实例
4. 遍历 TOOLHUB_APP_REGISTRY 并逐个 close
5. 对旧实例 Handler 投递 close，并用 CountDownLatch 等待关闭完成
6. 重新读取本地模块并创建新 FloatBallAppWM
7. 新实例 startAsync 后更新状态为 latest
```

---

## 16. 安全更新机制

```text
ToolHub.js 内置 RSA 公钥
   │
   ▼
下载 manifest.json / manifest.sig
   │
   ▼
校验 alg / keyId / RSA 签名
   │
   ▼
校验 manifest version 防回滚
   │
   ▼
逐个下载 code/th_*.js 到 .tmp
   │
   ▼
校验 size / sha256
   │
   ▼
通过后覆盖本地模块
   │
   ▼
保存 trusted sha / trusted manifest version
```

当前 `manifest.json` 信息：

```text
schema: 3
version: 20260703110021
alg: SHA256withRSA
keyId: toolhub-targets-20260703-rsa3072
files: 21 个模块
```

---

## 17. 维护注意事项

修改 `code/*.js` 或 `ToolHub.js` 后，需要重新生成签名清单：

```bash
scripts/generate_signed_manifest.py
```

会更新：

```text
manifest.json
manifest.sig
ToolHub.js.sha256
```

模块加载顺序不建议随意调整。当前顺序大致是：

```text
base → core → icon/theme/persistence/parser/content
→ animation/shell/action/rebuild
→ panel_ui → panels → button_shortcut / button_icon_editor / button_editor
→ color_picker / icon_picker / schema_editor → extra → entry
```

尤其注意：

- `th_14_color_picker.js` 依赖 `th_14_panels.js` 的弹窗基础能力。
- `th_14_icon_picker.js` 应位于 `th_14_panels.js` 之后、`th_15_extra.js` 之前。
- `th_15_extra.js` 依赖前面 UI、主题、设置、页面构建能力。
- `th_16_entry.js` 最后加载，负责启动实例。

---

## 18. 当前结构观察

### 优点

- 已从单文件演进为模块化结构。
- 更新链路有 manifest、sha256、签名、防回滚设计。
- UI 状态集中在 `FloatBallAppWM.state`，便于定位问题。
- ToolApp 页面栈已具备 App 化导航基础。
- surface 滑动返回比纯边缘触发更适合全面屏手势。
- 配置写入有原子写和防抖机制，适合长期运行。

### 风险点

- `th_15_extra.js` 和 `th_14_panels.js` 仍偏大，后续建议继续拆分。
- 大量方法挂载到同一个 prototype，隐式依赖较多。
- 入口文件是信任根，升级入口仍需要用户手动替换 ShortX JS 任务内容。
- 文档中的模块数量需要持续与 `manifest.json` 保持一致。
- 非关键模块加载失败后可能继续启动，运行期才暴露缺失方法。

---

## 19. 建议拆分方向

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
├── ButtonEditorPage
└── CommonPopupOverlay

th_09_animation.js
├── BallDockAnimation
├── PanelVisibility
├── PredictiveBack
└── CacheCleanup
```

短期不建议大规模重构。更稳的做法是每次只拆一个页面或一个手势模块，并同步更新 `manifest.json` 与签名。
