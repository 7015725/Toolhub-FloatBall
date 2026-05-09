# ShortX ToolHub

ShortX ToolHub 是一个面向 **ShortX / Rhino ES5 JS** 的模块化悬浮工具框架。
入口文件 `ToolHub.js` 负责安全拉取、验签、校验并加载子模块；业务 UI 和功能拆分在 `code/th_*.js` 中维护，避免单个 JS 文件过大。

当前仓库地址：

```text
https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub
```

---

## 核心特性

- **模块化加载**：入口文件只做启动、同步、校验与汇总返回；功能代码拆到 16 个子模块。
- **签名更新机制**：远端 `manifest.json` 必须通过 `manifest.sig` 的 RSA 签名校验后才可信。
- **SHA256 文件校验**：每个子模块按清单中的 `sha256` 和 `size` 校验，通过后才覆盖本地文件。
- **防回滚**：入口内置 `MIN_TRUSTED_MANIFEST_VERSION`，并记录本地已信任清单版本，拒绝旧版本清单。
- **本地可信回退**：网络或远端清单异常时，不盲目覆盖；已验证过的本地模块可继续使用。
- **ShortX 图标选择器**：支持图标点选、搜索、分页、自适应列数，不再依赖手填图标名。
- **颜色选择器**：支持常用色、最近色、RGB、透明度和实时预览。
- **日志记录**：启动、更新、验签、加载异常写入 `ToolHub/logs/init.log`。

---

## 快速部署

### 1. 安装入口文件

复制仓库中的 `ToolHub.js`，粘贴到 ShortX 的 JS 任务中运行。

> 注意：`ToolHub.js` 是信任根，内置 RSA 公钥和最低可信清单版本。入口文件本身不能安全地自我更新；入口升级时需要手动替换一次。

### 2. 首次运行

入口会自动完成：

1. 创建 `shortx.getShortXDir()/ToolHub/code/`
2. 下载 `manifest.json` 与 `manifest.sig`
3. 使用入口内置公钥验签清单
4. 校验清单版本，防止回滚
5. 按清单下载 16 个子模块到临时文件
6. 校验 `size` 与 `sha256`
7. 校验通过后覆盖本地模块
8. 加载模块并启动悬浮球

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
    │   ├── th_07_shortcut.js
    │   ├── th_08_content.js
    │   ├── th_09_animation.js
    │   ├── th_10_shell.js
    │   ├── th_11_action.js
    │   ├── th_12_rebuild.js
    │   ├── th_13_panel_ui.js
    │   ├── th_14_panels.js
    │   ├── th_15_extra.js
    │   └── th_16_entry.js
    └── logs/
        └── init.log
```

### 仓库目录

```text
ShortX_ToolHub/
├── ToolHub.js
├── ToolHub.js.sha256
├── README.md
├── manifest.json
├── manifest.sig
├── code/
│   └── th_*.js
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
  "安全": "✓ 已验签 v20260507155220 / toolhub-targets-2026-rsa3072",
  "同步": "✓ 子模块已是最新",
  "布局": "4×4",
  "关闭广播": "shortx.wm.floatball.CLOSE"
}
```

### 正常启动，有模块更新

```json
{
  "ok": true,
  "状态": "ToolHub 启动成功",
  "安全": "✓ 已验签 v20260507155220 / toolhub-targets-2026-rsa3072",
  "同步": "✓ 已更新 2 个模块：th_14_panels.js、th_16_entry.js",
  "布局": "4×4",
  "关闭广播": "shortx.wm.floatball.CLOSE",
  "更新模块": ["th_14_panels.js", "th_16_entry.js"]
}
```

### 启动失败

失败时会返回：

- `ok: false`
- `状态: "ToolHub 启动失败"`
- `安全`: 当前验签/清单状态
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
3. 入口下载清单和签名。
4. 使用 `SHA256withRSA` 校验 `manifest.sig`。
5. 检查 `manifest.keyId` 是否在入口信任列表内。
6. 检查 `manifest.version` 是否低于最低可信版本或本地已信任版本。
7. 每个模块下载到 `.tmp`。
8. 校验模块 `size` 和 `sha256`。
9. 校验通过才覆盖本地模块。
10. 所有模块加载正常后，保存本地可信清单版本。

当前 keyId：

```text
toolhub-targets-2026-rsa3072
```

---

## 模块职责

| 文件 | 职责 |
|------|------|
| `th_01_base.js` | 基础工具、日志、配置校验、通用辅助 |
| `th_02_core.js` | `FloatBallAppWM` 构造、基础状态与核心工具 |
| `th_03_icon.js` | 图标缓存、Bitmap 管理、悬浮球图标加载 |
| `th_04_theme.js` | 主题、颜色、样式工具 |
| `th_05_persistence.js` | 持久化与设置数据层 |
| `th_06_icon_parser.js` | 图标解析、ShortX 内置图标扫描与回退 |
| `th_07_shortcut.js` | 快捷方式选择器 |
| `th_08_content.js` | ContentProvider 读取与通用 query |
| `th_09_animation.js` | 面板动画、吸边、显示/隐藏管理 |
| `th_10_shell.js` | Shell 执行层 |
| `th_11_action.js` | 按钮动作分发与执行 |
| `th_12_rebuild.js` | 悬浮球重建逻辑 |
| `th_13_panel_ui.js` | 设置面板通用 UI 组件 |
| `th_14_panels.js` | 设置面板、按钮编辑器、图标选择器、颜色选择器 |
| `th_15_extra.js` | 主面板与附加展示层 |
| `th_16_entry.js` | 生命周期、广播注册、启动与销毁 |

---

## 图标与颜色交互

### ShortX 图标选择器

- 图标库默认收起，点击后展开。
- 支持搜索、上一页、下一页。
- 按当前可用宽度自动计算列数。
- 按可见高度计算每页容量，减少空白和滚动浪费。
- 选中图标后自动回填并收起。
- 优先运行时扫描 ShortX 可用图标，避免维护超大静态图标表。

### 弹出式颜色选择器

- 图标预览实时显示着色效果。
- 最近使用颜色最多保留 8 个。
- 常用颜色使用自适应网格。
- RGB 与透明度滑块实时同步。
- 支持一键清空，恢复跟随主题。

---

## 日志

启动日志路径：

```text
shortx.getShortXDir() + "/ToolHub/logs/init.log"
```

常见记录内容：

- 目录创建与权限处理
- manifest 下载与验签结果
- 模块下载、哈希校验与覆盖更新
- 模块加载失败
- 启动异常
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

### 修改 README

只改 `README.md` 不需要重新签名，因为 README 不参与手机端模块校验。

### 注意事项

- Rhino / ShortX JS 中统一使用 `var`，避免 `let` / `const`。
- 顶层不要使用 `return`。
- 入口文件是信任根，改动后需要用户手动替换 ShortX 任务中的入口。
- 不要把私钥提交到仓库。
- 不建议把调试细节塞进启动返回 JSON，优先写日志。

---

## 更新记录

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
