// @version 1.1.0

// =======================【配置存储：SQLite 透明适配】=======================
// 这段代码的主要内容/用途：保持上层 settings.json/buttons.json/schema.json 调用不变，
// 将实际持久化透明切换到 ToolHub/toolhub.db，并在首次启动时导入已有 JSON 配置。
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
      _migrated: {},

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

      isValidJson: function(content) {
        try {
          if (content === null || typeof content === "undefined") return false;
          JSON.parse(String(content));
          return true;
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
          return db;
        } catch (e) {
          this._lastError = "openDb: " + String(e);
          try { if (db) db.close(); } catch (eClose) {}
          return null;
        }
      },

      closeDb: function(db) {
        try { if (db && db.isOpen()) db.close(); } catch (e) {}
      },

      readNow: function(path) {
        var key = this.keyForPath(path);
        if (!key) return null;

        var db = null;
        var stmt = null;
        try {
          db = this.openDb();
          if (!db) return null;
          stmt = db.compileStatement("SELECT payload FROM toolhub_documents WHERE doc_key=?");
          stmt.bindString(1, String(key));
          var value = String(stmt.simpleQueryForString());
          if (!this.isValidJson(value)) {
            this._lastError = "readNow: 数据库中的 " + key + " 不是有效 JSON";
            return null;
          }
          return value;
        } catch (e) {
          var es = String(e);
          if (es.indexOf("SQLiteDoneException") < 0) this._lastError = "readNow: " + es;
          return null;
        } finally {
          try { if (stmt) stmt.close(); } catch (eStmt) {}
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
          this._lastError = "";
          return true;
        } catch (e) {
          this._lastError = "writeRow: " + String(e);
          return false;
        } finally {
          try { if (metaStmt) metaStmt.close(); } catch (eMeta) {}
          try { if (stmt) stmt.close(); } catch (eStmt) {}
          try { if (inTransaction && db) db.endTransaction(); } catch (eEnd) {}
          this.closeDb(db);
        }
      },

      writeNow: function(path, content) {
        return this.writeRow(path, content, "runtime");
      },

      fallbackWrite: function(path, content) {
        try { return oldWriteText.call(FileIO, path, content); } catch (e) { return false; }
      },

      migrateLegacyPath: function(path) {
        var key = this.keyForPath(path);
        if (!key) return false;

        var existing = this.readNow(path);
        if (existing !== null) return true;

        var legacy = null;
        try { legacy = oldReadText.call(FileIO, path); } catch (eRead) { legacy = null; }
        if (!this.isValidJson(legacy)) return false;

        var ok = this.writeRow(path, legacy, "legacy-json");
        if (ok) this._migrated[key] = true;
        return ok;
      },

      migrateLegacyFiles: function() {
        var result = {
          settings: this.migrateLegacyPath(PATH_SETTINGS),
          buttons: this.migrateLegacyPath(PATH_BUTTONS),
          schema: this.migrateLegacyPath(PATH_SCHEMA)
        };
        return result;
      },

      readManagedText: function(path) {
        var value = this.readNow(path);
        if (value !== null) return value;

        var legacy = null;
        try { legacy = oldReadText.call(FileIO, path); } catch (eRead) { legacy = null; }
        if (this.isValidJson(legacy)) {
          if (this.writeRow(path, legacy, "legacy-json")) {
            this._migrated[this.keyForPath(path)] = true;
          }
          return legacy;
        }
        return legacy;
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

        var d = 0;
        try { d = parseInt(String(delayMs), 10); } catch (eDelay) { d = 0; }
        if (isNaN(d) || d < 0) d = 0;

        if (!this.ensureTimer()) {
          if (this.writeNow(p, content)) return true;
          return this.fallbackWrite(p, content);
        }

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
              var ok = self.writeNow(p, payload);
              if (!ok) self.fallbackWrite(p, payload);
              try { delete self._jobs[p]; } catch (eDelete) { self._jobs[p] = null; }
            }
          });
        } catch (eTask) {
          if (this.writeNow(p, payload)) return true;
          return this.fallbackWrite(p, payload);
        }

        this._jobs[p] = {
          path: p,
          payload: payload,
          version: version,
          task: task
        };

        try {
          this._timer.schedule(task, d);
          return true;
        } catch (eSchedule) {
          this._lastError = "scheduleWrite: " + String(eSchedule);
          try { delete this._jobs[p]; } catch (eDelete2) { this._jobs[p] = null; }
          if (this.writeNow(p, payload)) return true;
          return this.fallbackWrite(p, payload);
        }
      },

      flushWrites: function() {
        try {
          for (var p in this._jobs) {
            if (!this._jobs.hasOwnProperty(p)) continue;
            var job = this._jobs[p];
            if (!job) continue;
            try { if (job.task) job.task.cancel(); } catch (eCancel) {}
            var ok = this.writeNow(p, job.payload);
            if (!ok) this.fallbackWrite(p, job.payload);
            try { delete this._jobs[p]; } catch (eDelete) { this._jobs[p] = null; }
          }
          if (this._timer) {
            try { this._timer.cancel(); } catch (eTimerCancel) {}
            try { this._timer.purge(); } catch (ePurge) {}
            this._timer = null;
          }
          return true;
        } catch (e) {
          this._lastError = "flushWrites: " + String(e);
          return false;
        }
      },

      getInfo: function() {
        var exists = false;
        var pending = 0;
        try { exists = new java.io.File(String(this.dbPath)).exists(); } catch (eExists) {}
        try {
          for (var k in this._jobs) {
            if (this._jobs.hasOwnProperty(k) && this._jobs[k]) pending++;
          }
        } catch (ePending) {}
        return {
          engine: "sqlite",
          databasePath: String(this.dbPath),
          databaseExists: !!exists,
          schemaVersion: Number(this.schemaVersion),
          pendingWrites: pending,
          migrated: this._migrated,
          legacyJsonRetained: true,
          lastError: String(this._lastError || "")
        };
      }
    };

    // 先导入已有 JSON；导入成功后仍保留原文件，作为 SQLite 不可用时的只读回退。
    try { ToolHubSqliteStore.migrateLegacyFiles(); } catch (eMigration) {
      ToolHubSqliteStore._lastError = "migrateLegacyFiles: " + String(eMigration);
    }

    FileIO.readText = function(path) {
      if (ToolHubSqliteStore.isManagedPath(path)) {
        return ToolHubSqliteStore.readManagedText(path);
      }
      return oldReadText.call(FileIO, path);
    };

    FileIO.writeText = function(path, content) {
      if (ToolHubSqliteStore.isManagedPath(path)) {
        if (ToolHubSqliteStore.writeNow(path, content)) return true;
        return ToolHubSqliteStore.fallbackWrite(path, content);
      }
      return oldWriteText.call(FileIO, path, content);
    };

    FileIO.writeTextAtomic = function(path, content) {
      if (ToolHubSqliteStore.isManagedPath(path)) {
        if (ToolHubSqliteStore.writeNow(path, content)) return true;
        return ToolHubSqliteStore.fallbackWrite(path, content);
      }
      return oldWriteTextAtomic.call(FileIO, path, content);
    };

    FileIO.writeTextDebounced = function(path, content, delayMs) {
      if (ToolHubSqliteStore.isManagedPath(path)) {
        if (ToolHubSqliteStore.scheduleWrite(path, content, delayMs)) return true;
        return oldWriteTextDebounced.call(FileIO, path, content, delayMs);
      }
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
      this.L.i("storage engine=" + String(storageInfo.engine || "") + " path=" + String(storageInfo.databasePath || "") + " exists=" + String(!!storageInfo.databaseExists) + " pending=" + String(storageInfo.pendingWrites || 0) + " fallback=" + String(!!storageInfo.legacyJsonRetained) + " error=" + String(storageInfo.lastError || ""));
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

// =======================【工具：dp/now/clamp】======================
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
