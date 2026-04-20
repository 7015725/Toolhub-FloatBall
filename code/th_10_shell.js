// @version 1.0.0
// =======================【Shell：智能执行（Action优先 + 广播桥兜底）】======================
// 这段代码的主要内容/用途：执行 Shell 按钮动作时，优先尝试 ShortX 的 ShellCommand Action（如可用）；失败则走自定义广播桥（由外部接收器实际执行）。
// 注意：system_server 进程本身不直接执行 shell；这里只负责"触发执行"。
// 这段代码的主要内容/用途：通过广播桥触发 Shell 执行（仅广播桥，不再使用 ShellCommand Action）。
// 注意：system_server 进程本身不直接执行 shell；外部接收器负责实际执行。
FloatBallAppWM.prototype.execShellSmart = function(cmdB64, needRoot) {
  var ret = { ok: false, via: "", err: "" };

  try {
    var action = String(this.config.SHELL_BRIDGE_ACTION || CONST_SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
    var it = new android.content.Intent(action);

    // # 固定广播协议：cmd_b64 + root + from（不再发送明文 cmd，避免协议漂移）
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_CMD, String(cmdB64));
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_ROOT, !!needRoot);
    // # from：来源标记，仅用于接收端识别/日志，不参与权限判断
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


