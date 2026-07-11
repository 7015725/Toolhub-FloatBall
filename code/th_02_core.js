// @version 2.0.0

// =======================【配置存储：完全结构化 SQLite】=======================
// 说明：数据库只保存原子字段和关系，不保存 JSON 文档；JSON 仅作为现有 ConfigManager
// 与存储适配器之间的内存交换格式，不创建 settings.json/buttons.json/schema.json。
(function() {
  try {
    if (typeof ConfigManager === "undefined" || !ConfigManager) return;
    if (typeof FileIO === "undefined" || !FileIO) return;
    if (ConfigManager.__toolHubStructuredSqlitePersistenceInstalled === true) return;

    var oldReadText = FileIO.readText;
    var oldWriteText = FileIO.writeText;
    var oldWriteTextAtomic = FileIO.writeTextAtomic;
    var oldWriteTextDebounced = FileIO.writeTextDebounced;
    var oldFlushDebouncedWrites = FileIO.flushDebouncedWrites;

    var StructuredStore = {
      dbPath: APP_ROOT_DIR + "/toolhub.db",
      storageFormatVersion: 2,
      _timer: null,
      _jobs: {},
      _blockedWrites: {},
      _lastError: "",
      _lastDbError: "",
      _databaseHealthy: false,
      _migrationSource: "",
      _legacyFilesRemoved: false,
      _activeBackend: "sqlite-structured",

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

      isArray: function(value) {
        return Object.prototype.toString.call(value) === "[object Array]";
      },

      cloneValue: function(value) {
        try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
      },

      isExpectedValue: function(key, value) {
        if (key === "settings") return !!value && typeof value === "object" && !this.isArray(value);
        if (key === "buttons" || key === "schema") return this.isArray(value);
        return false;
      },

      parseManagedContent: function(path, content) {
        var key = this.keyForPath(path);
        if (!key) throw "unmanaged path";
        var value = JSON.parse(String(content));
        if (!this.isExpectedValue(key, value)) throw key + " 数据类型无效";
        return value;
      },

      valueType: function(value) {
        if (value === null || typeof value === "undefined") return "null";
        if (this.isArray(value)) return "array";
        var t = typeof value;
        if (t === "boolean") return "boolean";
        if (t === "number") {
          if (isNaN(value) || !isFinite(value)) return "null";
          return Math.floor(value) === value ? "integer" : "real";
        }
        if (t === "object") return "object";
        return "text";
      },

      bindTypedValue: function(stmt, typeIndex, intIndex, realIndex, textIndex, value) {
        var type = this.valueType(value);
        stmt.bindString(typeIndex, String(type));
        stmt.bindNull(intIndex);
        stmt.bindNull(realIndex);
        stmt.bindNull(textIndex);
        if (type === "boolean") stmt.bindLong(intIndex, value ? 1 : 0);
        else if (type === "integer") stmt.bindLong(intIndex, Number(value));
        else if (type === "real") stmt.bindDouble(realIndex, Number(value));
        else if (type === "text") stmt.bindString(textIndex, String(value));
        return type;
      },

      readTypedValue: function(cursor, typeIndex, intIndex, realIndex, textIndex) {
        var type = String(cursor.getString(typeIndex) || "null");
        if (type === "boolean") return cursor.getLong(intIndex) !== 0;
        if (type === "integer") return Number(cursor.getLong(intIndex));
        if (type === "real") return Number(cursor.getDouble(realIndex));
        if (type === "text") return cursor.isNull(textIndex) ? "" : String(cursor.getString(textIndex));
        if (type === "array") return [];
        if (type === "object") return {};
        return null;
      },

      stringArgs: function(values) {
        var arr = java.lang.reflect.Array.newInstance(java.lang.String, values.length);
        for (var i = 0; i < values.length; i++) arr[i] = String(values[i]);
        return arr;
      },

      openDb: function() {
        var db = null;
        try {
          var dir = new java.io.File(String(APP_ROOT_DIR));
          if (!dir.exists() && !dir.mkdirs()) throw "ToolHub 目录创建失败";
          db = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(String(this.dbPath), null);
          try { db.execSQL("PRAGMA foreign_keys=ON"); } catch (eForeign) {}
          try { db.execSQL("PRAGMA busy_timeout=3000"); } catch (eBusy) {}
          try { db.execSQL("PRAGMA synchronous=FULL"); } catch (eSync) {}
          this.ensureTables(db);
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

      ensureTables: function(db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_meta (meta_key TEXT PRIMARY KEY NOT NULL, meta_value TEXT NOT NULL)");
        db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_settings (setting_key TEXT PRIMARY KEY NOT NULL, value_type TEXT NOT NULL, value_integer INTEGER, value_real REAL, value_text TEXT, updated_at INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_buttons (button_row_id INTEGER PRIMARY KEY AUTOINCREMENT, button_id TEXT NOT NULL, sort_order INTEGER NOT NULL, title TEXT NOT NULL, action_type TEXT NOT NULL, enabled INTEGER NOT NULL, updated_at INTEGER NOT NULL)");
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_toolhub_buttons_order ON toolhub_buttons(sort_order, button_row_id)");
        db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_button_values (node_id INTEGER PRIMARY KEY AUTOINCREMENT, button_row_id INTEGER NOT NULL, parent_id INTEGER, field_name TEXT, array_index INTEGER NOT NULL DEFAULT -1, value_type TEXT NOT NULL, value_integer INTEGER, value_real REAL, value_text TEXT, FOREIGN KEY(button_row_id) REFERENCES toolhub_buttons(button_row_id) ON DELETE CASCADE, FOREIGN KEY(parent_id) REFERENCES toolhub_button_values(node_id) ON DELETE CASCADE)");
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_toolhub_button_values_owner ON toolhub_button_values(button_row_id, node_id)");
        db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_schema_values (node_id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INTEGER, field_name TEXT, array_index INTEGER NOT NULL DEFAULT -1, value_type TEXT NOT NULL, value_integer INTEGER, value_real REAL, value_text TEXT, FOREIGN KEY(parent_id) REFERENCES toolhub_schema_values(node_id) ON DELETE CASCADE)");
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_toolhub_schema_values_parent ON toolhub_schema_values(parent_id, node_id)");
      },

      tableExists: function(db, tableName) {
        var cursor = null;
        try {
          cursor = db.rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name=?", this.stringArgs([tableName]));
          return cursor.moveToFirst();
        } catch (e) {
          return false;
        } finally {
          try { if (cursor) cursor.close(); } catch (eClose) {}
        }
      },

      getMeta: function(db, key) {
        var cursor = null;
        try {
          cursor = db.rawQuery("SELECT meta_value FROM toolhub_meta WHERE meta_key=?", this.stringArgs([key]));
          if (!cursor.moveToFirst()) return null;
          return String(cursor.getString(0));
        } catch (e) {
          return null;
        } finally {
          try { if (cursor) cursor.close(); } catch (eClose) {}
        }
      },

      putMeta: function(db, key, value) {
        var stmt = null;
        try {
          stmt = db.compileStatement("INSERT OR REPLACE INTO toolhub_meta(meta_key,meta_value) VALUES(?,?)");
          stmt.bindString(1, String(key));
          stmt.bindString(2, String(value));
          stmt.executeInsert();
          return true;
        } finally {
          try { if (stmt) stmt.close(); } catch (eClose) {}
        }
      },

      insertTreeNode: function(db, tableName, ownerColumn, ownerValue, parentId, fieldName, arrayIndex, value) {
        var columns = ownerColumn
          ? ownerColumn + ",parent_id,field_name,array_index,value_type,value_integer,value_real,value_text"
          : "parent_id,field_name,array_index,value_type,value_integer,value_real,value_text";
        var marks = ownerColumn ? "?,?,?,?,?,?,?,?" : "?,?,?,?,?,?,?";
        var stmt = null;
        var nodeId = -1;
        try {
          stmt = db.compileStatement("INSERT INTO " + tableName + "(" + columns + ") VALUES(" + marks + ")");
          var n = 1;
          if (ownerColumn) {
            stmt.bindLong(n, Number(ownerValue));
            n++;
          }
          if (parentId === null || typeof parentId === "undefined") stmt.bindNull(n);
          else stmt.bindLong(n, Number(parentId));
          n++;
          if (fieldName === null || typeof fieldName === "undefined") stmt.bindNull(n);
          else stmt.bindString(n, String(fieldName));
          n++;
          stmt.bindLong(n, Number(arrayIndex));
          n++;
          this.bindTypedValue(stmt, n, n + 1, n + 2, n + 3, value);
          nodeId = Number(stmt.executeInsert());
        } finally {
          try { if (stmt) stmt.close(); } catch (eClose) {}
        }

        var type = this.valueType(value);
        var i;
        if (type === "array") {
          for (i = 0; i < value.length; i++) {
            this.insertTreeNode(db, tableName, ownerColumn, ownerValue, nodeId, null, i, value[i]);
          }
        } else if (type === "object") {
          for (var k in value) {
            if (!value.hasOwnProperty(k)) continue;
            this.insertTreeNode(db, tableName, ownerColumn, ownerValue, nodeId, k, -1, value[k]);
          }
        }
        return nodeId;
      },

      readTree: function(db, tableName, ownerColumn, ownerValue) {
        var cursor = null;
        var sql = "SELECT node_id,parent_id,field_name,array_index,value_type,value_integer,value_real,value_text FROM " + tableName;
        var args = null;
        if (ownerColumn) {
          sql += " WHERE " + ownerColumn + "=?";
          args = this.stringArgs([ownerValue]);
        }
        sql += " ORDER BY node_id";
        try {
          cursor = db.rawQuery(sql, args);
          var records = [];
          var values = {};
          while (cursor.moveToNext()) {
            var id = Number(cursor.getLong(0));
            var parentId = cursor.isNull(1) ? null : Number(cursor.getLong(1));
            var fieldName = cursor.isNull(2) ? null : String(cursor.getString(2));
            var arrayIndex = Number(cursor.getLong(3));
            var type = String(cursor.getString(4) || "null");
            var value = this.readTypedValue(cursor, 4, 5, 6, 7);
            values[String(id)] = value;
            records.push({
              id: id,
              parentId: parentId,
              fieldName: fieldName,
              arrayIndex: arrayIndex,
              type: type
            });
          }

          var root = null;
          for (var i = 0; i < records.length; i++) {
            var rec = records[i];
            var current = values[String(rec.id)];
            if (rec.parentId === null) {
              if (root === null) root = current;
              continue;
            }
            var parent = values[String(rec.parentId)];
            if (this.isArray(parent)) parent[rec.arrayIndex] = current;
            else if (parent && typeof parent === "object" && rec.fieldName !== null) parent[rec.fieldName] = current;
          }
          return root;
        } finally {
          try { if (cursor) cursor.close(); } catch (eClose) {}
        }
      },

      replaceSettingsInDb: function(db, settings) {
        db.execSQL("DELETE FROM toolhub_settings");
        var stmt = null;
        var now = java.lang.System.currentTimeMillis();
        try {
          stmt = db.compileStatement("INSERT INTO toolhub_settings(setting_key,value_type,value_integer,value_real,value_text,updated_at) VALUES(?,?,?,?,?,?)");
          for (var k in settings) {
            if (!settings.hasOwnProperty(k)) continue;
            stmt.clearBindings();
            stmt.bindString(1, String(k));
            this.bindTypedValue(stmt, 2, 3, 4, 5, settings[k]);
            stmt.bindLong(6, now);
            stmt.executeInsert();
          }
        } finally {
          try { if (stmt) stmt.close(); } catch (eClose) {}
        }
        this.putMeta(db, "settings_initialized", "1");
      },

      readSettingsInDb: function(db) {
        var cursor = null;
        var out = {};
        var count = 0;
        try {
          cursor = db.rawQuery("SELECT setting_key,value_type,value_integer,value_real,value_text FROM toolhub_settings ORDER BY setting_key", null);
          while (cursor.moveToNext()) {
            out[String(cursor.getString(0))] = this.readTypedValue(cursor, 1, 2, 3, 4);
            count++;
          }
        } finally {
          try { if (cursor) cursor.close(); } catch (eClose) {}
        }
        if (count <= 0 && this.getMeta(db, "settings_initialized") !== "1") return null;
        return out;
      },

      replaceButtonsInDb: function(db, buttons) {
        db.execSQL("DELETE FROM toolhub_button_values");
        db.execSQL("DELETE FROM toolhub_buttons");
        var stmt = null;
        var now = java.lang.System.currentTimeMillis();
        try {
          stmt = db.compileStatement("INSERT INTO toolhub_buttons(button_id,sort_order,title,action_type,enabled,updated_at) VALUES(?,?,?,?,?,?)");
          for (var i = 0; i < buttons.length; i++) {
            var b = buttons[i] || {};
            var id = String(b.id || ("button_" + String(now) + "_" + String(i)));
            stmt.clearBindings();
            stmt.bindString(1, id);
            stmt.bindLong(2, i);
            stmt.bindString(3, String(b.title || ""));
            stmt.bindString(4, String(b.type || ""));
            stmt.bindLong(5, b.enabled === false ? 0 : 1);
            stmt.bindLong(6, now);
            var rowId = Number(stmt.executeInsert());

            var extras = {};
            for (var k in b) {
              if (!b.hasOwnProperty(k)) continue;
              if (k === "id" || k === "title" || k === "type" || k === "enabled") continue;
              extras[k] = b[k];
            }
            this.insertTreeNode(db, "toolhub_button_values", "button_row_id", rowId, null, null, -1, extras);
          }
        } finally {
          try { if (stmt) stmt.close(); } catch (eClose) {}
        }
        this.putMeta(db, "buttons_initialized", "1");
      },

      readButtonsInDb: function(db) {
        var cursor = null;
        var out = [];
        try {
          cursor = db.rawQuery("SELECT button_row_id,button_id,title,action_type,enabled FROM toolhub_buttons ORDER BY sort_order,button_row_id", null);
          while (cursor.moveToNext()) {
            var rowId = Number(cursor.getLong(0));
            var b = {
              id: String(cursor.getString(1) || ""),
              title: String(cursor.getString(2) || ""),
              type: String(cursor.getString(3) || ""),
              enabled: cursor.getLong(4) !== 0
            };
            var extras = this.readTree(db, "toolhub_button_values", "button_row_id", rowId);
            if (extras && typeof extras === "object" && !this.isArray(extras)) {
              for (var k in extras) {
                if (extras.hasOwnProperty(k)) b[k] = extras[k];
              }
            }
            out.push(b);
          }
        } finally {
          try { if (cursor) cursor.close(); } catch (eClose) {}
        }
        if (out.length <= 0 && this.getMeta(db, "buttons_initialized") !== "1") return null;
        return out;
      },

      replaceSchemaInDb: function(db, schema) {
        db.execSQL("DELETE FROM toolhub_schema_values");
        this.insertTreeNode(db, "toolhub_schema_values", null, null, null, null, -1, schema);
        this.putMeta(db, "schema_initialized", "1");
      },

      readSchemaInDb: function(db) {
        var value = this.readTree(db, "toolhub_schema_values", null, null);
        if (value === null && this.getMeta(db, "schema_initialized") !== "1") return null;
        return value;
      },

      readLegacyDocument: function(db, key) {
        if (!this.tableExists(db, "toolhub_documents")) return null;
        var cursor = null;
        try {
          cursor = db.rawQuery("SELECT payload FROM toolhub_documents WHERE doc_key=?", this.stringArgs([key]));
          if (!cursor.moveToFirst()) return null;
          var text = cursor.isNull(0) ? null : String(cursor.getString(0));
          if (!text) return null;
          return JSON.parse(text);
        } catch (e) {
          return null;
        } finally {
          try { if (cursor) cursor.close(); } catch (eClose) {}
        }
      },

      readLegacyFile: function(path) {
        var candidates = [String(path), String(path) + ".bak"];
        for (var i = 0; i < candidates.length; i++) {
          try {
            var text = oldReadText.call(FileIO, candidates[i]);
            if (text) return JSON.parse(String(text));
          } catch (e) {}
        }
        return null;
      },

      readLegacyPending: function(key) {
        var path = APP_ROOT_DIR + "/.sqlite_pending_" + String(key) + ".json";
        try {
          var text = oldReadText.call(FileIO, path);
          if (text) return JSON.parse(String(text));
        } catch (e) {}
        return null;
      },

      chooseLegacyValue: function(db, key, path, defaultValue) {
        var value = this.readLegacyPending(key);
        if (this.isExpectedValue(key, value)) return { value: value, source: "pending-json" };

        value = this.readLegacyDocument(db, key);
        if (this.isExpectedValue(key, value)) return { value: value, source: "document-table" };

        value = this.readLegacyFile(path);
        if (this.isExpectedValue(key, value)) return { value: value, source: "legacy-json" };

        return { value: this.cloneValue(defaultValue), source: "defaults" };
      },

      deleteExactFile: function(path) {
        try {
          var f = new java.io.File(String(path));
          if (!f.exists()) return true;
          return !!f["delete"]();
        } catch (e) {
          return false;
        }
      },

      cleanupLegacyFiles: function() {
        var paths = [
          PATH_SETTINGS, PATH_SETTINGS + ".bak",
          PATH_BUTTONS, PATH_BUTTONS + ".bak",
          PATH_SCHEMA, PATH_SCHEMA + ".bak",
          APP_ROOT_DIR + "/.sqlite_pending_settings.json",
          APP_ROOT_DIR + "/.sqlite_pending_buttons.json",
          APP_ROOT_DIR + "/.sqlite_pending_schema.json"
        ];
        var allOk = true;
        for (var i = 0; i < paths.length; i++) {
          if (!this.deleteExactFile(paths[i])) allOk = false;
        }

        try {
          var dir = new java.io.File(String(APP_ROOT_DIR));
          var files = dir.listFiles();
          if (files) {
            for (var j = 0; j < files.length; j++) {
              var name = String(files[j].getName() || "");
              if (name.indexOf("settings.json.tmp.") === 0 ||
                  name.indexOf("buttons.json.tmp.") === 0 ||
                  name.indexOf("schema.json.tmp.") === 0 ||
                  name.indexOf(".sqlite_pending_settings.json.tmp.") === 0 ||
                  name.indexOf(".sqlite_pending_buttons.json.tmp.") === 0 ||
                  name.indexOf(".sqlite_pending_schema.json.tmp.") === 0) {
                try { if (!files[j]["delete"]()) allOk = false; } catch (eDelete) { allOk = false; }
              }
            }
          }
        } catch (eScan) {
          allOk = false;
        }

        this._legacyFilesRemoved = allOk;
        return allOk;
      },

      migrateIfNeeded: function(db) {
        var current = this.getMeta(db, "storage_format_version");
        if (String(current || "") === String(this.storageFormatVersion)) {
          if (!this._legacyFilesRemoved) this.cleanupLegacyFiles();
          return true;
        }

        var settingsSource = this.chooseLegacyValue(db, "settings", PATH_SETTINGS, ConfigManager.defaultSettings);
        var buttonsSource = this.chooseLegacyValue(db, "buttons", PATH_BUTTONS, ConfigManager.defaultButtons);
        var schemaSource = this.chooseLegacyValue(db, "schema", PATH_SCHEMA, ConfigManager.defaultSchema);
        var inTransaction = false;
        var marked = false;
        var committed = false;
        try {
          db.beginTransaction();
          inTransaction = true;
          this.replaceSettingsInDb(db, settingsSource.value);
          this.replaceButtonsInDb(db, buttonsSource.value);
          this.replaceSchemaInDb(db, schemaSource.value);
          this.putMeta(db, "storage_format_version", String(this.storageFormatVersion));
          this.putMeta(db, "schema_version", String(this.storageFormatVersion));
          this.putMeta(db, "migration_source", settingsSource.source + "," + buttonsSource.source + "," + schemaSource.source);
          this.putMeta(db, "migration_completed_at", String(java.lang.System.currentTimeMillis()));
          db.execSQL("DROP TABLE IF EXISTS toolhub_documents");
          db.setTransactionSuccessful();
          marked = true;
        } catch (e) {
          this._lastDbError = "migrateIfNeeded: " + String(e);
          this._lastError = this._lastDbError;
        } finally {
          if (inTransaction) {
            try {
              db.endTransaction();
              if (marked) committed = true;
            } catch (eEnd) {
              committed = false;
              this._lastDbError = "migrateIfNeeded endTransaction: " + String(eEnd);
              this._lastError = this._lastDbError;
            }
          }
        }

        if (!committed) return false;
        this._migrationSource = settingsSource.source + "," + buttonsSource.source + "," + schemaSource.source;
        try {
          db.execSQL("VACUUM");
          this.putMeta(db, "legacy_payload_purged", "1");
        } catch (eVacuum) {
          this.putMeta(db, "legacy_payload_purged", "0");
          this._lastError = "VACUUM: " + String(eVacuum);
        }
        this.cleanupLegacyFiles();
        return true;
      },

      ensureReady: function() {
        var db = this.openDb();
        if (!db) return false;
        try {
          var ok = this.migrateIfNeeded(db);
          this._databaseHealthy = !!ok;
          return ok;
        } finally {
          this.closeDb(db);
        }
      },

      fallbackValueFor: function(path) {
        var key = this.keyForPath(path);
        if (key === "settings") return this.cloneValue(ConfigManager.defaultSettings);
        if (key === "schema") return this.cloneValue(ConfigManager.defaultSchema);
        return [
          { id: "rescue_settings", title: "设置", type: "open_settings", enabled: true, iconResName: "ic_menu_preferences" },
          { id: "rescue_close", title: "关闭", type: "broadcast", enabled: true, action: "shortx.wm.floatball.CLOSE", iconResName: "ic_menu_close_clear_cancel" }
        ];
      },

      readManagedText: function(path) {
        var p = String(path || "");
        var key = this.keyForPath(p);
        var db = null;
        try {
          db = this.openDb();
          if (!db || !this.migrateIfNeeded(db)) throw String(this._lastDbError || "structured database unavailable");
          var value = null;
          if (key === "settings") value = this.readSettingsInDb(db);
          else if (key === "buttons") value = this.readButtonsInDb(db);
          else if (key === "schema") value = this.readSchemaInDb(db);
          if (!this.isExpectedValue(key, value)) throw key + " 结构化数据缺失或损坏";
          this._blockedWrites[p] = false;
          this._activeBackend = "sqlite-structured";
          this._databaseHealthy = true;
          this._lastDbError = "";
          return JSON.stringify(value);
        } catch (e) {
          this._databaseHealthy = false;
          this._blockedWrites[p] = true;
          this._activeBackend = "sqlite-read-only";
          this._lastDbError = "readManagedText(" + key + "): " + String(e);
          this._lastError = this._lastDbError;
          return JSON.stringify(this.fallbackValueFor(p));
        } finally {
          this.closeDb(db);
        }
      },

      writeManagedNow: function(path, content) {
        var p = String(path || "");
        var key = this.keyForPath(p);
        if (!key) return false;
        if (this._blockedWrites[p] === true) {
          this._lastError = "writeManagedNow: " + key + " 处于只读保护";
          return false;
        }

        var value = null;
        try {
          value = this.parseManagedContent(p, content);
        } catch (eParse) {
          this._lastError = "writeManagedNow parse: " + String(eParse);
          return false;
        }

        var db = null;
        var inTransaction = false;
        var marked = false;
        var committed = false;
        try {
          db = this.openDb();
          if (!db || !this.migrateIfNeeded(db)) throw String(this._lastDbError || "structured database unavailable");
          db.beginTransaction();
          inTransaction = true;
          if (key === "settings") this.replaceSettingsInDb(db, value);
          else if (key === "buttons") this.replaceButtonsInDb(db, value);
          else if (key === "schema") this.replaceSchemaInDb(db, value);
          this.putMeta(db, key + "_updated_at", String(java.lang.System.currentTimeMillis()));
          db.setTransactionSuccessful();
          marked = true;
        } catch (e) {
          this._databaseHealthy = false;
          this._lastDbError = "writeManagedNow(" + key + "): " + String(e);
          this._lastError = this._lastDbError;
        } finally {
          if (inTransaction && db) {
            try {
              db.endTransaction();
              if (marked) committed = true;
            } catch (eEnd) {
              committed = false;
              this._databaseHealthy = false;
              this._lastDbError = "writeManagedNow endTransaction(" + key + "): " + String(eEnd);
              this._lastError = this._lastDbError;
            }
          }
          this.closeDb(db);
        }

        if (committed) {
          this._databaseHealthy = true;
          this._lastDbError = "";
          this._activeBackend = "sqlite-structured";
          return true;
        }
        return false;
      },

      ensureTimer: function() {
        try {
          if (!this._timer) this._timer = new java.util.Timer("sx-toolhub-structured-sqlite", true);
          return !!this._timer;
        } catch (e) {
          this._lastError = "ensureTimer: " + String(e);
          return false;
        }
      },

      scheduleWrite: function(path, content, delayMs) {
        var p = String(path || "");
        if (!this.isManagedPath(p)) return false;
        try { this.parseManagedContent(p, content); } catch (eParse) { this._lastError = String(eParse); return false; }
        if (this._blockedWrites[p] === true) return false;

        var d = 0;
        try { d = parseInt(String(delayMs), 10); } catch (eDelay) { d = 0; }
        if (isNaN(d) || d < 0) d = 0;
        if (!this.ensureTimer()) return this.writeManagedNow(p, content);

        var old = this._jobs[p];
        if (old && old.task) {
          try { old.task.cancel(); } catch (eCancel) {}
        }

        var self = this;
        var payload = String(content);
        var version = old && old.version ? Number(old.version) + 1 : 1;
        var task = new JavaAdapter(java.util.TimerTask, {
          run: function() {
            var live = self._jobs[p];
            if (!live || Number(live.version) !== version) return;
            var ok = self.writeManagedNow(p, payload);
            if (ok) {
              try { delete self._jobs[p]; } catch (eDelete) { self._jobs[p] = null; }
            } else {
              live.task = null;
              live.lastError = String(self._lastError || "structured write failed");
            }
          }
        });

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
          var okNow = this.writeManagedNow(p, payload);
          if (okNow) {
            try { delete this._jobs[p]; } catch (eDelete2) { this._jobs[p] = null; }
          } else {
            this._jobs[p].task = null;
            this._jobs[p].lastError = String(this._lastError || "structured write failed");
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
            var ok = this.writeManagedNow(p, job.payload);
            if (ok) {
              try { delete this._jobs[p]; } catch (eDelete) { this._jobs[p] = null; }
            } else {
              allOk = false;
              job.task = null;
              job.lastError = String(this._lastError || "structured write failed");
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

      queryCount: function(db, tableName) {
        var cursor = null;
        try {
          cursor = db.rawQuery("SELECT COUNT(*) FROM " + tableName, null);
          if (!cursor.moveToFirst()) return 0;
          return Number(cursor.getLong(0));
        } catch (e) {
          return -1;
        } finally {
          try { if (cursor) cursor.close(); } catch (eClose) {}
        }
      },

      legacyFileState: function() {
        var paths = [PATH_SETTINGS, PATH_BUTTONS, PATH_SCHEMA,
          APP_ROOT_DIR + "/.sqlite_pending_settings.json",
          APP_ROOT_DIR + "/.sqlite_pending_buttons.json",
          APP_ROOT_DIR + "/.sqlite_pending_schema.json"];
        var count = 0;
        for (var i = 0; i < paths.length; i++) {
          try { if (new java.io.File(String(paths[i])).exists()) count++; } catch (e) {}
        }
        return count;
      },

      getInfo: function() {
        var exists = false;
        var pending = 0;
        var counts = { settings: -1, buttons: -1, buttonValues: -1, schemaValues: -1 };
        var db = null;
        try { exists = new java.io.File(String(this.dbPath)).exists(); } catch (eExists) {}
        try {
          for (var k in this._jobs) {
            if (this._jobs.hasOwnProperty(k) && this._jobs[k]) pending++;
          }
        } catch (ePending) {}
        try {
          db = this.openDb();
          if (db) {
            counts.settings = this.queryCount(db, "toolhub_settings");
            counts.buttons = this.queryCount(db, "toolhub_buttons");
            counts.buttonValues = this.queryCount(db, "toolhub_button_values");
            counts.schemaValues = this.queryCount(db, "toolhub_schema_values");
            var source = this.getMeta(db, "migration_source");
            if (source) this._migrationSource = source;
          }
        } catch (eInfo) {
          this._lastError = "getInfo: " + String(eInfo);
        } finally {
          this.closeDb(db);
        }
        return {
          engine: "sqlite",
          storageFormat: "structured",
          storageFormatVersion: Number(this.storageFormatVersion),
          activeBackend: String(this._activeBackend || "sqlite-structured"),
          databasePath: String(this.dbPath),
          databaseExists: !!exists,
          databaseHealthy: !!this._databaseHealthy,
          pendingWrites: pending,
          blockedWrites: {
            settings: this._blockedWrites[String(PATH_SETTINGS)] === true,
            buttons: this._blockedWrites[String(PATH_BUTTONS)] === true,
            schema: this._blockedWrites[String(PATH_SCHEMA)] === true
          },
          rowCounts: counts,
          migrationSource: String(this._migrationSource || ""),
          legacyConfigFileCount: this.legacyFileState(),
          legacyFilesRemoved: !!this._legacyFilesRemoved,
          jsonConfigEnabled: false,
          lastDbError: String(this._lastDbError || ""),
          lastError: String(this._lastError || this._lastDbError || "")
        };
      }
    };

    try { StructuredStore.ensureReady(); } catch (eReady) {
      StructuredStore._lastError = "ensureReady: " + String(eReady);
    }

    FileIO.readText = function(path) {
      if (StructuredStore.isManagedPath(path)) return StructuredStore.readManagedText(path);
      return oldReadText.call(FileIO, path);
    };

    FileIO.writeText = function(path, content) {
      if (StructuredStore.isManagedPath(path)) return StructuredStore.writeManagedNow(path, content);
      return oldWriteText.call(FileIO, path, content);
    };

    FileIO.writeTextAtomic = function(path, content) {
      if (StructuredStore.isManagedPath(path)) return StructuredStore.writeManagedNow(path, content);
      return oldWriteTextAtomic.call(FileIO, path, content);
    };

    FileIO.writeTextDebounced = function(path, content, delayMs) {
      if (StructuredStore.isManagedPath(path)) return StructuredStore.scheduleWrite(path, content, delayMs);
      return oldWriteTextDebounced.call(FileIO, path, content, delayMs);
    };

    FileIO.flushDebouncedWrites = function() {
      var oldResult = true;
      try { oldResult = oldFlushDebouncedWrites.call(FileIO); } catch (eOldFlush) { oldResult = false; }
      var sqliteResult = StructuredStore.flushWrites();
      return oldResult !== false && sqliteResult !== false;
    };

    ConfigManager.getStorageInfo = function() {
      return StructuredStore.getInfo();
    };
    ConfigManager.migrateLegacyStorageToStructuredSqlite = function() {
      return StructuredStore.ensureReady();
    };
    ConfigManager.migrateLegacyJsonToSqlite = ConfigManager.migrateLegacyStorageToStructuredSqlite;
    ConfigManager.__toolHubSqliteStore = StructuredStore;
    ConfigManager.__toolHubStructuredSqlitePersistenceInstalled = true;
    ConfigManager.__toolHubSqlitePersistenceInstalled = true;
  } catch (eInstallSqlite) {
    try { safeLog(null, "e", "install structured sqlite persistence fail: " + String(eInstallSqlite)); } catch (eLogSqlite) {}
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
      this.L.i("storage engine=" + String(storageInfo.engine || "") + " format=" + String(storageInfo.storageFormat || "") + " backend=" + String(storageInfo.activeBackend || "") + " path=" + String(storageInfo.databasePath || "") + " exists=" + String(!!storageInfo.databaseExists) + " healthy=" + String(!!storageInfo.databaseHealthy) + " pending=" + String(storageInfo.pendingWrites || 0) + " error=" + String(storageInfo.lastError || ""));
    }
  } catch (eStorageInfo) {}

  this.state = {
    receivers: [],
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
    pendingUserCfg: null,
    pendingDirty: false,
    buttonManagerQuery: "",
    closing: false
  };

  this.ui = {};
  var protoUi = FloatBallAppWM.prototype.ui;
  for (var _uiKey in protoUi) this.ui[_uiKey] = protoUi[_uiKey];
  this.ui.colors = {};
  try { this.refreshMonetColors(this.isDarkTheme()); } catch(eM) { safeLog(null, "e", "catch " + String(eM)); }
}

FloatBallAppWM.prototype.dp = function(v) { return Math.floor(Number(v) * this.state.density); };
FloatBallAppWM.prototype.sp = function(v) { try { return Math.floor(Number(v) * context.getResources().getDisplayMetrics().scaledDensity); } catch (e) { return Math.floor(Number(v) * this.state.density); } };
FloatBallAppWM.prototype.now = function() { return new Date().getTime(); };
FloatBallAppWM.prototype.clamp = function(v, min, max) { if (v < min) return min; if (v > max) return max; return v; };
FloatBallAppWM.prototype.rectIntersect = function(ax, ay, aw, ah, bx, by, bw, bh) {
  return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay);
};

FloatBallAppWM.prototype.runOnUiThreadSafe = function(fn) {
  try {
    if (!fn) return;
    var self = this;
    if (this.state && this.state.ballRoot) {
      this.state.ballRoot.post(new java.lang.Runnable({
        run: function() { try { fn.call(self); } catch(e) { safeLog(null, "e", "catch " + String(e)); } }
      }));
    } else {
      try {
        var h = new android.os.Handler(android.os.Looper.getMainLooper());
        h.post(new java.lang.Runnable({
          run: function() { try { fn.call(self); } catch(e) { safeLog(null, "e", "catch " + String(e)); } }
        }));
      } catch(e) {
        try { fn.call(self); } catch(e2) { safeLog(null, "e", "catch " + String(e2)); }
      }
    }
  } catch(e) { safeLog(null, "e", "catch " + String(e)); }
};

FloatBallAppWM.prototype._iconCache = {
  map: {},
  order: [],
  max: 80,
  get: function(k) {
    try {
      if (!this.map.hasOwnProperty(k)) return null;
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
