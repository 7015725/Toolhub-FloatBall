// @version 1.0.1
// =======================【Shell：广播桥执行】======================
// 仅通过广播桥发送 shell 命令，由外部接收器实际执行。
// 注意：system_server 进程本身不直接执行 shell。
FloatBallAppWM.prototype.execShellSmart = function(cmdB64, needRoot) {
  var ret = { ok: false, via: "", err: "" };

  try {
    var action = String(this.config.SHELL_BRIDGE_ACTION || CONST_SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
    var it = new android.content.Intent(action);

    // 广播协议：cmd_b64 + root + from
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_CMD, String(cmdB64));
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_ROOT, !!needRoot);
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_FROM, "ToolHub");

    context.sendBroadcast(it);

    ret.ok = true;
    ret.via = "BroadcastBridge";
    safeLog(this.L, 'i',  "shell via broadcast ok action=" + action + " root=" + String(!!needRoot));
  } catch (eB) {
    ret.err = "Broadcast err=" + String(eB);
    safeLog(this.L, 'e',  "shell via broadcast fail err=" + String(eB));
  }

  return ret;
};
