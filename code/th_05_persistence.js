// @version 1.0.0
// =======================【工具：面板位置持久化】======================
FloatBallAppWM.prototype.savePanelState = function(key, state) {
  if (!key || !state) return;
  try {
    if (!this.config.PANEL_STATES) this.config.PANEL_STATES = {};
    this.config.PANEL_STATES[key] = state;
    // 节流或立即保存? 面板拖动结束通常不频繁，立即保存即可
    // 但为了避免连续事件，还是可以复用 savePos 的节流逻辑，或者直接保存
    ConfigManager.saveSettings(this.config);
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
};

FloatBallAppWM.prototype.loadPanelState = function(key) {
  if (!key || !this.config.PANEL_STATES) return null;
  return this.config.PANEL_STATES[key];
};

// =======================【工具：位置持久化】======================
FloatBallAppWM.prototype.savePos = function(x, y) {
  try {
    var di = this.getDockInfo ? this.getDockInfo() : { ballSize: this.dp(this.config.BALL_SIZE_DP || 45) };
    var sw = (this.state && this.state.screen) ? Number(this.state.screen.w || 0) : 0;
    var sh = (this.state && this.state.screen) ? Number(this.state.screen.h || 0) : 0;
    var ballSize = Number(di.ballSize || this.dp(this.config.BALL_SIZE_DP || 45));
    var maxX = Math.max(0, sw - ballSize);
    var maxY = Math.max(0, sh - ballSize);

    var persistX = Math.floor(Number(x || 0));
    var persistY = Math.floor(Number(y || 0));
    var dockSide = "";
    var docked = !!(this.state && this.state.docked);

    // 吸边裁剪态下 Window x 可能是 screenW - visiblePx；持久化时改存“完整球”的逻辑坐标。
    if (docked) {
      dockSide = String(this.state.dockSide || "");
      if (dockSide === "right" && sw > 0) persistX = maxX;
      else if (dockSide === "left") persistX = 0;
    } else if (sw > 0) {
      persistX = this.clamp(persistX, 0, maxX);
    }
    if (sh > 0) persistY = this.clamp(persistY, 0, maxY);

    this.config.BALL_INIT_X = persistX;
    this.config.BALL_INIT_Y_DP = Math.floor(persistY / this.state.density);

    // 新增位置元数据：用于不同分辨率/横竖屏之间按比例或按吸边侧恢复，避免横屏落在屏幕中间。
    this.config.BALL_POS_SCREEN_W = sw;
    this.config.BALL_POS_SCREEN_H = sh;
    this.config.BALL_POS_X_RATIO = maxX > 0 ? (persistX / maxX) : 0;
    this.config.BALL_POS_Y_RATIO = maxY > 0 ? (persistY / maxY) : 0;
    this.config.BALL_POS_DOCKED = docked;
    this.config.BALL_POS_DOCK_SIDE = dockSide;

    return ConfigManager.saveSettings(this.config);
  } catch (e) { return false; }
};

FloatBallAppWM.prototype.loadSavedPos = function() {
  var di = this.getDockInfo ? this.getDockInfo() : { ballSize: this.dp(this.config.BALL_SIZE_DP || 45) };
  var ballSize = Number(di.ballSize || this.dp(this.config.BALL_SIZE_DP || 45));
  var sw = (this.state && this.state.screen) ? Number(this.state.screen.w || 0) : 0;
  var sh = (this.state && this.state.screen) ? Number(this.state.screen.h || 0) : 0;
  var maxX = Math.max(0, sw - ballSize);
  var maxY = Math.max(0, sh - ballSize);

  var x = Number(this.config.BALL_INIT_X || 0);
  var y = this.dp(Number(this.config.BALL_INIT_Y_DP || 100));

  try {
    var savedW = Number(this.config.BALL_POS_SCREEN_W || 0);
    var savedH = Number(this.config.BALL_POS_SCREEN_H || 0);
    var hasMeta = savedW > 0 && savedH > 0;
    var docked = (typeof parseBooleanLike === "function") ? parseBooleanLike(this.config.BALL_POS_DOCKED, false) : !!this.config.BALL_POS_DOCKED;
    var side = String(this.config.BALL_POS_DOCK_SIDE || "");

    if (hasMeta && (savedW !== sw || savedH !== sh)) {
      var xr = Number(this.config.BALL_POS_X_RATIO);
      var yr = Number(this.config.BALL_POS_Y_RATIO);
      if (isNaN(xr)) xr = 0;
      if (isNaN(yr)) yr = 0;
      x = Math.round(this.clamp(xr, 0, 1) * maxX);
      y = Math.round(this.clamp(yr, 0, 1) * maxY);
    }

    if (docked || side === "left" || side === "right") {
      if (side === "right") x = maxX;
      else if (side === "left") x = 0;
    } else if (!hasMeta && sw > sh && sw > 0) {
      // 兼容旧版：只存了竖屏像素 x。横屏启动时旧的“右侧 x”会落在屏幕中部，这里按短边推断并贴回右边。
      var portraitMaxXGuess = Math.max(0, Math.min(sw, sh) - ballSize);
      if (x > Math.round(portraitMaxXGuess * 0.55) && x < Math.round(maxX * 0.85)) {
        x = maxX;
      }
    }
  } catch (e) {}

  x = this.clamp(Math.floor(x), 0, maxX);
  y = this.clamp(Math.floor(y), 0, maxY);
  return { x: x, y: y };
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
  this.state.pendingUserCfg[k] = v;
  this.state.pendingDirty = true;

  // 设置页主题切换：不论 previewMode 都重建设置页 UI
  if (String(k) === "SETTINGS_THEME") {
      try {
          if (this.state.toolAppActive && this.replaceToolAppPage) {
              this.replaceToolAppPage(String(this.state.toolAppRoute || "settings_group"));
          } else {
              if (this.state.settingsPanel) {
                  this.safeRemoveView(this.state.settingsPanel, "settingsPanel");
                  this.state.settingsPanel = null;
                  this.state.settingsPanelLp = null;
                  this.state.addedSettings = false;
              }
              this.replaceToolAppPage("settings_group");
          }
      } catch(eReb) { safeLog(null, 'e', "catch " + String(eReb)); }
  } else if (this.state.previewMode) {
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
            if (changedKey === "BALL_SIZE_DP") needPanel = true;
        }

        // 1. 刷新悬浮球 (保持面板不关闭)
        if (needBall) {
            this.rebuildBallForNewSize(true);
        }

        // 2. 刷新主面板预览
        if (needPanel) {
            // 如果当前没有显示主面板，则创建并显示；如果已显示，则替换

            var panel = this.buildPanelView("main");

            // 计算位置 (使用当前球的位置)
            var maxH = Math.floor(this.state.screen.h * 0.75);
            panel.measure(
                android.view.View.MeasureSpec.makeMeasureSpec(this.state.screen.w, android.view.View.MeasureSpec.AT_MOST),
                android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
            );
            var pw = panel.getMeasuredWidth();
            var ph = panel.getMeasuredHeight();
            if (ph > maxH) ph = maxH;

            var bx = this.state.ballLp.x;
            var by = this.state.ballLp.y;
            var px = this.computePanelX(bx, pw);
            var py = by;

            // 尝试调整 Y
            var r = this.tryAdjustPanelY(px, py, pw, ph, bx, by);
            var finalX = r.ok ? r.x : px;
            var finalY = r.ok ? r.y : this.clamp(py, 0, this.state.screen.h - ph);

            // 优化闪烁：先添加新面板，再移除旧面板 (这样新面板会在最上层，符合预览需求)
            var oldPanel = this.state.panel;
            var oldAdded = this.state.addedPanel;

            // 添加新面板 (addPanel 会更新 this.state.panel)
            // 注意：addPanel 中已为 main 添加 FLAG_NOT_FOCUSABLE，所以即使在最上层也不会抢走 Settings 的输入焦点
            this.addPanel(panel, finalX, finalY, "main");

            // 移除旧面板
            if (oldAdded && oldPanel) {
                try { this.state.wm.removeView(oldPanel);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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
  try {
    if (k === "LOG_ENABLE") {
      try {
        if (this.L) {
          this.L.enable = !!this.config.LOG_ENABLE;
          this.L.i("apply LOG_ENABLE=" + String(this.config.LOG_ENABLE));
        }
       } catch(eLE) { safeLog(null, 'e', "catch " + String(eLE)); }
      return;
    }
    if (k === "LOG_DEBUG") {
      try {
        if (this.L) {
          this.L.debug = !!this.config.LOG_DEBUG;
          this.L.i("apply LOG_DEBUG=" + String(this.config.LOG_DEBUG));
        }
       } catch(eLD) { safeLog(null, 'e', "catch " + String(eLD)); }
      return;
    }
    if (k === "LOG_KEEP_DAYS") {
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
    if (k === "BALL_SIZE_DP" || k === "BALL_PNG_MODE" || k === "BALL_ICON_TYPE" || k === "BALL_ICON_FILE_PATH" || k === "BALL_ICON_RES_ID" || k === "BALL_ICON_RES_NAME" || k === "BALL_ICON_SIZE_DP" || k === "BALL_ICON_TINT_HEX" || k === "BALL_BG_COLOR_HEX") { this.rebuildBallForNewSize(); return; }

    if (k === "TOOLAPP_BACK_EDGE_WIDTH_DP") {
      return;
    }

    if (k === "PANEL_ROWS" || k === "PANEL_COLS" ||
        k === "PANEL_ITEM_SIZE_DP" || k === "PANEL_GAP_DP" ||
        k === "PANEL_PADDING_DP" || k === "PANEL_ICON_SIZE_DP" ||
        k === "PANEL_LABEL_ENABLED" || k === "PANEL_LABEL_TEXT_SIZE_SP" ||
        k === "PANEL_LABEL_TOP_MARGIN_DP") {

      if (this.state.addedPanel) this.hideMainPanel();
      if (this.state.addedSettings) this.hideSettingsPanel();
      if (this.state.addedViewer) this.hideViewerPanel();
      return;
    }

    if (k === "EDGE_VISIBLE_RATIO") {
      if (this.state.addedBall && this.state.docked) {
        this.state.docked = false;
        this.snapToEdgeDocked(false);
      }
      return;
    }
   } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }
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

