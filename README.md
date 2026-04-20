# ShortX ToolHub

一个模块化的 ShortX JS 浮窗工具框架，支持广播关闭、子线程模型、日志记录、自动下载与热更新。

---

## 目录结构

### 实机（ShortX 数据目录）
```
shortx.getShortXDir()/
├── ToolHub/
│   └── code/
│       ├── th_01_base.js
│       ├── th_02_core.js
│       ├── th_03_icon.js
│       ├── th_04_theme.js
│       ├── th_05_persistence.js
│       ├── th_06_icon_parser.js
│       ├── th_07_shortcut.js
│       ├── th_08_content.js
│       ├── th_09_animation.js
│       ├── th_10_shell.js
│       ├── th_11_action.js
│       ├── th_12_rebuild.js
│       ├── th_13_panel_ui.js
│       ├── th_14_panels.js
│       ├── th_15_extra.js
│       └── th_16_entry.js
└── ToolHub/logs/
    └── init.log
```

### 服务器（项目维护目录）
```
ToolHub/
├── ToolHub.js          # 入口文件（粘贴到 ShortX 任务）
└── code/
    ├── th_01_base.js
    ├── th_02_core.js
    ├── th_03_icon.js
    ├── th_04_theme.js
    ├── th_05_persistence.js
    ├── th_06_icon_parser.js
    ├── th_07_shortcut.js
    ├── th_08_content.js
    ├── th_09_animation.js
    ├── th_10_shell.js
    ├── th_11_action.js
    ├── th_12_rebuild.js
    ├── th_13_panel_ui.js
    ├── th_14_panels.js
    ├── th_15_extra.js
    └── th_16_entry.js
```

---

## 部署步骤

### 1. 创建目录（可省略）

入口文件会自动检测并创建 `ToolHub/code/` 目录，无需手动操作。

若需手动创建，在 ShortX 数据根目录下执行：
```bash
mkdir -p ToolHub/code
chmod 700 ToolHub/code
chown 1000:1000 ToolHub/code
```

### 2. 放置入口文件

将 `ToolHub.js` 的内容粘贴到 ShortX 任务中。

子模块会自动从 git 仓库下载到 `ToolHub/code/`，无需手动复制。

### 3. 运行

执行 ShortX 任务，正常返回示例：
```json
{
  "ok": true,
  "started": true,
  "msg": "已按 WM 专属 HandlerThread 模型启动",
  "closeAction": "shortx.wm.floatball.CLOSE",
  "layout": {"cols": 2, "rows": 2}
}
```

---

## 自动下载与权限管理

入口文件启动时会自动完成以下操作：

1. **缺失自检**：检查 `ToolHub/code/` 下的 16 个模块文件，缺失则从 git raw URL 自动下载
2. **权限保障**：目录不存在时自动创建并设置 `chmod 700` + `chown 1000:1000`
3. **权限判断**：通过 `stat` 命令精确检查 uid/gid/mode，不正确才修复
4. **单次检查**：一次启动中只检查一次目录权限，避免重复 shell 开销

---

## 版本管理与热更新

每个模块文件第一行必须包含版本注释：
```javascript
// @version 1.0.0
```

入口文件中的 `MODULE_MANIFEST` 定义各模块的期望版本。启动时若本地版本与期望版本不匹配，自动重新下载。

升级模块时只需：
1. 更新模块文件中的 `@version` 版本号
2. 同步更新 `ToolHub.js` 中 `MODULE_MANIFEST` 的对应版本号
3. 推送到 git 仓库
4. 实机下次启动时自动检测并更新

---

## 下载校验

- **大小校验**：对比 HTTP `Content-Length` 与实际写入字节数，不匹配则抛异常
- **内容校验**：读取下载文件前 200 字节，检测 `<!DOCTYPE` 或 `<html`，防止下到 404/502 错误页面

---

## 日志系统

### 启动日志
路径：`shortx.getShortXDir() + "/ToolHub/logs/init.log"`

记录内容：
- 目录创建/权限修复
- 模块下载开始/结束/异常
- 版本不匹配
- 模块加载失败
- 模块体积超阈警告（>200KB）

### 运行日志
路径：`shortx.getShortXDir() + "/ToolHub/logs/"`

日志文件按天分割，默认保留 3 天。

---

## 关闭浮窗

通过 adb 或 ShortX Shell 执行：
```bash
am broadcast -a shortx.wm.floatball.CLOSE
```

---

## 模块说明

| 文件 | 职责 | 线数参考 |
|------|------|---------|
| `th_01_base.js` | 基础工具函数、Logger、崩溃处理、进程信息获取 | ~1300 |
| `th_02_core.js` | FloatBallAppWM 构造函数、基础工具方法（dp/now/clamp） | ~124 |
| `th_03_icon.js` | 图标缓存/LRU、悬浮球图标加载（PNG 文件） | ~170 |
| `th_04_theme.js` | 屏幕/旋转、UI 样式辅助、莫奈动态取色、主题检测 | ~800 |
| `th_05_persistence.js` | 面板/位置/配置持久化、设置面板 schema 与编辑缓存 | ~298 |
| `th_06_icon_parser.js` | 快捷方式图标解析、resolveIconDrawable、图标文件路径 | ~485 |
| `th_07_shortcut.js` | 内置快捷方式选择器（合并 shortcuts.js）、分组过滤 | ~1175 |
| `th_08_content.js` | ContentProvider URI 解析、通用 query、统一入口 | ~209 |
| `th_09_animation.js` | 动画/视图管理、吸边停靠、屏幕监控、重建悬浮球 | ~662 |
| `th_10_shell.js` | Shell 智能执行（Action 优先 + 广播桥兜底） | ~33 |
| `th_11_action.js` | 按钮动作执行（点击/长按/双击） | ~320 |
| `th_12_rebuild.js` | 改大小后安全重建悬浮球 | ~76 |
| `th_13_panel_ui.js` | 设置面板 UI 组件（SectionHeader、SettingItemView 等） | ~375 |
| `th_14_panels.js` | 面板配置工厂、按钮构建器、对话框、文本查看器 | ~2957 |
| `th_15_extra.js` | 额外面板：设备信息、网络状态、快捷操作 | ~1598 |
| `th_16_entry.js` | 入口面板定义、广播接收器注册、启动流程 | ~324 |

---

## 模块加载容错

- `for` 循环加载 16 个模块，单模块失败记录日志但不阻断后续加载
- `th_16_entry.js` 失败时直接抛异常（启动必备）
- 错误信息落盘到 `ToolHub/logs/init.log`，便于实机排查

---

## 注意事项

- 入口文件通过 `loadScript()` 动态加载子模块，`var` 声明通过间接 `eval` 挂到全局作用域
- 子模块加载顺序不可更改：base → core → icon → theme → persistence → icon_parser → shortcut → content → animation → shell → action → rebuild → panel_ui → panels → extra → entry
- 调试请查看日志文件，不通过返回 JSON 暴露内部细节
- 单个模块建议不超过 200KB，超过时启动日志会记录 WARN 提示拆分
