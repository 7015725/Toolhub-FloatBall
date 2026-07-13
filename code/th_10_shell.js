// @version 1.0.8
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

// =======================【入口文件更新检测与手动替换提醒】=======================
// ToolHub.js 是 ShortX JS 任务入口和信任根，只检测版本并提示用户手动替换，绝不进入子模块更新事务。
(function() {
  try {
    var ENTRY_FILE_NAME = "ToolHub.js";
    var ENTRY_NOTICE_FILE = ".entry_update_notice_version";

    function entryVersionNumber(value) {
      var n = parseInt(String(value === undefined || value === null ? "0" : value), 10);
      return isNaN(n) || n < 0 ? 0 : n;
    }

    function getLocalEntryVersion() {
      try {
        if (typeof TOOLHUB_ENTRY_VERSION !== "undefined") {
          var explicitVersion = entryVersionNumber(TOOLHUB_ENTRY_VERSION);
          if (explicitVersion > 0) return explicitVersion;
        }
      } catch(eExplicit) {}
      try {
        if (typeof MIN_TRUSTED_MANIFEST_VERSION !== "undefined") {
          return entryVersionNumber(MIN_TRUSTED_MANIFEST_VERSION);
        }
      } catch(eMinimum) {}
      return 0;
    }

    function getRemoteEntryMeta() {
      try {
        if (typeof __trustedManifest !== "undefined" && __trustedManifest && __trustedManifest.entry) {
          return __trustedManifest.entry;
        }
      } catch(eManifest) {}
      return null;
    }

    function getEntryUpdateInfo() {
      var localVersion = getLocalEntryVersion();
      var meta = getRemoteEntryMeta();
      var remoteVersion = meta ? entryVersionNumber(meta.version) : 0;
      var name = meta && meta.name ? String(meta.name) : ENTRY_FILE_NAME;
      var hash = meta && meta.sha256 ? String(meta.sha256).toLowerCase() : "";
      var size = meta ? Number(meta.size || 0) : 0;
      if (isNaN(size) || size < 0) size = 0;
      return {
        available: remoteVersion > 0 && localVersion > 0 && remoteVersion > localVersion,
        localVersion: localVersion,
        remoteVersion: remoteVersion,
        name: name,
        sha256: hash,
        size: size,
        manualUpdate: !meta || meta.manualUpdate !== false,
        message: "ToolHub 入口文件有更新，请替换 ShortX JS 任务中的 ToolHub.js。"
      };
    }

    function applyEntryUpdateState() {
      var info = getEntryUpdateInfo();
      try {
        if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
          TOOLHUB_UPDATE_STATE.entryUpdateAvailable = info.available === true;
          TOOLHUB_UPDATE_STATE.entryLocalVersion = Number(info.localVersion || 0);
          TOOLHUB_UPDATE_STATE.entryRemoteVersion = Number(info.remoteVersion || 0);
          TOOLHUB_UPDATE_STATE.entryName = String(info.name || ENTRY_FILE_NAME);
          TOOLHUB_UPDATE_STATE.entrySha256 = String(info.sha256 || "");
          TOOLHUB_UPDATE_STATE.entrySize = Number(info.size || 0);
          TOOLHUB_UPDATE_STATE.entryManualUpdate = info.manualUpdate !== false;
          TOOLHUB_UPDATE_STATE.entryMessage = String(info.message || "");
        }
      } catch(eState) {
        try { safeLog(null, 'w', "apply entry update state fail: " + String(eState)); } catch(eLogState) {}
      }
      return info;
    }

    function getEntryNoticePath() {
      try {
        if (typeof getToolHubRootDir === "function") return String(getToolHubRootDir()) + "/" + ENTRY_NOTICE_FILE;
      } catch(eRoot) {}
      return "";
    }

    function wasEntryVersionNotified(versionValue) {
      var path = getEntryNoticePath();
      if (!path) return false;
      try {
        if (typeof readFirstLine === "function") {
          return entryVersionNumber(readFirstLine(path)) === entryVersionNumber(versionValue);
        }
      } catch(eRead) {}
      return false;
    }

    function saveEntryVersionNotified(versionValue) {
      var path = getEntryNoticePath();
      if (!path) return false;
      try {
        if (typeof writeTextFile === "function") return writeTextFile(path, String(entryVersionNumber(versionValue)));
      } catch(eWrite) {}
      return false;
    }

    function showEntryUpdateToastOnce() {
      var info = applyEntryUpdateState();
      if (!info.available || wasEntryVersionNotified(info.remoteVersion)) return false;
      var text = "ToolHub 入口文件有更新，请手动替换 ShortX 任务中的 ToolHub.js";
      try {
        var appObj = null;
        try {
          if (typeof TOOLHUB_ACTIVE_APP !== "undefined" && TOOLHUB_ACTIVE_APP) appObj = TOOLHUB_ACTIVE_APP;
        } catch(eActive) {}
        if (appObj && typeof appObj.toast === "function") appObj.toast(text);
        else android.widget.Toast.makeText(context, text, android.widget.Toast.LENGTH_LONG).show();
        saveEntryVersionNotified(info.remoteVersion);
        try { writeLog("Entry update notice shown local=" + String(info.localVersion) + " remote=" + String(info.remoteVersion)); } catch(eWriteLog) {}
        return true;
      } catch(eToast) {
        try { writeLog("Entry update notice failed: " + String(eToast)); } catch(eLogToast) {}
      }
      return false;
    }

    try {
      if (typeof checkToolHubModuleUpdatesNow === "function" && checkToolHubModuleUpdatesNow.__entryUpdateWrapped !== true) {
        var oldCheckToolHubModuleUpdatesNow = checkToolHubModuleUpdatesNow;
        var wrappedCheckToolHubModuleUpdatesNow = function() {
          var result = oldCheckToolHubModuleUpdatesNow.apply(this, arguments);
          var info = applyEntryUpdateState();
          try {
            if (result && info.available) {
              result.entryUpdateAvailable = true;
              result.entryLocalVersion = info.localVersion;
              result.entryRemoteVersion = info.remoteVersion;
              result.entryManualUpdate = true;
              result.msg = Number(result.count || 0) > 0
                ? String(result.msg || "") + " 入口文件也有更新，需手动替换。"
                : "发现 ToolHub 入口文件更新，请手动替换 ShortX 任务中的 ToolHub.js。";
              try {
                new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({
                  run: function() { showEntryUpdateToastOnce(); }
                }));
              } catch(ePostNotice) {}
            }
          } catch(eRet) {}
          return result;
        };
        wrappedCheckToolHubModuleUpdatesNow.__entryUpdateWrapped = true;
        checkToolHubModuleUpdatesNow = wrappedCheckToolHubModuleUpdatesNow;
      }
    } catch(eWrapCheck) {
      try { safeLog(null, 'w', "wrap update check for entry fail: " + String(eWrapCheck)); } catch(eLogWrap) {}
    }

    applyEntryUpdateState();
    try {
      new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new java.lang.Runnable({
        run: function() { showEntryUpdateToastOnce(); }
      }), 1200);
    } catch(eSchedule) {
      try { safeLog(null, 'w', "schedule entry update notice fail: " + String(eSchedule)); } catch(eLogSchedule) {}
    }
  } catch(eEntryUpdateBootstrap) {
    try { safeLog(null, 'e', "entry update notice bootstrap fail: " + String(eEntryUpdateBootstrap)); } catch(eLogBootstrap) {}
  }
})();
