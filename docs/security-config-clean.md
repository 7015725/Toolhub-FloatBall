# ToolHub 安全配置

`code/th_12_rebuild.js` 注入 Shell、Shortcut 和 Content 的安全配置。

## Shell 广播桥

默认配置：

- `SHELL_BRIDGE_MODE = strict`
- `SHELL_BRIDGE_REQUIRE_TOKEN = true`
- `SHELL_BRIDGE_TARGET_PACKAGE = ""`
- `SHELL_BRIDGE_TARGET_CLASS = ""`
- `SHELL_BRIDGE_TOKEN = ""`

默认状态下，Shell 广播桥会拒绝发送，直到配置显式目标和非空令牌。

模式说明：

- `strict`：必须配置目标和令牌。
- `explicit`：必须配置目标；是否要求令牌由 `SHELL_BRIDGE_REQUIRE_TOKEN` 决定。
- `compat`：允许隐式广播；是否要求令牌由 `SHELL_BRIDGE_REQUIRE_TOKEN` 决定。仅用于明确需要旧协议兼容的环境。

Shell 按钮的 `root` 字段默认按 `false` 处理。只有按钮明确保存 `root: true` 时才请求 Root 执行。

## Shortcut 快捷方式

默认配置：

- `SHORTCUT_EXEC_MODE = intent`

默认只解析并启动按钮保存的 `intentUri`，不会在启动失败后自动执行 `shortcutJsCode`。

模式说明：

- `intent`：仅使用结构化 `intentUri`。启动失败时明确返回错误。
- `legacy_js`：允许执行旧按钮保存的 `shortcutJsCode`。仅用于无法恢复 `intentUri` 的历史按钮。

旧按钮加载时会执行一次安全迁移：

- 有有效 `intentUri`：标记为 `intent`，即使仍保存旧 JS 也不会执行。
- 没有 `intentUri`，但保存了旧 `shortcutJsCode`：标记为 `legacy_js`，保持旧功能可用。
- 重新选择快捷方式并取得有效 `intentUri`：自动退出 `legacy_js`。
- 新建快捷方式不再生成或保存任意 JavaScript。

旧值 `compat`、`strict`、`data` 和未知值都按 `intent` 处理，不会触发 `eval` 回退。

## 其他默认值

- `CONTENT_SECURITY_MODE = audit`
- `TOOLAPP_BACK_SURFACE_DOMINANCE = 1.08`
