// @version 1.0.8
// =======================【Shell 按钮诊断】=======================
FloatBallAppWM.prototype.getShellDiagPreviewText = function(cmdPlain, cmdB64) {
  var p = "";
  try { p = cmdPlain ? String(cmdPlain) : ""; } catch(eP0) { p = ""; }
  if ((!p || p.length <= 0) && cmdB64 && typeof decodeBase64Utf8 === "function") {
    try { p = String(decodeBase64Utf8(String(cmdB64)) || ""); } catch(eP1) { p = ""; }
  }
  if (!p || p.length <= 0) p = "[cmd_b64 only]";
  try { p = p.replace(/[\r\n\t]+/g, " ").replace(/^\s+|\s+$/g, ""); } catch(eP2) {}
  if (p.length > 220) p = p.substring(0, 220) + "...";
  return p;
};

FloatBallAppWM.prototype.logShellButtonDiagnostics = function(btn, idx) {
  try {
    var title = "";
    try { title = String(btn && btn.title ? btn.title : ""); } catch(eTitle) { title = ""; }
    var cmdB64 = "";
    var cmdPlain = "";
    try { cmdB64 = (btn && btn.cmd_b64 !== undefined && btn.cmd_b64 !== null) ? String(btn.cmd_b64) : ""; } catch(eB64) { cmdB64 = ""; }
    try { cmdPlain = (btn && btn.cmd !== undefined && btn.cmd !== null) ? String(btn.cmd) : ""; } catch(eCmd) { cmdPlain = ""; }

    var root = false;
    try {
      if (btn && btn.root !== undefined && btn.root !== null) {
        var rs = String(btn.root).replace(/^\s+|\s+$/g, "").toLowerCase();
        root = (rs === "true" || rs === "1" || rs === "yes" || rs === "on");
      }
    } catch(eRoot) { root = false; }

    var preview = this.getShellDiagPreviewText ? this.getShellDiagPreviewText(cmdPlain, cmdB64) : String(cmdPlain || "");
    safeLog(this.L, 'i', "shell diag idx=" + String(idx) + " title=" + title + " root=" + String(root) + " cmd_len=" + String(cmdPlain ? cmdPlain.length : 0) + " cmd_b64_len=" + String(cmdB64 ? cmdB64.length : 0) + " preview=" + preview);

    var normalized = preview.replace(/\s+/g, " ");
    if (normalized.indexOf("am shortx run SHARED-DA-") >= 0) {
      safeLog(this.L, 'i', "shell diag shared-da idx=" + String(idx) + " title=" + title + " note=SHARED-DA is suitable for ToolHub invocation");
    } else if (normalized.indexOf("am shortx run DA-") >= 0) {
      safeLog(this.L, 'w', "shell diag private-da idx=" + String(idx) + " title=" + title + " note=private DA may not exist or may fail outside original ShortX rule");
    }
  } catch(eDiag) {
    try { safeLog(this.L, 'w', "shell diag fail idx=" + String(idx) + " err=" + String(eDiag)); } catch(eLog) {}
  }
};

// =======================【WM 线程：按钮动作执行】======================
FloatBallAppWM.prototype.execButtonAction = function(btn, idx) {
  try {
    if (btn && String(btn.type || "") === "shell" && this.logShellButtonDiagnostics) this.logShellButtonDiagnostics(btn, idx);
  } catch(eBefore) {
    try { safeLog(this.L, 'w', "shell diag before exec fail idx=" + String(idx) + " err=" + String(eBefore)); } catch(eLog0) {}
  }

  // # 点击防抖
  // 这段代码的主要内容/用途：防止在按钮面板上连续/乱点导致重复执行与 UI 状态机冲突（可能触发 system_server 异常重启）。
  if (!this.guardClick("btn_exec_" + String(idx), 380, null)) return;

  try {
  if (!btn || !btn.type) {
    this.toast("按钮#" + idx + " 未配置");
    safeLog(this.L, 'w',  "btn#" + String(idx) + " no type");
    return;
  }

  function parseBoolLike(v, defVal) {
    try {
      if (v === undefined || v === null) return !!defVal;
      if (typeof v === "boolean") return !!v;
      if (typeof v === "number") return Number(v) !== 0;
      var s = String(v).replace(/^\s+|\s+$/g, "").toLowerCase();
      if (s === "true" || s === "1" || s === "yes" || s === "y" || s === "on") return true;
      if (s === "false" || s === "0" || s === "no" || s === "n" || s === "off") return false;
    } catch(eBool) {}
    return !!defVal;
  }

  var t = String(btn.type);
  safeLog(this.L, 'i',  "btn click idx=" + String(idx) + " type=" + t + " title=" + String(btn.title || ""));

  if (t === "open_settings") {
    this.showPanelAvoidBall("settings");
    return;
  }

  if (t === "open_viewer") {
    function tailLogText(path, maxLen) {
      var txt = FileIO.readText(path);
      if (!txt) return "(日志文件不存在或为空: " + path + ")";
      txt = String(txt);
      if (txt.length > maxLen) txt = "[...前略...]\n" + txt.substring(txt.length - maxLen);
      try {
        var lines = txt.split("\n");
        if (lines.length > 1) txt = lines.reverse().join("\n");
      } catch(eRev) { safeLog(null, 'e', "catch " + String(eRev)); }
      return txt;
    }
    var runLogPath = (this.L && this.L._filePathForToday) ? this.L._filePathForToday() : "";
    if (!runLogPath) runLogPath = PATH_LOG_DIR + "/ShortX_ToolHub_" + (new java.text.SimpleDateFormat("yyyyMMdd").format(new java.util.Date())) + ".log";
    var initLogPath = PATH_LOG_DIR + "/init.log";
    var content = "【启动/更新日志】\n" + tailLogText(initLogPath, 15000) +
      "\n\n【运行日志】\n" + tailLogText(runLogPath, 15000);
    if (content.length > 32000) content = content.substring(0, 32000) + "\n[...后略...]";
    this.showViewerPanel("今日日志 (倒序)", content);
    return;
  }

  if (t === "toast") {
    var msg = "";
    if (btn.text !== undefined && btn.text !== null) msg = String(btn.text);
    else if (btn.title) msg = String(btn.title);
    else msg = "按钮#" + idx;
    this.toast(msg);
    return;
  }

  if (t === "app") {
    var pkg = btn.pkg ? String(btn.pkg) : "";
    if (!pkg) { this.toast("按钮#" + idx + " 缺少 pkg"); return; }

    var it = context.getPackageManager().getLaunchIntentForPackage(pkg);
    if (!it) { this.toast("无法启动 " + pkg); return; }

    it.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);

// # 系统级跨用户启动：Context.startActivityAsUser
// 这段代码的主要内容/用途：支持"主应用/分身应用"选择，避免弹出选择器或误启动到另一用户。
// 说明：当未配置 launchUserId 时，默认使用 0（主用户）；失败则回退 startActivity。
var launchUid = 0;
try {
  if (btn.launchUserId != null && String(btn.launchUserId).length > 0) launchUid = parseInt(String(btn.launchUserId), 10);
} catch(eLU0) { launchUid = 0; }
if (isNaN(launchUid)) launchUid = 0;

try {
  // 运行日志：记录跨用户启动参数（便于定位分身启动失败原因）
  safeLog(this.L, 'i',  "startAsUser(app) idx=" + idx + " pkg=" + pkg + " launchUserId=" + launchUid);
  if (launchUid !== 0) {
    context.startActivityAsUser(it, android.os.UserHandle.of(launchUid));
  } else {
    context.startActivity(it);
  }
} catch (eA) {
  // # 兜底：某些 ROM/权限限制下 startActivityAsUser 可能抛异常，回退普通启动
  try { context.startActivity(it);  } catch(eA2) { safeLog(null, 'e', "catch " + String(eA2)); }
  this.toast("启动失败");
  safeLog(this.L, 'e',  "start app fail pkg=" + pkg + " uid=" + String(launchUid) + " err=" + String(eA));
}
return;
  }

  if (t === "shell") {
    // # 这段代码的主要内容/用途：执行 shell（支持 cmd 明文 与 cmd_b64；最终会确保发送/执行的是"真正的 base64"）
    // # 修复点：历史配置里有些按钮把"明文命令"误存进 cmd_b64（或 b64 被破坏），会导致广播接收端解码失败→看起来"没效果"。
    var cmdB64 = (btn.cmd_b64 !== undefined && btn.cmd_b64 !== null) ? String(btn.cmd_b64) : "";
    var cmdPlain = (btn.cmd !== undefined && btn.cmd !== null) ? String(btn.cmd) : "";

    // # 1) 只有明文但没有 b64：自动补齐 b64（避免特殊字符在多层字符串传递中被破坏）
    if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
      try {
        var b64x = encodeBase64Utf8(cmdPlain);
        if (b64x && b64x.length > 0) cmdB64 = String(b64x);
       } catch(eB64a) { safeLog(null, 'e', "catch " + String(eB64a)); }
    }

    // # 2) cmd_b64 非空但无法解码：兼容旧配置，把它当作"明文命令"重新编码；同时记录日志，方便后续迁移。
    if (cmdB64 && cmdB64.length > 0) {
      try {
        var testPlain = decodeBase64Utf8(cmdB64);
        if ((!testPlain || testPlain.length === 0) && (!cmdPlain || cmdPlain.length === 0)) {
          safeLog(this.L, 'w', "cmd_b64 invalid, compat re-encode as plain idx=" + String(idx));
          cmdPlain = String(cmdB64);
          cmdB64 = "";
        }
       } catch(eB64b) { safeLog(null, 'e', "catch " + String(eB64b)); }
    }
    if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
      try {
        var b64y = encodeBase64Utf8(cmdPlain);
        if (b64y && b64y.length > 0) cmdB64 = String(b64y);
       } catch(eB64c) { safeLog(null, 'e', "catch " + String(eB64c)); }
    }

    if (!cmdB64 || cmdB64.length === 0) {
      this.toast("按钮#" + idx + " 缺少 cmd/cmd_b64");
      safeLog(this.L, 'e',  "shell missing cmd idx=" + String(idx));
      return;
    }

    // root 只接受按钮显式 true；旧按钮缺失 root 字段时使用普通权限。
    var needRoot = false;
    if (btn.root !== undefined && btn.root !== null) needRoot = parseBoolLike(btn.root, false);

    var r = this.execShellSmart(cmdB64, needRoot);
    if (r && r.ok) {
      try {
        if (btn.toastOnRun !== undefined && btn.toastOnRun !== null && String(btn.toastOnRun).length > 0) {
          this.toast(String(btn.toastOnRun));
        }
      } catch (eToastRun) { safeLog(null, 'e', "catch " + String(eToastRun)); }
      return;
    }

    this.toast("shell 广播桥发送失败");
    safeLog(this.L, 'e',  "shell all failed cmd_b64_len=" + String(cmdB64 ? cmdB64.length : 0) + " ret=" + JSON.stringify(r || {}));
    return;
  }

  if (t === "broadcast") {
    // 这段代码的主要内容/用途：发送自定义广播（兼容 btn.extra / btn.extras），并对 Shell 广播桥（shortx.toolhub.SHELL）做额外兼容（cmd/cmd_b64/root）。
    var action = btn.action ? String(btn.action) : "";
    if (!action) { this.toast("按钮#" + idx + " 缺少 action"); return; }

    var it2 = new android.content.Intent(action);
    var shellBridgeBlockErr = "";

    // # 1) 兼容字段：extra / extras（两种都认）
    var ex = null;
    try {
      if (btn.extras) ex = btn.extras;
      else if (btn.extra) ex = btn.extra;
    } catch (eEx0) { ex = null; }

    // # 2) 写入 extras（支持 number / boolean / string；其他类型一律转字符串）
    if (ex) {
      try {
        var k;
        for (k in ex) {
          if (!ex.hasOwnProperty(k)) continue;
          var v = ex[k];

          if (typeof v === "number") it2.putExtra(String(k), Number(v));
          else if (typeof v === "boolean") it2.putExtra(String(k), !!v);
          else it2.putExtra(String(k), String(v));
        }
       } catch(eE) { safeLog(null, 'e', "catch " + String(eE)); }
    }

    // # 3) 对"Shell 广播桥"做额外兼容：
    //    - 你可以在 cfg 里写 extra.cmd（明文）或 extra.cmd_b64（Base64）
    //    - 同时会补齐 root/from，并且把 cmd 明文也塞一份，方便外部 MVEL 直接读取 cmd 进行验证
    //    - 与 th_10_shell.js 保持一致：支持 setPackage / setComponent / token
    try {
      var bridgeAction = String(this.config.SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
      if (action === bridgeAction) {
        var kCmdB64 = String(this.config.SHELL_BRIDGE_EXTRA_CMD || "cmd_b64");
        var kFrom = String(this.config.SHELL_BRIDGE_EXTRA_FROM || "from");
        var kRoot = String(this.config.SHELL_BRIDGE_EXTRA_ROOT || "root");

        var bridgeMode = String(this.config.SHELL_BRIDGE_MODE || "strict");
        try { bridgeMode = bridgeMode.replace(/^\s+|\s+$/g, "").toLowerCase(); } catch(eMode) { bridgeMode = "strict"; }
        if (bridgeMode !== "compat" && bridgeMode !== "explicit" && bridgeMode !== "strict") bridgeMode = "strict";
        var targetPkg = String(this.config.SHELL_BRIDGE_TARGET_PACKAGE || "").replace(/^\s+|\s+$/g, "");
        var targetCls = String(this.config.SHELL_BRIDGE_TARGET_CLASS || "").replace(/^\s+|\s+$/g, "");
        var targetMode = "none";

        if (targetPkg && targetCls) {
          if (targetCls.charAt(0) === ".") targetCls = targetPkg + targetCls;
          it2.setComponent(new android.content.ComponentName(targetPkg, targetCls));
          targetMode = "component";
        } else if (targetPkg) {
          it2.setPackage(targetPkg);
          targetMode = "package";
        } else if (bridgeMode === "compat") {
          targetMode = "implicit";
        } else {
          shellBridgeBlockErr = "shell bridge target missing mode=" + bridgeMode;
        }

        var tokenValue = String(this.config.SHELL_BRIDGE_TOKEN || "");
        var tokenKey = String(this.config.SHELL_BRIDGE_EXTRA_TOKEN || "token");
        try { tokenValue = tokenValue.replace(/^\s+|\s+$/g, ""); } catch(eTokenTrim) {}
        try { tokenKey = tokenKey.replace(/^\s+|\s+$/g, ""); } catch(eTokenKeyTrim) {}
        var requireToken = (bridgeMode === "strict") || (this.config.SHELL_BRIDGE_REQUIRE_TOKEN === true);
        if (tokenValue) {
          if (!tokenKey) tokenKey = "token";
          it2.putExtra(tokenKey, tokenValue);
        } else if (requireToken) {
          shellBridgeBlockErr = "shell bridge token missing mode=" + bridgeMode;
        }

        var bridgeCmdPlain = "";
        var bridgeCmdB64 = "";

        try { bridgeCmdB64 = String(it2.getStringExtra(kCmdB64) || ""); } catch (eC0) { bridgeCmdB64 = ""; }
        try { bridgeCmdPlain = String(it2.getStringExtra("cmd") || ""); } catch (eC1) { bridgeCmdPlain = ""; }

        // # 有明文但没 b64：自动补 b64
        if ((!bridgeCmdB64 || bridgeCmdB64.length === 0) && bridgeCmdPlain && bridgeCmdPlain.length > 0) {
          try {
            var b64x2 = encodeBase64Utf8(bridgeCmdPlain);
            if (b64x2 && b64x2.length > 0) {
              bridgeCmdB64 = b64x2;
              it2.putExtra(kCmdB64, String(bridgeCmdB64));
            }
           } catch(eC2) { safeLog(null, 'e', "catch " + String(eC2)); }
        }

        // # 有 b64 但没明文：也补一份明文（便于外部规则验证；真正执行仍建议用 cmd_b64）
        if ((!bridgeCmdPlain || bridgeCmdPlain.length === 0) && bridgeCmdB64 && bridgeCmdB64.length > 0) {
          try {
            var decoded = decodeBase64Utf8(bridgeCmdB64);
            if (decoded && decoded.length > 0) {
              bridgeCmdPlain = decoded;
              it2.putExtra("cmd", String(bridgeCmdPlain));
            }
           } catch(eC3) { safeLog(null, 'e', "catch " + String(eC3)); }
        }

        // root 只接受显式 true；缺失字段时使用普通权限。
        try {
          if (!it2.hasExtra(kRoot)) {
            var bridgeNeedRoot = false;
            if (btn.root !== undefined && btn.root !== null) bridgeNeedRoot = parseBoolLike(btn.root, false);
            it2.putExtra(kRoot, bridgeNeedRoot);
          }
        } catch (eR0) {
          try {
            it2.putExtra(kRoot, false);
           } catch(eR1) { safeLog(null, 'e', "catch " + String(eR1)); }
        }

        // # root 类型纠正：如果外部 cfg 用了字符串 "true"/"false"，这里纠正为 boolean，避免外部 getBooleanExtra 读不到
        try {
          if (it2.hasExtra(kRoot)) {
            var bdl = it2.getExtras();
            if (bdl) {
              var raw = bdl.get(kRoot);
              if (raw != null) {
                var rawStr = String(raw).replace(/^\s+|\s+$/g, "").toLowerCase();
                if (rawStr === "true" || rawStr === "false" || rawStr === "1" || rawStr === "0") {
                  it2.removeExtra(kRoot);
                  it2.putExtra(kRoot, parseBoolLike(rawStr, false));
                }
              }
            }
          }
         } catch(eRB) { safeLog(null, 'e', "catch " + String(eRB)); }

        // # from：标识来源（便于外部执行器做白名单/审计）
        try {
          if (!it2.hasExtra(kFrom)) it2.putExtra(kFrom, "ToolHub@system_server");
        } catch (eF0) { try { it2.putExtra(kFrom, "ToolHub@system_server");  } catch(eF1) { safeLog(null, 'e', "catch " + String(eF1)); } }

        if (this.L) {
          try {
            this.L.i("broadcast(shell_bridge) action=" + action + " target=" + targetMode + (targetPkg ? " pkg=" + targetPkg : "") + " cmd_len=" + String(bridgeCmdPlain ? bridgeCmdPlain.length : 0) +
              " cmd_b64_len=" + String(bridgeCmdB64 ? bridgeCmdB64.length : 0) + " root=" + String(it2.getBooleanExtra(kRoot, false)));
           } catch(eLg) { safeLog(null, 'e', "catch " + String(eLg)); }
        }
      }
     } catch(eSB) { shellBridgeBlockErr = String(eSB); safeLog(null, 'e', "catch " + String(eSB)); }

    if (shellBridgeBlockErr) {
      this.toast("Shell 广播桥配置错误");
      safeLog(this.L, 'e', "broadcast shell bridge blocked action=" + action + " err=" + shellBridgeBlockErr);
      return;
    }

    try { context.sendBroadcast(it2); } catch (eB) { this.toast("广播失败"); safeLog(this.L, 'e',  "broadcast fail action=" + action + " err=" + String(eB)); }
    return;
  }

  if (t === "content") {
    if (typeof this.execContentAction !== "function") {
      this.toast("Content 模块未加载");
      safeLog(this.L, 'e', "content action missing execContentAction idx=" + String(idx));
      return;
    }

    var cr = this.execContentAction(btn);
    if (cr && cr.ok) {
      var title2 = btn.title ? String(btn.title) : "Content";
      if (cr.text !== undefined && cr.text !== null && String(cr.text).length > 0) {
        this.showViewerPanel(title2, String(cr.text));
        return;
      }
      if (cr.value !== undefined && cr.value !== null) {
        this.toast(String(cr.value));
        return;
      }
      if (cr.rows !== undefined && cr.rows !== null) {
        this.toast("Content 执行成功，rows=" + String(cr.rows));
        return;
      }
      this.toast("Content 执行成功");
      return;
    }

    var err2 = cr && cr.err ? String(cr.err) : "未知错误";
    this.toast("Content 执行失败: " + err2);
    safeLog(this.L, 'e', "content action fail idx=" + String(idx) + " err=" + err2);
    return;
  }

  if (t === "pointer") {
    if (typeof this.execPointerAction !== "function") {
      this.toast("指针模块未加载");
      safeLog(this.L, 'e', "pointer action missing execPointerAction idx=" + String(idx));
      return;
    }

    var pr = this.execPointerAction(btn);
    if (pr && pr.ok) return;

    var perr = pr && pr.err ? String(pr.err) : "未知错误";
    this.toast("指针启动失败: " + perr);
    safeLog(this.L, 'e', "pointer action fail idx=" + String(idx) + " err=" + perr);
    return;
  }

  if (t === "shortcut") {
  // 快捷方式默认只使用结构化 intentUri。只有显式 legacy_js 模式才允许执行旧 shortcutJsCode。
  // 旧 compat/strict/data/未知值全部收敛为 intent，避免失败时静默进入 eval。
  var spkg = btn.pkg ? String(btn.pkg) : "";
  var sid = btn.shortcutId ? String(btn.shortcutId) : "";
  var iu = (btn.intentUri != null) ? String(btn.intentUri) : "";

  var uid = 0;
  try { uid = (btn.userId != null) ? parseInt(String(btn.userId), 10) : 0; } catch(eUid0) { uid = 0; }
  if (isNaN(uid)) uid = 0;
  try {
    if (btn.launchUserId != null && String(btn.launchUserId).length > 0) {
      var lu0 = parseInt(String(btn.launchUserId), 10);
      if (!isNaN(lu0)) uid = lu0;
    }
  } catch(eLu0) { safeLog(null, 'e', "catch " + String(eLu0)); }

  function normalizeShortcutExecMode(v) {
    var mode = "intent";
    try { mode = String(v == null ? "" : v).replace(/^\s+|\s+$/g, "").toLowerCase(); } catch(eNormalizeMode) { mode = "intent"; }
    if (mode === "legacy_js" || mode === "legacy" || mode === "js") return "legacy_js";
    return "intent";
  }

  var shortcutMode = "intent";
  try {
    if (this.config && this.config.SHORTCUT_EXEC_MODE != null) shortcutMode = normalizeShortcutExecMode(this.config.SHORTCUT_EXEC_MODE);
    if (btn.shortcutExecMode != null) shortcutMode = normalizeShortcutExecMode(btn.shortcutExecMode);
  } catch(eMode) { shortcutMode = "intent"; }

  var dataErr = "";
  if (iu && iu.length > 0) {
    try {
      var dataIntent = android.content.Intent.parseUri(iu, 0);
      dataIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
      var dataUserHandle = android.os.UserHandle.of(uid);
      context.startActivityAsUser(dataIntent, dataUserHandle);
      safeLog(this.L, 'i', "shortcut(intentUri) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
      return;
    } catch(eDataSc) {
      dataErr = String(eDataSc);
      safeLog(this.L, 'w', "shortcut(intentUri) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " err=" + dataErr);
      try {
        var dataIntent2 = android.content.Intent.parseUri(iu, 0);
        dataIntent2.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(dataIntent2);
        safeLog(this.L, 'i', "shortcut(intentUri startActivity fallback) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
        return;
      } catch(eDataFallback) {
        dataErr = dataErr + " | fallback=" + String(eDataFallback);
        safeLog(this.L, 'w', "shortcut(intentUri startActivity fallback) fail pkg=" + spkg + " id=" + sid + " err=" + String(eDataFallback));
      }
    }
  } else {
    dataErr = "intentUri missing";
  }

  if (shortcutMode !== "legacy_js") {
    this.toast(iu ? "快捷方式 intentUri 启动失败" : "快捷方式缺少 intentUri");
    safeLog(this.L, 'e', "shortcut intent-only fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " err=" + dataErr);
    return;
  }

  // 旧版兼容区：只有按钮或全局配置显式为 legacy_js 时才可进入。
  if (!spkg) { this.toast("按钮#" + idx + " 缺少 pkg"); return; }
  if (!sid) { this.toast("按钮#" + idx + " 缺少 shortcutId"); return; }

  var jsCode = (btn.shortcutJsCode != null) ? String(btn.shortcutJsCode) : "";
  if (!jsCode || jsCode.length === 0) {
    this.toast("按钮#" + idx + " 未配置旧版 JS 启动代码");
    safeLog(this.L, 'e', "shortcut legacy_js missing code pkg=" + spkg + " id=" + sid + " dataErr=" + dataErr);
    return;
  }

  try {
    var __sc_intentUri = iu;
    var __sc_userId = uid;
    var rjs = eval(jsCode);
    var sret = (rjs == null) ? "" : String(rjs);
    if (sret.indexOf("ok") === 0) {
      safeLog(this.L, 'i', "shortcut(legacy_js) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
      return;
    }
    safeLog(this.L, 'e', "shortcut(legacy_js) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " ret=" + sret + " dataErr=" + dataErr);
    this.toast("旧版快捷方式 JS 启动失败: " + sret);
    return;
  } catch (eJsSc) {
    safeLog(this.L, 'e', "shortcut(legacy_js) exception pkg=" + spkg + " id=" + sid + " err=" + eJsSc + " dataErr=" + dataErr);
    this.toast("旧版快捷方式 JS 异常: " + String(eJsSc));
    return;
  }
}

  this.toast("未知 type=" + t);
  safeLog(this.L, 'w',  "unknown btn type=" + t);
  } catch (eBtn) {
    try { this.toast("按钮执行异常");  } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }
    safeLog(this.L, 'e',  "execButtonAction crash idx=" + String(idx) + " err=" + String(eBtn));
  }

};