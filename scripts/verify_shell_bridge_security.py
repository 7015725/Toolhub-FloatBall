#!/usr/bin/env python3
"""验证 Shell 广播桥的安全默认值和显式兼容边界。"""

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


# 配置默认值：默认 strict，令牌要求开启。
require(REBUILD, 'SHELL_BRIDGE_MODE", { type: "enum", values: ["compat", "explicit", "strict"], default: "strict"', "strict schema default")
require(REBUILD, 'putDefault("SHELL_BRIDGE_MODE", "strict")', "strict runtime default")
require(REBUILD, 'SHELL_BRIDGE_REQUIRE_TOKEN", { type: "bool", default: true }', "token schema default")
require(REBUILD, 'putDefault("SHELL_BRIDGE_REQUIRE_TOKEN", true)', "token runtime default")
forbid(REBUILD, 'putDefault("SHELL_BRIDGE_MODE", "compat")', "legacy compat default")

# execShellSmart：未知模式收敛 strict；只有 compat 可无目标；strict 强制令牌。
require(SHELL, 'this.config.SHELL_BRIDGE_MODE || "strict"', "shell strict fallback")
require(SHELL, 'bridgeMode !== "compat" && bridgeMode !== "explicit" && bridgeMode !== "strict"', "mode allowlist")
require(SHELL, 'else if (bridgeMode === "compat")', "explicit compat implicit target")
require(SHELL, 'throw "shell bridge target missing mode=" + bridgeMode', "missing target block")
require(SHELL, 'var requireToken = (bridgeMode === "strict") || (this.config.SHELL_BRIDGE_REQUIRE_TOKEN === true);', "strict token policy")
require(SHELL, 'throw "shell bridge token missing mode=" + bridgeMode', "missing token block")
require(SHELL, 'var requestedRoot = (needRoot === true);', "explicit root only")
forbid(SHELL, 'SHELL_BRIDGE_MODE || "compat"', "legacy shell fallback")

# 自定义广播进入 Shell bridge 时必须复用相同策略。
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


def policy(mode=None, target=False, token=False, require_token=True, root=None):
    value = (mode or "strict").strip().lower()
    if value not in ("compat", "explicit", "strict"):
        value = "strict"
    if not target and value != "compat":
        return {"allowed": False, "reason": "target", "mode": value, "root": root is True}
    token_required = value == "strict" or require_token is True
    if token_required and not token:
        return {"allowed": False, "reason": "token", "mode": value, "root": root is True}
    return {"allowed": True, "reason": "", "mode": value, "root": root is True}


cases = [
    (policy(), {"allowed": False, "reason": "target", "mode": "strict", "root": False}),
    (policy(mode="unknown", target=True, token=False), {"allowed": False, "reason": "token", "mode": "strict", "root": False}),
    (policy(mode="strict", target=True, token=True), {"allowed": True, "reason": "", "mode": "strict", "root": False}),
    (policy(mode="compat", target=False, token=False, require_token=False), {"allowed": True, "reason": "", "mode": "compat", "root": False}),
    (policy(mode="compat", target=False, token=False, require_token=True), {"allowed": False, "reason": "token", "mode": "compat", "root": False}),
    (policy(mode="explicit", target=True, token=True, root=True), {"allowed": True, "reason": "", "mode": "explicit", "root": True}),
]

for actual, expected in cases:
    if actual != expected:
        raise AssertionError("policy mismatch: actual=%r expected=%r" % (actual, expected))

print("Shell bridge security verification passed")
