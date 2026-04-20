# ShortX ToolHub

一个模块化的 ShortX JS 浮窗工具框架，支持子模块自动下载、按 `Last-Modified` 热更新、启动日志记录，以及面向大图标库的分页式 ShortX 图标选择器。

---

## 目录结构

### 实机（ShortX 数据目录）
```
shortx.getShortXDir()/
├── ToolHub/
│   ├── code/
│   │   ├── th_01_base.js
│   │   ├── th_02_core.js
│   │   ├── th_03_icon.js
│   │   ├── th_04_theme.js
│   │   ├── th_05_persistence.js
│   │   ├── th_06_icon_parser.js
│   │   ├── th_07_shortcut.js
│   │   ├── th_08_content.js
│   │   ├── th_09_animation.js
│   │   ├── th_10_shell.js
│   │   ├── th_11_action.js
│   │   ├── th_12_rebuild.js
│   │   ├── th_13_panel_ui.js
│   │   ├── th_14_panels.js
│   │   ├── th_15_extra.js
│   │   └── th_16_entry.js
│   └── logs/
│       └── init.log
```

### 服务器（项目维护目录）
```
ToolHub/
├── ToolHub.js
├── README.md
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

### 1. 放置入口文件
将 `ToolHub.js` 内容粘贴到 ShortX 任务中。

### 2. 直接运行
入口文件会自动：
1. 检查并创建 `ToolHub/code/`
2. 修复目录权限（`chmod 700` + `chown 1000:1000`）
3. 对 16 个子模块做 HEAD 检测
4. 缺失或有更新时自动下载覆盖
5. 记录启动日志到 `ToolHub/logs/init.log`

---

## 返回信息格式

成功启动示例：
```json
{
  "ok": true,
  "started": true,
  "msg": "ToolHub 启动成功：已按 WM 专属 HandlerThread 模型启动",
  "syncMsg": "本次已覆盖更新 2 个子模块（新增 0 / 覆盖 2）：th_14_panels.js、th_16_entry.js",
  "updatedCount": 2,
  "updatedModules": ["th_14_panels.js", "th_16_entry.js"],
  "closeAction": "shortx.wm.floatball.CLOSE",
  "layout": {"cols": 2, "rows": 2}
}
```

无子模块更新时：
```json
{
  "ok": true,
  "started": true,
  "msg": "ToolHub 启动成功：已按 WM 专属 HandlerThread 模型启动",
  "syncMsg": "子模块已是最新，本次未覆盖更新。",
  "updatedCount": 0,
  "updatedModules": [],
  "closeAction": "shortx.wm.floatball.CLOSE",
  "layout": {"cols": 2, "rows": 2}
}
```

如果有非关键模块加载失败，会额外返回：
- `loadMsg`
- `loadErrors`

如果启动失败，会额外返回：
- `err`

---

## 子模块热更新机制

当前机制不是版本号比对，而是：
- 对每个子模块发送 HTTP HEAD 请求
- 读取远端 `Last-Modified`
- 与本地 `.lm_模块名` 缓存比较
- 不一致则重新下载覆盖
- 网络检查失败时优先回退到本地已有文件

因此：
- **入口文件无需维护 `MODULE_MANIFEST`**
- 模块里的 `@version` 仅可作为人工注释，不参与程序判断

---

## ShortX 图标选择器优化

按钮编辑页里的 ShortX 图标选择器现已改为：
- **ShortX 图标名称编辑框已取消**，改为预览卡片 + 图标库点选
- **图标颜色支持折叠式完整调色板**，支持常用色、最近 5 色、透明度调节、RGB 三色调色器（0-255），并可切回跟随主题
- **分页模式**，不再一次性塞入大批图标
- **图标列表按当前可用宽度自动排列列数，并结合可见高度计算每页容量**
- 保留 **搜索 / 分类 / 上一页 / 下一页**
- 选中图标后自动回填并收起
- 收起后再次点击 **展开图标库** 可正常重新打开

当前交互要点：
- 常用颜色会按色相自动排序，主题色固定在最前，并像 ShortX 图标列表一样按当前可用宽度自动排布
1. 切到 `ShortX图标` 时自动展开图标库
2. 列数按当前可用宽度自动计算，屏幕更宽时一页可显示更多图标
3. 每页容量按自动列数 × 当前可见行数实时计算
4. 搜索、切分类、翻页时都会回到顶部，减少卡顿感和误触

---

## 日志系统

启动日志路径：
```text
shortx.getShortXDir() + "/ToolHub/logs/init.log"
```

记录内容包括：
- 目录创建 / 权限修复
- 更新检测
- 下载开始 / 结束 / 异常
- 模块加载失败
- 模块体积告警（>200KB）

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
| `th_14_panels.js` | 设置面板、按钮编辑器、ShortX 图标分页选择器 |
| `th_15_extra.js` | 主面板与附加展示层 |
| `th_16_entry.js` | 生命周期、广播注册、启动与销毁 |

---

## 注意事项

- 入口文件只负责加载与汇总返回信息，不承载业务 UI
- `th_16_entry.js` 属于关键模块，加载失败会直接中止启动
- 不建议把调试细节直接塞进返回 JSON，优先写日志；返回信息只保留用户判断启动/更新所需的关键信息
- 若修改了模块结构、返回字段、图标选择器交互，记得同步更新 README 与相关技能说明
