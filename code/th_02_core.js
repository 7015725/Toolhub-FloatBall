// @version 1.2.0

// =======================【配置存储：SQLite 透明适配】=======================
// 这段代码的主要内容/用途：保持上层 settings.json/buttons.json/schema.json 调用不变，
// 将主存储切换到 ToolHub/toolhub.db，并用原子 JSON 镜像与待恢复日志保护异常路径。
(function() {
  try {
    if (typeof ConfigManager === "undefined" || !ConfigManager) return;
    if (typeof FileIO === "undefined" || !FileIO) return;
    if (ConfigManager.__toolHubSqlitePersistenceInstalled === true) return;

    var oldReadText = FileIO.readText;
    var oldWriteText = FileIO.writeText;
    var oldWriteTextAtomic = FileIO.writeTextAtomic;
    var oldWriteTextDebounced = FileIO.writeTextDebounced;
    var oldFlushDebouncedWrites = FileIO.flushDebouncedWrites;

    var ToolHubSqliteStore = {
      dbPath: APP_ROOT_DIR + "/toolhub.db",
      schemaVersion: 1,
      _timer: null,
      _jobs: {},
      _lastError: "",
      _lastDbError: "",
      _lastMirrorError: "",
      _migrated: {},
      _blockedWrites: {},
      _activeBackend: "sqlite",
      _databaseHealthy: false,

      keyForPath: function(path) {
        var p = String(path || "");
        if (p === String(PATH_SETTINGS)) return "settings";
        if (p === String(PATH_BUTTONS)) return "buttons";
        if (p === String(PATH_SCHEMA)) return "schema";
        return "";
      },

      isManagedPath: function(path) {
        return this.keyForPath(path) !== "";
      },

      pendingPathFor: function(path) {
        var key = this.keyForPath(path);
        if (!key) return "";
        return APP_ROOT_DIR + "/.sqlite_pending_" + key + ".json";
      },

      isValidJson: function(content) {
        try {
          if (content === null || typeof content === "undefined") return false;
          JSON.parse(String(content));
          return true;
        } catch (e) {
          return false;
        }
      },

      readLegacy: function(path) {
        try { return oldReadText.call(FileIO, path); } catch (e) { return null; }
      },

      writeLegacyAtomic: function(path, content) {
        try {
          if (oldWriteTextAtomic) {
            var atomicContext = {
              writeText: function(p, c) { return oldWriteText.call(FileIO, p, c); }
            };
            return oldWriteTextAtomic.call(atomicContext, path, content) !== false;
          }
          return oldWriteText.call(FileIO, path, content) !== false;
        } catch (e) {
          return false;
        }
      },

      readPending: function(path) {
        var pendingPath = this.pendingPathFor(path);
        if (!pendingPath) return null;
        var value = null;
        try { value = oldReadText.call(FileIO, pendingPath); } catch (eRead) { value = null; }
        return this.isValidJson(value) ? String(value) : null;
      },

      writePending: function(path, content) {
        var pendingPath = this.pendingPathFor(path);
        if (!pendingPath || !this.isValidJson(content)) return false;
        return this.writeLegacyAtomic(pendingPath, String(content));
      },

      clearPending: function(path) {
        var pendingPath = this.pendingPathFor(path);
        if (!pendingPath) return true;
        try {
          var f = new java.io.File(String(pendingPath));
          if (!f.exists()) return true;
          return !!f["delete"]();
        } catch (e) {
          return false;
        }
      },

      openDb: function() {
        var db = null;
        try {
          var dir = new java.io.File(String(APP_ROOT_DIR));
          if (!dir.exists() && !dir.mkdirs()) throw "ToolHub 目录创建失败";

          db = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(String(this.dbPath), null);
          db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_documents (doc_key TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, source TEXT NOT NULL, updated_at INTEGER NOT NULL)");
          db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_meta (meta_key TEXT PRIMARY KEY NOT NULL, meta_value TEXT NOT NULL)");
          try { db.execSQL("PRAGMA busy_timeout=2500"); } catch (eBusy) {}
          try { db.execSQL("PRAGMA synchronous=NORMAL"); } catch (eSync) {}
          this._databaseHealthy = true;
          return db;
        } catch (e) {
          this._databaseHealthy = false;
          this._lastDbError = "openDb: " + String(e);
          this._lastError = this._lastDbError;
          try { if (db) db.close(); } catch (eClose) {}
          return null;
        }
      },

      closeDb: function(db) {
        try { if (db && db.isOpen()) db.close(); } catch (e) {}
      },

      readState: function(path) {
        var key = this.keyForPath(path);
        if (!key) return { status: "error", value: null, error: "unmanaged path" };

        var db = null;
        var cursor = null;
        try {
          db = this.openDb();
          if (!db) return { status: "error", value: null, error: String(this._lastDbError || "openDb failed") };

          var args = java.lang.reflect.Array.newInstance(java.lang.String, 1);
          args[0] = String(key);
          cursor = db.rawQuery("SELECT payload FROM toolhub_documents WHERE doc_key=?", args);
          if (!cursor.moveToFirst()) {
            this._databaseHealthy = true;
            this._lastDbError = "";
            return { status: "missing", value: null, error: "" };
          }

          var value = String(cursor.getString(0));
          if (!this.isValidJson(value)) {
            this._databaseHealthy = false;
            this._lastDbError = "readState: 数据库中的 " + key + " 不是有效 JSON";
            this._lastError = this._lastDbError;
            return { status: "error", value: null, error: this._lastDbError };
          }

          this._databaseHealthy = true;
          this._lastDbError = "";
          return { status: "found", value: value, error: "" };
        } catch (e) {
          this._databaseHealthy = false;
          this._lastDbError = "readState: " + String(e);
          this._lastError = this._lastDbError;
          return { status: "error", value: null, error: this._lastDbError };
        } finally {
          try { if (cursor) cursor.close(); } catch (eCursor) {}
          this.closeDb(db);
        }
      },

      writeRow: function(path, content, source) {
        var key = this.keyForPath(path);
        if (!key || !this.isValidJson(content)) return false;

        var db = null;
        var stmt = null;
        var metaStmt = null;
        var inTransaction = false;
        var transactionMarked = false;
        var committed = false;
        try {
          db = this.openDb();
          if (!db) return false;

          db.beginTransaction();
          inTransaction = true;

          stmt = db.compileStatement("INSERT OR REPLACE INTO toolhub_documents(doc_key,payload,source,updated_at) VALUES(?,?,?,?)");
          stmt.bindString(1, String(key));
          stmt.bindString(2, String(content));
          stmt.bindString(3, String(source || "runtime"));
          stmt.bindLong(4, java.lang.System.currentTimeMillis());
          stmt.executeInsert();

          metaStmt = db.compileStatement("INSERT OR REPLACE INTO toolhub_meta(meta_key,meta_value) VALUES(?,?)");
          metaStmt.bindString(1, "schema_version");
          metaStmt.bindString(2, String(this.schemaVersion));
          metaStmt.executeInsert();

          db.setTransactionSuccessful();
          transactionMarked = true;
        } catch (e) {
          this._databaseHealthy = false;
          this._lastDbError = "writeRow: " + String(e);
          this._lastError = this._lastDbError;
        } finally {
          try { if (metaStmt) metaStmt.close(); } catch (eMeta) {}
          try { if (stmt) stmt.close(); } catch (eStmt) {}
          if (inTransaction && db) {
            try {
              db.endTransaction();
              if (transactionMarked) committed = true;
            } catch (eEnd) {
              committed = false;
              this._databaseHealthy = false;
              this._lastDbError = "endTransaction: " + String(eEnd);
              this._lastError = this._lastDbError;
            }
          }
          this.closeDb(db);
        }

        if (committed) {
          this._databaseHealthy = true;
          this._lastDbError = "";
          return true;
        }
        return false;
      },

      mirrorLegacy: function(path, content) {
        var ok = this.writeLegacyAtomic(path, content);
        if (ok) {
          this._lastMirrorError = "";
          return true;
        }
        this._lastMirrorError = "mirrorLegacy: " + String(path);
        this._lastError = this._lastMirrorError;
        return false;
      },

      syncBackup: function(path, content) {
        var mirrorOk = this.mirrorLegacy(path, content);
        if (mirrorOk && this.clearPending(path)) return true;
        return this.writePending(path, content);
      },

      fallbackPersist: function(path, content) {
        if (!this.writePending(path, content)) {
          this._lastMirrorError = "fallbackPersist: 待恢复日志写入失败 " + String(path);
          this._lastError = this._lastMirrorError;
          this.writeLegacyAtomic(path, content);
          return false;
        }

        var mirrorOk = this.mirrorLegacy(path, content);
        this._activeBackend = "json-fallback";
        this._blockedWrites[String(path)] = false;
        return mirrorOk || this.readPending(path) !== null;
      },

      persistNow: function(path, content) {
        var p = String(path || "");
        if (!this.isManagedPath(p) || !this.isValidJson(content)) return false;
        if (this._blockedWrites[p] === true) {
          this._lastError = "persistNow: SQLite 读取异常期间禁止覆盖 " + this.keyForPath(p);
          return false;
        }

        if (this.writeRow(p, content, "runtime")) {
          this.syncBackup(p, content);
          this._activeBackend = "sqlite";
          return true;
        }
        return this.fallbackPersist(p, content);
      },

      recoverPendingPath: function(path) {
        var pending = this.readPending(path);
        if (pending === null) return { handled: false, value: null, recovered: false };

        if (this.writeRow(path, pending, "json-fallback-recovery")) {
          this.syncBackup(path, pending);
          this._blockedWrites[String(path)] = false;
          this._activeBackend = "sqlite";
          return { handled: true, value: pending, recovered: true };
        }

        this._activeBackend = "json-fallback";
        this._blockedWrites[String(path)] = false;
        return { handled: true, value: pending, recovered: false };
      },

      migrateLegacyPath: function(path) {
        var key = this.keyForPath(path);
        if (!key) return false;

        var pendingResult = this.recoverPendingPath(path);
        if (pendingResult.handled) return pendingResult.recovered;

        var state = this.readState(path);
        if (state.status === "found") {
          this._blockedWrites[String(path)] = false;
          this.syncBackup(path, state.value);
          return true;
        }
        if (state.status === "error") {
          this._blockedWrites[String(path)] = true;
          return false;
        }

        var legacy = this.readLegacy(path);
        if (!this.isValidJson(legacy)) return false;

        var ok = this.writeRow(path, legacy, "legacy-json");
        if (ok) {
          this._migrated[key] = true;
          this._blockedWrites[String(path)] = false;
        }
        return ok;
      },

      migrateLegacyFiles: function() {
        return {
          settings: this.migrateLegacyPath(PATH_SETTINGS),
          buttons: this.migrateLegacyPath(PATH_BUTTONS),
          schema: this.migrateLegacyPath(PATH_SCHEMA)
        };
      },

      readManagedText: function(path) {
        var p = String(path || "");
        var pendingResult = this.recoverPendingPath(p);
        if (pendingResult.handled) return pendingResult.value;

        var state = this.readState(p);
        if (state.status === "found") {
          this._blockedWrites[p] = false;
          this._activeBackend = "sqlite";
          this.syncBackup(p, state.value);
          return state.value;
        }

        var legacy = this.readLegacy(p);
        if (state.status === "missing") {
          this._blockedWrites[p] = false;
          if (this.isValidJson(legacy)) {
            if (this.writeRow(p, legacy, "legacy-json")) {
              this._migrated[this.keyForPath(p)] = true;
              this._activeBackend = "sqlite";
            }
            return legacy;
          }
          return legacy;
        }

        // 数据库读取异常时只允许读取 JSON 兜底，禁止本会话反向覆盖数据库。
        this._blockedWrites[p] = true;
        this._activeBackend = "read-only-fallback";
        return this.isValidJson(legacy) ? legacy : null;
      },

      ensureTimer: function() {
        try {
          if (!this._timer) this._timer = new java.util.Timer("sx-toolhub-sqlite", true);
          return !!this._timer;
        } catch (e) {
          this._lastError = "ensureTimer: " + String(e);
          return false;
        }
      },

      scheduleWrite: function(path, content, delayMs) {
        var p = String(path || "");
        if (!this.isManagedPath(p) || !this.isValidJson(content)) return false;
        if (this._blockedWrites[p] === true) {
          this._lastError = "scheduleWrite: SQLite 读取异常期间禁止覆盖 " + this.keyForPath(p);
          return false;
        }

        var d = 0;
        try { d = parseInt(String(delayMs), 10); } catch (eDelay) { d = 0; }
        if (isNaN(d) || d < 0) d = 0;

        if (!this.ensureTimer()) return this.persistNow(p, content);

        var old = this._jobs[p];
        if (old && old.task) {
          try { old.task.cancel(); } catch (eCancel) {}
        }

        var self = this;
        var payload = String(content);
        var version = old && old.version ? Number(old.version) + 1 : 1;
        var task = null;
        try {
          task = new JavaAdapter(java.util.TimerTask, {
            run: function() {
              var live = self._jobs[p];
              if (!live || Number(live.version) !== version) return;
              var ok = self.persistNow(p, payload);
              if (ok) {
                try { delete self._jobs[p]; } catch (eDelete) { self._jobs[p] = null; }
              } else {
                live.task = null;
                live.lastError = String(self._lastError || "persist failed");
              }
            }
          });
        } catch (eTask) {
          return this.persistNow(p, payload);
        }

        this._jobs[p] = {
          path: p,
          payload: payload,
          version: version,
          task: task,
          lastError: ""
        };

        try {
          this._timer.schedule(task, d);
          return true;
        } catch (eSchedule) {
          this._lastError = "scheduleWrite: " + String(eSchedule);
          var okNow = this.persistNow(p, payload);
          if (okNow) {
            try { delete this._jobs[p]; } catch (eDelete2) { this._jobs[p] = null; }
          } else {
            this._jobs[p].task = null;
            this._jobs[p].lastError = String(this._lastError || "persist failed");
          }
          return okNow;
        }
      },

      flushWrites: function() {
        var allOk = true;
        try {
          for (var p in this._jobs) {
            if (!this._jobs.hasOwnProperty(p)) continue;
            var job = this._jobs[p];
            if (!job) continue;
            try { if (job.task) job.task.cancel(); } catch (eCancel) {}
            var ok = this.persistNow(p, job.payload);
            if (ok) {
              try { delete this._jobs[p]; } catch (eDelete) { this._jobs[p] = null; }
            } else {
              allOk = false;
              job.task = null;
              job.lastError = String(this._lastError || "persist failed");
            }
          }
          if (this._timer) {
            try { this._timer.cancel(); } catch (eTimerCancel) {}
            try { this._timer.purge(); } catch (ePurge) {}
            this._timer = null;
          }
          return allOk;
        } catch (e) {
          this._lastError = "flushWrites: " + String(e);
          return false;
        }
      },

      getLegacyAvailability: function() {
        var out = { settings: false, buttons: false, schema: false };
        try { out.settings = new java.io.File(String(PATH_SETTINGS)).exists(); } catch (e1) {}
        try { out.buttons = new java.io.File(String(PATH_BUTTONS)).exists(); } catch (e2) {}
        try { out.schema = new java.io.File(String(PATH_SCHEMA)).exists(); } catch (e3) {}
        return out;
      },

      getPendingState: function() {
        return {
          settings: this.readPending(PATH_SETTINGS) !== null,
          buttons: this.readPending(PATH_BUTTONS) !== null,
          schema: this.readPending(PATH_SCHEMA) !== null
        };
      },

      getBlockedState: function() {
        return {
          settings: this._blockedWrites[String(PATH_SETTINGS)] === true,
          buttons: this._blockedWrites[String(PATH_BUTTONS)] === true,
          schema: this._blockedWrites[String(PATH_SCHEMA)] === true
        };
      },

      getInfo: function() {
        var exists = false;
        var pendingWrites = 0;
        try { exists = new java.io.File(String(this.dbPath)).exists(); } catch (eExists) {}
        try {
          for (var k in this._jobs) {
            if (this._jobs.hasOwnProperty(k) && this._jobs[k]) pendingWrites++;
          }
        } catch (ePending) {}
        return {
          engine: "sqlite",
          activeBackend: String(this._activeBackend || "sqlite"),
          databasePath: String(this.dbPath),
          databaseExists: !!exists,
          databaseHealthy: !!this._databaseHealthy,
          schemaVersion: Number(this.schemaVersion),
          pendingWrites: pendingWrites,
          pendingRecovery: this.getPendingState(),
          blockedWrites: this.getBlockedState(),
          migrated: this._migrated,
          legacyJsonAvailable: this.getLegacyAvailability(),
          legacyMirrorHealthy: this._lastMirrorError === "",
          lastDbError: String(this._lastDbError || ""),
          lastMirrorError: String(this._lastMirrorError || ""),
          lastError: String(this._lastError || this._lastDbError || this._lastMirrorError || "")
        };
      }
    };

    // 启动阶段仅在明确缺少数据库记录时迁移旧 JSON；读取异常不会触发反向覆盖。
    try { ToolHubSqliteStore.migrateLegacyFiles(); } catch (eMigration) {
      ToolHubSqliteStore._lastError = "migrateLegacyFiles: " + String(eMigration);
    }

    FileIO.readText = function(path) {
      if (ToolHubSqliteStore.isManagedPath(path)) return ToolHubSqliteStore.readManagedText(path);
      return oldReadText.call(FileIO, path);
    };

    FileIO.writeText = function(path, content) {
      if (ToolHubSqliteStore.isManagedPath(path)) return ToolHubSqliteStore.persistNow(path, content);
      return oldWriteText.call(FileIO, path, content);
    };

    FileIO.writeTextAtomic = function(path, content) {
      if (ToolHubSqliteStore.isManagedPath(path)) return ToolHubSqliteStore.persistNow(path, content);
      return oldWriteTextAtomic.call(FileIO, path, content);
    };

    FileIO.writeTextDebounced = function(path, content, delayMs) {
      if (ToolHubSqliteStore.isManagedPath(path)) return ToolHubSqliteStore.scheduleWrite(path, content, delayMs);
      return oldWriteTextDebounced.call(FileIO, path, content, delayMs);
    };

    FileIO.flushDebouncedWrites = function() {
      var oldResult = true;
      try { oldResult = oldFlushDebouncedWrites.call(FileIO); } catch (eOldFlush) { oldResult = false; }
      var sqliteResult = ToolHubSqliteStore.flushWrites();
      return oldResult !== false && sqliteResult !== false;
    };

    ConfigManager.getStorageInfo = function() {
      return ToolHubSqliteStore.getInfo();
    };
    ConfigManager.migrateLegacyJsonToSqlite = function() {
      return ToolHubSqliteStore.migrateLegacyFiles();
    };
    ConfigManager.__toolHubSqliteStore = ToolHubSqliteStore;
    ConfigManager.__toolHubSqlitePersistenceInstalled = true;
  } catch (eInstallSqlite) {
    try { safeLog(null, 'e', "install sqlite persistence fail: " + String(eInstallSqlite)); } catch (eLogSqlite) {}
  }
})();

function FloatBallAppWM(logger) {
  this.L = logger || null;

  // # 加载配置
  this.config = ConfigManager.loadSettings();
  this.currentPanelKey = "main";
  this.panels = { main: ConfigManager.loadButtons() };

  // # 更新 Logger 配置（因为 Logger 初始化时是默认值）
  if (this.L) this.L.updateConfig(this.config);
  try {
    if (this.L && ConfigManager.getStorageInfo) {
      var storageInfo = ConfigManager.getStorageInfo();
      this.L.i("storage engine=" + String(storageInfo.engine || "") + " backend=" + String(storageInfo.activeBackend || "") + " path=" + String(storageInfo.databasePath || "") + " exists=" + String(!!storageInfo.databaseExists) + " healthy=" + String(!!storageInfo.databaseHealthy) + " pending=" + String(storageInfo.pendingWrites || 0) + " error=" + String(storageInfo.lastError || ""));
    }
  } catch (eStorageInfo) {}

  this.state = {
    receivers: [], // 存储广播接收器引用，用于 close 时注销
    wm: null,
    dm: null,
    density: 1.0,

    screen: { w: 0, h: 0 },
    lastRotation: -1,
    lastMonitorTs: 0,

    ht: null,
    h: null,

    addedBall: false,
    addedPanel: false,
    addedSettings: false,
    addedViewer: false,
    addedMask: false,

    ballRoot: null,
    ballContent: null,
    ballLp: null,

    panel: null,
    panelLp: null,

    settingsPanel: null,
    settingsPanelLp: null,

    viewerPanel: null,
    viewerPanelLp: null,
    viewerPanelType: null,
    panelBackCallbackEntries: [],
    predictiveBackIndicatorView: null,
    predictiveBackIndicatorLp: null,

    // 设置类 UI App 化：单窗口页面栈（settings -> 子页面 -> 编辑页）
    toolAppActive: false,
    toolAppNavStack: [],
    toolAppRoute: null,
    toolAppRoot: null,
    toolAppBody: null,
    toolAppContentHost: null,
    toolAppBackPreviewView: null,
    toolAppBackPreviewRoute: null,
    toolAppBackPreviewReady: false,
    toolAppTitleView: null,
    toolAppBackButton: null,
    settingsGroupKey: null,
    settingsHomeSelectedCategoryId: null,
    settingsHomeSelectedItemId: null,
    settingsUpdateExpanded: false,

    mask: null,
    maskLp: null,

    loadedPos: null,

    dragging: false,

    docked: false,
    dockSide: null,

    lastMotionTs: 0,
    idleDockRunnable: null,

    longPressArmed: false,
    longPressTriggered: false,
    longPressRunnable: null,

    displayListener: null,

    // # 设置面板：临时编辑缓存
    pendingUserCfg: null,
    pendingDirty: false,

    // 按钮管理首页：搜索过滤状态
    buttonManagerQuery: "",

    closing: false
  };

  // # 创建实例独立的 UI 工具对象，避免多实例共享颜色状态
  this.ui = {};
  var protoUi = FloatBallAppWM.prototype.ui;
  for (var _uiKey in protoUi) {
    this.ui[_uiKey] = protoUi[_uiKey];
  }
  this.ui.colors = {};

  // # 初始化莫奈动态配色（传入当前主题避免重复检测）
  try { this.refreshMonetColors(this.isDarkTheme());  } catch(eM) { safeLog(null, 'e', "catch " + String(eM)); }
}

// =======================【工具：dp/now/clamp】=======================
FloatBallAppWM.prototype.dp = function(v) { return Math.floor(Number(v) * this.state.density); };
FloatBallAppWM.prototype.sp = function(v) { try { return Math.floor(Number(v) * context.getResources().getDisplayMetrics().scaledDensity); } catch (e) { return Math.floor(Number(v) * this.state.density); } };
FloatBallAppWM.prototype.now = function() { return new Date().getTime(); };
FloatBallAppWM.prototype.clamp = function(v, min, max) { if (v < min) return min; if (v > max) return max; return v; };
FloatBallAppWM.prototype.rectIntersect = function(ax, ay, aw, ah, bx, by, bw, bh) {
  return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay);
};

// # 这段代码的主要内容/用途：安全地在 UI 线程执行代码（用于后台线程回调更新 UI）
FloatBallAppWM.prototype.runOnUiThreadSafe = function(fn) {
  try {
    if (!fn) return;
    var self = this;
    // 优先使用 Activity 的 runOnUiThread，否则使用 View.post
    if (this.state && this.state.ballRoot) {
      this.state.ballRoot.post(new java.lang.Runnable({
        run: function() { try { fn.call(self);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }
      }));
    } else {
      // 兜底：直接执行（如果已经在 UI 线程）或尝试使用 Handler
      try {
        var h = new android.os.Handler(android.os.Looper.getMainLooper());
        h.post(new java.lang.Runnable({
          run: function() { try { fn.call(self);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }
        }));
      } catch(e) {
        // 最后兜底：直接执行
        try { fn.call(self);  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
      }
    }
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
};

// # 这段代码的主要内容/用途：统一图标缓存（LRU），减少反复解码/反复走 PackageManager，降低卡顿与内存波动（不改变 UI 与功能）
// 优化后的图标缓存（带 Bitmap 回收，防止内存泄漏）
FloatBallAppWM.prototype._iconCache = {
  map: {},
  order: [],
  max: 80,

  get: function(k) {
    try {
      if (!this.map.hasOwnProperty(k)) return null;
      // LRU: move to end
      var idx = this.order.indexOf(k);
      if (idx >= 0) this.order.splice(idx, 1);
      this.order.push(k);
      return this.map[k];
    } catch(e) { return null; }
  },

  put: function(k, v) {
    try {
      if (!k || v == null) return;

      if (this.map.hasOwnProperty(k)) {
        // 替换旧值时回收旧 Bitmap（如果是 BitmapDrawable）
        var old = this.map[k];
        try {
          if (old && old.getBitmap && old !== v) {
            var bmp = old.getBitmap();
            if (bmp && !bmp.isRecycled()) bmp.recycle();
          }
        } catch(eRecycle) {}

        this.map[k] = v;
        var idx = this.order.indexOf(k);
        if (idx >= 0) this.order.splice(idx, 1);
        this.order.push(k);
        return;
      }

      this.map[k] = v;
      this.order.push(k);

      while (this.order.length > this.max) {
        var oldKey = this.order.shift();
        var oldVal = this.map[oldKey];
        try {
          if (oldVal && oldVal.getBitmap) {
            var oldBmp = oldVal.getBitmap();
            if (oldBmp && !oldBmp.isRecycled()) oldBmp.recycle();
          }
        } catch(eRecycleOld) {}
        try { delete this.map[oldKey]; } catch(eDel) { this.map[oldKey] = null; }
      }
    } catch(e) {}
  },

  clear: function() {
    try {
      for (var k in this.map) {
        if (!this.map.hasOwnProperty(k)) continue;
        var v = this.map[k];
        try {
          if (v && v.getBitmap) {
            var bmp = v.getBitmap();
            if (bmp && !bmp.isRecycled()) bmp.recycle();
          }
        } catch(eRecycle) {}
      }
    } catch(e) {}
    this.map = {};
    this.order = [];
  }
};
