// =======================【更新与版本页面】=======================
(function() {
  var UPDATE_ROUTE = "update";
  var HISTORY_PAGE_SIZE = 10;
  var HISTORY_FILE_NAME = "update_history.json";
  var HISTORY_META_NAME = "update_history.meta.json";

  function safeArray(value) {
    return value && value.length !== undefined ? value : [];
  }

  function textValue(value) {
    return value === undefined || value === null ? "" : String(value);
  }

  function numberValue(value) {
    var n = Number(value || 0);
    return isNaN(n) ? 0 : n;
  }

  function typeLabel(value) {
    var t = textValue(value);
    if (t === "feature") return "功能";
    if (t === "fix") return "修复";
    if (t === "security") return "安全";
    return "优化";
  }

  function reasonLabel(value) {
    var t = textValue(value);
    if (t === "missing") return "本地缺失";
    if (t === "hash") return "内容更新";
    return "版本升级";
  }

  function sha256Text(text) {
    var bytes = new java.lang.String(String(text || "")).getBytes("UTF-8");
    var md = java.security.MessageDigest.getInstance("SHA-256");
    md.update(bytes);
    var digest = md.digest();
    var out = "";
    for (var i = 0; i < digest.length; i++) {
      var v = Number(digest[i]);
      if (v < 0) v += 256;
      var h = java.lang.Integer.toHexString(v & 255);
      if (h.length < 2) h = "0" + h;
      out += h;
    }
    return out.toLowerCase();
  }

  function utf8Size(text) {
    try { return Number(new java.lang.String(String(text || "")).getBytes("UTF-8").length || 0); }
    catch (e) { return 0; }
  }

  FloatBallAppWM.prototype.ensureToolHubUpdateUiState = function() {
    if (!this.state) return;
    if (this.state.toolHubUpdateUiReady === true) return;
    this.state.toolHubUpdateUiReady = true;
    this.state.toolHubSettingsVisitSeq = 0;
    this.state.toolHubSettingsCheckedSeq = 0;
    this.state.toolHubSettingsCheckRunning = false;
    this.state.toolHubLastKnownAttention = false;
    this.state.toolHubUpdateConfirmVisible = false;
    this.state.toolHubUpdateHistoryData = null;
    this.state.toolHubUpdateHistoryState = "idle";
    this.state.toolHubUpdateHistoryError = "";
    this.state.toolHubUpdateHistorySource = "";
    this.state.toolHubUpdateHistoryAssetKey = "";
    this.state.toolHubUpdateHistoryRequestKey = "";
    this.state.toolHubUpdateHistoryGeneration = 0;
  };

  FloatBallAppWM.prototype.getToolHubUpdateStateExtended = function() {
    this.ensureToolHubUpdateUiState();
    var base = null;
    try { base = this.getToolHubUpdateState ? this.getToolHubUpdateState() : null; } catch (eBase) { base = null; }
    if (!base) base = {};
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        var raw = TOOLHUB_UPDATE_STATE;
        base.entryUpdateAvailable = raw.entryUpdateAvailable === true;
        base.entryLocalVersion = numberValue(raw.entryLocalVersion);
        base.entryRemoteVersion = numberValue(raw.entryRemoteVersion);
        base.entryName = textValue(raw.entryName || "ToolHub.js");
        base.entrySha256 = textValue(raw.entrySha256);
        base.entrySize = numberValue(raw.entrySize);
        base.entryManualUpdate = raw.entryManualUpdate !== false;
        base.entryMessage = textValue(raw.entryMessage);
      }
    } catch (eRaw) {}
    return base;
  };

  FloatBallAppWM.prototype.hasToolHubUpdateAttention = function() {
    this.ensureToolHubUpdateUiState();
    var st = this.getToolHubUpdateStateExtended();
    var status = textValue(st.status);
    var live = numberValue(st.availableCount) > 0 || st.entryUpdateAvailable === true || st.needRestart === true;
    if (status !== "error" && status !== "checking") this.state.toolHubLastKnownAttention = live;
    if (status === "error") return this.state.toolHubLastKnownAttention === true;
    return live;
  };

  FloatBallAppWM.prototype.getToolHubUpdateHomeSummary = function() {
    var st = this.getToolHubUpdateStateExtended();
    var status = textValue(st.status);
    var count = numberValue(st.availableCount);
    if (status === "checking") return "正在检查最新版本";
    if (status === "installing") return "正在更新子模块";
    if (status === "restarting") return "正在重启 ToolHub";
    if (count > 0 && st.entryUpdateAvailable === true) return "有 " + count + " 个模块及入口文件更新";
    if (count > 0) return "有 " + count + " 个模块可更新";
    if (st.entryUpdateAvailable === true) return "入口文件需要手动替换";
    if (st.needRestart === true) return "更新完成，等待重启";
    if (status === "error") return "检查失败，点击查看";
    if (status === "latest") return "当前已是最新版本";
    return "查看版本、更新状态与历史记录";
  };

  FloatBallAppWM.prototype.refreshToolHubUpdateSurface = function() {
    try {
      if (!this.state || !this.state.toolAppActive || !this.replaceToolAppPage) return;
      var route = textValue(this.state.toolAppRoute);
      if (route === UPDATE_ROUTE) this.replaceToolAppPage(UPDATE_ROUTE);
      else if (route === "settings") this.replaceToolAppPage("settings");
    } catch (e) { try { safeLog(this.L, "w", "refresh update surface fail: " + String(e)); } catch (eLog) {} }
  };

  FloatBallAppWM.prototype.runToolHubUpdateCheck = function(showToast) {
    this.ensureToolHubUpdateUiState();
    var self = this;
    if (this.state.toolHubSettingsCheckRunning === true) {
      if (showToast) try { this.toast("检查正在进行"); } catch (eToast0) {}
      return false;
    }
    if (typeof checkToolHubModuleUpdatesNow !== "function") {
      if (showToast) try { this.toast("检查模块未加载"); } catch (eToast1) {}
      return false;
    }
    this.state.toolHubSettingsCheckRunning = true;
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "checking";
        TOOLHUB_UPDATE_STATE.error = "";
      }
    } catch (eState) {}
    if (showToast) try { this.toast("正在检查更新"); } catch (eToast2) {}
    this.refreshToolHubUpdateSurface();
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var ret = null;
        try { ret = checkToolHubModuleUpdatesNow(); }
        catch (eRun) { ret = { ok: false, error: String(eRun), msg: "检查失败：" + String(eRun) }; }
        try { self.state.toolHubSettingsCheckRunning = false; } catch (eFlag) {}
        try {
          self.runOnUiThreadSafe(function() {
            try {
              var st = self.getToolHubUpdateStateExtended();
              if (ret && ret.ok !== false) self.state.toolHubLastKnownAttention = numberValue(st.availableCount) > 0 || st.entryUpdateAvailable === true || st.needRestart === true;
              if (showToast) self.toast(ret && ret.ok === false ? "检查失败" : "检查完成");
              self.refreshToolHubUpdateSurface();
              if (textValue(self.state.toolAppRoute) === UPDATE_ROUTE) self.ensureToolHubUpdateHistoryLoaded(true);
            } catch (eUi) {}
          });
        } catch (ePost) {}
      }})).start();
      return true;
    } catch (eThread) {
      this.state.toolHubSettingsCheckRunning = false;
      return false;
    }
  };

  FloatBallAppWM.prototype.onToolHubSettingsEntered = function() {
    this.ensureToolHubUpdateUiState();
    this.state.toolHubSettingsVisitSeq = numberValue(this.state.toolHubSettingsVisitSeq) + 1;
    this.state.toolHubSettingsCheckedSeq = this.state.toolHubSettingsVisitSeq;
    this.runToolHubUpdateCheck(false);
  };

  FloatBallAppWM.prototype.getToolHubUpdateCacheDir = function() {
    var root = typeof APP_ROOT_DIR !== "undefined" ? String(APP_ROOT_DIR) : (typeof getToolHubRootDir === "function" ? String(getToolHubRootDir()) : "");
    return root ? root + "/cache" : "";
  };

  FloatBallAppWM.prototype.getToolHubUpdateHistoryPaths = function() {
    var dir = this.getToolHubUpdateCacheDir();
    return { dir: dir, history: dir + "/" + HISTORY_FILE_NAME, meta: dir + "/" + HISTORY_META_NAME };
  };

  FloatBallAppWM.prototype.getToolHubUpdateHistoryAsset = function() {
    try {
      if (typeof __trustedManifest === "undefined" || !__trustedManifest) return null;
      var assets = __trustedManifest.assets || {};
      var asset = assets.updateHistory || null;
      if (!asset || !asset.name || !asset.sha256) return null;
      return {
        name: textValue(asset.name),
        schema: numberValue(asset.schema),
        version: numberValue(asset.version),
        sha256: textValue(asset.sha256).toLowerCase(),
        size: numberValue(asset.size)
      };
    } catch (e) {}
    return null;
  };

  FloatBallAppWM.prototype.validateToolHubUpdateHistory = function(obj) {
    if (!obj || Number(obj.schema || 0) !== 1 || !obj.records || obj.records.length === undefined) return false;
    var records = obj.records;
    var seen = {};
    for (var i = 0; i < records.length; i++) {
      var item = records[i] || {};
      var id = textValue(item.id);
      if (!id || seen[id]) return false;
      seen[id] = true;
      if (numberValue(item.manifestVersion) <= 0) return false;
      if (!textValue(item.date) || !textValue(item.title)) return false;
      var type = textValue(item.type);
      if (type !== "feature" && type !== "fix" && type !== "optimize" && type !== "security") return false;
      if (!item.details || item.details.length === undefined || item.details.length <= 0) return false;
    }
    return true;
  };

  FloatBallAppWM.prototype.readToolHubUpdateHistoryCache = function() {
    this.ensureToolHubUpdateUiState();
    var paths = this.getToolHubUpdateHistoryPaths();
    if (!paths.dir) return false;
    try {
      var historyText = FileIO.readText(paths.history);
      var metaText = FileIO.readText(paths.meta);
      if (!historyText || !metaText) return false;
      var meta = JSON.parse(String(metaText));
      var actualHash = sha256Text(historyText);
      if (actualHash !== textValue(meta.sha256).toLowerCase()) return false;
      if (numberValue(meta.size) !== utf8Size(historyText)) return false;
      var obj = JSON.parse(String(historyText));
      if (!this.validateToolHubUpdateHistory(obj)) return false;
      this.state.toolHubUpdateHistoryData = obj;
      this.state.toolHubUpdateHistoryState = "ready";
      this.state.toolHubUpdateHistoryError = "";
      this.state.toolHubUpdateHistorySource = "cache";
      this.state.toolHubUpdateHistoryAssetKey = actualHash;
      return true;
    } catch (e) {
      this.state.toolHubUpdateHistoryError = String(e);
      return false;
    }
  };

  FloatBallAppWM.prototype.writeToolHubUpdateHistoryCache = function(text, asset) {
    var paths = this.getToolHubUpdateHistoryPaths();
    if (!paths.dir) return false;
    try {
      var dir = new java.io.File(paths.dir);
      if (!dir.exists() && !dir.mkdirs()) throw "cache mkdir failed";
      if (!FileIO.writeTextAtomic(paths.history, String(text))) throw "history write failed";
      var meta = {
        schema: 1,
        historyVersion: numberValue(asset.version),
        manifestVersion: this.getToolHubUpdateStateExtended().version || 0,
        fetchedAt: Number(java.lang.System.currentTimeMillis()),
        sha256: textValue(asset.sha256).toLowerCase(),
        size: numberValue(asset.size)
      };
      if (!FileIO.writeTextAtomic(paths.meta, JSON.stringify(meta, null, 2))) throw "meta write failed";
      return true;
    } catch (e) {
      try { safeLog(this.L, "w", "update history cache write fail: " + String(e)); } catch (eLog) {}
      return false;
    }
  };

  FloatBallAppWM.prototype.ensureToolHubUpdateHistoryLoaded = function(forceRefresh) {
    this.ensureToolHubUpdateUiState();
    var self = this;
    if (!this.state.toolHubUpdateHistoryData) this.readToolHubUpdateHistoryCache();
    var asset = this.getToolHubUpdateHistoryAsset();
    if (!asset) return false;
    var assetKey = textValue(asset.sha256) + "@" + String(asset.version);
    if (!forceRefresh && this.state.toolHubUpdateHistoryAssetKey === asset.sha256 && this.state.toolHubUpdateHistoryData) return true;
    if (this.state.toolHubUpdateHistoryRequestKey === assetKey) return true;
    this.state.toolHubUpdateHistoryRequestKey = assetKey;
    this.state.toolHubUpdateHistoryGeneration = numberValue(this.state.toolHubUpdateHistoryGeneration) + 1;
    var generation = this.state.toolHubUpdateHistoryGeneration;
    if (!this.state.toolHubUpdateHistoryData) this.state.toolHubUpdateHistoryState = "loading";
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var text = "";
        var error = "";
        var obj = null;
        try {
          if (typeof downloadText !== "function") throw "downloadText unavailable";
          text = downloadText(String(GIT_ROOT) + textValue(asset.name));
          if (numberValue(asset.size) > 0 && utf8Size(text) !== numberValue(asset.size)) throw "history size mismatch";
          if (sha256Text(text) !== textValue(asset.sha256).toLowerCase()) throw "history sha256 mismatch";
          obj = JSON.parse(String(text));
          if (!self.validateToolHubUpdateHistory(obj)) throw "history schema invalid";
          if (!self.writeToolHubUpdateHistoryCache(text, asset)) throw "history cache write failed";
        } catch (eLoad) { error = String(eLoad); obj = null; }
        try {
          self.runOnUiThreadSafe(function() {
            if (numberValue(self.state.toolHubUpdateHistoryGeneration) !== generation) return;
            self.state.toolHubUpdateHistoryRequestKey = "";
            if (obj) {
              self.state.toolHubUpdateHistoryData = obj;
              self.state.toolHubUpdateHistoryState = "ready";
              self.state.toolHubUpdateHistoryError = "";
              self.state.toolHubUpdateHistorySource = "remote";
              self.state.toolHubUpdateHistoryAssetKey = textValue(asset.sha256).toLowerCase();
            } else {
              self.state.toolHubUpdateHistoryState = self.state.toolHubUpdateHistoryData ? "ready" : "error";
              self.state.toolHubUpdateHistoryError = error;
              if (self.state.toolHubUpdateHistoryData) self.state.toolHubUpdateHistorySource = "cache";
            }
            self.refreshToolHubUpdateSurface();
          });
        } catch (eUi) {}
      }})).start();
      return true;
    } catch (eThread) {
      this.state.toolHubUpdateHistoryRequestKey = "";
      return false;
    }
  };

  FloatBallAppWM.prototype.getToolHubCurrentHistoryRecord = function() {
    var data = this.state ? this.state.toolHubUpdateHistoryData : null;
    var version = this.getToolHubUpdateStateExtended().version;
    var records = data && data.records ? data.records : [];
    for (var i = 0; i < records.length; i++) {
      if (numberValue(records[i] && records[i].manifestVersion) === numberValue(version)) return records[i];
    }
    return null;
  };

  FloatBallAppWM.prototype.startToolHubDeterministicRestart = function() {
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "restarting";
        TOOLHUB_UPDATE_STATE.error = "";
      }
      this.toast("更新完成，正在重启 ToolHub");
      if (typeof restartToolHubFromSettings === "function") return restartToolHubFromSettings();
    } catch (e) {
      try { this.toast("自动重启失败，请手动重启 ToolHub"); } catch (eToast) {}
    }
    return null;
  };

  FloatBallAppWM.prototype.startToolHubModuleUpdateDeterministic = function(anchorView) {
    this.ensureToolHubUpdateUiState();
    var self = this;
    var st = this.getToolHubUpdateStateExtended();
    if (textValue(st.status) === "installing") { try { this.toast("更新正在进行"); } catch (e0) {} return false; }
    if (textValue(st.status) === "checking") { try { this.toast("检查正在进行"); } catch (e1) {} return false; }
    if (typeof installPendingModuleUpdates !== "function") { try { this.toast("更新模块未加载"); } catch (e2) {} return false; }
    this.state.toolHubUpdateConfirmVisible = false;
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "installing";
        TOOLHUB_UPDATE_STATE.error = "";
      }
    } catch (eState) {}
    this.refreshToolHubUpdateSurface();
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var ret = null;
        try { ret = installPendingModuleUpdates(); }
        catch (eRun) { ret = { ok: false, error: String(eRun), msg: "更新失败：" + String(eRun) }; }
        try {
          self.runOnUiThreadSafe(function() {
            try {
              if (!ret || ret.ok === false) {
                self.toast(ret && ret.msg ? ret.msg : "更新失败");
                self.refreshToolHubUpdateSurface();
                return;
              }
              if (numberValue(ret.count) <= 0) {
                self.toast("子模块已是最新");
                self.refreshToolHubUpdateSurface();
                return;
              }
              var after = self.getToolHubUpdateStateExtended();
              if (after.entryUpdateAvailable === true) {
                self.toast("子模块已更新，请先替换 ToolHub.js 后重新运行");
                self.refreshToolHubUpdateSurface();
                return;
              }
              self.startToolHubDeterministicRestart();
            } catch (eUi) {
              try { self.toast("更新完成状态处理失败"); } catch (eToast) {}
            }
          });
        } catch (ePost) {}
      }})).start();
      return true;
    } catch (eThread) { return false; }
  };

  FloatBallAppWM.prototype.createToolHubUpdateHomeEntry = function(parent, title, desc, onClick) {
    var self = this;
    var isDark = this.isDarkTheme();
    var T = this.getSettingsColorScheme();
    var row = new android.widget.LinearLayout(context);
    row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    row.setGravity(android.view.Gravity.CENTER_VERTICAL);
    var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
    var itemRadius = spec ? spec.itemRadius : this.dp(18);
    row.setPadding(this.dp(12), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(8) : this.dp(10), this.dp(10), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(8) : this.dp(10));
    row.setMinimumHeight(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(72) : this.dp(76));
    row.setBackground(this.ui.createPressedStateDrawable(T.surface, this.withAlpha(T.primary, isDark ? 0.14 : 0.08), itemRadius));
    var badgeBox = new android.widget.FrameLayout(context);
    var badge = new android.widget.TextView(context);
    badge.setText("↻");
    toolhubSafeSetTextColor(badge, T.primary);
    badge.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
    badge.setGravity(android.view.Gravity.CENTER);
    badge.setTypeface(null, android.graphics.Typeface.BOLD);
    badge.setBackground(this.ui.createStrokeDrawable(T.primaryContainer, this.withAlpha(T.primary, isDark ? 0.22 : 0.16), this.dp(1), this.dp(13)));
    var iconSize = spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(38) : this.dp(40);
    badgeBox.addView(badge, new android.widget.FrameLayout.LayoutParams(iconSize, iconSize, android.view.Gravity.CENTER));
    if (this.hasToolHubUpdateAttention()) {
      var dot = new android.view.View(context);
      var danger = T.danger || android.graphics.Color.parseColor("#BA1A1A");
      dot.setBackground(this.ui.createRoundDrawable(danger, this.dp(5)));
      var dotLp = new android.widget.FrameLayout.LayoutParams(this.dp(10), this.dp(10), android.view.Gravity.TOP | android.view.Gravity.RIGHT);
      badgeBox.addView(dot, dotLp);
    }
    var badgeBoxLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);
    badgeBoxLp.setMargins(0, 0, this.dp(10), 0);
    row.addView(badgeBox, badgeBoxLp);
    var texts = new android.widget.LinearLayout(context);
    texts.setOrientation(android.widget.LinearLayout.VERTICAL);
    var tvTitle = new android.widget.TextView(context);
    tvTitle.setText(String(title || "更新与版本"));
    toolhubSafeSetTextColor(tvTitle, T.onSurface);
    tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
    tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
    texts.addView(tvTitle);
    var tvDesc = new android.widget.TextView(context);
    tvDesc.setText(String(desc || ""));
    toolhubSafeSetTextColor(tvDesc, T.onSurface2);
    tvDesc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tvDesc.setPadding(0, this.dp(2), this.dp(6), 0);
    texts.addView(tvDesc);
    row.addView(texts, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
    var go = new android.widget.TextView(context);
    go.setText("›");
    toolhubSafeSetTextColor(go, T.primary);
    go.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 22);
    go.setTypeface(null, android.graphics.Typeface.BOLD);
    go.setGravity(android.view.Gravity.CENTER);
    row.addView(go, new android.widget.LinearLayout.LayoutParams(this.dp(24), -1));
    row.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
      try { self.touchActivity(); } catch (eTouch) {}
      try { if (onClick) onClick(); } catch (eOpen) { try { self.toast("打开失败: " + String(eOpen)); } catch (eToast) {} }
    }}));
    if (this.addSettingsGridChild) this.addSettingsGridChild(parent, row, spec ? spec.gridColumnCount : 1);
    else parent.addView(row, new android.widget.LinearLayout.LayoutParams(-1, -2));
  };

  FloatBallAppWM.prototype.buildToolHubUpdateVersionPanelView = function() {
    this.ensureToolHubUpdateUiState();
    this.ensureToolHubUpdateHistoryLoaded(false);
    var self = this;
    var T = this.getSettingsColorScheme();
    var isDark = this.isDarkTheme();
    var st = this.getToolHubUpdateStateExtended();
    var panel = this.ui.createStyledPanel(this, 16);
    panel.setPadding(this.dp(10), this.dp(8), this.dp(10), this.dp(10));
    var scroll = new android.widget.ScrollView(context);
    scroll.setFillViewport(true);
    var root = new android.widget.LinearLayout(context);
    root.setOrientation(android.widget.LinearLayout.VERTICAL);
    scroll.addView(root, new android.widget.ScrollView.LayoutParams(-1, -2));
    panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

    function addText(parent, value, size, color, bold) {
      var tv = new android.widget.TextView(context);
      tv.setText(String(value || ""));
      toolhubSafeSetTextColor(tv, color || T.onSurface);
      tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, size || 12);
      tv.setLineSpacing(self.dp(1), 1.05);
      if (bold) tv.setTypeface(null, android.graphics.Typeface.BOLD);
      parent.addView(tv, new android.widget.LinearLayout.LayoutParams(-1, -2));
      return tv;
    }

    function addCard(title) {
      var card = new android.widget.LinearLayout(context);
      card.setOrientation(android.widget.LinearLayout.VERTICAL);
      card.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));
      card.setBackground(self.ui.createStrokeDrawable(T.surface, self.withAlpha(T.outlineVariant, isDark ? 0.24 : 0.20), self.dp(1), self.dp(18)));
      var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      lp.setMargins(0, 0, 0, self.dp(10));
      root.addView(card, lp);
      if (title) addText(card, title, 14, T.onSurface, true);
      return card;
    }

    function addButton(parent, label, onClick, enabled) {
      var btn = self.ui.createFlatButton(self, label, enabled === false ? T.onSurface2 : T.primary, function() {
        if (enabled === false) return;
        try { onClick(); } catch (e) { try { self.toast("操作失败: " + String(e)); } catch (eToast) {} }
      });
      btn.setEnabled(enabled !== false);
      parent.addView(btn, new android.widget.LinearLayout.LayoutParams(0, self.dp(44), 1));
      return btn;
    }

    var statusCard = addCard("当前版本");
    var localManifestVersion = 0;
    try { if (typeof getTrustedVersion === "function") localManifestVersion = numberValue(getTrustedVersion()); } catch (eLocal) {}
    addText(statusCard, "本地清单版本：" + (localManifestVersion > 0 ? String(localManifestVersion) : "未知"), 12, T.onSurface2, false);
    addText(statusCard, "GitHub 清单版本：" + (numberValue(st.version) > 0 ? String(st.version) : "尚未获取"), 12, T.onSurface2, false);
    addText(statusCard, "安全状态：" + (textValue(st.securityText) || "尚未校验"), 12, T.onSurface2, false);
    var currentRecord = this.getToolHubCurrentHistoryRecord();
    if (currentRecord) {
      addText(statusCard, textValue(currentRecord.title), 13, T.onSurface, true).setPadding(0, this.dp(8), 0, 0);
      var currentDetails = safeArray(currentRecord.details);
      for (var cd = 0; cd < currentDetails.length; cd++) addText(statusCard, "• " + textValue(currentDetails[cd]), 12, T.onSurface2, false);
    } else if (st.title) {
      addText(statusCard, textValue(st.title), 13, T.onSurface, true).setPadding(0, this.dp(8), 0, 0);
      var stateChanges = safeArray(st.changes);
      for (var sc = 0; sc < stateChanges.length; sc++) addText(statusCard, "• " + textValue(stateChanges[sc]), 12, T.onSurface2, false);
    }
    if (st.entryUpdateAvailable === true) {
      addText(statusCard, "入口文件：" + numberValue(st.entryLocalVersion) + " → " + numberValue(st.entryRemoteVersion), 12, T.danger || T.primary, true).setPadding(0, this.dp(8), 0, 0);
      addText(statusCard, textValue(st.entryMessage) || "请手动替换 ShortX 任务中的 ToolHub.js", 12, T.onSurface2, false);
    }
    var statusButtons = new android.widget.LinearLayout(context);
    statusButtons.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    var statusButtonsLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    statusButtonsLp.setMargins(0, this.dp(8), 0, 0);
    statusCard.addView(statusButtons, statusButtonsLp);
    addButton(statusButtons, textValue(st.status) === "checking" ? "检查中" : "重新检查", function() { self.runToolHubUpdateCheck(true); }, textValue(st.status) !== "checking" && textValue(st.status) !== "installing");

    var pendingCard = addCard("待更新内容");
    var details = safeArray(st.availableDetails);
    if (details.length <= 0) addText(pendingCard, st.entryUpdateAvailable === true ? "子模块已是最新，入口文件需要手动替换。" : "当前没有待更新子模块。", 12, T.onSurface2, false);
    for (var di = 0; di < details.length; di++) {
      var detail = details[di] || {};
      addText(pendingCard, "• " + textValue(detail.module) + "  " + (textValue(detail.localVersion) || "0.0.0") + " → " + (textValue(detail.remoteVersion) || "清单版本") + " · " + reasonLabel(detail.reason), 12, T.onSurface2, false);
    }
    if (details.length > 0 && !this.state.toolHubUpdateConfirmVisible) {
      var prepareRow = new android.widget.LinearLayout(context);
      prepareRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      var prepareLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      prepareLp.setMargins(0, this.dp(8), 0, 0);
      pendingCard.addView(prepareRow, prepareLp);
      addButton(prepareRow, "准备更新", function() { self.state.toolHubUpdateConfirmVisible = true; self.refreshToolHubUpdateSurface(); }, true);
    }
    if (details.length > 0 && this.state.toolHubUpdateConfirmVisible) {
      addText(pendingCard, "确认后将事务更新以上 " + details.length + " 个子模块。", 12, T.onSurface, true).setPadding(0, this.dp(8), 0, this.dp(6));
      var confirmRow = new android.widget.LinearLayout(context);
      confirmRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      addButton(confirmRow, "取消", function() { self.state.toolHubUpdateConfirmVisible = false; self.refreshToolHubUpdateSurface(); }, true);
      var gap = new android.view.View(context);
      confirmRow.addView(gap, new android.widget.LinearLayout.LayoutParams(self.dp(8), 1));
      addButton(confirmRow, "确认更新", function() { self.startToolHubModuleUpdateDeterministic(null); }, true);
      pendingCard.addView(confirmRow, new android.widget.LinearLayout.LayoutParams(-1, -2));
    }
    if (st.needRestart === true && st.entryUpdateAvailable !== true && details.length <= 0) {
      var restartRow = new android.widget.LinearLayout(context);
      restartRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      restartRow.setPadding(0, this.dp(8), 0, 0);
      pendingCard.addView(restartRow, new android.widget.LinearLayout.LayoutParams(-1, -2));
      addButton(restartRow, "立即重启 ToolHub", function() { self.startToolHubDeterministicRestart(); }, true);
    }

    var historyCard = addCard("更新记录");
    var historyData = this.state.toolHubUpdateHistoryData;
    var records = historyData && historyData.records ? historyData.records : [];
    if (!historyData) {
      var loadText = this.state.toolHubUpdateHistoryState === "error" ? "暂时无法加载更新记录" : "正在加载更新记录";
      addText(historyCard, loadText, 12, T.onSurface2, false);
      if (this.state.toolHubUpdateHistoryError) addText(historyCard, textValue(this.state.toolHubUpdateHistoryError), 11, T.onSurface2, false);
    } else {
      var sourceText = this.state.toolHubUpdateHistorySource === "remote" ? "已从 GitHub 更新" : "使用本地缓存";
      addText(historyCard, sourceText, 11, T.onSurface2, false);
      var pageCount = Math.max(1, Math.ceil(records.length / HISTORY_PAGE_SIZE));
      var page = numberValue(this.state.toolAppSubPage);
      if (page < 1) page = 1;
      if (page > pageCount) page = pageCount;
      this.state.toolAppSubPage = page;
      var start = (page - 1) * HISTORY_PAGE_SIZE;
      var end = Math.min(records.length, start + HISTORY_PAGE_SIZE);
      for (var ri = start; ri < end; ri++) {
        (function(record) {
          var item = new android.widget.LinearLayout(context);
          item.setOrientation(android.widget.LinearLayout.VERTICAL);
          item.setPadding(self.dp(10), self.dp(9), self.dp(10), self.dp(9));
          item.setBackground(self.ui.createPressedStateDrawable(T.surface2, self.withAlpha(T.primary, isDark ? 0.12 : 0.07), self.dp(14)));
          var itemLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
          itemLp.setMargins(0, self.dp(6), 0, 0);
          historyCard.addView(item, itemLp);
          var header = new android.widget.TextView(context);
          header.setText("[" + typeLabel(record.type) + "] " + textValue(record.title));
          toolhubSafeSetTextColor(header, T.onSurface);
          header.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
          header.setTypeface(null, android.graphics.Typeface.BOLD);
          item.addView(header, new android.widget.LinearLayout.LayoutParams(-1, -2));
          addText(item, textValue(record.date) + " · 版本 " + String(numberValue(record.manifestVersion)), 11, T.onSurface2, false);
          var expanded = textValue(self.state.toolAppSubKey) === textValue(record.id);
          if (expanded) {
            var recordDetails = safeArray(record.details);
            for (var rd = 0; rd < recordDetails.length; rd++) addText(item, "• " + textValue(recordDetails[rd]), 12, T.onSurface2, false);
            var modules = safeArray(record.modules);
            if (modules.length > 0) addText(item, "模块变化", 12, T.onSurface, true).setPadding(0, self.dp(6), 0, 0);
            for (var rm = 0; rm < modules.length; rm++) {
              var m = modules[rm] || {};
              addText(item, "• " + textValue(m.name) + "：" + (textValue(m.from) || "缺失") + " → " + (textValue(m.to) || "删除"), 11, T.onSurface2, false);
            }
          }
          item.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
            self.state.toolAppSubKey = expanded ? "" : textValue(record.id);
            self.refreshToolHubUpdateSurface();
          }}));
        })(records[ri]);
      }
      var pager = new android.widget.LinearLayout(context);
      pager.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      pager.setGravity(android.view.Gravity.CENTER_VERTICAL);
      pager.setPadding(0, this.dp(10), 0, 0);
      addButton(pager, "上一页", function() { if (page > 1) { self.state.toolAppSubPage = page - 1; self.state.toolAppSubKey = ""; self.refreshToolHubUpdateSurface(); } }, page > 1);
      var pageText = new android.widget.TextView(context);
      pageText.setText("第 " + page + " / " + pageCount + " 页");
      toolhubSafeSetTextColor(pageText, T.onSurface2);
      pageText.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      pageText.setGravity(android.view.Gravity.CENTER);
      pager.addView(pageText, new android.widget.LinearLayout.LayoutParams(self.dp(110), self.dp(44)));
      addButton(pager, "下一页", function() { if (page < pageCount) { self.state.toolAppSubPage = page + 1; self.state.toolAppSubKey = ""; self.refreshToolHubUpdateSurface(); } }, page < pageCount);
      historyCard.addView(pager, new android.widget.LinearLayout.LayoutParams(-1, -2));
    }
    return panel;
  };

  function installUpdatePageIntegrationOnce() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubUpdateVersionPageInstalled === true) return true;
      if (typeof proto.buildPanelView !== "function" || typeof proto.isToolAppRoute !== "function" || typeof proto.getToolAppTitle !== "function" || typeof proto.showToolAppOnMain !== "function" || typeof proto.getSettingsHomeCategoryDefs !== "function" || typeof proto.createSettingsHomeEntry !== "function") return false;

      var oldBuildPanelView = proto.buildPanelView;
      proto.buildPanelView = function(panelType) {
        if (textValue(panelType) === UPDATE_ROUTE) return this.buildToolHubUpdateVersionPanelView();
        return oldBuildPanelView.call(this, panelType);
      };

      var oldIsToolAppRoute = proto.isToolAppRoute;
      proto.isToolAppRoute = function(route) {
        return textValue(route) === UPDATE_ROUTE || oldIsToolAppRoute.call(this, route);
      };

      var oldGetToolAppTitle = proto.getToolAppTitle;
      proto.getToolAppTitle = function(route) {
        if (textValue(route) === UPDATE_ROUTE) return "更新与版本";
        return oldGetToolAppTitle.call(this, route);
      };

      var oldGetSettingsHomeCategoryDefs = proto.getSettingsHomeCategoryDefs;
      proto.getSettingsHomeCategoryDefs = function(useMonetHome) {
        var cats = oldGetSettingsHomeCategoryDefs.call(this, useMonetHome) || [];
        if (cats.length > 0 && cats[0] && cats[0].children) {
          var children = cats[0].children;
          var exists = false;
          for (var i = 0; i < children.length; i++) if (children[i] && textValue(children[i].key) === UPDATE_ROUTE) exists = true;
          if (!exists) children.unshift({ id: UPDATE_ROUTE, title: "更新与版本", desc: this.getToolHubUpdateHomeSummary(), icon: "↻", kind: "route", key: UPDATE_ROUTE });
        }
        return cats;
      };

      var oldCreateSettingsHomeEntry = proto.createSettingsHomeEntry;
      proto.createSettingsHomeEntry = function(parent, title, desc, actionText, onClick) {
        if (textValue(title) === "更新与版本") return this.createToolHubUpdateHomeEntry(parent, title, this.getToolHubUpdateHomeSummary(), onClick);
        return oldCreateSettingsHomeEntry.call(this, parent, title, desc, actionText, onClick);
      };

      proto.createToolHubUpdatePill = function() { return null; };
      proto.maybeAutoCheckToolHubUpdatesFromSettings = function() { return false; };
      proto.startToolHubModuleUpdateFromSettings = function(anchorView) { return this.startToolHubModuleUpdateDeterministic(anchorView); };

      var oldPushToolAppPage = proto.pushToolAppPage;
      proto.pushToolAppPage = function(route) {
        if (textValue(route) === UPDATE_ROUTE) {
          this.ensureToolHubUpdateUiState();
          this.state.toolAppSubPage = 1;
          this.state.toolAppSubKey = "";
          this.state.toolHubUpdateConfirmVisible = false;
          this.ensureToolHubUpdateHistoryLoaded(false);
        }
        return oldPushToolAppPage.call(this, route);
      };

      var oldShowToolAppOnMain = proto.showToolAppOnMain;
      proto.showToolAppOnMain = function(route, resetStack, generation) {
        var ret = oldShowToolAppOnMain.call(this, route, resetStack, generation);
        if (ret !== false && textValue(route) === "settings" && resetStack === true) this.onToolHubSettingsEntered();
        return ret;
      };

      proto.__toolHubUpdateVersionPageInstalled = true;
      return true;
    } catch (e) {
      try { safeLog(null, "e", "install update version page fail: " + String(e)); } catch (eLog) {}
    }
    return false;
  }

  try {
    new java.lang.Thread(new java.lang.Runnable({ run: function() {
      for (var i = 0; i < 120; i++) {
        if (installUpdatePageIntegrationOnce()) return;
        try { java.lang.Thread.sleep(100); } catch (eSleep) {}
      }
    }})).start();
  } catch (eThread) {}
})();
