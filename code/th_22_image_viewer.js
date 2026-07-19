// @version 1.2.6
// =======================【拾字截图：查看、保存、分享、删除与自动清理】=======================
// 只处理 ToolHub/screenshots 内部截图；公共保存副本不会被自动清理。
(function() {
  function now22() {
    try { return java.lang.System.currentTimeMillis(); } catch (e0) {}
    return (new Date()).getTime();
  }

  function clamp22(value, min, max) {
    var n = Number(value);
    if (isNaN(n)) n = min;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  function int22(value, fallback) {
    var n = Number(value);
    if (isNaN(n)) n = Number(fallback || 0);
    if (isNaN(n)) n = 0;
    return Math.round(n);
  }

  function dp22(value) {
    var density = 1;
    try { density = Number(context.getResources().getDisplayMetrics().density || 1); } catch (e0) { density = 1; }
    return Math.max(1, Math.round(Number(value || 0) * density));
  }

  function safeText22(view, color) {
    try { toolhubSafeSetTextColor(view, Number(color) | 0); } catch (e0) {}
  }

  function safeBg22(view, color) {
    try { toolhubSafeSetBackgroundColor(view, Number(color) | 0); } catch (e0) {}
  }

  function theme22(appObj) {
    var dark = false;
    try { dark = !!(appObj && appObj.isDarkTheme && appObj.isDarkTheme()); } catch (e0) {}
    var out = {
      bg: dark ? (0xFF111318 | 0) : (0xFFF8FAFC | 0),
      card: dark ? (0xFF1C1F26 | 0) : (0xFFFFFFFF | 0),
      text: dark ? (0xFFF1F5F9 | 0) : (0xFF111827 | 0),
      secondary: dark ? (0xFFCBD5E1 | 0) : (0xFF64748B | 0),
      primary: dark ? (0xFFA8C7FA | 0) : (0xFF005BC0 | 0),
      danger: dark ? (0xFFFFB4AB | 0) : (0xFFBA1A1A | 0),
      stroke: dark ? (0x55FFFFFF | 0) : (0x22000000 | 0),
      scrim: (0x99000000 | 0)
    };
    try {
      if (appObj && appObj.getSettingsColorScheme) {
        var s = appObj.getSettingsColorScheme();
        if (s) {
          out.bg = Number(s.surface) | 0;
          out.card = Number(s.surface2 || s.surface) | 0;
          out.text = Number(s.onSurface) | 0;
          out.secondary = Number(s.onSurface2 || s.onSurface) | 0;
          out.primary = Number(s.primary) | 0;
          out.danger = Number(s.danger || out.danger) | 0;
          out.stroke = Number(s.outlineVariant) | 0;
        }
      }
    } catch (e1) {}
    return out;
  }

  function roundBg22(color, stroke, radius) {
    var gd = new android.graphics.drawable.GradientDrawable();
    try { toolhubSafeSetGradientColor(gd, Number(color) | 0); } catch (e0) {}
    try { gd.setCornerRadius(dp22(radius || 12)); } catch (e1) {}
    try { toolhubSafeSetGradientStroke(gd, dp22(1), Number(stroke) | 0); } catch (e2) {}
    return gd;
  }

  function sampleSize22(width, height, maxEdge) {
    var sample = 1;
    var limit = Math.max(64, Number(maxEdge || 2048));
    while (Math.max(width / sample, height / sample) > limit) sample *= 2;
    return sample;
  }

  function floorPowerTwo22(value) {
    var n = Math.max(1, Math.floor(Number(value || 1)));
    var p = 1;
    while (p * 2 <= n) p *= 2;
    return p;
  }

  function safeRecycle22(bitmap) {
    try {
      if (bitmap && bitmap.recycle && (!bitmap.isRecycled || bitmap.isRecycled() !== true)) bitmap.recycle();
    } catch (e0) {}
  }

  function safeClose22(value) {
    try { if (value && value.recycle) value.recycle(); } catch (e0) {}
    try { if (value && value.close) value.close(); } catch (e1) {}
  }

  function fileSizeText22(bytes) {
    var n = Math.max(0, Number(bytes || 0));
    if (n >= 1024 * 1024) return String(Math.round(n / 1024 / 1024 * 10) / 10) + " MB";
    if (n >= 1024) return String(Math.round(n / 1024 * 10) / 10) + " KB";
    return String(Math.round(n)) + " B";
  }

  function closeStream22(value) {
    try { if (value) value.close(); } catch (e0) {}
  }

  function stringArgs22(values) {
    try {
      if (typeof ConfigManager !== "undefined" && ConfigManager.__toolHubSqliteStore &&
          ConfigManager.__toolHubSqliteStore.stringArgs) {
        return ConfigManager.__toolHubSqliteStore.stringArgs(values);
      }
    } catch (e0) {}
    var arr = java.lang.reflect.Array.newInstance(java.lang.String, values.length);
    for (var i = 0; i < values.length; i++) arr[i] = String(values[i]);
    return arr;
  }

  function store22() {
    try {
      if (typeof ConfigManager !== "undefined" && ConfigManager &&
          ConfigManager.__toolHubSqliteStore) return ConfigManager.__toolHubSqliteStore;
    } catch (e0) {}
    return null;
  }

  function ensureImageTables22(db) {
    db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_pickword_images (internal_path TEXT PRIMARY KEY NOT NULL, created_at INTEGER NOT NULL, source_type TEXT NOT NULL, width INTEGER NOT NULL DEFAULT 0, height INTEGER NOT NULL DEFAULT 0, file_size INTEGER NOT NULL DEFAULT 0, saved_public_path TEXT NOT NULL DEFAULT '', saved_content_uri TEXT NOT NULL DEFAULT '', saved_at INTEGER NOT NULL DEFAULT 0, deleted_at INTEGER NOT NULL DEFAULT 0, last_access_at INTEGER NOT NULL DEFAULT 0)");
    db.execSQL("CREATE INDEX IF NOT EXISTS idx_toolhub_pickword_images_created ON toolhub_pickword_images(created_at, deleted_at)");
    db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_pickword_image_exports (export_id INTEGER PRIMARY KEY AUTOINCREMENT, internal_path TEXT NOT NULL, export_kind TEXT NOT NULL, public_path TEXT NOT NULL DEFAULT '', content_uri TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL DEFAULT 0, deleted_at INTEGER NOT NULL DEFAULT 0)");
    db.execSQL("CREATE INDEX IF NOT EXISTS idx_toolhub_pickword_exports_expiry ON toolhub_pickword_image_exports(export_kind, expires_at, deleted_at)");
  }

  function withDb22(callback, fallback) {
    var store = store22();
    if (!store || !store.openDb) return fallback;
    var db = null;
    var locked = false;
    try {
      if (store._writeLock) {
        store._writeLock.lock();
        locked = true;
      }
      db = store.openDb();
      if (!db) return fallback;
      ensureImageTables22(db);
      return callback(db, store);
    } catch (e0) {
      try { if (typeof safeLog === "function") safeLog(null, "w", "pickword image db fail " + String(e0)); } catch (eLog) {}
      return fallback;
    } finally {
      try { if (store.closeDb) store.closeDb(db); else if (db) db.close(); } catch (eClose) {}
      try { if (locked && store._writeLock) store._writeLock.unlock(); } catch (eUnlock) {}
    }
  }

  function bindText22(stmt, index, value) {
    stmt.bindString(index, String(value === undefined || value === null ? "" : value));
  }

  function upsertImage22(info) {
    return withDb22(function(db) {
      var insert = null;
      var update = null;
      try {
        var accessedAt = now22();
        insert = db.compileStatement("INSERT OR IGNORE INTO toolhub_pickword_images(internal_path,created_at,source_type,width,height,file_size,saved_public_path,saved_content_uri,saved_at,deleted_at,last_access_at) VALUES(?,?,?,?,?,?,'','',0,0,?)");
        bindText22(insert, 1, info.internalPath);
        insert.bindLong(2, Number(info.createdAt || accessedAt));
        bindText22(insert, 3, info.source || "pointer_ocr");
        insert.bindLong(4, Number(info.width || 0));
        insert.bindLong(5, Number(info.height || 0));
        insert.bindLong(6, Number(info.fileSize || 0));
        insert.bindLong(7, accessedAt);
        insert.executeInsert();

        update = db.compileStatement("UPDATE toolhub_pickword_images SET source_type=?, width=?, height=?, file_size=?, deleted_at=0, last_access_at=? WHERE internal_path=?");
        bindText22(update, 1, info.source || "pointer_ocr");
        update.bindLong(2, Number(info.width || 0));
        update.bindLong(3, Number(info.height || 0));
        update.bindLong(4, Number(info.fileSize || 0));
        update.bindLong(5, accessedAt);
        bindText22(update, 6, info.internalPath);
        update.executeUpdateDelete();
        return true;
      } finally {
        try { if (insert) insert.close(); } catch (eInsert) {}
        try { if (update) update.close(); } catch (eUpdate) {}
      }
    }, false);
  }

  function updateImageSaved22(internalPath, publicPath, contentUri, savedAt) {
    return withDb22(function(db) {
      var stmt = null;
      try {
        stmt = db.compileStatement("UPDATE toolhub_pickword_images SET saved_public_path=?, saved_content_uri=?, saved_at=?, last_access_at=? WHERE internal_path=?");
        bindText22(stmt, 1, publicPath);
        bindText22(stmt, 2, contentUri);
        stmt.bindLong(3, Number(savedAt || now22()));
        stmt.bindLong(4, Number(now22()));
        bindText22(stmt, 5, internalPath);
        return Number(stmt.executeUpdateDelete()) > 0;
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    }, false);
  }

  function markImageDeleted22(internalPath, deletedAt) {
    return withDb22(function(db) {
      var stmt = null;
      try {
        stmt = db.compileStatement("UPDATE toolhub_pickword_images SET deleted_at=?, last_access_at=? WHERE internal_path=?");
        stmt.bindLong(1, Number(deletedAt || now22()));
        stmt.bindLong(2, Number(now22()));
        bindText22(stmt, 3, internalPath);
        return Number(stmt.executeUpdateDelete()) > 0;
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    }, false);
  }

  function loadSaved22(internalPath) {
    return withDb22(function(db) {
      var cursor = null;
      try {
        cursor = db.rawQuery("SELECT saved_public_path,saved_content_uri,saved_at FROM toolhub_pickword_images WHERE internal_path=? AND deleted_at=0", stringArgs22([internalPath]));
        if (!cursor.moveToFirst()) return null;
        return {
          publicPath: String(cursor.getString(0) || ""),
          contentUri: String(cursor.getString(1) || ""),
          savedAt: Number(cursor.getLong(2) || 0)
        };
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
    }, null);
  }

  function addExport22(internalPath, kind, publicPath, contentUri, createdAt, expiresAt) {
    return withDb22(function(db) {
      var stmt = null;
      try {
        stmt = db.compileStatement("INSERT INTO toolhub_pickword_image_exports(internal_path,export_kind,public_path,content_uri,created_at,expires_at,deleted_at) VALUES(?,?,?,?,?,?,0)");
        bindText22(stmt, 1, internalPath);
        bindText22(stmt, 2, kind);
        bindText22(stmt, 3, publicPath || "");
        bindText22(stmt, 4, contentUri || "");
        stmt.bindLong(5, Number(createdAt || now22()));
        stmt.bindLong(6, Number(expiresAt || 0));
        stmt.executeInsert();
        return true;
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    }, false);
  }

  function getMeta22(key) {
    return withDb22(function(db, store) {
      if (store.getMeta) return store.getMeta(db, key);
      return null;
    }, null);
  }

  function putMeta22(key, value) {
    return withDb22(function(db, store) {
      if (store.putMeta) return store.putMeta(db, key, value);
      return false;
    }, false);
  }

  function internalRoot22() {
    var base = String(shortx.getShortXDir() || "").replace(/\/+$/g, "");
    if (!base) throw new Error("ShortX 目录为空");
    return new java.io.File(base, "ToolHub/screenshots").getCanonicalFile();
  }

  function normalizeInternalFile22(rawPath) {
    var root = internalRoot22();
    var target = new java.io.File(String(rawPath || "")).getCanonicalFile();
    var rootPath = String(root.getCanonicalPath());
    var targetPath = String(target.getCanonicalPath());
    if (targetPath.indexOf(rootPath + java.io.File.separator) !== 0) throw new Error("截图路径越界");
    return target;
  }

  function defaultPublicDir22() {
    return "/storage/emulated/0/Pictures/ToolHub";
  }

  function configuredPublicDir22(appObj) {
    var value = "";
    try {
      if (appObj && appObj.config) value = String(appObj.config.PICKWORD_IMAGE_PUBLIC_DIR || "");
    } catch (e0) {}
    if (!value) {
      try {
        var cfg = ConfigManager.loadSettings();
        value = String(cfg.PICKWORD_IMAGE_PUBLIC_DIR || "");
      } catch (e1) {}
    }
    return value || defaultPublicDir22();
  }

  function configuredRetention22(appObj, overrideValue) {
    var value = overrideValue;
    if (value === undefined || value === null || String(value) === "") {
      try { value = appObj && appObj.config ? appObj.config.PICKWORD_IMAGE_RETENTION_DAYS : null; } catch (e0) {}
    }
    if (value === undefined || value === null || String(value) === "") {
      try { value = ConfigManager.loadSettings().PICKWORD_IMAGE_RETENTION_DAYS; } catch (e1) {}
    }
    value = int22(value, 7);
    if (value < 0) value = 0;
    if (value > 365) value = 365;
    return value;
  }

  function normalizePublicDir22(rawPath, createDir) {
    var value = String(rawPath || "").replace(/^\s+|\s+$/g, "");
    if (!value) value = defaultPublicDir22();
    var storage = android.os.Environment.getExternalStorageDirectory().getCanonicalFile();
    var target = new java.io.File(value).getCanonicalFile();
    var rootPath = String(storage.getCanonicalPath());
    var targetPath = String(target.getCanonicalPath());
    if (targetPath !== rootPath && targetPath.indexOf(rootPath + java.io.File.separator) !== 0) {
      throw new Error("保存目录必须位于主存储");
    }
    if (createDir === true && !target.exists() && !target.mkdirs() && !target.exists()) {
      throw new Error("无法创建保存目录");
    }
    if (target.exists() && !target.isDirectory()) throw new Error("保存路径不是目录");
    return target;
  }

  function probeWritable22(dir) {
    var probe = null;
    var stream = null;
    try {
      if (!dir.exists() && !dir.mkdirs() && !dir.exists()) throw new Error("目录创建失败");
      probe = new java.io.File(dir, ".toolhub_write_probe_" + String(now22()));
      stream = new java.io.FileOutputStream(probe, false);
      stream.write(49);
      stream.flush();
      return true;
    } finally {
      closeStream22(stream);
      try { if (probe && probe.exists()) probe.delete(); } catch (e0) {}
    }
  }

  function probeMediaStore22(dir) {
    var resolver = context.getContentResolver();
    var uri = null;
    var output = null;
    var values = new android.content.ContentValues();
    var relative = relativePath22(dir);
    try {
      values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, "ToolHub_Probe_" + String(now22()) + ".png");
      values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "image/png");
      values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, String(relative));
      values.put(android.provider.MediaStore.MediaColumns.IS_PENDING, new java.lang.Integer(1));
      uri = resolver.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
      if (!uri) throw new Error("MediaStore 目录探测创建失败");
      output = resolver.openOutputStream(uri, "w");
      if (!output) throw new Error("MediaStore 目录探测输出流为空");
      var bytes = android.util.Base64.decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        android.util.Base64.DEFAULT
      );
      output.write(bytes, 0, bytes.length);
      output.flush();
      return true;
    } finally {
      closeStream22(output);
      try { if (uri) resolver.delete(uri, null, null); } catch (eDelete) {}
    }
  }

  function preparePublicDir22(appObj, childName, createPhysical) {
    var base = normalizePublicDir22(configuredPublicDir22(appObj), createPhysical === true);
    if (!childName) return base;
    var child = new java.io.File(base, String(childName));
    if (createPhysical === true && !child.exists() && !child.mkdirs() && !child.exists()) {
      throw new Error("无法创建保存目录");
    }
    if (child.exists() && !child.isDirectory()) throw new Error("保存路径不是目录");
    return child;
  }


  function shellQuote22(value) {
    return "'" + String(value === undefined || value === null ? "" : value).replace(/'/g, "'\"'\"'") + "'";
  }

  function preferRootPublicIo22() {
    try { return Number(android.os.Process.myUid()) === 1000; } catch (e0) {}
    return false;
  }

  function underlyingPublicPath22(file) {
    try {
      var storage = android.os.Environment.getExternalStorageDirectory().getCanonicalFile();
      var rootPath = String(storage.getCanonicalPath());
      var targetPath = String(file.getCanonicalFile().getCanonicalPath());
      if (targetPath !== rootPath && targetPath.indexOf(rootPath + java.io.File.separator) !== 0) return "";
      var relative = targetPath.substring(rootPath.length).replace(/^\/+/, "");
      var userId = 0;
      try { userId = Number(android.os.UserHandle.myUserId()); } catch (eUser) { userId = 0; }
      var base = "/data/media/" + String(userId);
      return relative ? base + "/" + relative : base;
    } catch (e0) {}
    return "";
  }

  function resolveShellBridgeApp22(appObj) {
    try {
      if (appObj && typeof appObj.execShellSmart === "function") return appObj;
    } catch (e0) {}
    try {
      if (typeof TOOLHUB_ACTIVE_APP !== "undefined" && TOOLHUB_ACTIVE_APP &&
          typeof TOOLHUB_ACTIVE_APP.execShellSmart === "function") return TOOLHUB_ACTIVE_APP;
    } catch (e1) {}
    return null;
  }

  function shellBridgeMarkerDir22() {
    var base = String(shortx.getShortXDir() || "").replace(/\/+$/g, "");
    if (!base) throw new Error("ShortX 目录为空");
    var dir = new java.io.File(base, "ToolHub/cache/shell_bridge").getCanonicalFile();
    if (!dir.exists() && !dir.mkdirs() && !dir.exists()) throw new Error("无法创建 Shell 桥结果目录");
    if (!dir.isDirectory()) throw new Error("Shell 桥结果路径不是目录");
    return dir;
  }

  function cleanupShellBridgeMarkers22(dir) {
    try {
      var files = dir.listFiles();
      if (!files) return;
      var cutoff = now22() - 60 * 60 * 1000;
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        try {
          if (file && file.isFile() && String(file.getName() || "").indexOf("root_") === 0 &&
              Number(file.lastModified() || 0) < cutoff) file.delete();
        } catch (eOne) {}
      }
    } catch (e0) {}
  }

  function writeShellBridgeMarker22(file, text) {
    var writer = null;
    try {
      writer = new java.io.OutputStreamWriter(new java.io.FileOutputStream(file, false), "UTF-8");
      writer.write(String(text || ""));
      writer.flush();
      return true;
    } finally {
      try { if (writer) writer.close(); } catch (eClose) {}
    }
  }

  function readShellBridgeMarker22(file) {
    var reader = null;
    try {
      if (!file || !file.exists() || !file.isFile()) return "";
      reader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), "UTF-8"));
      var line = reader.readLine();
      return line === null ? "" : String(line);
    } catch (e0) {
      return "";
    } finally {
      try { if (reader) reader.close(); } catch (eClose) {}
    }
  }

  function encodeShellBridgeCommand22(command) {
    try {
      if (typeof encodeBase64Utf8 === "function") {
        var encoded = String(encodeBase64Utf8(String(command || "")) || "");
        if (encoded) return encoded;
      }
    } catch (e0) {}
    try {
      var bytes = new java.lang.String(String(command || "")).getBytes("UTF-8");
      return String(android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP));
    } catch (e1) {}
    return "";
  }

  function shellBridgeToken22() {
    var tid = 0;
    try { tid = Number(java.lang.Thread.currentThread().getId()); } catch (e0) { tid = 0; }
    var random = 0;
    try { random = Math.floor(Math.random() * 1000000000); } catch (e1) { random = 0; }
    return String(now22()) + "_" + String(tid) + "_" + String(random);
  }

  function runRootShell22(command, appObj) {
    var app = resolveShellBridgeApp22(appObj);
    if (!app) throw new Error("ShortX Shell 广播桥不可用");
    var dir = shellBridgeMarkerDir22();
    cleanupShellBridgeMarkers22(dir);
    var token = shellBridgeToken22();
    var marker = new java.io.File(dir, "root_" + token + ".status").getCanonicalFile();
    var dirPath = String(dir.getCanonicalPath());
    var markerPath = String(marker.getCanonicalPath());
    if (markerPath.indexOf(dirPath + java.io.File.separator) !== 0) throw new Error("Shell 桥结果路径越界");
    var pending = "pending:" + token;
    var donePrefix = "done:" + token + ":";
    writeShellBridgeMarker22(marker, pending);
    var wrapped =
      "if [ -f " + shellQuote22(markerPath) + " ]; then " +
      "( " + String(command || "") + " ); th_rc=$?; " +
      "printf " + shellQuote22(donePrefix + "%s") + " \"$th_rc\" > " + shellQuote22(markerPath) +
      "; fi";
    var commandB64 = encodeShellBridgeCommand22(wrapped);
    if (!commandB64) {
      try { marker.delete(); } catch (eDelete0) {}
      throw new Error("Shell 桥命令编码失败");
    }
    var sent = null;
    try { sent = app.execShellSmart(commandB64, true); }
    catch (eSend) {
      try { marker.delete(); } catch (eDelete1) {}
      throw new Error("Shell 广播桥发送异常: " + String(eSend));
    }
    if (!sent || sent.ok !== true || sent.sent !== true) {
      try { marker.delete(); } catch (eDelete2) {}
      throw new Error("Shell 广播桥发送失败: " + String(sent && sent.err || "unknown"));
    }
    try {
      safeLog(app.L, "i", "pickword image root bridge dispatched via=" + String(sent.via || "") +
        " marker=" + String(marker.getName() || ""));
    } catch (eLog0) {}
    var deadline = now22() + 20000;
    var status = pending;
    while (now22() < deadline) {
      status = readShellBridgeMarker22(marker);
      if (status.indexOf(donePrefix) === 0) break;
      java.lang.Thread.sleep(80);
    }
    if (status.indexOf(donePrefix) !== 0) {
      try { marker.delete(); } catch (eDelete3) {}
      throw new Error("Shell 广播桥执行超时");
    }
    var exitText = status.substring(donePrefix.length).replace(/^\s+|\s+$/g, "");
    var exitCode = parseInt(exitText, 10);
    try { marker.delete(); } catch (eDelete4) {}
    if (isNaN(exitCode)) throw new Error("Shell 广播桥结果无效: " + exitText);
    if (exitCode !== 0) throw new Error("Shell 广播桥命令失败 exit=" + String(exitCode));
    try { safeLog(app.L, "i", "pickword image root bridge completed via=" + String(sent.via || "") + " exit=0"); }
    catch (eLog1) {}
    return {
      ok: true,
      via: "shortx_shell_bridge",
      executable: String(sent.via || "BroadcastBridge"),
      bridgeMode: String(sent.bridgeMode || ""),
      targetMode: String(sent.targetMode || "")
    };
  }

  function queryMediaUriByPath22(file) {
    var cursor = null;
    try {
      var collection = android.provider.MediaStore.Files.getContentUri("external");
      cursor = context.getContentResolver().query(
        collection,
        stringArgs22(["_id"]),
        "_data=?",
        stringArgs22([String(file.getCanonicalPath())]),
        "_id DESC"
      );
      if (cursor && cursor.moveToFirst()) {
        return String(android.content.ContentUris.withAppendedId(collection, Number(cursor.getLong(0))).toString());
      }
    } catch (e0) {
    } finally {
      try { if (cursor) cursor.close(); } catch (eClose) {}
    }
    return "";
  }

  function scanPublicFile22(file, appObj) {
    var holder = { uri: "" };
    var latch = new java.util.concurrent.CountDownLatch(1);
    try {
      var listener = new JavaAdapter(android.media.MediaScannerConnection.OnScanCompletedListener, {
        onScanCompleted: function(path, uri) {
          try { holder.uri = uri ? String(uri.toString()) : ""; } catch (e0) { holder.uri = ""; }
          try { latch.countDown(); } catch (e1) {}
        }
      });
      android.media.MediaScannerConnection.scanFile(
        context,
        [String(file.getCanonicalPath())],
        [String(mime22(extension22(file)))],
        listener
      );
      latch.await(5, java.util.concurrent.TimeUnit.SECONDS);
    } catch (eScan) {}
    if (holder.uri) return holder.uri;
    try {
      var fileUri = String(android.net.Uri.fromFile(file).toString());
      runRootShell22(
        "am broadcast --user 0 -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d " +
        shellQuote22(fileUri) + " >/dev/null 2>&1",
        appObj
      );
      java.lang.Thread.sleep(350);
    } catch (eBroadcast) {}
    return queryMediaUriByPath22(file);
  }

  function rootCopyPublic22(appObj, sourceFile, publicDir, displayName, kind, expiresAt, requireUri) {
    var source = sourceFile.getCanonicalFile();
    var dir = publicDir.getCanonicalFile();
    var target = new java.io.File(dir, String(displayName)).getCanonicalFile();
    var dirPath = String(dir.getCanonicalPath());
    var targetPath = String(target.getCanonicalPath());
    if (targetPath.indexOf(dirPath + java.io.File.separator) !== 0) throw new Error("公共保存目标越界");
    var sourcePath = String(source.getCanonicalPath());
    var directCommand =
      "mkdir -p " + shellQuote22(dirPath) +
      " && cp -f " + shellQuote22(sourcePath) + " " + shellQuote22(targetPath);
    var underlyingDir = underlyingPublicPath22(dir);
    var underlyingTarget = underlyingPublicPath22(target);
    var command = directCommand;
    if (underlyingDir && underlyingTarget) {
      command = "( (" + directCommand + ") || (mkdir -p " + shellQuote22(underlyingDir) +
        " && cp -f " + shellQuote22(sourcePath) + " " + shellQuote22(underlyingTarget) + ") )";
    }
    var shell = runRootShell22(command + " >/dev/null 2>&1", appObj);
    var publicBytes = Number(source.length() || 0);
    for (var visibleTry = 0; visibleTry < 10; visibleTry++) {
      try {
        if (target.exists() && target.isFile() && target.length() > 0) {
          publicBytes = Number(target.length() || publicBytes);
          break;
        }
      } catch (eVisible) {}
      java.lang.Thread.sleep(50);
    }
    var contentUri = scanPublicFile22(target, appObj);
    if (requireUri === true && !contentUri) {
      try { runRootShell22("rm -f " + shellQuote22(targetPath) + " >/dev/null 2>&1", appObj); } catch (eDelete) {}
      throw new Error("公共图片已写入但无法取得分享 URI");
    }
    try {
      if (typeof safeLog === "function") {
        safeLog(appObj && appObj.L ? appObj.L : null, "i", "pickword image public io mode=root_copy via=" + String(shell.via || "") +
          " bridge=" + String(shell.executable || "") +
          " path=" + targetPath + " uri=" + String(contentUri || ""));
      }
    } catch (eLog) {}
    return {
      ok: true,
      kind: kind,
      publicPath: targetPath,
      contentUri: String(contentUri || ""),
      bytes: publicBytes,
      createdAt: now22(),
      expiresAt: Number(expiresAt || 0),
      fallback: true,
      rootFallback: true,
      via: String(shell.via || ""),
      shellBridge: String(shell.executable || "")
    };
  }

  function rootProbePublicDir22(appObj, dir) {
    var canonical = dir.getCanonicalFile();
    var dirPath = String(canonical.getCanonicalPath());
    var probePath = String(new java.io.File(canonical, ".toolhub_root_probe_" + String(now22())).getCanonicalPath());
    var directCommand =
      "mkdir -p " + shellQuote22(dirPath) +
      " && printf 1 > " + shellQuote22(probePath) +
      " && rm -f " + shellQuote22(probePath);
    var underlyingDir = underlyingPublicPath22(canonical);
    var underlyingProbe = underlyingPublicPath22(new java.io.File(probePath));
    var command = directCommand;
    if (underlyingDir && underlyingProbe) {
      command = "( (" + directCommand + ") || (mkdir -p " + shellQuote22(underlyingDir) +
        " && printf 1 > " + shellQuote22(underlyingProbe) +
        " && rm -f " + shellQuote22(underlyingProbe) + ") )";
    }
    runRootShell22(command + " >/dev/null 2>&1", appObj);
    return true;
  }

  function rootDeletePublic22(appObj, publicPath) {
    var file = normalizePublicFile22(publicPath);
    var targetPath = String(file.getCanonicalPath());
    var underlying = underlyingPublicPath22(file);
    var command = "rm -f " + shellQuote22(targetPath);
    if (underlying) command += " " + shellQuote22(underlying);
    runRootShell22(command + " >/dev/null 2>&1", appObj);
    return true;
  }

  function exportPublicFile22(appObj, sourceFile, publicDir, displayName, kind, expiresAt, requireUri) {
    if (android.os.Build.VERSION.SDK_INT < 29) {
      return copyFileFallback22(sourceFile, publicDir, displayName);
    }
    var rootFirst = preferRootPublicIo22();
    var firstError = null;
    var secondError = null;
    if (rootFirst) {
      try { return rootCopyPublic22(appObj, sourceFile, publicDir, displayName, kind, expiresAt, requireUri); }
      catch (eRootFirst) { firstError = eRootFirst; }
      try { return insertMediaStore22(sourceFile, publicDir, displayName, kind, expiresAt); }
      catch (eMediaSecond) { secondError = eMediaSecond; }
    } else {
      try { return insertMediaStore22(sourceFile, publicDir, displayName, kind, expiresAt); }
      catch (eMediaFirst) { firstError = eMediaFirst; }
      try { return rootCopyPublic22(appObj, sourceFile, publicDir, displayName, kind, expiresAt, requireUri); }
      catch (eRootSecond) { secondError = eRootSecond; }
    }
    throw new Error(
      (rootFirst ? "Root 保存失败: " : "MediaStore 保存失败: ") + String(firstError) +
      "; " + (rootFirst ? "MediaStore 保存失败: " : "Root 保存失败: ") + String(secondError)
    );
  }

  function probePublicDir22(appObj, dir) {
    if (android.os.Build.VERSION.SDK_INT < 29) return probeWritable22(dir);
    var rootFirst = preferRootPublicIo22();
    var firstError = null;
    if (rootFirst) {
      try { return rootProbePublicDir22(appObj, dir); } catch (eRoot) { firstError = eRoot; }
      try { return probeMediaStore22(dir); } catch (eMedia) {
        throw new Error("Root 目录测试失败: " + String(firstError) + "; MediaStore 目录测试失败: " + String(eMedia));
      }
    }
    try { return probeMediaStore22(dir); } catch (eMediaFirst) { firstError = eMediaFirst; }
    try { return rootProbePublicDir22(appObj, dir); } catch (eRootSecond) {
      throw new Error("MediaStore 目录测试失败: " + String(firstError) + "; Root 目录测试失败: " + String(eRootSecond));
    }
  }

  function relativePath22(dir) {
    var storage = android.os.Environment.getExternalStorageDirectory().getCanonicalFile();
    var rootPath = String(storage.getCanonicalPath());
    var targetPath = String(dir.getCanonicalPath());
    var relative = targetPath.substring(rootPath.length).replace(/^\/+/, "").replace(/\\/g, "/");
    if (relative && relative.charAt(relative.length - 1) !== "/") relative += "/";
    return relative;
  }

  function extension22(file) {
    var name = String(file.getName() || "");
    var dot = name.lastIndexOf(".");
    var ext = dot >= 0 ? name.substring(dot + 1).toLowerCase() : "png";
    if (!/^(png|jpe?g|webp)$/.test(ext)) ext = "png";
    if (ext === "jpeg") ext = "jpg";
    return ext;
  }

  function mime22(ext) {
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "webp") return "image/webp";
    return "image/png";
  }

  function displayName22(file, createdAt, prefix) {
    var fmt = new java.text.SimpleDateFormat("yyyyMMdd_HHmmss", java.util.Locale.getDefault());
    var stamp = String(fmt.format(new java.util.Date(Number(createdAt || now22()))));
    return String(prefix || "ToolHub_") + stamp + "_" + String(now22() % 1000) + "." + extension22(file);
  }

  function copyStream22(input, output) {
    var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 64 * 1024);
    var total = 0;
    var count = 0;
    while ((count = input.read(buffer)) > 0) {
      output.write(buffer, 0, count);
      total += count;
    }
    output.flush();
    return total;
  }

  function insertMediaStore22(sourceFile, publicDir, displayName, kind, expiresAt) {
    var resolver = context.getContentResolver();
    var uri = null;
    var input = null;
    var output = null;
    var values = new android.content.ContentValues();
    var ext = extension22(sourceFile);
    var relative = relativePath22(publicDir);
    try {
      values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, String(displayName));
      values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, String(mime22(ext)));
      if (android.os.Build.VERSION.SDK_INT >= 29) {
        values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, String(relative));
        values.put(android.provider.MediaStore.MediaColumns.IS_PENDING, new java.lang.Integer(1));
      }
      uri = resolver.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
      if (!uri) throw new Error("MediaStore 创建失败");
      input = new java.io.FileInputStream(sourceFile);
      output = resolver.openOutputStream(uri, "w");
      if (!output) throw new Error("MediaStore 输出流为空");
      var bytes = copyStream22(input, output);
      closeStream22(output);
      output = null;
      closeStream22(input);
      input = null;
      if (android.os.Build.VERSION.SDK_INT >= 29) {
        var ready = new android.content.ContentValues();
        ready.put(android.provider.MediaStore.MediaColumns.IS_PENDING, new java.lang.Integer(0));
        resolver.update(uri, ready, null, null);
      }
      var publicPath = new java.io.File(publicDir, displayName).getAbsolutePath();
      return {
        ok: true,
        kind: kind,
        publicPath: String(publicPath),
        contentUri: String(uri.toString()),
        bytes: Number(bytes || 0),
        createdAt: now22(),
        expiresAt: Number(expiresAt || 0)
      };
    } catch (e0) {
      try { if (uri) resolver.delete(uri, null, null); } catch (eDelete) {}
      throw e0;
    } finally {
      closeStream22(output);
      closeStream22(input);
    }
  }

  function copyFileFallback22(sourceFile, publicDir, displayName) {
    var input = null;
    var output = null;
    var target = new java.io.File(publicDir, displayName);
    try {
      input = new java.io.FileInputStream(sourceFile);
      output = new java.io.FileOutputStream(target, false);
      var bytes = copyStream22(input, output);
      try {
        android.media.MediaScannerConnection.scanFile(context, [String(target.getAbsolutePath())], [mime22(extension22(target))], null);
      } catch (eScan) {}
      return {
        ok: true,
        publicPath: String(target.getAbsolutePath()),
        contentUri: "",
        bytes: Number(bytes || 0),
        createdAt: now22(),
        expiresAt: 0,
        fallback: true
      };
    } catch (e0) {
      try { if (target.exists()) target.delete(); } catch (eDelete) {}
      throw e0;
    } finally {
      closeStream22(output);
      closeStream22(input);
    }
  }

  function uriReadable22(rawUri) {
    if (!rawUri) return false;
    var input = null;
    try {
      input = context.getContentResolver().openInputStream(android.net.Uri.parse(String(rawUri)));
      return !!input;
    } catch (e0) {
      return false;
    } finally {
      closeStream22(input);
    }
  }

  function existingSave22(internalPath) {
    var row = loadSaved22(internalPath);
    if (!row) return null;
    if (row.contentUri && uriReadable22(row.contentUri)) return row;
    if (row.publicPath) {
      try {
        var file = new java.io.File(row.publicPath);
        if (file.exists() && file.isFile() && file.length() > 0) return row;
      } catch (e0) {}
    }
    return null;
  }

  function savePermanent22(appObj, sourceFile, session) {
    var existing = existingSave22(String(sourceFile.getCanonicalPath()));
    if (existing) {
      existing.ok = true;
      existing.reused = true;
      return existing;
    }
    var name = displayName22(sourceFile, Number(session.createdAt || now22()), "ToolHub_");
    var scoped = android.os.Build.VERSION.SDK_INT >= 29;
    var dir = preparePublicDir22(appObj, "", !scoped);
    if (!scoped) probeWritable22(dir);
    var result = exportPublicFile22(appObj, sourceFile, dir, name, "saved", 0, false);
    updateImageSaved22(String(sourceFile.getCanonicalPath()), result.publicPath, result.contentUri, result.createdAt);
    return result;
  }

  function createShareCopy22(appObj, sourceFile, session) {
    var scoped = android.os.Build.VERSION.SDK_INT >= 29;
    var dir = preparePublicDir22(appObj, "ShareTemp", !scoped);
    if (!scoped) probeWritable22(dir);
    var expiresAt = now22() + 24 * 60 * 60 * 1000;
    var name = displayName22(sourceFile, Number(session.createdAt || now22()), "ToolHub_Share_");
    var result = exportPublicFile22(appObj, sourceFile, dir, name, "share_temp", expiresAt, true);
    addExport22(String(sourceFile.getCanonicalPath()), "share_temp", result.publicPath, result.contentUri, result.createdAt, expiresAt);
    return result;
  }

  function launchShare22(result) {
    if (!result || !result.contentUri) throw new Error("分享 URI 不可用");
    var uri = android.net.Uri.parse(String(result.contentUri));
    var sendIntent = new android.content.Intent(android.content.Intent.ACTION_SEND);
    sendIntent.setType("image/*");
    sendIntent.putExtra(android.content.Intent.EXTRA_STREAM, uri);
    sendIntent.setClipData(android.content.ClipData.newRawUri("ToolHub screenshot", uri));
    sendIntent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
    sendIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
    var chooser = android.content.Intent.createChooser(sendIntent, "分享截图");
    chooser.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
    chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
    context.startActivity(chooser);
    return true;
  }

  function deleteContent22(appObj, contentUri, publicPath) {
    var deleted = false;
    if (contentUri) {
      try {
        deleted = context.getContentResolver().delete(android.net.Uri.parse(String(contentUri)), null, null) > 0;
      } catch (e0) {}
    }
    if (!deleted && publicPath) {
      try {
        var file = new java.io.File(String(publicPath));
        deleted = !file.exists() || file.delete();
      } catch (e1) {}
    }
    if (!deleted && publicPath) {
      try {
        deleted = rootDeletePublic22(appObj, publicPath);
      } catch (e2) {}
    }
    return deleted;
  }

  function scanInternalCleanup22(retentionDays, activePath) {
    var result = { scanned: 0, deleted: 0, skippedActive: 0, failed: 0 };
    if (retentionDays <= 0) return result;
    var root = internalRoot22();
    if (!root.exists() || !root.isDirectory()) return result;
    var files = root.listFiles();
    if (!files) return result;
    var cutoff = now22() - retentionDays * 24 * 60 * 60 * 1000;
    var active = "";
    try { active = activePath ? String(normalizeInternalFile22(activePath).getCanonicalPath()) : ""; } catch (eActive) { active = ""; }
    for (var i = 0; i < files.length; i++) {
      var one = files[i];
      try {
        if (!one || !one.isFile()) continue;
        var name = String(one.getName() || "").toLowerCase();
        if (!/\.(png|jpe?g|webp)$/.test(name)) continue;
        result.scanned++;
        var canonical = String(one.getCanonicalPath());
        if (active && canonical === active) {
          result.skippedActive++;
          continue;
        }
        var modified = Number(one.lastModified() || 0);
        if (!(modified > 0) || modified >= cutoff) continue;
        if (one.delete()) {
          result.deleted++;
          markImageDeleted22(canonical, now22());
        } else {
          result.failed++;
        }
      } catch (eOne) {
        result.failed++;
      }
    }
    return result;
  }

  function loadExpiredExports22() {
    return withDb22(function(db) {
      var cursor = null;
      var rows = [];
      try {
        cursor = db.rawQuery("SELECT export_id,public_path,content_uri FROM toolhub_pickword_image_exports WHERE export_kind='share_temp' AND deleted_at=0 AND expires_at>0 AND expires_at<?", stringArgs22([String(now22())]));
        while (cursor.moveToNext()) {
          rows.push({
            id: Number(cursor.getLong(0)),
            publicPath: String(cursor.getString(1) || ""),
            contentUri: String(cursor.getString(2) || "")
          });
        }
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
      return rows;
    }, []);
  }

  function markExportsDeleted22(ids, deletedAt) {
    if (!ids || !ids.length) return 0;
    return withDb22(function(db) {
      var stmt = null;
      var updated = 0;
      try {
        stmt = db.compileStatement("UPDATE toolhub_pickword_image_exports SET deleted_at=? WHERE export_id=? AND deleted_at=0");
        for (var i = 0; i < ids.length; i++) {
          try { stmt.clearBindings(); } catch (eClear) {}
          stmt.bindLong(1, Number(deletedAt || now22()));
          stmt.bindLong(2, Number(ids[i]));
          updated += Number(stmt.executeUpdateDelete() || 0);
        }
        return updated;
      } finally {
        try { if (stmt) stmt.close(); } catch (eStmt) {}
      }
    }, 0);
  }

  function cleanupExports22(appObj) {
    var rows = loadExpiredExports22();
    var successIds = [];
    var result = { scanned: 0, deleted: 0, failed: 0, marked: 0 };
    for (var i = 0; i < rows.length; i++) {
      result.scanned++;
      var one = rows[i];
      var emptyRecord = !one.contentUri && !one.publicPath;
      var ok = emptyRecord || deleteContent22(appObj, one.contentUri, one.publicPath);
      if (ok) {
        result.deleted++;
        successIds.push(one.id);
      } else {
        result.failed++;
      }
    }
    result.marked = markExportsDeleted22(successIds, now22());
    if (result.marked < successIds.length) result.failed += successIds.length - result.marked;
    return result;
  }

  function stats22(appObj) {
    var dbStats = withDb22(function(db) {
      var cursor = null;
      try {
        cursor = db.rawQuery("SELECT COUNT(*), SUM(CASE WHEN saved_at>0 THEN 1 ELSE 0 END), SUM(CASE WHEN deleted_at>0 THEN 1 ELSE 0 END) FROM toolhub_pickword_images", null);
        if (!cursor.moveToFirst()) return { tracked: 0, saved: 0, deleted: 0 };
        return {
          tracked: Number(cursor.getLong(0) || 0),
          saved: Number(cursor.getLong(1) || 0),
          deleted: Number(cursor.getLong(2) || 0)
        };
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
    }, { tracked: 0, saved: 0, deleted: 0 });
    dbStats.publicDir = configuredPublicDir22(appObj);
    dbStats.retentionDays = configuredRetention22(appObj, null);
    dbStats.lastCleanupAt = Number(getMeta22("pickword_image_cleanup_last_at") || 0);
    return dbStats;
  }


  function isImageFile22(file) {
    try {
      if (!file || !file.exists() || !file.isFile() || file.length() <= 0) return false;
      return /\.(png|jpe?g|webp)$/i.test(String(file.getName() || ""));
    } catch (e0) {}
    return false;
  }

  function normalizePublicFile22(rawPath) {
    var value = String(rawPath || "").replace(/^\s+|\s+$/g, "");
    if (!value) throw new Error("公共图片路径为空");
    var storage = android.os.Environment.getExternalStorageDirectory().getCanonicalFile();
    var target = new java.io.File(value).getCanonicalFile();
    var rootPath = String(storage.getCanonicalPath());
    var targetPath = String(target.getCanonicalPath());
    if (targetPath.indexOf(rootPath + java.io.File.separator) !== 0) throw new Error("公共图片路径越界");
    return target;
  }

  function safeMediaUri22(rawUri) {
    var value = String(rawUri || "").replace(/^\s+|\s+$/g, "");
    if (!value) return "";
    try {
      var uri = android.net.Uri.parse(value);
      var scheme = String(uri.getScheme() || "").toLowerCase();
      var authority = String(uri.getAuthority() || "").toLowerCase();
      if (scheme !== "content" || authority.indexOf("media") < 0) return "";
      return value;
    } catch (e0) {}
    return "";
  }

  function ensureTracked22(file, sourceType, createdAt) {
    return withDb22(function(db) {
      var insert = null;
      var update = null;
      try {
        var path = String(file.getCanonicalPath());
        var ts = Number(createdAt || file.lastModified() || now22());
        insert = db.compileStatement("INSERT OR IGNORE INTO toolhub_pickword_images(internal_path,created_at,source_type,width,height,file_size,saved_public_path,saved_content_uri,saved_at,deleted_at,last_access_at) VALUES(?,?,?,0,0,?,'','',0,0,?)");
        bindText22(insert, 1, path);
        insert.bindLong(2, ts);
        bindText22(insert, 3, sourceType || "screenshot_manager");
        insert.bindLong(4, Number(file.length() || 0));
        insert.bindLong(5, now22());
        insert.executeInsert();
        update = db.compileStatement("UPDATE toolhub_pickword_images SET file_size=?, last_access_at=?, deleted_at=0 WHERE internal_path=?");
        update.bindLong(1, Number(file.length() || 0));
        update.bindLong(2, now22());
        bindText22(update, 3, path);
        update.executeUpdateDelete();
        return true;
      } finally {
        try { if (insert) insert.close(); } catch (eInsert) {}
        try { if (update) update.close(); } catch (eUpdate) {}
      }
    }, false);
  }

  function clearImageSaved22(internalPath) {
    return withDb22(function(db) {
      var stmt = null;
      try {
        stmt = db.compileStatement("UPDATE toolhub_pickword_images SET saved_public_path='', saved_content_uri='', saved_at=0, last_access_at=? WHERE internal_path=?");
        stmt.bindLong(1, now22());
        bindText22(stmt, 2, internalPath);
        return Number(stmt.executeUpdateDelete()) > 0;
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    }, false);
  }

  function listInternalImages22() {
    var rows = withDb22(function(db) {
      var cursor = null;
      var out = [];
      try {
        cursor = db.rawQuery("SELECT internal_path,created_at,source_type,width,height,file_size,saved_public_path,saved_content_uri,saved_at,last_access_at FROM toolhub_pickword_images WHERE deleted_at=0 ORDER BY created_at DESC", null);
        while (cursor.moveToNext()) {
          out.push({
            kind: "internal",
            internalPath: String(cursor.getString(0) || ""),
            createdAt: Number(cursor.getLong(1) || 0),
            source: String(cursor.getString(2) || ""),
            width: Number(cursor.getLong(3) || 0),
            height: Number(cursor.getLong(4) || 0),
            fileSize: Number(cursor.getLong(5) || 0),
            savedPublicPath: String(cursor.getString(6) || ""),
            savedContentUri: String(cursor.getString(7) || ""),
            savedAt: Number(cursor.getLong(8) || 0),
            lastAccessAt: Number(cursor.getLong(9) || 0),
            tracked: true,
            available: false
          });
        }
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
      return out;
    }, []);
    var map = {};
    var out2 = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      try {
        var file = normalizeInternalFile22(row.internalPath);
        if (!isImageFile22(file)) continue;
        row.internalPath = String(file.getCanonicalPath());
        row.available = true;
        if (!row.fileSize) row.fileSize = Number(file.length() || 0);
        if (!row.createdAt) row.createdAt = Number(file.lastModified() || 0);
        map["$" + row.internalPath] = true;
        out2.push(row);
      } catch (eRow) {}
    }
    try {
      var root = internalRoot22();
      var files = root.listFiles();
      if (files) {
        for (var j = 0; j < files.length; j++) {
          var one = files[j];
          if (!isImageFile22(one)) continue;
          var canonical = String(one.getCanonicalPath());
          if (map["$" + canonical]) continue;
          out2.push({
            kind: "internal",
            internalPath: canonical,
            createdAt: Number(one.lastModified() || 0),
            source: "untracked",
            width: 0,
            height: 0,
            fileSize: Number(one.length() || 0),
            savedPublicPath: "",
            savedContentUri: "",
            savedAt: 0,
            lastAccessAt: 0,
            tracked: false,
            available: true
          });
        }
      }
    } catch (eScan) {}
    out2.sort(function(a, b) { return Number(b.createdAt || 0) - Number(a.createdAt || 0); });
    return out2;
  }

  function listSavedImages22() {
    return withDb22(function(db) {
      var cursor = null;
      var out = [];
      try {
        cursor = db.rawQuery("SELECT internal_path,created_at,source_type,width,height,file_size,saved_public_path,saved_content_uri,saved_at,deleted_at FROM toolhub_pickword_images WHERE saved_at>0 AND (saved_public_path<>'' OR saved_content_uri<>'') ORDER BY saved_at DESC", null);
        while (cursor.moveToNext()) {
          var row = {
            kind: "saved",
            internalPath: String(cursor.getString(0) || ""),
            createdAt: Number(cursor.getLong(1) || 0),
            source: String(cursor.getString(2) || ""),
            width: Number(cursor.getLong(3) || 0),
            height: Number(cursor.getLong(4) || 0),
            fileSize: Number(cursor.getLong(5) || 0),
            publicPath: String(cursor.getString(6) || ""),
            contentUri: String(cursor.getString(7) || ""),
            savedAt: Number(cursor.getLong(8) || 0),
            internalDeleted: Number(cursor.getLong(9) || 0) > 0,
            available: false,
            internalAvailable: false
          };
          try { row.internalAvailable = isImageFile22(normalizeInternalFile22(row.internalPath)); } catch (eInternal) {}
          try {
            var safeUri = safeMediaUri22(row.contentUri);
            if (safeUri && uriReadable22(safeUri)) row.available = true;
          } catch (eUri) {}
          if (!row.available && row.publicPath) {
            try {
              var publicFile = normalizePublicFile22(row.publicPath);
              row.available = isImageFile22(publicFile);
              if (row.available) row.fileSize = Number(publicFile.length() || row.fileSize || 0);
            } catch (ePublic) {}
          }
          out.push(row);
        }
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
      return out;
    }, []);
  }

  function requireInternalImage22(rawPath) {
    var file = normalizeInternalFile22(rawPath);
    if (!isImageFile22(file)) throw new Error("内部截图不存在");
    ensureTracked22(file, "screenshot_manager", Number(file.lastModified() || now22()));
    return file;
  }

  function deleteInternalImage22(rawPath) {
    var file = normalizeInternalFile22(rawPath);
    var path = String(file.getCanonicalPath());
    if (file.exists() && (!file.isFile() || !file.delete())) throw new Error("内部截图删除失败");
    markImageDeleted22(path, now22());
    return { ok: true, internalPath: path, deletedAt: now22() };
  }

  function prepareSavedUri22(appObj, internalPath) {
    var row = loadSaved22(String(internalPath || ""));
    if (!row) throw new Error("已保存记录不存在");
    var safeUri = safeMediaUri22(row.contentUri);
    if (safeUri && uriReadable22(safeUri)) {
      return { ok: true, contentUri: safeUri, publicPath: row.publicPath || "", reused: true };
    }
    var publicFile = normalizePublicFile22(row.publicPath);
    if (!isImageFile22(publicFile)) throw new Error("公共副本不可用");
    var scannedUri = scanPublicFile22(publicFile, appObj);
    if (scannedUri) {
      updateImageSaved22(
        String(internalPath || ""),
        String(publicFile.getCanonicalPath()),
        String(scannedUri),
        Number(row.savedAt || now22())
      );
      return { ok: true, contentUri: String(scannedUri), publicPath: String(publicFile.getCanonicalPath()), reused: true, rescanned: true };
    }
    var scoped = android.os.Build.VERSION.SDK_INT >= 29;
    var tempDir = preparePublicDir22(appObj, "ShareTemp", !scoped);
    if (!scoped) probeWritable22(tempDir);
    var expiresAt = now22() + 24 * 60 * 60 * 1000;
    var result = exportPublicFile22(
      appObj,
      publicFile,
      tempDir,
      displayName22(publicFile, now22(), "ToolHub_View_"),
      "share_temp",
      expiresAt,
      true
    );
    addExport22(String(internalPath || ""), "share_temp", result.publicPath, result.contentUri, result.createdAt, expiresAt);
    return result;
  }

  function launchView22(result) {
    if (!result || !result.contentUri) throw new Error("查看 URI 不可用");
    var uri = android.net.Uri.parse(String(result.contentUri));
    var intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
    intent.setDataAndType(uri, "image/*");
    intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
    context.startActivity(intent);
    return true;
  }

  function deleteSavedImage22(appObj, internalPath) {
    var row = loadSaved22(String(internalPath || ""));
    if (!row) return { ok: true, missing: true, internalPath: String(internalPath || "") };
    var safeUri = safeMediaUri22(row.contentUri);
    var safePath = "";
    if (row.publicPath) {
      try { safePath = String(normalizePublicFile22(row.publicPath).getCanonicalPath()); } catch (ePath) { safePath = ""; }
    }
    if (!safeUri && !safePath) throw new Error("公共副本路径不安全");
    var deleted = deleteContent22(appObj, safeUri, safePath);
    if (!deleted) throw new Error("公共副本删除失败");
    clearImageSaved22(String(internalPath || ""));
    return { ok: true, internalPath: String(internalPath || ""), deletedAt: now22() };
  }

  function install22() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (String(proto.__toolHubPickwordImageViewerVersion || "") === "1.2.6") return true;

      proto.validatePickwordImagePublicDir = function(pathValue) {
        var result = { ok: false, path: "", error: "" };
        try {
          var scoped = android.os.Build.VERSION.SDK_INT >= 29;
          var dir = normalizePublicDir22(pathValue, !scoped);
          probePublicDir22(this, dir);
          result.ok = true;
          result.path = String(dir.getCanonicalPath());
        } catch (e0) {
          result.error = String(e0);
        }
        return result;
      };

      proto.getPickwordImageStorageStats = function() {
        return stats22(this);
      };

      proto.runPickwordImageCleanupNow = function(options, callback) {
        var appObj = this;
        var opts = options || {};
        if (proto.__pickwordImageCleanupRunning22 === true) {
          try { if (callback) callback({ ok: false, busy: true, error: "清理正在进行" }); } catch (eBusy) {}
          return false;
        }
        var force = opts.force === true;
        var lastAt = Number(getMeta22("pickword_image_cleanup_last_at") || 0);
        if (!force && lastAt > 0 && now22() - lastAt < 24 * 60 * 60 * 1000) {
          try {
            if (callback) callback({ ok: true, skipped: true, reason: "once_per_day", lastCleanupAt: lastAt });
          } catch (eSkip) {}
          return true;
        }
        proto.__pickwordImageCleanupRunning22 = true;
        var handler = new android.os.Handler(android.os.Looper.getMainLooper());
        var thread = new java.lang.Thread(new java.lang.Runnable({ run: function() {
          var result = { ok: false, internal: null, exports: null, retentionDays: 0, completedAt: 0, error: "" };
          try {
            result.retentionDays = configuredRetention22(appObj, opts.retentionDays);
            result.internal = scanInternalCleanup22(result.retentionDays, String(opts.activePath || ""));
            result.exports = cleanupExports22(appObj);
            result.completedAt = now22();
            putMeta22("pickword_image_cleanup_last_at", String(result.completedAt));
            result.ok = true;
          } catch (eRun) {
            result.error = String(eRun);
          }
          handler.post(new java.lang.Runnable({ run: function() {
            proto.__pickwordImageCleanupRunning22 = false;
            try {
              safeLog(appObj.L, result.ok ? "i" : "w",
                "pickword image cleanup ok=" + String(result.ok) +
                " retentionDays=" + String(result.retentionDays) +
                " internalDeleted=" + String(result.internal ? result.internal.deleted : 0) +
                " tempDeleted=" + String(result.exports ? result.exports.deleted : 0) +
                " error=" + String(result.error || ""));
            } catch (eLog) {}
            try { if (callback) callback(result); } catch (eCallback) {}
          }}));
        }}), "TH-Pickword-Image-Cleanup");
        thread.start();
        return true;
      };


      proto.getPickwordImageService = function() {
        var appObj = this;
        return {
          listInternal: function() { return listInternalImages22(); },
          listSaved: function() { return listSavedImages22(); },
          getStats: function() { return stats22(appObj); },
          saveInternal: function(internalPath) {
            var file = requireInternalImage22(internalPath);
            return savePermanent22(appObj, file, { createdAt: Number(file.lastModified() || now22()) });
          },
          prepareShareInternal: function(internalPath) {
            var file = requireInternalImage22(internalPath);
            return createShareCopy22(appObj, file, { createdAt: Number(file.lastModified() || now22()) });
          },
          deleteInternal: function(internalPath) { return deleteInternalImage22(internalPath); },
          prepareSavedUri: function(internalPath) { return prepareSavedUri22(appObj, internalPath); },
          deleteSaved: function(internalPath) { return deleteSavedImage22(appObj, internalPath); },
          launchShare: function(result) { return launchShare22(result); },
          launchView: function(result) { return launchView22(result); }
        };
      };

      proto.createPickwordImageController = function(options) {
        var appObj = this;
        var opts = options || {};
        var session = opts.session || {};
        var file = normalizeInternalFile22(String(session.internalPath || ""));
        var path = String(file.getCanonicalPath());
        var handler = opts.handler || new android.os.Handler(android.os.Looper.getMainLooper());
        var executor = java.util.concurrent.Executors.newSingleThreadExecutor();
        var colors = theme22(appObj);
        var generation = 1;
        var released = false;
        var deleted = false;
        var actionBusy = false;
        var boundsReady = false;
        var sourceWidth = 0;
        var sourceHeight = 0;
        var fileSize = 0;
        var baseSample = 1;
        var thumbBitmap = null;
        var baseBitmap = null;
        var regionBitmap = null;
        var regionRect = null;
        var regionSample = 1;
        var regionDecoder = null;
        var regionSerial = 0;
        var regionRunnable = null;
        var thumbnailRoot = null;
        var thumbnailImage = null;
        var thumbnailStatus = null;
        var fullRoot = null;
        var imageCanvas = null;
        var infoView = null;
        var actionStatusView = null;
        var saveButton = null;
        var shareButton = null;
        var deleteButton = null;
        var confirmOverlay = null;
        var viewW = 0;
        var viewH = 0;
        var scale = 1;
        var minScale = 1;
        var maxScale = 8;
        var tx = 0;
        var ty = 0;
        var lastX = 0;
        var lastY = 0;
        var panning = false;
        var scaling = false;
        var initialized = false;
        var drawFailureCount = 0;
        var drawDisabled = false;
        var savedInfo = existingSave22(path);

        function log(level, msg) {
          try { safeLog(appObj.L, level, "pickword image " + String(msg)); } catch (e0) {}
        }

        function error(stage, err) {
          log("w", "stage=" + String(stage || "") + " err=" + String(err || ""));
          try { if (typeof opts.onError === "function") opts.onError(stage, err); } catch (e0) {}
        }

        function disableDrawing(err) {
          drawFailureCount++;
          error("draw", err);
          if (drawFailureCount < 3 || drawDisabled) return;
          drawDisabled = true;
          panning = false;
          scaling = false;
          regionSerial++;
          try { if (regionRunnable) handler.removeCallbacks(regionRunnable); } catch (e0) {}
          regionRunnable = null;
          setStatus("图片显示失败，可返回或使用保存/分享", true);
          log("e", "draw disabled after failures=" + String(drawFailureCount));
        }

        function invalidateImageCanvas(stage) {
          if (drawDisabled || released || deleted) return false;
          try {
            if (imageCanvas) {
              imageCanvas.invalidate();
              return true;
            }
          } catch (e0) {
            error(String(stage || "invalidate"), e0);
          }
          return false;
        }

        function post(fn) {
          try {
            return handler.post(new java.lang.Runnable({ run: function() {
              try { fn(); } catch (eRun) { error("ui", eRun); }
            }})) === true;
          } catch (e0) {}
          return false;
        }

        function setStatus(text, isError) {
          try {
            if (actionStatusView) {
              actionStatusView.setText(String(text || ""));
              safeText22(actionStatusView, isError ? colors.danger : colors.secondary);
            }
          } catch (e0) {}
          try {
            if (thumbnailStatus) thumbnailStatus.setText(String(text || (savedInfo ? "已保存 · 点击查看原图" : "点击查看原图")));
          } catch (e1) {}
        }

        function setBusy(busy, text) {
          actionBusy = busy === true;
          var controls = [saveButton, shareButton, deleteButton];
          for (var i = 0; i < controls.length; i++) {
            try {
              if (controls[i]) {
                controls[i].setEnabled(!actionBusy);
                controls[i].setAlpha(actionBusy ? 0.45 : 1.0);
              }
            } catch (e0) {}
          }
          if (text) setStatus(text, false);
        }

        function readBounds() {
          if (boundsReady) return true;
          var o = new android.graphics.BitmapFactory.Options();
          o.inJustDecodeBounds = true;
          android.graphics.BitmapFactory.decodeFile(path, o);
          sourceWidth = Math.max(0, Number(o.outWidth || 0));
          sourceHeight = Math.max(0, Number(o.outHeight || 0));
          try { fileSize = Number(file.length() || 0); } catch (e0) { fileSize = 0; }
          boundsReady = sourceWidth > 0 && sourceHeight > 0;
          if (boundsReady) {
            upsertImage22({
              internalPath: path,
              createdAt: Number(session.createdAt || file.lastModified() || now22()),
              source: String(session.source || "pointer_ocr"),
              width: sourceWidth,
              height: sourceHeight,
              fileSize: fileSize,
              deletedAt: 0
            });
          }
          return boundsReady;
        }

        function updateInfo() {
          if (!infoView) return;
          var text = sourceWidth > 0 ? (String(sourceWidth) + " × " + String(sourceHeight) + "  ·  " + fileSizeText22(fileSize)) : "图片信息不可用";
          try { infoView.setText(text); } catch (e0) {}
        }

        function fitTransform() {
          if (!baseBitmap || viewW <= 0 || viewH <= 0) return;
          var bw = Math.max(1, Number(baseBitmap.getWidth()));
          var bh = Math.max(1, Number(baseBitmap.getHeight()));
          minScale = Math.min(viewW / bw, viewH / bh);
          if (!(minScale > 0)) minScale = 1;
          maxScale = Math.max(minScale * 8, 8 / Math.max(1, baseSample));
          scale = minScale;
          tx = (viewW - bw * scale) / 2;
          ty = (viewH - bh * scale) / 2;
          initialized = true;
        }

        function clampTranslation() {
          if (!baseBitmap || viewW <= 0 || viewH <= 0) return;
          var dw = baseBitmap.getWidth() * scale;
          var dh = baseBitmap.getHeight() * scale;
          if (dw <= viewW) tx = (viewW - dw) / 2;
          else tx = clamp22(tx, viewW - dw, 0);
          if (dh <= viewH) ty = (viewH - dh) / 2;
          else ty = clamp22(ty, viewH - dh, 0);
        }

        function setScaleAround(next, fx, fy) {
          if (!baseBitmap) return;
          var old = scale;
          next = clamp22(next, minScale, maxScale);
          if (!(old > 0)) old = next;
          var bx = (fx - tx) / old;
          var by = (fy - ty) / old;
          scale = next;
          tx = fx - bx * scale;
          ty = fy - by * scale;
          clampTranslation();
          try { if (imageCanvas) imageCanvas.invalidate(); } catch (e0) {}
          scheduleRegionDecode();
        }

        function visibleSourceRect() {
          if (!baseBitmap || !boundsReady || viewW <= 0 || viewH <= 0 || !(scale > 0)) return null;
          var left = Math.floor(Math.max(0, ((0 - tx) / scale) * baseSample));
          var top = Math.floor(Math.max(0, ((0 - ty) / scale) * baseSample));
          var right = Math.ceil(Math.min(sourceWidth, ((viewW - tx) / scale) * baseSample));
          var bottom = Math.ceil(Math.min(sourceHeight, ((viewH - ty) / scale) * baseSample));
          if (right <= left || bottom <= top) return null;
          var padX = Math.max(8, Math.round((right - left) * 0.08));
          var padY = Math.max(8, Math.round((bottom - top) * 0.08));
          left = Math.max(0, left - padX);
          top = Math.max(0, top - padY);
          right = Math.min(sourceWidth, right + padX);
          bottom = Math.min(sourceHeight, bottom + padY);
          return new android.graphics.Rect(left, top, right, bottom);
        }

        function scheduleRegionDecode() {
          if (!regionDecoder || released || deleted || !baseBitmap) return;
          regionSerial++;
          var serial = regionSerial;
          if (regionRunnable) {
            try { handler.removeCallbacks(regionRunnable); } catch (e0) {}
          }
          regionRunnable = new java.lang.Runnable({ run: function() {
            regionRunnable = null;
            if (released || deleted || serial !== regionSerial) return;
            var rect = visibleSourceRect();
            if (!rect) return;
            var desired = Math.max(1, floorPowerTwo22(baseSample / Math.max(scale, 0.01)));
            if (desired >= baseSample && scale <= minScale * 1.15) return;
            try {
              executor.execute(new java.lang.Runnable({ run: function() {
                var decoded = null;
                try {
                  var o = new android.graphics.BitmapFactory.Options();
                  o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                  o.inSampleSize = desired;
                  decoded = regionDecoder.decodeRegion(rect, o);
                } catch (eDecode) {
                  error("region_decode", eDecode);
                }
                finalApply(decoded, rect, desired, serial);
              }}));
            } catch (eExec) { error("region_schedule", eExec); }
          }});
          try { handler.postDelayed(regionRunnable, 90); } catch (ePost) {}
        }

        function finalApply(decoded, rect, sampleValue, serial) {
          post(function() {
            if (released || deleted || serial !== regionSerial) {
              safeRecycle22(decoded);
              return;
            }
            safeRecycle22(regionBitmap);
            regionBitmap = decoded;
            regionRect = rect;
            regionSample = sampleValue;
            try { if (imageCanvas) imageCanvas.invalidate(); } catch (e0) {}
          });
        }

        function decodeThumbnail() {
          var token = generation;
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var bitmap = null;
              try {
                if (!readBounds()) throw new Error("图片尺寸读取失败");
                var o = new android.graphics.BitmapFactory.Options();
                o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                o.inSampleSize = sampleSize22(sourceWidth, sourceHeight, 512);
                bitmap = android.graphics.BitmapFactory.decodeFile(path, o);
                if (!bitmap) throw new Error("缩略图解码为空");
              } catch (eDecode) {
                error("thumbnail_decode", eDecode);
              }
              post(function() {
                if (released || deleted || token !== generation) {
                  safeRecycle22(bitmap);
                  return;
                }
                safeRecycle22(thumbBitmap);
                thumbBitmap = bitmap;
                if (thumbnailImage && bitmap) thumbnailImage.setImageBitmap(bitmap);
                if (thumbnailStatus) thumbnailStatus.setText(bitmap ? (savedInfo ? "已保存 · 点击查看原图" : "点击查看原图") : "截图不可用");
                updateInfo();
              });
            }}));
          } catch (eExec) { error("thumbnail_schedule", eExec); }
        }

        function decodeFull() {
          if (baseBitmap || released || deleted) return;
          var token = generation;
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var bitmap = null;
              var decoder = null;
              var sampleValue = 1;
              try {
                if (!readBounds()) throw new Error("图片尺寸读取失败");
                sampleValue = sampleSize22(sourceWidth, sourceHeight, 4096);
                var o = new android.graphics.BitmapFactory.Options();
                o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                o.inSampleSize = sampleValue;
                bitmap = android.graphics.BitmapFactory.decodeFile(path, o);
                if (!bitmap) throw new Error("原图解码为空");
                if (sampleValue > 1) {
                  try { decoder = android.graphics.BitmapRegionDecoder.newInstance(path, false); } catch (eRegion) { decoder = null; }
                }
              } catch (eDecode) {
                error("full_decode", eDecode);
              }
              post(function() {
                if (released || deleted || token !== generation) {
                  safeRecycle22(bitmap);
                  safeClose22(decoder);
                  return;
                }
                baseBitmap = bitmap;
                baseSample = sampleValue;
                regionDecoder = decoder;
                if (baseBitmap && imageCanvas) {
                  fitTransform();
                  imageCanvas.invalidate();
                  scheduleRegionDecode();
                }
                updateInfo();
              });
            }}));
          } catch (eExec) { error("full_schedule", eExec); }
        }

        function runAction(stage, busyText, worker, done) {
          if (released || deleted || actionBusy) return false;
          setBusy(true, busyText);
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var result = null;
              var err = null;
              try { result = worker(); } catch (eRun) { err = eRun; }
              post(function() {
                setBusy(false, "");
                if (released) return;
                if (err) {
                  setStatus(String(err), true);
                  error(stage, err);
                  return;
                }
                try { done(result); } catch (eDone) { error(stage + "_done", eDone); }
              });
            }}));
            return true;
          } catch (eExec) {
            setBusy(false, "");
            error(stage + "_schedule", eExec);
            return false;
          }
        }

        function performSave() {
          runAction("save", "正在保存…", function() {
            return savePermanent22(appObj, file, session);
          }, function(result) {
            savedInfo = {
              publicPath: String(result.publicPath || ""),
              contentUri: String(result.contentUri || ""),
              savedAt: Number(result.createdAt || now22())
            };
            setStatus(result.reused ? "已保存" : "保存成功", false);
            try { if (typeof opts.onSaved === "function") opts.onSaved(savedInfo); } catch (eCallback) {}
          });
        }

        function performShare() {
          runAction("share", "正在准备分享…", function() {
            return createShareCopy22(appObj, file, session);
          }, function(result) {
            launchShare22(result);
            setStatus("已打开分享面板", false);
            try { if (typeof opts.onShared === "function") opts.onShared(result); } catch (eCallback) {}
          });
        }

        function dismissConfirm() {
          try {
            if (confirmOverlay && confirmOverlay.getParent()) confirmOverlay.getParent().removeView(confirmOverlay);
          } catch (e0) {}
          confirmOverlay = null;
        }

        function performDelete() {
          dismissConfirm();
          runAction("delete", "正在删除截图…", function() {
            var target = normalizeInternalFile22(path);
            if (!target.exists()) return { ok: true, alreadyMissing: true, internalPath: path };
            if (!target.isFile()) throw new Error("截图不是文件");
            if (!target.delete()) throw new Error("截图删除失败");
            markImageDeleted22(path, now22());
            return { ok: true, internalPath: path, deletedAt: now22() };
          }, function(result) {
            deleted = true;
            generation++;
            regionSerial++;
            setStatus("截图已删除", false);
            try { if (typeof opts.onDeleted === "function") opts.onDeleted(result); } catch (eCallback) {}
          });
        }

        function showDeleteConfirm() {
          if (!fullRoot || confirmOverlay || actionBusy) return;
          var overlay = new android.widget.FrameLayout(opts.context || context);
          confirmOverlay = overlay;
          safeBg22(overlay, colors.scrim);
          var card = new android.widget.LinearLayout(opts.context || context);
          card.setOrientation(android.widget.LinearLayout.VERTICAL);
          card.setPadding(dp22(18), dp22(16), dp22(18), dp22(14));
          card.setBackground(roundBg22(colors.card, colors.stroke, 18));
          var title = new android.widget.TextView(opts.context || context);
          title.setText("永久删除这张截图？");
          safeText22(title, colors.text);
          title.setTextSize(17);
          title.setTypeface(null, android.graphics.Typeface.BOLD);
          card.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));
          var desc = new android.widget.TextView(opts.context || context);
          desc.setText("只删除 ToolHub 内部截图。已保存到公共目录的副本不会删除，拾字文字会保留。");
          safeText22(desc, colors.secondary);
          desc.setTextSize(13);
          desc.setPadding(0, dp22(6), 0, dp22(12));
          card.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));
          var row = new android.widget.LinearLayout(opts.context || context);
          row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
          row.addView(button("取消", function() { dismissConfirm(); }, colors.primary), new android.widget.LinearLayout.LayoutParams(0, dp22(48), 1));
          row.addView(button("删除", function() { performDelete(); }, colors.danger), new android.widget.LinearLayout.LayoutParams(0, dp22(48), 1));
          card.addView(row, new android.widget.LinearLayout.LayoutParams(-1, dp22(48)));
          var cardLp = new android.widget.FrameLayout.LayoutParams(Math.min(dp22(360), Math.max(dp22(260), int22(viewW * 0.82, dp22(320)))), -2, android.view.Gravity.CENTER);
          overlay.addView(card, cardLp);
          overlay.setClickable(true);
          fullRoot.addView(overlay, new android.widget.FrameLayout.LayoutParams(-1, -1));
        }

        var scaleListener = new JavaAdapter(android.view.ScaleGestureDetector.SimpleOnScaleGestureListener, {
          onScaleBegin: function(detector) { scaling = true; return true; },
          onScale: function(detector) {
            try { setScaleAround(scale * Number(detector.getScaleFactor()), detector.getFocusX(), detector.getFocusY()); } catch (e0) {}
            return true;
          },
          onScaleEnd: function(detector) { scaling = false; scheduleRegionDecode(); }
        });
        var scaleDetector = new android.view.ScaleGestureDetector(opts.context || context, scaleListener);

        var gestureListener = new JavaAdapter(android.view.GestureDetector.SimpleOnGestureListener, {
          onDown: function(event) { return true; },
          onDoubleTap: function(event) {
            var target = scale > minScale * 1.4 ? minScale : Math.min(maxScale, minScale * 3);
            setScaleAround(target, event.getX(), event.getY());
            return true;
          }
        });
        var gestureDetector = new android.view.GestureDetector(opts.context || context, gestureListener);

        function createCanvas() {
          var CanvasView = new JavaAdapter(android.view.View, {
            onSizeChanged: function(w, h, oldw, oldh) {
              try {
                viewW = Math.max(0, Number(w || 0));
                viewH = Math.max(0, Number(h || 0));
                if (baseBitmap) {
                  if (!initialized) fitTransform();
                  else clampTranslation();
                  scheduleRegionDecode();
                }
              } catch (eSize) {
                error("size_changed", eSize);
              }
            },
            onDraw: function(canvas) {
              try {
                var drawWidth = Math.max(0, Number(viewW || 0));
                var drawHeight = Math.max(0, Number(viewH || 0));
                try { if (!(drawWidth > 0)) drawWidth = Math.max(0, Number(canvas.getWidth() || 0)); } catch (eWidth) {}
                try { if (!(drawHeight > 0)) drawHeight = Math.max(0, Number(canvas.getHeight() || 0)); } catch (eHeight) {}
                canvas.drawARGB(255, (colors.bg >>> 16) & 255, (colors.bg >>> 8) & 255, colors.bg & 255);
                var cell = dp22(18);
                var p = new android.graphics.Paint();
                for (var yy = 0; yy < drawHeight; yy += cell) {
                  for (var xx = 0; xx < drawWidth; xx += cell) {
                    var v = (((xx / cell) + (yy / cell)) % 2 === 0) ? 20 : 8;
                    p.setARGB(v, 128, 128, 128);
                    canvas.drawRect(xx, yy, Math.min(drawWidth, xx + cell), Math.min(drawHeight, yy + cell), p);
                  }
                }
                if (drawDisabled || !baseBitmap) {
                  var t = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
                  var message = drawDisabled ? "图片显示失败" : (deleted ? "截图已删除" : "正在载入截图…");
                  t.setARGB(255, (colors.secondary >>> 16) & 255, (colors.secondary >>> 8) & 255, colors.secondary & 255);
                  t.setTextSize(dp22(15));
                  t.setTextAlign(android.graphics.Paint.Align.CENTER);
                  canvas.drawText(new java.lang.String(message), drawWidth / 2, drawHeight / 2, t);
                  drawFailureCount = 0;
                  return;
                }
                canvas.save();
                canvas.translate(tx, ty);
                canvas.scale(scale, scale);
                canvas.drawBitmap(baseBitmap, 0, 0, null);
                canvas.restore();
                if (regionBitmap && regionRect) {
                  var left = tx + (Number(regionRect.left) / baseSample) * scale;
                  var top = ty + (Number(regionRect.top) / baseSample) * scale;
                  var right = tx + (Number(regionRect.right) / baseSample) * scale;
                  var bottom = ty + (Number(regionRect.bottom) / baseSample) * scale;
                  var dst = new android.graphics.RectF(left, top, right, bottom);
                  canvas.drawBitmap(regionBitmap, null, dst, null);
                }
                drawFailureCount = 0;
              } catch (eDraw) {
                disableDrawing(eDraw);
              }
            },
            onTouchEvent: function(event) {
              try {
                if (drawDisabled || released || deleted) return true;
                try { scaleDetector.onTouchEvent(event); } catch (eScale) { error("touch_scale", eScale); }
                try { gestureDetector.onTouchEvent(event); } catch (eGesture) { error("touch_gesture", eGesture); }
                var action = event.getActionMasked ? event.getActionMasked() : event.getAction();
                if (action === android.view.MotionEvent.ACTION_DOWN) {
                  lastX = event.getX();
                  lastY = event.getY();
                  panning = true;
                  return true;
                }
                if (action === android.view.MotionEvent.ACTION_MOVE && panning && !scaling && event.getPointerCount() === 1) {
                  var nx = event.getX();
                  var ny = event.getY();
                  tx += nx - lastX;
                  ty += ny - lastY;
                  lastX = nx;
                  lastY = ny;
                  clampTranslation();
                  invalidateImageCanvas("touch_invalidate");
                  scheduleRegionDecode();
                  return true;
                }
                if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
                  panning = false;
                  scheduleRegionDecode();
                  return true;
                }
                return true;
              } catch (eTouch) {
                panning = false;
                scaling = false;
                error("touch", eTouch);
                return true;
              }
            }
          }, opts.context || context);
          CanvasView.setClickable(true);
          return CanvasView;
        }

        function button(label, callback, colorValue) {
          var tv = new android.widget.TextView(opts.context || context);
          tv.setText(label);
          safeText22(tv, colorValue === undefined ? colors.primary : colorValue);
          tv.setTextSize(14);
          tv.setGravity(android.view.Gravity.CENTER);
          tv.setPadding(dp22(10), dp22(8), dp22(10), dp22(8));
          tv.setClickable(true);
          tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
            try { callback(); } catch (e0) { error("button", e0); }
          }}));
          return tv;
        }

        var controller = {
          hasImage: function() {
            try { return !released && !deleted && file.exists() && file.isFile() && file.length() > 0; } catch (e0) {}
            return false;
          },
          createThumbnailView: function() {
            if (thumbnailRoot) return thumbnailRoot;
            var root = new android.widget.FrameLayout(opts.context || context);
            thumbnailRoot = root;
            root.setBackground(roundBg22(colors.card, colors.stroke, 14));
            root.setPadding(dp22(6), dp22(6), dp22(6), dp22(6));
            var image = new android.widget.ImageView(opts.context || context);
            thumbnailImage = image;
            image.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
            root.addView(image, new android.widget.FrameLayout.LayoutParams(-1, -1));
            var status = new android.widget.TextView(opts.context || context);
            thumbnailStatus = status;
            status.setText(savedInfo ? "已保存 · 点击查看原图" : "正在读取截图…");
            safeText22(status, colors.secondary);
            status.setTextSize(11);
            status.setGravity(android.view.Gravity.CENTER);
            var statusLp = new android.widget.FrameLayout.LayoutParams(-1, dp22(30), android.view.Gravity.BOTTOM);
            root.addView(status, statusLp);
            root.setClickable(true);
            root.setContentDescription("截图缩略图，点击查看原图");
            root.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
              try { if (typeof opts.onOpen === "function") opts.onOpen(); } catch (e0) { error("open_callback", e0); }
            }}));
            decodeThumbnail();
            return root;
          },
          createFullView: function() {
            if (fullRoot) return fullRoot;
            var root = new android.widget.FrameLayout(opts.context || context);
            fullRoot = root;
            imageCanvas = createCanvas();
            var imageLp = new android.widget.FrameLayout.LayoutParams(-1, -1);
            imageLp.setMargins(0, dp22(56), 0, dp22(104));
            root.addView(imageCanvas, imageLp);

            var top = new android.widget.LinearLayout(opts.context || context);
            top.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            top.setGravity(android.view.Gravity.CENTER_VERTICAL);
            top.setPadding(dp22(6), dp22(4), dp22(6), dp22(4));
            top.setBackground(roundBg22(colors.card, colors.stroke, 0));
            top.addView(button("返回", function() {
              try { if (typeof opts.onBack === "function") opts.onBack(); } catch (e0) { error("back_callback", e0); }
            }), new android.widget.LinearLayout.LayoutParams(dp22(72), dp22(48)));
            var title = new android.widget.TextView(opts.context || context);
            title.setText("截图原图");
            safeText22(title, colors.text);
            title.setTextSize(16);
            title.setGravity(android.view.Gravity.CENTER);
            top.addView(title, new android.widget.LinearLayout.LayoutParams(0, dp22(48), 1));
            top.addView(button("关闭", function() {
              try { if (typeof opts.onCloseSession === "function") opts.onCloseSession(); } catch (e0) { error("close_callback", e0); }
            }), new android.widget.LinearLayout.LayoutParams(dp22(72), dp22(48)));
            root.addView(top, new android.widget.FrameLayout.LayoutParams(-1, dp22(56), android.view.Gravity.TOP));

            var bottom = new android.widget.LinearLayout(opts.context || context);
            bottom.setOrientation(android.widget.LinearLayout.VERTICAL);
            bottom.setPadding(dp22(6), dp22(3), dp22(6), dp22(4));
            bottom.setBackground(roundBg22(colors.card, colors.stroke, 0));

            var actions = new android.widget.LinearLayout(opts.context || context);
            actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            shareButton = button("分享", function() { performShare(); }, colors.primary);
            saveButton = button(savedInfo ? "已保存" : "保存", function() { performSave(); }, colors.primary);
            deleteButton = button("删除", function() { showDeleteConfirm(); }, colors.danger);
            actions.addView(shareButton, new android.widget.LinearLayout.LayoutParams(0, dp22(44), 1));
            actions.addView(saveButton, new android.widget.LinearLayout.LayoutParams(0, dp22(44), 1));
            actions.addView(deleteButton, new android.widget.LinearLayout.LayoutParams(0, dp22(44), 1));
            bottom.addView(actions, new android.widget.LinearLayout.LayoutParams(-1, dp22(44)));

            actionStatusView = new android.widget.TextView(opts.context || context);
            safeText22(actionStatusView, colors.secondary);
            actionStatusView.setTextSize(11);
            actionStatusView.setGravity(android.view.Gravity.CENTER);
            actionStatusView.setSingleLine(true);
            actionStatusView.setText(savedInfo ? "已保存到公共目录" : "保存副本不会被自动清理");
            bottom.addView(actionStatusView, new android.widget.LinearLayout.LayoutParams(-1, dp22(24)));

            infoView = new android.widget.TextView(opts.context || context);
            safeText22(infoView, colors.secondary);
            infoView.setTextSize(11);
            infoView.setGravity(android.view.Gravity.CENTER);
            infoView.setSingleLine(true);
            infoView.setText("双指缩放 · 单指平移 · 双击放大或复位");
            bottom.addView(infoView, new android.widget.LinearLayout.LayoutParams(-1, dp22(28)));
            root.addView(bottom, new android.widget.FrameLayout.LayoutParams(-1, dp22(104), android.view.Gravity.BOTTOM));
            updateInfo();
            return root;
          },
          open: function() {
            if (released || deleted) return false;
            decodeFull();
            try { if (fullRoot) fullRoot.setVisibility(android.view.View.VISIBLE); } catch (e0) {}
            return true;
          },
          back: function(reason) {
            dismissConfirm();
            try { if (fullRoot) fullRoot.setVisibility(android.view.View.GONE); } catch (e0) {}
            return true;
          },
          refreshLayout: function() {
            colors = theme22(appObj);
            try { if (thumbnailRoot) thumbnailRoot.setBackground(roundBg22(colors.card, colors.stroke, 14)); } catch (e0) {}
            try { if (imageCanvas) imageCanvas.invalidate(); } catch (e1) {}
            return true;
          },
          getImageInfo: function() {
            try { readBounds(); } catch (e0) {}
            return {
              path: path,
              width: sourceWidth,
              height: sourceHeight,
              fileSize: fileSize,
              sampleSize: baseSample,
              createdAt: Number(session.createdAt || 0),
              savedPublicPath: savedInfo ? savedInfo.publicPath : "",
              savedContentUri: savedInfo ? savedInfo.contentUri : "",
              deleted: deleted
            };
          },
          release: function(reason) {
            if (released) return true;
            released = true;
            generation++;
            regionSerial++;
            dismissConfirm();
            try { if (regionRunnable) handler.removeCallbacks(regionRunnable); } catch (e0) {}
            regionRunnable = null;
            try { executor.shutdownNow(); } catch (e1) {}
            try { if (thumbnailImage) thumbnailImage.setImageDrawable(null); } catch (e2) {}
            safeRecycle22(thumbBitmap);
            safeRecycle22(regionBitmap);
            safeRecycle22(baseBitmap);
            safeClose22(regionDecoder);
            thumbBitmap = null;
            regionBitmap = null;
            baseBitmap = null;
            regionDecoder = null;
            thumbnailRoot = null;
            thumbnailImage = null;
            thumbnailStatus = null;
            fullRoot = null;
            imageCanvas = null;
            infoView = null;
            actionStatusView = null;
            saveButton = null;
            shareButton = null;
            deleteButton = null;
            log("i", "released reason=" + String(reason || "") + " path=" + path);
            return true;
          }
        };

        try { readBounds(); } catch (eBounds) { error("register", eBounds); }
        try {
          appObj.runPickwordImageCleanupNow({ force: false, activePath: path }, null);
        } catch (eCleanup) {}
        log("i", "controller created path=" + path + " createdAt=" + String(now22()));
        return controller;
      };

      proto.__toolHubPickwordImageViewerInstalled = true;
      proto.__toolHubPickwordImageViewerVersion = "1.2.6";
      return true;
    } catch (eInstall) {
      try { if (typeof safeLog === "function") safeLog(null, "e", "install pickword image viewer fail " + String(eInstall)); } catch (eLog) {}
      return false;
    }
  }

  install22();
})();
