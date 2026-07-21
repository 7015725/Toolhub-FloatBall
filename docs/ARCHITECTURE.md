# ToolHub 技术架构

更新时间：2026-07-20

本文基于当前 `main` 分支整理，只描述仓库中已经存在的代码结构与机制。项目当前实际加载 **29 个子模块**；`th_07_shortcut.js` 已退役，快捷方式选择能力由 `th_14_button_shortcut.js` 承载，指针取字能力由 `th_17_pointer.js` 承载，框选 OCR 由 `th_18_pointer_ocr.js` 承载，固定位置、指针布局和悬浮球重建回滚由 `th_19_position_state.js` 承载，主按钮面板由 `th_15_main_panel.js` 承载，拾字工具由 `th_20_pickword.js` 承载，顶部结果预览由 `th_21_result_preview.js` 承载，拾字截图查看与生命周期由 `th_22_image_viewer.js` 承载，截图管理列表由 `th_23_screenshot_manager.js` 承载。
- 主面板尺寸遵循“网格决定面板宽高”：`gridWidth = cols × cellOuterWidth`，`panelWidth = gridWidth + 2 × panelPadding`；完整网格高度、可视高度和页脚共同反推面板高度，WindowManager 使用相同的 `EXACTLY` 宽高。

---

## 1. 项目定位

ToolHub 是面向 **ShortX / Rhino ES5 JavaScript 环境** 的 WindowManager 悬浮球工具框架。

核心定位：

```text
ShortX JS 任务入口
  └─ ToolHub.js
      └─ FloatBallAppWM
          └─ WindowManager 悬浮球 / 面板 / ToolApp 工具框架
```

关键对象：

- `ToolHub.js`：粘贴到 ShortX JS 任务中的入口文件，是更新、校验、加载和启动的信任根。
- `FloatBallAppWM`：核心运行对象，负责状态、WindowManager View、配置、按钮动作、ToolApp 页面栈和生命周期。
- `WindowManager`：承载悬浮球、主面板、遮罩、查看器和 ToolApp Shell。
- `code/th_*.js`：入口按顺序加载的子模块，当前为 29 个。

---

## 2. 总体架构

```text
ShortX JS 任务
   │
   ▼
ToolHub.js
   │
   ├─ ensureCodeDir()
   │    └─ 准备 shortx.getShortXDir()/ToolHub/code/
   │
   ├─ fetchTrustedManifest()
   │    ├─ 普通更新模式：跳过签名 / manifest 严格校验
   │    ├─ manifest 哈希校验模式：读取 manifest.json
   │    └─ 完整验签模式：读取 manifest.json + manifest.sig
   │
   ├─ 遍历 modules[]
   │    └─ loadScript(relPath)
   │         ├─ 下载或复用本地子模块
   │         ├─ 校验 size / sha256（安全模式）
   │         └─ eval(code)
   │
   ├─ installCrashHandler(logger)
   │
   └─ new FloatBallAppWM(logger).startAsync(...)
        │
        ├─ HandlerThread 承载 WindowManager View 操作
        ├─ Main Looper 注册广播与系统回调
        ├─ 悬浮球 ballRoot / ballContent
        ├─ 主面板 panel
        ├─ viewerPanel / ToolApp Shell
        ├─ 按钮动作分发
        └─ 配置、日志、关闭与清理
```

数据与控制流：

```text
用户点击悬浮球
   │
   ▼
ballRoot / ballContent Touch
   │
   ├─ 拖拽 / 吸边 / 保存位置
   └─ 打开主面板 panel
          │
          ▼
      顶部工具栏 + 自适应按钮网格
          │
          └─ execButtonAction(btn, idx)
                 ├─ open_settings → ToolApp 设置
                 ├─ open_viewer   → viewerPanel
                 ├─ toast         → Toast
                 ├─ app           → PackageManager / startActivityAsUser
                 ├─ shell         → Shell 广播桥
                 ├─ broadcast     → 自定义广播
                 ├─ shortcut      → 默认启动 intentUri；legacy_js 仅兼容历史按钮
                 ├─ content       → ContentProvider 受控读写 / 展示
                 └─ pointer       → 屏幕指针取字 / 框选区域
```

---

## 3. 模块分层

当前实际加载 29 个子模块，入口 `modules[]` 顺序如下：

```text
基础能力层
  th_01_base.js
  th_02_core.js
  th_03_icon.js
  th_04_theme.js
  th_05_persistence.js
  th_06_icon_parser.js
  th_08_content.js
  th_09_animation.js

执行与动作层
  th_10_shell.js
  th_11_action.js
  th_12_rebuild.js

UI 基础与页面层
  th_13_panel_ui.js
  th_14_panels.js
  th_14_button_shortcut.js
  th_14_button_icon_editor.js
  th_14_button_editor.js
  th_14_color_picker.js
  th_14_icon_picker.js
  th_14_schema_editor.js
  th_15_extra.js
  th_15_main_panel.js

生命周期入口层
  th_16_entry.js

指针交互层
  th_17_pointer.js
  th_18_pointer_ocr.js
  th_19_position_state.js

结果与拾字 UI 层
  th_20_pickword.js
  th_21_result_preview.js

拾字截图与管理层
  th_22_image_viewer.js
  th_23_screenshot_manager.js
```

模块职责：

```text
th_01_base.js
  基础工具、路径常量、配置校验、ConfigManager、ConfigValidator、FileIO、日志基础、Base64、默认配置、默认 schema、旧 schema 自动刷新。

th_02_core.js
  完全结构化 SQLite、旧配置迁移、防抖并发写入，以及 FloatBallAppWM 核心状态和基础方法。

th_03_icon.js
  图标加载、图标缓存、Drawable / Bitmap 处理、悬浮球图标解析。

th_04_theme.js
  屏幕尺寸、旋转、Toast、振动、动物岛主题、Monet 动态颜色、Drawable 构造、startActivityAsUser 辅助。

th_05_persistence.js
  设置保存、悬浮球位置保存、pendingUserCfg、previewMode、实时预览、配置持久化刷新。

th_06_icon_parser.js
  ShortX 图标解析、图标目录扫描、图标名回退。

th_08_content.js
  ContentProvider query/get/view 与 put/update/insert/delete；读取和写入分别受独立白名单控制。

th_09_animation.js
  悬浮球动画、吸边、面板显示隐藏、mask、系统返回键、预测性返回、面板清理。

th_10_shell.js
  Shell 广播桥执行层。

th_11_action.js
  execButtonAction(btn, idx)，按钮动作分发：设置、查看器、Toast、App、Shell、Broadcast、Shortcut、Content、Pointer。

th_12_rebuild.js
  悬浮球重建，尺寸 / 图标 / 配置变化刷新。

th_13_panel_ui.js
  设置项基础 UI：section、bool、int、float、action、文本输入等组件。

th_14_panels.js
  设置主页、设置分组、指针设置子块、按钮管理入口、弹窗基础、主题适配、更新状态展示。

th_14_button_shortcut.js
  内联快捷方式选择、快捷方式图标异步加载与回填。

th_14_button_icon_editor.js
  按钮图标来源、ShortX 图标预览、图标调色内联编辑与颜色联动。

th_14_button_editor.js
  按钮管理紧凑列表、搜索筛选、状态 chip、更多菜单、排序模式、按钮编辑页、动作参数、保存校验与页面内反馈。
- 按钮编辑页的“保存”通过 `ConfigManager.saveButtons()` 直接提交当前按钮事务，成功后同步 `panels.main` 与 `tempButtons`；列表页仍负责排序、启停、复制和删除的批量保存。

th_14_color_picker.js
  颜色选择器：常用色、最近色、RGB、透明度、实时预览。

th_14_icon_picker.js
  ShortX 图标选择器：搜索、分页、收藏、最近、过滤、Overlay。

th_14_schema_editor.js
  设置结构编辑器。

th_15_extra.js
  查看器面板、通用面板定位与显示、ToolApp Shell、页面栈、响应式布局、左右滑返回预览。

th_15_main_panel.js
  主按钮面板顶部工具栏、可配置自适应网格、安全区域避让、分页吸附与圆点导航、方向展开/退出动画、实时运行状态和显式编辑模式拖动排序。
- 网格列数由安全宽度、`PANEL_WIDTH_PERCENT`、`PANEL_AUTO_MAX_COLS`、`PANEL_MIN_CARD_WIDTH_DP`、间距和内边距动态计算；`PANEL_CARD_HEIGHT_DP` 与 `PANEL_ROWS` 控制卡片高度和可视行数。
- 设置加载时通过 `ConfigValidator.sanitizeConfig()` 规范化旧越界值并回写结构化 SQLite；旧默认透明度 `0.85` 一次性迁移到 `0.92`，其他自定义透明度保持不变。单页隐藏分页圆点并使用 8dp 底部留白，多页才创建圆点导航。
- 主面板退出动画结束后，旧 View 先保持不可见，注销预测性返回时跳过视觉复位，再通过 `removeViewImmediate()` 移除；generation 只允许最新关闭事务清理共享状态。

th_16_entry.js
  runOnMainSync、registerReceiverOnMain、startAsync、close、dispose、实例注册、设置页重启与生命周期收尾。

th_17_pointer.js
  屏幕指针、悬停取字、取字就绪视觉状态、框选区域、小框回退取字、OCR rect 输出。

th_18_pointer_ocr.js
  框选截图 OCR 处理、截图区域覆盖层、OCR 任务衔接、指针边框颜色状态补充。

th_19_position_state.js
  悬浮球固定位置状态机、指针布局适配、语义回调会话隔离和尺寸重建事务回滚。

th_20_pickword.js
  拾字文字选择、复制、翻译、钉屏、放大镜和完整资源清理。

th_21_result_preview.js
  状态栏下方的两行全自绘结果预览、自动消失、连续结果替换和拾字入口。

th_22_image_viewer.js
  拾字截图缩略图、同窗原图查看、缩放平移、大图区域解码、保存、分享、删除和自动清理。

th_23_screenshot_manager.js
  截图管理器列表、内部与已保存分类、缩略图缓存、外部打开和删除入口。
```

说明：

- `th_07_shortcut.js` 已退役。
- `th_07` 编号空洞保留，历史文件名保持稳定，避免影响入口加载表、manifest、旧缓存和实机稳定性。
- 当前仍存在 `th_14_*` 多个模块，这是历史演进结果；新模块命名规则见本文后续章节。

---

## 4. 启动机制

更新源固定为 GitHub，不再保留其他镜像源或运行时来源切换。

入口启动链：

```text
ToolHub.js
  │
  ├─ ensureCodeDir()
  │    ├─ 创建 shortx.getShortXDir()/ToolHub/code/
  │    ├─ 检查 / 修复 chmod 700
  │    └─ 检查 / 修复 chown 1000:1000
  │
  ├─ fetchTrustedManifest()
  │    ├─ 根据 UPDATE_SECURITY_MODE 选择校验策略
  │    ├─ 下载 manifest.json
  │    ├─ 必要时下载 manifest.sig
  │    └─ 设置 __trustedManifest / __securityStatus
  │
  ├─ loadScript(relPath)
  │    ├─ 普通模式：ensurePlainRemoteModule()
  │    ├─ manifest 模式：ensureVerifiedModule()
  │    ├─ 完整验签且远端不可用：ensureLocalTrustedModule()
  │    ├─ readTextFile()
  │    └─ 间接 eval(code)
  │
  ├─ getProcessInfo("entry")
  ├─ new ToolHubLogger(entryInfo)
  ├─ installCrashHandler(logger)
  ├─ new FloatBallAppWM(logger)
  └─ app.startAsync(entryInfo, closeRule)
```

关键点：

- `ToolHub.js` 顶部当前配置：

```javascript
var UPDATE_SECURITY_MODE = 2; // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新
```

- `UPDATE_SECURITY_MODE` 当前默认是 `2`，即完整验签安全更新模式；只有明确值 `0` 才进入普通模式，无效值会强制回退到完整验签模式 `2`。
- 入口中 `criticalModules` 包含 `th_01_base.js`、`th_02_core.js`、`th_05_persistence.js`、`th_16_entry.js` 和 `th_19_position_state.js`，任一加载失败都会中断启动。
- 其他模块加载失败会记录到 `loadErrors`；悬浮球仍能启动时返回 `degraded`，不会再误报为完整成功。
- 入口启动结果使用 `healthy / degraded / failed` 三态，并汇总安全状态、同步状态、布局、关闭广播、更新模块和加载异常。

---

## 5. 安全更新机制

安全更新链：

```text
ToolHub.js 内置 RSA 公钥
   │
   ▼
下载 manifest.json / manifest.sig
   │
   ├─ 校验 alg / keyId / SHA256withRSA
   ├─ 校验 manifest version 与本地防回滚版本
   └─ 校验 modules[] 与 manifest.files 一致
   │
   ▼
把全部待更新模块下载到 .txn.tmp
   │
   ├─ 每个文件执行 size / sha256 校验
   └─ 所有文件均完成阶段校验后才进入切换
   │
   ▼
持久化 .module_update_transaction.json
   │
   ├─ 正式文件移动到 .txn.bak
   ├─ 阶段文件切换为正式文件
   └─ 安装清单、可信 SHA 和可信版本纳入同一事务
   │
   ▼
整批哈希复核后写入 .module_update_transaction.committed
   │
   ├─ 任一失败：逆序恢复整批备份
   ├─ 未提交中断：下次启动整批回滚
   └─ 已提交中断：下次启动完成清理
```

清单版本不在文档中固定写死，以仓库当前 `manifest.json` 为准。
涉及文件：

- `manifest.json`：模块清单，包含 `alg`、`files`、`keyId`、`schema`、`version`。
- `manifest.sig`：`manifest.json` 的签名文件。
- `ToolHub.js`：内置 `TRUSTED_PUBLIC_KEYS`、`DEFAULT_TRUSTED_KEY_ID`、`MIN_TRUSTED_MANIFEST_VERSION`。
- `ToolHub.js.sha256`：入口文件 SHA256 公示文件。

三种更新模式：

```text
UPDATE_SECURITY_MODE = 0
  普通更新模式：跳过签名 / manifest 严格校验，按远端文件更新。

UPDATE_SECURITY_MODE = 1
  manifest 哈希校验模式：读取 manifest.json，按 manifest 中的 size / sha256 校验模块。

UPDATE_SECURITY_MODE = 2
  完整验签安全更新：manifest.sig、RSA 公钥、SHA256withRSA、keyId、version、防回滚、size、sha256 全部校验。
```

防回滚与可信缓存：

- 入口内置 `MIN_TRUSTED_MANIFEST_VERSION`。
- 完整验签模式下，远端 `version` 小于最低可信版本会被拒绝。
- 本地保存 `.trusted_manifest_version`，远端版本小于本地可信版本会被拒绝。
- 每个通过校验的模块保存 `.trusted_sha_<module>`。
- 完整验签模式下，如果远端清单不可用，入口只允许复用本地已有可信 SHA 的模块，不盲目覆盖。

---

## 6. 本地缓存机制

实机目录：

```text
shortx.getShortXDir()/ToolHub/
├── code/
│   ├── th_01_base.js ... th_21_result_preview.js
│   ├── .installed_manifest.json
│   ├── .trusted_manifest_version
│   ├── .trusted_sha_<module>
│   ├── .module_update_transaction.json          # 事务期间临时存在
│   └── .module_update_transaction.committed     # 提交收尾期间临时存在
├── logs/
│   ├── init.log
│   └── ShortX_ToolHub_yyyyMMdd.log
└── toolhub.db
```

缓存职责：

```text
code/
  本地子模块缓存。入口按安全模式校验、事务更新或复用可信模块。

toolhub.db
  完全结构化 SQLite，保存设置、按钮、Schema 和迁移元数据。

logs/init.log
  入口启动、目录准备、manifest、事务恢复、安全更新和模块加载日志。

logs/ShortX_ToolHub_yyyyMMdd.log
  运行期日志文件。

.installed_manifest.json / .trusted_sha_<module> / .trusted_manifest_version
  保存当前安装状态、可信哈希和防回滚版本。
```

`settings.json`、`buttons.json` 和 `schema.json` 只作为旧版本迁移来源；迁移成功后会删除，不再作为当前持久化后端。

注意：`ToolHub.js` 入口本身不能安全地自我更新；入口变更仍需要用户手动替换 ShortX JS 任务中的入口内容。

---

## 7. 核心状态机制

`FloatBallAppWM` 在构造函数中初始化 `this.state`。核心状态按职责可分为：

```text
this.state
├── WindowManager / 线程
│   ├── wm
│   ├── dm
│   ├── ht
│   ├── h
│   ├── receivers
│   └── displayListener
│
├── 屏幕状态
│   ├── screen { w, h }
│   ├── lastRotation
│   └── lastMonitorTs
│
├── 悬浮球
│   ├── ballRoot
│   ├── ballContent
│   ├── ballLp
│   ├── addedBall
│   ├── dragging
│   ├── docked
│   ├── dockSide
│   └── ballRebuildActive
│
├── 面板 / 遮罩 / 查看器
│   ├── panel / panelLp / addedPanel
│   ├── settingsPanel / settingsPanelLp / addedSettings
│   ├── viewerPanel / viewerPanelLp / addedViewer
│   ├── viewerPanelType
│   ├── mask / maskLp / addedMask
│   └── panelBackCallbackEntries
│
├── ToolApp
│   ├── toolAppActive
│   ├── toolAppNavStack
│   ├── toolAppRoute
│   ├── toolAppRoot
│   ├── toolAppBody
│   ├── toolAppContentHost
│   ├── toolAppBackPreviewView
│   ├── toolAppBackPreviewRoute
│   ├── toolAppBackPreviewReady
│   ├── toolAppTitleView
│   ├── toolAppBackButton
│   ├── settingsGroupKey
│   ├── settingsHomeSelectedCategoryId
│   └── settingsHomeSelectedItemId
│
├── 配置编辑
│   ├── pendingUserCfg
│   ├── pendingDirty
│   ├── previewMode
│   └── buttonManagerQuery
│
├── closing
└── closed
```

状态设计要点：

- `this.config` 保存当前运行配置，来自 `ConfigManager.loadSettings()`。
- `this.panels.main` 保存当前按钮列表，来自 `ConfigManager.loadButtons()`。
- `pendingUserCfg` 是设置页临时编辑缓存，保存前不直接覆盖持久化配置。
- `previewMode` 控制边调边看时的预览刷新。
- `closing` 用于避免关闭流程中重复操作 WindowManager 和线程资源。

---

## 8. UI 机制

UI 层级：

```text
WindowManager
├── ballRoot
│   └── ballContent
│       └── 悬浮球内容 / 图标 / 背景
│
├── mask
│   └── 空白点击关闭面板
│
├── panel
│   └── 主按钮网格
│
└── viewerPanel
    ├── 普通查看器 / 日志 / content 结果
    └── ToolApp Shell
        ├── 顶部栏：返回 / 标题 / 右侧按钮
        └── 内容区
            ├── 设置主页
            ├── 设置分组
            ├── 按钮管理
            ├── 按钮编辑
            └── schema 编辑
```

主要 UI 类型：

```text
ballRoot / ballContent
  悬浮球根视图和内容视图。负责点击、拖拽、吸边和图标展示。

panel
  主按钮面板，显示按钮网格。

mask
  面板遮罩，负责点击空白关闭相关面板。

viewerPanel
  查看器容器，可显示日志、ContentProvider 结果，也承载 ToolApp Shell。

ToolApp Shell
  设置类 UI 的 App 化外壳。内部使用单根 View + 内容容器切页，避免每次切页都 remove/add 整个 overlay。
```

设置类页面：

- 设置主页：入口卡片、布局与管理、趣味元素、外观与互动、记录与状态等入口。
- 设置分组：按 schema 分组渲染配置项。
- 按钮管理：搜索、列表、启用/禁用、排序、删除、新增。
- 按钮编辑：一页式编辑，包含基础信息、图标外观、动作设置等区域。
- 按钮快捷方式与图标编辑：由拆分模块承载，减少主设置模块体积。
- schema 编辑：编辑设置页 schema。

---

## 9. ToolApp 页面栈机制

ToolApp 相关状态：

```text
toolAppActive
toolAppNavStack
toolAppRoute
toolAppRoot
toolAppBody
toolAppContentHost
toolAppBackPreviewView
toolAppBackPreviewRoute
toolAppBackPreviewReady
```

页面路径示例：

```text
settings
├── settings_group
├── button_manager
│   └── btn_editor
└── schema_editor
```

页面栈机制：

```text
showToolApp(route, resetStack)
   │
   ├─ resetStack=true 时初始化 toolAppNavStack
   ├─ ensureToolAppShell()
   ├─ buildPanelView(route)
   ├─ setToolAppContent(contentView)
   └─ updateToolAppShellChrome(title, canBack)

pushToolAppPage(route)
   │
   ├─ 保存当前 page snapshot
   ├─ push nextEntry
   └─ showToolApp(route, false)

popToolAppPage(reason)
   │
   ├─ 优先处理横屏 detail pane 返回目标
   ├─ toolAppNavStack.pop()
   ├─ 恢复上一页 snapshot
   └─ 无上一级时 closeToolApp()
```

page snapshot 主要保存：

- `route`
- 设置分组 key
- 设置首页横屏 master-detail 选择状态
- 按钮 / schema 编辑状态所需上下文

返回预览：

```text
用户横滑
   │
   ▼
prepareToolAppBackPreview()
   │
   ├─ 读取上一页 snapshot
   ├─ 构建预览页 View
   └─ 放入 toolAppBackPreviewView
   │
   ▼
applyToolAppBackPreviewProgress(progress)
   │
   └─ 当前页与预览页同步位移 / 透明度 / 缩放
   │
   ▼
finishToolAppBackPreview(commit)
   ├─ commit=true  → popToolAppPage("edge_swipe_back")
   └─ commit=false → 回弹并清理预览
```

支持多级页面返回，不限于一层子页。

---

## 10. 返回机制

返回体系：

```text
系统返回键 / ESC
   │
   └─ attachPanelSystemKeyHandler()
        └─ handlePanelBack()
             ├─ ToolApp: popToolAppPage(reason)
             └─ 非 ToolApp: 按 viewer / settings / panel 层级关闭

Android 13+ / 14+ 预测性返回
   │
   └─ registerPanelPredictiveBack(panel, which)
        ├─ OnBackInvokedCallback
        ├─ OnBackAnimationCallback
        ├─ applyPanelPredictiveBackProgress()
        └─ unregisterPanelPredictiveBack()

ToolApp 内置左右滑返回
   │
   └─ buildToolAppShell() 自定义触摸处理
        ├─ onInterceptTouchEvent()
        ├─ onTouchEvent()
        ├─ prepareToolAppBackPreview()
        ├─ applyToolAppBackPreviewProgress()
        └─ finishToolAppBackPreview()
```

返回模式：

```text
edge
  左右边缘触发。

surface
  页面 surface 横滑触发。当前更适合全面屏手势环境，优先级高于 edge 的窄边缘体验。

off
  关闭 ToolApp 内置滑动返回。
```

当前策略：

- `surface` 模式优先保证 ToolApp 内部横滑返回的可用性。
- 系统返回键和 ESC 仍通过焦点 View 的 key listener 处理。
- Android 13+ / 14+ 预测性返回使用系统回调能力；overlay 场景下视觉反馈由代码自管。

---

## 11. 手势冲突处理机制

ToolApp surface 返回的冲突处理原则：

```text
ACTION_DOWN
  永远先放行给子控件，不在 DOWN 阶段抢触摸。

ACTION_MOVE
  移动达到阈值后再判断是否拦截。

强横向滑动
  只有横向意图足够明确时才接管为返回手势。

可交互控件阻断
  SeekBar / Switch / EditText / HorizontalScrollView 等控件阻断返回手势，优先保证自身操作。

普通控件不阻断
  普通按钮 / 卡片 / 垂直列表项不阻断 surface 返回，避免页面大部分区域无法横滑返回。
```

相关配置项：

```text
TOOLAPP_BACK_GESTURE_MODE
TOOLAPP_BACK_EDGE_WIDTH_DP
TOOLAPP_BACK_COMMIT_DISTANCE_DP
TOOLAPP_BACK_SURFACE_SLOP_DP
TOOLAPP_BACK_PROGRESS_DISTANCE_DP
```

设计目标：

- 不让横滑返回覆盖普通点击。
- 不让 SeekBar、Switch、EditText、HorizontalScrollView 被误拦截。
- 在普通卡片和垂直列表上保持返回手势可用。

---

## 12. 按钮动作机制

统一入口：

```text
execButtonAction(btn, idx)
```

动作类型：

```text
open_settings
  打开设置 / ToolApp。

open_viewer
  打开查看器，常用于日志或内容展示。

toast
  显示 Toast。

app
  通过 PackageManager 获取 launch intent 并启动 App；支持 launchUserId。

shell
  执行 shell 命令，优先走 Shell 能力 / 广播桥；支持 cmd 与 cmd_b64。

broadcast
  发送自定义广播，兼容 extra / extras。

shortcut
  执行 shortcutJsCode，用于锁定主 / 分身快捷方式。

content
  通过 th_08_content.js 查询 / 获取 / 查看 ContentProvider 结果。
```

动作分发图：

```text
按钮点击
  │
  ▼
execButtonAction(btn, idx)
  │
  ├─ 参数归一化 / 日志
  ├─ 根据 btn.type 分支
  ├─ 执行具体动作
  ├─ 必要时打开 viewerPanel 展示结果
  └─ 异常时 toast / safeLog
```

---

## 13. Shell 广播桥机制

Shell 相关常量和配置：

```text
CONST_SHELL_BRIDGE_ACTION = shortx.toolhub.SHELL
CONST_SHELL_BRIDGE_EXTRA_CMD = cmd_b64
SHELL_BRIDGE_ACTION
SHELL_BRIDGE_EXTRA_CMD
```

协议字段：

```text
cmd
  明文 shell 命令。

cmd_b64
  Base64 编码后的 shell 命令。按钮保存时会尽量生成 cmd_b64。

root
  是否 root 执行；当前 shell 按钮保存逻辑默认写入 root=true。

from
  来源标记，便于广播接收端识别。
```

广播桥流程：

```text
shell 类型按钮
   │
   ├─ 读取 btn.cmd / btn.cmd_b64
   ├─ 如果只有明文 cmd，则生成 Base64
   ├─ 如果 cmd_b64 异常，则尝试按明文重新编码
   ├─ 构造 Intent(action = SHELL_BRIDGE_ACTION)
   ├─ extras: from / root / cmd_b64 / 必要时 cmd
   └─ context.sendBroadcast(intent)
```

设计原因：

- `cmd_b64` 避免命令中的换行、引号、特殊字符在广播 extras 中损坏。
- 兼容历史配置中把明文误写入 `cmd_b64` 的情况。
- 广播 action 可通过配置覆盖，默认是 `shortx.toolhub.SHELL`。

---

## 14. App / Shortcut 启动机制

App 启动：

```text
app 类型按钮
   │
   ├─ PackageManager.getLaunchIntentForPackage(pkg)
   ├─ addFlags(FLAG_ACTIVITY_NEW_TASK)
   ├─ launchUserId 为空时默认主用户 0
   ├─ context.startActivityAsUser(intent, UserHandle.of(launchUserId))
   └─ 失败时回退普通 startActivity(intent)
```

Shortcut 启动：

```text
shortcut 类型按钮
   │
   ├─ 读取 shortcutJsCode
   ├─ 读取 launchUserId / userId
   ├─ 执行自包含 JS 启动代码
   └─ 用于锁定主 / 分身快捷方式
```

快捷方式选择：

- `th_07_shortcut.js` 已退役。
- 快捷方式选择逻辑已经并入 `th_14_panels.js`。
- 按钮编辑页中快捷方式选择会生成 `shortcutJsCode`。
- 保存时同步保存 `intentUri`、`userId`、`launchUserId`，用于锁定主 / 分身。

---

## 15. ContentProvider 机制

相关模块：

```text
th_08_content.js
```

用途：

- 支持 `content` 类型按钮。
- 处理 ContentProvider URI 相关操作。
- 提供 query / get / view 结果展示能力。

流程：

```text
content 类型按钮
   │
   ▼
execButtonAction(btn, idx)
   │
   ▼
th_08_content.js
   │
   ├─ 解析 content URI / 参数
   ├─ 执行 query / get / view
   └─ 将结果交给 viewerPanel 展示
```

---

## 16. 配置与持久化机制

持久化文件：

```text
settings.json
buttons.json
schema.json
```

核心对象：

```text
ConfigManager
  负责 loadSettings / saveSettings / loadButtons / saveButtons / loadSchema / saveSchema。

ConfigValidator
  负责默认配置、配置 schema、sanitizeConfig、schema 兼容刷新。

pendingUserCfg
  设置页临时编辑缓存。

previewMode
  设置页边调边看状态。
```

配置流：

```text
启动
  │
  ├─ ConfigManager.loadSettings()
  ├─ ConfigValidator.sanitizeConfig()
  └─ this.config

设置页打开
  │
  ├─ beginEditConfig()
  └─ pendingUserCfg = 当前配置副本

用户修改设置
  │
  ├─ setPendingValue(key, value)
  ├─ pendingDirty = true
  └─ previewMode 下刷新预览

保存
  │
  ├─ commitPendingUserCfg()
  ├─ ConfigValidator.sanitizeConfig()
  └─ ConfigManager.saveSettings()
```

写入策略：

- 原子写：临时文件写入后 flush / sync，再 rename 到目标文件。
- 防抖写：连续修改合并写入，减少频繁 IO。
- `close()` 时执行 flush，避免关闭时仍有待写配置未落盘。

---

## 17. 悬浮球位置机制

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

保存机制：

```text
悬浮球位置变化
   │
   ├─ 保存绝对坐标 BALL_INIT_X / BALL_INIT_Y_DP
   ├─ 保存当时屏幕尺寸 BALL_POS_SCREEN_W / BALL_POS_SCREEN_H
   ├─ 保存比例 BALL_POS_X_RATIO / BALL_POS_Y_RATIO
   ├─ 保存吸边状态 BALL_POS_DOCKED
   └─ 保存吸边方向 BALL_POS_DOCK_SIDE
```

恢复机制：

```text
启动 / 屏幕变化
   │
   ├─ 读取当前屏幕 w/h
   ├─ 如果屏幕尺寸变化，按比例恢复 x/y
   ├─ 如果已吸边，优先按 dockSide 恢复 left / right
   └─ clamp 到当前屏幕可见范围
```

目标：

- 横竖屏切换后不把竖屏坐标直接套到横屏。
- 吸边悬浮球优先恢复到对应边缘。
- 兼容旧版只保存绝对像素导致横屏落到中间的问题。

---

## 18. 生命周期机制

`startAsync`：

```text
startAsync(entryInfo, closeRule)
   │
   ├─ 准备关闭广播 action
   ├─ 创建 HandlerThread
   ├─ 在线程中创建 / 操作 WindowManager View
   ├─ registerReceiverOnMain() 注册广播
   │    ├─ 关闭广播
   │    ├─ 配置变化广播
   │    └─ 系统对话框广播 android.intent.action.CLOSE_SYSTEM_DIALOGS
   ├─ 创建 ballRoot / ballContent
   ├─ wm.addView(ballRoot, ballLp)
   ├─ 启动屏幕变化监听
   └─ 返回启动结果
```

入口创建新实例前会读取 `TOOLHUB_ACTIVE_APP`，并通过 `closeToolHubAppsForRestart()` 关闭旧实例。

`close`：

```text
close(reason)
   │
   ├─ 标记 closing
   ├─ 取消吸边 / 长按 / 返回预览 / View 动画等异步任务
   ├─ 停止屏幕监听
   ├─ 保存悬浮球位置
   ├─ flushDebouncedWrites()
   ├─ removeViewImmediate 移除 mask / panel / viewerPanel / ballRoot
   ├─ 注销 receivers
   ├─ 退出 HandlerThread
   ├─ 标记 state.closed
   └─ 从 TOOLHUB_APP_REGISTRY 移除当前实例
```

`restartToolHubFromSettings`：

```text
设置页重启
   │
   ├─ 设置 TOOLHUB_UPDATE_STATE.status = restarting
   ├─ 发送关闭广播
   ├─ 遍历 TOOLHUB_APP_REGISTRY
   ├─ 对旧实例 Handler 投递 close()
   ├─ CountDownLatch 等待旧实例关闭完成
   ├─ reloadLocalToolHubModulesForRestart()
   ├─ new FloatBallAppWM(logger)
   └─ startAsync(entryInfo, closeRule)
```

`dispose`：

```text
dispose()
   │
   └─ 进一步清理图标缓存、picker 缓存、线程、引用等资源
```

广播机制：

- 关闭广播：用于关闭旧实例或外部触发关闭。
- 配置变化广播：用于配置变更后的刷新。
- 系统对话框广播：处理 Home / 最近任务等系统层行为，避免 overlay 残留。

---

## 19. 线程机制

线程边界：

```text
ShortX 入口线程
   │
   ├─ 执行 ToolHub.js
   ├─ 下载 / 校验 / eval 子模块
   ├─ 创建 logger / FloatBallAppWM
   └─ 调用 startAsync()

HandlerThread
   │
   ├─ 负责 WindowManager View 创建与更新
   ├─ addView / updateViewLayout / removeView
   ├─ 悬浮球拖拽 / 吸边 / 面板显示隐藏
   └─ 避免入口线程直接操作 WM

Main Looper
   │
   ├─ registerReceiverOnMain()
   ├─ 系统广播注册 / 注销
   ├─ Android 返回回调注册
   └─ 部分系统回调处理
```

设计要点：

- 入口线程不直接承担长期 WindowManager UI 操作。
- WindowManager View 操作集中到 HandlerThread，降低阻塞入口和回调混乱的风险。
- receiver 注册和系统回调通过 Main Looper 执行。

---

## 20. 日志机制

日志文件：

```text
shortx.getShortXDir()/ToolHub/logs/init.log
shortx.getShortXDir()/ToolHub/logs/ShortX_ToolHub_yyyyMMdd.log
```

`init.log`：

- 入口阶段日志。
- 目录创建与权限修复。
- manifest 下载与安全状态。
- 模块下载 / 覆盖 / 校验。
- 模块加载异常。
- 体积告警，例如大于 200KB 的模块。

运行日志：

- 由 `ToolHubLogger` 写入。
- 文件名形如 `ShortX_ToolHub_yyyyMMdd.log`。
- 覆盖启动、更新、运行、异常、按钮动作、返回手势等运行期信息。

日志保护：

- `init.log` 超过阈值后会尝试滚动为 `.bak` 或重新创建，避免无限增长。
- `ToolHubLogger` 初始化后会根据配置更新日志行为。

---

## 21. 模块命名与演进规则

命名格式：

```text
th_<两位编号>_<模块名>.js
```

编号段规则：

```text
01-09  基础能力层
10-19  执行与动作层
20-29  UI 基础层
30-39  ToolApp 页面层
40-49  弹窗 / 选择器层
50-59  生命周期入口层
```

演进规则：

- 历史空洞不补位。
- 已退役编号可以保留为空，例如 `th_07_shortcut.js` 已退役。
- 不为“看起来连续”而重命名旧模块。
- 新增模块优先使用对应编号段。
- 如果未来确实需要重命名或新增加载模块，必须同步：
  - `ToolHub.js` 的 `modules[]`
  - `manifest.json`
  - `manifest.sig`
  - `ToolHub.js.sha256`
  - 文档中的模块清单

当前实际情况：

```text
当前模块数量：22
已退役模块：th_07_shortcut.js
当前历史空洞：th_07
当前偏历史的 UI 编号：th_13 / th_14 / th_15 / th_16
```

---

## 22. 当前风险点与拆分方向

当前可见风险点：

```text
th_14_panels.js 仍需关注
  当前承担设置主页、设置分组、弹窗基础、主题适配等职责。

th_15_extra.js 偏大
  当前承担主面板、ToolApp Shell、页面栈、响应式布局、左右滑返回预览等职责。

prototype 方法过多
  大量能力通过 FloatBallAppWM.prototype 挂载，模块之间边界容易变模糊。

非关键模块失败可能运行期暴露
  除 th_01_base.js / th_16_entry.js 外，其他模块加载失败会被记录到 loadErrors，但不一定立即中断。

入口信任根升级
  ToolHub.js 内置公钥、最低可信版本和入口模块表，入口文件变更后需要用户手动替换 ShortX JS 任务内容。
```

建议拆分方向：

```text
ToolAppShell
  从 th_15_extra.js 拆出 ToolApp 外壳、顶部栏、内容容器、尺寸计算。

ToolAppNavigation
  从 th_15_extra.js 拆出 showToolApp / pushToolAppPage / popToolAppPage / replaceToolAppPage / page snapshot。

ToolAppBackGesture
  从 th_15_extra.js / th_09_animation.js 边界中拆出 ToolApp 横滑返回、返回预览、surface / edge 模式。

ButtonManagerPage
  已拆入 th_14_button_editor.js，后续可继续细分搜索、排序、启用禁用、删除。

ButtonEditorPage
  已拆入 th_14_button_editor.js / th_14_button_icon_editor.js，后续可继续细分动作参数区和底部暂存。

ShortcutPicker
  已拆入 th_14_button_shortcut.js，后续可继续细分快捷方式缓存与图标持久化。

SettingsHomePage / SettingsGroupPage
  从 th_14_panels.js 拆出设置主页与设置分组页。

PopupOverlayBase
  将 showPopupOverlay 等弹窗基础能力从 th_14_panels.js 中独立，供颜色、图标、快捷方式选择复用。
```

拆分原则：

- 小步拆分，避免一次改动入口加载、页面栈、overlay 焦点和 picker 行为。
- 新增模块时必须考虑旧入口不会自动加载新模块的问题。
- 修改 `code/*.js` 后才需要重新生成 `manifest.json` / `manifest.sig` / `ToolHub.js.sha256`；本文档改动不需要。
- 文档-only 提交不重签、不改 manifest。

主面板布局参数范围为：宽度预算 35%～100%、自动最大列数 1～10、分列参考宽度 48～200dp、按钮高度 48～160dp。主面板位置统一根据悬浮球停靠边缘自动计算，球与面板距离允许设为 0dp；已移除不进入当前运行链的面板默认位置、手动垂直偏移和保存位置节流设置。

## 拾字截图第二阶段

- 原图页支持保存到公共目录、通过 content URI 系统分享，以及永久删除 ToolHub 内部截图。
- 默认公共目录为 `/storage/emulated/0/Pictures/ToolHub`，可在“设置 → 拾字”中修改并测试可写性。
- 内部截图默认保留 7 天；分享临时副本保留 24 小时。公共保存副本不参与自动清理。
- 图片状态记录在 `toolhub.db` 的独立关系表中；删除截图后保留拾字文字与当前选择状态。

- `th_23_screenshot_manager.js`：截图管理器 ToolApp 路由；负责内部截图/已保存列表、缩略图与用户操作编排，文件边界和 SQLite 操作继续由 `th_22_image_viewer.js` 提供。

## Stable / Beta 更新通道

- ShortX 中只保留一份 `ToolHub.js`；入口从公共引导文件读取 `stable` 或 `beta`。
- `stable` 固定映射 `main` 与 `shortx.getShortXDir()/ToolHub`。
- `beta` 固定映射 `beta` 与 `shortx.getShortXDir()/ToolHub-Beta`。
- 两个通道分别保存代码、SQLite、缓存、日志、截图和可信清单版本，禁止共享可变业务数据。
- 通道切换先写 `pendingChannel`，目标 Manifest 验签、模块加载和应用启动成功后才提交 `activeChannel`；失败自动恢复最近成功通道。
- Manifest schema 5 必须声明 `channel` 与 `branch`，入口会在验签后继续校验二者。

## Stable / Beta 截图与缓存隔离

- 内部截图、截图管理器扫描目录、Shell 桥结果和截图缩略图缓存全部基于当前 `APP_ROOT_DIR`。
- Stable 使用 `ToolHub/screenshots` 与 `ToolHub/cache/...`；Beta 使用 `ToolHub-Beta/screenshots` 与 `ToolHub-Beta/cache/...`。
- 公共保存目录仍由 `PICKWORD_IMAGE_PUBLIC_DIR` 控制，默认 `/storage/emulated/0/Pictures/ToolHub`；公共文件可以共用系统相册位置，但保存记录由各通道独立 SQLite 管理。
- 通道切换不迁移、删除或自动认领另一通道已有的内部截图。


## Stable / Beta 私有诊断与拾字状态隔离

- ColorOS 颜色安全结果和设置交互压力测试结果写入当前通道 `APP_ROOT_DIR/diagnostics/`。
- 拾字号文件写入当前通道 `APP_ROOT_DIR/data/pickword_font_size.txt`，Android SharedPreferences 名称也附加 `stable` 或 `beta` 后缀。
- Stable 在新路径缺失时可以只读旧公共字号文件和旧 SharedPreferences，并复制到 Stable 私有路径；Beta 不读取旧公共状态。
- 旧公共字号文件不会被删除，避免升级失败或回滚时丢失用户数据。
