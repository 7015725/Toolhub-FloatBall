// @version 1.0.2
// =======================【Shell：广播桥执行】======================
// 仅通过广播桥发送 shell 命令，由外部接收器实际执行。
// 注意：system_server 进程本身不直接执行 shell。
FloatBallAppWM.prototype.execShellSmart = function(cmdB64, needRoot) {
  var ret = { ok: false, via: "", err: "" };

  try {
    var action = String(this.config.SHELL_BRIDGE_ACTION || CONST_SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
    var it = new android.content.Intent(action);

    // PR3-A：可选显式广播目标。默认不配置时仍保留旧的隐式 sendBroadcast 行为。
    var bridgeMode = String(this.config.SHELL_BRIDGE_MODE || "compat");
    var targetPkg = String(this.config.SHELL_BRIDGE_TARGET_PACKAGE || "").trim();
    var targetCls = String(this.config.SHELL_BRIDGE_TARGET_CLASS || "").trim();
    var targetMode = "implicit";

    if (targetPkg && targetCls) {
      if (targetCls.charAt(0) === ".") targetCls = targetPkg + targetCls;
      it.setComponent(new android.content.ComponentName(targetPkg, targetCls));
      targetMode = "component";
    } else if (targetPkg) {
      it.setPackage(targetPkg);
      targetMode = "package";
    } else {
      if (bridgeMode === "strict" || bridgeMode === "explicit") throw "shell bridge target missing";
    }

    var tokenValue = String(this.config.SHELL_BRIDGE_TOKEN || "");
    var tokenKey = String(this.config.SHELL_BRIDGE_EXTRA_TOKEN || "token");
    if (tokenValue) {
      if (!tokenKey) tokenKey = "token";
      it.putExtra(tokenKey, tokenValue);
    } else if (this.config.SHELL_BRIDGE_REQUIRE_TOKEN === true) {
      throw "shell bridge token missing";
    }

    // 广播协议：cmd_b64 + root + from
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_CMD, String(cmdB64));
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_ROOT, !!needRoot);
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_FROM, "ToolHub");

    context.sendBroadcast(it);

    ret.ok = true;
    ret.via = "BroadcastBridge:" + targetMode;
    safeLog(this.L, 'i',  "shell via broadcast ok action=" + action + " root=" + String(!!needRoot) + " target=" + targetMode + (targetPkg ? " pkg=" + targetPkg : ""));
  } catch (eB) {
    ret.err = "Broadcast err=" + String(eB);
    safeLog(this.L, 'e',  "shell via broadcast fail err=" + String(eB));
  }

  return ret;
};