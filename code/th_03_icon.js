// @version 2.0.0

// =======================【按钮图标：SQLite BLOB 存储】=======================
// 本地图片只在导入阶段读取文件，运行时按钮配置只保存内容哈希引用。
(function() {
  try {
    if (typeof ConfigManager === "undefined" || !ConfigManager) return;
    var store = ConfigManager.__toolHubSqliteStore;
    if (!store || ConfigManager.__toolHubButtonIconBlobInstalled === true) return;

    var ICON_STORAGE_VERSION = 1;
    var ICON_MAX_BYTES = 1048576;
    var ICON_MAX_PX = 1024;
    var ICON_DB_URI_PREFIX = "sqlite-icon:";
    var oldEnsureTables = store.ensureTables;
    var oldReplaceButtonsInDb = store.replaceButtonsInDb;
    var oldReadButtonsInDb = store.readButtonsInDb;
    var oldMigrateIfNeeded = store.migrateIfNeeded;
    var oldWriteManagedNow = store.writeManagedNow;
    var oldGetInfo = store.getInfo;

    store.hasTableColumn = function(db, tableName, columnName) {
      var cursor = null;
      try {
        cursor = db.rawQuery("PRAGMA table_info(" + String(tableName) + ")", null);
        while (cursor.moveToNext()) {
          if (String(cursor.getString(1) || "") === String(columnName)) return true;
        }
      } catch (e) {
        return false;
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
      return false;
    };

    store.ensureTableColumn = function(db, tableName, columnName, sqlType) {
      if (this.hasTableColumn(db, tableName, columnName)) return true;
      db.execSQL("ALTER TABLE " + String(tableName) + " ADD COLUMN " + String(columnName) + " " + String(sqlType));
      return true;
    };

    store.ensureButtonIconTables = function(db) {
      db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_button_icons (icon_key TEXT PRIMARY KEY NOT NULL, mime_type TEXT NOT NULL, image_data BLOB NOT NULL, byte_size INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, sha256 TEXT NOT NULL, original_name TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)");
      this.ensureTableColumn(db, "toolhub_buttons", "icon_source_type", "TEXT NOT NULL DEFAULT 'none'");
      this.ensureTableColumn(db, "toolhub_buttons", "icon_key", "TEXT");
      this.ensureTableColumn(db, "toolhub_buttons", "icon_res_name", "TEXT");
      this.ensureTableColumn(db, "toolhub_buttons", "icon_tint", "TEXT");
      db.execSQL("CREATE INDEX IF NOT EXISTS idx_toolhub_buttons_icon_key ON toolhub_buttons(icon_key)");
      return true;
    };

    store.ensureTables = function(db) {
      oldEnsureTables.call(this, db);
      this.ensureButtonIconTables(db);
    };

    store.byteArrayLength = function(bytes) {
      try { return Number(java.lang.reflect.Array.getLength(bytes)); } catch (e) {}
      try { return Number(bytes.length || 0); } catch (e2) {}
      return 0;
    };

    store.bytesToHex = function(bytes) {
      var out = "";
      var len = this.byteArrayLength(bytes);
      for (var i = 0; i < len; i++) {
        var v = Number(bytes[i]);
        if (v < 0) v += 256;
        var h = java.lang.Integer.toHexString(v & 255);
        if (h.length < 2) h = "0" + h;
        out += String(h);
      }
      return out.toLowerCase();
    };

    store.sha256Bytes = function(bytes) {
      var md = java.security.MessageDigest.getInstance("SHA-256");
      md.update(bytes);
      return this.bytesToHex(md.digest());
    };

    store.readIconFile = function(path) {
      var p = String(path || "");
      if (!p) throw "图标路径为空";
      var file = new java.io.File(p);
      if (!file.exists() || !file.isFile()) throw "图标文件不存在: " + p;
      var size = Number(file.length() || 0);
      if (size <= 0) throw "图标文件为空: " + p;
      if (size > ICON_MAX_BYTES) throw "图标文件超过 1MB: " + p;

      var bounds = new android.graphics.BitmapFactory.Options();
      bounds.inJustDecodeBounds = true;
      android.graphics.BitmapFactory.decodeFile(p, bounds);
      var width = Number(bounds.outWidth || 0);
      var height = Number(bounds.outHeight || 0);
      var mime = String(bounds.outMimeType || "").toLowerCase();
      if (width <= 0 || height <= 0) throw "无法识别图标尺寸: " + p;
      if (width > ICON_MAX_PX || height > ICON_MAX_PX) throw "图标尺寸超过 1024px: " + p;
      if (mime.indexOf("image/") !== 0) throw "图标不是受支持的图片: " + p;

      var input = null;
      var output = null;
      try {
        input = new java.io.FileInputStream(file);
        output = new java.io.ByteArrayOutputStream(Math.max(1024, Math.floor(size)));
        var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
        var total = 0;
        while (true) {
          var n = input.read(buffer);
          if (n < 0) break;
          if (n === 0) continue;
          total += Number(n);
          if (total > ICON_MAX_BYTES) throw "图标读取超过 1MB: " + p;
          output.write(buffer, 0, n);
        }
        var bytes = output.toByteArray();
        var actualSize = this.byteArrayLength(bytes);
        if (actualSize <= 0) throw "图标读取结果为空: " + p;
        var sha = this.sha256Bytes(bytes);
        return {
          key: sha,
          sha256: sha,
          mimeType: mime,
          data: bytes,
          byteSize: actualSize,
          width: width,
          height: height,
          originalName: String(file.getName() || ""),
          sourcePath: p
        };
      } finally {
        try { if (input) input.close(); } catch (eInput) {}
        try { if (output) output.close(); } catch (eOutput) {}
      }
    };

    store.iconBlobExists = function(db, iconKey) {
      var cursor = null;
      try {
        cursor = db.rawQuery("SELECT 1 FROM toolhub_button_icons WHERE icon_key=?", this.stringArgs([iconKey]));
        return cursor.moveToFirst();
      } catch (e) {
        return false;
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
    };

    store.putIconBlob = function(db, iconInfo) {
      if (!iconInfo || !iconInfo.key || !iconInfo.data) throw "图标导入数据无效";
      var now = java.lang.System.currentTimeMillis();
      var stmt = null;
      try {
        stmt = db.compileStatement("INSERT OR IGNORE INTO toolhub_button_icons(icon_key,mime_type,image_data,byte_size,width,height,sha256,original_name,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)");
        stmt.bindString(1, String(iconInfo.key));
        stmt.bindString(2, String(iconInfo.mimeType || "application/octet-stream"));
        stmt.bindBlob(3, iconInfo.data);
        stmt.bindLong(4, Number(iconInfo.byteSize || 0));
        stmt.bindLong(5, Number(iconInfo.width || 0));
        stmt.bindLong(6, Number(iconInfo.height || 0));
        stmt.bindString(7, String(iconInfo.sha256 || iconInfo.key));
        if (iconInfo.originalName) stmt.bindString(8, String(iconInfo.originalName)); else stmt.bindNull(8);
        stmt.bindLong(9, now);
        stmt.bindLong(10, now);
        stmt.executeInsert();
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }

      var update = null;
      try {
        update = db.compileStatement("UPDATE toolhub_button_icons SET mime_type=?,byte_size=?,width=?,height=?,original_name=COALESCE(?,original_name),updated_at=? WHERE icon_key=?");
        update.bindString(1, String(iconInfo.mimeType || "application/octet-stream"));
        update.bindLong(2, Number(iconInfo.byteSize || 0));
        update.bindLong(3, Number(iconInfo.width || 0));
        update.bindLong(4, Number(iconInfo.height || 0));
        if (iconInfo.originalName) update.bindString(5, String(iconInfo.originalName)); else update.bindNull(5);
        update.bindLong(6, now);
        update.bindString(7, String(iconInfo.key));
        update.executeUpdateDelete();
      } finally {
        try { if (update) update.close(); } catch (eUpdateClose) {}
      }
      return String(iconInfo.key);
    };

    store.isInternalShortcutIconPath = function(path) {
      var p = String(path || "");
      var prefix = String(APP_ROOT_DIR) + "/shortcut_icons/";
      return p.indexOf(prefix) === 0;
    };

    store.prepareButtonIcon = function(db, button, cleanupPaths) {
      var b = button || {};
      var path = b.iconPath == null ? "" : String(b.iconPath).replace(/^\s+|\s+$/g, "");
      if (path.indexOf(ICON_DB_URI_PREFIX) === 0) {
        var uriKey = path.substring(ICON_DB_URI_PREFIX.length);
        if (!uriKey || !this.iconBlobExists(db, uriKey)) throw "SQLite 图标引用不存在: " + uriKey;
        return { sourceType: "blob", iconKey: uriKey, resName: "", tint: "" };
      }
      if (path) {
        var imported = this.readIconFile(path);
        var iconKey = this.putIconBlob(db, imported);
        if (this.isInternalShortcutIconPath(path) && cleanupPaths) cleanupPaths.push(path);
        return { sourceType: "blob", iconKey: iconKey, resName: "", tint: "" };
      }

      var resName = b.iconResName == null ? "" : String(b.iconResName);
      if (resName) {
        return {
          sourceType: "shortx",
          iconKey: "",
          resName: resName,
          tint: b.iconTint == null ? "" : String(b.iconTint)
        };
      }

      var oldKey = b.iconDbKey == null ? "" : String(b.iconDbKey);
      if (oldKey && this.iconBlobExists(db, oldKey)) {
        return { sourceType: "blob", iconKey: oldKey, resName: "", tint: "" };
      }
      return { sourceType: "none", iconKey: "", resName: "", tint: "" };
    };

    store.cleanButtonIconFields = function(button) {
      var copy = this.cloneValue(button || {});
      try { delete copy.iconPath; } catch (e1) { copy.iconPath = null; }
      try { delete copy.iconDbKey; } catch (e2) { copy.iconDbKey = null; }
      try { delete copy.iconSourceType; } catch (e3) { copy.iconSourceType = null; }
      try { delete copy.iconOriginalName; } catch (e4) { copy.iconOriginalName = null; }
      try { delete copy.iconMimeType; } catch (e5) { copy.iconMimeType = null; }
      try { delete copy.iconByteSize; } catch (e6) { copy.iconByteSize = null; }
      try { delete copy.iconResName; } catch (e7) { copy.iconResName = null; }
      try { delete copy.iconTint; } catch (e8) { copy.iconTint = null; }
      return copy;
    };

    store.listButtonRowIds = function(db) {
      var cursor = null;
      var out = [];
      try {
        cursor = db.rawQuery("SELECT button_row_id FROM toolhub_buttons ORDER BY sort_order,button_row_id", null);
        while (cursor.moveToNext()) out.push(Number(cursor.getLong(0)));
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
      return out;
    };

    store.updateButtonIconColumns = function(db, rowId, iconInfo) {
      var stmt = null;
      try {
        stmt = db.compileStatement("UPDATE toolhub_buttons SET icon_source_type=?,icon_key=?,icon_res_name=?,icon_tint=? WHERE button_row_id=?");
        stmt.bindString(1, String(iconInfo.sourceType || "none"));
        if (iconInfo.iconKey) stmt.bindString(2, String(iconInfo.iconKey)); else stmt.bindNull(2);
        if (iconInfo.resName) stmt.bindString(3, String(iconInfo.resName)); else stmt.bindNull(3);
        if (iconInfo.tint) stmt.bindString(4, String(iconInfo.tint)); else stmt.bindNull(4);
        stmt.bindLong(5, Number(rowId));
        stmt.executeUpdateDelete();
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    };

    store.deleteOrphanButtonIcons = function(db) {
      db.execSQL("DELETE FROM toolhub_button_icons WHERE icon_key NOT IN (SELECT icon_key FROM toolhub_buttons WHERE icon_key IS NOT NULL AND icon_key<>'')");
    };

    store.replaceButtonsInDb = function(db, buttons) {
      this.ensureButtonIconTables(db);
      var list = buttons || [];
      var prepared = [];
      var clean = [];
      var cleanupPaths = [];
      for (var i = 0; i < list.length; i++) {
        prepared.push(this.prepareButtonIcon(db, list[i], cleanupPaths));
        clean.push(this.cleanButtonIconFields(list[i]));
      }
      oldReplaceButtonsInDb.call(this, db, clean);
      var rowIds = this.listButtonRowIds(db);
      if (rowIds.length !== prepared.length) throw "按钮图标行数与按钮行数不一致";
      for (var j = 0; j < rowIds.length; j++) this.updateButtonIconColumns(db, rowIds[j], prepared[j]);
      this.deleteOrphanButtonIcons(db);
      this._buttonIconCleanupAfterCommit = cleanupPaths;
    };

    store.readButtonsInDb = function(db) {
      this.ensureButtonIconTables(db);
      var buttons = oldReadButtonsInDb.call(this, db);
      if (!buttons) return buttons;
      var cursor = null;
      var index = 0;
      try {
        cursor = db.rawQuery("SELECT b.icon_source_type,b.icon_key,b.icon_res_name,b.icon_tint,i.original_name,i.mime_type,i.byte_size FROM toolhub_buttons b LEFT JOIN toolhub_button_icons i ON i.icon_key=b.icon_key ORDER BY b.sort_order,b.button_row_id", null);
        while (cursor.moveToNext() && index < buttons.length) {
          var b = buttons[index] || {};
          var sourceType = cursor.isNull(0) ? "none" : String(cursor.getString(0));
          b.iconSourceType = sourceType;
          if (sourceType === "blob" && !cursor.isNull(1)) {
            var key = String(cursor.getString(1));
            b.iconDbKey = key;
            b.iconPath = ICON_DB_URI_PREFIX + key;
            if (!cursor.isNull(4)) b.iconOriginalName = String(cursor.getString(4));
            if (!cursor.isNull(5)) b.iconMimeType = String(cursor.getString(5));
            if (!cursor.isNull(6)) b.iconByteSize = Number(cursor.getLong(6));
            try { delete b.iconResName; } catch (eRes) { b.iconResName = null; }
            try { delete b.iconTint; } catch (eTint) { b.iconTint = null; }
          } else if (sourceType === "shortx" && !cursor.isNull(2)) {
            b.iconResName = String(cursor.getString(2));
            if (!cursor.isNull(3)) b.iconTint = String(cursor.getString(3));
            try { delete b.iconPath; } catch (ePath2) { b.iconPath = null; }
            try { delete b.iconDbKey; } catch (eDb) { b.iconDbKey = null; }
          }
          buttons[index] = b;
          index++;
        }
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
      return buttons;
    };

    store.cleanupImportedShortcutIcons = function(paths) {
      var list = paths || [];
      var seen = {};
      for (var i = 0; i < list.length; i++) {
        var p = String(list[i] || "");
        if (!p || seen[p] || !this.isInternalShortcutIconPath(p)) continue;
        seen[p] = true;
        try {
          var f = new java.io.File(p);
          if (f.exists() && f.isFile()) f["delete"]();
        } catch (eDelete) {}
      }
      try {
        var dir = new java.io.File(String(APP_ROOT_DIR) + "/shortcut_icons");
        var children = dir.listFiles();
        if (dir.exists() && (!children || children.length === 0)) dir["delete"]();
      } catch (eDir) {}
    };

    store.consumeButtonIconCleanup = function() {
      var paths = this._buttonIconCleanupAfterCommit || [];
      this._buttonIconCleanupAfterCommit = [];
      this.cleanupImportedShortcutIcons(paths);
    };

    store.ensureButtonIconStorageReady = function(db) {
      this.ensureButtonIconTables(db);
      var current = this.getMeta(db, "button_icon_storage_version");
      if (String(current || "") === String(ICON_STORAGE_VERSION)) return true;
      var buttons = oldReadButtonsInDb.call(this, db);
      if (!buttons) buttons = [];
      var inTransaction = false;
      var marked = false;
      var committed = false;
      this._buttonIconCleanupAfterCommit = [];
      try {
        db.beginTransaction();
        inTransaction = true;
        this.replaceButtonsInDb(db, buttons);
        this.putMeta(db, "button_icon_storage_version", String(ICON_STORAGE_VERSION));
        this.putMeta(db, "button_icon_migrated_at", String(java.lang.System.currentTimeMillis()));
        db.setTransactionSuccessful();
        marked = true;
      } catch (e) {
        this._lastDbError = "ensureButtonIconStorageReady: " + String(e);
        this._lastError = this._lastDbError;
      } finally {
        if (inTransaction) {
          try {
            db.endTransaction();
            if (marked) committed = true;
          } catch (eEnd) {
            committed = false;
            this._lastDbError = "ensureButtonIconStorageReady endTransaction: " + String(eEnd);
            this._lastError = this._lastDbError;
          }
        }
      }
      if (committed) {
        this.consumeButtonIconCleanup();
        return true;
      }
      this._buttonIconCleanupAfterCommit = [];
      return false;
    };

    store.migrateIfNeeded = function(db) {
      var ok = oldMigrateIfNeeded.call(this, db);
      if (!ok) return false;
      return this.ensureButtonIconStorageReady(db);
    };

    store.writeManagedNow = function(path, content) {
      this._buttonIconCleanupAfterCommit = [];
      var ok = oldWriteManagedNow.call(this, path, content);
      if (ok) this.consumeButtonIconCleanup();
      else this._buttonIconCleanupAfterCommit = [];
      return ok;
    };

    store.getButtonIconBlob = function(iconKey) {
      var key = String(iconKey || "");
      if (!key) return null;
      var db = null;
      var cursor = null;
      try {
        db = this.openDb();
        if (!db || !this.migrateIfNeeded(db)) return null;
        cursor = db.rawQuery("SELECT mime_type,image_data,byte_size,width,height,sha256,original_name,updated_at FROM toolhub_button_icons WHERE icon_key=?", this.stringArgs([key]));
        if (!cursor.moveToFirst()) return null;
        var bytes = cursor.getBlob(1);
        var byteSize = Number(cursor.getLong(2));
        if (!bytes || byteSize <= 0 || byteSize > ICON_MAX_BYTES) return null;
        if (this.byteArrayLength(bytes) !== byteSize) return null;
        return {
          iconKey: key,
          mimeType: String(cursor.getString(0) || ""),
          data: bytes,
          byteSize: byteSize,
          width: Number(cursor.getLong(3)),
          height: Number(cursor.getLong(4)),
          sha256: String(cursor.getString(5) || ""),
          originalName: cursor.isNull(6) ? "" : String(cursor.getString(6)),
          updatedAt: Number(cursor.getLong(7))
        };
      } catch (e) {
        this._lastDbError = "getButtonIconBlob: " + String(e);
        this._lastError = this._lastDbError;
        return null;
      } finally {
        try { if (cursor) cursor.close(); } catch (eCursor) {}
        this.closeDb(db);
      }
    };

    store.getButtonIconStats = function(db) {
      var cursor = null;
      try {
        cursor = db.rawQuery("SELECT COUNT(*),COALESCE(SUM(byte_size),0) FROM toolhub_button_icons", null);
        if (!cursor.moveToFirst()) return { count: 0, bytes: 0 };
        return { count: Number(cursor.getLong(0)), bytes: Number(cursor.getLong(1)) };
      } catch (e) {
        return { count: -1, bytes: -1 };
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
    };

    store.getInfo = function() {
      var info = oldGetInfo.call(this);
      var db = null;
      try {
        db = this.openDb();
        if (db) {
          var stats = this.getButtonIconStats(db);
          info.buttonIconStorageVersion = Number(this.getMeta(db, "button_icon_storage_version") || 0);
          info.buttonIconCount = Number(stats.count);
          info.buttonIconBytes = Number(stats.bytes);
          info.shortcutIconDirectoryExists = new java.io.File(String(APP_ROOT_DIR) + "/shortcut_icons").exists();
        }
      } catch (e) {
        info.buttonIconStorageError = String(e);
      } finally {
        this.closeDb(db);
      }
      return info;
    };

    ConfigManager.getButtonIconBlob = function(iconKey) {
      return store.getButtonIconBlob(iconKey);
    };
    ConfigManager.__toolHubButtonIconBlobInstalled = true;

    try {
      var db0 = store.openDb();
      if (db0) {
        try { store.ensureButtonIconStorageReady(db0); }
        finally { store.closeDb(db0); }
      }
    } catch (eReady) {
      store._lastError = "button icon storage init: " + String(eReady);
    }
  } catch (eInstall) {
    try { safeLog(null, "e", "install button icon blob storage fail: " + String(eInstall)); } catch (eLog) {}
  }
})();

FloatBallAppWM.prototype._iconCache = {
  map: {},
  keys: [],
  max: 80,

  get: function(key) {
    var k = String(key || "");
    if (!k) return null;
    var item = this.map[k];
    if (!item) return null;
    var idx = this.keys.indexOf(k);
    if (idx > -1) {
      this.keys.splice(idx, 1);
      this.keys.push(k);
    }
    return item.dr;
  },

  put: function(key, drawable) {
    var k = String(key || "");
    if (!k || drawable == null) return;
    if (this.map[k]) {
      this._remove(k);
      var idxOld = this.keys.indexOf(k);
      if (idxOld > -1) this.keys.splice(idxOld, 1);
    }
    if (this.keys.length >= this.max * 0.8) {
      var removeCount = Math.floor(this.max * 0.2);
      for (var i = 0; i < removeCount && this.keys.length > 0; i++) {
        var oldKey = this.keys.shift();
        this._remove(oldKey);
      }
    }
    this.keys.push(k);
    this.map[k] = {dr: drawable, ts: (new Date()).getTime()};
  },

  _remove: function(key) {
    var k = String(key || "");
    if (!k) return;
    try { delete this.map[k]; } catch(eDel) { safeLog(null, "e", "catch " + String(eDel)); }
  },

  clear: function() {
    var oldKeys = [];
    for (var i = 0; i < this.keys.length; i++) oldKeys.push(this.keys[i]);
    for (var j = 0; j < oldKeys.length; j++) this._remove(oldKeys[j]);
    this.keys = [];
    this.map = {};
  }
};

FloatBallAppWM.prototype._iconLruEnsure = function(max) {
  try {
    if (!this._iconCache) return;
    if (max !== undefined && max !== null) {
      var n = Math.floor(Number(max || 80));
      if (isNaN(n)) n = 80;
      this._iconCache.max = Math.max(20, n);
    }
  } catch(e) { safeLog(null, "e", "catch " + String(e)); }
};

FloatBallAppWM.prototype._iconLruGet = function(key) {
  try {
    if (!this._iconCache) return null;
    return this._iconCache.get(String(key || ""));
  } catch(e) { safeLog(null, "e", "catch " + String(e)); }
  return null;
};

FloatBallAppWM.prototype._iconLruPut = function(key, val) {
  try {
    if (!this._iconCache) return;
    this._iconLruEnsure(120);
    var k = String(key || "");
    if (!k || val == null) return;
    this._iconCache.put(k, val);
  } catch(e) { safeLog(null, "e", "catch " + String(e)); }
};

FloatBallAppWM.prototype._iconLruClear = function() {
  try {
    if (this._iconCache && this._iconCache.clear) this._iconCache.clear();
  } catch(e) { safeLog(null, "e", "catch " + String(e)); }
};

// =======================【工具：SQLite BLOB 按钮图标】=======================
FloatBallAppWM.prototype.loadButtonIconDrawableFromDb = function(iconKey, targetPx, maxBytes, maxPx) {
  try {
    var key = String(iconKey || "");
    if (!key || !ConfigManager.getButtonIconBlob) return null;
    var cacheKey = "dbicon|" + key + "@" + String(targetPx == null ? "" : targetPx);
    var cached = this._iconLruGet(cacheKey);
    if (cached) return cached;

    var record = ConfigManager.getButtonIconBlob(key);
    if (!record || !record.data) return null;
    var byteSize = Number(record.byteSize || 0);
    var byteLimit = Math.max(0, Math.floor(Number(maxBytes || 0)));
    if (byteSize <= 0 || (byteLimit > 0 && byteSize > byteLimit)) return null;
    var length = 0;
    try { length = Number(java.lang.reflect.Array.getLength(record.data)); } catch (eLen) { length = byteSize; }
    if (length <= 0 || length !== byteSize) return null;

    var bounds = new android.graphics.BitmapFactory.Options();
    bounds.inJustDecodeBounds = true;
    android.graphics.BitmapFactory.decodeByteArray(record.data, 0, length, bounds);
    var width = Number(bounds.outWidth || 0);
    var height = Number(bounds.outHeight || 0);
    if (width <= 0 || height <= 0) return null;
    var pxLimit = Math.max(0, Math.floor(Number(maxPx || 0)));
    if (pxLimit > 0 && (width > pxLimit || height > pxLimit)) return null;

    var tp = Math.max(1, Math.floor(Number(targetPx || 1)));
    var desired = Math.max(tp * 2, tp);
    var sample = 1;
    while ((width / sample) > desired || (height / sample) > desired) sample = sample * 2;

    var options = new android.graphics.BitmapFactory.Options();
    options.inSampleSize = Math.max(1, sample);
    options.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
    var bmp = android.graphics.BitmapFactory.decodeByteArray(record.data, 0, length, options);
    if (!bmp) return null;
    var drawable = new android.graphics.drawable.BitmapDrawable(context.getResources(), bmp);
    this._iconLruPut(cacheKey, drawable);
    return drawable;
  } catch (e) {
    return null;
  }
};

// =======================【工具：悬浮球图标（PNG 文件）】======================
FloatBallAppWM.prototype.loadBallIconDrawableFromFile = function(path, targetPx, maxBytes, maxPx) {
  try {
    var p = String(path || "");
    if (!p) return null;
    if (p.indexOf("sqlite-icon:") === 0) {
      return this.loadButtonIconDrawableFromDb(p.substring("sqlite-icon:".length), targetPx, maxBytes, maxPx);
    }

    var f = new java.io.File(p);
    if (!f.exists() || !f.isFile()) return null;
    var ckLru = null;
    try {
      ckLru = "file|" + p + "@" + String(targetPx == null ? "" : targetPx) + "@" + String(f.lastModified()) + "@" + String(f.length());
      var hitLru = this._iconLruGet(ckLru);
      if (hitLru) return hitLru;
    } catch(eLruF0) { safeLog(null, "e", "catch " + String(eLruF0)); }

    var limitBytes = Math.max(0, Math.floor(Number(maxBytes || 0)));
    if (limitBytes > 0) {
      try { if (Number(f.length()) > limitBytes) return null; } catch (eSz) { return null; }
    }

    var opt = new android.graphics.BitmapFactory.Options();
    opt.inJustDecodeBounds = true;
    try { android.graphics.BitmapFactory.decodeFile(p, opt); } catch (eB0) { return null; }
    var w = Number(opt.outWidth || 0);
    var h = Number(opt.outHeight || 0);
    if (w <= 0 || h <= 0) return null;
    var limitPx = Math.max(0, Math.floor(Number(maxPx || 0)));
    if (limitPx > 0 && (w > limitPx || h > limitPx)) return null;

    var tp = Math.max(1, Math.floor(Number(targetPx || 1)));
    var desired = Math.max(tp * 2, tp);
    var sample = 1;
    while ((w / sample) > desired || (h / sample) > desired) sample = sample * 2;

    var opt2 = new android.graphics.BitmapFactory.Options();
    opt2.inSampleSize = Math.max(1, sample);
    opt2.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
    var bmp = null;
    try { bmp = android.graphics.BitmapFactory.decodeFile(p, opt2); } catch (eB1) { bmp = null; }
    if (bmp == null) return null;
    var d = new android.graphics.drawable.BitmapDrawable(context.getResources(), bmp);
    try { if (ckLru) this._iconLruPut(ckLru, d); } catch(eLruF1) { safeLog(null, "e", "catch " + String(eLruF1)); }
    return d;
  } catch (e0) {
    return null;
  }
};

// =======================【更新完成后自动重启生效】=======================
(function() {
  function installAutoRestartPatchOnce() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubAutoRestartPatchInstalled === true) return true;
      if (typeof proto.startToolHubModuleUpdateFromSettings !== "function") return false;

      if (typeof proto.__toolHubWatchRestartAfterUpdate !== "function") {
        proto.__toolHubWatchRestartAfterUpdate = function(anchorView) {
          var self = this;
          try {
            if (!self.state) return;
            if (self.state.toolHubAutoRestartWatcherRunning === true) return;
            self.state.toolHubAutoRestartWatcherRunning = true;
          } catch(eFlag0) {}

          try {
            new java.lang.Thread(new java.lang.Runnable({ run: function() {
              var shouldRestart = false;
              try {
                for (var i = 0; i < 80; i++) {
                  try { java.lang.Thread.sleep(500); } catch(eSleep) {}
                  var st = null;
                  try { if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) st = TOOLHUB_UPDATE_STATE; } catch(eState0) { st = null; }
                  if (!st) continue;
                  var statusText = String(st.status || "");
                  if (statusText === "error") break;
                  if (statusText === "installing" || statusText === "checking" || statusText === "restarting") continue;
                  if (st.needRestart === true) { shouldRestart = true; break; }
                }
              } catch(eLoop) {}

              try { if (self.state) self.state.toolHubAutoRestartWatcherRunning = false; } catch(eFlag1) {}
              if (!shouldRestart) return;

              try {
                self.runOnUiThreadSafe(function() {
                  try { self.toast("更新完成，正在重启生效"); } catch(eToast) {}
                  try {
                    if (self.startToolHubRestartFromSettings) self.startToolHubRestartFromSettings(anchorView);
                    else if (typeof restartToolHubFromSettings === "function") restartToolHubFromSettings();
                  } catch(eRestart) {
                    try { self.toast("自动重启失败，请手动重启 ToolHub"); safeLog(self.L, "e", "auto restart after update fail err=" + String(eRestart)); } catch(eLog) {}
                  }
                });
              } catch(eUi) {}
            }})).start();
          } catch(eThread) {
            try { if (self.state) self.state.toolHubAutoRestartWatcherRunning = false; } catch(eFlag2) {}
          }
        };
      }

      var oldStart = proto.startToolHubModuleUpdateFromSettings;
      proto.startToolHubModuleUpdateFromSettings = function(anchorView) {
        var ret = null;
        try { ret = oldStart.call(this, anchorView); } catch(eOld) { throw eOld; }
        try { this.__toolHubWatchRestartAfterUpdate(anchorView); } catch(eWatch) {}
        return ret;
      };
      proto.__toolHubAutoRestartPatchInstalled = true;
      return true;
    } catch(eInstallPatch) {}
    return false;
  }

  try {
    new java.lang.Thread(new java.lang.Runnable({ run: function() {
      for (var i = 0; i < 60; i++) {
        if (installAutoRestartPatchOnce()) return;
        try { java.lang.Thread.sleep(250); } catch(eSleep) {}
      }
    }})).start();
  } catch(ePatchThread) {}
})();
