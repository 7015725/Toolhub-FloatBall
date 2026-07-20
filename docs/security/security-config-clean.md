# ToolHub 安全配置

`code/th_10_shell.js` 负责 Shell 广播桥的兼容配置、迁移和执行；`code/th_12_rebuild.js` 继续注入 Shortcut、Content 等安全配置，并为未安装的配置项提供后备定义。

## Shell 广播桥

默认配置：

- `SHELL_BRIDGE_MODE = compat`
- `SHELL_BRIDGE_REQUIRE_TOKEN = false`
- `SHELL_BRIDGE_TARGET_PACKAGE = ""`
- `SHELL_BRIDGE_TARGET_CLASS = ""`
- `SHELL_BRIDGE_TOKEN = ""`
- `SHELL_BRIDGE_MIGRATION_VERSION = 0`

默认使用 `shortx.toolhub.SHELL` 隐式广播，与现有 ShortX `ToolHub_shell执行` 监听规则兼容。广播发送成功只表示 Android 接受了广播，不代表 ShortX 已经完成命令执行。

模式说明：

- `compat`：允许无显式目标的隐式广播；是否要求令牌由 `SHELL_BRIDGE_REQUIRE_TOKEN` 决定。
- `explicit`：必须配置目标包名或组件；是否要求令牌由 `SHELL_BRIDGE_REQUIRE_TOKEN` 决定。
- `strict`：必须配置显式目标和非空令牌。

旧配置会执行一次兼容迁移：

- 迁移版本未完成、没有目标且模式为 `strict` 或 `explicit`：迁移为 `compat`，恢复原有隐式广播链路。
- 迁移版本未完成、模式为 `compat`、没有目标、要求令牌但令牌为空：关闭令牌强制要求。
- 已配置目标的 `explicit` / `strict` 保持不变。
- 迁移完成后，用户再次明确保存的无效严格配置不会被静默降级，执行时会返回明确的目标或令牌缺失错误。

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
