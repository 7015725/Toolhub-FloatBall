// @version 1.0.6
// =======================【工具：面板位置持久化】======================
FloatBallAppWM.prototype.savePanelState = function(key, state) {
  if (!key || !state) return;
  try {
    if (!this.config.PANEL_STATES) this.config.PANEL_STATES = {};
    this.config.PANEL_STATES[key] = state;
    // 面板拖动结束通常不频繁，直接保存配置即可。
    ConfigManager.saveSettings(this.config);
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
};

FloatBallAppWM.prototype.loadPanelState = function(key) {
  if (!key || !this.config.PANEL_STATES) return null;
  return this.config.PANEL_STATES[key];
};

// =======================【工具：配置持久化】======================
FloatBallAppWM.prototype.saveConfig = function(obj) {
  try {
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        this.config[k] = obj[k];
      }
    }
    if (this.L) this.L.updateConfig(this.config);
    return ConfigManager.saveSettings(this.config);
  } catch (e) { return false; }
};

// =======================【设置面板：schema】======================
FloatBallAppWM.prototype.getConfigSchema = function() {
  return ConfigManager.loadSchema();
};

function normalizeToolHubEnumValueBySchema(key, value) {
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

FloatBallAppWM.prototype.isThemeEffectKey = function(k) {
  return String(k || "") === "PANEL_BG_ALPHA";
};

FloatBallAppWM.prototype.isPanelLayoutEffectKey = function(k) {
  k = String(k || "");
  return k === "PANEL_WIDTH_PERCENT" ||
         k === "PANEL_AUTO_MAX_COLS" ||
         k === "PANEL_MIN_CARD_WIDTH_DP" ||
         k === "PANEL_CARD_HEIGHT_DP" ||
         k === "PANEL_ROWS" ||
         k === "PANEL_GAP_DP" ||
         k === "PANEL_PADDING_DP" ||
         k === "PANEL_ICON_SIZE_DP" ||
         k === "PANEL_LABEL_ENABLED" ||
         k === "PANEL_LABEL_TEXT_SIZE_SP" ||
         k === "PANEL_LABEL_TOP_MARGIN_DP" ||
         k === "BALL_PANEL_GAP_DP";
};

FloatBallAppWM.prototype.isPointerEffectKey = function(k) {
  k = String(k || "");
  return k.indexOf("POINTER_") === 0;
};

FloatBallAppWM.prototype.isBallVisualEffectKey = function(k) {
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

FloatBallAppWM.prototype.refreshPointerAfterSettingsChanged = function() {
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

FloatBallAppWM.prototype.refreshVisiblePanelsAfterSettingsChanged = function(reason) {
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

FloatBallAppWM.prototype.scheduleSettingsEffectRefresh = function(reason, themeChanged, panelChanged) {
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

// =======================【设置面板：临时编辑缓存】======================
FloatBallAppWM.prototype.beginEditConfig = function() {
  try {
    var schema = this.getConfigSchema();
    var p = {};
    var i;
    for (i = 0; i < schema.length; i++) {
      if (!schema[i] || !schema[i].key) continue;
      var k = String(schema[i].key);
      p[k] = this.config[k];
    }
    this.state.pendingUserCfg = p;
    this.state.pendingDirty = false;
    return true;
  } catch (e0) {
    this.state.pendingUserCfg = null;
    this.state.pendingDirty = false;
    return false;
  }
};
FloatBallAppWM.prototype.getPendingValue = function(k) {
  if (this.state.pendingUserCfg && this.state.pendingUserCfg.hasOwnProperty(k)) return this.state.pendingUserCfg[k];
  return this.config[k];
};
FloatBallAppWM.prototype.setPendingValue = function(k, v) {
  if (!this.state.pendingUserCfg) this.beginEditConfig();
  this.state.pendingUserCfg[k] = normalizeToolHubEnumValueBySchema(k, v);
  this.state.pendingDirty = true;

  var keyStr = String(k);
  if (keyStr.indexOf("BALL_") === 0 && this.refreshBallPreviewInSettings) {
    try { this.refreshBallPreviewInSettings(); } catch(eBP) { safeLog(null, 'e', "catch " + String(eBP)); }
  }
  if (this.state.previewMode) {
    this.refreshPreview(k);
  }
};

FloatBallAppWM.prototype.getEffectiveConfig = function() {
    if (!this.state.previewMode || !this.state.pendingUserCfg) return this.config;
    var cfg = {};
    for (var k in this.config) { cfg[k] = this.config[k]; }
    for (var k in this.state.pendingUserCfg) { cfg[k] = this.state.pendingUserCfg[k]; }
    return cfg;
};

FloatBallAppWM.prototype.refreshPreview = function(changedKey) {
    if (this.state.closing) return;
    var self = this;
    // Post to next tick to avoid destroying view during event dispatch (fixes crash on switch toggle)
    if (this.state.h) {
        this.state.h.post(new JavaAdapter(java.lang.Runnable, {
            run: function() { self._refreshPreviewInternal(changedKey); }
        }));
    } else {
        self._refreshPreviewInternal(changedKey);
    }
};

FloatBallAppWM.prototype._refreshPreviewInternal = function(changedKey) {
    if (this.state.closing) return;
    var originalConfig = this.config;
    try {
        // 使用临时配置
        this.config = this.getEffectiveConfig();

        var needBall = false;
        var needPanel = false;

        if (!changedKey) {
            needBall = true;
            needPanel = true;
        } else {
            // 根据修改的 key 判断需要刷新什么，避免全量刷新导致闪烁
            if (changedKey.indexOf("BALL_") === 0) needBall = true;
            if (changedKey.indexOf("PANEL_") === 0) needPanel = true;
            // 球大小改变会影响面板位置
            if (changedKey === "BALL_SIZE_DP" || changedKey === "BALL_PANEL_GAP_DP") needPanel = true;
        }

        // 1. 刷新悬浮球 / 设置页内嵌预览 (保持面板不关闭)
        if (needBall) {
            if (!this.refreshBallPreviewInSettings || !this.refreshBallPreviewInSettings()) {
                this.rebuildBallForNewSize(true);
            }
        }

        // 2. 刷新主面板预览
        if (needPanel) {
            var panel = this.buildPanelView("main");
            var requestedLp = panel.getLayoutParams();
            var requestedWidth = Number(requestedLp && requestedLp.width || 0);
            var requestedHeight = Number(requestedLp && requestedLp.height || 0);
            var exactPreviewSize = requestedWidth > 0 && requestedHeight > 0;
            var pw;
            var ph;

            if (exactPreviewSize) {
                panel.measure(
                    android.view.View.MeasureSpec.makeMeasureSpec(
                        requestedWidth,
                        android.view.View.MeasureSpec.EXACTLY
                    ),
                    android.view.View.MeasureSpec.makeMeasureSpec(
                        requestedHeight,
                        android.view.View.MeasureSpec.EXACTLY
                    )
                );
                pw = requestedWidth;
                ph = requestedHeight;
            } else {
                var maxH = Math.floor(this.state.screen.h * 0.75);
                panel.measure(
                    android.view.View.MeasureSpec.makeMeasureSpec(
                        this.state.screen.w,
                        android.view.View.MeasureSpec.AT_MOST
                    ),
                    android.view.View.MeasureSpec.makeMeasureSpec(
                        maxH,
                        android.view.View.MeasureSpec.AT_MOST
                    )
                );
                pw = panel.getMeasuredWidth();
                ph = Math.min(panel.getMeasuredHeight(), maxH);
            }

            var di = this.getDockInfo();
            var configuredPos = null;
            try {
                if (this.getConfiguredBallPosition) {
                    configuredPos = this.getConfiguredBallPosition(this.config);
                }
            } catch (eConfiguredPos) {
                configuredPos = null;
            }
            var bx = configuredPos
                ? Number(configuredPos.logicalX)
                : Number(this.state.ballLp && this.state.ballLp.x || 0);
            var by = configuredPos
                ? Number(configuredPos.y)
                : Number(this.state.ballLp && this.state.ballLp.y || 0);
            var ballSize = configuredPos
                ? Number(configuredPos.ballSize)
                : Number(di.ballSize);
            var pos = this.getMainPanelPosition
                ? this.getMainPanelPosition(pw, ph, bx, by, ballSize)
                : { x: 0, y: 0 };

            var oldPanel = this.state.panel;
            var oldAdded = this.state.addedPanel;
            this.addPanel(panel, pos.x, pos.y, "main");

            if (oldAdded && oldPanel && oldPanel !== panel) {
                try {
                    if (this.safeRemoveView) {
                        this.safeRemoveView(oldPanel, "panel-preview-replaced", {
                            immediate: true,
                            resetVisual: false,
                            keepInvisible: true
                        });
                    } else {
                        this.state.wm.removeView(oldPanel);
                    }
                } catch(eRemovePreview) {
                    safeLog(this.L, "w", "remove old preview panel fail: " + String(eRemovePreview));
                }
            }
        }

    } catch(e) {
        safeLog(this.L, 'e',  "refreshPreview err=" + e);
    } finally {
        this.config = originalConfig;
    }
};
FloatBallAppWM.prototype.persistUserCfgFromObject = function(obj) {
  // # 这段代码的主要内容/用途：从临时编辑对象里按 schema 白名单抽取并保存（跳过 section 标题等无 key 项）
  try {
    var schema = this.getConfigSchema();
    var out = {};
    var i;
    for (i = 0; i < schema.length; i++) {
      if (!schema[i] || !schema[i].key) continue;
      var k = String(schema[i].key);
      out[k] = obj[k];
    }
    return this.saveConfig(out);
  } catch (e0) { return false; }
};

FloatBallAppWM.prototype.applyImmediateEffectsForKey = function(k) {
  var key = String(k || "");
  try {
    if (this.isBallPositionEffectKey && this.isBallPositionEffectKey(key)) {
      return this.scheduleConfiguredBallPositionApply("settings:" + key, true);
    }

    if (key === "LOG_ENABLE") {
      try {
        if (this.L) {
          this.L.enable = !!this.config.LOG_ENABLE;
          this.L.i("apply LOG_ENABLE=" + String(this.config.LOG_ENABLE));
        }
      } catch(eLE) { safeLog(null, 'e', "catch " + String(eLE)); }
      return;
    }
    if (key === "LOG_DEBUG") {
      try {
        if (this.L) {
          this.L.debug = !!this.config.LOG_DEBUG;
          this.L.i("apply LOG_DEBUG=" + String(this.config.LOG_DEBUG));
        }
      } catch(eLD) { safeLog(null, 'e', "catch " + String(eLD)); }
      return;
    }
    if (key === "LOG_KEEP_DAYS") {
      try {
        var n = Math.max(1, Math.floor(Number(this.config.LOG_KEEP_DAYS || 3)));
        this.config.LOG_KEEP_DAYS = n;
        if (this.L) {
          this.L.keepDays = n;
          this.L.i("apply LOG_KEEP_DAYS=" + String(n));
          this.L.cleanupOldFiles();
        }
      } catch(eLK) { safeLog(null, 'e', "catch " + String(eLK)); }
      return;
    }

    var themeChanged = this.isThemeEffectKey && this.isThemeEffectKey(key);
    var panelChanged = this.isPanelLayoutEffectKey && this.isPanelLayoutEffectKey(key);
    var pointerChanged = this.isPointerEffectKey && this.isPointerEffectKey(key);
    var ballChanged = this.isBallVisualEffectKey && this.isBallVisualEffectKey(key);

    if (ballChanged) {
      try { this.rebuildBallForNewSize(); } catch(eBall) { safeLog(this.L, "w", "apply ball visual fail key=" + key + " err=" + String(eBall)); }
      return;
    }

    if (key === "TOOLAPP_BACK_EDGE_WIDTH_DP") return;

    if (key === "EDGE_VISIBLE_RATIO") {
      if (this.state.addedBall && this.state.docked) {
        this.state.docked = false;
        this.snapToEdgeDocked(false);
      }
      return;
    }

    if (pointerChanged) {
      if (this.refreshPointerAfterSettingsChanged) this.refreshPointerAfterSettingsChanged();
      return;
    }

    if (themeChanged || panelChanged) {
      if (this.scheduleSettingsEffectRefresh) this.scheduleSettingsEffectRefresh(key, themeChanged, panelChanged);
      return;
    }
  } catch(e0) {
    safeLog(null, 'e', "applyImmediateEffectsForKey catch key=" + key + " err=" + String(e0));
  }
};

FloatBallAppWM.prototype.commitPendingUserCfg = function() {
  try {
    if (!this.state.pendingUserCfg) return { ok: false, reason: "no_pending" };

    var schema = this.getConfigSchema();
    var changedKeys = [];
    var i;

    for (i = 0; i < schema.length; i++) {
      if (!schema[i] || !schema[i].key) continue;
      var k = String(schema[i].key);
      var oldV = this.config[k];
      var newV = this.state.pendingUserCfg[k];
      if (String(oldV) !== String(newV)) {
        this.config[k] = newV;
        changedKeys.push(k);
      }
    }

    this.persistUserCfgFromObject(this.state.pendingUserCfg);

    var j;
    for (j = 0; j < changedKeys.length; j++) {
      if (changedKeys[j] === "BALL_SIZE_DP") { this.applyImmediateEffectsForKey("BALL_SIZE_DP"); break; }
    }
    for (j = 0; j < changedKeys.length; j++) {
      if (changedKeys[j] !== "BALL_SIZE_DP") this.applyImmediateEffectsForKey(changedKeys[j]);
    }

    this.state.pendingDirty = false;
    safeLog(this.L, 'i',  "commit settings changed=" + JSON.stringify(changedKeys));
    return { ok: true, changed: changedKeys };
  } catch (e0) {
    safeLog(this.L, 'e',  "commitPendingUserCfg err=" + String(e0));
    return { ok: false, err: String(e0) };
  }
};
