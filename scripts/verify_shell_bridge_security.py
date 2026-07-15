#!/usr/bin/env python3
"""验证 Shell 广播桥兼容迁移、安全边界和 Root 显式策略。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHELL = (ROOT / "code" / "th_10_shell.js").read_text(encoding="utf-8")
ACTION = (ROOT / "code" / "th_11_action.js").read_text(encoding="utf-8")
REBUILD = (ROOT / "code" / "th_12_rebuild.js").read_text(encoding="utf-8")
EDITOR = (ROOT / "code" / "th_14_button_editor.js").read_text(encoding="utf-8")


def require(text, fragment, label):
    if fragment not in text:
        raise AssertionError("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        raise AssertionError("forbidden %s: %s" % (label, fragment))


# th_10 在 th_12 之前加载，先建立可工作的兼容默认值；th_12 只能补缺，不能覆盖。
require(SHELL, "var migrationTargetVersion = 1;", "migration version")
require(SHELL, 'ConfigValidator.schemas.SHELL_BRIDGE_MODE = {', "compat schema installer")
require(SHELL, 'default: "compat"', "compat schema default")
require(SHELL, 'ConfigManager.defaultSettings.SHELL_BRIDGE_MODE = "compat";', "compat runtime default")
require(SHELL, 'ConfigManager.defaultSettings.SHELL_BRIDGE_REQUIRE_TOKEN = false;', "compat token default")
require(SHELL, 'ConfigManager.defaultSettings.SHELL_BRIDGE_MIGRATION_VERSION = 0;', "migration default")
require(REBUILD, 'if (typeof ConfigValidator.schemas[key] === "undefined")', "schema does not overwrite")
require(REBUILD, 'if (typeof ConfigManager.defaultSettings[key] === "undefined")', "defaults do not overwrite")

# 兼容迁移：仅迁移未完成版本的无目标失败组合，并持久化一次。
require(SHELL, "function resolveConfig(app)", "resolver")
require(SHELL, 'migrationVersion < migrationTargetVersion', "version guard")
require(SHELL, '!targetPkg && !targetCls && mode !== "compat"', "missing target migration")
require(SHELL, 'migrationReason = "legacy_missing_target";', "missing target reason")
require(SHELL, 'migrationReason = "legacy_missing_token";', "missing token reason")
require(SHELL, 'cfg.SHELL_BRIDGE_MIGRATION_VERSION = migrationTargetVersion;', "migration marker persistence")
require(SHELL, 'ConfigManager.saveSettings(cfg);', "migration settings save")
require(SHELL, 'shell bridge config mode=', "startup/runtime diagnostic")
require(SHELL, 'var resolved = resolveConfig(this);', "execution uses resolver")

# 安全边界：完成迁移后的 explicit/strict 无目标仍拒绝，strict 仍强制非空令牌。
require(SHELL, 'resolved.targetMode !== "implicit"', "non implicit target guard")
require(SHELL, 'throw "shell bridge target missing mode=" + String(resolved.mode || "")', "missing target block")
require(SHELL, 'requireToken: (mode === "strict") || requireToken', "strict token policy")
require(SHELL, 'throw "shell bridge token missing mode=" + String(resolved.mode || "")', "missing token block")
require(SHELL, 'var requestedRoot = (needRoot === true);', "explicit root only")
forbid(SHELL, 'var requestedRoot = true;', "forced root")

# 自定义广播进入 Shell bridge 时继续保持 strict/target/token 约束。
require(ACTION, 'this.config.SHELL_BRIDGE_MODE || "strict"', "broadcast strict fallback")
require(ACTION, 'shellBridgeBlockErr = "shell bridge target missing mode=" + bridgeMode', "broadcast target block")
require(ACTION, 'var requireToken = (bridgeMode === "strict") || (this.config.SHELL_BRIDGE_REQUIRE_TOKEN === true);', "broadcast token policy")
require(ACTION, 'shellBridgeBlockErr = "shell bridge token missing mode=" + bridgeMode', "broadcast token block")

# root 缺失时必须是 false；显式 true 仍能透传。
require(ACTION, 'var root = false;', "diagnostic root false")
require(ACTION, 'var needRoot = false;', "shell action root false")
require(ACTION, 'parseBoolLike(btn.root, false)', "explicit shell root parsing")
require(ACTION, 'var bridgeNeedRoot = false;', "broadcast root false")
forbid(ACTION, 'var needRoot = true;', "legacy shell root true")
forbid(ACTION, 'var bridgeNeedRoot = true;', "legacy broadcast root true")

# 编辑器必须显示 root 开关，默认关闭，并保存显式布尔值。
require(EDITOR, 'shellRootText.setText("使用 Root 权限")', "root switch label")
require(EDITOR, 'var initialShellRoot = false;', "root switch default")
require(EDITOR, 'newBtn.root = !!shellRootSwitch.isChecked();', "root switch persistence")
forbid(EDITOR, 'newBtn.root = true;', "forced root persistence")


def resolve_policy(
    mode=None,
    target=False,
    token=False,
    require_token=False,
    migration_version=0,
    root=None,
):
    raw = (mode or "").strip().lower()
    if raw not in ("compat", "explicit", "strict"):
        raw = "explicit" if target else "compat"

    migrated = False
    reason = ""
    if migration_version < 1:
        if not target and raw != "compat":
            raw = "compat"
            require_token = False
            migrated = True
            reason = "legacy_missing_target"
        elif not target and raw == "compat" and require_token and not token:
            require_token = False
            migrated = True
            reason = "legacy_missing_token"
        migration_version = 1

    if not target and raw != "compat":
        return {
            "allowed": False,
            "reason": "target",
            "mode": raw,
            "migrated": migrated,
            "migration_reason": reason,
            "root": root is True,
        }

    token_required = raw == "strict" or require_token is True
    if token_required and not token:
        return {
            "allowed": False,
            "reason": "token",
            "mode": raw,
            "migrated": migrated,
            "migration_reason": reason,
            "root": root is True,
        }

    return {
        "allowed": True,
        "reason": "",
        "mode": raw,
        "migrated": migrated,
        "migration_reason": reason,
        "root": root is True,
    }


cases = [
    (
        resolve_policy(),
        {"allowed": True, "reason": "", "mode": "compat", "migrated": False, "migration_reason": "", "root": False},
    ),
    (
        resolve_policy(mode="strict", target=False, token=False, require_token=True, migration_version=0),
        {"allowed": True, "reason": "", "mode": "compat", "migrated": True, "migration_reason": "legacy_missing_target", "root": False},
    ),
    (
        resolve_policy(mode="compat", target=False, token=False, require_token=True, migration_version=0),
        {"allowed": True, "reason": "", "mode": "compat", "migrated": True, "migration_reason": "legacy_missing_token", "root": False},
    ),
    (
        resolve_policy(mode="strict", target=True, token=True, require_token=False, migration_version=1),
        {"allowed": True, "reason": "", "mode": "strict", "migrated": False, "migration_reason": "", "root": False},
    ),
    (
        resolve_policy(mode="strict", target=True, token=False, require_token=False, migration_version=1),
        {"allowed": False, "reason": "token", "mode": "strict", "migrated": False, "migration_reason": "", "root": False},
    ),
    (
        resolve_policy(mode="explicit", target=False, token=False, require_token=False, migration_version=1),
        {"allowed": False, "reason": "target", "mode": "explicit", "migrated": False, "migration_reason": "", "root": False},
    ),
    (
        resolve_policy(mode="unknown", target=True, token=False, require_token=False, migration_version=0, root=True),
        {"allowed": True, "reason": "", "mode": "explicit", "migrated": False, "migration_reason": "", "root": True},
    ),
]

for actual, expected in cases:
    if actual != expected:
        raise AssertionError("policy mismatch: actual=%r expected=%r" % (actual, expected))

print("Shell bridge compatibility/security verification passed")
