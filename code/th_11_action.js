// @version 1.0.0
// =======================【WM 线程：按钮动作执行】======================
FloatBallAppWM.prototype.execButtonAction = function(btn, idx) {
  // # 点击防抖
  // 这段代码的主要内容/用途：防止在按钮面板上连续/乱点导致重复执行与 UI 状态机冲突（可能触发 system_server 异常重启）。
  if (!this.guardClick("btn_exec_" + String(idx), 380, null)) return;

  try {
  if (!btn || !btn.type) {
    this.toast("按钮#" + idx + " 未配置");
    safeLog(this.L, 'w',  "btn#" + String(idx) + " no type");
    return;
  }

  var t = String(btn.type);
  safeLog(this.L, 'i',  "btn click idx=" + String(idx) + " type=" + t + " title=" + String(btn.title || ""));

  if (t === "open_settings") {
    this.showPanelAvoidBall("settings");
    return;
  }

  if (t === "open_viewer") {
    var logPath = (this.L && this.L._filePathForToday) ? this.L._filePathForToday() : "";
    if (!logPath) logPath = PATH_LOG_DIR + "/ShortX_ToolHub_" + (new java.text.SimpleDateFormat("yyyyMMdd").format(new java.util.Date())) + ".log";

    var content = FileIO.readText(logPath);
    if (!content) content = "(日志文件不存在或为空: " + logPath + ")";

    if (content.length > 30000) {
        content = "[...前略...]\n" + content.substring(content.length - 30000);
    }

    // 简单的按行倒序，方便查看最新日志
    try {
        var lines = content.split("\n");
        if (lines.length > 1) {
             content = lines.reverse().join("\n");
        }
    } catch(eRev) {}

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
  try { context.startActivity(it); } catch (eA2) {}
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
      } catch (eB64a) {}
    }

    // # 2) cmd_b64 非空但无法解码：把它当作"明文命令"重新编码（保证广播桥/Action 都能吃到正确命令）
    // # 说明：decodeBase64Utf8 返回空串通常意味着 b64 非法或被破坏；而真实命令不太可能是空串。
    if (cmdB64 && cmdB64.length > 0) {
      try {
        var testPlain = decodeBase64Utf8(cmdB64);
        if ((!testPlain || testPlain.length === 0) && (!cmdPlain || cmdPlain.length === 0)) {
          cmdPlain = String(cmdB64);
          cmdB64 = "";
        }
      } catch (eB64b) {}
    }
    if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
      try {
        var b64y = encodeBase64Utf8(cmdPlain);
        if (b64y && b64y.length > 0) cmdB64 = String(b64y);
      } catch (eB64c) {}
    }

    if (!cmdB64 || cmdB64.length === 0) {
      this.toast("按钮#" + idx + " 缺少 cmd/cmd_b64");
      safeLog(this.L, 'e',  "shell missing cmd idx=" + String(idx));
      return;
    }

    // # 广播桥接收端默认以 root 执行，强制使用 root
    var needRoot = true;

    var r = this.execShellSmart(cmdB64, needRoot);
    if (r && r.ok) return;

    this.toast("shell 失败（Action + 广播桥均失败）");
    safeLog(this.L, 'e',  "shell all failed cmd_b64=" + cmdB64 + " ret=" + JSON.stringify(r || {}));
    return;
  }

  if (t === "broadcast") {
    // 这段代码的主要内容/用途：发送自定义广播（兼容 btn.extra / btn.extras），并对 Shell 广播桥（shortx.toolhub.SHELL）做额外兼容（cmd/cmd_b64/root）。
    var action = btn.action ? String(btn.action) : "";
    if (!action) { this.toast("按钮#" + idx + " 缺少 action"); return; }

    var it2 = new android.content.Intent(action);

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
      } catch (eE) {}
    }

    // # 3) 对"Shell 广播桥"做额外兼容：
    //    - 你可以在 cfg 里写 extra.cmd（明文）或 extra.cmd_b64（Base64）
    //    - 同时会补齐 root/from，并且把 cmd 明文也塞一份，方便外部 MVEL 直接读取 cmd 进行验证
    try {
      var bridgeAction = String(this.config.SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
      if (action === bridgeAction) {
        var kCmdB64 = String(this.config.SHELL_BRIDGE_EXTRA_CMD || "cmd_b64");
        var kFrom = String(this.config.SHELL_BRIDGE_EXTRA_FROM || "from");
        var kRoot = String(this.config.SHELL_BRIDGE_EXTRA_ROOT || "root");

        var cmdPlain = "";
        var cmdB64 = "";

        try { cmdB64 = String(it2.getStringExtra(kCmdB64) || ""); } catch (eC0) { cmdB64 = ""; }
        try { cmdPlain = String(it2.getStringExtra("cmd") || ""); } catch (eC1) { cmdPlain = ""; }

        // # 有明文但没 b64：自动补 b64
        if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
          try {
            var b64x = encodeBase64Utf8(cmdPlain);
            if (b64x && b64x.length > 0) {
              cmdB64 = b64x;
              it2.putExtra(kCmdB64, String(cmdB64));
            }
          } catch (eC2) {}
        }

        // # 有 b64 但没明文：也补一份明文（便于外部规则验证；真正执行仍建议用 cmd_b64）
        if ((!cmdPlain || cmdPlain.length === 0) && cmdB64 && cmdB64.length > 0) {
          try {
            var decoded = decodeBase64Utf8(cmdB64);
            if (decoded && decoded.length > 0) {
              cmdPlain = decoded;
              it2.putExtra("cmd", String(cmdPlain));
            }
          } catch (eC3) {}
        }

        // # root：广播桥接收端默认以 root 执行，强制传递 true
        try {
          if (!it2.hasExtra(kRoot)) {
            it2.putExtra(kRoot, true);
          }
        } catch (eR0) {
          try {
            it2.putExtra(kRoot, true);
          } catch (eR1) {}
        }


        // # root 类型纠正：如果外部 cfg 用了字符串 "true"/"false"，这里纠正为 boolean，避免外部 getBooleanExtra 读不到
        try {
          if (it2.hasExtra(kRoot)) {
            var bdl = it2.getExtras();
            if (bdl) {
              var raw = bdl.get(kRoot);
              if (raw != null) {
                var rawStr = String(raw);
                if (rawStr === "true" || rawStr === "false") {
                  it2.removeExtra(kRoot);
                  it2.putExtra(kRoot, rawStr === "true");
                }
              }
            }
          }
        } catch (eRB) {}

        // # from：标识来源（便于外部执行器做白名单/审计）
        try {
          if (!it2.hasExtra(kFrom)) it2.putExtra(kFrom, "ToolHub@system_server");
        } catch (eF0) { try { it2.putExtra(kFrom, "ToolHub@system_server"); } catch (eF1) {} }

        if (this.L) {
          try {
            this.L.i("broadcast(shell_bridge) action=" + action + " cmd_len=" + String(cmdPlain ? cmdPlain.length : 0) +
              " cmd_b64_len=" + String(cmdB64 ? cmdB64.length : 0) + " root=" + String(it2.getBooleanExtra(kRoot, false)));
          } catch (eLg) {}
        }
      }
    } catch (eSB) {}

    try { context.sendBroadcast(it2); } catch (eB) { this.toast("广播失败"); safeLog(this.L, 'e',  "broadcast fail action=" + action + " err=" + String(eB)); }
    return;
  }

  if (t === "shortcut") {
  // 这段代码的主要内容/用途：仅使用 JavaScript(startActivityAsUser) 执行快捷方式，取消 Shell 与所有兜底，避免弹出主/分身选择器。
  // 说明：
  // 1) 运行时只执行按钮字段 shortcutJsCode（由"选择快捷方式列表"点选自动生成，可手动微调）
  // 2) 不再调用 am start，不再回退 LauncherApps.startShortcut（用户要求：取消 shell、取消兜底）
  // 3) 目标 userId：launchUserId > userId（用于锁定主/分身）

  var spkg = btn.pkg ? String(btn.pkg) : "";
  var sid = btn.shortcutId ? String(btn.shortcutId) : "";
  var iu = (btn.intentUri != null) ? String(btn.intentUri) : "";

  var uid = 0;
  try { uid = (btn.userId != null) ? parseInt(String(btn.userId), 10) : 0; } catch(eUid0) { uid = 0; }
  if (isNaN(uid)) uid = 0;

  // # 启动 userId 优先级：launchUserId > userId
  try {
    if (btn.launchUserId != null && String(btn.launchUserId).length > 0) {
      var lu0 = parseInt(String(btn.launchUserId), 10);
      if (!isNaN(lu0)) uid = lu0;
    }
  } catch(eLu0) {}

  if (!spkg) { this.toast("按钮#" + idx + " 缺少 pkg"); return; }
  if (!sid) { this.toast("按钮#" + idx + " 缺少 shortcutId"); return; }

  // # JavaScript 执行：只执行 shortcutJsCode
  var jsCode = (btn.shortcutJsCode != null) ? String(btn.shortcutJsCode) : "";
  if (!jsCode || jsCode.length === 0) {
    this.toast("按钮#" + idx + " 未配置 JS 启动代码");
    return;
  }

  try {
    // # 提供少量上下文变量给脚本使用（可选）
    // - __sc_intentUri: 当前按钮 intentUri
    // - __sc_userId: 当前目标 userId（已合并 launchUserId）
    var __sc_intentUri = iu;
    var __sc_userId = uid;

    var rjs = eval(jsCode);

    // # 约定：返回值以 ok 开头视为成功；以 err 开头视为失败（失败也不兜底）
    var sret = (rjs == null) ? "" : String(rjs);
    if (sret.indexOf("ok") === 0) {
      safeLog(this.L, 'i',  "shortcut(js-only) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
      return;
    }

    safeLog(this.L, 'e',  "shortcut(js-only) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " ret=" + sret);
    this.toast("快捷方式 JS 启动失败: " + sret);
    return;
  } catch (eJsSc) {
    safeLog(this.L, 'e',  "shortcut(js-only) exception pkg=" + spkg + " id=" + sid + " err=" + eJsSc);
    this.toast("快捷方式 JS 异常: " + String(eJsSc));
    return;
  }
}

  this.toast("未知 type=" + t);
  safeLog(this.L, 'w',  "unknown btn type=" + t);
  } catch (eBtn) {
    try { this.toast("按钮执行异常"); } catch (e0) {}
    safeLog(this.L, 'e',  "execButtonAction crash idx=" + String(idx) + " err=" + String(eBtn));
  }

};

