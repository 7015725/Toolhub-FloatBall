# ShortX ToolHub

一个模块化的 ShortX JS 浮窗工具框架，支持广播关闭、子线程模型、日志记录和可扩展面板。

---

## 目录结构

```
ToolHub.js          # 入口文件（粘贴到 ShortX 任务）
code/
├── th_1_base.js    # 基础工具函数、Logger、崩溃处理、进程信息
├── th_2_core.js    # 核心逻辑、浮窗管理、Shell 桥接、ContentProvider
├── th_3_panels.js  # 面板配置、按钮定义、对话框、文本查看器
├── th_4_extra.js   # 额外面板（设备信息、快捷操作等）
└── th_5_entry.js   # 入口面板定义、广播接收器注册
```

---

## 部署步骤

### 1. 创建目录

在 ShortX 数据根目录下创建：

```
ShortX数据根目录/
└── ToolHub/
    └── code/
```

> ShortX 数据根目录路径通过 `shortx.getShortXDir()` 获取，通常为 `/data/system/shortx_XXXXXXXX/`

### 2. 放置文件

- 将 `ToolHub.js` 的内容粘贴到 ShortX 任务中
- 将 `code/` 目录下的 5 个 `th_*.js` 文件放入 `ToolHub/code/`

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

## 关闭浮窗

通过 adb 或 ShortX Shell 执行：

```bash
am broadcast -a shortx.wm.floatball.CLOSE
```

---

## 日志位置

```
ShortX数据根目录/ToolHub/logs/
```

日志文件按天分割，默认保留 3 天。

---

## 模块说明

| 文件 | 职责 |
|------|------|
| `th_1_base.js` | 工具函数、Logger、崩溃处理、进程信息获取 |
| `th_2_core.js` | 浮窗管理器、Shell 执行器、ContentProvider 读取器 |
| `th_3_panels.js` | 面板配置工厂、按钮构建器、对话框、文本查看器 |
| `th_4_extra.js` | 额外面板：设备信息、网络状态、快捷操作 |
| `th_5_entry.js` | 入口面板定义、广播接收器注册、启动流程 |

---

## 注意事项

- 入口文件通过 `loadScript()` 动态加载子模块，`var` 声明通过间接 `eval` 挂到全局作用域
- 子模块加载顺序不可更改：base → core → panels → extra → entry
- 调试请查看日志文件，不通过返回 JSON 暴露内部细节
