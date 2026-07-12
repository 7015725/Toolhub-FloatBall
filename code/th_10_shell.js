// @version 1.0.6
// =======================【Shell：广播桥执行】======================
// 仅通过广播桥发送 shell 命令，由外部接收器实际执行。
// 注意：system_server 进程本身不直接执行 shell。
FloatBallAppWM.prototype.execShellSmart = function(cmdB64, needRoot) {
  var requestedRoot = (needRoot === true);
  var ret = {
    ok: false,
    via: "",
    err: "",
    action: "",
    targetMode: "",
    targetPackage: "",
    targetClass: "",
    bridgeMode: "",
    requireToken: false,
    hasToken: false,
    rootRequested: requestedRoot,
    root: requestedRoot,
    sent: false,
    note: ""
  };

  try {
    var action = String(this.config.SHELL_BRIDGE_ACTION || CONST_SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
    try { action = action.replace(/^\s+|\s+$/g, ""); } catch(eActionTrim) {}
    if (!action) throw "shell bridge action missing";
    var it = new android.content.Intent(action);
    ret.action = action;

    // 默认 strict：必须显式指定广播目标和非空令牌。
    // compat 仅用于用户明确选择的旧协议兼容，允许隐式广播。
    var bridgeMode = String(this.config.SHELL_BRIDGE_MODE || "strict");
    try { bridgeMode = bridgeMode.replace(/^\s+|\s+$/g, "").toLowerCase(); } catch(eMode) { bridgeMode = "strict"; }
    if (bridgeMode !== "compat" && bridgeMode !== "explicit" && bridgeMode !== "strict") bridgeMode = "strict";
    ret.bridgeMode = bridgeMode;

    var targetPkg = String(this.config.SHELL_BRIDGE_TARGET_PACKAGE || "").replace(/^\s+|\s+$/g, "");
    var targetCls = String(this.config.SHELL_BRIDGE_TARGET_CLASS || "").replace(/^\s+|\s+$/g, "");
    var targetMode = "none";

    if (targetPkg && targetCls) {
      if (targetCls.charAt(0) === ".") targetCls = targetPkg + targetCls;
      it.setComponent(new android.content.ComponentName(targetPkg, targetCls));
      targetMode = "component";
    } else if (targetPkg) {
      it.setPackage(targetPkg);
      targetMode = "package";
    } else if (bridgeMode === "compat") {
      targetMode = "implicit";
    } else {
      throw "shell bridge target missing mode=" + bridgeMode;
    }
    ret.targetMode = targetMode;
    ret.targetPackage = targetPkg;
    ret.targetClass = targetCls;

    var tokenValue = String(this.config.SHELL_BRIDGE_TOKEN || "");
    var tokenKey = String(this.config.SHELL_BRIDGE_EXTRA_TOKEN || "token");
    try { tokenValue = tokenValue.replace(/^\s+|\s+$/g, ""); } catch(eTokenTrim) {}
    try { tokenKey = tokenKey.replace(/^\s+|\s+$/g, ""); } catch(eTokenKeyTrim) {}
    var requireToken = (bridgeMode === "strict") || (this.config.SHELL_BRIDGE_REQUIRE_TOKEN === true);
    ret.requireToken = requireToken;
    ret.hasToken = !!tokenValue;
    if (tokenValue) {
      if (!tokenKey) tokenKey = "token";
      it.putExtra(tokenKey, tokenValue);
    } else if (requireToken) {
      throw "shell bridge token missing mode=" + bridgeMode;
    }

    // 广播协议：cmd_b64 + root + from。root 只接受调用方显式 true。
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_CMD, String(cmdB64));
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_ROOT, requestedRoot);
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_FROM, "ToolHub");

    context.sendBroadcast(it);

    ret.ok = true;
    ret.sent = true;
    ret.via = "BroadcastBridge:" + targetMode;
    ret.note = "broadcast sent only; receiver execution is not confirmed";
    safeLog(this.L, 'i', "shell via broadcast ok action=" + action + " root=" + String(requestedRoot) + " target=" + targetMode + (targetPkg ? " pkg=" + targetPkg : "") + " mode=" + bridgeMode + " token=" + String(!!tokenValue));
  } catch (eB) {
    ret.err = "Broadcast err=" + String(eB);
    ret.note = "broadcast send blocked or failed";
    safeLog(this.L, 'e', "shell via broadcast fail action=" + String(ret.action || "") + " mode=" + String(ret.bridgeMode || "") + " target=" + String(ret.targetMode || "") + " err=" + String(eB));
  }

  try {
    var via = ret && ret.via ? String(ret.via) : "";
    safeLog(this.L, (ret && ret.ok) ? 'i' : 'w', "shell diag result ok=" + String(!!(ret && ret.ok)) + " via=" + via + " root=" + String(requestedRoot) + " cmd_b64_len=" + String(cmdB64 ? String(cmdB64).length : 0) + " action=" + String(ret && ret.action ? ret.action : "") + " target=" + String(ret && ret.targetMode ? ret.targetMode : "") + " mode=" + String(ret && ret.bridgeMode ? ret.bridgeMode : "") + " token=" + String(!!(ret && ret.hasToken)) + " err_type=" + String(ret && ret.err ? "broadcast_error" : ""));
    if (via.indexOf("BroadcastBridge") >= 0) {
      safeLog(this.L, 'i', "shell diag bridge sent note=BroadcastBridge sent only means broadcast was sent; it does not prove ShortX task executed successfully");
    }
  } catch(eAfter) {
    try { safeLog(this.L, 'w', "shell diag after exec fail err=" + String(eAfter)); } catch(eLog1) {}
  }

  return ret;
};