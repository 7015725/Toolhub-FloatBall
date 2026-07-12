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
