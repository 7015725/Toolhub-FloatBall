// @version 1.0.9
// =======================【Shell：广播桥兼容配置】======================
// 旧版 ToolHub 依赖 shortx.toolhub.SHELL 隐式广播。安全配置曾把默认模式改为 strict，
// 但没有同时提供显式目标，导致旧设备和新安装设备的全部 Shell 按钮在发送前被拒绝。
(function() {
  try {
    if (typeof ConfigValidator !== "undefined" && ConfigValidator && ConfigValidator.schemas) {
      // th_10 先于 th_12 加载；这里建立可用默认值，th_12 的 putSchema 不会再覆盖。
      ConfigValidator.schemas.SHELL_BRIDGE_MODE = {
        type: "enum",
        values: ["compat", "explicit", "strict"],
        default: "compat"
      };
      ConfigValidator.schemas.SHELL_BRIDGE_REQUIRE_TOKEN = { type: "bool", default: false };
      ConfigValidator.schemas.SHELL_BRIDGE_MIGRATION_VERSION = { type: "int", min: 0, max: 9999, default: 0 };
    }
  } catch(eSchema) {}

  try {
    if (typeof ConfigManager !== "undefined" && ConfigManager && ConfigManager.defaultSettings) {
      // 默认必须是可执行组合：compat + implicit + no required token。
      ConfigManager.defaultSettings.SHELL_BRIDGE_MODE = "compat";
      ConfigManager.defaultSettings.SHELL_BRIDGE_REQUIRE_TOKEN = false;
      if (typeof ConfigManager.defaultSettings.SHELL_BRIDGE_MIGRATION_VERSION === "undefined") {
        ConfigManager.defaultSettings.SHELL_BRIDGE_MIGRATION_VERSION = 0;
      }
    }
  } catch(eDefault) {}
})();

// =======================【Shell：广播桥执行】======================
// 仅通过广播桥发送 shell 命令，由外部接收器实际执行。
// 注意：system_server 进程本身不直接执行 shell。
FloatBallAppWM.prototype.execShellSmart = function(cmdB64, needRoot) {
  var requestedRoot = (needRoot === true);
  var migrationTargetVersion = 1;
  var ret = {
    ok: false,
    via: "",
    err: "",
    errType: "",
    action: "",
    targetMode: "",
    targetPackage: "",
    targetClass: "",
    bridgeMode: "",
    configSource: "",
    migrationVersion: 0,
    migrated: false,
    requireToken: false,
    hasToken: false,
    rootRequested: requestedRoot,
    root: requestedRoot,
    sent: false,
    note: ""
  };

  function trimText(value) {
    try { return String(value === undefined || value === null ? "" : value).replace(/^\s+|\s+$/g, ""); }
    catch(e) { return ""; }
  }

  function parseBool(value, fallbackValue) {
    try {
      if (value === true || value === false) return value === true;
      if (value === undefined || value === null) return fallbackValue === true;
      if (typeof value === "number") return Number(value) !== 0;
      var text = trimText(value).toLowerCase();
      if (text === "true" || text === "1" || text === "yes" || text === "on") return true;
      if (text === "false" || text === "0" || text === "no" || text === "off" || text === "") return false;
    } catch(e) {}
    return fallbackValue === true;
  }

  function readPersistedState() {
    var result = { readable: false, hasMode: false };
    try {
      if (typeof FileIO === "undefined" || !FileIO || typeof FileIO.readText !== "function") return result;
      if (typeof PATH_SETTINGS === "undefined" || !PATH_SETTINGS) return result;
      var text = FileIO.readText(PATH_SETTINGS);
      if (!text) return result;
      var saved = JSON.parse(String(text));
      if (!saved || typeof saved !== "object" || Object.prototype.toString.call(saved) === "[object Array]") return result;
      result.readable = true;
      result.hasMode = Object.prototype.hasOwnProperty.call(saved, "SHELL_BRIDGE_MODE");
    } catch(eRead) {}
    return result;
  }

  function resolveConfig(app) {
    var cfg = app.config || {};
    var persisted = readPersistedState();
    var rawMode = trimText(cfg.SHELL_BRIDGE_MODE).toLowerCase();
    var targetPkg = trimText(cfg.SHELL_BRIDGE_TARGET_PACKAGE);
    var targetCls = trimText(cfg.SHELL_BRIDGE_TARGET_CLASS);
    var tokenValue = trimText(cfg.SHELL_BRIDGE_TOKEN);
    var tokenKey = trimText(cfg.SHELL_BRIDGE_EXTRA_TOKEN) || "token";
    var migrationVersion = parseInt(String(cfg.SHELL_BRIDGE_MIGRATION_VERSION || "0"), 10);
    if (isNaN(migrationVersion) || migrationVersion < 0) migrationVersion = 0;

    var mode = rawMode;
    if (mode !== "compat" && mode !== "explicit" && mode !== "strict") {
      mode = (targetPkg || targetCls) ? "explicit" : "compat";
    }

    var requireToken = parseBool(cfg.SHELL_BRIDGE_REQUIRE_TOKEN, false);
    var migrated = false;
    var migrationReason = "";

    if (migrationVersion < migrationTargetVersion) {
      // 无显式目标的 strict/explicit 是必定失败的旧配置组合，迁移回原协议的隐式广播。
      if (!targetPkg && !targetCls && mode !== "compat") {
        mode = "compat";
        requireToken = false;
        migrated = true;
        migrationReason = "legacy_missing_target";
      } else if (!targetPkg && !targetCls && mode === "compat" && requireToken && !tokenValue) {
        // 兼容模式没有令牌时，不应被后来新增的 REQUIRE_TOKEN 默认值拦截。
        requireToken = false;
        migrated = true;
        migrationReason = "legacy_missing_token";
      }

      cfg.SHELL_BRIDGE_MODE = mode;
      cfg.SHELL_BRIDGE_REQUIRE_TOKEN = requireToken;
      cfg.SHELL_BRIDGE_MIGRATION_VERSION = migrationTargetVersion;
      migrationVersion = migrationTargetVersion;

      try {
        if (typeof ConfigManager !== "undefined" && ConfigManager && typeof ConfigManager.saveSettings === "function") {
          ConfigManager.saveSettings(cfg);
        }
      } catch(eSave) {
        safeLog(app.L, 'w', "shell bridge migration save fail err=" + String(eSave));
      }
    }

    var targetMode = "none";
    if (targetPkg && targetCls) targetMode = "component";
    else if (targetPkg) targetMode = "package";
    else if (mode === "compat") targetMode = "implicit";

    var source = persisted.hasMode ? "persisted" : "default";
    if (migrated) source = "migrated";

    var result = {
      action: trimText(cfg.SHELL_BRIDGE_ACTION || (typeof CONST_SHELL_BRIDGE_ACTION !== "undefined" ? CONST_SHELL_BRIDGE_ACTION : "shortx.toolhub.SHELL")),
      mode: mode,
      source: source,
      targetMode: targetMode,
      targetPackage: targetPkg,
      targetClass: targetCls,
      requireToken: (mode === "strict") || requireToken,
      tokenValue: tokenValue,
      tokenKey: tokenKey,
      hasToken: !!tokenValue,
      migrationVersion: migrationVersion,
      migrated: migrated,
      migrationReason: migrationReason
    };

    try {
      if (!app.state) app.state = {};
      var logKey = [result.mode, result.source, result.targetMode, String(result.requireToken), String(result.hasToken), String(result.migrationVersion)].join("|");
      if (app.state.shellBridgeConfigLogKey !== logKey) {
        app.state.shellBridgeConfigLogKey = logKey;
        safeLog(app.L, 'i', "shell bridge config mode=" + result.mode +
          " source=" + result.source +
          " target=" + result.targetMode +
          " require_token=" + String(result.requireToken) +
          " has_token=" + String(result.hasToken) +
          " migration_version=" + String(result.migrationVersion) +
          " migrated=" + String(result.migrated) +
          (result.migrationReason ? " reason=" + result.migrationReason : ""));
      }
    } catch(eLog) {}

    return result;
  }

  try {
    var resolved = resolveConfig(this);
    if (!resolved) throw "shell bridge config resolve failed";

    var action = String(resolved.action || "shortx.toolhub.SHELL");
    if (!action) throw "shell bridge action missing";
    var it = new android.content.Intent(action);

    ret.action = action;
    ret.bridgeMode = resolved.mode;
    ret.configSource = resolved.source;
    ret.migrationVersion = Number(resolved.migrationVersion || 0);
    ret.migrated = resolved.migrated === true;
    ret.targetMode = resolved.targetMode;
    ret.targetPackage = resolved.targetPackage;
    ret.targetClass = resolved.targetClass;
    ret.requireToken = resolved.requireToken === true;
    ret.hasToken = resolved.hasToken === true;

    if (resolved.targetMode === "component") {
      var targetCls = String(resolved.targetClass || "");
      if (targetCls.charAt(0) === ".") targetCls = String(resolved.targetPackage || "") + targetCls;
      it.setComponent(new android.content.ComponentName(String(resolved.targetPackage || ""), targetCls));
      ret.targetClass = targetCls;
    } else if (resolved.targetMode === "package") {
      it.setPackage(String(resolved.targetPackage || ""));
    } else if (resolved.targetMode !== "implicit") {
      ret.errType = "target_missing";
      throw "shell bridge target missing mode=" + String(resolved.mode || "");
    }

    if (resolved.tokenValue) {
      it.putExtra(String(resolved.tokenKey || "token"), String(resolved.tokenValue));
    } else if (resolved.requireToken) {
      ret.errType = "token_missing";
      throw "shell bridge token missing mode=" + String(resolved.mode || "");
    }

    // 广播协议：cmd_b64 + root + from。root 只接受调用方显式 true。
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_CMD, String(cmdB64));
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_ROOT, requestedRoot);
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_FROM, "ToolHub");

    context.sendBroadcast(it);

    ret.ok = true;
    ret.sent = true;
    ret.via = "BroadcastBridge:" + String(resolved.targetMode || "");
    ret.note = "broadcast sent only; receiver execution is not confirmed";
    safeLog(this.L, 'i', "shell via broadcast ok action=" + action +
      " root=" + String(requestedRoot) +
      " target=" + String(resolved.targetMode || "") +
      (resolved.targetPackage ? " pkg=" + String(resolved.targetPackage) : "") +
      " mode=" + String(resolved.mode || "") +
      " source=" + String(resolved.source || "") +
      " migrated=" + String(resolved.migrated === true) +
      " token=" + String(resolved.hasToken === true));
  } catch (eB) {
    if (!ret.errType) ret.errType = "broadcast_error";
    ret.err = "Broadcast err=" + String(eB);
    ret.note = "broadcast send blocked or failed";
    safeLog(this.L, 'e', "shell via broadcast fail action=" + String(ret.action || "") +
      " mode=" + String(ret.bridgeMode || "") +
      " source=" + String(ret.configSource || "") +
      " target=" + String(ret.targetMode || "") +
      " migrated=" + String(ret.migrated) +
      " err_type=" + String(ret.errType || "broadcast_error") +
      " err=" + String(eB));
  }

  try {
    var via = ret && ret.via ? String(ret.via) : "";
    safeLog(this.L, (ret && ret.ok) ? 'i' : 'w', "shell diag result ok=" + String(!!(ret && ret.ok)) +
      " via=" + via +
      " root=" + String(requestedRoot) +
      " cmd_b64_len=" + String(cmdB64 ? String(cmdB64).length : 0) +
      " action=" + String(ret && ret.action ? ret.action : "") +
      " target=" + String(ret && ret.targetMode ? ret.targetMode : "") +
      " mode=" + String(ret && ret.bridgeMode ? ret.bridgeMode : "") +
      " source=" + String(ret && ret.configSource ? ret.configSource : "") +
      " migrated=" + String(!!(ret && ret.migrated)) +
      " token=" + String(!!(ret && ret.hasToken)) +
      " err_type=" + String(ret && ret.errType ? ret.errType : ""));
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
