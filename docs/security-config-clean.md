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

## 其他默认值

- `SHORTCUT_EXEC_MODE = compat`
- `CONTENT_SECURITY_MODE = audit`
- `TOOLAPP_BACK_SURFACE_DOMINANCE = 1.08`
