// @version 1.0.3
// =======================【安全兼容配置安装器】======================
// 这段代码的主要内容/用途：在不改变现有执行逻辑的前提下，注入后续 Shell / Shortcut / Content 加固需要的配置项。
// 默认值全部保持兼容：Shell=compat，Shortcut=compat，Content=audit，ToolApp 横滑比例仍为 1.08。
(function() {
  function putSchema(key, schema) {
    try {
      if (typeof ConfigValidator === "undefined" || !ConfigValidator || !ConfigValidator.schemas) return;
      if (typeof ConfigValidator.schemas[key] === "undefined") ConfigValidator.schemas[key] = schema;
    } catch(e) {}
  }

  function putDefault(key, value) {
    try {
      if (typeof ConfigManager === "undefined" || !ConfigManager || !ConfigManager.defaultSettings) return;
      if (typeof ConfigManager.defaultSettings[key] === "undefined") ConfigManager.defaultSettings[key] = value;
    } catch(e) {}
  }

  putSchema("TOOLAPP_BACK_SURFACE_DOMINANCE", { type: "float", min: 1.0, max: 3.0, default: 1.08 });
  putSchema("SHELL_BRIDGE_MODE", { type: "enum", values: ["compat", "explicit", "strict"], default: "compat" });
  putSchema("SHELL_BRIDGE_TARGET_PACKAGE", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_TARGET_CLASS", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_EXTRA_TOKEN", { type: "string", default: "token" });
  putSchema("SHELL_BRIDGE_TOKEN", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_REQUIRE_TOKEN", { type: "bool", default: false });
  putSchema("SHORTCUT_EXEC_MODE", { type: "enum", values: ["compat", "strict"], default: "compat" });
  putSchema("CONTENT_SECURITY_MODE", { type: "enum", values: ["off", "audit", "strict"], default: "audit" });
  putSchema("CONTENT_URI_ALLOWLIST", { type: "string", default: "content://settings/system/|content://settings/secure/|content://settings/global/" });

  putDefault("TOOLAPP_BACK_SURFACE_DOMINANCE", 1.08);
  putDefault("SHELL_BRIDGE_MODE", "compat");
  putDefault("SHELL_BRIDGE_TARGET_PACKAGE", "");
  putDefault("SHELL_BRIDGE_TARGET_CLASS", "");
  putDefault("SHELL_BRIDGE_EXTRA_TOKEN", "token");
  putDefault("SHELL_BRIDGE_TOKEN", "");
  putDefault("SHELL_BRIDGE_REQUIRE_TOKEN", false);
  putDefault("SHORTCUT_EXEC_MODE", "compat");
  putDefault("CONTENT_SECURITY_MODE", "audit");
  putDefault("CONTENT_URI_ALLOWLIST", "content://settings/system/|content://settings/secure/|content://settings/global/");

  // 紧凑布局兼容：默认值 7 不应被 schema 最小值 8 静默抬高。
  try {
    if (ConfigValidator && ConfigValidator.schemas && ConfigValidator.schemas.PANEL_PADDING_DP) {
      ConfigValidator.schemas.PANEL_PADDING_DP.min = 4;
    }
    if (ConfigManager && ConfigManager.defaultSchema) {
      for (var i = 0; i < ConfigManager.defaultSchema.length; i++) {
        var it = ConfigManager.defaultSchema[i];
        if (it && String(it.key || "") === "PANEL_PADDING_DP") it.min = 4;
      }
    }
  } catch(ePad) {}
})();

// =======================【新增：改大小后安全重建悬浮球】======================
FloatBallAppWM.prototype.rebuildBallForNewSize = function(keepPanels) {
  if (this.state.closing) return false;
  if (!this.state.wm) return false;
  if (!this.state.addedBall) return false;
  if (!this.state.ballRoot) return false;
  if (!this.state.ballLp) return false;
  if (this.state.dragging) return false;

  var oldSize = this.state.ballLp.height;
  if (!oldSize || oldSize <= 0) oldSize = this.getDockInfo().ballSize;

  var oldX = this.state.ballLp.x;
  var oldY = this.state.ballLp.y;

  var oldCenterX = oldX + Math.round(oldSize / 2);
  var oldCenterY = oldY + Math.round(oldSize / 2);

  if (!keepPanels) {
    this.hideAllPanels();
  }
  this.cancelDockTimer();

  this.state.docked = false;
  this.state.dockSide = null;

  this.safeRemoveView(this.state.ballRoot, "ballRoot-rebuild");

  this.state.ballRoot = null;
  this.state.ballContent = null;
  this.state.ballLp = null;
  this.state.addedBall = false;

  this.createBallViews();

  var di = this.getDockInfo();
  var newSize = di.ballSize;

  var newX = oldCenterX - Math.round(newSize / 2);
  var newY = oldCenterY - Math.round(newSize / 2);

  var maxX = Math.max(0, this.state.screen.w - newSize);
  var maxY = Math.max(0, this.state.screen.h - newSize);

  newX = this.clamp(newX, 0, maxX);
  newY = this.clamp(newY, 0, maxY);

  var lp = new android.view.WindowManager.LayoutParams(
    newSize,
    newSize,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
    android.graphics.PixelFormat.TRANSLUCENT
  );

  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
  lp.x = newX;
  lp.y = newY;

  try {
    this.state.wm.addView(this.state.ballRoot, lp);
    this.state.ballLp = lp;
    this.state.addedBall = true;
  } catch (eAdd) {
    try { this.toast("重建悬浮球失败: " + String(eAdd));  } catch(eT) { safeLog(null, 'e', "catch " + String(eT)); }
    safeLog(this.L, 'e',  "rebuildBall add fail err=" + String(eAdd));
    return false;
  }

  this.savePos(this.state.ballLp.x, this.state.ballLp.y);
  this.touchActivity();
  safeLog(this.L, 'i',  "rebuildBall ok size=" + String(newSize) + " x=" + String(newX) + " y=" + String(newY));
  return true;
};

// =======================【修复：设置项保存与即时生效补丁】======================
// 这段代码的主要内容/用途：修复 single_choice 数字枚举被转成字符串后保存失败的问题；补齐主题、面板、指针设置保存后的运行态刷新。
(function() {
  function normalizeEnumValueBySchema(key, value) {
    try {
      if (typeof ConfigValidator === "undefined" || !ConfigValidator || !ConfigValidator.schemas) return value;
      var schema = ConfigValidator.schemas[String(key || "")];
      if (!schema || String(schema.type || "") !== "enum" || !schema.values) return value;
      for (var i = 0; i < schema.values.length; i++) {
        if (String(schema.values[i]) === String(value)) return schema.values[i];
      }
    } catch(e) {}
    return value;
  }

  function installSettingsEffectPatch() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubSettingsEffectPatchInstalled === true) return true;

      // 1) 修复 enum 类型：UI 传入 "0"/"1"/"2" 时，保存前还原为 schema 里的原始类型。
      try {
        if (typeof ConfigValidator !== "undefined" && ConfigValidator && typeof ConfigValidator.validate === "function") {
          var oldValidate = ConfigValidator.validate;
          ConfigValidator.validate = function(key, value) {
            return oldValidate.call(this, key, normalizeEnumValueBySchema(key, value));
          };
        }
      } catch(eValidatePatch) {}

      if (typeof proto.__toolHubNormalizeSettingValue !== "function") {
        proto.__toolHubNormalizeSettingValue = function(k, v) {
          return normalizeEnumValueBySchema(k, v);
        };
      }

      if (typeof proto.setPendingValue === "function" && proto.__toolHubSetPendingValuePatched !== true) {
        var oldSetPendingValue = proto.setPendingValue;
        proto.setPendingValue = function(k, v) {
          return oldSetPendingValue.call(this, k, this.__toolHubNormalizeSettingValue ? this.__toolHubNormalizeSettingValue(k, v) : normalizeEnumValueBySchema(k, v));
        };
        proto.__toolHubSetPendingValuePatched = true;
      }

      proto.isThemeEffectKey = function(k) {
        k = String(k || "");
        return k === "SETTINGS_THEME" ||
               k === "THEME_MODE" ||
               k === "THEME_DAY_BG_HEX" ||
               k === "THEME_DAY_TEXT_HEX" ||
               k === "THEME_NIGHT_BG_HEX" ||
               k === "THEME_NIGHT_TEXT_HEX" ||
               k === "PANEL_BG_ALPHA";
      };

      proto.isPanelLayoutEffectKey = function(k) {
        k = String(k || "");
        return k === "PANEL_ROWS" ||
               k === "PANEL_COLS" ||
               k === "PANEL_ITEM_SIZE_DP" ||
               k === "PANEL_GAP_DP" ||
               k === "PANEL_PADDING_DP" ||
               k === "PANEL_ICON_SIZE_DP" ||
               k === "PANEL_LABEL_ENABLED" ||
               k === "PANEL_LABEL_TEXT_SIZE_SP" ||
               k === "PANEL_LABEL_TOP_MARGIN_DP" ||
               k === "PANEL_POS_GRAVITY" ||
               k === "PANEL_CUSTOM_OFFSET_Y" ||
               k === "BALL_PANEL_GAP_DP";
      };

      proto.isPointerEffectKey = function(k) {
        k = String(k || "");
        return k.indexOf("POINTER_") === 0;
      };

      proto.isBallVisualEffectKey = function(k) {
        k = String(k || "");
        return k === "BALL_SIZE_DP" ||
               k === "BALL_PNG_MODE" ||
               k === "BALL_ICON_TYPE" ||
               k === "BALL_ICON_FILE_PATH" ||
               k === "BALL_ICON_RES_ID" ||
               k === "BALL_ICON_RES_NAME" ||
               k === "BALL_ICON_SIZE_DP" ||
               k === "BALL_ICON_TINT_HEX" ||
               k === "BALL_BG_COLOR_HEX" ||
               k === "BALL_IDLE_ALPHA";
      };

      proto.refreshPointerAfterSettingsChanged = function() {
        try {
          if (!this.state || !this.state.pointerTool) return false;
          var st = this.ensurePointerToolState ? this.ensurePointerToolState() : this.state.pointerTool;
          if (!st || !st.active) return false;
          if (st.lp) {
            st.lp.width = st.pointerW;
            st.lp.height = st.pointerH;
            try { if (st.root && st.wm) st.wm.updateViewLayout(st.root, st.lp); } catch(eUpdate) { safeLog(this.L, "w", "pointer update layout fail: " + String(eUpdate)); }
          }
          try { if (st.root) st.root.invalidate(); } catch(eInvalidate) {}
          return true;
        } catch(e) {
          safeLog(this.L, "w", "refreshPointerAfterSettingsChanged fail: " + String(e));
        }
        return false;
      };

      proto.refreshVisiblePanelsAfterSettingsChanged = function(reason) {
        try {
          if (!this.state || this.state.closing) return false;
          if (this.state.toolAppActive && this.replaceToolAppPage) {
            var route = "";
            try { route = String(this.state.toolAppRoute || ""); } catch(eRoute) { route = ""; }
            this.replaceToolAppPage(route || "settings");
            return true;
          }
          if (this.state.addedPanel) this.hideMainPanel();
          if (this.state.addedSettings) {
            this.hideSettingsPanel();
            this.showPanelAvoidBall("settings");
          }
          if (this.state.addedViewer) this.hideViewerPanel();
          return true;
        } catch(e) {
          safeLog(this.L, "w", "refreshVisiblePanelsAfterSettingsChanged fail reason=" + String(reason || "") + " err=" + String(e));
        }
        return false;
      };

      proto.scheduleSettingsEffectRefresh = function(reason, themeChanged, panelChanged) {
        try {
          if (!this.state || this.state.closing) return false;
          if (themeChanged) {
            try { if (this.refreshMonetColors) this.refreshMonetColors(this.isDarkTheme()); } catch(eColor) {}
            try { if (this.state.ballContent && this.updateBallContentBackground) this.updateBallContentBackground(this.state.ballContent); } catch(eBallBg) {}
          }
          var self = this;
          if (this.state.settingsEffectRefreshPosted) return true;
          this.state.settingsEffectRefreshPosted = true;
          var run = function() {
            try { self.state.settingsEffectRefreshPosted = false; } catch(eFlag) {}
            try {
              if (self.refreshVisiblePanelsAfterSettingsChanged) self.refreshVisiblePanelsAfterSettingsChanged(reason);
            } catch(eRun) { safeLog(self.L, "w", "settings effect refresh run fail: " + String(eRun)); }
          };
          if (this.state.h) {
            this.state.h.post(new JavaAdapter(java.lang.Runnable, { run: run }));
          } else {
            run();
          }
          return true;
        } catch(e) {
          safeLog(this.L, "w", "scheduleSettingsEffectRefresh fail: " + String(e));
        }
        return false;
      };

      if (typeof proto.applyImmediateEffectsForKey === "function" && proto.__toolHubApplyImmediateEffectsPatched !== true) {
        var oldApplyImmediateEffectsForKey = proto.applyImmediateEffectsForKey;
        proto.applyImmediateEffectsForKey = function(k) {
          var key = String(k || "");
          try {
            if (key === "LOG_ENABLE" || key === "LOG_DEBUG" || key === "LOG_KEEP_DAYS") {
              return oldApplyImmediateEffectsForKey.call(this, key);
            }

            var themeChanged = this.isThemeEffectKey && this.isThemeEffectKey(key);
            var panelChanged = this.isPanelLayoutEffectKey && this.isPanelLayoutEffectKey(key);
            var pointerChanged = this.isPointerEffectKey && this.isPointerEffectKey(key);
            var ballChanged = this.isBallVisualEffectKey && this.isBallVisualEffectKey(key);

            if (ballChanged) {
              try { oldApplyImmediateEffectsForKey.call(this, key); } catch(eOldBall) { safeLog(this.L, "w", "old ball apply fail key=" + key + " err=" + String(eOldBall)); }
              if (key === "BALL_IDLE_ALPHA") {
                try { this.rebuildBallForNewSize(); } catch(eIdleAlpha) { safeLog(this.L, "w", "apply BALL_IDLE_ALPHA fail: " + String(eIdleAlpha)); }
              }
              return;
            }

            if (key === "EDGE_VISIBLE_RATIO") {
              return oldApplyImmediateEffectsForKey.call(this, key);
            }

            if (pointerChanged) {
              if (this.refreshPointerAfterSettingsChanged) this.refreshPointerAfterSettingsChanged();
              return;
            }

            if (themeChanged || panelChanged) {
              if (this.scheduleSettingsEffectRefresh) this.scheduleSettingsEffectRefresh(key, themeChanged, panelChanged);
              return;
            }

            return oldApplyImmediateEffectsForKey.call(this, key);
          } catch(e0) {
            safeLog(null, 'e', "applyImmediateEffectsForKey patched catch key=" + key + " err=" + String(e0));
          }
        };
        proto.__toolHubApplyImmediateEffectsPatched = true;
      }

      proto.__toolHubSettingsEffectPatchInstalled = true;
      return true;
    } catch(eInstall) {
      try { safeLog(null, 'e', "install settings effect patch fail: " + String(eInstall)); } catch(eLog) {}
    }
    return false;
  }

  if (!installSettingsEffectPatch()) {
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        for (var i = 0; i < 40; i++) {
          if (installSettingsEffectPatch()) return;
          try { java.lang.Thread.sleep(250); } catch(eSleep) {}
        }
      }})).start();
    } catch(eThread) {}
  }
})();

// =======================【修复：指针松手取字最终命中补丁】======================
// 这段代码的主要内容/用途：修复松手瞬间拖动扫描尚未返回时被误判为空白，导致无法获取文本控件的问题。
(function() {
  function installPointerReleaseFinalPatch() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubPointerReleaseFinalPatchInstalled === true) return true;
      if (typeof proto.ensurePointerToolState !== "function") return false;
      if (typeof proto.finishPointerTextPickOnRelease !== "function") return false;
      if (typeof proto.finishPointerTextPickAfterRelease !== "function") return false;
      if (typeof proto.schedulePointerInspectAsync !== "function") return false;
      if (typeof proto.updatePointerInspect !== "function") return false;
      if (typeof proto.copyPointerTextToClipboard !== "function") return false;

      if (proto.__toolHubPointerEnsureBudgetPatched !== true) {
        var oldEnsurePointerToolState = proto.ensurePointerToolState;
        proto.ensurePointerToolState = function() {
          var st = oldEnsurePointerToolState.call(this);
          try {
            if (st) {
              if (isNaN(Number(st.inspectMaxFinalMs)) || Number(st.inspectMaxFinalMs) < 180) st.inspectMaxFinalMs = 180;
              if (isNaN(Number(st.inspectMaxFinalNodes)) || Number(st.inspectMaxFinalNodes) < 420) st.inspectMaxFinalNodes = 420;
            }
          } catch(eBudget) {}
          return st;
        };
        proto.__toolHubPointerEnsureBudgetPatched = true;
      }

      proto.finishPointerReleaseCopyTextNow = function(reason) {
        var st = this.ensurePointerToolState();
        if (!st || !st.active || st.closed || st.mode !== "text_pick") return false;
        if (!st.currentText || !st.currentRect) return false;
        var rect = st.currentRect;
        var textValue = String(st.currentText || "");
        if (!textValue) return false;
        var copied = this.copyPointerTextToClipboard(textValue);
        this.setPointerToolResult({
          ok: true,
          type: "text_pick",
          code: "TEXT_PICK_SUCCESS",
          message: "取字成功",
          value: textValue,
          clipboard: copied === true,
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
          data: { releaseFinal: String(reason || "") }
        });
        this.toast(copied ? "已复制: " + textValue : textValue);
        this.closePointerTool(copied ? "已复制到剪贴板" : "取字完成", true);
        return true;
      };

      proto.closePointerReleaseEmpty = function() {
        this.setPointerToolResult({
          ok: false,
          type: "cancel",
          code: "POINTER_RELEASE_EMPTY",
          message: "空白处松手，已关闭指针",
          value: "",
          data: {}
        });
        this.closePointerTool("空白处松手", true);
        return true;
      };

      proto.schedulePointerInspectAsync = function(force, reason, finishAfterResult) {
        var st = this.ensurePointerToolState();
        if (!st.active || st.closed || st.mode !== "text_pick") return false;
        var hp = this.getPointerHotspot();
        var moved = Math.abs(hp.x - st.lastQueryX) > this.dp(4) || Math.abs(hp.y - st.lastQueryY) > this.dp(4);
        if (force !== true && !moved) return false;
        if (force !== true) {
          var now = th17Now();
          if (now - st.inspectLastRequestTs < 80) return false;
          st.inspectLastRequestTs = now;
        }
        if (!this.ensurePointerInspectWorker(st)) return false;
        st.inspectLatestX = hp.x;
        st.inspectLatestY = hp.y;
        st.inspectLatestSeq = ++st.inspectSeq;
        st.inspectLatestForce = force === true;
        st.inspectLatestReason = String(reason || "");
        if (finishAfterResult === true) st.inspectFinishAfterResult = true;
        st.inspectPending = true;
        if (!st.inspectRunning) this.runPointerInspectWorker(st);
        return true;
      };

      proto.finishPointerTextPickAfterRelease = function() {
        var st = this.ensurePointerToolState();
        if (!st.active || st.closed || st.mode !== "text_pick") return;
        var releaseTs = Number(st.releaseTs || th17Now());
        if (isNaN(releaseTs) || releaseTs <= 0) releaseTs = th17Now();
        st.releaseTs = releaseTs;
        if (st.currentText && st.currentRect) {
          this.finishPointerReleaseCopyTextNow("after_release_final");
          return;
        }
        this.closePointerReleaseEmpty();
      };

      proto.finishPointerTextPickOnRelease = function() {
        var st = this.ensurePointerToolState();
        if (!st.active || st.closed || st.mode !== "text_pick") return false;
        st.releaseTs = th17Now();
        if (st.currentText && st.currentRect) {
          this.finishPointerReleaseCopyTextNow("release_cached");
          return true;
        }
        var scheduled = false;
        try {
          scheduled = this.schedulePointerInspectAsync(true, "release_final", true) === true;
        } catch(eSchedule) {
          scheduled = false;
          safeLog(this.L, "e", "pointer release_final schedule fail: " + String(eSchedule));
        }
        if (scheduled) return true;
        try {
          this.updatePointerInspect(true);
        } catch(eSync) {
          safeLog(this.L, "e", "pointer release_final sync inspect fail: " + String(eSync));
        }
        if (st.currentText && st.currentRect) {
          this.finishPointerReleaseCopyTextNow("release_sync_fallback");
          return true;
        }
        this.closePointerReleaseEmpty();
        return true;
      };

      proto.__toolHubPointerReleaseFinalPatchInstalled = true;
      return true;
    } catch(eInstall) {
      try { safeLog(null, 'e', "install pointer release final patch fail: " + String(eInstall)); } catch(eLog) {}
    }
    return false;
  }

  if (!installPointerReleaseFinalPatch()) {
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        for (var i = 0; i < 60; i++) {
          if (installPointerReleaseFinalPatch()) return;
          try { java.lang.Thread.sleep(250); } catch(eSleep) {}
        }
      }})).start();
    } catch(eThread) {}
  }
})();
