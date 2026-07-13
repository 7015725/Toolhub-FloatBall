// @version 1.0.7
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
    if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
    var proto = FloatBallAppWM.prototype;
    if (proto.__toolHubEntryUpdateNoticeBootstrapInstalled === true) return;

    var ENTRY_FILE_NAME = "ToolHub.js";
    var ENTRY_URL = "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/main/ToolHub.js";
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
        url: ENTRY_URL,
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
          TOOLHUB_UPDATE_STATE.entryUrl = String(info.url || ENTRY_URL);
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

    function copyEntryUrl(appObj) {
      try {
        var cm = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
        cm.setPrimaryClip(android.content.ClipData.newPlainText("ToolHub.js", ENTRY_URL));
        try {
          if (appObj && typeof appObj.toast === "function") appObj.toast("入口文件地址已复制");
          else android.widget.Toast.makeText(context, "入口文件地址已复制", android.widget.Toast.LENGTH_SHORT).show();
        } catch(eToast) {}
        return true;
      } catch(eCopy) {
        try { safeLog(appObj && appObj.L ? appObj.L : null, 'w', "copy entry url fail: " + String(eCopy)); } catch(eLogCopy) {}
        return false;
      }
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

    proto.getToolHubEntryUpdateInfo = function() {
      return applyEntryUpdateState();
    };

    proto.copyToolHubEntryUrl = function() {
      return copyEntryUrl(this);
    };

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
              result.entryUrl = info.url;
              result.msg = Number(result.count || 0) > 0
                ? String(result.msg || "") + " 入口文件也有更新，需手动替换。"
                : "发现 ToolHub 入口文件更新，请手动替换 ShortX 任务中的 ToolHub.js。";
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

    function installEntryUpdateUiPatch() {
      try {
        if (proto.__toolHubEntryUpdateNoticeUiInstalled === true) return true;
        if (typeof proto.getToolHubUpdateState !== "function" ||
            typeof proto.getToolHubUpdateVisual !== "function" ||
            typeof proto.createToolHubUpdateDetailBox !== "function") return false;

        var oldGetToolHubUpdateState = proto.getToolHubUpdateState;
        proto.getToolHubUpdateState = function() {
          var state = oldGetToolHubUpdateState.apply(this, arguments);
          var info = applyEntryUpdateState();
          if (!state) state = {};
          state.entryUpdateAvailable = info.available === true;
          state.entryLocalVersion = Number(info.localVersion || 0);
          state.entryRemoteVersion = Number(info.remoteVersion || 0);
          state.entryName = String(info.name || ENTRY_FILE_NAME);
          state.entrySha256 = String(info.sha256 || "");
          state.entrySize = Number(info.size || 0);
          state.entryManualUpdate = true;
          state.entryMessage = String(info.message || "");
          state.entryUrl = String(info.url || ENTRY_URL);
          return state;
        };

        var oldGetToolHubUpdateVisual = proto.getToolHubUpdateVisual;
        proto.getToolHubUpdateVisual = function(updateState, T, isDark) {
          var visual = oldGetToolHubUpdateVisual.apply(this, arguments);
          var entryAvailable = updateState && updateState.entryUpdateAvailable === true;
          if (!entryAvailable || !visual) return visual;
          var statusName = String(updateState.status || "unknown");
          if (statusName === "error" || statusName === "checking" || statusName === "installing" ||
              statusName === "restarting" || (statusName === "updated" && updateState.needRestart === true)) return visual;
          var C = this.ui && this.ui.colors ? this.ui.colors : {};
          var warningColor = T.warning || C.warning || android.graphics.Color.parseColor(isDark ? "#FBBF24" : "#B45309");
          visual.icon = "↑";
          visual.iconColor = warningColor;
          visual.labelColor = T.onSurface;
          visual.detailColor = T.onSurface2;
          visual.bg = T.warningContainer || this.withAlpha(warningColor, isDark ? 0.20 : 0.12);
          visual.stroke = this.withAlpha(warningColor, isDark ? 0.30 : 0.20);
          if (statusName === "available" && Number(updateState.availableCount || 0) > 0) {
            visual.label = "模块和入口均有更新";
            visual.sub = String(updateState.availableCount) + "项+入口";
          } else {
            visual.label = "入口文件有更新";
            visual.sub = "手动替换";
          }
          return visual;
        };

        var oldCreateToolHubUpdateDetailBox = proto.createToolHubUpdateDetailBox;
        proto.createToolHubUpdateDetailBox = function() {
          var self = this;
          var box = oldCreateToolHubUpdateDetailBox.apply(this, arguments);
          var updateState = this.getToolHubUpdateState ? this.getToolHubUpdateState() : null;
          if (!box || !updateState || updateState.entryUpdateAvailable !== true) return box;
          try {
            var isDark = this.isDarkTheme();
            var T = this.getSettingsColorScheme();
            var C = this.ui && this.ui.colors ? this.ui.colors : {};
            var warningColor = T.warning || C.warning || android.graphics.Color.parseColor(isDark ? "#FBBF24" : "#B45309");
            var card = new android.widget.LinearLayout(context);
            card.setOrientation(android.widget.LinearLayout.VERTICAL);
            card.setPadding(this.dp(12), this.dp(10), this.dp(12), this.dp(10));
            card.setBackground(this.ui.createStrokeDrawable(
              T.warningContainer || this.withAlpha(warningColor, isDark ? 0.18 : 0.10),
              this.withAlpha(warningColor, isDark ? 0.42 : 0.28),
              this.dp(1), this.dp(16)
            ));

            var title = new android.widget.TextView(context);
            title.setText("入口文件需要手动替换");
            title.setTextColor(T.onSurface);
            title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
            title.setTypeface(null, android.graphics.Typeface.BOLD);
            card.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

            var versionText = new android.widget.TextView(context);
            versionText.setText(
              String(updateState.entryName || ENTRY_FILE_NAME) + "  " +
              String(updateState.entryLocalVersion || 0) + " → " +
              String(updateState.entryRemoteVersion || 0)
            );
            versionText.setTextColor(T.onSurface2);
            versionText.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
            versionText.setPadding(0, this.dp(5), 0, 0);
            card.addView(versionText, new android.widget.LinearLayout.LayoutParams(-1, -2));

            var desc = new android.widget.TextView(context);
            desc.setText("入口文件是 ShortX 任务中的信任根，不会自动覆盖。请复制最新版 ToolHub.js 的完整内容并替换当前入口代码。");
            desc.setTextColor(T.onSurface2);
            desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
            desc.setLineSpacing(this.dp(1), 1.05);
            desc.setPadding(0, this.dp(5), 0, 0);
            card.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));

            var copyButton = this.ui.createSolidButton(this, "复制入口地址", warningColor, T.onPrimary, function() {
              copyEntryUrl(self);
            });
            try { copyButton.setContentDescription("复制最新版 ToolHub.js 地址"); } catch(eDescButton) {}
            var buttonLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
            buttonLp.setMargins(0, this.dp(10), 0, 0);
            card.addView(copyButton, buttonLp);

            var cardLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
            cardLp.setMargins(0, this.dp(10), 0, 0);
            box.addView(card, cardLp);
          } catch(eCard) {
            try { safeLog(this.L, 'w', "render entry update card fail: " + String(eCard)); } catch(eLogCard) {}
          }
          return box;
        };

        proto.__toolHubEntryUpdateNoticeUiInstalled = true;
        return true;
      } catch(eInstallUi) {
        try { safeLog(null, 'w', "install entry update ui patch fail: " + String(eInstallUi)); } catch(eLogInstallUi) {}
      }
      return false;
    }

    proto.__toolHubEntryUpdateNoticeBootstrapInstalled = true;
    applyEntryUpdateState();

    try {
      var mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
      var attempts = { count: 0 };
      var patchTask = null;
      patchTask = new java.lang.Runnable({
        run: function() {
          attempts.count++;
          var installed = installEntryUpdateUiPatch();
          if (!installed && attempts.count < 12) {
            try { mainHandler.postDelayed(patchTask, 400); } catch(eRetryPost) {}
            return;
          }
          try { mainHandler.postDelayed(new java.lang.Runnable({ run: function() { showEntryUpdateToastOnce(); } }), 1200); } catch(eNoticePost) {}
        }
      });
      mainHandler.postDelayed(patchTask, 200);
    } catch(eSchedule) {
      try { safeLog(null, 'w', "schedule entry update notice fail: " + String(eSchedule)); } catch(eLogSchedule) {}
    }
  } catch(eEntryUpdateBootstrap) {
    try { safeLog(null, 'e', "entry update notice bootstrap fail: " + String(eEntryUpdateBootstrap)); } catch(eLogBootstrap) {}
  }
})();
