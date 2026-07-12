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

## Content 动作

默认配置：

- `CONTENT_SECURITY_MODE = strict`
- `CONTENT_URI_ALLOWLIST = content://settings/system/|content://settings/secure/|content://settings/global/`
- `CONTENT_WRITE_URI_ALLOWLIST = ""`

读取和写入使用独立白名单：

- `get`、`query`、`view` 使用 `CONTENT_URI_ALLOWLIST`。
- `put`、`update`、`insert`、`delete` 使用 `CONTENT_WRITE_URI_ALLOWLIST`。
- 写入白名单默认留空，因此所有 Content 写入默认被拒绝。
- 需要写入时，应只加入具体 URI，例如 `content://settings/system/screen_brightness`，不要直接开放整个 Settings 表。

模式说明：

- `strict`：不在对应白名单中的操作直接拒绝；安全检查异常时也拒绝。
- `compat_audit`：记录越界 URI，但继续执行。仅用于临时兼容旧按钮。
- `off`：关闭 URI 安全检查，仅用于明确受控环境。

旧值 `audit` 和未知值均按 `strict` 处理，不再自动放行。原有读取 Settings 的按钮通常继续可用；原有写入按钮需要把目标 URI 明确加入 `CONTENT_WRITE_URI_ALLOWLIST`，或临时选择 `compat_audit`。

## 其他默认值

- `TOOLAPP_BACK_SURFACE_DOMINANCE = 1.08`
