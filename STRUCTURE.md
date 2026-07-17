# ToolHub-FloatBall 整体结构说明

更新时间：2026-07-14

本文档用于整理 `7015725/Toolhub-FloatBall` 当前代码结构、启动链路、模块职责和主要状态流。项目运行环境为 **ShortX / Rhino ES5 JavaScript**，入口文件负责安全更新和模块加载，核心业务集中挂载到 `FloatBallAppWM.prototype`。


---

## 1. 总体架构

```text
ShortX JS 任务
   │
   ▼
ToolHub.js
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
│   ├── th_15_main_panel.js
│   ├── th_16_entry.js
│   ├── th_17_pointer.js
│   ├── th_18_pointer_ocr.js
│   ├── th_19_position_state.js
│   ├── th_20_pickword.js
│   └── th_21_result_preview.js
└── scripts/
    ├── generate_signed_manifest.py
    ├── verify_module_versions.py
    ├── verify_atomic_update.py
    ├── verify_release_transaction.py
    ├── verify_sqlite_storage.py
    └── ... 其他专项回归脚本
```

当前实际加载 **27 个子模块**。`th_14_*` 已拆出按钮快捷方式、按钮图标编辑、按钮管理/编辑、颜色选择器、图标选择器和 schema 编辑器；快捷方式选择能力由 `th_14_button_shortcut.js` 承载，主按钮面板由 `th_15_main_panel.js` 承载，指针取字由 `th_17_pointer.js` 承载，框选 OCR 由 `th_18_pointer_ocr.js` 承载，固定位置和悬浮球重建回滚由 `th_19_position_state.js` 承载，拾字工具由 `th_20_pickword.js` 承载，顶部结果预览由 `th_21_result_preview.js` 承载。

当前编号存在历史空洞：`th_06` 后直接到 `th_08`。这是为降低更新风险而保留的历史编号；本仓库延续现有文件名，避免影响 `ToolHub.js`、`manifest.json`、旧缓存和实机稳定性。

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
│   ├── th_17_pointer.js
│   ├── th_18_pointer_ocr.js
│   ├── th_19_position_state.js
│   ├── th_20_pickword.js
│   ├── th_21_result_preview.js
│   ├── .installed_manifest.json
│   ├── .trusted_manifest_version
│   └── .trusted_sha_<module>
├── logs/
│   ├── init.log
│   └── ShortX_ToolHub_yyyyMMdd.log
└── toolhub.db                    # 设置、按钮和 Schema 的结构化 SQLite
```

旧 `settings.json`、`buttons.json`、`schema.json` 仅在迁移阶段读取；迁移成功后删除。

---

## 5. 启动链路

更新源固定为 GitHub，不再提供来源选择或镜像源回退。

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
var UPDATE_SECURITY_MODE = 2;   // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新
```

只有精确值 `0 / 1 / 2` 有效；无效值强制回退到 `2`，不会静默进入普通模式。

关键模块：

```text
th_01_base.js
th_02_core.js
th_05_persistence.js
th_16_entry.js
th_19_position_state.js
```

任一加载失败都会中断启动。其他模块失败会进入 `loadErrors`；悬浮球仍能启动时返回 `degraded`。入口结果统一使用 `healthy / degraded / failed` 三态。

---

## 6. 模块职责

| 模块 | 职责 |
|---|---|
| `th_01_base.js` | 基础工具、配置校验、路径常量、文件 IO、原子写、防抖写、日志基础、默认配置与设置 schema、旧 schema 自动刷新 |
| `th_02_core.js` | 完全结构化 SQLite、旧配置迁移、防抖并发写入、核心 state 与基础方法 |
| `th_03_icon.js` | 图标加载、图标缓存、Drawable / Bitmap 处理、悬浮球图标解析 |
| `th_04_theme.js` | 屏幕尺寸、旋转、Toast、振动、动物岛主题、Monet 颜色、Drawable 工具 |
| `th_05_persistence.js` | 悬浮球位置保存、设置保存、临时编辑缓存、实时预览刷新 |
| `th_06_icon_parser.js` | ShortX 图标解析、图标目录扫描、图标名回退 |
| `th_08_content.js` | ContentProvider 受控读写，读取与写入使用独立 URI 白名单 |
| `th_09_animation.js` | 悬浮球动画、吸边、面板显示隐藏、Mask、系统返回、预测性返回、缓存清理 |
| `th_10_shell.js` | Shell 广播桥执行层 |
| `th_11_action.js` | 按钮动作分发：设置、日志、Toast、App、Shell、Broadcast、Shortcut、Content、Pointer |
| `th_12_rebuild.js` | 悬浮球重建、尺寸 / 图标 / 配置变化刷新 |
| `th_13_panel_ui.js` | 设置项基础 UI：section、bool、int、float、action、文本输入等 |
| `th_14_panels.js` | 设置主页、设置分组、指针设置子块、按钮管理入口、弹窗基础、主题适配、更新状态展示 |
| `th_14_button_shortcut.js` | 内联快捷方式选择、快捷方式图标异步加载与回填 |
| `th_14_button_icon_editor.js` | 按钮图标来源、ShortX 图标预览、图标调色内联编辑与颜色联动 |
| `th_14_button_editor.js` | 按钮管理紧凑列表、搜索筛选、状态 chip、更多菜单、排序模式、按钮编辑页、动作参数、保存校验与页面内反馈 |
| `th_14_color_picker.js` | 颜色选择器：最近色、常用色、RGB、透明度、实时预览 |
| `th_14_icon_picker.js` | ShortX 图标选择器：搜索、分页、收藏、最近、过滤、Overlay |
| `th_14_schema_editor.js` | 设置结构编辑器 |
| `th_15_extra.js` | 查看器面板、通用面板定位与显示、ToolApp Shell、页面栈、响应式布局、左右滑返回预览 |
| `th_15_main_panel.js` | 主按钮面板顶部工具栏、可配置自适应网格、安全区域避让、分页吸附与多页圆点导航、单页隐藏分页圆点、方向展开/退出动画、实时运行状态和显式编辑模式拖动排序；默认背景透明度 0.92；网格决定面板宽高 |
| `th_16_entry.js` | 主线程同步、广播注册、实例注册、`startAsync`、`close`、`dispose`、设置页重启 |
| `th_17_pointer.js` | 屏幕指针、悬停取字、取字就绪视觉状态、框选区域、小框回退取字、OCR rect 输出 |
| `th_18_pointer_ocr.js` | 框选截图 OCR 处理、截图区域覆盖层、OCR 任务衔接、指针边框颜色状态补充 |
| `th_19_position_state.js` | 固定位置状态机、指针布局、语义会话隔离和悬浮球尺寸重建回滚 |
| `th_20_pickword.js` | 拾字文字选择、复制、翻译、钉屏、放大镜及其生命周期清理 |
| `th_21_result_preview.js` | 顶部两行全自绘结果预览、倒计时、动效与拾字入口 |

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
│   ├── dockSide
│   └── ballRebuildActive
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
├── 固定顶部工具栏
│   └── 普通模式 / 布局编辑模式（取消、保存）
├── ScrollView
│   └── GridLayout 可配置自适应网格 / 拖动排序
└── 可点击分页圆点 / 停止滚动整页吸附 / 底部把手

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
| `shell` | 通过 Shell 广播桥发送 base64 命令；Root 默认关闭，仅显式 `root:true` 开启 |
| `broadcast` | 发送自定义广播，兼容 `extra` / `extras` |
| `shortcut` | 默认启动 `intentUri`；仅显式 `legacy_js` 执行历史 `shortcutJsCode` |
| `content` | 按独立读写白名单访问 ContentProvider |
| `pointer` | 启动取字或框选 OCR |

---

## 13. 配置与持久化

当前持久化后端：

```text
toolhub.db
├── toolhub_meta
├── toolhub_settings
├── toolhub_buttons
├── toolhub_button_values
└── toolhub_schema_values
```

配置流：

```text
ConfigManager.loadSettings / loadButtons / loadSchema
   │
   ▼
ConfigValidator 与兼容迁移
   │
   ▼
结构化 SQLite 适配器
   │
   ├─ settings → 类型化键值行
   ├─ buttons  → 主表 + 递归参数节点
   └─ schema   → 递归关系节点
```

持久化策略：

- SQLite 事务提交后才报告保存成功。
- 防抖任务由任务锁保护，所有管理写入通过统一写锁串行执行。
- 旧任务在写入前后校验对象身份和代次，不能删除或覆盖新任务。
- 立即保存会取消同路径旧防抖任务。
- `close()` 时刷新待写任务，失败任务保留供后续重试。
- 数据库只读救援模式禁止把默认值写回损坏数据库。

旧 JSON 文件只作为一次性迁移来源，不再作为运行期配置文件。

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
下载并验证 manifest.json / manifest.sig
   │
   ├─ alg / keyId / SHA256withRSA
   ├─ manifest version 防回滚
   ├─ ToolHub.js 模块列表 / manifest.files 一致性
   ├─ assets.updateHistory 哈希、大小和版本一致性
   └─ release 标题、日期和 changes 与最新结构化记录一致
   │
   ▼
整批模块下载到 .txn.tmp 并校验 size / sha256
   │
   ▼
写入 .module_update_transaction.json
   │
   ├─ 正式文件备份为 .txn.bak
   ├─ 模块和安全元数据在同一事务内切换
   └─ 整批哈希通过后写入 .module_update_transaction.committed
   │
   ▼
失败逆序回滚；中断由下次启动恢复或完成清理
```

当前清单结构：

```text
schema: 4
version: 以当前 manifest.json 为准
alg: SHA256withRSA
keyId: toolhub-targets-20260703-rsa3072
entry: ToolHub.js 入口版本、哈希、大小和手动更新标记
files: 27 个模块
assets.updateHistory: 更新历史名称、schema、版本、哈希和大小
release: 结构化记录生成的标题、日期和 changes
```

---

## 17. 维护注意事项

修改 `code/*.js` 或 `ToolHub.js` 后，必须先创建一条待签名更新记录，再生成签名产物：

```bash
python3 scripts/create_update_record.py
python3 scripts/verify_update_history.py --require-one-pending
python3 scripts/generate_signed_manifest.py --yes
python3 scripts/verify_manifest.py
python3 .github/scripts/verify_manifest_signature.py
```

会更新：

```text
updates/records/<id>.json
update_history.json
manifest.json
manifest.sig
ToolHub.js.sha256
```

签名不读取 PR 标题或默认更新文案。`publish-release` 只发布 `v<manifest.version>`，并将 Release 锁定到通过 `main` 校验的提交。

模块加载顺序不建议随意调整。当前顺序大致是：

```text
base → core → icon/theme/persistence/parser/content
→ animation/shell/action/rebuild
→ panel_ui → panels → button_shortcut / button_icon_editor / button_editor
→ color_picker / icon_picker / schema_editor → extra → entry → pointer → pointer_ocr → position_state → pickword → result_preview
```

尤其注意：

- `th_14_color_picker.js` 依赖 `th_14_panels.js` 的弹窗基础能力。
- `th_14_icon_picker.js` 应位于 `th_14_panels.js` 之后、`th_15_extra.js` 之前。
- `th_15_extra.js` 依赖前面 UI、主题、设置、页面构建能力。
- `th_16_entry.js` 负责启动实例。
- `th_17_pointer.js` 位于入口生命周期之后，接入按钮动作分发和悬浮球拖动路径。
- `th_18_pointer_ocr.js` 扩展框选 OCR，`th_19_position_state.js` 安装位置、布局和重建回滚包装。
- `th_20_pickword.js` 和 `th_21_result_preview.js` 只新增拾字与结果 UI 服务，不覆盖 `th_19_position_state.js` 的位置或触摸所有权。

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
- 非关键模块加载失败后可能降级启动；入口会明确返回 `degraded` 并列出加载异常。

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

主面板布局参数范围为：宽度预算 35%～100%、自动最大列数 1～10、分列参考宽度 48～200dp、按钮高度 48～160dp。主面板位置统一根据悬浮球停靠边缘自动计算，球与面板距离允许设为 0dp；已移除不进入当前运行链的面板默认位置、手动垂直偏移和保存位置节流设置。

## 更新记录与缓存

仓库中的 `updates/records/*.json` 是更新记录唯一源数据，`update_history.json` 是自动聚合产物。每次正式签名要求且仅允许一条 `manifestVersion=0` 的记录；签名完成后自动补充日期、模块差异和入口差异。运行设备将已校验历史缓存到 `ToolHub/cache/`；缓存损坏或网络失败不会影响子模块启动和事务更新。

GitHub Release 固定附带 `ToolHub.js`、入口哈希、manifest、RSA 签名和 `update_history.json`。已存在但指向其他提交的同版本 tag 会使发布失败，不会被静默覆盖。
